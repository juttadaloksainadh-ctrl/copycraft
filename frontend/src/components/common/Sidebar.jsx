import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../utils/api';
import { useLanguage } from '../../context/LanguageContext';
import { usePwa } from '../../context/PwaContext';
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
  User,
  UserCheck,
  Download,
  Menu,
  X
} from 'lucide-react';


export default function Sidebar({ activeTab, setActiveTab, isOpen = false, onClose = () => {} }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { installApp, isInstalled } = usePwa();
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
    stationery_dealer: [
      { id: 'stationery_orders', label: 'Received Orders', icon: Package },
      { id: 'upload_new', label: 'Upload New Item', icon: UploadCloud },
      { id: 'catalog', label: 'Catalog & Stock', icon: Tag },
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
      { id: 'orders', label: 'Total Orders', icon: FileText },
      { id: 'users', label: 'Staff Directory', icon: Users },
      { id: 'customers', label: 'Customer Area', icon: UserCheck },
      { id: 'colleges', label: 'College Network', icon: Building2 },
      { id: 'pricing', label: 'Pricing Matrix', icon: DollarSign },
      { id: 'inventory_admin', label: 'Global Stock', icon: Package },
      { id: 'coupons', label: 'Coupons & Promos', icon: Tag },
      { id: 'audit', label: 'Audit Logs', icon: ShieldCheck },
      { id: 'profile', label: t('profile'), icon: User }
    ],
    super_admin: [
      { id: 'admin_dashboard', label: 'Master Dashboard', icon: LayoutDashboard },
      { id: 'orders', label: 'Total Orders', icon: FileText },
      { id: 'users', label: 'Staff Directory', icon: Users },
      { id: 'customers', label: 'Customer Area', icon: UserCheck },
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

  const handleNavClick = (tabId) => {
    setActiveTab(tabId);
    onClose();
  };

  const renderNavContent = (isMobile = false) => (
    <>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 0.5rem 1rem 0.5rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            NAVIGATION MENU
          </div>
          {isMobile && (
            <button
              onClick={onClose}
              style={{
                padding: '0.35rem',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-muted)',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              title="Close Menu"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {currentNav.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isProfile = item.id === 'profile';
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  width: '100%',
                  padding: '0.65rem 0.8rem',
                  fontSize: '0.9rem',
                  fontWeight: isActive ? 700 : 500,
                  borderRadius: 'var(--radius-md)',
                  color: isActive
                    ? (isProfile ? '#8B5CF6' : 'var(--primary)')
                    : 'var(--text-main)',
                  background: isActive
                    ? (isProfile ? '#8B5CF622' : 'var(--primary-light)')
                    : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all var(--transition-fast)',
                  marginTop: isProfile ? '0.4rem' : 0,
                  borderTop: isProfile ? '1px solid var(--border-color)' : 'none',
                  paddingTop: isProfile ? '0.8rem' : '0.65rem'
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

      {/* Campus Station & PWA Download Card */}
      <div className="card" style={{ padding: '0.85rem', background: 'var(--bg-app)', marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>CURRENT HUB</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, marginTop: '0.1rem', color: 'var(--text-main)' }}>
            {hubCollegeName || (user?.name ? `${user.name}'s Campus` : 'Campus Hub')}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }} />
            System Online
          </div>
        </div>

        <button
          onClick={installApp}
          className="btn btn-sm btn-primary"
          style={{
            width: '100%',
            gap: '0.4rem',
            fontSize: '0.78rem',
            padding: '0.45rem',
            borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--primary) 0%, #6366f1 100%)'
          }}
        >
          <Download size={14} />
          {isInstalled ? 'CopyCraft App Ready' : 'Download Mobile & PC App'}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="sidebar-desktop">
        {renderNavContent(false)}
      </aside>

      {/* Mobile Drawer Backdrop Overlay */}
      <div
        className={`mobile-overlay ${isOpen ? 'active' : ''}`}
        onClick={onClose}
      />

      {/* Mobile Off-Canvas Drawer */}
      <div className={`sidebar-mobile-drawer ${isOpen ? 'open' : ''}`}>
        {renderNavContent(true)}
      </div>

      {/* Mobile Native Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        {currentNav.slice(0, 4).map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`mobile-bottom-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} color={isActive ? 'var(--primary)' : 'var(--text-muted)'} />
              <span>{item.label}</span>
            </button>
          );
        })}
        <button
          onClick={isOpen ? onClose : () => {
            // Trigger drawer toggle by opening drawer
            const btn = document.querySelector('.mobile-menu-btn');
            if (btn) btn.click();
            else onClose();
          }}
          className="mobile-bottom-nav-item"
        >
          <Menu size={20} color="var(--text-muted)" />
          <span>Menu</span>
        </button>
      </nav>
    </>
  );
}


