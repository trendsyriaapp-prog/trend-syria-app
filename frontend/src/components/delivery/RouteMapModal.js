import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Navigation, MapPin, Clock, Truck, Locate } from 'lucide-react';
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
const driverIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.4);">
    <span style="font-size: 22px;">🚗</span>
  </div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

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

// جلب موقع السائق الحالي
const getDriverLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve([position.coords.latitude, position.coords.longitude]);
      },
      (error) => {
        reject(error);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
};

const RouteMapModal = ({ order, orderType, onClose, theme = 'dark' }) => {
  const [driverCoords, setDriverCoords] = useState(null);
  const [driverToStoreRoute, setDriverToStoreRoute] = useState([]);
  const [storeToCustomerRoute, setStoreToCustomerRoute] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState(false);
  
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
  
  // جلب موقع السائق والمسارات عند فتح النافذة
  useEffect(() => {
    const loadRoutes = async () => {
      if (!hasValidCoords) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      
      // محاولة جلب موقع السائق
      let driverPosition = null;
      try {
        driverPosition = await getDriverLocation();
        setDriverCoords(driverPosition);
      } catch (error) {
        console.log('Could not get driver location:', error);
        setLocationError(true);
      }
      
      // جلب المسارات بشكل متوازي
      const routePromises = [];
      
      // المسار 1: السائق ← المتجر (إذا توفر موقع السائق)
      if (driverPosition) {
        routePromises.push(
          fetchRoute(driverPosition, storeCoords)
            .then(r => ({ type: 'driverToStore', route: r }))
            .catch(() => ({ type: 'driverToStore', route: null }))
        );
      }
      
      // المسار 2: المتجر ← العميل
      routePromises.push(
        fetchRoute(storeCoords, customerCoords)
          .then(r => ({ type: 'storeToCustomer', route: r }))
          .catch(() => ({ type: 'storeToCustomer', route: null }))
      );
      
      const results = await Promise.all(routePromises);
      
      let totalDistance = 0;
      let totalDuration = 0;
      let driverToStoreDistance = 0;
      let driverToStoreDuration = 0;
      let storeToCustomerDistance = 0;
      let storeToCustomerDuration = 0;
      
      results.forEach(({ type, route }) => {
        if (type === 'driverToStore' && route) {
          setDriverToStoreRoute(route.coordinates);
          driverToStoreDistance = route.distance;
          driverToStoreDuration = route.duration;
          totalDistance += route.distance;
          totalDuration += route.duration;
        } else if (type === 'storeToCustomer' && route) {
          setStoreToCustomerRoute(route.coordinates);
          storeToCustomerDistance = route.distance;
          storeToCustomerDuration = route.duration;
          totalDistance += route.distance;
          totalDuration += route.duration;
        } else if (type === 'storeToCustomer' && !route) {
          // Fallback: خط مستقيم
          setStoreToCustomerRoute([storeCoords, customerCoords]);
        }
      });
      
      setRouteInfo({
        totalDistance: (totalDistance / 1000).toFixed(1),
        totalDuration: Math.round(totalDuration / 60),
        driverToStore: {
          distance: (driverToStoreDistance / 1000).toFixed(1),
          duration: Math.round(driverToStoreDuration / 60)
        },
        storeToCustomer: {
          distance: (storeToCustomerDistance / 1000).toFixed(1),
          duration: Math.round(storeToCustomerDuration / 60)
        }
      });
      
      setLoading(false);
    };
    
    loadRoutes();
  }, [order.id]);
  
  // حساب bounds تشمل جميع النقاط
  const allPoints = [];
  if (driverCoords) allPoints.push(driverCoords);
  if (hasValidCoords) {
    allPoints.push(storeCoords);
    allPoints.push(customerCoords);
  }
  const bounds = allPoints.length >= 2 ? allPoints : null;
  const center = hasValidCoords 
    ? [(storeCoords[0] + customerCoords[0]) / 2, (storeCoords[1] + customerCoords[1]) / 2]
    : [33.5138, 36.2765]; // دمشق
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-4 pb-24 bg-black/60 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-2xl mx-4 rounded-2xl shadow-2xl ${
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
            <div className={`p-4 border-b ${
              isDark ? 'border-[#333] bg-[#1f1f1f]' : 'border-gray-200 bg-gray-50'
            }`}>
              {/* المسافة الكلية والوقت */}
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                    <Truck size={20} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>المسافة الكلية</p>
                    <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{routeInfo.totalDistance} كم</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
                    <Clock size={20} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
                  </div>
                  <div>
                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>الوقت الكلي</p>
                    <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{routeInfo.totalDuration} دقيقة</p>
                  </div>
                </div>
              </div>
              
              {/* تفاصيل المسار */}
              <div className={`flex items-center justify-between p-3 rounded-xl ${
                isDark ? 'bg-[#252525]' : 'bg-gray-100'
              }`}>
                {/* موقعك */}
                <div className="text-center flex-1">
                  <div className="text-2xl mb-1">🚗</div>
                  <p className={`text-xs font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>موقعك</p>
                  {locationError && (
                    <p className={`text-xs ${isDark ? 'text-red-400' : 'text-red-500'}`}>غير متاح</p>
                  )}
                </div>
                
                {/* سهم + مسافة للمتجر */}
                <div className="text-center px-2">
                  <p className={`text-xs font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                    {driverCoords ? `${routeInfo.driverToStore.distance} كم` : '---'}
                  </p>
                  <div className={`text-lg ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>→</div>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {driverCoords ? `${routeInfo.driverToStore.duration} د` : ''}
                  </p>
                </div>
                
                {/* المتجر */}
                <div className="text-center flex-1">
                  <div className="text-2xl mb-1">🏪</div>
                  <p className={`text-xs font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>المتجر</p>
                </div>
                
                {/* سهم + مسافة للعميل */}
                <div className="text-center px-2">
                  <p className={`text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                    {routeInfo.storeToCustomer.distance} كم
                  </p>
                  <div className={`text-lg ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>→</div>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    {routeInfo.storeToCustomer.duration} د
                  </p>
                </div>
                
                {/* العميل */}
                <div className="text-center flex-1">
                  <div className="text-2xl mb-1">🏠</div>
                  <p className={`text-xs font-bold ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>العميل</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Map */}
          <div className="h-[280px] relative">
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
                
                {/* علامة السائق */}
                {driverCoords && (
                  <Marker position={driverCoords} icon={driverIcon}>
                    <Popup>
                      <div className="text-center p-2">
                        <p className="font-bold">🚗 موقعك الحالي</p>
                        <p className="text-sm text-gray-500">نقطة البداية</p>
                      </div>
                    </Popup>
                  </Marker>
                )}
                
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
                
                {/* المسار من السائق للمتجر - أخضر */}
                {driverToStoreRoute.length > 0 && (
                  <Polyline 
                    positions={driverToStoreRoute} 
                    color="#22c55e"
                    weight={5}
                    opacity={0.8}
                    dashArray="10, 10"
                  />
                )}
                
                {/* المسار من المتجر للعميل - أزرق */}
                {storeToCustomerRoute.length > 0 && (
                  <Polyline 
                    positions={storeToCustomerRoute} 
                    color="#3b82f6"
                    weight={5}
                    opacity={0.8}
                  />
                )}
              </MapContainer>
            )}
          </div>
          
          {/* Footer - معلومات إضافية */}
          <div className={`p-4 pb-6 border-t ${isDark ? 'border-[#333]' : 'border-gray-200'}`}>
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
