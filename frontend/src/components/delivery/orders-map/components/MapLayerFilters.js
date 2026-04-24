// /app/frontend/src/components/delivery/orders-map/components/MapLayerFilters.js
// مكون فلاتر الطبقات (طعام/منتجات/عملاء)

import React from 'react';

const LAYERS = [
  { key: 'all', label: 'الكل', icon: '🗺️' },
  { key: 'food', label: 'طعام', icon: '🍔' },
  { key: 'products', label: 'منتجات', icon: '📦' },
  { key: 'customers', label: 'عملاء', icon: '🏠' },
];

/**
 * مكون فلاتر الطبقات
 * @param {string} showLayer - الطبقة المحددة حالياً
 * @param {Function} setShowLayer - دالة تغيير الطبقة
 * @param {string} currentTheme - الثيم الحالي (dark/light)
 */
const MapLayerFilters = ({ showLayer, setShowLayer, currentTheme }) => {
  return (
    <div className={`px-3 py-2 flex gap-2 border-b ${
      currentTheme === 'dark' ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200'
    }`}>
      {LAYERS.map(layer => (
        <button
          key={layer.key}
          data-testid={`layer-filter-${layer.key}`}
          onClick={() => setShowLayer(layer.key)}
          className={`flex-1 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
            showLayer === layer.key
              ? 'bg-green-500 text-black'
              : currentTheme === 'dark'
                ? 'bg-[#252525] text-gray-400 border border-[#333] hover:border-green-500'
                : 'bg-gray-100 text-gray-600 border border-gray-200 hover:border-green-500'
          }`}
        >
          {layer.icon} {layer.label}
        </button>
      ))}
    </div>
  );
};

export default MapLayerFilters;
