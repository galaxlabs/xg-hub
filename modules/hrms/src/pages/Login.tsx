import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { forgotPassword, resetPassword, verifyOtp } from '../api';
import { Lock, Mail, AlertCircle, LogIn, Key, CheckCircle } from 'lucide-react';
import { getDeviceId } from '../utils/deviceUtils';
import './Login.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // View states: 'login' | 'forgot' | 'verify' | 'success'
  const [view, setView] = useState<'login' | 'forgot' | 'verify' | 'success'>('login');
  
  // Forgot Password States
  const [otpToken, setOtpToken] = useState('');
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  // Check for expired session on mount
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('expired') === 'true') {
      setError('Session expired. Please login again.');
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill out all fields.');
      return;
    }

    setLoading(true);
    const deviceId = getDeviceId();
    
    if (!deviceId) {
      setError('Device ID could not be generated. Please refresh the page.');
      setLoading(false);
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const result = await login(normalizedEmail, password, deviceId);
    setLoading(false);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error || 'Invalid credentials. Please attempt again.');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email first.');
      return;
    }
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      setMsg(res.message);
      setView('verify');
      setIsOtpVerified(false);
      setOtpToken('');
      setError('');
    } catch(err: any) {
      setError(err.message || 'Error requesting reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpToken) {
      setError('Please enter the 6-digit OTP.');
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(email, otpToken);
      setIsOtpVerified(true);
      setError('');
      setMsg('OTP Verified. Please set your new password.');
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError('Please fill out all fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email, otpToken, newPassword);
      setView('success');
      setError('');
      setMsg('');
    } catch(err: any) {
      setError(err.message || 'Error resetting password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card animate-fade-in">
        <div className="login-header">
          <div className="login-logo">
            <img src="/logo.png" alt="Xperts Global" style={{ width: '60px', height: '60px', objectFit: 'contain' }} />
          </div>
          <h2>
            {view === 'login' && 'Sign in to Xperts Global'}
            {view === 'forgot' && 'Reset Password'}
            {view === 'verify' && (isOtpVerified ? 'Set New Password' : 'Verify OTP Reset')}
            {view === 'success' && 'Password Changed!'}
          </h2>
          <p>
            {view === 'login' && 'Welcome back! Please enter your details.'}
            {view === 'forgot' && 'Provide your email to receive an OTP code.'}
            {view === 'verify' && (isOtpVerified ? 'Create a secure new password.' : 'Check your email for the recovery code.')}
            {view === 'success' && 'You can now sign in with your new password.'}
          </p>
        </div>

        {error && (
          <div className="login-error">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        
        {msg && view !== 'success' && (
          <div className="login-error" style={{backgroundColor: '#e0ffe4', color: '#10b981', border: '1px solid #10b981'}}>
            <CheckCircle size={16} /> {msg}
          </div>
        )}

        {/* LOGIN VIEW */}
        {view === 'login' && (
          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label>Email Address</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input 
                  type="email" 
                  placeholder="Enter your email" 
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                />
              </div>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                Password
                <span onClick={() => { setView('forgot'); setError(''); setMsg(''); }} style={{ cursor: 'pointer', color: 'var(--primary-color)', fontSize: '0.8rem' }}>Forgot password?</span>
              </label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              <LogIn size={18} /> {loading ? 'Signing in...' : 'Sign In'}
            </button>
            
            <div className="signup-prompt" style={{ textAlign: 'center', marginTop: '1.5rem', color: 'var(--text-muted)' }}>
              Are you a new candidate? <Link to="/apply" style={{ color: 'var(--primary-color)' }}>Apply Here</Link>
            </div>
          </form>
        )}

        {/* FORGOT PASSWORD VIEW */}
        {view === 'forgot' && (
          <form onSubmit={handleForgotSubmit} className="login-form">
            <div className="form-group">
              <label>Email Address</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input 
                  type="email" 
                  placeholder="Enter your registration email" 
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                />
              </div>
            </div>
            
            <button type="submit" className="btn-primary w-full" disabled={loading}>
               {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
            
            <button type="button" onClick={() => setView('login')} className="btn-secondary w-full" style={{marginTop: '1rem'}}>
               Back to Login
            </button>
          </form>
        )}
        
        {/* VERIFY RESET VIEW */}
        {view === 'verify' && (
          <div className="login-form">
            {!isOtpVerified ? (
              <form onSubmit={handleOtpVerify}>
                <div className="form-group">
                  <label>Enter 6-Digit OTP</label>
                  <div className="input-with-icon">
                    <Key size={18} className="input-icon" />
                    <input 
                      type="text" 
                      placeholder="000000" 
                      value={otpToken}
                      onChange={(e) => { setOtpToken(e.target.value); setError(''); }}
                    />
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetSubmit}>
                <div className="form-group">
                  <label>New Password</label>
                  <div className="input-with-icon">
                    <Lock size={18} className="input-icon" />
                    <input 
                      type="password" 
                      placeholder="Secure password" 
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setError(''); }}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <div className="input-with-icon">
                    <Lock size={18} className="input-icon" />
                    <input 
                      type="password" 
                      placeholder="Confirm secure password" 
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                    />
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Processing...' : 'Update Password'}
                </button>
              </form>
            )}
            
            <button type="button" onClick={() => { setView('login'); setMsg(''); setIsOtpVerified(false); }} className="btn-secondary w-full" style={{marginTop: '1rem'}}>
               Cancel
            </button>
          </div>
        )}

        {/* SUCCESS VIEW */}
        {view === 'success' && (
          <div className="login-form" style={{textAlign: 'center'}}>
            <button type="button" onClick={() => { setView('login'); setPassword(''); setMsg(''); setEmail(''); setIsOtpVerified(false); }} className="btn-primary w-full">
               Return to Login
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default Login;
