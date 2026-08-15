import React, { useState } from 'react';
import { Plus, Target, Users, Activity, X, ArrowLeft, Calendar as CalendarIcon, DollarSign, MoreVertical, Trash2 } from 'lucide-react';

export default function Campaigns({ campaigns, setCampaigns, userRole }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);

  const [newCampaign, setNewCampaign] = useState({
    name: '',
    budget: '',
    startDate: '',
    description: ''
  });

  const handleAddCampaign = async (e) => {
    e.preventDefault();
    if (!newCampaign.name) return;
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCampaign)
      });
      if (res.ok) {
        const created = await res.json();
        setCampaigns([created, ...campaigns]);
        setNewCampaign({ name: '', budget: '', startDate: '', description: '' });
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error('Error creating campaign:', err);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        const updated = await res.json();
        setCampaigns(campaigns.map(c => c.id === id ? updated : c));
      }
    } catch (err) {
      console.error('Error updating campaign status:', err);
    }
    setOpenMenuId(null);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this campaign?')) {
      try {
        const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setCampaigns(campaigns.filter(c => c.id !== id));
        }
      } catch (err) {
        console.error('Error deleting campaign:', err);
      }
    }
    setOpenMenuId(null);
  };

  if (selectedCampaign) {
    return (
      <div className="bx-content" style={{ overflowY: 'auto' }}>
        <div className="bx-content-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', color: 'var(--bx-text-muted)' }} onClick={() => setSelectedCampaign(null)}>
              <ArrowLeft size={16} /> Back to Campaigns
            </div>
            <h1 className="bx-page-title" style={{ marginTop: '10px' }}>{selectedCampaign.name}</h1>
            <p style={{ color: 'var(--bx-text-muted)' }}>Campaign Details & Metrics</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span className="badge" style={{ padding: '6px 12px', borderRadius: '15px', backgroundColor: selectedCampaign.status === 'Active' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255,152,0,0.1)', color: selectedCampaign.status === 'Active' ? 'var(--bx-accent-green)' : 'var(--bx-accent-orange)' }}>
              {selectedCampaign.status}
            </span>
          </div>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="bx-widget-grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
            <div className="bx-widget-card">
              <div className="bx-widget-header">
                <span className="bx-widget-title">Total Reach</span>
                <Users size={16} color="var(--bx-accent-blue)" />
              </div>
              <div className="bx-widget-value">{selectedCampaign.reach}</div>
            </div>
            <div className="bx-widget-card">
              <div className="bx-widget-header">
                <span className="bx-widget-title">Conversion Rate</span>
                <Activity size={16} color="var(--bx-accent-green)" />
              </div>
              <div className="bx-widget-value">{selectedCampaign.conversion}</div>
            </div>
            <div className="bx-widget-card">
              <div className="bx-widget-header">
                <span className="bx-widget-title">Budget</span>
                <DollarSign size={16} color="var(--bx-accent-orange)" />
              </div>
              <div className="bx-widget-value">{selectedCampaign.budget || 'N/A'}</div>
            </div>
            <div className="bx-widget-card">
              <div className="bx-widget-header">
                <span className="bx-widget-title">Start Date</span>
                <CalendarIcon size={16} color="var(--bx-text-muted)" />
              </div>
              <div className="bx-widget-value">{selectedCampaign.startDate ? new Date(selectedCampaign.startDate).toLocaleDateString() : 'N/A'}</div>
            </div>
          </div>

          <div className="bx-widget-card">
            <div className="bx-widget-header">
              <span className="bx-widget-title">Assigned Agent</span>
              <Users size={16} color="var(--bx-accent-blue)" />
            </div>
            <div className="bx-widget-value">{selectedCampaign.assignedAgent?.name || 'Unassigned'}</div>
          </div>

          <div className="bx-widget-card" style={{ flex: 1 }}>
            <div className="bx-widget-header" style={{ marginBottom: '20px' }}>
              <span className="bx-widget-title">Campaign Strategy & Details</span>
              <Target size={16} color="var(--bx-accent-red)" />
            </div>
            <p style={{ color: 'var(--bx-text-main)', lineHeight: '1.6' }}>
              {selectedCampaign.description || 'No detailed description provided for this campaign.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bx-content" style={{ overflowY: 'auto' }}>
      <div className="bx-content-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div>
          <h1 className="bx-page-title">Campaign Management</h1>
          <p style={{ color: 'var(--bx-text-muted)' }}>Monitor and deploy multi-channel AI campaigns.</p>
        </div>
        <button className="bx-btn bx-btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} /> Add Campaign
        </button>
      </div>

      <div className="bx-widget-grid-3" style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {campaigns.map(camp => (
          <div
            key={camp.id}
            className="bx-widget-card"
            style={{ position: 'relative', border: '1px solid var(--bx-border)' }}
          >
            <div className="bx-widget-header" style={{ marginBottom: '15px' }}>
              <span
                style={{ fontWeight: 600, color: 'var(--bx-text-main)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                onClick={() => setSelectedCampaign(camp)}
              >
                <Target size={16} color="var(--bx-accent-blue)" />
                {camp.name}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="badge" style={{ fontSize: '11px', padding: '4px 8px', borderRadius: '10px', backgroundColor: camp.status === 'Active' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(255,152,0,0.1)', color: camp.status === 'Active' ? 'var(--bx-accent-green)' : 'var(--bx-accent-orange)' }}>
                  {camp.status}
                </span>
                <div style={{ position: 'relative' }}>
                  <button
                    className="bx-btn"
                    style={{ padding: '6px' }}
                    onClick={() => setOpenMenuId(openMenuId === camp.id ? null : camp.id)}
                  >
                    <MoreVertical size={16} />
                  </button>
                  {openMenuId === camp.id && (
                    <div style={{
                      position: 'absolute', right: 0, top: '36px', zIndex: 10,
                      background: 'var(--bx-white)', border: '1px solid var(--bx-border)',
                      borderRadius: '8px', minWidth: '140px',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.4)', overflow: 'hidden'
                    }}>
                      <div
                        style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px' }}
                        onClick={() => handleStatusChange(camp.id, 'Active')}
                      >
                        Active
                      </div>
                      <div
                        style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px' }}
                        onClick={() => handleStatusChange(camp.id, 'Paused')}
                      >
                        Paused
                      </div>
                      <div
                        style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px', color: 'var(--bx-accent-red)', display: 'flex', alignItems: 'center', gap: '6px' }}
                        onClick={() => handleDelete(camp.id)}
                      >
                        <Trash2 size={14} /> Delete
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', color: 'var(--bx-text-main)' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--bx-text-muted)', marginBottom: '4px' }}>Total Reach</div>
                <div style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Users size={14} color="var(--bx-text-muted)" /> {camp.reach}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--bx-text-muted)', marginBottom: '4px' }}>Conversion</div>
                <div style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Activity size={14} color="var(--bx-accent-green)" /> {camp.conversion}
                </div>
              </div>
            </div>
          </div>
        ))}
        {campaigns.length === 0 && (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--bx-text-muted)', gridColumn: '1 / -1' }}>
            No campaigns created yet. Add campaign from here.
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Target color="var(--bx-accent-blue)" /> Add Campaign
            </h2>

            <form onSubmit={handleAddCampaign} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Campaign Name</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., Q4 Black Friday AI Boost"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Budget</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g., $5,000"
                    value={newCampaign.budget}
                    onChange={(e) => setNewCampaign({ ...newCampaign, budget: e.target.value })}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Start Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={newCampaign.startDate}
                    onChange={(e) => setNewCampaign({ ...newCampaign, startDate: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Description & Strategy</label>
                <textarea
                  className="input-field"
                  rows="3"
                  placeholder="Campaign strategy details..."
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                <button type="button" className="bx-btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="bx-btn bx-btn-primary">Add Campaign</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
