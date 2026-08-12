import React from 'react';
import { ShieldCheck, Heart, Zap } from 'lucide-react';

export default function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--border-color)',
      padding: '1.5rem 0',
      marginTop: '3rem',
      background: 'var(--bg-surface)',
      fontSize: '0.85rem',
      color: 'var(--text-muted)'
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShieldCheck size={16} color="var(--success)" />
          <span>CopyCraft SaaS Engine v2.4 • ISO 27001 Secure Document Vault</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Privacy Policy</a>
          <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Terms of Service</a>
          <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>API Status</a>
          <a href="#" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Contact Support</a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span>Powered by</span>
          <Zap size={14} color="var(--primary)" />
          <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>CopyCraft Cloud</span>
        </div>
      </div>
    </footer>
  );
}
