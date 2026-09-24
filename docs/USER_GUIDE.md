# SocietyOS user guide

How the app is organised, who does what, and step-by-step instructions for every scenario. The same content is in the app under **How it works**.

## 1. Try the demo

```bash
cd web && npm install && npm run dev   # http://localhost:5173
```

Sign in with two clicks: choose **Platform owner** or a society, then choose a person. There are three sample societies:

| Society | City | Structure | Plan |
|---|---|---|---|
| Green Valley Residency (GV) | Gurugram | Blocks A, B, C · 4 floors × 4 flats (48 units) | Premium |
| Lakeview Towers (LV) | Pune | Towers T1, T2 · 6 floors × 4 flats (48 units) | Standard |
| Sunrise Enclave (SE) | Bengaluru | 18 villas | Basic |

Each society has admins (e.g. Neha Kapoor, Secretary, and Vikas Jain, Treasurer, at GV), a guard and several residents with app access. To switch to someone else in the same society, open the user menu (top right).

## 2. The data flow

Each layer is built from the one above it. Nothing is entered twice.

### 1. Platform · *Platform owner*

The platform owner onboards each society. All data below is kept separate per society.

- Societies
- Plans & billing
- Suspend / activate

⬇

### 2. Master tables · *Committee admin*

Set up once. Everything else reads from these tables.

- Blocks
- Unit types
- Units
- Charge heads
- Expense categories
- Complaint categories
- Amenities
- Vendors
- Staff

⬇

### 3. People · *Committee admin*

Residents live in units. App access creates a login.

- Residents (owner/tenant)
- App logins
- Guards (from Staff)
- Parking allotment

⬇

### 4. Daily transactions · *Admins, residents & guards*

Created by admins, residents and guards while running the society.

- Invoices → Payments
- Expenses → Approvals
- Visitors & gate passes
- Tickets
- Bookings
- Notices & polls
- SOS

⬇

### 5. Outputs · *Committee admin*

Calculated from the transactions. Nothing is typed in twice.

- Unit ledger
- Dashboards & reports
- AI insights
- Activity log

### Example: one bill, end to end

1. **Masters:** unit B-203 is a 3BHK of 1,580 sq.ft. Charge heads: Maintenance ₹3.5/sq.ft, Sinking Fund ₹500, Parking ₹300/slot.
2. **People:** Rohan Mehta (owner) lives in B-203 and has a parking slot.
3. **Billing:** the admin generates the cycle. Invoice = 1,580 × 3.5 + 500 + 300 = ₹6,330.
4. **Payment:** Rohan pays ₹3,000 by UPI. The invoice becomes *Partial* with ₹3,330 due.
5. **Outputs:** the B-203 ledger, dashboard collection %, defaulter risk score and activity log all update automatically.

## 3. Master tables

| Table | Holds | Feeds into | Where |
|---|---|---|---|
| Blocks | Code, name, floors, units per floor | Generates units (A-101…) | Setup → Master tables → Blocks |
| Unit types | Name, carpet area | Unit area → maintenance per sq.ft | Master tables → Unit types |
| Units | Code, block, floor, type, area, occupancy | Residents, parking, one invoice per occupied unit | Master tables → Units |
| Charge heads | Name, basis (per sq.ft / fixed / per parking slot), rate | Invoice lines of every bill cycle | Master tables → Charge heads |
| Expense categories | Name, monthly budget | Expenses, budget vs actual, AI overspend alerts | Master tables → Expense categories |
| Complaint categories | Name, SLA hours, default assignee | AI ticket routing, SLA breach alerts | Master tables → Complaint categories |
| Amenities | Capacity, fee, deposit, slots, approval rule | Bookings and clash checks | Master tables → Amenities |
| Vendors | Service, phone, contract end | Expenses, contract-renewal alerts | Master tables → Vendors |
| Staff | Role, shift, phone, gate-app access | Ticket assignees, attendance, guard logins | Master tables → Staff |

**Delete protection:** a master record can't be deleted while other data depends on it. Examples: a unit type used by units, a block with occupied units, a category with open tickets, a staff member who is a default assignee. The error message says what to fix.

## 4. Who does what

| Action | Platform owner | Committee admin | Security guard | Resident |
|---|:---:|:---:|:---:|:---:|
| Onboard / suspend societies, change plans | ✅ |  |  |  |
| Set up master tables |  | ✅ |  |  |
| Add / move out residents, give app access |  | ✅ |  |  |
| Generate bills, apply late fees, waive, cancel |  | ✅ |  |  |
| Pay own bills online (full or part) |  |  |  | ✅ |
| Record cash / cheque payments |  | ✅ |  |  |
| Record expenses |  | ✅ |  |  |
| Approve expenses above the limit (not your own) |  | ✅ |  |  |
| Log visitors, verify OTP passes, daily help in/out |  | ✅ | ✅ |  |
| Approve / deny own visitors, create gate passes |  |  |  | ✅ |
| Raise complaints, rate fixes |  |  |  | ✅ |
| Assign, update and resolve tickets |  | ✅ |  |  |
| Publish notices, create polls |  | ✅ |  |  |
| Vote in polls, book amenities |  |  |  | ✅ |
| Approve hall / guest-room bookings |  | ✅ |  |  |
| Raise SOS |  | ✅ |  | ✅ |
| Resolve SOS, mark staff attendance |  | ✅ | ✅ |  |
| See the activity log |  | ✅ |  | ✅ |

## 5. Scenarios (35)

### Platform

#### 1. Onboard a new society

**Who:** Platform owner · **Where:** `/societies/new`

1. Log in as Platform owner.
2. Onboard society → fill profile (name, code, city, plan).
3. Structure → describe it in plain English and click “Build structure” (AI), then adjust blocks and unit types.
4. Billing → set charge heads, due day, late fee, grace days.
5. First admin → name and mobile.
6. Review → Create society.

> **Result:** Society, blocks, every unit, charge heads, 9 complaint categories, 9 expense categories, 2 amenities and the admin login are created. The society appears on the login screen.

#### 2. Change plan or suspend a society

**Who:** Platform owner · **Where:** `/societies`

1. Societies → change the Plan dropdown, or click Suspend.

> **Result:** Plan changes MRR. A suspended society’s users can’t log in; its data is kept. Activate to restore.

#### 3. Look inside any society

**Who:** Platform owner · **Where:** `/`

1. Click the society switcher at the top of the sidebar, or “Open society” on a card.
2. Work as the society admin. An amber banner reminds you.
3. Exit to platform from the banner.

> **Result:** Every change you make is logged under your name in that society’s activity log.

### Setup

#### 4. Add a new block / tower

**Who:** Committee admin · **Where:** `/masters?tab=blocks`

1. Master tables → Unit types: make sure the type exists.
2. Blocks → Add → code (e.g. D), name, floors, units per floor, default type.

> **Result:** All units (D-101 … D-404) are generated as vacant. They are billed once a resident moves in.

#### 5. Correct a unit’s type or area

**Who:** Committee admin · **Where:** `/masters?tab=units`

1. Master tables → Units → pencil on the unit.
2. Pick another type or enter a custom area.

> **Result:** The next bill uses the new area. Past invoices stay unchanged. Changing a unit type’s area updates every unit of that type.

#### 6. Add a charge (e.g. water charges)

**Who:** Committee admin · **Where:** `/masters?tab=charge-heads`

1. Master tables → Charge heads → Add.
2. Name “Water”, basis Fixed, rate 300, Active.

> **Result:** Every unit’s next invoice gets a “Water ₹300” line. Deactivate to stop billing it.

#### 7. Add a guard with a gate login

**Who:** Committee admin · **Where:** `/masters?tab=staff`

1. Master tables → Staff → Add.
2. Role Security Guard, tick “Give gate-app login”.

> **Result:** The guard appears on the login screen under Security and can use the gate console. Untick to revoke.

#### 8. Set complaint SLAs and owners

**Who:** Committee admin · **Where:** `/masters?tab=ticket-categories`

1. Master tables → Complaint categories → edit a row.
2. Set SLA hours and the default assignee (from Staff).

> **Result:** New tickets in that category are routed to that person with that deadline. Urgent tickets get at most 4 hours.

### Residents

#### 9. Owner moves in

**Who:** Committee admin · **Where:** `/residents`

1. Residents & Units → Add resident.
2. Pick a vacant unit, type Owner, tick “App access”.

> **Result:** Unit becomes owner-occupied, is billed from the next cycle, and the owner can log in.

#### 10. Tenant moves in

**Who:** Committee admin · **Where:** `/residents`

1. Add resident → type Tenant → lease end date is required.

> **Result:** Unit shows as tenant-occupied. AI Insights warns 30 days before the lease ends.

#### 11. Move-out with pending dues

**Who:** Committee admin · **Where:** `/residents`

1. Residents → trash icon on the resident.
2. If the unit owes money, the app blocks it and shows the amount.
3. Collect dues first, or choose “Move out anyway”.

> **Result:** Resident and their login are removed. Dues stay on the unit ledger; the unit becomes vacant if nobody is left.

#### 12. Allot a parking slot

**Who:** Committee admin · **Where:** `/parking`

1. Parking → click a free slot → pick the unit.

> **Result:** Slot shows the unit. The “Parking” charge head bills it per slot from the next cycle.

### Billing

#### 13. Generate the monthly bills

**Who:** Committee admin · **Where:** `/billing`

1. Billing → Generate bills.
2. Pick the month and review the preview (units, total per charge head, sample bills).
3. Confirm.

> **Result:** One invoice per occupied unit with lines from active charge heads. Residents get a notification. Running it twice for the same month is blocked.

#### 14. Resident pays online

**Who:** Resident · **Where:** `/billing`

1. Log in as a resident → Billing → Pay.
2. Choose UPI / card / net banking → Pay.

> **Result:** Invoice becomes Paid, a receipt is shown, the unit ledger gets a credit, admins are notified.

#### 15. Part payment

**Who:** Resident, Committee admin · **Where:** `/billing`

1. In the pay window, change the amount to less than the balance.

> **Result:** Invoice becomes Partial with the remaining balance. Pay again later to close it.

#### 16. Record cash or cheque

**Who:** Committee admin · **Where:** `/billing`

1. Billing → Record on the invoice → Cash or Cheque → amount → Record.

> **Result:** Payment is stored with “recorded by” your name, visible in Payment history and the unit ledger.

#### 17. Apply late fees

**Who:** Committee admin · **Where:** `/billing`

1. Billing → ⋯ → Apply late fees.

> **Result:** Open invoices past due date + grace days get late fee % × months overdue.

#### 18. Waive a late fee / cancel a wrong bill

**Who:** Committee admin · **Where:** `/billing`

1. Billing → ⋯ on the invoice → Waive late fee, or Cancel invoice (only if nothing was paid).

> **Result:** Waiver shows as a credit in the ledger. Cancelled bills drop out of dues and reports.

#### 19. Chase defaulters with AI

**Who:** Committee admin · **Where:** `/insights`

1. AI Insights → Defaulter risk shows a 0–100 score and a reason per unit.
2. Click Send reminder, or Billing → Remind all.
3. Click a unit code → Ledger → Explain with AI.

> **Result:** Reminders are logged. The AI explanation gives the amount, period and suggested next step.

### Accounting

#### 20. Small expense (auto-approved)

**Who:** Committee admin · **Where:** `/accounting`

1. Accounting → Record expense → description, category, amount below the approval limit.

> **Result:** Saved as Approved and counted in reports immediately. Category is suggested automatically from the description.

#### 21. Large expense (maker–checker)

**Who:** Committee admin · **Where:** `/accounting`

1. Admin 1 records an expense above ₹25,000 → it is Pending.
2. Admin 1 cannot approve their own.
3. Log in as Admin 2 (e.g. the Treasurer) → Approve or Reject.

> **Result:** Approved expenses count in reports; the approver’s name is saved. Societies with one admin can self-approve.

#### 22. Budget overrun

**Who:** Committee admin · **Where:** `/masters?tab=expense-categories`

1. Set a monthly budget per expense category.
2. Record expenses as usual.

> **Result:** Accounting shows budget vs actual; AI Insights flags categories above budget or spiking vs the 3-month average.

### Gate

#### 23. Guest walks in

**Who:** Security guard, Resident · **Where:** `/visitors`

1. Guard: New entry → Guest → name + flat → Request approval.
2. Resident: sees “X is at the gate” on the dashboard → Approve or Deny.
3. Guard: Exit when they leave.

> **Result:** Visitor log shows who logged, who approved, entry and exit times.

#### 24. Pre-approved guest (OTP pass)

**Who:** Resident, Security guard · **Where:** `/visitors?pass=1`

1. Resident: Create gate pass → name → share the 6-digit code on WhatsApp.
2. Guard: Verify gate pass → type the code.

> **Result:** Guest is checked in without calling the resident. Codes are one-time and expire in 24h.

#### 25. Delivery left at the gate

**Who:** Security guard · **Where:** `/visitors`

1. Guard: Delivery → company chip → flat → Leave at gate.

> **Result:** Resident is notified that a parcel is at the gate. No approval needed.

#### 26. Visitor for a vacant or wrong flat

**Who:** Security guard · **Where:** `/visitors`

1. Guard enters a flat that is vacant or doesn’t exist.

> **Result:** The entry is refused with the reason, so no approval request goes to nobody.

#### 27. Maid / driver entry

**Who:** Security guard · **Where:** `/visitors`

1. Guard: Daily help → Mark in / Mark out.

> **Result:** Every unit that employs them gets a notification.

### Helpdesk

#### 28. Complaint from start to finish

**Who:** Resident, Committee admin · **Where:** `/helpdesk?new=`

1. Resident: New ticket → type the problem. AI fills category, priority, SLA and assignee live.
2. Submit → ticket is Assigned.
3. Admin/staff: open the ticket → comment (moves to In progress) → set Resolved.
4. Resident: rate 1–5 stars (closes it) or reopen.

> **Result:** Full history in the ticket and the activity log. Ratings feed service quality.

#### 29. SLA breach

**Who:** Committee admin · **Where:** `/helpdesk`

1. A ticket passes its SLA deadline without being resolved.

> **Result:** It shows a red “SLA breached” badge, the dashboard counts it, AI Insights asks you to escalate.

### Community

#### 30. Publish a notice with AI

**Who:** Committee admin · **Where:** `/notices`

1. Notices → New notice → type one line (e.g. “water tank cleaning Saturday 10–2”) → tone → Draft.
2. Edit, pick the audience → Publish.

> **Result:** Residents and guards are notified; read counts show on the card.

#### 31. Run a poll

**Who:** Committee admin, Resident · **Where:** `/polls`

1. Admin: New poll → question, options, days open.
2. Residents vote once each; results update live.

> **Result:** Closed polls keep their final result.

#### 32. Book an amenity

**Who:** Resident, Committee admin · **Where:** `/amenities`

1. Resident: Amenity booking → pick amenity and date → Book a slot.
2. Clubhouse / guest room: admin approves in the bookings list.

> **Result:** Full slots and past dates are refused. Units with 2+ unpaid bills are blocked from booking until they pay.

#### 33. Share a document

**Who:** Committee admin · **Where:** `/documents`

1. Documents → Upload → choose who can see it (everyone / owners / committee).

> **Result:** Tenants don’t see owners-only files; residents never see committee files.

### Safety & audit

#### 34. Emergency SOS

**Who:** Resident, Security guard · **Where:** `/sos`

1. Resident: red SOS button → type → Send.
2. Guard/admin: SOS Alerts → Mark resolved.

> **Result:** Alert reaches every guard and admin instantly with the unit number; resolution time is saved.

#### 35. Find out who did something

**Who:** Committee admin · **Where:** `/activity`

1. Activity log → search a name, unit, invoice or ticket, or filter by role.

> **Result:** Every change shows who did it, when, and exactly what changed.

## 6. Business rules at a glance

| Rule | Where it's enforced |
|---|---|
| One invoice per occupied unit per month; the same month can't be billed twice | `POST /api/invoices/generate` |
| Invoice lines come only from active charge heads; later changes affect future bills only | Bill generation |
| Part payments allowed; you can't pay more than the balance | `POST /api/invoices/:id/pay` |
| Late fee = % × months overdue, after the grace days | `POST /api/invoices/apply-late-fees` |
| Only unpaid invoices with no payments can be cancelled | `POST /api/invoices/:id/cancel` |
| Expenses above the approval limit need a different admin to approve (maker–checker) | `POST /api/expenses/:id/approve` |
| Expense category must exist in Masters | `POST /api/expenses` |
| Tenants need a lease end date | `POST /api/residents` |
| Move-out is blocked while the unit owes money, unless forced (dues stay on the unit) | `DELETE /api/residents/:id` |
| Visitors can't be logged for vacant or unknown units | `POST /api/visitors` |
| Gate-pass codes are one-time and expire after 24 h | `POST /api/visitors/verify-code` |
| Ticket SLA comes from the category; urgent tickets get at most 4 h | `POST /api/tickets` |
| Residents can only rate, close or reopen their own tickets | `PATCH /api/tickets/:id` |
| Bookings: no clashes, no past dates, blocked for units with 2+ unpaid bills | `POST /api/bookings` |
| One vote per person; staff can't vote | `POST /api/polls/:id/vote` |
| Suspended societies can't log in | Every request |
