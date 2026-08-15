import Settings from './components/Settings';
import socket from './lib/socket';
import { listLeads, listFollowUps, fetchCompanies } from './lib/frappeApi';
import React, { useState, useEffect } from 'react';
import TopBar from './components/TopBar';
import Sidebar from './components/Sidebar';
import RightChatBar from './components/RightChatBar';
import CRMBoard from './components/CRMBoard';
import ClassicDashboard from './components/ClassicDashboard';
import LeadTracker from './components/LeadTracker';
import AgentFollowUp from './components/AgentFollowUp';
import Login from './components/Login';
import Meetings from './components/Meetings';
import { BellRing, X } from 'lucide-react';


// New imported placeholder components
import Tasks from './components/Tasks';
import ChatCalls from './components/ChatCalls';
import CalendarView from './components/CalendarView';
import Company from './components/Company';
import Documents from './components/Documents';
import Campaigns from './components/Campaigns';
import EmployeeManagement from './components/EmployeeManagement';
import LeadsFollowUp from './components/LeadsFollowUp';

import './App.css';
function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 880; // "ding" jaisi pitch
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (err) {
    console.error('Sound play error:', err);
  }
}
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('crm_user'));
  const [userRole, setUserRole] = useState(() => localStorage.getItem('crm_role') || null);
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('crm_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [activeItem, setActiveItem] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Lifted Leads State
  const [leads, setLeads] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [googleConnected, setGoogleConnected] = useState(false);

  // Employee ki khud ki assigned campaigns ki IDs nikalo (Admin ke liye zaroorat nahi)
  const myCampaignIds = campaigns
    .filter(c => c.assignedAgentId === currentUser?.id)
    .map(c => c.id);

  const isAdminUser = userRole === 'Admin' || userRole === 'Super Admin';
  const visibleCompanies = isAdminUser
    ? companies
    : companies.filter(c => myCampaignIds.includes(c.campaignId));

  const [activeReminders, setActiveReminders] = useState([]);
  const previousReminderIdsRef = React.useRef(new Set());
  const [dismissedReminderIds, setDismissedReminderIds] = useState(new Set());
  const activeRemindersRef = React.useRef([]);
  const dismissedRef = React.useRef(new Set());
  const [meetingNotifications, setMeetingNotifications] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const DEFAULT_WIDGETS = {
    showCommission: true,
    showActiveDeals: true,
    showTotalLeads: true,
    showConversion: true,
    showChart: true,
    showActivity: true,
    shortcuts: ['crm', 'tasks', 'chat', 'calendar', 'meetings', 'followups']
  };

  const [widgetPrefs, setWidgetPrefs] = useState(() => {
    const saved = localStorage.getItem(`crm_widgets_${currentUser?.id}`);
    return saved ? JSON.parse(saved) : DEFAULT_WIDGETS;
  });

  useEffect(() => {
    if (currentUser?.id) {
      localStorage.setItem(`crm_widgets_${currentUser.id}`, JSON.stringify(widgetPrefs));
    }
  }, [widgetPrefs, currentUser]);
  const [messageNotifications, setMessageNotifications] = useState([]);
  const [pendingLeadId, setPendingLeadId] = useState(null);
  const sessionTimeoutRef = React.useRef(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('crm_theme') || 'dark');

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('crm_theme', theme);
  }, [theme]);
  const [showNotification, setShowNotification] = useState(false);

  // Fetch data from Frappe cclms (via frappeApi — no Node backend)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [leadsData, followUpsData, companiesData] = await Promise.all([
          listLeads().catch(() => []),
          listFollowUps().catch(() => []),
          fetchCompanies().catch(() => []),
        ]);
        setLeads(leadsData);
        setFollowUps(followUpsData);
        setCompanies(companiesData);
        setCampaigns([]);
        setDocuments([]);
        setMeetings([]);
        setTasks([]);
        setGoogleConnected(false);
      } catch (error) {
        console.error("Error fetching data from backend:", error);
      } finally {
        setDataLoading(false);
      }
    };

    if (isAuthenticated) fetchData();
  }, [isAuthenticated]);

  // Follow-up reminders check
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const newReminders = [];

      const checkItem = (item, type, titleField) => {
        if (!item.followUpTime) return;
        const targetTime = new Date(item.followUpTime);
        const diffMs = targetTime - now;
        const diffMins = diffMs / 60000;

        if (diffMins > -5 && diffMins <= 10) {
          newReminders.push({ id: `${type}-${item.id}`, type, title: item[titleField], targetTime });
        }
      };

      leads.forEach(l => checkItem(l, 'Lead', 'company'));
      followUps.forEach(f => checkItem(f, 'Follow-up', 'businessName'));

      // Sirf woh reminders jo PEHLE nahi thay, unhi pe sound bajao
      // Sirf woh reminders jo PEHLE nahi thay, unhi pe sound bajao
      const newIds = new Set(newReminders.map(r => r.id));
      const hasNewReminder = newReminders.some(r => !previousReminderIdsRef.current.has(r.id));
      if (hasNewReminder) {
        playNotificationSound();
      }
      previousReminderIdsRef.current = newIds;

      // Jo reminders ab expire ho chuke hain, unhe dismissed list se bhi hata do
      setDismissedReminderIds(prev => new Set([...prev].filter(id => newIds.has(id))));

      setActiveReminders(newReminders);
    };

    checkReminders();
    const interval = setInterval(checkReminders, 30000);
    return () => clearInterval(interval);
  }, [leads, followUps]);

  useEffect(() => {
    activeRemindersRef.current = activeReminders;
  }, [activeReminders]);

  useEffect(() => {
    dismissedRef.current = dismissedReminderIds;
  }, [dismissedReminderIds]);

  useEffect(() => {
    const repeatInterval = setInterval(() => {
      const visible = activeRemindersRef.current.filter(r => !dismissedRef.current.has(r.id));
      if (visible.length > 0) {
        playNotificationSound();
      }
    }, 10000); // har 10 second

    return () => clearInterval(repeatInterval);
  }, []);

  // Naya meeting bante hi notification
  // Naya meeting bante hi notification
  useEffect(() => {
    const handleNewMeeting = (meeting) => {
      setMeetings(prev => [meeting, ...prev]);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 8000);
      if (activeItem !== 'meetings') {
        setMeetingNotifications(prev => [
          { id: meeting.id, title: meeting.title, time: meeting.meetingTime },
          ...prev
        ]);
      }
    };
    socket.on('new-meeting', handleNewMeeting);
    return () => socket.off('new-meeting', handleNewMeeting);
  }, [activeItem]);

  useEffect(() => {
    const handleNewMessage = (message) => {
      if (message.senderId !== currentUser?.id && activeItem !== 'chat') {
        setMessageNotifications(prev => [
          {
            id: message.id,
            senderName: message.sender?.name || 'Someone',
            text: message.isSticker ? 'Sticker' : (message.fileUrl ? 'Attachment' : message.text),
            time: message.createdAt
          },
          ...prev
        ]);
      }
    };
    socket.on('new-message', handleNewMessage);
    return () => socket.off('new-message', handleNewMessage);
  }, [activeItem, currentUser]);

  useEffect(() => {
    if (activeItem === 'meetings') setMeetingNotifications([]);
    if (activeItem === 'chat') setMessageNotifications([]);
  }, [activeItem]);

  // Refresh ke baad bhi socket ko batao kaun online hai
  useEffect(() => {
    if (currentUser?.id) {
      socket.emit('identify', currentUser.id);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const SESSION_TIMEOUT = 15 * 60 * 1000; // 15 minute

    const resetSessionTimer = () => {
      if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
      sessionTimeoutRef.current = setTimeout(() => {
        alert('No activity in 15 minutes, logging out for security.');
        handleLogout();
      }, SESSION_TIMEOUT);
    };

    resetSessionTimer();
    window.addEventListener('mousemove', resetSessionTimer);
    window.addEventListener('keydown', resetSessionTimer);
    window.addEventListener('click', resetSessionTimer);

    return () => {
      window.removeEventListener('mousemove', resetSessionTimer);
      window.removeEventListener('keydown', resetSessionTimer);
      window.removeEventListener('click', resetSessionTimer);
      if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
    };
  }, [isAuthenticated]);

  const dismissReminder = (id) => {
    setDismissedReminderIds(prev => new Set([...prev, id]));
  };

  const triggerNotification = () => {
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 8000);
  };

  const renderContent = () => {
    switch (activeItem) {
      case 'dashboard': return <ClassicDashboard setActiveItem={setActiveItem} leads={leads} currentUser={currentUser} userRole={userRole} widgetPrefs={widgetPrefs} setWidgetPrefs={setWidgetPrefs} dataLoading={dataLoading} />;
      case 'crm': return <LeadTracker leads={leads} setLeads={setLeads} triggerNotification={triggerNotification} userRole={userRole} currentUser={currentUser} companies={visibleCompanies} pendingLeadId={pendingLeadId} setPendingLeadId={setPendingLeadId} />;
      case 'approvalRequests': return <LeadTracker leads={leads} setLeads={setLeads} triggerNotification={triggerNotification} userRole={userRole} currentUser={currentUser} lockedStatus="Submitted" companies={visibleCompanies} />;
      case 'agreementRequests': return <LeadTracker leads={leads} setLeads={setLeads} triggerNotification={triggerNotification} userRole={userRole} currentUser={currentUser} lockedStatus="Request for Agreement" companies={visibleCompanies} />;
      case 'myLeadsFollowUp': return <LeadsFollowUp currentUser={currentUser} leads={leads} setLeads={setLeads} companies={visibleCompanies} />;
      case 'followups': return <AgentFollowUp followUps={followUps} setFollowUps={setFollowUps} currentUser={currentUser} userRole={userRole} companies={visibleCompanies} />;
      case 'notInterested': return <AgentFollowUp followUps={followUps} setFollowUps={setFollowUps} currentUser={currentUser} userRole={userRole} filterStatus="Not Interested" companies={visibleCompanies} />;
      case 'tasks': return <Tasks tasks={tasks} setTasks={setTasks} currentUser={currentUser} userRole={userRole} />;
      case 'chat': return <ChatCalls currentUser={currentUser} userRole={userRole} />;
      case 'calendar': return <CalendarView leads={leads} followUps={followUps} currentUser={currentUser} userRole={userRole} />;
      case 'company': return <Company companies={companies} setCompanies={setCompanies} campaigns={campaigns} />;
      case 'settings': return <Settings currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} setTheme={setTheme} />;
      case 'docs': return <Documents documents={documents} setDocuments={setDocuments} currentUser={currentUser} userRole={userRole} />;
      case 'campaigns': return <Campaigns campaigns={campaigns} setCampaigns={setCampaigns} userRole={userRole} />;
      case 'employees': return <EmployeeManagement userRole={userRole} campaigns={campaigns} />;
      case 'meetings': return <Meetings meetings={meetings} setMeetings={setMeetings} currentUser={currentUser} userRole={userRole} googleConnected={googleConnected} />;
      default: return <ClassicDashboard setActiveItem={setActiveItem} />;
    }
  };

  const handleLogin = (user) => {
    localStorage.setItem('crm_user', JSON.stringify(user));
    localStorage.setItem('crm_role', user.role);
    setIsAuthenticated(true);
    setUserRole(user.role);
    setCurrentUser(user);
    socket.emit('identify', user.id);
  };

  const handleLogout = () => {
    if (currentUser?.id) {
      socket.emit('logout', currentUser.id);
    }
    localStorage.removeItem('crm_user');
    localStorage.removeItem('crm_role');
    setIsAuthenticated(false);
    setUserRole(null);
    setCurrentUser(null);
  };

  const urlParams = new URLSearchParams(window.location.search);
  const resetTokenFromUrl = urlParams.get('resetToken');

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} resetTokenFromUrl={resetTokenFromUrl} />;
  }

  return (
    <div className="bx-layout">
      {(() => {
        const visibleReminders = activeReminders.filter(r => !dismissedReminderIds.has(r.id));
        return (visibleReminders.length > 0) && (
          <div className="ring-notification" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

            {visibleReminders.map(rem => (
              <div key={rem.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: showNotification ? '10px' : '0' }}>
                <BellRing size={24} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>Upcoming {rem.type}: {rem.title}</div>
                  <div style={{ fontSize: '12px', opacity: 0.9 }}>Sent to employee 10 minutes before callback at {new Date(rem.targetTime).toLocaleTimeString()}</div>
                </div>
                <X size={18} style={{ cursor: 'pointer', opacity: 0.8, flexShrink: 0 }} onClick={() => dismissReminder(rem.id)} />
              </div>
            ))}
          </div>
        );
      })()}

      <TopBar
        onLogout={handleLogout}
        currentUser={currentUser}
        leads={leads}
        setActiveItem={setActiveItem}
        setPendingLeadId={setPendingLeadId}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        meetingNotifications={meetingNotifications}
        messageNotifications={messageNotifications}
      />
      <div className="bx-body">
        <Sidebar
          activeItem={activeItem}
          setActiveItem={(item) => { setActiveItem(item); setSidebarOpen(false); }}
          userRole={userRole}
          sidebarOpen={sidebarOpen}
        />
        <div
          className={`bx-sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />
        <div className="bx-main-wrapper">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default App;