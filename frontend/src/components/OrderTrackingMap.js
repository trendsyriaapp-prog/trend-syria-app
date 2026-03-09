// /app/frontend/src/components/OrderTrackingMap.js
// خريطة تتبع الطلب

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Navigation, Phone, Clock, Package, Truck, CheckCircle, X } from 'lucide-react';

const OrderTrackingMap = ({ order, deliveryLocation, onClose }) => {
  const [mapLoaded, setMapLoaded] = useState(false);
  
  // محاكاة موقع السائق (في الواقع سيأتي من GPS حقيقي)
  const [driverLocation, setDriverLocation] = useState({
    lat: 33.5138,
    lng: 36.2765
  });

  // فتح Google Maps للتنقل
  const openGoogleMaps = () => {
    const destination = deliveryLocation || order?.delivery_address;
    if (destination) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
      window.open(url, '_blank');
    }
  };

  // حالات الطلب
  const orderStatuses = [
    { key: 'pending', label: 'قيد الانتظار', icon: Clock, color: 'text-yellow-500' },
    { key: 'confirmed', label: 'تم التأكيد', icon: CheckCircle, color: 'text-blue-500' },
    { key: 'preparing', label: 'جارٍ التحضير', icon: Package, color: 'text-orange-500' },
    { key: 'on_way', label: 'في الطريق', icon: Truck, color: 'text-purple-500' },
    { key: 'delivered', label: 'تم التسليم', icon: CheckCircle, color: 'text-green-500' },
  ];

  const currentStatusIndex = orderStatuses.findIndex(s => s.key === order?.status) || 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl w-full max-w-lg max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Navigation size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">تتبع الطلب</h3>
              <p className="text-xs text-gray-500">#{order?.id?.slice(0, 8)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Map Placeholder */}
        <div className="h-48 bg-gradient-to-br from-blue-100 to-indigo-100 relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <MapPin size={48} className="text-blue-500 mx-auto mb-2" />
              <p className="text-sm text-gray-600">الخريطة التفاعلية</p>
              <button
                onClick={openGoogleMaps}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-bold hover:bg-blue-600 transition-colors"
              >
                فتح في Google Maps
              </button>
            </div>
          </div>
          
          {/* Driver marker simulation */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-4 h-4 bg-orange-500 rounded-full animate-ping absolute" />
            <div className="w-4 h-4 bg-orange-500 rounded-full relative" />
          </div>
        </div>

        {/* Order Status Timeline */}
        <div className="p-4">
          <h4 className="font-bold text-gray-900 mb-4">حالة الطلب</h4>
          <div className="relative">
            {orderStatuses.map((status, index) => {
              const Icon = status.icon;
              const isCompleted = index <= currentStatusIndex;
              const isCurrent = index === currentStatusIndex;
              
              return (
                <div key={status.key} className="flex items-start gap-3 mb-4 last:mb-0">
                  {/* Timeline line */}
                  {index < orderStatuses.length - 1 && (
                    <div className={`absolute right-[18px] w-0.5 h-8 top-[28px] ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-200'
                    }`} style={{ top: `${index * 48 + 28}px` }} />
                  )}
                  
                  {/* Icon */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center z-10 ${
                    isCompleted 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-100 text-gray-400'
                  } ${isCurrent ? 'ring-4 ring-green-100' : ''}`}>
                    <Icon size={18} />
                  </div>
                  
                  {/* Label */}
                  <div className="flex-1">
                    <p className={`font-medium ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                      {status.label}
                    </p>
                    {isCurrent && (
                      <p className="text-xs text-green-500">الحالة الحالية</p>
                    )}
                  </div>
                  
                  {/* Checkmark */}
                  {isCompleted && !isCurrent && (
                    <CheckCircle size={18} className="text-green-500" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Driver Info */}
        {order?.driver && (
          <div className="p-4 border-t border-gray-100">
            <h4 className="font-bold text-gray-900 mb-3">معلومات السائق</h4>
            <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {order.driver.name?.[0] || 'س'}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{order.driver.name || 'السائق'}</p>
                  <p className="text-xs text-gray-500">{order.driver.vehicle || 'دراجة نارية'}</p>
                </div>
              </div>
              <a
                href={`tel:${order.driver.phone}`}
                className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center"
              >
                <Phone size={18} className="text-white" />
              </a>
            </div>
          </div>
        )}

        {/* Delivery Address */}
        <div className="p-4 border-t border-gray-100">
          <h4 className="font-bold text-gray-900 mb-2">عنوان التوصيل</h4>
          <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
            <MapPin size={20} className="text-orange-500 mt-0.5" />
            <p className="text-sm text-gray-700">
              {order?.delivery_address || order?.address || 'لم يتم تحديد العنوان'}
            </p>
          </div>
        </div>

        {/* Open in Maps Button */}
        <div className="p-4">
          <button
            onClick={openGoogleMaps}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <Navigation size={18} />
            فتح في Google Maps
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default OrderTrackingMap;
