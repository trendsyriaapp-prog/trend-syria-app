import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, X, Navigation, Phone, Package, UtensilsCrossed, Locate, Layers, Route } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// إصلاح مشكلة أيقونات Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// أيقونات مخصصة
const createIcon = (color, emoji) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background: ${color};
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
};

const foodStoreIcon = createIcon('#22c55e', '🍔');
const productStoreIcon = createIcon('#3b82f6', '📦');
const customerIcon = createIcon('#ef4444', '🏠');
const driverIcon = createIcon('#f97316', '🚗');

// مكون لتحديث مركز الخريطة
const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 13);
    }
  }, [center, zoom, map]);
  return null;
};

// إحداثيات دمشق كافتراضي فقط
const DEFAULT_CENTER = [33.5138, 36.2765];

const OrdersMap = ({ 
  orders = [], 
  foodOrders = [], 
  driverLocation,
  onSelectOrder,
  onTakeOrder,
  onTakeFoodOrder 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [showLayer, setShowLayer] = useState('all'); // all, food, products, customers
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [currentDriverLocation, setCurrentDriverLocation] = useState(null);
  const [selectedOrderForRoute, setSelectedOrderForRoute] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // جلب المسار من OSRM (مجاني بدون API Key)
  const fetchRoute = async (start, waypoint, end) => {
    setLoadingRoute(true);
    try {
      // OSRM يستخدم [lon, lat]
      const coords = `${start[1]},${start[0]};${waypoint[1]},${waypoint[0]};${end[1]},${end[0]}`;
      
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          // تحويل الإحداثيات من [lon, lat] إلى [lat, lon] لـ Leaflet
          const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
          setRouteCoordinates(coords);
          
          // معلومات المسار
          setRouteInfo({
            distance: (route.distance / 1000).toFixed(1), // كم
            duration: Math.round(route.duration / 60) // دقيقة
          });
        }
      } else {
        // في حالة فشل API، نرسم خط مستقيم
        setRouteCoordinates([start, waypoint, end]);
        setRouteInfo(null);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      // خط مستقيم كبديل
      setRouteCoordinates([start, waypoint, end]);
      setRouteInfo(null);
    }
    setLoadingRoute(false);
  };

  // عرض المسار لطلب معين
  const showRouteForOrder = (order) => {
    const driverPos = currentDriverLocation || driverLocation;
    if (!driverPos) {
      alert('يرجى تفعيل موقعك أولاً');
      return;
    }

    const storeCoords = [order.store_latitude, order.store_longitude];
    const customerCoords = [order.latitude, order.longitude];
    const driverCoords = [driverPos.latitude, driverPos.longitude];

    if (storeCoords[0] && customerCoords[0]) {
      setSelectedOrderForRoute(order);
      fetchRoute(driverCoords, storeCoords, customerCoords);
    }
  };

  // إخفاء المسار
  const hideRoute = () => {
    setSelectedOrderForRoute(null);
    setRouteCoordinates([]);
    setRouteInfo(null);
  };

  // الحصول على موقع السائق الحالي
  const getDriverLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentDriverLocation({ latitude, longitude });
          setMapCenter([latitude, longitude]);
        },
        (error) => {
          console.log('Error getting location:', error);
        }
      );
    }
  };

  // تحديث مركز الخريطة عند فتحها
  useEffect(() => {
    if (isOpen) {
      getDriverLocation();
    }
  }, [isOpen]);

  // الحصول على إحداثيات الطلب - GPS حقيقي فقط
  const getOrderCoordinates = (order) => {
    // إذا كان الطلب يحتوي على إحداثيات GPS حقيقية
    if (order.latitude && order.longitude) {
      return [order.latitude, order.longitude];
    }
    // إذا لا يوجد GPS، نرجع null
    return null;
  };

  // الحصول على إحداثيات المتجر - GPS حقيقي فقط
  const getStoreCoordinates = (order) => {
    // إذا كان المتجر يحتوي على إحداثيات GPS
    if (order.store_latitude && order.store_longitude) {
      return [order.store_latitude, order.store_longitude];
    }
    // إذا لا يوجد GPS للمتجر، نستخدم إحداثيات الطلب مع إزاحة صغيرة
    if (order.latitude && order.longitude) {
      return [order.latitude + 0.002, order.longitude + 0.002];
    }
    return null;
  };

  // تجميع جميع العلامات
  const markers = [];

  // إضافة موقع السائق (من GPS الهاتف أو من props)
  const activeDriverLocation = currentDriverLocation || driverLocation;
  if (activeDriverLocation) {
    markers.push({
      id: 'driver',
      type: 'driver',
      position: [activeDriverLocation.latitude, activeDriverLocation.longitude],
      title: 'موقعك الحالي',
      icon: driverIcon
    });
  }

  // إضافة طلبات الطعام - فقط التي لديها GPS
  foodOrders.forEach(order => {
    const customerCoords = getOrderCoordinates(order);
    const storeCoords = getStoreCoordinates(order);
    
    // موقع المتجر (إذا متوفر)
    if (storeCoords) {
      markers.push({
        id: `food-store-${order.id}`,
        type: 'food-store',
        position: storeCoords,
        title: order.store_name || 'متجر طعام',
        order: order,
        icon: foodStoreIcon
      });
    }
    
    // موقع العميل (إذا متوفر)
    if (customerCoords) {
      markers.push({
        id: `customer-${order.id}`,
        type: 'customer',
        position: customerCoords,
        title: order.customer_name || 'العميل',
        order: order,
        icon: customerIcon,
        hasRealGPS: true
      });
    }
  });

  // إضافة طلبات المنتجات - فقط التي لديها GPS
  orders.forEach(order => {
    if (order.order_source === 'food') return;
    
    const customerCoords = getOrderCoordinates(order);
    const storeCoords = getStoreCoordinates(order);
    
    // موقع البائع (إذا متوفر)
    if (storeCoords) {
      markers.push({
        id: `product-store-${order.id}`,
        type: 'product-store',
        position: storeCoords,
        title: order.seller_name || 'متجر',
        order: order,
        icon: productStoreIcon
      });
    }
    
    // موقع العميل (إذا متوفر)
    if (customerCoords) {
      markers.push({
        id: `product-customer-${order.id}`,
        type: 'customer',
        position: customerCoords,
        title: order.customer_name || 'العميل',
        order: order,
        icon: customerIcon,
        hasRealGPS: true
      });
    }
  });

  // تصفية العلامات حسب الطبقة المختارة
  const filteredMarkers = markers.filter(m => {
    if (showLayer === 'all') return true;
    if (showLayer === 'food') return m.type === 'food-store' || m.type === 'driver';
    if (showLayer === 'products') return m.type === 'product-store' || m.type === 'driver';
    if (showLayer === 'customers') return m.type === 'customer' || m.type === 'driver';
    return true;
  });

  // عدد الطلبات التي لديها GPS
  const ordersWithGPS = markers.filter(m => m.type === 'customer' && m.hasRealGPS).length;
  const totalOrders = foodOrders.length + orders.length;

  return (
    <>
      {/* زر فتح الخريطة */}
      <button
        onClick={() => setIsOpen(true)}
        disabled={totalOrders === 0}
        className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
          totalOrders > 0 
            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        <Map size={18} />
        🗺️ عرض الخريطة ({totalOrders} طلب)
      </button>

      {/* نافذة الخريطة */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-white"
              onClick={e => e.stopPropagation()}
            >
              {/* Header شريط علوي موحد */}
              <div className="bg-white shadow-sm flex items-center justify-between px-2 py-1.5 gap-2 overflow-x-auto">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m12 19 7-7-7-7"/>
                      <path d="M19 12H5"/>
                    </svg>
                  </button>
                  <span className="text-xs font-bold text-gray-800 whitespace-nowrap">خريطة الطلبات</span>
                </div>
                
                {/* فلاتر الطبقات */}
                <div className="flex gap-1 flex-1 justify-center">
                  {[
                    { key: 'all', label: 'الكل', icon: '🗺️' },
                    { key: 'food', label: 'طعام', icon: '🍔' },
                    { key: 'products', label: 'منتجات', icon: '📦' },
                    { key: 'customers', label: 'عملاء', icon: '🏠' },
                  ].map(layer => (
                    <button
                      key={layer.key}
                      onClick={() => setShowLayer(layer.key)}
                      className={`px-2 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all ${
                        showLayer === layer.key
                          ? 'bg-orange-500 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {layer.icon} {layer.label}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={getDriverLocation}
                  className="p-1.5 bg-orange-500 text-white rounded-full flex-shrink-0"
                  title="تحديث موقعي"
                >
                  <Locate size={14} />
                </button>
              </div>

              {/* الخريطة - ملء الشاشة */}
              <div className="h-[calc(100vh-44px)]">
                <MapContainer
                  center={mapCenter}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={true}
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapUpdater center={mapCenter} zoom={12} />
                  
                  {filteredMarkers.map(marker => (
                    <Marker
                      key={marker.id}
                      position={marker.position}
                      icon={marker.icon}
                      eventHandlers={{
                        click: () => setSelectedMarker(marker)
                      }}
                    >
                      <Popup>
                        <div className="text-center min-w-[180px]">
                          <p className="font-bold text-sm mb-1">{marker.title}</p>
                          {marker.order && (
                            <>
                              <div className="text-xs text-gray-600 mb-2 text-right">
                                <p className="font-medium">{marker.order.delivery_address || marker.order.address}</p>
                                {marker.order.delivery_city && (
                                  <p className="text-gray-500">{marker.order.delivery_city}</p>
                                )}
                                {(marker.order.customer_phone || marker.order.delivery_phone) && (
                                  <p className="text-blue-600 mt-1">
                                    📞 {marker.order.customer_phone || marker.order.delivery_phone}
                                  </p>
                                )}
                              </div>
                              {marker.order.total && (
                                <p className="text-orange-600 font-bold text-sm mb-2">
                                  {(marker.order.total).toLocaleString()} ل.س
                                </p>
                              )}
                              {marker.isBatch && (
                                <span className="inline-block bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full mb-2">
                                  ⭐ طلب مجمع
                                </span>
                              )}
                              {marker.type !== 'customer' && (
                                <button
                                  onClick={() => {
                                    if (marker.type === 'food-store') {
                                      onTakeFoodOrder?.(marker.order);
                                    } else {
                                      onTakeOrder?.(marker.order);
                                    }
                                    setIsOpen(false);
                                  }}
                                  className="w-full py-1.5 bg-orange-500 text-white rounded-lg text-xs font-bold mb-1"
                                >
                                  قبول الطلب
                                </button>
                              )}
                              {/* زر عرض المسار */}
                              {marker.order && marker.order.latitude && marker.order.store_latitude && (
                                <button
                                  onClick={() => showRouteForOrder(marker.order)}
                                  disabled={loadingRoute}
                                  className="w-full py-1.5 bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1"
                                >
                                  {loadingRoute ? '⏳' : <Route size={12} />}
                                  {loadingRoute ? 'جاري التحميل...' : 'عرض المسار'}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  ))}

                  {/* رسم المسار */}
                  {routeCoordinates.length > 0 && (
                    <>
                      {/* خط المسار */}
                      <Polyline
                        positions={routeCoordinates}
                        color="#f97316"
                        weight={6}
                        opacity={0.9}
                      />
                      {/* خط متقطع فوق المسار للتوضيح */}
                      <Polyline
                        positions={routeCoordinates}
                        color="#ffffff"
                        weight={2}
                        opacity={0.5}
                        dashArray="10, 15"
                      />
                    </>
                  )}

                  {/* علامات نقاط المسار عند تفعيله */}
                  {selectedOrderForRoute && routeCoordinates.length > 0 && (
                    <>
                      {/* علامة البداية (موقع السائق) */}
                      {(currentDriverLocation || driverLocation) && 
                       (currentDriverLocation?.latitude || driverLocation?.latitude) && (
                        <Marker
                          position={[
                            (currentDriverLocation || driverLocation).latitude,
                            (currentDriverLocation || driverLocation).longitude
                          ]}
                          icon={L.divIcon({
                            className: 'route-marker',
                            html: `<div style="
                              background: #f97316;
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
                            ">1</div>`,
                            iconSize: [30, 30],
                            iconAnchor: [15, 15]
                          })}
                        >
                          <Popup>📍 موقعك (نقطة البداية)</Popup>
                        </Marker>
                      )}
                      
                      {/* علامة المتجر */}
                      {selectedOrderForRoute.store_latitude && selectedOrderForRoute.store_longitude && (
                        <Marker
                          position={[
                            selectedOrderForRoute.store_latitude,
                            selectedOrderForRoute.store_longitude
                          ]}
                          icon={L.divIcon({
                            className: 'route-marker',
                            html: `<div style="
                              background: #22c55e;
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
                            ">2</div>`,
                            iconSize: [30, 30],
                            iconAnchor: [15, 15]
                          })}
                        >
                          <Popup>🏪 المتجر (استلام الطلب)</Popup>
                        </Marker>
                      )}
                      
                      {/* علامة العميل */}
                      {selectedOrderForRoute.latitude && selectedOrderForRoute.longitude && (
                        <Marker
                          position={[
                            selectedOrderForRoute.latitude,
                            selectedOrderForRoute.longitude
                          ]}
                          icon={L.divIcon({
                            className: 'route-marker',
                            html: `<div style="
                              background: #ef4444;
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
                            ">3</div>`,
                            iconSize: [30, 30],
                            iconAnchor: [15, 15]
                          })}
                        >
                          <Popup>🏠 العميل (تسليم الطلب)</Popup>
                        </Marker>
                      )}
                    </>
                  )}
                </MapContainer>

                {/* معلومات المسار */}
                {routeInfo && selectedOrderForRoute && (
                  <div className="absolute bottom-4 left-4 right-4 bg-white rounded-xl shadow-lg p-3 z-[1000]">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-sm text-gray-800">🛣️ مسار التوصيل</h4>
                      <button 
                        onClick={hideRoute}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    
                    {/* خطوات المسار */}
                    <div className="flex items-center justify-center gap-1 mb-3 text-xs">
                      <span className="flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                        <span className="w-4 h-4 bg-orange-500 text-white rounded-full text-[10px] flex items-center justify-center">1</span>
                        موقعك
                      </span>
                      <span className="text-gray-400">➜</span>
                      <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        <span className="w-4 h-4 bg-green-500 text-white rounded-full text-[10px] flex items-center justify-center">2</span>
                        المتجر
                      </span>
                      <span className="text-gray-400">➜</span>
                      <span className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full">
                        <span className="w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center">3</span>
                        العميل
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-orange-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-500">المسافة الإجمالية</p>
                        <p className="font-bold text-orange-600 text-lg">{routeInfo.distance} كم</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-500">الوقت المتوقع</p>
                        <p className="font-bold text-blue-600 text-lg">{routeInfo.duration} د</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default OrdersMap;
