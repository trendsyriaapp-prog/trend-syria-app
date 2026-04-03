import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, MapPin, UtensilsCrossed, ShoppingBag, Clock, Locate } from 'lucide-react';
import { formatPrice } from '../../utils/imageHelpers';
import { 
  getCurrentLocation, 
  calculateOrderDistances, 
  formatDistance 
} from '../../utils/distanceCalculator';

const AvailableOrdersList = ({ orders, foodOrders = [], isWorkingHours, onTakeOrder, onTakeFoodOrder, onAcceptDriverRequest, orderTypeFilter = 'all', theme = 'dark' }) => {
  const [driverLocation, setDriverLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [orderDistances, setOrderDistances] = useState({});
  
  const isDark = theme === 'dark';

  // حساب المسافات عند تغيير موقع السائق
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

  // الفلترة تتم في DeliveryPages.js قبل تمرير الـ props
  // orders = طلبات المتجر (المنتجات)
  // foodOrders = طلبات الطعام
  
  // التأكد من أن المصفوفات صالحة
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeFoodOrders = Array.isArray(foodOrders) ? foodOrders : [];
  
  // طلبات الطعام: استخدم foodOrders فقط (لا تأخذ من orders)
  const displayFoodOrders = safeFoodOrders;
  
  // طلبات المتجر: استخدم orders وفلتر طلبات الطعام (order_source === 'food' أو وجود store_id/restaurant_name)
  const shopOrders = safeOrders.filter(o => {
    // إذا كان order_source = 'food' فهو طلب طعام
    if (o.order_source === 'food') return false;
    // إذا كان لديه store_id أو restaurant_name فهو طلب طعام
    if (o.store_id || o.restaurant_name) return false;
    // غير ذلك هو طلب متجر
    return true;
  });
  
  const allOrders = [...shopOrders, ...displayFoodOrders];
  
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

  // حساب ربح السائق
  const getDriverEarnings = (order) => {
    return order.driver_earnings || order.driver_delivery_fee || order.delivery_fee || 0;
  };

  // الحصول على المسافة الإجمالية
  const getTotalDistance = (orderId) => {
    const distance = orderDistances[orderId];
    if (distance) {
      return formatDistance(distance.total);
    }
    return null;
  };

  // بطاقة الطلب البسيطة
  const SimpleOrderCard = ({ order, isFood = true }) => {
    const earnings = getDriverEarnings(order);
    const distance = getTotalDistance(order.id);
    const storeName = order.store_name || order.restaurant_name || 'متجر';
    const deliveryArea = order.buyer_address?.city || order.delivery_address?.city || '';
    
    // للطلب التجميعي
    const isBatch = order.is_batch;
    const batchStoresCount = order.batch_info?.stores?.length || 0;
    
    // للطلب متعدد المتاجر
    const isMultiStore = order.stores?.length > 1;
    const storesCount = order.stores?.length || 1;

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-2xl border overflow-hidden ${
          isBatch 
            ? order.batch_category === 'cold_dry'
              ? (isDark ? 'bg-gradient-to-br from-[#1a2e1a] to-[#1a1a1a] border-emerald-500/50' : 'bg-gradient-to-br from-emerald-50 to-white border-emerald-300')
              : (isDark ? 'bg-gradient-to-br from-[#2e1a1a] to-[#1a1a1a] border-orange-500/50' : 'bg-gradient-to-br from-orange-50 to-white border-orange-300')
            : (isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200 shadow-sm')
        }`}
      >
        <div className="p-4">
          {/* اسم المتجر/المطعم */}
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isFood 
                ? (isDark ? 'bg-green-500/20' : 'bg-green-100')
                : (isDark ? 'bg-blue-500/20' : 'bg-blue-100')
            }`}>
              <span className="text-2xl">{isFood ? '🍔' : '📦'}</span>
            </div>
            <div className="flex-1">
              <h3 className={`font-bold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {storeName}
              </h3>
              {deliveryArea && (
                <p className={`text-xs flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <MapPin size={12} />
                  التسليم: {deliveryArea}
                </p>
              )}
            </div>
          </div>

          {/* علامات خاصة */}
          {(isBatch || isMultiStore || order.is_priority) && (
            <div className="flex flex-wrap gap-2 mb-3">
              {isBatch && (
                <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                  order.batch_category === 'cold_dry'
                    ? (isDark ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50' : 'bg-emerald-100 text-emerald-700')
                    : (isDark ? 'bg-orange-500/20 text-orange-300 border border-orange-500/50' : 'bg-orange-100 text-orange-700')
                }`}>
                  ⚡ تجميعي ({batchStoresCount} متاجر)
                </span>
              )}
              {isMultiStore && (
                <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                  isDark ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50' : 'bg-purple-100 text-purple-700'
                }`}>
                  📦 {storesCount} استلام → 1 تسليم
                </span>
              )}
              {order.is_priority && (
                <span className="text-xs px-2 py-1 rounded-full font-bold bg-yellow-500 text-black">
                  ⚡ أولوية
                </span>
              )}
            </div>
          )}

          {/* المسافة والربح */}
          <div className={`flex items-center justify-between p-3 rounded-xl mb-3 ${
            isDark ? 'bg-[#252525]' : 'bg-gray-50'
          }`}>
            {/* المسافة */}
            <div className="text-center">
              {distance ? (
                <>
                  <p className={`text-lg font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                    📍 {distance}
                  </p>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>المسافة</p>
                </>
              ) : (
                <button
                  onClick={handleGetLocation}
                  disabled={loadingLocation}
                  className={`flex items-center gap-1 text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
                >
                  <Locate size={14} className={loadingLocation ? 'animate-spin' : ''} />
                  {loadingLocation ? 'جاري...' : 'تحديد المسافة'}
                </button>
              )}
            </div>

            {/* خط فاصل */}
            <div className={`w-px h-10 ${isDark ? 'bg-[#333]' : 'bg-gray-200'}`}></div>

            {/* الربح */}
            <div className="text-center">
              <p className={`text-lg font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                💵 {earnings > 0 ? earnings.toLocaleString() : '---'}
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>ربحك (ل.س)</p>
            </div>
          </div>

          {/* زر القبول */}
          {order.can_accept === false ? (
            /* زر معطل مع رسالة توضيحية */
            <div className="space-y-2">
              <button
                disabled
                className={`w-full py-4 rounded-xl font-bold text-base cursor-not-allowed transition-all ${
                  isDark 
                    ? 'bg-gray-700 text-gray-400 border border-gray-600' 
                    : 'bg-gray-200 text-gray-500 border border-gray-300'
                }`}
              >
                🔒 غير متاح حالياً
              </button>
              <p className={`text-center text-sm ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                ⚠️ {order.cannot_accept_reason || 'أكمل طلباتك الحالية أولاً'}
              </p>
            </div>
          ) : (
            /* زر القبول النشط */
            <button
              onClick={() => {
                if (isFood) {
                  // إذا كان طلب driver_request
                  if (order.is_driver_request && onAcceptDriverRequest) {
                    onAcceptDriverRequest(order);
                  } else if (onTakeFoodOrder) {
                    onTakeFoodOrder(order);
                  }
                } else {
                  onTakeOrder(order);
                }
              }}
              disabled={!isWorkingHours()}
              className={`w-full py-4 rounded-xl font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                isBatch 
                  ? order.batch_category === 'cold_dry'
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500'
                    : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-400 hover:to-orange-500'
                  : isFood
                    ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-400 hover:to-green-500'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-400 hover:to-blue-500'
              }`}
            >
              {!isWorkingHours() ? '⏰ خارج أوقات العمل' : '✅ قبول الطلب'}
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      {/* طلبات الطعام */}
      {displayFoodOrders.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <UtensilsCrossed size={18} className={isDark ? 'text-green-400' : 'text-green-600'} />
            <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              طلبات الطعام ({displayFoodOrders.length})
            </h3>
          </div>
          <div className="space-y-3">
            {displayFoodOrders.map((order) => (
              <SimpleOrderCard key={order.id} order={order} isFood={true} />
            ))}
          </div>
        </div>
      )}

      {/* طلبات المتجر */}
      {shopOrders.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag size={18} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
            <h3 className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              طلبات المتجر ({shopOrders.length})
            </h3>
          </div>
          <div className="space-y-3">
            {shopOrders.map((order) => (
              <SimpleOrderCard key={order.id} order={order} isFood={false} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailableOrdersList;
