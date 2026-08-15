import React, { useState } from 'react';
import { Lock, Mail, LogIn, ShieldCheck, KeyRound } from 'lucide-react';

export default function Login({ onLogin, resetTokenFromUrl }) {
  const [step, setStep] = useState(resetTokenFromUrl ? 'resetPassword' : 'credentials');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [employeeId, setEmployeeId] = useState(null);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      });
      const data = await res.json();

      if (res.ok && data.requires2FA) {
        setEmployeeId(data.employeeId);
        setMaskedEmail(data.email);
        setStep('twoFactor');
      } else {
        setError(data.message || 'Login failed.');
      }
    } catch (err) {
      console.error(err);
      setError('Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, code })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        onLogin(data.user);
      } else {
        setError(data.message || 'Incorrect code.');
      }
    } catch (err) {
      console.error(err);
      setError('Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotMessage('');
    setLoading(true);
    try {
      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      setForgotMessage(data.message);
    } catch (err) {
      console.error(err);
      setForgotMessage('Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setResetMessage('');
    if (newPassword !== confirmPassword) {
      setResetMessage('Both passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetTokenFromUrl, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setResetMessage('Password reset ho gaya! Ab login kar sakti ho.');
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      } else {
        setResetMessage(data.message || 'Could not reset password.');
      }
    } catch (err) {
      console.error(err);
      setResetMessage('Could not connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0a0a0a', padding: '20px'
    }}>
      <div style={{
        width: '100%', maxWidth: '400px', background: '#111111', border: '1px solid #222222',
        borderRadius: '12px', padding: '32px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#f5f5f5', margin: 0 }}>
            Xperts<span style={{ color: '#d32f2f' }}>Global</span> CRM
          </h1>
        </div>

        {step === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#888888' }}>Email/ID</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', opacity: 0.6, color: '#888' }} />
                <input
                  type="text"
                  className="input-field"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                  required
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#888888' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: '12px', top: '12px', opacity: 0.6, color: '#888' }} />
                <input
                  type="password"
                  className="input-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ paddingLeft: '38px' }}
                  required
                />
              </div>
            </div>

            {error && <div className="error-text">{error}</div>}

            <button type="submit" className="bx-btn bx-btn-primary" disabled={loading} style={{ justifyContent: 'center', marginTop: '6px' }}>
              <LogIn size={16} /> {loading ? 'Checking...' : 'Login'}
            </button>

            <div
              style={{ textAlign: 'center', fontSize: '12px', color: '#d32f2f', cursor: 'pointer', marginTop: '4px' }}
              onClick={() => { setStep('forgot'); setError(''); }}
            >
              Forgot Password?
            </div>
          </form>
        )}

        {step === 'twoFactor' && (
          <form onSubmit={handleVerifyCode} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ textAlign: 'center', marginBottom: '4px' }}>
              <ShieldCheck size={32} color="#d32f2f" style={{ marginBottom: '10px' }} />
              <p style={{ fontSize: '13px', color: '#888888', margin: 0 }}>
                We have sent a 6-digit verification code to <strong style={{ color: '#f5f5f5' }}>{maskedEmail}</strong>
              </p>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#888888' }}>Verification Code</label>
              <input
                type="text"
                className="input-field"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
                style={{ textAlign: 'center', letterSpacing: '6px', fontSize: '18px' }}
                required
              />
            </div>

            {error && <div className="error-text">{error}</div>}

            <button type="submit" className="bx-btn bx-btn-primary" disabled={loading} style={{ justifyContent: 'center' }}>
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>

            <div
              style={{ textAlign: 'center', fontSize: '12px', color: '#888888', cursor: 'pointer' }}
              onClick={() => { setStep('credentials'); setError(''); setCode(''); }}
            >
              Go back
            </div>
          </form>
        )}

        {step === 'forgot' && (
          <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '13px', color: '#888888', textAlign: 'center', margin: 0 }}>
              Enter your email to reset your password
            </p>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#888888' }}>Email</label>
              <input
                type="email"
                className="input-field"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
            </div>

            {forgotMessage && <div style={{ fontSize: '12px', color: '#4caf50', textAlign: 'center' }}>{forgotMessage}</div>}

            <button type="submit" className="bx-btn bx-btn-primary" disabled={loading} style={{ justifyContent: 'center' }}>
              <KeyRound size={16} /> {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div
              style={{ textAlign: 'center', fontSize: '12px', color: '#888888', cursor: 'pointer' }}
              onClick={() => { setStep('credentials'); setForgotMessage(''); }}
            >
              Go back
            </div>
          </form>
        )}

        {step === 'resetPassword' && (
          <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '13px', color: '#888888', textAlign: 'center', margin: 0 }}>
              Set a new password.
            </p>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#888888' }}>New Password</label>
              <input
                type="password"
                className="input-field"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#888888' }}>Confirm Password</label>
              <input
                type="password"
                className="input-field"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {resetMessage && <div style={{ fontSize: '12px', color: resetMessage.includes('reset ho gaya') ? '#4caf50' : '#f44336', textAlign: 'center' }}>{resetMessage}</div>}

            <button type="submit" className="bx-btn bx-btn-primary" disabled={loading} style={{ justifyContent: 'center' }}>
              {loading ? 'Saving...' : 'Reset Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}