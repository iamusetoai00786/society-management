// Multi-tenant seed data for the in-browser mock backend.
//
// Data model (every record below `societies` carries a `societyId`):
//
//   MASTER TABLES (set up once per society, drive everything else)
//     societies          profile, billing rules, plan, status
//     blocks             towers/blocks with floor count          -> units
//     unitTypes          2BHK / 3BHK / Villa + default area      -> units
//     units              flat inventory (code, block, type, area) -> residents, invoices, parking
//     chargeHeads        maintenance, sinking fund, parking...   -> invoice lines
//     expenseCategories  categories + monthly budget             -> expenses, AI budget alerts
//     ticketCategories   complaint types + SLA + default staff   -> tickets, AI triage
//     amenities          bookable facilities + slots + fees      -> bookings
//     vendors            contractors + contract end date         -> expenses
//     staff              guards, plumbers, housekeeping          -> ticket assignment, guard logins
//
//   PEOPLE
//     users              who can log in (super_admin | admin | resident | guard)
//     residents          owners / tenants living in a unit (may have a linked user)
//
//   TRANSACTIONS (created by day-to-day work)
//     invoices -> payments          billing cycle
//     expenses                      accounting
//     visitors, preApprovals, dailyHelp   gate
//     tickets                       helpdesk
//     notices, polls, bookings, documents, parking, sos
//     notifications, activity       who did what, when

const STORAGE_KEY = 'societyos-db-v2'

function rng(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const FIRST = ['Aarav', 'Priya', 'Rohan', 'Ananya', 'Vikram', 'Sneha', 'Arjun', 'Kavya', 'Rahul', 'Meera', 'Karan', 'Isha', 'Aditya', 'Nisha', 'Siddharth', 'Pooja', 'Manish', 'Riya', 'Nikhil', 'Tanvi', 'Amit', 'Divya', 'Harsh', 'Neha']
const LAST = ['Sharma', 'Patel', 'Iyer', 'Reddy', 'Mehta', 'Gupta', 'Nair', 'Kapoor', 'Joshi', 'Rao', 'Desai', 'Menon', 'Verma', 'Bose']

export const iso = (d) => d.toISOString()
const daysAgo = (n, h = 10) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(h, Math.floor(Math.abs(n) * 7) % 60, 0, 0)
  return d
}
export const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const pad = (n) => String(n).padStart(2, '0')

// A-101, T1-203 for towers; V-07 for single-floor blocks (villas / row houses)
export const unitCode = (block, floor, n) => (block.floors === 1 ? `${block.code}-${pad(n)}` : `${block.code}-${floor}${pad(n)}`)

export const DEFAULT_TICKET_CATEGORIES = [
  ['Plumbing', 24, 'Plumber'], ['Electrical', 24, 'Electrician'], ['Lift', 4, 'Lift AMC Team'], ['Security', 12, 'Security Supervisor'],
  ['Housekeeping', 24, 'Housekeeping'], ['Parking', 24, 'Security Supervisor'], ['Amenities', 48, 'Facility Manager'], ['Noise', 24, 'Committee'], ['General', 48, 'Facility Manager'],
]
export const DEFAULT_EXPENSE_CATEGORIES = [
  ['Security', 0.3], ['Housekeeping', 0.17], ['Electricity', 0.2], ['Water', 0.06], ['Lift AMC', 0.08], ['Gardening', 0.04], ['Repairs', 0.08], ['Events', 0.04], ['Other', 0.03],
]
export const DEFAULT_AMENITIES = [
  { name: 'Clubhouse Hall', capacity: 120, fee: 5000, deposit: 10000, slots: ['09:00-13:00', '14:00-18:00', '18:00-23:00'], icon: 'party', requiresApproval: true },
  { name: 'Gym', capacity: 15, fee: 0, deposit: 0, slots: ['06:00-07:00', '07:00-08:00', '08:00-09:00', '18:00-19:00', '19:00-20:00', '20:00-21:00'], icon: 'dumbbell', requiresApproval: false },
  { name: 'Swimming Pool', capacity: 25, fee: 0, deposit: 0, slots: ['06:00-08:00', '08:00-10:00', '16:00-18:00', '18:00-20:00'], icon: 'waves', requiresApproval: false },
  { name: 'Badminton Court', capacity: 4, fee: 100, deposit: 0, slots: ['06:00-07:00', '07:00-08:00', '17:00-18:00', '18:00-19:00', '19:00-20:00'], icon: 'trophy', requiresApproval: false },
  { name: 'Guest Room', capacity: 3, fee: 1500, deposit: 2000, slots: ['Full day'], icon: 'bed', requiresApproval: true },
]

const SOCIETIES = [
  {
    id: 'soc_gv', code: 'GV', name: 'Green Valley Residency', city: 'Gurugram', address: 'Plot 21, Sector 45, Gurugram, Haryana 122003', registrationNo: 'HR/GGN/CHS/2014/0871', plan: 'Premium', since: 420,
    blocks: [{ code: 'A', name: 'Block A', floors: 4, unitsPerFloor: 4 }, { code: 'B', name: 'Block B', floors: 4, unitsPerFloor: 4 }, { code: 'C', name: 'Block C', floors: 4, unitsPerFloor: 4 }],
    unitTypes: [['2BHK', 1150], ['3BHK', 1580], ['4BHK', 2100]], typeFor: (n) => (n <= 2 ? 0 : n === 3 ? 1 : 2),
    billing: { ratePerSqft: 3.5, sinkingFund: 500, parking: 300, dueDay: 10, lateFeePct: 2, graceDays: 5 },
    people: {
      admins: [['Neha Kapoor', 'Secretary', 'A-101'], ['Vikas Jain', 'Treasurer', 'C-202']],
      guard: 'Ram Singh', resident: ['Rohan Mehta', 'B-203'],
      staff: [['Ram Singh', 'Security Supervisor', 'Day'], ['Balwant Yadav', 'Security Guard', 'Night'], ['Suresh Kumar', 'Plumber', 'Day'], ['Mahesh Pal', 'Electrician', 'Day'], ['Geeta Devi', 'Housekeeping', 'Day'], ['Anil Kumar', 'Gardener', 'Day'], ['Otis Service', 'Lift AMC Team', 'On call'], ['Prakash Verma', 'Facility Manager', 'Day']],
      vendors: [['Eagle Eye Security Services', 'Security'], ['CleanPro Facility Mgmt', 'Housekeeping'], ['Otis Elevators', 'Lift AMC'], ['GreenThumb Landscapes', 'Gardening'], ['AquaFix Plumbing', 'Repairs']],
    },
  },
  {
    id: 'soc_lv', code: 'LV', name: 'Lakeview Towers', city: 'Pune', address: 'Survey 118, Baner Road, Pune, Maharashtra 411045', registrationNo: 'MH/PNA/HSG/2017/2210', plan: 'Standard', since: 260,
    blocks: [{ code: 'T1', name: 'Tower 1', floors: 6, unitsPerFloor: 4 }, { code: 'T2', name: 'Tower 2', floors: 6, unitsPerFloor: 4 }],
    unitTypes: [['1BHK', 650], ['2BHK', 1050], ['3BHK', 1450]], typeFor: (n) => (n === 1 ? 0 : n === 4 ? 2 : 1),
    billing: { ratePerSqft: 3.0, sinkingFund: 400, parking: 250, dueDay: 5, lateFeePct: 1.5, graceDays: 7 },
    people: {
      admins: [['Sanjay Kulkarni', 'Secretary', 'T1-401'], ['Asha Pawar', 'Treasurer', 'T2-302']],
      guard: 'Bhim Rao', resident: ['Meera Deshpande', 'T1-203'],
      staff: [['Bhim Rao', 'Security Supervisor', 'Day'], ['Ganesh More', 'Security Guard', 'Night'], ['Dattatray Shinde', 'Plumber', 'Day'], ['Rajesh Patil', 'Electrician', 'Day'], ['Sunita Kamble', 'Housekeeping', 'Day'], ['Schindler Service', 'Lift AMC Team', 'On call'], ['Nitin Joshi', 'Facility Manager', 'Day']],
      vendors: [['SecureOne Services', 'Security'], ['SparkleClean', 'Housekeeping'], ['Schindler India', 'Lift AMC']],
    },
  },
  {
    id: 'soc_se', code: 'SE', name: 'Sunrise Enclave', city: 'Bengaluru', address: '14th Cross, Whitefield, Bengaluru, Karnataka 560066', registrationNo: 'KA/BLR/APT/2019/0456', plan: 'Basic', since: 90,
    blocks: [{ code: 'V', name: 'Villas', floors: 1, unitsPerFloor: 18 }],
    unitTypes: [['Villa', 3200]], typeFor: () => 0,
    billing: { ratePerSqft: 2.5, sinkingFund: 1000, parking: 0, dueDay: 15, lateFeePct: 2, graceDays: 5 },
    people: {
      admins: [['Lakshmi Narayan', 'Secretary', 'V-01']],
      guard: 'Joseph D’Souza', resident: ['Arjun Hegde', 'V-07'],
      staff: [['Joseph D’Souza', 'Security Supervisor', 'Day'], ['Manju Gowda', 'Security Guard', 'Night'], ['Ravi Kumar', 'Plumber', 'On call'], ['Shankar', 'Electrician', 'On call'], ['Kaveri', 'Housekeeping', 'Day'], ['Venkatesh', 'Facility Manager', 'Day']],
      vendors: [['Garuda Security', 'Security'], ['BESCOM', 'Electricity']],
    },
  },
]

const TICKET_SEEDS = [
  ['Water leakage from ceiling in bathroom', 'Water dripping from the ceiling of master bathroom since morning, seems to be from the flat above.', 'Plumbing', 'high', 'in_progress', 'personal', 'frustrated', 1],
  ['Lift stuck frequently', 'Lift 2 stops between floors. Happened twice this week. Very unsafe for elders.', 'Lift', 'urgent', 'open', 'common', 'angry', 2],
  ['Streetlight not working near gate 2', 'The pole light next to gate 2 has been off for 3 nights.', 'Electrical', 'medium', 'assigned', 'common', 'neutral', 3],
  ['Garbage not collected on 3rd floor', 'Housekeeping skipped our floor yesterday.', 'Housekeeping', 'low', 'resolved', 'common', 'neutral', 5],
  ['Stray dogs near children play area', 'Group of stray dogs sits near the play area in evenings, kids are scared.', 'Security', 'medium', 'open', 'common', 'concerned', 4],
  ['Gym treadmill belt damaged', 'Treadmill #2 belt is torn.', 'Amenities', 'low', 'closed', 'common', 'neutral', 9],
  ['Low water pressure on top floor', 'Water pressure very low in the mornings on the top floor.', 'Plumbing', 'medium', 'open', 'common', 'frustrated', 1],
]

let idSeq = 1000
const nid = (p) => `${p}_${++idSeq}`

function seedSociety(db, cfg, r) {
  const pick = (arr) => arr[Math.floor(r() * arr.length)]
  const sid = cfg.id
  const now = new Date()
  const add = (c, obj) => (db[c].push({ id: obj.id || nid(c.slice(0, 3)), societyId: sid, ...obj }), db[c].at(-1))

  db.societies.push({
    id: sid, code: cfg.code, name: cfg.name, city: cfg.city, address: cfg.address, registrationNo: cfg.registrationNo, plan: cfg.plan,
    status: 'active', createdAt: iso(daysAgo(cfg.since)), gates: ['Gate 1', 'Gate 2'],
    billing: { dueDay: cfg.billing.dueDay, lateFeePct: cfg.billing.lateFeePct, graceDays: cfg.billing.graceDays },
  })

  // ---- Masters
  const types = cfg.unitTypes.map(([name, areaSqft]) => add('unitTypes', { name, areaSqft }))
  const blocks = cfg.blocks.map((b) => add('blocks', { ...b }))
  add('chargeHeads', { name: 'Maintenance', basis: 'per_sqft', rate: cfg.billing.ratePerSqft, active: true, description: 'Monthly maintenance on carpet area' })
  add('chargeHeads', { name: 'Sinking Fund', basis: 'fixed', rate: cfg.billing.sinkingFund, active: true, description: 'Reserve for major repairs' })
  if (cfg.billing.parking) add('chargeHeads', { name: 'Parking', basis: 'per_parking', rate: cfg.billing.parking, active: true, description: 'Per allotted parking slot' })

  const staff = cfg.people.staff.map(([name, role, shift]) => add('staff', { name, role, shift, phone: `+91 98${Math.floor(r() * 90000000 + 10000000)}`, present: r() > 0.2 }))
  const staffByRole = (role) => staff.find((s) => s.role === role)?.name || role
  DEFAULT_TICKET_CATEGORIES.forEach(([name, slaHours, role]) => add('ticketCategories', { name, slaHours, assignee: staffByRole(role) }))
  cfg.people.vendors.forEach(([name, service]) => add('vendors', { name, service, phone: `+91 99${Math.floor(r() * 90000000 + 10000000)}`, contractEnd: iso(daysAgo(-Math.floor(20 + r() * 300))).slice(0, 10) }))
  const amenities = (cfg.code === 'SE' ? DEFAULT_AMENITIES.filter((a) => ['Clubhouse Hall', 'Swimming Pool'].includes(a.name)) : DEFAULT_AMENITIES).map((a) => add('amenities', { ...a }))

  // ---- Units
  const units = []
  for (const b of blocks) {
    for (let floor = 1; floor <= b.floors; floor++) {
      for (let n = 1; n <= b.unitsPerFloor; n++) {
        const t = types[cfg.typeFor(n)]
        units.push(add('units', { id: unitCode(b, floor, n), blockId: b.id, block: b.code, floor, number: n, unitTypeId: t.id, type: t.name, areaSqft: t.areaSqft, occupancy: 'vacant' }))
      }
    }
  }
  const special = new Set([cfg.people.resident[1], ...cfg.people.admins.map((a) => a[2])])

  // ---- Residents (+ users for people with app access)
  const residentsByUnit = {}
  for (const u of units) {
    const vacant = !special.has(u.id) && r() < 0.08
    if (vacant) continue
    const isTenant = !special.has(u.id) && r() < 0.25
    const admin = cfg.people.admins.find((a) => a[2] === u.id)
    const name = admin ? admin[0] : u.id === cfg.people.resident[1] ? cfg.people.resident[0] : `${pick(FIRST)} ${pick(LAST)}`
    const res = add('residents', {
      unitId: u.id, name, type: isTenant ? 'tenant' : 'owner',
      phone: `+91 9${Math.floor(r() * 900000000 + 100000000)}`,
      email: `${name.split(' ')[0].toLowerCase()}.${u.id.toLowerCase()}@example.com`,
      members: 1 + Math.floor(r() * 4), moveIn: iso(daysAgo(60 + Math.floor(r() * 1500))),
      vehicles: r() < 0.75 ? [`${cfg.code === 'LV' ? 'MH12' : cfg.code === 'SE' ? 'KA03' : 'HR26'} ${String.fromCharCode(65 + Math.floor(r() * 26))}${String.fromCharCode(65 + Math.floor(r() * 26))} ${Math.floor(1000 + r() * 8999)}`] : [],
      leaseEnd: isTenant ? iso(daysAgo(-Math.floor(30 + r() * 300))).slice(0, 10) : null,
      appAccess: false,
    })
    u.occupancy = res.type
    residentsByUnit[u.id] = res
  }
  const mkUser = (name, role, title, extra = {}) => add('users', { id: `usr_${cfg.code.toLowerCase()}_${role}_${db.users.filter((x) => x.societyId === sid && x.role === role).length + 1}`, name, role, title, email: `${name.split(' ')[0].toLowerCase()}@${cfg.code.toLowerCase()}.society.in`, phone: `+91 98100 ${Math.floor(10000 + r() * 89999)}`, ...extra })
  for (const [name, title, unitId] of cfg.people.admins) {
    const res = residentsByUnit[unitId]
    res.appAccess = true
    mkUser(name, 'admin', title, { unitId, residentId: res.id })
  }
  const guardStaff = staff.find((s) => s.name === cfg.people.guard)
  guardStaff.appAccess = true
  mkUser(cfg.people.guard, 'guard', guardStaff.role, { unitId: null, staffId: guardStaff.id })
  const demoRes = residentsByUnit[cfg.people.resident[1]]
  demoRes.appAccess = true
  mkUser(demoRes.name, 'resident', 'Owner', { unitId: demoRes.unitId, residentId: demoRes.id })
  Object.values(residentsByUnit).filter((x) => !x.appAccess).slice(0, 4).forEach((x) => {
    x.appAccess = true
    mkUser(x.name, 'resident', x.type === 'tenant' ? 'Tenant' : 'Owner', { unitId: x.unitId, residentId: x.id })
  })

  // ---- Parking (allotted to ~80% of occupied units)
  let slot = 0
  for (const u of units) {
    const allotted = u.occupancy !== 'vacant' && r() < 0.8
    if (!allotted && r() < 0.7) continue
    slot++
    add('parking', { id: `${cfg.code}-P${String(slot).padStart(3, '0')}`, level: cfg.code === 'SE' ? 'Driveway' : slot <= 25 ? 'B1' : 'B2', unitId: allotted ? u.id : null, type: slot % 9 === 0 ? 'EV' : 'Car' })
  }

  // ---- Invoices & payments: 6 cycles, a few habitual late payers
  const heads = db.chargeHeads.filter((c) => c.societyId === sid)
  const lateUnits = new Set(units.filter(() => r() < 0.14).map((u) => u.id))
  lateUnits.delete(cfg.people.resident[1])
  cfg.people.admins.forEach((a) => lateUnits.delete(a[2]))
  for (let m = 5; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1)
    const period = monthKey(d)
    const due = new Date(d.getFullYear(), d.getMonth(), cfg.billing.dueDay)
    for (const u of units) {
      if (u.occupancy === 'vacant') continue
      const slots = db.parking.filter((p) => p.societyId === sid && p.unitId === u.id).length
      const items = heads.map((h) => ({ head: h.name, amount: Math.round(h.basis === 'per_sqft' ? h.rate * u.areaSqft : h.basis === 'per_parking' ? h.rate * slots : h.rate) })).filter((i) => i.amount > 0)
      const amount = items.reduce((s, i) => s + i.amount, 0)
      let status = 'paid'
      if (m === 0) status = r() < 0.55 ? 'paid' : 'unpaid'
      if (lateUnits.has(u.id) && r() < 0.6) status = 'unpaid'
      if (u.id === cfg.people.resident[1] && m === 0) status = 'unpaid'
      if (status === 'unpaid' && m === 0 && r() < 0.15) status = 'partial'
      const lateFee = status !== 'paid' && m > 0 ? Math.round(amount * (cfg.billing.lateFeePct / 100) * m) : 0
      const inv = add('invoices', { id: `INV-${cfg.code}-${period.replace('-', '')}-${u.id}`, unitId: u.id, period, dueDate: iso(due), items, amount, lateFee, waived: 0, paid: 0, status, paidAt: null, createdAt: iso(new Date(d.getFullYear(), d.getMonth(), 1, 9)) })
      const pay = (amt, when) => {
        inv.paid += amt
        add('payments', { invoiceId: inv.id, unitId: u.id, amount: amt, method: pick(['UPI', 'UPI', 'UPI', 'Card', 'Net Banking', 'Cheque', 'Cash']), reference: `TXN${Math.floor(r() * 1e10)}`, paidAt: iso(when > now ? now : when), recordedBy: 'Online' })
      }
      if (status === 'paid') {
        const paidOn = new Date(due)
        paidOn.setDate(paidOn.getDate() - 5 + Math.floor(r() * (lateUnits.has(u.id) ? 25 : 8)))
        pay(amount, paidOn)
        inv.paidAt = db.payments.at(-1).paidAt
      } else if (status === 'partial') pay(Math.round(amount / 2), new Date(due.getTime() - 2 * 86400000))
    }
  }

  // ---- Expense categories (with budgets) & expenses
  const monthlyIncome = units.filter((u) => u.occupancy !== 'vacant').reduce((s, u) => s + u.areaSqft * cfg.billing.ratePerSqft + cfg.billing.sinkingFund, 0)
  const cats = DEFAULT_EXPENSE_CATEGORIES.map(([name, share]) => add('expenseCategories', { name, budgetMonthly: Math.round((monthlyIncome * share * 0.85) / 1000) * 1000 }))
  const vendors = db.vendors.filter((v) => v.societyId === sid)
  for (let m = 5; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 5)
    for (const c of cats.slice(0, 6)) {
      const spike = c.name === 'Electricity' && m === 0 ? 1.38 : 1
      add('expenses', { category: c.name, vendor: vendors.find((v) => v.service === c.name)?.name || `${c.name} vendor`, description: `${c.name} charges for ${d.toLocaleString('en', { month: 'long' })}`, amount: Math.round(c.budgetMonthly * 0.95 * spike * (0.92 + r() * 0.16)), date: iso(d), status: 'approved', createdBy: cfg.people.admins[0][0], approvedBy: cfg.people.admins.at(-1)[0] })
    }
  }
  add('expenses', { category: 'Repairs', vendor: vendors.find((v) => v.service === 'Repairs')?.name || 'Local contractor', description: 'Replace main overhead tank valve', amount: 42000, date: iso(daysAgo(2)), status: 'pending', createdBy: cfg.people.admins[0][0] })
  add('expenses', { category: 'Events', vendor: 'Festive Decor Co.', description: 'Diwali celebration decoration & sound', amount: 65000, date: iso(daysAgo(1)), status: 'pending', createdBy: cfg.people.admins[0][0] })

  // ---- Gate
  const purposes = [['Guest', 'guest'], ['Amazon', 'delivery'], ['Swiggy', 'delivery'], ['Zomato', 'delivery'], ['Uber', 'cab'], ['Plumber', 'service'], ['Blinkit', 'delivery'], ['Guest', 'guest']]
  const occupied = units.filter((u) => u.occupancy !== 'vacant')
  for (let i = 0; i < 36; i++) {
    const [label, type] = pick(purposes)
    const day = Math.floor(i / 7)
    const inAt = daysAgo(day, 8 + (i % 12))
    const active = day === 0 && i % 3 === 0
    add('visitors', {
      name: type === 'guest' ? `${pick(FIRST)} ${pick(LAST)}` : `${label} Partner`, phone: `+91 9${Math.floor(r() * 900000000 + 100000000)}`, type,
      company: type === 'guest' || type === 'service' ? null : label, unitId: i % 5 === 0 ? cfg.people.resident[1] : pick(occupied).id,
      vehicle: type === 'cab' ? `DL${Math.floor(r() * 9)}C ${Math.floor(1000 + r() * 8999)}` : null, gate: pick(['Gate 1', 'Gate 2']),
      status: active ? 'inside' : 'exited', checkIn: iso(inAt), checkOut: active ? null : iso(new Date(inAt.getTime() + (type === 'delivery' ? 12 : 95) * 60000)),
      approvedBy: type === 'guest' ? 'Pre-approved' : 'Resident', loggedBy: cfg.people.guard,
    })
  }
  add('visitors', { name: 'Sunita Rao', phone: '+91 98111 22334', type: 'guest', company: null, unitId: cfg.people.resident[1], vehicle: null, gate: 'Gate 1', status: 'pending', checkIn: iso(new Date(Date.now() - 60000)), checkOut: null, approvedBy: null, loggedBy: cfg.people.guard })
  add('preApprovals', { code: cfg.code === 'GV' ? '482913' : cfg.code === 'LV' ? '551204' : '730918', name: 'Anil Mehta', unitId: cfg.people.resident[1], type: 'guest', validUntil: iso(new Date(Date.now() + 86400000)), createdBy: demoRes.name, used: false })
  ;[['Lakshmi', 'Maid', 2], ['Mohan', 'Driver', 1], ['Kamla', 'Cook', 2]].forEach(([name, role, n], i) => add('dailyHelp', { name, role, units: [cfg.people.resident[1], ...occupied.slice(i * 3, i * 3 + n).map((u) => u.id)].slice(0, n + 1), inside: i !== 1, lastIn: iso(daysAgo(0, 7 + i)) }))

  // ---- Helpdesk (SLA from ticket category master)
  const tcat = (name) => db.ticketCategories.find((c) => c.societyId === sid && c.name === name)
  TICKET_SEEDS.forEach(([title, description, category, priority, status, scope, sentiment, age], i) => {
    const unit = i === 0 ? cfg.people.resident[1] : pick(occupied).id
    const createdAt = daysAgo(age, 9 + i)
    const c = tcat(category)
    add('tickets', {
      id: `TCK-${cfg.code}-${1041 - i}`, title, description, category, priority, status, unitId: unit, raisedBy: residentsByUnit[unit]?.name || 'Resident', assignee: status === 'open' ? null : c.assignee, scope, sentiment,
      createdAt: iso(createdAt), slaDueAt: iso(new Date(createdAt.getTime() + c.slaHours * 3600000)), comments: i === 0 ? [{ by: c.assignee, text: 'Inspected. Pipe joint in the flat above is leaking, fixing today.', at: iso(daysAgo(0, 11)) }] : [],
      ...(status === 'resolved' || status === 'closed' ? { rating: 4 + (i % 2), resolvedAt: iso(new Date(createdAt.getTime() + 20 * 3600000)) } : {}),
    })
  })

  // ---- Community
  const admin = cfg.people.admins[0][0]
  add('notices', { title: 'Water supply interruption – Saturday', body: 'Due to overhead tank cleaning, water supply will be suspended on Saturday from 10:00 AM to 2:00 PM. Please store water in advance.', audience: 'All residents', category: 'Maintenance', pinned: true, createdAt: iso(daysAgo(0, 9)), author: admin, reads: 61 })
  add('notices', { title: 'Diwali Celebration 2026 🎉', body: 'Join us at the clubhouse on the evening of Diwali for rangoli, music and a potluck dinner. Kids’ activities start at 5 PM.', audience: 'All residents', category: 'Event', pinned: false, createdAt: iso(daysAgo(2)), author: 'Cultural Committee', reads: 88 })
  add('notices', { title: 'AGM on 12th October', body: 'The Annual General Meeting will be held on 12 October at 11 AM. Agenda: audited accounts, budget for FY27, election of committee.', audience: 'Owners', category: 'Meeting', pinned: false, createdAt: iso(daysAgo(6)), author: admin, reads: 104 })
  add('polls', { question: 'Should we install EV charging stations in parking?', options: [{ id: 'o1', text: 'Yes, from sinking fund', votes: 38 }, { id: 'o2', text: 'Yes, pay-per-use only', votes: 21 }, { id: 'o3', text: 'Not now', votes: 7 }], closesAt: iso(daysAgo(-5)), voters: [], createdAt: iso(daysAgo(3)), createdBy: admin })
  add('polls', { question: 'Preferred timing for common facilities?', options: [{ id: 'o1', text: '5 AM – 11 PM', votes: 44 }, { id: 'o2', text: '24x7 with access card', votes: 29 }], closesAt: iso(daysAgo(2)), voters: [], createdAt: iso(daysAgo(8)), createdBy: admin })
  const today = new Date().toISOString().slice(0, 10)
  const gym = amenities.find((a) => a.name === 'Gym') || amenities[0]
  add('bookings', { amenityId: gym.id, unitId: cfg.people.resident[1], date: today, slot: gym.slots.at(-2) || gym.slots[0], status: 'confirmed', bookedBy: demoRes.name })
  add('bookings', { amenityId: amenities[0].id, unitId: pick(occupied).id, date: iso(daysAgo(-4)).slice(0, 10), slot: amenities[0].slots.at(-1), status: 'pending', bookedBy: pick(FIRST) + ' ' + pick(LAST) })
  ;[['Society Bye-laws (Amended 2024).pdf', 'Bye-laws', '2.4 MB', 'all', 300], ['AGM Minutes – Oct 2025.pdf', 'Minutes', '860 KB', 'all', 340], ['Audited Accounts FY 2025-26.pdf', 'Finance', '1.8 MB', 'owners', 60], ['Fire Safety NOC 2026.pdf', 'Compliance', '540 KB', 'all', 120], ['Security Agency Contract.pdf', 'Contracts', '1.1 MB', 'committee', 200]]
    .forEach(([name, category, size, access, age]) => add('documents', { name, category, size, access, uploadedAt: iso(daysAgo(Math.min(age, cfg.since))), uploadedBy: admin }))
  add('sos', { unitId: pick(occupied).id, type: 'Medical', message: 'Elderly resident fell, need help', status: 'resolved', createdAt: iso(daysAgo(12, 22)), resolvedAt: iso(daysAgo(12, 22)), raisedBy: 'Resident', resolvedBy: cfg.people.guard })

  add('notifications', { title: 'Visitor waiting at gate', body: `Sunita Rao is waiting at Gate 1 for ${cfg.people.resident[1]}`, type: 'visitor', read: false, roles: ['resident'], unitId: cfg.people.resident[1], at: iso(new Date(Date.now() - 60000)) })
  add('notifications', { title: '2 expenses need approval', body: 'Plumbing repair ₹42,000 and Diwali decor ₹65,000', type: 'finance', read: false, roles: ['admin'], at: iso(daysAgo(0, 9)) })
  add('notifications', { title: 'Urgent ticket: Lift stuck', body: 'Marked urgent by AI triage. SLA 4 hours', type: 'ticket', read: false, roles: ['admin'], at: iso(daysAgo(2, 18)) })
  add('notifications', { title: 'Maintenance bill generated', body: 'Your bill for this month is ready', type: 'finance', read: false, roles: ['resident'], at: iso(daysAgo(1)) })

  // ---- Activity trail (latest first once sorted)
  const acts = [
    [cfg.since, 'SocietyOS Platform', 'super_admin', 'created', 'society', cfg.name, `Society onboarded on the ${cfg.plan} plan`],
    [cfg.since - 1, admin, 'admin', 'imported', 'units', `${units.length} units`, `Created ${blocks.length} block(s) and ${units.length} units`],
    [cfg.since - 1, admin, 'admin', 'imported', 'residents', `${Object.keys(residentsByUnit).length} residents`, 'Bulk import from Excel'],
    [25, admin, 'admin', 'generated', 'invoice', monthKey(new Date(now.getFullYear(), now.getMonth(), 1)), 'Monthly bill cycle generated from charge heads'],
    [2, admin, 'admin', 'created', 'expense', 'Tank valve repair', '₹42,000 sent for committee approval'],
    [1, cfg.people.resident[0], 'resident', 'raised', 'ticket', `TCK-${cfg.code}-1041`, 'Water leakage from ceiling in bathroom → AI routed to Plumbing'],
    [0, cfg.people.guard, 'guard', 'logged', 'visitor', 'Sunita Rao', `Guest for ${cfg.people.resident[1]} at Gate 1, waiting for approval`],
  ]
  acts.forEach(([d, actor, actorRole, action, entity, entityId, detail]) => add('activity', { at: iso(daysAgo(d, 11)), actor, actorRole, action, entity, entityId, detail }))
}

export function createSeed() {
  idSeq = 1000
  const db = { societies: [], users: [], plans: [
    { id: 'Basic', pricePerUnit: 15, features: ['Billing', 'Visitors', 'Helpdesk', 'Notices'] },
    { id: 'Standard', pricePerUnit: 25, features: ['Everything in Basic', 'Accounting', 'Amenities', 'Polls'] },
    { id: 'Premium', pricePerUnit: 40, features: ['Everything in Standard', 'AI Insights', 'AI Assistant', 'Priority support'] },
  ] }
  for (const c of COLLECTIONS) db[c] = []
  db.users.push({ id: 'usr_platform', societyId: null, name: 'Aditi Rao', role: 'super_admin', title: 'Platform Owner · SocietyOS', email: 'owner@societyos.app', phone: '+91 90000 00000', unitId: null })
  const r = rng(42)
  SOCIETIES.forEach((cfg) => seedSociety(db, cfg, r))
  db.seq = idSeq
  return db
}

export const COLLECTIONS = ['blocks', 'unitTypes', 'units', 'chargeHeads', 'expenseCategories', 'ticketCategories', 'amenities', 'vendors', 'staff', 'residents', 'invoices', 'payments', 'expenses', 'visitors', 'preApprovals', 'dailyHelp', 'tickets', 'notices', 'polls', 'bookings', 'documents', 'parking', 'sos', 'notifications', 'activity']

// Read-only view of one society's data. Objects are shared with the global
// db, so mutating a record through the view updates the stored record.
export function scope(db, societyId) {
  const s = { society: db.societies.find((x) => x.id === societyId), users: db.users.filter((u) => u.societyId === societyId) }
  for (const c of COLLECTIONS) s[c] = db[c].filter((x) => x.societyId === societyId)
  return s
}

let db = null

export function getDb() {
  if (db) return db
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) db = JSON.parse(raw)
  } catch {
    db = null
  }
  if (!db) db = createSeed()
  return db
}

export function saveDb() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // storage full or blocked: keep working in memory
  }
}

export function resetDb() {
  db = createSeed()
  saveDb()
  return db
}

export function nextId(prefix) {
  const d = getDb()
  d.seq += 1
  return `${prefix}_${d.seq}`
}

// Amount still owed on an invoice after late fee, waivers and payments.
export const due = (inv) => (inv.status === 'cancelled' ? 0 : Math.max(0, inv.amount + inv.lateFee - inv.waived - inv.paid))
export const isOpen = (inv) => inv.status === 'unpaid' || inv.status === 'partial'
