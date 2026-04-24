// /app/frontend/src/components/delivery/orders-map/hooks/useGPS.js
// Hook لإدارة موقع السائق GPS

import { useState, useCallback } from 'react';
import { DEFAULT_CENTER } from '../MapIcons';

/**
 * Hook لإدارة موقع GPS للسائق
 */
const useGPS = () => {
  const [currentDriverLocation, setCurrentDriverLocation] = useState(null);
  const [gpsRequested, setGpsRequested] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  // طلب موقع GPS الحالي
  const requestGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError('المتصفح لا يدعم تحديد الموقع');
      return;
    }

    setGpsRequested(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          speed: position.coords.speed,
          heading: position.coords.heading
        };
        setCurrentDriverLocation(location);
        setGpsRequested(false);
      },
      (error) => {
        let errorMessage = 'حدث خطأ في تحديد الموقع';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'تم رفض إذن الموقع. يرجى السماح بالوصول للموقع من إعدادات المتصفح';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'معلومات الموقع غير متوفرة حالياً';
            break;
          case error.TIMEOUT:
            errorMessage = 'انتهت مهلة طلب الموقع';
            break;
        }
        setGpsError(errorMessage);
        setGpsRequested(false);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  }, []);

  // الحصول على المركز (موقع السائق أو الافتراضي)
  const getMapCenter = useCallback((driverLocationProp) => {
    if (currentDriverLocation) {
      return [currentDriverLocation.latitude, currentDriverLocation.longitude];
    }
    if (driverLocationProp?.latitude) {
      return [driverLocationProp.latitude, driverLocationProp.longitude];
    }
    return DEFAULT_CENTER;
  }, [currentDriverLocation]);

  return {
    currentDriverLocation,
    setCurrentDriverLocation,
    gpsRequested,
    gpsError,
    setGpsError,
    requestGPS,
    getMapCenter
  };
};

export default useGPS;
