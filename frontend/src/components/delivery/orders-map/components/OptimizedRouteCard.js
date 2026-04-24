// /app/frontend/src/components/delivery/orders-map/components/OptimizedRouteCard.js
// بطاقة المسار المُحسَّن لجميع الطلبات

import React from 'react';
import { X } from 'lucide-react';

/**
 * بطاقة المسار المُحسَّن
 * @param {Object} routeInfo - معلومات المسار
 * @param {boolean} showAllMyRoutes - هل تُعرض البطاقة
 * @param {Function} hideAllRoutes - دالة إخفاء جميع المسارات
 * @param {Array} optimizedStops - نقاط التوقف المُحسَّنة
 */
const OptimizedRouteCard = ({
  routeInfo,
  showAllMyRoutes,
  hideAllRoutes,
  optimizedStops
}) => {
  if (!routeInfo || !showAllMyRoutes) return null;

  return (
    <div 
      className="absolute bottom-4 left-4 right-4 bg-[#1a1a1a] border border-[#333] rounded-2xl shadow-2xl p-4 z-[1000]"
      data-testid="optimized-route-card"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-sm text-white">🛣️ المسار المُحسَّن لجميع طلباتك</h4>
        <button 
          onClick={hideAllRoutes}
          data-testid="hide-all-routes-btn"
          className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-[#333]"
        >
          <X size={18} />
        </button>
      </div>
      
      {/* دليل الألوان */}
      <div className="flex items-center justify-center gap-4 mb-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-white shadow-lg"></span>
          <span className="text-gray-400">موقعك</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></span>
          <span className="text-gray-400">مطعم</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50"></span>
          <span className="text-gray-400">متجر</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50"></span>
          <span className="text-gray-400">عميل</span>
        </span>
      </div>
      
      {/* إحصائيات المسار */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500">نقاط التوقف</p>
          <p className="font-bold text-purple-400 text-lg">{routeInfo.stopsCount || (optimizedStops?.length || 0)}</p>
        </div>
        <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500">المسافة</p>
          <p className="font-bold text-blue-400 text-lg">{routeInfo.distance} كم</p>
        </div>
        <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500">الوقت</p>
          <p className="font-bold text-green-400 text-lg">{routeInfo.duration} د</p>
        </div>
      </div>

      {/* ملاحظة */}
      <p className="text-xs text-gray-500 text-center mt-3">
        اضغط على أي علامة لرؤية تفاصيل الطلب
      </p>
    </div>
  );
};

export default OptimizedRouteCard;
