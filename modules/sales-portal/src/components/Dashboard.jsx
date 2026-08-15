import React from 'react';
import { BarChart2, TrendingUp, Users } from 'lucide-react';

export default function Dashboard() {
  return (
    <div style={{ animation: 'fadeIn 0.5s ease' }}>
      <div className="topbar">
        <div>
          <h2 className="heading">System Overview</h2>
          <p className="subheading" style={{ marginBottom: 0 }}>Real-time AI insights and CRM analytics.</p>
        </div>
      </div>

      <div className="card-grid" style={{ marginTop: '2rem' }}>
        <div className="glass-panel stat-card">
          <div className="stat-header">
            Total Pipeline
            <TrendingUp size={20} color="var(--accent-red)" />
          </div>
          <div className="stat-value">$14.2M</div>
          <div style={{ fontSize: '0.8rem', color: '#4caf50', marginTop: '0.5rem' }}>+12% from last month</div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-header">
            Active Leads
            <Users size={20} color="var(--text-muted)" />
          </div>
          <div className="stat-value">1,204</div>
          <div style={{ fontSize: '0.8rem', color: '#4caf50', marginTop: '0.5rem' }}>+48 this week</div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-header">
            Conversion Rate
            <BarChart2 size={20} color="var(--text-muted)" />
          </div>
          <div className="stat-value">24.8%</div>
          <div style={{ fontSize: '0.8rem', color: '#f44336', marginTop: '0.5rem' }}>-1.2% from last week</div>
        </div>
      </div>

      <div className="glass-panel" style={{ marginTop: '2rem', padding: '2rem', minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="logo-icon" style={{ display: 'inline-block', marginBottom: '1rem', opacity: 0.5 }}>
             <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
          </div>
          <h3 style={{ color: 'var(--text-muted)' }}>AI Data Visualization Loading...</h3>
        </div>
      </div>
    </div>
  );
}
