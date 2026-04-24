// /app/frontend/src/components/delivery/orders-map/MapHelpers.js
// دوال المساعدة للخريطة

import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/**
 * مكون لتحديث مركز الخريطة تلقائياً
 */
export const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 13);
    }
  }, [center, zoom, map]);
  return null;
};

/**
 * حساب المسافة بين نقطتين بالكيلومتر (معادلة Haversine)
 * @param {number} lat1 - خط العرض للنقطة الأولى
 * @param {number} lon1 - خط الطول للنقطة الأولى
 * @param {number} lat2 - خط العرض للنقطة الثانية
 * @param {number} lon2 - خط الطول للنقطة الثانية
 * @returns {number} المسافة بالكيلومتر
 */
export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // نصف قطر الأرض بالكيلومتر
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

/**
 * حساب المسافة من نقطة لأقرب نقطة على المسار
 * @param {Object} location - الموقع الحالي {latitude, longitude}
 * @param {Array} routePoints - نقاط المسار [[lat, lng], ...]
 * @returns {number} أقل مسافة بالكيلومتر
 */
export const calculateDistanceFromRoute = (location, routePoints) => {
  if (!routePoints || routePoints.length === 0) return 0;
  
  let minDistance = Infinity;
  for (const point of routePoints) {
    const dist = calculateDistanceKm(
      location.latitude, location.longitude,
      point[0], point[1]
    );
    if (dist < minDistance) {
      minDistance = dist;
    }
  }
  return minDistance;
};

/**
 * تحويل وقت بالدقائق لصيغة مقروءة
 * @param {number} minutes - الوقت بالدقائق
 * @returns {string} النص المقروء
 */
export const formatDuration = (minutes) => {
  if (minutes < 60) {
    return `${minutes} دقيقة`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return `${hours} ساعة`;
  }
  return `${hours} ساعة و ${mins} دقيقة`;
};

/**
 * تحويل مسافة بالكيلومتر لصيغة مقروءة
 * @param {number} km - المسافة بالكيلومتر
 * @returns {string} النص المقروء
 */
export const formatDistance = (km) => {
  if (km < 1) {
    return `${Math.round(km * 1000)} متر`;
  }
  return `${km.toFixed(1)} كم`;
};

/**
 * حساب الاتجاه بين نقطتين
 * @param {number} lat1 - خط العرض للنقطة الأولى
 * @param {number} lon1 - خط الطول للنقطة الأولى
 * @param {number} lat2 - خط العرض للنقطة الثانية
 * @param {number} lon2 - خط الطول للنقطة الثانية
 * @returns {string} الاتجاه (شمال، جنوب، شرق، غرب، الخ)
 */
export const calculateBearing = (lat1, lon1, lat2, lon2) => {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const lat1Rad = lat1 * Math.PI / 180;
  const lat2Rad = lat2 * Math.PI / 180;
  
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
            Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  
  let bearing = Math.atan2(y, x) * 180 / Math.PI;
  bearing = (bearing + 360) % 360;
  
  // تحويل للاتجاه باللغة العربية
  if (bearing >= 337.5 || bearing < 22.5) return 'شمالاً';
  if (bearing >= 22.5 && bearing < 67.5) return 'شمال شرق';
  if (bearing >= 67.5 && bearing < 112.5) return 'شرقاً';
  if (bearing >= 112.5 && bearing < 157.5) return 'جنوب شرق';
  if (bearing >= 157.5 && bearing < 202.5) return 'جنوباً';
  if (bearing >= 202.5 && bearing < 247.5) return 'جنوب غرب';
  if (bearing >= 247.5 && bearing < 292.5) return 'غرباً';
  return 'شمال غرب';
};

/**
 * التحقق من صحة الإحداثيات
 * @param {number} lat - خط العرض
 * @param {number} lng - خط الطول
 * @returns {boolean} هل الإحداثيات صحيحة
 */
export const isValidCoordinate = (lat, lng) => {
  return lat !== null && 
         lng !== null && 
         !isNaN(lat) && 
         !isNaN(lng) &&
         lat >= -90 && lat <= 90 &&
         lng >= -180 && lng <= 180;
};

/**
 * فك ترميز Polyline من Google
 * @param {string} encoded - السلسلة المشفرة
 * @returns {Array} مصفوفة الإحداثيات [[lat, lng], ...]
 */
export const decodePolyline = (encoded) => {
  if (!encoded) return [];
  
  const points = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }

  return points;
};

/**
 * جلب ربح السائق من الـ API
 * @param {Object} params - الإحداثيات
 * @param {number} params.storeLat - خط عرض المتجر
 * @param {number} params.storeLon - خط طول المتجر
 * @param {number} params.customerLat - خط عرض العميل
 * @param {number} params.customerLon - خط طول العميل
 * @param {number} params.driverLat - خط عرض السائق (اختياري)
 * @param {number} params.driverLon - خط طول السائق (اختياري)
 * @returns {Promise<number>} ربح السائق
 */
export const fetchDriverEarnings = async (params, API) => {
  try {
    const { storeLat, storeLon, customerLat, customerLon, driverLat, driverLon } = params;
    const queryParams = {
      store_lat: storeLat,
      store_lon: storeLon,
      customer_lat: customerLat,
      customer_lon: customerLon
    };
    
    // إضافة موقع السائق إذا كان متاحاً
    if (driverLat !== undefined && driverLon !== undefined) {
      queryParams.driver_lat = driverLat;
      queryParams.driver_lon = driverLon;
    }
    
    const response = await fetch(`${API}/api/shipping/calculate-driver-earnings?${new URLSearchParams(queryParams)}`);
    if (response.ok) {
      const data = await response.json();
      return data.earnings || 0;
    }
    return 0;
  } catch (error) {
    console.error('Error fetching driver earnings:', error);
    return 0;
  }
};

/**
 * جلب مسار واحد من OSRM وإرجاع الإحداثيات
 * @param {Array} points - مصفوفة النقاط [[lat, lon], ...]
 * @returns {Promise<Object>} - {coordinates, distance, duration}
 */
export const fetchSingleRoute = async (points) => {
  try {
    const coordsStr = points.map(p => `${p[1]},${p[0]}`).join(';');
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`
    );
    if (response.ok) {
      const data = await response.json();
      if (data.routes && data.routes[0]) {
        return {
          coordinates: data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]),
          distance: data.routes[0].distance,
          duration: data.routes[0].duration
        };
      }
    }
  } catch (error) {
    console.error('Error fetching route segment:', error);
  }
  // خط مستقيم كبديل
  return { coordinates: points, distance: 0, duration: 0 };
};

/**
 * جلب المسار المُحسَّن باستخدام OSRM Trip API
 * @param {Array} points - مصفوفة النقاط مع position [{position: [lat, lon]}, ...]
 * @returns {Promise<Object|null>} - {optimizedOrder, geometry, distance, duration, legs}
 */
export const fetchOptimizedRoute = async (points) => {
  try {
    const coordsStr = points.map(p => `${p.position[1]},${p.position[0]}`).join(';');
    const response = await fetch(
      `https://router.project-osrm.org/trip/v1/driving/${coordsStr}?overview=full&geometries=geojson&source=first&roundtrip=false`
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.trips && data.trips[0] && data.waypoints) {
        const optimizedOrder = data.waypoints.map(wp => wp.waypoint_index);
        const trip = data.trips[0];
        
        return {
          optimizedOrder,
          geometry: trip.geometry.coordinates.map(c => [c[1], c[0]]),
          distance: trip.distance,
          duration: trip.duration,
          legs: trip.legs
        };
      }
    }
  } catch (error) {
    console.error('Error fetching optimized route:', error);
  }
  return null;
};
