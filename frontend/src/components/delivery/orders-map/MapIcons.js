// /app/frontend/src/components/delivery/orders-map/MapIcons.js
// أيقونات الخريطة المخصصة للوضع الداكن

import L from 'leaflet';

// إصلاح مشكلة أيقونات Leaflet الافتراضية
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/**
 * إنشاء أيقونة مخصصة للخريطة
 * @param {string} color - لون الخلفية
 * @param {string} emoji - رمز الإيموجي
 * @param {number} size - حجم الأيقونة
 */
export const createIcon = (color, emoji, size = 44) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${size * 0.5}px;
      border: 4px solid white;
      box-shadow: 0 4px 15px rgba(0,0,0,0.5), 0 0 20px ${color}40;
      position: relative;
    ">${emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size],
    popupAnchor: [0, -size]
  });
};

/**
 * إنشاء أيقونة مرقمة للمحطات
 * @param {string} color - لون الخلفية
 * @param {number} number - رقم المحطة
 * @param {number} size - حجم الأيقونة
 */
export const createNumberedIcon = (color, number, size = 44) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${size * 0.45}px;
      font-weight: bold;
      color: white;
      border: 4px solid white;
      box-shadow: 0 4px 15px rgba(0,0,0,0.5), 0 0 20px ${color}40;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    ">${number}</div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size],
    popupAnchor: [0, -size]
  });
};

/**
 * إنشاء أيقونة مسار بسيطة مُرقمة
 * @param {string} color - لون الخلفية
 * @param {number} number - رقم النقطة
 */
export const createRoutePointIcon = (color, number) => {
  return L.divIcon({
    className: 'route-marker',
    html: `<div style="
      background: ${color};
      width: 30px;
      height: 30px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      border: 3px solid white;
      box-shadow: 0 2px 10px rgba(0,0,0,0.4);
      font-weight: bold;
      color: white;
    ">${number}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15]
  });
};

// الأيقونات الجاهزة - محسّنة للوضع الداكن
export const foodStoreIcon = createIcon('#22c55e', '🍔', 48); // أخضر ساطع - أكبر
export const productStoreIcon = createIcon('#3b82f6', '📦', 48); // أزرق ساطع
export const customerIcon = createIcon('#f59e0b', '🏠', 44); // أصفر/برتقالي للعميل
export const driverIcon = createIcon('#ffffff', '🏍️', 50); // أبيض للسائق - الأكبر

// أيقونات إضافية
export const pickupIcon = createIcon('#10b981', '📍', 40); // نقطة الاستلام
export const dropoffIcon = createIcon('#ef4444', '🎯', 40); // نقطة التسليم
export const warehouseIcon = createIcon('#6366f1', '🏭', 46); // المستودع
export const urgentIcon = createIcon('#f43f5e', '⚡', 48); // طلب عاجل

// ألوان المسارات
export const ROUTE_COLORS = {
  food: '#22c55e',       // أخضر للطعام
  product: '#3b82f6',    // أزرق للمنتجات
  active: '#f59e0b',     // برتقالي للمسار النشط
  completed: '#9ca3af',  // رمادي للمسارات المكتملة
};

// إحداثيات دمشق كافتراضي
export const DEFAULT_CENTER = [33.5138, 36.2765];
