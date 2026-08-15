import React, { useState, useEffect, useMemo } from 'react';
import { Users, UserCheck, Briefcase, FileText, AlertCircle } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Employee } from './Employees';
import { fetchEmployees, fetchDashboardStats } from '../api';
import './Dashboard.css';

const format12HourTime = (time24: string) => {
  if (!time24 || time24 === '-') return '-';
  const [hours, minutes, seconds] = time24.split(':').map(Number);
  let hour12 = hours % 12;
  if (hour12 === 0) hour12 = 12;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  return `${hour12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

// Generate last 12 months for dropdown
const generateLast12Months = () => {
  const months = [];
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  for (let i = 11; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const year = d.getFullYear();
    const month = d.getMonth();
    months.push({
      value: `${year}-${String(month + 1).padStart(2, '0')}`,
      label: `${monthNames[month]} ${year}`
    });
  }
  return months;
};

interface LogRecord {
  id: string;
  date: string;
  timeIn: string;
  timeOut: string;
  status: string;
  empId?: string;
  employeeName?: string;
}

const Dashboard: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [weeklyStats, setWeeklyStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayPresent, setTodayPresent] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const last12Months = generateLast12Months();

  const loadData = async (isInitial = false) => {
    try {
      if (isInitial) {
        setLoading(true);
        setError(null);
      }

      console.log("🚀 Dashboard: Fetching data...");

      const [empData, dashData] = await Promise.all([
        fetchEmployees().catch(err => {
          console.error("Failed to fetch employees:", err);
          return [];
        }),
        fetchDashboardStats().catch(err => {
          console.error("Failed to fetch dashboard stats:", err);
          return { recentLogs: [], weeklyStats: [], todayCount: 0 };
        })
      ]);

      setEmployees(empData);
      setLogs(dashData.recentLogs || []);
      setWeeklyStats(dashData.weeklyStats || []);
      setTodayPresent(dashData.todayCount || 0);

      console.log("📊 Dashboard Data Loaded:", {
        employees: empData.length,
        recentLogs: dashData.recentLogs?.length,
        weeklyStats: dashData.weeklyStats?.length,
        todayCount: dashData.todayCount
      });
    } catch (e: any) {
      console.error("Dashboard critical fetching error: ", e);
      setError("Failed to load dashboard data. Please check if the backend server is running.");
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
    const intervalId = setInterval(() => loadData(false), 30000);
    return () => clearInterval(intervalId);
  }, []);

  const dynamicAttendanceData = useMemo(() => {
    // Generate days in selected month
    const monthDays = [];
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      monthDays.push({
        name: String(day),
        present: 0
      });
    }

    if (!weeklyStats || weeklyStats.length === 0) return monthDays;

    // Group weeklyStats by date and sum presentCount for selected month
    const counts: Record<string, number> = {};
    weeklyStats.forEach(stat => {
      if (!stat.date) return;
      if (stat.date.startsWith(selectedMonth)) {
        // Normalize away any leading zero (DB gives "05", chart days are named "5")
        const day = String(parseInt(stat.date.split('-')[2], 10));
        counts[day] = (counts[day] || 0) + (stat.presentCount || 0);
      }
    });

    return monthDays.map(d => ({
      ...d,
      present: counts[d.name] || 0
    }));
  }, [weeklyStats, selectedMonth]);

  const stats = useMemo(() => {
    const totalEmployees = employees.length;
    const onLeave = employees.filter(e => e.status === 'On Leave').length;
    const totalPayrollBase = employees.reduce((acc, emp) => acc + (Number(emp.baseSalary) || 0), 0);
    const uniqueDepts = new Set(employees.filter(e => e.department).map(e => e.department)).size;

    return {
      totalEmployees,
      onLeave,
      totalPayrollBase,
      uniqueDepts
    };
  }, [employees]);

  const summaryCards = useMemo(() => [
    { title: 'Total Employees', value: stats.totalEmployees.toString(), trend: 'Active Workforce', icon: <Users size={24} />, color: '#3b82f6' },
    { title: 'Today Present', value: todayPresent.toString(), trend: 'Currently Clocked In', icon: <UserCheck size={24} />, color: '#10b981' },
    { title: 'Departments', value: stats.uniqueDepts.toString(), trend: 'Active Divisions', icon: <Briefcase size={24} />, color: '#f59e0b' },
    { title: 'Employees on Leave', value: stats.onLeave.toString(), trend: 'Requires HR Review', icon: <FileText size={24} />, color: '#ef4444' },
  ], [stats, todayPresent]);

  if (loading) {
    return (
      <div className="loader-overlay">
        <div className="loader-container">
          <div className="loader-ring"></div>
          <div className="loader-ring"></div>
          <div className="loader-ring"></div>
        </div>
        <div className="loader-text">Initializing Dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
          <AlertCircle size={48} style={{ marginBottom: '1rem' }} />
          <h2>Connection Error</h2>
          <p>{error}</p>
          <button className="btn-primary" onClick={() => loadData(true)} style={{ marginTop: '1rem' }}>
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard animate-fade-in">
      <div style={{ marginBottom: '1rem' }}>
        <h1 className="page-title" style={{ marginBottom: '0.5rem' }}>Dashboard Overview</h1>
        <p className="page-subtitle">Welcome back! Live organization statistics mapped to current records.</p>
      </div>

      <div className="summary-cards">
        {summaryCards.map((card, idx) => (
          <div className="card overview-card" key={idx}>
            <div className="card-top">
              <div>
                <h3 className="card-title" style={{ marginBottom: '0.25rem' }}>{card.title}</h3>
                <div className="card-value">{card.value}</div>
              </div>
              <div className="card-icon" style={{
                background: `linear-gradient(135deg, ${card.color}20, ${card.color}40)`,
                color: card.color,
                border: `1px solid ${card.color}30`
              }}>
                {card.icon}
              </div>
            </div>
            <div className="card-trend" style={{ color: card.color }}>{card.trend}</div>
          </div>
        ))}
      </div>

      <div className="chart-container" style={{ width: '100%', height: '400px', minWidth: '0', position: 'relative' }}>
        {/* Month Selector */}
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text-main)',
              border: '1px solid var(--border-color)',
              fontSize: '0.9rem'
            }}
          >
            {last12Months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>

        {dynamicAttendanceData && dynamicAttendanceData.length > 0 ? (
          <div style={{ height: '320px', width: '100%', minWidth: '0' }}>
            <ResponsiveContainer width="100%" height="100%" minHeight={300}>
              <AreaChart data={dynamicAttendanceData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary-color)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--primary-color)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }}
                />
                <Area type="monotone" dataKey="present" stroke="var(--primary-color)" fillOpacity={1} fill="url(#colorPresent)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <p>Loading Chart Data...</p>
          </div>
        )}
      </div>

      <div className="card recent-activity-card">
        <h3>Live Activity Stream</h3>
        <ul className="activity-list">
          {logs.slice(0, 5).map((log, idx) => {
            const empDisplayName = log.employeeName
              ? `${log.employeeName} (ID: ${log.empId})`
              : `Employee ID: ${log.empId}`;

            // Fix: Better logic to determine if clocked in or out
            const isClockedOut = log.timeOut && log.timeOut !== '-';
            const action = isClockedOut ? 'Clocked Out' : 'Clocked In';
            const time = isClockedOut ? log.timeOut : log.timeIn;
            const isLate = log.status === 'Late';

            return (
              <li key={idx}>
                <div className={`activity-dot ${isLate ? 'danger' : 'success'}`}></div>
                <div className="activity-content">
                  <p><strong>{empDisplayName}</strong> {action}</p>
                  <span>{log.date} at {format12HourTime(time)}</span>
                </div>
              </li>
            );
          })}
          {logs.length === 0 && (
            <li>
              <div className="activity-content">
                <p>No recent activity</p>
              </div>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default Dashboard;
