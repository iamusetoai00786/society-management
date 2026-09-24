# SocietyOS: Society Management Platform

A multi-society (SaaS) platform for residential societies. The platform owner onboards societies. Each society's committee sets up its **master tables**, then residents, guards and staff work on the same connected data: billing, accounting, gate, helpdesk, notices, bookings and AI insights.

## Quick start

```bash
cd web
npm install
npm run dev        # http://localhost:5173
```

Sign in with two clicks: choose **Platform owner** or one of the 3 sample societies, then choose a person (admin, guard or resident). To switch to someone else in the same society, use the user menu (top right).

No backend is needed. A mock REST API runs in the browser and saves to `localStorage`. **Settings → Reset demo data** restores the samples.

## How the data flows

```
Platform owner ─ onboards ─▶ Society
                              │
Master tables  (set up once)  ▼
  Blocks ─▶ Units ◀─ Unit types           Charge heads ─┐
  Staff ─▶ guard logins, ticket assignees               │
  Complaint categories (SLA, owner)   Expense categories (budget)
  Amenities   Vendors                                   │
                              │                         │
People                        ▼                         │
  Residents (owner/tenant) live in Units, app access ─▶ login
  Parking slots allotted to Units ──────────────────────┤
                              │                         │
Daily transactions            ▼                         ▼
  Invoices (lines from charge heads) ─▶ Payments (full/part) ─▶ Unit ledger
  Expenses ─▶ maker–checker approval      Visitors ─▶ resident approval / OTP pass
  Tickets ─▶ AI triage ─▶ staff ─▶ SLA ─▶ rating   Bookings · Notices · Polls · SOS
                              │
Outputs                       ▼
  Dashboards · Reports · AI Insights · Activity log (who did what)
```

Click any unit code (e.g. `B-203`) anywhere in the app to open its **Unit 360°** view: residents, parking, next bill preview, full ledger with an AI explanation, visitors and tickets.

## Documentation

- **[User guide](docs/USER_GUIDE.md):** data flow, master tables, who does what, **35 step-by-step scenarios** and every business rule. The same content is in the app under **How it works**.
- **[API reference](docs/API.md):** 88 endpoints, multi-tenant conventions.
- **[Business Requirements (BRD)](docs/BRD.md)**

Regenerate both docs after changing routes or scenarios: `npm run docs` (in `web/`).

## Roles

| Role | Can do |
|---|---|
| Platform owner | Onboard societies (5-step wizard with an AI structure builder), plans, suspend/activate, open any society |
| Committee admin | Master tables, residents, billing, accounting, approvals, helpdesk, notices, settings |
| Security guard | Gate console, OTP passes, daily help, SOS, staff attendance |
| Resident | Pay dues (full/part), approve visitors, gate passes, complaints, bookings, polls |

## AI features

- **Assistant** (Ctrl/⌘ + J): answers from live data, streams replies word by word, accepts voice input, and gives platform-level answers for the owner.
- **Onboarding structure builder:** turns "3 towers A, B, C with 12 floors and 4 flats per floor" into blocks, units and unit types.
- **Ticket triage:** assigns category, priority, sentiment and SLA, and routes to the owner set in the complaint-category master.
- **Ledger explainer:** plain-language summary of a unit's dues, with a suggested next step.
- **Insights:** flags spend spikes, budget overruns, SLA breaches, low collection, expiring vendor contracts and ending tenant leases.
- **Defaulter risk** scoring, **notice writer** (tone + translation), and a **command palette** (Ctrl/⌘ + K).

The AI runs on a built-in rule-based engine (`web/src/api/ai.js`) that reads the live data. To use a real LLM, implement the `/api/ai/*` endpoints on a backend.

## Tech stack

React 19 · Vite 8 · React Router 7 · Tailwind CSS 4 · Recharts 3 · lucide-react. Includes dark mode, a responsive full-width layout, and paginated tables.

## Project layout

```
docs/                        BRD, user guide, API reference
web/src/api/db.js            Data model, 3 seeded societies, tenant scoping
web/src/api/mockServer.js    Mock REST API (88 routes), business rules, activity log
web/src/api/ai.js            Mock AI engine
web/src/api/client.js        API client (mock, or real backend via VITE_API_URL)
web/src/guide.js             Scenarios & data-flow content (app + docs)
web/src/components/          Layout, AI assistant, Unit 360° drawer, UI kit
web/src/pages/               One file per module
web/scripts/gen-docs.mjs     Builds docs/API.md and docs/USER_GUIDE.md
```

## Connecting a real backend

Implement the routes in [docs/API.md](docs/API.md), including the `x-society-id` header for the platform owner, then run:

```bash
VITE_API_URL=https://api.example.com npm run dev
```
