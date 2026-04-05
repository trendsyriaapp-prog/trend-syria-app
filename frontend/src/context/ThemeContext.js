// /app/frontend/src/context/ThemeContext.js
// سياق الوضع الليلي/النهاري

import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // استرجاع الإعداد المحفوظ
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      return JSON.parse(saved);
    }
    // التحقق من تفضيلات النظام
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    // حفظ الإعداد
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    
    // تطبيق الكلاس على document
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    // بدلاً من رمي خطأ، نعيد قيم افتراضية للتوافق
    console.warn('useTheme called outside ThemeProvider, using defaults');
    return {
      theme: 'light',
      setTheme: () => {},
      toggleTheme: () => {}
    };
  }
  return context;
};

export default ThemeContext;
