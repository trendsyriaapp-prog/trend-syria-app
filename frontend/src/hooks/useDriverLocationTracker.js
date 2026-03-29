import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * Hook لتتبع موقع السائق تلقائياً
 * يُحدّث الموقع كل 10 ثواني عندما يكون السائق لديه طلب قيد التوصيل
 */
const useDriverLocationTracker = (isActive = false, currentOrderId = null) => {
  const [isTracking, setIsTracking] = useState(false);
  const [lastLocation, setLastLocation] = useState(null);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);
  const watchIdRef = useRef(null);

  // إرسال الموقع للخادم
  const sendLocationToServer = async (latitude, longitude, speed = null, heading = null) => {
    try {
      await axios.put(`${API}/api/delivery/location`, {
        latitude,
        longitude,
        speed,
        heading,
        order_id: currentOrderId
      });
      setLastLocation({ latitude, longitude, speed, timestamp: new Date() });
      setError(null);
      return true;
    } catch (err) {
      console.error('Error sending location:', err);
      setError('فشل في إرسال الموقع');
      return false;
    }
  };

  // الحصول على الموقع الحالي وإرساله
  const updateLocation = () => {
    if (!navigator.geolocation) {
      setError('المتصفح لا يدعم GPS');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, speed, heading } = position.coords;
        // تحويل السرعة من م/ث إلى كم/س
        const speedKmh = speed ? speed * 3.6 : null;
        sendLocationToServer(latitude, longitude, speedKmh, heading);
      },
      (err) => {
        console.error('Geolocation error:', err);
        if (err.code === 1) {
          setError('يرجى السماح بالوصول للموقع');
        } else {
          setError('فشل في تحديد الموقع');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // بدء التتبع
  const startTracking = () => {
    if (isTracking) return;
    
    setIsTracking(true);
    updateLocation(); // إرسال الموقع فوراً
    
    // تحديث كل 10 ثواني للتتبع الحي
    intervalRef.current = setInterval(updateLocation, 10000);
  };

  // إيقاف التتبع
  const stopTracking = () => {
    setIsTracking(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  // بدء/إيقاف التتبع بناءً على isActive
  useEffect(() => {
    if (isActive) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [isActive, currentOrderId]);

  return {
    isTracking,
    lastLocation,
    error,
    updateLocation, // للتحديث اليدوي إذا احتاج
    stopTracking
  };
};

export default useDriverLocationTracker;
