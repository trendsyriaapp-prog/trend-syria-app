// /app/frontend/src/components/delivery/orders-map/components/RouteInfoCard.js
// بطاقة معلومات المسار

import { Navigation, X } from 'lucide-react';

const RouteInfoCard = ({
  routeInfo,
  selectedOrder,
  loadingRoute,
  onStartNavigation,
  onClearRoute,
  isDark
}) => {
  if (!selectedOrder && !loadingRoute) return null;

  return (
    <div className={`absolute bottom-4 left-4 right-4 z-[1001] rounded-xl p-4 ${
      isDark ? 'bg-[#1a1a1a] border border-[#333]' : 'bg-white shadow-lg'
    }`}>
      {loadingRoute ? (
        <div className="flex items-center justify-center gap-2">
          <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>جاري حساب المسار...</span>
        </div>
      ) : routeInfo ? (
        <>
          {/* معلومات المسار */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {selectedOrder?.store_name || selectedOrder?.customer_name || 'الوجهة'}
              </p>
              <div className="flex gap-3 text-sm mt-1">
                <span className="text-green-500 font-bold">
                  📍 {routeInfo.distance} كم
                </span>
                <span className="text-blue-500 font-bold">
                  ⏱️ {routeInfo.duration} دقيقة
                </span>
              </div>
            </div>
            <button
              onClick={onClearRoute}
              className={`p-2 rounded-lg ${
                isDark ? 'bg-[#252525] text-gray-400' : 'bg-gray-100 text-gray-600'
              }`}
            >
              <X size={18} />
            </button>
          </div>

          {/* زر بدء الملاحة */}
          <button
            onClick={onStartNavigation}
            className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-green-500 to-teal-500 text-white flex items-center justify-center gap-2"
          >
            <Navigation size={20} />
            ابدأ الملاحة
          </button>
        </>
      ) : null}
    </div>
  );
};

export default RouteInfoCard;
