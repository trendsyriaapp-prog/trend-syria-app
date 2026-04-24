// /app/frontend/src/components/delivery/orders-map/components/MapButton.js
// زر فتح الخريطة

import { Map } from 'lucide-react';

const MapButton = ({ 
  onClick, 
  activeOrdersCount, 
  isDark 
}) => {
  return (
    <button
      onClick={onClick}
      data-testid="open-orders-map-btn"
      className={`fixed bottom-20 left-4 z-40 p-4 rounded-full shadow-2xl transition-all hover:scale-105 ${
        isDark
          ? 'bg-gradient-to-r from-green-500 to-teal-500 text-black'
          : 'bg-gradient-to-r from-green-500 to-teal-500 text-white'
      }`}
    >
      <Map size={28} />
      {activeOrdersCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold shadow-lg">
          {activeOrdersCount}
        </span>
      )}
    </button>
  );
};

export default MapButton;
