// /app/frontend/src/components/SellerDriverTrackingMap.js
// مكون خريطة تتبع السائق للبائع

import { useState, useEffect, useRef } from 'react';
import logger from '../lib/logger';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import axios from 'axios';
import { Loader2, Navigation, MapPin, Clock, RefreshCw, User } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

const API = process.env.REACT_APP_BACKEND_URL;

// أيقونات مخصصة
const createIcon = (emoji, color) => {
  return new Icon({
    iconUrl: `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 50">
        <path d="M20 0 C8.954 0 0 8.954 0 20 C0 35 20 50 20 50 S40 35 40 20 C40 8.954 31.046 0 20 0Z" fill="${color}"/>
        <circle cx="20" cy="18" r="12" fill="white"/>
        <text x="20" y="23" font-size="14" text-anchor="middle">${emoji}</text>
      </svg>
    `)}`,
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -40]
  });
};

const driverIcon = createIcon('🏍️', '#f97316');
const customerIcon = createIcon('🏠', '#22c55e');
const storeIcon = createIcon('🏪', '#3b82f6');

// مكون لإصلاح حجم الخريطة (يحل مشكلة الـ tiles المختفية)
const MapResizer = () => {
  const map = useMap();
  
  useEffect(() => {
    const timer1 = setTimeout(() => map.invalidateSize(), 100);
    const timer2 = setTimeout(() => map.invalidateSize(), 300);
    const timer3 = setTimeout(() => map.invalidateSize(), 500);
    
    const handleResize = () => map.invalidateSize();
    window.addEventListener('resize', handleResize);
    
    map.on('zoomend', () => setTimeout(() => map.invalidateSize(), 100));
    map.on('moveend', () => setTimeout(() => map.invalidateSize(), 100));
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);
  
  return null;
};

/**
 * مكون خريطة تتبع السائق للبائع - نسخة مصغرة
 */
const SellerDriverTrackingMap = ({ orderId, token, driverName }) => {
  const [loading, setLoading] = useState(true);
  const [locationData, setLocationData] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // جلب موقع السائق
  const fetchDriverLocation = async () => {
    if (!token || !orderId) {
      setLoading(false);
      return;
    }
    try {
      const res = await axios.get(`${API}/api/delivery/location/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLocationData(res.data);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      logger.error('Error fetching driver location:', err);
      setError('فشل في جلب موقع السائق');
    } finally {
      setLoading(false);
    }
  };

  // جلب الموقع عند التحميل وكل 10 ثواني
  useEffect(() => {
    fetchDriverLocation();
    const interval = setInterval(fetchDriverLocation, 10000);
    return () => clearInterval(interval);
  }, [orderId, token]);

  // حساب المسافة بين نقطتين
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // حساب الوقت المتوقع للوصول
  const estimateArrivalTime = (distance) => {
    const timeInHours = distance / 30;
    return Math.ceil(timeInHours * 60);
  };

  if (loading) {
    return (
      <div className="bg-purple-50 rounded-lg p-3 flex items-center justify-center gap-2">
        <Loader2 className="animate-spin text-purple-500" size={16} />
        <span className="text-purple-600 text-sm">جاري تحميل موقع السائق...</span>
      </div>
    );
  }

  // إذا لم يكن هناك موقع للسائق
  if (!locationData?.driver_latitude) {
    return (
      <div className="bg-purple-50 rounded-lg p-3 text-center">
        <Navigation size={20} className="text-purple-500 mx-auto mb-1" />
        <p className="text-purple-600 text-sm">🏍️ {driverName} في الطريق للعميل</p>
        <p className="text-purple-500 text-xs">جاري تحديث الموقع...</p>
      </div>
    );
  }

  const driverPos = [locationData.driver_latitude, locationData.driver_longitude];
  const customerPos = locationData.customer_latitude && locationData.customer_longitude 
    ? [locationData.customer_latitude, locationData.customer_longitude]
    : null;

  // حساب المسافة والوقت
  let distance = null;
  let estimatedTime = null;
  if (customerPos) {
    distance = calculateDistance(
      locationData.driver_latitude, locationData.driver_longitude,
      locationData.customer_latitude, locationData.customer_longitude
    );
    estimatedTime = estimateArrivalTime(distance);
  }

  // مركز الخريطة
  const center = customerPos 
    ? [(driverPos[0] + customerPos[0]) / 2, (driverPos[1] + customerPos[1]) / 2]
    : driverPos;

  return (
    <div className="bg-white rounded-lg border border-purple-200 overflow-hidden mt-3">
      {/* Header */}
      <div className="p-2 bg-gradient-to-l from-purple-500 to-purple-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation size={14} />
          <span className="text-xs font-bold">تتبع التوصيل</span>
        </div>
        <button
          onClick={fetchDriverLocation}
          className="p-1 bg-white/20 rounded-full hover:bg-white/30"
          title="تحديث"
          data-testid="refresh-seller-tracking"
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {/* Stats */}
      {distance !== null && (
        <div className="p-2 bg-purple-50 flex items-center justify-around text-xs">
          <div className="flex items-center gap-1 text-purple-700">
            <MapPin size={12} />
            <span>{distance < 1 ? `${Math.round(distance * 1000)}م` : `${distance.toFixed(1)}كم`}</span>
          </div>
          <div className="flex items-center gap-1 text-purple-700">
            <Clock size={12} />
            <span>~{estimatedTime} د</span>
          </div>
          <div className="flex items-center gap-1 text-purple-700">
            <User size={12} />
            <span>للعميل</span>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="h-32">
        <MapContainer
          center={center}
          zoom={13}
          className="h-full w-full"
          zoomControl={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapResizer />
          
          {/* موقع السائق */}
          <Marker position={driverPos} icon={driverIcon}>
            <Popup>
              <span className="font-bold text-sm">🏍️ {driverName}</span>
            </Popup>
          </Marker>
          
          {/* موقع العميل */}
          {customerPos && (
            <Marker position={customerPos} icon={customerIcon}>
              <Popup>
                <span className="font-bold text-sm">🏠 العميل</span>
              </Popup>
            </Marker>
          )}
          
          {/* خط بين السائق والعميل */}
          {customerPos && (
            <Polyline
              positions={[driverPos, customerPos]}
              color="#a855f7"
              weight={2}
              dashArray="5, 5"
            />
          )}
        </MapContainer>
      </div>

      {/* Last Update */}
      {lastUpdate && (
        <div className="p-1 bg-gray-50 text-center">
          <p className="text-[10px] text-gray-400">
            آخر تحديث: {lastUpdate.toLocaleTimeString('ar-SA')}
          </p>
        </div>
      )}
    </div>
  );
};

export default SellerDriverTrackingMap;
