import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiFetch } from '../utils/api';
import { Mail, Lock, Phone, User, ArrowRight, MapPin, ShieldCheck } from 'lucide-react';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deliveryPin, setDeliveryPin] = useState(null);

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

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.email || !formData.password) {
      addToast('Please fill in all required fields', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register({
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        password: formData.password,
        collegeId: formData.collegeId,
        roomDetails: formData.roomDetails
      });

      if (res.success) {
        setDeliveryPin(res.deliveryPin);
        addToast('Registration successful! Welcome to CopyCraft.', 'success');
      } else {
        addToast(res.message || 'Registration failed', 'error');
      }
    } catch (err) {
      addToast(err.message || 'Registration failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If registration succeeded, show the delivery PIN
  if (deliveryPin) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)', padding: '1.5rem' }}>
        <div className="card animate-fade-in" style={{ maxWidth: '480px', width: '100%', padding: '2.5rem', textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--primary-light)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem auto'
          }}>
            <ShieldCheck size={32} color="var(--primary)" />
          </div>

          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Welcome to CopyCraft!</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Your account has been created. Here is your permanent delivery verification PIN:
          </p>

          <div style={{
            background: 'var(--bg-app)',
            border: '2px dashed var(--primary)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              YOUR DELIVERY PIN
            </div>
            <div style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              letterSpacing: '0.3em',
              color: 'var(--primary)'
            }}>
              {deliveryPin}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Share this PIN with the delivery person to confirm receipt of your orders.
            </div>
          </div>

          <button
            className="btn btn-lg btn-primary"
            onClick={() => onNavigate('dashboard')}
            style={{ width: '100%', gap: '0.5rem' }}
          >
            Go to Dashboard
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)', padding: '1.5rem' }}>
      <div className="card animate-fade-in" style={{ maxWidth: '480px', width: '100%', padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img
            src="/logo.png?v=2"
            alt="CopyCraft Logo"
            style={{ width: '70px', height: '70px', objectFit: 'contain', borderRadius: '12px', marginBottom: '0.75rem' }}
          />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Create Your Account</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Register once in a lifetime for premium campus printing
          </p>
        </div>

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
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
            <label className="input-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                className="input-field"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="student@college.edu"
              />
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Create Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                className="input-field"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
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

          <div className="input-group">
            <label className="input-label">Hostel & Room Details</label>
            <input
              type="text"
              className="input-field"
              value={formData.roomDetails}
              onChange={e => setFormData({ ...formData, roomDetails: e.target.value })}
              placeholder="e.g. Hostel 4, Room 302"
            />
          </div>

          <button
            type="submit"
            className="btn btn-lg btn-primary"
            disabled={isSubmitting}
            style={{ width: '100%', marginTop: '0.5rem', gap: '0.5rem' }}
          >
            {isSubmitting ? 'Creating Account...' : 'Register'}
            <ArrowRight size={18} />
          </button>
        </form>

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
