import React, { useState, useEffect } from 'react';
import { Printer, FileText, Truck, ShieldCheck, Sparkles, Layers } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function PortalSelectionPage({ onSelectPortal }) {
  const [showLogoSplash, setShowLogoSplash] = useState(true);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLogoSplash(false);
    }, 1800); // 1.8 seconds logo splash
    return () => clearTimeout(timer);
  }, []);

  if (showLogoSplash) {
    return (
      <div style={{
        height: '100vh',
        background: 'var(--bg-app)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.5s ease-in-out'
      }}>
        {/* Animated Brand Logo Spotlight */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem',
          animation: 'fadeIn 0.8s ease-out'
        }}>
          <img
            src="/logo.png"
            alt="CopyCraft Logo"
            style={{
              width: '100px',
              height: '100px',
              objectFit: 'contain',
              borderRadius: '24px',
              boxShadow: '0 12px 30px var(--primary-glow)',
              animation: 'fadeIn 0.8s ease-out'
            }}
          />
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '2.5rem',
            fontWeight: 800,
            letterSpacing: '-0.04em',
            marginTop: '0.5rem',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            CopyCraft
          </h1>
          <p style={{
            fontSize: '0.95rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            letterSpacing: '0.15em'
          }}>
            PRINT SMART. DELIVER FASTER.
          </p>
        </div>
      </div>
    );
  }

  const portals = [
    {
      id: 'customer',
      title: 'Customer Portal',
      description: 'Upload files, customize your print preferences, make secure online payments, and get deliveries right to your classroom or hostel room.',
      icon: FileText,
      color: 'var(--primary)',
      badge: 'Students & Faculty'
    },
    {
      id: 'dealer',
      title: 'Dealer Hub',
      description: 'Access assigned campus print jobs, download customer documents, update print statuses, and verify order handovers using OTPs.',
      icon: Printer,
      color: 'var(--success)',
      badge: 'Local Print Stations'
    },
    {
      id: 'distributor',
      title: 'Distributor Portal',
      description: 'Oversee campus print hubs, assign orders to dealers, monitor real-time print performance, and download delivery analytics.',
      icon: Truck,
      color: 'var(--accent)',
      badge: 'Hub Operators'
    },
    {
      id: 'admin',
      title: 'Executive Admin',
      description: 'Manage pricing rules, college configurations, dealer/distributor accounts, coupon codes, and monitor audit logs.',
      icon: ShieldCheck,
      color: 'var(--warning)',
      badge: 'Platform Managers'
    }
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-app)',
      padding: '3rem 1.5rem',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center'
    }}>
      {/* Dark/Light mode floating toggle */}
      <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
        <button
          className="btn btn-sm btn-secondary"
          onClick={toggleTheme}
          style={{ borderRadius: 'var(--radius-full)', padding: '0.5rem' }}
        >
          {theme === 'dark' ? <Sun size={18} color="#F59E0B" /> : <Moon size={18} color="#2563EB" />}
        </button>
      </div>

      <div style={{ maxWidth: '1020px', width: '100%', textAlign: 'center', marginBottom: '3rem' }}>
        <img
          src="/logo.png"
          alt="CopyCraft Logo"
          style={{
            width: '80px',
            height: '80px',
            objectFit: 'contain',
            borderRadius: '16px',
            marginBottom: '1rem'
          }}
        />
        <h2 style={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
          Select Gateway Portal
        </h2>
        <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto' }}>
          Choose your gateway portal to access the CopyCraft print networks and dashboard directories.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '1.5rem',
        width: '100%',
        maxWidth: '1020px'
      }}>
        {portals.map(portal => {
          const Icon = portal.icon;
          return (
            <div
              key={portal.id}
              onClick={() => onSelectPortal(portal.id)}
              className="card card-hover glass-panel animate-fade-in"
              style={{
                cursor: 'pointer',
                padding: '2rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                borderTop: `4px solid ${portal.color}`,
                minHeight: '290px'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '12px',
                    background: 'var(--bg-app)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--border-color)',
                    color: portal.color
                  }}>
                    <Icon size={22} />
                  </div>
                  <span className="badge badge-primary" style={{ fontSize: '0.65rem', background: 'var(--primary-light)', color: portal.color }}>
                    {portal.badge}
                  </span>
                </div>

                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                  {portal.title}
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
                  {portal.description}
                </p>
              </div>

              <div style={{
                marginTop: '1.5rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: portal.color,
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}>
                <span>Open Portal</span>
                <span style={{ fontSize: '1rem' }}>→</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
