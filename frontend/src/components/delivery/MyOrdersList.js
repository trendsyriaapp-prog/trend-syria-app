import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Phone, MessageCircle, HelpCircle, CheckCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import axios from 'axios';
import OrdersMap from './OrdersMap';
import DailyEarningsWidget from './DailyEarningsWidget';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Hook لمنع التمرير في الخلفية عند فتح Modal
const usePreventBodyScroll = (isOpen) => {
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
    };
  }, [isOpen]);
};

const MyOrdersList = ({ 
  orders, 
  foodOrders = [],
  availableOrders = [],
  availableFoodOrders = [],
  onStartDelivery, 
  onShowDeliveryChecklist,
  onOpenETAModal,
  orderTypeFilter = 'all',
  theme = 'dark',
  onOrderCancelled,
  onRefresh
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const isDark = theme === 'dark';

  // States
  const [expandedOrders, setExpandedOrders] = useState({});
  const [showCodeModal, setShowCodeModal] = useState(null);
  const [showPickupCodeModal, setShowPickupCodeModal] = useState(null);
  const [deliveryCode, setDeliveryCode] = useState('');
  const [pickupCode, setPickupCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(null);
  const [helpReason, setHelpReason] = useState('');
  const [helpMessage, setHelpMessage] = useState('');
  const [helpLoading, setHelpLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);

  // منع التمرير عند فتح Modal
  const isAnyModalOpen = !!(showCodeModal || showPickupCodeModal || showHelpModal);
  usePreventBodyScroll(isAnyModalOpen);

  // دمج جميع الطلبات
  const allOrders = [...orders, ...foodOrders].filter(o => 
    o.status !== 'delivered' && o.delivery_status !== 'delivered'
  );

  // حساب الإجماليات
  const totalEarnings = allOrders.reduce((sum, order) => {
    return sum + (order.driver_earnings || order.driver_delivery_fee || order.delivery_fee || 0);
  }, 0);

  // Toggle توسيع الطلب
  const toggleExpand = (orderId) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  // الحصول على حالة الطلب
  const getOrderStatus = (order) => {
    const status = order.delivery_status || order.status;
    if (status === 'picked_up' || status === 'on_the_way') {
      return 'to_customer'; // في الطريق للعميل
    }
    return 'to_store'; // في الطريق للمتجر
  };

  // الحصول على ربح السائق
  const getDriverEarnings = (order) => {
    return order.driver_earnings || order.driver_delivery_fee || order.delivery_fee || 0;
  };

  // وصلت للمتجر
  const handleArrivedAtStore = async (order) => {
    setShowPickupCodeModal(order);
  };

  // تأكيد الاستلام بالكود
  const handleConfirmPickup = async () => {
    if (!pickupCode || pickupCode.length < 4) {
      toast({ title: "خطأ", description: "أدخل كود الاستلام (4 أرقام)", variant: "destructive" });
      return;
    }

    setVerifying(true);
    try {
      const isFood = showPickupCodeModal.store_id || showPickupCodeModal.restaurant_name;
      const endpoint = isFood 
        ? `${API}/food/orders/driver/orders/${showPickupCodeModal.id}/pickup`
        : `${API}/delivery/orders/${showPickupCodeModal.id}/pickup`;

      await axios.post(endpoint, { pickup_code: pickupCode });
      
      toast({ title: "تم!", description: "تم تأكيد الاستلام بنجاح" });
      setShowPickupCodeModal(null);
      setPickupCode('');
      if (onRefresh) onRefresh();
    } catch (error) {
      toast({ 
        title: "خطأ", 
        description: error.response?.data?.detail || "كود الاستلام غير صحيح", 
        variant: "destructive" 
      });
    } finally {
      setVerifying(false);
    }
  };

  // وصلت للعميل
  const handleArrivedAtCustomer = async (order) => {
    setShowCodeModal(order);
  };

  // تأكيد التسليم بالكود
  const handleConfirmDelivery = async () => {
    if (!deliveryCode || deliveryCode.length < 4) {
      toast({ title: "خطأ", description: "أدخل كود التسليم (4 أرقام)", variant: "destructive" });
      return;
    }

    setVerifying(true);
    try {
      const isFood = showCodeModal.store_id || showCodeModal.restaurant_name;
      const endpoint = isFood 
        ? `${API}/food/orders/driver/orders/${showCodeModal.id}/deliver`
        : `${API}/delivery/orders/${showCodeModal.id}/deliver`;

      await axios.post(endpoint, { delivery_code: deliveryCode });
      
      toast({ title: "🎉 تم التسليم!", description: `تمت إضافة ${getDriverEarnings(showCodeModal).toLocaleString()} ل.س لمحفظتك` });
      setShowCodeModal(null);
      setDeliveryCode('');
      if (onRefresh) onRefresh();
    } catch (error) {
      toast({ 
        title: "خطأ", 
        description: error.response?.data?.detail || "كود التسليم غير صحيح", 
        variant: "destructive" 
      });
    } finally {
      setVerifying(false);
    }
  };

  // طلب مساعدة
  const handleRequestHelp = async () => {
    if (!helpReason) {
      toast({ title: "خطأ", description: "اختر سبب المساعدة", variant: "destructive" });
      return;
    }

    setHelpLoading(true);
    try {
      await axios.post(`${API}/support/emergency-help`, {
        order_id: showHelpModal.id,
        reason: helpReason,
        message: helpMessage
      });
      
      toast({ title: "تم!", description: "تم إرسال طلب المساعدة - فريق الدعم سيتواصل معك" });
      setShowHelpModal(null);
      setHelpReason('');
      setHelpMessage('');
    } catch (error) {
      toast({ 
        title: "خطأ", 
        description: error.response?.data?.detail || "حدث خطأ", 
        variant: "destructive" 
      });
    } finally {
      setHelpLoading(false);
    }
  };

  // فتح Google Maps لجميع الطلبات
  const openGoogleMapsForAll = () => {
    if (allOrders.length === 0) {
      toast({ title: "لا توجد طلبات", variant: "destructive" });
      return;
    }

    const waypoints = [];
    
    allOrders.forEach(order => {
      const storeLat = order.store_latitude || order.seller_addresses?.[0]?.latitude;
      const storeLng = order.store_longitude || order.seller_addresses?.[0]?.longitude;
      const custLat = order.latitude || order.buyer_address?.latitude || order.delivery_address?.latitude;
      const custLng = order.longitude || order.buyer_address?.longitude || order.delivery_address?.longitude;
      
      if (storeLat && storeLng) {
        waypoints.push(`${storeLat},${storeLng}`);
      }
      if (custLat && custLng) {
        waypoints.push(`${custLat},${custLng}`);
      }
    });

    if (waypoints.length === 0) {
      toast({ title: "لا توجد إحداثيات", variant: "destructive" });
      return;
    }

    const driverLat = 33.5138;
    const driverLng = 36.2765;
    const destination = waypoints.pop();
    const waypointsStr = waypoints.join('|');

    let url = `https://www.google.com/maps/dir/?api=1`;
    url += `&origin=${driverLat},${driverLng}`;
    url += `&destination=${destination}`;
    if (waypointsStr) url += `&waypoints=${waypointsStr}`;
    url += `&travelmode=driving`;

    window.open(url, '_blank');
  };

  // اتصال بالعميل
  const callCustomer = (phone) => {
    window.open(`tel:${phone}`, '_self');
  };

  // محادثة العميل
  const chatWithCustomer = (order) => {
    navigate(`/chat/${order.id}`);
  };

  if (allOrders.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📦</div>
        <p className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          لا توجد طلبات حالياً
        </p>
        <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
          اقبل طلبات جديدة من "طلبات متاحة"
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Widget ربح اليوم */}
      <DailyEarningsWidget theme={isDark ? 'dark' : 'light'} />
      
      {/* الملخص الإجمالي */}
      <div className={`rounded-2xl p-4 ${isDark ? 'bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30' : 'bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200'}`}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>لديك</p>
            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {allOrders.length} طلب
            </p>
          </div>
          <div className="text-left">
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>إجمالي ربحك</p>
            <p className={`text-2xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
              💵 {totalEarnings.toLocaleString()} ل.س
            </p>
          </div>
        </div>

        {/* زر Google Maps */}
        <button
          onClick={openGoogleMapsForAll}
          className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-base font-bold flex items-center justify-center gap-3 shadow-lg hover:shadow-xl transition-all"
        >
          <span className="text-2xl">🗺️</span>
          <span>ابدأ التوصيل في Google Maps</span>
        </button>
      </div>

      {/* زر عرض الخريطة */}
      <button
        onClick={() => setShowMap(!showMap)}
        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${
          isDark 
            ? 'bg-[#1a1a1a] border border-[#333] text-white' 
            : 'bg-white border border-gray-200 text-gray-900'
        }`}
      >
        🗺️ {showMap ? 'إخفاء الخريطة' : `عرض الخريطة (${allOrders.length + (availableOrders?.length || 0) + (availableFoodOrders?.length || 0)} طلب)`}
      </button>

      {/* الخريطة */}
      {showMap && (
        <OrdersMap
          orders={availableOrders}
          foodOrders={availableFoodOrders}
          myOrders={orders}
          myFoodOrders={foodOrders}
          theme={theme}
        />
      )}

      {/* قائمة الطلبات */}
      <div className="space-y-3">
        {allOrders.map((order, index) => {
          const isFood = order.store_id || order.restaurant_name;
          const storeName = order.store_name || order.restaurant_name || 'متجر';
          const customerName = order.buyer_address?.name || order.customer_name || 'العميل';
          const customerArea = order.buyer_address?.city || order.delivery_address?.city || '';
          const customerPhone = order.buyer_address?.phone || order.customer_phone || '';
          const status = getOrderStatus(order);
          const earnings = getDriverEarnings(order);
          const isExpanded = expandedOrders[order.id];

          return (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl overflow-hidden ${
                isDark ? 'bg-[#1a1a1a] border border-[#333]' : 'bg-white border border-gray-200 shadow-sm'
              }`}
            >
              {/* رأس البطاقة */}
              <div 
                onClick={() => toggleExpand(order.id)}
                className={`p-4 cursor-pointer ${
                  isDark ? 'bg-[#252525]' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                      status === 'to_customer' 
                        ? (isDark ? 'bg-amber-500/20' : 'bg-amber-100')
                        : (isDark ? 'bg-green-500/20' : 'bg-green-100')
                    }`}>
                      {status === 'to_customer' ? '🚚' : '📦'}
                    </div>
                    <div>
                      <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {index + 1}️⃣ {storeName}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        → {customerArea || customerName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                      💵 {earnings.toLocaleString()}
                    </span>
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  </div>
                </div>

                {/* شريط الحالة */}
                <div className="mt-3 flex items-center gap-2">
                  <div className={`flex-1 h-2 rounded-full ${isDark ? 'bg-[#333]' : 'bg-gray-200'}`}>
                    <div 
                      className={`h-full rounded-full transition-all ${
                        status === 'to_customer' ? 'bg-amber-500 w-1/2' : 'bg-green-500 w-1/4'
                      }`}
                    />
                  </div>
                  <span className={`text-xs font-medium ${
                    status === 'to_customer' 
                      ? (isDark ? 'text-amber-400' : 'text-amber-600')
                      : (isDark ? 'text-green-400' : 'text-green-600')
                  }`}>
                    {status === 'to_customer' ? '🚚 للعميل' : '📦 للمتجر'}
                  </span>
                </div>
              </div>

              {/* المحتوى الموسع */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 space-y-4">
                      {/* معلومات المتجر والعميل */}
                      <div className={`rounded-xl p-3 ${isDark ? 'bg-[#252525]' : 'bg-gray-50'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">🏪</span>
                          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {storeName}
                          </span>
                          {status === 'to_store' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-500 text-white">الحالي</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">👤</span>
                          <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {customerName} - {customerArea}
                          </span>
                          {status === 'to_customer' && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500 text-white">الحالي</span>
                          )}
                        </div>
                      </div>

                      {/* زر الإجراء الرئيسي */}
                      {status === 'to_store' ? (
                        <button
                          onClick={() => handleArrivedAtStore(order)}
                          className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2"
                        >
                          <MapPin size={20} />
                          وصلت للمتجر
                        </button>
                      ) : (
                        <button
                          onClick={() => handleArrivedAtCustomer(order)}
                          className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-bold text-base flex items-center justify-center gap-2"
                        >
                          <MapPin size={20} />
                          وصلت للعميل
                        </button>
                      )}

                      {/* الأزرار الثانوية */}
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          onClick={() => customerPhone && callCustomer(customerPhone)}
                          disabled={!customerPhone}
                          className={`py-3 rounded-xl font-medium text-sm flex flex-col items-center gap-1 ${
                            customerPhone
                              ? (isDark ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-50 text-blue-600 border border-blue-200')
                              : (isDark ? 'bg-[#252525] text-gray-600' : 'bg-gray-100 text-gray-400')
                          }`}
                        >
                          <Phone size={18} />
                          <span>اتصال</span>
                        </button>
                        <button
                          onClick={() => chatWithCustomer(order)}
                          className={`py-3 rounded-xl font-medium text-sm flex flex-col items-center gap-1 ${
                            isDark ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-purple-50 text-purple-600 border border-purple-200'
                          }`}
                        >
                          <MessageCircle size={18} />
                          <span>محادثة</span>
                        </button>
                        <button
                          onClick={() => setShowHelpModal(order)}
                          className={`py-3 rounded-xl font-medium text-sm flex flex-col items-center gap-1 ${
                            isDark ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-red-50 text-red-600 border border-red-200'
                          }`}
                        >
                          <HelpCircle size={18} />
                          <span>مساعدة</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Modal إدخال كود الاستلام */}
      {showPickupCodeModal && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          style={{ touchAction: 'none' }}
          onTouchMove={(e) => e.preventDefault()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`w-full max-w-sm rounded-2xl p-6 ${isDark ? 'bg-[#1a1a1a]' : 'bg-white'}`}
          >
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">📦</div>
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                تأكيد الاستلام
              </h3>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                أدخل كود الاستلام من البائع
              </p>
            </div>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={pickupCode}
              onChange={(e) => setPickupCode(e.target.value.replace(/\D/g, ''))}
              placeholder="أدخل الكود"
              className={`w-full text-center text-3xl font-bold py-4 rounded-xl mb-4 ${
                isDark ? 'bg-[#252525] text-white border border-[#333]' : 'bg-gray-100 text-gray-900 border border-gray-200'
              }`}
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setShowPickupCodeModal(null);
                  setPickupCode('');
                }}
                className={`py-3 rounded-xl font-bold ${
                  isDark ? 'bg-[#252525] text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmPickup}
                disabled={verifying || pickupCode.length < 4}
                className="py-3 rounded-xl font-bold bg-green-500 text-white disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {verifying ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                تأكيد
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal إدخال كود التسليم */}
      {showCodeModal && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          style={{ touchAction: 'none' }}
          onTouchMove={(e) => e.preventDefault()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`w-full max-w-sm rounded-2xl p-6 ${isDark ? 'bg-[#1a1a1a]' : 'bg-white'}`}
          >
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🎉</div>
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                تأكيد التسليم
              </h3>
              <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                أدخل كود التسليم من العميل
              </p>
            </div>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={deliveryCode}
              onChange={(e) => setDeliveryCode(e.target.value.replace(/\D/g, ''))}
              placeholder="أدخل الكود"
              className={`w-full text-center text-3xl font-bold py-4 rounded-xl mb-4 ${
                isDark ? 'bg-[#252525] text-white border border-[#333]' : 'bg-gray-100 text-gray-900 border border-gray-200'
              }`}
            />

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setShowCodeModal(null);
                  setDeliveryCode('');
                }}
                className={`py-3 rounded-xl font-bold ${
                  isDark ? 'bg-[#252525] text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirmDelivery}
                disabled={verifying || deliveryCode.length < 4}
                className="py-3 rounded-xl font-bold bg-amber-500 text-white disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {verifying ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle size={20} />}
                تأكيد
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal طلب المساعدة */}
      {showHelpModal && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          style={{ touchAction: 'none' }}
          onTouchMove={(e) => e.preventDefault()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`w-full max-w-sm rounded-2xl p-6 ${isDark ? 'bg-[#1a1a1a]' : 'bg-white'}`}
          >
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">🆘</div>
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                طلب مساعدة
              </h3>
            </div>

            <div className="space-y-2 mb-4">
              {[
                { id: 'customer_no_answer', label: '📞 العميل لا يرد' },
                { id: 'wrong_address', label: '📍 العنوان خاطئ' },
                { id: 'customer_not_found', label: '👤 لم أجد العميل' },
                { id: 'other', label: '❓ مشكلة أخرى' }
              ].map(reason => (
                <button
                  key={reason.id}
                  onClick={() => setHelpReason(reason.id)}
                  className={`w-full p-3 rounded-xl text-right font-medium transition-all ${
                    helpReason === reason.id
                      ? 'bg-red-500 text-white'
                      : (isDark ? 'bg-[#252525] text-white border border-[#333]' : 'bg-gray-100 text-gray-900 border border-gray-200')
                  }`}
                >
                  {reason.label}
                </button>
              ))}
            </div>

            {helpReason === 'other' && (
              <textarea
                value={helpMessage}
                onChange={(e) => setHelpMessage(e.target.value)}
                placeholder="اشرح المشكلة..."
                className={`w-full p-3 rounded-xl mb-4 ${
                  isDark ? 'bg-[#252525] text-white border border-[#333]' : 'bg-gray-100 text-gray-900 border border-gray-200'
                }`}
                rows={3}
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  setShowHelpModal(null);
                  setHelpReason('');
                  setHelpMessage('');
                }}
                className={`py-3 rounded-xl font-bold ${
                  isDark ? 'bg-[#252525] text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                إلغاء
              </button>
              <button
                onClick={handleRequestHelp}
                disabled={helpLoading || !helpReason}
                className="py-3 rounded-xl font-bold bg-red-500 text-white disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {helpLoading ? <Loader2 className="animate-spin" size={20} /> : null}
                إرسال
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default MyOrdersList;
