import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Navigation, MapPin, Phone, UtensilsCrossed, ShoppingBag, Map, Locate, Clock, Star, Layers, Lock } from 'lucide-react';
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

const AvailableOrdersList = ({ orders, foodOrders = [], isWorkingHours, onTakeOrder, onTakeFoodOrder, orderTypeFilter = 'all', theme = 'dark', onShowRouteForOrder }) => {
  const [driverLocation, setDriverLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [orderDistances, setOrderDistances] = useState({});
  
  // تحديد الثيم
  const isDark = theme === 'dark';

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
            <p className="driver-distance-label">🏍️ للمطعم</p>
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
      {/* الخريطة محذوفة من الطلبات المتاحة - ستظهر فقط في طلباتي */}

      {/* طلبات الطعام */}
      {displayFoodOrders.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <UtensilsCrossed size={18} className={isDark ? 'text-green-400' : 'text-green-600'} />
            <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>طلبات الطعام ({displayFoodOrders.length})</h3>
          </div>
          <div className="space-y-3">
            {displayFoodOrders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border overflow-hidden ${
                  order.is_batch 
                    ? order.batch_category === 'cold_dry'
                      ? (isDark ? 'bg-gradient-to-br from-[#1a2e1a] to-[#1a1a1a] border-emerald-500/50 ring-1 ring-emerald-500/30' : 'bg-gradient-to-br from-emerald-50 to-white border-emerald-300 shadow-emerald-100 shadow-lg')
                      : (isDark ? 'bg-gradient-to-br from-[#2e1a1a] to-[#1a1a1a] border-orange-500/50 ring-1 ring-orange-500/30' : 'bg-gradient-to-br from-orange-50 to-white border-orange-300 shadow-orange-100 shadow-lg')
                    : (isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200 shadow-sm')
                }`}
              >
                <div className={`flex items-center justify-between px-4 py-3 border-b ${
                  order.is_batch 
                    ? order.batch_category === 'cold_dry'
                      ? (isDark ? 'bg-emerald-900/30 border-emerald-500/30' : 'bg-emerald-100 border-emerald-200')
                      : (isDark ? 'bg-orange-900/30 border-orange-500/30' : 'bg-orange-100 border-orange-200')
                    : (isDark ? 'bg-[#252525] border-[#333]' : 'bg-gray-50 border-gray-200')
                }`}>
                  <div className="flex items-center gap-2">
                    {order.is_batch ? (
                      <>
                        <div className="relative">
                          {order.batch_category === 'cold_dry' ? (
                            <span className="text-xl">📦</span>
                          ) : (
                            <span className="text-xl">🔥</span>
                          )}
                          <span className={`absolute -top-1 -right-1 w-4 h-4 text-white text-[10px] rounded-full flex items-center justify-center font-bold ${
                            order.batch_category === 'cold_dry' ? 'bg-emerald-500' : 'bg-orange-500'
                          }`}>
                            {order.batch_info?.stores?.length || '?'}
                          </span>
                        </div>
                        <span className={`text-sm font-bold ${
                          order.batch_category === 'cold_dry' 
                            ? (isDark ? 'text-emerald-300' : 'text-emerald-700')
                            : (isDark ? 'text-orange-300' : 'text-orange-700')
                        }`}>
                          {order.batch_category === 'cold_dry' ? 'طلب تجميعي (بارد)' : 'طلب تجميعي (ساخن)'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          order.batch_category === 'cold_dry'
                            ? (isDark ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50' : 'bg-emerald-200 text-emerald-700')
                            : (isDark ? 'bg-orange-500/20 text-orange-300 border border-orange-500/50' : 'bg-orange-200 text-orange-700')
                        }`}>
                          {order.batch_info?.stores?.length || 0} متاجر
                        </span>
                      </>
                    ) : (
                      <>
                        <UtensilsCrossed size={14} className={isDark ? 'text-green-400' : 'text-green-600'} />
                        <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>طلب طعام</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!order.is_batch && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                      }`}>
                        {order.store_type === 'restaurant' ? 'مطعم' : 
                         order.store_type === 'grocery' ? 'مواد غذائية' : 'خضروات'}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* عرض معلومات الطلب التجميعي */}
                {order.is_batch && order.batch_info && (
                  <div className={`px-4 py-3 border-b ${
                    order.batch_category === 'cold_dry'
                      ? (isDark ? 'border-emerald-500/20' : 'border-emerald-200')
                      : (isDark ? 'border-orange-500/20' : 'border-orange-200')
                  }`}>
                    <p className={`text-xs mb-2 ${
                      order.batch_category === 'cold_dry'
                        ? (isDark ? 'text-emerald-300' : 'text-emerald-600')
                        : (isDark ? 'text-orange-300' : 'text-orange-600')
                    }`}>
                      📍 نقاط الاستلام:
                    </p>
                    <div className="space-y-2">
                      {order.batch_info.stores?.map((store, idx) => (
                        <div key={idx} className={`flex items-center justify-between text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          <div className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                              order.batch_category === 'cold_dry' ? 'bg-emerald-500' : 'bg-orange-500'
                            }`}>{idx + 1}</span>
                            <span>{store.store_name}</span>
                          </div>
                          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {formatPrice(store.subtotal || 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className={`mt-2 pt-2 border-t flex justify-between items-center ${
                      order.batch_category === 'cold_dry'
                        ? (isDark ? 'border-emerald-500/20' : 'border-emerald-200')
                        : (isDark ? 'border-orange-500/20' : 'border-orange-200')
                    }`}>
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>المجموع الكلي:</span>
                      <span className={`font-bold ${
                        order.batch_category === 'cold_dry'
                          ? (isDark ? 'text-emerald-300' : 'text-emerald-700')
                          : (isDark ? 'text-orange-300' : 'text-orange-700')
                      }`}>
                        {formatPrice(order.batch_info.total_amount || order.total)}
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-4">
                  {/* رقم الطلب والسعر ورسوم التوصيل */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        #{order.order_number || order.id?.slice(0, 8)}
                      </span>
                      {order.delivery_fee && (
                        <span className={`mr-2 text-xs ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                          🏍️ {order.delivery_fee.toLocaleString()} ل.س
                        </span>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-lg font-bold text-sm ${
                      isDark ? 'bg-green-500/20 text-green-400 border border-green-500' : 'bg-green-100 text-green-700 border border-green-300'
                    }`}>{formatPrice(order.total)}</span>
                  </div>

                  {/* وقت الطلب وعدد الأصناف */}
                  <div className={`flex items-center gap-4 mb-3 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {order.created_at ? new Date(order.created_at).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' }) : 'الآن'}
                    </span>
                    <span>📦 {order.items?.length || 0} صنف</span>
                    {order.is_priority && (
                      <span className="bg-yellow-500 text-black px-2 py-0.5 rounded-full font-bold">⚡ أولوية</span>
                    )}
                  </div>

                  {/* من أين - المتجر */}
                  <div className={`rounded-xl p-3 mb-2 border ${
                    isDark ? 'bg-[#1a2e1a] border-green-900' : 'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                        <Navigation size={14} className="text-white" />
                      </div>
                      <div className="flex-1">
                        <span className={`text-sm font-bold ${isDark ? 'text-green-400' : 'text-green-700'}`}>من ({order.store_name})</span>
                      </div>
                    </div>
                    {order.seller_addresses?.map((seller, i) => (
                      <div key={i} className={`mr-10 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <p className="font-medium">{typeof seller.address === 'object' 
                          ? [seller.address?.area, seller.address?.street, seller.address?.building].filter(Boolean).join(', ') || seller.city
                          : (seller.address || seller.city)}</p>
                        <p>{seller.city}</p>
                        {seller.phone && (
                          <a href={`tel:${seller.phone}`} className={`flex items-center gap-1 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                            <Phone size={12} /> {seller.phone}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* إلى أين - العميل */}
                  <div className={`rounded-xl p-3 mb-3 border ${
                    isDark ? 'bg-[#2e2a1a] border-yellow-900' : 'bg-amber-50 border-amber-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                        <MapPin size={14} className="text-white" />
                      </div>
                      <span className={`text-sm font-bold ${isDark ? 'text-yellow-400' : 'text-amber-700'}`}>إلى ({order.buyer_address?.name || 'العميل'})</span>
                    </div>
                    <div className={`mr-10 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {typeof order.buyer_address?.address === 'object'
                          ? [order.buyer_address?.address?.area, order.buyer_address?.address?.street, order.buyer_address?.address?.building].filter(Boolean).join(', ')
                          : order.buyer_address?.address}
                      </p>
                      <p>{order.buyer_address?.city}</p>
                      <p className={`flex items-center gap-1 text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        <Lock size={10} /> رقم العميل مخفي
                      </p>
                    </div>
                  </div>

                  {/* معلومات المسافة */}
                  <DistanceInfo orderId={order.id} />

                  {/* أزرار الخرائط - زر للمطعم وزر للعميل وزر المسار */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const storeAddr = order.seller_addresses?.[0];
                        openInGoogleMaps(storeAddr?.address || order.store_name, storeAddr?.city || 'دمشق');
                      }}
                      className="bg-green-600 text-white py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1"
                    >
                      <Map size={14} />
                      المطعم
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openInGoogleMaps(order.buyer_address?.address, order.buyer_address?.city);
                      }}
                      className="bg-amber-500 text-white py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1"
                    >
                      <Map size={14} />
                      العميل
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // عرض المسار على الخريطة الداخلية
                        if (onShowRouteForOrder) {
                          onShowRouteForOrder(order, 'food');
                        }
                      }}
                      className="bg-blue-500 text-white py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1"
                    >
                      <Navigation size={14} />
                      المسار
                    </button>
                  </div>

                  {/* زر قبول الطلب */}
                  <button
                    onClick={() => onTakeFoodOrder ? onTakeFoodOrder(order) : onTakeOrder(order)}
                    disabled={!isWorkingHours()}
                    className={`w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                      order.is_batch 
                        ? order.batch_category === 'cold_dry'
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'
                          : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                        : 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                    }`}
                  >
                    {!isWorkingHours() ? 'خارج أوقات العمل' : 
                     order.is_batch 
                       ? order.batch_category === 'cold_dry'
                         ? `📦 قبول طلب بارد (${order.batch_info?.stores?.length || 0} متاجر)`
                         : `🔥 قبول طلب ساخن (${order.batch_info?.stores?.length || 0} متاجر)`
                       : 'قبول طلب التوصيل'}
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
            <ShoppingBag size={18} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
            <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>طلبات المتجر ({shopOrders.length})</h3>
          </div>
          <div className="space-y-3">
            {shopOrders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border overflow-hidden ${
                  isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200 shadow-sm'
                }`}
              >
                {/* Header */}
                <div className={`flex items-center justify-between px-4 py-3 border-b ${
                  isDark ? 'bg-[#252525] border-[#333]' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <ShoppingBag size={14} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
                    <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>طلب منتجات</span>
                  </div>
                  <span className={`px-3 py-1 rounded-lg font-bold text-sm ${
                    isDark ? 'bg-green-500/20 text-green-400 border border-green-500' : 'bg-green-100 text-green-700 border border-green-300'
                  }`}>{formatPrice(order.total)}</span>
                </div>
                
                <div className="p-4">
                  {/* رقم الطلب ورسوم التوصيل */}
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>#{order.id?.slice(0, 8)}</span>
                      {order.delivery_fee && (
                        <span className={`mr-2 text-xs ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                          🏍️ {order.delivery_fee.toLocaleString()} ل.س
                        </span>
                      )}
                    </div>
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Clock size={12} className="inline ml-1" />
                      {order.created_at ? new Date(order.created_at).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' }) : 'الآن'}
                    </span>
                  </div>

                  {/* عدد المنتجات */}
                  <div className={`mb-3 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    📦 {order.items?.length || 0} منتج
                  </div>

                  {/* من أين - البائع */}
                  <div className={`rounded-xl p-3 mb-2 border ${
                    isDark ? 'bg-[#1a2e1a] border-green-900' : 'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                        <Navigation size={14} className="text-white" />
                      </div>
                      <span className={`text-sm font-bold ${isDark ? 'text-green-400' : 'text-green-700'}`}>من (البائع)</span>
                    </div>
                    {order.seller_addresses?.map((seller, i) => (
                      <div key={i} className={`mr-10 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{seller.business_name || seller.name}</p>
                        <p>{typeof seller.address === 'object' 
                          ? [seller.address?.area, seller.address?.street, seller.address?.building].filter(Boolean).join(', ') || seller.city
                          : (seller.address || seller.city)}</p>
                        <p>{seller.city}</p>
                        <a href={`tel:${seller.phone}`} className={`flex items-center gap-1 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                          <Phone size={12} /> {seller.phone}
                        </a>
                      </div>
                    ))}
                  </div>

                  {/* إلى أين - المشتري */}
                  <div className={`rounded-xl p-3 mb-3 border ${
                    isDark ? 'bg-[#2e2a1a] border-yellow-900' : 'bg-amber-50 border-amber-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
                        <MapPin size={14} className="text-white" />
                      </div>
                      <span className={`text-sm font-bold ${isDark ? 'text-yellow-400' : 'text-amber-700'}`}>إلى ({order.buyer_address?.name || 'المشتري'})</span>
                    </div>
                    <div className={`mr-10 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      <p className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {typeof order.buyer_address?.address === 'object'
                          ? [order.buyer_address?.address?.area, order.buyer_address?.address?.street, order.buyer_address?.address?.building].filter(Boolean).join(', ')
                          : order.buyer_address?.address}
                      </p>
                      <p>{order.buyer_address?.city}</p>
                      <p className={`flex items-center gap-1 text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        <Lock size={10} /> رقم العميل مخفي
                      </p>
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
                      className="bg-green-600 text-white py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1"
                    >
                      <Map size={14} />
                      البائع
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openInGoogleMaps(order.buyer_address?.address, order.buyer_address?.city);
                      }}
                      className="bg-amber-500 text-white py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1"
                    >
                      <Map size={14} />
                      المشتري
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // عرض المسار على الخريطة الداخلية
                        if (onShowRouteForOrder) {
                          onShowRouteForOrder(order, 'product');
                        }
                      }}
                      className="bg-blue-500 text-white py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1"
                    >
                      <Navigation size={14} />
                      الخريطة
                    </button>
                  </div>

                  {/* عدد المنتجات */}
                  <p className={`text-sm mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    عدد المنتجات: {order.items?.length || 0}
                  </p>

                  {/* زر أخذ الطلب */}
                  <button
                    onClick={() => onTakeOrder(order)}
                    disabled={!isWorkingHours()}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
