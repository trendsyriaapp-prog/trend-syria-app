import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, X, Navigation, Phone, Package, UtensilsCrossed, Locate, Layers } from 'lucide-react';
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
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="absolute bottom-0 left-0 right-0 h-[85vh] bg-white rounded-t-3xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-900">خريطة الطلبات</h2>
                  <p className="text-xs text-gray-500">
                    {filteredMarkers.filter(m => m.type === 'customer').length} عميل بموقع GPS
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={getDriverLocation}
                    className="p-2 bg-orange-100 text-orange-600 hover:bg-orange-200 rounded-full"
                    title="تحديث موقعي"
                  >
                    <Locate size={18} />
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* فلاتر الطبقات */}
              <div className="p-2 bg-gray-50 flex gap-2 overflow-x-auto">
                {[
                  { key: 'all', label: 'الكل', icon: '🗺️' },
                  { key: 'food', label: 'طعام', icon: '🍔' },
                  { key: 'products', label: 'منتجات', icon: '📦' },
                  { key: 'customers', label: 'عملاء', icon: '🏠' },
                ].map(layer => (
                  <button
                    key={layer.key}
                    onClick={() => setShowLayer(layer.key)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      showLayer === layer.key
                        ? 'bg-blue-500 text-white'
                        : 'bg-white text-gray-600 border border-gray-200'
                    }`}
                  >
                    {layer.icon} {layer.label}
                  </button>
                ))}
              </div>

              {/* دليل الألوان */}
              <div className="px-4 py-2 bg-white border-b border-gray-100 flex gap-3 text-[10px] overflow-x-auto">
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span> مطعم
                </span>
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span> متجر
                </span>
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span> عميل
                </span>
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <span className="w-3 h-3 rounded-full bg-orange-500"></span> موقعك
                </span>
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <span className="w-3 h-3 rounded-full bg-purple-500"></span> مجمع
                </span>
              </div>

              {/* الخريطة */}
              <div className="h-[calc(85vh-180px)]">
                <MapContainer
                  center={mapCenter}
                  zoom={12}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
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
                        <div className="text-center min-w-[150px]">
                          <p className="font-bold text-sm mb-1">{marker.title}</p>
                          {marker.order && (
                            <>
                              <p className="text-xs text-gray-500 mb-2">
                                {marker.order.delivery_address || marker.order.address}
                              </p>
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
                                  className="w-full py-1.5 bg-green-500 text-white rounded-lg text-xs font-bold"
                                >
                                  قبول الطلب
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default OrdersMap;
