import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../utils/api';
import { Mail, Lock, Phone, ArrowRight, ArrowLeft, Key } from 'lucide-react';

export default function LoginPage({ onNavigate, selectedPortal = 'customer' }) {
  const { login, switchDemoRole, completeStaffLogin } = useAuth();
  const { addToast } = useToast();

  // Demo accounts directory for quick click logs
  const defaultEmails = {
    customer: 'customer@copycraft.com',
    dealer: 'dealer@copycraft.com',
    distributor: 'distributor@copycraft.com',
    admin: 'admin@copycraft.com'
  };

  const defaultPhones = {
    dealer: '+91 97222 33344',
    distributor: '+91 98111 22233'
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password123!');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setEmail(defaultEmails[selectedPortal] || '');
    setPhone(defaultPhones[selectedPortal] || '');
    setOtpSent(false);
    setOtpCode('');
  }, [selectedPortal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await login(email, password, selectedPortal, phone || null);
      if (res.success) {
        if (res.otpRequired) {
          addToast(res.message || 'OTP verification required', 'info');
          setSessionId(res.sessionId);
          setOtpSent(true);
        } else {
          addToast(`Welcome back, ${res.user.name}!`, 'success');
          onNavigate('dashboard');
        }
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

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode) {
      addToast('Please enter the 4-digit verification code', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch('/auth/verify-login-otp', {
        method: 'POST',
        body: JSON.stringify({ sessionId, otp: otpCode })
      });

      if (res.success) {
        addToast('Staff verification successful! Access granted.', 'success');
        completeStaffLogin(res.token, res.user);
        onNavigate('dashboard');
      } else {
        addToast(res.message || 'Verification code invalid', 'error');
      }
    } catch (err) {
      addToast('MFA verification error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemo = async () => {
    setIsSubmitting(true);
    try {
      // For Admin and Customer, direct bypass
      if (['customer', 'admin'].includes(selectedPortal)) {
        await switchDemoRole(selectedPortal);
        addToast(`Demo ${selectedPortal} access granted`, 'success');
        onNavigate('dashboard');
      } else {
        // For staff, we automatically trigger the OTP state and log the simulated code
        const res = await login(email, password, selectedPortal, phone);
        if (res.success && res.otpRequired) {
          addToast(`Demo OTP code triggered! Enter '1234' if you wish, or check simulated code.`, 'info');
          setSessionId(res.sessionId);
          setOtpSent(true);
        }
      }
    } catch (e) {
      addToast('Demo switch failed', 'error');
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

      <div className="card animate-fade-in" style={{ maxWidth: '440px', width: '100%', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img
            src="/logo.png"
            alt="CopyCraft Logo"
            style={{ width: '70px', height: '70px', objectFit: 'contain', borderRadius: '12px', marginBottom: '0.75rem' }}
          />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>
            {portalNames[selectedPortal] || 'CopyCraft'} Login
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {selectedPortal === 'customer' 
              ? 'Enter email & password to access your account' 
              : 'Enter your credentials & phone to request secure login OTP'}
          </p>
        </div>

        {!otpSent ? (
          /* Step 1: Main Login Form */
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
              <label className="input-label">Password</label>
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

            {/* Render Phone input for Dealers/Distributors */}
            {['dealer', 'distributor'].includes(selectedPortal) && (
              <div className="input-group">
                <label className="input-label">Registered Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    required
                    className="input-field"
                    style={{ paddingLeft: '38px' }}
                    value={phone}
                    placeholder="+91 XXXXX XXXXX"
                    onChange={e => setPhone(e.target.value)}
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-lg btn-primary"
              disabled={isSubmitting}
              style={{ width: '100%', marginTop: '0.5rem', gap: '0.5rem' }}
            >
              {isSubmitting ? 'Authenticating...' : ['dealer', 'distributor'].includes(selectedPortal) ? 'Send Verification OTP' : 'Sign In'}
              <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          /* Step 2: Staff OTP Multi-factor input */
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '50px', height: '50px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', margin: '0 auto' }}>
              <Key size={24} />
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <h4 style={{ fontWeight: 700 }}>Dual-Factor Verification</h4>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                We sent a secure login OTP code to your registered mobile {phone}.
              </p>
            </div>

            <div className="input-group">
              <input
                type="text"
                required
                maxLength={4}
                className="input-field"
                placeholder="4-Digit OTP"
                value={otpCode}
                onChange={e => setOtpCode(e.target.value)}
                style={{ fontSize: '1.5rem', letterSpacing: '0.3em', textAlign: 'center', fontWeight: 800 }}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setOtpSent(false)}
                style={{ flex: 1 }}
              >
                Back
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                style={{ flex: 2 }}
              >
                {isSubmitting ? 'Verifying...' : 'Verify & Open Hub'}
              </button>
            </div>
          </form>
        )}

        {/* Demo Bypass Option */}
        <div style={{ marginTop: '2rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center', marginBottom: '0.75rem' }}>
            QUICK DEMO ACCREDITATION
          </div>
          <button
            className="btn btn-sm btn-secondary"
            onClick={handleQuickDemo}
            disabled={isSubmitting}
            style={{ width: '100%' }}
          >
            Pre-Seed and Sign In demo credentials
          </button>
        </div>

        {selectedPortal === 'customer' && (
          <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
            Don't have an account?{' '}
            <button onClick={() => onNavigate('register')} style={{ color: 'var(--primary)', fontWeight: 700 }}>
              Register Now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
