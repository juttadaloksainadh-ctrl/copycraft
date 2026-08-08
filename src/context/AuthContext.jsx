import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('copycraft_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchUserProfile(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUserProfile = async (authToken) => {
    try {
      const res = await apiFetch('/auth/profile', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.success) {
        setUser(res.user);
      } else {
        logout();
      }
    } catch (err) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, portal = 'customer', phone = null) => {
    const res = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, portal, phone })
    });
    if (res.success && !res.otpRequired) {
      localStorage.setItem('copycraft_token', res.token);
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  };

  const register = async (userData) => {
    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    if (res.success) {
      localStorage.setItem('copycraft_token', res.token);
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  };

  const logout = () => {
    localStorage.removeItem('copycraft_token');
    setToken(null);
    setUser(null);
  };

  // Switch Role helper for testing environments
  const switchDemoRole = async (targetRole) => {
    const credentials = {
      customer: { email: 'customer@copycraft.com', password: 'Password123!' },
      dealer: { email: 'dealer@copycraft.com', password: 'Password123!' },
      distributor: { email: 'distributor@copycraft.com', password: 'Password123!' },
      admin: { email: 'admin@copycraft.com', password: 'Password123!' },
      super_admin: { email: 'superadmin@copycraft.com', password: 'Password123!' }
    };

    const creds = credentials[targetRole];
    if (creds) {
      return await login(creds.email, creds.password);
    }
  };

  const completeStaffLogin = (authToken, authUser) => {
    localStorage.setItem('copycraft_token', authToken);
    setToken(authToken);
    setUser(authUser);
  };

  const refreshProfile = async () => {
    if (token) await fetchUserProfile(token);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, switchDemoRole, completeStaffLogin, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
