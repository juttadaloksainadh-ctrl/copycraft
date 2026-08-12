import React, { createContext, useContext, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {/* Global Toast Container */}
      <div style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        maxWidth: '380px',
        width: '100%'
      }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="animate-fade-in"
            style={{
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              gap: '0.75rem',
              padding: '0.85rem 1rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              borderLeft: `4px solid ${
                toast.type === 'success' ? 'var(--success)' :
                toast.type === 'error' ? 'var(--danger)' :
                toast.type === 'warning' ? 'var(--warning)' : 'var(--primary)'
              }`,
              boxShadow: 'var(--shadow-lg)',
              color: 'var(--text-main)',
              fontSize: '0.9rem',
              fontWeight: 500
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {toast.type === 'success' && <CheckCircle2 size={18} color="var(--success)" />}
              {toast.type === 'error' && <XCircle size={18} color="var(--danger)" />}
              {toast.type === 'warning' && <AlertTriangle size={18} color="var(--warning)" />}
              {toast.type === 'info' && <Info size={18} color="var(--primary)" />}
              <span>{toast.message}</span>
            </div>
            <button onClick={() => removeToast(toast.id)} style={{ color: 'var(--text-muted)' }}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
