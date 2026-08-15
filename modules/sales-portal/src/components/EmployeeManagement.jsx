import React, { useState, useEffect } from 'react';
import { UserPlus, Briefcase, Mail, Key, Hash, LayoutList, Check, X, ShieldCheck } from 'lucide-react';

export default function EmployeeManagement({ userRole, campaigns }) {
  const [employees, setEmployees] = useState([]);
  const [pendingPasswords, setPendingPasswords] = useState([]);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [editFormData, setEditFormData] = useState({ name: '', email: '', role: 'Employee', campaignId: '' });
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    pseudoName: '',
    campaign: '',
    email: '',
    password: '',
    role: 'Employee'
  });

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees');
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  const fetchPendingPasswords = async () => {
    try {
      const res = await fetch('/api/employees/pending-passwords/list');
      if (res.ok) {
        const data = await res.json();
        setPendingPasswords(data);
      }
    } catch (err) {
      console.error('Error fetching pending passwords:', err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (userRole === 'Admin' || userRole === 'Super Admin') {
      fetchPendingPasswords();
    }
  }, [userRole]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) return;

    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        const data = await res.json();

        if (formData.campaign) {
          await fetch(`/api/campaigns/${formData.campaign}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ assignedAgentId: data.id })
          });
        }

        const newEmployee = {
          id: data.id,
          employee_id: data.employee_id,
          name: formData.name,
          pseudoName: formData.pseudoName,
          campaign: formData.campaign,
          email: formData.email,
          role: formData.role
        };

        setEmployees([newEmployee, ...employees]);
        setFormData({ name: '', pseudoName: '', campaign: '', email: '', password: '', role: 'Employee' });

        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        const errorData = await res.json();
        alert(`Error: ${errorData.message}`);
      }
    } catch (error) {
      console.error("Error creating employee:", error);
      alert("Error connecting to the server.");
    }
  };

  const handleUnlock = async (employeeId) => {
    try {
      const res = await fetch(`/api/employees/${employeeId}/unlock`, {
        method: 'PUT'
      });
      if (res.ok) {
        setEmployees(employees.map(e => e.id === employeeId ? { ...e, isLocked: false } : e));
      }
    } catch (err) {
      console.error('Error unlocking employee:', err);
    }
  };

  const handleApprovePassword = async (id) => {
    try {
      const res = await fetch(`/api/employees/${id}/approve-password`, { method: 'PUT' });
      if (res.ok) {
        setPendingPasswords(pendingPasswords.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error('Error approving password:', err);
    }
  };

  const handleRejectPassword = async (id) => {
    try {
      const res = await fetch(`/api/employees/${id}/reject-password`, { method: 'PUT' });
      if (res.ok) {
        setPendingPasswords(pendingPasswords.filter(p => p.id !== id));
      }
    } catch (err) {
      console.error('Error rejecting password:', err);
    }
  };

  const openEditModal = (emp) => {
    setEditingEmployee(emp);
    setEditFormData({ name: emp.name, email: emp.email, role: emp.role, campaignId: '' });
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/employees/${editingEmployee.id}/admin-update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });
      if (res.ok) {
        const updated = await res.json();
        setEmployees(employees.map(e => e.id === editingEmployee.id ? { ...e, ...updated } : e));
        setEditingEmployee(null);
      }
    } catch (err) {
      console.error('Error updating employee:', err);
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      const res = await fetch(`/api/employees/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEmployees(employees.filter(e => e.id !== id));
      }
    } catch (err) {
      console.error('Error deleting employee:', err);
    }
  };
  return (
    <div className="bx-content" style={{ overflowY: 'auto' }}>
      <div className="bx-content-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="bx-page-title">Employee Management</h1>
          <p style={{ color: 'var(--bx-text-muted)' }}>Create and manage employee IDs, agent pseudo names.</p>
        </div>
        <div className="bx-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserPlus size={16} /> Total: {employees.length}
        </div>
      </div>

      <div className="bx-emp-grid" style={{ padding: '20px', display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '20px', alignItems: 'start' }}>
        <div className="bx-widget-card">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <UserPlus size={20} /> Add New Employee
          </h2>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--bx-text-muted)' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <Hash size={16} style={{ position: 'absolute', left: '12px', top: '10px', opacity: 0.5 }} />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'var(--bx-sidebar-bg)', border: '1px solid var(--bx-border)', borderRadius: '6px', color: 'var(--bx-text-main)' }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--bx-text-muted)' }}>Pseudo Name (Agent ID)</label>
              <div style={{ position: 'relative' }}>
                <Briefcase size={16} style={{ position: 'absolute', left: '12px', top: '10px', opacity: 0.5 }} />
                <input
                  type="text"
                  name="pseudoName"
                  value={formData.pseudoName}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'var(--bx-sidebar-bg)', border: '1px solid var(--bx-border)', borderRadius: '6px', color: 'var(--bx-text-main)' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--bx-text-muted)' }}>System Role</label>
              <div style={{ position: 'relative' }}>
                <ShieldCheck size={16} style={{ position: 'absolute', left: '12px', top: '10px', opacity: 0.5 }} />
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'var(--bx-sidebar-bg)', border: '1px solid var(--bx-border)', borderRadius: '6px', color: 'var(--bx-text-main)', appearance: 'none' }}
                >
                  <option value="Employee" style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}>Employee</option>
                  <option value="Admin" style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}>Admin</option>
                  {userRole === 'Super Admin' && <option value="Super Admin" style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}>Super Admin</option>}
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--bx-text-muted)' }}>Assign Campaign</label>
              <div style={{ position: 'relative' }}>
                <LayoutList size={16} style={{ position: 'absolute', left: '12px', top: '10px', opacity: 0.5 }} />
                <select
                  name="campaign"
                  value={formData.campaign}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'var(--bx-sidebar-bg)', border: '1px solid var(--bx-border)', borderRadius: '6px', color: 'var(--bx-text-main)', appearance: 'none' }}
                >
                  <option value="" style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}>Select Campaign</option>
                  {campaigns.map(c => <option key={c.id} value={c.id} style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--bx-text-muted)' }}>Login Email</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '10px', opacity: 0.5 }} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'var(--bx-sidebar-bg)', border: '1px solid var(--bx-border)', borderRadius: '6px', color: 'var(--bx-text-main)' }}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: 'var(--bx-text-muted)' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Key size={16} style={{ position: 'absolute', left: '12px', top: '10px', opacity: 0.5 }} />
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  style={{ width: '100%', padding: '10px 12px 10px 36px', background: 'var(--bx-sidebar-bg)', border: '1px solid var(--bx-border)', borderRadius: '6px', color: 'var(--bx-text-main)' }}
                  required
                />
              </div>
            </div>

            <button type="submit" className="bx-btn bx-btn-primary" style={{ justifyContent: 'center', padding: '12px' }}>
              {showSuccess ? <><Check size={16} /> Created!</> : 'Create Employee ID'}
            </button>
          </form>
        </div>

        <div>
          {pendingPasswords.length > 0 && (
            <div style={{ marginBottom: '20px', padding: '16px', background: 'rgba(255,152,0,0.08)', border: '1px solid var(--bx-accent-orange)', borderRadius: '8px' }}>
              <h3 style={{ fontSize: '14px', color: 'var(--bx-accent-orange)', marginBottom: '10px' }}>Pending Password Change Requests</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pendingPasswords.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bx-sidebar-bg)', borderRadius: '6px' }}>
                    <span style={{ fontSize: '13px' }}>{p.name} ({p.email})</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="bx-btn bx-btn-primary" style={{ padding: '5px 10px', fontSize: '11px' }} onClick={() => handleApprovePassword(p.id)}>Approve</button>
                      <button className="bx-btn" style={{ padding: '5px 10px', fontSize: '11px', color: 'var(--bx-accent-red)' }} onClick={() => handleRejectPassword(p.id)}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bx-widget-card">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Briefcase size={20} /> Active Employees
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {employees.map(emp => (
                <div key={emp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bx-border)', borderRadius: '8px', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {emp.name}
                      {emp.pseudoName && <span style={{ fontSize: '12px', padding: '2px 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontWeight: 'normal' }}>{emp.pseudoName}</span>}
                    </div>
                    <div className="bx-doc-row" style={{ fontSize: '13px', color: 'var(--bx-text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={12} /> {emp.email}</span>
                      {emp.campaign && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><LayoutList size={12} /> {emp.campaign}</span>}
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: emp.role === 'Super Admin' ? 'var(--bx-accent-orange)' : (emp.role === 'Admin' ? 'var(--bx-accent-green)' : 'inherit') }}><ShieldCheck size={12} /> {emp.role}</span>
                      {emp.isLocked && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: 'var(--bx-accent-red)', fontWeight: 600 }}>🔒 Locked</span>
                          {(userRole === 'Admin' || userRole === 'Super Admin') && (
                            <button
                              className="bx-btn"
                              style={{ padding: '4px 10px', fontSize: '11px' }}
                              onClick={() => handleUnlock(emp.id)}
                            >
                              Unlock
                            </button>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  {(userRole === 'Admin' || userRole === 'Super Admin') && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="bx-btn" style={{ padding: '6px 10px', fontSize: '12px' }} onClick={() => openEditModal(emp)}>Edit</button>
                      <button className="bx-btn" style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--bx-accent-red)' }} onClick={() => handleDeleteEmployee(emp.id)}>Delete</button>
                    </div>
                  )}
                </div>
              ))}
              {employees.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--bx-text-muted)' }}>
                  No employees found. Create one to get started.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {editingEmployee && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Edit Employee</span>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setEditingEmployee(null)} />
            </h2>
            <form onSubmit={handleEditSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Name</label>
                <input
                  required
                  className="input-field"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Email</label>
                <input
                  required
                  type="email"
                  className="input-field"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Role</label>
                <select
                  className="input-field"
                  value={editFormData.role}
                  onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                  style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}
                >
                  <option value="Employee">Employee</option>
                  <option value="Admin">Admin</option>
                  {userRole === 'Super Admin' && <option value="Super Admin">Super Admin</option>}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Reassign Campaign (optional)</label>
                <select
                  className="input-field"
                  value={editFormData.campaignId}
                  onChange={(e) => setEditFormData({ ...editFormData, campaignId: e.target.value })}
                  style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}
                >
                  <option value="">No change</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                <button type="button" className="bx-btn" onClick={() => setEditingEmployee(null)}>Cancel</button>
                <button type="submit" className="bx-btn bx-btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}