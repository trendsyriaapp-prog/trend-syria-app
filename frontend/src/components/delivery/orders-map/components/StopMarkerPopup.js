// /app/frontend/src/components/delivery/orders-map/components/StopMarkerPopup.js
// محتوى Popup لعلامة نقطة التوقف المُرقمة

import React from 'react';

/**
 * محتوى Popup لنقطة التوقف المُرقمة
 * @param {Object} stop - بيانات نقطة التوقف
 */
const StopMarkerPopup = ({ stop }) => {
  if (!stop) return null;

  const order = stop.order;

  return (
    <div className="text-center min-w-[160px]" data-testid="stop-marker-popup">
      <div className="flex items-center justify-center gap-1 mb-1">
        <span className="bg-gray-800 text-white text-xs px-2 py-0.5 rounded-full">
          نقطة {stop.stopNumber}
        </span>
      </div>
      <p className="font-bold text-sm mb-1">
        {stop.type === 'driver' ? '📍 موقعك (البداية)' : 
         stop.type === 'store' ? `🏪 ${stop.label}` : 
         `🏠 ${stop.label}`}
      </p>
      {order && (
        <div className="text-[11px] text-gray-600 text-right space-y-1">
          {stop.type === 'store' ? (
            <p className="text-green-600 font-medium">📦 استلام الطلب</p>
          ) : (
            <p className="text-red-600 font-medium">🚚 تسليم الطلب</p>
          )}
          <p className="truncate">
            {typeof (order.delivery_address || order.address) === 'object'
              ? [(order.delivery_address || order.address)?.area, (order.delivery_address || order.address)?.street, (order.delivery_address || order.address)?.building].filter(Boolean).join(', ')
              : (order.delivery_address || order.address)}
          </p>
          {(order.driver_delivery_fee || order.driver_earnings || order.delivery_fee) ? (
            <p className="text-green-600 font-bold">
              💵 ربحك: {(order.driver_earnings || order.driver_delivery_fee || order.delivery_fee || 0).toLocaleString()} ل.س
            </p>
          ) : null}
          <p className="text-gray-400 text-xs">
            🔒 رقم العميل مخفي
          </p>
          {order.order_code && (
            <p className="text-gray-500">
              كود: {order.order_code}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default StopMarkerPopup;
