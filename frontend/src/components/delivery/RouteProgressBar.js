// /app/frontend/src/components/delivery/RouteProgressBar.js
// شريط تتبع المسار الذكي - يظهر المحطة الحالية وزر الإجراء

import { useState, useEffect, useMemo, useCallback, useRef, useLayoutEffect } from 'react';
import { flushSync } from 'react-dom';
import { MapPin, Navigation, Package, User, ChevronDown, ChevronUp, Loader2, Lock, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../context/AuthContext';
import { useModalBackHandler } from '../../hooks/useBackButton';
import PickupWaitingTimer from './PickupWaitingTimer';

const API = process.env.REACT_APP_BACKEND_URL;

// Hook للحفاظ على موقع التمرير عند فتح/إغلاق Modal
const usePreserveScroll = (isModalOpen) => {
  const scrollRef = useRef(0);
  const wasOpenRef = useRef(false);
  
  useLayoutEffect(() => {
    if (isModalOpen && !wasOpenRef.current) {
      // فتح الـ modal - حفظ موقع التمرير
      scrollRef.current = window.scrollY;
      wasOpenRef.current = true;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollRef.current}px`;
      document.body.style.width = '100%';
      document.body.style.overflowY = 'scroll';
    } else if (!isModalOpen && wasOpenRef.current) {
      // إغلاق الـ modal - استعادة موقع التمرير
      const savedScroll = scrollRef.current;
      wasOpenRef.current = false;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflowY = '';
      if (savedScroll > 0) {
        window.scrollTo(0, savedScroll);
      }
    }
  }, [isModalOpen]);
  
  return scrollRef;
};

const RouteProgressBar = ({ 
  myOrders = [], 
  myFoodOrders = [],
  isProductsLocked = false,
  productsLockMessage = '',
  theme = 'dark',
  onOrderUpdate,
  onRefresh
}) => {
  const { toast } = useToast();
  const { token } = useAuth();
  const isDark = theme === 'dark';
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [checkingLocationFor, setCheckingLocationFor] = useState(null);
  const [showPickupCodeModal, setShowPickupCodeModal] = useState(null);
  const [showDeliveryCodeModal, setShowDeliveryCodeModal] = useState(null);
  const [showFailedModal, setShowFailedModal] = useState(null); // Modal فشل التسليم
  const [pickupCode, setPickupCode] = useState('');
  const [deliveryCode, setDeliveryCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [failedReason, setFailedReason] = useState('');
  const [failedAction, setFailedAction] = useState('');
  const [failedNotes, setFailedNotes] = useState('');
  const [submittingFailed, setSubmittingFailed] = useState(false);

  // 🔄 الحفاظ على موقع التمرير عند فتح/إغلاق الـ modals
  const isAnyModalOpen = !!(showPickupCodeModal || showDeliveryCodeModal || showFailedModal);
  usePreserveScroll(isAnyModalOpen);

  // ⭐ دعم زر الرجوع للـ modals
  const scrollBeforeModalRef = useRef(0);
  
  const closePickupModal = useCallback(() => {
    const savedScroll = scrollBeforeModalRef.current;
    // استخدام flushSync لإجبار React على تحديث DOM مباشرة
    flushSync(() => {
      setShowPickupCodeModal(null);
      setPickupCode('');
    });
    // استعادة موقع التمرير فوراً بعد تحديث DOM
    if (savedScroll > 0) {
      window.scrollTo(0, savedScroll);
    }
  }, []);
  
  const closeDeliveryModal = useCallback(() => {
    setShowDeliveryCodeModal(null);
    setDeliveryCode('');
  }, []);

  const closeFailedModal = useCallback(() => {
    setShowFailedModal(null);
    setFailedReason('');
    setFailedAction('');
    setFailedNotes('');
  }, []);
  
  // تسجيل الـ modals مع زر الرجوع
  useModalBackHandler(!!showPickupCodeModal, closePickupModal);
  useModalBackHandler(!!showDeliveryCodeModal, closeDeliveryModal);
  useModalBackHandler(!!showFailedModal, closeFailedModal);

  // دالة إرسال فشل التسليم
  const handleSubmitFailed = async () => {
    if (!failedReason) {
      toast({ title: "خطأ", description: "اختر سبب الفشل", variant: "destructive" });
      return;
    }

    setSubmittingFailed(true);
    try {
      const order = showFailedModal.order;
      const isFood = showFailedModal.isFood;
      const endpoint = isFood 
        ? `${API}/api/food/orders/delivery/${order.id}/failed`
        : `${API}/api/orders/${order.id}/delivery/failed`;

      const res = await axios.post(endpoint, {
        reason: failedReason,
        action: 'return_to_store', // دائماً إرجاع للمتجر
        notes: failedNotes || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast({ 
        title: "✅ تم", 
        description: `تم تسجيل فشل التسليم - سيتم إرجاع الطلب للمتجر${res.data.compensation > 0 ? ` - تعويضك: ${res.data.compensation} ل.س` : ''}` 
      });
      
      closeFailedModal();
      if (onRefresh) onRefresh();
      if (onOrderUpdate) onOrderUpdate();
    } catch (error) {
      toast({ 
        title: "خطأ", 
        description: error.response?.data?.detail || "حدث خطأ", 
        variant: "destructive" 
      });
    } finally {
      setSubmittingFailed(false);
    }
  };

  // حساب المحطات بالترتيب الصحيح
  const stations = useMemo(() => {
    const result = [];
    
    // دمج جميع الطلبات
    const allOrders = [
      ...myFoodOrders.map(o => ({ ...o, orderType: 'food' })),
      ...myOrders.map(o => ({ ...o, orderType: 'product' }))
    ];

    // لكل طلب، نضيف محطتين: استلام من المتجر + تسليم للعميل
    allOrders.forEach(order => {
      const isFood = order.orderType === 'food';
      const orderId = order.id;
      const status = isFood ? order.status : order.delivery_status;
      
      // تحديد حالة المحطة - الاعتماد على pickup_code_verified للطعام
      const isPickedUp = isFood 
        ? (order.pickup_code_verified === true) // فقط إذا تم التحقق من كود الاستلام
        : (status === 'picked_up' || status === 'out_for_delivery' || status === 'on_the_way' || status === 'driver_at_customer');
      
      const isDelivered = isFood
        ? (status === 'delivered')
        : (status === 'delivered');

      // محطة الاستلام من المتجر - تظهر إذا لم يتم الاستلام بعد
      if (!isPickedUp && !isDelivered) {
        result.push({
          id: `pickup-${orderId}`,
          orderId: orderId,
          type: 'pickup',
          orderType: order.orderType,
          name: isFood 
            ? (order.restaurant_name || order.store_name || 'المطعم')
            : (order.seller_addresses?.[0]?.name || 'المتجر'),
          address: isFood
            ? (order.store_address || '')
            : (order.seller_addresses?.[0]?.address || ''),
          icon: isFood ? '🍔' : '📦',
          action: 'وصلت للمتجر',
          order: order,
          completed: false,
          latitude: isFood ? order.store_latitude : order.seller_addresses?.[0]?.latitude,
          longitude: isFood ? order.store_longitude : order.seller_addresses?.[0]?.longitude
        });
      }

      // محطة التسليم للعميل
      if (!isDelivered) {
        result.push({
          id: `delivery-${orderId}`,
          orderId: orderId,
          type: 'delivery',
          orderType: order.orderType,
          name: isFood 
            ? (order.customer_name || 'العميل')
            : (order.buyer_address?.name || 'العميل'),
          address: isFood
            ? (order.delivery_address || '')
            : (order.buyer_address?.address || ''),
          icon: '🏠',
          action: 'وصلت للعميل',
          order: order,
          completed: false,
          canDeliver: isPickedUp, // يمكن التسليم فقط إذا تم الاستلام
          latitude: isFood ? order.latitude : order.latitude,
          longitude: isFood ? order.longitude : order.longitude
        });
      }
    });

    // ترتيب المحطات: الاستلام أولاً ثم التسليم (حسب المسافة)
    result.sort((a, b) => {
      // الاستلام دائماً أولاً
      if (a.type === 'pickup' && b.type === 'delivery') return -1;
      if (a.type === 'delivery' && b.type === 'pickup') return 1;
      
      // إذا كلاهما تسليم، نرتب حسب المسافة من المتجر
      if (a.type === 'delivery' && b.type === 'delivery') {
        // نحصل على موقع المتجر من أول طلب
        const storeLocation = allOrders[0] ? {
          lat: allOrders[0].store_latitude || 33.5138,
          lng: allOrders[0].store_longitude || 36.2765
        } : { lat: 33.5138, lng: 36.2765 };
        
        // حساب المسافة (Haversine simplified)
        const getDistance = (lat1, lon1, lat2, lon2) => {
          if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
          const R = 6371; // km
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLon = (lon2 - lon1) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLon/2) * Math.sin(dLon/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          return R * c;
        };
        
        const distA = getDistance(storeLocation.lat, storeLocation.lng, a.latitude, a.longitude);
        const distB = getDistance(storeLocation.lat, storeLocation.lng, b.latitude, b.longitude);
        
        return distA - distB; // الأقرب أولاً
      }
      
      return 0;
    });

    return result;
  }, [myOrders, myFoodOrders]);

  // المحطة الحالية (أول محطة غير مكتملة)
  const currentStation = useMemo(() => {
    // أولاً نبحث عن محطات الاستلام
    const pickupStation = stations.find(s => s.type === 'pickup');
    if (pickupStation) return pickupStation;
    
    // ثم محطات التسليم (التي يمكن تسليمها)
    const deliveryStation = stations.find(s => s.type === 'delivery' && s.canDeliver);
    if (deliveryStation) return deliveryStation;
    
    // أي محطة متبقية
    return stations[0];
  }, [stations]);

  // التحقق من الموقع والوصول للمتجر
  const handleArrivedAtStore = async (station) => {
    const order = station.order;
    const isFood = station.orderType === 'food';
    
    // طلبات المنتجات المقفلة
    if (!isFood && isProductsLocked) {
      toast({ 
        title: "⏳ طلبات المنتجات مقفلة", 
        description: productsLockMessage || "أكمل توصيل طلبات الطعام أولاً", 
        variant: "destructive",
        duration: 5000
      });
      return;
    }

    // طلبات المنتجات: فتح modal الكود مباشرة (تسجيل الوقت الحالي)
    if (!isFood) {
      // حفظ موقع التمرير قبل فتح الـ modal
      scrollBeforeModalRef.current = window.scrollY;
      const updatedStation = {
        ...station,
        order: {
          ...station.order,
          driver_arrived_at: station.order?.driver_arrived_at || new Date().toISOString()
        }
      };
      setShowPickupCodeModal(updatedStation);
      return;
    }

    // طلبات الطعام: فحص GPS
    if (!navigator.geolocation) {
      toast({ 
        title: "❌ خطأ", 
        description: "المتصفح لا يدعم تحديد الموقع - يرجى استخدام متصفح حديث", 
        variant: "destructive",
        duration: 5000
      });
      return; // لا نفتح modal الكود
    }

    setCheckingLocationFor(station.id);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const endpoint = `${API}/api/food/orders/delivery/${order.id}/arrived?latitude=${latitude}&longitude=${longitude}`;
          
          const response = await axios.post(endpoint, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (response.data.success || response.data.message?.includes('تم')) {
            setCheckingLocationFor(null);
            toast({ title: "✅ تم!", description: "تم تسجيل وصولك للمتجر", duration: 2000 });
            // حفظ موقع التمرير قبل فتح الـ modal
            scrollBeforeModalRef.current = window.scrollY;
            // تحديث driver_arrived_at من response الـ API
            const updatedStation = {
              ...station,
              order: {
                ...station.order,
                driver_arrived_at: response.data.arrived_at || new Date().toISOString()
              }
            };
            setShowPickupCodeModal(updatedStation);
          }
        } catch (error) {
          setCheckingLocationFor(null);
          const errorMsg = error.response?.data?.detail || error.response?.data?.message || "حدث خطأ";
          
          if (errorMsg.includes('بعيد') || errorMsg.includes('المسافة')) {
            // السائق بعيد عن المتجر - لا تفتح modal الكود
            toast({ 
              title: "📍 أنت بعيد عن المتجر", 
              description: errorMsg, 
              variant: "destructive",
              duration: 5000
            });
            // لا نفتح modal الكود - يجب أن يقترب السائق أولاً
          } else if (error.response?.status === 404) {
            // الطلب غير موجود
            toast({ title: "❌ خطأ", description: "الطلب غير موجود أو تم إلغاؤه", variant: "destructive" });
          } else {
            // خطأ آخر - نعرض الرسالة فقط
            toast({ title: "❌ خطأ", description: errorMsg, variant: "destructive" });
          }
        }
      },
      (error) => {
        setCheckingLocationFor(null);
        console.error("GPS Error:", error);
        // فشل GPS - نعرض رسالة توضيحية
        let gpsErrorMsg = "تعذر تحديد موقعك";
        if (error.code === 1) {
          gpsErrorMsg = "يرجى السماح بالوصول للموقع من إعدادات المتصفح";
        } else if (error.code === 2) {
          gpsErrorMsg = "تعذر الحصول على موقعك - تأكد من تفعيل GPS";
        } else if (error.code === 3) {
          gpsErrorMsg = "انتهت مهلة تحديد الموقع - حاول مرة أخرى";
        }
        toast({ 
          title: "⚠️ خطأ في تحديد الموقع", 
          description: gpsErrorMsg, 
          variant: "destructive",
          duration: 5000
        });
        // لا نفتح modal الكود - يجب إصلاح GPS أولاً
      },
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 60000 }
    );
  };

  // التحقق من الوصول للعميل
  const handleArrivedAtCustomer = async (station) => {
    const order = station.order;
    const isFood = station.orderType === 'food';
    
    // إذا كان وقت الوصول محفوظاً مسبقاً، استخدمه
    if (order?.driver_arrived_at_customer) {
      scrollBeforeModalRef.current = window.scrollY;
      setShowDeliveryCodeModal({
        ...station,
        order: {
          ...order,
          driver_arrived_at_customer: order.driver_arrived_at_customer
        }
      });
      return;
    }
    
    // طلبات الطعام: تستخدم فحص GPS مختلف (يتم معالجته في Backend)
    if (isFood) {
      try {
        const endpoint = `${API}/api/food/orders/delivery/${order.id}/arrived-customer`;
        const response = await axios.post(endpoint, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        scrollBeforeModalRef.current = window.scrollY;
        setShowDeliveryCodeModal({
          ...station,
          order: {
            ...order,
            driver_arrived_at_customer: response.data?.arrived_at || new Date().toISOString()
          }
        });
      } catch (error) {
        if (error.response?.data?.arrived_at) {
          scrollBeforeModalRef.current = window.scrollY;
          setShowDeliveryCodeModal({
            ...station,
            order: {
              ...order,
              driver_arrived_at_customer: error.response.data.arrived_at
            }
          });
        } else {
          toast({ 
            title: "خطأ", 
            description: error.response?.data?.detail || "حدث خطأ", 
            variant: "destructive" 
          });
        }
      }
      return;
    }
    
    // طلبات المنتجات: فحص GPS أولاً
    if (!navigator.geolocation) {
      toast({ title: "خطأ", description: "المتصفح لا يدعم تحديد الموقع", variant: "destructive" });
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const endpoint = `${API}/api/orders/${order.id}/delivery/arrived-customer?latitude=${latitude}&longitude=${longitude}`;
          
          const response = await axios.post(endpoint, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          scrollBeforeModalRef.current = window.scrollY;
          setShowDeliveryCodeModal({
            ...station,
            order: {
              ...order,
              driver_arrived_at_customer: response.data?.arrived_at || new Date().toISOString()
            }
          });
        } catch (error) {
          if (error.response?.data?.arrived_at) {
            scrollBeforeModalRef.current = window.scrollY;
            setShowDeliveryCodeModal({
              ...station,
              order: {
                ...order,
                driver_arrived_at_customer: error.response.data.arrived_at
              }
            });
          } else {
            toast({ 
              title: "خطأ", 
              description: error.response?.data?.detail || "حدث خطأ", 
              variant: "destructive" 
            });
          }
        }
      },
      (geoError) => {
        toast({ 
          title: "خطأ في تحديد الموقع", 
          description: "يرجى السماح بالوصول للموقع من إعدادات المتصفح", 
          variant: "destructive" 
        });
      },
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 60000 }
    );
  };

  // التحقق من كود الاستلام
  const verifyPickupCode = async () => {
    if (!pickupCode || pickupCode.length < 4) {
      toast({ title: "خطأ", description: "أدخل كود الاستلام (4 أرقام)", variant: "destructive" });
      return;
    }

    setVerifying(true);
    try {
      const station = showPickupCodeModal;
      const order = station.order;
      const isFood = station.orderType === 'food';
      
      const endpoint = isFood 
        ? `${API}/api/food/orders/delivery/${order.id}/verify-pickup`
        : `${API}/api/orders/${order.id}/delivery/pickup`;
      
      const payload = isFood ? { code: pickupCode } : { pickup_code: pickupCode };

      await axios.post(endpoint, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast({ title: "✅ تم الاستلام!", description: "انطلق الآن لتوصيل الطلب للعميل", duration: 3000 });
      setShowPickupCodeModal(null);
      setPickupCode('');
      
      if (onRefresh) onRefresh();
      if (onOrderUpdate) onOrderUpdate();
      
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || "كود خاطئ";
      toast({ title: "❌ خطأ", description: errorMsg, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  // التحقق من كود التسليم
  const verifyDeliveryCode = async () => {
    if (!deliveryCode || deliveryCode.length < 4) {
      toast({ title: "خطأ", description: "أدخل كود التسليم (4 أرقام)", variant: "destructive" });
      return;
    }

    setVerifying(true);
    try {
      const station = showDeliveryCodeModal;
      const order = station.order;
      const isFood = station.orderType === 'food';
      
      const endpoint = isFood 
        ? `${API}/api/food/orders/delivery/${order.id}/verify-code`
        : `${API}/api/delivery/orders/${order.id}/deliver`;

      await axios.post(endpoint, { delivery_code: deliveryCode }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast({ title: "🎉 تم التسليم!", description: "أحسنت! تم توصيل الطلب بنجاح", duration: 3000 });
      setShowDeliveryCodeModal(null);
      setDeliveryCode('');
      
      if (onRefresh) onRefresh();
      if (onOrderUpdate) onOrderUpdate();
      
    } catch (error) {
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || "كود خاطئ";
      toast({ title: "❌ خطأ", description: errorMsg, variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  // فتح Google Maps للتنقل
  const openGoogleMaps = (station) => {
    if (station?.latitude && station?.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}&travelmode=driving`;
      window.open(url, '_blank');
    } else {
      toast({ title: "خطأ", description: "لا تتوفر إحداثيات لهذا الموقع", variant: "destructive" });
    }
  };

  // إذا لم تكن هناك محطات، لا نعرض شيئاً
  if (stations.length === 0) {
    return null;
  }

  return (
    <>
      {/* الشريط الرئيسي */}
      <div className={`mx-4 mb-3 rounded-xl overflow-hidden ${
        isDark ? 'bg-[#1a1a1a] border border-[#333]' : 'bg-white border border-gray-200 shadow-sm'
      }`}>
        {/* المحطة الحالية */}
        {currentStation && (
          <div className="p-3">
            {/* معلومات المحطة */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">{currentStation.icon}</span>
                <div>
                  <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {currentStation.type === 'pickup' ? 'اذهب للاستلام من' : 'اذهب للتسليم إلى'}
                  </p>
                  <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {currentStation.name}
                  </p>
                </div>
              </div>
              
              {/* زر فتح Google Maps */}
              <button
                onClick={() => openGoogleMaps(currentStation)}
                className={`p-2 rounded-lg ${
                  isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-600'
                }`}
              >
                <Navigation size={20} />
              </button>
            </div>

            {/* زر الإجراء */}
            {currentStation.type === 'pickup' ? (
              // زر وصلت للمتجر
              (() => {
                const isFood = currentStation.orderType === 'food';
                const isLocked = !isFood && isProductsLocked;
                const isLoading = checkingLocationFor === currentStation.id;
                
                return (
                  <>
                    <button
                      onClick={() => handleArrivedAtStore(currentStation)}
                      disabled={isLoading || isLocked}
                      data-testid="route-arrived-store-btn"
                      className={`w-full py-3 rounded-xl font-bold text-base flex items-center justify-center gap-2 ${
                        isLocked
                          ? 'bg-gray-500 cursor-not-allowed opacity-70 text-white'
                          : isLoading 
                            ? 'bg-gray-400 cursor-wait text-white' 
                            : 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                      }`}
                    >
                      {isLocked ? (
                        <>
                          <Lock size={18} />
                          مقفل - أكمل الطعام أولاً
                        </>
                      ) : isLoading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          جاري التحقق من موقعك...
                        </>
                      ) : (
                        <>
                          <MapPin size={18} />
                          وصلت للمتجر
                        </>
                      )}
                    </button>
                    {/* تحذير الوصول الكاذب */}
                    {!isLocked && (
                      <p className={`text-xs text-center mt-2 ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                        ⚠️ الإبلاغ عن وصول كاذب = تجميد الحساب نهائياً
                      </p>
                    )}
                  </>
                );
              })()
            ) : currentStation.canDeliver ? (
              // زر وصلت للعميل
              <button
                onClick={() => handleArrivedAtCustomer(currentStation)}
                data-testid="route-arrived-customer-btn"
                className="w-full py-3 rounded-xl font-bold text-base flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white"
              >
                <User size={18} />
                وصلت للعميل
              </button>
            ) : (
              // انتظار استلام الطلب
              <div className={`w-full py-3 rounded-xl font-bold text-base flex items-center justify-center gap-2 ${
                isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-700'
              }`}>
                <Package size={18} />
                استلم الطلب من المتجر أولاً
              </div>
            )}
          </div>
        )}

        {/* زر توسيع/طي القائمة */}
        {stations.length > 1 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`w-full py-2 flex items-center justify-center gap-1 text-sm ${
              isDark ? 'bg-[#252525] text-gray-400' : 'bg-gray-50 text-gray-600'
            }`}
          >
            {isExpanded ? (
              <>
                <ChevronUp size={16} />
                إخفاء المحطات ({stations.length})
              </>
            ) : (
              <>
                <ChevronDown size={16} />
                عرض جميع المحطات ({stations.length})
              </>
            )}
          </button>
        )}

        {/* قائمة المحطات الموسعة */}
        {isExpanded && (
          <div className={`border-t ${isDark ? 'border-[#333]' : 'border-gray-200'}`}>
            {stations.map((station, index) => (
              <div
                key={station.id}
                className={`flex items-center gap-3 p-3 ${
                  index !== stations.length - 1 
                    ? isDark ? 'border-b border-[#333]' : 'border-b border-gray-100'
                    : ''
                } ${station.id === currentStation?.id 
                    ? isDark ? 'bg-green-500/10' : 'bg-green-50' 
                    : ''
                }`}
              >
                {/* رقم المحطة */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                  station.type === 'pickup'
                    ? 'bg-green-500 text-white'
                    : 'bg-blue-500 text-white'
                }`}>
                  {index + 1}
                </div>

                {/* معلومات المحطة */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span>{station.icon}</span>
                    <span className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {station.name}
                    </span>
                  </div>
                  <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                    {station.type === 'pickup' ? 'استلام' : 'تسليم'}
                    {station.orderType === 'food' ? ' - طعام' : ' - منتج'}
                  </p>
                </div>

                {/* حالة المحطة */}
                {station.id === currentStation?.id && (
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                  }`}>
                    الحالية
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal إدخال كود الاستلام */}
      {showPickupCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`w-full max-w-sm rounded-2xl p-6 ${
            isDark ? 'bg-[#1a1a1a]' : 'bg-white'
          }`}>
            <h3 className={`text-xl font-bold mb-2 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
              أدخل كود الاستلام
            </h3>
            <p className={`text-sm text-center mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              اطلب الكود من {showPickupCodeModal.name}
            </p>
            
            {/* مؤقت الانتظار */}
            <PickupWaitingTimer
              arrivedAt={showPickupCodeModal.order?.driver_arrived_at}
              theme={theme}
            />
            
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={pickupCode}
              onChange={(e) => setPickupCode(e.target.value.replace(/\D/g, ''))}
              placeholder="أدخل الكود"
              className={`w-full text-center text-2xl font-bold py-4 rounded-xl mb-4 ${
                isDark 
                  ? 'bg-[#252525] border border-[#333] text-white' 
                  : 'bg-gray-100 border border-gray-200 text-gray-900'
              }`}
              autoFocus
            />
            
            <div className="flex gap-3">
              <button
                onClick={closePickupModal}
                className={`flex-1 py-3 rounded-xl font-bold ${
                  isDark 
                    ? 'bg-[#333] text-white' 
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                إلغاء
              </button>
              <button
                onClick={verifyPickupCode}
                disabled={verifying || pickupCode.length < 4}
                className={`flex-1 py-3 rounded-xl font-bold text-white ${
                  verifying || pickupCode.length < 4
                    ? 'bg-gray-400'
                    : 'bg-gradient-to-r from-green-500 to-green-600'
                }`}
              >
                {verifying ? (
                  <Loader2 size={20} className="animate-spin mx-auto" />
                ) : (
                  'تأكيد'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal إدخال كود التسليم */}
      {showDeliveryCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`w-full max-w-sm rounded-2xl p-6 ${
            isDark ? 'bg-[#1a1a1a]' : 'bg-white'
          }`}>
            <h3 className={`text-xl font-bold mb-4 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
              أدخل كود التسليم
            </h3>
            <p className={`text-sm text-center mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              اطلب الكود من {showDeliveryCodeModal.name}
            </p>
            
            {/* عداد الانتظار عند العميل */}
            <PickupWaitingTimer
              arrivedAt={showDeliveryCodeModal?.order?.driver_arrived_at_customer}
              theme={theme}
              maxMinutes={10}
              onMaxReached={() => {
                // إخفاء العداد عند انتهاء الوقت (يتم التعامل معه في الـ component)
              }}
              labelPrefix="انتظار العميل"
            />
            
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={deliveryCode}
              onChange={(e) => setDeliveryCode(e.target.value.replace(/\D/g, ''))}
              placeholder="أدخل الكود"
              className={`w-full text-center text-2xl font-bold py-4 rounded-xl mb-4 ${
                isDark 
                  ? 'bg-[#252525] border border-[#333] text-white' 
                  : 'bg-gray-100 border border-gray-200 text-gray-900'
              }`}
              autoFocus
            />
            
            <div className="flex gap-3 mb-3">
              <button
                onClick={closeDeliveryModal}
                className={`flex-1 py-3 rounded-xl font-bold ${
                  isDark 
                    ? 'bg-[#333] text-white' 
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                إلغاء
              </button>
              <button
                onClick={verifyDeliveryCode}
                disabled={verifying || deliveryCode.length < 4}
                className={`flex-1 py-3 rounded-xl font-bold text-white ${
                  verifying || deliveryCode.length < 4
                    ? 'bg-gray-400'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600'
                }`}
              >
                {verifying ? (
                  <Loader2 size={20} className="animate-spin mx-auto" />
                ) : (
                  'تأكيد التسليم'
                )}
              </button>
            </div>

            {/* زر فشل التسليم - يظهر بعد 10 دقائق من الوصول */}
            {showDeliveryCodeModal?.order?.driver_arrived_at_customer && (
              (() => {
                const arrivedTime = new Date(showDeliveryCodeModal.order.driver_arrived_at_customer);
                const now = new Date();
                const waitedMinutes = (now - arrivedTime) / 1000 / 60;
                if (waitedMinutes >= 10) {
                  return (
                    <button
                      onClick={() => {
                        closeDeliveryModal();
                        setShowFailedModal({
                          order: showDeliveryCodeModal.order,
                          isFood: showDeliveryCodeModal.isFood
                        });
                      }}
                      className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center gap-2"
                    >
                      ❌ العميل لم يستجب - فشل التسليم
                    </button>
                  );
                }
                return null;
              })()
            )}
          </div>
        </div>
      )}

      {/* Modal فشل التسليم */}
      {showFailedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className={`w-full max-w-sm rounded-2xl p-6 ${
            isDark ? 'bg-[#1a1a1a]' : 'bg-white'
          }`}>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                <span className="text-3xl">❌</span>
              </div>
            </div>
            
            <h3 className={`text-xl font-bold mb-2 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
              فشل التسليم
            </h3>
            <p className={`text-sm text-center mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              اختر سبب الفشل والإجراء المطلوب
            </p>

            {/* أسباب الفشل */}
            <div className="space-y-2 mb-4">
              <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>السبب:</p>
              {[
                { id: 'customer_not_responding', label: '📞 العميل لا يرد' },
                { id: 'customer_not_found', label: '👤 العميل غير موجود' },
                { id: 'wrong_address', label: '📍 العنوان خاطئ' },
                { id: 'customer_refused', label: '🚫 العميل رفض الاستلام' }
              ].map(reason => (
                <button
                  key={reason.id}
                  onClick={() => setFailedReason(reason.id)}
                  className={`w-full p-3 rounded-xl text-right font-medium transition-all ${
                    failedReason === reason.id
                      ? 'bg-red-500 text-white'
                      : (isDark ? 'bg-[#252525] text-white border border-[#333]' : 'bg-gray-100 text-gray-900 border border-gray-200')
                  }`}
                >
                  {reason.label}
                </button>
              ))}
            </div>

            {/* الإجراء - إرجاع للمتجر فقط */}
            <div className="mb-4">
              <div className={`p-4 rounded-xl ${isDark ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-orange-50 border border-orange-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-xl">🔄</span>
                  </div>
                  <div>
                    <p className={`font-bold ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>
                      سيتم إرجاع الطلب للمتجر
                    </p>
                    <p className={`text-xs ${isDark ? 'text-orange-200/70' : 'text-orange-600'}`}>
                      الإدارة ستتواصل مع العميل لإعادة الجدولة أو الاسترداد
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ملاحظات إضافية */}
            <textarea
              value={failedNotes}
              onChange={(e) => setFailedNotes(e.target.value)}
              placeholder="ملاحظات إضافية (اختياري)..."
              className={`w-full p-3 rounded-xl mb-4 text-sm ${
                isDark ? 'bg-[#252525] text-white border border-[#333]' : 'bg-gray-100 text-gray-900 border border-gray-200'
              }`}
              rows={2}
            />

            <div className="flex gap-3">
              <button
                onClick={closeFailedModal}
                className={`flex-1 py-3 rounded-xl font-bold ${
                  isDark 
                    ? 'bg-[#333] text-white' 
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                رجوع
              </button>
              <button
                onClick={handleSubmitFailed}
                disabled={submittingFailed || !failedReason}
                className={`flex-1 py-3 rounded-xl font-bold text-white ${
                  submittingFailed || !failedReason
                    ? 'bg-gray-400'
                    : 'bg-gradient-to-r from-orange-500 to-orange-600'
                }`}
              >
                {submittingFailed ? (
                  <Loader2 size={20} className="animate-spin mx-auto" />
                ) : (
                  '🔄 تأكيد الإرجاع للمتجر'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RouteProgressBar;
