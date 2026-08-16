// Frappe cclms API client for the xg-system CRM Portal (sales agents).
// Routes to the Frappe backend through a Vercel rewrite: /api/frappe/* -> btm.digihoopoe.com/api/*
const BASE = '/api/frappe';

function csrf() {
  const m = document.cookie.match(/X-Frappe-CSRF-Token=([^;]+)/);
  return m ? m[1] : null;
}

async function call(method, args = {}, opts = {}) {
  const isMutation = opts.mutation ?? true;
  const url = `${BASE}/method/${method}`;
  if (isMutation) {
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(csrf() ? { 'X-Frappe-CSRF-Token': csrf() } : {}) },
      body: JSON.stringify(args),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.exc) {
      const msg = data._server_messages ? JSON.parse(data._server_messages)[0]?.message : data.message || data.exception || 'Request failed';
      throw new Error(msg);
    }
    return data.message ?? data;
  }
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(args || {})) if (v !== undefined && v !== null && v !== '') params.set(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
  params.set('_t', Date.now().toString());
  const res = await fetch(`${url}?${params.toString()}`, { credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.exc) {
    const msg = data._server_messages ? JSON.parse(data._server_messages)[0]?.message : data.message || data.exception || 'Request failed';
    throw new Error(msg);
  }
  return data.message ?? data;
}

// ---- AUTH ---------------------------------------------------------------
export async function login(identifier, password) {
  // Standard Frappe session login (sets the session cookie), then resolve the
  // sales-agent profile via the SANHA model (same as XG Hub).
  const res = await fetch(`${BASE}/method/login`, {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
    body: new URLSearchParams({ usr: identifier, pwd: password }).toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.exc) {
    const msg = data._server_messages ? JSON.parse(data._server_messages)[0]?.message : data.message || data.exception || 'Invalid login credentials';
    throw new Error(msg);
  }
  const me = await call('cclms.api.crm_portal.get_current_sales_agent', {}, { mutation: false });
  return me; // { user, full_name, sales_agent, branch, company, employee, roles }
}

// ---- LEADS --------------------------------------------------------------
const LEAD_CRM_FIELDS = ['name','business_name','business_type','owner_name','email','business_phone_number','personal_cell_phone','address','city','state','state_code','zip_code','country','full_address','latitude','longitude','contract_length','base_rent','hours','percentage','notes','priority','company','workflow_state','creation','modified','sign_date','install_date','approve_date','agreement_sent_date','executive_name','branch','post_date'];

export function leadToUI(doc) {
  return {
    id: doc.name,
    businessName: doc.business_name,
    businessType: doc.business_type,
    ownerName: doc.owner_name,
    email: doc.email,
    businessPhone: doc.business_phone_number,
    personalCellPhone: doc.personal_cell_phone,
    address: doc.address,
    city: doc.city,
    state: doc.state,
    stateCode: doc.state_code,
    zipCode: doc.zip_code,
    country: doc.country,
    fullAddress: doc.full_address,
    latitude: doc.latitude,
    longitude: doc.longitude,
    contractLength: doc.contract_length,
    baseRent: doc.base_rent,
    hours: doc.hours,
    percentage: doc.percentage,
    notes: doc.notes,
    priority: doc.priority,
    company: doc.company,
    status: doc.workflow_state || 'Pending',
    executiveName: doc.executive_name,
    branch: doc.branch,
    followUpTime: doc.follow_up_time,
    signDate: doc.sign_date,
    installDate: doc.install_date,
    approveDate: doc.approve_date,
    agreementSentDate: doc.agreement_sent_date,
    createdAt: doc.creation,
    modified: doc.modified,
  };
}

export async function listLeads() {
  const rows = await call('frappe.client.get_list', {
    doctype: 'ATM Leads',
    fields: LEAD_CRM_FIELDS,
    filters: [],
    order_by: 'creation desc',
    limit_page_length: 500,
  }, { mutation: false });
  return rows.map(leadToUI);
}

export async function getLead(id) {
  const doc = await call('frappe.client.get', { doctype: 'ATM Leads', name: id }, { mutation: false });
  return leadToUI(doc);
}

export async function getLeadHistory(id) {
  const rows = await call('frappe.client.get_list', {
    doctype: 'ATM Lead State History',
    fields: ['from_state', 'to_state', 'change_date', 'changed_by'],
    filters: [['parent', '=', id]],
    order_by: 'creation asc',
  }, { mutation: false });
  return rows;
}

export async function createLead(body) {
  const doc = { doctype: 'ATM Leads', workflow_state: 'Draft', status: 'Draft' };
  const map = {
    businessName: 'business_name', businessType: 'business_type', ownerName: 'owner_name',
    email: 'email', businessPhone: 'business_phone_number', personalCellPhone: 'personal_cell_phone',
    address: 'address', city: 'city', state: 'state', stateCode: 'state_code', zipCode: 'zip_code',
    country: 'country', fullAddress: 'full_address', latitude: 'latitude', longitude: 'longitude',
    contractLength: 'contract_length', baseRent: 'base_rent', hours: 'hours', percentage: 'percentage',
    notes: 'notes', priority: 'priority', company: 'company', executiveName: 'executive_name', branch: 'branch',
  };
  for (const [k, v] of Object.entries(map)) if (body[k] != null) doc[v] = body[k];
  const created = await call('frappe.client.insert', { doc });
  return leadToUI(created);
}

export async function updateLead(id, body) {
  const map = {
    businessName: 'business_name', businessType: 'business_type', ownerName: 'owner_name',
    email: 'email', businessPhone: 'business_phone_number', personalCellPhone: 'personal_cell_phone',
    address: 'address', city: 'city', state: 'state', stateCode: 'state_code', zipCode: 'zip_code',
    country: 'country', fullAddress: 'full_address', latitude: 'latitude', longitude: 'longitude',
    contractLength: 'contract_length', baseRent: 'base_rent', hours: 'hours', percentage: 'percentage',
    notes: 'notes', priority: 'priority', company: 'company', executiveName: 'executive_name', branch: 'branch',
  };
  const updates = {};
  for (const [k, v] of Object.entries(map)) if (body[k] != null) updates[v] = body[k];
  if (body.status) updates.workflow_state = body.status;
  if (body.followUpTime) updates.follow_up_time = body.followUpTime;
  if (body.agreementSentDate) updates.agreement_sent_date = body.agreementSentDate;
  const doc = await call('frappe.client.set_value', { doctype: 'ATM Leads', name: id, fieldname: updates });
  return leadToUI(doc);
}

// ---- FOLLOW-UPS ---------------------------------------------------------
export async function listFollowUps() {
  const rows = await call('cclms.api.follow_up.my_follow_ups', {}, { mutation: false });
  return rows || [];
}

export async function fetchCompanies() {
  const rows = await call('frappe.client.get_list', {
    doctype: 'Operator Companies',
    fields: ['name', 'operator_name'],
    limit_page_length: 200,
    order_by: 'operator_name asc',
  }, { mutation: false });
  return rows || [];
}

export async function scheduleFollowUp(payload) {
  return call('cclms.api.follow_up.schedule_follow_up', payload);
}

export async function completeFollowUp(name, result = '') {
  return call('cclms.api.follow_up.complete_follow_up', { name, result });
}

export async function markDialed(name) {
  return call('cclms.api.follow_up.mark_dialed', { name });
}

// ---- CONVERT follow-up -> ATM lead --------------------------------------
export async function convertFollowUpToLead(name, payload = {}) {
  return call('cclms.api.follow_up.convert_follow_up_to_lead', {
    name,
    company: payload.company || null,
    workflow_state: payload.workflow_state || 'Pending',
    address: payload.address || null,
    city: payload.city || null,
    state: payload.state || null,
    state_code: payload.stateCode || null,
    zip_code: payload.zipCode || null,
    full_address: payload.fullAddress || null,
  });
}
