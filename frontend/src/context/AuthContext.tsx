/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

export interface User {
  id: number;
  tcKimlik: string;
  kullaniciAdi: string;
  name: string;
  userType: 'OGRENCI' | 'DANISMAN' | 'KARIYER_MERKEZI' | 'YONETICI';
  email?: string;
  studentId?: string;
  faculty?: string;
  class?: string;
  department?: string;
  girisYapti?: number | null;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userData: User, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
  isStudent: () => boolean;
  isTeacher: () => boolean;
  isKariyer: () => boolean;
  isAdmin: () => boolean;
  // normalized department string (preferred for display)
  department: string;
  // helper to compute department on-demand
  getDepartment: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const login = (userData: User, token: string) => {
    setUser(userData);
    setToken(token);
    // Store in both sessionStorage and localStorage for compatibility
    sessionStorage.setItem('user', JSON.stringify(userData));
    sessionStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
  };

  const logout = async () => {
    try {
      // Call logout API to invalidate session
      await api.logout();
    } catch (error) {
      console.error('Logout API error:', error);
    }
    
    setUser(null);
    setToken(null);
    // Clear from both storages
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  // Background token validation
  useEffect(() => {
    const validateTokenPeriodically = async () => {
      if (token && user) {
        try {
          const isValid = await api.validateToken();
          if (!isValid) {
            console.warn('Periyodik token doğrulaması başarısız - oturum kapatılıyor');
            logout();
          }
        } catch (error) {
          console.error('Token doğrulama hatası:', error);
          logout();
        }
      }
    };

    // Check token validity every 5 minutes
    const interval = setInterval(validateTokenPeriodically, 5 * 60 * 1000);
    
    // Also validate immediately on mount if we have a token
    if (token && user) {
      validateTokenPeriodically();
    }
    
    return () => clearInterval(interval);
  }, [token, user]);

  // Listen for token expiration events
  useEffect(() => {
    const handleTokenExpired = () => {
      logout();
    };

    window.addEventListener('tokenExpired', handleTokenExpired);
    return () => window.removeEventListener('tokenExpired', handleTokenExpired);
  }, []);

  // Sayfa yenilendiğinde session'dan kullanıcı bilgilerini yükle
  useEffect(() => {
    try {
      let savedUser = sessionStorage.getItem('user');
      let savedToken = sessionStorage.getItem('token');
      
      // Fallback to localStorage if sessionStorage is empty
      if (!savedUser || !savedToken) {
        savedUser = localStorage.getItem('user');
        savedToken = localStorage.getItem('token');
      }
      
      if (savedUser && savedToken) {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Role check functions
  const isStudent = () => user?.userType === 'OGRENCI';
  const isDanisman = () => user?.userType === 'DANISMAN';
  const isKariyer = () => user?.userType === 'KARIYER_MERKEZI';
  const isAdmin = () => user?.userType === 'YONETICI';
  
  const getDepartment = () => {
    if (!user) return '';
    return user.department ? user.department : '';
  };

  const value = {
    user,
    token,
    login,
    logout,
    isAuthenticated: !!user && !!token,
    isLoading,
    isStudent,
    isTeacher: isDanisman,
    isKariyer, // <-- değiştirildi
    isAdmin,
    // provide a normalized string and a helper
    department: getDepartment(),
    getDepartment,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};