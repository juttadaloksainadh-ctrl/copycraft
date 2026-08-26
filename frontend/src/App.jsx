import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';

// Pages
import PortalSelectionPage from './pages/PortalSelectionPage';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CustomerDashboard from './pages/CustomerDashboard';
import DealerDashboard from './pages/DealerDashboard';
import DistributorDashboard from './pages/DistributorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import UploadPage from './pages/UploadPage';

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

  if (currentPage === 'register') {
    return <RegisterPage onNavigate={navigateTo} />;
  }

  if (currentPage === 'upload') {
    return <UploadPage onNavigate={navigateTo} />;
  }

  if (currentPage === 'dashboard') {
    if (!user) {
      return <LoginPage onNavigate={navigateTo} selectedPortal={selectedPortal} />;
    }
    
    // Role-based Dashboard routing
    switch (user.role) {
      case 'dealer':
        return <DealerDashboard onNavigate={navigateTo} />;
      case 'distributor':
        return <DistributorDashboard onNavigate={navigateTo} />;
      case 'admin':
      case 'super_admin':
        return <AdminDashboard onNavigate={navigateTo} />;
      case 'customer':
      default:
        return <CustomerDashboard onNavigate={navigateTo} />;
    }
  }

  return <LandingPage onNavigate={navigateTo} />;
}

import { LanguageProvider } from './context/LanguageContext';
import { PwaProvider } from './context/PwaContext';

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
