const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) {
    // If running in development, use 127.0.0.1 (avoids localhost issues)
    if (import.meta.env.DEV) return 'http://127.0.0.1:5001/api';
    // Otherwise use relative path
    return '/api'; 
  }
  // If it's a relative path, use it directly
  if (envUrl.startsWith('/')) return envUrl;
  // Remove trailing slash if exists
  return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
};

export const BASE_URL = getBaseUrl();
export const API_BASE_URL = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

/** Site origin for static files (selfies). Works when VITE_API_URL=/api on VPS. */
export function getBackendUrl(): string {
  if (BASE_URL.startsWith('http')) {
    return BASE_URL.replace(/\/api\/?$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    if (BASE_URL.startsWith('/')) {
      return `${window.location.origin}${BASE_URL.replace(/\/$/, '')}`;
    }
    return window.location.origin;
  }
  return '';
}

export function getStaticFileUrl(filePath?: string | null): string {
  if (!filePath) return '';
  if (filePath.startsWith('http') || filePath.startsWith('data:')) return filePath;
  const backendUrl = getBackendUrl().replace(/\/$/, '');
  if (filePath.startsWith('/api/') || filePath.startsWith('/uploads/')) {
    return `${backendUrl}${filePath}`;
  }
  return `${backendUrl}/${filePath}`;
}

/** @deprecated use getBackendUrl() */
export const BACKEND_URL = getBackendUrl();

console.log("Backend Base URL:", getBackendUrl());
console.log("API Base URL:", API_BASE_URL);

const getHeaders = () => {
  const token = localStorage.getItem('token');
  const session = JSON.parse(localStorage.getItem('hrms_session') || '{}');
  const authToken = token || session.token;

  console.log('API Request Headers - Token:', authToken ? 'Present' : 'Missing');

  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${authToken}`,   // ✅ Get from localStorage.getItem('token') or session
    "ngrok-skip-browser-warning": "true"      // ✅ Skip ngrok warning page
  };
};

const handle401 = () => {
  localStorage.removeItem('hrms_session');
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login?expired=true';
  }
};

const request = async (url: string, options: RequestInit = {}) => {
  console.log(`Fetching: ${url}`, options.method || 'GET');
  const res = await fetch(url, options);
  
  if (res.status === 401 || res.status === 403) {
    const clone = res.clone();
    const errorData = await clone.json().catch(() => ({}));
    
    if (res.status === 401 || errorData.error === 'Invalid token') {
      handle401();
      throw new Error(errorData.error || 'Session expired. Please login again.');
    }
    // For other 403 errors (like "Admin access required"), we return the original response
    // so the component can handle it (e.g., show an error toast)
  }
  
  return res;
};

const readJsonSafely = async (res: Response) => {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  if (!text) return {};

  const trimmed = text.trimStart();
  if (trimmed.startsWith('<') || contentType.includes('text/html')) {
    let hint = `Server returned HTML instead of JSON (${res.status}). `;
    if (res.status === 413) {
      hint += 'Selfie/request too large — set nginx client_max_body_size 50M.';
    } else {
      hint += `Check nginx /api proxy → backend :${import.meta.env.VITE_API_PORT || '5001'} and deploy latest backend code.`;
    }
    throw new Error(hint);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid server response (${res.status}). API: ${API_BASE_URL}`);
  }
};

// --- AUTHENTICATION ---
export const loginAuth = async (email: string, password: string, deviceId?: string) => {
  const url = `${API_BASE_URL}/auth/login`;
  console.log("Attempting Login:", url);
  console.log("Payload:", { email, deviceId }); // Password removed for security
  
  try {
    const res = await fetch(url, { // loginAuth uses fetch directly because it shouldn't trigger handle401 on initial login failure
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'ngrok-skip-browser-warning': 'true' // ✅ Skip ngrok warning page
      },
      body: JSON.stringify({ email, password, deviceId })
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Login failed' }));
      console.error("Login Error Response:", errorData);
      throw new Error(errorData.error || `Login failed with status ${res.status}`);
    }

    const json = await res.json();
    return json;
  } catch (error: any) {
    console.error("Fetch Error during Login:", error);
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error("Network error: Could not connect to the backend server. Please check your ngrok URL.");
    }
    throw error;
  }
};

// --- AI ASSISTANT ---
export const askAI = async (prompt: string, context: any) => {
  const res = await request(`${API_BASE_URL}/ai/ask`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ prompt, context })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("AI API Error Details:", err);
    throw new Error(err.details || err.error || 'AI failed to respond');
  }
  return res.json();
};

export const forgotPassword = async (email: string) => {
  const url = `${API_BASE_URL}/auth/forgot-password`;
  console.log("Forgot Password Request:", url);
  try {
    const res = await request(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ email })
    });
    const json = await readJsonSafely(res);
    if (!res.ok) throw new Error(json.error || 'Failed to send OTP');
    return json;
  } catch (error: any) {
    console.error("Forgot Password Error:", error);
    throw error;
  }
};

export const verifyOtp = async (email: string, token: string) => {
  const url = `${API_BASE_URL}/auth/verify-otp`;
  try {
    const res = await request(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ email, token })
    });
    const json = await readJsonSafely(res);
    if (!res.ok) throw new Error(json.error || 'Invalid OTP');
    return json;
  } catch (error: any) {
    console.error("Verify OTP Error:", error);
    throw error;
  }
};

export const resetPassword = async (email: string, token: string, newPassword: string) => {
  const url = `${API_BASE_URL}/auth/reset-password`;
  console.log("Reset Password Request:", url);
  try {
    const res = await request(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'ngrok-skip-browser-warning': 'true'
      },
      body: JSON.stringify({ email, token, newPassword })
    });
    const json = await readJsonSafely(res);
    if (!res.ok) throw new Error(json.error || 'Failed to reset password');
    return json;
  } catch (error: any) {
    console.error("Reset Password Error:", error);
    throw error;
  }
};

// --- EMPLOYEES ---
export const fetchEmployees = async () => {
  const res = await request(`${API_BASE_URL}/employees`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch employees');
  return res.json();
};

// Maine addEmployee aur createEmployee ko ek kar diya hai taake error na aaye
export const addEmployee = async (employeeData: any) => {
  // Check karein ke yahan `${API_BASE_URL}/employees` hi likha hai
  const res = await request(`${API_BASE_URL}/employees`, {
    method: 'POST',
    headers: getHeaders(), // Taake token bhi jaye
    body: JSON.stringify(employeeData)
  });
  
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to add employee');
  }
  return res.json();
};

// Agar aapki baki files createEmployee dhoond rahi hain, toh ye use karein
export const createEmployee = addEmployee; 

export const updateEmployee = async (id: string, employeeData: any) => {
  const res = await request(`${API_BASE_URL}/employees/${id}`, { // Yahan /${id} hona zaroori hai
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(employeeData)
  });
  if (!res.ok) throw new Error('Update failed');
  return res.json();
};

export const deleteEmployee = async (id: string) => {
  try {
    console.log(`API: Deleting employee ${id} at ${API_BASE_URL}/employees/${id}`);
    const res = await request(`${API_BASE_URL}/employees/${id}`, { 
      method: 'DELETE', 
      headers: getHeaders() 
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('API Error Response:', errorData);
      throw new Error(errorData.message || `Failed to delete employee (${res.status})`);
    }
    
    const result = await res.json();
    console.log('API Success:', result);
    return result;
  } catch (error: any) {
    console.error('Delete Employee API Error:', error);
    throw error;
  }
};

export const resetEmployeeDevice = async (id: string) => {
  const res = await request(`${API_BASE_URL}/employees/${id}/reset-device`, { 
    method: 'PUT', 
    headers: getHeaders() 
  });
  if (!res.ok) throw new Error('Failed to reset device');
  return res.json();
};

// --- TASKS ---
export const fetchTasks = async () => {
  const res = await request(`${API_BASE_URL}/tasks`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
};

export const createTask = async (taskData: any) => {
  const res = await request(`${API_BASE_URL}/tasks`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(taskData)
  });
  return res.json();
};

export const updateTask = async (id: string, taskData: any) => {
  const res = await request(`${API_BASE_URL}/tasks/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(taskData)
  });
  return res.json();
};

export const deleteTask = async (id: string) => {
  const res = await request(`${API_BASE_URL}/tasks/${id}`, { method: 'DELETE', headers: getHeaders() });
  return res.json();
};

// --- ATTENDANCE ---
export const fetchAttendance = async () => {
  const res = await request(`${API_BASE_URL}/attendance`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch attendance');
  return readJsonSafely(res);
};

export const fetchDashboardStats = async () => {
  const res = await request(`${API_BASE_URL}/attendance/dashboard-stats`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch dashboard stats');
  return readJsonSafely(res);
};

export const createManualAttendance = async (data: any) => {
  const res = await request(`${API_BASE_URL}/attendance/manual`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  const json = await readJsonSafely(res);
  if (!res.ok) throw new Error(json.error || 'Failed to create attendance');
  return json;
};

export const createAttendance = async (data: any) => {
  const res = await request(`${API_BASE_URL}/attendance/check-in`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });

  const json = await readJsonSafely(res);
  if (!res.ok) {
    throw new Error(json.error || 'Check-in failed');
  }
  return json;
};
export const checkOutAttendance = async (data: any) => {
  const res = await request(`${API_BASE_URL}/attendance/check-out`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });

  const json = await readJsonSafely(res);
  if (!res.ok) {
    throw new Error(json.error || 'Check-out failed');
  }
  return json;
};

export const updateAttendance = async (id: string, data: any) => {
  try {
    console.log(`API: Updating attendance ${id} at ${API_BASE_URL}/attendance/${id}`);
    const res = await request(`${API_BASE_URL}/attendance/${id}`, { 
      method: 'PUT', 
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    
    if (!res.ok) {
      const errorData = await readJsonSafely(res).catch(() => ({}));
      console.error('API Error Response:', errorData);
      throw new Error(errorData.error || `Failed to update attendance (${res.status})`);
    }
    
    const result = await readJsonSafely(res);
    console.log('API Success:', result);
    return result;
  } catch (error: any) {
    console.error('Update Attendance API Error:', error);
    throw error;
  }
};

export const deleteAttendance = async (id: string) => {
  try {
    console.log(`API: Deleting attendance ${id} at ${API_BASE_URL}/attendance/${id}`);
    const res = await request(`${API_BASE_URL}/attendance/${id}`, { 
      method: 'DELETE', 
      headers: getHeaders() 
    });
    
    if (!res.ok) {
      const errorData = await readJsonSafely(res).catch(() => ({}));
      console.error('API Error Response:', errorData);
      throw new Error(errorData.error || `Failed to delete attendance (${res.status})`);
    }
    
    const result = await readJsonSafely(res);
    console.log('API Success:', result);
    return result;
  } catch (error: any) {
    console.error('Delete Attendance API Error:', error);
    throw error;
  }
};

export const testAutoAbsent = async () => {
  try {
    console.log(`API: Testing auto absent at ${API_BASE_URL}/attendance/test-auto-absent`);
    const res = await request(`${API_BASE_URL}/attendance/test-auto-absent`, { 
      method: 'POST', 
      headers: getHeaders() 
    });
    
    if (!res.ok) {
      const errorData = await readJsonSafely(res).catch(() => ({}));
      console.error('API Error Response:', errorData);
      throw new Error(errorData.error || `Failed to run auto absent (${res.status})`);
    }
    
    const result = await readJsonSafely(res);
    console.log('API Success:', result);
    return result;
  } catch (error: any) {
    console.error('Test Auto Absent API Error:', error);
    throw error;
  }
};

// --- PAYROLL ---
export const fetchPayroll = async () => {
  const res = await request(`${API_BASE_URL}/payroll`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch payroll');
  return res.json();
};

export const fetchEmployeeAttendanceStats = async (empId: string, month: string) => {
  const res = await request(`${API_BASE_URL}/payroll/attendance-stats/${empId}/${month}`, { 
    headers: getHeaders() 
  });
  if (!res.ok) throw new Error('Failed to fetch attendance stats');
  return res.json();
};

export const generatePayroll = async (month: string) => {
  const res = await request(`${API_BASE_URL}/payroll/generate`, {
    method: "POST",
    headers: getHeaders(),   // ✅ IMPORTANT
    body: JSON.stringify({ month })
  });

  if (!res.ok) throw new Error("Failed to generate payroll");

  return res.json();
};

export const createPayroll = async (data: any) => {
  const res = await request(`${API_BASE_URL}/payroll`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    const text = await res.text();
    let errorMessage = 'Failed to create payroll';
    try {
      const json = JSON.parse(text);
      errorMessage = json.error || errorMessage;
    } catch (e) {
      errorMessage = `Payroll API not found or Server Error (${res.status})`;
    }
    throw new Error(errorMessage);
  }

  return res.json();
};

export const updatePayrollStatus = async (id: string, status: string) => {
  const res = await fetch(`${API_BASE_URL}/payroll/${id}/status`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ status })
  });
  return res.json();
};

export const updatePayrollAdjustments = async (id: string, adjustments: any) => {
  const res = await fetch(`${API_BASE_URL}/payroll/${id}/adjustments`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(adjustments)
  });
  if (!res.ok) throw new Error('Failed to update adjustments');
  return res.json();
};

export const deletePayrollRecord = async (id: string) => {
  const res = await fetch(`${API_BASE_URL}/payroll/${id}`, { method: 'DELETE', headers: getHeaders() });
  if (!res.ok) {
     if (res.status === 404) throw new Error('API Endpoint not found. Please restart your dev server so the backend loads the new delete route.');
     throw new Error(`Server error ${res.status}`);
  }
  return res.json();
};

// --- SEEDING MULTIPLE ---
export const seedDatabase = async (data: any) => {
  const res = await fetch(`${API_BASE_URL}/seed`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  return res.json();
};

// --- SETTINGS (ADMIN) ---
export const fetchSettings = async () => {
  try {
    const res = await request(`${API_BASE_URL}/settings/system`, { headers: getHeaders() });
    const json = await readJsonSafely(res);
    if (!res.ok) throw new Error(json.error || 'Failed to fetch settings');
    return json;
  } catch (error: any) {
    console.error('Settings fetch error:', error);
    // If it's a 403 error, provide more specific message
    if (error.message.includes('403') || error.message.includes('Admin access required')) {
      throw new Error('Admin access required for this operation');
    }
    throw error;
  }
};

export const updateSettings = async (data: any) => {
  try {
    const res = await request(`${API_BASE_URL}/settings/system`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    const json = await readJsonSafely(res);
    if (!res.ok) throw new Error(json.error || 'Failed to update settings');
    return json;
  } catch (error: any) {
    console.error('Settings update error:', error);
    // If it's a 403 error, provide more specific message
    if (error.message.includes('403') || error.message.includes('Admin access required')) {
      throw new Error('Admin access required for this operation');
    }
    throw error;
  }
};

export const updateProfileSettings = async (data: { fullName: string; email: string }) => {
  const res = await request(`${API_BASE_URL}/settings/profile`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  const json = await readJsonSafely(res);
  if (!res.ok) throw new Error(json.error || 'Failed to update profile');
  return json;
};

export const updatePasswordSettings = async (data: { currentPassword: string; newPassword: string }) => {
  const res = await request(`${API_BASE_URL}/settings/password`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  const json = await readJsonSafely(res);
  if (!res.ok) throw new Error(json.error || 'Failed to update password');
  return json;
};

// --- LEAVES ---
export const applyLeave = async (formData: FormData) => {
  const url = `${API_BASE_URL}/leaves/apply`;
  const token = localStorage.getItem('token');
  const session = JSON.parse(localStorage.getItem('hrms_session') || '{}');
  const authToken = token || session.token;
  
  const res = await request(url, {
    method: 'POST',
    headers: {
      "Authorization": `Bearer ${authToken}`,
      "ngrok-skip-browser-warning": "true"
      // Content-Type should not be set for FormData, fetch will set it with boundary
    },
    body: formData
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to apply for leave');
  return json;
};

export const fetchMyLeaves = async () => {
  const res = await request(`${API_BASE_URL}/leaves/my-leaves`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch my leaves');
  return res.json();
};

export const fetchAllLeaves = async () => {
  const res = await request(`${API_BASE_URL}/leaves/all`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch all leaves');
  return res.json();
};

export const updateLeaveStatus = async (id: string, data: { status: string; adminComment?: string }) => {
  const res = await request(`${API_BASE_URL}/leaves/status/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  if (!res.ok) throw new Error('Failed to update leave status');
  return res.json();
};

// --- CANDIDATES ---
export const fetchCandidates = async () => {
  const res = await fetch(`${API_BASE_URL}/candidates`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch candidates');
  return res.json();
};

export const createCandidate = async (data: any) => {
  // Public route can use normal headers, but we pass auth just in case.
  const res = await fetch(`${API_BASE_URL}/candidates`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data)
  });
  
  if (!res.ok) {
    const text = await res.text();
    let errorMessage = 'Failed to create candidate';
    try {
      const json = JSON.parse(text);
      errorMessage = json.error || errorMessage;
    } catch (e) {
      errorMessage = `Candidate API not found or Server Error (${res.status})`;
    }
    throw new Error(errorMessage);
  }

  return res.json();
};

export const updateCandidateStatus = async (id: string, status: string, interviewDate?: string, interviewTime?: string) => {
  console.log(`Updating candidate ${id} status to ${status}`);
  const res = await fetch(`${API_BASE_URL}/candidates/${id}/status`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ status, interviewDate, interviewTime })
  });
  
  const text = await res.text();
  console.log("Status update response:", text);
  
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (e) {
    throw new Error(`Invalid server response: ${text.substring(0, 100)}`);
  }

  if (!res.ok) {
    throw new Error(parsed?.error || `Failed to update status (${res.status})`);
  }

  return parsed;
};

export const updateInterviewSchedule = async (id: string, interviewDate: string, interviewTime: string) => {
  const res = await fetch(`${API_BASE_URL}/candidates/${id}/interview`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ interviewDate, interviewTime })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to update interview schedule');
  return json;
};

export const deleteCandidate = async (id: string) => {
  const res = await fetch(`${API_BASE_URL}/candidates/${id}`, {
    method: 'DELETE', headers: getHeaders()
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to delete candidate');
  return json;
};

export const clearAllCandidates = async () => {
  const res = await fetch(`${API_BASE_URL}/candidates`, {
    method: 'DELETE', headers: getHeaders()
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Failed to refresh candidates');
  return json;
};

// --- NOTIFICATIONS ---
export const fetchNotifications = async (role: string, empId?: string) => {
  let url = `${API_BASE_URL}/notifications?role=${encodeURIComponent(role)}`;
  if (empId) url += `&empId=${encodeURIComponent(empId)}`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
};

export const markNotificationRead = async (id: string) => {
  const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, { method: 'PUT', headers: getHeaders() });
  return res.json();
};

export const markAllNotificationsRead = async (role: string, empId?: string) => {
  const res = await fetch(`${API_BASE_URL}/notifications/read-all`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify({ role, empId })
  });
  return res.json();
};
