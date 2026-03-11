import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Navigation, MapPin, Phone, UtensilsCrossed, ShoppingBag, Map, Locate, Clock } from 'lucide-react';
import { formatPrice } from '../../utils/imageHelpers';
import { 
  getCurrentLocation, 
  calculateOrderDistances, 
  formatDistance 
} from '../../utils/distanceCalculator';

// فتح العنوان في خرائط Google
const openInGoogleMaps = (address, city) => {
  const fullAddress = `${address}, ${city}, سوريا`;
  const encodedAddress = encodeURIComponent(fullAddress);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  window.open(mapsUrl, '_blank');
};

const AvailableOrdersList = ({ orders, foodOrders = [], isWorkingHours, onTakeOrder, onTakeFoodOrder, orderTypeFilter = 'all' }) => {
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
      <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
        <Package size={48} className="text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">
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
          className="w-full mb-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {loadingLocation ? (
            <span className="animate-spin">⏳</span>
          ) : (
            <Locate size={14} />
          )}
          {loadingLocation ? 'جاري تحديد موقعك...' : 'تحديد موقعي لرؤية المسافات'}
        </button>
      );
    }

    if (!distance) return null;

    return (
      <div className="bg-blue-50 rounded-lg p-2 mb-3 border border-blue-100">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-[9px] text-gray-500">🚗 للمطعم</p>
            <p className="text-xs font-bold text-blue-600">{formatDistance(distance.toSeller)}</p>
          </div>
          <div>
            <p className="text-[9px] text-gray-500">🏠 للعميل</p>
            <p className="text-xs font-bold text-green-600">{formatDistance(distance.toCustomer)}</p>
          </div>
          <div>
            <p className="text-[9px] text-gray-500">⏱️ الوقت</p>
            <p className="text-xs font-bold text-orange-600">~{distance.estimatedTime} د</p>
          </div>
        </div>
        <p className="text-[9px] text-gray-400 text-center mt-1">
          المجموع: {formatDistance(distance.total)}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* زر تحديد الموقع إذا لم يتم تحديده */}
      {!driverLocation && allOrders.length > 0 && (
        <button
          onClick={handleGetLocation}
          disabled={loadingLocation}
          className="w-full py-3 bg-blue-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {loadingLocation ? (
            <>
              <span className="animate-spin">⏳</span>
              جاري تحديد موقعك...
            </>
          ) : (
            <>
              <Locate size={18} />
              📍 تحديد موقعي لرؤية المسافات
            </>
          )}
        </button>
      )}

      {/* إظهار حالة الموقع */}
      {driverLocation && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-2 flex items-center justify-between">
          <span className="text-xs text-green-700 flex items-center gap-1">
            <Locate size={12} /> تم تحديد موقعك ✓
          </span>
          <button
            onClick={handleGetLocation}
            className="text-xs text-blue-600 hover:underline"
          >
            تحديث الموقع
          </button>
        </div>
      )}

      {/* طلبات الطعام */}
      {displayFoodOrders.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <UtensilsCrossed size={18} className="text-green-600" />
            <h3 className="font-bold text-gray-900">طلبات الطعام ({displayFoodOrders.length})</h3>
          </div>
          <div className="space-y-3">
            {displayFoodOrders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border-2 border-green-200 overflow-hidden"
              >
                <div className="bg-green-500 text-white px-3 py-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed size={14} />
                    <span className="text-xs font-bold">طلب طعام</span>
                  </div>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                    {order.store_type === 'restaurant' ? 'مطعم' : 
                     order.store_type === 'grocery' ? 'مواد غذائية' : 'خضروات'}
                  </span>
                </div>
                <div className="p-3">
                  {/* رقم الطلب والسعر */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-sm text-gray-900">
                      #{order.order_number || order.id?.slice(0, 8)}
                    </span>
                    <span className="font-bold text-green-600">{formatPrice(order.total)}</span>
                  </div>

                  {/* من أين - المتجر */}
                  <div className="bg-green-50 rounded-lg p-2 mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <Navigation size={12} className="text-white" />
                      </div>
                      <span className="text-xs font-bold text-green-700">من ({order.store_name})</span>
                    </div>
                    {order.seller_addresses?.map((seller, i) => (
                      <div key={i} className="mr-8 text-xs text-gray-600">
                        <p>{seller.city}</p>
                        {seller.phone && (
                          <a href={`tel:${seller.phone}`} className="flex items-center gap-1 text-green-600">
                            <Phone size={10} /> {seller.phone}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* إلى أين - العميل */}
                  <div className="bg-blue-50 rounded-lg p-2 mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <MapPin size={12} className="text-white" />
                      </div>
                      <span className="text-xs font-bold text-blue-700">إلى (العميل)</span>
                    </div>
                    <div className="mr-8 text-xs text-gray-600">
                      <p className="font-medium">{order.buyer_address?.name}</p>
                      <p>{order.buyer_address?.address}</p>
                      <p>{order.buyer_address?.city}</p>
                      <a href={`tel:${order.buyer_address?.phone}`} className="flex items-center gap-1 text-blue-600">
                        <Phone size={10} /> {order.buyer_address?.phone}
                      </a>
                    </div>
                  </div>

                  {/* معلومات المسافة */}
                  <DistanceInfo orderId={order.id} />

                  {/* أزرار الخرائط - زر للمطعم وزر للعميل */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // فتح موقع المطعم
                        const storeAddr = order.seller_addresses?.[0];
                        openInGoogleMaps(storeAddr?.address || order.store_name, storeAddr?.city || 'دمشق');
                      }}
                      className="bg-green-500 text-white py-1.5 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1"
                    >
                      <Map size={12} />
                      🏪 المطعم
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openInGoogleMaps(order.buyer_address?.address, order.buyer_address?.city);
                      }}
                      className="bg-blue-500 text-white py-1.5 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1"
                    >
                      <Map size={12} />
                      🏠 العميل
                    </button>
                  </div>

                  {/* عدد المنتجات */}
                  <p className="text-xs text-gray-500 mb-3">
                    عدد الأصناف: {order.items?.length || 0}
                  </p>

                  {/* زر قبول الطلب */}
                  <button
                    onClick={() => onTakeFoodOrder ? onTakeFoodOrder(order) : onTakeOrder(order)}
                    disabled={!isWorkingHours()}
                    className="w-full bg-green-500 text-white py-2 rounded-lg font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 transition-colors"
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
            <ShoppingBag size={18} className="text-[#FF6B00]" />
            <h3 className="font-bold text-gray-900">طلبات المتجر ({shopOrders.length})</h3>
          </div>
          <div className="space-y-3">
            {shopOrders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <div className="p-3">
                  {/* رقم الطلب والسعر */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-sm text-gray-900">#{order.id?.slice(0, 8)}</span>
                    <span className="font-bold text-[#FF6B00]">{formatPrice(order.total)}</span>
                  </div>

                  {/* من أين - البائع */}
                  <div className="bg-green-50 rounded-lg p-2 mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <Navigation size={12} className="text-white" />
                      </div>
                      <span className="text-xs font-bold text-green-700">من (البائع)</span>
                    </div>
                    {order.seller_addresses?.map((seller, i) => (
                      <div key={i} className="mr-8 text-xs text-gray-600">
                        <p className="font-medium">{seller.business_name || seller.name}</p>
                        <p>{seller.city}</p>
                        <a href={`tel:${seller.phone}`} className="flex items-center gap-1 text-green-600">
                          <Phone size={10} /> {seller.phone}
                        </a>
                      </div>
                    ))}
                  </div>

                  {/* إلى أين - المشتري */}
                  <div className="bg-blue-50 rounded-lg p-2 mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <MapPin size={12} className="text-white" />
                      </div>
                      <span className="text-xs font-bold text-blue-700">إلى (المشتري)</span>
                    </div>
                    <div className="mr-8 text-xs text-gray-600">
                      <p className="font-medium">{order.buyer_address?.name}</p>
                      <p>{order.buyer_address?.address}</p>
                      <p>{order.buyer_address?.city}</p>
                      <a href={`tel:${order.buyer_address?.phone}`} className="flex items-center gap-1 text-blue-600">
                        <Phone size={10} /> {order.buyer_address?.phone}
                      </a>
                    </div>
                  </div>

                  {/* معلومات المسافة */}
                  <DistanceInfo orderId={order.id} />

                  {/* أزرار الخرائط */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const sellerAddr = order.seller_addresses?.[0];
                        openInGoogleMaps(sellerAddr?.address || sellerAddr?.business_name, sellerAddr?.city);
                      }}
                      className="bg-green-500 text-white py-1.5 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1"
                    >
                      <Map size={12} />
                      🏪 البائع
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openInGoogleMaps(order.buyer_address?.address, order.buyer_address?.city);
                      }}
                      className="bg-blue-500 text-white py-1.5 rounded-lg font-bold text-[10px] flex items-center justify-center gap-1"
                    >
                      <Map size={12} />
                      🏠 المشتري
                    </button>
                  </div>

                  {/* عدد المنتجات */}
                  <p className="text-xs text-gray-500 mb-3">
                    عدد المنتجات: {order.items?.length || 0}
                  </p>

                  {/* زر أخذ الطلب */}
                  <button
                    onClick={() => onTakeOrder(order)}
                    disabled={!isWorkingHours()}
                    className="w-full bg-[#FF6B00] text-white py-2 rounded-lg font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isWorkingHours() ? 'أخذ الطلب' : 'خارج أوقات العمل'}
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
