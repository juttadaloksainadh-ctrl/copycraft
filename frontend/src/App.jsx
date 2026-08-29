import React, { useState, useEffect, Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { LanguageProvider } from './context/LanguageContext';
import { PwaProvider } from './context/PwaContext';

// Critical pages — loaded eagerly (small, needed first)
import PortalSelectionPage from './pages/PortalSelectionPage';
import LoginPage from './pages/LoginPage';

// Heavy pages — lazy-loaded (only fetched when the user actually navigates)
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard'));
const DealerDashboard = lazy(() => import('./pages/DealerDashboard'));
const StationeryDealerDashboard = lazy(() => import('./pages/StationeryDealerDashboard'));
const DistributorDashboard = lazy(() => import('./pages/DistributorDashboard'));

const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const UploadPage = lazy(() => import('./pages/UploadPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));

// Loading fallback for lazy pages
function PageLoader() {
  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-app)',
      color: 'var(--text-muted)',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div className="pulse-skeleton" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
      <div style={{ fontWeight: 600 }}>Loading...</div>
    </div>
  );
}

function AppContent() {
  const { user, loading, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState('portal_selection');
  const [selectedPortal, setSelectedPortal] = useState('customer');

  useEffect(() => {
    if (user) {
      setCurrentPage('dashboard');
    } else if (currentPage !== 'portal_selection' && currentPage !== 'login' && currentPage !== 'register') {
      setCurrentPage('portal_selection');
    }
  }, [user]);

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-app)',
        color: 'var(--text-muted)',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div className="pulse-skeleton" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
        <div style={{ fontWeight: 600 }}>Loading CopyCraft Engine...</div>
      </div>
    );
  }

  const navigateTo = (page) => {
    if (page === 'logout') {
      logout();
      setCurrentPage('portal_selection');
    } else {
      setCurrentPage(page);
    }
    window.scrollTo(0, 0);
  };

  const handleSelectPortal = (portalId) => {
    setSelectedPortal(portalId);
    navigateTo('login');
  };

  // Route selector logic
  if (currentPage === 'portal_selection') {
    return <PortalSelectionPage onSelectPortal={handleSelectPortal} />;
  }

  if (currentPage === 'login') {
    return <LoginPage onNavigate={navigateTo} selectedPortal={selectedPortal} />;
  }

  // All lazy-loaded routes wrapped in Suspense
  return (
    <Suspense fallback={<PageLoader />}>
      {currentPage === 'register' && (
        <RegisterPage onNavigate={navigateTo} />
      )}

      {currentPage === 'upload' && (
        <UploadPage onNavigate={navigateTo} />
      )}

      {currentPage === 'dashboard' && (
        !user ? (
          <LoginPage onNavigate={navigateTo} selectedPortal={selectedPortal} />
        ) : (
          (() => {
            switch (user.role) {
              case 'dealer':
                if (user.dealerType === 'stationery' || user.subRole === 'stationery' || user.role === 'stationery_dealer') {
                  return <StationeryDealerDashboard onNavigate={navigateTo} />;
                }
                return <DealerDashboard onNavigate={navigateTo} />;
              case 'stationery_dealer':
                return <StationeryDealerDashboard onNavigate={navigateTo} />;
              case 'distributor':

                return <DistributorDashboard onNavigate={navigateTo} />;
              case 'admin':
              case 'super_admin':
                return <AdminDashboard onNavigate={navigateTo} />;
              case 'customer':
              default:
                return <CustomerDashboard onNavigate={navigateTo} />;
            }
          })()
        )
      )}

      {currentPage !== 'register' && currentPage !== 'upload' && currentPage !== 'dashboard' && (
        <LandingPage onNavigate={navigateTo} />
      )}
    </Suspense>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <LanguageProvider>
            <PwaProvider>
              <AppContent />
            </PwaProvider>
          </LanguageProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
