// /app/frontend/src/components/delivery/orders-map/components/ActivateNavigationButton.js
// زر تفعيل وضع الملاحة

import React from 'react';
import { Navigation } from 'lucide-react';

/**
 * زر تفعيل وضع الملاحة
 * @param {boolean} hasRoute - هل يوجد مسار (routeCoordinates.length > 0)
 * @param {boolean} isNavigationMode - هل وضع الملاحة مفعّل
 * @param {Function} toggleNavigationMode - دالة تبديل وضع الملاحة
 */
const ActivateNavigationButton = ({
  hasRoute,
  isNavigationMode,
  toggleNavigationMode
}) => {
  if (!hasRoute || isNavigationMode) return null;

  return (
    <div className="bg-[#1a1a1a] px-3 py-2 border-t border-[#333]">
      <button
        onClick={toggleNavigationMode}
        data-testid="activate-navigation-btn"
        className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
      >
        <Navigation size={18} />
        🚀 تفعيل وضع الملاحة
      </button>
    </div>
  );
};

export default ActivateNavigationButton;
