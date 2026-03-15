// /app/frontend/src/components/delivery/MultiRouteOptimizer.js
// مكون تخطيط المسار الذكي لعدة طلبات

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Navigation, MapPin, Clock, Truck, Route, ArrowDown, CheckCircle, Sparkles, RotateCcw } from 'lucide-react';
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

// أيقونة السائق
const driverIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 4px solid white; box-shadow: 0 4px 15px rgba(0,0,0,0.4); z-index: 1000;">
    <span style="font-size: 24px;">🚗</span>
  </div>`,
  iconSize: [48, 48],
  iconAnchor: [24, 24],
});

// أيقونة المتجر (مع رقم)
const createStoreIcon = (number, isFood = false) => new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="position: relative;">
    <div style="background: ${isFood ? 'linear-gradient(135deg, #22c55e, #16a34a)' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)'}; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
      <span style="font-size: 18px;">${isFood ? '🍔' : '📦'}</span>
    </div>
    <div style="position: absolute; top: -8px; right: -8px; background: #FF6B00; color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 2px solid white;">
      ${number}
    </div>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// أيقونة العميل (مع رقم)
const createCustomerIcon = (number) => new L.DivIcon({
  className: 'custom-marker',
  html: `<div style="position: relative;">
    <div style="background: linear-gradient(135deg, #f59e0b, #d97706); width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
      <span style="font-size: 18px;">🏠</span>
    </div>
    <div style="position: absolute; top: -8px; right: -8px; background: #3b82f6; color: white; width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 2px solid white;">
      ${number}
    </div>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// مكون لضبط حدود الخريطة
const FitBoundsComponent = ({ bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length >= 2) {
      map.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [map, bounds]);
  return null;
};

// حساب المسافة بين نقطتين (Haversine)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // نصف قطر الأرض بالكيلومتر
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// جلب المسار من OSRM
const fetchRoute = async (waypoints) => {
  try {
    if (waypoints.length < 2) return null;
    
    const coordsString = waypoints.map(p => `${p[1]},${p[0]}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`;
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

// جلب موقع السائق
const getDriverLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve([position.coords.latitude, position.coords.longitude]),
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
};

// خوارزمية ذكية: الأقرب فالأقرب مع مراعاة أن الاستلام يسبق التوصيل
const optimizeRouteSmartly = (startPoint, allPoints) => {
  if (allPoints.length === 0) return [];
  if (allPoints.length === 1) return allPoints;
  
  const optimized = [];
  const remaining = [...allPoints];
  let current = startPoint;
  
  // تتبع الطلبات التي تم استلامها (يمكن توصيلها)
  const pickedUpOrders = new Set();
  
  while (remaining.length > 0) {
    let bestIndex = -1;
    let bestDistance = Infinity;
    
    for (let i = 0; i < remaining.length; i++) {
      const point = remaining[i];
      
      // إذا كانت نقطة عميل (توصيل) - تحقق أن الطلب تم استلامه
      if (point.type === 'customer') {
        // لا يمكن توصيل طلب إلا إذا استلمناه من البائع
        if (!pickedUpOrders.has(point.orderId)) {
          continue; // تخطي هذا العميل، لم نستلم طلبه بعد
        }
      }
      
      // حساب المسافة
      const distance = calculateDistance(current[0], current[1], point.lat, point.lng);
      
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = i;
      }
    }
    
    // إذا لم نجد نقطة مناسبة (كل المتبقي عملاء وطلباتهم لم تُستلم)
    // نضطر لاختيار أقرب بائع
    if (bestIndex === -1) {
      for (let i = 0; i < remaining.length; i++) {
        const point = remaining[i];
        if (point.type === 'store') {
          const distance = calculateDistance(current[0], current[1], point.lat, point.lng);
          if (distance < bestDistance) {
            bestDistance = distance;
            bestIndex = i;
          }
        }
      }
    }
    
    // إذا لا يزال لم نجد (لا يجب أن يحدث)
    if (bestIndex === -1) {
      bestIndex = 0;
    }
    
    const selected = remaining.splice(bestIndex, 1)[0];
    optimized.push(selected);
    
    // إذا كانت نقطة بائع، أضف الطلب للقائمة المستلمة
    if (selected.type === 'store') {
      pickedUpOrders.add(selected.orderId);
    }
    
    // تحديث الموقع الحالي
    current = [selected.lat, selected.lng];
  }
  
  return optimized;
};

const MultiRouteOptimizer = ({ 
  foodOrders = [], 
  productOrders = [], 
  onClose, 
  theme = 'dark',
  mode = 'all' // 'food', 'product', 'all'
}) => {
  const [driverCoords, setDriverCoords] = useState(null);
  const [optimizedRoute, setOptimizedRoute] = useState([]);
  const [routePolyline, setRoutePolyline] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState(false);
  const [showOptimized, setShowOptimized] = useState(true);
  
  const isDark = theme === 'dark';

  // تحويل الطلبات لنقاط حسب الوضع المختار
  const getAllDeliveryPoints = () => {
    const points = [];
    
    // طلبات الطعام (فقط إذا mode = 'food' أو 'all')
    if (mode === 'food' || mode === 'all') {
      foodOrders.forEach((order, idx) => {
        // نقطة المطعم (للاستلام)
        if (order.store_latitude && order.store_longitude && order.status !== 'picked_up' && order.status !== 'out_for_delivery') {
          points.push({
            id: `food-store-${order.id}`,
            orderId: order.id,
            type: 'store',
            orderType: 'food',
            name: order.store_name || 'مطعم',
            lat: order.store_latitude,
            lng: order.store_longitude,
            order: order
          });
        }
        
        // نقطة العميل (للتوصيل)
        if (order.latitude && order.longitude) {
          points.push({
            id: `food-customer-${order.id}`,
            orderId: order.id,
            type: 'customer',
            orderType: 'food',
            name: order.buyer_address?.name || 'عميل',
            address: order.buyer_address?.address,
            lat: order.latitude,
            lng: order.longitude,
            order: order
          });
        }
      });
    }
    
    // طلبات المنتجات (فقط إذا mode = 'product' أو 'all')
    if (mode === 'product' || mode === 'all') {
      productOrders.forEach((order, idx) => {
        // نقطة المتجر (للاستلام)
        const sellerAddr = order.seller_addresses?.[0];
        if (sellerAddr?.latitude && sellerAddr?.longitude && !order.pickup_code_verified) {
          points.push({
            id: `product-store-${order.id}`,
            orderId: order.id,
            type: 'store',
            orderType: 'product',
            name: sellerAddr.business_name || 'متجر',
            lat: sellerAddr.latitude,
            lng: sellerAddr.longitude,
            order: order
          });
        }
        
        // نقطة العميل (للتوصيل)
        const buyerAddr = order.buyer_address;
        if (buyerAddr?.latitude && buyerAddr?.longitude) {
          points.push({
            id: `product-customer-${order.id}`,
            orderId: order.id,
            type: 'customer',
            orderType: 'product',
            name: buyerAddr.name || 'عميل',
            address: buyerAddr.address,
            lat: buyerAddr.latitude,
            lng: buyerAddr.longitude,
            order: order
          });
        }
      });
    }
    
    return points;
  };

  // حساب المسار الأمثل
  useEffect(() => {
    const calculateOptimizedRoute = async () => {
      setLoading(true);
      
      // جلب موقع السائق
      let driverPos = null;
      try {
        driverPos = await getDriverLocation();
        setDriverCoords(driverPos);
      } catch (e) {
        console.log('Could not get driver location');
        setLocationError(true);
        // استخدام موقع افتراضي (حلب)
        driverPos = [36.2021, 37.1343];
        setDriverCoords(driverPos);
      }
      
      const allPoints = getAllDeliveryPoints();
      
      if (allPoints.length === 0) {
        setLoading(false);
        return;
      }
      
      // ترتيب النقاط باستخدام الخوارزمية الذكية
      // الأقرب فالأقرب مع مراعاة أن الاستلام يسبق التوصيل
      const optimized = optimizeRouteSmartly(driverPos, allPoints);
      setOptimizedRoute(optimized);
      
      // جلب المسار الفعلي من OSRM
      if (optimized.length > 0) {
        const waypoints = [driverPos, ...optimized.map(p => [p.lat, p.lng])];
        const route = await fetchRoute(waypoints);
        
        if (route) {
          setRoutePolyline(route.coordinates);
          setRouteInfo({
            totalDistance: (route.distance / 1000).toFixed(1),
            totalDuration: Math.round(route.duration / 60),
            stops: optimized.length
          });
        }
      }
      
      setLoading(false);
    };
    
    calculateOptimizedRoute();
  }, [foodOrders.length, productOrders.length]);

  // حساب bounds الخريطة
  const allPoints = getAllDeliveryPoints();
  const mapPoints = driverCoords ? [[driverCoords[0], driverCoords[1]], ...allPoints.map(p => [p.lat, p.lng])] : allPoints.map(p => [p.lat, p.lng]);
  const bounds = mapPoints.length >= 2 ? mapPoints : null;
  const center = driverCoords || [36.2021, 37.1343];

  // ألوان المسار
  const routeColors = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-start justify-center pt-2 pb-20 bg-black/70 backdrop-blur-sm overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-3xl mx-4 rounded-2xl shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#1a1a1a]' : 'bg-white'
          }`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b ${
            isDark ? 'border-[#333] bg-gradient-to-l from-[#252525] to-[#1f1f1f]' : 'border-gray-200 bg-gradient-to-l from-gray-100 to-gray-50'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl bg-gradient-to-br ${
                mode === 'food' ? 'from-green-500 to-emerald-600' :
                mode === 'product' ? 'from-purple-500 to-indigo-600' :
                'from-orange-500 to-red-500'
              }`}>
                <Route size={22} className="text-white" />
              </div>
              <div>
                <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {mode === 'food' ? 'مسار الطعام' : mode === 'product' ? 'مسار المنتجات' : 'المسار المدمج'}
                </h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  {mode === 'food' ? `${foodOrders.length} طلبات طعام` : 
                   mode === 'product' ? `${productOrders.length} طلبات منتجات` :
                   `${foodOrders.length + productOrders.length} طلبات`} • {optimizedRoute.length} نقاط توقف
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-[#333]' : 'hover:bg-gray-200'}`}
            >
              <X size={22} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
            </button>
          </div>

          {/* Route Summary */}
          {routeInfo && (
            <div className={`p-4 border-b ${isDark ? 'border-[#333]' : 'border-gray-200'}`}>
              <div className="grid grid-cols-3 gap-4">
                <div className={`text-center p-3 rounded-xl ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                  <Truck size={24} className="mx-auto mb-1 text-blue-500" />
                  <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {routeInfo.totalDistance} كم
                  </p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>المسافة الكلية</p>
                </div>
                <div className={`text-center p-3 rounded-xl ${isDark ? 'bg-amber-500/10' : 'bg-amber-50'}`}>
                  <Clock size={24} className="mx-auto mb-1 text-amber-500" />
                  <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {routeInfo.totalDuration} د
                  </p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>الوقت المتوقع</p>
                </div>
                <div className={`text-center p-3 rounded-xl ${isDark ? 'bg-green-500/10' : 'bg-green-50'}`}>
                  <MapPin size={24} className="mx-auto mb-1 text-green-500" />
                  <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {routeInfo.stops}
                  </p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>نقاط التوقف</p>
                </div>
              </div>
            </div>
          )}

          {/* Map */}
          <div className="h-[300px] relative">
            {loading ? (
              <div className={`absolute inset-0 flex items-center justify-center ${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-100'}`}>
                <div className="text-center">
                  <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>جاري حساب أفضل مسار...</p>
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>باستخدام الذكاء الاصطناعي</p>
                </div>
              </div>
            ) : (
              <MapContainer
                center={center}
                zoom={12}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
              >
                <TileLayer
                  attribution='&copy; OpenStreetMap'
                  url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ar"
                />
                
                {bounds && <FitBoundsComponent bounds={bounds} />}
                
                {/* موقع السائق */}
                {driverCoords && (
                  <Marker position={driverCoords} icon={driverIcon}>
                    <Popup>
                      <div className="text-center p-2">
                        <p className="font-bold text-lg">🚗 موقعك</p>
                        <p className="text-sm text-gray-500">نقطة البداية</p>
                      </div>
                    </Popup>
                  </Marker>
                )}
                
                {/* نقاط المسار المُحسَّن */}
                {showOptimized && optimizedRoute.map((point, index) => (
                  <Marker 
                    key={point.id}
                    position={[point.lat, point.lng]} 
                    icon={point.type === 'store' 
                      ? createStoreIcon(index + 1, point.orderType === 'food')
                      : createCustomerIcon(index + 1)
                    }
                  >
                    <Popup>
                      <div className="text-center p-2 min-w-[150px]">
                        <div className="text-2xl mb-1">
                          {point.type === 'store' ? (point.orderType === 'food' ? '🍔' : '📦') : '🏠'}
                        </div>
                        <p className="font-bold">{point.name}</p>
                        <p className="text-xs text-gray-500 mb-1">
                          {point.type === 'store' ? 'استلام' : 'توصيل'}
                        </p>
                        {point.address && (
                          <p className="text-xs text-gray-600">{point.address}</p>
                        )}
                        <div className="mt-2 px-2 py-1 bg-orange-100 rounded-full">
                          <span className="text-xs font-bold text-orange-600">الترتيب: {index + 1}</span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
                
                {/* خط المسار */}
                {routePolyline.length > 0 && (
                  <Polyline 
                    positions={routePolyline} 
                    color="#FF6B00"
                    weight={5}
                    opacity={0.8}
                  />
                )}
              </MapContainer>
            )}
          </div>

          {/* Optimized Route List */}
          <div className={`p-4 border-t ${isDark ? 'border-[#333]' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <h4 className={`font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <Sparkles size={18} className="text-orange-500" />
                ترتيب التوقفات الأمثل
              </h4>
              <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'}`}>
                محسَّن بالذكاء الاصطناعي
              </span>
            </div>
            
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {/* نقطة البداية */}
              <div className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-blue-500/10' : 'bg-blue-50'}`}>
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                  🚗
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>موقعك الحالي</p>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>نقطة البداية</p>
                </div>
              </div>
              
              {/* نقاط المسار */}
              {optimizedRoute.map((point, index) => (
                <div key={point.id}>
                  {/* سهم */}
                  <div className="flex justify-center py-1">
                    <ArrowDown size={16} className={isDark ? 'text-gray-600' : 'text-gray-400'} />
                  </div>
                  
                  {/* النقطة */}
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${
                    point.type === 'store'
                      ? isDark ? 'bg-green-500/10' : 'bg-green-50'
                      : isDark ? 'bg-amber-500/10' : 'bg-amber-50'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      point.type === 'store' ? 'bg-green-500' : 'bg-amber-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{point.type === 'store' ? (point.orderType === 'food' ? '🍔' : '📦') : '🏠'}</span>
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{point.name}</p>
                      </div>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {point.type === 'store' ? 'استلام الطلب' : 'توصيل للعميل'}
                        {point.address && ` • ${point.address.substring(0, 30)}...`}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                      point.orderType === 'food'
                        ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                        : isDark ? 'bg-purple-500/20 text-purple-400' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {point.orderType === 'food' ? 'طعام' : 'منتج'}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* نقطة النهاية */}
              {optimizedRoute.length > 0 && (
                <>
                  <div className="flex justify-center py-1">
                    <ArrowDown size={16} className={isDark ? 'text-gray-600' : 'text-gray-400'} />
                  </div>
                  <div className={`flex items-center gap-3 p-3 rounded-xl ${isDark ? 'bg-green-500/20' : 'bg-green-100'}`}>
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle size={18} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${isDark ? 'text-green-400' : 'text-green-700'}`}>انتهاء التوصيل</p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>جميع الطلبات تم توصيلها</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className={`p-4 border-t ${isDark ? 'border-[#333] bg-[#1f1f1f]' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className={`flex-1 py-3 rounded-xl font-bold transition-colors ${
                  isDark 
                    ? 'bg-[#333] text-white hover:bg-[#404040]' 
                    : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                إغلاق
              </button>
              <button
                onClick={() => {
                  // فتح خرائط Google مع المسار
                  if (driverCoords && optimizedRoute.length > 0) {
                    const waypoints = optimizedRoute.map(p => `${p.lat},${p.lng}`).join('/');
                    const dest = optimizedRoute[optimizedRoute.length - 1];
                    const url = `https://www.google.com/maps/dir/${driverCoords[0]},${driverCoords[1]}/${waypoints}`;
                    window.open(url, '_blank');
                  }
                }}
                className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-l from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 transition-all flex items-center justify-center gap-2"
              >
                <Navigation size={18} />
                ابدأ التنقل
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MultiRouteOptimizer;
