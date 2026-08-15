import React, { useState } from 'react';
import { Target, AlertCircle, Clock, Save, Plus, Trash2, Mail, Phone, User } from 'lucide-react';
import CompanyMultiSelect from './CompanyMultiSelect';
import BusinessHours from './BusinessHours';

export default function AgentFollowUp({ followUps, setFollowUps, currentUser, userRole, filterStatus, companies }) {
  const [showModal, setShowModal] = useState(false);
  const [selectedFollowUp, setSelectedFollowUp] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    businessName: '',
    operatingCompany: '',
    priority: 'Normal',
    businessType: '',
    businessAddress: '',
    businessNumber: '',
    storeName: '',
    stateCode: '',
    ownerName: '',
    ownerEmail: '',
    ownerNumber: '',
    followUpTime: '',
    notes: '',
    openingHours: null,
  });

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const openModal = (f) => {
    if (f) {
      setSelectedFollowUp(f);
      setFormData({
        businessName: f.businessName || '',
        operatingCompany: f.operatingCompany || '',
        priority: f.priority || 'Normal',
        businessType: f.businessType || '',
        businessAddress: f.businessAddress || '',
        businessNumber: f.businessNumber || '',
        storeName: f.storeName || '',
        stateCode: f.stateCode || '',
        ownerName: f.ownerName || '',
        ownerEmail: f.ownerEmail || '',
        ownerNumber: f.ownerNumber || '',
        followUpTime: f.followUpTime || '',
        notes: f.notes || '',
        openingHours: f.openingHours || null,
      });
    } else {
      setSelectedFollowUp(null);
      setFormData({
        businessName: '',
        operatingCompany: '',
        priority: 'Normal',
        businessType: '',
        businessAddress: '',
        businessNumber: '',
        storeName: '',
        stateCode: '',
        ownerName: '',
        ownerEmail: '',
        ownerNumber: '',
        followUpTime: '',
        notes: '',
        openingHours: null,
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (selectedFollowUp) {
        const res = await fetch(`/api/followups/${selectedFollowUp.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (res.ok) {
          const updated = await res.json();
          setFollowUps(myFollowUps.map(f => f.id === selectedFollowUp.id ? updated : f));
        }
      } else {
        const res = await fetch('/api/followups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, createdById: currentUser?.id })
        });
        if (res.ok) {
          const created = await res.json();
          setFollowUps([created, ...followUps]);
        }
      }
      setShowModal(false);
    } catch (err) {
      console.error('Error saving follow-up:', err);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Mark this business as 'Not Interested'?")) {
      try {
        const res = await fetch(`/api/followups/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Not Interested' })
        });
        if (res.ok) {
          const updated = await res.json();
          setFollowUps(followUps.map(f => f.id === id ? updated : f));
        }
      } catch (err) {
        console.error('Error updating follow-up:', err);
      }
    }
  };

  const isAdmin = userRole === 'Admin' || userRole === 'Super Admin';
  const roleFilteredFollowUps = isAdmin ? followUps : followUps.filter(f => f.createdById === currentUser?.id);
  const statusFilteredFollowUps = filterStatus
    ? roleFilteredFollowUps.filter(f => f.status === filterStatus)
    : roleFilteredFollowUps.filter(f => f.status !== 'Not Interested');

  const myFollowUps = searchQuery.trim()
    ? statusFilteredFollowUps.filter(f => {
      const q = searchQuery.toLowerCase();
      return [
        f.businessName, f.businessType, f.businessAddress, f.businessNumber,
        f.stateCode, f.ownerName, f.ownerEmail, f.ownerNumber, f.notes, f.status
      ].some(field => field && field.toString().toLowerCase().includes(q));
    })
    : statusFilteredFollowUps;

  return (
    <div className="bx-content" style={{ overflowY: 'auto' }}>
      <div className="bx-content-header" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="bx-page-title">{filterStatus ? filterStatus : 'Agent Follow-Ups'}</h1>
          <p style={{ color: 'var(--bx-text-muted)' }}>Manage follow-ups with strictly business details.</p>
        </div>
        <input
          type="text"
          placeholder="Search follow-ups (business, owner, phone, notes...)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field"
          style={{ maxWidth: '280px' }}
        />
        <button
          className="bx-btn bx-btn-primary"
          onClick={() => openModal(null)}
        >
          <Plus size={16} /> New Follow-Up
        </button>
      </div>

      <div style={{ padding: '20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--bx-border)', color: 'var(--bx-text-muted)' }}>
              <th style={{ padding: '12px' }}>Business Name</th>
              <th style={{ padding: '12px' }}>Business Type</th>
              <th style={{ padding: '12px' }}>State Code</th>
              <th style={{ padding: '12px' }}>Priority</th>
              <th style={{ padding: '12px' }}>Location</th>
              <th style={{ padding: '12px' }}>Owner Details</th>
              <th style={{ padding: '12px' }}>Business Number</th>
              <th style={{ padding: '12px' }}>Date Added</th>
              <th style={{ padding: '12px' }}>Follow-Up Time</th>
              <th style={{ padding: '12px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {myFollowUps.map(f => (
              <tr key={f.id} style={{ borderBottom: '1px solid var(--bx-border)' }}>
                <td style={{ padding: '16px 12px', fontWeight: 600 }}>{f.businessName}</td>
                <td style={{ padding: '16px 12px', color: 'var(--bx-text-muted)' }}>{f.businessType}</td>
                <td style={{ padding: '16px 12px' }}>{f.priority || 'Normal'}</td>
                <td style={{ padding: '16px 12px' }}>{f.stateCode || '—'}</td>
                <td style={{ padding: '16px 12px' }}>{f.businessAddress}</td>
                <td style={{ padding: '16px 12px' }}>
                  <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={12} /> {f.ownerName}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--bx-text-muted)' }}><Mail size={12} /> {f.ownerEmail}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--bx-text-muted)' }}><Phone size={12} /> {f.ownerNumber}</span>
                  </div>
                </td>
                <td style={{ padding: '16px 12px' }}>{f.businessNumber}</td>
                <td style={{ padding: '16px 12px', color: 'var(--bx-text-muted)' }}>{new Date(f.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: '16px 12px' }}>
                  {f.followUpTime ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--bx-text-muted)' }}>{new Date(f.followUpTime).toLocaleDateString()}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={14} color="var(--bx-accent-orange)" /> {new Date(f.followUpTime).toLocaleTimeString()}
                      </span>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--bx-accent-red)' }}>Unscheduled</span>
                  )}
                </td>
                <td style={{ padding: '16px 12px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="bx-btn" onClick={() => openModal(f)}>Update</button>
                    <button
                      className="bx-btn"
                      style={{ padding: '8px', color: 'var(--bx-accent-red)' }}
                      onClick={() => handleDelete(f.id)}
                      title="Delete Follow-up"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {myFollowUps.length === 0 && (
              <tr><td colSpan="11" style={{ padding: '16px 12px', textAlign: 'center' }}>No follow-ups found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Target color="var(--bx-accent-blue)" /> {selectedFollowUp ? 'Update Follow-Up' : 'New Follow-Up'}
            </h2>

            <form onSubmit={handleSave}>
              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bx-border)', borderRadius: '8px' }}>
                <h3 style={{ fontSize: '13px', margin: '0 0 10px 0', color: 'var(--bx-accent-blue)' }}>Basic Info</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Business Name</label>
                    <input required className="input-field" value={formData.businessName} onChange={e => updateField('businessName', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Business Type</label>
                    <input required className="input-field" placeholder="e.g. Retail, SaaS" value={formData.businessType} onChange={e => updateField('businessType', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Company (Operating Company)</label>
                    <CompanyMultiSelect
                      companies={companies}
                      value={formData.operatingCompany}
                      onChange={(val) => updateField('operatingCompany', val)}
                    />
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Priority</label>
                      <select
                        className="input-field"
                        value={formData.priority}
                        onChange={e => updateField('priority', e.target.value)}
                        style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}
                      >
                        <option value="Critical" style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}>Critical</option>
                        <option value="High" style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}>High</option>
                        <option value="Normal" style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}>Normal</option>
                        <option value="Low" style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}>Low</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bx-border)', borderRadius: '8px', marginTop: '14px' }}>
                <h3 style={{ fontSize: '13px', margin: '0 0 10px 0', color: 'var(--bx-accent-blue)' }}>Location</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Address</label>
                    <input required className="input-field" value={formData.businessAddress} onChange={e => updateField('businessAddress', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Business Number</label>
                    <input required className="input-field" value={formData.businessNumber} onChange={e => updateField('businessNumber', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>State Code</label>
                    <input className="input-field" value={formData.stateCode} onChange={e => updateField('stateCode', e.target.value)} />
                  </div>
                </div>
              </div>

              <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bx-border)', borderRadius: '8px', marginTop: '14px' }}>
                <h3 style={{ fontSize: '13px', margin: '0 0 10px 0', color: 'var(--bx-accent-blue)' }}>Owner Details</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Owner Name</label>
                    <input className="input-field" value={formData.ownerName} onChange={e => updateField('ownerName', e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Owner Email</label>
                    <input type="email" className="input-field" value={formData.ownerEmail} onChange={e => updateField('ownerEmail', e.target.value)} />
                  </div>
                </div>
                <div style={{ marginTop: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Owner Direct Number</label>
                  <input className="input-field" value={formData.ownerNumber} onChange={e => updateField('ownerNumber', e.target.value)} />
                </div>
              </div>

              <BusinessHours
                value={formData.openingHours}
                onChange={(val) => updateField('openingHours', val)}
              />
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)', marginTop: '14px', display: 'block' }}>Follow-up Time</label>
              <input required type="datetime-local" className="input-field" value={formData.followUpTime} onChange={e => updateField('followUpTime', e.target.value)} />
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)', marginTop: '10px', display: 'block' }}>Notes</label>
              <textarea rows="3" className="input-field" value={formData.notes} onChange={e => updateField('notes', e.target.value)} />

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="bx-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="bx-btn bx-btn-primary"><Save size={16} /> Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
