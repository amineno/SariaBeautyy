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

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!googleClientId || googleClientId === 'YOUR_GOOGLE_CLIENT_ID_HERE') {
  console.error('CRITICAL ERROR: Google Client ID is missing. Please set VITE_GOOGLE_CLIENT_ID in client/.env');
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
