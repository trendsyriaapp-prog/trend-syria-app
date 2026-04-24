// /app/frontend/src/components/delivery/orders-map/components/MarkerPopupContent.js
// محتوى Popup للـ Marker على الخريطة

import React from 'react';

/**
 * محتوى Popup للـ Marker
 * @param {Object} marker - بيانات الـ marker
 * @param {Function} onAcceptFoodOrder - دالة قبول طلب الطعام
 * @param {Function} onAcceptOrder - دالة قبول طلب المنتجات
 * @param {Function} onShowRoute - دالة عرض المسار
 */
const MarkerPopupContent = ({
  marker,
  onAcceptFoodOrder,
  onAcceptOrder,
  onShowRoute
}) => {
  if (!marker) return null;

  const order = marker.order;

  return (
    <div className="text-right min-w-[180px] max-w-[220px]" data-testid="marker-popup-content">
      {/* اسم العميل */}
      <p className="font-bold text-xs mb-1 text-gray-800">👤 {marker.title}</p>
      
      {order && (
        <>
          {/* اسم المطعم/المتجر */}
          {(order.store_name || order.restaurant_name || order.seller_name) && (
            <div className="bg-amber-50 rounded p-1.5 mb-2 border border-amber-200">
              <p className="text-amber-800 font-bold text-xs text-center">
                🏪 {order.store_name || order.restaurant_name || order.seller_name}
              </p>
            </div>
          )}
          
          {/* معلومات التواصل */}
          <div className="text-[10px] text-gray-600 mb-2 bg-gray-50 rounded p-1.5">
            <p className="font-medium truncate mb-1">📍 {
              typeof (order.delivery_address || order.address) === 'object'
                ? [(order.delivery_address || order.address)?.area, (order.delivery_address || order.address)?.street, (order.delivery_address || order.address)?.building].filter(Boolean).join(', ')
                : (order.delivery_address || order.address)
            }</p>
            <p className="text-gray-400 text-xs">
              🔒 رقم العميل مخفي (استخدم زر الاتصال)
            </p>
            {/* رقم المطعم/البائع */}
            {(order.restaurant_phone || order.store_phone || order.seller_phone) && (
              <p className="text-green-600">
                📞 {order.restaurant_id ? 'المطعم' : 'البائع'}: {order.restaurant_phone || order.store_phone || order.seller_phone}
              </p>
            )}
          </div>
          
          {/* قائمة المنتجات/الأطعمة */}
          {order.items && order.items.length > 0 && (
            <div className="text-[10px] mb-2 bg-orange-50 rounded p-1.5 max-h-[80px] overflow-y-auto">
              <p className="font-bold text-orange-700 mb-1">🍽️ الأصناف:</p>
              {order.items.slice(0, 5).map((item, idx) => (
                <p key={idx} className="text-gray-700 truncate">
                  • {item.name} {item.quantity > 1 ? `×${item.quantity}` : ''}
                </p>
              ))}
              {order.items.length > 5 && (
                <p className="text-gray-500 text-[9px]">+{order.items.length - 5} أصناف أخرى</p>
              )}
            </div>
          )}
          
          {/* ربح السائق من التوصيل */}
          {(order.driver_earnings || order.driver_delivery_fee || order.delivery_fee) ? (
            <div className="bg-green-50 rounded p-1.5 mb-2">
              <p className="text-green-700 font-bold text-xs text-center">
                💵 ربحك: {(order.driver_earnings || order.driver_delivery_fee || order.delivery_fee || 0).toLocaleString()} ل.س
              </p>
            </div>
          ) : null}
          
          {/* زر قبول الطلب - للطلبات المتاحة فقط */}
          {(marker.type === 'food-store' || marker.type === 'product-store') && !marker.isMyOrder && (
            <button
              onClick={() => {
                if (marker.type === 'food-store') {
                  onAcceptFoodOrder?.(order);
                } else {
                  onAcceptOrder?.(order);
                }
              }}
              data-testid="accept-order-from-map-btn"
              className="w-full py-1.5 bg-green-500 hover:bg-green-600 text-white rounded text-[10px] font-bold mb-1 transition-colors"
            >
              ✅ قبول الطلب
            </button>
          )}
          
          {/* أزرار لطلباتي المقبولة */}
          {(marker.type === 'food-store' || marker.type === 'product-store') && marker.isMyOrder && (
            <div className="space-y-1">
              <button
                onClick={() => {
                  const storeCoords = marker.position;
                  if (storeCoords) {
                    window.open(`https://www.google.com/maps/dir/?api=1&destination=${storeCoords[0]},${storeCoords[1]}&travelmode=driving`, '_blank');
                  }
                }}
                data-testid="navigate-to-store-btn"
                className="w-full py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-[10px] font-bold transition-colors"
              >
                🗺️ التنقل للمتجر
              </button>
              <p className="text-[9px] text-center text-green-400">✓ طلب مقبول</p>
            </div>
          )}
          
          {/* زر عرض المسار - للعملاء */}
          {marker.type === 'customer' && marker.isMyOrder && onShowRoute && (
            <button
              onClick={() => onShowRoute(order)}
              data-testid="show-route-btn"
              className="w-full py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded text-[10px] font-bold mt-1 transition-colors"
            >
              🛣️ عرض المسار
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default MarkerPopupContent;
