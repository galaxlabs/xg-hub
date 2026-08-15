# smart_attendance Fix — missing hook target

**Problem**: `smart_attendance` hooks.py registered `after_insert` on Employee Checkin →
`smart_attendance.api.auto_attendance.create_realtime_attendance`, but that function did not
exist (and `api` was a single module, not a package). Every Employee Checkin insert failed with
`No module named 'smart_attendance.api.auto_attendance'`.

**Fix** (deployed to `/home/fg/gb/apps/smart_attendance/smart_attendance/`):
- Converted `api.py` → package `api/` (`api/__init__.py` holds enroll_face / verify_face / helpers).
- Added `api/auto_attendance.py` with `create_realtime_attendance(doc, method)`:
  - publishes realtime `employee_checkin` event
  - mirrors the checkin into a `Face Attendance` record (Present / Manual) when an employee is set
  - never raises (logs on failure)

**Verified**: Employee Checkin insert succeeds (EMP-CKIN-08-2026-000001).
