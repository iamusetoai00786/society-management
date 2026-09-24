# SocietyOS REST API

Every endpoint the frontend calls. In the demo they run in the browser (`web/src/api/mockServer.js`), so no backend is needed. Build a backend with the same routes and set `VITE_API_URL` to use it. The in-app **API Explorer** (`/api-explorer`) calls any endpoint live.

## Conventions

- Base path `/api`, JSON in and out. Errors: `{ "message": "..." }` with 400, 401, 403, 404, 409, 410 or 422.
- Auth: `Authorization: Bearer <token>` from `POST /api/auth/login`.
- **Multi-tenant:** every record has a `societyId`. Society users are pinned to their own society. The platform owner (`super_admin`) picks one with the `x-society-id` header; `/api/platform/*` routes need no society.
- Roles: `super_admin`, `admin`, `resident`, `guard`. Residents only see their own unit's data. A suspended society returns 403.
- Every write appends to `/api/activity` (who, role, action, record, detail).

**88 endpoints**

## Auth

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/public/societies` | Societies on the platform (for the login screen). |
| `GET` | `/api/public/directory` | People who can log in to a society. Query: societyId ("platform" for the owner). |
| `POST` | `/api/auth/login` | Log in as a user. Body: { userId }. Returns { token, user }. Production: mobile OTP. |
| `GET` | `/api/auth/me` | Current user and their society. |
| `POST` | `/api/auth/logout` | End the session. |

## Platform

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/platform/overview` | All societies with KPIs, plan and MRR (platform owner). |
| `POST` | `/api/platform/societies` | Onboard a society in one call: profile, blocks → units, unit types, charge heads, first admin. Seeds default categories & amenities. |
| `PATCH` | `/api/platform/societies/:id` | Change plan or suspend/activate a society. Body: { plan?, status? }. |

## Society

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/society` | Current society profile and rules. |
| `PUT` | `/api/society` | Update profile, billing rules, approval limit (admin). |
| `GET` | `/api/setup/checklist` | Setup steps in order, computed from the data (what is done, what is next). |
| `GET` | `/api/dashboard/summary` | KPIs and chart series for the dashboard. |
| `GET` | `/api/activity` | Audit trail: who did what, when. Filters: entity, actorRole, q. Residents see their own actions. |

## Masters

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/masters/:type` | List a master table: blocks \| unit-types \| charge-heads \| expense-categories \| ticket-categories \| amenities \| vendors \| staff. |
| `POST` | `/api/masters/:type` | Create a master record (admin). Blocks auto-generate their units (body.unitTypeId). Staff with appAccess + guard role get a gate login. |
| `PUT` | `/api/masters/:type/:id` | Update a master record (admin). Unit-type area changes flow to its units (and future bills). |
| `DELETE` | `/api/masters/:type/:id` | Delete a master record (admin). Refused while other data depends on it. |

## Units & Residents

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/units` | Units with residents, parking and balance. Filters: blockId, occupancy, q. |
| `POST` | `/api/units` | Add a single unit (admin). Body: { blockId, floor, number, unitTypeId }. |
| `GET` | `/api/units/:id` | Unit 360°: residents, app users, parking, balance. |
| `PUT` | `/api/units/:id` | Change a unit’s type or area (admin). Affects future bills only. |
| `DELETE` | `/api/units/:id` | Delete a vacant unit with no dues (admin). |
| `GET` | `/api/units/:id/ledger` | Unit statement: every bill, payment and waiver with a running balance. |
| `GET` | `/api/residents` | Residents. Filters: q, type (owner\|tenant), blockId. |
| `POST` | `/api/residents` | Move-in: add an owner/tenant to a unit (admin). appAccess: true creates their app login. |
| `PUT` | `/api/residents/:id` | Update a resident (admin). Toggling appAccess creates/removes their login. |
| `DELETE` | `/api/residents/:id` | Move-out (admin). Blocked while the unit has dues unless ?force=true (dues stay on the unit ledger). |

## Billing

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/invoices` | Invoices with balance. Filters: status (unpaid\|partial\|paid\|cancelled\|open), unitId, period. Residents see their unit. |
| `GET` | `/api/invoices/preview` | Dry-run a bill cycle from charge heads. Query: period=YYYY-MM. |
| `GET` | `/api/invoices/:id` | Invoice detail with payments. |
| `POST` | `/api/invoices/generate` | Generate a bill cycle (admin). Body: { period }. One invoice per occupied unit, lines from active charge heads. |
| `POST` | `/api/invoices/:id/pay` | Pay an invoice, fully or partly. Body: { amount?, method }. Admin = offline receipt; resident = online. |
| `POST` | `/api/invoices/:id/waive-late-fee` | Waive the late fee on an invoice (admin). |
| `POST` | `/api/invoices/:id/cancel` | Cancel a wrongly raised invoice with no payments (admin). Body: { reason }. |
| `POST` | `/api/invoices/apply-late-fees` | Apply late fees to overdue invoices past the grace period (admin). |
| `POST` | `/api/invoices/:id/remind` | Send a payment reminder for one invoice (admin). |
| `POST` | `/api/invoices/remind-all` | Remind every unit with open bills (admin). |
| `GET` | `/api/payments` | Payment history. Residents see their unit. |

## Accounting

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/expenses` | Expenses. Filters: status, category. |
| `POST` | `/api/expenses` | Record an expense (admin). Category must exist in Masters. Above the approval limit it waits for a second admin. |
| `POST` | `/api/expenses/:id/approve` | Approve (checker). The admin who created it cannot approve it when another admin exists. |
| `POST` | `/api/expenses/:id/reject` | Reject a pending expense (admin). |
| `GET` | `/api/reports/financial` | Income vs expense by month, spend by category, budget vs actual. |

## Visitors & Gate

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/visitors` | Visitor log. Filters: status, date, unitId. Residents see their unit. |
| `POST` | `/api/visitors` | Guard logs a visitor. Unit must exist and be occupied. Sends an approval request to the unit. |
| `POST` | `/api/visitors/:id/approve` | Resident (or admin) approves entry. |
| `POST` | `/api/visitors/:id/deny` | Resident (or admin) denies entry. |
| `POST` | `/api/visitors/:id/checkout` | Guard marks exit. |
| `GET` | `/api/visitors/preapprovals` | Active gate passes. |
| `POST` | `/api/visitors/preapprove` | Resident creates a one-time gate pass (6-digit OTP, 24h). |
| `POST` | `/api/visitors/verify-code` | Guard verifies an OTP and checks the visitor in. |
| `GET` | `/api/daily-help` | Daily help with in/out status. |
| `POST` | `/api/daily-help/:id/toggle` | Mark daily help entry/exit (notifies their units). |

## Helpdesk

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/tickets` | Tickets. Filters: status, category, priority, unitId. Residents see own + common-area. |
| `POST` | `/api/tickets` | Raise a ticket. AI fills category, priority, SLA and assignee from the category master unless given. |
| `PATCH` | `/api/tickets/:id` | Update status, assignee, priority or rating. Residents may only reopen/close/rate their own. |
| `POST` | `/api/tickets/:id/comments` | Add a comment. |

## Communication

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/notices` | Notices, pinned first. |
| `POST` | `/api/notices` | Publish a notice (admin). |
| `DELETE` | `/api/notices/:id` | Delete a notice (admin). |
| `GET` | `/api/polls` | Polls with results. |
| `POST` | `/api/polls` | Create a poll (admin). Body: { question, options[], days }. |
| `POST` | `/api/polls/:id/vote` | Vote once per user. Body: { optionId }. |
| `GET` | `/api/notifications` | Notifications for the current user (role + unit). |
| `POST` | `/api/notifications/read-all` | Mark all as read. |

## Amenities

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/amenities` | Amenities from the master table. |
| `GET` | `/api/amenities/:id/availability` | Slot availability. Query: date=YYYY-MM-DD. |
| `GET` | `/api/bookings` | Bookings. Residents see their unit. |
| `POST` | `/api/bookings` | Book a slot (resident). Blocks clashes, past dates and units with 2+ unpaid bills. |
| `PATCH` | `/api/bookings/:id` | Approve/reject (admin) or cancel (own). Body: { status }. |

## Documents

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/documents` | Documents visible to the current user. |
| `POST` | `/api/documents` | Upload document metadata (admin). |

## Staff

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/staff` | Staff with attendance (from the staff master). |
| `POST` | `/api/staff/:id/attendance` | Toggle today’s attendance. |

## Parking

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/parking` | Parking slots and allotment. |
| `PATCH` | `/api/parking/:id` | Allot or free a slot (admin). Body: { unitId \| null }. Parking charge applies from the next bill. |

## Safety

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/sos` | SOS alerts. |
| `POST` | `/api/sos` | Raise an SOS. Body: { type, message }. |
| `POST` | `/api/sos/:id/resolve` | Resolve an SOS (admin/guard). |

## AI

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/ai/chat` | Assistant chat. Body: { message }. Platform owner without a society gets platform answers. |
| `POST` | `/api/ai/classify-ticket` | Triage text: category, priority, sentiment, SLA, assignee, suggested reply. Body: { title, description }. |
| `POST` | `/api/ai/draft-notice` | Draft a notice. Body: { prompt, tone: friendly\|formal\|urgent }. |
| `POST` | `/api/ai/structure` | Turn a plain-English description into blocks + unit types for onboarding. Body: { text }. |
| `POST` | `/api/ai/explain-ledger` | Explain a unit’s balance in plain words. Body: { unitId }. |
| `GET` | `/api/ai/insights` | Anomalies: spend spikes, budgets, SLA breaches, collection, contracts, leases. |
| `GET` | `/api/ai/defaulter-risk` | Predicted default risk per unit (admin). |
| `GET` | `/api/ai/ticket-summary` | Summary of open tickets. |

## System

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/system/reset` | Reset the mock database to seed data. |

## Example

```bash
curl -X POST "$API_URL/api/invoices/INV-GV-202609-B-203/pay" \
  -H "Authorization: Bearer tok_usr_gv_resident_1" \
  -H "Content-Type: application/json" \
  -d '{"method":"UPI","amount":3000}'
```

Returns `{ invoice: { ..., status: "partial", balance: 3330 }, payment: { ... } }`.
