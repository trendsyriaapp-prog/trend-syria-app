// /app/frontend/src/components/delivery/orders-map/components/OpenMapButton.js
// زر فتح الخريطة الرئيسي

import React from 'react';
import { Map } from 'lucide-react';

/**
 * زر فتح الخريطة الرئيسي
 * @param {Function} onClick - دالة الضغط
 * @param {number} totalOrders - إجمالي الطلبات
 * @param {boolean} isMyOrdersOnly - هل طلباتي فقط
 */
const OpenMapButton = ({
  onClick,
  totalOrders,
  isMyOrdersOnly
}) => {
  return (
    <button
      onClick={onClick}
      disabled={totalOrders === 0}
      data-testid="open-map-btn"
      className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
        totalOrders > 0 
          ? isMyOrdersOnly
            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
            : 'bg-gradient-to-r from-orange-400 to-orange-600 text-white hover:from-orange-500 hover:to-orange-700' 
          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
      }`}
    >
      <Map size={18} />
      {isMyOrdersOnly 
        ? `🗺️ خريطة طلباتي (${totalOrders} طلب)`
        : `🗺️ خريطة التطبيق (${totalOrders} طلب)`
      }
    </button>
  );
};

export default OpenMapButton;
