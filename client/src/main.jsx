import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './i18n';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { ThemeProvider } from './context/ThemeContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { HelmetProvider } from 'react-helmet-async';
import api from './api/axios';

const getInitialGoogleClientId = () => {
  const fromEnv = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!fromEnv) return '';
  return fromEnv;
};

const bootstrap = async () => {
  let googleClientId = getInitialGoogleClientId();

  try {
    const { data } = await api.get('/config/public');
    if (data?.googleClientId) {
      googleClientId = data.googleClientId;
    }
  } catch {
    void 0;
  }

  if (!googleClientId || googleClientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
    console.error('CRITICAL ERROR: Google Client ID is missing. Please set VITE_GOOGLE_CLIENT_ID or GOOGLE_CLIENT_ID on the API server.');
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <HelmetProvider>
      <GoogleOAuthProvider clientId={googleClientId}>
        <AuthProvider>
          <CurrencyProvider>
            <ThemeProvider>
              <CartProvider>
                <App />
              </CartProvider>
            </ThemeProvider>
          </CurrencyProvider>
        </AuthProvider>
      </GoogleOAuthProvider>
    </HelmetProvider>,
  )
};

bootstrap().catch(err => {
  console.error('Critical bootstrap error:', err);
});
