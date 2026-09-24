# SocietyOS REST API

All endpoints the frontend calls. In the demo they are served by an in-browser mock server (`web/src/api/mockServer.js`), so no backend is needed. Build a real backend with the same routes and set `VITE_API_URL` to point the app at it.

## Conventions

- Base path: `/api`
- Auth: `Authorization: Bearer <token>` (every route except login and reset). Demo tokens: `demo-admin`, `demo-resident`, `demo-guard`.
- JSON request and response bodies. Errors return `{ "message": "..." }` with status `401`, `403`, `404`, `409` or `422`.
- Residents only see data for their own unit; admin-only routes return `403` for other roles.
- The in-app **API Explorer** page (`/api-explorer`) lets you try every endpoint live.

**66 endpoints**

## Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Log in with a demo role (admin, resident, guard). Returns token + user. |
| `GET` | `/api/auth/me` | Current user profile. |
| `POST` | `/api/auth/logout` | Invalidate the session token. |

## Society

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/society` | Society profile and billing settings. |
| `PUT` | `/api/society` | Update society profile/settings (admin). |

## Dashboard

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/dashboard/summary` | KPIs and chart series for the dashboard. |

## Units & Residents

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/units` | List units. Filters: block, occupancy. |
| `GET` | `/api/units/:id` | Unit detail with residents, dues and vehicles. |
| `GET` | `/api/residents` | List residents. Filters: q (search), type (owner\|tenant), block. |
| `POST` | `/api/residents` | Add a resident (admin). |
| `PUT` | `/api/residents/:id` | Update a resident (admin). |
| `DELETE` | `/api/residents/:id` | Remove (move-out) a resident (admin). |

## Billing

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/invoices` | List invoices. Filters: status, unitId, period. Residents only see their unit. |
| `GET` | `/api/invoices/:id` | Invoice detail. |
| `POST` | `/api/invoices/generate` | Generate invoices for a period (admin). Body: { period: "YYYY-MM" }. |
| `POST` | `/api/invoices/:id/pay` | Pay an invoice. Body: { method: "UPI"\|"Card"\|"Net Banking"\|"Cash"\|"Cheque" }. |
| `POST` | `/api/invoices/:id/remind` | Send a payment reminder (push/SMS/WhatsApp) for an invoice (admin). |
| `POST` | `/api/invoices/remind-all` | Send reminders to every unit with unpaid bills (admin). |
| `GET` | `/api/payments` | Payment history. Residents only see their unit. |

## Accounting

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/expenses` | List expenses. Filters: status, category. |
| `POST` | `/api/expenses` | Record an expense. Amounts above ₹25,000 go to committee approval. |
| `POST` | `/api/expenses/:id/approve` | Approve a pending expense (committee). |
| `POST` | `/api/expenses/:id/reject` | Reject a pending expense (committee). |
| `GET` | `/api/reports/financial` | Income vs expense by month and by category. |

## Visitors & Gate

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/visitors` | Visitor log. Filters: status (pending\|inside\|exited\|denied), date (YYYY-MM-DD). Residents see their unit. |
| `POST` | `/api/visitors` | Guard logs a visitor at the gate. Creates an approval request for the resident. |
| `POST` | `/api/visitors/:id/approve` | Resident approves entry. |
| `POST` | `/api/visitors/:id/deny` | Resident denies entry. |
| `POST` | `/api/visitors/:id/checkout` | Guard marks visitor exit. |
| `GET` | `/api/visitors/preapprovals` | List active gate passes. |
| `POST` | `/api/visitors/preapprove` | Resident creates a gate pass. Returns a 6-digit OTP / QR payload. |
| `POST` | `/api/visitors/verify-code` | Guard verifies a gate-pass OTP and checks the visitor in. |
| `GET` | `/api/daily-help` | Registered daily help (maids, drivers, cooks) with in/out status. |
| `POST` | `/api/daily-help/:id/toggle` | Mark daily help entry/exit at the gate. |

## Helpdesk

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/tickets` | List tickets. Filters: status, category, priority. Residents see their own + common-area tickets. |
| `POST` | `/api/tickets` | Raise a ticket. AI auto-fills category/priority/assignee when omitted. |
| `PATCH` | `/api/tickets/:id` | Update status, assignee, priority or rating. |
| `POST` | `/api/tickets/:id/comments` | Add a comment to a ticket. |

## Communication

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/notices` | List notices (pinned first). |
| `POST` | `/api/notices` | Publish a notice (admin). |
| `DELETE` | `/api/notices/:id` | Delete a notice (admin). |
| `GET` | `/api/polls` | List polls with results. |
| `POST` | `/api/polls` | Create a poll (admin). Body: { question, options: string[], days }. |
| `POST` | `/api/polls/:id/vote` | Vote once per user. Body: { optionId }. |
| `GET` | `/api/notifications` | Notifications for the current user role. |
| `POST` | `/api/notifications/read-all` | Mark all notifications as read. |

## Amenities

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/amenities` | List amenities with slots, fees and rules. |
| `GET` | `/api/amenities/:id/availability` | Slot availability for a date. Query: date=YYYY-MM-DD. |
| `GET` | `/api/bookings` | List bookings. Residents see their unit. |
| `POST` | `/api/bookings` | Book a slot. Body: { amenityId, date, slot }. Prevents clashes. |
| `PATCH` | `/api/bookings/:id` | Approve/cancel a booking. Body: { status }. |

## Documents

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/documents` | Documents visible to the current role. |
| `POST` | `/api/documents` | Upload document metadata (admin). Body: { name, category, access }. |

## Staff

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/staff` | Society staff with attendance. |
| `POST` | `/api/staff/:id/attendance` | Toggle today’s attendance for a staff member. |

## Parking

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/parking` | Parking slots and allocation. |

## Safety

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/sos` | SOS alerts (admin/guard). |
| `POST` | `/api/sos` | Raise an SOS alert. Body: { type, message }. |
| `POST` | `/api/sos/:id/resolve` | Resolve an SOS alert. |

## AI

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/ai/chat` | Assistant chat. Body: { message }. Returns { reply, suggestions, action? }. |
| `POST` | `/api/ai/classify-ticket` | Triage text into category, priority, sentiment, assignee and suggested reply. Body: { title, description }. |
| `POST` | `/api/ai/draft-notice` | Draft a notice from a one-line prompt. Body: { prompt, tone: friendly\|formal\|urgent }. |
| `GET` | `/api/ai/insights` | Anomaly detection and recommendations across finance, tickets and approvals. |
| `GET` | `/api/ai/defaulter-risk` | Predicted payment-default risk score per unit. |
| `GET` | `/api/ai/ticket-summary` | Natural-language summary of open tickets. |

## System

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/system/reset` | Reset the mock database to seed data. |

## Example

```bash
curl -X POST "$API_URL/api/ai/classify-ticket" \
  -H "Authorization: Bearer demo-resident" \
  -H "Content-Type: application/json" \
  -d '{"title":"Water leaking from ceiling since 2 days"}'
```

```json
{
  "category": "Plumbing",
  "priority": "high",
  "sentiment": "frustrated",
  "confidence": 0.86,
  "suggestedAssignee": "Suresh (Plumber)",
  "scope": "personal",
  "suggestedReply": "Thank you for reporting this. ..."
}
```
