// Regenerates docs/API.md (from the mock server's route table) and
// docs/USER_GUIDE.md (from src/guide.js, the same data the in-app guide uses).
// Run: npm run docs
import { readFileSync, writeFileSync } from 'node:fs'
import { FLOW, MASTER_TABLES, MATRIX, ROLES, SCENARIOS } from '../src/guide.js'

const root = new URL('../../', import.meta.url)
const esc = (s) => s.replace(/\|/g, '\\|')

// ---- API.md
const src = readFileSync(new URL('web/src/api/mockServer.js', root), 'utf8')
const routes = [...src.matchAll(/route\('(\w+)', '([^']+)', '([^']+)', '((?:[^'\\]|\\.)*)'/g)].map(([, m, p, g, d]) => ({ m, p, g, d: d.replace(/\\'/g, "'") }))
const groups = {}
routes.forEach((r) => (groups[r.g] ||= []).push(r))
let api = `# SocietyOS REST API

Every endpoint the frontend calls. In the demo they run in the browser (\`web/src/api/mockServer.js\`), so no backend is needed. Build a backend with the same routes and set \`VITE_API_URL\` to use it. The in-app **API Explorer** (\`/api-explorer\`) calls any endpoint live.

## Conventions

- Base path \`/api\`, JSON in and out. Errors: \`{ "message": "..." }\` with 400, 401, 403, 404, 409, 410 or 422.
- Auth: \`Authorization: Bearer <token>\` from \`POST /api/auth/login\`.
- **Multi-tenant:** every record has a \`societyId\`. Society users are pinned to their own society. The platform owner (\`super_admin\`) picks one with the \`x-society-id\` header; \`/api/platform/*\` routes need no society.
- Roles: \`super_admin\`, \`admin\`, \`resident\`, \`guard\`. Residents only see their own unit's data. A suspended society returns 403.
- Every write appends to \`/api/activity\` (who, role, action, record, detail).

**${routes.length} endpoints**

`
for (const [g, list] of Object.entries(groups)) {
  api += `## ${g}\n\n| Method | Path | Description |\n|---|---|---|\n`
  api += list.map((r) => `| \`${r.m}\` | \`${r.p}\` | ${esc(r.d)} |`).join('\n') + '\n\n'
}
api += `## Example

\`\`\`bash
curl -X POST "$API_URL/api/invoices/INV-GV-202609-B-203/pay" \\
  -H "Authorization: Bearer tok_usr_gv_resident_1" \\
  -H "Content-Type: application/json" \\
  -d '{"method":"UPI","amount":3000}'
\`\`\`

Returns \`{ invoice: { ..., status: "partial", balance: 3330 }, payment: { ... } }\`.
`
writeFileSync(new URL('docs/API.md', root), api)

// ---- USER_GUIDE.md
const R = (k) => ROLES[k]?.label || 'Admins, residents & guards'
let g = `# SocietyOS user guide

How the app is organised, who does what, and step-by-step instructions for every scenario. The same content is in the app under **How it works**.

## 1. Try the demo

\`\`\`bash
cd web && npm install && npm run dev   # http://localhost:5173
\`\`\`

Sign in with two clicks: choose **Platform owner** or a society, then choose a person. There are three sample societies:

| Society | City | Structure | Plan |
|---|---|---|---|
| Green Valley Residency (GV) | Gurugram | Blocks A, B, C · 4 floors × 4 flats (48 units) | Premium |
| Lakeview Towers (LV) | Pune | Towers T1, T2 · 6 floors × 4 flats (48 units) | Standard |
| Sunrise Enclave (SE) | Bengaluru | 18 villas | Basic |

Each society has admins (e.g. Neha Kapoor, Secretary, and Vikas Jain, Treasurer, at GV), a guard and several residents with app access. To switch to someone else in the same society, open the user menu (top right).

## 2. The data flow

Each layer is built from the one above it. Nothing is entered twice.

`
FLOW.forEach((l, i) => {
  g += `### ${i + 1}. ${l.title} · *${R(l.who)}*\n\n${l.note}\n\n${l.items.map((x) => `- ${x}`).join('\n')}\n\n`
  if (i < FLOW.length - 1) g += '⬇\n\n'
})
g += `### Example: one bill, end to end

1. **Masters:** unit B-203 is a 3BHK of 1,580 sq.ft. Charge heads: Maintenance ₹3.5/sq.ft, Sinking Fund ₹500, Parking ₹300/slot.
2. **People:** Rohan Mehta (owner) lives in B-203 and has a parking slot.
3. **Billing:** the admin generates the cycle. Invoice = 1,580 × 3.5 + 500 + 300 = ₹6,330.
4. **Payment:** Rohan pays ₹3,000 by UPI. The invoice becomes *Partial* with ₹3,330 due.
5. **Outputs:** the B-203 ledger, dashboard collection %, defaulter risk score and activity log all update automatically.

## 3. Master tables

| Table | Holds | Feeds into | Where |
|---|---|---|---|
${MASTER_TABLES.map((r) => `| ${r.map(esc).join(' | ')} |`).join('\n')}

**Delete protection:** a master record can't be deleted while other data depends on it. Examples: a unit type used by units, a block with occupied units, a category with open tickets, a staff member who is a default assignee. The error message says what to fix.

## 4. Who does what

| Action | ${Object.values(ROLES).map((r) => r.label).join(' | ')} |
|---|${Object.keys(ROLES).map(() => ':---:').join('|')}|
${MATRIX.map(([a, who]) => `| ${a} | ${Object.keys(ROLES).map((k) => (who.includes(k) ? '✅' : '')).join(' | ')} |`).join('\n')}

## 5. Scenarios (${SCENARIOS.length})

`
const areas = [...new Set(SCENARIOS.map((s) => s.area))]
let n = 0
for (const a of areas) {
  g += `### ${a}\n\n`
  for (const s of SCENARIOS.filter((x) => x.area === a)) {
    n++
    g += `#### ${n}. ${s.title}\n\n**Who:** ${s.actors.map(R).join(', ')} · **Where:** \`${s.link}\`\n\n${s.steps.map((x, i) => `${i + 1}. ${x}`).join('\n')}\n\n> **Result:** ${s.result}\n\n`
  }
}
g += `## 6. Business rules at a glance

| Rule | Where it's enforced |
|---|---|
| One invoice per occupied unit per month; the same month can't be billed twice | \`POST /api/invoices/generate\` |
| Invoice lines come only from active charge heads; later changes affect future bills only | Bill generation |
| Part payments allowed; you can't pay more than the balance | \`POST /api/invoices/:id/pay\` |
| Late fee = % × months overdue, after the grace days | \`POST /api/invoices/apply-late-fees\` |
| Only unpaid invoices with no payments can be cancelled | \`POST /api/invoices/:id/cancel\` |
| Expenses above the approval limit need a different admin to approve (maker–checker) | \`POST /api/expenses/:id/approve\` |
| Expense category must exist in Masters | \`POST /api/expenses\` |
| Tenants need a lease end date | \`POST /api/residents\` |
| Move-out is blocked while the unit owes money, unless forced (dues stay on the unit) | \`DELETE /api/residents/:id\` |
| Visitors can't be logged for vacant or unknown units | \`POST /api/visitors\` |
| Gate-pass codes are one-time and expire after 24 h | \`POST /api/visitors/verify-code\` |
| Ticket SLA comes from the category; urgent tickets get at most 4 h | \`POST /api/tickets\` |
| Residents can only rate, close or reopen their own tickets | \`PATCH /api/tickets/:id\` |
| Bookings: no clashes, no past dates, blocked for units with 2+ unpaid bills | \`POST /api/bookings\` |
| One vote per person; staff can't vote | \`POST /api/polls/:id/vote\` |
| Suspended societies can't log in | Every request |
`
writeFileSync(new URL('docs/USER_GUIDE.md', root), g)
console.log(`API.md: ${routes.length} endpoints · USER_GUIDE.md: ${SCENARIOS.length} scenarios`)
