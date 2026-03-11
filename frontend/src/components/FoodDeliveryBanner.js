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
    } else {
      // إعادة تعيين القيم عند مغادرة صفحة المتجر
      setFreeDeliveryMin(0);
      setCartTotal(0);
      setHideAfterFreeDelivery(false);
    }
  }, [location.pathname, isStorePage]);

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
            setHideAfterFreeDelivery(true); // إخفاء الشريط العادي فوراً
            setTimeout(() => setShowCelebration(false), 3000);
          }
          
          setCartTotal(total);
        } else {
          setCartTotal(0);
          setHideAfterFreeDelivery(false);
        }
      } catch (error) {
        console.error('Error loading cart:', error);
      }
    };

    // تحميل السلة عند بدء التشغيل
    loadCart();

    // الاستماع لتحديثات السلة
    const handleCartUpdate = () => loadCart();
    window.addEventListener('foodCartUpdated', handleCartUpdate);
    
    // تحديث دوري كاحتياط
    const interval = setInterval(loadCart, 1000);

    return () => {
      window.removeEventListener('foodCartUpdated', handleCartUpdate);
      clearInterval(interval);
    };
  }, [location.pathname, freeDeliveryMin, isStorePage, cartTotal]);

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

  // إظهار الشريط فقط في صفحات المتاجر (وليس الصفحة الرئيسية للطعام)
  if (!isStorePage || dismissed) return null;

  // حساب نسبة التقدم
  const progress = freeDeliveryMin > 0 ? Math.min((cartTotal / freeDeliveryMin) * 100, 100) : 0;
  const remaining = Math.max(freeDeliveryMin - cartTotal, 0);
  const isFreeDelivery = freeDeliveryMin > 0 && cartTotal >= freeDeliveryMin;
  
  // إخفاء الشريط بالكامل بعد انتهاء الاحتفال
  if (hideAfterFreeDelivery && !showCelebration) return null;

  return (
    <div className="sticky top-[52px] z-40">
    <AnimatePresence>
      {/* شريط الاحتفال فقط - لا يظهر شريط آخر بعده */}
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

      {/* شريط التقدم للشحن المجاني - يظهر فقط قبل الحصول على التوصيل المجاني */}
      {!showCelebration && !isFreeDelivery && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white"
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

                {/* عرض شريط التقدم */}
                {freeDeliveryMin > 0 && (
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
    </div>
  );
};

export default FoodDeliveryBanner;
