import React, { createContext, useContext, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const CurrencyContext = createContext();

const RATES = {
  AED: 1, // Base currency
  USD: 0.27, // 1 AED = 0.27 USD
  EUR: 0.25  // 1 AED = 0.25 EUR
};

const SYMBOLS = {
  AED: 'د.إ',
  USD: '$',
  EUR: '€'
};

export const CurrencyProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [currency, setCurrency] = useState(() => {
    return localStorage.getItem('currency') || 'AED';
  });

  useEffect(() => {
    localStorage.setItem('currency', currency);
  }, [currency]);

  // Helper to format price
  // Assuming input price is in AED from backend. 
  // If backend is USD, we need to adjust RATES.
  // Based on "Price ($)" in admin, backend might be USD.
  // Let's assume backend is USD for now based on translation file.
  
  // Revised RATES if Base is USD:
  // USD = 1
  // AED = 3.67
  // EUR = 0.92
  
  const RATES_USD_BASE = {
    USD: 1,
    AED: 3.67,
    EUR: 0.92
  };

  const formatPrice = (price) => {
    if (price === undefined || price === null) return '';
    const numericPrice = Number(price);
    if (isNaN(numericPrice)) return price;

    const rate = RATES_USD_BASE[currency];
    const converted = numericPrice * rate;
    
    let symbol = SYMBOLS[currency];

    // Use "AED" instead of "د.إ" for non-Arabic languages
    if (currency === 'AED' && i18n.language !== 'ar') {
      symbol = 'AED';
    }
    
    // Format with 2 decimals
    return `${symbol} ${converted.toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatPrice, rates: RATES_USD_BASE, symbols: SYMBOLS }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
