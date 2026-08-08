import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../utils/api';
import {
  User, Phone, Mail, MapPin, Building2,
  Edit3, CheckCircle, X, ShieldCheck, Calendar
} from 'lucide-react';

const ROLE_COLOR = {
  customer: '#8B5CF6',
  dealer: '#F59E0B',
  distributor: '#10B981',
  admin: '#3B82F6',
  super_admin: '#EF4444'
};

const ROLE_LABEL = {
  customer: 'Customer',
  dealer: 'Dealer',
  distributor: 'Distributor',
  admin: 'Admin',
  super_admin: 'Super Admin'
};

export default function ProfilePage() {
  const { user, token, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const { addToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    roomDetails: ''
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        roomDetails: user.roomDetails || ''
      });
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          roomDetails: form.roomDetails
        })
      });
      if (res.success) {
        addToast(t('saveSuccess'), 'success');
        setEditing(false);
        await refreshProfile();
      } else {
        addToast(res.message || 'Update failed', 'error');
      }
    } catch (err) {
      addToast('Failed to save profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const roleColor = ROLE_COLOR[user?.role] || '#8B5CF6';
  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const joinDate = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A';

  return (
    <div style={{ maxWidth: '720px' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{t('profile')}</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
          Manage your account details and preferences
        </p>
      </div>

      {/* Profile Card */}
      <div className="card" style={{ overflow: 'hidden', borderRadius: '20px' }}>
        {/* Banner */}
        <div style={{
          background: `linear-gradient(135deg, ${roleColor}22 0%, ${roleColor}44 100%)`,
          borderBottom: `2px solid ${roleColor}33`,
          padding: '2rem',
          display: 'flex', alignItems: 'flex-end', gap: '1.5rem', flexWrap: 'wrap'
        }}>
          {/* Avatar */}
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%',
            background: `linear-gradient(135deg, ${roleColor} 0%, ${roleColor}99 100%)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: '1.8rem',
            border: '4px solid var(--bg-card)',
            boxShadow: `0 4px 20px ${roleColor}44`, flexShrink: 0
          }}>
            {initials}
          </div>

          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>{user?.name || 'User'}</h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                background: `${roleColor}22`, color: roleColor,
                padding: '0.2rem 0.75rem', borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em'
              }}>
                <ShieldCheck size={12} /> {ROLE_LABEL[user?.role] || user?.role}
              </span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Calendar size={12} /> Joined {joinDate}
              </span>
            </div>
          </div>

          <div>
            {!editing ? (
              <button
                className="btn btn-primary"
                onClick={() => setEditing(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <Edit3 size={16} /> {t('editProfile')}
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setEditing(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <X size={16} /> Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    background: '#10B981', borderColor: '#10B981'
                  }}
                >
                  <CheckCircle size={16} /> {saving ? 'Saving…' : t('saveProfile')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Fields */}
        <div style={{ padding: '1.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>

          {/* Full Name */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <User size={13} /> {t('name')}
            </label>
            {editing ? (
              <input
                className="input-field"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Full Name"
              />
            ) : (
              <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)', padding: '0.4rem 0' }}>
                {user?.name || '—'}
              </div>
            )}
          </div>

          {/* Phone */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Phone size={13} /> {t('phone')}
            </label>
            {editing ? (
              <input
                className="input-field"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="Phone Number"
              />
            ) : (
              <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)', padding: '0.4rem 0' }}>
                {user?.phone || '—'}
              </div>
            )}
          </div>

          {/* Email – always read-only */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Mail size={13} /> {t('email')}
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0' }}>
              <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)' }}>{user?.email || '—'}</span>
              <span style={{ fontSize: '0.68rem', background: '#D1FAE5', color: '#059669', padding: '0.1rem 0.5rem', borderRadius: '9999px', fontWeight: 700 }}>
                VERIFIED
              </span>
            </div>
          </div>

          {/* Room / Hostel – only for customers */}
          {user?.role === 'customer' && (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <MapPin size={13} /> {t('room')}
              </label>
              {editing ? (
                <input
                  className="input-field"
                  value={form.roomDetails}
                  onChange={e => setForm(f => ({ ...f, roomDetails: e.target.value }))}
                  placeholder="e.g. Hostel 4, Room 302"
                />
              ) : (
                <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)', padding: '0.4rem 0' }}>
                  {user?.roomDetails || '—'}
                </div>
              )}
            </div>
          )}

          {/* Campus */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <Building2 size={13} /> Campus / College
            </label>
            <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-main)', padding: '0.4rem 0' }}>
              {user?.collegeId === 'clg_1' ? 'IIT Bombay' : user?.collegeId === 'clg_2' ? 'BITS Pilani' : user?.collegeId === 'clg_3' ? 'Delhi University' : user?.collegeId || 'N/A'}
            </div>
          </div>

        </div>

        {/* Security info footer */}
        <div style={{
          margin: '0 1.75rem 1.75rem',
          padding: '1rem',
          background: 'var(--bg-app)',
          borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          fontSize: '0.82rem', color: 'var(--text-muted)'
        }}>
          <ShieldCheck size={18} color="var(--success)" />
          <span>Your account is secured. Password and credentials are encrypted and never shared.</span>
        </div>
      </div>
    </div>
  );
}
