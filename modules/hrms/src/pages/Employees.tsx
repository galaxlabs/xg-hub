import React, { useState, useEffect } from 'react';
import { Search, Plus, Eye, Trash2, X, Save, Edit2, RefreshCw } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { fetchEmployees, createEmployee, updateEmployee, deleteEmployee, resetEmployeeDevice } from '../api';
import toast from 'react-hot-toast';
import './Employees.css';

export interface Employee {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: string;
  department: string;
  status: 'Active' | 'On Leave' | 'Inactive';
  cnic: string;
  bankName: string;
  accountNumber: string;
  joinDate: string;
  baseSalary: number;
  allowance?: number;
  kpiTarget?: string;
  emergencyContact?: string;
  currentAddress?: string;
}

// ✅ Dropdown Options
const ROLE_OPTIONS = ['SuperAdmin', 'Admin', 'Employee'];
const DEPARTMENT_OPTIONS = ['Sales BTM', 'Human Resources', 'Digital Marketing', 'AI Automation'];

const Employees: React.FC = () => {
  const location = useLocation();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newEmp, setNewEmp] = useState<Partial<Employee>>({ status: 'Active', baseSalary: 5000, allowance: 0, kpiTarget: '' });
  const [editEmp, setEditEmp] = useState<Partial<Employee>>({});

  const [validationErrors, setValidationErrors] = useState<{
    cnic?: string;
    accountNumber?: string;
    email?: string;
    id?: string;
  }>({});

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const data = await fetchEmployees();
      setEmployees(data);
    } catch (e) {
      console.error("Failed fetching employees", e);
      setEmployees([]);
    }
  };

  const handleResetDevice = async (id: string) => {
    if (!window.confirm("Are you sure you want to reset this employee's Device ID? This will allow them to login from a new device.")) return;
    try {
      await resetEmployeeDevice(id);
      toast.success("Device ID reset successfully.");
    } catch (e) {
      console.error(e);
      toast.error("Failed to reset device ID.");
    }
  };

  // ✅ Auto-generate next Employee ID
  const generateNextEmployeeId = (empList: Employee[]): string => {
    if (empList.length === 0) return 'EMP-001';

    // Extract all numeric parts from existing IDs
    const numbers = empList
      .map(emp => {
        const match = emp.id.match(/EMP-(\d+)/i);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => !isNaN(n));

    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    const nextNumber = maxNumber + 1;
    return `EMP-${String(nextNumber).padStart(3, '0')}`;
  };

  // ✅ Open Add Modal with auto-generated ID
  const openAddModal = () => {
    const nextId = generateNextEmployeeId(employees);
    setNewEmp({
      id: nextId,
      status: 'Active',
      baseSalary: 5000,
      allowance: 0,
      kpiTarget: '',
      role: 'Employee',           // default role
      department: 'Sales BTM'     // default department
    });
    setValidationErrors({});
    setIsAddModalOpen(true);
  };

  useEffect(() => {
    if (location.state?.searchTarget) {
      setSearchTerm(location.state.searchTarget);
    }
  }, [location.state]);

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.cnic.includes(searchTerm)
  );

  const checkDuplicate = (field: 'cnic' | 'accountNumber' | 'email' | 'id', value: string, excludeId?: string) => {
    if (!value) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
      return;
    }

    const duplicate = employees.find(emp => {
      if (excludeId && emp.id === excludeId) return false;
      if (field === 'email') return emp.email.toLowerCase() === value.toLowerCase();
      if (field === 'id') return emp.id.toLowerCase() === value.toLowerCase();
      return emp[field] === value;
    });

    if (duplicate) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: `Already used by ${duplicate.name} (${duplicate.id})`
      }));
    } else {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to completely delete ${name}?`)) {
      try {
        console.log(`Attempting to delete employee: ${id}`);
        await deleteEmployee(id);
        console.log(`Successfully deleted employee: ${id}`);
        setEmployees(prev => prev.filter(e => e.id !== id));
        alert(`Employee ${name} deleted successfully`);
      } catch (e: any) {
        console.error("Error deleting employee:", e);
        alert(`Error deleting employee: ${e.message || 'Unknown error'}`);
      }
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEmp.id || !newEmp.name || !newEmp.cnic || !newEmp.email || !newEmp.password
      || !newEmp.role || !newEmp.department || !newEmp.bankName || !newEmp.accountNumber
      || !newEmp.baseSalary) {
      alert("All required fields must be filled!");
      return;
    }

    const duplicateId = employees.find(emp => emp.id.toLowerCase() === newEmp.id!.toLowerCase());
    if (duplicateId) {
      alert(`❌ Yeh Employee ID "${newEmp.id}" pehle se "${duplicateId.name}" ke liye registered hai!`);
      return;
    }

    const duplicateCnic = employees.find(emp => emp.cnic === newEmp.cnic);
    if (duplicateCnic) {
      alert(`❌ Yeh CNIC "${newEmp.cnic}" pehle se "${duplicateCnic.name}" (ID: ${duplicateCnic.id}) ke liye registered hai!`);
      return;
    }

    const duplicateAccount = employees.find(emp => emp.accountNumber === newEmp.accountNumber);
    if (duplicateAccount) {
      alert(`❌ Yeh IBAN/Account Number "${newEmp.accountNumber}" pehle se "${duplicateAccount.name}" (ID: ${duplicateAccount.id}) ke liye registered hai!`);
      return;
    }

    const duplicateEmail = employees.find(emp => emp.email.toLowerCase() === newEmp.email!.toLowerCase());
    if (duplicateEmail) {
      alert(`❌ Yeh Email "${newEmp.email}" pehle se "${duplicateEmail.name}" (ID: ${duplicateEmail.id}) ke liye registered hai!`);
      return;
    }

    const cnicPattern = /^\d{5}-\d{7}-\d{1}$/;
    if (!cnicPattern.test(newEmp.cnic!)) {
      alert("❌ CNIC format galat hai! Sahi format: XXXXX-XXXXXXX-X");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(newEmp.email!)) {
      alert("❌ Email format galat hai!");
      return;
    }

    const newlyCreated: any = {
      ...newEmp,
      joinDate: newEmp.joinDate || new Date().toISOString().split('T')[0],
      baseSalary: Number(newEmp.baseSalary) || 0,
      allowance: Number(newEmp.allowance) || 0,
      status: newEmp.status || 'Active',
      kpiTarget: newEmp.kpiTarget || 'Not assigned',
      emergencyContact: newEmp.emergencyContact || '',
      currentAddress: newEmp.currentAddress || '',
    };

    try {
      await createEmployee(newlyCreated);
      await loadEmployees();
      setIsAddModalOpen(false);
      setNewEmp({ status: 'Active', baseSalary: 5000, allowance: 0, kpiTarget: '' });
      setValidationErrors({});
      alert("✅ Employee created successfully!");
    } catch (e: any) {
      const msg = e.response?.data?.message || "Error adding employee";
      alert(msg);
    }
  };

  const handleSaveEdit = async () => {
    if (!editEmp.id) {
      alert("Invalid employee data");
      return;
    }

    const duplicateCnic = employees.find(emp =>
      emp.cnic === editEmp.cnic && emp.id !== editEmp.id
    );
    if (duplicateCnic) {
      alert(`❌ Yeh CNIC "${editEmp.cnic}" pehle se "${duplicateCnic.name}" (ID: ${duplicateCnic.id}) ke liye registered hai!`);
      return;
    }

    const duplicateAccount = employees.find(emp =>
      emp.accountNumber === editEmp.accountNumber && emp.id !== editEmp.id
    );
    if (duplicateAccount) {
      alert(`❌ Yeh IBAN/Account Number "${editEmp.accountNumber}" pehle se "${duplicateAccount.name}" (ID: ${duplicateAccount.id}) ke liye registered hai!`);
      return;
    }

    const duplicateEmail = employees.find(emp =>
      emp.email?.toLowerCase() === editEmp.email!.toLowerCase() && emp.id !== editEmp.id
    );
    if (duplicateEmail) {
      alert(`❌ Yeh Email "${editEmp.email}" pehle se "${duplicateEmail.name}" (ID: ${duplicateEmail.id}) ke liye registered hai!`);
      return;
    }

    try {
      await updateEmployee(editEmp.id, editEmp);
      await loadEmployees();
      setIsEditMode(false);
      setSelectedEmp(null);
      setValidationErrors({});
      alert("✅ Employee record updated!");
    } catch (e: any) {
      const msg = e.response?.data?.message || "Error updating employee";
      alert(msg);
    }
  };

  const openEditModal = (emp: Employee) => {
    setEditEmp(emp);
    setIsEditMode(true);
    setValidationErrors({});
  };

  const getInputBorder = (fieldError?: string) =>
    `1px solid ${fieldError ? 'red' : 'var(--border-color)'}`;

  const hasErrors = Object.values(validationErrors).some(err => err !== undefined);

  return (
    <>
      <div className="employees-page">
        <div className="page-header">
          <div>
            <h1 className="page-title">Employees Directory</h1>
            <p className="page-subtitle">Manage workforce, base salaries, credentials, and detailed profiles.</p>
          </div>
          <button className="btn-primary" onClick={openAddModal}>
            <Plus size={18} /> Add Employee
          </button>
        </div>

        <div className="card table-card">
          <div className="table-actions">
            <div className="search-input">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search by name, ID, or CNIC..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee ID</th>
                  <th>Employee Name & Email</th>
                  <th>CNIC Number</th>
                  <th>Role & Dept</th>
                  <th>Base Salary</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(emp => (
                   <tr key={emp.id} style={{ height: '70px' }}>
                     <td><strong>{emp.id}</strong></td>
                     <td>
                       <div className="emp-name-cell">
                         <div className="emp-avatar">{emp.name.charAt(0)}</div>
                         <div style={{ display: 'flex', flexDirection: 'column' }}>
                           <span>{emp.name}</span>
                           <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{emp.email}</span>
                         </div>
                       </div>
                     </td>
                     <td>
                       <span style={{ fontFamily: 'monospace', color: 'var(--text-main)', fontWeight: 600 }}>{emp.cnic}</span>
                     </td>
                     <td>
                       <div className="emp-role">{emp.role}</div>
                       <div className="emp-dept">{emp.department}</div>
                     </td>
                     <td>
                       <span style={{ fontWeight: 'bold', color: 'var(--success-color)' }}>PKR {emp.baseSalary?.toLocaleString() || 0}</span>
                     </td>
                     <td>
                       <span className={`status-badge ${emp.status.replace(' ', '-').toLowerCase()}`}>
                         {emp.status}
                       </span>
                     </td>
                     <td>
                       <div className="action-cell">
                         <button className="action-btn" title="View Details" onClick={() => setSelectedEmp(emp)}><Eye size={18} /></button>
                         <button className="action-btn" title="Reset Device ID" onClick={() => handleResetDevice(emp.id)} style={{ color: 'var(--primary-color)' }}><RefreshCw size={18} /></button>
                         <button className="action-btn" title="Edit Employee" onClick={() => openEditModal(emp)} style={{ color: 'var(--warning-color)' }}><Edit2 size={18} /></button>
                         <button className="action-btn" title="Delete Employee" onClick={async () => { if (window.confirm(`Are you sure you want to delete ${emp.name}?`)) { try { await deleteEmployee(emp.id); await loadEmployees(); toast.success('Employee deleted'); } catch (e) { console.error(e); } } }} style={{ color: 'var(--danger-color)' }}><Trash2 size={18} /></button>
                       </div>
                     </td>
                   </tr>
                 ))}
                 {filteredEmployees.length === 0 && (
                   <tr>
                     <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No employees matched your search.</td>
                   </tr>
                 )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Employee Details Modal */}
      {selectedEmp && !isEditMode && (
        <div className="emp-modal-overlay" onClick={() => setSelectedEmp(null)}>
          <div className="emp-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Employee Details</h2>
              <button className="close-btn" onClick={() => setSelectedEmp(null)}><X size={24} /></button>
            </div>

            <div className="modal-body">
              <div className="profile-header">
                <div className="profile-avatar large">{selectedEmp.name.charAt(0)}</div>
                <div className="flex-1">
                  <h3>{selectedEmp.name}</h3>
                  <p>{selectedEmp.role} — {selectedEmp.department}</p>
                </div>
                <button className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => openEditModal(selectedEmp)}>
                  <Edit2 size={16} /> Edit Profile
                </button>
              </div>

              <div className="details-grid">
                <div className="detail-group highlight-pink">
                  <label>Employee ID</label>
                  <p>{selectedEmp.id}</p>
                </div>
                <div className="detail-group highlight-pink">
                  <label>Email Address</label>
                  <p>{selectedEmp.email}</p>
                </div>
                <div className="detail-group highlight-pink">
                  <label>CNIC Number</label>
                  <p style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>{selectedEmp.cnic}</p>
                </div>
                <div className="detail-group">
                  <label>Bank Name</label>
                  <p>{selectedEmp.bankName}</p>
                </div>
                <div className="detail-group">
                  <label>Account Number / IBAN</label>
                  <p style={{ fontFamily: 'monospace' }}>{selectedEmp.accountNumber}</p>
                </div>
                <div className="detail-group highlight-green">
                  <label>Base Salary</label>
                  <p className="salary-text">PKR {selectedEmp.baseSalary?.toLocaleString()}</p>
                </div>
                <div className="detail-group">
                  <label>Allowance</label>
                  <p>PKR {selectedEmp.allowance ? selectedEmp.allowance.toLocaleString() : 0}</p>
                </div>
                <div className="detail-group">
                  <label>Emergency Contact</label>
                  <p>{selectedEmp.emergencyContact || '—'}</p>
                </div>
                <div className="detail-group" style={{ gridColumn: 'span 2' }}>
                  <label>Monthly KPI Target</label>
                  <p style={{ fontStyle: 'italic', color: '#9ca3af' }}>{selectedEmp.kpiTarget || 'Not assigned'}</p>
                </div>
                <div className="detail-group" style={{ gridColumn: 'span 2' }}>
                  <label>Current Address</label>
                  <p>{selectedEmp.currentAddress || '—'}</p>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedEmp(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Employee Modal */}
      {isEditMode && editEmp && (
        <div className="emp-modal-overlay" onClick={() => setIsEditMode(false)}>
          <div className="emp-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Overall Employee Record</h2>
              <button className="close-btn" onClick={() => setIsEditMode(false)}><X size={24} /></button>
            </div>

            <div className="modal-body">
              <div className="details-grid">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" value={editEmp.name || ''} onChange={e => setEditEmp({ ...editEmp, name: e.target.value })} style={{ padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%' }} />
                </div>

                {/* ✅ Role Dropdown in Edit */}
                <div className="form-group">
                  <label>Role</label>
                  <select
                    value={editEmp.role || ''}
                    onChange={e => setEditEmp({ ...editEmp, role: e.target.value })}
                    style={{ padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%' }}
                  >
                    <option value="">-- Select Role --</option>
                    {ROLE_OPTIONS.map(role => (
                      <option key={role} value={role}>{role}</option>
                    ))}
                  </select>
                </div>

                {/* ✅ Department Dropdown in Edit */}
                <div className="form-group">
                  <label>Department</label>
                  <select
                    value={editEmp.department || ''}
                    onChange={e => setEditEmp({ ...editEmp, department: e.target.value })}
                    style={{ padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%' }}
                  >
                    <option value="">-- Select Department --</option>
                    {DEPARTMENT_OPTIONS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select value={editEmp.status} onChange={e => setEditEmp({ ...editEmp, status: e.target.value as any })} style={{ padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%' }}>
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Login Email</label>
                  <input
                    type="email"
                    value={editEmp.email || ''}
                    onChange={e => {
                      setEditEmp({ ...editEmp, email: e.target.value });
                      checkDuplicate('email', e.target.value, editEmp.id);
                    }}
                    style={{ padding: '0.6rem', border: getInputBorder(validationErrors.email), borderRadius: '6px', width: '100%' }}
                  />
                  {validationErrors.email && (
                    <small style={{ color: 'red', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                      ⚠️ {validationErrors.email}
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label>Account Password</label>
                  <input type="text" value={editEmp.password || ''} onChange={e => setEditEmp({ ...editEmp, password: e.target.value })} style={{ padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%' }} />
                </div>

                <div className="form-group">
                  <label>CNIC Number</label>
                  <input
                    type="text"
                    value={editEmp.cnic || ''}
                    onChange={e => {
                      setEditEmp({ ...editEmp, cnic: e.target.value });
                      checkDuplicate('cnic', e.target.value, editEmp.id);
                    }}
                    style={{ padding: '0.6rem', border: getInputBorder(validationErrors.cnic), borderRadius: '6px', width: '100%', fontFamily: 'monospace' }}
                  />
                  {validationErrors.cnic && (
                    <small style={{ color: 'red', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                      ⚠️ {validationErrors.cnic}
                    </small>
                  )}
                </div>
                <div className="form-group">
                  <label>Base Salary (PKR)</label>
                  <input type="number" value={editEmp.baseSalary || 0} onChange={e => setEditEmp({ ...editEmp, baseSalary: Number(e.target.value) })} style={{ padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%' }} />
                </div>
                <div className="form-group">
                  <label>Bank Name</label>
                  <input type="text" value={editEmp.bankName || ''} onChange={e => setEditEmp({ ...editEmp, bankName: e.target.value })} style={{ padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%' }} />
                </div>
                <div className="form-group">
                  <label>Account / IBAN</label>
                  <input
                    type="text"
                    value={editEmp.accountNumber || ''}
                    onChange={e => {
                      setEditEmp({ ...editEmp, accountNumber: e.target.value });
                      checkDuplicate('accountNumber', e.target.value, editEmp.id);
                    }}
                    style={{ padding: '0.6rem', border: getInputBorder(validationErrors.accountNumber), borderRadius: '6px', width: '100%' }}
                  />
                  {validationErrors.accountNumber && (
                    <small style={{ color: 'red', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                      ⚠️ {validationErrors.accountNumber}
                    </small>
                  )}
                </div>

                <div className="form-group">
                  <label>Allowance (PKR)</label>
                  <input type="number" value={editEmp.allowance || 0} onChange={e => setEditEmp({ ...editEmp, allowance: Number(e.target.value) })} style={{ padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%' }} />
                </div>
                <div className="form-group">
                  <label>Emergency Contact</label>
                  <input type="text" value={editEmp.emergencyContact || ''} onChange={e => setEditEmp({ ...editEmp, emergencyContact: e.target.value })} style={{ padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%' }} />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Monthly KPI Target</label>
                  <input type="text" value={editEmp.kpiTarget || ''} onChange={e => setEditEmp({ ...editEmp, kpiTarget: e.target.value })} style={{ padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%' }} />
                </div>
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Current Address</label>
                  <input type="text" value={editEmp.currentAddress || ''} onChange={e => setEditEmp({ ...editEmp, currentAddress: e.target.value })} style={{ padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px', width: '100%' }} />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" style={{ backgroundColor: '#000', color: '#fff', border: 'none' }} onClick={() => setIsEditMode(false)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={handleSaveEdit}
                disabled={hasErrors}
                style={{ opacity: hasErrors ? 0.5 : 1, cursor: hasErrors ? 'not-allowed' : 'pointer' }}
              >
                <Save size={18} style={{ marginRight: 6 }} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee Modal */}
      {isAddModalOpen && (
        <div className="emp-modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="emp-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Employee</h2>
              <button className="close-btn" onClick={() => setIsAddModalOpen(false)}><X size={24} /></button>
            </div>

            <form onSubmit={handleAddEmployee} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body">
                <div className="profile-header" style={{ marginBottom: '1.5rem', padding: '1rem 1.5rem' }}>
                  <div className="profile-avatar large" style={{ width: '60px', height: '60px', fontSize: '1.5rem', borderRadius: '15px' }}>
                    {newEmp.name ? newEmp.name.charAt(0) : '?'}
                  </div>
                  <div className="flex-1">
                    <h3 style={{ fontSize: '1.2rem' }}>{newEmp.name || 'New Employee'}</h3>
                    <p style={{ fontSize: '0.85rem' }}>Create a new member profile for your team</p>
                  </div>
                </div>

                <div className="details-grid">
                  {/* ✅ Auto-generated Employee ID (Read-only) */}
                  <div className="detail-group highlight-pink">
                    <label>Employee ID <span style={{ fontSize: '0.7rem', color: 'var(--success-color)' }}>(Auto-generated)</span></label>
                    <input
                      required
                      type="text"
                      value={newEmp.id || ''}
                      readOnly
                      style={{
                        width: '100%',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--success-color)',
                        fontWeight: 'bold',
                        fontSize: '1rem',
                        padding: 0,
                        outline: 'none',
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>

                  <div className="detail-group">
                    <label>Full Name *</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="e.g. John Doe" 
                      value={newEmp.name || ''} 
                      onChange={e => setNewEmp({ ...newEmp, name: e.target.value })} 
                      style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.95rem', padding: 0, outline: 'none' }} 
                    />
                  </div>

                  <div className="detail-group highlight-pink">
                    <label>Login Email *</label>
                    <input
                      required
                      type="email"
                      placeholder="email@example.com"
                      value={newEmp.email || ''}
                      onChange={e => {
                        setNewEmp({ ...newEmp, email: e.target.value });
                        checkDuplicate('email', e.target.value);
                      }}
                      style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.95rem', padding: 0, outline: 'none' }}
                    />
                    {validationErrors.email && (
                      <small style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                        ⚠️ {validationErrors.email}
                      </small>
                    )}
                  </div>

                  <div className="detail-group highlight-pink">
                    <label>Login Password *</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="Account Password" 
                      value={newEmp.password || ''} 
                      onChange={e => setNewEmp({ ...newEmp, password: e.target.value })} 
                      style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.95rem', padding: 0, outline: 'none' }} 
                    />
                  </div>

                  <div className="detail-group highlight-pink">
                    <label>CNIC Number *</label>
                    <input
                      required
                      type="text"
                      placeholder="XXXXX-XXXXXXX-X"
                      value={newEmp.cnic || ''}
                      onChange={e => {
                        setNewEmp({ ...newEmp, cnic: e.target.value });
                        checkDuplicate('cnic', e.target.value);
                      }}
                      style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.95rem', padding: 0, outline: 'none', fontFamily: 'monospace' }}
                    />
                    {validationErrors.cnic && (
                      <small style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                        ⚠️ {validationErrors.cnic}
                      </small>
                    )}
                  </div>

                  <div className="detail-group highlight-green">
                    <label>Base Salary (PKR) *</label>
                    <input 
                      required 
                      type="number" 
                      value={newEmp.baseSalary || ''} 
                      onChange={e => setNewEmp({ ...newEmp, baseSalary: Number(e.target.value) })} 
                      style={{ width: '100%', background: 'transparent', border: 'none', color: '#10b981', fontSize: '1.1rem', fontWeight: 'bold', padding: 0, outline: 'none' }} 
                    />
                  </div>

                  <div className="detail-group">
                    <label>Allowance (PKR)</label>
                    <input 
                      type="number" 
                      value={newEmp.allowance || ''} 
                      onChange={e => setNewEmp({ ...newEmp, allowance: Number(e.target.value) })} 
                      style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.95rem', padding: 0, outline: 'none' }} 
                    />
                  </div>

                  <div className="detail-group">
                    <label>Emergency Contact</label>
                    <input 
                      type="text" 
                      placeholder="e.g. +92 3XX XXXXXXX" 
                      value={newEmp.emergencyContact || ''} 
                      onChange={e => setNewEmp({ ...newEmp, emergencyContact: e.target.value })} 
                      style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.95rem', padding: 0, outline: 'none' }} 
                    />
                  </div>

                  <div className="detail-group">
                    <label>Role *</label>
                    <select
                      required
                      value={newEmp.role || ''}
                      onChange={e => setNewEmp({ ...newEmp, role: e.target.value })}
                      style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.95rem', padding: 0, outline: 'none', cursor: 'pointer' }}
                    >
                      <option value="" style={{ background: '#111827' }}>-- Select Role --</option>
                      {ROLE_OPTIONS.map(role => (
                        <option key={role} value={role} style={{ background: '#111827' }}>{role}</option>
                      ))}
                    </select>
                  </div>

                  <div className="detail-group">
                    <label>Department *</label>
                    <select
                      required
                      value={newEmp.department || ''}
                      onChange={e => setNewEmp({ ...newEmp, department: e.target.value })}
                      style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.95rem', padding: 0, outline: 'none', cursor: 'pointer' }}
                    >
                      <option value="" style={{ background: '#111827' }}>-- Select Department --</option>
                      {DEPARTMENT_OPTIONS.map(dept => (
                        <option key={dept} value={dept} style={{ background: '#111827' }}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div className="detail-group">
                    <label>Bank Name *</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="e.g. Meezan Bank" 
                      value={newEmp.bankName || ''} 
                      onChange={e => setNewEmp({ ...newEmp, bankName: e.target.value })} 
                      style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.95rem', padding: 0, outline: 'none' }} 
                    />
                  </div>

                  <div className="detail-group">
                    <label>Account / IBAN Number *</label>
                    <input
                      required
                      type="text"
                      placeholder="e.g. PK00..."
                      value={newEmp.accountNumber || ''}
                      onChange={e => {
                        setNewEmp({ ...newEmp, accountNumber: e.target.value });
                        checkDuplicate('accountNumber', e.target.value);
                      }}
                      style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.95rem', padding: 0, outline: 'none', fontFamily: 'monospace' }}
                    />
                    {validationErrors.accountNumber && (
                      <small style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                        ⚠️ {validationErrors.accountNumber}
                      </small>
                    )}
                  </div>

                  <div className="detail-group" style={{ gridColumn: 'span 2' }}>
                    <label>Monthly KPI Target</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Complete onboarding module" 
                      value={newEmp.kpiTarget || ''} 
                      onChange={e => setNewEmp({ ...newEmp, kpiTarget: e.target.value })} 
                      style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.95rem', padding: 0, outline: 'none' }} 
                    />
                  </div>

                  <div className="detail-group" style={{ gridColumn: 'span 2' }}>
                    <label>Current Address</label>
                    <textarea 
                      placeholder="e.g. 123 Main St, City" 
                      value={newEmp.currentAddress || ''} 
                      onChange={e => setNewEmp({ ...newEmp, currentAddress: e.target.value })} 
                      style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.95rem', padding: 0, outline: 'none', minHeight: '60px', resize: 'none', fontFamily: 'inherit' }} 
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={hasErrors}
                  style={{ opacity: hasErrors ? 0.5 : 1, cursor: hasErrors ? 'not-allowed' : 'pointer' }}
                >
                  <Save size={18} /> Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );

};

export default Employees;