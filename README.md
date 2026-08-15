# Xperts Hub — Consolidated CRM + HRMS

One repo combining three Frappe-wired frontends, all backed by the cclms Frappe site
(`btm.digihoopoe.com`). Use this to test which modules you want to keep/deploy.

**Read first**: [`VISION_AND_ROADMAP.md`](VISION_AND_ROADMAP.md) — the SaaS "Digital Services OS" vision & future plan.
**Ideas**: [`IDEAS.md`](IDEAS.md) — brainstorming (hiring, LinkedIn, WhatsApp CV, social hub, billing).

## Modules

| Module | Source repo | Purpose | Backend |
|---|---|---|---|
| `crm-analytics` | `galaxlabs/xg-system` | Analytics/CRM dashboard (Overview, Pipeline, Leads, Agents, Signs, Financials, Attendance, Payroll, Projects) | cclms `page_reporting`, `signs_dashboard`, `reports`, `frappe.client` |
| `sales-portal` | `xperts-crm/frontend` (nabiha1511/CRM) | Sales-agent CRM UI (LeadTracker pipeline, LeadsFollowUp, AgentFollowUp, ChatCalls, Meetings, Calendar) | cclms `follow_up`, `ATM Leads` CRUD |
| `hrms` | `nabiha1511/HR-Management-System-Project` (backend-server frontend) | HRMS (Attendance, Payroll, Leave, Tasks, CVScanner, Payslip) | cclms `smart_attendance` (face), HRMS Employee/Checkin |

## How it connects to Frappe

- Each module calls `frappe.client` / `cclms.api.*` / `smart_attendance.api.*` whitelisted methods.
- On Vercel: a serverless proxy rewrites `/api/method/*` → `https://btm.digihoopoe.com/api/method/*`
  (same pattern as `crm-analytics/api/proxy.js` and the existing `xperts-portal` vercel.json).
- Auth: Frappe session cookie (`/api/method/login`). Roles gate the UI.

## Status

- [x] Sources copied to `modules/`
- [x] All three modules build (vite build verified)
- [x] HRMS attendance → Frappe `smart_attendance` (`hrms/src/frappeAttendance.ts`: fetchEmployees, fetchAttendance, createAttendance, checkOutAttendance, createManualAttendance, enrollFace, verifyFace)
- [x] Shared Vercel `/api/frappe/*` → `btm.digihoopoe.com` proxy per module
- [x] cclms `crm_portal.get_current_sales_agent` endpoint (sales-agent identity for CRM Portal)
- [ ] Deploy each module to Vercel and test

## Deploying a module

1. `cd modules/<module>`
2. `vercel` (Vercel CLI, logged in as galaxlabs) → deploy to a project (e.g. `xg-system`, or new `sales-portal` / `hrms` projects)
3. The `vercel.json` rewrites `/api/frappe/*` (and `/api/method/*` for crm-analytics) to the Frappe site, so no backend code is needed on Vercel.
4. Login uses the Frappe session cookie; roles gate the UI.

## HRMS face attendance

- `enroll_face(employee, image_base64)` — Attendance Manager enrolls a face (saves `Employee Face` encoding).
- `verify_face(device_id, device_secret, image_base64)` — device/kiosk verifies; writes `Face Attendance` log (Present / Low Confidence / Unmatched).
- The web Attendance page check-in/out writes `Employee Checkin` (IN/OUT) via `frappe.client.insert`.
