// /app/frontend/src/pages/delivery/components/DriverRequestedOrderCard.js
// بطاقة طلب من نظام التنسيق (البائع طلب سائق)

import { Navigation, MapPin } from 'lucide-react';

const DriverRequestedOrderCard = ({
  order,
  currentTheme,
  processingOrderId,
  onAccept,
  onReject
}) => {
  return (
    <div 
      className={`rounded-xl p-4 border ${
        currentTheme === 'dark' ? 'bg-[#252525] border-[#333]' : 'bg-white border-orange-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`font-bold ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            #{order.order_number || order.id?.slice(0, 8)}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            currentTheme === 'dark' ? 'bg-orange-500/20 text-orange-400' : 'bg-orange-100 text-orange-700'
          }`}>
            طلب سائق
          </span>
        </div>
        <span className={`px-3 py-1 rounded-lg font-bold text-sm ${
          currentTheme === 'dark' ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
        }`}>
          {order.total?.toLocaleString()} ل.س
        </span>
      </div>
      
      {/* معلومات المتجر */}
      <div className={`rounded-lg p-3 mb-3 ${
        currentTheme === 'dark' ? 'bg-[#1a2e1a] border border-green-900' : 'bg-green-50 border border-green-200'
      }`}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 bg-green-500 rounded flex items-center justify-center">
            <Navigation size={12} className="text-white" />
          </div>
          <span className={`font-medium text-sm ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {order.store_name}
          </span>
        </div>
        {order.proximity_label && (
          <div className={`text-xs mt-2 ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            📍 {order.proximity_label} - {order.driver_distance_km} كم ({order.driver_eta_minutes} دقيقة)
          </div>
        )}
      </div>
      
      {/* معلومات العميل */}
      <div className={`rounded-lg p-3 mb-3 ${
        currentTheme === 'dark' ? 'bg-[#1a1a2e] border border-blue-900' : 'bg-blue-50 border border-blue-200'
      }`}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center">
            <MapPin size={12} className="text-white" />
          </div>
          <span className={`font-medium text-sm ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            {typeof order.delivery_address === 'object' 
              ? [order.delivery_address?.area, order.delivery_address?.street, order.delivery_address?.building].filter(Boolean).join(', ') || order.delivery_city
              : order.delivery_address}
          </span>
        </div>
        <p className={`text-xs ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          {order.customer_name} - {order.delivery_city}
        </p>
      </div>
      
      {/* أزرار القبول والرفض */}
      <div className="flex gap-2">
        <button
          onClick={() => onAccept(order)}
          disabled={processingOrderId === order.id}
          data-testid={`accept-driver-request-${order.id}`}
          className={`flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 ${processingOrderId === order.id ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {processingOrderId === order.id ? '⏳ جاري القبول...' : '✅ قبول التوصيل'}
        </button>
        <button
          onClick={() => onReject(order.id)}
          disabled={processingOrderId === order.id}
          data-testid={`reject-driver-request-${order.id}`}
          className={`px-4 py-3 rounded-xl font-bold text-sm ${
            currentTheme === 'dark' 
              ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
              : 'bg-red-50 text-red-600 border border-red-200'
          } ${processingOrderId === order.id ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          ❌
        </button>
      </div>
    </div>
  );
};

export default DriverRequestedOrderCard;
