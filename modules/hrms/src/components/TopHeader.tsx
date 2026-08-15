import React, { useState, useRef, useEffect } from 'react';
import { Menu, Bell, Search, User, LogOut, CheckCircle, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/useAuth';
import { useNavigate } from 'react-router-dom';
import { fetchEmployees, fetchNotifications, markNotificationRead, markAllNotificationsRead } from '../api';
import './TopHeader.css';

const format12HourTime = (timeStr: any) => {
  if (!timeStr) return '-';
  try {
    // If it's already a 24-hour HH:MM:SS or similar format
    const parts = String(timeStr).split(':');
    if (parts.length < 2) return timeStr;
    let h = parseInt(parts[0]);
    const m = parts[1];
    if (isNaN(h)) return timeStr;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12.toString().padStart(2, '0')}:${m} ${ampm}`;
  } catch(e) {
    return '-';
  }
};

interface TopHeaderProps {
  toggleSidebar: () => void;
}

const TopHeader: React.FC<TopHeaderProps> = ({ toggleSidebar }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Search implementation
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<any[]>([]);

  const loadNotifications = async () => {
    if (!user) return;
    try {
      const data = await fetchNotifications(user.role || 'employee', user.empId);
      setNotifications(data);
    } catch(e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAllRead = async () => {
    if (!user) return;
    try {
      await markAllNotificationsRead(user.role || 'employee', user.empId);
      setNotifications([]);
      setShowNotifications(false);
    } catch(e) { console.error(e); }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch(e) { console.error(e); }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setSearchTerm('');
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (searchTerm.length > 1) {
      fetchEmployees().then(employees => {
        const results = employees.filter((emp: any) => 
          emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          emp.role.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setSearchResults(results.slice(0, 4));
      }).catch(() => setSearchResults([]));
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);
  
  return (
    <header className="top-header">
      <div className="header-left">
        <button className="menu-btn mobile-only" onClick={toggleSidebar}>
          <Menu size={24} />
        </button>
        <button className="menu-btn desktop-only" onClick={toggleSidebar}>
          <Menu size={24} />
        </button>
        {user?.role === 'admin' && (
          <div className="search-bar hidden-mobile" ref={searchRef}>
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Search employees by name or role..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchTerm.trim()) {
                  navigate('/employees', { state: { searchTarget: searchTerm.trim() } });
                  setSearchTerm('');
                }
              }}
            />
            {searchTerm.length > 1 && (
              <div className="search-dropdown animate-fade-in">
                {searchResults.length > 0 ? (
                  <>
                    <div className="search-group-title">Employees</div>
                    {searchResults.map((emp, idx) => (
                      <div className="search-result-item" key={idx} onClick={() => { setSearchTerm(''); navigate('/employees', { state: { searchTarget: emp.name } }); }}>
                        <div className="search-avatar">{emp.name.charAt(0)}</div>
                        <div className="search-details">
                          <span>{emp.name}</span>
                          <small>{emp.role}</small>
                        </div>
                        <ChevronRight size={14} style={{marginLeft: 'auto', color: 'var(--text-muted)'}} />
                      </div>
                    ))}
                  </>
                ) : (
                  <div style={{padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem'}}>No global results found.</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="header-right">
        <div className="notification-wrapper" ref={dropdownRef}>
          <button 
            className={`icon-btn notification-btn ${showNotifications ? 'active' : ''}`} 
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={20} />
            {notifications.length > 0 && <span className="notif-badge">{notifications.length}</span>}
          </button>
          
          {showNotifications && (
            <div className="notifications-dropdown animate-fade-in">
              <div className="dropdown-header">
                <h3>Notifications</h3>
                <span className="mark-read" onClick={handleMarkAllRead} style={{cursor: 'pointer'}}><CheckCircle size={14} style={{marginRight: 4}}/> Mark all read</span>
              </div>
              <div className="dropdown-body">
                {notifications.length === 0 ? (
                  <p style={{padding: '1rem', textAlign: 'center', color: 'var(--text-muted)'}}>All caught up!</p>
                ) : notifications.map(n => (
                  <div key={n.id} className={`notif-item ${n.type || 'info'}`} onClick={() => handleMarkRead(n.id)} style={{cursor: 'pointer'}}>
                    <div className="notif-dot"></div>
                    <div className="notif-content">
                      <p>{n.text}</p>
                      <span>{format12HourTime(n.time)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="dropdown-footer">
                <button>Close</button>
              </div>
            </div>
          )}
        </div>

        <button className="icon-btn logout-btn" onClick={logout} title="Sign Out">
          <LogOut size={20} />
        </button>
        <div className="header-profile">
          <div className="profile-img">
            {user ? (user.name || user.email || 'U').charAt(0).toUpperCase() : <User size={20} />}
          </div>
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
