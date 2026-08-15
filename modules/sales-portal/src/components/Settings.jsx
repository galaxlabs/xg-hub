import React, { useState } from 'react';
import { User, Mail, Lock, Sun, Moon, Save, Check, Camera } from 'lucide-react';

const THEMES = [
  { id: 'dark', label: 'Dark', swatch: '#111111' },
  { id: 'light', label: 'Light', swatch: '#ffffff' },
  { id: 'lavender', label: 'Lavender', swatch: '#9c6fd6' },
  { id: 'pink', label: 'Baby Pink', swatch: '#ec6fa3' },
  { id: 'ocean', label: 'Ocean Blue', swatch: '#1e88c7' },
  { id: 'slate', label: 'Slate', swatch: '#1e2530' }
];

export default function Settings({ currentUser, setCurrentUser, theme, setTheme }) {
  const [formData, setFormData] = useState({
    name: currentUser?.name || '',
    email: currentUser?.email || '',
    password: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/employees/${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          requesterRole: currentUser.role
        })
      });

      if (res.ok) {
        const updated = await res.json();
        const newUser = { ...currentUser, name: updated.name, email: updated.email };
        setCurrentUser(newUser);
        localStorage.setItem('crm_user', JSON.stringify(newUser));
        setFormData(prev => ({ ...prev, password: '' }));

        if (updated.passwordPending) {
          setSuccessMessage('Profile is not updatable. Contact Admin.');
        } else {
          setSuccessMessage('Profile is updatable.');
        }
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 4000);
      } else {
        setError('Profile is not updatable. Contact Admin.');
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await fetch(`/api/employees/${currentUser.id}/avatar`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        const newUser = { ...currentUser, avatarUrl: data.avatarUrl };
        setCurrentUser(newUser);
        localStorage.setItem('crm_user', JSON.stringify(newUser));
      } else {
        setError('Could not upload picture.');
      }
    } catch (err) {
      console.error('Avatar upload error:', err);
      setError('Could not connect to server.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  return (
    <div className="bx-content" style={{ overflowY: 'auto' }}>
      <div className="bx-content-header">
        <h1 className="bx-page-title">Settings</h1>
        <p style={{ color: 'var(--bx-text-muted)' }}>Manage your profile and appearance.</p>
      </div>

      <div style={{ padding: '20px', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Profile Section */}
        <div className="bx-widget-card">
          <h3 style={{ fontSize: '15px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} /> Profile
          </h3>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '72px', height: '72px', borderRadius: '50%', overflow: 'hidden',
                border: '2px solid var(--bx-accent-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bx-sidebar-bg)', fontSize: '24px', fontWeight: 'bold', color: 'var(--bx-accent-blue)'
              }}>
                {currentUser?.avatarUrl ? (
                  <img src={currentUser.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  currentUser?.name?.substring(0, 2).toUpperCase() || 'XX'
                )}
              </div>
              <label
                htmlFor="avatar-upload"
                style={{
                  position: 'absolute', bottom: 0, right: 0, background: 'var(--bx-accent-blue)',
                  width: '26px', height: '26px', borderRadius: '50%', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px solid var(--bx-white)'
                }}
                title="Change picture"
              >
                <Camera size={13} color="#fff" />
              </label>
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarUpload}
              />
            </div>
            <div style={{ fontSize: '13px', color: 'var(--bx-text-muted)' }}>
              {uploadingAvatar ? 'Uploading...' : 'Insert your profile picture here'}
            </div>
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Full Name</label>
              <input className="input-field" value={formData.name} onChange={(e) => updateField('name', e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Email</label>
              <input type="email" className="input-field" value={formData.email} onChange={(e) => updateField('email', e.target.value)} required />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>New Password</label>
              <input type="password" className="input-field" value={formData.password} onChange={(e) => updateField('password', e.target.value)} placeholder="••••••••" />
            </div>

            {error && <div className="error-text">{error}</div>}

            <button type="submit" className="bx-btn bx-btn-primary" disabled={saving} style={{ justifyContent: 'center' }}>
              {showSuccess ? <><Check size={16} /> Saved</> : (saving ? 'Saving...' : <><Save size={16} /> Save Changes</>)}
            </button>
            {showSuccess && successMessage && (
              <div style={{ fontSize: '12px', color: 'var(--bx-accent-green)', textAlign: 'center', marginTop: '8px' }}>
                {successMessage}
              </div>
            )}
          </form>
        </div>

        {/* Theme Section */}
        <div className="bx-widget-card">
          <h3 style={{ fontSize: '15px', marginBottom: '16px' }}>Appearance</h3>
          <div className="bx-form-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {THEMES.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className="bx-btn"
                style={{
                  justifyContent: 'flex-start', gap: '10px', padding: '12px',
                  border: theme === t.id ? '2px solid var(--bx-accent-blue)' : '1px solid var(--bx-border)'
                }}
              >
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                  background: t.swatch, border: '1px solid rgba(0,0,0,0.15)'
                }} />
                {t.label}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}