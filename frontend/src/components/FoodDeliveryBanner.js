import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Bike, Clock, X, Truck, PartyPopper } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => new Intl.NumberFormat('ar-SY').format(price);

const FoodDeliveryBanner = () => {
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);
  const [flashSale, setFlashSale] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0 });
  const [cartTotal, setCartTotal] = useState(0);
  const [freeDeliveryMin, setFreeDeliveryMin] = useState(0);
  const [storeName, setStoreName] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const [hideAfterFreeDelivery, setHideAfterFreeDelivery] = useState(false);

  // إظهار الشريط فقط في صفحات الطعام
  const isFoodPage = location.pathname.startsWith('/food');
  const isStorePage = location.pathname.includes('/food/store/');

  // استخراج store ID من الرابط
  const getStoreId = () => {
    const match = location.pathname.match(/\/food\/store\/([^/]+)/);
    return match ? match[1] : null;
  };

  useEffect(() => {
    if (isFoodPage) {
      fetchFlashSale();
    }
  }, [isFoodPage]);

  useEffect(() => {
    if (isStorePage) {
      const storeId = getStoreId();
      if (storeId) {
        fetchStoreInfo(storeId);
      }
    }
  }, [location.pathname]);

  // مراقبة تغييرات السلة
  useEffect(() => {
    const storeId = getStoreId();
    if (!storeId || !isStorePage) return;

    const loadCart = () => {
      try {
        const savedCart = localStorage.getItem(`food_cart_${storeId}`);
        if (savedCart) {
          const cart = JSON.parse(savedCart);
          const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          
          // التحقق من الوصول للتوصيل المجاني
          if (freeDeliveryMin > 0 && total >= freeDeliveryMin && cartTotal < freeDeliveryMin) {
            setShowCelebration(true);
            // إخفاء الاحتفال بعد 3 ثواني
            setTimeout(() => setShowCelebration(false), 3000);
            // إخفاء الشريط بالكامل بعد 5 ثواني
            setTimeout(() => setHideAfterFreeDelivery(true), 5000);
          }
          
          setCartTotal(total);
        } else {
          setCartTotal(0);
          setHideAfterFreeDelivery(false); // إعادة إظهار الشريط إذا فرغت السلة
        }
      } catch (error) {
        console.error('Error loading cart:', error);
      }
    };

    // Load initially
    loadCart();

    // Listen for custom event
    const handleCartUpdate = () => loadCart();
    window.addEventListener('foodCartUpdated', handleCartUpdate);
    
    // Also poll every 500ms as backup
    const interval = setInterval(loadCart, 500);

    return () => {
      window.removeEventListener('foodCartUpdated', handleCartUpdate);
      clearInterval(interval);
    };
  }, [location.pathname, freeDeliveryMin, isStorePage]);

  const fetchStoreInfo = async (storeId) => {
    try {
      const res = await axios.get(`${API}/api/food/stores/${storeId}`);
      if (res.data) {
        setFreeDeliveryMin(res.data.free_delivery_minimum || 0);
        setStoreName(res.data.name || '');
      }
    } catch (error) {
      console.error('Error fetching store:', error);
    }
  };

  useEffect(() => {
    if (!flashSale?.end_time) return;

    const calculateTimeLeft = () => {
      const endTime = new Date(flashSale.end_time).getTime();
      const now = new Date().getTime();
      const difference = endTime - now;

      if (difference <= 0) {
        setFlashSale(null);
        return;
      }

      setTimeLeft({
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60)
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000);

    return () => clearInterval(timer);
  }, [flashSale]);

  const fetchFlashSale = async () => {
    try {
      const res = await axios.get(`${API}/api/food/flash-sales/active`);
      if (res.data && res.data.length > 0) {
        setFlashSale(res.data[0]);
      }
    } catch (error) {
      // Silently fail - flash sales are optional
    }
  };

  if (!isFoodPage || dismissed) return null;

  // حساب نسبة التقدم
  const progress = freeDeliveryMin > 0 ? Math.min((cartTotal / freeDeliveryMin) * 100, 100) : 0;
  const remaining = Math.max(freeDeliveryMin - cartTotal, 0);
  const isFreeDelivery = freeDeliveryMin > 0 && cartTotal >= freeDeliveryMin;
  
  // إخفاء الشريط بعد الحصول على التوصيل المجاني
  if (hideAfterFreeDelivery && isFreeDelivery) return null;

  return (
    <AnimatePresence>
      {/* شريط الاحتفال */}
      {showCelebration && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white py-2 px-4"
        >
          <div className="flex items-center justify-center gap-2">
            <PartyPopper size={18} className="animate-bounce" />
            <span className="font-bold text-sm">مبروك! حصلت على توصيل مجاني</span>
            <PartyPopper size={18} className="animate-bounce" />
          </div>
        </motion.div>
      )}

      {/* الشريط الرئيسي */}
      {!showCelebration && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-gradient-to-r from-green-600 to-green-500 text-white"
        >
          <div className="max-w-7xl mx-auto px-3 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <Link 
                to="/food" 
                className="flex items-center gap-3 flex-1 min-w-0"
              >
                {/* أيقونة التوصيل */}
                <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-2 py-0.5">
                  <Bike size={14} />
                  <span className="text-xs font-medium">توصيل سريع</span>
                </div>

                {/* عرض شريط التقدم في صفحة المتجر */}
                {isStorePage && freeDeliveryMin > 0 && !isFreeDelivery && (
                  <div className="flex items-center gap-2 flex-1 max-w-[200px]">
                    <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-white rounded-full"
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                    <span className="text-[10px] whitespace-nowrap">
                      {cartTotal > 0 ? `${formatPrice(remaining)} للمجاني` : `توصيل مجاني من ${formatPrice(freeDeliveryMin)}`}
                    </span>
                  </div>
                )}

                {/* رسالة التوصيل المجاني */}
                {isStorePage && isFreeDelivery && (
                  <div className="flex items-center gap-1 text-xs bg-white/20 rounded-full px-2 py-0.5">
                    <Truck size={12} />
                    <span className="font-bold">توصيل مجاني ✓</span>
                  </div>
                )}

                {/* عرض الفلاش إذا وجد (في الصفحة الرئيسية) */}
                {!isStorePage && flashSale && (
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="animate-pulse">⚡</span>
                    <span className="font-bold">{flashSale.discount_percentage}% خصم</span>
                    <span className="text-white/80">•</span>
                    <div className="flex items-center gap-1 bg-white/20 rounded px-1.5 py-0.5">
                      <Clock size={10} />
                      <span>{String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}</span>
                    </div>
                  </div>
                )}

                {/* رسالة افتراضية */}
                {!isStorePage && !flashSale && (
                  <span className="text-xs text-white/90">اطلب الآن من أفضل المطاعم</span>
                )}
              </Link>

              {/* زر الإغلاق */}
              <button
                onClick={() => setDismissed(true)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FoodDeliveryBanner;
