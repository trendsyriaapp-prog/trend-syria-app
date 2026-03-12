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
const batchIcon = createIcon('#8b5cf6', '⭐');

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

// إحداثيات المدن السورية
const cityCoordinates = {
  'دمشق': [33.5138, 36.2765],
  'حلب': [36.2021, 37.1343],
  'حمص': [34.7324, 36.7137],
  'اللاذقية': [35.5317, 35.7962],
  'حماة': [35.1318, 36.7589],
  'طرطوس': [34.8959, 35.8867],
  'default': [33.5138, 36.2765] // دمشق كافتراضي
};

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
  const [mapCenter, setMapCenter] = useState(cityCoordinates['دمشق']);

  // تحويل العناوين إلى إحداثيات تقريبية
  const getCoordinates = (order) => {
    const city = order.city || order.delivery_city || 'دمشق';
    const baseCoords = cityCoordinates[city] || cityCoordinates['default'];
    
    // إضافة تباين عشوائي صغير لتفريق العلامات
    const hash = order.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const latOffset = ((hash % 100) - 50) * 0.001;
    const lngOffset = ((hash % 77) - 38) * 0.001;
    
    return [baseCoords[0] + latOffset, baseCoords[1] + lngOffset];
  };

  // تجميع جميع العلامات
  const markers = [];

  // إضافة موقع السائق
  if (driverLocation) {
    markers.push({
      id: 'driver',
      type: 'driver',
      position: [driverLocation.latitude, driverLocation.longitude],
      title: 'موقعك الحالي',
      icon: driverIcon
    });
  }

  // إضافة طلبات الطعام
  foodOrders.forEach(order => {
    const coords = getCoordinates(order);
    const isBatch = order.batch_id;
    
    // موقع المتجر
    markers.push({
      id: `food-store-${order.id}`,
      type: 'food-store',
      position: coords,
      title: order.store_name || 'متجر طعام',
      order: order,
      icon: isBatch ? batchIcon : foodStoreIcon,
      isBatch
    });
    
    // موقع العميل
    const customerCoords = getCoordinates({ ...order, id: order.id + '-customer' });
    markers.push({
      id: `customer-${order.id}`,
      type: 'customer',
      position: customerCoords,
      title: order.customer_name || 'العميل',
      order: order,
      icon: customerIcon
    });
  });

  // إضافة طلبات المنتجات
  orders.forEach(order => {
    if (order.order_source === 'food') return; // تجاهل طلبات الطعام المكررة
    
    const coords = getCoordinates(order);
    
    // موقع البائع
    markers.push({
      id: `product-store-${order.id}`,
      type: 'product-store',
      position: coords,
      title: order.seller_name || 'متجر',
      order: order,
      icon: productStoreIcon
    });
    
    // موقع العميل
    const customerCoords = getCoordinates({ ...order, id: order.id + '-customer' });
    markers.push({
      id: `product-customer-${order.id}`,
      type: 'customer',
      position: customerCoords,
      title: order.customer_name || 'العميل',
      order: order,
      icon: customerIcon
    });
  });

  // تصفية العلامات حسب الطبقة المختارة
  const filteredMarkers = markers.filter(m => {
    if (showLayer === 'all') return true;
    if (showLayer === 'food') return m.type === 'food-store' || m.type === 'driver';
    if (showLayer === 'products') return m.type === 'product-store' || m.type === 'driver';
    if (showLayer === 'customers') return m.type === 'customer' || m.type === 'driver';
    return true;
  });

  // عدد الطلبات المجمعة
  const batchOrders = foodOrders.filter(o => o.batch_id);
  const batchGroups = [...new Set(batchOrders.map(o => o.batch_id))];

  return (
    <>
      {/* زر فتح الخريطة */}
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg"
      >
        <Map size={18} />
        🗺️ عرض الخريطة ({foodOrders.length + orders.length} طلب)
        {batchGroups.length > 0 && (
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
            ⭐ {batchGroups.length} مجمع
          </span>
        )}
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
                    {filteredMarkers.length} علامة • {foodOrders.length} طعام • {orders.length} منتجات
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X size={20} />
                </button>
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

              {/* ملخص الطلبات المجمعة */}
              {batchGroups.length > 0 && (
                <div className="absolute bottom-4 left-4 right-4 bg-purple-500 text-white p-3 rounded-xl shadow-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">⭐ طلبات مجمعة</p>
                      <p className="text-xs text-purple-200">
                        {batchGroups.length} دفعة • {batchOrders.length} طلب
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-purple-200">مكافأة إضافية</p>
                      <p className="font-bold">+2,000 ل.س/دفعة</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default OrdersMap;
