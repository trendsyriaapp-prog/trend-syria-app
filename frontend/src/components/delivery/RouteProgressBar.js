// /app/frontend/src/components/delivery/RouteProgressBar.js
// شريط تتبع المسار الذكي - يظهر المحطة الحالية وزر الإجراء

import { useState, useEffect, useMemo } from 'react';
import { MapPin, Navigation, Package, User, ChevronDown, ChevronUp, Loader2, Lock, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
  const [pickupCode, setPickupCode] = useState('');
  const [deliveryCode, setDeliveryCode] = useState('');
  const [verifying, setVerifying] = useState(false);

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
      
      // تحديد حالة المحطة
      const isPickedUp = isFood 
        ? (status === 'out_for_delivery' || order.pickup_code_verified)
        : (status === 'picked_up' || status === 'out_for_delivery');
      
      const isDelivered = isFood
        ? (status === 'delivered')
        : (status === 'delivered');

      // محطة الاستلام من المتجر
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

    // ترتيب المحطات: الاستلام أولاً ثم التسليم
    // (يمكن تحسين هذا لاحقاً بناءً على المسافة)
    result.sort((a, b) => {
      if (a.type === 'pickup' && b.type === 'delivery') return -1;
      if (a.type === 'delivery' && b.type === 'pickup') return 1;
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

    // طلبات المنتجات: فتح modal الكود مباشرة
    if (!isFood) {
      setShowPickupCodeModal(station);
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
          const endpoint = `${API}/food/orders/delivery/${order.id}/arrived?latitude=${latitude}&longitude=${longitude}`;
          
          const response = await axios.post(endpoint, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (response.data.success || response.data.message?.includes('تم')) {
            setCheckingLocationFor(null);
            toast({ title: "✅ تم!", description: "تم تسجيل وصولك للمتجر", duration: 2000 });
            setShowPickupCodeModal(station);
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
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // التحقق من الوصول للعميل
  const handleArrivedAtCustomer = async (station) => {
    setShowDeliveryCodeModal(station);
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
        ? `${API}/food/orders/delivery/${order.id}/verify-pickup`
        : `${API}/orders/${order.id}/delivery/pickup`;
      
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
        ? `${API}/food/orders/delivery/${order.id}/verify-code`
        : `${API}/delivery/orders/${order.id}/deliver`;

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
            <h3 className={`text-xl font-bold mb-4 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
              أدخل كود الاستلام
            </h3>
            <p className={`text-sm text-center mb-4 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              اطلب الكود من {showPickupCodeModal.name}
            </p>
            
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
                onClick={() => {
                  setShowPickupCodeModal(null);
                  setPickupCode('');
                }}
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
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeliveryCodeModal(null);
                  setDeliveryCode('');
                }}
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
          </div>
        </div>
      )}
    </>
  );
};

export default RouteProgressBar;
