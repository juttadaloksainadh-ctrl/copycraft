import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../utils/api';
import { Mail, Lock, Phone, User, ArrowRight, Key, MapPin } from 'lucide-react';

export default function RegisterPage({ onNavigate }) {
  const { register } = useAuth();
  const { addToast } = useToast();

  const [colleges, setColleges] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    collegeId: '',
    roomDetails: ''
  });
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    try {
      const res = await apiFetch('/orders/colleges');
      if (res.success && res.colleges?.length > 0) {
        setColleges(res.colleges);
        setFormData(prev => ({ ...prev, collegeId: res.colleges[0].id }));
      }
    } catch (e) {}
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      addToast('Please enter your name and phone number first', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch('/auth/register-otp', {
        method: 'POST',
        body: JSON.stringify({ name: formData.name, phone: formData.phone })
      });
      if (res.success) {
        addToast(res.message || 'OTP verification code sent!', 'success');
        setSessionId(res.sessionId);
        setOtpSent(true);
      } else {
        addToast(res.message, 'error');
      }
    } catch (err) {
      addToast('Error sending OTP verification code', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteRegister = async (e) => {
    e.preventDefault();
    if (!otpCode || !formData.email || !formData.password) {
      addToast('Please fill all credentials & OTP code', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register({
        sessionId,
        otp: otpCode,
        email: formData.email,
        password: formData.password,
        collegeId: formData.collegeId,
        roomDetails: formData.roomDetails
      });

      if (res.success) {
        addToast('Registration successful! Welcome to CopyCraft.', 'success');
        onNavigate('dashboard');
      } else {
        addToast(res.message || 'Registration failed', 'error');
      }
    } catch (err) {
      addToast(err.message || 'Registration verification failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)', padding: '1.5rem' }}>
      <div className="card animate-fade-in" style={{ maxWidth: '480px', width: '100%', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img
            src="/logo.png"
            alt="CopyCraft Logo"
            style={{ width: '70px', height: '70px', objectFit: 'contain', borderRadius: '12px', marginBottom: '0.75rem' }}
          />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Create Your Account</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Register once in a lifetime for premium campus printing
          </p>
        </div>

        {!otpSent ? (
          /* Step 1: Name and Phone Input */
          <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div className="input-group">
              <label className="input-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  required
                  className="input-field"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Ananya Sharma"
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Mobile Number</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="tel"
                  required
                  className="input-field"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="e.g. +91 96333 44455"
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Select College Station</label>
              <select
                className="input-field"
                value={formData.collegeId}
                onChange={e => setFormData({ ...formData, collegeId: e.target.value })}
              >
                {colleges.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.city})</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-lg btn-primary"
              disabled={isSubmitting}
              style={{ width: '100%', marginTop: '0.5rem', gap: '0.5rem' }}
            >
              {isSubmitting ? 'Requesting OTP...' : 'Send Registration OTP'}
              <ArrowRight size={18} />
            </button>
          </form>
        ) : (
          /* Step 2: OTP, ID, Password Creation */
          <form onSubmit={handleCompleteRegister} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{ background: 'var(--primary-light)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', color: 'var(--primary)', textAlign: 'center', fontWeight: 600 }}>
              Simulated verification code has been dispatched to your mobile.
            </div>

            <div className="input-group">
              <label className="input-label">Enter Registration OTP</label>
              <input
                type="text"
                required
                maxLength={4}
                className="input-field"
                placeholder="4-digit OTP"
                value={otpCode}
                onChange={e => setOtpCode(e.target.value)}
                style={{ fontSize: '1.25rem', letterSpacing: '0.2rem', fontWeight: 700, textAlign: 'center' }}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Create Login Email ID</label>
              <input
                type="email"
                required
                className="input-field"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="student@college.edu"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Create Password</label>
              <input
                type="password"
                required
                className="input-field"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>

            <div className="input-group">
              <label className="input-label">Hostel & Room Details</label>
              <input
                type="text"
                required
                className="input-field"
                value={formData.roomDetails}
                onChange={e => setFormData({ ...formData, roomDetails: e.target.value })}
                placeholder="e.g. Hostel 4, Room 302"
              />
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
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
                style={{ flex: 2, gap: '0.5rem' }}
              >
                {isSubmitting ? 'Creating Profile...' : 'Verify & Register'}
                <ArrowRight size={18} />
              </button>
            </div>
          </form>
        )}

        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.85rem' }}>
          Already have an account?{' '}
          <button onClick={() => onNavigate('login')} style={{ color: 'var(--primary)', fontWeight: 700 }}>
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
