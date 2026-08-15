import React, { useState } from 'react';
import { Briefcase, Plus, Trash2 } from 'lucide-react';

export default function Company({ companies, setCompanies, campaigns }) {
  const [newName, setNewName] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [error, setError] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setError('');
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          campaignId: selectedCampaignId ? Number(selectedCampaignId) : null
        })
      });
      if (res.ok) {
        const created = await res.json();
        setCompanies([...companies, created].sort((a, b) => a.name.localeCompare(b.name)));
        setNewName('');
        setSelectedCampaignId('');
      } else {
        const data = await res.json();
        setError(data.message || 'Failed to add company.');
      }
    } catch (err) {
      console.error('Error adding company:', err);
      setError('Failed to add company.');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this company?')) {
      try {
        const res = await fetch(`/api/companies/${id}`, { method: 'DELETE' });
        if (res.ok) {
          setCompanies(companies.filter(c => c.id !== id));
        }
      } catch (err) {
        console.error('Error deleting company:', err);
      }
    }
  };

  return (
    <div className="bx-content" style={{ overflowY: 'auto' }}>
      <div className="bx-content-header">
        <h1 className="bx-page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Briefcase color="var(--bx-accent-blue)" /> Companies
        </h1>
        <p style={{ color: 'var(--bx-text-muted)' }}>Add companies and assign them to campaigns so that only employees in that campaign can see that company.</p>
      </div>

      <div style={{ padding: '20px', maxWidth: '600px' }}>
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          <div className="bx-doc-row" style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Add Company Name"
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setError(''); }}
              style={{ flex: 1 }}
            />
            <button type="submit" className="bx-btn bx-btn-primary">
              <Plus size={16} /> Add
            </button>
          </div>
          <div>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Campaign (optional)</label>
            <select
              className="input-field"
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}
            >
              <option value="" style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}>Select Campaign</option>
              {campaigns.map(camp => (
                <option key={camp.id} value={camp.id} style={{ backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)' }}>{camp.name}</option>
              ))}
            </select>
          </div>
        </form>

        {error && <div className="error-text" style={{ marginBottom: '10px' }}>{error}</div>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {companies.map(company => (
            <div
              key={company.id}
              className="bx-doc-row"
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 16px', background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--bx-border)', borderRadius: '8px', gap: '10px'
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{company.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--bx-text-muted)', marginTop: '2px' }}>
                  {company.campaign?.name || 'No campaign assigned'}
                </div>
              </div>
              <button
                className="bx-btn"
                style={{ padding: '6px', color: 'var(--bx-accent-red)' }}
                onClick={() => handleDelete(company.id)}
                title="Delete Company"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {companies.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--bx-text-muted)' }}>
              No companies added yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
