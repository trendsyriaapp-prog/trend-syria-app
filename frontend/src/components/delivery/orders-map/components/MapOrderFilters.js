// /app/frontend/src/components/delivery/orders-map/components/MapOrderFilters.js
// مكون فلاتر الطلبات (متاحة / طلباتي / الكل)

import React from 'react';

/**
 * مكون فلاتر الطلبات
 * @param {string} orderFilter - الفلتر المحدد حالياً ('available', 'myOrders', 'all')
 * @param {Function} setOrderFilter - دالة تغيير الفلتر
 * @param {number} availableCount - عدد الطلبات المتاحة
 * @param {number} activeOrdersCount - عدد طلباتي النشطة
 * @param {string} currentTheme - الثيم الحالي (dark/light)
 */
const MapOrderFilters = ({ 
  orderFilter, 
  setOrderFilter, 
  availableCount, 
  activeOrdersCount, 
  currentTheme 
}) => {
  return (
    <div className={`px-3 py-2 flex gap-2 border-b ${
      currentTheme === 'dark' ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200'
    }`}>
      {/* طلبات متاحة */}
      <button
        data-testid="order-filter-available"
        onClick={() => setOrderFilter('available')}
        className={`flex-1 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center justify-center gap-1 ${
          orderFilter === 'available'
            ? 'bg-green-500 text-black shadow-lg shadow-green-500/30'
            : currentTheme === 'dark'
              ? 'bg-[#252525] text-green-400 border border-green-500/30 hover:border-green-500'
              : 'bg-green-50 text-green-600 border border-green-200 hover:border-green-500'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-green-400"></span>
        متاحة ({availableCount})
      </button>
      
      {/* طلباتي */}
      <button
        data-testid="order-filter-myOrders"
        onClick={() => setOrderFilter('myOrders')}
        className={`flex-1 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center justify-center gap-1 ${
          orderFilter === 'myOrders'
            ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
            : currentTheme === 'dark'
              ? 'bg-[#252525] text-blue-400 border border-blue-500/30 hover:border-blue-500'
              : 'bg-blue-50 text-blue-600 border border-blue-200 hover:border-blue-500'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-blue-400"></span>
        طلباتي ({activeOrdersCount})
      </button>
      
      {/* الكل */}
      <button
        data-testid="order-filter-all"
        onClick={() => setOrderFilter('all')}
        className={`flex-1 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center justify-center gap-1 ${
          orderFilter === 'all'
            ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
            : currentTheme === 'dark'
              ? 'bg-[#252525] text-purple-400 border border-purple-500/30 hover:border-purple-500'
              : 'bg-purple-50 text-purple-600 border border-purple-200 hover:border-purple-500'
        }`}
      >
        <span className="w-2 h-2 rounded-full bg-purple-400"></span>
        الكل
      </button>
    </div>
  );
};

export default MapOrderFilters;
