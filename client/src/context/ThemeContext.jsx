import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

const getThemeFromTime = () => {
  const hour = new Date().getHours();
  // Mode nuit de 19h (19:00) à 6h59 (06:59)
  return hour >= 19 || hour < 7 ? 'dark' : 'light';
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const storedTheme = localStorage.getItem('theme');
      if (storedTheme) {
        return storedTheme;
      }
      return getThemeFromTime();
    }
    return 'light';
  });

  // Mise à jour automatique basée sur le temps (toutes les minutes)
  useEffect(() => {
    const checkTime = () => {
      // Si l'utilisateur n'a pas défini de préférence manuelle persistante
      const hasManualPreference = localStorage.getItem('theme_manual') === 'true';
      if (!hasManualPreference) {
        const timeTheme = getThemeFromTime();
        setTheme((prev) => (prev !== timeTheme ? timeTheme : prev));
      }
    };

    checkTime(); // Vérification immédiate
    const interval = setInterval(checkTime, 60000); // Vérification chaque minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prevTheme) => {
      const newTheme = prevTheme === 'light' ? 'dark' : 'light';
      // On enregistre que c'est une préférence manuelle pour arrêter l'auto-switch
      localStorage.setItem('theme', newTheme);
      localStorage.setItem('theme_manual', 'true');
      return newTheme;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
