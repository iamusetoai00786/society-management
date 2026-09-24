# SocietyOS: Society Management App

A platform for residential societies covering billing and payments, accounting, visitor and gate management, complaints, communication, amenity booking and documents, with built-in AI features.

## Quick start

```bash
cd web
npm install
npm run dev        # http://localhost:5173
```

Choose a demo role on the login screen: **Society Admin**, **Resident (B-203)** or **Security Guard**. You can switch roles at any time from the user menu.

No backend is needed. All data comes from an in-browser mock REST API, is saved in `localStorage`, and can be reset under **Settings → Reset demo data**.

## Features

| Area | What's included |
|---|---|
| Dashboard | Role-specific: admin KPIs and charts, resident dues and gate approvals, guard gate console |
| Residents & Units | Search and filter residents, add or remove them, and view an interactive block/floor unit map |
| Billing | Generate bill cycles, pay by UPI/card/net banking (simulated), record offline payments, receipts, reminders |
| Accounting | Income vs expense charts, category breakdown, expense approval workflow, CSV export |
| Visitors & Gate | Guard console (guest/delivery/cab/service), resident approve/deny, OTP gate passes, daily-help in/out |
| Helpdesk | Kanban and list views, AI triage, comments, AI-suggested replies, resident ratings |
| Notices | AI notice writer (tone, streaming draft, Hindi preview), audience targeting, pinning |
| Polls | One vote per member, live results |
| Amenities | Slot availability by date, clash prevention, approval for halls and guest room |
| Documents, Staff, Parking, SOS | Access-controlled documents, attendance, slot map with EV chargers, emergency alerts |
| API Explorer | Try every endpoint live, with request bodies and a copyable `curl` command |

### AI features
- **AI Assistant** (Ctrl/⌘ + J): chat about dues, defaulters, spend, complaints, visitors and bookings. Answers stream in word by word, include buttons that take you to the relevant page, and accept voice input (Web Speech API).
- **Ticket triage:** assigns category, priority, sentiment, common vs personal area and staff member, and suggests a reply.
- **Notice writer:** turns a one-line prompt into a full notice.
- **Defaulter risk prediction:** a 0–100 risk score per unit, with a suggested follow-up.
- **Anomaly insights:** flags spending spikes, low collection, complaint hotspots, unassigned urgent tickets and pending approvals.
- **Command palette** (Ctrl/⌘ + K): jump to any page or resident, or send a question to the AI.

The AI features run on a built-in rule-based engine (`web/src/api/ai.js`) that reads the live demo data. To use a real LLM, implement the `/api/ai/*` endpoints on a backend.

## Tech stack
React 19 · Vite 8 · React Router 7 · Tailwind CSS 4 · Recharts 3 · lucide-react. Includes dark mode, a mobile-first layout, lazy-loaded pages, and loading placeholders while data loads.

## Project layout
```
docs/BRD.md                  Business Requirements Document
docs/API.md                  REST endpoint reference (66 endpoints)
web/src/api/db.js            Seed data + localStorage persistence
web/src/api/mockServer.js    Mock REST routes (the "dummy API")
web/src/api/ai.js            Mock AI engine
web/src/api/client.js        API client (mock, or real backend via VITE_API_URL)
web/src/components/          Layout, AI assistant, UI kit
web/src/pages/               One file per module
```

## Connecting a real backend
Implement the routes in [docs/API.md](docs/API.md), then run:

```bash
VITE_API_URL=https://api.example.com npm run dev
```

## Documentation
- [Business Requirements Document (BRD)](docs/BRD.md)
- [API reference](docs/API.md)
