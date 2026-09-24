// In-browser mock REST backend (multi-tenant). Each route mirrors the endpoint
// a real backend would expose (see docs/API.md).
//
// Tenancy: every request resolves a society. Society users are pinned to their
// own society; the platform owner (super_admin) picks one via the
// `x-society-id` header (the society switcher in the UI).
//
// Handlers receive ctx = { params, query, body, user, db, s, sid, add, log, notify }
//   s    society-scoped read view (see scope() in db.js)
//   add  insert a record into the current society
//   log  append to the activity trail (who did what)

import { getDb, saveDb, resetDb, nextId, scope, due, isOpen, unitCode, monthKey, COLLECTIONS, DEFAULT_TICKET_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES, DEFAULT_AMENITIES } from './db'
import * as ai from './ai'

export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const isAdmin = (u) => u.role === 'admin' || u.role === 'super_admin'
const need = (user, ...roles) => {
  if (roles.includes(user.role) || (roles.includes('admin') && user.role === 'super_admin')) return
  throw new HttpError(403, `Only ${roles.join(' or ')} can do this`)
}
const find = (list, id, what = 'Record') => {
  const item = list.find((x) => x.id === id)
  if (!item) throw new HttpError(404, `${what} ${id} not found`)
  return item
}
const required = (body, fields) => {
  const missing = fields.filter((f) => body?.[f] === undefined || body?.[f] === '' || body?.[f] === null)
  if (missing.length) throw new HttpError(422, `Missing: ${missing.join(', ')}`)
}
const inr = (n) => '₹' + Math.round(n).toLocaleString('en-IN')
const withBalance = (inv) => ({ ...inv, balance: due(inv) })
const unitScoped = (user, list) => (user.role === 'resident' ? list.filter((x) => x.unitId === user.unitId) : list)
const remove = (db, c, id) => (db[c] = db[c].filter((x) => x.id !== id))

function syncOccupancy(s, unitId) {
  const u = s.units.find((x) => x.id === unitId)
  if (!u) return
  const res = s.residents.filter((r) => r.unitId === unitId)
  u.occupancy = res.some((r) => r.type === 'tenant') ? 'tenant' : res.length ? 'owner' : 'vacant'
}

function billLines(s, unit) {
  const slots = s.parking.filter((p) => p.unitId === unit.id).length
  return s.chargeHeads.filter((h) => h.active).map((h) => ({
    head: h.name,
    amount: Math.round(h.basis === 'per_sqft' ? h.rate * unit.areaSqft : h.basis === 'per_parking' ? h.rate * slots : h.rate),
  })).filter((i) => i.amount > 0)
}

function ledger(s, unitId) {
  const entries = []
  for (const inv of s.invoices.filter((i) => i.unitId === unitId)) {
    entries.push({ at: inv.createdAt || inv.dueDate, kind: 'invoice', ref: inv.id, period: inv.period, text: `Bill ${inv.period} · ${inv.items.map((i) => i.head).join(', ')}`, debit: inv.status === 'cancelled' ? 0 : inv.amount + inv.lateFee, lateFee: inv.lateFee, open: isOpen(inv), status: inv.status })
    if (inv.waived) entries.push({ at: inv.waivedAt || inv.dueDate, kind: 'waiver', ref: inv.id, text: `Late fee waived (${inv.period})`, credit: inv.waived })
  }
  for (const p of s.payments.filter((x) => x.unitId === unitId)) entries.push({ at: p.paidAt, kind: 'payment', ref: p.id, text: `Payment via ${p.method} · ${p.reference}`, credit: p.amount })
  entries.sort((a, b) => a.at.localeCompare(b.at))
  let bal = 0
  for (const e of entries) {
    bal += (e.debit || 0) - (e.credit || 0)
    e.balance = bal
  }
  const lastPay = entries.filter((e) => e.kind === 'payment').at(-1)
  return { unitId, entries: entries.reverse(), balance: s.invoices.filter((i) => i.unitId === unitId).reduce((a, i) => a + due(i), 0), billed: entries.reduce((a, e) => a + (e.debit || 0), 0), paid: entries.reduce((a, e) => a + (e.kind === 'payment' ? e.credit : 0), 0), lastPayment: lastPay ? lastPay.at.slice(0, 10) : null }
}

function createUser(db, sid, { name, role, title, unitId = null, residentId, staffId, phone, email }) {
  const u = { id: nextId('usr'), societyId: sid, name, role, title, unitId, residentId, staffId, phone: phone || '', email: email || '' }
  db.users.push(u)
  return u
}

export const routes = []
function route(method, path, group, description, handler, opts = {}) {
  const keys = []
  const regex = new RegExp('^' + path.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '$')
  routes.push({ method, path, group, description, regex, keys, handler, auth: opts.auth ?? true, tenant: opts.tenant ?? true, platform: !!opts.platform })
}

// ============================================================================
// Public & auth
// ============================================================================
route('GET', '/api/public/societies', 'Auth', 'Societies on the platform (for the login screen).', ({ db }) =>
  db.societies.map((s) => ({ id: s.id, code: s.code, name: s.name, city: s.city, status: s.status, plan: s.plan, units: db.units.filter((u) => u.societyId === s.id).length })), { auth: false, tenant: false })
route('GET', '/api/public/directory', 'Auth', 'People who can log in to a society. Query: societyId ("platform" for the owner).', ({ db, query }) =>
  (query.societyId === 'platform' ? db.users.filter((u) => u.role === 'super_admin') : db.users.filter((u) => u.societyId === query.societyId))
    .map(({ id, name, role, title, unitId }) => ({ id, name, role, title, unitId })), { auth: false, tenant: false })
route('POST', '/api/auth/login', 'Auth', 'Log in as a user. Body: { userId }. Returns { token, user }. Production: mobile OTP.', ({ db, body }) => {
  const user = db.users.find((u) => u.id === body?.userId)
  if (!user) throw new HttpError(401, 'Unknown user')
  const soc = db.societies.find((s) => s.id === user.societyId)
  if (soc?.status === 'suspended') throw new HttpError(403, `${soc.name} is suspended. Contact SocietyOS support.`)
  return { token: `tok_${user.id}`, user: { ...user, society: soc || null } }
}, { auth: false, tenant: false })
route('GET', '/api/auth/me', 'Auth', 'Current user and their society.', ({ db, user }) => ({ ...user, society: db.societies.find((s) => s.id === user.societyId) || null }), { tenant: false })
route('POST', '/api/auth/logout', 'Auth', 'End the session.', () => ({ ok: true }), { tenant: false })

// ============================================================================
// Platform (super admin)
// ============================================================================
route('GET', '/api/platform/overview', 'Platform', 'All societies with KPIs, plan and MRR (platform owner).', ({ db }) => {
  const societies = db.societies.map((soc) => {
    const s = scope(db, soc.id)
    const period = s.invoices.map((i) => i.period).sort().at(-1)
    const cur = s.invoices.filter((i) => i.period === period && i.status !== 'cancelled')
    const price = db.plans.find((p) => p.id === soc.plan)?.pricePerUnit || 0
    return {
      ...soc, units: s.units.length, occupied: s.units.filter((u) => u.occupancy !== 'vacant').length, residents: s.residents.length, users: s.users.length,
      collectionRate: cur.length ? cur.filter((i) => i.status === 'paid').length / cur.length : 0, outstanding: s.invoices.reduce((a, i) => a + due(i), 0),
      openTickets: s.tickets.filter((t) => !['resolved', 'closed'].includes(t.status)).length, mrr: s.units.length * price, admins: s.users.filter((u) => u.role === 'admin').map((u) => u.name),
    }
  })
  return { societies, plans: db.plans, totals: { societies: societies.length, active: societies.filter((x) => x.status === 'active').length, units: societies.reduce((a, x) => a + x.units, 0), residents: societies.reduce((a, x) => a + x.residents, 0), mrr: societies.reduce((a, x) => a + (x.status === 'active' ? x.mrr : 0), 0) } }
}, { platform: true, tenant: false })

route('POST', '/api/platform/societies', 'Platform', 'Onboard a society in one call: profile, blocks → units, unit types, charge heads, first admin. Seeds default categories & amenities.', ({ db, body, user }) => {
  required(body, ['name', 'code', 'city'])
  const code = body.code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)
  if (db.societies.some((x) => x.code === code)) throw new HttpError(409, `Society code ${code} already used`)
  if (!body.blocks?.length) throw new HttpError(422, 'Add at least one block')
  if (!body.unitTypes?.length) throw new HttpError(422, 'Add at least one unit type')
  if (!body.admin?.name) throw new HttpError(422, 'First admin name is required')
  const sid = nextId('soc')
  const put = (c, o) => (db[c].push({ id: o.id || nextId(c.slice(0, 3)), societyId: sid, ...o }), db[c].at(-1))
  const soc = { id: sid, code, name: body.name, city: body.city, address: body.address || '', registrationNo: body.registrationNo || '', plan: body.plan || 'Standard', status: 'active', createdAt: new Date().toISOString(), gates: ['Gate 1'], billing: { dueDay: Number(body.billing?.dueDay || 10), lateFeePct: Number(body.billing?.lateFeePct ?? 2), graceDays: Number(body.billing?.graceDays ?? 5) }, approvalLimit: 25000, blockDefaulterBookings: true }
  db.societies.push(soc)
  const types = body.unitTypes.map((t) => put('unitTypes', { name: t.name, areaSqft: Number(t.areaSqft) }))
  let units = 0
  body.blocks.forEach((b) => {
    const blk = put('blocks', { code: b.code.toUpperCase(), name: b.name || `Block ${b.code}`, floors: Number(b.floors), unitsPerFloor: Number(b.unitsPerFloor) })
    for (let f = 1; f <= blk.floors; f++) for (let n = 1; n <= blk.unitsPerFloor; n++) {
      const t = types[(n - 1) % types.length]
      put('units', { id: unitCode(blk, f, n), blockId: blk.id, block: blk.code, floor: f, number: n, unitTypeId: t.id, type: t.name, areaSqft: t.areaSqft, occupancy: 'vacant' })
      units++
    }
  })
  ;(body.chargeHeads?.length ? body.chargeHeads : [{ name: 'Maintenance', basis: 'per_sqft', rate: 3 }, { name: 'Sinking Fund', basis: 'fixed', rate: 500 }]).forEach((h) => put('chargeHeads', { name: h.name, basis: h.basis, rate: Number(h.rate), active: true, description: '' }))
  const fm = put('staff', { name: 'To be assigned', role: 'Facility Manager', shift: 'Day', phone: '', present: false })
  DEFAULT_TICKET_CATEGORIES.forEach(([name, slaHours]) => put('ticketCategories', { name, slaHours, assignee: fm.name }))
  DEFAULT_EXPENSE_CATEGORIES.forEach(([name]) => put('expenseCategories', { name, budgetMonthly: 0 }))
  DEFAULT_AMENITIES.slice(0, 2).forEach((a) => put('amenities', { ...a }))
  const admin = createUser(db, sid, { name: body.admin.name, role: 'admin', title: body.admin.title || 'Secretary', phone: body.admin.phone, email: body.admin.email })
  put('activity', { at: new Date().toISOString(), actor: user.name, actorRole: 'super_admin', action: 'created', entity: 'society', entityId: soc.name, detail: `Onboarded with ${body.blocks.length} block(s), ${units} units, first admin ${admin.name}` })
  return { society: soc, units, admin }
}, { platform: true, tenant: false })

route('PATCH', '/api/platform/societies/:id', 'Platform', 'Change plan or suspend/activate a society. Body: { plan?, status? }.', ({ db, params, body, user }) => {
  const soc = find(db.societies, params.id, 'Society')
  if (body.plan) soc.plan = body.plan
  if (body.status) soc.status = body.status
  db.activity.push({ id: nextId('act'), societyId: soc.id, at: new Date().toISOString(), actor: user.name, actorRole: 'super_admin', action: 'updated', entity: 'society', entityId: soc.name, detail: `Plan ${soc.plan}, status ${soc.status}` })
  return soc
}, { platform: true, tenant: false })

// ============================================================================
// Society, setup & dashboard
// ============================================================================
route('GET', '/api/society', 'Society', 'Current society profile and rules.', ({ s }) => s.society)
route('PUT', '/api/society', 'Society', 'Update profile, billing rules, approval limit (admin).', ({ s, body, user, log }) => {
  need(user, 'admin')
  const { id, societyId, code, status, plan, ...rest } = body
  Object.assign(s.society, rest, { billing: { ...s.society.billing, ...(body.billing || {}) } })
  log('updated', 'settings', s.society.name, 'Society profile / rules changed')
  return s.society
})
route('GET', '/api/setup/checklist', 'Society', 'Setup steps in order, computed from the data (what is done, what is next).', ({ s }) => {
  const occupied = s.units.filter((u) => u.occupancy !== 'vacant').length
  const steps = [
    ['profile', 'Society profile & rules', 'Name, address, due date, late fee, grace days.', !!s.society.address, s.society.address ? 'Done' : 'Add address', '/settings'],
    ['blocks', 'Blocks / towers', 'Create each block with floors and flats per floor.', s.blocks.length > 0, `${s.blocks.length} blocks`, '/masters?tab=blocks'],
    ['unit-types', 'Unit types', '2BHK, 3BHK, Villa… with carpet area. Area drives maintenance.', s.unitTypes.length > 0, `${s.unitTypes.length} types`, '/masters?tab=unit-types'],
    ['units', 'Units', 'Generated from blocks; fix type/area per flat if needed.', s.units.length > 0, `${s.units.length} units`, '/masters?tab=units'],
    ['charge-heads', 'Charge heads', 'Maintenance per sq.ft, sinking fund, parking per slot…', s.chargeHeads.some((h) => h.active), `${s.chargeHeads.filter((h) => h.active).length} active`, '/masters?tab=charge-heads'],
    ['staff', 'Staff & guards', 'Add guards (they get the gate app) and maintenance staff.', s.staff.filter((x) => x.name !== 'To be assigned').length > 0, `${s.staff.length} staff`, '/masters?tab=staff'],
    ['ticket-categories', 'Complaint categories', 'SLA hours and default assignee for each category.', s.ticketCategories.every((c) => c.assignee && c.assignee !== 'To be assigned'), s.ticketCategories.every((c) => c.assignee && c.assignee !== 'To be assigned') ? `${s.ticketCategories.length} categories routed` : 'Assign staff', '/masters?tab=ticket-categories'],
    ['residents', 'Residents', 'Add owners/tenants to units and give them app access.', occupied > 0, `${occupied}/${s.units.length} units occupied`, '/residents'],
    ['parking', 'Parking allotment', 'Allot slots; parking charges bill automatically.', s.parking.some((p) => p.unitId), `${s.parking.filter((p) => p.unitId).length} allotted`, '/parking'],
    ['billing', 'First bill cycle', 'Generate invoices from charge heads for occupied units.', s.invoices.length > 0, `${s.invoices.length} invoices`, '/billing'],
    ['notice', 'Welcome notice', 'Tell residents to download the app.', s.notices.length > 0, `${s.notices.length} notices`, '/notices'],
  ].map(([key, title, desc, done, status, link]) => ({ key, title, desc, done, status, link }))
  return { steps, done: steps.filter((x) => x.done).length, total: steps.length }
})
route('GET', '/api/dashboard/summary', 'Society', 'KPIs and chart series for the dashboard.', ({ s, user }) => {
  const period = s.invoices.map((i) => i.period).sort().at(-1)
  const cur = s.invoices.filter((i) => i.period === period && i.status !== 'cancelled')
  const periods = [...new Set(s.invoices.map((i) => i.period))].sort()
  const today = new Date().toISOString().slice(0, 10)
  const openTickets = s.tickets.filter((t) => !['resolved', 'closed'].includes(t.status))
  const mine = user.role === 'resident'
  const myOpen = s.invoices.filter((i) => i.unitId === user.unitId && isOpen(i))
  return {
    period, units: s.units.length, occupied: s.units.filter((u) => u.occupancy !== 'vacant').length, residents: s.residents.length,
    collectionRate: cur.filter((i) => i.status === 'paid').length / (cur.length || 1),
    collectedThisMonth: s.payments.filter((p) => cur.some((i) => i.id === p.invoiceId)).reduce((a, p) => a + p.amount, 0),
    outstanding: s.invoices.reduce((a, i) => a + due(i), 0),
    openTickets: mine ? openTickets.filter((t) => t.unitId === user.unitId).length : openTickets.length,
    slaBreached: openTickets.filter((t) => t.slaDueAt && new Date(t.slaDueAt) < new Date()).length,
    visitorsToday: s.visitors.filter((v) => v.checkIn.startsWith(today) && (!mine || v.unitId === user.unitId)).length,
    visitorsInside: s.visitors.filter((v) => v.status === 'inside').length,
    pendingApprovals: s.expenses.filter((e) => e.status === 'pending').length,
    bookingsToday: s.bookings.filter((b) => b.date === today).length,
    myDues: { count: myOpen.length, total: myOpen.reduce((a, i) => a + due(i), 0) },
    collections: periods.map((p) => {
      const inv = s.invoices.filter((i) => i.period === p && i.status !== 'cancelled')
      return { period: p, label: new Date(p + '-01').toLocaleString('en', { month: 'short' }), billed: inv.reduce((a, i) => a + i.amount, 0), collected: inv.reduce((a, i) => a + i.paid, 0), expenses: s.expenses.filter((e) => e.date.startsWith(p) && e.status === 'approved').reduce((a, e) => a + e.amount, 0) }
    }),
    ticketsByCategory: Object.entries(openTickets.reduce((a, t) => ((a[t.category] = (a[t.category] || 0) + 1), a), {})).map(([name, value]) => ({ name, value })),
    visitorsByDay: [...Array(7)].map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const k = d.toISOString().slice(0, 10)
      return { day: d.toLocaleString('en', { weekday: 'short' }), count: s.visitors.filter((v) => v.checkIn.startsWith(k)).length }
    }),
  }
})

// ============================================================================
// Masters (generic CRUD for the set-up-once tables)
// ============================================================================
const NUM = ['floors', 'unitsPerFloor', 'areaSqft', 'rate', 'budgetMonthly', 'slaHours', 'capacity', 'fee', 'deposit']
export const MASTERS = {
  blocks: { c: 'blocks', label: 'Block', required: ['code', 'name', 'floors', 'unitsPerFloor'] },
  'unit-types': { c: 'unitTypes', label: 'Unit type', required: ['name', 'areaSqft'] },
  'charge-heads': { c: 'chargeHeads', label: 'Charge head', required: ['name', 'basis', 'rate'] },
  'expense-categories': { c: 'expenseCategories', label: 'Expense category', required: ['name'] },
  'ticket-categories': { c: 'ticketCategories', label: 'Complaint category', required: ['name', 'slaHours'] },
  amenities: { c: 'amenities', label: 'Amenity', required: ['name', 'capacity'] },
  vendors: { c: 'vendors', label: 'Vendor', required: ['name', 'service'] },
  staff: { c: 'staff', label: 'Staff', required: ['name', 'role'] },
}
const master = (type) => MASTERS[type] || (() => { throw new HttpError(404, `Unknown master ${type}`) })()
const clean = (body) => {
  const o = { ...body }
  delete o.id
  delete o.societyId
  delete o.usage
  NUM.forEach((k) => o[k] !== undefined && o[k] !== '' && (o[k] = Number(o[k])))
  if (typeof o.slots === 'string') o.slots = o.slots.split(',').map((x) => x.trim()).filter(Boolean)
  if (o.active !== undefined) o.active = o.active === true || o.active === 'true'
  if (o.requiresApproval !== undefined) o.requiresApproval = o.requiresApproval === true || o.requiresApproval === 'true'
  if (o.appAccess !== undefined) o.appAccess = o.appAccess === true || o.appAccess === 'true'
  return o
}
const usage = (s, type, x) => {
  if (type === 'blocks') return `${s.units.filter((u) => u.blockId === x.id).length} units`
  if (type === 'unit-types') return `${s.units.filter((u) => u.unitTypeId === x.id).length} units`
  if (type === 'expense-categories') return `${s.expenses.filter((e) => e.category === x.name).length} expenses`
  if (type === 'ticket-categories') return `${s.tickets.filter((t) => t.category === x.name).length} tickets`
  if (type === 'amenities') return `${s.bookings.filter((b) => b.amenityId === x.id).length} bookings`
  if (type === 'staff') return x.appAccess ? 'Has gate app login' : s.ticketCategories.filter((c) => c.assignee === x.name).map((c) => c.name).join(', ') || '—'
  if (type === 'charge-heads') return x.active ? 'Billed each cycle' : 'Inactive'
  if (type === 'vendors') return `${s.expenses.filter((e) => e.vendor === x.name).length} expenses`
  return ''
}
const GUARD_ROLES = ['Security Supervisor', 'Security Guard']

route('GET', '/api/masters/:type', 'Masters', 'List a master table: blocks | unit-types | charge-heads | expense-categories | ticket-categories | amenities | vendors | staff.', ({ s, params }) => {
  const m = master(params.type)
  return s[m.c].map((x) => ({ ...x, usage: usage(s, params.type, x) }))
})
route('POST', '/api/masters/:type', 'Masters', 'Create a master record (admin). Blocks auto-generate their units (body.unitTypeId). Staff with appAccess + guard role get a gate login.', ({ db, s, sid, params, body, user, add, log }) => {
  need(user, 'admin')
  const m = master(params.type)
  required(body, m.required)
  const o = clean(body)
  if (s[m.c].some((x) => (x.code && x.code === o.code?.toUpperCase()) || (!x.code && x.name?.toLowerCase() === o.name?.toLowerCase()))) throw new HttpError(409, `${m.label} “${o.code || o.name}” already exists`)
  if (params.type === 'blocks') o.code = o.code.toUpperCase()
  if (params.type === 'charge-heads') o.active = o.active ?? true
  if (params.type === 'amenities') Object.assign(o, { fee: o.fee || 0, deposit: o.deposit || 0, slots: o.slots || ['06:00-08:00'], icon: o.icon || 'party' })
  const rec = add(m.c, o)
  let extra = ''
  if (params.type === 'blocks') {
    const t = s.unitTypes.find((x) => x.id === body.unitTypeId) || s.unitTypes[0]
    if (!t) throw new HttpError(422, 'Create a unit type first')
    for (let f = 1; f <= rec.floors; f++) for (let n = 1; n <= rec.unitsPerFloor; n++) add('units', { id: unitCode(rec, f, n), blockId: rec.id, block: rec.code, floor: f, number: n, unitTypeId: t.id, type: t.name, areaSqft: t.areaSqft, occupancy: 'vacant' })
    extra = ` and ${rec.floors * rec.unitsPerFloor} units (${t.name})`
  }
  if (params.type === 'staff' && rec.appAccess && GUARD_ROLES.includes(rec.role)) {
    createUser(db, sid, { name: rec.name, role: 'guard', title: rec.role, staffId: rec.id, phone: rec.phone })
    extra = ' with gate-app login'
  }
  log('created', params.type, rec.code || rec.name, `${m.label} created${extra}`)
  return rec
})
route('PUT', '/api/masters/:type/:id', 'Masters', 'Update a master record (admin). Unit-type area changes flow to its units (and future bills).', ({ db, s, sid, params, body, user, log }) => {
  need(user, 'admin')
  const m = master(params.type)
  const rec = find(s[m.c], params.id, m.label)
  const o = clean(body)
  if (params.type === 'blocks') {
    delete o.code
    delete o.floors
    delete o.unitsPerFloor
  }
  const before = { ...rec }
  Object.assign(rec, o)
  let extra = ''
  if (params.type === 'unit-types') {
    const us = s.units.filter((u) => u.unitTypeId === rec.id)
    us.forEach((u) => Object.assign(u, { type: rec.name, areaSqft: rec.areaSqft }))
    if (before.areaSqft !== rec.areaSqft) extra = `; area ${before.areaSqft}→${rec.areaSqft} sq.ft applied to ${us.length} units`
  }
  if (params.type === 'ticket-categories' && before.name !== rec.name) s.tickets.filter((t) => t.category === before.name).forEach((t) => (t.category = rec.name))
  if (params.type === 'expense-categories' && before.name !== rec.name) s.expenses.filter((e) => e.category === before.name).forEach((e) => (e.category = rec.name))
  if (params.type === 'staff') {
    if (before.name !== rec.name) s.ticketCategories.filter((c) => c.assignee === before.name).forEach((c) => (c.assignee = rec.name))
    const login = db.users.find((u) => u.staffId === rec.id)
    if (rec.appAccess && GUARD_ROLES.includes(rec.role) && !login) (createUser(db, sid, { name: rec.name, role: 'guard', title: rec.role, staffId: rec.id }), (extra = '; gate login created'))
    if ((!rec.appAccess || !GUARD_ROLES.includes(rec.role)) && login) (remove(db, 'users', login.id), (extra = '; gate login removed'))
    if (login) Object.assign(login, { name: rec.name, title: rec.role })
  }
  log('updated', params.type, rec.code || rec.name, `${m.label} updated${extra}`)
  return rec
})
route('DELETE', '/api/masters/:type/:id', 'Masters', 'Delete a master record (admin). Refused while other data depends on it.', ({ db, s, params, user, log }) => {
  need(user, 'admin')
  const m = master(params.type)
  const rec = find(s[m.c], params.id, m.label)
  const blockers = {
    blocks: () => s.units.filter((u) => u.blockId === rec.id && u.occupancy !== 'vacant').length && `it has occupied units`,
    'unit-types': () => s.units.some((u) => u.unitTypeId === rec.id) && `${s.units.filter((u) => u.unitTypeId === rec.id).length} units use this type`,
    'expense-categories': () => s.expenses.some((e) => e.category === rec.name) && 'expenses are recorded under it',
    'ticket-categories': () => s.tickets.some((t) => t.category === rec.name && !['resolved', 'closed'].includes(t.status)) && 'open tickets use it',
    amenities: () => s.bookings.some((b) => b.amenityId === rec.id && b.date >= new Date().toISOString().slice(0, 10) && b.status !== 'cancelled') && 'it has upcoming bookings',
    'charge-heads': () => false, vendors: () => false,
    staff: () => s.ticketCategories.some((c) => c.assignee === rec.name) && `it is the default assignee for ${s.ticketCategories.filter((c) => c.assignee === rec.name).map((c) => c.name).join(', ')}`,
  }[params.type]()
  if (blockers) throw new HttpError(409, `Can't delete ${rec.code || rec.name}: ${blockers}.${params.type === 'charge-heads' ? '' : ' Reassign or clear it first.'}`)
  if (params.type === 'blocks') s.units.filter((u) => u.blockId === rec.id).forEach((u) => remove(db, 'units', u.id))
  if (params.type === 'staff') db.users.filter((u) => u.staffId === rec.id).forEach((u) => remove(db, 'users', u.id))
  remove(db, m.c, rec.id)
  log('deleted', params.type, rec.code || rec.name, `${m.label} deleted`)
  return { ok: true }
})

// ============================================================================
// Units & residents
// ============================================================================
route('GET', '/api/units', 'Units & Residents', 'Units with residents, parking and balance. Filters: blockId, occupancy, q.', ({ s, query }) => {
  const q = (query.q || '').toLowerCase()
  return s.units
    .filter((u) => (!query.blockId || u.blockId === query.blockId) && (!query.occupancy || u.occupancy === query.occupancy) && (!q || u.id.toLowerCase().includes(q)))
    .map((u) => ({ ...u, residents: s.residents.filter((r) => r.unitId === u.id), parking: s.parking.filter((p) => p.unitId === u.id).map((p) => p.id), balance: s.invoices.filter((i) => i.unitId === u.id).reduce((a, i) => a + due(i), 0) }))
})
route('POST', '/api/units', 'Units & Residents', 'Add a single unit (admin). Body: { blockId, floor, number, unitTypeId }.', ({ s, body, user, add, log }) => {
  need(user, 'admin')
  required(body, ['blockId', 'floor', 'number', 'unitTypeId'])
  const b = find(s.blocks, body.blockId, 'Block')
  const t = find(s.unitTypes, body.unitTypeId, 'Unit type')
  const id = unitCode(b, Number(body.floor), Number(body.number))
  if (s.units.some((u) => u.id === id)) throw new HttpError(409, `Unit ${id} already exists`)
  const u = add('units', { id, blockId: b.id, block: b.code, floor: Number(body.floor), number: Number(body.number), unitTypeId: t.id, type: t.name, areaSqft: t.areaSqft, occupancy: 'vacant' })
  log('created', 'unit', id, `${t.name}, ${t.areaSqft} sq.ft in ${b.name}`)
  return u
})
route('GET', '/api/units/:id', 'Units & Residents', 'Unit 360°: residents, app users, parking, balance.', ({ s, params, user }) => {
  const u = find(s.units, params.id, 'Unit')
  if (user.role === 'resident' && u.id !== user.unitId) throw new HttpError(403, 'You can only view your own unit')
  return { ...u, blockName: s.blocks.find((b) => b.id === u.blockId)?.name, residents: s.residents.filter((r) => r.unitId === u.id), users: s.users.filter((x) => x.unitId === u.id).map(({ id, name, role, title }) => ({ id, name, role, title })), parking: s.parking.filter((p) => p.unitId === u.id), dailyHelp: s.dailyHelp.filter((h) => h.units.includes(u.id)), balance: s.invoices.filter((i) => i.unitId === u.id).reduce((a, i) => a + due(i), 0), nextBill: billLines(s, u) }
})
route('PUT', '/api/units/:id', 'Units & Residents', 'Change a unit’s type or area (admin). Affects future bills only.', ({ s, params, body, user, log }) => {
  need(user, 'admin')
  const u = find(s.units, params.id, 'Unit')
  if (body.unitTypeId) {
    const t = find(s.unitTypes, body.unitTypeId, 'Unit type')
    Object.assign(u, { unitTypeId: t.id, type: t.name, areaSqft: t.areaSqft })
  }
  if (body.areaSqft) u.areaSqft = Number(body.areaSqft)
  log('updated', 'unit', u.id, `Now ${u.type}, ${u.areaSqft} sq.ft (applies from next bill)`)
  return u
})
route('DELETE', '/api/units/:id', 'Units & Residents', 'Delete a vacant unit with no dues (admin).', ({ db, s, params, user, log }) => {
  need(user, 'admin')
  const u = find(s.units, params.id, 'Unit')
  if (u.occupancy !== 'vacant') throw new HttpError(409, `${u.id} has residents; move them out first`)
  if (s.invoices.some((i) => i.unitId === u.id)) throw new HttpError(409, `${u.id} has billing history and can’t be deleted`)
  remove(db, 'units', u.id)
  log('deleted', 'unit', u.id, 'Unit removed')
  return { ok: true }
})
route('GET', '/api/units/:id/ledger', 'Units & Residents', 'Unit statement: every bill, payment and waiver with a running balance.', ({ s, params, user }) => {
  find(s.units, params.id, 'Unit')
  if (user.role === 'resident' && params.id !== user.unitId) throw new HttpError(403, 'You can only view your own ledger')
  return ledger(s, params.id)
})

route('GET', '/api/residents', 'Units & Residents', 'Residents. Filters: q, type (owner|tenant), blockId.', ({ s, query }) => {
  const q = (query.q || '').toLowerCase()
  const blockUnits = query.blockId ? new Set(s.units.filter((u) => u.blockId === query.blockId).map((u) => u.id)) : null
  return s.residents
    .filter((r) => (!q || `${r.name} ${r.unitId} ${r.phone} ${r.email}`.toLowerCase().includes(q)) && (!query.type || r.type === query.type) && (!blockUnits || blockUnits.has(r.unitId)))
    .map((r) => ({ ...r, hasLogin: s.users.some((u) => u.residentId === r.id) }))
})
route('POST', '/api/residents', 'Units & Residents', 'Move-in: add an owner/tenant to a unit (admin). appAccess: true creates their app login.', ({ db, s, sid, body, user, add, log, notify }) => {
  need(user, 'admin')
  required(body, ['name', 'unitId', 'type'])
  const unit = find(s.units, body.unitId, 'Unit')
  if (body.type === 'tenant' && !body.leaseEnd) throw new HttpError(422, 'Lease end date is required for tenants')
  const r = add('residents', { name: body.name, unitId: unit.id, type: body.type, phone: body.phone || '', email: body.email || '', members: Number(body.members || 1), vehicles: body.vehicles ? String(body.vehicles).split(',').map((x) => x.trim()).filter(Boolean) : [], leaseEnd: body.leaseEnd || null, moveIn: new Date().toISOString(), appAccess: !!body.appAccess })
  syncOccupancy(scope(db, sid), unit.id)
  if (r.appAccess) createUser(db, sid, { name: r.name, role: 'resident', title: r.type === 'tenant' ? 'Tenant' : 'Owner', unitId: unit.id, residentId: r.id, phone: r.phone, email: r.email })
  log('moved in', 'resident', r.name, `${r.type} of ${unit.id}${r.appAccess ? ', app invite sent' : ''}`)
  notify({ title: 'New resident', body: `${r.name} moved into ${unit.id}`, type: 'resident', roles: ['admin', 'guard'] })
  return r
})
route('PUT', '/api/residents/:id', 'Units & Residents', 'Update a resident (admin). Toggling appAccess creates/removes their login.', ({ db, s, sid, params, body, user, log }) => {
  need(user, 'admin')
  const r = find(s.residents, params.id, 'Resident')
  const o = { ...body }
  if (typeof o.vehicles === 'string') o.vehicles = o.vehicles.split(',').map((x) => x.trim()).filter(Boolean)
  if (o.members) o.members = Number(o.members)
  delete o.id
  delete o.unitId
  delete o.hasLogin
  Object.assign(r, o)
  syncOccupancy(scope(db, sid), r.unitId)
  const login = db.users.find((u) => u.residentId === r.id)
  if (r.appAccess && !login) createUser(db, sid, { name: r.name, role: 'resident', title: r.type === 'tenant' ? 'Tenant' : 'Owner', unitId: r.unitId, residentId: r.id, phone: r.phone, email: r.email })
  if (!r.appAccess && login && login.role === 'resident') remove(db, 'users', login.id)
  if (login) Object.assign(login, { name: r.name })
  log('updated', 'resident', r.name, `${r.unitId}, ${r.type}${r.appAccess ? ', app access on' : ''}`)
  return r
})
route('DELETE', '/api/residents/:id', 'Units & Residents', 'Move-out (admin). Blocked while the unit has dues unless ?force=true (dues stay on the unit ledger).', ({ db, s, sid, params, query, user, log }) => {
  need(user, 'admin')
  const r = find(s.residents, params.id, 'Resident')
  const bal = s.invoices.filter((i) => i.unitId === r.unitId).reduce((a, i) => a + due(i), 0)
  if (bal > 0 && query.force !== 'true') throw new HttpError(409, `${r.unitId} has ${inr(bal)} outstanding. Collect dues before move-out, or force it (dues stay on the unit).`)
  remove(db, 'residents', r.id)
  db.users.filter((u) => u.residentId === r.id).forEach((u) => remove(db, 'users', u.id))
  syncOccupancy(scope(db, sid), r.unitId)
  log('moved out', 'resident', r.name, `Left ${r.unitId}${bal ? ` with ${inr(bal)} dues on the unit` : ''}`)
  return { ok: true }
})

// ============================================================================
// Billing
// ============================================================================
route('GET', '/api/invoices', 'Billing', 'Invoices with balance. Filters: status (unpaid|partial|paid|cancelled|open), unitId, period. Residents see their unit.', ({ s, query, user }) =>
  unitScoped(user, s.invoices)
    .filter((i) => (!query.status || (query.status === 'open' ? isOpen(i) : i.status === query.status)) && (!query.unitId || i.unitId === query.unitId) && (!query.period || i.period === query.period))
    .sort((a, b) => b.period.localeCompare(a.period) || a.unitId.localeCompare(b.unitId, undefined, { numeric: true }))
    .map(withBalance))
route('GET', '/api/invoices/preview', 'Billing', 'Dry-run a bill cycle from charge heads. Query: period=YYYY-MM.', ({ s, query }) => {
  const now = new Date()
  const period = query.period || monthKey(new Date(now.getFullYear(), now.getMonth() + 1, 1))
  const units = s.units.filter((u) => u.occupancy !== 'vacant')
  const byHead = {}
  units.forEach((u) => billLines(s, u).forEach((l) => (byHead[l.head] = (byHead[l.head] || 0) + l.amount)))
  return {
    period, exists: s.invoices.some((i) => i.period === period && i.status !== 'cancelled'), units: units.length, skippedVacant: s.units.length - units.length,
    heads: s.chargeHeads.filter((h) => h.active).map((h) => ({ name: h.name, basis: h.basis, rate: h.rate, total: byHead[h.name] || 0 })),
    total: Object.values(byHead).reduce((a, v) => a + v, 0), sample: units.slice(0, 3).map((u) => ({ unitId: u.id, type: u.type, areaSqft: u.areaSqft, lines: billLines(s, u) })),
  }
})
route('GET', '/api/invoices/:id', 'Billing', 'Invoice detail with payments.', ({ s, params, user }) => {
  const inv = find(unitScoped(user, s.invoices), params.id, 'Invoice')
  return { ...withBalance(inv), payments: s.payments.filter((p) => p.invoiceId === inv.id) }
})
route('POST', '/api/invoices/generate', 'Billing', 'Generate a bill cycle (admin). Body: { period }. One invoice per occupied unit, lines from active charge heads.', ({ s, body, user, add, log, notify }) => {
  need(user, 'admin')
  const now = new Date()
  const period = body?.period || monthKey(new Date(now.getFullYear(), now.getMonth() + 1, 1))
  if (!/^\d{4}-\d{2}$/.test(period)) throw new HttpError(422, 'period must be YYYY-MM')
  if (s.invoices.some((i) => i.period === period && i.status !== 'cancelled')) throw new HttpError(409, `Invoices for ${period} already exist`)
  if (!s.chargeHeads.some((h) => h.active)) throw new HttpError(422, 'No active charge heads. Set them up in Masters first.')
  const { dueDay } = s.society.billing
  const created = s.units.filter((u) => u.occupancy !== 'vacant').map((u) => {
    const items = billLines(s, u)
    return add('invoices', { id: `INV-${s.society.code}-${period.replace('-', '')}-${u.id}`, unitId: u.id, period, dueDate: new Date(`${period}-${String(dueDay).padStart(2, '0')}T00:00:00`).toISOString(), items, amount: items.reduce((a, i) => a + i.amount, 0), lateFee: 0, waived: 0, paid: 0, status: 'unpaid', paidAt: null, createdAt: new Date().toISOString() })
  })
  const total = created.reduce((a, i) => a + i.amount, 0)
  log('generated', 'invoice', period, `${created.length} invoices, ${inr(total)} from ${s.chargeHeads.filter((h) => h.active).map((h) => h.name).join(' + ')}`)
  notify({ title: `Bills for ${period} generated`, body: `Due on the ${dueDay}th. Pay in the app to avoid late fees.`, type: 'finance', roles: ['admin', 'resident'] })
  return { period, count: created.length, total }
})
route('POST', '/api/invoices/:id/pay', 'Billing', 'Pay an invoice, fully or partly. Body: { amount?, method }. Admin = offline receipt; resident = online.', ({ s, params, body, user, add, log, notify }) => {
  const inv = find(s.invoices, params.id, 'Invoice')
  if (user.role === 'resident' && inv.unitId !== user.unitId) throw new HttpError(403, 'Not your invoice')
  if (user.role === 'guard') throw new HttpError(403, 'Guards cannot take payments')
  if (!isOpen(inv)) throw new HttpError(409, `Invoice is already ${inv.status}`)
  const balance = due(inv)
  const amount = Math.round(Number(body?.amount || balance))
  if (amount <= 0 || amount > balance) throw new HttpError(422, `Amount must be between ₹1 and ${inr(balance)}`)
  inv.paid += amount
  inv.status = due(inv) === 0 ? 'paid' : 'partial'
  if (inv.status === 'paid') inv.paidAt = new Date().toISOString()
  const payment = add('payments', { invoiceId: inv.id, unitId: inv.unitId, amount, method: body?.method || 'UPI', reference: body?.reference || 'TXN' + Date.now(), paidAt: new Date().toISOString(), recordedBy: user.role === 'resident' ? 'Online' : user.name })
  log(user.role === 'resident' ? 'paid' : 'recorded payment', 'invoice', inv.id, `${inr(amount)} via ${payment.method}${inv.status === 'partial' ? `, ${inr(due(inv))} still due` : ', fully paid'}`)
  notify({ title: 'Payment received', body: `${inr(amount)} from ${inv.unitId} via ${payment.method}`, type: 'finance', roles: ['admin'] })
  return { invoice: withBalance(inv), payment }
})
route('POST', '/api/invoices/:id/waive-late-fee', 'Billing', 'Waive the late fee on an invoice (admin).', ({ s, params, user, log }) => {
  need(user, 'admin')
  const inv = find(s.invoices, params.id, 'Invoice')
  const fee = inv.lateFee - inv.waived
  if (fee <= 0) throw new HttpError(409, 'No late fee to waive')
  inv.waived += fee
  inv.waivedAt = new Date().toISOString()
  if (due(inv) === 0) inv.status = 'paid'
  log('waived', 'invoice', inv.id, `Late fee ${inr(fee)} waived`)
  return withBalance(inv)
})
route('POST', '/api/invoices/:id/cancel', 'Billing', 'Cancel a wrongly raised invoice with no payments (admin). Body: { reason }.', ({ s, params, body, user, log }) => {
  need(user, 'admin')
  const inv = find(s.invoices, params.id, 'Invoice')
  if (inv.paid > 0) throw new HttpError(409, 'Invoice has payments and cannot be cancelled')
  inv.status = 'cancelled'
  inv.cancelReason = body?.reason || 'Raised in error'
  log('cancelled', 'invoice', inv.id, inv.cancelReason)
  return withBalance(inv)
})
route('POST', '/api/invoices/apply-late-fees', 'Billing', 'Apply late fees to overdue invoices past the grace period (admin).', ({ s, user, log }) => {
  need(user, 'admin')
  const { lateFeePct, graceDays } = s.society.billing
  let count = 0
  let total = 0
  for (const inv of s.invoices.filter(isOpen)) {
    const late = (Date.now() - new Date(inv.dueDate).getTime()) / 86400000 - graceDays
    if (late <= 0) continue
    const fee = Math.round(inv.amount * (lateFeePct / 100) * Math.ceil(late / 30))
    if (fee > inv.lateFee) {
      total += fee - inv.lateFee
      inv.lateFee = fee
      count++
    }
  }
  log('applied late fees', 'invoice', `${count} invoices`, `${inr(total)} at ${lateFeePct}%/month after ${graceDays} grace days`)
  return { count, total }
})
route('POST', '/api/invoices/:id/remind', 'Billing', 'Send a payment reminder for one invoice (admin).', ({ s, params, user, log }) => {
  need(user, 'admin')
  const inv = find(s.invoices, params.id, 'Invoice')
  log('reminded', 'invoice', inv.id, `${inv.unitId} via push, SMS, WhatsApp`)
  return { ok: true, channels: ['push', 'sms', 'whatsapp'], unitId: inv.unitId }
})
route('POST', '/api/invoices/remind-all', 'Billing', 'Remind every unit with open bills (admin).', ({ s, user, log }) => {
  need(user, 'admin')
  const units = new Set(s.invoices.filter(isOpen).map((i) => i.unitId))
  log('reminded', 'invoice', `${units.size} units`, 'Bulk reminder via push, SMS, WhatsApp')
  return { ok: true, count: units.size }
})
route('GET', '/api/payments', 'Billing', 'Payment history. Residents see their unit.', ({ s, user }) => unitScoped(user, s.payments).slice().sort((a, b) => b.paidAt.localeCompare(a.paidAt)))

// ============================================================================
// Accounting
// ============================================================================
route('GET', '/api/expenses', 'Accounting', 'Expenses. Filters: status, category.', ({ s, query }) =>
  s.expenses.filter((e) => (!query.status || e.status === query.status) && (!query.category || e.category === query.category)).slice().sort((a, b) => b.date.localeCompare(a.date)))
route('POST', '/api/expenses', 'Accounting', 'Record an expense (admin). Category must exist in Masters. Above the approval limit it waits for a second admin.', ({ s, body, user, add, log, notify }) => {
  need(user, 'admin')
  required(body, ['amount', 'category', 'description'])
  if (!s.expenseCategories.some((c) => c.name === body.category)) throw new HttpError(422, `Unknown category ${body.category}. Add it in Masters → Expense categories.`)
  const limit = s.society.approvalLimit ?? 25000
  const e = add('expenses', { category: body.category, vendor: body.vendor || '', description: body.description, amount: Number(body.amount), date: new Date().toISOString(), createdBy: user.name, status: Number(body.amount) > limit ? 'pending' : 'approved' })
  if (e.status === 'approved') e.approvedBy = 'Auto (below limit)'
  log('created', 'expense', e.description, `${inr(e.amount)} ${e.category}${e.status === 'pending' ? ` → needs approval (limit ${inr(limit)})` : ''}`)
  if (e.status === 'pending') notify({ title: 'Expense needs approval', body: `${e.description}: ${inr(e.amount)}`, type: 'finance', roles: ['admin'] })
  return e
})
route('POST', '/api/expenses/:id/approve', 'Accounting', 'Approve (checker). The admin who created it cannot approve it when another admin exists.', ({ s, params, user, log }) => {
  need(user, 'admin')
  const e = find(s.expenses, params.id, 'Expense')
  if (e.status !== 'pending') throw new HttpError(409, `Expense is already ${e.status}`)
  const others = s.users.filter((u) => u.role === 'admin' && u.name !== e.createdBy)
  if (e.createdBy === user.name && others.length) throw new HttpError(409, `Maker-checker rule: ${e.createdBy} created this, so ${others.map((u) => u.name).join(' or ')} must approve it.`)
  e.status = 'approved'
  e.approvedBy = user.name
  log('approved', 'expense', e.description, inr(e.amount))
  return e
})
route('POST', '/api/expenses/:id/reject', 'Accounting', 'Reject a pending expense (admin).', ({ s, params, user, log }) => {
  need(user, 'admin')
  const e = find(s.expenses, params.id, 'Expense')
  e.status = 'rejected'
  e.approvedBy = user.name
  log('rejected', 'expense', e.description, inr(e.amount))
  return e
})
route('GET', '/api/reports/financial', 'Accounting', 'Income vs expense by month, spend by category, budget vs actual.', ({ s }) => {
  const periods = [...new Set(s.invoices.map((i) => i.period))].sort()
  const byCategory = {}
  s.expenses.filter((e) => e.status === 'approved').forEach((e) => (byCategory[e.category] = (byCategory[e.category] || 0) + e.amount))
  const income = s.payments.reduce((a, p) => a + p.amount, 0)
  const expense = Object.values(byCategory).reduce((a, v) => a + v, 0)
  const cur = periods.at(-1)
  return {
    income, expense, balance: income - expense,
    byCategory: Object.entries(byCategory).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    budget: s.expenseCategories.map((c) => ({ name: c.name, budget: c.budgetMonthly || 0, actual: s.expenses.filter((e) => e.category === c.name && e.status === 'approved' && e.date.startsWith(cur)).reduce((a, e) => a + e.amount, 0) })),
    monthly: periods.map((p) => ({ period: p, label: new Date(p + '-01').toLocaleString('en', { month: 'short' }), income: s.payments.filter((x) => x.paidAt.startsWith(p)).reduce((a, x) => a + x.amount, 0), expense: s.expenses.filter((e) => e.date.startsWith(p) && e.status === 'approved').reduce((a, e) => a + e.amount, 0) })),
  }
})

// ============================================================================
// Visitors & gate
// ============================================================================
route('GET', '/api/visitors', 'Visitors & Gate', 'Visitor log. Filters: status, date, unitId. Residents see their unit.', ({ s, query, user }) =>
  unitScoped(user, s.visitors).filter((v) => (!query.status || v.status === query.status) && (!query.date || v.checkIn.startsWith(query.date)) && (!query.unitId || v.unitId === query.unitId)).sort((a, b) => b.checkIn.localeCompare(a.checkIn)))
route('POST', '/api/visitors', 'Visitors & Gate', 'Guard logs a visitor. Unit must exist and be occupied. Sends an approval request to the unit.', ({ s, body, user, add, log, notify }) => {
  need(user, 'guard', 'admin')
  required(body, ['name', 'unitId'])
  const unit = s.units.find((u) => u.id === body.unitId)
  if (!unit) throw new HttpError(404, `No unit ${body.unitId} in ${s.society.name}`)
  if (unit.occupancy === 'vacant') throw new HttpError(409, `${unit.id} is vacant. Ask the visitor to contact the society office.`)
  const auto = body.type === 'delivery' && body.leaveAtGate
  const v = add('visitors', { name: body.name, phone: body.phone || '', type: body.type || 'guest', company: body.company || null, unitId: unit.id, vehicle: body.vehicle || null, gate: body.gate || 'Gate 1', status: auto ? 'exited' : 'pending', checkIn: new Date().toISOString(), checkOut: auto ? new Date().toISOString() : null, approvedBy: auto ? 'Left at gate' : null, loggedBy: user.name })
  log('logged', 'visitor', v.name, `${v.type} for ${unit.id} at ${v.gate}${auto ? ', parcel left at gate' : ', waiting for approval'}`)
  notify({ title: auto ? 'Parcel at the gate' : 'Visitor waiting at gate', body: `${v.name}${v.company ? ` (${v.company})` : ''} for ${unit.id}`, type: 'visitor', roles: ['resident'], unitId: unit.id })
  return v
})
const decide = (status) => ({ s, params, user, log }) => {
  const v = find(s.visitors, params.id, 'Visitor')
  if (user.role === 'resident' && v.unitId !== user.unitId) throw new HttpError(403, 'Not your visitor')
  if (v.status !== 'pending') throw new HttpError(409, `Visitor already ${v.status}`)
  v.status = status
  v.approvedBy = user.name
  if (status === 'denied') v.checkOut = new Date().toISOString()
  log(status === 'inside' ? 'approved' : 'denied', 'visitor', v.name, `Entry for ${v.unitId}`)
  return v
}
route('POST', '/api/visitors/:id/approve', 'Visitors & Gate', 'Resident (or admin) approves entry.', decide('inside'))
route('POST', '/api/visitors/:id/deny', 'Visitors & Gate', 'Resident (or admin) denies entry.', decide('denied'))
route('POST', '/api/visitors/:id/checkout', 'Visitors & Gate', 'Guard marks exit.', ({ s, params, user, log }) => {
  need(user, 'guard', 'admin')
  const v = find(s.visitors, params.id, 'Visitor')
  if (v.status !== 'inside') throw new HttpError(409, 'Visitor is not inside')
  v.status = 'exited'
  v.checkOut = new Date().toISOString()
  log('checked out', 'visitor', v.name, `Left ${v.unitId}`)
  return v
})
route('GET', '/api/visitors/preapprovals', 'Visitors & Gate', 'Active gate passes.', ({ s, user }) => unitScoped(user, s.preApprovals).filter((p) => !p.used && new Date(p.validUntil) > new Date()))
route('POST', '/api/visitors/preapprove', 'Visitors & Gate', 'Resident creates a one-time gate pass (6-digit OTP, 24h).', ({ s, body, user, add, log }) => {
  required(body, ['name'])
  const unitId = user.role === 'resident' ? user.unitId : body.unitId
  if (!unitId) throw new HttpError(422, 'unitId is required')
  const p = add('preApprovals', { code: String(Math.floor(100000 + Math.random() * 900000)), name: body.name, phone: body.phone || '', unitId, type: body.type || 'guest', validUntil: new Date(Date.now() + 86400000).toISOString(), createdBy: user.name, used: false })
  log('created', 'gate pass', p.name, `For ${unitId}, valid 24h`)
  return p
})
route('POST', '/api/visitors/verify-code', 'Visitors & Gate', 'Guard verifies an OTP and checks the visitor in.', ({ s, body, user, add, log }) => {
  const p = s.preApprovals.find((x) => x.code === String(body?.code) && !x.used)
  if (!p) throw new HttpError(404, 'Invalid or already used code')
  if (new Date(p.validUntil) < new Date()) throw new HttpError(410, 'Gate pass expired')
  p.used = true
  const v = add('visitors', { name: p.name, phone: p.phone || '', type: p.type, company: null, unitId: p.unitId, vehicle: null, gate: body.gate || 'Gate 1', status: 'inside', checkIn: new Date().toISOString(), checkOut: null, approvedBy: `Pass by ${p.createdBy}`, loggedBy: user.name })
  log('checked in', 'visitor', v.name, `Gate pass OTP for ${v.unitId}`)
  return v
})
route('GET', '/api/daily-help', 'Visitors & Gate', 'Daily help with in/out status.', ({ s, user }) => (user.role === 'resident' ? s.dailyHelp.filter((h) => h.units.includes(user.unitId)) : s.dailyHelp))
route('POST', '/api/daily-help/:id/toggle', 'Visitors & Gate', 'Mark daily help entry/exit (notifies their units).', ({ s, params, user, log, notify }) => {
  need(user, 'guard', 'admin')
  const h = find(s.dailyHelp, params.id, 'Daily help')
  h.inside = !h.inside
  if (h.inside) h.lastIn = new Date().toISOString()
  log(h.inside ? 'checked in' : 'checked out', 'daily help', h.name, h.units.join(', '))
  h.units.forEach((unitId) => notify({ title: `${h.name} ${h.inside ? 'arrived' : 'left'}`, body: `${h.role} at the gate`, type: 'visitor', roles: ['resident'], unitId }))
  return h
})

// ============================================================================
// Helpdesk
// ============================================================================
route('GET', '/api/tickets', 'Helpdesk', 'Tickets. Filters: status, category, priority, unitId. Residents see own + common-area.', ({ s, query, user }) =>
  s.tickets
    .filter((t) => (user.role !== 'resident' || t.unitId === user.unitId || t.scope === 'common') && (!query.status || t.status === query.status) && (!query.category || t.category === query.category) && (!query.priority || t.priority === query.priority) && (!query.unitId || t.unitId === query.unitId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((t) => ({ ...t, slaBreached: !['resolved', 'closed'].includes(t.status) && t.slaDueAt && new Date(t.slaDueAt) < new Date() })))
route('POST', '/api/tickets', 'Helpdesk', 'Raise a ticket. AI fills category, priority, SLA and assignee from the category master unless given.', ({ s, body, user, add, log, notify }) => {
  required(body, ['title'])
  const triage = ai.classifyTicket(body, s.ticketCategories)
  const cat = s.ticketCategories.find((c) => c.name === (body.category || triage.category)) || s.ticketCategories[0]
  const nums = s.tickets.map((t) => Number(t.id.split('-').at(-1))).filter(Boolean)
  const createdAt = new Date()
  const priority = body.priority || triage.priority
  const sla = priority === 'urgent' ? Math.min(cat.slaHours, 4) : cat.slaHours
  const t = add('tickets', {
    id: `TCK-${s.society.code}-${(nums.length ? Math.max(...nums) : 1000) + 1}`, title: body.title, description: body.description || '', category: cat.name, priority, scope: body.scope || triage.scope, sentiment: triage.sentiment,
    unitId: user.unitId || body.unitId || null, raisedBy: user.name, assignee: body.assignee || cat.assignee, status: 'assigned', createdAt: createdAt.toISOString(), slaDueAt: new Date(createdAt.getTime() + sla * 3600000).toISOString(), comments: [],
  })
  log('raised', 'ticket', t.id, `${t.title} → ${t.category} (${t.priority}), assigned to ${t.assignee}, SLA ${sla}h`)
  notify({ title: `New ${t.priority} ticket`, body: `${t.id}: ${t.title}`, type: 'ticket', roles: ['admin'] })
  return t
})
route('PATCH', '/api/tickets/:id', 'Helpdesk', 'Update status, assignee, priority or rating. Residents may only reopen/close/rate their own.', ({ s, params, body, user, log, notify }) => {
  const t = find(s.tickets, params.id, 'Ticket')
  if (user.role === 'resident') {
    if (t.unitId !== user.unitId) throw new HttpError(403, 'Not your ticket')
    const allowed = ['rating', 'status']
    if (Object.keys(body).some((k) => !allowed.includes(k)) || (body.status && !['closed', 'open'].includes(body.status))) throw new HttpError(403, 'Residents can only rate, close or reopen')
  }
  const before = t.status
  Object.assign(t, body)
  if (body.status === 'resolved') t.resolvedAt = new Date().toISOString()
  if (body.status === 'open' && before === 'resolved') t.reopened = (t.reopened || 0) + 1
  const what = body.status ? `status ${before} → ${body.status}` : body.assignee ? `assigned to ${body.assignee}` : body.rating ? `rated ${body.rating}★` : 'updated'
  log('updated', 'ticket', t.id, what)
  if (body.status === 'resolved') notify({ title: `${t.id} resolved`, body: 'Please confirm and rate the fix', type: 'ticket', roles: ['resident'], unitId: t.unitId })
  return t
})
route('POST', '/api/tickets/:id/comments', 'Helpdesk', 'Add a comment.', ({ s, params, body, user, log }) => {
  const t = find(s.tickets, params.id, 'Ticket')
  required(body, ['text'])
  t.comments.push({ by: user.name, text: body.text, at: new Date().toISOString() })
  if (t.status === 'assigned' && user.role !== 'resident') t.status = 'in_progress'
  log('commented', 'ticket', t.id, body.text.slice(0, 60))
  return t
})

// ============================================================================
// Communication
// ============================================================================
route('GET', '/api/notices', 'Communication', 'Notices, pinned first.', ({ s }) => s.notices.slice().sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt)))
route('POST', '/api/notices', 'Communication', 'Publish a notice (admin).', ({ s, body, user, add, log, notify }) => {
  need(user, 'admin')
  required(body, ['title', 'body'])
  const n = add('notices', { audience: 'All residents', category: 'General', pinned: false, ...body, createdAt: new Date().toISOString(), author: user.name, reads: 0 })
  log('published', 'notice', n.title, `To ${n.audience}`)
  notify({ title: 'New notice', body: n.title, type: 'notice', roles: ['resident', 'guard'] })
  return n
})
route('DELETE', '/api/notices/:id', 'Communication', 'Delete a notice (admin).', ({ db, s, params, user, log }) => {
  need(user, 'admin')
  const n = find(s.notices, params.id, 'Notice')
  remove(db, 'notices', n.id)
  log('deleted', 'notice', n.title, '')
  return { ok: true }
})
route('GET', '/api/polls', 'Communication', 'Polls with results.', ({ s, user }) => s.polls.map((p) => ({ ...p, voted: p.voters.includes(user.id), closed: new Date(p.closesAt) < new Date() })))
route('POST', '/api/polls', 'Communication', 'Create a poll (admin). Body: { question, options[], days }.', ({ s, body, user, add, log }) => {
  need(user, 'admin')
  const opts = (body.options || []).filter(Boolean)
  if (!body.question || opts.length < 2) throw new HttpError(422, 'Question and at least 2 options required')
  const p = add('polls', { question: body.question, options: opts.map((text, i) => ({ id: 'o' + (i + 1), text, votes: 0 })), closesAt: new Date(Date.now() + (Number(body.days) || 7) * 86400000).toISOString(), voters: [], createdAt: new Date().toISOString(), createdBy: user.name })
  log('created', 'poll', p.question, `${opts.length} options`)
  return p
})
route('POST', '/api/polls/:id/vote', 'Communication', 'Vote once per user. Body: { optionId }.', ({ s, params, body, user, log }) => {
  const p = find(s.polls, params.id, 'Poll')
  if (user.role === 'guard') throw new HttpError(403, 'Staff cannot vote')
  if (p.voters.includes(user.id)) throw new HttpError(409, 'You already voted')
  if (new Date(p.closesAt) < new Date()) throw new HttpError(409, 'Poll closed')
  const o = p.options.find((x) => x.id === body?.optionId)
  if (!o) throw new HttpError(422, 'Invalid option')
  o.votes++
  p.voters.push(user.id)
  log('voted', 'poll', p.question, '')
  return { ...p, voted: true }
})
route('GET', '/api/notifications', 'Communication', 'Notifications for the current user (role + unit).', ({ s, user }) =>
  s.notifications.filter((n) => n.roles.includes(user.role === 'super_admin' ? 'admin' : user.role) && (!n.unitId || user.role !== 'resident' || n.unitId === user.unitId)).sort((a, b) => b.at.localeCompare(a.at)))
route('POST', '/api/notifications/read-all', 'Communication', 'Mark all as read.', ({ s, user }) => {
  s.notifications.filter((n) => n.roles.includes(user.role === 'super_admin' ? 'admin' : user.role)).forEach((n) => (n.read = true))
  return { ok: true }
})

// ============================================================================
// Amenities, documents, staff, parking, SOS
// ============================================================================
route('GET', '/api/amenities', 'Amenities', 'Amenities from the master table.', ({ s }) => s.amenities)
route('GET', '/api/amenities/:id/availability', 'Amenities', 'Slot availability. Query: date=YYYY-MM-DD.', ({ s, params, query }) => {
  const a = find(s.amenities, params.id, 'Amenity')
  const date = query.date || new Date().toISOString().slice(0, 10)
  return a.slots.map((slot) => {
    const taken = s.bookings.filter((b) => b.amenityId === a.id && b.date === date && b.slot === slot && b.status !== 'cancelled').length
    const cap = a.requiresApproval ? 1 : a.capacity
    return { slot, taken, capacity: cap, available: taken < cap }
  })
})
route('GET', '/api/bookings', 'Amenities', 'Bookings. Residents see their unit.', ({ s, user }) => unitScoped(user, s.bookings).slice().sort((a, b) => b.date.localeCompare(a.date)).map((b) => ({ ...b, amenity: s.amenities.find((a) => a.id === b.amenityId)?.name || 'Removed amenity' })))
route('POST', '/api/bookings', 'Amenities', 'Book a slot (resident). Blocks clashes, past dates and units with 2+ unpaid bills.', ({ s, body, user, add, log }) => {
  if (user.role !== 'resident') throw new HttpError(403, 'Bookings are made by residents')
  required(body, ['amenityId', 'date', 'slot'])
  const a = find(s.amenities, body.amenityId, 'Amenity')
  if (body.date < new Date().toISOString().slice(0, 10)) throw new HttpError(422, 'Pick today or a future date')
  const openBills = s.invoices.filter((i) => i.unitId === user.unitId && isOpen(i)).length
  if (s.society.blockDefaulterBookings !== false && openBills >= 2) throw new HttpError(409, `Booking blocked: ${user.unitId} has ${openBills} unpaid bills. Clear dues in Billing first.`)
  const taken = s.bookings.filter((b) => b.amenityId === a.id && b.date === body.date && b.slot === body.slot && b.status !== 'cancelled').length
  if (taken >= (a.requiresApproval ? 1 : a.capacity)) throw new HttpError(409, 'Slot is full')
  const b = add('bookings', { amenityId: a.id, unitId: user.unitId, date: body.date, slot: body.slot, status: a.requiresApproval ? 'pending' : 'confirmed', bookedBy: user.name, fee: a.fee })
  log('booked', 'amenity', a.name, `${body.date} ${body.slot} for ${user.unitId}${b.status === 'pending' ? ', awaiting approval' : ''}`)
  return b
})
route('PATCH', '/api/bookings/:id', 'Amenities', 'Approve/reject (admin) or cancel (own). Body: { status }.', ({ s, params, body, user, log }) => {
  const b = find(s.bookings, params.id, 'Booking')
  if (user.role === 'resident' && (b.unitId !== user.unitId || body.status !== 'cancelled')) throw new HttpError(403, 'You can only cancel your own booking')
  b.status = body.status
  log(body.status, 'booking', s.amenities.find((a) => a.id === b.amenityId)?.name || b.id, `${b.date} ${b.slot}, ${b.unitId}`)
  return b
})
route('GET', '/api/documents', 'Documents', 'Documents visible to the current user.', ({ s, user }) => {
  const owner = user.role === 'resident' && s.residents.find((r) => r.id === user.residentId)?.type === 'owner'
  return s.documents.filter((d) => d.access === 'all' || isAdmin(user) || (d.access === 'owners' && owner))
})
route('POST', '/api/documents', 'Documents', 'Upload document metadata (admin).', ({ s, body, user, add, log }) => {
  need(user, 'admin')
  required(body, ['name'])
  const d = add('documents', { size: '—', access: 'all', category: 'General', ...body, uploadedAt: new Date().toISOString(), uploadedBy: user.name })
  log('uploaded', 'document', d.name, `Visible to ${d.access}`)
  return d
})
route('GET', '/api/staff', 'Staff', 'Staff with attendance (from the staff master).', ({ s }) => s.staff)
route('POST', '/api/staff/:id/attendance', 'Staff', 'Toggle today’s attendance.', ({ s, params, user, log }) => {
  need(user, 'admin', 'guard')
  const x = find(s.staff, params.id, 'Staff')
  x.present = !x.present
  log('marked', 'attendance', x.name, x.present ? 'Present' : 'Absent')
  return x
})
route('GET', '/api/parking', 'Parking', 'Parking slots and allotment.', ({ s }) => s.parking)
route('PATCH', '/api/parking/:id', 'Parking', 'Allot or free a slot (admin). Body: { unitId | null }. Parking charge applies from the next bill.', ({ s, params, body, user, log }) => {
  need(user, 'admin')
  const p = find(s.parking, params.id, 'Slot')
  if (body.unitId) {
    const u = find(s.units, body.unitId, 'Unit')
    if (u.occupancy === 'vacant') throw new HttpError(409, `${u.id} is vacant`)
  }
  p.unitId = body.unitId || null
  log(p.unitId ? 'allotted' : 'freed', 'parking', p.id, p.unitId ? `To ${p.unitId}; billed from next cycle` : 'Slot now free')
  return p
})
route('GET', '/api/sos', 'Safety', 'SOS alerts.', ({ s }) => s.sos.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
route('POST', '/api/sos', 'Safety', 'Raise an SOS. Body: { type, message }.', ({ s, body, user, add, log, notify }) => {
  const x = add('sos', { unitId: user.unitId || 'Gate', type: body?.type || 'Emergency', message: body?.message || '', status: 'active', createdAt: new Date().toISOString(), raisedBy: user.name })
  log('raised', 'SOS', x.type, `${x.unitId}: ${x.message || 'needs help'}`)
  notify({ title: `🚨 SOS: ${x.type}`, body: `${x.unitId}: ${x.message || 'Needs immediate help'}`, type: 'sos', roles: ['admin', 'guard'] })
  return x
})
route('POST', '/api/sos/:id/resolve', 'Safety', 'Resolve an SOS (admin/guard).', ({ s, params, user, log }) => {
  need(user, 'admin', 'guard')
  const x = find(s.sos, params.id, 'SOS')
  Object.assign(x, { status: 'resolved', resolvedAt: new Date().toISOString(), resolvedBy: user.name })
  log('resolved', 'SOS', x.type, x.unitId)
  return x
})
route('GET', '/api/activity', 'Society', 'Audit trail: who did what, when. Filters: entity, actorRole, q. Residents see their own actions.', ({ s, query, user }) => {
  const q = (query.q || '').toLowerCase()
  return s.activity
    .filter((a) => (user.role !== 'resident' || a.actor === user.name) && (!query.entity || a.entity === query.entity) && (!query.actorRole || a.actorRole === query.actorRole) && (!q || `${a.actor} ${a.action} ${a.entity} ${a.entityId} ${a.detail}`.toLowerCase().includes(q)))
    .sort((a, b) => b.at.localeCompare(a.at))
})

// ============================================================================
// AI
// ============================================================================
route('POST', '/api/ai/chat', 'AI', 'Assistant chat. Body: { message }. Platform owner without a society gets platform answers.', ({ db, s, body, user }) => (s ? ai.chat(s, user, body?.message || '') : ai.platformChat(db, body?.message || '')), { tenant: 'optional' })
route('POST', '/api/ai/classify-ticket', 'AI', 'Triage text: category, priority, sentiment, SLA, assignee, suggested reply. Body: { title, description }.', ({ s, body }) => ai.classifyTicket(body || {}, s.ticketCategories))
route('POST', '/api/ai/draft-notice', 'AI', 'Draft a notice. Body: { prompt, tone: friendly|formal|urgent }.', ({ s, body }) => ai.draftNotice(body || {}, s.society.name))
route('POST', '/api/ai/structure', 'AI', 'Turn a plain-English description into blocks + unit types for onboarding. Body: { text }.', ({ body }) => ai.structureFromText(body?.text || ''), { tenant: false })
route('POST', '/api/ai/explain-ledger', 'AI', 'Explain a unit’s balance in plain words. Body: { unitId }.', ({ s, body, user }) => {
  const unitId = user.role === 'resident' ? user.unitId : body?.unitId
  find(s.units, unitId, 'Unit')
  return { text: ai.explainLedger(unitId, ledger(s, unitId), s.residents.filter((r) => r.unitId === unitId)) }
})
route('GET', '/api/ai/insights', 'AI', 'Anomalies: spend spikes, budgets, SLA breaches, collection, contracts, leases.', ({ s }) => ai.insights(s))
route('GET', '/api/ai/defaulter-risk', 'AI', 'Predicted default risk per unit (admin).', ({ s, user }) => {
  need(user, 'admin')
  return ai.defaulterRisk(s)
})
route('GET', '/api/ai/ticket-summary', 'AI', 'Summary of open tickets.', ({ s }) => ai.summarizeTickets(s))

// ============================================================================
// System
// ============================================================================
route('POST', '/api/system/reset', 'System', 'Reset the mock database to seed data.', () => {
  resetDb()
  return { ok: true }
}, { auth: false, tenant: false })

// ---- Dispatcher --------------------------------------------------------------
export async function handle(method, url, { body, token, societyId } = {}) {
  const [path, qs] = url.split('?')
  const query = Object.fromEntries(new URLSearchParams(qs || ''))
  const r = routes.find((x) => x.method === method && x.regex.test(path))
  await new Promise((res) => setTimeout(res, 120 + Math.random() * 280))
  if (!r) throw new HttpError(404, `No route for ${method} ${path}`)
  const db = getDb()
  let user = null
  if (r.auth) {
    user = db.users.find((u) => `tok_${u.id}` === token)
    if (!user) throw new HttpError(401, 'Session expired. Please log in again.')
  }
  if (r.platform && user?.role !== 'super_admin') throw new HttpError(403, 'Platform owner only')

  let sid = null
  if (user) sid = user.role === 'super_admin' ? societyId || null : user.societyId
  const soc = sid && db.societies.find((x) => x.id === sid)
  if (r.tenant === true && !soc) throw new HttpError(400, user?.role === 'super_admin' ? 'Pick a society from the switcher first' : 'No society for this user')
  if (soc && soc.status === 'suspended' && user.role !== 'super_admin') throw new HttpError(403, `${soc.name} is suspended`)
  const s = soc ? scope(db, sid) : null

  const add = (c, obj) => {
    if (!COLLECTIONS.includes(c)) throw new Error('bad collection ' + c)
    const rec = { id: obj.id || nextId(c.slice(0, 3)), societyId: sid, ...obj }
    db[c].push(rec)
    s?.[c].push(rec)
    return rec
  }
  const log = (action, entity, entityId, detail) => add('activity', { at: new Date().toISOString(), actor: user.name, actorRole: user.role, action, entity, entityId, detail })
  const notify = (n) => add('notifications', { read: false, at: new Date().toISOString(), ...n })

  const params = {}
  const m = path.match(r.regex)
  r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])))
  const result = r.handler({ params, query, body: body || {}, user, db, s, sid, add, log, notify })
  if (method !== 'GET') saveDb()
  return JSON.parse(JSON.stringify(result ?? null))
}
