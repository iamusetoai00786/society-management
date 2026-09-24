// In-browser mock REST backend. Each route mirrors the endpoint a real
// backend would expose (see docs/API.md). Handlers receive
// { params, query, body, user, db } and return JSON or throw HttpError.

import { getDb, saveDb, resetDb, nextId } from './db'
import * as ai from './ai'

export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const TOKENS = { 'demo-admin': 'usr_admin', 'demo-resident': 'usr_resident', 'demo-guard': 'usr_guard' }
const ok = (data) => data
const need = (user, ...roles) => {
  if (!roles.includes(user.role)) throw new HttpError(403, `Requires role: ${roles.join(' or ')}`)
}
const find = (list, id, what = 'Resource') => {
  const item = list.find((x) => x.id === id)
  if (!item) throw new HttpError(404, `${what} ${id} not found`)
  return item
}
const notify = (db, n) => db.notifications.unshift({ id: nextId('ntf'), read: false, at: new Date().toISOString(), ...n })
const withUnitScope = (user, list) => (user.role === 'resident' ? list.filter((x) => x.unitId === user.unitId) : list)

export const routes = []
function route(method, path, group, description, handler, { auth = true } = {}) {
  const keys = []
  const regex = new RegExp('^' + path.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '$')
  routes.push({ method, path, group, description, regex, keys, handler, auth })
}

// ---- Auth ------------------------------------------------------------------
route('POST', '/api/auth/login', 'Auth', 'Log in with a demo role (admin, resident, guard). Returns token + user.', ({ body, db }) => {
  const role = body?.role || 'admin'
  const token = `demo-${role}`
  const user = db.users.find((u) => u.id === TOKENS[token])
  if (!user) throw new HttpError(401, 'Unknown role')
  return { token, user }
}, { auth: false })
route('GET', '/api/auth/me', 'Auth', 'Current user profile.', ({ user }) => user)
route('POST', '/api/auth/logout', 'Auth', 'Invalidate the session token.', () => ({ ok: true }))

// ---- Society & dashboard ---------------------------------------------------
route('GET', '/api/society', 'Society', 'Society profile and billing settings.', ({ db }) => db.society)
route('PUT', '/api/society', 'Society', 'Update society profile/settings (admin).', ({ db, body, user }) => {
  need(user, 'admin')
  db.society = { ...db.society, ...body, billing: { ...db.society.billing, ...(body.billing || {}) } }
  return db.society
})
route('GET', '/api/dashboard/summary', 'Dashboard', 'KPIs and chart series for the dashboard.', ({ db, user }) => {
  const period = db.invoices.map((i) => i.period).sort().at(-1)
  const cur = db.invoices.filter((i) => i.period === period)
  const periods = [...new Set(db.invoices.map((i) => i.period))].sort()
  const collections = periods.map((p) => {
    const inv = db.invoices.filter((i) => i.period === p)
    const exp = db.expenses.filter((e) => e.date.startsWith(p) && e.status === 'approved')
    return {
      period: p,
      label: new Date(p + '-01').toLocaleString('en', { month: 'short' }),
      billed: inv.reduce((s, i) => s + i.amount, 0),
      collected: inv.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0),
      expenses: exp.reduce((s, e) => s + e.amount, 0),
    }
  })
  const today = new Date().toISOString().slice(0, 10)
  const openTickets = db.tickets.filter((t) => !['resolved', 'closed'].includes(t.status))
  const mine = user.role === 'resident'
  const myDues = db.invoices.filter((i) => i.unitId === user.unitId && i.status === 'unpaid')
  return {
    period,
    units: db.units.length,
    occupied: db.units.filter((u) => u.occupancy !== 'vacant').length,
    residents: db.residents.length,
    collectionRate: cur.filter((i) => i.status === 'paid').length / (cur.length || 1),
    collectedThisMonth: cur.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0),
    outstanding: db.invoices.filter((i) => i.status === 'unpaid').reduce((s, i) => s + i.amount + i.lateFee, 0),
    openTickets: mine ? openTickets.filter((t) => t.unitId === user.unitId).length : openTickets.length,
    visitorsToday: db.visitors.filter((v) => v.checkIn.startsWith(today) && (!mine || v.unitId === user.unitId)).length,
    visitorsInside: db.visitors.filter((v) => v.status === 'inside').length,
    pendingApprovals: db.expenses.filter((e) => e.status === 'pending').length,
    bookingsToday: db.bookings.filter((b) => b.date === today).length,
    myDues: { count: myDues.length, total: myDues.reduce((s, i) => s + i.amount + i.lateFee, 0) },
    collections,
    ticketsByCategory: Object.entries(openTickets.reduce((a, t) => ((a[t.category] = (a[t.category] || 0) + 1), a), {})).map(([name, value]) => ({ name, value })),
    visitorsByDay: [...Array(7)].map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const k = d.toISOString().slice(0, 10)
      return { day: d.toLocaleString('en', { weekday: 'short' }), count: db.visitors.filter((v) => v.checkIn.startsWith(k)).length }
    }),
  }
})

// ---- Units & residents -----------------------------------------------------
route('GET', '/api/units', 'Units & Residents', 'List units. Filters: block, occupancy.', ({ db, query }) =>
  db.units.filter((u) => (!query.block || u.block === query.block) && (!query.occupancy || u.occupancy === query.occupancy)).map((u) => ({ ...u, residents: db.residents.filter((r) => r.unitId === u.id) })))
route('GET', '/api/units/:id', 'Units & Residents', 'Unit detail with residents, dues and vehicles.', ({ db, params }) => {
  const u = find(db.units, params.id, 'Unit')
  return { ...u, residents: db.residents.filter((r) => r.unitId === u.id), invoices: db.invoices.filter((i) => i.unitId === u.id), parking: db.parking.filter((p) => p.unitId === u.id) }
})
route('GET', '/api/residents', 'Units & Residents', 'List residents. Filters: q (search), type (owner|tenant), block.', ({ db, query }) => {
  const q = (query.q || '').toLowerCase()
  return db.residents.filter((r) => (!q || `${r.name} ${r.unitId} ${r.phone} ${r.email}`.toLowerCase().includes(q)) && (!query.type || r.type === query.type) && (!query.block || r.unitId.startsWith(query.block)))
})
route('POST', '/api/residents', 'Units & Residents', 'Add a resident (admin).', ({ db, body, user }) => {
  need(user, 'admin')
  if (!body.name || !body.unitId) throw new HttpError(422, 'name and unitId are required')
  find(db.units, body.unitId, 'Unit')
  const r = { id: nextId('res'), members: 1, vehicles: [], status: 'active', moveIn: new Date().toISOString(), type: 'owner', ...body }
  db.residents.unshift(r)
  const unit = db.units.find((u) => u.id === body.unitId)
  if (unit.occupancy === 'vacant') unit.occupancy = r.type
  return r
})
route('PUT', '/api/residents/:id', 'Units & Residents', 'Update a resident (admin).', ({ db, params, body, user }) => {
  need(user, 'admin')
  return Object.assign(find(db.residents, params.id, 'Resident'), body)
})
route('DELETE', '/api/residents/:id', 'Units & Residents', 'Remove (move-out) a resident (admin).', ({ db, params, user }) => {
  need(user, 'admin')
  find(db.residents, params.id, 'Resident')
  db.residents = db.residents.filter((r) => r.id !== params.id)
  return { ok: true }
})

// ---- Billing ---------------------------------------------------------------
route('GET', '/api/invoices', 'Billing', 'List invoices. Filters: status, unitId, period. Residents only see their unit.', ({ db, query, user }) =>
  withUnitScope(user, db.invoices)
    .filter((i) => (!query.status || i.status === query.status) && (!query.unitId || i.unitId === query.unitId) && (!query.period || i.period === query.period))
    .sort((a, b) => b.period.localeCompare(a.period) || a.unitId.localeCompare(b.unitId)))
route('GET', '/api/invoices/:id', 'Billing', 'Invoice detail.', ({ db, params }) => find(db.invoices, params.id, 'Invoice'))
route('POST', '/api/invoices/generate', 'Billing', 'Generate invoices for a period (admin). Body: { period: "YYYY-MM" }.', ({ db, body, user }) => {
  need(user, 'admin')
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const period = body?.period || `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`
  if (db.invoices.some((i) => i.period === period)) throw new HttpError(409, `Invoices for ${period} already exist`)
  const { ratePerSqft, sinkingFund, dueDay } = db.society.billing
  const created = db.units.filter((u) => u.occupancy !== 'vacant').map((u) => {
    const maintenance = Math.round(u.areaSqft * ratePerSqft)
    return { id: `INV-${period.replace('-', '')}-${u.id}`, unitId: u.id, period, dueDate: new Date(`${period}-${String(dueDay).padStart(2, '0')}T00:00:00`).toISOString(), items: [{ head: 'Maintenance', amount: maintenance }, { head: 'Sinking Fund', amount: sinkingFund }], amount: maintenance + sinkingFund, lateFee: 0, status: 'unpaid', paidAt: null }
  })
  db.invoices.push(...created)
  notify(db, { title: `Bills for ${period} generated`, body: `${created.length} invoices issued`, type: 'finance', roles: ['admin', 'resident'] })
  return { period, count: created.length, total: created.reduce((s, i) => s + i.amount, 0) }
})
route('POST', '/api/invoices/:id/pay', 'Billing', 'Pay an invoice. Body: { method: "UPI"|"Card"|"Net Banking"|"Cash"|"Cheque" }.', ({ db, params, body, user }) => {
  const inv = find(db.invoices, params.id, 'Invoice')
  if (user.role === 'resident' && inv.unitId !== user.unitId) throw new HttpError(403, 'Not your invoice')
  if (inv.status === 'paid') throw new HttpError(409, 'Invoice already paid')
  inv.status = 'paid'
  inv.paidAt = new Date().toISOString()
  const payment = { id: nextId('pay'), invoiceId: inv.id, unitId: inv.unitId, amount: inv.amount + inv.lateFee, method: body?.method || 'UPI', reference: 'TXN' + Date.now(), paidAt: inv.paidAt }
  db.payments.unshift(payment)
  notify(db, { title: 'Payment received', body: `₹${payment.amount.toLocaleString('en-IN')} from ${inv.unitId} via ${payment.method}`, type: 'finance', roles: ['admin'] })
  return { invoice: inv, payment }
})
route('POST', '/api/invoices/:id/remind', 'Billing', 'Send a payment reminder (push/SMS/WhatsApp) for an invoice (admin).', ({ db, params, user }) => {
  need(user, 'admin')
  const inv = find(db.invoices, params.id, 'Invoice')
  return { ok: true, channels: ['push', 'sms', 'whatsapp'], unitId: inv.unitId }
})
route('POST', '/api/invoices/remind-all', 'Billing', 'Send reminders to every unit with unpaid bills (admin).', ({ db, user }) => {
  need(user, 'admin')
  const units = new Set(db.invoices.filter((i) => i.status === 'unpaid').map((i) => i.unitId))
  return { ok: true, count: units.size }
})
route('GET', '/api/payments', 'Billing', 'Payment history. Residents only see their unit.', ({ db, user }) => withUnitScope(user, db.payments).slice().sort((a, b) => b.paidAt.localeCompare(a.paidAt)))

// ---- Accounting ------------------------------------------------------------
route('GET', '/api/expenses', 'Accounting', 'List expenses. Filters: status, category.', ({ db, query }) =>
  db.expenses.filter((e) => (!query.status || e.status === query.status) && (!query.category || e.category === query.category)).slice().sort((a, b) => b.date.localeCompare(a.date)))
route('POST', '/api/expenses', 'Accounting', 'Record an expense. Amounts above ₹25,000 go to committee approval.', ({ db, body, user }) => {
  need(user, 'admin')
  if (!body.amount || !body.category) throw new HttpError(422, 'amount and category are required')
  const e = { id: nextId('exp'), date: new Date().toISOString(), createdBy: user.name, ...body, amount: Number(body.amount), status: Number(body.amount) > 25000 ? 'pending' : 'approved' }
  db.expenses.unshift(e)
  return e
})
route('POST', '/api/expenses/:id/approve', 'Accounting', 'Approve a pending expense (committee).', ({ db, params, user }) => {
  need(user, 'admin')
  const e = find(db.expenses, params.id, 'Expense')
  e.status = 'approved'
  e.approvedBy = user.name
  return e
})
route('POST', '/api/expenses/:id/reject', 'Accounting', 'Reject a pending expense (committee).', ({ db, params, user }) => {
  need(user, 'admin')
  const e = find(db.expenses, params.id, 'Expense')
  e.status = 'rejected'
  return e
})
route('GET', '/api/reports/financial', 'Accounting', 'Income vs expense by month and by category.', ({ db }) => {
  const periods = [...new Set(db.invoices.map((i) => i.period))].sort()
  const byCategory = {}
  db.expenses.filter((e) => e.status === 'approved').forEach((e) => (byCategory[e.category] = (byCategory[e.category] || 0) + e.amount))
  const income = db.payments.reduce((s, p) => s + p.amount, 0)
  const expense = Object.values(byCategory).reduce((s, v) => s + v, 0)
  return {
    income, expense, balance: income - expense,
    byCategory: Object.entries(byCategory).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
    monthly: periods.map((p) => ({ period: p, label: new Date(p + '-01').toLocaleString('en', { month: 'short' }), income: db.payments.filter((x) => x.paidAt.startsWith(p)).reduce((s, x) => s + x.amount, 0), expense: db.expenses.filter((e) => e.date.startsWith(p) && e.status === 'approved').reduce((s, e) => s + e.amount, 0) })),
  }
})

// ---- Visitors & gate -------------------------------------------------------
route('GET', '/api/visitors', 'Visitors & Gate', 'Visitor log. Filters: status (pending|inside|exited|denied), date (YYYY-MM-DD). Residents see their unit.', ({ db, query, user }) =>
  withUnitScope(user, db.visitors).filter((v) => (!query.status || v.status === query.status) && (!query.date || v.checkIn.startsWith(query.date))))
route('POST', '/api/visitors', 'Visitors & Gate', 'Guard logs a visitor at the gate. Creates an approval request for the resident.', ({ db, body, user }) => {
  need(user, 'guard', 'admin')
  if (!body.name || !body.unitId) throw new HttpError(422, 'name and unitId are required')
  find(db.units, body.unitId, 'Unit')
  const auto = ['delivery'].includes(body.type) && body.leaveAtGate
  const v = { id: nextId('vis'), phone: '', vehicle: null, company: null, type: 'guest', ...body, status: auto ? 'exited' : 'pending', checkIn: new Date().toISOString(), checkOut: auto ? new Date().toISOString() : null, approvedBy: auto ? 'Left at gate' : null }
  db.visitors.unshift(v)
  notify(db, { title: 'Visitor waiting at gate', body: `${v.name} is waiting for ${v.unitId}`, type: 'visitor', roles: ['resident'] })
  return v
})
route('POST', '/api/visitors/:id/approve', 'Visitors & Gate', 'Resident approves entry.', ({ db, params, user }) => {
  const v = find(db.visitors, params.id, 'Visitor')
  v.status = 'inside'
  v.approvedBy = user.name
  return v
})
route('POST', '/api/visitors/:id/deny', 'Visitors & Gate', 'Resident denies entry.', ({ db, params, user }) => {
  const v = find(db.visitors, params.id, 'Visitor')
  v.status = 'denied'
  v.approvedBy = user.name
  v.checkOut = new Date().toISOString()
  return v
})
route('POST', '/api/visitors/:id/checkout', 'Visitors & Gate', 'Guard marks visitor exit.', ({ db, params }) => {
  const v = find(db.visitors, params.id, 'Visitor')
  v.status = 'exited'
  v.checkOut = new Date().toISOString()
  return v
})
route('GET', '/api/visitors/preapprovals', 'Visitors & Gate', 'List active gate passes.', ({ db, user }) => withUnitScope(user, db.preApprovals).filter((p) => !p.used))
route('POST', '/api/visitors/preapprove', 'Visitors & Gate', 'Resident creates a gate pass. Returns a 6-digit OTP / QR payload.', ({ db, body, user }) => {
  if (!body.name) throw new HttpError(422, 'name is required')
  const p = { id: nextId('pre'), code: String(Math.floor(100000 + Math.random() * 900000)), unitId: user.unitId || body.unitId, type: 'guest', validUntil: new Date(Date.now() + 86400000).toISOString(), createdBy: user.id, used: false, ...body }
  db.preApprovals.unshift(p)
  return p
})
route('POST', '/api/visitors/verify-code', 'Visitors & Gate', 'Guard verifies a gate-pass OTP and checks the visitor in.', ({ db, body }) => {
  const p = db.preApprovals.find((x) => x.code === String(body?.code) && !x.used)
  if (!p) throw new HttpError(404, 'Invalid or expired code')
  p.used = true
  const v = { id: nextId('vis'), name: p.name, phone: p.phone || '', type: p.type, company: null, unitId: p.unitId, vehicle: null, status: 'inside', checkIn: new Date().toISOString(), checkOut: null, approvedBy: 'Pre-approved' }
  db.visitors.unshift(v)
  return v
})
route('GET', '/api/daily-help', 'Visitors & Gate', 'Registered daily help (maids, drivers, cooks) with in/out status.', ({ db }) => db.dailyHelp)
route('POST', '/api/daily-help/:id/toggle', 'Visitors & Gate', 'Mark daily help entry/exit at the gate.', ({ db, params }) => {
  const h = find(db.dailyHelp, params.id, 'Daily help')
  h.inside = !h.inside
  if (h.inside) h.lastIn = new Date().toISOString()
  return h
})

// ---- Helpdesk --------------------------------------------------------------
route('GET', '/api/tickets', 'Helpdesk', 'List tickets. Filters: status, category, priority. Residents see their own + common-area tickets.', ({ db, query, user }) =>
  db.tickets.filter((t) => (user.role !== 'resident' || t.unitId === user.unitId || t.scope === 'common') && (!query.status || t.status === query.status) && (!query.category || t.category === query.category) && (!query.priority || t.priority === query.priority)))
route('POST', '/api/tickets', 'Helpdesk', 'Raise a ticket. AI auto-fills category/priority/assignee when omitted.', ({ db, body, user }) => {
  if (!body.title) throw new HttpError(422, 'title is required')
  const triage = ai.classifyTicket(body)
  const num = Math.max(...db.tickets.map((t) => Number(t.id.split('-')[1]))) + 1
  const t = { id: `TCK-${num}`, status: 'open', createdAt: new Date().toISOString(), comments: [], unitId: user.unitId || body.unitId, raisedBy: user.name, category: triage.category, priority: triage.priority, scope: triage.scope, sentiment: triage.sentiment, assignee: triage.suggestedAssignee, ...body }
  if (t.assignee) t.status = 'assigned'
  db.tickets.unshift(t)
  notify(db, { title: `New ${t.priority} ticket`, body: `${t.id}: ${t.title}`, type: 'ticket', roles: ['admin'] })
  return t
})
route('PATCH', '/api/tickets/:id', 'Helpdesk', 'Update status, assignee, priority or rating.', ({ db, params, body }) => {
  const t = find(db.tickets, params.id, 'Ticket')
  Object.assign(t, body)
  return t
})
route('POST', '/api/tickets/:id/comments', 'Helpdesk', 'Add a comment to a ticket.', ({ db, params, body, user }) => {
  const t = find(db.tickets, params.id, 'Ticket')
  if (!body.text) throw new HttpError(422, 'text is required')
  t.comments.push({ by: user.name, text: body.text, at: new Date().toISOString() })
  return t
})

// ---- Communication ---------------------------------------------------------
route('GET', '/api/notices', 'Communication', 'List notices (pinned first).', ({ db }) => db.notices.slice().sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt)))
route('POST', '/api/notices', 'Communication', 'Publish a notice (admin).', ({ db, body, user }) => {
  need(user, 'admin')
  if (!body.title || !body.body) throw new HttpError(422, 'title and body are required')
  const n = { id: nextId('ntc'), audience: 'All residents', category: 'General', pinned: false, createdAt: new Date().toISOString(), author: user.name, reads: 0, ...body }
  db.notices.unshift(n)
  notify(db, { title: 'New notice', body: n.title, type: 'notice', roles: ['resident', 'guard'] })
  return n
})
route('DELETE', '/api/notices/:id', 'Communication', 'Delete a notice (admin).', ({ db, params, user }) => {
  need(user, 'admin')
  db.notices = db.notices.filter((n) => n.id !== params.id)
  return { ok: true }
})
route('GET', '/api/polls', 'Communication', 'List polls with results.', ({ db, user }) => db.polls.map((p) => ({ ...p, voted: p.voters.includes(user.id), closed: new Date(p.closesAt) < new Date() })))
route('POST', '/api/polls', 'Communication', 'Create a poll (admin). Body: { question, options: string[], days }.', ({ db, body, user }) => {
  need(user, 'admin')
  const opts = (body.options || []).filter(Boolean)
  if (!body.question || opts.length < 2) throw new HttpError(422, 'question and at least 2 options required')
  const p = { id: nextId('pol'), question: body.question, options: opts.map((text, i) => ({ id: 'o' + (i + 1), text, votes: 0 })), closesAt: new Date(Date.now() + (body.days || 7) * 86400000).toISOString(), voters: [], createdAt: new Date().toISOString() }
  db.polls.unshift(p)
  return p
})
route('POST', '/api/polls/:id/vote', 'Communication', 'Vote once per user. Body: { optionId }.', ({ db, params, body, user }) => {
  const p = find(db.polls, params.id, 'Poll')
  if (p.voters.includes(user.id)) throw new HttpError(409, 'Already voted')
  if (new Date(p.closesAt) < new Date()) throw new HttpError(409, 'Poll closed')
  const o = p.options.find((x) => x.id === body?.optionId)
  if (!o) throw new HttpError(422, 'Invalid option')
  o.votes++
  p.voters.push(user.id)
  return { ...p, voted: true }
})
route('GET', '/api/notifications', 'Communication', 'Notifications for the current user role.', ({ db, user }) => db.notifications.filter((n) => n.roles.includes(user.role)))
route('POST', '/api/notifications/read-all', 'Communication', 'Mark all notifications as read.', ({ db, user }) => {
  db.notifications.filter((n) => n.roles.includes(user.role)).forEach((n) => (n.read = true))
  return { ok: true }
})

// ---- Amenities -------------------------------------------------------------
route('GET', '/api/amenities', 'Amenities', 'List amenities with slots, fees and rules.', ({ db }) => db.amenities)
route('GET', '/api/amenities/:id/availability', 'Amenities', 'Slot availability for a date. Query: date=YYYY-MM-DD.', ({ db, params, query }) => {
  const a = find(db.amenities, params.id, 'Amenity')
  const date = query.date || new Date().toISOString().slice(0, 10)
  return a.slots.map((slot) => {
    const taken = db.bookings.filter((b) => b.amenityId === a.id && b.date === date && b.slot === slot && b.status !== 'cancelled').length
    const cap = a.requiresApproval ? 1 : a.capacity
    return { slot, taken, capacity: cap, available: taken < cap }
  })
})
route('GET', '/api/bookings', 'Amenities', 'List bookings. Residents see their unit.', ({ db, user }) => withUnitScope(user, db.bookings).slice().sort((a, b) => b.date.localeCompare(a.date)))
route('POST', '/api/bookings', 'Amenities', 'Book a slot. Body: { amenityId, date, slot }. Prevents clashes.', ({ db, body, user }) => {
  const a = find(db.amenities, body.amenityId, 'Amenity')
  if (!body.date || !body.slot) throw new HttpError(422, 'date and slot are required')
  const taken = db.bookings.filter((b) => b.amenityId === a.id && b.date === body.date && b.slot === body.slot && b.status !== 'cancelled').length
  if (taken >= (a.requiresApproval ? 1 : a.capacity)) throw new HttpError(409, 'Slot is full')
  const b = { id: nextId('bkg'), amenityId: a.id, unitId: user.unitId || 'A-101', date: body.date, slot: body.slot, status: a.requiresApproval ? 'pending' : 'confirmed', bookedBy: user.name }
  db.bookings.unshift(b)
  return b
})
route('PATCH', '/api/bookings/:id', 'Amenities', 'Approve/cancel a booking. Body: { status }.', ({ db, params, body }) => Object.assign(find(db.bookings, params.id, 'Booking'), { status: body.status }))

// ---- Documents, staff, parking, SOS ----------------------------------------
route('GET', '/api/documents', 'Documents', 'Documents visible to the current role.', ({ db, user }) => db.documents.filter((d) => d.access === 'all' || user.role === 'admin' || (d.access === 'owners' && user.title === 'Owner')))
route('POST', '/api/documents', 'Documents', 'Upload document metadata (admin). Body: { name, category, access }.', ({ db, body, user }) => {
  need(user, 'admin')
  const d = { id: nextId('doc'), size: body.size || '—', access: 'all', category: 'General', uploadedAt: new Date().toISOString(), ...body }
  db.documents.unshift(d)
  return d
})
route('GET', '/api/staff', 'Staff', 'Society staff with attendance.', ({ db }) => db.staff)
route('POST', '/api/staff/:id/attendance', 'Staff', 'Toggle today’s attendance for a staff member.', ({ db, params }) => {
  const s = find(db.staff, params.id, 'Staff')
  s.present = !s.present
  return s
})
route('GET', '/api/parking', 'Parking', 'Parking slots and allocation.', ({ db }) => db.parking)
route('GET', '/api/sos', 'Safety', 'SOS alerts (admin/guard).', ({ db }) => db.sos)
route('POST', '/api/sos', 'Safety', 'Raise an SOS alert. Body: { type, message }.', ({ db, body, user }) => {
  const s = { id: nextId('sos'), unitId: user.unitId || 'Gate', type: body?.type || 'Emergency', message: body?.message || '', status: 'active', createdAt: new Date().toISOString(), raisedBy: user.name }
  db.sos.unshift(s)
  notify(db, { title: `🚨 SOS: ${s.type}`, body: `${s.unitId}: ${s.message || 'Needs immediate help'}`, type: 'sos', roles: ['admin', 'guard'] })
  return s
})
route('POST', '/api/sos/:id/resolve', 'Safety', 'Resolve an SOS alert.', ({ db, params }) => Object.assign(find(db.sos, params.id, 'SOS'), { status: 'resolved', resolvedAt: new Date().toISOString() }))

// ---- AI --------------------------------------------------------------------
route('POST', '/api/ai/chat', 'AI', 'Assistant chat. Body: { message }. Returns { reply, suggestions, action? }.', ({ db, body, user }) => ai.chat(db, user, body?.message || ''))
route('POST', '/api/ai/classify-ticket', 'AI', 'Triage text into category, priority, sentiment, assignee and suggested reply. Body: { title, description }.', ({ body }) => ai.classifyTicket(body || {}))
route('POST', '/api/ai/draft-notice', 'AI', 'Draft a notice from a one-line prompt. Body: { prompt, tone: friendly|formal|urgent }.', ({ body }) => ai.draftNotice(body || {}))
route('GET', '/api/ai/insights', 'AI', 'Anomaly detection and recommendations across finance, tickets and approvals.', ({ db }) => ai.insights(db))
route('GET', '/api/ai/defaulter-risk', 'AI', 'Predicted payment-default risk score per unit.', ({ db, user }) => {
  need(user, 'admin')
  return ai.defaulterRisk(db)
})
route('GET', '/api/ai/ticket-summary', 'AI', 'Natural-language summary of open tickets.', ({ db }) => ai.summarizeTickets(db))

// ---- System ----------------------------------------------------------------
route('POST', '/api/system/reset', 'System', 'Reset the mock database to seed data.', () => {
  resetDb()
  return { ok: true }
}, { auth: false })

// ---- Dispatcher --------------------------------------------------------------
export async function handle(method, url, { body, token } = {}) {
  const [path, qs] = url.split('?')
  const query = Object.fromEntries(new URLSearchParams(qs || ''))
  const r = routes.find((x) => x.method === method && x.regex.test(path))
  await new Promise((res) => setTimeout(res, 150 + Math.random() * 350))
  if (!r) throw new HttpError(404, `No route for ${method} ${path}`)
  const db = getDb()
  let user = null
  if (r.auth) {
    user = db.users.find((u) => u.id === TOKENS[token])
    if (!user) throw new HttpError(401, 'Unauthorized')
  }
  const params = {}
  const m = path.match(r.regex)
  r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])))
  const result = ok(r.handler({ params, query, body, user, db }))
  if (method !== 'GET') saveDb()
  return JSON.parse(JSON.stringify(result))
}
