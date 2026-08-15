import React, { useState } from 'react';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DEFAULT_HOURS = DAYS.map(day => ({ day, open: '08:00', close: '20:00', off: false }));

export default function BusinessHours({ value, onChange, disabled }) {
    const hours = value && value.length === 7 ? value : DEFAULT_HOURS;
    const [masterOpen, setMasterOpen] = useState('08:00');
    const [masterClose, setMasterClose] = useState('20:00');

    // Yeh sirf "Apply to All" button dabane pe chalta hai
    const applyToAllDays = () => {
        const updated = hours.map(h => ({ ...h, open: masterOpen, close: masterClose }));
        onChange(updated);
    };

    // Yeh sirf USI ek din ko update karta hai, baaki ko chhota nahi hota
    const updateDay = (index, field, newValue) => {
        const updated = hours.map((h, i) => i === index ? { ...h, [field]: newValue } : h);
        onChange(updated);
    };

    const toggleOff = (index) => {
        const updated = hours.map((h, i) => i === index ? { ...h, off: !h.off } : h);
        onChange(updated);
    };

    const calcTotal = (open, close, off) => {
        if (off) return 'Off';
        if (!open || !close) return '-';
        const parts1 = open.split(':').map(Number);
        const parts2 = close.split(':').map(Number);
        const oh = parts1[0], om = parts1[1];
        const ch = parts2[0], cm = parts2[1];
        let minutes = (ch * 60 + cm) - (oh * 60 + om);
        if (minutes < 0) minutes += 24 * 60;
        return (minutes / 60).toFixed(2);
    };

    return (
        <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--bx-border)', borderRadius: '8px', marginTop: '14px' }}>
            <h3 style={{ fontSize: '13px', margin: '0 0 10px 0', color: 'var(--bx-accent-blue)' }}>Business Hours</h3>

            {!disabled && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '14px', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                    <div>
                        <label style={{ fontSize: '11px', color: 'var(--bx-text-muted)' }}>Set All: Opening</label>
                        <input type="time" className="input-field" value={masterOpen} onChange={(e) => setMasterOpen(e.target.value)} style={{ margin: 0 }} />
                    </div>
                    <div>
                        <label style={{ fontSize: '11px', color: 'var(--bx-text-muted)' }}>Set All: Closing</label>
                        <input type="time" className="input-field" value={masterClose} onChange={(e) => setMasterClose(e.target.value)} style={{ margin: 0 }} />
                    </div>
                    <button type="button" className="bx-btn bx-btn-primary" onClick={applyToAllDays} style={{ height: '38px' }}>
                        Apply to All Days
                    </button>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 0.7fr 0.6fr', gap: '8px', fontSize: '11px', color: 'var(--bx-text-muted)', fontWeight: 600 }}>
                    <div>Weekday</div>
                    <div>Opening Time</div>
                    <div>Closing Time</div>
                    <div>Total Hours</div>
                    <div>Off</div>
                </div>
                {hours.map((h, index) => (
                    <div key={h.day} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 0.7fr 0.6fr', gap: '8px', alignItems: 'center' }}>
                        <div style={{ fontSize: '13px' }}>{h.day}</div>
                        {h.off ? (
                            <div className="input-field" style={{ margin: 0, display: 'flex', alignItems: 'center', color: 'var(--bx-text-muted)' }}>—</div>
                        ) : (
                            <input
                                type="time"
                                className="input-field"
                                value={h.open}
                                disabled={disabled}
                                onChange={(e) => updateDay(index, 'open', e.target.value)}
                                style={{ margin: 0 }}
                            />
                        )}
                        {h.off ? (
                            <div className="input-field" style={{ margin: 0, display: 'flex', alignItems: 'center', color: 'var(--bx-text-muted)' }}>—</div>
                        ) : (
                            <input
                                type="time"
                                className="input-field"
                                value={h.close}
                                disabled={disabled}
                                onChange={(e) => updateDay(index, 'close', e.target.value)}
                                style={{ margin: 0 }}
                            />
                        )}
                        <div style={{ fontSize: '13px', color: 'var(--bx-text-muted)' }}>{calcTotal(h.open, h.close, h.off)}</div>
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() => toggleOff(index)}
                            className="bx-btn"
                            style={{
                                padding: '6px', fontSize: '11px',
                                background: h.off ? 'var(--bx-accent-red)' : 'transparent',
                                color: h.off ? '#fff' : 'inherit'
                            }}
                        >
                            Off
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}