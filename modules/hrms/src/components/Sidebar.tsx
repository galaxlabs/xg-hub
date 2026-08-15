import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, UserCheck, CreditCard, Briefcase, Building, Settings, ClipboardList, Receipt, FileSearch, CalendarDays } from 'lucide-react';
import { useAuth } from '../context/useAuth'; 
import './Sidebar.css';

interface SidebarProps {
  isOpen: boolean;
  isMobile?: boolean;
  closeSidebar?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, isMobile, closeSidebar }) => {
  const { user } = useAuth();

  const allMenuItems = [
    { title: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/', roles: ['admin'] },
    { title: 'Employees', icon: <Users size={20} />, path: '/employees', roles: ['admin'] },
    { title: 'Attendance', icon: <UserCheck size={20} />, path: '/attendance', roles: ['admin', 'employee'] },
    { title: 'Leaves', icon: <CalendarDays size={20} />, path: '/leaves', roles: ['employee'] },
    { title: 'Manage Leaves', icon: <CalendarDays size={20} />, path: '/admin-leaves', roles: ['admin'] },
    { title: 'Bank Details', icon: <Building size={20} />, path: '/bank-details', roles: ['admin'] },
    { title: 'Payroll', icon: <CreditCard size={20} />, path: '/payroll', roles: ['admin'] },
    { title: 'Payslip', icon: <Receipt size={20} />, path: '/payslip-generator', roles: ['admin'] },
    { title: 'Tasks', icon: <ClipboardList size={20} />, path: '/tasks', roles: ['admin', 'employee'] },
    { title: 'Recruitment', icon: <Briefcase size={20} />, path: '/recruitment', roles: ['admin'] },
    { title: 'CV Scanner', icon: <FileSearch size={20} />, path: '/cv-scanner', roles: ['admin'] },
    { title: 'Application Status', icon: <LayoutDashboard size={20} />, path: '/candidate-dashboard', roles: ['candidate'] },
    { title: 'Settings', icon: <Settings size={20} />, path: '/settings', roles: ['admin'] },
  ];

  const menuItems = allMenuItems.filter(item => {
    if (!user || !user.role) return false;
    const userRole = user.role.toLowerCase(); // Role ko lowercase kar diya
    return item.roles.includes(userRole);
  });
  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <div className="sidebar-header">
        <div className="logo-container">
          <div className="logo-icon-wrapper">
            <img src="/logo.png" alt="X" className="sidebar-logo-img" />
          </div>
          {(isOpen || isMobile) && (
            <div className="logo-text-wrapper">
              <span className="logo-brand">Xperts</span>
              <span className="logo-suffix">Global</span>
            </div>
          )}
        </div>
      </div>

      <nav className="sidebar-nav">
        <ul>
          {menuItems.map((item, index) => (
            <li key={index}>
              <NavLink
                to={item.path}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                title={!isOpen && !isMobile ? item.title : ''}
                onClick={() => {
                  if (isMobile && closeSidebar) {
                    closeSidebar();
                  }
                }}
              >
                <span className="nav-icon">{item.icon}</span>
                {(isOpen || isMobile) && <span className="nav-text">{item.title}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-footer">
        {(isOpen || isMobile) && user && (
          <div className="user-info">
            <div className="avatar">{(user.name || user.email || 'U').charAt(0).toUpperCase()}</div>
            <div className="user-details">
              <span className="user-name">{user.name || 'User'}</span>
              <span className="user-role" style={{ textTransform: 'capitalize' }}>{user.role}</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
