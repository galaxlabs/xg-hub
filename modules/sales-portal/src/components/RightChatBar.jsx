import React, { useState, useEffect } from 'react';
import { Bell, Video, MessageSquare } from 'lucide-react';
import socket from '../lib/socket';

export default function RightChatBar({ currentUser, unseenMeetings, unseenMessages, setActiveItem }) {
  const [employees, setEmployees] = useState([]);
  const [userStatuses, setUserStatuses] = useState({});

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch('/api/employees');
        if (res.ok) {
          const data = await res.json();
          setEmployees(data.filter(e => e.id !== currentUser?.id));
        }
      } catch (err) {
        console.error('Error loading employees:', err);
      }
    };
    if (currentUser?.id) fetchEmployees();
  }, [currentUser]);

  useEffect(() => {
    socket.on('all-statuses', (statuses) => setUserStatuses(statuses));
    socket.on('user-status-changed', ({ employeeId, status }) => {
      setUserStatuses(prev => ({ ...prev, [employeeId]: status }));
    });
    return () => {
      socket.off('all-statuses');
      socket.off('user-status-changed');
    };
  }, []);

  const totalNotifications = unseenMeetings + unseenMessages;

  return (
    <div className="bx-right-bar">
      <div
        style={{ color: 'var(--bx-text-muted)', cursor: 'pointer', position: 'relative' }}
        title="Notifications"
        onClick={() => {
          if (unseenMeetings > 0) setActiveItem('meetings');
          else if (unseenMessages > 0) setActiveItem('chat');
        }}
      >
        <Bell size={20} />
        {totalNotifications > 0 && (
          <div style={{
            position: 'absolute', top: '-4px', right: '-4px', background: 'var(--bx-accent-red)',
            width: '14px', height: '14px', borderRadius: '50%', color: 'white', fontSize: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
          }}>
            {totalNotifications > 9 ? '9+' : totalNotifications}
          </div>
        )}
      </div>

      {unseenMeetings > 0 && (
        <div
          style={{ color: 'var(--bx-accent-orange)', cursor: 'pointer' }}
          title={`${unseenMeetings} naya meeting`}
          onClick={() => setActiveItem('meetings')}
        >
          <Video size={18} />
        </div>
      )}

      <div style={{ width: '40px', height: '1px', background: 'var(--bx-border)', margin: '8px 0' }}></div>

      {/* Real online employees */}
      {employees.map(emp => {
        const status = userStatuses[emp.id] || 'offline';
        const statusColor = status === 'active' ? 'var(--bx-accent-green)' : status === 'inactive' ? 'var(--bx-accent-orange)' : 'var(--bx-text-muted)';
        return (
          <div
            key={emp.id}
            className="bx-chat-avatar"
            title={emp.name}
            onClick={() => setActiveItem('chat')}
            style={{ cursor: 'pointer' }}
          >
            {emp.name.substring(0, 2).toUpperCase()}
            <div className="bx-status-dot" style={{ background: statusColor }}></div>
          </div>
        );
      })}

      <div
        style={{ marginTop: 'auto', marginBottom: '20px', color: 'var(--bx-text-muted)', cursor: 'pointer', position: 'relative' }}
        title="Open Messenger"
        onClick={() => setActiveItem('chat')}
      >
        <MessageSquare size={24} />
        {unseenMessages > 0 && (
          <div style={{
            position: 'absolute', top: '-4px', right: '-4px', background: 'var(--bx-accent-red)',
            width: '14px', height: '14px', borderRadius: '50%', color: 'white', fontSize: '10px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
          }}>
            {unseenMessages > 9 ? '9+' : unseenMessages}
          </div>
        )}
      </div>
    </div>
  );
}