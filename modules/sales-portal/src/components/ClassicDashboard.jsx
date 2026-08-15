import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { TrendingUp, TrendingDown, Users, Target, Activity, CheckSquare, Calendar, MessageCircle, X, Video, FileText, Building2, Sparkles, Award } from 'lucide-react';

const ALL_SHORTCUTS = [
  { id: 'crm', label: 'CRM Deals', icon: Users },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'chat', label: 'Team Chat', icon: MessageCircle },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'meetings', label: 'Meetings', icon: Video },
  { id: 'followups', label: 'Follow-ups', icon: CheckSquare },
  { id: 'docs', label: 'Documents', icon: FileText },
  { id: 'campaigns', label: 'Campaigns', icon: Building2 },
];

const PIPELINE_STAGES = ['Pending', 'Submitted', 'Approved', 'Request for Agreement', 'Signed', 'Installed'];

function timeAgo(dateString) {
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

function SkeletonCard() {
  return (
    <div className="bx-widget-card">
      <div style={{ height: '14px', width: '60%', background: 'var(--bx-border)', borderRadius: '4px', marginBottom: '14px', opacity: 0.6 }} />
      <div style={{ height: '28px', width: '40%', background: 'var(--bx-border)', borderRadius: '4px', opacity: 0.6 }} />
    </div>
  );
}

export default function ClassicDashboard({ setActiveItem, leads, currentUser, userRole, widgetPrefs, setWidgetPrefs, dataLoading }) {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [tempPrefs, setTempPrefs] = useState(widgetPrefs);
  const [dateRange, setDateRange] = useState('7days');

  const isAdmin = userRole === 'Admin' || userRole === 'Super Admin';
  const myLeads = isAdmin ? leads : leads.filter(l => l.createdById === currentUser?.id);

  const getRangeStart = () => {
    const now = new Date();
    if (dateRange === 'today') { now.setHours(0, 0, 0, 0); return now; }
    if (dateRange === '7days') { now.setDate(now.getDate() - 7); return now; }
    if (dateRange === '30days') { now.setDate(now.getDate() - 30); return now; }
    return new Date(0);
  };

  const rangeStart = getRangeStart();
  const rangeLeads = myLeads.filter(l => new Date(l.createdAt) >= rangeStart);

  const prevRangeStart = new Date(rangeStart);
  const rangeDuration = new Date() - rangeStart;
  prevRangeStart.setTime(rangeStart.getTime() - rangeDuration);
  const prevRangeLeads = myLeads.filter(l => new Date(l.createdAt) >= prevRangeStart && new Date(l.createdAt) < rangeStart);

  const totalLeads = rangeLeads.length;
  const prevTotalLeads = prevRangeLeads.length;
  const leadsTrend = prevTotalLeads > 0 ? Math.round(((totalLeads - prevTotalLeads) / prevTotalLeads) * 100) : (totalLeads > 0 ? 100 : 0);

  const convertedLeads = rangeLeads.filter(l => l.status === 'Installed' || l.status === 'Signed').length;
  const activeDeals = rangeLeads.filter(l => ['Pending', 'Submitted', 'Approved', 'Request for Agreement'].includes(l.status)).length;
  const prevActiveDeals = prevRangeLeads.filter(l => ['Pending', 'Submitted', 'Approved', 'Request for Agreement'].includes(l.status)).length;
  const dealsTrend = prevActiveDeals > 0 ? Math.round(((activeDeals - prevActiveDeals) / prevActiveDeals) * 100) : 0;

  const conversionRate = totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  const totalCommission = rangeLeads.reduce((sum, l) => {
    const amount = parseFloat(l.commissionAmount);
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);
  const prevCommission = prevRangeLeads.reduce((sum, l) => {
    const amount = parseFloat(l.commissionAmount);
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);
  const commissionTrend = prevCommission > 0 ? Math.round(((totalCommission - prevCommission) / prevCommission) * 100) : 0;

  const getChartData = () => {
    const days = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const numDays = dateRange === 'today' ? 1 : dateRange === '30days' ? 30 : 7;
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayLeads = myLeads.filter(l => {
        const created = new Date(l.createdAt);
        return created >= d && created < nextDay;
      });

      const dayCommission = dayLeads.reduce((sum, l) => {
        const amount = parseFloat(l.commissionAmount);
        return sum + (isNaN(amount) ? 0 : amount);
      }, 0);

      days.push({ name: numDays > 7 ? d.getDate().toString() : dayNames[d.getDay()], revenue: dayCommission, leads: dayLeads.length });
    }
    return days;
  };

  const salesData = getChartData();

  const recentActivities = [...myLeads]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 4)
    .map(l => ({
      id: l.id,
      user: l.createdBy?.name || 'System',
      action: `updated lead "${l.company}" to ${l.status}`,
      time: timeAgo(l.updatedAt || l.createdAt)
    }));

  const funnelData = PIPELINE_STAGES.map(stage => ({
    stage,
    count: myLeads.filter(l => l.status === stage).length
  }));
  const maxFunnelCount = Math.max(...funnelData.map(f => f.count), 1);

  const topPerformers = isAdmin ? (() => {
    const counts = {};
    leads.forEach(l => {
      if (l.createdBy?.name && (l.status === 'Signed' || l.status === 'Installed')) {
        counts[l.createdBy.name] = (counts[l.createdBy.name] || 0) + 1;
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  })() : [];

  const openConfigModal = () => {
    setTempPrefs(widgetPrefs);
    setShowConfigModal(true);
  };

  const toggleWidget = (key) => setTempPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleShortcut = (id) => setTempPrefs(prev => ({
    ...prev,
    shortcuts: prev.shortcuts.includes(id) ? prev.shortcuts.filter(s => s !== id) : [...prev.shortcuts, id]
  }));
  const saveConfig = () => { setWidgetPrefs(tempPrefs); setShowConfigModal(false); };

  const activeShortcuts = ALL_SHORTCUTS.filter(s => widgetPrefs.shortcuts.includes(s.id));

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const todayFormatted = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const TrendBadge = ({ value }) => {
    if (value === 0) return null;
    const isUp = value > 0;
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '11px', fontWeight: 600,
        color: isUp ? 'var(--bx-accent-green)' : 'var(--bx-accent-red)'
      }}>
        {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {Math.abs(value)}%
      </span>
    );
  };

  return (
    <div className="bx-content" style={{ backgroundColor: 'var(--bx-sidebar-bg)', overflowY: 'auto' }}>
      <div className="bx-content-header" style={{ backgroundColor: 'var(--bx-white)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="bx-page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Sparkles size={22} color="var(--bx-accent-blue)" />
              {getGreeting()}, {currentUser?.name?.split(' ')[0] || 'there'}
            </h1>
            <p style={{ color: 'var(--bx-text-muted)', fontSize: '13px', marginTop: '4px' }}>{todayFormatted}</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="input-field"
              style={{ margin: 0, backgroundColor: 'var(--bx-white)', color: 'var(--bx-text-main)', width: 'auto', padding: '8px 12px' }}
            >
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="all">All Time</option>
            </select>
            <button className="bx-btn" onClick={openConfigModal}>Configure Widgets</button>
          </div>
        </div>
      </div>

      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Quick Shortcuts */}
        <div className="bx-shortcuts-grid">
          {activeShortcuts.map(sc => {
            const Icon = sc.icon;
            return (
              <div key={sc.id} className="bx-shortcut-item" onClick={() => setActiveItem(sc.id)}>
                <div className="bx-shortcut-icon"><Icon size={24} /></div>
                <span className="bx-shortcut-label">{sc.label}</span>
              </div>
            );
          })}
        </div>

        {/* KPI Row */}
        {(widgetPrefs.showCommission || widgetPrefs.showActiveDeals || widgetPrefs.showTotalLeads || widgetPrefs.showConversion) && (
          <div className="bx-kpi-grid">
            {dataLoading ? (
              <>
                <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
              </>
            ) : (
              <>
                {widgetPrefs.showCommission && (
                  <div className="bx-widget-card">
                    <div className="bx-widget-header">
                      <span className="bx-widget-title">{isAdmin ? 'Total Commission' : 'My Commission'}</span>
                      <TrendingUp size={16} color="var(--bx-accent-green)" />
                    </div>
                    <div className="bx-widget-value">${totalCommission.toLocaleString()}</div>
                    <div className="bx-widget-sub" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <TrendBadge value={commissionTrend} /> vs previous period
                    </div>
                  </div>
                )}
                {widgetPrefs.showActiveDeals && (
                  <div className="bx-widget-card">
                    <div className="bx-widget-header">
                      <span className="bx-widget-title">Active Deals</span>
                      <Target size={16} color="var(--bx-accent-blue)" />
                    </div>
                    <div className="bx-widget-value">{activeDeals}</div>
                    <div className="bx-widget-sub" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <TrendBadge value={dealsTrend} /> vs previous period
                    </div>
                  </div>
                )}
                {widgetPrefs.showTotalLeads && (
                  <div className="bx-widget-card">
                    <div className="bx-widget-header">
                      <span className="bx-widget-title">{isAdmin ? 'Total Generated Leads' : 'My Leads'}</span>
                      <Users size={16} color="var(--bx-accent-orange)" />
                    </div>
                    <div className="bx-widget-value">{totalLeads}</div>
                    <div className="bx-widget-sub" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <TrendBadge value={leadsTrend} /> vs previous period
                    </div>
                  </div>
                )}
                {widgetPrefs.showConversion && (
                  <div className="bx-widget-card">
                    <div className="bx-widget-header">
                      <span className="bx-widget-title">Conversion Rate</span>
                      <Activity size={16} color="var(--bx-accent-green)" />
                    </div>
                    <div className="bx-widget-value">{conversionRate}%</div>
                    <div className="bx-widget-sub">Signed+Installed / Total Leads</div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Pipeline Funnel */}
        <div className="bx-widget-card">
          <div className="bx-widget-header" style={{ marginBottom: '16px' }}>
            <span className="bx-widget-title">Pipeline Funnel</span>
            <Target size={16} color="var(--bx-accent-blue)" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {funnelData.map(f => (
              <div key={f.stage} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '160px', fontSize: '12px', color: 'var(--bx-text-muted)' }}>{f.stage}</div>
                <div style={{ flex: 1, background: 'var(--bx-sidebar-bg)', borderRadius: '6px', overflow: 'hidden', height: '20px' }}>
                  <div style={{
                    width: `${(f.count / maxFunnelCount) * 100}%`, height: '100%',
                    background: 'var(--bx-accent-blue)', borderRadius: '6px',
                    transition: 'width 0.3s ease', minWidth: f.count > 0 ? '8px' : '0'
                  }} />
                </div>
                <div style={{ width: '30px', fontSize: '13px', fontWeight: 600, textAlign: 'right' }}>{f.count}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Charts Row */}
        {(widgetPrefs.showChart || widgetPrefs.showActivity) && (
          <div className={widgetPrefs.showChart && widgetPrefs.showActivity ? 'bx-charts-grid' : ''} style={{ display: 'grid', gridTemplateColumns: widgetPrefs.showChart && widgetPrefs.showActivity ? undefined : '1fr', gap: '20px' }}>
            {widgetPrefs.showChart && (
              <div className="bx-widget-card">
                <div className="bx-widget-header" style={{ marginBottom: '20px' }}>
                  <span className="bx-widget-title">Commission & Leads Overview</span>
                </div>
                <div style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={salesData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--bx-border)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'var(--bx-text-muted)' }} />
                      <YAxis yAxisId="left" orientation="left" stroke="var(--bx-accent-blue)" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="right" orientation="right" stroke="var(--bx-accent-orange)" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ border: '1px solid var(--bx-border)', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }} />
                      <Bar yAxisId="left" dataKey="revenue" fill="var(--bx-accent-blue)" radius={[4, 4, 0, 0]} barSize={numDaysBarSize(salesData.length)} />
                      <Line yAxisId="right" type="monotone" dataKey="leads" stroke="var(--bx-accent-orange)" strokeWidth={3} dot={{ r: 3 }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {widgetPrefs.showActivity && (
              <div className="bx-widget-card">
                <div className="bx-widget-header" style={{ marginBottom: '20px' }}>
                  <span className="bx-widget-title">Activity Stream</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {recentActivities.map(activity => (
                    <div key={activity.id} style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--bx-sidebar-bg)', border: '1px solid var(--bx-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', color: 'var(--bx-text-muted)' }}>
                        {activity.user.charAt(0)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--bx-text-link)' }}>{activity.user}</span> {activity.action}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--bx-text-muted)', marginTop: '4px' }}>{activity.time}</div>
                      </div>
                    </div>
                  ))}
                  {recentActivities.length === 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '30px 0', color: 'var(--bx-text-muted)' }}>
                      <Activity size={32} style={{ opacity: 0.3, marginBottom: '10px' }} />
                      <span style={{ fontSize: '13px' }}>Koi recent activity nahi hai</span>
                    </div>
                  )}
                  <button className="bx-btn" style={{ marginTop: '10px', width: '100%', justifyContent: 'center' }} onClick={() => setActiveItem('crm')}>View All Activity</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Top Performers (Admin only) */}
        {isAdmin && topPerformers.length > 0 && (
          <div className="bx-widget-card">
            <div className="bx-widget-header" style={{ marginBottom: '16px' }}>
              <span className="bx-widget-title">Top Performers</span>
              <Award size={16} color="var(--bx-accent-orange)" />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {topPerformers.map(([name, count], idx) => (
                <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '24px', height: '24px', borderRadius: '50%',
                    background: idx === 0 ? 'var(--bx-accent-orange)' : 'var(--bx-sidebar-bg)',
                    color: idx === 0 ? '#fff' : 'var(--bx-text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 'bold', flexShrink: 0
                  }}>
                    {idx + 1}
                  </div>
                  <div style={{ flex: 1, fontSize: '13px', fontWeight: 600 }}>{name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--bx-text-muted)' }}>{count} closed</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showConfigModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <h2 style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Configure Widgets</span>
              <X size={20} style={{ cursor: 'pointer' }} onClick={() => setShowConfigModal(false)} />
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '13px', color: 'var(--bx-accent-blue)', marginBottom: '10px' }}>KPI Cards</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={tempPrefs.showCommission} onChange={() => toggleWidget('showCommission')} /> Commission
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={tempPrefs.showActiveDeals} onChange={() => toggleWidget('showActiveDeals')} /> Active Deals
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={tempPrefs.showTotalLeads} onChange={() => toggleWidget('showTotalLeads')} /> Total Leads
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={tempPrefs.showConversion} onChange={() => toggleWidget('showConversion')} /> Conversion Rate
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '13px', color: 'var(--bx-accent-blue)', marginBottom: '10px' }}>Panels</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={tempPrefs.showChart} onChange={() => toggleWidget('showChart')} /> Chart
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={tempPrefs.showActivity} onChange={() => toggleWidget('showActivity')} /> Activity Stream
                </label>
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <h3 style={{ fontSize: '13px', color: 'var(--bx-accent-blue)', marginBottom: '10px' }}>Shortcuts</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {ALL_SHORTCUTS.map(sc => (
                  <label key={sc.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={tempPrefs.shortcuts.includes(sc.id)} onChange={() => toggleShortcut(sc.id)} /> {sc.label}
                  </label>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
              <button type="button" className="bx-btn" onClick={() => setShowConfigModal(false)}>Cancel</button>
              <button type="button" className="bx-btn bx-btn-primary" onClick={saveConfig}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function numDaysBarSize(count) {
  if (count > 15) return 8;
  if (count > 7) return 16;
  return 30;
}