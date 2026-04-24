// /app/frontend/src/components/delivery/orders-map/components/NavigationBar.js
// شريط وضع الملاحة مع معلومات السرعة والمسافة والوصول

import React from 'react';

/**
 * شريط وضع الملاحة
 * @param {boolean} isNavigationMode - هل وضع الملاحة مفعّل
 * @param {Function} toggleNavigationMode - تبديل وضع الملاحة
 * @param {number} driverSpeed - سرعة السائق (كم/س)
 * @param {Object} routeInfo - معلومات المسار {distance, duration}
 * @param {string|number} estimatedArrival - وقت الوصول المتوقع
 * @param {number} distanceFromRoute - المسافة عن المسار (كم)
 */
const NavigationBar = ({
  isNavigationMode,
  toggleNavigationMode,
  driverSpeed,
  routeInfo,
  estimatedArrival,
  distanceFromRoute
}) => {
  if (!isNavigationMode) return null;

  return (
    <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-3 py-2" data-testid="navigation-bar">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs font-bold">وضع الملاحة مفعّل</span>
        </div>
        <button
          onClick={toggleNavigationMode}
          data-testid="stop-navigation-btn"
          className="text-red-400 hover:text-red-300 text-xs"
        >
          إيقاف ✕
        </button>
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-center">
        {/* السرعة */}
        <div className="bg-gray-700/50 rounded-lg p-2">
          <p className="text-[10px] text-gray-400">السرعة</p>
          <p className="text-lg font-bold text-green-400">{driverSpeed}</p>
          <p className="text-[10px] text-gray-400">كم/س</p>
        </div>
        
        {/* المسافة المتبقية */}
        <div className="bg-gray-700/50 rounded-lg p-2">
          <p className="text-[10px] text-gray-400">المسافة</p>
          <p className="text-lg font-bold text-blue-400">{routeInfo?.distance || '0'}</p>
          <p className="text-[10px] text-gray-400">كم</p>
        </div>
        
        {/* وقت الوصول */}
        <div className="bg-gray-700/50 rounded-lg p-2">
          <p className="text-[10px] text-gray-400">الوصول</p>
          <p className="text-lg font-bold text-orange-400">
            {estimatedArrival || routeInfo?.duration || '0'}
          </p>
          <p className="text-[10px] text-gray-400">دقيقة</p>
        </div>
      </div>
      
      {/* تحذير الابتعاد عن المسار */}
      {distanceFromRoute > 0.05 && (
        <div className="mt-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-2 text-center">
          <p className="text-yellow-400 text-xs font-bold">
            ⚠️ ابتعدت عن المسار ({(distanceFromRoute * 1000).toFixed(0)} متر)
          </p>
          <p className="text-yellow-300/70 text-[10px]">جاري إعادة حساب المسار...</p>
        </div>
      )}
    </div>
  );
};

export default NavigationBar;
