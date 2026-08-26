import React, { createContext, useContext, useState, useEffect } from 'react';
import { Download, Smartphone, Monitor, CheckCircle2, X, Share, PlusSquare, ArrowUpRight } from 'lucide-react';
import Modal from '../components/common/Modal';

const PwaContext = createContext();

export function PwaProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    // Check if running as standalone PWA
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone ||
      document.referrer.includes('android-app://');

    if (isStandaloneMode) {
      setIsInstalled(true);
    }

    // Check iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Listen for PWA beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Register Service Worker
    if ('serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.log('ServiceWorker registration error:', err);
      });
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowInstallModal(true);
    }
  };

  return (
    <PwaContext.Provider value={{
      deferredPrompt,
      isInstalled,
      isIOS,
      installApp,
      showInstallModal,
      setShowInstallModal
    }}>
      {children}

      {/* PWA Installation Instruction Modal */}
      <Modal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        title="Download CopyCraft App"
        maxWidth="480px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', textAlign: 'center' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            boxShadow: '0 8px 20px rgba(79, 70, 229, 0.3)'
          }}>
            <img src="/logo.png?v=2" alt="CopyCraft Logo" style={{ width: '44px', height: '44px', objectFit: 'contain', borderRadius: '10px' }} />
          </div>

          <div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Install CopyCraft on Mobile & PC</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Use CopyCraft like a native application with faster loading, desktop shortcuts, and seamless campus printing.
            </p>
          </div>

          {isInstalled ? (
            <div style={{
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              color: 'var(--success)',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}>
              <CheckCircle2 size={20} /> CopyCraft App is already installed on your device!
            </div>
          ) : isIOS ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              textAlign: 'left',
              background: 'var(--bg-app)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>
                📱 iOS Safari Installation Steps:
              </div>
              <div style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>1</span>
                Tap the <strong style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: 'var(--primary)' }}><Share size={15} /> Share</strong> button in Safari's bottom toolbar.
              </div>
              <div style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>2</span>
                Scroll down and select <strong style={{ color: 'var(--primary)' }}>"Add to Home Screen" ➕</strong>.
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              textAlign: 'left',
              background: 'var(--bg-app)',
              padding: '1rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>
                💻 Android / PC Installation Steps:
              </div>
              <div style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>1</span>
                Click the <strong style={{ color: 'var(--primary)' }}>Install Icon / 3-dots Menu</strong> in your browser bar.
              </div>
              <div style={{ fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.75rem' }}>2</span>
                Select <strong style={{ color: 'var(--primary)' }}>"Install CopyCraft App"</strong> or <strong style={{ color: 'var(--primary)' }}>"Install Page as App"</strong>.
              </div>
            </div>
          )}

          <button
            className="btn btn-lg btn-primary"
            onClick={() => setShowInstallModal(false)}
            style={{ width: '100%' }}
          >
            Got It
          </button>
        </div>
      </Modal>
    </PwaContext.Provider>
  );
}

export function usePwa() {
  const context = useContext(PwaContext);
  if (!context) {
    return {
      deferredPrompt: null,
      isInstalled: false,
      isIOS: false,
      installApp: () => {},
      showInstallModal: false,
      setShowInstallModal: () => {}
    };
  }
  return context;
}
