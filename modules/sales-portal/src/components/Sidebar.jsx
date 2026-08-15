import React, { useState } from 'react';
import {
  Users,
  CheckSquare,
  MessageCircle,
  Calendar,
  Video,
  HardDrive,
  Monitor,
  Briefcase,
  Layers,
  FileText
} from 'lucide-react';

export default function Sidebar({ activeItem, setActiveItem, userRole, sidebarOpen }) {

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Monitor },
    { id: 'crm', label: 'CRM', icon: Users },
    ...(userRole === 'Admin' || userRole === 'Super Admin' ? [
      { id: 'approvalRequests', label: 'Leads Submission', icon: CheckSquare },
      { id: 'agreementRequests', label: 'Request for Agreement', icon: CheckSquare }
    ] : []),
    ...(userRole === 'Employee' ? [{ id: 'myLeadsFollowUp', label: 'Leads Follow-Up', icon: CheckSquare }] : []),
    { id: 'tasks', label: 'Tasks and Projects', icon: CheckSquare },
    { id: 'followups', label: 'Follow-ups', icon: CheckSquare },
    { id: 'notInterested', label: 'Not Interested', icon: CheckSquare },
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'meetings', label: 'Meetings', icon: Video },
    { id: 'campaigns', label: 'Campaigns', icon: Layers },
    ...(userRole === 'Admin' || userRole === 'Super Admin' ? [{ id: 'company', label: 'Company', icon: Briefcase }] : []),
    { id: 'docs', label: 'Documents', icon: FileText },
    ...(userRole === 'Admin' || userRole === 'Super Admin' ? [{ id: 'employees', label: 'Employees', icon: Users }] : []),
  ];

  return (
    <aside className={`bx-sidebar ${sidebarOpen ? 'open' : ''}`}>
      {menuItems.map(item => {
        const Icon = item.icon;
        return (
          <div
            key={item.id}
            className={`bx-menu-item ${activeItem === item.id ? 'active' : ''}`}
            onClick={() => setActiveItem(item.id)}
          >
            <Icon size={18} opacity={activeItem === item.id ? 1 : 0.6} color={activeItem === item.id ? 'var(--bx-accent-blue)' : 'inherit'} />
            {item.label}
          </div>
        );
      })}

      <div className="bx-menu-title">More</div>

      <div className={`bx-menu-item ${activeItem === 'settings' ? 'active' : ''}`} onClick={() => setActiveItem('settings')} style={{ cursor: 'pointer' }}>
        <span>Settings</span>
      </div>
      <div className="bx-menu-item" onClick={() => window.open('https://maps.google.com', '_blank')} style={{ cursor: 'pointer' }}>
        <span>Sitemap</span>
      </div>
    </aside>
  );
}
