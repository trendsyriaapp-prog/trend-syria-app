import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Navigation, MapPin, Phone, UtensilsCrossed, ShoppingBag, Map, Locate, Clock, Star } from 'lucide-react';
import { formatPrice } from '../../utils/imageHelpers';
import { 
  getCurrentLocation, 
  calculateOrderDistances, 
  formatDistance 
} from '../../utils/distanceCalculator';
import OrdersMap from './OrdersMap';

// فتح العنوان في خرائط Google
const openInGoogleMaps = (address, city) => {
  const fullAddress = `${address}, ${city}, سوريا`;
  const encodedAddress = encodeURIComponent(fullAddress);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  window.open(mapsUrl, '_blank');
};

const AvailableOrdersList = ({ orders, foodOrders = [], isWorkingHours, onTakeOrder, onTakeFoodOrder, orderTypeFilter = 'all', myOrders = [], myFoodOrders = [] }) => {
  const [driverLocation, setDriverLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [orderDistances, setOrderDistances] = useState({});

  // حساب المسافات عند تغيير موقع السائق أو الطلبات
  useEffect(() => {
    if (driverLocation) {
      const allOrders = [...orders, ...foodOrders];
      const distances = {};
      allOrders.forEach(order => {
        distances[order.id] = calculateOrderDistances(driverLocation, order);
      });
      setOrderDistances(distances);
    }
  }, [driverLocation, orders, foodOrders]);

  // الحصول على موقع السائق
  const handleGetLocation = async () => {
    setLoadingLocation(true);
    try {
      const location = await getCurrentLocation();
      setDriverLocation(location);
    } catch (error) {
      console.error('خطأ في الحصول على الموقع:', error);
    } finally {
      setLoadingLocation(false);
    }
  };

  // دمج كل الطلبات أو الاعتماد على الفلتر
  const allOrders = [...orders, ...foodOrders];
  
  if (allOrders.length === 0) {
    return (
      <div className="driver-empty-state">
        <Package size={48} className="driver-empty-state-icon mx-auto mb-4" />
        <p className="driver-empty-state-text">
          {orderTypeFilter === 'food' ? 'لا توجد طلبات طعام متاحة' : 
           orderTypeFilter === 'products' ? 'لا توجد طلبات منتجات متاحة' : 
           'لا توجد طلبات متاحة حالياً'}
        </p>
      </div>
    );
  }

  // فصل طلبات الطعام عن طلبات المتجر
  const displayFoodOrders = foodOrders.length > 0 ? foodOrders : orders.filter(o => o.order_source === 'food');
  const shopOrders = orders.filter(o => o.order_source !== 'food');

  // مكون عرض المسافة
  const DistanceInfo = ({ orderId }) => {
    const distance = orderDistances[orderId];
    if (!driverLocation) {
      return (
        <button
          onClick={handleGetLocation}
          disabled={loadingLocation}
          className="w-full mb-3 py-3 bg-[var(--driver-bg-secondary)] border border-[var(--driver-border)] text-[var(--driver-text-secondary)] rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:border-green-500 transition-colors disabled:opacity-50"
        >
          {loadingLocation ? (
            <span className="animate-spin">⏳</span>
          ) : (
            <Locate size={16} />
          )}
          {loadingLocation ? 'جاري تحديد موقعك...' : 'تحديد موقعي لرؤية المسافات'}
        </button>
      );
    }

    if (!distance) return null;

    return (
      <div className="driver-distance-box mb-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="driver-distance-item">
            <p className="driver-distance-label">🚗 للمطعم</p>
            <p className="driver-distance-value">{formatDistance(distance.toSeller)}</p>
          </div>
          <div className="driver-distance-item">
            <p className="driver-distance-label">🏠 للعميل</p>
            <p className="driver-distance-value !text-yellow-400">{formatDistance(distance.toCustomer)}</p>
          </div>
          <div className="driver-distance-item">
            <p className="driver-distance-label">⏱️ الوقت</p>
            <p className="driver-distance-value !text-blue-400">~{distance.estimatedTime} د</p>
          </div>
        </div>
        <p className="text-xs text-gray-500 text-center mt-2">
          المجموع: <span className="text-green-400 font-bold">{formatDistance(distance.total)}</span>
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* زر الخريطة التفاعلية */}
      {allOrders.length > 0 && (
        <OrdersMap
          orders={shopOrders}
          foodOrders={displayFoodOrders}
          driverLocation={driverLocation}
          onTakeOrder={onTakeOrder}
          onTakeFoodOrder={onTakeFoodOrder}
          myOrders={myOrders}
          myFoodOrders={myFoodOrders}
        />
      )}

      {/* طلبات الطعام */}
      {displayFoodOrders.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <UtensilsCrossed size={18} className="text-green-400" />
            <h3 className="font-bold text-white">طلبات الطعام ({displayFoodOrders.length})</h3>
          </div>
          <div className="space-y-3">
            {displayFoodOrders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="driver-order-card"
              >
                <div className="driver-order-header flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed size={14} className="text-green-400" />
                    <span className="text-sm font-bold text-white">طلب طعام</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full">
                      {order.store_type === 'restaurant' ? 'مطعم' : 
                       order.store_type === 'grocery' ? 'مواد غذائية' : 'خضروات'}
                    </span>
                  </div>
                </div>
                <div className="driver-order-body">
                  {/* رقم الطلب والسعر */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-sm text-white">
                      #{order.order_number || order.id?.slice(0, 8)}
                    </span>
                    <span className="driver-earnings-badge">{formatPrice(order.total)}</span>
                  </div>

                  {/* من أين - المتجر */}
                  <div className="bg-[#1a2e1a] border border-green-900 rounded-xl p-3 mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                        <Navigation size={14} className="text-black" />
                      </div>
                      <span className="text-sm font-bold text-green-400">من ({order.store_name})</span>
                    </div>
                    {order.seller_addresses?.map((seller, i) => (
                      <div key={i} className="mr-10 text-sm text-gray-400">
                        <p>{seller.city}</p>
                        {seller.phone && (
                          <a href={`tel:${seller.phone}`} className="flex items-center gap-1 text-green-400">
                            <Phone size={12} /> {seller.phone}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* إلى أين - العميل */}
                  <div className="bg-[#2e2a1a] border border-yellow-900 rounded-xl p-3 mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                        <MapPin size={14} className="text-black" />
                      </div>
                      <span className="text-sm font-bold text-yellow-400">إلى (العميل)</span>
                    </div>
                    <div className="mr-10 text-sm text-gray-400">
                      <p className="font-medium text-white">{order.buyer_address?.name}</p>
                      <p>{order.buyer_address?.address}</p>
                      <p>{order.buyer_address?.city}</p>
                      <a href={`tel:${order.buyer_address?.phone}`} className="flex items-center gap-1 text-yellow-400">
                        <Phone size={12} /> {order.buyer_address?.phone}
                      </a>
                    </div>
                  </div>

                  {/* معلومات المسافة */}
                  <DistanceInfo orderId={order.id} />

                  {/* أزرار الخرائط - زر للمطعم وزر للعميل وزر الموقع في الخريطة */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // فتح موقع المطعم
                        const storeAddr = order.seller_addresses?.[0];
                        openInGoogleMaps(storeAddr?.address || order.store_name, storeAddr?.city || 'دمشق');
                      }}
                      className="bg-green-600 text-black py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1"
                    >
                      <Map size={14} />
                      المطعم
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openInGoogleMaps(order.buyer_address?.address, order.buyer_address?.city);
                      }}
                      className="bg-yellow-500 text-black py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1"
                    >
                      <Map size={14} />
                      العميل
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // فتح الخريطة الداخلية وتركيز على هذا الطلب
                        // نستخدم event لإرسال معلومات الطلب للخريطة
                        const event = new CustomEvent('focusOrderOnMap', { 
                          detail: { 
                            order: order,
                            latitude: order.latitude || order.buyer_address?.latitude,
                            longitude: order.longitude || order.buyer_address?.longitude
                          } 
                        });
                        window.dispatchEvent(event);
                      }}
                      className="bg-blue-500 text-white py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1"
                    >
                      <Navigation size={14} />
                      الخريطة
                    </button>
                  </div>

                  {/* عدد المنتجات */}
                  <p className="text-sm text-gray-400 mb-3">
                    عدد الأصناف: {order.items?.length || 0}
                  </p>

                  {/* زر قبول الطلب */}
                  <button
                    onClick={() => onTakeFoodOrder ? onTakeFoodOrder(order) : onTakeOrder(order)}
                    disabled={!isWorkingHours()}
                    className="driver-accept-btn disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isWorkingHours() ? 'قبول طلب التوصيل' : 'خارج أوقات العمل'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* طلبات المتجر */}
      {shopOrders.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag size={18} className="text-blue-400" />
            <h3 className="font-bold text-white">طلبات المتجر ({shopOrders.length})</h3>
          </div>
          <div className="space-y-3">
            {shopOrders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="driver-order-card"
              >
                {/* Header */}
                <div className="driver-order-header flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingBag size={14} className="text-blue-400" />
                    <span className="text-sm font-bold text-white">طلب منتجات</span>
                  </div>
                  <span className="driver-earnings-badge">{formatPrice(order.total)}</span>
                </div>
                
                <div className="driver-order-body">
                  {/* رقم الطلب */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-sm text-white">#{order.id?.slice(0, 8)}</span>
                  </div>

                  {/* من أين - البائع */}
                  <div className="bg-[#1a2e1a] border border-green-900 rounded-xl p-3 mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                        <Navigation size={14} className="text-black" />
                      </div>
                      <span className="text-sm font-bold text-green-400">من (البائع)</span>
                    </div>
                    {order.seller_addresses?.map((seller, i) => (
                      <div key={i} className="mr-10 text-sm text-gray-400">
                        <p className="font-medium text-white">{seller.business_name || seller.name}</p>
                        <p>{seller.city}</p>
                        <a href={`tel:${seller.phone}`} className="flex items-center gap-1 text-green-400">
                          <Phone size={12} /> {seller.phone}
                        </a>
                      </div>
                    ))}
                  </div>

                  {/* إلى أين - المشتري */}
                  <div className="bg-[#2e2a1a] border border-yellow-900 rounded-xl p-3 mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                        <MapPin size={14} className="text-black" />
                      </div>
                      <span className="text-sm font-bold text-yellow-400">إلى (المشتري)</span>
                    </div>
                    <div className="mr-10 text-sm text-gray-400">
                      <p className="font-medium text-white">{order.buyer_address?.name}</p>
                      <p>{order.buyer_address?.address}</p>
                      <p>{order.buyer_address?.city}</p>
                      <a href={`tel:${order.buyer_address?.phone}`} className="flex items-center gap-1 text-yellow-400">
                        <Phone size={12} /> {order.buyer_address?.phone}
                      </a>
                    </div>
                  </div>

                  {/* معلومات المسافة */}
                  <DistanceInfo orderId={order.id} />

                  {/* أزرار الخرائط */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const sellerAddr = order.seller_addresses?.[0];
                        openInGoogleMaps(sellerAddr?.address || sellerAddr?.business_name, sellerAddr?.city);
                      }}
                      className="bg-green-600 text-black py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1"
                    >
                      <Map size={14} />
                      البائع
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openInGoogleMaps(order.buyer_address?.address, order.buyer_address?.city);
                      }}
                      className="bg-yellow-500 text-black py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1"
                    >
                      <Map size={14} />
                      المشتري
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // فتح الخريطة الداخلية وتركيز على هذا الطلب
                        const event = new CustomEvent('focusOrderOnMap', { 
                          detail: { 
                            order: order,
                            latitude: order.latitude || order.buyer_address?.latitude,
                            longitude: order.longitude || order.buyer_address?.longitude
                          } 
                        });
                        window.dispatchEvent(event);
                      }}
                      className="bg-blue-500 text-white py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1"
                    >
                      <Navigation size={14} />
                      الخريطة
                    </button>
                  </div>

                  {/* عدد المنتجات */}
                  <p className="text-sm text-gray-400 mb-3">
                    عدد المنتجات: {order.items?.length || 0}
                  </p>

                  {/* زر أخذ الطلب */}
                  <button
                    onClick={() => onTakeOrder(order)}
                    disabled={!isWorkingHours()}
                    className="driver-accept-btn disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isWorkingHours() ? 'قبول الطلب' : 'خارج أوقات العمل'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailableOrdersList;
