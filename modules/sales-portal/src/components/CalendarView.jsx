import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Target, Briefcase, Clock } from 'lucide-react';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarView({ leads, followUps, currentUser, userRole }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const isAdmin = userRole === 'Admin' || userRole === 'Super Admin';

  // Employee ko sirf apni cheezein dikhein, Admin ko sab
  const visibleLeads = isAdmin ? leads : leads.filter(l => l.createdById === currentUser?.id);
  const visibleFollowUps = isAdmin ? followUps : followUps.filter(f => f.createdById === currentUser?.id);

  // Leads aur FollowUps ko ek common "event" shape mein badalo, taake dono ek sath handle ho sakein
  const allEvents = [
    ...visibleLeads
      .filter(l => l.followUpTime)
      .map(l => ({
        id: `lead-${l.id}`,
        type: 'Lead',
        title: l.company,
        time: l.followUpTime,
        status: l.status
      })),
    ...visibleFollowUps
      .filter(f => f.followUpTime)
      .map(f => ({
        id: `followup-${f.id}`,
        type: 'Follow-up',
        title: f.businessName,
        time: f.followUpTime,
        status: f.status
      }))
  ];

  // Date ko "YYYY-MM-DD" string mein badalne wala helper
  const dateKey = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Har date ke liye events ki list bana lo (fast lookup ke liye)
  const eventsByDate = {};
  allEvents.forEach(ev => {
    const key = dateKey(ev.time);
    if (!eventsByDate[key]) eventsByDate[key] = [];
    eventsByDate[key].push(ev);
  });

  // Calendar grid banane ke liye zaroori numbers nikalo
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDayOfMonth.getDay(); // 0 = Sunday

  const goToPrevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const goToNextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
  };

  const selectedEvents = eventsByDate[dateKey(selectedDate)] || [];

  // Calendar cells ka array banao (khaali cells + actual din)
  const cells = [];
  for (let i = 0; i < startWeekday; i++) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(new Date(year, month, day));
  }

  return (
    <div className="bx-content" style={{ overflowY: 'auto' }}>
      <div className="bx-content-header">
        <h1 className="bx-page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CalendarIcon color="var(--bx-accent-blue)" /> Calendar
        </h1>
        <p style={{ color: 'var(--bx-text-muted)' }}>Track your leads and follow-ups on the go.</p>
      </div>

      <div className="bx-charts-grid" style={{ padding: '20px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Calendar Grid */}
        <div className="bx-widget-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <button className="bx-btn" onClick={goToPrevMonth}><ChevronLeft size={16} /></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '16px', fontWeight: 600 }}>{MONTH_NAMES[month]} {year}</span>
              <button className="bx-btn" onClick={goToToday} style={{ fontSize: '12px', padding: '6px 10px' }}>Today</button>
            </div>
            <button className="bx-btn" onClick={goToNextMonth}><ChevronRight size={16} /></button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {WEEKDAYS.map(wd => (
              <div key={wd} style={{ textAlign: 'center', fontSize: '12px', color: 'var(--bx-text-muted)', padding: '8px 0', fontWeight: 600 }}>
                {wd}
              </div>
            ))}
            {cells.map((cellDate, idx) => {
              if (!cellDate) return <div key={idx} />;
              const key = dateKey(cellDate);
              const dayEvents = eventsByDate[key] || [];
              const isSelected = dateKey(selectedDate) === key;
              const isToday = dateKey(new Date()) === key;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedDate(cellDate)}
                  style={{
                    minHeight: '64px',
                    padding: '8px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    border: isSelected ? '2px solid var(--bx-accent-blue)' : '1px solid var(--bx-border)',
                    background: isToday ? 'rgba(255,255,255,0.04)' : 'transparent',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--bx-accent-blue)' : 'inherit' }}>
                    {cellDate.getDate()}
                  </span>
                  {dayEvents.length > 0 && (
                    <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                      {dayEvents.slice(0, 3).map(ev => (
                        <div
                          key={ev.id}
                          style={{
                            width: '6px', height: '6px', borderRadius: '50%',
                            background: ev.type === 'Lead' ? 'var(--bx-accent-blue)' : 'var(--bx-accent-orange)'
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date's Events */}
        <div className="bx-widget-card">
          <h3 style={{ fontSize: '14px', margin: '0 0 14px 0' }}>
            {selectedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {selectedEvents.map(ev => (
              <div
                key={ev.id}
                style={{
                  padding: '12px', background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--bx-border)', borderRadius: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  {ev.type === 'Lead' ? <Target size={14} color="var(--bx-accent-blue)" /> : <Briefcase size={14} color="var(--bx-accent-orange)" />}
                  <span style={{ fontSize: '11px', fontWeight: 600, color: ev.type === 'Lead' ? 'var(--bx-accent-blue)' : 'var(--bx-accent-orange)' }}>
                    {ev.type}
                  </span>
                </div>
                <div style={{ fontWeight: 600, fontSize: '14px' }}>{ev.title}</div>
                <div style={{ fontSize: '12px', color: 'var(--bx-text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} /> {new Date(ev.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--bx-text-muted)', marginTop: '2px' }}>
                  Status: {ev.status}
                </div>
              </div>
            ))}
            {selectedEvents.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--bx-text-muted)', fontSize: '13px' }}>
                No follow-ups or leads scheduled for this this date.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}