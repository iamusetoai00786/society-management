// Seed data for the in-browser mock backend. Deterministic so every fresh
// start looks the same; persisted to localStorage after the first write.

const STORAGE_KEY = 'societyos-db-v1'

function rng(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

const FIRST = ['Aarav', 'Priya', 'Rohan', 'Ananya', 'Vikram', 'Sneha', 'Arjun', 'Kavya', 'Rahul', 'Meera', 'Karan', 'Isha', 'Aditya', 'Nisha', 'Siddharth', 'Pooja', 'Manish', 'Riya', 'Nikhil', 'Tanvi', 'Amit', 'Divya', 'Harsh', 'Neha']
const LAST = ['Sharma', 'Patel', 'Iyer', 'Reddy', 'Mehta', 'Gupta', 'Nair', 'Kapoor', 'Joshi', 'Rao', 'Desai', 'Menon', 'Verma', 'Bose']

const iso = (d) => d.toISOString()
const daysAgo = (n, h = 10) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(h, Math.floor(n * 7) % 60, 0, 0)
  return d
}
const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

export function createSeed() {
  const r = rng(42)
  const pick = (arr) => arr[Math.floor(r() * arr.length)]
  let id = 1000
  const nid = (p) => `${p}_${++id}`

  const society = {
    id: 'soc_1',
    name: 'Green Valley Residency',
    address: 'Plot 21, Sector 45, Gurugram, Haryana 122003',
    registrationNo: 'HR/GGN/CHS/2014/0871',
    blocks: ['A', 'B', 'C'],
    billing: { ratePerSqft: 3.5, sinkingFund: 500, dueDay: 10, lateFeePct: 2, graceDays: 5 },
    plan: 'Premium',
  }

  const units = []
  for (const block of society.blocks) {
    for (let floor = 1; floor <= 4; floor++) {
      for (let n = 1; n <= 4; n++) {
        const type = n <= 2 ? '2BHK' : n === 3 ? '3BHK' : '4BHK'
        units.push({
          id: `${block}-${floor}0${n}`,
          block,
          floor,
          type,
          areaSqft: type === '2BHK' ? 1150 : type === '3BHK' ? 1580 : 2100,
          occupancy: r() < 0.08 ? 'vacant' : r() < 0.25 ? 'tenant' : 'owner',
        })
      }
    }
  }

  const users = [
    { id: 'usr_admin', name: 'Neha Kapoor', role: 'admin', title: 'Secretary', email: 'admin@greenvalley.in', phone: '+91 98100 00001', unitId: 'A-101' },
    { id: 'usr_resident', name: 'Rohan Mehta', role: 'resident', title: 'Owner', email: 'rohan@example.com', phone: '+91 98100 00002', unitId: 'B-203' },
    { id: 'usr_guard', name: 'Ram Singh', role: 'guard', title: 'Security Supervisor', email: 'gate@greenvalley.in', phone: '+91 98100 00003', unitId: null },
  ]

  const residents = []
  for (const u of units) {
    if (u.occupancy === 'vacant') continue
    const isDemo = u.id === 'B-203'
    const name = isDemo ? 'Rohan Mehta' : `${pick(FIRST)} ${pick(LAST)}`
    residents.push({
      id: nid('res'),
      unitId: u.id,
      name,
      type: u.occupancy === 'tenant' ? 'tenant' : 'owner',
      phone: `+91 9${Math.floor(r() * 900000000 + 100000000)}`,
      email: `${name.split(' ')[0].toLowerCase()}.${u.id.toLowerCase()}@example.com`,
      members: 1 + Math.floor(r() * 4),
      moveIn: iso(daysAgo(200 + Math.floor(r() * 2000))),
      vehicles: r() < 0.8 ? [`HR26 ${String.fromCharCode(65 + Math.floor(r() * 26))}${String.fromCharCode(65 + Math.floor(r() * 26))} ${Math.floor(1000 + r() * 8999)}`] : [],
      status: 'active',
    })
  }

  // Six months of invoices. A handful of units are habitual late payers.
  const lateUnits = new Set(units.filter(() => r() < 0.14).map((u) => u.id))
  lateUnits.delete('B-203')
  lateUnits.add('C-304')
  const invoices = []
  const payments = []
  const now = new Date()
  for (let m = 5; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 1)
    const period = monthKey(d)
    const due = new Date(d.getFullYear(), d.getMonth(), society.billing.dueDay)
    for (const u of units) {
      if (u.occupancy === 'vacant') continue
      const maintenance = Math.round(u.areaSqft * society.billing.ratePerSqft)
      const amount = maintenance + society.billing.sinkingFund
      let status = 'paid'
      if (m === 0) status = r() < 0.55 ? 'paid' : 'unpaid'
      if (lateUnits.has(u.id) && r() < 0.6) status = 'unpaid'
      if (u.id === 'B-203' && m === 0) status = 'unpaid'
      const inv = {
        id: `INV-${period.replace('-', '')}-${u.id}`,
        unitId: u.id,
        period,
        dueDate: iso(due),
        items: [
          { head: 'Maintenance', amount: maintenance },
          { head: 'Sinking Fund', amount: society.billing.sinkingFund },
        ],
        amount,
        lateFee: status === 'unpaid' && m > 0 ? Math.round(amount * 0.02 * m) : 0,
        status,
        paidAt: null,
      }
      if (status === 'paid') {
        const paidOn = new Date(due)
        paidOn.setDate(paidOn.getDate() - 5 + Math.floor(r() * (lateUnits.has(u.id) ? 25 : 8)))
        inv.paidAt = iso(paidOn > now ? now : paidOn)
        payments.push({
          id: nid('pay'),
          invoiceId: inv.id,
          unitId: u.id,
          amount: inv.amount,
          method: pick(['UPI', 'UPI', 'UPI', 'Card', 'Net Banking', 'Cheque', 'Cash']),
          reference: `TXN${Math.floor(r() * 1e10)}`,
          paidAt: inv.paidAt,
        })
      }
      invoices.push(inv)
    }
  }

  const expenseCats = [
    ['Security', 'Eagle Eye Security Services', 85000],
    ['Housekeeping', 'CleanPro Facility Mgmt', 48000],
    ['Electricity', 'DHBVN', 56000],
    ['Water', 'GMDA Water Supply', 16000],
    ['Lift AMC', 'Otis Elevators', 22000],
    ['Gardening', 'GreenThumb Landscapes', 12000],
  ]
  const expenses = []
  for (let m = 5; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 5)
    for (const [category, vendor, base] of expenseCats) {
      const spike = category === 'Electricity' && m === 0 ? 1.38 : 1
      expenses.push({
        id: nid('exp'),
        category,
        vendor,
        description: `${category} charges for ${d.toLocaleString('en', { month: 'long' })}`,
        amount: Math.round(base * spike * (0.92 + r() * 0.16)),
        date: iso(d),
        status: 'approved',
        createdBy: 'Neha Kapoor',
      })
    }
  }
  expenses.push(
    { id: nid('exp'), category: 'Repairs', vendor: 'AquaFix Plumbing', description: 'Replace main overhead tank valve – Block C', amount: 42000, date: iso(daysAgo(2)), status: 'pending', createdBy: 'Neha Kapoor' },
    { id: nid('exp'), category: 'Events', vendor: 'Festive Decor Co.', description: 'Diwali celebration decoration & sound', amount: 65000, date: iso(daysAgo(1)), status: 'pending', createdBy: 'Neha Kapoor' },
  )

  const visitors = []
  const purposes = [['Guest', 'guest'], ['Amazon', 'delivery'], ['Swiggy', 'delivery'], ['Zomato', 'delivery'], ['Uber', 'cab'], ['Plumber', 'service'], ['Blinkit', 'delivery'], ['Guest', 'guest']]
  for (let i = 0; i < 38; i++) {
    const [label, type] = pick(purposes)
    const day = Math.floor(i / 7)
    const inAt = daysAgo(day, 8 + (i % 12))
    const out = new Date(inAt.getTime() + (type === 'delivery' ? 12 : 95) * 60000)
    const active = day === 0 && i % 3 === 0
    visitors.push({
      id: nid('vis'),
      name: type === 'guest' ? `${pick(FIRST)} ${pick(LAST)}` : `${label} Partner`,
      phone: `+91 9${Math.floor(r() * 900000000 + 100000000)}`,
      type,
      company: type === 'guest' || type === 'service' ? null : label,
      unitId: i % 5 === 0 ? 'B-203' : pick(units).id,
      vehicle: type === 'cab' || r() < 0.2 ? `DL${Math.floor(r() * 9)}C ${Math.floor(1000 + r() * 8999)}` : null,
      status: active ? 'inside' : 'exited',
      checkIn: iso(inAt),
      checkOut: active ? null : iso(out),
      approvedBy: type === 'guest' ? 'Pre-approved' : 'Resident',
    })
  }
  visitors.unshift({
    id: nid('vis'), name: 'Sunita Rao', phone: '+91 98111 22334', type: 'guest', company: null, unitId: 'B-203', vehicle: null,
    status: 'pending', checkIn: iso(new Date(Date.now() - 60000)), checkOut: null, approvedBy: null,
  })

  const preApprovals = [
    { id: nid('pre'), code: '482913', name: 'Anil Mehta', unitId: 'B-203', type: 'guest', validUntil: iso(new Date(Date.now() + 86400000)), createdBy: 'usr_resident', used: false },
  ]

  const tickets = [
    { id: 'TCK-1041', title: 'Water leakage from ceiling in bathroom', description: 'Water dripping from the ceiling of master bathroom since morning, seems to be from the flat above.', category: 'Plumbing', priority: 'high', status: 'in_progress', unitId: 'B-203', raisedBy: 'Rohan Mehta', assignee: 'Suresh (Plumber)', scope: 'personal', createdAt: iso(daysAgo(1, 9)), sentiment: 'frustrated', comments: [{ by: 'Suresh (Plumber)', text: 'Inspected. Pipe joint in B-303 is leaking, fixing today.', at: iso(daysAgo(0, 11)) }] },
    { id: 'TCK-1040', title: 'Lift in Block A stuck frequently', description: 'Lift 2 in Block A stops between floors. Happened twice this week. Very unsafe for elders.', category: 'Lift', priority: 'urgent', status: 'open', unitId: 'A-302', raisedBy: 'Kavya Iyer', assignee: null, scope: 'common', createdAt: iso(daysAgo(2, 18)), sentiment: 'angry', comments: [] },
    { id: 'TCK-1039', title: 'Streetlight not working near gate 2', description: 'The pole light next to gate 2 has been off for 3 nights.', category: 'Electrical', priority: 'medium', status: 'assigned', unitId: 'C-104', raisedBy: 'Arjun Nair', assignee: 'Mahesh (Electrician)', scope: 'common', createdAt: iso(daysAgo(3)), sentiment: 'neutral', comments: [] },
    { id: 'TCK-1038', title: 'Garbage not collected on 3rd floor', description: 'Housekeeping skipped our floor yesterday.', category: 'Housekeeping', priority: 'low', status: 'resolved', unitId: 'A-304', raisedBy: 'Isha Gupta', assignee: 'CleanPro Team', scope: 'common', createdAt: iso(daysAgo(5)), sentiment: 'neutral', comments: [], rating: 4 },
    { id: 'TCK-1037', title: 'Stray dogs near children play area', description: 'Group of stray dogs sits near the play area in evenings, kids are scared.', category: 'Security', priority: 'medium', status: 'open', unitId: 'B-102', raisedBy: 'Meera Joshi', assignee: null, scope: 'common', createdAt: iso(daysAgo(4)), sentiment: 'concerned', comments: [] },
    { id: 'TCK-1036', title: 'Gym treadmill belt damaged', description: 'Treadmill #2 belt is torn.', category: 'Amenities', priority: 'low', status: 'closed', unitId: 'C-201', raisedBy: 'Karan Desai', assignee: 'Facility Manager', scope: 'common', createdAt: iso(daysAgo(9)), sentiment: 'neutral', comments: [], rating: 5 },
    { id: 'TCK-1035', title: 'Low water pressure in Block C', description: 'Water pressure very low in the mornings on 4th floor.', category: 'Plumbing', priority: 'medium', status: 'open', unitId: 'C-401', raisedBy: 'Divya Menon', assignee: null, scope: 'common', createdAt: iso(daysAgo(1, 7)), sentiment: 'frustrated', comments: [] },
  ]

  const notices = [
    { id: nid('ntc'), title: 'Water supply interruption – Saturday', body: 'Due to overhead tank cleaning, water supply will be suspended on Saturday from 10:00 AM to 2:00 PM in all blocks. Please store water in advance.', audience: 'All residents', category: 'Maintenance', pinned: true, createdAt: iso(daysAgo(0, 9)), author: 'Neha Kapoor', reads: 61 },
    { id: nid('ntc'), title: 'Diwali Celebration 2026 🎉', body: 'Join us at the clubhouse lawn on the evening of Diwali for rangoli, music and a potluck dinner. Kids’ activities start at 5 PM.', audience: 'All residents', category: 'Event', pinned: false, createdAt: iso(daysAgo(2)), author: 'Cultural Committee', reads: 88 },
    { id: nid('ntc'), title: 'AGM on 12th October', body: 'The Annual General Meeting will be held on 12 October at 11 AM in the clubhouse. Agenda: audited accounts, budget for FY27, election of committee.', audience: 'Owners', category: 'Meeting', pinned: false, createdAt: iso(daysAgo(6)), author: 'Neha Kapoor', reads: 104 },
  ]

  const polls = [
    { id: nid('pol'), question: 'Should we install EV charging stations in basement parking?', options: [{ id: 'o1', text: 'Yes, from sinking fund', votes: 38 }, { id: 'o2', text: 'Yes, pay-per-use only', votes: 21 }, { id: 'o3', text: 'Not now', votes: 7 }], closesAt: iso(new Date(Date.now() + 5 * 86400000)), voters: [], createdAt: iso(daysAgo(3)) },
    { id: nid('pol'), question: 'Preferred timing for the gym?', options: [{ id: 'o1', text: '5 AM – 11 PM', votes: 44 }, { id: 'o2', text: '24x7 with access card', votes: 29 }], closesAt: iso(daysAgo(-2)), voters: [], createdAt: iso(daysAgo(8)) },
  ]

  const amenities = [
    { id: 'am_club', name: 'Clubhouse Hall', capacity: 120, fee: 5000, deposit: 10000, slots: ['09:00-13:00', '14:00-18:00', '18:00-23:00'], icon: 'party', requiresApproval: true },
    { id: 'am_gym', name: 'Gym', capacity: 15, fee: 0, deposit: 0, slots: ['06:00-07:00', '07:00-08:00', '08:00-09:00', '18:00-19:00', '19:00-20:00', '20:00-21:00'], icon: 'dumbbell', requiresApproval: false },
    { id: 'am_pool', name: 'Swimming Pool', capacity: 25, fee: 0, deposit: 0, slots: ['06:00-08:00', '08:00-10:00', '16:00-18:00', '18:00-20:00'], icon: 'waves', requiresApproval: false },
    { id: 'am_court', name: 'Badminton Court', capacity: 4, fee: 100, deposit: 0, slots: ['06:00-07:00', '07:00-08:00', '17:00-18:00', '18:00-19:00', '19:00-20:00'], icon: 'trophy', requiresApproval: false },
    { id: 'am_guest', name: 'Guest Room', capacity: 3, fee: 1500, deposit: 2000, slots: ['Full day'], icon: 'bed', requiresApproval: true },
  ]
  const today = new Date().toISOString().slice(0, 10)
  const bookings = [
    { id: nid('bkg'), amenityId: 'am_gym', unitId: 'B-203', date: today, slot: '19:00-20:00', status: 'confirmed', bookedBy: 'Rohan Mehta' },
    { id: nid('bkg'), amenityId: 'am_club', unitId: 'A-204', date: iso(daysAgo(-4)).slice(0, 10), slot: '18:00-23:00', status: 'pending', bookedBy: 'Vikram Reddy' },
    { id: nid('bkg'), amenityId: 'am_court', unitId: 'C-302', date: today, slot: '18:00-19:00', status: 'confirmed', bookedBy: 'Aditya Rao' },
  ]

  const documents = [
    { id: nid('doc'), name: 'Society Bye-laws (Amended 2024).pdf', category: 'Bye-laws', size: '2.4 MB', access: 'all', uploadedAt: iso(daysAgo(300)) },
    { id: nid('doc'), name: 'AGM Minutes – Oct 2025.pdf', category: 'Minutes', size: '860 KB', access: 'all', uploadedAt: iso(daysAgo(340)) },
    { id: nid('doc'), name: 'Audited Accounts FY 2025-26.pdf', category: 'Finance', size: '1.8 MB', access: 'owners', uploadedAt: iso(daysAgo(60)) },
    { id: nid('doc'), name: 'Fire Safety NOC 2026.pdf', category: 'Compliance', size: '540 KB', access: 'all', uploadedAt: iso(daysAgo(120)) },
    { id: nid('doc'), name: 'Security Agency Contract.pdf', category: 'Contracts', size: '1.1 MB', access: 'committee', uploadedAt: iso(daysAgo(200)) },
  ]

  const staff = [
    { id: nid('stf'), name: 'Ram Singh', role: 'Security Supervisor', shift: 'Day', phone: '+91 98100 00003', present: true },
    { id: nid('stf'), name: 'Balwant Yadav', role: 'Security Guard', shift: 'Night', phone: '+91 98100 11223', present: false },
    { id: nid('stf'), name: 'Suresh Kumar', role: 'Plumber', shift: 'Day', phone: '+91 98100 22334', present: true },
    { id: nid('stf'), name: 'Mahesh Pal', role: 'Electrician', shift: 'Day', phone: '+91 98100 33445', present: true },
    { id: nid('stf'), name: 'Geeta Devi', role: 'Housekeeping', shift: 'Day', phone: '+91 98100 44556', present: true },
    { id: nid('stf'), name: 'Ravi Thapa', role: 'Security Guard', shift: 'Day', phone: '+91 98100 55667', present: false },
    { id: nid('stf'), name: 'Anil Kumar', role: 'Gardener', shift: 'Day', phone: '+91 98100 66778', present: true },
  ]

  const dailyHelp = [
    { id: nid('dh'), name: 'Lakshmi', role: 'Maid', units: ['B-203', 'B-204', 'A-101'], inside: true, lastIn: iso(daysAgo(0, 8)) },
    { id: nid('dh'), name: 'Mohan', role: 'Driver', units: ['A-402'], inside: false, lastIn: iso(daysAgo(0, 7)) },
    { id: nid('dh'), name: 'Kamla', role: 'Cook', units: ['C-301', 'C-302'], inside: true, lastIn: iso(daysAgo(0, 9)) },
  ]

  const parking = units.slice(0, 40).map((u, i) => ({
    id: `P-${String(i + 1).padStart(3, '0')}`,
    level: i < 20 ? 'B1' : 'B2',
    unitId: u.occupancy === 'vacant' ? null : u.id,
    type: i % 9 === 0 ? 'EV' : 'Car',
  }))

  const sos = [
    { id: nid('sos'), unitId: 'A-203', type: 'Medical', message: 'Elderly resident fell, need help', status: 'resolved', createdAt: iso(daysAgo(12, 22)), resolvedAt: iso(daysAgo(12, 22)) },
  ]

  const notifications = [
    { id: nid('ntf'), title: 'Visitor waiting at gate', body: 'Sunita Rao is waiting at Gate 1 for B-203', type: 'visitor', read: false, roles: ['resident'], at: iso(new Date(Date.now() - 60000)) },
    { id: nid('ntf'), title: '2 expenses need approval', body: 'Plumbing repair ₹42,000 and Diwali decor ₹65,000', type: 'finance', read: false, roles: ['admin'], at: iso(daysAgo(0, 9)) },
    { id: nid('ntf'), title: 'Urgent ticket: Lift stuck', body: 'TCK-1040 raised by A-302 marked urgent by AI triage', type: 'ticket', read: false, roles: ['admin'], at: iso(daysAgo(2, 18)) },
    { id: nid('ntf'), title: 'Maintenance bill generated', body: 'Your bill for this month is ready', type: 'finance', read: false, roles: ['resident'], at: iso(daysAgo(1)) },
  ]

  return { society, units, users, residents, invoices, payments, expenses, visitors, preApprovals, tickets, notices, polls, amenities, bookings, documents, staff, dailyHelp, parking, sos, notifications, seq: id }
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
