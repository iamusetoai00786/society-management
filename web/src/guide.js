// Single source for the in-app "How it works" page and docs/USER_GUIDE.md.
// Each scenario: who does it, the exact clicks, and what changes in the data.

export const ROLES = {
  platform: { label: 'Platform owner', who: 'SocietyOS company (Aditi Rao in the demo)' },
  admin: { label: 'Committee admin', who: 'Secretary / Treasurer of a society' },
  guard: { label: 'Security guard', who: 'Gate staff with the gate app' },
  resident: { label: 'Resident', who: 'Owner or tenant with app access' },
}

// Layers of data, top to bottom. Each layer is built from the one above it.
export const FLOW = [
  { key: 'platform', title: 'Platform', who: 'platform', items: ['Societies', 'Plans & billing', 'Suspend / activate'], note: 'The platform owner onboards each society. All data below is kept separate per society.' },
  { key: 'masters', title: 'Master tables', who: 'admin', items: ['Blocks', 'Unit types', 'Units', 'Charge heads', 'Expense categories', 'Complaint categories', 'Amenities', 'Vendors', 'Staff'], note: 'Set up once. Everything else reads from these tables.' },
  { key: 'people', title: 'People', who: 'admin', items: ['Residents (owner/tenant)', 'App logins', 'Guards (from Staff)', 'Parking allotment'], note: 'Residents live in units. App access creates a login.' },
  { key: 'daily', title: 'Daily transactions', who: 'all', items: ['Invoices → Payments', 'Expenses → Approvals', 'Visitors & gate passes', 'Tickets', 'Bookings', 'Notices & polls', 'SOS'], note: 'Created by admins, residents and guards while running the society.' },
  { key: 'outputs', title: 'Outputs', who: 'admin', items: ['Unit ledger', 'Dashboards & reports', 'AI insights', 'Activity log'], note: 'Calculated from the transactions. Nothing is typed in twice.' },
]

export const MASTER_TABLES = [
  ['Blocks', 'Code, name, floors, units per floor', 'Generates units (A-101…)', 'Setup → Master tables → Blocks'],
  ['Unit types', 'Name, carpet area', 'Unit area → maintenance per sq.ft', 'Master tables → Unit types'],
  ['Units', 'Code, block, floor, type, area, occupancy', 'Residents, parking, one invoice per occupied unit', 'Master tables → Units'],
  ['Charge heads', 'Name, basis (per sq.ft / fixed / per parking slot), rate', 'Invoice lines of every bill cycle', 'Master tables → Charge heads'],
  ['Expense categories', 'Name, monthly budget', 'Expenses, budget vs actual, AI overspend alerts', 'Master tables → Expense categories'],
  ['Complaint categories', 'Name, SLA hours, default assignee', 'AI ticket routing, SLA breach alerts', 'Master tables → Complaint categories'],
  ['Amenities', 'Capacity, fee, deposit, slots, approval rule', 'Bookings and clash checks', 'Master tables → Amenities'],
  ['Vendors', 'Service, phone, contract end', 'Expenses, contract-renewal alerts', 'Master tables → Vendors'],
  ['Staff', 'Role, shift, phone, gate-app access', 'Ticket assignees, attendance, guard logins', 'Master tables → Staff'],
]

export const MATRIX = [
  ['Onboard / suspend societies, change plans', ['platform']],
  ['Set up master tables', ['admin']],
  ['Add / move out residents, give app access', ['admin']],
  ['Generate bills, apply late fees, waive, cancel', ['admin']],
  ['Pay own bills online (full or part)', ['resident']],
  ['Record cash / cheque payments', ['admin']],
  ['Record expenses', ['admin']],
  ['Approve expenses above the limit (not your own)', ['admin']],
  ['Log visitors, verify OTP passes, daily help in/out', ['guard', 'admin']],
  ['Approve / deny own visitors, create gate passes', ['resident']],
  ['Raise complaints, rate fixes', ['resident']],
  ['Assign, update and resolve tickets', ['admin']],
  ['Publish notices, create polls', ['admin']],
  ['Vote in polls, book amenities', ['resident']],
  ['Approve hall / guest-room bookings', ['admin']],
  ['Raise SOS', ['resident', 'admin']],
  ['Resolve SOS, mark staff attendance', ['guard', 'admin']],
  ['See the activity log', ['admin', 'resident']],
]

export const SCENARIOS = [
  // ---------------------------------------------------------------- Platform
  { area: 'Platform', title: 'Onboard a new society', actors: ['platform'], link: '/societies/new',
    steps: ['Log in as Platform owner.', 'Onboard society → fill profile (name, code, city, plan).', 'Structure → describe it in plain English and click “Build structure” (AI), then adjust blocks and unit types.', 'Billing → set charge heads, due day, late fee, grace days.', 'First admin → name and mobile.', 'Review → Create society.'],
    result: 'Society, blocks, every unit, charge heads, 9 complaint categories, 9 expense categories, 2 amenities and the admin login are created. The society appears on the login screen.' },
  { area: 'Platform', title: 'Change plan or suspend a society', actors: ['platform'], link: '/societies',
    steps: ['Societies → change the Plan dropdown, or click Suspend.'],
    result: 'Plan changes MRR. A suspended society’s users can’t log in; its data is kept. Activate to restore.' },
  { area: 'Platform', title: 'Look inside any society', actors: ['platform'], link: '/',
    steps: ['Click the society switcher at the top of the sidebar, or “Open society” on a card.', 'Work as the society admin. An amber banner reminds you.', 'Exit to platform from the banner.'],
    result: 'Every change you make is logged under your name in that society’s activity log.' },

  // ------------------------------------------------------------------- Setup
  { area: 'Setup', title: 'Add a new block / tower', actors: ['admin'], link: '/masters?tab=blocks',
    steps: ['Master tables → Unit types: make sure the type exists.', 'Blocks → Add → code (e.g. D), name, floors, units per floor, default type.'],
    result: 'All units (D-101 … D-404) are generated as vacant. They are billed once a resident moves in.' },
  { area: 'Setup', title: 'Correct a unit’s type or area', actors: ['admin'], link: '/masters?tab=units',
    steps: ['Master tables → Units → pencil on the unit.', 'Pick another type or enter a custom area.'],
    result: 'The next bill uses the new area. Past invoices stay unchanged. Changing a unit type’s area updates every unit of that type.' },
  { area: 'Setup', title: 'Add a charge (e.g. water charges)', actors: ['admin'], link: '/masters?tab=charge-heads',
    steps: ['Master tables → Charge heads → Add.', 'Name “Water”, basis Fixed, rate 300, Active.'],
    result: 'Every unit’s next invoice gets a “Water ₹300” line. Deactivate to stop billing it.' },
  { area: 'Setup', title: 'Add a guard with a gate login', actors: ['admin'], link: '/masters?tab=staff',
    steps: ['Master tables → Staff → Add.', 'Role Security Guard, tick “Give gate-app login”.'],
    result: 'The guard appears on the login screen under Security and can use the gate console. Untick to revoke.' },
  { area: 'Setup', title: 'Set complaint SLAs and owners', actors: ['admin'], link: '/masters?tab=ticket-categories',
    steps: ['Master tables → Complaint categories → edit a row.', 'Set SLA hours and the default assignee (from Staff).'],
    result: 'New tickets in that category are routed to that person with that deadline. Urgent tickets get at most 4 hours.' },

  // --------------------------------------------------------------- Residents
  { area: 'Residents', title: 'Owner moves in', actors: ['admin'], link: '/residents',
    steps: ['Residents & Units → Add resident.', 'Pick a vacant unit, type Owner, tick “App access”.'],
    result: 'Unit becomes owner-occupied, is billed from the next cycle, and the owner can log in.' },
  { area: 'Residents', title: 'Tenant moves in', actors: ['admin'], link: '/residents',
    steps: ['Add resident → type Tenant → lease end date is required.'],
    result: 'Unit shows as tenant-occupied. AI Insights warns 30 days before the lease ends.' },
  { area: 'Residents', title: 'Move-out with pending dues', actors: ['admin'], link: '/residents',
    steps: ['Residents → trash icon on the resident.', 'If the unit owes money, the app blocks it and shows the amount.', 'Collect dues first, or choose “Move out anyway”.'],
    result: 'Resident and their login are removed. Dues stay on the unit ledger; the unit becomes vacant if nobody is left.' },
  { area: 'Residents', title: 'Allot a parking slot', actors: ['admin'], link: '/parking',
    steps: ['Parking → click a free slot → pick the unit.'],
    result: 'Slot shows the unit. The “Parking” charge head bills it per slot from the next cycle.' },

  // ----------------------------------------------------------------- Billing
  { area: 'Billing', title: 'Generate the monthly bills', actors: ['admin'], link: '/billing',
    steps: ['Billing → Generate bills.', 'Pick the month and review the preview (units, total per charge head, sample bills).', 'Confirm.'],
    result: 'One invoice per occupied unit with lines from active charge heads. Residents get a notification. Running it twice for the same month is blocked.' },
  { area: 'Billing', title: 'Resident pays online', actors: ['resident'], link: '/billing',
    steps: ['Log in as a resident → Billing → Pay.', 'Choose UPI / card / net banking → Pay.'],
    result: 'Invoice becomes Paid, a receipt is shown, the unit ledger gets a credit, admins are notified.' },
  { area: 'Billing', title: 'Part payment', actors: ['resident', 'admin'], link: '/billing',
    steps: ['In the pay window, change the amount to less than the balance.'],
    result: 'Invoice becomes Partial with the remaining balance. Pay again later to close it.' },
  { area: 'Billing', title: 'Record cash or cheque', actors: ['admin'], link: '/billing',
    steps: ['Billing → Record on the invoice → Cash or Cheque → amount → Record.'],
    result: 'Payment is stored with “recorded by” your name, visible in Payment history and the unit ledger.' },
  { area: 'Billing', title: 'Apply late fees', actors: ['admin'], link: '/billing',
    steps: ['Billing → ⋯ → Apply late fees.'],
    result: 'Open invoices past due date + grace days get late fee % × months overdue.' },
  { area: 'Billing', title: 'Waive a late fee / cancel a wrong bill', actors: ['admin'], link: '/billing',
    steps: ['Billing → ⋯ on the invoice → Waive late fee, or Cancel invoice (only if nothing was paid).'],
    result: 'Waiver shows as a credit in the ledger. Cancelled bills drop out of dues and reports.' },
  { area: 'Billing', title: 'Chase defaulters with AI', actors: ['admin'], link: '/insights',
    steps: ['AI Insights → Defaulter risk shows a 0–100 score and a reason per unit.', 'Click Send reminder, or Billing → Remind all.', 'Click a unit code → Ledger → Explain with AI.'],
    result: 'Reminders are logged. The AI explanation gives the amount, period and suggested next step.' },

  // -------------------------------------------------------------- Accounting
  { area: 'Accounting', title: 'Small expense (auto-approved)', actors: ['admin'], link: '/accounting',
    steps: ['Accounting → Record expense → description, category, amount below the approval limit.'],
    result: 'Saved as Approved and counted in reports immediately. Category is suggested automatically from the description.' },
  { area: 'Accounting', title: 'Large expense (maker–checker)', actors: ['admin'], link: '/accounting',
    steps: ['Admin 1 records an expense above ₹25,000 → it is Pending.', 'Admin 1 cannot approve their own.', 'Log in as Admin 2 (e.g. the Treasurer) → Approve or Reject.'],
    result: 'Approved expenses count in reports; the approver’s name is saved. Societies with one admin can self-approve.' },
  { area: 'Accounting', title: 'Budget overrun', actors: ['admin'], link: '/masters?tab=expense-categories',
    steps: ['Set a monthly budget per expense category.', 'Record expenses as usual.'],
    result: 'Accounting shows budget vs actual; AI Insights flags categories above budget or spiking vs the 3-month average.' },

  // -------------------------------------------------------------------- Gate
  { area: 'Gate', title: 'Guest walks in', actors: ['guard', 'resident'], link: '/visitors',
    steps: ['Guard: New entry → Guest → name + flat → Request approval.', 'Resident: sees “X is at the gate” on the dashboard → Approve or Deny.', 'Guard: Exit when they leave.'],
    result: 'Visitor log shows who logged, who approved, entry and exit times.' },
  { area: 'Gate', title: 'Pre-approved guest (OTP pass)', actors: ['resident', 'guard'], link: '/visitors?pass=1',
    steps: ['Resident: Create gate pass → name → share the 6-digit code on WhatsApp.', 'Guard: Verify gate pass → type the code.'],
    result: 'Guest is checked in without calling the resident. Codes are one-time and expire in 24h.' },
  { area: 'Gate', title: 'Delivery left at the gate', actors: ['guard'], link: '/visitors',
    steps: ['Guard: Delivery → company chip → flat → Leave at gate.'],
    result: 'Resident is notified that a parcel is at the gate. No approval needed.' },
  { area: 'Gate', title: 'Visitor for a vacant or wrong flat', actors: ['guard'], link: '/visitors',
    steps: ['Guard enters a flat that is vacant or doesn’t exist.'],
    result: 'The entry is refused with the reason, so no approval request goes to nobody.' },
  { area: 'Gate', title: 'Maid / driver entry', actors: ['guard'], link: '/visitors',
    steps: ['Guard: Daily help → Mark in / Mark out.'],
    result: 'Every unit that employs them gets a notification.' },

  // ---------------------------------------------------------------- Helpdesk
  { area: 'Helpdesk', title: 'Complaint from start to finish', actors: ['resident', 'admin'], link: '/helpdesk?new=',
    steps: ['Resident: New ticket → type the problem. AI fills category, priority, SLA and assignee live.', 'Submit → ticket is Assigned.', 'Admin/staff: open the ticket → comment (moves to In progress) → set Resolved.', 'Resident: rate 1–5 stars (closes it) or reopen.'],
    result: 'Full history in the ticket and the activity log. Ratings feed service quality.' },
  { area: 'Helpdesk', title: 'SLA breach', actors: ['admin'], link: '/helpdesk',
    steps: ['A ticket passes its SLA deadline without being resolved.'],
    result: 'It shows a red “SLA breached” badge, the dashboard counts it, AI Insights asks you to escalate.' },

  // --------------------------------------------------------------- Community
  { area: 'Community', title: 'Publish a notice with AI', actors: ['admin'], link: '/notices',
    steps: ['Notices → New notice → type one line (e.g. “water tank cleaning Saturday 10–2”) → tone → Draft.', 'Edit, pick the audience → Publish.'],
    result: 'Residents and guards are notified; read counts show on the card.' },
  { area: 'Community', title: 'Run a poll', actors: ['admin', 'resident'], link: '/polls',
    steps: ['Admin: New poll → question, options, days open.', 'Residents vote once each; results update live.'],
    result: 'Closed polls keep their final result.' },
  { area: 'Community', title: 'Book an amenity', actors: ['resident', 'admin'], link: '/amenities',
    steps: ['Resident: Amenity booking → pick amenity and date → Book a slot.', 'Clubhouse / guest room: admin approves in the bookings list.'],
    result: 'Full slots and past dates are refused. Units with 2+ unpaid bills are blocked from booking until they pay.' },
  { area: 'Community', title: 'Share a document', actors: ['admin'], link: '/documents',
    steps: ['Documents → Upload → choose who can see it (everyone / owners / committee).'],
    result: 'Tenants don’t see owners-only files; residents never see committee files.' },

  // ------------------------------------------------------------ Safety/audit
  { area: 'Safety & audit', title: 'Emergency SOS', actors: ['resident', 'guard'], link: '/sos',
    steps: ['Resident: red SOS button → type → Send.', 'Guard/admin: SOS Alerts → Mark resolved.'],
    result: 'Alert reaches every guard and admin instantly with the unit number; resolution time is saved.' },
  { area: 'Safety & audit', title: 'Find out who did something', actors: ['admin'], link: '/activity',
    steps: ['Activity log → search a name, unit, invoice or ticket, or filter by role.'],
    result: 'Every change shows who did it, when, and exactly what changed.' },
]
