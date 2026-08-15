import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

// value: comma-separated string of selected company names, e.g. "Acme Inc, Beta LLC"
// onChange: function(newCommaSeparatedString)
export default function CompanyMultiSelect({ companies, value, onChange, disabled }) {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    const selectedNames = value
        ? value.split(',').map(s => s.trim()).filter(Boolean)
        : [];

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleCompany = (name) => {
        if (disabled) return;
        let updated;
        if (selectedNames.includes(name)) {
            updated = selectedNames.filter(n => n !== name);
        } else {
            updated = [...selectedNames, name];
        }
        onChange(updated.join(', '));
    };

    return (
        <div ref={wrapperRef} style={{ position: 'relative' }}>
            <div
                className="input-field"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: disabled ? 'not-allowed' : 'pointer', minHeight: '20px',
                    opacity: disabled ? 0.6 : 1
                }}
            >
                <span style={{ color: selectedNames.length ? 'inherit' : 'var(--bx-text-muted)' }}>
                    {selectedNames.length ? selectedNames.join(', ') : 'Select Company'}
                </span>
                <ChevronDown size={16} style={{ flexShrink: 0, marginLeft: '8px' }} />
            </div>

            {isOpen && !disabled && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
                    background: 'var(--bx-white)', border: '1px solid var(--bx-border)', borderRadius: '8px',
                    maxHeight: '200px', overflowY: 'auto', zIndex: 20,
                    boxShadow: '0 8px 20px rgba(0,0,0,0.5)'
                }}>
                    {companies.length === 0 && (
                        <div style={{ padding: '12px', fontSize: '13px', color: 'var(--bx-text-muted)' }}>
                            No company is added.
                        </div>
                    )}
                    {companies.map(company => (
                        <label
                            key={company.id}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '10px 14px', cursor: 'pointer', fontSize: '13px',
                                color: 'var(--bx-text-main)'
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={selectedNames.includes(company.name)}
                                onChange={() => toggleCompany(company.name)}
                            />
                            {company.name}
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
}