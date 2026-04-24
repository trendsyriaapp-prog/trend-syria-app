// /app/frontend/src/components/delivery/orders-map/components/GpsErrorMessage.js
// رسالة خطأ GPS

import React from 'react';

/**
 * رسالة خطأ GPS مع زر إعادة المحاولة
 * @param {string} gpsError - رسالة الخطأ (null = لا يظهر)
 * @param {Function} onRetry - دالة إعادة المحاولة
 */
const GpsErrorMessage = ({ gpsError, onRetry }) => {
  if (!gpsError) return null;

  return (
    <div className="px-4 py-3 bg-red-500/20 border-b border-red-500/30" data-testid="gps-error-message">
      <div className="flex items-center justify-between">
        <span className="text-red-400 text-sm font-medium">{gpsError}</span>
        <button
          onClick={onRetry}
          data-testid="retry-gps-btn"
          className="px-3 py-1 bg-red-500 text-white rounded-lg text-sm font-bold"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
};

export default GpsErrorMessage;
