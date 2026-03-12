// /app/frontend/src/components/delivery/LocationTracker.js
// مكون لتحديث موقع السائق GPS

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { MapPin, Navigation, Power, PowerOff, Loader2 } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const LocationTracker = () => {
  const { toast } = useToast();
  const [tracking, setTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const watchIdRef = useRef(null);

  // إرسال الموقع للسيرفر
  const sendLocation = useCallback(async (position) => {
    try {
      const locationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        heading: position.coords.heading,
        speed: position.coords.speed ? position.coords.speed * 3.6 : null // تحويل من م/ث إلى كم/س
      };

      setCurrentLocation(locationData);

      await axios.post(`${API}/api/delivery/location/update`, locationData);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('Error sending location:', err);
      setError('فشل في إرسال الموقع');
    }
  }, []);

  // معالجة أخطاء GPS
  const handleError = useCallback((err) => {
    console.error('Geolocation error:', err);
    let message = 'خطأ في تحديد الموقع';
    
    switch (err.code) {
      case err.PERMISSION_DENIED:
        message = 'يرجى السماح بالوصول للموقع';
        break;
      case err.POSITION_UNAVAILABLE:
        message = 'الموقع غير متاح';
        break;
      case err.TIMEOUT:
        message = 'انتهت مهلة تحديد الموقع';
        break;
      default:
        message = 'خطأ غير معروف';
    }
    
    setError(message);
    toast({
      title: 'خطأ في الموقع',
      description: message,
      variant: 'destructive'
    });
  }, [toast]);

  // بدء تتبع الموقع
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError('متصفحك لا يدعم تحديد الموقع');
      return;
    }

    setTracking(true);
    setError(null);

    // خيارات GPS عالية الدقة
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    // تتبع مستمر للموقع
    watchIdRef.current = navigator.geolocation.watchPosition(
      sendLocation,
      handleError,
      options
    );

    toast({
      title: 'تم تفعيل تتبع الموقع',
      description: 'يتم إرسال موقعك للعملاء الآن'
    });
  }, [sendLocation, handleError, toast]);

  // إيقاف تتبع الموقع
  const stopTracking = useCallback(async () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setTracking(false);
    setCurrentLocation(null);

    // حذف الموقع من السيرفر
    try {
      await axios.delete(`${API}/api/delivery/location`);
    } catch (err) {
      console.error('Error clearing location:', err);
    }

    toast({
      title: 'تم إيقاف تتبع الموقع',
      description: 'لن يتمكن العملاء من رؤية موقعك'
    });
  }, [toast]);

  // تنظيف عند unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // تنسيق الوقت
  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString('ar-SY', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            tracking ? 'bg-orange-500' : 'bg-gray-200'
          }`}>
            {tracking ? (
              <Navigation size={20} className="text-white animate-pulse" />
            ) : (
              <MapPin size={20} className="text-gray-500" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-gray-900">تتبع الموقع</h3>
            <p className="text-xs text-gray-500">
              {tracking ? 'يتم مشاركة موقعك' : 'الموقع غير مفعّل'}
            </p>
          </div>
        </div>
        
        {/* زر التفعيل/الإيقاف */}
        <button
          onClick={tracking ? stopTracking : startTracking}
          className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 transition-colors ${
            tracking 
              ? 'bg-red-100 text-red-600 hover:bg-red-200' 
              : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
          }`}
        >
          {tracking ? (
            <>
              <PowerOff size={16} />
              إيقاف
            </>
          ) : (
            <>
              <Power size={16} />
              تفعيل
            </>
          )}
        </button>
      </div>

      {/* حالة الموقع */}
      {tracking && (
        <div className="bg-gray-50 rounded-xl p-3 space-y-2">
          {currentLocation ? (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">الإحداثيات:</span>
                <span className="font-mono text-gray-800">
                  {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                </span>
              </div>
              
              {currentLocation.speed && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">السرعة:</span>
                  <span className="font-bold text-[#FF6B00]">
                    {Math.round(currentLocation.speed)} كم/س
                  </span>
                </div>
              )}
              
              {lastUpdate && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">آخر تحديث:</span>
                  <span className="text-orange-600 flex items-center gap-1">
                    <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                    {formatTime(lastUpdate)}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center gap-2 py-2">
              <Loader2 size={16} className="animate-spin text-gray-400" />
              <span className="text-gray-500 text-sm">جاري تحديد الموقع...</span>
            </div>
          )}
        </div>
      )}

      {/* رسالة الخطأ */}
      {error && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* تعليمات */}
      {!tracking && (
        <p className="text-xs text-gray-500 mt-3">
          💡 فعّل تتبع الموقع ليتمكن العملاء من رؤية موقعك أثناء التوصيل
        </p>
      )}
    </div>
  );
};

export default LocationTracker;
