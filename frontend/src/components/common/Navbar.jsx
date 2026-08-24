import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { apiFetch } from '../../utils/api';
import ProfileModal from './ProfileModal';
import {
  Printer,
  Sun,
  Moon,
  LogOut,
  ShieldAlert,
  Search,
  Bell,
  ChevronDown,
  Menu,
  Sparkles,
  Layers,
  Truck,
  Building2,
  FileText,
  Globe,
  CheckCheck,
  Package,
  AlertTriangle,
  Info,
  Zap,
  User
} from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'or', label: 'Odia', native: 'ଓଡ଼ିଆ' }
];

const NOTIF_ICONS = {
  order: Package,
  delivery: Truck,
  security: AlertTriangle,
  system: Zap,
  info: Info
};

const NOTIF_COLORS = {
  order: '#8B5CF6',
  delivery: '#10B981',
  security: '#EF4444',
  system: '#3B82F6',
  info: '#F59E0B'
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Navbar({ onMobileMenuToggle }) {
  const { user, token, logout, switchDemoRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { addToast } = useToast();
  const { lang, selectLanguage, t } = useLanguage();

  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const notifRef = useRef(null);
  const langRef = useRef(null);
  const roleRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifications(false);
      if (langRef.current && !langRef.current.contains(e.target)) setShowLangMenu(false);
      if (roleRef.current && !roleRef.current.contains(e.target)) setShowRoleMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch notifications when user is logged in
  useEffect(() => {
    if (user && token) fetchNotifications();
  }, [user, token]);

  const fetchNotifications = async () => {
    if (!token) return;
    setLoadingNotifs(true);
    try {
      const res = await apiFetch('/auth/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.success) {
        setNotifications(res.notifications || []);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      // Silently fail
    } finally {
      setLoadingNotifs(false);
    }
  };

  const handleMarkAllRead = async () => {
    if (!token) return;
    try {
      await apiFetch('/auth/notifications/read', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({})
      });
      setNotifications(ns => ns.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      // ignore
    }
  };

  const handleRoleSwitch = async (role) => {
    setShowRoleMenu(false);
    await switchDemoRole(role);
    addToast(`Switched view to ${role.toUpperCase()} role`, 'info');
  };

  const handleBellClick = () => {
    if (!showNotifications) fetchNotifications();
    setShowNotifications(v => !v);
    setShowLangMenu(false);
    setShowRoleMenu(false);
  };

  const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];



      return (
    <>
      <nav className="glass-panel navbar-container" style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        borderRadius: 0,
        borderBottom: '1px solid var(--border-color)',
        padding: '0.65rem 1rem',
        background: 'var(--bg-glass)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '0.5rem' }}>

          {/* Left: Mobile Menu Toggle + Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              className="btn btn-sm btn-secondary show-on-mobile"
              onClick={onMobileMenuToggle}
              style={{
                padding: '0.45rem',
                borderRadius: 'var(--radius-sm)',
                minWidth: '38px',
                minHeight: '38px',
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              id="mobile-menu-btn"
              title="Toggle Menu"
            >
              <Menu size={20} />
            </button>

            <a href="#" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
              <img
                src="/logo.png"
                alt="CopyCraft Logo"
                style={{ width: '34px', height: '34px', objectFit: 'contain', borderRadius: '8px' }}
              />
              <div>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.15rem', color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
                  CopyCraft
                </span>
                <span className="hide-on-mobile" style={{ fontSize: '0.65rem', fontWeight: 700, background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-full)', marginLeft: '0.35rem' }}>
                  ENTERPRISE
                </span>
              </div>
            </a>
          </div>

          {/* Center: Search (Desktop Only) */}
          <div className="hide-on-mobile" style={{ flex: 1, maxWidth: '380px', margin: '0 1rem' }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} color="var(--text-muted)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search orders, files, colleges..."
                className="input-field"
                style={{ paddingLeft: '34px', paddingTop: '0.4rem', paddingBottom: '0.4rem', fontSize: '0.85rem', borderRadius: 'var(--radius-full)', background: 'var(--bg-app)' }}
              />
            </div>
          </div>

          {/* Right: Action Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>

            {/* Demo Role Switcher */}
            <div style={{ position: 'relative' }} ref={roleRef}>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => { setShowRoleMenu(v => !v); setShowNotifications(false); setShowLangMenu(false); }}
                style={{ gap: '0.3rem', padding: '0.4rem 0.65rem', background: 'var(--primary-light)', color: 'var(--primary)', borderColor: 'var(--border-focus)', fontSize: '0.78rem' }}
                title="Switch Role"
              >
                <ShieldAlert size={14} />
                <span className="hide-on-mobile" style={{ textTransform: 'capitalize' }}>
                  {user ? user.role.replace('_', ' ') : 'Guest'}
                </span>
                <ChevronDown size={13} />
              </button>

              {showRoleMenu && (
                <div className="card animate-fade-in" style={{
                  position: 'absolute', right: 0, top: '110%', width: '200px', maxWidth: 'calc(100vw - 1rem)',
                  padding: '0.5rem', zIndex: 200, boxShadow: 'var(--shadow-lg)'
                }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', padding: '0.35rem 0.5rem' }}>
                    SWITCH USER ROLE
                  </div>
                  {[
                    { role: 'customer', label: 'Customer View', icon: FileText },
                    { role: 'dealer', label: 'Dealer Hub', icon: Printer },
                    { role: 'distributor', label: 'Distributor Hub', icon: Truck },
                    { role: 'admin', label: 'Admin Executive', icon: Building2 },
                    { role: 'super_admin', label: 'Super Admin', icon: Layers }
                  ].map(item => (
                    <button key={item.role} onClick={() => handleRoleSwitch(item.role)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%',
                        padding: '0.45rem 0.6rem', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)',
                        textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer',
                        color: user?.role === item.role ? 'var(--primary)' : 'var(--text-main)',
                        fontWeight: user?.role === item.role ? 600 : 400
                      }}>
                      <item.icon size={15} />
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Language Switcher */}
            <div style={{ position: 'relative' }} ref={langRef}>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() => { setShowLangMenu(v => !v); setShowNotifications(false); setShowRoleMenu(false); }}
                title="Change Language"
                style={{ gap: '0.3rem', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-full)' }}
              >
                <Globe size={15} />
                <span className="hide-on-mobile" style={{ fontSize: '0.75rem', fontWeight: 600 }}>{currentLang.native}</span>
              </button>

              {showLangMenu && (
                <div className="card animate-fade-in" style={{
                  position: 'absolute', right: 0, top: '110%', width: '180px', maxWidth: 'calc(100vw - 1rem)',
                  padding: '0.5rem', zIndex: 200, boxShadow: 'var(--shadow-lg)'
                }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', padding: '0.3rem 0.5rem 0.4rem' }}>
                    {t('language').toUpperCase()}
                  </div>
                  {LANGUAGES.map(l => (
                    <button key={l.code}
                      onClick={() => { selectLanguage(l.code); setShowLangMenu(false); }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        width: '100%', padding: '0.4rem 0.6rem', fontSize: '0.82rem',
                        borderRadius: 'var(--radius-sm)', background: 'transparent', border: 'none',
                        cursor: 'pointer', textAlign: 'left',
                        color: lang === l.code ? 'var(--primary)' : 'var(--text-main)',
                        fontWeight: lang === l.code ? 700 : 400
                      }}>
                      <span>{l.native}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{l.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              className="btn btn-sm btn-secondary"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              style={{ borderRadius: 'var(--radius-full)', padding: '0.45rem', minWidth: '34px', minHeight: '34px' }}
            >
              {theme === 'dark' ? <Sun size={16} color="#F59E0B" /> : <Moon size={16} color="#2563EB" />}
            </button>

            {/* Notifications Bell */}
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button
                className="btn btn-sm btn-secondary"
                onClick={handleBellClick}
                title={t('notifications')}
                style={{ position: 'relative', borderRadius: 'var(--radius-full)', padding: '0.45rem', minWidth: '34px', minHeight: '34px' }}
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: '2px', right: '2px',
                    minWidth: '15px', height: '15px', padding: '0 3px',
                    borderRadius: '999px', fontSize: '0.58rem', fontWeight: 800,
                    background: 'var(--danger, #EF4444)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    lineHeight: 1
                  }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="card animate-fade-in" style={{
                  position: 'absolute', right: 0, top: '110%',
                  width: '320px', maxWidth: 'calc(100vw - 1rem)', zIndex: 200, boxShadow: 'var(--shadow-lg)',
                  maxHeight: '400px', display: 'flex', flexDirection: 'column',
                  overflow: 'hidden', borderRadius: '16px'
                }}>
                  {/* Notif Header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.75rem 1rem', borderBottom: '1px solid var(--border-color)'
                  }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{t('notifications')}</span>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.3rem',
                          background: 'transparent', border: 'none', cursor: 'pointer',
                          color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600
                        }}>
                        <CheckCheck size={14} /> Mark read
                      </button>
                    )}
                  </div>

                  {/* Notif List */}
                  <div style={{ overflowY: 'auto', flex: 1 }}>
                    {loadingNotifs ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        Loading…
                      </div>
                    ) : notifications.length === 0 ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        <Sparkles size={22} style={{ marginBottom: '0.4rem', opacity: 0.4 }} />
                        <div>{t('noNotifications')}</div>
                      </div>
                    ) : notifications.map(n => {
                      const NIcon = NOTIF_ICONS[n.type] || Info;
                      const nColor = NOTIF_COLORS[n.type] || '#8B5CF6';
                      return (
                        <div key={n.id} style={{
                          display: 'flex', gap: '0.65rem',
                          padding: '0.65rem 0.85rem',
                          borderBottom: '1px solid var(--border-color)',
                          background: n.read ? 'transparent' : `${nColor}08`,
                          transition: 'background 0.2s'
                        }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                            background: `${nColor}18`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            <NIcon size={15} color={nColor} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              gap: '0.5rem', marginBottom: '0.15rem'
                            }}>
                              <span style={{ fontWeight: n.read ? 500 : 700, fontSize: '0.8rem', color: 'var(--text-main)' }}>
                                {n.title}
                              </span>
                              {!n.read && (
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: nColor, flexShrink: 0 }} />
                              )}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                              {n.message}
                            </div>
                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem', opacity: 0.7 }}>
                              {timeAgo(n.createdAt)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar + Logout */}
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: '0.15rem' }}>
                <button
                  onClick={() => { setShowProfile(true); setShowNotifications(false); }}
                  title={t('profile')}
                  style={{
                    width: '34px', height: '34px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
                    color: '#FFF', border: '2px solid var(--border-color)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                  }}
                >
                  {(user.name || 'U').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                </button>
                <button className="btn btn-sm btn-secondary" onClick={logout} title={t('logout')} style={{ padding: '0.45rem' }}>
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <a href="#login" className="btn btn-sm btn-primary">{t('signIn')}</a>
            )}
          </div>
        </div>
      </nav>

      {/* Profile Modal */}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </>
  );
}
