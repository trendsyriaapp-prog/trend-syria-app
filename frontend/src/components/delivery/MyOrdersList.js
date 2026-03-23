import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Truck, User, MapPin, Navigation, CheckCircle, ChevronRight, Map, Clock, QrCode, AlertTriangle, MessageCircle, Route, Layers, Lock, XCircle, HelpCircle, Loader2, PhoneCall, Phone } from 'lucide-react';
import { formatPrice } from '../../utils/imageHelpers';
import axios from 'axios';
import OrdersMap from './OrdersMap';
import RouteSelector from './RouteSelector';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../context/AuthContext';
import CallCustomerButton from '../voip/CallCustomerButton';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// فتح العنوان في خرائط Google
const openInGoogleMaps = (address, city) => {
  const fullAddress = `${address}, ${city}, سوريا`;
  const encodedAddress = encodeURIComponent(fullAddress);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  window.open(mapsUrl, '_blank');
};

// مكون عداد الانتظار
const WaitingTimer = ({ arrivedAt, isDark, orderId }) => {
  const [waitingTime, setWaitingTime] = useState(0);
  const [compensation, setCompensation] = useState(0);
  const MAX_WAITING = 10; // 10 دقائق مسموح
  const COMPENSATION_RATE = 500; // 500 ل.س لكل 5 دقائق

  useEffect(() => {
    const calculateTime = () => {
      if (!arrivedAt) return;
      const arrived = new Date(arrivedAt);
      const now = new Date();
      const diffMinutes = (now - arrived) / (1000 * 60);
      setWaitingTime(Math.floor(diffMinutes));
      
      // حساب التعويض
      if (diffMinutes > MAX_WAITING) {
        const extraMinutes = diffMinutes - MAX_WAITING;
        const compensationUnits = Math.ceil(extraMinutes / 5);
        setCompensation(Math.min(compensationUnits * COMPENSATION_RATE, 2000));
      }
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [arrivedAt]);

  const formatTime = (minutes) => {
    const mins = Math.floor(minutes);
    const secs = Math.floor((minutes % 1) * 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isOvertime = waitingTime > MAX_WAITING;

  return (
    <div className={`w-full p-3 rounded-xl mb-3 ${
      isDark 
        ? isOvertime ? 'bg-red-900/30 border border-red-800' : 'bg-blue-900/30 border border-blue-800'
        : isOvertime ? 'bg-red-100 border border-red-300' : 'bg-blue-100 border border-blue-300'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={16} className={isOvertime ? 'text-red-500' : 'text-blue-500'} />
          <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            ⏱️ وقت الانتظار: {waitingTime} دقيقة
          </span>
        </div>
        {!isOvertime && (
          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            الحد: {MAX_WAITING} دقيقة
          </span>
        )}
      </div>
      
      {/* شريط التقدم */}
      <div className={`mt-2 h-2 rounded-full overflow-hidden ${
        isDark ? 'bg-gray-700' : 'bg-gray-300'
      }`}>
        <div 
          className={`h-full transition-all duration-1000 ${
            isOvertime ? 'bg-red-500' : 'bg-blue-500'
          }`}
          style={{ width: `${Math.min((waitingTime / MAX_WAITING) * 100, 100)}%` }}
        />
      </div>
      
      {/* التعويض */}
      {isOvertime && compensation > 0 && (
        <div className={`mt-2 flex items-center justify-between p-2 rounded-lg ${
          isDark ? 'bg-green-900/30' : 'bg-green-100'
        }`}>
          <span className={`text-xs ${isDark ? 'text-green-400' : 'text-green-700'}`}>
            💰 تعويض الانتظار:
          </span>
          <span className="text-sm font-bold text-green-500">
            +{compensation.toLocaleString()} ل.س
          </span>
        </div>
      )}
    </div>
  );
};

const MyOrdersList = ({ 
  orders, 
  foodOrders = [],
  onStartDelivery, 
  onShowDeliveryChecklist,
  onOpenETAModal,
  orderTypeFilter = 'all',
  theme = 'dark', // إضافة خاصية الثيم
  onOrderCancelled, // callback بعد إلغاء الطلب
  onRefresh // callback لتحديث البيانات
}) => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const { toast } = useToast();
  const [showOrderCode, setShowOrderCode] = useState(null);
  const [supportPhone, setSupportPhone] = useState('0911111111');
  
  // نظام كود التسليم للعميل
  const [showCodeModal, setShowCodeModal] = useState(null);
  const [deliveryCode, setDeliveryCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // نظام كود الاستلام من البائع (جديد)
  const [showPickupCodeModal, setShowPickupCodeModal] = useState(null);
  const [pickupCode, setPickupCode] = useState(['', '', '', '']);
  const [pickupCodeError, setPickupCodeError] = useState('');
  const [pickupSubmitting, setPickupSubmitting] = useState(false);
  
  // نظام العميل لا يرد
  const [waitingOrders, setWaitingOrders] = useState({});
  
  // نظام تخطيط المسار الذكي
  const [showRouteOptimizer, setShowRouteOptimizer] = useState(false);
  
  // نظام إلغاء الطلب من السائق
  const [showCancelModal, setShowCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelSettings, setCancelSettings] = useState(null);
  
  // نظام طلب المساعدة الطارئة
  const [showHelpModal, setShowHelpModal] = useState(null);
  const [helpReason, setHelpReason] = useState('');
  const [helpMessage, setHelpMessage] = useState('');
  const [helpLoading, setHelpLoading] = useState(false);
  
  // ساعات التوصيل المسموحة
  const [deliveryHours, setDeliveryHours] = useState({
    is_delivery_allowed: true,
    start_time: '08:00',
    end_time: '23:00',
    message: ''
  });
  
  // تحديد إذا كان الثيم داكن
  const isDark = theme === 'dark';

  // جلب ساعات التوصيل
  useEffect(() => {
    const fetchDeliveryHours = async () => {
      try {
        const res = await axios.get(`${API}/delivery/delivery-hours`);
        setDeliveryHours(res.data);
      } catch (err) {
        console.error('Error fetching delivery hours:', err);
      }
    };
    fetchDeliveryHours();
    // تحديث كل دقيقة
    const interval = setInterval(fetchDeliveryHours, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // جلب رقم الدعم
    axios.get(`${API}/food/orders/admin/support-phone`)
      .then(res => setSupportPhone(res.data.phone))
      .catch(() => {});
  }, []);

  // جلب إعدادات إلغاء السائق
  useEffect(() => {
    const fetchCancelSettings = async () => {
      try {
        const res = await axios.get(`${API}/food/orders/delivery/my-cancel-rate`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCancelSettings(res.data);
      } catch (err) {
        console.error('Error fetching cancel settings:', err);
      }
    };
    if (token) fetchCancelSettings();
  }, [token]);

  // حساب الوقت المتبقي للإلغاء
  const getCancelTimeRemaining = (order) => {
    if (!order.picked_up_at || !cancelSettings) return null;
    
    const pickedUpAt = new Date(order.picked_up_at);
    const now = new Date();
    const elapsedSeconds = (now - pickedUpAt) / 1000;
    const windowSeconds = cancelSettings.cancel_window_seconds || 120;
    const remaining = windowSeconds - elapsedSeconds;
    
    return remaining > 0 ? Math.ceil(remaining) : 0;
  };

  // إلغاء الطلب
  const handleCancelOrder = async () => {
    if (!showCancelModal || !cancelReason) {
      toast({ title: "خطأ", description: "يرجى اختيار سبب الإلغاء", variant: "destructive" });
      return;
    }
    
    setCancelLoading(true);
    try {
      const res = await axios.post(
        `${API}/food/orders/delivery/${showCancelModal.id}/cancel`,
        { reason: cancelReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast({ 
        title: "✅ تم إلغاء الطلب", 
        description: res.data.warning || "تم إعادة الطلب لقائمة الطلبات المتاحة"
      });
      
      // تحديث إعدادات الإلغاء
      if (res.data.cancel_rate) {
        setCancelSettings(prev => ({ ...prev, ...res.data.cancel_rate }));
      }
      
      setShowCancelModal(null);
      setCancelReason('');
      
      // إعادة تحميل الطلبات
      if (onOrderCancelled) onOrderCancelled();
      
    } catch (err) {
      toast({ 
        title: "خطأ", 
        description: err.response?.data?.detail || "فشل إلغاء الطلب", 
        variant: "destructive" 
      });
    } finally {
      setCancelLoading(false);
    }
  };

  // أسباب الإلغاء المتاحة
  const cancelReasons = [
    { id: 'vehicle_issue', label: '🚗 عطل في المركبة' },
    { id: 'emergency', label: '🏥 طارئ شخصي' },
    { id: 'wrong_accept', label: '📍 قبلت بالخطأ' },
    { id: 'long_wait', label: '⏰ وقت الانتظار طويل جداً' },
    { id: 'store_closed', label: '🚫 المطعم مغلق' },
    { id: 'other', label: '❓ سبب آخر' }
  ];

  // تحديث حالة الانتظار لجميع الطلبات
  useEffect(() => {
    const checkWaitingStatus = async () => {
      for (const order of foodOrders) {
        if (order.customer_not_responding && order.status === 'out_for_delivery') {
          try {
            const res = await axios.get(`${API}/food/orders/delivery/${order.id}/waiting-status`);
            setWaitingOrders(prev => ({
              ...prev,
              [order.id]: res.data
            }));
          } catch (err) {
            console.error(err);
          }
        }
      }
    };
    checkWaitingStatus();
    const interval = setInterval(checkWaitingStatus, 30000); // تحديث كل 30 ثانية
    return () => clearInterval(interval);
  }, [foodOrders]);

  // التحقق من كود التسليم للعميل
  const handleVerifyCode = async (orderId) => {
    if (!deliveryCode || deliveryCode.length !== 4) {
      setCodeError('الكود يجب أن يكون 4 أرقام');
      return;
    }
    setSubmitting(true);
    setCodeError('');
    try {
      await axios.post(`${API}/food/orders/delivery/${orderId}/verify-code`, {
        delivery_code: deliveryCode
      });
      // إغلاق المودال أولاً قبل أي شيء آخر
      setShowCodeModal(null);
      setDeliveryCode('');
      setCodeError('');
      // عرض رسالة النجاح
      toast({
        title: "تم التسليم بنجاح! ✅",
        description: "تم تأكيد التسليم وإضافة أجرتك للمحفظة"
      });
      // تحديث البيانات بدل reload الصفحة
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      setCodeError(err.response?.data?.detail || 'كود خاطئ');
    } finally {
      setSubmitting(false);
    }
  };

  // التحقق من كود الاستلام من البائع
  const handleVerifyPickupCode = async (orderId) => {
    const code = pickupCode.join('');
    if (code.length !== 4) {
      setPickupCodeError('الكود يجب أن يكون 4 أرقام');
      return;
    }
    setPickupSubmitting(true);
    setPickupCodeError('');
    try {
      await axios.post(`${API}/food/orders/delivery/${orderId}/verify-pickup`, {
        code: code
      });
      // إغلاق المودال أولاً
      setShowPickupCodeModal(null);
      setPickupCode(['', '', '', '']);
      setPickupCodeError('');
      // عرض رسالة النجاح
      toast({
        title: "تم تأكيد الاستلام! ✅",
        description: "تم استلام الطلب من البائع بنجاح"
      });
      // تحديث البيانات بدل reload
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      setPickupCodeError(err.response?.data?.detail || 'كود خاطئ');
    } finally {
      setPickupSubmitting(false);
    }
  };

  // البائع غير موجود - إبلاغ الإدارة
  const handleSellerNotFound = async (order) => {
    const confirmReport = window.confirm(
      `هل أنت متأكد أن البائع "${order.store_name}" غير موجود؟\n\nسيتم إبلاغ الإدارة وقد يُلغى الطلب.`
    );
    
    if (!confirmReport) return;
    
    try {
      await axios.post(`${API}/orders/driver/seller-not-found`, {
        order_id: order.id,
        order_type: order.restaurant_id ? 'food' : 'product'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast({
        title: "تم الإبلاغ ✅",
        description: "تم إبلاغ الإدارة. يمكنك قبول طلب آخر.",
      });
      
      if (onRefresh) {
        onRefresh();
      }
    } catch (err) {
      toast({
        title: "خطأ",
        description: err.response?.data?.detail || "فشل في الإبلاغ",
        variant: "destructive"
      });
    }
  };

  // إدخال كود الاستلام رقم برقم
  const handlePickupCodeChange = (index, value) => {
    if (value.length > 1) return;
    const newCode = [...pickupCode];
    newCode[index] = value;
    setPickupCode(newCode);
    setPickupCodeError('');
    
    // الانتقال للحقل التالي تلقائياً
    if (value && index < 3) {
      const nextInput = document.getElementById(`pickup-code-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  // تسجيل وصول السائق للمطعم مع التحقق من الموقع
  const handleDriverArrival = async (orderId) => {
    // الحصول على موقع السائق الحالي
    if (!navigator.geolocation) {
      alert('متصفحك لا يدعم تحديد الموقع. يرجى تحديث المتصفح.');
      return;
    }

    // عرض رسالة انتظار
    const loadingToast = toast({
      title: "جاري تحديد موقعك...",
      description: "يرجى الانتظار",
    });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          const res = await axios.post(
            `${API}/food/orders/delivery/${orderId}/arrived`,
            null,
            { params: { latitude, longitude } }
          );
          toast({
            title: "✅ تم تسجيل وصولك",
            description: "سيبدأ عداد الانتظار الآن",
          });
          window.location.reload();
        } catch (err) {
          toast({
            title: "❌ خطأ",
            description: err.response?.data?.detail || 'حدث خطأ',
            variant: "destructive"
          });
        }
      },
      (error) => {
        // في حالة رفض الموقع أو خطأ، نحاول بدون موقع
        console.error('Geolocation error:', error);
        toast({
          title: "⚠️ تعذر تحديد الموقع",
          description: "سيتم المحاولة بدون تحديد الموقع",
          variant: "destructive"
        });
        
        // محاولة بدون موقع (للحالات الطارئة)
        axios.post(`${API}/food/orders/delivery/${orderId}/arrived`)
          .then(() => {
            toast({
              title: "✅ تم تسجيل وصولك",
              description: "سيبدأ عداد الانتظار الآن",
            });
            window.location.reload();
          })
          .catch((err) => {
            toast({
              title: "❌ خطأ",
              description: err.response?.data?.detail || 'حدث خطأ',
              variant: "destructive"
            });
          });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // العميل لا يرد
  const handleCustomerNotResponding = async (orderId) => {
    try {
      const res = await axios.post(`${API}/food/orders/delivery/${orderId}/customer-not-responding`);
      setWaitingOrders(prev => ({
        ...prev,
        [orderId]: {
          is_waiting: true,
          remaining_minutes: res.data.remaining_minutes,
          can_leave_at_door: false
        }
      }));
      alert(`تم تسجيل عدم رد العميل. انتظر ${res.data.wait_time_minutes} دقيقة`);
    } catch (err) {
      alert(err.response?.data?.detail || 'حدث خطأ');
    }
  };

  // ترك الطلب عند الباب
  const handleLeaveAtDoor = async (orderId) => {
    if (!confirm('هل أنت متأكد من ترك الطلب عند الباب؟')) return;
    try {
      await axios.post(`${API}/food/orders/delivery/${orderId}/leave-at-door`);
      alert('تم ترك الطلب عند الباب وإتمام التسليم ✅');
      window.location.reload();
    } catch (err) {
      alert(err.response?.data?.detail || 'حدث خطأ');
    }
  };

  const allOrders = [...orders, ...foodOrders];
  
  if (allOrders.length === 0) {
    return (
      <div className={`rounded-xl p-8 text-center border ${
        isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200'
      }`}>
        <Truck size={48} className={isDark ? 'text-gray-600 mx-auto mb-4' : 'text-gray-300 mx-auto mb-4'} />
        <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
          {orderTypeFilter === 'food' ? 'لا توجد طلبات طعام لديك' : 
           orderTypeFilter === 'products' ? 'لا توجد طلبات منتجات لديك' : 
           'لم تأخذ أي طلبات بعد'}
        </p>
      </div>
    );
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'delivered': return 'تم التسليم';
      case 'on_the_way': return 'في الطريق';
      case 'picked_up': return 'تم الاستلام';
      case 'out_for_delivery': return 'جاري التوصيل';
      default: return 'قيد التوصيل';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered': return 'bg-orange-100 text-orange-600';
      case 'on_the_way': return 'bg-orange-100 text-orange-600';
      case 'picked_up': return 'bg-green-100 text-green-600';
      case 'out_for_delivery': return 'bg-purple-100 text-purple-600';
      default: return 'bg-yellow-100 text-yellow-600';
    }
  };

  // فتح الاتصال بالدعم
  const callSupport = () => {
    window.location.href = `tel:${supportPhone}`;
  };

  // طلب مساعدة طارئة
  const requestEmergencyHelp = async (orderId) => {
    if (!helpReason) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار سبب طلب المساعدة",
        variant: "destructive"
      });
      return;
    }
    
    setHelpLoading(true);
    try {
      await axios.post(`${API}/support/emergency-help`, {
        order_id: orderId,
        reason: helpReason,
        message: helpMessage || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast({
        title: "✅ تم إرسال الطلب",
        description: "فريق الدعم سيتواصل مع العميل"
      });
      
      setShowHelpModal(null);
      setHelpReason('');
      setHelpMessage('');
    } catch (err) {
      toast({
        title: "خطأ",
        description: err.response?.data?.detail || "فشل إرسال طلب المساعدة",
        variant: "destructive"
      });
    } finally {
      setHelpLoading(false);
    }
  };

  // حساب عدد طلبات المنتجات غير المسلمة
  const undeliveredProductOrders = orders.filter(o => 
    (!o.order_type || o.order_type !== 'food') && 
    o.delivery_status !== 'delivered' && 
    o.status !== 'delivered'
  );

  return (
    <div className="space-y-2">
      {/* خريطة طلباتي المقبولة */}
      {(orders.length > 0 || foodOrders.length > 0) && (
        <OrdersMap
          orders={[]}
          foodOrders={[]}
          myOrders={orders}
          myFoodOrders={foodOrders}
          theme={theme}
        />
      )}

      {/* زر تخطيط المسار الذكي */}
      {(orders.length > 0 || foodOrders.length > 0) && (
        <button
          onClick={() => setShowRouteOptimizer(true)}
          className={`w-full p-3 rounded-xl flex items-center justify-between transition-all ${
            isDark 
              ? 'bg-gradient-to-l from-orange-600/20 to-red-600/20 border border-orange-500/30 hover:border-orange-500/50' 
              : 'bg-gradient-to-l from-orange-50 to-red-50 border border-orange-200 hover:border-orange-300'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Route size={20} className="text-white" />
            </div>
            <div className="text-right">
              <p className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                تخطيط المسار الذكي
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                احصل على أفضل ترتيب للتوصيل ووفّر الوقت والبنزين
              </p>
            </div>
          </div>
          <ChevronRight size={20} className={isDark ? 'text-orange-400' : 'text-orange-500'} />
        </button>
      )}

      {/* Modal تخطيط المسار */}
      {showRouteOptimizer && (
        <RouteSelector
          foodOrders={foodOrders}
          productOrders={orders}
          onClose={() => setShowRouteOptimizer(false)}
          theme={theme}
        />
      )}

      {/* تنبيه طلبات المنتجات - يجب التسليم اليوم */}
      {undeliveredProductOrders.length > 0 && (
        <div className={`rounded-xl p-3 text-white ${
          isDark ? 'bg-gradient-to-r from-red-600 to-orange-600' : 'bg-gradient-to-r from-red-500 to-orange-500'
        }`}>
          <div className="flex items-start gap-2">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
              <Clock size={18} />
            </div>
            <div>
              <p className="font-bold text-sm">⚠️ تنبيه هام!</p>
              <p className="text-xs text-white/90 mt-0.5">
                لديك {undeliveredProductOrders.length} طلب منتجات يجب تسليمها قبل نهاية ساعات العمل اليوم.
              </p>
              <p className="text-[10px] text-white/80 mt-1 bg-white/10 rounded px-2 py-1">
                ❌ سيتم خصم قيمة المنتجات غير المُسلّمة من رصيدك
              </p>
            </div>
          </div>
        </div>
      )}

      {/* زر الاتصال بالدعم */}
      <div className={`rounded-lg p-2 flex items-center justify-between ${
        isDark ? 'bg-red-900/30 border border-red-800' : 'bg-red-50 border border-red-200'
      }`}>
        <div className="flex items-center gap-1.5">
          <AlertTriangle size={14} className="text-red-500" />
          <span className={`text-xs font-medium ${isDark ? 'text-red-400' : 'text-red-700'}`}>إذا حدث مشكلة؟</span>
        </div>
        <button
          onClick={callSupport}
          className="bg-red-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1"
        >
          <PhoneCall size={12} />
          اتصل بالدعم
        </button>
      </div>

      {orders.map((order) => {
        const isProductOrder = !order.order_type || order.order_type !== 'food';
        const isFood = order.order_type === 'food' || order.restaurant_id;
        const orderNumber = order.order_number || order.id?.slice(0, 8).toUpperCase();
        const canStartDelivery = order.delivery_status === 'picked_up' || order.status === 'out_for_delivery';
        const canComplete = order.delivery_status === 'on_the_way' || order.status === 'out_for_delivery';
        const isDelivered = order.delivery_status === 'delivered' || order.status === 'delivered';
        // التحقق من حالة القفل (عندما يكون لدى السائق طلبات طعام نشطة)
        const isLocked = order.is_locked === true;

        return (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border overflow-hidden ${
              isLocked
                ? isDark 
                  ? 'bg-[#1a1a1a]/50 border-orange-600/50 opacity-75' 
                  : 'bg-gray-50 border-orange-300 opacity-75'
                : isDark 
                  ? 'bg-[#1a1a1a] border-[#333]' 
                  : 'bg-white border-gray-200'
            }`}
          >
            <div className="p-3">
              {/* شارة الطلب المقفل - عندما يكون لدى السائق طلبات طعام نشطة */}
              {isLocked && !isDelivered && (
                <div className={`rounded-lg px-3 py-2 mb-3 flex items-start gap-2 ${
                  isDark ? 'bg-orange-900/40 border border-orange-700' : 'bg-orange-100 border border-orange-300'
                }`}>
                  <Lock size={16} className="text-orange-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className={`text-xs font-bold ${isDark ? 'text-orange-400' : 'text-orange-700'}`}>
                      🔒 طلب مقفل مؤقتاً
                    </p>
                    <p className={`text-[10px] mt-0.5 ${isDark ? 'text-orange-300/80' : 'text-orange-600'}`}>
                      {order.lock_reason || 'أكمل توصيل طلبات الطعام أولاً ثم يمكنك تسليم هذا الطلب'}
                    </p>
                  </div>
                </div>
              )}

              {/* شارة يجب التسليم اليوم - للمنتجات فقط (تظهر فقط إذا لم يكن مقفلاً) */}
              {isProductOrder && !isDelivered && !isLocked && (
                <div className={`rounded-lg px-2 py-1 mb-2 flex items-center gap-1.5 ${
                  isDark ? 'bg-red-900/30 border border-red-800' : 'bg-red-100 border border-red-300'
                }`}>
                  <Clock size={12} className="text-red-500" />
                  <span className={`text-[10px] font-bold ${isDark ? 'text-red-400' : 'text-red-700'}`}>🕐 يجب التسليم اليوم</span>
                </div>
              )}

              {/* رقم الطلب الكبير */}
              <div className={`text-white p-3 rounded-xl mb-3 ${
                isLocked 
                  ? 'bg-gradient-to-r from-gray-500 to-gray-600' 
                  : 'bg-gradient-to-r from-green-600 to-emerald-600'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs opacity-80">📦 طلب منتجات {isLocked && '🔒'}</p>
                    <p className="text-2xl font-bold">#{orderNumber}</p>
                  </div>
                  <button
                    onClick={() => setShowOrderCode(showOrderCode === order.id ? null : order.id)}
                    className="bg-white/20 p-2 rounded-lg"
                  >
                    <QrCode size={24} />
                  </button>
                </div>
              </div>

              {/* عرض رقم الطلب للبائع */}
              {showOrderCode === order.id && (
                <div className={`p-4 rounded-xl mb-3 text-center ${
                  isDark ? 'bg-[#252525] text-white' : 'bg-gray-900 text-white'
                }`}>
                  <p className="text-xs text-gray-400 mb-2">اعرض هذا الرقم للبائع</p>
                  <p className="text-4xl font-bold tracking-widest">#{orderNumber}</p>
                  <p className="text-xs text-gray-400 mt-2">للتحقق من صحة الطلب</p>
                </div>
              )}

              <div className="flex items-center justify-between mb-2">
                <span className={`font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {isProductOrder ? 'طلب منتجات' : order.store_name || 'طلب طعام'}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  isDark ? 'bg-green-900/50 text-green-400' : getStatusColor(order.delivery_status || order.status)
                }`}>
                  {getStatusLabel(order.delivery_status || order.status)}
                </span>
              </div>

              {/* معلومات العميل */}
              <div className={`rounded-lg p-2 mb-3 ${
                isDark ? 'bg-[#252525] border border-[#333]' : 'bg-yellow-50'
              }`}>
                <p className={`text-xs font-bold mb-1 ${isDark ? 'text-green-400' : 'text-yellow-700'}`}>🏠 معلومات العميل:</p>
                <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  <User size={12} className="inline ml-1" />
                  {order.user_name || order.customer_name}
                </p>
                <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  <MapPin size={12} className="inline ml-1" />
                  {order.address || (typeof order.delivery_address === 'object' 
                    ? [order.delivery_address?.area, order.delivery_address?.street, order.delivery_address?.building].filter(Boolean).join(', ')
                    : order.delivery_address)}, {order.city || order.delivery_city}
                </p>
                
                {/* أزرار الخرائط */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {order.seller_addresses?.[0] && (
                    <button
                      onClick={() => openInGoogleMaps(
                        order.seller_addresses[0]?.address || order.seller_addresses[0]?.business_name, 
                        order.seller_addresses[0]?.city
                      )}
                      className="py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 bg-blue-600 text-white"
                      data-testid={`open-seller-maps-${order.id}`}
                    >
                      <Map size={12} />
                      🏪 البائع
                    </button>
                  )}
                  <button
                    onClick={() => openInGoogleMaps(order.address || order.delivery_address, order.city || order.delivery_city)}
                    className="py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 bg-green-600 text-white"
                    data-testid={`open-customer-maps-${order.id}`}
                  >
                    <Map size={12} />
                    🏠 العميل
                  </button>
                </div>
                
                {/* تلميح للسائق */}
                {!canStartDelivery && !canComplete && !isDelivered && (
                  <p className={`text-[9px] text-center mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    💡 اذهب للبائع أولاً لاستلام الطلب
                  </p>
                )}
                {canStartDelivery && (
                  <p className={`text-[9px] text-center mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                    💡 تم استلام الطلب - اذهب للعميل الآن
                  </p>
                )}
                
                {/* ملاحظة العميل */}
                {order.delivery_note && (
                  <div className={`mt-2 p-2 rounded-lg border ${
                    isDark ? 'bg-yellow-900/20 border-yellow-700' : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <p className={`text-[10px] font-bold ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>ملاحظة من العميل:</p>
                    <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{order.delivery_note}</p>
                  </div>
                )}
              </div>

              {/* معلومات البائع */}
              {order.seller_name && (
                <div className={`rounded-lg p-2 mb-3 ${
                  isDark ? 'bg-blue-900/20 border border-blue-800' : 'bg-amber-100'
                }`}>
                  <p className={`text-xs font-bold mb-1 ${isDark ? 'text-blue-400' : 'text-amber-800'}`}>🏪 معلومات البائع:</p>
                  <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                    <User size={12} className="inline ml-1" />
                    {order.seller_name || 'البائع'}
                  </p>
                </div>
              )}

              <p className={`font-bold text-sm mb-3 ${isLocked ? 'text-gray-400' : 'text-green-500'}`}>{formatPrice(order.total)}</p>

              {/* أزرار الإجراءات */}
              <div className="space-y-2">
                {/* أزرار معطلة عندما يكون الطلب مقفلاً */}
                {isLocked && !isDelivered && (
                  <div className={`w-full py-3 rounded-lg text-center ${
                    isDark ? 'bg-orange-900/30 border border-orange-700' : 'bg-orange-50 border border-orange-200'
                  }`}>
                    <Lock size={18} className="mx-auto text-orange-500 mb-1" />
                    <p className={`text-xs font-bold ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                      🔒 الإجراءات مقفلة
                    </p>
                    <p className={`text-[10px] mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      أكمل طلبات الطعام أولاً
                    </p>
                  </div>
                )}
                
                {canStartDelivery && !isLocked && (
                  <button
                    onClick={() => onOpenETAModal ? onOpenETAModal(order.id) : onStartDelivery(order.id)}
                    className="w-full bg-green-600 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                    data-testid={`start-delivery-btn-${order.id}`}
                  >
                    <Clock size={14} />
                    في الطريق للعميل
                  </button>
                )}
                {canComplete && !isLocked && (
                  <button
                    onClick={() => onShowDeliveryChecklist(order)}
                    className="w-full bg-green-500 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                    data-testid={`confirm-delivery-btn-${order.id}`}
                  >
                    <CheckCircle size={14} />
                    تأكيد التسليم
                  </button>
                )}
                {!isDelivered && (
                  <div className="space-y-2">
                    {/* زر الاتصال VoIP */}
                    {!isLocked && (
                      <CallCustomerButton
                        orderId={order.id}
                        orderType="shopping"
                        orderNumber={order.order_number || order.id?.slice(0, 8)}
                        className="w-full"
                        size="normal"
                      />
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => onOpenChat && onOpenChat(order.id, order.order_number)}
                        className={`py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 ${
                          isLocked ? 'bg-gray-400 text-white' : 'bg-green-600 text-white'
                        }`}
                        data-testid={`chat-customer-btn-${order.id}`}
                      >
                        <MessageCircle size={14} />
                        محادثة العميل
                      </button>
                      <button
                        onClick={() => setShowHelpModal(order.id)}
                        className={`py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 ${
                          isLocked ? 'bg-gray-400 text-white' : 'bg-orange-500 text-white'
                        }`}
                        data-testid={`help-btn-${order.id}`}
                      >
                        <HelpCircle size={14} />
                        طلب مساعدة
                      </button>
                    </div>
                  </div>
                )}
                {/* رابط للتتبع */}
                <button
                  onClick={() => navigate(`/orders/${order.id}/tracking`)}
                  className={`w-full border py-2 rounded-lg text-sm flex items-center justify-center gap-2 ${
                    isDark ? 'bg-[#252525] border-[#444] text-gray-300' : 'bg-white border-gray-200 text-gray-700'
                  }`}
                >
                  تفاصيل الطلب
                  <ChevronRight size={14} className="rotate-180" />
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}
      
      {/* طلبات الطعام */}
      {foodOrders.map((order) => {
        const orderNumber = order.order_number || order.id?.slice(0, 8).toUpperCase();
        const isFood = true; // طلبات الطعام دائماً
        const canComplete = order.status === 'out_for_delivery';
        const isDelivered = order.status === 'delivered';
        // حالات تسمح بالضغط على "وصلت للمطعم" (قبل الاستلام)
        const canMarkArrived = ['accepted', 'ready_for_pickup', 'preparing', 'ready'].includes(order.status);
        // حالات تسمح بتأكيد الاستلام من البائع (يجب أن يكون السائق وصل أولاً ويوجد كود)
        const canConfirmPickup = canMarkArrived && order.driver_arrived_at && order.pickup_code && !order.pickup_code_verified;

        return (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 10 }}
            className={`rounded-xl border-2 overflow-hidden ${
              isDark ? 'bg-[#1a1a1a] border-orange-600' : 'bg-white border-orange-200'
            }`}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">🍔 طلب طعام #{orderNumber}</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                isDelivered ? 'bg-orange-700' : 'bg-white/20'
              }`}>
                {getStatusLabel(order.status)}
              </span>
            </div>

            <div className="p-3">
              {/* معلومات المتجر */}
              <div className={`rounded-lg p-2 mb-3 ${
                isDark ? 'bg-orange-900/20 border border-orange-800' : 'bg-amber-100'
              }`}>
                <p className={`text-xs font-bold mb-1 ${isDark ? 'text-orange-400' : 'text-amber-800'}`}>📍 من: {order.store_name}</p>
              </div>

              {/* معلومات العميل */}
              <div className={`rounded-lg p-2 mb-3 ${
                isDark ? 'bg-[#252525] border border-[#333]' : 'bg-yellow-50'
              }`}>
                <p className={`text-xs font-bold mb-1 ${isDark ? 'text-green-400' : 'text-yellow-700'}`}>🏠 إلى: {order.customer_name}</p>
                <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  {typeof order.delivery_address === 'object' 
                    ? [order.delivery_address?.area, order.delivery_address?.street, order.delivery_address?.building].filter(Boolean).join(', ')
                    : order.delivery_address}
                </p>
              </div>

              {/* المنتجات */}
              <div className="mb-3">
                <p className={`text-xs font-bold mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>المنتجات:</p>
                {order.items?.map((item, idx) => (
                  <p key={idx} className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    • {item.name} × {item.quantity}
                  </p>
                ))}
              </div>

              {/* السعر */}
              <p className="font-bold text-orange-500 text-sm mb-3">{formatPrice(order.total)}</p>

              {/* أزرار الخرائط */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={() => openInGoogleMaps(order.store_name, 'دمشق')}
                  className="bg-orange-600 text-white py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1"
                >
                  <Map size={12} />
                  🏪 المتجر
                </button>
                <button
                  onClick={() => openInGoogleMaps(order.delivery_address, order.delivery_city || 'دمشق')}
                  className="bg-green-600 text-white py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1"
                >
                  <Map size={12} />
                  🏠 العميل
                </button>
              </div>

              {/* زر إلغاء الطلب - يظهر فقط خلال فترة السماح */}
              {order.status === 'out_for_delivery' && getCancelTimeRemaining(order) > 0 && (
                <button
                  onClick={() => {
                    setShowCancelModal(order);
                    setCancelReason('');
                  }}
                  data-testid={`cancel-btn-${order.id}`}
                  className={`w-full py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 mb-3 ${
                    isDark 
                      ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800' 
                      : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                  }`}
                >
                  <XCircle size={14} />
                  إلغاء الطلب ({getCancelTimeRemaining(order)} ث)
                </button>
              )}

              {/* زر وصلت للمطعم + عداد الانتظار */}
              {canMarkArrived && !order.driver_arrived_at && (
                <button
                  onClick={() => handleDriverArrival(order.id)}
                  data-testid={`arrived-btn-${order.id}`}
                  className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 mb-3 ${
                    isDark 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-blue-500 hover:bg-blue-600 text-white'
                  }`}
                >
                  📍 وصلت للمطعم
                </button>
              )}

              {/* عداد الانتظار */}
              {order.driver_arrived_at && !order.pickup_code_verified && (
                <WaitingTimer 
                  arrivedAt={order.driver_arrived_at} 
                  isDark={isDark}
                  orderId={order.id}
                />
              )}

              {/* رقم هاتف البائع + زر البائع غير موجود - يظهر بعد وصول السائق */}
              {order.driver_arrived_at && !order.pickup_code_verified && (
                <div className={`rounded-lg p-3 mb-3 ${
                  isDark ? 'bg-[#252525] border border-[#333]' : 'bg-gray-50 border border-gray-200'
                }`}>
                  {/* رقم هاتف البائع */}
                  {(order.seller_phone || order.store_phone || order.restaurant_phone) && (
                    <a
                      href={`tel:${order.seller_phone || order.store_phone || order.restaurant_phone}`}
                      className={`flex items-center justify-center gap-2 w-full py-2.5 rounded-lg font-bold text-sm mb-2 ${
                        isDark 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                    >
                      <Phone size={16} />
                      📞 اتصل بالبائع
                    </a>
                  )}
                  
                  {/* زر البائع غير موجود */}
                  <button
                    onClick={() => handleSellerNotFound(order)}
                    className={`flex items-center justify-center gap-2 w-full py-2 rounded-lg font-bold text-xs ${
                      isDark 
                        ? 'bg-red-900/30 hover:bg-red-900/50 text-red-400 border border-red-800' 
                        : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                    }`}
                  >
                    <AlertTriangle size={14} />
                    البائع غير موجود
                  </button>
                </div>
              )}

              {/* زر تأكيد الاستلام من البائع - يظهر فقط بعد وصول السائق ووجود كود */}
              {canConfirmPickup && (
                <button
                  onClick={() => {
                    setShowPickupCodeModal(order);
                    setPickupCode(['', '', '', '']);
                    setPickupCodeError('');
                  }}
                  data-testid={`pickup-code-btn-${order.id}`}
                  className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 mb-3 ${
                    isDark 
                      ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                      : 'bg-purple-500 hover:bg-purple-600 text-white'
                  }`}
                >
                  <QrCode size={18} />
                  📦 تأكيد الاستلام من البائع
                </button>
              )}

              {/* علامة تم الاستلام - تظهر فقط إذا تم التحقق */}
              {order.pickup_code_verified && (
                <div className={`w-full py-2 rounded-xl text-sm flex items-center justify-center gap-2 mb-3 ${
                  isDark ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-green-100 text-green-700 border border-green-300'
                }`}>
                  <CheckCircle size={16} />
                  ✅ تم تأكيد الاستلام من البائع
                </div>
              )}
              
              {/* رسالة إذا الطلب في حالة التوصيل ولم يتم تأكيد الاستلام (حالة قديمة) */}
              {canComplete && !order.pickup_code_verified && !order.pickup_code && (
                <div className={`w-full py-2 rounded-xl text-xs flex items-center justify-center gap-2 mb-3 ${
                  isDark ? 'bg-gray-800 text-gray-400 border border-gray-700' : 'bg-gray-100 text-gray-600 border border-gray-300'
                }`}>
                  📦 طلب بدون كود استلام
                </div>
              )}

              {/* أزرار الإجراءات */}
              <div className="space-y-2">
                {/* نظام كود التسليم للطعام */}
                {isFood && canComplete && !isDelivered && order.delivery_code && (
                  <>
                    {/* حالة انتظار العميل */}
                    {waitingOrders[order.id]?.is_waiting && (
                      <div className={`rounded-lg p-3 mb-2 ${
                        isDark ? 'bg-red-900/30 border border-red-800' : 'bg-red-50 border border-red-200'
                      }`}>
                        <p className="text-red-500 font-bold text-sm mb-1">⏳ بانتظار رد العميل</p>
                        {waitingOrders[order.id]?.can_leave_at_door ? (
                          <button
                            onClick={() => handleLeaveAtDoor(order.id)}
                            className="w-full bg-red-500 text-white py-2 rounded-lg font-bold text-xs"
                          >
                            🚪 ترك الطلب عند الباب وإتمام التسليم
                          </button>
                        ) : (
                          <p className="text-xs text-red-500">
                            تبقى {Math.ceil(waitingOrders[order.id]?.remaining_minutes || 0)} دقيقة
                          </p>
                        )}
                      </div>
                    )}
                    
                    {/* أزرار كود التسليم */}
                    <button
                      onClick={() => setShowCodeModal(order.id)}
                      className="w-full bg-green-500 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                    >
                      <QrCode size={14} />
                      إدخال كود التسليم
                    </button>
                    
                    {!waitingOrders[order.id]?.is_waiting && (
                      <button
                        onClick={() => setShowHelpModal(order.id)}
                        className={`w-full py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 ${
                          isDark ? 'bg-red-900/30 text-red-400 border border-red-800' : 'bg-red-100 text-red-600'
                        }`}
                        data-testid={`customer-not-responding-${order.id}`}
                      >
                        <HelpCircle size={14} />
                        العميل لا يرد - طلب مساعدة
                      </button>
                    )}
                  </>
                )}
                
                {/* للمنتجات - النظام القديم */}
                {!isFood && canComplete && !isDelivered && (
                  <>
                    {deliveryHours.is_delivery_allowed ? (
                      <button
                        onClick={() => onShowDeliveryChecklist(order)}
                        className="w-full bg-green-500 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={14} />
                        تأكيد التسليم
                      </button>
                    ) : (
                      <div className={`w-full py-3 rounded-lg text-center ${
                        isDark ? 'bg-red-900/30 border border-red-800' : 'bg-red-50 border border-red-200'
                      }`}>
                        <p className={`text-sm font-bold ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                          🚫 التوصيل متاح من {deliveryHours.start_time}
                        </p>
                        <p className={`text-xs mt-1 ${isDark ? 'text-red-500' : 'text-red-500'}`}>
                          (لا تزعج العميل الآن)
                        </p>
                      </div>
                    )}
                  </>
                )}
                
                {!isDelivered && (
                  <div className="space-y-2">
                    {/* زر الاتصال VoIP */}
                    <CallCustomerButton
                      orderId={order.id}
                      orderType="food"
                      orderNumber={order.order_number || order.id?.slice(0, 8)}
                      className="w-full"
                      size="normal"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => onOpenChat && onOpenChat(order.id, order.order_number)}
                        className="bg-green-600 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1"
                        data-testid={`food-chat-btn-${order.id}`}
                      >
                        <MessageCircle size={14} />
                        محادثة العميل
                      </button>
                      <button
                        onClick={() => setShowHelpModal(order.id)}
                        className="bg-orange-500 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1"
                        data-testid={`food-help-btn-${order.id}`}
                      >
                        <HelpCircle size={14} />
                        طلب مساعدة
                      </button>
                    </div>
                  </div>
                )}
                {isDelivered && (
                  <div className={`py-2 rounded-lg text-center text-sm font-bold ${
                    isDark ? 'bg-green-900/30 text-green-400' : 'bg-orange-100 text-orange-700'
                  }`}>
                    ✅ تم التسليم بنجاح
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* مودال إدخال كود التسليم */}
      {showCodeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl p-6 w-full max-w-sm ${
            isDark ? 'bg-[#1a1a1a]' : 'bg-white'
          }`}>
            <h3 className={`text-lg font-bold text-center mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>🔐 أدخل كود التسليم</h3>
            <p className={`text-sm text-center mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>اطلب الكود من العميل</p>
            
            <input
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={deliveryCode}
              onChange={(e) => setDeliveryCode(e.target.value.replace(/\D/g, ''))}
              placeholder="0000"
              className={`w-full text-center text-3xl font-bold tracking-widest border-2 rounded-xl p-4 mb-2 focus:border-green-500 focus:outline-none ${
                isDark ? 'bg-[#252525] border-[#444] text-white' : 'border-gray-300'
              }`}
            />
            
            {codeError && (
              <p className="text-red-500 text-sm text-center mb-2">{codeError}</p>
            )}
            
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => {
                  setShowCodeModal(null);
                  setDeliveryCode('');
                  setCodeError('');
                }}
                className={`py-3 rounded-xl font-bold ${
                  isDark ? 'bg-[#333] text-gray-300' : 'bg-gray-200 text-gray-700'
                }`}
              >
                إلغاء
              </button>
              <button
                onClick={() => handleVerifyCode(showCodeModal)}
                disabled={submitting || deliveryCode.length !== 4}
                className="bg-green-500 text-white py-3 rounded-xl font-bold disabled:opacity-50"
              >
                {submitting ? '...' : 'تأكيد'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal إدخال كود الاستلام من البائع */}
      {showPickupCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl ${
              isDark ? 'bg-[#1a1a1a]' : 'bg-white'
            }`}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-purple-700 text-white p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <QrCode size={24} />
                  <span className="font-bold">تأكيد الاستلام من البائع</span>
                </div>
                <button 
                  onClick={() => setShowPickupCodeModal(null)}
                  className="text-white/80 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm opacity-80 mt-2">
                اطلب الكود من البائع وأدخله هنا
              </p>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className={`text-center text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                🏪 {showPickupCodeModal.store_name}
              </p>

              {/* حقول الكود */}
              <div className="flex justify-center gap-3 mb-4" dir="ltr">
                {pickupCode.map((digit, index) => (
                  <input
                    key={index}
                    id={`pickup-code-${index}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePickupCodeChange(index, e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !digit && index > 0) {
                        const prevInput = document.getElementById(`pickup-code-${index - 1}`);
                        if (prevInput) prevInput.focus();
                      }
                    }}
                    className={`w-14 h-16 text-center text-2xl font-bold rounded-xl border-2 transition-all ${
                      isDark 
                        ? 'bg-[#252525] border-purple-600 text-white focus:border-purple-400' 
                        : 'bg-gray-50 border-purple-300 text-gray-900 focus:border-purple-500'
                    } focus:outline-none`}
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              {/* رسالة الخطأ */}
              {pickupCodeError && (
                <p className="text-red-500 text-center text-sm mb-4">
                  ❌ {pickupCodeError}
                </p>
              )}

              {/* زر التأكيد */}
              <button
                onClick={() => handleVerifyPickupCode(showPickupCodeModal.id)}
                disabled={pickupSubmitting || pickupCode.join('').length !== 4}
                className={`w-full py-3 rounded-xl font-bold transition-all ${
                  pickupCode.join('').length === 4
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {pickupSubmitting ? '⏳ جاري التحقق...' : '✓ تأكيد الاستلام'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal إلغاء الطلب */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-sm rounded-2xl overflow-hidden ${
              isDark ? 'bg-[#1a1a1a]' : 'bg-white'
            }`}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 text-white text-center">
              <XCircle className="mx-auto mb-2" size={32} />
              <h3 className="font-bold text-lg">إلغاء الطلب</h3>
              <p className="text-red-200 text-xs mt-1">
                #{showCancelModal.order_number || showCancelModal.id?.slice(0, 8)}
              </p>
            </div>

            <div className="p-4">
              {/* تحذير نسبة الإلغاء */}
              {cancelSettings && (
                <div className={`rounded-lg p-3 mb-4 ${
                  cancelSettings.rate >= cancelSettings.warning_threshold
                    ? 'bg-red-900/30 border border-red-700'
                    : 'bg-gray-800 border border-gray-700'
                }`}>
                  <p className={`text-xs ${
                    cancelSettings.rate >= cancelSettings.warning_threshold 
                      ? 'text-red-400' 
                      : 'text-gray-400'
                  }`}>
                    نسبة الإلغاء: <span className="font-bold">{cancelSettings.rate}%</span> 
                    (الحد: {cancelSettings.max_allowed}%)
                  </p>
                </div>
              )}

              {/* أسباب الإلغاء */}
              <p className={`text-sm font-bold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                اختر سبب الإلغاء:
              </p>
              <div className="space-y-2 mb-4">
                {cancelReasons.map((reason) => (
                  <button
                    key={reason.id}
                    onClick={() => setCancelReason(reason.label)}
                    className={`w-full p-3 rounded-xl text-right text-sm transition-all ${
                      cancelReason === reason.label
                        ? 'bg-red-600 text-white'
                        : isDark
                          ? 'bg-[#252525] text-gray-300 hover:bg-[#333] border border-[#333]'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {reason.label}
                  </button>
                ))}
              </div>

              {/* أزرار */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowCancelModal(null);
                    setCancelReason('');
                  }}
                  className={`flex-1 py-3 rounded-xl font-bold ${
                    isDark 
                      ? 'bg-[#252525] text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  رجوع
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={!cancelReason || cancelLoading}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                    cancelReason && !cancelLoading
                      ? 'bg-red-600 hover:bg-red-700 text-white'
                      : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                  }`}
                >
                  {cancelLoading ? '⏳ جاري...' : '❌ تأكيد الإلغاء'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal طلب المساعدة الطارئة */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full max-w-sm rounded-2xl p-4 ${
              isDark ? 'bg-[#1a1a1a]' : 'bg-white'
            }`}
          >
            <div className="text-center mb-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-orange-100 flex items-center justify-center mb-3">
                <HelpCircle size={28} className="text-orange-600" />
              </div>
              <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                طلب مساعدة طارئة
              </h3>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                فريق الدعم سيتواصل مع العميل نيابة عنك
              </p>
            </div>

            {/* أسباب طلب المساعدة */}
            <div className="space-y-2 mb-4">
              <p className={`text-xs font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                اختر سبب المشكلة:
              </p>
              {[
                { id: 'customer_not_responding', label: '📵 العميل لا يرد على الرسائل' },
                { id: 'wrong_address', label: '📍 العنوان غير صحيح أو غير واضح' },
                { id: 'customer_refused', label: '🚫 العميل رفض استلام الطلب' },
                { id: 'payment_issue', label: '💰 مشكلة في الدفع' },
                { id: 'other', label: '❓ سبب آخر' }
              ].map((reason) => (
                <button
                  key={reason.id}
                  onClick={() => setHelpReason(reason.id)}
                  className={`w-full p-3 rounded-xl text-right text-sm transition-all ${
                    helpReason === reason.id
                      ? 'bg-orange-600 text-white'
                      : isDark
                        ? 'bg-[#252525] text-gray-300 hover:bg-[#333] border border-[#333]'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {reason.label}
                </button>
              ))}
            </div>

            {/* ملاحظة إضافية */}
            {helpReason === 'other' && (
              <div className="mb-4">
                <textarea
                  value={helpMessage}
                  onChange={(e) => setHelpMessage(e.target.value)}
                  placeholder="اكتب تفاصيل المشكلة..."
                  className={`w-full p-3 rounded-xl text-sm resize-none ${
                    isDark 
                      ? 'bg-[#252525] text-white border border-[#333]' 
                      : 'bg-gray-100 text-gray-900'
                  }`}
                  rows={3}
                />
              </div>
            )}

            {/* رسالة توضيحية */}
            <div className={`p-3 rounded-xl mb-4 ${
              isDark ? 'bg-green-900/30 border border-green-700' : 'bg-green-50 border border-green-200'
            }`}>
              <p className={`text-xs ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                ✅ سيتصل فريق الدعم بالعميل مباشرة ويحل المشكلة
              </p>
              <p className={`text-xs mt-1 ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                🔒 رقم العميل لن يظهر لك (حماية الخصوصية)
              </p>
            </div>

            {/* أزرار */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowHelpModal(null);
                  setHelpReason('');
                  setHelpMessage('');
                }}
                className={`flex-1 py-3 rounded-xl font-bold ${
                  isDark 
                    ? 'bg-[#252525] text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                إلغاء
              </button>
              <button
                onClick={() => requestEmergencyHelp(showHelpModal)}
                disabled={!helpReason || helpLoading}
                className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  helpReason && !helpLoading
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'bg-gray-400 text-gray-600 cursor-not-allowed'
                }`}
              >
                {helpLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  '📞 طلب المساعدة'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default MyOrdersList;
