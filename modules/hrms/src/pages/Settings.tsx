import React, { useState, useEffect } from 'react';
import { User, Bell, Shield, Save, MapPin } from 'lucide-react';
import { useAuth } from '../context/useAuth'; 
import toast from 'react-hot-toast';
import {
  fetchSettings,
  updatePasswordSettings,
  updateProfileSettings,
  updateSettings
} from '../api';
import './Settings.css';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  
  const [officeLatitude, setOfficeLatitude] = useState('24.850553');
  const [officeLongitude, setOfficeLongitude] = useState('67.029388');
  const [geofenceRadius, setGeofenceRadius] = useState('0.3');
  const [latePolicy, setLatePolicy] = useState<'Standard' | 'Strict'>('Standard');
  const [emailAlertsNewEmp, setEmailAlertsNewEmp] = useState(true);
  const [weeklyPayrollSummary, setWeeklyPayrollSummary] = useState(true);
  const [fullName, setFullName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFullName(user?.name || '');
    setEmail(user?.email || '');
  }, [user]);

  useEffect(() => {
    fetchSettings()
      .then((data) => {
        if (data.officeLatitude !== undefined) setOfficeLatitude(String(data.officeLatitude));
        if (data.officeLongitude !== undefined) setOfficeLongitude(String(data.officeLongitude));
        if (data.geofenceRadius !== undefined) setGeofenceRadius(String(data.geofenceRadius));
        if (data.latePolicy === 'Standard' || data.latePolicy === 'Strict') setLatePolicy(data.latePolicy);
        setEmailAlertsNewEmp(Boolean(data.emailAlertsNewEmp));
        setWeeklyPayrollSummary(Boolean(data.weeklyPayrollSummary));
      })
      .catch((error) => {
        console.error(error);
        toast.error('Failed to load system settings');
      });
  }, []);

  const updateSessionUser = (nextName: string, nextEmail: string) => {
    try {
      const storedRaw = localStorage.getItem('hrms_session');
      if (!storedRaw) return;
      const session = JSON.parse(storedRaw);
      if (session?.user) {
        session.user.name = nextName;
        session.user.email = nextEmail;
        localStorage.setItem('hrms_session', JSON.stringify(session));
      }
    } catch (err) {
      console.error('Failed to update local session user:', err);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      if (activeTab === 'attendance') {
        // Validate numeric inputs
        const lat = parseFloat(officeLatitude);
        const lng = parseFloat(officeLongitude);
        const radius = parseFloat(geofenceRadius);
        
        if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
          toast.error('Please enter valid numeric values for latitude, longitude, and radius');
          return;
        }
        
        if (lat < -90 || lat > 90) {
          toast.error('Latitude must be between -90 and 90');
          return;
        }
        
        if (lng < -180 || lng > 180) {
          toast.error('Longitude must be between -180 and 180');
          return;
        }
        
        if (radius < 0.1 || radius > 10) {
          toast.error('Geofence radius must be between 0.1 and 10 miles');
          return;
        }
        
        await updateSettings({
          officeLatitude: lat,
          officeLongitude: lng,
          geofenceRadius: radius,
          latePolicy
        });
        toast.success('Attendance settings updated');
      } else if (activeTab === 'notifications') {
        await updateSettings({
          emailAlertsNewEmp,
          weeklyPayrollSummary
        });
        toast.success('Notification preferences saved');
      } else if (activeTab === 'profile') {
        const response = await updateProfileSettings({ fullName, email });
        updateSessionUser(response?.user?.name || fullName, response?.user?.email || email);
        toast.success('Profile updated successfully');
      } else if (activeTab === 'security') {
        if (!currentPassword || !newPassword) {
          throw new Error('Please fill current and new password');
        }
        if (newPassword !== confirmPassword) {
          throw new Error('New password and confirm password do not match');
        }
        await updatePasswordSettings({ currentPassword, newPassword });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        toast.success('Password updated successfully');
      } else {
        toast.success('Settings saved');
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Error saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="settings-page animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">System Settings</h1>
          <p className="page-subtitle">Manage your account preferences, notifications, and security options.</p>
        </div>
        <button className="btn-primary" onClick={handleSaveSettings} disabled={isSaving}>
          <Save size={18} style={{marginRight: '0.5rem'}} /> {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="settings-container">
        <aside className="settings-sidebar">
          <ul className="settings-nav">
            <li className={activeTab === 'profile' ? 'active' : ''} onClick={() => setActiveTab('profile')}>
              <User size={18} /> My Profile
            </li>
            <li className={activeTab === 'notifications' ? 'active' : ''} onClick={() => setActiveTab('notifications')}>
              <Bell size={18} /> Notifications
            </li>
            <li className={activeTab === 'security' ? 'active' : ''} onClick={() => setActiveTab('security')}>
              <Shield size={18} /> Security
            </li>
            {user?.role === 'admin' && (
              <li className={activeTab === 'attendance' ? 'active' : ''} onClick={() => setActiveTab('attendance')}>
                <MapPin size={18} /> Attendance
              </li>
            )}
          </ul>
        </aside>

        <main className="settings-content">
          <div className="card settings-card">
            {activeTab === 'profile' && (
              <div className="tab-pane">
                <h3>Profile Information</h3>
                <div className="form-group-row">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="form-control"
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="form-control"
                    />
                  </div>
                </div>
                <div className="form-group-row">
                  <div className="form-group">
                    <label>Employee ID</label>
                    <input type="text" value={user?.empId || 'N/A'} className="form-control" disabled style={{ backgroundColor: 'var(--bg-color)', cursor: 'not-allowed', opacity: 0.7 }} />
                  </div>
                  <div className="form-group">
                    <label>Role</label>
                    <input type="text" value={user?.role?.toUpperCase()} className="form-control" disabled style={{ backgroundColor: 'var(--bg-color)', cursor: 'not-allowed', opacity: 0.7 }} />
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'notifications' && (
              <div className="tab-pane">
                <h3>Notification Preferences</h3>
                <div className="toggle-group">
                  <label>Email Alerts for New Employees</label>
                  <input
                    type="checkbox"
                    checked={emailAlertsNewEmp}
                    onChange={(e) => setEmailAlertsNewEmp(e.target.checked)}
                  />
                </div>
                <div className="toggle-group">
                  <label>Weekly Payroll Summary</label>
                  <input
                    type="checkbox"
                    checked={weeklyPayrollSummary}
                    onChange={(e) => setWeeklyPayrollSummary(e.target.checked)}
                  />
                </div>
              </div>
            )}
            
            {activeTab === 'security' && (
              <div className="tab-pane">
                <h3>Password & Security</h3>
                <div className="form-group">
                  <label>Current Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="form-control"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new password"
                    className="form-control"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    className="form-control"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <button
                  className="btn-secondary"
                  style={{marginTop: '1rem'}}
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                >
                  Update Password
                </button>
              </div>
            )}
            
            {activeTab === 'attendance' && user?.role === 'admin' && (
              <div className="tab-pane">
                <h3>Location-Based Attendance Configuration</h3>
                <p style={{fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem'}}>
                  Set the fixed office coordinates and the allowed geofence radius. Employees must be within this radius with location services active to clock in or out.
                </p>
                <div className="form-group-row">
                  <div className="form-group">
                    <label>Office Latitude</label>
                    <input type="number" step="any" value={officeLatitude} onChange={e => setOfficeLatitude(e.target.value)} className="form-control border-input" />
                  </div>
                  <div className="form-group">
                    <label>Office Longitude</label>
                    <input type="number" step="any" value={officeLongitude} onChange={e => setOfficeLongitude(e.target.value)} className="form-control border-input" />
                  </div>
                </div>
                <div className="form-group" style={{maxWidth: '50%'}}>
                  <label>Geofence Radius (in miles)</label>
                  <input type="number" step="0.01" value={geofenceRadius} onChange={e => setGeofenceRadius(e.target.value)} className="form-control border-input" />
                  <small style={{display: 'block', marginTop: '0.5rem', color: 'var(--text-muted)'}}>Default is 0.3 miles. Users outside this radius will be blocked from checking in.</small>
                </div>

                <div className="form-group" style={{marginTop: '1.5rem', maxWidth: '50%'}}>
                  <label>Late Deduction Policy</label>
                  <select value={latePolicy} onChange={e => setLatePolicy(e.target.value as 'Standard' | 'Strict')} className="form-control border-input">
                    <option value="Standard">3 Lates = 1 Day Deduction (Standard)</option>
                    <option value="Strict">1 Late = 1 Day Deduction (Strict)</option>
                  </select>
                  <small style={{display: 'block', marginTop: '0.5rem', color: 'var(--text-muted)'}}>
                    Choose how the system calculates salary deductions for late check-ins.
                  </small>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Settings;
