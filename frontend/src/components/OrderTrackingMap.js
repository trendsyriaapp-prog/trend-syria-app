// /app/frontend/src/components/OrderTrackingMap.js
// خريطة تتبع الطلب الحية

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  MapPin, Navigation, Phone, Clock, Package, Truck, 
  CheckCircle, X, RefreshCw, MapPinned, Loader2, 
  ChevronDown, ChevronUp, Star, Bike
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const OrderTrackingMap = ({ order, orderId, onClose, trackingData: externalTrackingData, userType, embedded = false }) => {
  const [trackingData, setTrackingData] = useState(externalTrackingData || null);
  const [loading, setLoading] = useState(!externalTrackingData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // جلب بيانات التتبع
  const fetchTrackingData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    
    try {
      const id = orderId || order?.id;
      if (!id) return;
      
      const res = await axios.get(`${API}/api/delivery/order-tracking/${id}/live`);
      setTrackingData(res.data);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching tracking:', err);
      if (!silent) setError('فشل في تحميل بيانات التتبع');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId, order?.id]);

  // جلب البيانات عند التحميل
  useEffect(() => {
    fetchTrackingData();
  }, [fetchTrackingData]);

  // تحديث تلقائي كل 10 ثواني عندما يكون الطلب في حالة التوصيل
  useEffect(() => {
    if (trackingData?.status && ['out_for_delivery', 'on_the_way', 'picked_up'].includes(trackingData.status)) {
      const interval = setInterval(() => {
        fetchTrackingData(true);
      }, 10000); // كل 10 ثواني
      
      return () => clearInterval(interval);
    }
  }, [trackingData?.status, fetchTrackingData]);

  // فتح Google Maps للتنقل
  const openGoogleMaps = () => {
    const destination = trackingData?.delivery_address;
    if (destination) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
      window.open(url, '_blank');
    }
  };

  // فتح موقع السائق في Google Maps
  const openDriverLocation = () => {
    const loc = trackingData?.driver_location;
    if (loc && loc.latitude && loc.longitude) {
      const url = `https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`;
      window.open(url, '_blank');
    }
  };

  // حالات الطلب
  const orderStatuses = [
    { key: 'pending', label: 'قيد الانتظار', icon: Clock },
    { key: 'confirmed', label: 'تم التأكيد', icon: CheckCircle },
    { key: 'preparing', label: 'جاري التحضير', icon: Package },
    { key: 'shipped', label: 'تم الشحن', icon: Truck },
    { key: 'picked_up', label: 'استلم السائق', icon: Bike },
    { key: 'out_for_delivery', label: 'في الطريق', icon: Truck },
    { key: 'on_the_way', label: 'في الطريق', icon: Navigation },
    { key: 'delivered', label: 'تم التسليم', icon: CheckCircle },
  ];

  const currentStatusIndex = orderStatuses.findIndex(
    s => s.key === trackingData?.status || s.key === order?.delivery_status
  );

  // تنسيق الوقت
  const formatTime = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('ar-SY', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && !embedded) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      >
        <div className="bg-white rounded-2xl p-6 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00]" />
          <p className="text-gray-600">جاري تحميل بيانات التتبع...</p>
        </div>
      </motion.div>
    );
  }

  // نسخة مضمنة في الصفحة
  if (embedded) {
    return (
      <div className="p-4">
        {/* معلومات السائق والموقع */}
        <div className="space-y-4">
          {/* موقع السائق */}
          {trackingData?.driver_location ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <Navigation size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-green-800">السائق في الطريق</p>
                    <p className="text-sm text-green-600">آخر تحديث: {lastUpdate ? formatTime(lastUpdate) : 'الآن'}</p>
                  </div>
                </div>
                <button
                  onClick={openDriverLocation}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2"
                >
                  <MapPin size={16} />
                  فتح الخريطة
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <Truck size={20} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-blue-800">السائق استلم الطلب</p>
                  <p className="text-sm text-blue-600">سيتم تحديث الموقع عند انطلاقه</p>
                </div>
              </div>
            </div>
          )}

          {/* زر فتح Google Maps للعنوان */}
          <button
            onClick={openGoogleMaps}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
          >
            <MapPinned size={18} />
            فتح عنوان التوصيل في الخريطة
          </button>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
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
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-t-3xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Navigation size={20} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">تتبع الطلب الحي</h3>
                <p className="text-xs text-gray-500">#{(orderId || order?.id)?.slice(0, 8)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* زر التحديث */}
              <button
                onClick={() => fetchTrackingData(true)}
                disabled={refreshing}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <RefreshCw size={16} className={`text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              {/* زر الإغلاق */}
              <button
                onClick={onClose}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
          </div>

          {/* المحتوى القابل للتمرير */}
          <div className="flex-1 overflow-y-auto">
            {error ? (
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <X size={32} className="text-red-500" />
                </div>
                <p className="text-gray-600">{error}</p>
                <button
                  onClick={() => fetchTrackingData()}
                  className="mt-4 px-4 py-2 bg-[#FF6B00] text-white rounded-lg"
                >
                  إعادة المحاولة
                </button>
              </div>
            ) : (
              <>
                {/* خريطة الموقع */}
                <div className="h-48 bg-gradient-to-br from-blue-50 to-indigo-100 relative overflow-hidden">
                  {/* خلفية الخريطة */}
                  <div className="absolute inset-0 opacity-30">
                    <div className="absolute inset-0" style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234F46E5' fill-opacity='0.2'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }} />
                  </div>
                  
                  {/* موقع السائق */}
                  {trackingData?.driver_location && !trackingData.driver_location.is_stale ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      {/* نقطة السائق المتحركة */}
                      <div className="relative">
                        <div className="w-6 h-6 bg-orange-500 rounded-full animate-ping absolute opacity-75" />
                        <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-red-500 rounded-full relative flex items-center justify-center shadow-lg">
                          <Bike size={14} className="text-white" />
                        </div>
                      </div>
                      
                      {/* معلومات الموقع */}
                      <div className="mt-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-md">
                        <p className="text-xs font-medium text-gray-700">السائق في الطريق</p>
                        {trackingData.estimated_time && (
                          <p className="text-sm font-bold text-[#FF6B00]">
                            {trackingData.estimated_time.text}
                          </p>
                        )}
                        {trackingData.driver_location.speed && (
                          <p className="text-xs text-gray-500">
                            السرعة: {Math.round(trackingData.driver_location.speed)} كم/س
                          </p>
                        )}
                      </div>
                      
                      {/* زر فتح الموقع */}
                      <button
                        onClick={openDriverLocation}
                        className="mt-2 px-3 py-1.5 bg-blue-500 text-white rounded-full text-xs font-medium hover:bg-blue-600 transition-colors flex items-center gap-1"
                      >
                        <MapPinned size={12} />
                        رؤية الموقع الدقيق
                      </button>
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-white/80 rounded-full flex items-center justify-center shadow-lg mb-3">
                        <MapPin size={32} className="text-blue-500" />
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {trackingData?.driver_location?.is_stale 
                          ? 'موقع السائق غير محدث'
                          : 'موقع السائق غير متاح حالياً'}
                      </p>
                      <button
                        onClick={openGoogleMaps}
                        className="px-4 py-2 bg-blue-500 text-white rounded-full text-sm font-bold hover:bg-blue-600 transition-colors"
                      >
                        فتح في Google Maps
                      </button>
                    </div>
                  )}
                  
                  {/* آخر تحديث */}
                  {lastUpdate && (
                    <div className="absolute bottom-2 left-2 bg-white/80 backdrop-blur-sm rounded-full px-2 py-1 text-xs text-gray-500">
                      آخر تحديث: {formatTime(lastUpdate)}
                    </div>
                  )}
                </div>

                {/* معلومات السائق */}
                {trackingData?.driver && (
                  <div className="p-4 border-b border-gray-100">
                    <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                      <Truck size={18} className="text-[#FF6B00]" />
                      موظف التوصيل
                    </h4>
                    <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {trackingData.driver.name?.[0] || 'س'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{trackingData.driver.name}</p>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Star size={12} className="text-yellow-500 fill-yellow-500" />
                            <span>{trackingData.driver.rating || '0'}</span>
                          </div>
                        </div>
                      </div>
                      <a
                        href={`tel:${trackingData.driver.phone}`}
                        className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition-colors"
                      >
                        <Phone size={18} className="text-white" />
                      </a>
                    </div>
                  </div>
                )}

                {/* حالة الطلب (قابلة للطي) */}
                <div className="p-4">
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="w-full flex items-center justify-between mb-3"
                  >
                    <h4 className="font-bold text-gray-900">حالة الطلب</h4>
                    {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                  
                  <AnimatePresence>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="relative">
                          {orderStatuses.slice(0, 6).map((status, index) => {
                            const Icon = status.icon;
                            const isCompleted = index <= currentStatusIndex;
                            const isCurrent = index === currentStatusIndex;
                            
                            return (
                              <div key={status.key} className="flex items-start gap-3 mb-4 last:mb-0">
                                {index < 5 && (
                                  <div 
                                    className={`absolute right-[18px] w-0.5 h-8 ${
                                      isCompleted ? 'bg-green-500' : 'bg-gray-200'
                                    }`} 
                                    style={{ top: `${index * 48 + 28}px` }} 
                                  />
                                )}
                                
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center z-10 ${
                                  isCompleted 
                                    ? 'bg-green-500 text-white' 
                                    : 'bg-gray-100 text-gray-400'
                                } ${isCurrent ? 'ring-4 ring-green-100' : ''}`}>
                                  <Icon size={18} />
                                </div>
                                
                                <div className="flex-1">
                                  <p className={`font-medium ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                                    {status.label}
                                  </p>
                                  {isCurrent && (
                                    <p className="text-xs text-green-500">الحالة الحالية</p>
                                  )}
                                </div>
                                
                                {isCompleted && !isCurrent && (
                                  <CheckCircle size={18} className="text-green-500" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {/* عرض الحالة الحالية فقط عند الطي */}
                  {!expanded && currentStatusIndex >= 0 && (
                    <div className="flex items-center gap-3 bg-green-50 rounded-xl p-3">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white">
                        {(() => {
                          const CurrentIcon = orderStatuses[currentStatusIndex]?.icon || Clock;
                          return <CurrentIcon size={20} />;
                        })()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">
                          {orderStatuses[currentStatusIndex]?.label || 'قيد المعالجة'}
                        </p>
                        {trackingData?.estimated_time && (
                          <p className="text-sm text-green-600">
                            {trackingData.estimated_time.text}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* عنوان التوصيل */}
                <div className="p-4 border-t border-gray-100">
                  <h4 className="font-bold text-gray-900 mb-2">عنوان التوصيل</h4>
                  <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                    <MapPin size={20} className="text-orange-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-gray-700">
                        {trackingData?.delivery_address || order?.address || 'لم يتم تحديد العنوان'}
                      </p>
                      {trackingData?.delivery_city && (
                        <p className="text-xs text-gray-500 mt-1">{trackingData.delivery_city}</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* زر فتح الخريطة */}
          <div className="p-4 border-t border-gray-100 flex-shrink-0">
            <button
              onClick={openGoogleMaps}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Navigation size={18} />
              فتح في Google Maps
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OrderTrackingMap;
