# Xperts Hub — SaaS Vision, Scope & Future Plan

> **Working title**: Xperts Hub (or "Digital Services OS")
> **Status**: Vision / Future Plan — NOT yet implemented
> **Date**: 2026-08-15
> **Reference**: app.meradarzi.pk (Next.js + Prisma SaaS pattern), xg-system, xperts-crm, HRMS

---

## 1. The Problem We Solve

Small & medium software houses, digital agencies, and digital-services companies don't need a
heavy ERP. They need a **light, focused operational OS** covering the whole business loop:

- **CRM** — leads, deals, follow-ups, clients, agreements (we already have this in cclms)
- **HRMS** — few employees (not a huge org): hire, payroll, attendance, leave, exits
- **Project Management** — client projects, tasks, timesheets, milestones
- **Hiring/Careers** — career page that posts directly into the system as Job Applications
- **Activity/Productivity** — Windows Tracker (browser + desktop) → real productive hours per employee/project
- **AI + Automation** — auto follow-ups, auto-dial, scraping, billing, notifications
- **Billing/Accounting** — digital-services UOM billing (hourly, sprint, project, retainer)

The key idea: **specific to digital services** with **digital UOM** (units of measure = hours,
sprints, deliverables, retainers), **not** a general-purpose ERP with unwanted modules.

---

## 2. Vision

> A SaaS "Digital Services OS" where each small/medium software house gets CRM + HRMS +
> project management + productivity + hiring + billing in ONE clean app — lightweight,
> industry-specific, AI-automated, and measurable.

- **Target industry**: software houses, digital agencies, blogging teams, IT services, freelancing studios
- **Pricing model**: per-seat SaaS (tenant = company)
- **Stack direction**: Frappe (MariaDB/MySQL) backend, modern React frontend (per meradarzi's Next.js+Prisma UX, but we standardize on Frappe to avoid a separate Node backend)
- **Differentiator vs big ERP**: no unwanted modules; every module is small and task-focused

---

## 3. High-Level Architecture Decision

| Concern | Decision |
|---|---|
| Backend | **Frappe cclms** (already running on `btm.digihoopoe.com`, MariaDB) |
| DB | MariaDB/MySQL (Frappe native) — same logic as meradarzi's Prisma/Postgres but in Frappe |
| Frontend | React (consolidated from xg-system / sales-portal / hrms modules) |
| Desktop/Browser tracking | Windows Tracker agent + browser extension (already built) |
| AI | Gemini/Claude (already wired for drafting/scraping) |
| Messaging | Telegram, Slack, WhatsApp, LinkedIn connectors |
| Multi-tenant | Frappe multi-site (one site per tenant) OR single-site with company scoping |

---

## 4. Module Map (Target)

### 4.1 CRM (core — exists)
- Leads (ATM Leads) with workflow: Pending → Approved → Agreement → Signed → Installed
- Follow-up Schedule + auto-assign + auto-dial (exists)
- Deals / Opportunities, Clients / Companies
- Agreements via eSign (exists — esign_app)

### 4.2 HRMS — "small corporate" (rebuild, not big ERP)
We will **remove `hrms` and `smart_attendance` as big Frappe apps** and build **our own small
modules** instead:

- **Employee Lite**: few employees — id, name, role, branch, contact, joins/leaves
- **Hiring/Careers**: career page → Job Application (with CV file + message) lands directly in Frappe
- **Attendance Lite** (`smart_attendance` replacement): check-in/out via face (enroll/verify),
  web, and tracker agent; simple daily log (9h active-time model already built)
- **Payroll Lite**: salary + invoices, not full ERP payroll
- **Leave Lite**: apply/approve, no complex leave policies
- **Exit/Offboarding**: simple

### 4.3 Project Management
- Client Projects, Tasks, Milestones, Timesheets
- Billable hours per project/client (feeds billing)
- Project health (budget used, hours, velocity)

### 4.4 Productivity & Tracking (exists, to extend)
- Windows Tracker (desktop agent) + browser extension
- Per-employee: active minutes, idle, app/domain time, productivity rating
- Per-project: time on tasks/apps → **automated timesheet**
- Manager dashboard by department (exists in crm-analytics)

### 4.5 Hiring & Careers (new)
- **Career page section** served by Frappe (www page) — posts jobs, collects applications
- **Job Application doctype**: candidate, email, phone, CV (file), message, status, source
- **LinkedIn connector**: post jobs / fetch candidates, "Easy Apply" style
- **WhatsApp connector**: applicant sends CV via WhatsApp → stored as Job Application
- **Social Media Hub**: LinkedIn + WhatsApp + email as one inbox/outbox for hiring & marketing

### 4.6 Billing / Accounting Lite ("digital UOM")
- Billing units: **hourly, sprint/retainer, project-fixed, deliverable**
- Auto-bill from tracked hours + project milestones
- Simple invoices, payment tracking, ACH/Wire notes
- Not general accounting — just what a services company needs

### 4.7 AI & Automation
- Auto follow-up + auto-dial (exists)
- Scraping agent → leads (Zara-style)
- AI drafting (Gemini already wired), email/notification templates
- Telegram/Slack/WhatsApp notify (vision — notify() helper)

---

## 5. Data Migration & Model Mapping

Goal: **recreate this app cleanly** and migrate existing data into the new structure with
explicit **data + model mapping**, keeping an audit trail.

### 5.1 Sources → Target
| Source | Target (new clean module) | Notes |
|---|---|---|
| `ATM Leads` (cclms) | `Lead` (CRM module) | keep workflow, dates, reject reasons |
| `Follow-up Schedule` | `Followup` (CRM) | keep assignment + dial result |
| `Operator Companies` | `Company` (CRM multi-tenant) | per-operator config |
| `Sales Agent` | `Employee` (HRMS Lite) | map agent → employee, branch → department |
| `Employee Activity Log` / `Activity Entry` | `Timesheet` / `Productivity` | 9h active-time model carried over |
| `Call Detail` | `Call` (CRM/Productivity) | talk time, outcome, RingCentral id |
| `Employee Checkin` | `Attendance` (Lite) | face + web + tracker |
| `DocumentList` (esign) | `Agreement` | link to Lead/Deal |
| `Signs` | `Deal` / `Contract` | commission-ready |

### 5.2 Migration method
1. Build the target doctypes (new clean app).
2. Write a **one-time mapping script** (bench) that copies source → target field-by-field, with a
   `source_ref` link + `migration_log` for audit.
3. Dry-run on a copy site → verify counts → switch.
4. Keep the old site read-only during cutover.

---

## 6. What We Remove / Keep

### Remove (as big installed Frappe apps)
- **hrms** (Frappe HRMS) — too big, replaced by HRMS Lite
- **smart_attendance** (big app) — replaced by our own Attendance Lite module
- **erpnext** — if not needed (keep only what the services OS uses)
- Node/Prisma/Express backends (xg backend, HRMS backend) — all logic moves to Frappe

### Keep
- **cclms** (Frappe app — becomes the platform, extended with new modules)
- **esign_app** (agreements)
- **Windows Tracker** (desktop + browser agent)
- React frontend consolidated from the three modules

---

## 7. SaaS / Multi-Tenancy

Two options (decide later):
- **A. Frappe multi-site**: one site per tenant company. Isolated, clean, scales to many small firms. (Recommended)
- **B. Single-site + Company scoping**: cheaper to host, but needs careful permission scoping.

Pricing: per-seat monthly (CRM + HRMS Lite + Projects + Productivity + Hiring). Billing via
Stripe/PayPal later.

---

## 8. AI & Automation (phase 2)

- **Auto follow-up**: schedule → auto-assign → auto-dial → outcome → lead/next step (exists)
- **Scraping agent**: browser extension → validate → create Lead / Competitor Kiosk (exists partially)
- **AI drafting**: reply to client/email, job description, CV screening, invoice notes
- **Auto-billing**: tracked hours + milestones → generate invoice → notify client
- **Notifications**: Telegram / Slack / WhatsApp on lead changes, follow-up due, invoice, job application

---

## 9. Roadmap

### Phase 0 — Plan & Decisions (this doc)
- Confirm SaaS/multi-tenant model, module boundaries, remove hrms/smart_attendance/erpnext

### Phase 1 — Foundation (next)
- New clean Frappe app `xperts_hub` (or extend cclms) with the target doctypes
- Data migration scripts (ATM Leads, Follow-ups, Agents, Activity, Calls)
- HRMS Lite (Employee, Hire, Leave, Payroll Lite, Exit)
- Attendance Lite (face + web + tracker)

### Phase 2 — Digital Services Core
- Project Management + Timesheets (auto from tracker)
- Billing Lite (digital UOM) + auto-billing
- Careers page + Job Application

### Phase 3 — Automation & Connectors
- LinkedIn (post/fetch jobs, candidates)
- WhatsApp (CV intake, candidate chat)
- Telegram/Slack notifications
- AI screening + drafting

### Phase 4 — SaaS Launch
- Multi-tenant onboarding, per-seat billing, usage dashboards

---

## 10. Guardrails / Non-Goals

- **Not** a general ERP (no manufacturing, full GL, full payroll laws) — stay services-focused
- **Not** heavy HRMS (no unions, complex leave accrual) — small teams only
- **No** separate Node/Prisma backend — everything on Frappe (MariaDB/MySQL)
- Keep modules small and optional per tenant
- Privacy: employee tracking must be consented and policy-driven
