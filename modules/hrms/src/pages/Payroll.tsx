import React, { useState, useEffect } from 'react';
import { Coins, Search, Calendar, Download, RefreshCw, Trash2, Edit3, X } from 'lucide-react';
import { fetchPayroll, updatePayrollStatus, deletePayrollRecord, updatePayrollAdjustments } from '../api';
import toast from 'react-hot-toast';
import './Payroll.css';

interface PayrollRecord {
  id: string;
  empId: string;
  name: string;
  department: string;
  baseSalary: number;
  lates: number;
  leaves: number;
  deductions: number;
  commission: number;
  netSalary: number;
  status: 'Paid' | 'Pending' | 'Processing' | 'Unpaid';
  month: string;
  tax: number;
  loan_deduction: number;
  kpi_bonus: number;
  kpi_deduction: number;
  wfh_allowance: number;
  prev_balance: number;
  saturday_bonus: number;
}

const generateMonths = () => {
  const months = [];
  const pktDateStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" });
  const pktDate = new Date(pktDateStr);

  for (let i = 0; i < 3; i++) {
    const d = new Date(pktDate.getFullYear(), pktDate.getMonth() - i, 1);
    months.push(d.toISOString().slice(0, 7));
  }
  return months;
};

const pkMonths = generateMonths();

// Function to format month from "YYYY-MM" to "MonthName-YYYY" like "July-2026"
const formatMonth = (monthStr: string) => {
  if (monthStr === 'All Months') return monthStr;
  const [year, month] = monthStr.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  const monthName = date.toLocaleString('en-US', { month: 'long' });
  return `${monthName}-${year}`;
};

const Payroll: React.FC = () => {
  const [payrollData, setPayrollData] = useState<PayrollRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Get current real month (YYYY-MM)
  const getCurrentMonth = () => {
    const pktDateStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" });
    const pktDate = new Date(pktDateStr);
    return pktDate.toISOString().slice(0, 7);
  };

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PayrollRecord | null>(null);
  const [editForm, setEditForm] = useState({
    tax: 0,
    loan_deduction: 0,
    kpi_bonus: 0,
    kpi_deduction: 0,
    wfh_allowance: 0,
    prev_balance: 0,
    commission: 0
  });

  useEffect(() => {
    loadPayrollData();
    // eslint-disable-next-line
  }, []);

  const loadPayrollData = async () => {
    try {
      const data = await fetchPayroll();
      setPayrollData(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRefresh = async () => {
    setIsGenerating(true);
    await loadPayrollData();
    setTimeout(() => setIsGenerating(false), 500);
  };

  const handleEditClick = (record: PayrollRecord) => {
    setEditingRecord(record);
    setEditForm({
      tax: record.tax || 0,
      loan_deduction: record.loan_deduction || 0,
      kpi_bonus: record.kpi_bonus || 0,
      kpi_deduction: record.kpi_deduction || 0,
      wfh_allowance: record.wfh_allowance || 0,
      prev_balance: record.prev_balance || 0,
      commission: record.commission || 0
    });
  };

  const handleSaveAdjustments = async () => {
    if (!editingRecord) return;
    try {
      const response = await updatePayrollAdjustments(editingRecord.id, editForm);
      if (response.success) {
        setPayrollData(prev => prev.map(p => p.id === editingRecord.id ? { ...p, ...editForm, netSalary: response.netSalary } : p));
        setEditingRecord(null);
        toast.success("Adjustments saved successfully!");
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to save adjustments.");
    }
  };


  const exportToCSV = () => {
    if (filteredPayroll.length === 0) {
      alert("No data available to export.");
      return;
    }
    const headers = ['Record ID', 'Employee Name', 'Employee ID', 'Department', 'Base Salary', 'Commission', 'Lates', 'Leaves', 'Deductions', 'Net Salary', 'Status', 'Month'];
    const rows = filteredPayroll.map(r => [
      r.id, r.name, r.empId, r.department, r.baseSalary, r.commission || 0, r.lates, r.leaves, r.deductions, r.netSalary, r.status, r.month
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(item => `"${item}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Payroll_Export_${selectedMonth.replace(/\s+/g, '_')}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      console.log(`Updating payroll ${id} status to: ${newStatus}`);
      await updatePayrollStatus(id, newStatus);
      setPayrollData(prev => prev.map(p => p.id === id ? { ...p, status: newStatus as any } : p));
      toast.success(`Payroll status updated to ${newStatus}`);
    } catch (e: any) {
      console.error('Error updating payroll status:', e);
      toast.error(`Failed to update status: ${e.message || 'Unknown error'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this payroll record?")) return;
    try {
      await deletePayrollRecord(id);
      setPayrollData(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      console.error(e);
      alert("Error deleting payroll record");
    }
  };

  const filteredPayroll = payrollData.filter(record =>
    (record.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.empId.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (selectedMonth === 'All Months' || record.month === selectedMonth)
  );

  const availableMonthsInDb = Array.from(new Set(payrollData.map(p => p.month)));
  const comboMonths = Array.from(new Set(['All Months', ...pkMonths, ...availableMonthsInDb]));

  const totalPayroll = filteredPayroll.reduce((acc, curr) => acc + Number(curr.netSalary || 0), 0);

  return (
    <div className="payroll-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll System</h1>
          <p className="page-subtitle">Auto-calculated salary deductions based on integrated attendance & leaves.</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={handleRefresh} disabled={isGenerating}>
            <RefreshCw size={18} className={isGenerating ? 'spin' : ''} style={{ marginRight: '0.5rem' }} />
            {isGenerating ? 'Loading...' : 'Refresh Records'}
          </button>
          <button className="btn-primary" onClick={exportToCSV}>
            <Download size={18} style={{ marginRight: '0.5rem' }} /> Export Report
          </button>
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary-color)' }}>
            <Coins size={24} />
          </div>
          <div className="metric-details">
            <h3>Total Net Payroll ({selectedMonth})</h3>
            <div className="metric-value">PKR {totalPayroll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger-color)' }}>
            <Calendar size={24} />
          </div>
          <div className="metric-details">
            <h3>Calculated Deductions</h3>
            <div className="metric-value" style={{ color: 'var(--danger-color)' }}>
              -PKR {filteredPayroll.reduce((acc, curr) => acc + Number(curr.deductions || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      </div>

      <div className="card table-card">
        <div className="table-actions">
          <div className="search-input">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Search by Employee or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-actions" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <select className="filter-select" value={selectedMonth} onChange={(e) => { setSelectedMonth(e.target.value); }}>
              {comboMonths.map(m => (
                <option key={m} value={m}>{formatMonth(m)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Month</th>
                <th>Base Salary</th>
                <th>Attendance Deductions</th>
                <th>
                  Additions
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>(Bonus/WFH/Sat)</div>
                </th>
                <th>
                  Deductions
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>(Tax/KPI/Loan)</div>
                </th>
                <th>Net Salary</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayroll.map((record) => (
                <tr key={record.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{record.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{record.empId} • {record.department}</div>
                  </td>
                  <td style={{ fontWeight: 500 }}>
                    {formatMonth(record.month)}
                  </td>
                  <td>PKR {Number(record.baseSalary || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', alignItems: 'center' }}>
                      <span className="pill warning">{record.lates} Lates</span>
                      <span className="pill danger">{record.leaves} Abs/Half</span>
                      <div style={{ color: 'var(--danger-color)', fontSize: '0.85rem', fontWeight: 500 }}>
                        -PKR {Number(record.deductions || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>
                      <div style={{ color: 'var(--success-color)' }}>KPI: +{Number(record.kpi_bonus || 0).toFixed(2)}</div>
                      <div style={{ color: 'var(--success-color)' }}>WFH: +{Number(record.wfh_allowance || 0).toFixed(2)}</div>
                      <div style={{ color: 'var(--success-color)' }}>Sat: +{Number(record.saturday_bonus || 0).toFixed(2)}</div>
                      <div style={{ color: 'var(--success-color)', fontWeight: 600 }}>Prev: +{Number(record.prev_balance || 0).toFixed(2)}</div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>
                      <div style={{ color: 'var(--danger-color)' }}>Tax: -{Number(record.tax || 0).toFixed(2)}</div>
                      <div style={{ color: 'var(--danger-color)' }}>KPI Miss: -{Number(record.kpi_deduction || 0).toFixed(2)}</div>
                      <div style={{ color: 'var(--danger-color)' }}>Loan: -{Number(record.loan_deduction || 0).toFixed(2)}</div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--success-color)', fontWeight: 700, fontSize: '1.05rem' }}>
                    PKR {Number(record.netSalary || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div className="action-cell" style={{ flexDirection: 'column', gap: '0.5rem' }}>
                      {record.status === 'Paid' ? (
                        <span className="status-badge paid">Paid</span>
                      ) : (
                        <select
                          className={`status-badge ${record.status.toLowerCase()}`}
                          value={record.status}
                          onChange={e => handleStatusChange(record.id, e.target.value)}
                          style={{ border: 'none', cursor: 'pointer', appearance: 'auto', outline: 'none', fontWeight: 'bold' }}
                        >
                          <option value="Paid">Paid</option>
                          <option value="Unpaid">Unpaid</option>
                          <option value="Processing">Processing</option>
                          <option value="Pending">Pending</option>
                        </select>
                      )}

                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleEditClick(record)}
                          className="action-btn"
                          title="Edit Adjustments"
                          disabled={record.status === 'Paid'}
                          style={record.status === 'Paid' ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                        >
                          <Edit3 size={16} />
                        </button>

                        <button
                          onClick={() => handleDelete(record.id)}
                          className="action-btn"
                          style={record.status === 'Paid' ? { color: 'var(--danger-color)', opacity: 0.5, cursor: 'not-allowed' } : { color: 'var(--danger-color)' }}
                          title="Delete Record"
                          disabled={record.status === 'Paid'}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPayroll.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No payroll records available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingRecord && (
        <div className="modal-overlay payroll-modal" onClick={() => setEditingRecord(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="payroll-modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid #334155' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#f8fafc' }}>Manual Adjustments</h2>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>{editingRecord.name} ({editingRecord.month})</p>
              </div>
              <button onClick={() => setEditingRecord(null)} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            <div className="payroll-modal-body">
              <div className="payroll-form-grid">
                <div className="payroll-form-group">
                  <label>KPI Achievement Bonus</label>
                  <input
                    type="number"
                    value={editForm.kpi_bonus}
                    onChange={e => setEditForm({ ...editForm, kpi_bonus: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="payroll-form-group">
                  <label>KPI Missed Deduction</label>
                  <input
                    type="number"
                    value={editForm.kpi_deduction}
                    onChange={e => setEditForm({ ...editForm, kpi_deduction: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="payroll-form-group">
                  <label>WFH Allowance</label>
                  <input
                    type="number"
                    value={editForm.wfh_allowance}
                    onChange={e => setEditForm({ ...editForm, wfh_allowance: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="payroll-form-group">
                  <label>Tax Deduction</label>
                  <input
                    type="number"
                    value={editForm.tax}
                    onChange={e => setEditForm({ ...editForm, tax: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="payroll-form-group">
                  <label>Loan Recovery</label>
                  <input
                    type="number"
                    value={editForm.loan_deduction}
                    onChange={e => setEditForm({ ...editForm, loan_deduction: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="payroll-form-group">
                  <label>Previous Balance</label>
                  <input
                    type="number"
                    value={editForm.prev_balance}
                    onChange={e => setEditForm({ ...editForm, prev_balance: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="payroll-form-group full-width">
                  <label>Other Commission</label>
                  <input
                    type="number"
                    value={editForm.commission}
                    onChange={e => setEditForm({ ...editForm, commission: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
            <div className="payroll-modal-footer">
              <button className="btn-secondary" onClick={() => setEditingRecord(null)}>Cancel</button>
              <button className="btn-primary" onClick={handleSaveAdjustments}>Save & Recalculate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;
