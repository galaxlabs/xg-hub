import CompanyMultiSelect from './CompanyMultiSelect';
import React, { useState } from 'react';
import { Target, Save, Plus, Clock, Send } from 'lucide-react';
import BusinessHours from './BusinessHours';

const emptyDetails = {
    company: '', operatingCompany: '', priority: 'Normal', contact: '', notes: '', followUpTime: '',
    executiveName: '', branch: '', ownerName: '', businessType: '',
    address: '', stateProvince: '', stateCode: '', openingHours: null, zipCode: '', city: '', country: '',
    fullAddress: '', mapLink: '', latitude: '', longitude: '',
    businessPhone: '', personalCellPhone: '',
    contractLength: '', baseRent: '', hours: '', percentage: '',
    approveDate: '', agreementSentDate: '', signDate: '', convertDate: '',
    installDate: '', removeDate: '', signRejectedDate: '',
    reference: '', signBy: '', leadOwner: ''
};

export default function LeadsFollowUp({ currentUser, leads, setLeads, companies }) {
    const [showModal, setShowModal] = useState(false);
    const [editingLead, setEditingLead] = useState(null);
    const [formData, setFormData] = useState(emptyDetails);

    const myLeads = leads.filter(lead => lead.createdById === currentUser?.id);

    const formatDateOnly = (dateValue) => {
        if (!dateValue) return '';
        return new Date(dateValue).toISOString().slice(0, 10);
    };

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const openCreateModal = () => {
        setEditingLead(null);
        setFormData(emptyDetails);
        setShowModal(true);
    };

    const openEditModal = (lead) => {
        setEditingLead(lead);
        setFormData({
            company: lead.company || '', operatingCompany: lead.operatingCompany || '', priority: lead.priority || 'Normal', contact: lead.contact || '',
            notes: lead.notes || '', followUpTime: lead.followUpTime || '',
            executiveName: lead.executiveName || '', branch: lead.branch || '',
            ownerName: lead.ownerName || '', businessType: lead.businessType || '',
            address: lead.address || '', stateProvince: lead.stateProvince || '',
            stateCode: lead.stateCode || '', zipCode: lead.zipCode || '',
            openingHours: lead.openingHours || null,
            city: lead.city || '', country: lead.country || '',
            fullAddress: lead.fullAddress || '', mapLink: lead.mapLink || '',
            latitude: lead.latitude || '', longitude: lead.longitude || '',
            businessPhone: lead.businessPhone || '', personalCellPhone: lead.personalCellPhone || '',
            contractLength: lead.contractLength || '', baseRent: lead.baseRent || '',
            hours: lead.hours || '', percentage: lead.percentage || '',
            approveDate: formatDateOnly(lead.approveDate),
            agreementSentDate: formatDateOnly(lead.agreementSentDate),
            signDate: formatDateOnly(lead.signDate),
            convertDate: formatDateOnly(lead.convertDate),
            installDate: formatDateOnly(lead.installDate),
            removeDate: formatDateOnly(lead.removeDate),
            signRejectedDate: formatDateOnly(lead.signRejectedDate),
            reference: lead.reference || '', signBy: lead.signBy || '',
            leadOwner: lead.leadOwner || ''
        });
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            if (editingLead) {
                const res = await fetch(`/api/leads/${editingLead.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...formData,
                        status: editingLead.status,
                        changedById: currentUser?.id
                    })
                });
                if (res.ok) {
                    const updatedLead = await res.json();
                    setLeads(leads.map(l => l.id === editingLead.id ? updatedLead : l));
                }
            } else {
                const res = await fetch('/api/leads', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...formData,
                        status: 'Pending',
                        createdById: currentUser?.id
                    })
                });
                if (res.ok) {
                    const newLead = await res.json();
                    setLeads([newLead, ...leads]);
                }
            }
            setFormData(emptyDetails);
            setShowModal(false);
            setEditingLead(null);
        } catch (err) {
            console.error('Error saving lead:', err);
        }
    };

    const handleStatusAction = async (lead, newStatus) => {
        try {
            const res = await fetch(`/api/leads/${lead.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: newStatus,
                    notes: lead.notes,
                    followUpTime: lead.followUpTime,
                    changedById: currentUser?.id
                })
            });
            if (res.ok) {
                const updatedLead = await res.json();
                setLeads(leads.map(l => l.id === lead.id ? updatedLead : l));
            }
        } catch (err) {
            console.error('Error updating status:', err);
        }
    };

    return (
        <div className="bx-content" style={{ overflowY: 'auto' }}>
            <div className="bx-content-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                    <h1 className="bx-page-title">Leads Follow-Up</h1>
                    <p style={{ color: 'var(--bx-text-muted)' }}>Manage and track your leads and follow-ups on the go.</p>
                </div>
                <button className="bx-btn bx-btn-primary" onClick={openCreateModal}>
                    <Plus size={16} /> New Lead
                </button>
            </div>

            <div style={{ padding: '20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--bx-border)', color: 'var(--bx-text-muted)' }}>
                            <th style={{ padding: '12px' }}>Company</th>
                            <th style={{ padding: '12px' }}>Contact</th>
                            <th style={{ padding: '12px' }}>Status</th>
                            <th style={{ padding: '12px' }}>Priority</th>
                            <th style={{ padding: '12px' }}>Notes</th>
                            <th style={{ padding: '12px' }}>Follow-Up Time</th>
                            <th style={{ padding: '12px' }}>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {myLeads.map(lead => (
                            <tr key={lead.id} style={{ borderBottom: '1px solid var(--bx-border)' }}>
                                <td style={{ padding: '16px 12px', fontWeight: 600 }}>{lead.company}</td>
                                <td style={{ padding: '16px 12px', color: 'var(--bx-text-muted)' }}>{lead.contact}</td>
                                <td style={{ padding: '16px 12px' }}>{lead.status}</td>
                                <td style={{ padding: '16px 12px' }}>{lead.priority || 'Normal'}</td>
                                <td style={{ padding: '16px 12px', color: 'var(--bx-text-muted)', maxWidth: '200px' }}>{lead.notes || '—'}</td>
                                <td style={{ padding: '16px 12px' }}>
                                    {lead.followUpTime ? (
                                        <><Clock size={14} color="var(--bx-accent-orange)" style={{ display: 'inline', marginRight: '6px' }} />{new Date(lead.followUpTime).toLocaleString()}</>
                                    ) : 'Unscheduled'}
                                </td>
                                <td style={{ padding: '16px 12px' }}>
                                    {lead.status === 'Pending' ? (
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            <button className="bx-btn" onClick={() => openEditModal(lead)}>Edit</button>
                                            <button className="bx-btn bx-btn-primary" onClick={() => handleStatusAction(lead, 'Submitted')}>
                                                <Send size={14} /> Submit for Approval
                                            </button>
                                            <button className="bx-btn bx-btn-primary" onClick={() => handleStatusAction(lead, 'Submitted')}>
                                                <Send size={14} /> Lead Submission
                                            </button>
                                        </div>
                                    ) : (
                                        <button className="bx-btn" onClick={() => openEditModal(lead)}>Edit</button>
                                    )}
                                </td>

                            </tr>
                        ))}
                        {myLeads.length === 0 && (
                            <tr><td colSpan="6" style={{ padding: '16px 12px', textAlign: 'center' }}>There is no lead has been created yet. </td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Target color="var(--bx-accent-blue)" /> {editingLead ? `Edit Lead: ${editingLead.company}` : 'New Lead'}
                        </h2>

                        <form onSubmit={handleSave}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Business Name</label>
                                <input required className="input-field" value={formData.company} onChange={(e) => updateField('company', e.target.value)} />
                            </div>
                            <div style={{ marginTop: '10px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Company (Operating Company)</label>
                                <CompanyMultiSelect

                                    companies={companies}
                                    value={formData.operatingCompany}
                                    onChange={(val) => updateField('operatingCompany', val)}
                                />
                                <div style={{ marginTop: '10px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Priority</label>
                                    <select
                                        className="input-field"
                                        value={formData.priority}
                                        onChange={(e) => updateField('priority', e.target.value)}
                                        style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}
                                    >
                                        <option value="Critical" style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}>Critical</option>
                                        <option value="High" style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}>High</option>
                                        <option value="Normal" style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}>Normal</option>
                                        <option value="Low" style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}>Low</option>
                                    </select>
                                </div>
                            </div>
                            <div style={{ marginTop: '10px' }}>
                                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Contact (Email/Phone)</label>
                                <input required className="input-field" value={formData.contact} onChange={(e) => updateField('contact', e.target.value)} />
                            </div>

                            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bx-border)', borderRadius: '8px', marginTop: '14px' }}>
                                <h3 style={{ fontSize: '13px', margin: '0 0 10px 0', color: 'var(--bx-accent-blue)' }}>Basic Info</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Executive Name</label>
                                        <input className="input-field" value={formData.executiveName} onChange={(e) => updateField('executiveName', e.target.value)} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Branch</label>
                                        <input className="input-field" value={formData.branch} onChange={(e) => updateField('branch', e.target.value)} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Owner Name</label>
                                        <input className="input-field" value={formData.ownerName} onChange={(e) => updateField('ownerName', e.target.value)} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Business Type</label>
                                        <input className="input-field" value={formData.businessType} onChange={(e) => updateField('businessType', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bx-border)', borderRadius: '8px', marginTop: '14px' }}>
                                <h3 style={{ fontSize: '13px', margin: '0 0 10px 0', color: 'var(--bx-accent-blue)' }}>Address</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Address</label>
                                        <input className="input-field" value={formData.address} onChange={(e) => updateField('address', e.target.value)} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>City</label>
                                        <input className="input-field" value={formData.city} onChange={(e) => updateField('city', e.target.value)} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>State/Province</label>
                                        <input className="input-field" value={formData.stateProvince} onChange={(e) => updateField('stateProvince', e.target.value)} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>State Code</label>
                                        <input className="input-field" value={formData.stateCode} onChange={(e) => updateField('stateCode', e.target.value)} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Zip/Postal Code</label>
                                        <input className="input-field" value={formData.zipCode} onChange={(e) => updateField('zipCode', e.target.value)} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Country</label>
                                        <input className="input-field" value={formData.country} onChange={(e) => updateField('country', e.target.value)} />
                                    </div>
                                </div>
                                <div style={{ marginTop: '10px' }}>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Full Address</label>
                                    <textarea className="input-field" rows="2" value={formData.fullAddress} onChange={(e) => updateField('fullAddress', e.target.value)} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Map Link</label>
                                        <input className="input-field" value={formData.mapLink} onChange={(e) => updateField('mapLink', e.target.value)} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Latitude</label>
                                        <input className="input-field" value={formData.latitude} onChange={(e) => updateField('latitude', e.target.value)} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Longitude</label>
                                        <input className="input-field" value={formData.longitude} onChange={(e) => updateField('longitude', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bx-border)', borderRadius: '8px', marginTop: '14px' }}>
                                <h3 style={{ fontSize: '13px', margin: '0 0 10px 0', color: 'var(--bx-accent-blue)' }}>Contact Information</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Business Phone Number</label>
                                        <input className="input-field" value={formData.businessPhone} onChange={(e) => updateField('businessPhone', e.target.value)} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Personal Cell Phone</label>
                                        <input className="input-field" value={formData.personalCellPhone} onChange={(e) => updateField('personalCellPhone', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bx-border)', borderRadius: '8px', marginTop: '14px' }}>
                                <h3 style={{ fontSize: '13px', margin: '0 0 10px 0', color: 'var(--bx-accent-blue)' }}>Agreement Information</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Contract Length</label>
                                        <input className="input-field" placeholder="e.g. 5 Years" value={formData.contractLength} onChange={(e) => updateField('contractLength', e.target.value)} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Base Rent</label>
                                        <input className="input-field" placeholder="$" value={formData.baseRent} onChange={(e) => updateField('baseRent', e.target.value)} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Hours</label>
                                        <input className="input-field" placeholder="e.g. 12.00 Hours" value={formData.hours} onChange={(e) => updateField('hours', e.target.value)} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Percentage</label>
                                        <input className="input-field" placeholder="TBD" value={formData.percentage} onChange={(e) => updateField('percentage', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bx-border)', borderRadius: '8px', marginTop: '14px' }}>
                                <h3 style={{ fontSize: '13px', margin: '0 0 10px 0', color: 'var(--bx-accent-blue)' }}>Important Dates</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Approve Date</label>
                                        <input type="date" className="input-field" value={formData.approveDate} onChange={(e) => updateField('approveDate', e.target.value)} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Agreement Sent Date</label>
                                        <input type="date" className="input-field" value={formData.agreementSentDate} onChange={(e) => updateField('agreementSentDate', e.target.value)} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Sign Date</label>
                                        <input type="date" className="input-field" value={formData.signDate} onChange={(e) => updateField('signDate', e.target.value)} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Convert Date</label>
                                        <input type="date" className="input-field" value={formData.convertDate} onChange={(e) => updateField('convertDate', e.target.value)} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Install Date</label>
                                        <input type="date" className="input-field" value={formData.installDate} onChange={(e) => updateField('installDate', e.target.value)} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Remove Date</label>
                                        <input type="date" className="input-field" value={formData.removeDate} onChange={(e) => updateField('removeDate', e.target.value)} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Sign Rejected Date</label>
                                        <input type="date" className="input-field" value={formData.signRejectedDate} onChange={(e) => updateField('signRejectedDate', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bx-border)', borderRadius: '8px', marginTop: '14px' }}>
                                <h3 style={{ fontSize: '13px', margin: '0 0 10px 0', color: 'var(--bx-accent-blue)' }}>Other Details</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Reference</label>
                                        <input className="input-field" value={formData.reference} onChange={(e) => updateField('reference', e.target.value)} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Sign By</label>
                                        <input className="input-field" value={formData.signBy} onChange={(e) => updateField('signBy', e.target.value)} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Lead Owner</label>
                                        <input className="input-field" value={formData.leadOwner} onChange={(e) => updateField('leadOwner', e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)', marginTop: '14px', display: 'block' }}>Notes</label>
                            <textarea rows="3" className="input-field" value={formData.notes} onChange={(e) => updateField('notes', e.target.value)} />

                            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Follow-Up Time</label>
                            <input type="datetime-local" className="input-field" value={formData.followUpTime} onChange={(e) => updateField('followUpTime', e.target.value)} />

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                                <button type="button" className="bx-btn" onClick={() => { setShowModal(false); setEditingLead(null); }}>Cancel</button>
                                <button type="submit" className="bx-btn bx-btn-primary"><Save size={16} /> Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
