import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Navigation, MapPin, Clock, Truck } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// إصلاح أيقونات Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// أيقونات مخصصة
const storeIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="background: linear-gradient(135deg, #22c55e, #16a34a); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
    <span style="font-size: 20px;">🏪</span>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const customerIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="background: linear-gradient(135deg, #f59e0b, #d97706); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
    <span style="font-size: 20px;">🏠</span>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// مكون لتحريك الخريطة
const FitBoundsComponent = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length >= 2) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, bounds]);
  return null;
};

// جلب المسار من OSRM
const fetchRoute = async (from, to) => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.routes && data.routes[0]) {
      const route = data.routes[0];
      return {
        coordinates: route.geometry.coordinates.map(coord => [coord[1], coord[0]]),
        distance: route.distance,
        duration: route.duration
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching route:', error);
    return null;
  }
};

const RouteMapModal = ({ order, orderType, onClose, theme = 'dark' }) => {
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const isDark = theme === 'dark';
  
  // استخراج إحداثيات المتجر والعميل
  const storeCoords = orderType === 'food' 
    ? [order.store_latitude, order.store_longitude]
    : [order.seller_addresses?.[0]?.latitude, order.seller_addresses?.[0]?.longitude];
    
  const customerCoords = [
    order.latitude || order.buyer_address?.latitude,
    order.longitude || order.buyer_address?.longitude
  ];
  
  const hasValidCoords = storeCoords[0] && storeCoords[1] && customerCoords[0] && customerCoords[1];
  
  // جلب المسار عند فتح النافذة
  useEffect(() => {
    const loadRoute = async () => {
      if (!hasValidCoords) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      const route = await fetchRoute(storeCoords, customerCoords);
      
      if (route) {
        setRouteCoordinates(route.coordinates);
        setRouteInfo({
          distance: (route.distance / 1000).toFixed(1),
          duration: Math.round(route.duration / 60)
        });
      } else {
        // Fallback: خط مستقيم
        setRouteCoordinates([storeCoords, customerCoords]);
        setRouteInfo(null);
      }
      setLoading(false);
    };
    
    loadRoute();
  }, [order.id]);
  
  const bounds = hasValidCoords ? [storeCoords, customerCoords] : null;
  const center = hasValidCoords 
    ? [(storeCoords[0] + customerCoords[0]) / 2, (storeCoords[1] + customerCoords[1]) / 2]
    : [33.5138, 36.2765]; // دمشق
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl ${
            isDark ? 'bg-[#1a1a1a]' : 'bg-white'
          }`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b ${
            isDark ? 'border-[#333] bg-[#252525]' : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${orderType === 'food' ? 'bg-green-500' : 'bg-blue-500'}`}>
                {orderType === 'food' ? '🍔' : '📦'}
              </div>
              <div>
                <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  مسار الطلب
                </h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {order.store_name || order.seller_addresses?.[0]?.business_name || 'المتجر'} ← {order.buyer_address?.name || 'العميل'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl ${isDark ? 'hover:bg-[#333]' : 'hover:bg-gray-200'}`}
            >
              <X size={20} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
            </button>
          </div>
          
          {/* Route Info */}
          {routeInfo && (
            <div className={`grid grid-cols-2 gap-4 p-4 border-b ${
              isDark ? 'border-[#333] bg-[#1f1f1f]' : 'border-gray-200 bg-gray-50'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                  <Truck size={20} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                </div>
                <div>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>المسافة</p>
                  <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{routeInfo.distance} كم</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
                  <Clock size={20} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
                </div>
                <div>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>الوقت المتوقع</p>
                  <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{routeInfo.duration} دقيقة</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Map */}
          <div className="h-[400px] relative">
            {loading ? (
              <div className={`absolute inset-0 flex items-center justify-center ${
                isDark ? 'bg-[#1a1a1a]' : 'bg-gray-100'
              }`}>
                <div className="text-center">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>جاري تحميل المسار...</p>
                </div>
              </div>
            ) : !hasValidCoords ? (
              <div className={`absolute inset-0 flex items-center justify-center ${
                isDark ? 'bg-[#1a1a1a]' : 'bg-gray-100'
              }`}>
                <div className="text-center p-6">
                  <span className="text-4xl mb-3 block">📍</span>
                  <p className={`font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>لا توجد إحداثيات GPS</p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    هذا الطلب لا يحتوي على إحداثيات GPS صحيحة
                  </p>
                </div>
              </div>
            ) : (
              <MapContainer
                center={center}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url={isDark 
                    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  }
                />
                
                {bounds && <FitBoundsComponent bounds={bounds} />}
                
                {/* علامة المتجر */}
                <Marker position={storeCoords} icon={storeIcon}>
                  <Popup>
                    <div className="text-center p-2">
                      <p className="font-bold">🏪 {order.store_name || order.seller_addresses?.[0]?.business_name || 'المتجر'}</p>
                      <p className="text-sm text-gray-500">نقطة الاستلام</p>
                    </div>
                  </Popup>
                </Marker>
                
                {/* علامة العميل */}
                <Marker position={customerCoords} icon={customerIcon}>
                  <Popup>
                    <div className="text-center p-2">
                      <p className="font-bold">🏠 {order.buyer_address?.name || 'العميل'}</p>
                      <p className="text-sm text-gray-500">{order.buyer_address?.address}</p>
                    </div>
                  </Popup>
                </Marker>
                
                {/* المسار */}
                {routeCoordinates.length > 0 && (
                  <Polyline 
                    positions={routeCoordinates} 
                    color="#3b82f6"
                    weight={5}
                    opacity={0.8}
                  />
                )}
              </MapContainer>
            )}
          </div>
          
          {/* Footer - معلومات إضافية */}
          <div className={`p-4 border-t ${isDark ? 'border-[#333]' : 'border-gray-200'}`}>
            <div className="grid grid-cols-2 gap-4">
              {/* من */}
              <div className={`p-3 rounded-xl ${isDark ? 'bg-green-500/10' : 'bg-green-50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Navigation size={14} className="text-green-500" />
                  <span className={`text-xs font-bold ${isDark ? 'text-green-400' : 'text-green-700'}`}>من</span>
                </div>
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {order.store_name || order.seller_addresses?.[0]?.business_name || 'المتجر'}
                </p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {order.seller_addresses?.[0]?.city || order.buyer_address?.city}
                </p>
              </div>
              
              {/* إلى */}
              <div className={`p-3 rounded-xl ${isDark ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <MapPin size={14} className="text-amber-500" />
                  <span className={`text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>إلى</span>
                </div>
                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {order.buyer_address?.name || 'العميل'}
                </p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {order.buyer_address?.address}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default RouteMapModal;
