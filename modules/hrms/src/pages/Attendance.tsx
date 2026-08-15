import React, { useState, useEffect, useRef, useMemo } from 'react';
import { MapPin, Clock, Calendar, CheckSquare, AlertCircle, Edit2, Save, X, Trash2, Camera, Eye, Plus, RefreshCw, Download } from 'lucide-react';
import {
  fetchAttendance,
  createAttendance,
  checkOutAttendance,
  createManualAttendance,
  fetchEmployees,
} from '../frappeAttendance';
import { updateAttendance, deleteAttendance, fetchSettings, testAutoAbsent } from '../api';
import { useAuth } from '../context/useAuth';
import { getDeviceId } from '../utils/deviceUtils';
import { getShiftDate, getPKTComponents, parseShiftHour } from '../utils/shiftDateUtils';
import { getSelfieUrl, compressSelfie } from '../utils/mediaUtils';
import toast from 'react-hot-toast';
import './Attendance.css';

interface LogRecord {
  id: string;
  date: string;
  timeIn: string;
  timeOut: string;
  status: 'Present' | 'Late' | 'Absent' | 'On Leave' | 'Half Day';
  isAbsent?: number;
  location: string;
  distance: number;
  shiftHours?: string;
  empId?: string;
  deviceId?: string;
  selfie?: string;
  lateReason?: string;
  earlyReason?: string;
  isLate?: number;
  isHalfDay?: number;
}

const calculateHours = (timeIn: string, timeOut: string): string => {
  if (!timeIn || !timeOut || timeOut === '-') return "-";

  const parse = (t: string) => {
    const parts = t.split(":");
    if (parts.length < 2) return null;

    const h = parseInt(parts[0]);
    const m = parseInt(parts[1]);
    const s = parts[2] ? parseInt(parts[2]) : 0;
    return h * 3600 + m * 60 + s;
  };

  const inS = parse(timeIn);
  const outS = parse(timeOut);

  if (inS !== null && outS !== null) {
    let diffS = outS - inS;
    if (diffS < 0) diffS += 24 * 3600;

    const h = Math.floor(diffS / 3600);
    const m = Math.floor((diffS % 3600) / 60);
    const s = diffS % 60;

    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  return "-";
};

const formatTime12h = (timeStr: any) => {
  if (!timeStr || typeof timeStr !== 'string' || timeStr === '-' || timeStr === '') return '-';
  try {
    const parts = timeStr.split(':');
    if (parts.length < 2) return timeStr;
    const h = parseInt(parts[0]);
    if (isNaN(h)) return timeStr;
    const minutes = parts[1];
    const seconds = parts[2] || '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${minutes}:${seconds} ${ampm}`;
  } catch (e) {
    return String(timeStr);
  }
};

const statusBadgeClass = (status?: string) => {
  if (!status) return 'unknown';
  return status.toLowerCase().replace(/\s+/g, '-');
};

const formatDateNice = (dateStr: any) => {
  if (!dateStr || typeof dateStr !== 'string' || dateStr === '-' || dateStr === '') return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = date.getDate();
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return String(dateStr);
  }
};

const generateMonths = () => {
  const months = [];
  const pktDateStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" });
  const pktDate = new Date(pktDateStr);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  for (let i = 0; i < 12; i++) {
    const d = new Date(pktDate.getFullYear(), pktDate.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const value = `${year}-${month}`; // Correct local YYYY-MM
    const label = `${monthNames[d.getMonth()]} ${year}`;
    months.push({ value, label });
  }
  return months;
};

const Attendance: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const currentMonthStr = useMemo(() => {
    try {
      return currentTime.toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' }).substring(0, 7);
    } catch (e) {
      return new Date().toISOString().substring(0, 7);
    }
  }, [currentTime]);

  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  const [selectedLog, setSelectedLog] = useState<LogRecord | null>(null);

  const [editLogId, setEditLogId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<LogRecord>>({});

  const [officeSettings, setOfficeSettings] = useState<{ officeLatitude?: string, officeLongitude?: string, geofenceRadius?: string }>({
    officeLatitude: '24.850553',
    officeLongitude: '67.029388',
    geofenceRadius: '0.3'
  });
  const [shiftTimes, setShiftTimes] = useState({ shiftStartTime: '17:45:00', shiftEndTime: '03:00:00' });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAttendance, setNewAttendance] = useState({
    empId: '',
    date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' }),
    timeIn: '',
    timeOut: '',
    status: 'Present' as LogRecord['status'],
    lateReason: '',
    earlyReason: '',
    location: '',
  });
  const [markStatus, setMarkStatus] = useState<{ type: 'success' | 'error' | 'loading' | null, message: string }>({ type: null, message: '' });
  const [selectedSelfie, setSelectedSelfie] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [isRunningAutoAbsent, setIsRunningAutoAbsent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manage Device ID
  const deviceId = getDeviceId();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [data, empData] = await Promise.all([fetchAttendance(), fetchEmployees()]);
        setLogs(Array.isArray(data) ? data : []);
        setEmployees(Array.isArray(empData) ? empData : []);
      } catch (e) {
        setLogs([]);
        setEmployees([]);
      }
    };
    loadData();
    fetchSettings()
      .then((settings) => {
        if (settings) {
          setOfficeSettings({
            officeLatitude: String(settings.officeLatitude ?? '24.850553'),
            officeLongitude: String(settings.officeLongitude ?? '67.029388'),
            geofenceRadius: String(settings.geofenceRadius ?? '0.3')
          });
          setShiftTimes({
            shiftStartTime: settings.shiftStartTime || '17:45:00',
            shiftEndTime: settings.shiftEndTime || '03:00:00'
          });
        }
      })
      .catch(console.error);
  }, []);

  // Super safe derived state
  const filteredLogs = useMemo(() => {
    if (!Array.isArray(logs)) return [];

    let result = logs.filter(l => l && typeof l === 'object');

    if (user?.role !== 'admin' && user) {
      result = result.filter(log => log.empId === user.empId);
    }

    if (selectedMonth && selectedMonth !== 'All') {
      result = result.filter(log => log && typeof log.date === 'string' && log.date.startsWith(selectedMonth));
    }

    if (searchTerm && searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(log => {
        if (!log) return false;
        const emp = Array.isArray(employees) ? employees.find(e => e && e.id === log.empId) : null;
        const name = emp ? String(emp.name).toLowerCase() : String(log.empId || '').toLowerCase();
        return name.includes(term);
      });
    }

    return result;
  }, [logs, user, searchTerm, employees, selectedMonth]);

  const stats = useMemo(() => {
    const statsMonth = selectedMonth === 'All' ? currentMonthStr : selectedMonth;
    const monthLogs = Array.isArray(logs)
      ? logs.filter(log => log && typeof log.date === 'string' && log.date.startsWith(statsMonth))
      : [];

    const displayLogs = user?.role === 'admin'
      ? monthLogs
      : monthLogs.filter(log => log && log.empId === user?.empId);

    const getCount = (filterFn: (l: LogRecord) => boolean) =>
      displayLogs.filter(l => l && filterFn(l)).length;

    return {
      present: getCount(l => l.status?.toLowerCase() === 'present'),
      late: getCount(l => l.status?.toLowerCase() === 'late'),
      leave: getCount(l => l.status?.toLowerCase() === 'on leave' || l.status?.toLowerCase() === 'leave'),
      absent: getCount(l => l.status?.toLowerCase() === 'absent' || l.isAbsent === 1),
      halfDay: getCount(l => l.status?.toLowerCase() === 'half day')
    };
  }, [logs, selectedMonth, currentMonthStr, user]);

  const [employeeTarget, setEmployeeTarget] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      fetchEmployees().then((emps: any[]) => {
        const myEmp = emps.find(e => e.id === user.empId);
        if (myEmp) setEmployeeTarget(myEmp.kpiTarget);
      }).catch(console.error);
    }
  }, [user]);

  // Update time locally
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchLocation = async (): Promise<{ lat: number; lng: number; accuracy: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
        return;
      }

      console.log("Fetching location with robust settings...");

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      };

      const success = (position: GeolocationPosition) => {
        console.log(`Location received: ${position.coords.latitude}, ${position.coords.longitude} (Accuracy: ${position.coords.accuracy}m)`);
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      };

      const error = (err: GeolocationPositionError) => {
        console.warn("Location error code:", err.code, "message:", err.message);

        // If high accuracy failed, try one more time with low accuracy
        if (options.enableHighAccuracy) {
          console.log("Retrying with lower accuracy...");
          navigator.geolocation.getCurrentPosition(success, (secondErr) => {
            let errorMsg = "Unable to get location. ";
            switch (secondErr.code) {
              case 1: errorMsg += "Permission denied. Please allow location access in browser settings."; break;
              case 2: errorMsg += "Position unavailable. Check your device GPS/Network."; break;
              case 3: errorMsg += "Request timed out. Please try again in an open area."; break;
              default: errorMsg += secondErr.message;
            }
            reject(new Error(errorMsg));
          }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 30000 });
        } else {
          reject(new Error("Location failed: " + err.message));
        }
      };

      navigator.geolocation.getCurrentPosition(success, error, options);
    });
  };

  const playNotificationSound = (type: 'success' | 'error') => {
    try {
      const audioPath = type === 'success' ? '/sounds/notification.mp3' : '/sounds/error.mp3';
      const audio = new Audio(audioPath);
      audio.onerror = () => console.warn(`Audio file not found at ${audioPath}`);
      audio.load(); // Load before playing
      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise.catch(error => {
          // Just log it, don't crash
          console.warn("Audio playback prevented by browser or missing file:", error.message);
        });
      }
    } catch (e) {
      console.warn("Audio context error:", e);
    }
  };

  const handleSelfieCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelfie(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClockIn = async () => {
    // 📸 Force Selfie Capture
    if (!selfie) {
      if (fileInputRef.current) fileInputRef.current.click();
      return;
    }

    let coords;
    try {
      setMarkStatus({ type: 'loading', message: 'Acquiring GPS location...' });
      coords = await fetchLocation();
    } catch (e) {
      playNotificationSound('error');
      setMarkStatus({
        type: 'error',
        message: (e as Error).message || "Unable to get location. Please allow location access."
      });
      setTimeout(() => setMarkStatus({ type: null, message: '' }), 5000);
      return;
    }

    try {
      console.log(`Proceeding with Clock In at: ${coords.lat}, ${coords.lng}`);
      const pktTimeStr = currentTime.toLocaleString("en-US", { timeZone: "Asia/Karachi" });
      const pktDateObj = new Date(pktTimeStr);
      const currentHour = pktDateObj.getHours();
      const currentMinute = pktDateObj.getMinutes();

      let lateReason = "";
      // 🔥 Late after 6:00:59 PM (i.e., from 6:01:00 PM)
      const isLate = currentHour > 18 || (currentHour === 18 && currentMinute >= 1);

      if (isLate) {
        const reasonInput = prompt("You are checking in late. Please enter the reason:");
        if (!reasonInput) {
          setMarkStatus({ type: 'error', message: 'Late reason is required for late check-in.' });
          return;
        }
        lateReason = reasonInput;
      }

      setMarkStatus({ type: 'loading', message: 'Recording attendance...' });

      const compressedSelfie = selfie ? await compressSelfie(selfie) : undefined;

      const resData = await createAttendance({
        empId: user?.empId,
        latitude: coords.lat,
        longitude: coords.lng,
        deviceId,
        lateReason,
        isLate: isLate ? 1 : 0,
        selfie: compressedSelfie
      });

      if (resData && resData.data) {
        playNotificationSound('success');
        setLogs(prev => [resData.data, ...prev]);
        const msg = isLate ? 'Clock In recorded (Late)' : 'Clock In recorded successfully';
        setMarkStatus({
          type: 'success',
          message: msg
        });
        toast.success(msg);
        setSelfie(null); // Clear selfie for next time
      }
    } catch (e: any) {
      console.error("Clock In Error:", e);
      playNotificationSound('error');
      const errorMsg = e.message || 'Error recording attendance.';
      setMarkStatus({
        type: 'error',
        message: errorMsg
      });
      toast.error(errorMsg);
    } finally {
      setTimeout(() => setMarkStatus({ type: null, message: '' }), 6000);
    }
  };

  const handleAddAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttendance.empId || !newAttendance.date || !newAttendance.status) {
      toast.error('Employee, date, and status are required');
      return;
    }
    try {
      const res = await createManualAttendance({
        ...newAttendance,
        isLate: newAttendance.status === 'Late' ? 1 : 0,
        isHalfDay: newAttendance.status === 'Half Day' ? 1 : 0,
        isAbsent: newAttendance.status === 'Absent' ? 1 : 0,
      });
      if (res?.data) {
        setLogs(prev => [res.data, ...prev]);
        setIsAddModalOpen(false);
        setNewAttendance({
          empId: '',
          date: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' }),
          timeIn: '',
          timeOut: '',
          status: 'Present',
          lateReason: '',
          earlyReason: '',
          location: '',
        });
        toast.success('Attendance added successfully');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to add attendance');
    }
  };

  // Admin-only: export the currently filtered attendance logs (respects month filter + search) to CSV
  const handleDownloadAttendance = () => {
    if (!Array.isArray(filteredLogs) || filteredLogs.length === 0) {
      toast.error('No attendance records to download for this selection.');
      return;
    }

    const headers = ['Employee Name', 'Employee ID', 'Date', 'Status', 'Time In', 'Time Out', 'Location', 'Shift Hours', 'Late Reason', 'Early Reason'];

    const escapeCsv = (value: unknown): string => {
      const str = value === null || value === undefined ? '' : String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const getLocationText = (log: LogRecord): string => {
      if (!log.location) return '-';
      if (typeof log.location === 'string') {
        if (log.location.startsWith('{')) {
          try {
            const loc = JSON.parse(log.location);
            return `${Number(loc.lat).toFixed(6)}, ${Number(loc.lng).toFixed(6)}`;
          } catch {
            return log.location;
          }
        }
        return log.location;
      }
      const loc = log.location as any;
      if (loc?.lat && loc?.lng) return `${Number(loc.lat).toFixed(6)}, ${Number(loc.lng).toFixed(6)}`;
      return '-';
    };

    const rows = filteredLogs.map(log => {
      const empName = Array.isArray(employees) ? (employees.find(e => e.id === log.empId)?.name || log.empId) : log.empId;
      return [
        empName,
        log.empId || '-',
        formatDateNice(log.date || ''),
        log.status || (log.isAbsent ? 'Absent' : '-'),
        formatTime12h(log.timeIn || ''),
        formatTime12h(log.timeOut || ''),
        getLocationText(log),
        log.shiftHours || '-',
        log.lateReason || '',
        log.earlyReason || ''
      ].map(escapeCsv).join(',');
    });

    const csvContent = [headers.map(escapeCsv).join(','), ...rows].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const monthLabel = selectedMonth === 'All' ? 'All' : selectedMonth;
    link.href = url;
    link.setAttribute('download', `Attendance_${monthLabel}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filteredLogs.length} attendance record(s).`);
  };

  const handleClockOut = async () => {
    let coords;
    try {
      setMarkStatus({ type: 'loading', message: 'Acquiring GPS location...' });
      coords = await fetchLocation();
    } catch (e) {
      playNotificationSound('error');
      setMarkStatus({ type: 'error', message: (e as Error).message });
      setTimeout(() => setMarkStatus({ type: null, message: '' }), 5000);
      return;
    }

    try {
      console.log(`Proceeding with Clock Out at: ${coords.lat}, ${coords.lng}`);
      const shiftEndHour = parseShiftHour(shiftTimes.shiftEndTime);
      const shiftStartHour = parseShiftHour(shiftTimes.shiftStartTime);
      const shiftDateStr = getShiftDate(currentTime, shiftEndHour, shiftStartHour);

      const activeLog = filteredLogs.find(
        l => l.date === shiftDateStr && l.timeIn && (!l.timeOut || l.timeOut === '-')
      ) ?? logs.find(
        l => l.empId === user?.empId && l.timeIn && (!l.timeOut || l.timeOut === '-') && l.date === shiftDateStr
      );

      if (!activeLog) {
        setMarkStatus({ type: 'error', message: 'No active Clock In found for this shift.' });
        return;
      }

      const { hour } = getPKTComponents(currentTime);

      let earlyReason = "";
      let isHalfDay = 0;

      const isEarly =
        (hour >= shiftStartHour && hour <= 23) ||
        (hour >= 0 && hour < shiftEndHour);

      if (isEarly) {
        const reasonInput = prompt("Leaving early? Please enter reason:");
        if (!reasonInput || !reasonInput.trim()) {
          setMarkStatus({ type: 'error', message: 'Reason is required for early check-out.' });
          return;
        }
        earlyReason = reasonInput.trim();
        if (hour >= shiftStartHour && hour <= 23) isHalfDay = 1;
      }

      setMarkStatus({ type: 'loading', message: 'Recording check-out...' });

      const resData = await checkOutAttendance({
        empId: user?.empId,
        latitude: coords.lat,
        longitude: coords.lng,
        deviceId,
        earlyReason,
        isHalfDay
      });

      if (resData && resData.data) {
        playNotificationSound('success');
        setLogs(prev => prev.map(l => l.id === activeLog.id ? resData.data : l));
        setMarkStatus({
          type: 'success',
          message: `Clock Out recorded. Status: ${resData.data.status}`
        });
      }
    } catch (e: any) {
      console.error("Clock Out Error:", e);
      playNotificationSound('error');
      setMarkStatus({
        type: 'error',
        message: e.message || 'Error recording check-out.'
      });
    } finally {
      setTimeout(() => setMarkStatus({ type: null, message: '' }), 6000);
    }
  };

  // Statistics calculation based on selected month or current month
  const statsMonth = selectedMonth === 'All' ? currentMonthStr : selectedMonth;

  // Safe filtering
  const monthLogs = Array.isArray(logs)
    ? logs.filter(log => log && typeof log.date === 'string' && log.date.startsWith(statsMonth))
    : [];

  const displayLogs = user?.role === 'admin'
    ? monthLogs
    : monthLogs.filter(log => log && log.empId === user?.empId);

  // Super safe statistics calculation
  const getStatCount = (filterFn: (l: LogRecord) => boolean) => {
    return Array.isArray(displayLogs) ? displayLogs.filter(l => l && filterFn(l)).length : 0;
  };

  const statPresent = getStatCount(log => log.status?.toLowerCase() === 'present');
  const statLate = getStatCount(log => log.status?.toLowerCase() === 'late');
  const statLeave = getStatCount(log =>
    log.status?.toLowerCase() === 'on leave' ||
    log.status?.toLowerCase() === 'leave'
  );
  const statAbsent = getStatCount(log =>
    log.status?.toLowerCase() === 'absent' ||
    log.isAbsent === 1
  );
  const statHalfDay = getStatCount(log => log.status?.toLowerCase() === 'half day');


  return (
    <div className="attendance-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance Portal</h1>
          <p className="page-subtitle">Mark your daily attendance and view historical logs.</p>
        </div>
      </div>

      <div className="attendance-grid">
        <div className="card marker-card">
          <div className="clock-display">
            <h3>{currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Karachi' })}</h3>
            <p>{currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Karachi' })}</p>
          </div>

          <div className="location-simulator">
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              <MapPin size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
              <strong>Target Location:</strong> {officeSettings.officeLatitude || 'Loading...'}, {officeSettings.officeLongitude || '...'}
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              <strong>Allowed Radius:</strong> {officeSettings.geofenceRadius || '0.3'} miles
            </p>
            <div className="distance-value" style={{ marginTop: '1rem', fontSize: '0.9rem', padding: '0.5rem', background: 'var(--bg-hover)', borderRadius: '4px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span>GPS Location Status:</span>
                <button
                  onClick={() => {
                    setMarkStatus({ type: 'loading', message: 'Requesting GPS Permission...' });
                    navigator.geolocation.getCurrentPosition(
                      () => {
                        setMarkStatus({ type: 'success', message: 'Location Access Granted!' });
                        setTimeout(() => setMarkStatus({ type: null, message: '' }), 3000);
                      },
                      (err) => {
                        setMarkStatus({ type: 'error', message: `Permission Denied: ${err.message}` });
                        setTimeout(() => setMarkStatus({ type: null, message: '' }), 5000);
                      }
                    );
                  }}
                  className="btn-refresh-location"
                  style={{ background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '0.75rem' }}
                >
                  Fix Permission
                </button>
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                If using ngrok, make sure you clicked "Visit Site" on the warning page first.
              </p>
            </div>
          </div>

          {markStatus.type && (
            <div className={`status-alert ${markStatus.type}`}>
              {markStatus.type === 'loading' ? (
                <div className="loading-spinner-small" style={{ border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', width: '20px', height: '20px', animation: 'spin 1s linear infinite' }}></div>
              ) : markStatus.type === 'error' ? (
                <AlertCircle size={20} />
              ) : (
                <CheckSquare size={20} />
              )}
              <span>{markStatus.message}</span>
            </div>
          )}

          <div className="selfie-section" style={{ marginTop: '1rem', textAlign: 'center' }}>
            <input
              type="file"
              accept="image/*"
              capture="user"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleSelfieCapture}
            />
            {selfie ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img src={selfie} alt="Selfie" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', border: '3px solid var(--success-color)' }} />
                <button
                  onClick={() => setSelfie(null)}
                  style={{ position: 'absolute', top: 0, right: 0, background: 'var(--danger-color)', color: 'white', border: 'none', borderRadius: '50%', width: '24px', height: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto', padding: '0.5rem 1rem' }}
              >
                <Camera size={18} /> Capture Selfie
              </button>
            )}
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              * Selfie is required for verification.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button
              className="btn-mark-attendance"
              onClick={handleClockIn}
              style={{ flex: 1, backgroundColor: 'var(--success-color)', opacity: !selfie ? 0.7 : 1 }}
            >
              <CheckSquare size={20} /> {selfie ? 'Confirm Clock In' : 'Clock In'}
            </button>
            <button
              className="btn-mark-attendance"
              onClick={handleClockOut}
              style={{ flex: 1, backgroundColor: 'var(--danger-color)' }}
            >
              <Clock size={20} /> Clock Out
            </button>
          </div>
        </div>

        <div className="card stats-card" style={{ display: 'flex', flexDirection: 'column' }}>
          {user?.role !== 'admin' && (
            <div style={{ padding: '1.25rem', background: 'linear-gradient(135deg, var(--primary-color) 0%, #1e40af 100%)', color: 'white', borderRadius: '12px', marginBottom: '1.5rem', boxShadow: 'var(--shadow-md)' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'white', fontSize: '1rem', opacity: 0.9 }}>My Performance Target</h3>
              <p style={{ margin: 0, fontSize: '1.15rem', fontWeight: 'bold' }}>{employeeTarget || 'No active target assigned yet.'}</p>
            </div>
          )}
          <h3>{user?.role === 'admin' ? `Monthly Overview (${statsMonth})` : `Your Monthly Stats (${statsMonth})`}</h3>
          <div className="stats-grid">
            <div className="stat-box" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
              <span className="stat-number" style={{ color: 'var(--danger-color)' }}>{stats.absent}</span>
              <span className="stat-label">Absent</span>
            </div>
            <div className="stat-box present">
              <span className="stat-number">{stats.present}</span>
              <span className="stat-label">Present</span>
            </div>
            <div className="stat-box late">
              <span className="stat-number">{stats.late}</span>
              <span className="stat-label">Lates</span>
            </div>
            <div className="stat-box leave">
              <span className="stat-number">{stats.leave}</span>
              <span className="stat-label">On Leave</span>
            </div>
            {stats.halfDay > 0 && (
              <div className="stat-box" style={{ backgroundColor: 'var(--warning-color)', color: 'white' }}>
                <span className="stat-number">{stats.halfDay}</span>
                <span className="stat-label">Half Day</span>
              </div>
            )}
          </div>
          <div className="payroll-hint">
            <AlertCircle size={14} /> Note: 3 lates equal 1 day salary deduction.
          </div>
        </div>
      </div>

      <div className="card logs-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ margin: 0 }}>Attendance Logs</h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Filter Month:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--card-bg)',
                  color: 'var(--text-main)',
                  outline: 'none',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                <option value="All" style={{ background: 'var(--card-bg)', color: 'var(--text-main)' }}>All Months</option>
                {generateMonths().map(m => (
                  <option key={m.value} value={m.value} style={{ background: 'var(--card-bg)', color: 'var(--text-main)' }}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {user?.role === 'admin' && (
              <>
                <input
                  type="text"
                  placeholder="Search Employee..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ padding: '0.5rem 1rem', width: '250px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-active)', color: 'var(--text-main)', outline: 'none' }}
                />
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => setIsAddModalOpen(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
                >
                  <Plus size={18} /> Add Attendance
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleDownloadAttendance}
                  title="Download attendance records for the selected month"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
                >
                  <Download size={18} /> Download
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="date"
                    id="auto-absent-date"
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--bg-active)',
                      color: 'var(--text-main)',
                      outline: 'none',
                      fontSize: '0.9rem'
                    }}
                    placeholder="YYYY-MM-DD (optional)"
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={async () => {
                      setIsRunningAutoAbsent(true);
                      try {
                        const forceDate = (document.getElementById('auto-absent-date') as HTMLInputElement)?.value || undefined;
                        // Call API directly with query params for flexibility
                        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
                        const apiUrl = baseUrl.includes('/api') ? baseUrl : `${baseUrl}/api`;
                        const response = await fetch(`${apiUrl}/attendance/test-auto-absent?allowToday=true${forceDate ? `&forceDate=${encodeURIComponent(forceDate)}` : ''}`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token') || JSON.parse(localStorage.getItem('hrms_session') || '{}').token}`
                          }
                        });
                        const result = await response.json();

                        if (!response.ok) {
                          throw new Error(result.error || 'Failed to run auto absent');
                        }

                        if (result.result?.skipped) {
                          toast.warning(`Auto absent skipped: ${result.result.reason}`);
                        } else {
                          toast.success(`Auto absent completed! ${result.result?.absentRecords || 0} absent, ${result.result?.leaveRecords || 0} leave records added.`);
                        }

                        const updatedAttendance = await fetchAttendance();
                        setLogs(Array.isArray(updatedAttendance) ? updatedAttendance : []);
                      } catch (error: any) {
                        toast.error(error.message || 'Failed to run auto absent');
                      } finally {
                        setIsRunningAutoAbsent(false);
                      }
                    }}
                    disabled={isRunningAutoAbsent}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      whiteSpace: 'nowrap',
                      background: 'linear-gradient(135deg, #ef4444 0%, #ec4899 100%)',
                      border: 'none',
                      color: 'white',
                      cursor: isRunningAutoAbsent ? 'not-allowed' : 'pointer',
                      opacity: isRunningAutoAbsent ? 0.7 : 1
                    }}
                  >
                    {isRunningAutoAbsent ? (
                      <>
                        <RefreshCw size={18} style={{ animation: 'spin 1s linear infinite' }} />
                        Running Auto Absent...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={18} />
                        Auto Absent
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                {user?.role === 'admin' && <th>Employee Name</th>}
                <th><Calendar size={16} className="inline-icon" /> Date</th>
                <th>Status</th>
                <th><Clock size={16} className="inline-icon" /> Time In</th>
                <th><Clock size={16} className="inline-icon" /> Time Out</th>
                <th className="attendance-location-col"><MapPin size={16} className="inline-icon" /> Location</th>
                <th>Shift Hours</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(filteredLogs) && filteredLogs.length > 0 ? (
                filteredLogs.map((log: LogRecord) => {
                  if (!log) return null;
                  const empName = Array.isArray(employees) ? (employees.find(e => e.id === log.empId)?.name || log.empId) : log.empId;

                  return (
                    <tr key={log.id}>
                      {user?.role === 'admin' && <td><strong>{empName}</strong></td>}
                      <td>{formatDateNice(log.date || '')}</td>
                      <td>
                        <span className={`attendance-status-badge ${statusBadgeClass(log.status)}`}>
                          {log.status || (log.isAbsent ? 'Absent' : '-')}
                        </span>
                      </td>
                      <td style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>{formatTime12h(log.timeIn || '')}</td>
                      <td style={{ color: 'var(--danger-color)', fontWeight: 'bold' }}>{formatTime12h(log.timeOut || '')}</td>
                      <td className="attendance-location-cell" title={typeof log.location === 'string' ? log.location : ''}>
                        {(() => {
                          if (!log.location) return '-';
                          if (typeof log.location === 'string') {
                            if (log.location.startsWith('{')) return 'GPS';
                            return log.location;
                          }
                          if (typeof log.location === 'object') {
                            const loc = log.location as any;
                            if (loc.lat && loc.lng) return `${Number(loc.lat).toFixed(3)}, ${Number(loc.lng).toFixed(3)}`;
                            return 'GPS';
                          }
                          return '-';
                        })()}
                      </td>
                      <td><strong>{log.shiftHours || '-'}</strong></td>
                      <td>
                        <div className="action-cell">
                          <button className="action-btn" title="View Details" onClick={() => setSelectedLog(log)}><Eye size={18} /></button>
                          {user?.role === 'admin' && (
                            <>
                              <button className="action-btn" style={{ color: 'var(--warning-color)' }} title="Edit" onClick={() => { setEditLogId(log.id); setEditFormData(log); }}><Edit2 size={18} /></button>
                              <button className="action-btn" style={{ color: 'var(--danger-color)' }} title="Delete" onClick={async () => {
                                if (window.confirm('Are you sure you want to delete this attendance record?')) {
                                  try {
                                    await deleteAttendance(log.id);
                                    setLogs(prev => Array.isArray(prev) ? prev.filter(l => l && l.id !== log.id) : []);
                                    toast.success('Attendance record deleted');
                                  } catch (e: any) {
                                    toast.error(`Failed to delete: ${e.message}`);
                                  }
                                }
                              }}><Trash2 size={18} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={user?.role === 'admin' ? 8 : 7} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    No attendance logs found for this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Log Modal */}
      {editLogId && (
        <div className="emp-modal-overlay" onClick={() => setEditLogId(null)}>
          <div className="emp-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Attendance Log</h2>
              <button className="close-btn" onClick={() => setEditLogId(null)}><X size={24} /></button>
            </div>

            <div className="modal-body">
              <div className="profile-header">
                <div className="profile-avatar large">
                  {employees.find(e => e.id === editFormData.empId)?.name?.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                  <h3>{employees.find(e => e.id === editFormData.empId)?.name || editFormData.empId}</h3>
                  <p style={{ color: 'var(--text-muted)' }}>{editFormData.empId}</p>
                </div>
                {editFormData.selfie && (
                  <div
                    className="edit-modal-selfie"
                    style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', border: '2px solid var(--border-color)', cursor: 'pointer' }}
                    onClick={() => setSelectedSelfie(getSelfieUrl(editFormData.selfie))}
                  >
                    <img
                      src={getSelfieUrl(editFormData.selfie) || ''}
                      alt="Attendance Selfie"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}
              </div>

              <div className="details-grid">
                <div className="detail-group">
                  <label>Date</label>
                  <input
                    type="date"
                    value={editFormData.date || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })}
                    style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.95rem', padding: 0, outline: 'none' }}
                  />
                </div>

                <div className="detail-group">
                  <label>Status</label>
                  <select
                    value={editFormData.status || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as any })}
                    style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.95rem', padding: 0, outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="Present" style={{ background: '#111827' }}>Present</option>
                    <option value="Late" style={{ background: '#111827' }}>Late</option>
                    <option value="Absent" style={{ background: '#111827' }}>Absent</option>
                    <option value="On Leave" style={{ background: '#111827' }}>On Leave</option>
                    <option value="Half Day" style={{ background: '#111827' }}>Half Day</option>
                  </select>
                </div>

                <div className="detail-group highlight-green">
                  <label>Clock In (HH:MM:SS)</label>
                  <input
                    type="text"
                    value={editFormData.timeIn || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, timeIn: e.target.value })}
                    style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--success-color)', fontSize: '1rem', fontWeight: 'bold', padding: 0, outline: 'none' }}
                  />
                </div>

                <div className="detail-group highlight-pink">
                  <label>Clock Out (HH:MM:SS)</label>
                  <input
                    type="text"
                    value={editFormData.timeOut || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, timeOut: e.target.value })}
                    style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--danger-color)', fontSize: '1rem', fontWeight: 'bold', padding: 0, outline: 'none' }}
                  />
                </div>

                <div className="detail-group highlight-pink" style={{ gridColumn: 'span 2' }}>
                  <label>Late Reason</label>
                  <textarea
                    value={editFormData.lateReason || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, lateReason: e.target.value })}
                    placeholder="Enter reason if late"
                    style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.9rem', padding: 0, outline: 'none', minHeight: '60px', resize: 'none', fontFamily: 'inherit' }}
                  />
                </div>

                <div className="detail-group highlight-pink" style={{ gridColumn: 'span 2' }}>
                  <label>Early Exit Reason</label>
                  <textarea
                    value={editFormData.earlyReason || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, earlyReason: e.target.value })}
                    placeholder="Enter reason for early exit"
                    style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.9rem', padding: 0, outline: 'none', minHeight: '60px', resize: 'none', fontFamily: 'inherit' }}
                  />
                </div>

                <div className="detail-group" style={{ gridColumn: 'span 2' }}>
                  <label>Location / Address</label>
                  <input
                    type="text"
                    value={editFormData.location || ''}
                    onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                    style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.9rem', padding: 0, outline: 'none' }}
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setEditLogId(null)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={async () => {
                  const updatedHours = calculateHours(editFormData.timeIn || '-', editFormData.timeOut || '-');
                  const updatedLog = { ...editFormData, shiftHours: updatedHours } as LogRecord;
                  try {
                    await updateAttendance(updatedLog.id, updatedLog);
                    setLogs(prev => prev.map(l => l.id === updatedLog.id ? updatedLog : l));
                    setEditLogId(null);
                    toast.success('Attendance updated successfully');
                  } catch (e: any) {
                    toast.error(`Failed to update: ${e.message}`);
                  }
                }}
              >
                <Save size={18} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Attendance Modal (Admin) */}
      {isAddModalOpen && user?.role === 'admin' && (
        <div className="emp-modal-overlay" onClick={() => setIsAddModalOpen(false)}>
          <div className="emp-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Attendance</h2>
              <button className="close-btn" onClick={() => setIsAddModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleAddAttendance} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div className="modal-body">
                <div className="details-grid">
                  <div className="detail-group highlight-pink" style={{ gridColumn: 'span 2' }}>
                    <label>Employee *</label>
                    <select
                      required
                      value={newAttendance.empId}
                      onChange={e => setNewAttendance({ ...newAttendance, empId: e.target.value })}
                      style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.95rem', padding: 0, outline: 'none', cursor: 'pointer' }}
                    >
                      <option value="" style={{ background: '#111827' }}>Select employee...</option>
                      {employees.filter(e => e.status === 'Active').map(emp => (
                        <option key={emp.id} value={emp.id} style={{ background: '#111827' }}>
                          {emp.name} ({emp.id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="detail-group">
                    <label>Date *</label>
                    <input
                      required
                      type="date"
                      value={newAttendance.date}
                      onChange={e => setNewAttendance({ ...newAttendance, date: e.target.value })}
                      style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.95rem', padding: 0, outline: 'none' }}
                    />
                  </div>
                  <div className="detail-group">
                    <label>Status *</label>
                    <select
                      required
                      value={newAttendance.status}
                      onChange={e => setNewAttendance({ ...newAttendance, status: e.target.value as LogRecord['status'] })}
                      style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.95rem', padding: 0, outline: 'none', cursor: 'pointer' }}
                    >
                      <option value="Present" style={{ background: '#111827' }}>Present</option>
                      <option value="Late" style={{ background: '#111827' }}>Late</option>
                      <option value="Absent" style={{ background: '#111827' }}>Absent</option>
                      <option value="On Leave" style={{ background: '#111827' }}>On Leave</option>
                      <option value="Half Day" style={{ background: '#111827' }}>Half Day</option>
                    </select>
                  </div>
                  <div className="detail-group highlight-green">
                    <label>Clock In (HH:MM:SS)</label>
                    <input
                      type="text"
                      placeholder="17:45:00"
                      value={newAttendance.timeIn}
                      onChange={e => setNewAttendance({ ...newAttendance, timeIn: e.target.value })}
                      style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--success-color)', fontSize: '0.95rem', padding: 0, outline: 'none' }}
                    />
                  </div>
                  <div className="detail-group highlight-pink">
                    <label>Clock Out (HH:MM:SS)</label>
                    <input
                      type="text"
                      placeholder="03:00:00"
                      value={newAttendance.timeOut}
                      onChange={e => setNewAttendance({ ...newAttendance, timeOut: e.target.value })}
                      style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--danger-color)', fontSize: '0.95rem', padding: 0, outline: 'none' }}
                    />
                  </div>
                  <div className="detail-group" style={{ gridColumn: 'span 2' }}>
                    <label>Late Reason</label>
                    <input
                      type="text"
                      value={newAttendance.lateReason}
                      onChange={e => setNewAttendance({ ...newAttendance, lateReason: e.target.value })}
                      style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.9rem', padding: 0, outline: 'none' }}
                    />
                  </div>
                  <div className="detail-group" style={{ gridColumn: 'span 2' }}>
                    <label>Early Exit Reason</label>
                    <input
                      type="text"
                      value={newAttendance.earlyReason}
                      onChange={e => setNewAttendance({ ...newAttendance, earlyReason: e.target.value })}
                      style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.9rem', padding: 0, outline: 'none' }}
                    />
                  </div>
                  <div className="detail-group" style={{ gridColumn: 'span 2' }}>
                    <label>Location</label>
                    <input
                      type="text"
                      placeholder="Office / GPS note"
                      value={newAttendance.location}
                      onChange={e => setNewAttendance({ ...newAttendance, location: e.target.value })}
                      style={{ width: '100%', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.9rem', padding: 0, outline: 'none' }}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">
                  <Plus size={18} /> Add Attendance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="emp-modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="emp-modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Attendance Details</h2>
              <button className="close-btn" onClick={() => setSelectedLog(null)}><X size={24} /></button>
            </div>

            <div className="modal-body">
              <div className="profile-header">
                <div
                  className="profile-avatar large"
                  style={{
                    overflow: 'hidden',
                    background: 'var(--bg-active)',
                    cursor: getSelfieUrl(selectedLog.selfie) ? 'pointer' : 'default',
                  }}
                  onClick={() => {
                    const url = getSelfieUrl(selectedLog.selfie);
                    if (url) setSelectedSelfie(url);
                  }}
                  title={getSelfieUrl(selectedLog.selfie) ? 'Click to enlarge selfie' : undefined}
                >
                  {getSelfieUrl(selectedLog.selfie) ? (
                    <img
                      src={getSelfieUrl(selectedLog.selfie) || ''}
                      alt="Selfie"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(employees.find(emp => emp.id === selectedLog.empId)?.name || 'User')}`;
                      }}
                    />
                  ) : (
                    <Camera size={30} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>
                <div className="flex-1">
                  <h3>{employees.find(e => e.id === selectedLog.empId)?.name || selectedLog.empId}</h3>
                  <p style={{ color: 'var(--text-muted)' }}>{selectedLog.empId}</p>
                </div>
                <div className={`status-badge ${selectedLog.status?.toLowerCase().replace(' ', '-')}`}>
                  {selectedLog.status}
                </div>
              </div>

              <div className="details-grid">
                <div className="detail-group">
                  <label>Date</label>
                  <div className="detail-value">{formatDateNice(selectedLog.date)}</div>
                </div>

                <div className="detail-group">
                  <label>Shift Hours</label>
                  <div className="detail-value" style={{ fontWeight: 'bold' }}>{selectedLog.shiftHours || '-'}</div>
                </div>

                <div className="detail-group highlight-green">
                  <label>Clock In</label>
                  <div className="detail-value" style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>{formatTime12h(selectedLog.timeIn)}</div>
                </div>

                <div className="detail-group highlight-pink">
                  <label>Clock Out</label>
                  <div className="detail-value" style={{ color: 'var(--danger-color)', fontWeight: 'bold' }}>{formatTime12h(selectedLog.timeOut)}</div>
                </div>

                <div className="detail-group highlight-pink" style={{ gridColumn: 'span 2' }}>
                  <label>Late Reason</label>
                  <div className="detail-value" style={{ color: selectedLog.lateReason ? '#fff' : 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {selectedLog.lateReason || (selectedLog.status === 'Late' ? 'No reason provided' : 'N/A')}
                  </div>
                </div>

                <div className="detail-group highlight-pink" style={{ gridColumn: 'span 2' }}>
                  <label>Early Exit Reason</label>
                  <div className="detail-value" style={{ color: selectedLog.earlyReason ? '#fff' : 'var(--text-muted)', fontSize: '0.9rem' }}>
                    {selectedLog.earlyReason || (selectedLog.isHalfDay ? 'No reason provided' : 'N/A')}
                  </div>
                </div>

                <div className="detail-group" style={{ gridColumn: 'span 2' }}>
                  <label>Location Details</label>
                  <div className="detail-value" style={{ fontSize: '0.85rem' }}>
                    {(() => {
                      if (!selectedLog.location) return 'No location data available';

                      // Handle if location is already an object
                      if (typeof selectedLog.location === 'object') {
                        const loc = selectedLog.location as any;
                        if (loc.lat && loc.lng) {
                          return `Latitude: ${Number(loc.lat).toFixed(6)}, Longitude: ${Number(loc.lng).toFixed(6)}`;
                        }
                        return 'Invalid location object';
                      }

                      // Handle if location is a JSON string
                      if (typeof selectedLog.location === 'string' && selectedLog.location.startsWith('{')) {
                        try {
                          const loc = JSON.parse(selectedLog.location);
                          return `Latitude: ${Number(loc.lat).toFixed(6)}, Longitude: ${Number(loc.lng).toFixed(6)}`;
                        } catch {
                          return selectedLog.location;
                        }
                      }

                      return selectedLog.location;
                    })()}
                  </div>
                </div>

                <div className="detail-group">
                  <label>Device ID</label>
                  <div className="detail-value" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>{selectedLog.deviceId || 'Unknown'}</div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedLog(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Selfie Preview Modal */}
      {selectedSelfie && (
        <div
          className="selfie-modal-overlay"
          onClick={() => setSelectedSelfie(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
        >
          <div
            className="selfie-modal-content"
            onClick={e => e.stopPropagation()}
            style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}
          >
            <button
              onClick={() => setSelectedSelfie(null)}
              style={{ position: 'absolute', top: '-40px', right: 0, background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
            >
              <X size={30} />
            </button>
            <img
              src={selectedSelfie}
              alt="Full Selfie"
              style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '80vh', borderRadius: '8px', boxShadow: '0 0 20px rgba(0,0,0,0.5)' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;