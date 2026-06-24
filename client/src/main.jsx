import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './i18n';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { ThemeProvider } from './context/ThemeContext';
import { HelmetProvider } from 'react-helmet-async';
import { ConfigProvider } from './context/ConfigContext';
import ErrorBoundary from './components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <HelmetProvider>
      <ConfigProvider>
        <AuthProvider>
          <CurrencyProvider>
            <ThemeProvider>
              <CartProvider>
                <App />
              </CartProvider>
            </ThemeProvider>
          </CurrencyProvider>
        </AuthProvider>
      </ConfigProvider>
    </HelmetProvider>
  </ErrorBoundary>
)

