import BusinessHours from './BusinessHours';
import { Target, AlertCircle, Clock, CheckCircle, XCircle, BellRing, Save, Upload, Trash2, Mail, Phone, User } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';
import CompanyMultiSelect from './CompanyMultiSelect';
import { parseFullAddress } from '../lib/geocode';
export default function LeadTracker({ leads, setLeads, triggerNotification, userRole, currentUser, lockedStatus, companies, pendingLeadId, setPendingLeadId }) {
  const PIPELINE_STAGES = [
    'Pending',
    'Submitted',
    'Approved',
    'Request for Agreement',
    'Agreement Sent',
    'Re-approval',
    'Signed',
    'Installed',
    'Rejected',
    'Denied - Not Interested',
    'Denied - Offer Issue'
  ];
  const [selectedLead, setSelectedLead] = useState(null);
  const [notes, setNotes] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');
  const [status, setStatus] = useState('Pending');
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [businessName, setBusinessName] = useState('');
  const [details, setDetails] = useState({
    operatingCompany: '', priority: 'Normal', executiveName: '', branch: '', ownerName: '', businessType: '',
    address: '', stateProvince: '', stateCode: '', zipCode: '', city: '', country: '',
    fullAddress: '', mapLink: '', latitude: '', longitude: '',
    businessPhone: '', personalCellPhone: '',
    contractLength: '', baseRent: '', hours: '', percentage: '', commissionAmount: '', openingHours: null,
    approveDate: '', agreementSentDate: '', signDate: '', convertDate: '',
    installDate: '', removeDate: '', signRejectedDate: '',
    reference: '', signBy: '', leadOwner: ''
  });
  const fileInputRef = useRef(null);
  const [activeTab, setActiveTab] = useState(lockedStatus || 'Pending');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (lockedStatus) {
      setActiveTab(lockedStatus);
    }
  }, [lockedStatus]);

  useEffect(() => {
    if (pendingLeadId) {
      const lead = leads.find(l => l.id === pendingLeadId);
      if (lead) {
        setActiveTab(lead.status);
        openLead(lead);
      }
      setPendingLeadId(null);
    }
  }, [pendingLeadId, leads]);

  // datetime-local input ke liye format ("YYYY-MM-DDTHH:mm")
  const formatForInput = (dateValue) => {
    if (!dateValue) return '';
    return new Date(dateValue).toISOString().slice(0, 16);
  };

  // date input ke liye format ("YYYY-MM-DD")
  const formatDateOnly = (dateValue) => {
    if (!dateValue) return '';
    return new Date(dateValue).toISOString().slice(0, 10);
  };

  const openLead = async (lead) => {
    setSelectedLead(lead);
    setNotes(lead.notes || '');
    setFollowUpTime(lead.followUpTime || '');
    setStatus(lead.status);
    setError('');
    setHistory([]);

    setBusinessName(lead.company || '');
    setDetails({
      operatingCompany: lead.operatingCompany || '',
      priority: lead.priority || 'Normal',
      approvedForCompanies: lead.approvedForCompanies || '',
      executiveName: lead.executiveName || '',
      branch: lead.branch || '',
      ownerName: lead.ownerName || '',
      businessType: lead.businessType || '',
      address: lead.address || '',
      stateProvince: lead.stateProvince || '',
      stateCode: lead.stateCode || '',
      zipCode: lead.zipCode || '',
      city: lead.city || '',
      country: lead.country || '',
      fullAddress: lead.fullAddress || '',
      mapLink: lead.mapLink || '',
      latitude: lead.latitude || '',
      longitude: lead.longitude || '',
      businessPhone: lead.businessPhone || '',
      personalCellPhone: lead.personalCellPhone || '',
      contractLength: lead.contractLength || '',
      baseRent: lead.baseRent || '',
      hours: lead.hours || '',
      percentage: lead.percentage || '',
      commissionAmount: lead.commissionAmount || '',
      openingHours: lead.openingHours || null,
      approveDate: formatDateOnly(lead.approveDate),
      agreementSentDate: formatDateOnly(lead.agreementSentDate),
      signDate: formatDateOnly(lead.signDate),
      convertDate: formatDateOnly(lead.convertDate),
      installDate: formatDateOnly(lead.installDate),
      removeDate: formatDateOnly(lead.removeDate),
      signRejectedDate: formatDateOnly(lead.signRejectedDate),
      reference: lead.reference || '',
      signBy: lead.signBy || '',
      leadOwner: lead.leadOwner || ''
    });

    try {
      const res = await fetch(`/api/leads/${lead.id}/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('History load error:', err);
    }
  };

  const updateDetail = (field, value) => {
    setDetails(prev => ({ ...prev, [field]: value }));
  };

  const toggleApprovedCompany = (companyName) => {
    const current = details.approvedForCompanies
      ? details.approvedForCompanies.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const updated = current.includes(companyName)
      ? current.filter(c => c !== companyName)
      : [...current, companyName];
    updateDetail('approvedForCompanies', updated.join(', '));
  };

  const handleAddressBlur = async () => {
    if (!details.fullAddress?.trim()) return;
    const parsed = await parseFullAddress(details.fullAddress);
    if (parsed) {
      setDetails(prev => ({
        ...prev,
        address: parsed.address || prev.address,
        city: parsed.city || prev.city,
        stateProvince: parsed.stateProvince || prev.stateProvince,
        stateCode: parsed.stateCode || prev.stateCode,
        zipCode: parsed.zipCode || prev.zipCode,
        country: parsed.country || prev.country
      }));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!notes.trim()) {
      setError('Sales notes are strictly mandatory.');
      return;
    }
    if (!followUpTime) {
      setError('Follow-up time is mandatory for accurate tracking.');
      return;
    }

    try {
      const res = await fetch(`/api/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          notes,
          followUpTime,
          changedById: currentUser?.id,
          company: businessName,
          ...details
        })
      });

      if (res.ok) {
        const updatedLead = await res.json();
        const updatedLeads = leads.map(l =>
          l.id === selectedLead.id ? updatedLead : l
        );
        setLeads(updatedLeads);
        setSelectedLead(null);
      } else {
        setError('Error while saving lead. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setError('Error while connecting to server. Please try again.');
    }
  };

  const handleRequestAgreement = async () => {
    if (!notes.trim()) {
      setError('Sales notes are strictly mandatory.');
      return;
    }
    if (!followUpTime) {
      setError('Follow-up time is mandatory for accurate tracking.');
      return;
    }

    try {
      const res = await fetch(`/api/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          notes,
          followUpTime,
          changedById: currentUser?.id,
          company: businessName,
          ...details
        })
      });

      if (res.ok) {
        const updatedLead = await res.json();
        const updatedLeads = leads.map(l =>
          l.id === selectedLead.id ? updatedLead : l
        );
        setLeads(updatedLeads);
        setSelectedLead(null);
      } else {
        setError('Error while connecting to server. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setError('Error while connecting to server. Please try again.');
    }
  };

  const handleSubmitForApproval = async () => {
    if (!notes.trim()) {
      setError('Sales notes are strictly mandatory.');
      return;
    }
    if (!followUpTime) {
      setError('Follow-up time is mandatory for accurate tracking.');
      return;
    }

    try {
      const res = await fetch(`/api/leads/${selectedLead.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          notes,
          followUpTime,
          changedById: currentUser?.id,
          company: businessName,
          ...details
        })
      });
      if (res.ok) {
        const updatedLead = await res.json();
        const updatedLeads = leads.map(l =>
          l.id === selectedLead.id ? updatedLead : l
        );
        setLeads(updatedLeads);
        setSelectedLead(null);
      } else {
        setError('Error while submitting lead. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setError('Error while connecting to server. Please try again.');
    }
  };

  const getStatusColor = (s) => {
    switch (s) {
      case 'Pending': return 'var(--bx-text-muted)';
      case 'Submitted': return 'var(--bx-accent-blue)';
      case 'Approved': return 'var(--bx-accent-green)';
      case 'Request for Agreement': return 'var(--bx-accent-orange)';
      case 'Agreement Sent': return 'var(--bx-accent-orange)';
      case 'Re-approval': return 'var(--bx-accent-orange)';
      case 'Signed': return 'var(--bx-accent-green)';
      case 'Installed': return 'var(--bx-accent-green)';
      case 'Rejected': return 'var(--bx-accent-red)';
      case 'Denied - Not Interested': return 'var(--bx-accent-red)';
      case 'Denied - Offer Issue': return 'var(--bx-accent-red)';
      default: return 'var(--bx-text-muted)';
    }
  };

  const handleImportLeads = (e) => {
    const file = e.target.files[0];
    if (file) {
      alert(`Importing leads from ${file.name}...`);
      setTimeout(() => {
        setLeads([
          ...leads,
          { id: Date.now(), company: 'New Imported Lead', contact: 'imported@client.com', status: 'Pending', notes: '', followUpTime: '', createdAt: new Date().toISOString() },
          { id: Date.now() + 1, company: 'Another Import', contact: 'another@client.com', status: 'Pending', notes: '', followUpTime: '', createdAt: new Date().toISOString() }
        ]);
        alert('Leads successfully imported!');
      }, 1000);
    }
  };

  const handleDeleteLead = (id) => {
    if (window.confirm("Are you sure you want to delete this lead?")) {
      setLeads(leads.filter(l => l.id !== id));
    }
  };

  const isAdmin = userRole === 'Admin' || userRole === 'Super Admin';

  const visibleLeads = isAdmin
    ? (lockedStatus
      ? leads
      : leads.filter(lead =>
        lead.status !== 'Pending' &&
        lead.status !== 'Submitted' &&
        lead.status !== 'Request for Agreement'
      ))
    : leads.filter(lead => lead.createdById === currentUser?.id);

  const stageFilteredLeads = visibleLeads.filter(lead => lead.status === activeTab);

  const filteredLeads = searchQuery.trim()
    ? stageFilteredLeads.filter(lead => {
      const q = searchQuery.toLowerCase();
      return [
        lead.company, lead.contact, lead.createdBy?.name,
        lead.businessType, lead.stateCode, lead.address, lead.city,
        lead.ownerName, lead.businessPhone, lead.personalCellPhone,
        lead.status, lead.notes, lead.executiveName, lead.branch
      ].some(field => field && field.toString().toLowerCase().includes(q));
    })
    : stageFilteredLeads;

  return (
    <div className="bx-content" style={{ overflowY: 'auto' }}>
      <div className="bx-content-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="bx-page-title">{lockedStatus === 'Submitted' ? 'Leads Submission' : (lockedStatus ? lockedStatus : 'Lead Tracker (Advanced)')}</h1>
          <p style={{ color: 'var(--bx-text-muted)' }}>Track pending contracts, convert leads, and schedule mandatory follow-ups.</p>
        </div>
        <input
          type="text"
          placeholder="Search leads (company, owner, phone, notes...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field"
          style={{ maxWidth: '280px' }}
        />
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="file"
            accept=".csv, .xlsx"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleImportLeads}
          />
          <button
            className="bx-btn"
            onClick={() => fileInputRef.current.click()}
            title="Import Leads from CSV"
          >
            <Upload size={16} /> Import Leads
          </button>


        </div>
      </div>

      {!lockedStatus && (
        <div style={{
          display: 'flex',
          gap: '4px',
          padding: '0 20px',
          borderBottom: '1px solid var(--bx-border)',
          overflowX: 'auto'
        }}>
          {PIPELINE_STAGES.map(stage => {
            const count = visibleLeads.filter(l => l.status === stage).length;
            return (
              <button
                key={stage}
                onClick={() => setActiveTab(stage)}
                style={{
                  padding: '10px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === stage ? '2px solid var(--bx-accent-blue)' : '2px solid transparent',
                  color: activeTab === stage ? 'var(--bx-accent-blue)' : 'var(--bx-text-muted)',
                  fontWeight: activeTab === stage ? 600 : 400,
                  fontSize: '13px',
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
                }}
              >
                {stage} <span style={{ opacity: 0.6 }}>({count})</span>
              </button>
            );
          })}
        </div>
      )
      }

      <div style={{ padding: '20px' }}>
        <div className="bx-table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--bx-border)', color: 'var(--bx-text-muted)' }}>
                <th style={{ padding: '12px' }}>Date Added</th>
                <th style={{ padding: '12px' }}>Created By</th>
                <th style={{ padding: '12px' }}>Business Name</th>
                <th style={{ padding: '12px' }}>Business Type</th>
                <th style={{ padding: '12px' }}>State Code</th>
                <th style={{ padding: '12px' }}>Location</th>
                <th style={{ padding: '12px' }}>Owner Details</th>
                <th style={{ padding: '12px' }}>Business Number</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px' }}>Priority</th>
                <th style={{ padding: '12px' }}>Follow-Up Time</th>
                <th style={{ padding: '12px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLeads.map(lead => (
                <tr key={lead.id} style={{ borderBottom: '1px solid var(--bx-border)' }}>
                  <td style={{ padding: '16px 12px', color: 'var(--bx-text-muted)' }}>{new Date(lead.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '16px 12px', color: 'var(--bx-text-muted)' }}>{lead.createdBy?.name || '—'}</td>
                  <td style={{ padding: '16px 12px', fontWeight: 600 }}>{lead.company}</td>
                  <td style={{ padding: '16px 12px', color: 'var(--bx-text-muted)' }}>{lead.businessType || '—'}</td>
                  <td style={{ padding: '16px 12px', color: 'var(--bx-text-muted)' }}>{lead.stateCode || '—'}</td>
                  <td style={{ padding: '16px 12px', color: 'var(--bx-text-muted)' }}>{lead.address || '—'}</td>
                  <td style={{ padding: '16px 12px' }}>
                    <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={12} /> {lead.ownerName || '—'}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--bx-text-muted)' }}><Mail size={12} /> {lead.contact || '—'}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--bx-text-muted)' }}><Phone size={12} /> {lead.personalCellPhone || '—'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 12px', color: 'var(--bx-text-muted)' }}>{lead.businessPhone || '—'}</td>
                  <td style={{ padding: '16px 12px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      color: getStatusColor(lead.status),
                      border: `1px solid ${getStatusColor(lead.status)}`,
                      background: 'rgba(255,255,255,0.05)',
                      whiteSpace: 'nowrap',
                      display: 'inline-block'
                    }}>
                      {lead.status}
                    </span>
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                      color: lead.priority === 'Critical' ? 'var(--bx-accent-red)' : lead.priority === 'High' ? 'var(--bx-accent-orange)' : lead.priority === 'Low' ? 'var(--bx-text-muted)' : 'var(--bx-accent-blue)',
                      border: `1px solid ${lead.priority === 'Critical' ? 'var(--bx-accent-red)' : lead.priority === 'High' ? 'var(--bx-accent-orange)' : lead.priority === 'Low' ? 'var(--bx-text-muted)' : 'var(--bx-accent-blue)'}`
                    }}>
                      {lead.priority || 'Normal'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    {lead.followUpTime ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--bx-text-muted)' }}>{new Date(lead.followUpTime).toLocaleDateString()}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={14} color="var(--bx-accent-orange)" /> {new Date(lead.followUpTime).toLocaleTimeString()}
                        </span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--bx-accent-red)' }}>Unscheduled</span>
                    )}
                  </td>
                  <td style={{ padding: '16px 12px' }}>
                    {isAdmin ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="bx-btn" onClick={() => openLead(lead)}>Update</button>
                        <button
                          className="bx-btn"
                          style={{ padding: '8px', color: 'var(--bx-accent-red)' }}
                          onClick={() => handleDeleteLead(lead.id)}
                          title="Delete Lead"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ) : (
                      <button className="bx-btn" onClick={() => openLead(lead)}>View</button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredLeads.length === 0 && (
                <tr>
                  <td colSpan="12" style={{ padding: '40px', textAlign: 'center', color: 'var(--bx-text-muted)' }}>
                    There is no Lead available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>


      {
        selectedLead && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Target color="var(--bx-accent-blue)" /> {isAdmin ? 'Update Lead: ' : 'View Lead: '}{selectedLead.company}
              </h2>

              <form onSubmit={handleSave}>
                <fieldset disabled={!isAdmin} style={{ border: 'none', padding: 0, margin: 0 }}>

                  {details.operatingCompany && details.operatingCompany.split(',').map(s => s.trim()).filter(Boolean).length > 0 && (
                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bx-accent-orange)', borderRadius: '8px', marginBottom: '14px' }}>
                      <h3 style={{ fontSize: '13px', margin: '0 0 10px 0', color: 'var(--bx-accent-orange)' }}>Approved For Company</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {details.operatingCompany.split(',').map(s => s.trim()).filter(Boolean).map(companyName => {
                          const approvedList = details.approvedForCompanies
                            ? details.approvedForCompanies.split(',').map(s => s.trim()).filter(Boolean)
                            : [];
                          return (
                            <label key={companyName} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={approvedList.includes(companyName)}
                                onChange={() => toggleApprovedCompany(companyName)}
                              />
                              {companyName}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Status Pipeline</label>
                  <select
                    className="input-field"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}
                  >
                    {PIPELINE_STAGES.map(stage => (
                      <option key={stage} value={stage} style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}>
                        {stage}
                      </option>
                    ))}
                  </select>

                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bx-border)', borderRadius: '8px', marginTop: '14px' }}>
                    <h3 style={{ fontSize: '13px', margin: '0 0 10px 0', color: 'var(--bx-accent-blue)' }}>Basic Info</h3>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Business Name</label>
                      <input className="input-field" value={businessName} onChange={(e) => setBusinessName(e.target.value)} disabled={!isAdmin} />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Priority</label>
                      <select
                        className="input-field"
                        value={details.priority}
                        onChange={(e) => updateDetail('priority', e.target.value)}
                        disabled={!isAdmin}
                        style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}
                      >
                        <option value="Critical" style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}>Critical</option>
                        <option value="High" style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}>High</option>
                        <option value="Normal" style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}>Normal</option>
                        <option value="Low" style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}>Low</option>
                      </select>
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Company (Operating Company)</label>
                      <CompanyMultiSelect
                        companies={companies}
                        value={details.operatingCompany}
                        onChange={(val) => updateDetail('operatingCompany', val)}
                        disabled={!isAdmin}
                      />
                    </div>
                    <div className="bx-form-grid-2">
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Executive Name</label>
                        <input className="input-field" value={details.executiveName} onChange={(e) => updateDetail('executiveName', e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Branch</label>
                        <input className="input-field" value={details.branch} onChange={(e) => updateDetail('branch', e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Owner Name</label>
                        <input className="input-field" value={details.ownerName} onChange={(e) => updateDetail('ownerName', e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Business Type</label>
                        <input className="input-field" value={details.businessType} onChange={(e) => updateDetail('businessType', e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bx-border)', borderRadius: '8px', marginTop: '14px' }}>
                    <h3 style={{ fontSize: '13px', margin: '0 0 10px 0', color: 'var(--bx-accent-blue)' }}>Address</h3>
                    <div className="bx-form-grid-2">
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Address</label>
                        <input className="input-field" value={details.address} onChange={(e) => updateDetail('address', e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>City</label>
                        <input className="input-field" value={details.city} onChange={(e) => updateDetail('city', e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>State/Province</label>
                        <input className="input-field" value={details.stateProvince} onChange={(e) => updateDetail('stateProvince', e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>State Code</label>
                        <input className="input-field" value={details.stateCode} onChange={(e) => updateDetail('stateCode', e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Zip/Postal Code</label>
                        <input className="input-field" value={details.zipCode} onChange={(e) => updateDetail('zipCode', e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Country</label>
                        <input className="input-field" value={details.country} onChange={(e) => updateDetail('country', e.target.value)} />
                      </div>
                    </div>
                    <div style={{ marginTop: '10px' }}>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Full Address</label>
                      <textarea
                        className="input-field"
                        rows="2"
                        value={details.fullAddress}
                        onChange={(e) => updateDetail('fullAddress', e.target.value)}
                        onBlur={handleAddressBlur}
                      />
                      <div style={{ fontSize: '11px', color: 'var(--bx-text-muted)', marginTop: '-10px' }}>

                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Map Link</label>
                        <input className="input-field" value={details.mapLink} onChange={(e) => updateDetail('mapLink', e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Latitude</label>
                        <input className="input-field" value={details.latitude} onChange={(e) => updateDetail('latitude', e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Longitude</label>
                        <input className="input-field" value={details.longitude} onChange={(e) => updateDetail('longitude', e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bx-border)', borderRadius: '8px', marginTop: '14px' }}>
                    <h3 style={{ fontSize: '13px', margin: '0 0 10px 0', color: 'var(--bx-accent-blue)' }}>Contact Information</h3>
                    <div className="bx-form-grid-2">
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Business Phone Number</label>
                        <input className="input-field" value={details.businessPhone} onChange={(e) => updateDetail('businessPhone', e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Personal Cell Phone</label>
                        <input className="input-field" value={details.personalCellPhone} onChange={(e) => updateDetail('personalCellPhone', e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bx-border)', borderRadius: '8px', marginTop: '14px' }}>
                    <h3 style={{ fontSize: '13px', margin: '0 0 10px 0', color: 'var(--bx-accent-blue)' }}>Agreement Information</h3>
                    <div className="bx-form-grid-2">
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Contract Length</label>
                        <input className="input-field" placeholder="e.g. 5 Years" value={details.contractLength} onChange={(e) => updateDetail('contractLength', e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Base Rent</label>
                        <input className="input-field" placeholder="$" value={details.baseRent} onChange={(e) => updateDetail('baseRent', e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Hours</label>
                        <input className="input-field" placeholder="e.g. 12.00 Hours" value={details.hours} onChange={(e) => updateDetail('hours', e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Percentage</label>
                        <input className="input-field" placeholder="TBD" value={details.percentage} onChange={(e) => updateDetail('percentage', e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Commission Amount ($)</label>
                        <input className="input-field" placeholder="e.g. 500" value={details.commissionAmount} onChange={(e) => updateDetail('commissionAmount', e.target.value)} />
                      </div>
                    </div>
                  </div>
                  <BusinessHours
                    value={details.openingHours}
                    onChange={(val) => updateDetail('openingHours', val)}
                    disabled={!isAdmin}
                  />

                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bx-border)', borderRadius: '8px', marginTop: '14px' }}>
                    <h3 style={{ fontSize: '13px', margin: '0 0 10px 0', color: 'var(--bx-accent-blue)' }}>Important Dates</h3>
                    <div className="bx-form-grid-3">
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Approve Date</label>
                        <input type="date" className="input-field" value={details.approveDate} onChange={(e) => updateDetail('approveDate', e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Agreement Sent Date</label>
                        <input type="date" className="input-field" value={details.agreementSentDate} onChange={(e) => updateDetail('agreementSentDate', e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Sign Date</label>
                        <input type="date" className="input-field" value={details.signDate} onChange={(e) => updateDetail('signDate', e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Convert Date</label>
                        <input type="date" className="input-field" value={details.convertDate} onChange={(e) => updateDetail('convertDate', e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Install Date</label>
                        <input type="date" className="input-field" value={details.installDate} onChange={(e) => updateDetail('installDate', e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Remove Date</label>
                        <input type="date" className="input-field" value={details.removeDate} onChange={(e) => updateDetail('removeDate', e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Sign Rejected Date</label>
                        <input type="date" className="input-field" value={details.signRejectedDate} onChange={(e) => updateDetail('signRejectedDate', e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bx-border)', borderRadius: '8px', marginTop: '14px' }}>
                    <h3 style={{ fontSize: '13px', margin: '0 0 10px 0', color: 'var(--bx-accent-blue)' }}>Other Details</h3>
                    <div className="bx-form-grid-3">
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Reference</label>
                        <input className="input-field" value={details.reference} onChange={(e) => updateDetail('reference', e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Sign By</label>
                        <input className="input-field" value={details.signBy} onChange={(e) => updateDetail('signBy', e.target.value)} />
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Lead Owner</label>
                        <input className="input-field" value={details.leadOwner} onChange={(e) => updateDetail('leadOwner', e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)', marginTop: '14px', display: 'block' }}>Mandatory Executive Notes</label>
                  <textarea
                    className="input-field"
                    rows="4"
                    placeholder="Detail the interaction, client objections, or next steps..."
                    value={notes}
                    onChange={(e) => { setNotes(e.target.value); setError(''); }}
                  ></textarea>

                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Mandatory Follow-Up Time</label>
                  <input
                    type="datetime-local"
                    className="input-field"
                    value={followUpTime}
                    onChange={(e) => { setFollowUpTime(e.target.value); setError(''); }}
                  />
                </fieldset>

                {history.length > 0 && (
                  <div style={{ marginTop: '14px', padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bx-border)', borderRadius: '8px' }}>
                    <h3 style={{ fontSize: '13px', margin: '0 0 10px 0', color: 'var(--bx-accent-blue)' }}>Status History</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto' }}>
                      {history.map(h => (
                        <div key={h.id} style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', gap: '10px', color: 'var(--bx-text-muted)' }}>
                          <span>{h.fromStatus || 'Created'} → <strong style={{ color: 'var(--bx-text-main)' }}>{h.toStatus}</strong></span>
                          <span>{h.changedBy?.name || 'System'} · {new Date(h.changedAt).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {error && <div className="error-text"><AlertCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />{error}</div>}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                  {isAdmin ? (
                    <>
                      <button type="button" className="bx-btn" onClick={() => setSelectedLead(null)}>Cancel</button>
                      <button type="submit" className="bx-btn bx-btn-primary"><Save size={16} /> Save & Process</button>
                    </>
                  ) : (
                    <button type="button" className="bx-btn" onClick={() => setSelectedLead(null)}>Close</button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )
      }
    </div >
  );
}
