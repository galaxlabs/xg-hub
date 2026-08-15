import React, { useState, useEffect } from 'react';
import { BuildingIcon, Search, Download } from 'lucide-react';
import type { Employee } from './Employees';
import { fetchEmployees } from '../api';
import './BankDetails.css';

const BankDetails: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchEmployees();
        setEmployees(data);
      } catch (e) {
        console.error(e);
      }
    };
    loadData();
  }, []);

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    emp.bankName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportCSV = () => {
    const headers = ['Employee Name', 'Employee ID', 'Department', 'Bank Name', 'Account / IBAN Number'];
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(',') + "\n" 
      + employees.map(e => `${e.name},${e.id},${e.department},${e.bankName || 'Not Provided'},${e.accountNumber || 'Not Provided'}`).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "bank_details_ledger.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bank-details-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bank Details Ledger</h1>
          <p className="page-subtitle">Centralized view of all employee banking information for payroll processing.</p>
        </div>
        <button className="btn-secondary" onClick={handleExportCSV}>
          <Download size={18} style={{marginRight: '0.5rem'}} /> Export CSV
        </button>
      </div>

      <div className="card table-card">
        <div className="table-actions" style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)' }}>
          <div className="search-input">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search by Employee or Bank..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-actions">
            <div className="ledger-stats">
              <span className="ledger-stat-pill">
                <BuildingIcon size={16} /> Total Records: {employees.length}
              </span>
            </div>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table bank-table">
            <thead>
              <tr>
                <th>Employee Name</th>
                <th>Employee ID</th>
                <th>Department</th>
                <th>Bank Name</th>
                <th>Account / IBAN Number</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.map(emp => (
                <tr key={emp.id}>
                  <td>
                    <div className="emp-name-cell">
                      <div className="emp-avatar small">{emp.name.charAt(0)}</div>
                      <span style={{ fontWeight: 600 }}>{emp.name}</span>
                    </div>
                  </td>
                  <td><span className="emp-id-badge">{emp.id}</span></td>
                  <td><span className="dept-text">{emp.department}</span></td>
                  <td>
                    <div className="bank-name-cell">
                      <BuildingIcon size={16} className="bank-icon" />
                      {emp.bankName || 'Not Provided'}
                    </div>
                  </td>
                  <td>
                    <span className="account-number">{emp.accountNumber || 'Not Provided'}</span>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={5} style={{textAlign: 'center', padding: '3rem', color: 'var(--text-muted)'}}>
                    No banking records match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BankDetails;
