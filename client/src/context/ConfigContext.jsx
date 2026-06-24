import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const ConfigContext = createContext();

export const useConfig = () => useContext(ConfigContext);

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState({
    googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    loading: true,
    error: null,
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const { data } = await api.get('/config/public');
        if (data?.googleClientId) {
          setConfig(prev => ({ ...prev, googleClientId: data.googleClientId, loading: false }));
        } else {
          setConfig(prev => ({ ...prev, loading: false }));
        }
      } catch (err) {
        console.error('Failed to fetch public config:', err);
        setConfig(prev => ({ ...prev, loading: false, error: err }));
      }
    };

    fetchConfig();
  }, []);

  return (
    <ConfigContext.Provider value={config}>
      {children}
    </ConfigContext.Provider>
  );
};
