// /app/frontend/src/components/delivery/orders-map/components/GoogleMapsButton.js
// زر فتح Google Maps

import React from 'react';

/**
 * يُنشئ رابط Google Maps للملاحة
 * @param {Array} orders - قائمة الطلبات النشطة
 * @param {Object} driverLocation - موقع السائق الحالي
 * @returns {string|null} - رابط Google Maps أو null
 */
const buildGoogleMapsUrl = (orders, driverLocation) => {
  if (!orders || orders.length === 0) return null;
  
  const driverPos = driverLocation || { latitude: 33.5138, longitude: 36.2765 };
  const waypoints = [];
  
  // ترتيب بسيط: متجر ثم عميل لكل طلب
  orders.forEach(order => {
    const storeLat = order.store_latitude || order.seller_addresses?.[0]?.latitude;
    const storeLng = order.store_longitude || order.seller_addresses?.[0]?.longitude;
    const custLat = order.latitude || order.buyer_address?.latitude;
    const custLng = order.longitude || order.buyer_address?.longitude;
    
    if (storeLat && storeLng) {
      waypoints.push({ lat: storeLat, lng: storeLng, type: 'store' });
    }
    if (custLat && custLng) {
      waypoints.push({ lat: custLat, lng: custLng, type: 'customer' });
    }
  });
  
  if (waypoints.length === 0) return null;
  
  // بناء رابط Google Maps
  const destination = waypoints[waypoints.length - 1];
  const waypointsStr = waypoints.slice(0, -1).map(w => `${w.lat},${w.lng}`).join('|');
  
  let url = `https://www.google.com/maps/dir/?api=1`;
  url += `&origin=${driverPos.latitude},${driverPos.longitude}`;
  url += `&destination=${destination.lat},${destination.lng}`;
  if (waypointsStr) {
    url += `&waypoints=${waypointsStr}`;
  }
  url += `&travelmode=driving`;
  
  return url;
};

/**
 * زر فتح Google Maps
 * @param {boolean} show - هل يُعرض الزر (activeOrdersCount > 0 && !stepByStepMode)
 * @param {Array} activeMyOrders - الطلبات النشطة
 * @param {Array} activeMyFoodOrders - طلبات الطعام النشطة
 * @param {Object} currentDriverLocation - موقع السائق
 */
const GoogleMapsButton = ({
  show,
  activeMyOrders,
  activeMyFoodOrders,
  currentDriverLocation
}) => {
  if (!show) return null;

  const handleClick = () => {
    const allOrders = [...(activeMyOrders || []), ...(activeMyFoodOrders || [])];
    
    if (allOrders.length === 0) {
      alert('لا توجد طلبات للتوصيل');
      return;
    }
    
    const url = buildGoogleMapsUrl(allOrders, currentDriverLocation);
    
    if (!url) {
      alert('لا توجد إحداثيات للمحطات');
      return;
    }
    
    window.open(url, '_blank');
  };

  return (
    <div className="bg-[#1a1a1a] px-3 py-2 border-t border-[#333]">
      <button
        onClick={handleClick}
        data-testid="google-maps-btn"
        className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-base font-bold flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all"
      >
        <span className="text-2xl">🗺️</span>
        <span>ابدأ التوصيل في Google Maps</span>
      </button>
    </div>
  );
};

export default GoogleMapsButton;
