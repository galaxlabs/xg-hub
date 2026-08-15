import React, { useState } from 'react';
import { Video, Plus, ExternalLink, Clock, X, Link2 } from 'lucide-react';

export default function Meetings({ meetings, setMeetings, currentUser, userRole, googleConnected }) {
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        meetLink: '',
        meetingTime: ''
    });
    const [sending, setSending] = useState(false);
    const [error, setError] = useState('');

    const isAdmin = userRole === 'Admin' || userRole === 'Super Admin';

    const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleConnectGoogle = () => {
        window.location.href = `/api/google/connect?employeeId=${currentUser.id}`;
    };

    // Auto: Google khud Meet link banayega
    const handleAutoSubmit = async (e) => {
        e.preventDefault();
        setSending(true);
        setError('');
        try {
            const res = await fetch('/api/meetings/auto', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: formData.title,
                    description: formData.description,
                    meetingTime: formData.meetingTime,
                    createdById: currentUser?.id
                })
            });
            if (res.ok) {
                const meeting = await res.json();
                setMeetings([meeting, ...meetings]);
                setFormData({ title: '', description: '', meetLink: '', meetingTime: '' });
                setShowModal(false);
            } else {
                const data = await res.json();
                setError(data.message || 'Could not create meeting.');
            }
        } catch (err) {
            console.error('Error creating meeting:', err);
            setError('Server se connect nahi ho saka.');
        } finally {
            setSending(false);
        }
    };

    // Manual: khud link paste karke
    const handleManualSubmit = async (e) => {
        e.preventDefault();
        setSending(true);
        setError('');
        try {
            const res = await fetch('/api/meetings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, createdById: currentUser?.id })
            });
            if (res.ok) {
                const meeting = await res.json();
                setMeetings([meeting, ...meetings]);
                setFormData({ title: '', description: '', meetLink: '', meetingTime: '' });
                setShowModal(false);
            } else {
                setError('Could not create meeting.');
            }
        } catch (err) {
            console.error('Error creating meeting:', err);
            setError('Server se connect nahi ho saka.');
        } finally {
            setSending(false);
        }
    };

    const upcoming = meetings.filter(m => new Date(m.meetingTime) >= new Date());
    const past = meetings.filter(m => new Date(m.meetingTime) < new Date());

    return (
        <div className="bx-content" style={{ overflowY: 'auto' }}>
            <div className="bx-content-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                    <h1 className="bx-page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Video color="var(--bx-accent-blue)" /> Meetings
                    </h1>
                    <p style={{ color: 'var(--bx-text-muted)' }}>Meetings will be conducted on google meet </p>
                </div>
                {isAdmin && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {!googleConnected && (
                            <button className="bx-btn" onClick={handleConnectGoogle}>
                                <Link2 size={16} /> Connect Google Calendar
                            </button>
                        )}
                        <button className="bx-btn bx-btn-primary" onClick={() => setShowModal(true)}>
                            <Plus size={16} /> Schedule Meeting
                        </button>
                    </div>
                )}
            </div>

            <div style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '14px', color: 'var(--bx-text-muted)', marginBottom: '12px' }}>UPCOMING</h3>
                <div className="bx-widget-grid-3" style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px', marginBottom: '30px' }}>
                    {upcoming.map(m => (
                        <div key={m.id} className="bx-widget-card">
                            <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '6px' }}>{m.title}</div>
                            {m.description && <p style={{ fontSize: '13px', color: 'var(--bx-text-muted)', marginBottom: '10px' }}>{m.description}</p>}
                            <div style={{ fontSize: '12px', color: 'var(--bx-text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                                <Clock size={12} />
                                {new Date(m.meetingTime).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                {' at '}
                                {new Date(m.meetingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--bx-text-muted)', marginBottom: '12px' }}>
                                By {m.createdBy?.name || 'Unknown'}
                            </div>
                            <a
                                href={m.meetLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bx-btn bx-btn-primary"
                                style={{ textDecoration: 'none', display: 'inline-flex', width: '100%', justifyContent: 'center' }}
                            >
                                <ExternalLink size={14} /> Join Meet
                            </a>
                        </div>
                    ))}
                    {upcoming.length === 0 && (
                        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--bx-text-muted)', gridColumn: '1 / -1' }}>
                            No upcoming meetings.
                        </div>
                    )}
                </div>

                {past.length > 0 && (
                    <>
                        <h3 style={{ fontSize: '14px', color: 'var(--bx-text-muted)', marginBottom: '12px' }}>PAST</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {past.map(m => (
                                <div
                                    key={m.id}
                                    style={{
                                        padding: '12px 16px', background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid var(--bx-border)', borderRadius: '8px',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: 0.6
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{m.title}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--bx-text-muted)' }}>
                                            {new Date(m.meetingTime).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                            {' at '}
                                            {new Date(m.meetingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Video color="var(--bx-accent-blue)" /> Schedule Meeting
                            </span>
                            <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowModal(false)} />
                        </h2>

                        {googleConnected ? (
                            <form onSubmit={handleAutoSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ fontSize: '12px', color: 'var(--bx-accent-green)', background: 'rgba(76,175,80,0.1)', padding: '8px 12px', borderRadius: '6px' }}>
                                    ✓ Google Calendar connected — Meet link will be generated automatically.
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Meeting Title</label>
                                    <input required className="input-field" value={formData.title} onChange={(e) => updateField('title', e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Date & Time</label>
                                    <input required type="datetime-local" className="input-field" value={formData.meetingTime} onChange={(e) => updateField('meetingTime', e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Description (optional)</label>
                                    <textarea rows="3" className="input-field" value={formData.description} onChange={(e) => updateField('description', e.target.value)} />
                                </div>

                                {error && <div className="error-text">{error}</div>}

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                                    <button type="button" className="bx-btn" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button type="submit" className="bx-btn bx-btn-primary" disabled={sending}>
                                        {sending ? 'Creating...' : 'Auto-Schedule & Notify All'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ fontSize: '12px', color: 'var(--bx-accent-orange)', background: 'rgba(255,152,0,0.1)', padding: '8px 12px', borderRadius: '6px' }}>
                                    Google Calendar is not connected — paste the link manually, or click "Connect Google Calendar" above.
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Meeting Title</label>
                                    <input required className="input-field" value={formData.title} onChange={(e) => updateField('title', e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Google Meet Link</label>
                                    <input
                                        required
                                        type="url"
                                        className="input-field"
                                        placeholder="https://meet.google.com/xxx-xxxx-xxx"
                                        value={formData.meetLink}
                                        onChange={(e) => updateField('meetLink', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Date & Time</label>
                                    <input required type="datetime-local" className="input-field" value={formData.meetingTime} onChange={(e) => updateField('meetingTime', e.target.value)} />
                                </div>
                                <div>
                                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-text-muted)' }}>Description (optional)</label>
                                    <textarea rows="3" className="input-field" value={formData.description} onChange={(e) => updateField('description', e.target.value)} />
                                </div>

                                {error && <div className="error-text">{error}</div>}

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
                                    <button type="button" className="bx-btn" onClick={() => setShowModal(false)}>Cancel</button>
                                    <button type="submit" className="bx-btn bx-btn-primary" disabled={sending}>
                                        {sending ? 'Sending Invites...' : 'Schedule & Notify All'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}