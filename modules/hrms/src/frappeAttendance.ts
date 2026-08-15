// Frappe cclms client for the HRMS module.
// Routes to Frappe via the Vercel rewrite /api/frappe/* -> btm.digihoopoe.com
const BASE = '/api/frappe';

function getCookie(name: string): string {
  const key = `${name}=`;
  const parts = document.cookie.split(';').map((v) => v.trim());
  const m = parts.find((p) => p.startsWith(key));
  return m ? decodeURIComponent(m.slice(key.length)) : '';
}

async function call<T = any>(method: string, args?: Record<string, unknown>, mutation = true): Promise<T> {
  const url = `${BASE}/method/${method}`;
  if (mutation) {
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(getCookie('X-Frappe-CSRF-Token') ? { 'X-Frappe-CSRF-Token': getCookie('X-Frappe-CSRF-Token') } : {}),
      },
      body: JSON.stringify(args || {}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.exc) {
      const raw = data._server_messages;
      let msg = data.message || data.exception || 'Request failed';
      try { if (raw) msg = JSON.parse(raw)[0]?.message || msg; } catch {}
      throw new Error(msg);
    }
    return data.message ?? data;
  }
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(args || {})) if (v !== undefined && v !== null && v !== '') params.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  params.set('_t', Date.now().toString());
  const res = await fetch(`${url}?${params.toString()}`, { credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.exc) throw new Error(data.message || data.exception || 'Request failed');
  return data.message ?? data;
}

// ---- HRMS session / identity -------------------------------------------
export async function loginFrappe(usr: string, pwd: string) {
  await call('login', { usr, pwd });
  return call('cclms.api.auth.whoami', {}, false);
}

export async function currentUser() {
  return call('cclms.api.auth.whoami', {}, false);
}

// ---- Employee / Attendance (Frappe HRMS + smart_attendance) -------------
export async function fetchEmployees() {
  const rows = await call<any[]>(
    'frappe.client.get_list',
    { doctype: 'Employee', fields: ['name', 'employee_name', 'status', 'department', 'branch', 'user_id'], filters: [['status', '=', 'Active']], order_by: 'employee_name asc', limit_page_length: 500 },
    false,
  );
  return rows.map((e) => ({
    id: e.name,
    empId: e.name,
    name: e.employee_name,
    fullName: e.employee_name,
    department: e.department,
    branch: e.branch,
    user_id: e.user_id,
    status: e.status,
  }));
}

export async function fetchAttendance(from_date?: string, to_date?: string) {
  const rows = await call<any[]>(
    'frappe.client.get_list',
    {
      doctype: 'Employee Checkin',
      fields: ['name', 'employee', 'employee_name', 'time', 'log_type', 'shift', 'attendance'],
      filters: [],
      order_by: 'time desc',
      limit_page_length: 500,
    },
    false,
  );
  return rows.map((r) => ({
    id: r.name,
    empId: r.employee,
    employeeName: r.employee_name,
    date: r.time?.slice(0, 10),
    time: r.time,
    log_type: r.log_type,
    status: r.log_type === 'IN' ? 'Present' : 'Present',
    shift: r.shift,
  }));
}

export async function createAttendance(data: any) {
  // Check-in: insert Employee Checkin (IN)
  return call('frappe.client.insert', {
    doc: {
      doctype: 'Employee Checkin',
      employee: data.empId || data.employee,
      time: data.time || new Date().toISOString().slice(0, 19).replace('T', ' '),
      log_type: 'IN',
      device_id: data.device_id || 'web',
      skip_auto_attendance: 1,
    },
  });
}

export async function checkOutAttendance(data: any) {
  return call('frappe.client.insert', {
    doc: {
      doctype: 'Employee Checkin',
      employee: data.empId || data.employee,
      time: data.time || new Date().toISOString().slice(0, 19).replace('T', ' '),
      log_type: 'OUT',
      device_id: data.device_id || 'web',
      skip_auto_attendance: 1,
    },
  });
}

export async function createManualAttendance(data: any) {
  return call('frappe.client.insert', {
    doc: {
      doctype: 'Employee Checkin',
      employee: data.empId || data.employee,
      time: data.date ? `${data.date} 09:00:00` : new Date().toISOString().slice(0, 19).replace('T', ' '),
      log_type: data.status === 'Absent' ? 'IN' : data.log_type || 'IN',
      skip_auto_attendance: 1,
    },
  });
}

// ---- Face attendance (smart_attendance) ---------------------------------
export async function enrollFace(employee: string, imageBase64: string) {
  return call('smart_attendance.api.enroll_face', { employee, image_base64: imageBase64 });
}

export async function verifyFace(imageBase64: string, deviceId?: string, deviceSecret?: string) {
  // Guest-capable endpoint for kiosk/devices; also usable from web with creds.
  return call('smart_attendance.api.verify_face', {
    device_id: deviceId || '',
    device_secret: deviceSecret || '',
    image_base64: imageBase64,
  });
}
