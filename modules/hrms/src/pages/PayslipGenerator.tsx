import React, { useState, useMemo, useEffect, useRef } from 'react';
import { X, Download, Printer, Save, RefreshCw } from 'lucide-react';
import { fetchEmployees, createPayroll, fetchSettings, fetchEmployeeAttendanceStats } from '../api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import type { Employee } from './Employees';
import './PayslipGenerator.css';

const PayslipGenerator: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  // Section 1: Basic Info
  const [empName, setEmpName] = useState('');
  const [email, setEmail] = useState('');

  // Section 2: Salary & Advance
  const [basicSalary, setBasicSalary] = useState<number | ''>('');
  const [allowance, setAllowance] = useState<number | ''>('');
  const [advanceSalary, setAdvanceSalary] = useState<number | ''>('');

  // Section 3: Time & Days
  const [month, setMonth] = useState('March');
  const [year, setYear] = useState('2026');
  const [saturdays, setSaturdays] = useState('');
  const [totalDays, setTotalDays] = useState<number | ''>(22);

  // Section 4: Attendance & Deductions
  const [present, setPresent] = useState<number | ''>('');
  const [half, setHalf] = useState<number | ''>('');
  const [absents, setAbsents] = useState<number | ''>('');
  const [lates, setLates] = useState<number | ''>('');
  const [holidays, setHolidays] = useState<number | ''>('');
  const [paidLeaves, setPaidLeaves] = useState<number | ''>('');

  // Section 5: Performance & Targets
  const [targetAchieved, setTargetAchieved] = useState('Yes');
  const [totalTarget, setTotalTarget] = useState<number | ''>('');
  const [hitTarget, setHitTarget] = useState<number | ''>('');
  const [wfh, setWfh] = useState('');
  const [targetPenalty, setTargetPenalty] = useState<number | ''>('');

  // Section 6: Adjustments, Taxes & Commission
  const [adjustments, setAdjustments] = useState<number | ''>('');
  const [commission, setCommission] = useState<number | ''>('');
  const [taxDeduction, setTaxDeduction] = useState<number | ''>('');

  // Modal View
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);
  const [latePolicy, setLatePolicy] = useState<'Standard' | 'Strict'>('Standard');

  // Parse helper
  const val = (n: number | string | '') => Number(n) || 0;

  const calculations = useMemo(() => {
    const tDays = val(totalDays);
    const bSalary = val(basicSalary);

    // Daily Wage
    const dailyRate = tDays > 0 ? bSalary / tDays : 0;

    // Step 1: Define Earnings (Gross Salary)
    const allow = val(allowance);
    const comm = targetAchieved === 'Yes' ? val(commission) : 0;
    const bonusOvertimeOther = val(adjustments);

    const grossSalary = bSalary + allow + comm + bonusOvertimeOther + (val(saturdays) * dailyRate);

    // Step 2: Define Total Deductions
    const absentDeduct = val(absents) * dailyRate;
    const halfDeduct = (val(half) / 2) * dailyRate;
    const lateDeductionDays = latePolicy === 'Strict' ? val(lates) : Math.floor(val(lates) / 3);
    const lateDeduct = lateDeductionDays * dailyRate;
    const loanDeduct = val(advanceSalary);
    const penalty = targetAchieved === 'No' ? val(targetPenalty) : 0;
    const taxDeduct = val(taxDeduction);

    const totalDeductions = absentDeduct + halfDeduct + lateDeduct + loanDeduct + penalty + taxDeduct;

    // Step 3: Final Calculation
    let netPay = grossSalary - totalDeductions;
    if (netPay < 0) netPay = 0;

    return {
      dailyRate,
      grossSalary,
      allow,
      comm,
      bonusOvertimeOther,
      saturdayBonus: val(saturdays) * dailyRate,
      absentDeduct,
      halfDeduct,
      lateDeduct,
      lateDeductionDays,
      loanDeduct,
      penalty,
      taxDeduct,
      totalDeductions,
      netPay
    };
  }, [basicSalary, allowance, totalDays, present, half, absents, lates, holidays, paidLeaves, targetAchieved, targetPenalty, advanceSalary, commission, adjustments, taxDeduction, saturdays, latePolicy]);

  const sumDays = val(present) + val(lates) + val(half) + val(absents) + val(holidays) + val(paidLeaves);
  const isDaysExceeded = sumDays > val(totalDays);

  const handlePreview = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDaysExceeded) {
      alert(`Validation Error: Total logged attendance days (${sumDays}) exceeds the Total Days set for the Month (${val(totalDays)}). Please adjust.`);
      return;
    }
    if (!selectedEmpId) {
      alert("Please select a registered Employee to calculate their Payslip.");
      return;
    }
    setShowPreview(true);
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveToPayroll = async () => {
    const emp = employees.find(e => e.id === selectedEmpId);
    if (!emp) return;

    setIsSaving(true);
    try {
      const monthMap: Record<string, string> = {
        'January': '01', 'February': '02', 'March': '03', 'April': '04',
        'May': '05', 'June': '06', 'July': '07', 'August': '08',
        'September': '09', 'October': '10', 'November': '11', 'December': '12'
      };
      const formattedMonth = `${year}-${monthMap[month]}`;

      const payrollPayload = {
        id: `PRL-${Math.floor(Math.random() * 100000)}`,
        empId: emp.id,
        name: emp.name,
        department: emp.department,
        baseSalary: val(basicSalary),
        lates: val(lates),
        leaves: val(absents) + val(half) / 2,
        deductions: calculations.absentDeduct + calculations.halfDeduct + calculations.lateDeduct, // Attendance deductions
        netSalary: calculations.netPay,
        commission: calculations.comm,
        status: 'Unpaid',
        month: formattedMonth,
        tax: val(taxDeduction),
        loan_deduction: val(advanceSalary),
        kpi_bonus: calculations.comm,
        kpi_deduction: val(targetAchieved === 'No' ? targetPenalty : 0),
        wfh_allowance: val(wfh),
        prev_balance: val(adjustments),
        saturday_bonus: calculations.saturdayBonus
      };

      console.log("📤 PAYROLL PAYLOAD BEING SENT:", payrollPayload);

      await createPayroll(payrollPayload);
      alert("Successfully saved Payslip payload to the Payroll Ledger Database!");
      setShowPreview(false);
    } catch (e: any) {
      console.error(e);
      alert(`Error saving payroll: ${e.message}`);
    }
    setIsSaving(false);
  };

  useEffect(() => {
    fetchEmployees().then(setEmployees).catch(console.error);
    fetchSettings()
      .then((settings) => {
        if (settings.latePolicy === 'Standard' || settings.latePolicy === 'Strict') {
          setLatePolicy(settings.latePolicy);
        }
      })
      .catch(console.error);
  }, []);

  const handleEmployeeSelect = (id: string) => {
    setSelectedEmpId(id);
    const emp = employees.find(e => e.id === id);
    if (emp) {
      setEmpName(emp.name);
      setEmail(emp.email);
      setBasicSalary(emp.baseSalary);
      setAllowance(emp.allowance || 0);
      setAdvanceSalary(0);
    }
  };

  const handleAutoFillAttendance = async () => {
    if (!selectedEmpId) {
      alert('Please select an employee first');
      return;
    }

    setIsAutoFilling(true);

    try {
      // Format month as YYYY-MM
      const monthMap: Record<string, string> = {
        'January': '01', 'February': '02', 'March': '03', 'April': '04',
        'May': '05', 'June': '06', 'July': '07', 'August': '08',
        'September': '09', 'October': '10', 'November': '11', 'December': '12'
      };
      const formattedMonth = `${year}-${monthMap[month]}`;

      const stats = await fetchEmployeeAttendanceStats(selectedEmpId, formattedMonth);

      // Auto-fill all attendance fields
      setPresent(stats.present);
      setAbsents(stats.absents);
      setHalf(stats.halfDays);
      setLates(stats.lates);
      setPaidLeaves(stats.paidLeaves);

      alert('Attendance data auto-filled successfully!');
    } catch (error: any) {
      console.error('Auto-fill error:', error);
      alert(`Failed to auto-fill attendance: ${error.message}`);
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;

    // Cleanly hide action buttons during generating the PDF canvas
    const actionButtons = printRef.current.querySelector('.ps-modal-actions') as HTMLElement;
    if (actionButtons) actionButtons.style.display = 'none';

    // Remove any scrolling constraints on the modal temporarily so the full payload renders without cutting off
    const parentModal = document.querySelector('.ps-modal-content') as HTMLElement;
    const oldStyles = { maxHeight: '', overflowY: '' };
    if (parentModal) {
      oldStyles.maxHeight = parentModal.style.maxHeight;
      oldStyles.overflowY = parentModal.style.overflowY;
      parentModal.style.maxHeight = 'none';
      parentModal.style.overflowY = 'visible';
    }

    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        height: printRef.current.scrollHeight,
        windowHeight: printRef.current.scrollHeight
      });
      const imgData = canvas.toDataURL('image/png');
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const pdf = new jsPDF('p', 'mm', [pdfWidth, pdfHeight]);
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Payslip_${empName.replace(/\s+/g, '_')}_${month}_${year}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Error generating PDF Export");
    } finally {
      if (actionButtons) actionButtons.style.display = 'flex';
      // Restore modal scrolling functionality
      if (parentModal) {
        parentModal.style.maxHeight = oldStyles.maxHeight;
        parentModal.style.overflowY = oldStyles.overflowY;
      }
    }
  };

  return (
    <div className="ps-page">
      <div className="ps-header-bar">
        <h1 className="ps-title">Payslip Generator</h1>
        <div className="ps-branding">
          <span className="ps-company-name">XPERTS GLOBAL</span>
          <img src="/payslip-logo.svg" alt="Xperts Global" style={{ width: '28px', height: '28px', objectFit: 'contain', marginLeft: '0.5rem' }} />
        </div>
      </div>

      <form onSubmit={handlePreview}>
        {/* SECTION 1: Basic Info */}
        <div className="ps-section">
          <h2 className="ps-section-title">Basic Info</h2>
          <div className="ps-grid-2">
            <div className="ps-form-group">
              <label className="ps-label">Select Employee</label>
              <select className="ps-input" value={selectedEmpId} onChange={e => handleEmployeeSelect(e.target.value)}>
                <option value="">-- Choose User Profile --</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.id})</option>)}
              </select>
            </div>
            <div className="ps-form-group">
              <label className="ps-label">Auto-Linked Email</label>
              <input type="email" className="ps-input" placeholder="bauhaus@gmail.com" disabled value={email} />
            </div>
          </div>
        </div>

        {/* SECTION 2: Salary & Advance */}
        <div className="ps-section">
          <h2 className="ps-section-title">Salary & Advance</h2>
          <div className="ps-grid-3">
            <div className="ps-form-group">
              <label className="ps-label">Basic Salary</label>
              <input type="number" className="ps-input" placeholder="Basic Salary" value={basicSalary} onChange={e => setBasicSalary(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
            <div className="ps-form-group">
              <label className="ps-label">Allowance</label>
              <input type="number" className="ps-input" placeholder="Allowance" value={allowance} onChange={e => setAllowance(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
            <div className="ps-form-group">
              <label className="ps-label">Advance Salary / Loan</label>
              <input type="number" className="ps-input" placeholder="Advance Salary" value={advanceSalary} onChange={e => setAdvanceSalary(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
          </div>
        </div>

        {/* SECTION 3: Time & Days */}
        <div className="ps-section">
          <h2 className="ps-section-title">Time & Days</h2>
          <div className="ps-grid-2">
            <div className="ps-form-group">
              <label className="ps-label">Select Month & Year</label>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <select className="ps-input" style={{ flex: 1 }} value={month} onChange={e => setMonth(e.target.value)}>
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <input type="text" className="ps-input" style={{ flex: 1 }} placeholder="YYYY" value={year} onChange={e => setYear(e.target.value)} />
              </div>
              <button
                type="button"
                className="ps-btn-preview"
                style={{
                  marginTop: '0.75rem',
                  background: 'linear-gradient(135deg, #ef4444 0%, #ec4899 100%)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer'
                }}
                onClick={handleAutoFillAttendance}
                disabled={isAutoFilling || !selectedEmpId}
              >
                <RefreshCw size={18} style={{ marginRight: '0.5rem', display: 'inline-block', verticalAlign: 'text-bottom', animation: isAutoFilling ? 'spin 1s linear infinite' : 'none' }} />
                {isAutoFilling ? 'Fetching Attendance...' : 'Auto-fill Attendance'}
              </button>
            </div>
            <div className="ps-grid-2">
              <div className="ps-form-group">
                <label className="ps-label">Saturdays</label>
                <input type="text" className="ps-input" placeholder="Working Sat" value={saturdays} onChange={e => setSaturdays(e.target.value)} />
              </div>
              <div className="ps-form-group">
                <label className="ps-label">Total Days</label>
                <input type="number" className="ps-input" placeholder="22" value={totalDays} onChange={e => setTotalDays(e.target.value === '' ? '' : Number(e.target.value))} />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: Attendance & Deductions */}
        <div className="ps-section">
          <h2 className="ps-section-title">Attendance & Deductions</h2>
          <div className="ps-grid-3">
            <div className="ps-form-group">
              <label className="ps-label">Present</label>
              <input type="number" className="ps-input" placeholder="Present" value={present} onChange={e => setPresent(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
            <div className="ps-form-group">
              <label className="ps-label">Half</label>
              <input type="number" className="ps-input" placeholder="Half" value={half} onChange={e => setHalf(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
            <div className="ps-form-group">
              <label className="ps-label">Absents</label>
              <input type="number" className="ps-input" placeholder="Absents" value={absents} onChange={e => setAbsents(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
            <div className="ps-form-group">
              <label className="ps-label">Lates</label>
              <input type="number" className="ps-input" placeholder="Lates" value={lates} onChange={e => setLates(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
            <div className="ps-form-group">
              <label className="ps-label">Holidays</label>
              <input type="number" className="ps-input" placeholder="Holidays" value={holidays} onChange={e => setHolidays(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
            <div className="ps-form-group">
              <label className="ps-label">Paid Leaves</label>
              <input type="number" className="ps-input" placeholder="Paid Leaves" value={paidLeaves} onChange={e => setPaidLeaves(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
          </div>
        </div>

        {/* SECTION 5: Performance & Targets */}
        <div className="ps-section">
          <h2 className="ps-section-title">Performance & Targets</h2>
          <div className="ps-grid-3">
            <div className="ps-form-group" style={{ gridColumn: 'span 2' }}>
              <label className="ps-label">Target Achieved</label>
              <select className="ps-input" value={targetAchieved} onChange={e => setTargetAchieved(e.target.value)}>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </div>
            <div className="ps-form-group">
              <label className="ps-label">Total Target</label>
              <input type="number" className="ps-input" placeholder="Target" value={totalTarget} onChange={e => setTotalTarget(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
            <div className="ps-form-group">
              <label className="ps-label">Hit Target</label>
              <input type="number" className="ps-input" placeholder="Hit" value={hitTarget} onChange={e => setHitTarget(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
            <div className="ps-form-group">
              <label className="ps-label">WFH</label>
              <input type="text" className="ps-input" placeholder="WFH" value={wfh} onChange={e => setWfh(e.target.value)} />
            </div>
            <div className="ps-form-group">
              <label className="ps-label">Target Not Achieved Amount</label>
              <input type="number" className="ps-input" placeholder="Target Not Achieved Amount" disabled={targetAchieved === 'Yes'} value={targetPenalty} onChange={e => setTargetPenalty(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
          </div>
        </div>

        {/* SECTION 6: Adjustments, Taxes & Commission */}
        <div className="ps-section">
          <h2 className="ps-section-title">Adjustments, Taxes & Commission</h2>
          <div className="ps-grid-3">
            <div className="ps-form-group">
              <label className="ps-label">Tax Deduction</label>
              <input type="number" className="ps-input" placeholder="Tax Amount" value={taxDeduction} onChange={e => setTaxDeduction(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
            <div className="ps-form-group">
              <label className="ps-label">Adjustments</label>
              <input type="number" className="ps-input" placeholder="Remaining Amount" value={adjustments} onChange={e => setAdjustments(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
            <div className="ps-form-group">
              <label className="ps-label">Commission</label>
              <input type="number" className="ps-input" placeholder="Commission" disabled={targetAchieved === 'No'} value={commission} onChange={e => setCommission(e.target.value === '' ? '' : Number(e.target.value))} />
            </div>
          </div>
        </div>

        <button type="submit" className="ps-btn-preview">Preview Pay Slip</button>
      </form>

      {/* Modal Preview */}
      {showPreview && (
        <div className="ps-modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="ps-modal-content" onClick={e => e.stopPropagation()}>
            <div ref={printRef} className="ps-preview-card">
              <div className="ps-modal-header ps-no-print" data-html2canvas-ignore="true">
                <h2>Payslip Preview</h2>
                <button className="ps-no-print ps-close-btn" onClick={() => setShowPreview(false)}>
                  <X size={24} />
                </button>
              </div>
              <div className="ps-modal-body">
                <div className="ps-company-print-header">
                  <div className="ps-company-info">
                    <img src="/payslip-logo.svg" alt="Xperts Global Logo" />
                    <div>
                      <h2>Xperts Global</h2>
                      <p>Official Employee Remuneration Document</p>
                    </div>
                  </div>
                  <div className="ps-payslip-info">
                    <p className="ps-payslip-label">Payslip</p>
                    <p className="ps-payslip-date">{month} {year}</p>
                    <p className="ps-generated-date">Generated: {new Date().toLocaleDateString()}</p>
                  </div>
                </div>
                <table className="ps-slip-table">
                  <tbody>
                    <tr>
                      <th>Employee Name</th>
                      <td>{empName}</td>
                    </tr>
                    <tr>
                      <th>Email Address</th>
                      <td>{email}</td>
                    </tr>
                    <tr>
                      <th>Base / Basic Salary</th>
                      <td>PKR {val(basicSalary).toLocaleString()}</td>
                    </tr>
                    <tr>
                      <th>Calculated Daily Rate</th>
                      <td style={{ fontFamily: 'monospace' }}>PKR {calculations.dailyRate.toFixed(2)} / day</td>
                    </tr>
                    <tr>
                      <td colSpan={2}><hr style={{ borderTop: '1px solid #e5e7eb', margin: '0.5rem 0' }} /></td>
                    </tr>
                    <tr>
                      <th colSpan={2} style={{ background: '#f9fafb', textAlign: 'center', color: '#4b5563', fontWeight: 'bold' }}>
                        ATTENDANCE & PERFORMANCE SUMMARY
                      </th>
                    </tr>
                    <tr>
                      <th>Total Month Days</th>
                      <td>{val(totalDays)} Days {saturdays ? `(Incl. Sat: ${saturdays})` : ''}</td>
                    </tr>
                    <tr>
                      <th>Attendance Overview</th>
                      <td style={{ fontSize: '0.9rem', color: '#374151', lineHeight: '1.4' }}>
                        Present: <strong>{val(present)}</strong> | Half: <strong>{val(half)}</strong> | Absents: <strong>{val(absents)}</strong> | Lates: <strong>{val(lates)}</strong><br />
                        Holidays: <strong>{val(holidays)}</strong> | Paid Leaves: <strong>{val(paidLeaves)}</strong> | WFH: <strong>{wfh || '0'}</strong>
                      </td>
                    </tr>
                    <tr>
                      <th>KPI / Targets</th>
                      <td style={{ fontSize: '0.9rem', color: '#374151' }}>
                        Target Achieved: <strong>{targetAchieved}</strong>
                        {val(totalTarget) > 0 && ` | Total Target: ${val(totalTarget)}`}
                        {val(hitTarget) > 0 && ` | Hit Target: ${val(hitTarget)}`}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2}><hr style={{ borderTop: '1px solid #e5e7eb', margin: '0.5rem 0' }} /></td>
                    </tr>
                    <tr>
                      <th colSpan={2} style={{ background: '#f9fafb', textAlign: 'center', color: '#059669', fontWeight: 'bold' }}>
                        EARNINGS
                      </th>
                    </tr>
                    {calculations.allow > 0 && (
                      <tr>
                        <th>Allowances</th>
                        <td className="positive">+ PKR {calculations.allow.toLocaleString()}</td>
                      </tr>
                    )}
                    {calculations.comm > 0 && (
                      <tr>
                        <th>Commission (Target Achieved)</th>
                        <td className="positive">+ PKR {calculations.comm.toLocaleString()}</td>
                      </tr>
                    )}
                    {calculations.bonusOvertimeOther > 0 && (
                      <tr>
                        <th>Adjustments</th>
                        <td className="positive">+ PKR {calculations.bonusOvertimeOther.toLocaleString()}</td>
                      </tr>
                    )}
                    <tr>
                      <th>Total Gross Salary</th>
                      <td className="positive" style={{ fontWeight: 'bold', fontSize: '1.05rem' }}>+ PKR {calculations.grossSalary.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                    <tr>
                      <td colSpan={2}><hr style={{ borderTop: '1px solid #e5e7eb', margin: '0.5rem 0' }} /></td>
                    </tr>
                    <tr>
                      <th colSpan={2} style={{ background: '#f9fafb', textAlign: 'center', color: '#ef4444', fontWeight: 'bold' }}>
                        DEDUCTIONS
                      </th>
                    </tr>
                    {calculations.halfDeduct > 0 && (
                      <tr>
                        <th>Half-Day Deduction ({half})</th>
                        <td className="negative">- PKR {calculations.halfDeduct.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    )}
                    {calculations.absentDeduct > 0 && (
                      <tr>
                        <th>Absence Deduction ({absents})</th>
                        <td className="negative">- PKR {calculations.absentDeduct.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    )}
                    {calculations.lateDeduct > 0 && (
                      <tr>
                        <th>
                          Lateness Deduction ({lates} implies {calculations.lateDeductionDays} deductions via {latePolicy} policy)
                        </th>
                        <td className="negative">- PKR {calculations.lateDeduct.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    )}
                    {calculations.loanDeduct > 0 && (
                      <tr>
                        <th>Advance Salary Repayment</th>
                        <td className="negative">- PKR {calculations.loanDeduct.toLocaleString()}</td>
                      </tr>
                    )}
                    {calculations.penalty > 0 && (
                      <tr>
                        <th>Missed Target Penalty</th>
                        <td className="negative">- PKR {calculations.penalty.toLocaleString()}</td>
                      </tr>
                    )}
                    {calculations.taxDeduct > 0 && (
                      <tr>
                        <th>Tax Deduction</th>
                        <td className="negative">- PKR {calculations.taxDeduct.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    )}
                    <tr>
                      <th>Total Deductions</th>
                      <td className="negative" style={{ fontWeight: 'bold' }}>- PKR {calculations.totalDeductions.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="ps-slip-total" style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '12px', padding: '1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, color: '#991b1b', fontSize: '1.2rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Net Pay Transferred</h3>
                  <div className="net-amount" style={{ fontSize: '2.2rem', fontWeight: 800, color: '#dc2626', whiteSpace: 'nowrap' }}>PKR {calculations.netPay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between', color: '#6b7280', fontSize: '0.85rem' }}>
                  <p>This is a computer-generated document. No signature is required.</p>
                  <p><strong>Xperts Global HQ</strong></p>
                </div>

                <div className="ps-modal-actions ps-no-print" style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button onClick={handlePrint} className="ps-btn-preview" style={{ margin: 0, flex: 1, backgroundColor: '#374151' }}>
                    <Printer size={18} style={{ marginRight: 8, display: 'inline-block', verticalAlign: 'text-bottom' }} /> Print
                  </button>
                  <button onClick={handleSaveToPayroll} disabled={isSaving} className="ps-btn-preview" style={{ margin: 0, flex: 2, backgroundColor: '#10b981' }}>
                    <Save size={18} style={{ marginRight: 8, display: 'inline-block', verticalAlign: 'text-bottom' }} /> {isSaving ? 'Saving...' : 'Save into Payroll Ledger'}
                  </button>
                  <button onClick={handleDownloadPDF} className="ps-btn-preview" style={{ margin: 0, flex: 1 }}>
                    <Download size={18} style={{ marginRight: 8, display: 'inline-block', verticalAlign: 'text-bottom' }} /> PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayslipGenerator;