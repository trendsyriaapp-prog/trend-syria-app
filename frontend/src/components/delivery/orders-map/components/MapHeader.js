// /app/frontend/src/components/delivery/orders-map/components/MapHeader.js
// هيدر الخريطة مع عناصر التحكم

import { X, Layers, Route, Locate } from 'lucide-react';

const MapHeader = ({
  onClose,
  showLayer,
  setShowLayer,
  showAllMyRoutes,
  setShowAllMyRoutes,
  onLocateDriver,
  gpsRequested,
  activeOrdersCount,
  isDark
}) => {
  return (
    <div className={`absolute top-0 left-0 right-0 z-[1001] p-3 ${
      isDark ? 'bg-gradient-to-b from-[#1a1a1a] to-transparent' : 'bg-gradient-to-b from-white to-transparent'
    }`}>
      <div className="flex items-center justify-between">
        {/* زر الإغلاق */}
        <button
          onClick={onClose}
          data-testid="close-map-btn"
          className={`p-2 rounded-xl ${
            isDark ? 'bg-[#252525] text-white' : 'bg-white text-gray-800 shadow'
          }`}
        >
          <X size={24} />
        </button>

        {/* العنوان */}
        <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          خريطة الطلبات
          {activeOrdersCount > 0 && (
            <span className="text-green-500 mr-2">({activeOrdersCount})</span>
          )}
        </h2>

        {/* أزرار التحكم */}
        <div className="flex gap-2">
          {/* زر عرض المسارات */}
          <button
            onClick={() => setShowAllMyRoutes(!showAllMyRoutes)}
            className={`p-2 rounded-xl transition-all ${
              showAllMyRoutes
                ? 'bg-green-500 text-white'
                : isDark
                  ? 'bg-[#252525] text-gray-400'
                  : 'bg-white text-gray-600 shadow'
            }`}
            title="عرض جميع المسارات"
          >
            <Route size={20} />
          </button>

          {/* زر تحديد الموقع */}
          <button
            onClick={onLocateDriver}
            disabled={gpsRequested}
            className={`p-2 rounded-xl transition-all ${
              gpsRequested
                ? 'bg-yellow-500 text-white animate-pulse'
                : isDark
                  ? 'bg-[#252525] text-gray-400 hover:text-white'
                  : 'bg-white text-gray-600 hover:text-gray-900 shadow'
            }`}
            title="تحديد موقعي"
          >
            <Locate size={20} />
          </button>

          {/* زر الطبقات */}
          <div className="relative">
            <button
              onClick={() => {
                const layers = ['all', 'food', 'products', 'customers'];
                const currentIndex = layers.indexOf(showLayer);
                setShowLayer(layers[(currentIndex + 1) % layers.length]);
              }}
              className={`p-2 rounded-xl ${
                isDark ? 'bg-[#252525] text-gray-400' : 'bg-white text-gray-600 shadow'
              }`}
              title={`الطبقة: ${showLayer}`}
            >
              <Layers size={20} />
            </button>
            <span className={`absolute -bottom-1 -right-1 text-[10px] px-1 rounded ${
              showLayer === 'food' ? 'bg-green-500 text-white' :
              showLayer === 'products' ? 'bg-blue-500 text-white' :
              showLayer === 'customers' ? 'bg-amber-500 text-white' :
              'bg-gray-500 text-white'
            }`}>
              {showLayer === 'food' ? '🍔' :
               showLayer === 'products' ? '📦' :
               showLayer === 'customers' ? '🏠' : '∞'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapHeader;
