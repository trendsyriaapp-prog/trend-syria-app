// /app/frontend/src/components/delivery/orders-map/components/RouteLinePopup.js
// محتوى Popup لخط المسار

import React from 'react';

/**
 * محتوى Popup لخط المسار
 * @param {Object} line - بيانات الخط
 * @param {boolean} isAvailable - هل هذا خط لطلب متاح
 */
const RouteLinePopup = ({ line, isAvailable = false }) => {
  if (!line) return null;

  if (isAvailable) {
    return (
      <div className="text-right text-xs" data-testid="route-line-popup-available">
        <p className="font-bold mb-1 text-emerald-600">
          🏪 {line.storeName}
        </p>
        <p>👤 {line.customerName}</p>
        <p className="text-emerald-500 text-[10px] mt-1">
          ✨ متاح للقبول
        </p>
      </div>
    );
  }

  return (
    <div className="text-right text-xs" data-testid="route-line-popup">
      <p className="font-bold mb-1" style={{ color: line.color }}>
        🛒 {line.storeName}
      </p>
      <p>👤 {line.customerName}</p>
      <p className="text-gray-400 text-[10px] mt-1">
        {line.dashArray ? '📦 بانتظار الاستلام' : '🚚 جاهز للتوصيل'}
      </p>
    </div>
  );
};

export default RouteLinePopup;
