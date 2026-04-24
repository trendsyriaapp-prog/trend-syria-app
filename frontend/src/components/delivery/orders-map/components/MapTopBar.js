// /app/frontend/src/components/delivery/orders-map/components/MapTopBar.js
// شريط علوي للخريطة

import React from 'react';
import { Locate } from 'lucide-react';

/**
 * شريط علوي للخريطة مع زر الإغلاق وتحديد الموقع وتبديل الثيم
 */
const MapTopBar = ({
  onClose,
  onLocateDriver,
  themeMode,
  setThemeMode,
  currentTheme,
  setCurrentTheme
}) => {
  const handleThemeToggle = () => {
    const modes = ['auto', 'light', 'dark'];
    const currentIndex = modes.indexOf(themeMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setThemeMode(nextMode);
    // حفظ الإعداد في localStorage
    localStorage.setItem('driverThemeMode', nextMode);
    // تحديث الثيم الفعلي فوراً
    if (nextMode === 'auto') {
      const hour = new Date().getHours();
      setCurrentTheme((hour >= 6 && hour < 18) ? 'light' : 'dark');
    } else {
      setCurrentTheme(nextMode);
    }
  };

  return (
    <div className={`flex items-center justify-between px-3 py-2 gap-2 border-b ${
      currentTheme === 'dark' 
        ? 'bg-[#1a1a1a] border-[#333]' 
        : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* زر الإغلاق */}
        <button
          onClick={onClose}
          data-testid="close-map-btn"
          className={`p-2 rounded-lg transition-colors ${
            currentTheme === 'dark'
              ? 'bg-[#252525] text-white hover:bg-[#333]'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m12 19 7-7-7-7"/>
            <path d="M19 12H5"/>
          </svg>
        </button>
        
        {/* العنوان */}
        <span className={`text-sm font-bold whitespace-nowrap ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
          خريطة الطلبات
        </span>
        
        {/* زر تحديد الموقع */}
        <button
          onClick={onLocateDriver}
          data-testid="locate-driver-btn"
          className="p-2 bg-green-500 text-black rounded-lg font-bold"
          title="تحديث موقعي"
        >
          <Locate size={16} />
        </button>
        
        {/* زر تبديل الثيم */}
        <button
          onClick={handleThemeToggle}
          data-testid="toggle-theme-btn"
          className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 z-50 relative transition-all ${
            currentTheme === 'dark'
              ? 'bg-[#252525] text-white hover:bg-[#333] border border-[#444]'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
          }`}
          title={`الوضع: ${themeMode === 'auto' ? 'تلقائي' : themeMode === 'light' ? 'فاتح' : 'داكن'}`}
        >
          {themeMode === 'auto' && '🔄 تلقائي'}
          {themeMode === 'light' && '☀️ فاتح'}
          {themeMode === 'dark' && '🌙 داكن'}
        </button>
      </div>
    </div>
  );
};

export default MapTopBar;
