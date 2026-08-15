import { type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Attendance from './pages/Attendance';
import Payroll from './pages/Payroll';
import PayslipGenerator from './pages/PayslipGenerator';
import Recruitment from './pages/Recruitment';
import BankDetails from './pages/BankDetails';
import Settings from './pages/Settings';
import Tasks from './pages/Tasks';
import LeaveApply from './pages/LeaveApply';
import AdminLeaves from './pages/AdminLeaves';
import Login from './pages/Login';
import Apply from './pages/Apply';
import CVScanner from './pages/CVScanner';
import CandidateDashboard from './pages/CandidateDashboard';
import { AuthProvider } from './context/AuthProvider'; 
import { useAuth } from './context/useAuth';
import { Toaster } from 'react-hot-toast';
import './App.css';

const PrivateRoute = ({ children, allowedRoles }: { children: ReactNode, allowedRoles?: string[] }) => {
  const { user, isLoading } = useAuth();

  console.log("PrivateRoute Check:", { 
    path: window.location.pathname, 
    userRole: user?.role, 
    allowedRoles, 
    isLoading 
  });

  if (isLoading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--bg-color)', color: 'var(--primary-color)' }}>Loading...</div>;

  if (!user) {
    console.log("PrivateRoute: No user, redirecting to login");
    return <Navigate to="/login" replace />;
  }

  const role = user.role?.toLowerCase();
  
  if (allowedRoles && !allowedRoles.includes(role as string)) {
    console.log(`PrivateRoute: Role ${role} not allowed for this route. Redirecting...`);
    if (role === 'employee') return <Navigate to="/attendance" replace />;
    if (role === 'candidate') return <Navigate to="/candidate-dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};


function App() {
  return (
    <AuthProvider>
      <Toaster position="top-right" reverseOrder={false} />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/apply" element={<Apply />} />

          <Route path="/" element={<PrivateRoute><MainLayout /></PrivateRoute>}>

            <Route index element={
              <PrivateRoute allowedRoles={['admin']}>
                <Dashboard />
              </PrivateRoute>
            } />

            <Route path="employees" element={
              <PrivateRoute allowedRoles={['admin']}>
                <Employees />
              </PrivateRoute>
            } />

            <Route path="payroll" element={
              <PrivateRoute allowedRoles={['admin']}>
                <Payroll />
              </PrivateRoute>
            } />

            <Route path="payslip-generator" element={
              <PrivateRoute allowedRoles={['admin']}>
                <PayslipGenerator />
              </PrivateRoute>
            } />

            <Route path="recruitment" element={
              <PrivateRoute allowedRoles={['admin']}>
                <Recruitment />
              </PrivateRoute>
            } />

            <Route path="bank-details" element={
              <PrivateRoute allowedRoles={['admin']}>
                <BankDetails />
              </PrivateRoute>
            } />

            <Route path="tasks" element={
              <PrivateRoute allowedRoles={['admin', 'employee']}>
                <Tasks />
              </PrivateRoute>
            } />

            <Route path="settings" element={
              <PrivateRoute allowedRoles={['admin']}>
                <Settings />
              </PrivateRoute>
            } />

            <Route path="attendance" element={
              <PrivateRoute allowedRoles={['admin', 'employee']}>
                <Attendance />
              </PrivateRoute>
            } />

            <Route path="leaves" element={
              <PrivateRoute allowedRoles={['employee']}>
                <LeaveApply />
              </PrivateRoute>
            } />

            <Route path="admin-leaves" element={
              <PrivateRoute allowedRoles={['admin']}>
                <AdminLeaves />
              </PrivateRoute>
            } />

            <Route path="candidate-dashboard" element={
              <PrivateRoute allowedRoles={['candidate']}>
                <CandidateDashboard />
              </PrivateRoute>
            } />

            <Route path="cv-scanner" element={
              <PrivateRoute allowedRoles={['admin']}>
                <CVScanner />
              </PrivateRoute>
            } />

          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
