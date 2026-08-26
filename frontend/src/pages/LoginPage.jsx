import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { usePwa } from '../context/PwaContext';
import { apiFetch } from '../utils/api';
import { Mail, Lock, ArrowRight, ArrowLeft, Download, Eye, EyeOff, KeyRound, ShieldCheck, RefreshCw } from 'lucide-react';

// ── Forgot Password Flow: 3 steps ─────────────────────────────────────────
// Step 1: Enter email → request OTP
// Step 2: Enter OTP
// Step 3: Set new password

function ForgotPasswordFlow({ onBack }) {
  const { addToast } = useToast();
  const [step, setStep] = useState(1); // 1 | 2 | 3
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetToken, setResetToken] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleRequestOtp = async (e) => {
    e?.preventDefault();
    if (!email) { addToast('Please enter your email.', 'error'); return; }
    setLoading(true);
    try {
      const res = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email })
      });
      if (res.success) {
        addToast('OTP sent! Check your email (or backend console in dev mode).', 'success');
        setStep(2);
        startResendCooldown();
      } else {
        addToast(res.message || 'Failed to send OTP.', 'error');
      }
    } catch {
      addToast('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) { addToast('Please enter the 6-digit OTP.', 'error'); return; }
    setLoading(true);
    try {
      const res = await apiFetch('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ email, otp })
      });
      if (res.success) {
        setResetToken(res.resetToken);
        addToast('OTP verified! Now set your new password.', 'success');
        setStep(3);
      } else {
        addToast(res.message || 'Invalid OTP.', 'error');
      }
    } catch {
      addToast('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { addToast('Passwords do not match.', 'error'); return; }
    if (newPassword.length < 6) { addToast('Password must be at least 6 characters.', 'error'); return; }
    setLoading(true);
    try {
      const res = await apiFetch('/auth/reset-password', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resetToken}` },
        body: JSON.stringify({ newPassword })
      });
      if (res.success) {
        addToast('Password reset successfully! Please log in.', 'success');
        onBack();
      } else {
        addToast(res.message || 'Failed to reset password.', 'error');
      }
    } catch {
      addToast('Network error. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card animate-fade-in" style={{ maxWidth: '440px', width: '100%', padding: '2.5rem' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
        <div style={{
          width: '56px', height: '56px', borderRadius: '16px',
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1rem'
        }}>
          <KeyRound size={26} color="#fff" />
        </div>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Forgot Password</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
          {step === 1 && 'Enter your registered email to receive an OTP'}
          {step === 2 && `OTP sent to ${email}`}
          {step === 3 && 'Set your new password'}
        </p>
      </div>

      {/* Step indicators */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1.75rem' }}>
        {[1, 2, 3].map(s => (
          <React.Fragment key={s}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: step >= s ? 'var(--primary)' : 'var(--bg-app)',
              border: `2px solid ${step >= s ? 'var(--primary)' : 'var(--border-color)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: step >= s ? '#fff' : 'var(--text-muted)',
              fontWeight: 800, fontSize: '0.8rem',
              transition: 'all 0.3s ease'
            }}>
              {step > s ? <ShieldCheck size={14} /> : s}
            </div>
            {s < 3 && <div style={{ width: '40px', height: '2px', background: step > s ? 'var(--primary)' : 'var(--border-color)', transition: 'background 0.3s ease' }} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Email */}
      {step === 1 && (
        <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="input-group">
            <label className="input-label">Registered Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="email" required className="input-field"
                style={{ paddingLeft: '38px' }}
                value={email} placeholder="your@email.com"
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>
          <button type="submit" className="btn btn-lg btn-primary" disabled={loading}
            style={{ width: '100%', gap: '0.5rem', justifyContent: 'center' }}>
            {loading ? 'Sending OTP...' : 'Send OTP'} <ArrowRight size={18} />
          </button>
        </form>
      )}

      {/* Step 2: OTP */}
      {step === 2 && (
        <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="input-group">
            <label className="input-label">6-Digit OTP</label>
            <input
              type="text" required maxLength={6} pattern="\d{6}"
              className="input-field"
              style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '8px', fontFamily: 'var(--font-mono)' }}
              value={otp} placeholder="000000"
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            />
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '0.4rem' }}>
              Check your email inbox (and spam folder)
            </p>
          </div>
          <button type="submit" className="btn btn-lg btn-primary" disabled={loading}
            style={{ width: '100%', gap: '0.5rem', justifyContent: 'center' }}>
            {loading ? 'Verifying...' : 'Verify OTP'} <ArrowRight size={18} />
          </button>
          <button type="button"
            onClick={handleRequestOtp}
            disabled={loading || resendCooldown > 0}
            style={{
              background: 'none', border: 'none', cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
              color: resendCooldown > 0 ? 'var(--text-muted)' : 'var(--primary)',
              fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem'
            }}>
            <RefreshCw size={14} />
            {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
          </button>
        </form>
      )}

      {/* Step 3: New Password */}
      {step === 3 && (
        <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="input-group">
            <label className="input-label">New Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type={showNew ? 'text' : 'password'} required
                className="input-field"
                style={{ paddingLeft: '38px', paddingRight: '42px' }}
                value={newPassword} placeholder="At least 6 characters"
                onChange={e => setNewPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowNew(v => !v)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div className="input-group">
            <label className="input-label">Confirm New Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type={showConfirm ? 'text' : 'password'} required
                className="input-field"
                style={{
                  paddingLeft: '38px', paddingRight: '42px',
                  borderColor: confirmPassword && confirmPassword !== newPassword ? '#EF4444' : undefined
                }}
                value={confirmPassword} placeholder="Re-enter new password"
                onChange={e => setConfirmPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}>
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmPassword && confirmPassword !== newPassword && (
              <p style={{ color: '#EF4444', fontSize: '0.78rem', marginTop: '0.3rem' }}>Passwords do not match</p>
            )}
          </div>
          <button type="submit" className="btn btn-lg btn-primary" disabled={loading}
            style={{ width: '100%', gap: '0.5rem', justifyContent: 'center', background: '#10B981', borderColor: '#10B981' }}>
            <ShieldCheck size={18} />
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      )}

      {/* Back link */}
      <button onClick={onBack}
        style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', width: '100%', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
        <ArrowLeft size={15} /> Back to Login
      </button>
    </div>
  );
}

// ── Main Login Page ──────────────────────────────────────────────────────────
export default function LoginPage({ onNavigate, selectedPortal = 'customer' }) {
  const { login } = useAuth();
  const { addToast } = useToast();
  const { installApp, isInstalled } = usePwa();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await login(email, password, selectedPortal);
      if (res.success) {
        addToast(`Welcome back, ${res.user.name}!`, 'success');
        onNavigate('dashboard');
      } else {
        // Warning messages for failed logins are returned directly by the server security sentinel
        addToast(res.message || 'Verification failed. Credentials invalid.', 'error');
      }
    } catch (err) {
      addToast(err.message || 'Login error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const portalNames = {
    customer: 'Customer Portal',
    dealer: 'Dealer Hub',
    distributor: 'Distributor Portal',
    admin: 'Executive Admin'
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)', padding: '1.5rem', flexDirection: 'column', gap: '1rem' }}>

      {/* Back to selection button */}
      <button
        onClick={() => onNavigate('portal_selection')}
        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
      >
        <ArrowLeft size={16} />
        Back to Portal Selection
      </button>

      {/* Forgot Password Flow */}
      {showForgotPassword ? (
        <ForgotPasswordFlow onBack={() => setShowForgotPassword(false)} />
      ) : (
        <div className="card animate-fade-in" style={{ maxWidth: '440px', width: '100%', padding: '2.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <img
              src="/logo.png?v=2"
              alt="CopyCraft Logo"
              style={{ width: '70px', height: '70px', objectFit: 'contain', borderRadius: '12px', marginBottom: '0.75rem' }}
            />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
              {portalNames[selectedPortal] || 'CopyCraft'} Login
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Enter your email &amp; password to access your account
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="input-group">
              <label className="input-label">Login Email ID</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  required
                  className="input-field"
                  style={{ paddingLeft: '38px' }}
                  value={email}
                  placeholder="name@copycraft.com"
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label className="input-label" style={{ margin: 0 }}>Password</label>
                {selectedPortal === 'customer' && (
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="password"
                  required
                  className="input-field"
                  style={{ paddingLeft: '38px' }}
                  value={password}
                  placeholder="••••••••"
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-lg btn-primary"
              disabled={isSubmitting}
              style={{ width: '100%', marginTop: '0.5rem', gap: '0.5rem' }}
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In'}
              <ArrowRight size={18} />
            </button>
          </form>

          {selectedPortal === 'customer' && (
            <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
              Don't have an account?{' '}
              <button onClick={() => onNavigate('register')} style={{ color: 'var(--primary)', fontWeight: 700 }}>
                Register Now
              </button>
            </div>
          )}
        </div>
      )}

      <button
        onClick={installApp}
        className="btn btn-sm btn-secondary"
        style={{
          marginTop: '0.5rem',
          gap: '0.45rem',
          fontSize: '0.82rem',
          padding: '0.45rem 0.9rem',
          borderRadius: 'var(--radius-full)',
          background: 'var(--bg-glass)',
          border: '1px solid var(--border-color)',
          color: 'var(--primary)',
          fontWeight: 700
        }}
      >
        <Download size={15} />
        {isInstalled ? 'CopyCraft App Ready' : 'Download CopyCraft App (Mobile & PC)'}
      </button>
    </div>
  );
}
