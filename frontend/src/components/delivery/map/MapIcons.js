// /app/frontend/src/components/delivery/map/MapIcons.js
// أيقونات الخريطة لصفحة الطلبات

import L from 'leaflet';

// إصلاح مشكلة أيقونات Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// إنشاء أيقونة مخصصة
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

// أيقونة مرقمة للمحطات
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

// أيقونات جاهزة
export const foodStoreIcon = createIcon('#22c55e', '🍔', 48);
export const productStoreIcon = createIcon('#3b82f6', '📦', 48);
export const customerIcon = createIcon('#f59e0b', '🏠', 44);
export const driverIcon = createIcon('#ffffff', '🏍️', 50);

// ألوان المحطات
export const STATION_COLORS = {
  pickup: '#22c55e',   // أخضر للاستلام
  delivery: '#f59e0b', // برتقالي للتسليم
  current: '#ef4444',  // أحمر للحالي
};
