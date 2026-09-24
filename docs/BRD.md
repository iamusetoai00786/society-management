# Business Requirements Document (BRD)
## Society Management Application

| Field | Value |
|---|---|
| Document version | 1.0 (Draft) |
| Date | 2026-09-24 |
| Status | For review |
| Product | Society Management App (web + mobile) |

---

## 1. Executive Summary

Residential societies (apartment complexes, gated communities, housing co-operatives) still run most of their operations on paper registers, spreadsheets, WhatsApp groups and cash receipts. This causes missed maintenance payments, unaccountable spending, weak gate security, slow complaint resolution and poor communication between the Managing Committee and residents.

The **Society Management App** is a single digital platform for residents, the Managing Committee, security staff and facility staff. It covers billing and payments, accounting, visitor and gate management, complaints, communication, amenity booking and document management, delivered through a responsive web portal (admin-first) and Android/iOS apps (resident- and guard-first).

---

## 2. Business Objectives

| # | Objective | Measure of success (12 months after launch) |
|---|---|---|
| BO-1 | Improve maintenance collection | On-time collection ≥ 90% (baseline typically 60–75%) |
| BO-2 | Cut the committee's admin workload | ≥ 50% less time spent on billing, receipts and reconciliation |
| BO-3 | Make society finances transparent | 100% of income/expenses recorded digitally; monthly statements published to residents |
| BO-4 | Strengthen gate security | 100% of visitors logged; resident pre-approval for ≥ 70% of expected visitors |
| BO-5 | Resolve complaints faster | Average resolution time ≤ 72 hours; tracked SLA per category |
| BO-6 | Increase resident engagement | ≥ 70% of households active monthly on the app |
| BO-7 | Build a scalable SaaS business | Onboard 100+ societies in year 1, with a multi-tenant architecture |

---

## 3. Scope

### 3.1 In Scope (MVP + Phase 2)
- Society onboarding, including the structure of blocks/towers, floors and units
- Resident, owner and tenant management
- Maintenance billing, online payments, receipts and dues tracking
- Basic accounting (income, expenses, vendor payments, reports)
- Visitor, delivery, cab and daily-help gate management
- Complaint/helpdesk ticketing
- Notices, announcements, polls and events
- Amenity/facility booking
- Document repository (bye-laws, minutes, NOCs)
- Staff and vendor management
- Parking management
- Emergency/SOS alerts
- Reports and dashboards

### 3.2 Out of Scope (for this release)
- Full statutory accounting and tax filing (the app exports data to external accounting tools instead)
- IoT hardware (boom barriers, smart locks, CCTV analytics). Only integration hooks are planned
- Marketplace for third-party home services (future phase)
- Utility metering hardware (only manual or imported readings are supported)

---

## 4. Stakeholders & User Roles

| Role | Description | Key needs |
|---|---|---|
| **Super Admin** (platform) | SaaS operator | Onboard societies, manage subscriptions, support, platform health |
| **Society Admin / Secretary** | Runs day-to-day society operations | Configure society, residents, billing, notices, reports |
| **Treasurer** | Handles finances | Billing, collections, expenses, reconciliation, financial reports |
| **Committee Member** | Elected member | View reports, approve expenses, handle complaints |
| **Owner** | Owns a unit | Pay dues, view finances, raise complaints, vote, manage tenants |
| **Tenant** | Rents a unit | Visitor approvals, complaints, amenity booking, notices |
| **Family Member** | Lives with an owner/tenant | Visitor approvals, notices (limited rights) |
| **Security Guard** | Gate staff | Fast visitor entry/exit, approvals, daily-help attendance, SOS |
| **Facility Manager / Staff** | Maintenance, housekeeping | Receive and resolve assigned tickets |
| **Vendor** | External service provider | Work orders, invoices (limited portal, Phase 2) |

---

## 5. Functional Requirements

Priority key: **M** = Must have (MVP), **S** = Should have (Phase 2), **C** = Could have (Phase 3)

### 5.1 Society Onboarding & Configuration
| ID | Requirement | Priority |
|---|---|---|
| FR-ON-01 | Super Admin can create a society with name, address, registration number, logo and contact | M |
| FR-ON-02 | Admin can define the structure of blocks/towers, floors and units, with unit area (sq. ft.) and type | M |
| FR-ON-03 | Bulk import of units and residents via Excel/CSV template | M |
| FR-ON-04 | Configure committee roles and permissions (role-based access control) | M |
| FR-ON-05 | Configure society settings: billing cycle, late fee rules, gate rules, amenity rules | M |
| FR-ON-06 | Support multiple societies per admin account (property managers) | S |

### 5.2 Resident Management
| ID | Requirement | Priority |
|---|---|---|
| FR-RM-01 | Residents sign up with mobile OTP and request to join a unit; Admin approves | M |
| FR-RM-02 | Maintain owner, tenant and family-member profiles per unit | M |
| FR-RM-03 | Tenant lifecycle: move-in, lease period, police verification document, move-out | M |
| FR-RM-04 | Vehicle registration per unit (number, type, parking slot) | M |
| FR-RM-05 | Resident directory with privacy controls (opt-in phone visibility) | S |
| FR-RM-06 | Pet registration | C |

### 5.3 Billing & Payments
| ID | Requirement | Priority |
|---|---|---|
| FR-BP-01 | Define charge heads (maintenance, sinking fund, repair fund, water, parking, etc.) | M |
| FR-BP-02 | Calculation rules: flat rate, per sq. ft., per unit type, or custom | M |
| FR-BP-03 | Auto-generate periodic invoices (monthly/quarterly/annual) | M |
| FR-BP-04 | Late fees and interest applied automatically as configured | M |
| FR-BP-05 | Online payment via UPI, cards, net banking and wallets through a payment gateway | M |
| FR-BP-06 | Record offline payments (cash, cheque, NEFT) with a reference number | M |
| FR-BP-07 | Auto-generate digital receipts (PDF) sent by email/app | M |
| FR-BP-08 | Automated reminders for due and overdue bills (push, SMS, email, WhatsApp) | M |
| FR-BP-09 | Dues ledger per unit, with opening balances and advance payments | M |
| FR-BP-10 | One-off / ad-hoc bills (e.g. special repair levy) | S |
| FR-BP-11 | GST-compliant invoices, where applicable | S |
| FR-BP-12 | Auto-debit / recurring payment mandate | C |

### 5.4 Accounting & Finance
| ID | Requirement | Priority |
|---|---|---|
| FR-AC-01 | Record income and expenses with categories and attachments (bills) | M |
| FR-AC-02 | Expense approval workflow (maker → committee approval) with configurable thresholds | M |
| FR-AC-03 | Vendor payments tracking | M |
| FR-AC-04 | Bank reconciliation (import bank statement, match transactions) | S |
| FR-AC-05 | Reports: income vs expense, defaulters list, collection summary, cash book, balance sheet | M |
| FR-AC-06 | Publish monthly financial summary to residents | M |
| FR-AC-07 | Budget planning vs actual | S |
| FR-AC-08 | Export to Tally / Excel / accounting software | S |

### 5.5 Visitor & Gate Management
| ID | Requirement | Priority |
|---|---|---|
| FR-VG-01 | Guard app to log visitor name, phone, photo, purpose, unit and vehicle | M |
| FR-VG-02 | Real-time approval request to resident (push notification / call fallback): approve, deny or leave at gate | M |
| FR-VG-03 | Resident pre-approval of guests with OTP/QR code entry pass | M |
| FR-VG-04 | Delivery and cab entry with company selection and quick logging | M |
| FR-VG-05 | Daily help (maid, driver, cook) registration with attendance tracking and resident notifications | M |
| FR-VG-06 | Entry/exit timestamps and a searchable visitor log | M |
| FR-VG-07 | Blacklist / watchlist of visitors | S |
| FR-VG-08 | Offline mode for the guard app, syncing when the connection returns | M |
| FR-VG-09 | Frequent visitor passes (recurring guests) | S |
| FR-VG-10 | Integration hooks for boom barrier / RFID / ANPR | C |

### 5.6 Complaints & Helpdesk
| ID | Requirement | Priority |
|---|---|---|
| FR-HD-01 | Residents raise tickets with category, description, photos and priority | M |
| FR-HD-02 | Tickets auto-assigned to staff by category | M |
| FR-HD-03 | Status tracking: Open → Assigned → In Progress → Resolved → Closed / Reopened | M |
| FR-HD-04 | SLA per category, with escalation to a committee member on breach | S |
| FR-HD-05 | Resident rating/feedback on closure | S |
| FR-HD-06 | Personal vs common-area complaint types | M |

### 5.7 Communication & Engagement
| ID | Requirement | Priority |
|---|---|---|
| FR-CM-01 | Notices/announcements targeted to all residents, a block, owners only, etc. | M |
| FR-CM-02 | Push, email and SMS channels, with read receipts for notices | M |
| FR-CM-03 | Polls and surveys; formal voting (one vote per unit) for AGM resolutions | S |
| FR-CM-04 | Events calendar with RSVP | S |
| FR-CM-05 | Community discussion forum with moderation | C |
| FR-CM-06 | Meeting management: agenda, attendance, minutes (MoM) | S |

### 5.8 Amenity / Facility Booking
| ID | Requirement | Priority |
|---|---|---|
| FR-AB-01 | Configure amenities (clubhouse, gym, pool, hall, court) with slots, capacity and rules | M |
| FR-AB-02 | Residents book slots; clash prevention | M |
| FR-AB-03 | Paid bookings with online payment and deposit handling | S |
| FR-AB-04 | Booking approval by Admin (for halls, etc.) | S |
| FR-AB-05 | Block booking for defaulters (configurable) | S |

### 5.9 Staff & Vendor Management
| ID | Requirement | Priority |
|---|---|---|
| FR-SV-01 | Staff records: role, shift, contact, ID documents | M |
| FR-SV-02 | Staff attendance (guard app / QR check-in) | S |
| FR-SV-03 | Vendor directory with contracts, AMC renewal reminders | S |
| FR-SV-04 | Asset register (lifts, DG sets, pumps) with maintenance schedule | S |
| FR-SV-05 | Payroll export for society staff | C |

### 5.10 Parking Management
| ID | Requirement | Priority |
|---|---|---|
| FR-PK-01 | Parking slot inventory and allocation to units | S |
| FR-PK-02 | Visitor parking allocation at gate | S |
| FR-PK-03 | Report wrongly parked vehicle → notify owner | C |

### 5.11 Documents
| ID | Requirement | Priority |
|---|---|---|
| FR-DC-01 | Central repository: bye-laws, AGM minutes, circulars, audit reports | M |
| FR-DC-02 | Access control per document (all / committee / owners) | M |
| FR-DC-03 | Residents request NOC / certificates; Admin issues them digitally | S |

### 5.12 Safety & Emergency
| ID | Requirement | Priority |
|---|---|---|
| FR-SF-01 | SOS button in resident app alerting guards and committee with unit location | M |
| FR-SF-02 | Emergency contacts directory (hospital, fire, police, plumber, electrician) | M |
| FR-SF-03 | Guard patrol checkpoints (QR scan logging) | C |

### 5.13 Reports & Dashboards
| ID | Requirement | Priority |
|---|---|---|
| FR-RP-01 | Admin dashboard: collections, dues, open tickets, visitors today, bookings | M |
| FR-RP-02 | Resident dashboard: my dues, my tickets, notices, upcoming bookings | M |
| FR-RP-03 | Export any report to PDF/Excel | M |
| FR-RP-04 | Super Admin dashboard: societies, active users, subscription revenue | M |

### 5.14 Platform / SaaS Administration
| ID | Requirement | Priority |
|---|---|---|
| FR-SA-01 | Subscription plans (by unit count / feature tier), trial, invoicing of societies | M |
| FR-SA-02 | Tenant isolation, so one society's data is never visible to another | M |
| FR-SA-03 | Feature flags per plan | S |
| FR-SA-04 | Support ticketing and impersonation (audited) for Super Admin | S |

---

## 6. Key Business Processes

### 6.1 Maintenance Billing Cycle
1. Treasurer configures charge heads and calculation rules (one-time).
2. The system auto-generates invoices on the billing date and notifies residents.
3. Resident pays online, or the Admin records an offline payment.
4. The system issues a receipt and updates the unit ledger and society accounts.
5. Reminders go out before the due date and afterwards; late fee is applied after the grace period.
6. The defaulters report is generated and escalated to the committee.

### 6.2 Visitor Entry
1. A visitor arrives at the gate. The guard enters details, or scans a pre-approved QR/OTP.
2. If not pre-approved, the resident gets a real-time request and approves or denies it. If there is no response within N seconds, an automated call is placed.
3. On approval, entry is logged with a timestamp. On exit, the exit time is logged.
4. The visitor log is available to the resident and Admin.

### 6.3 Complaint Resolution
1. Resident raises a ticket with photo, and it is auto-assigned by category.
2. Staff updates status; the resident is notified at each step.
3. If the SLA is breached, it escalates to a committee member.
4. Resident confirms resolution and rates it. The ticket closes, or is reopened.

### 6.4 Expense Approval
1. Admin/Facility Manager records an expense with the bill attached.
2. If the amount exceeds the threshold, it is sent to the approving committee member(s).
3. Once approved, the payment is recorded and reflected in reports.

---

## 7. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | API p95 response < 500 ms; guard visitor-entry flow completes in < 30 seconds end-to-end; resident approval push delivered in < 5 s |
| **Scalability** | Multi-tenant; support 10,000 societies / 2 million users; horizontal scaling |
| **Availability** | 99.5% uptime (MVP), 99.9% target; guard app works offline |
| **Security** | TLS 1.2+ in transit, AES-256 at rest; OTP + optional MFA for admins; RBAC; OWASP Top 10 compliance; audit log of all financial and permission changes |
| **Privacy & Compliance** | Compliance with applicable data-protection law (e.g. India DPDP Act 2023 / GDPR, depending on market); consent capture; data retention policy; right to erasure; visitor data retained for a configurable period |
| **Payments** | PCI-DSS handled by the payment gateway (no card data stored); payment webhooks idempotent |
| **Usability** | Guard app usable by low-literacy users (large buttons, icons, regional languages); multilingual (English + regional languages); WCAG 2.1 AA for web |
| **Compatibility** | Android 9+, iOS 15+, latest two versions of major browsers |
| **Reliability** | Daily automated backups, 30-day retention; RPO ≤ 24h, RTO ≤ 4h |
| **Maintainability** | Modular architecture, CI/CD, automated tests (≥ 70% coverage on core modules) |
| **Observability** | Centralised logging, metrics, alerting, error tracking |

---

## 8. Proposed Solution Overview

### 8.1 Applications
| App | Users | Platform |
|---|---|---|
| Admin Web Portal | Super Admin, Society Admin, Treasurer, Committee | Web (responsive) |
| Resident App | Owners, Tenants, Family | Android, iOS (+ web) |
| Guard App | Security guards | Android (tablet/phone), offline-capable |
| Staff App (Phase 2) | Facility staff | Android |

### 8.2 Indicative Technology Stack (to be finalised in the technical design)
- **Frontend web:** React / Next.js
- **Mobile:** React Native or Flutter (single codebase for Resident and Guard apps)
- **Backend:** Node.js (NestJS) or Java/Spring Boot, REST + WebSockets for real-time approvals
- **Database:** PostgreSQL (multi-tenant with `society_id` scoping / row-level security); Redis for caching and queues
- **Storage:** S3-compatible object storage for photos and documents
- **Notifications:** FCM/APNs push, SMS gateway, email service, WhatsApp Business API
- **Payments:** Razorpay / Stripe / PayU (depending on region)
- **Hosting:** AWS / GCP / Azure with containerised deployment (Docker, Kubernetes or managed containers)

### 8.3 Core Data Entities
Society, Block, Unit, User, Role, Resident (Owner/Tenant/Family), Vehicle, ChargeHead, Invoice, Payment, Receipt, LedgerEntry, Expense, Vendor, Visitor, VisitLog, DailyHelp, Ticket, Notice, Poll, Vote, Amenity, Booking, Staff, Asset, Document, ParkingSlot, AuditLog, Subscription.

### 8.4 External Integrations
Payment gateway, SMS/OTP provider, email, push notifications, WhatsApp Business API, maps (optional), accounting export (Tally/Excel), IVR/automated calls for visitor approval fallback, hardware integration API (Phase 3).

---

## 9. Release Plan / Phasing

| Phase | Timeline (indicative) | Scope |
|---|---|---|
| **Phase 0: Discovery & Design** | Weeks 1–4 | Stakeholder interviews, finalise BRD → SRS, UX wireframes, architecture, tech stack |
| **Phase 1: MVP** | Weeks 5–20 | Onboarding, resident management, billing & payments, basic accounting, visitor management (guard + resident apps), complaints, notices, amenity booking, documents, SOS, dashboards, SaaS admin |
| **Pilot** | Weeks 21–24 | Launch with 3–5 pilot societies, collect feedback, fix issues |
| **Phase 2: Enhancements** | Months 7–9 | Bank reconciliation, budgets, polls/voting, meetings, events, staff attendance, vendors/assets, parking, SLA escalations, Tally export, GST |
| **Phase 3: Scale & Innovation** | Months 10–12+ | Hardware integrations (boom barrier/RFID/ANPR), marketplace, forum, analytics, AI assistants (e.g. auto-categorising complaints) |

---

## 10. Monetisation Model

- **Subscription (SaaS):** per unit per month, tiered as Basic / Standard / Premium by features
- **Free trial:** 30 days
- **Payment convenience fee:** optional, passed to the resident or absorbed by the society
- **Add-ons:** SMS/WhatsApp credits, hardware integration, premium support
- **Future:** marketplace commissions and advertising (opt-in, privacy-safe)

---

## 11. Assumptions

1. Societies have at least basic internet connectivity at the gate (the offline mode covers outages).
2. Guards have access to an Android device provided by the society or the agency.
3. The committee is willing to migrate historical dues (opening balances) during onboarding.
4. The payment gateway and SMS providers are available in the target market.
5. Residents have smartphones. Non-smartphone residents are served by SMS and IVR fallback.

## 12. Constraints

- Budget and timeline for MVP are fixed at about 5 months of build.
- Must comply with local data-protection and payment regulations.
- Societies' rules vary widely, so billing and gate rules must be configurable, not hard-coded.

## 13. Dependencies

- Payment gateway merchant onboarding (KYC) per society, or an aggregator model
- WhatsApp Business API approval
- App Store / Play Store approvals
- Pilot societies' commitment for UAT

---

## 14. Risks & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|
| Low adoption by residents or guards | High | Medium | Simple UX, regional languages, onboarding support, guard training |
| Resistance from committee to financial transparency | Medium | Medium | Configurable visibility; demonstrate time savings |
| Payment failures / reconciliation errors | High | Low | Idempotent webhooks, auto-reconciliation, daily settlement reports |
| Data breach / privacy complaint | High | Low | Encryption, RBAC, audits, pen-testing, DPDP/GDPR compliance |
| Poor gate connectivity | Medium | High | Offline-first guard app with sync |
| Competition from established players | Medium | High | Better UX, pricing, local-language focus, faster support |
| Scope creep | Medium | High | Strict MoSCoW prioritisation and change control |

---

## 15. Success Metrics / KPIs

- Number of onboarded societies and units
- Monthly active households (%)
- On-time maintenance collection rate (%)
- Digital payment share of total collections (%)
- Average complaint resolution time
- Average visitor approval time at the gate
- App store rating ≥ 4.3
- Churn rate of societies < 5% annually
- Net Promoter Score (NPS) ≥ 40

---

## 16. Acceptance Criteria (MVP)

1. A society can be fully onboarded (structure, residents imported) in under 1 day.
2. Invoices are auto-generated correctly for all configured charge rules, verified against sample data.
3. Online payment updates the ledger and issues a receipt within 1 minute.
4. A guard can log a visitor and receive the resident's approval in under 30 seconds (online).
5. The guard app works offline and syncs without data loss.
6. Complaint tickets follow the full lifecycle with notifications.
7. Role-based access is enforced: residents cannot see other units' financial data, and societies cannot see each other's data.
8. All MVP reports export correctly to PDF/Excel.
9. Security testing (VAPT) passes with no critical or high findings open.
10. Pilot societies sign off UAT.

---

## 17. Glossary

| Term | Meaning |
|---|---|
| AGM | Annual General Meeting |
| AMC | Annual Maintenance Contract |
| ANPR | Automatic Number Plate Recognition |
| MoM | Minutes of Meeting |
| NOC | No Objection Certificate |
| RBAC | Role-Based Access Control |
| Sinking Fund | Reserve fund for major future repairs |
| SLA | Service Level Agreement |
| UAT | User Acceptance Testing |
| VAPT | Vulnerability Assessment & Penetration Testing |

---

## 18. Next Steps

1. Review this BRD with stakeholders and capture feedback.
2. Sign off on scope and priorities (MoSCoW).
3. Produce the SRS / technical design and UX wireframes.
4. Finalise the tech stack, team and budget.
5. Start Phase 1 sprint planning.

## 19. Approval

| Name | Role | Signature | Date |
|---|---|---|---|
| | Product Owner | | |
| | Business Sponsor | | |
| | Technical Lead | | |
