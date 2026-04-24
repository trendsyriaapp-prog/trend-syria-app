// /app/frontend/src/components/delivery/map/MapHelpers.js
// دوال مساعدة للخريطة

// إحداثيات دمشق كافتراضي
export const DEFAULT_CENTER = [33.5138, 36.2765];

// حساب المسافة بين نقطتين بالكيلومتر
export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// حساب المسافة من نقطة إلى خط المسار
export const calculateDistanceFromRoute = (location, routePoints) => {
  if (!routePoints || routePoints.length < 2) return Infinity;
  
  let minDistance = Infinity;
  for (let i = 0; i < routePoints.length - 1; i++) {
    const distance = pointToLineDistance(
      location,
      routePoints[i],
      routePoints[i + 1]
    );
    minDistance = Math.min(minDistance, distance);
  }
  return minDistance;
};

// حساب المسافة من نقطة إلى خط
const pointToLineDistance = (point, lineStart, lineEnd) => {
  const [px, py] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;
  
  const dx = x2 - x1;
  const dy = y2 - y1;
  
  if (dx === 0 && dy === 0) {
    return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  }
  
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  const nearestX = x1 + t * dx;
  const nearestY = y1 + t * dy;
  
  return Math.sqrt((px - nearestX) ** 2 + (py - nearestY) ** 2) * 111;
};

// استخراج إحداثيات الطلب
export const getOrderCoordinates = (order) => {
  if (!order) return null;
  
  // محاولة من حقول متعددة
  const lat = order.latitude || order.delivery_latitude || 
    (order.delivery_address?.lat) || (order.delivery_address?.latitude);
  const lng = order.longitude || order.delivery_longitude || 
    (order.delivery_address?.lng) || (order.delivery_address?.lon) || 
    (order.delivery_address?.longitude);
  
  if (lat && lng) {
    return [parseFloat(lat), parseFloat(lng)];
  }
  return null;
};

// استخراج إحداثيات المتجر
export const getStoreCoordinates = (order) => {
  if (!order) return null;
  
  const lat = order.store_latitude || 
    (order.store_location?.latitude) || 
    (order.store?.latitude);
  const lng = order.store_longitude || 
    (order.store_location?.longitude) || 
    (order.store?.longitude);
  
  if (lat && lng) {
    return [parseFloat(lat), parseFloat(lng)];
  }
  return null;
};

// تحديد نوع الطلب
export const getOrderType = (order) => {
  if (!order) return 'unknown';
  return order.order_type || (order.store_id ? 'food' : 'product');
};

// تنسيق المسافة
export const formatDistance = (km) => {
  if (km < 1) {
    return `${Math.round(km * 1000)} م`;
  }
  return `${km.toFixed(1)} كم`;
};

// تنسيق الوقت المتوقع
export const formatETA = (minutes) => {
  if (minutes < 1) return 'أقل من دقيقة';
  if (minutes < 60) return `${Math.round(minutes)} دقيقة`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return `${hours} ساعة ${mins > 0 ? `و ${mins} دقيقة` : ''}`;
};

// حساب ETA بناءً على المسافة
export const calculateETA = (distanceKm, avgSpeedKmh = 25) => {
  return (distanceKm / avgSpeedKmh) * 60;
};
