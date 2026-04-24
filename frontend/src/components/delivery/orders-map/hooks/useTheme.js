// /app/frontend/src/components/delivery/orders-map/hooks/useTheme.js
// Hook لإدارة الثيم (فاتح/داكن/تلقائي)

import { useState, useEffect } from 'react';

/**
 * Hook لإدارة ثيم الخريطة
 * @param {string} initialTheme - الثيم الافتراضي ('dark', 'light', 'auto')
 */
const useTheme = (initialTheme = 'auto') => {
  const [themeMode, setThemeMode] = useState(() => {
    // استرجاع الإعداد المحفوظ من localStorage أو استخدام القيمة المُمررة
    return localStorage.getItem('driverThemeMode') || initialTheme;
  });

  const [currentTheme, setCurrentTheme] = useState(() => {
    // تحديد الثيم الابتدائي
    const savedMode = localStorage.getItem('driverThemeMode') || initialTheme;
    if (savedMode === 'auto') {
      const hour = new Date().getHours();
      return (hour >= 6 && hour < 18) ? 'light' : 'dark';
    }
    return savedMode;
  });

  // تحديد الثيم الفعلي (للوضع التلقائي)
  const getEffectiveTheme = () => {
    if (themeMode === 'auto') {
      const hour = new Date().getHours();
      return (hour >= 6 && hour < 18) ? 'light' : 'dark';
    }
    return themeMode;
  };

  const effectiveTheme = getEffectiveTheme();
  const isDark = effectiveTheme === 'dark';

  // حساب الثيم التلقائي حسب الوقت
  useEffect(() => {
    const updateAutoTheme = () => {
      // قراءة الإعداد من localStorage (قد يتغير من الصفحة الرئيسية)
      const savedMode = localStorage.getItem('driverThemeMode') || initialTheme;

      // تحديث themeMode فقط إذا تغير لتجنب الحلقة اللانهائية
      if (savedMode !== themeMode) {
        setThemeMode(savedMode);
      }

      if (savedMode === 'auto') {
        const hour = new Date().getHours();
        // من 6 صباحاً إلى 6 مساءً = فاتح
        const isDay = hour >= 6 && hour < 18;
        setCurrentTheme(isDay ? 'light' : 'dark');
      } else {
        setCurrentTheme(savedMode);
      }
    };

    updateAutoTheme();
    // تحديث كل 30 ثانية (لتقليل الضغط على الأداء)
    const interval = setInterval(updateAutoTheme, 30000);
    return () => clearInterval(interval);
  }, [initialTheme, themeMode]);

  // دالة تبديل الثيم
  const cycleTheme = () => {
    const modes = ['auto', 'light', 'dark'];
    const currentIndex = modes.indexOf(themeMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setThemeMode(nextMode);
    localStorage.setItem('driverThemeMode', nextMode);
  };

  return {
    themeMode,
    setThemeMode,
    currentTheme,
    effectiveTheme,
    isDark,
    cycleTheme
  };
};

export default useTheme;
