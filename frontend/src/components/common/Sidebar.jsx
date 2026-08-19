import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import { useLanguage } from '../../context/LanguageContext';
import {
  LayoutDashboard,
  UploadCloud,
  FileText,
  Printer,
  Truck,
  Users,
  Building2,
  DollarSign,
  Tag,
  Package,
  Settings,
  HelpCircle,
  BarChart3,
  ShieldCheck,
  Gift,
  User
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const role = user ? user.role : 'customer';
  const [hubCollegeName, setHubCollegeName] = useState('');

  useEffect(() => {
    if (user?.collegeId) {
      apiFetch('/orders/colleges').then(res => {
        if (res.success) {
          const found = res.colleges?.find(c => c.id === user.collegeId);
          if (found) setHubCollegeName(found.name);
        }
      }).catch(() => {});
    }
  }, [user?.collegeId]);

  // Navigation schema per role
  const navItemsByRole = {
    customer: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'upload', label: 'Print Document', icon: UploadCloud },
      { id: 'orders', label: 'Order History', icon: FileText },
      { id: 'referrals', label: 'Refer & Earn', icon: Gift },
      { id: 'support', label: 'Help & Tickets', icon: HelpCircle },
      { id: 'profile', label: t('profile'), icon: User }
    ],
    dealer: [
      { id: 'queue', label: 'Print Queue', icon: Printer },
      { id: 'inventory', label: 'Stock & Paper', icon: Package },
      { id: 'performance', label: 'Daily Stats', icon: BarChart3 },
      { id: 'support', label: 'Support', icon: HelpCircle },
      { id: 'profile', label: t('profile'), icon: User }
    ],
    distributor: [
      { id: 'distributor_dashboard', label: 'Campus Hub', icon: Truck },
      { id: 'dealers', label: 'Manage Dealers', icon: Users },
      { id: 'colleges', label: 'Colleges Overview', icon: Building2 },
      { id: 'reports', label: 'Delivery Reports', icon: FileText },
      { id: 'profile', label: t('profile'), icon: User }
    ],
    admin: [
      { id: 'admin_dashboard', label: 'Executive Overview', icon: LayoutDashboard },
      { id: 'users', label: 'User Directory', icon: Users },
      { id: 'colleges', label: 'College Network', icon: Building2 },
      { id: 'pricing', label: 'Pricing Matrix', icon: DollarSign },
      { id: 'inventory_admin', label: 'Global Stock', icon: Package },
      { id: 'coupons', label: 'Coupons & Promos', icon: Tag },
      { id: 'audit', label: 'Audit Logs', icon: ShieldCheck },
      { id: 'profile', label: t('profile'), icon: User }
    ],
    super_admin: [
      { id: 'admin_dashboard', label: 'Master Dashboard', icon: LayoutDashboard },
      { id: 'users', label: 'All Users', icon: Users },
      { id: 'colleges', label: 'Colleges', icon: Building2 },
      { id: 'pricing', label: 'Pricing Engine', icon: DollarSign },
      { id: 'inventory_admin', label: 'Global Stock', icon: Package },
      { id: 'coupons', label: 'Coupons', icon: Tag },
      { id: 'audit', label: 'Audit Trail', icon: ShieldCheck },
      { id: 'settings', label: 'System Settings', icon: Settings },
      { id: 'profile', label: t('profile'), icon: User }
    ]
  };

  const currentNav = navItemsByRole[role] || navItemsByRole['customer'];

  return (
    <aside style={{
      width: '240px',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-color)',
      padding: '1.5rem 0.75rem',
      display: 'flex',
      flexDirection: 'column',
      justify: 'space-between'
    }}>
      <div>
        <div style={{ padding: '0 0.75rem 1rem 0.75rem', fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
          NAVIGATION MENU
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {currentNav.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isProfile = item.id === 'profile';
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  width: '100%',
                  padding: '0.7rem 0.85rem',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 700 : 500,
                  borderRadius: 'var(--radius-md)',
                  color: isActive
                    ? (isProfile ? '#8B5CF6' : 'var(--primary)')
                    : 'var(--text-main)',
                  background: isActive
                    ? (isProfile ? '#8B5CF622' : 'var(--primary-light)')
                    : 'transparent',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  transition: 'all var(--transition-fast)',
                  // Divider before profile item
                  marginTop: isProfile ? '0.5rem' : 0,
                  borderTop: isProfile ? '1px solid var(--border-color)' : 'none',
                  paddingTop: isProfile ? '0.9rem' : '0.7rem'
                }}
              >
                <Icon
                  size={18}
                  color={isActive
                    ? (isProfile ? '#8B5CF6' : 'var(--primary)')
                    : 'var(--text-muted)'}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* College Info Card */}
      <div className="card" style={{ padding: '0.85rem', background: 'var(--bg-app)', marginTop: '2rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>CURRENT HUB</div>
        <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: '0.2rem', color: 'var(--text-main)' }}>
          {hubCollegeName || (user?.name ? `${user.name}'s Campus` : 'Campus Hub')}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.3rem' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }} />
          System Online
        </div>
      </div>
    </aside>
  );
}
