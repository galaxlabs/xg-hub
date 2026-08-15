import React, { useState, useEffect } from 'react';
import { Search, Clock, LogOut, ChevronDown, Menu, Bell } from 'lucide-react';

const US_TIMEZONES = [
  { label: 'Eastern (New York)', zone: 'America/New_York' },
  { label: 'Central (Chicago)', zone: 'America/Chicago' },
  { label: 'Mountain (Denver)', zone: 'America/Denver' },
  { label: 'Pacific (Los Angeles)', zone: 'America/Los_Angeles' },
  { label: 'Alaska', zone: 'America/Anchorage' },
  { label: 'Hawaii', zone: 'Pacific/Honolulu' }
];

export default function TopBar({ onLogout, currentUser, leads, setActiveItem, setPendingLeadId, onMenuClick, meetingNotifications, messageNotifications }) {
  const [selectedTimezone, setSelectedTimezone] = useState(US_TIMEZONES[0]);
  const [showTimezoneMenu, setShowTimezoneMenu] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const formatted = now.toLocaleTimeString('en-US', {
        timeZone: selectedTimezone.zone,
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
      setCurrentTime(formatted);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [selectedTimezone]);

  const searchResults = searchQuery.trim()
    ? (leads || []).filter(l => {
      const q = searchQuery.toLowerCase();
      return [l.company, l.contact, l.businessPhone, l.personalCellPhone]
        .some(field => field && field.toLowerCase().includes(q));
    }).slice(0, 8)
    : [];

  const handleSelectLead = (lead) => {
    setSearchQuery('');
    setShowSearchResults(false);
    setPendingLeadId(lead.id);
    setActiveItem('crm');
  };

  return (
    <div className="bx-topbar">
      <button
        className="bx-hamburger-btn"
        onClick={onMenuClick}
        style={{ background: 'transparent', border: 'none', color: 'var(--bx-text-main)', cursor: 'pointer', display: 'none', padding: '6px' }}
      >
        <Menu size={22} />
      </button>
      <div className="bx-logo">
        <span style={{ fontSize: '24px', fontWeight: 'bold', letterSpacing: '-1px' }}>Xperts<span style={{ color: 'var(--bx-accent-blue)' }}>Global</span></span> CRM
      </div>

      <div className="bx-search-container" style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '16px', top: '9px', opacity: 0.7 }} />
        <input
          type="text"
          className="bx-search-input"
          placeholder="search here..."
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setShowSearchResults(true); }}
          onFocus={() => setShowSearchResults(true)}
        />
        {showSearchResults && searchQuery.trim() && (
          <div style={{
            position: 'absolute', top: '38px', left: 0, right: 0, zIndex: 30,
            background: '#1a1a1a', border: '1px solid var(--bx-border)', borderRadius: '8px',
            maxHeight: '300px', overflowY: 'auto', boxShadow: '0 8px 20px rgba(0,0,0,0.5)'
          }}>
            {searchResults.map(lead => (
              <div
                key={lead.id}
                onClick={() => handleSelectLead(lead)}
                style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid var(--bx-border)' }}
              >
                <div style={{ fontWeight: 600 }}>{lead.company}</div>
                <div style={{ fontSize: '11px', color: 'var(--bx-text-muted)' }}>{lead.status}</div>
              </div>
            ))}
            {searchResults.length === 0 && (
              <div style={{ padding: '14px', fontSize: '13px', color: 'var(--bx-text-muted)' }}>No leads found</div>
            )}
          </div>
        )}
      </div>

      <div className="bx-topbar-right">
        <div style={{ position: 'relative' }}>
          <div
            className="bx-time-tracker"
            onClick={() => setShowTimezoneMenu(!showTimezoneMenu)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Clock size={16} />
            {currentTime}
            <span style={{ fontSize: '11px', opacity: 0.7 }}>{selectedTimezone.label}</span>
            <ChevronDown size={14} />
          </div>
          {showTimezoneMenu && (
            <div style={{
              position: 'absolute', top: '40px', left: 0, zIndex: 20,
              background: 'var(--bx-white)', border: '1px solid var(--bx-border)', borderRadius: '8px',
              minWidth: '200px', boxShadow: '0 8px 20px rgba(0,0,0,0.5)', overflow: 'hidden'
            }}>
              {US_TIMEZONES.map(tz => (
                <div
                  key={tz.zone}
                  onClick={() => { setSelectedTimezone(tz); setShowTimezoneMenu(false); }}
                  style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px', color: 'var(--bx-text-main)' }}
                >
                  {tz.label}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bx-user-profile">
          <div className="bx-avatar" style={{ overflow: 'hidden', padding: 0 }}>
            {currentUser?.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            ) : (
              currentUser?.name ? currentUser.name.substring(0, 2).toUpperCase() : 'XX'
            )}
          </div>
          <span style={{ fontSize: '14px', fontWeight: 600 }}>{currentUser?.name || 'User'} ({currentUser?.role || ''})</span>
        </div>
        <div style={{ position: 'relative' }}>
          <div
            style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            title="Notifications"
            onClick={() => setShowNotifPanel(!showNotifPanel)}
          >
            <Bell size={20} style={{ opacity: 0.8 }} />
            {(meetingNotifications.length + messageNotifications.length) > 0 && (
              <div style={{
                position: 'absolute', top: '-4px', right: '-4px', background: 'var(--bx-accent-red)',
                width: '14px', height: '14px', borderRadius: '50%', color: 'white', fontSize: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
              }}>
                {(meetingNotifications.length + messageNotifications.length) > 9 ? '9+' : (meetingNotifications.length + messageNotifications.length)}
              </div>
            )}
          </div>

          {showNotifPanel && (
            <div style={{
              position: 'absolute', top: '32px', right: 0, zIndex: 30,
              background: 'var(--bx-white)', border: '1px solid var(--bx-border)', borderRadius: '8px',
              width: '300px', maxHeight: '360px', overflowY: 'auto',
              boxShadow: '0 8px 20px rgba(0,0,0,0.4)'
            }}>
              <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bx-border)', fontWeight: 600, fontSize: '13px', color: 'var(--bx-text-main)' }}>
                Notifications
              </div>

              {meetingNotifications.length === 0 && messageNotifications.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--bx-text-muted)' }}>
                  No notifications yet.
                </div>
              )}

              {meetingNotifications.map(m => (
                <div
                  key={`meeting-${m.id}`}
                  onClick={() => { setActiveItem('meetings'); setShowNotifPanel(false); }}
                  style={{ padding: '10px 14px', borderBottom: '1px solid var(--bx-border)', cursor: 'pointer' }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-accent-orange)' }}>New Meeting</div>
                  <div style={{ fontSize: '13px', color: 'var(--bx-text-main)', marginTop: '2px' }}>{m.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--bx-text-muted)', marginTop: '2px' }}>
                    {new Date(m.time).toLocaleString()}
                  </div>
                </div>
              ))}

              {messageNotifications.map(m => (
                <div
                  key={`msg-${m.id}`}
                  onClick={() => { setActiveItem('chat'); setShowNotifPanel(false); }}
                  style={{ padding: '10px 14px', borderBottom: '1px solid var(--bx-border)', cursor: 'pointer' }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--bx-accent-blue)' }}>{m.senderName}</div>
                  <div style={{ fontSize: '13px', color: 'var(--bx-text-main)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.text}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--bx-text-muted)', marginTop: '2px' }}>
                    {new Date(m.time).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <LogOut size={20} style={{ opacity: 0.8, cursor: 'pointer', marginLeft: '8px' }} onClick={onLogout} title="Logout" />
      </div>
    </div>
  );
}