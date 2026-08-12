import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Mail, Lock, ArrowRight, ArrowLeft } from 'lucide-react';

export default function LoginPage({ onNavigate, selectedPortal = 'customer' }) {
  const { login, switchDemoRole } = useAuth();
  const { addToast } = useToast();

  // Demo accounts directory for quick click logs
  const defaultEmails = {
    customer: 'customer@copycraft.com',
    dealer: 'dealer@copycraft.com',
    distributor: 'distributor@copycraft.com',
    admin: 'admin@copycraft.com'
  };

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password123!');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setEmail(defaultEmails[selectedPortal] || '');
  }, [selectedPortal]);

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

  const handleQuickDemo = async () => {
    setIsSubmitting(true);
    try {
      const res = await switchDemoRole(selectedPortal);
      if (res?.success) {
        addToast(`Demo ${selectedPortal} access granted`, 'success');
        onNavigate('dashboard');
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
