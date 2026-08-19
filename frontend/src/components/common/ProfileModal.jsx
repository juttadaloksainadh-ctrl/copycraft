import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { apiFetch } from '../../utils/api';
import {
  X, User, Phone, Mail, MapPin, Building2, Save,
  Edit3, CheckCircle
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

export default function ProfileModal({ onClose }) {
  const { user, token, refreshProfile } = useAuth();
  const { t } = useLanguage();
  const { addToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    roomDetails: user?.roomDetails || '',
    email: user?.email || ''
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        roomDetails: user.roomDetails || '',
        email: user.email || ''
      });
    }
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch('/auth/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
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

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="card animate-fade-in"
        style={{
          width: '100%', maxWidth: '520px',
          borderRadius: '20px',
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.4)'
        }}
      >
        {/* Header Banner */}
        <div style={{
          background: `linear-gradient(135deg, ${roleColor}22 0%, ${roleColor}44 100%)`,
          borderBottom: `1px solid ${roleColor}33`,
          padding: '1.5rem 1.5rem 0.75rem',
          position: 'relative'
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: '1rem', right: '1rem',
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '0.3rem', borderRadius: '50%'
            }}
          >
            <X size={20} />
          </button>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1rem' }}>
            {/* Avatar */}
            <div style={{ position: 'relative' }}>
              <div style={{
                width: '72px', height: '72px', borderRadius: '50%',
                background: `linear-gradient(135deg, ${roleColor} 0%, ${roleColor}99 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 800, fontSize: '1.6rem',
                border: '3px solid var(--bg-card)',
                boxShadow: `0 4px 20px ${roleColor}44`
              }}>
                {initials}
              </div>
            </div>

            <div style={{ flex: 1, paddingBottom: '0.5rem' }}>
              <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-main)' }}>
                {user?.name || 'User'}
              </div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                marginTop: '0.25rem',
                background: `${roleColor}22`, color: roleColor,
                padding: '0.15rem 0.65rem', borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em'
              }}>
                {ROLE_LABEL[user?.role] || user?.role}
              </div>
            </div>

            <button
              className="btn btn-sm"
              onClick={() => editing ? handleSave() : setEditing(true)}
              disabled={saving}
              style={{
                background: editing ? '#10B981' : roleColor,
                color: '#fff', border: 'none',
                padding: '0.5rem 1rem', borderRadius: 'var(--radius-full)',
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                fontWeight: 600, fontSize: '0.85rem',
                marginBottom: '0.5rem'
              }}
            >
              {editing ? <><Save size={15} />{saving ? 'Saving…' : t('saveProfile')}</> : <><Edit3 size={15} />{t('editProfile')}</>}
            </button>
          </div>
        </div>

        {/* Profile Fields */}
        <div style={{ padding: '1.25rem 1.5rem 1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Name */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
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
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem', padding: '0.5rem 0' }}>
                  {user?.name || '—'}
                </div>
              )}
            </div>

            {/* Phone */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
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
                <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem', padding: '0.5rem 0' }}>
                  {user?.phone || '—'}
                </div>
              )}
            </div>

            {/* Email (read-only) */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                <Mail size={13} /> {t('email')}
              </label>
              <div style={{
                fontWeight: 500, color: 'var(--text-muted)', fontSize: '0.95rem', padding: '0.5rem 0',
                display: 'flex', alignItems: 'center', gap: '0.4rem'
              }}>
                {user?.email || '—'}
                <span style={{ fontSize: '0.7rem', background: 'var(--success-light, #D1FAE5)', color: '#059669', padding: '0.1rem 0.4rem', borderRadius: '9999px', fontWeight: 700 }}>
                  VERIFIED
                </span>
              </div>
            </div>

            {/* Room / Hostel Details (customer only) */}
            {user?.role === 'customer' && (
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
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
                  <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem', padding: '0.5rem 0' }}>
                    {user?.roomDetails || '—'}
                  </div>
                )}
              </div>
            )}

            {/* College (read-only display) */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                <Building2 size={13} /> Campus / College
              </label>
              <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.95rem', padding: '0.5rem 0' }}>
                {user?.collegeName || user?.collegeId || 'N/A'}
              </div>
            </div>

          </div>

          {editing && (
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => setEditing(false)}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving}
                style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <CheckCircle size={16} />
                {saving ? 'Saving…' : t('saveProfile')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
