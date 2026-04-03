import React, { createContext, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const { t } = useTranslation();
  const [user, setUser] = useState(() => {
    const userInfo = localStorage.getItem('userInfo');
    return userInfo ? JSON.parse(userInfo) : null;
  });
  const loading = false;

  const login = async (email, password) => {
    try {
      const { data } = await api.post('/users/login', { email, password });
      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      toast.success(t('auth.welcome_back', { name: data.name }));
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || t('auth.login_failed');
      toast.error(message);
      return { 
        success: false, 
        message 
      };
    }
  };

  const register = async (name, email, password) => {
    try {
      const { data } = await api.post('/users', { name, email, password });
      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      toast.success(t('auth.account_created'));
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || t('auth.registration_failed');
      toast.error(message);
      return { 
        success: false, 
        message 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('userInfo');
    setUser(null);
    toast.success(t('auth.logged_out'));
  };

  const googleLogin = async (token) => {
    try {
      const { data } = await api.post('/users/google-login', { token });
      setUser(data);
      localStorage.setItem('userInfo', JSON.stringify(data));
      toast.success(t('auth.welcome_back', { name: data.name }));
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || t('auth.login_failed');
      toast.error(message);
      return { 
        success: false, 
        message 
      };
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem('userInfo', JSON.stringify(userData));
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser, googleLogin, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};
