import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Truck, X, PartyPopper } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { motion, AnimatePresence } from 'framer-motion';

// الصفحات المسموحة لعرض الشريط
const ALLOWED_PATHS = ['/', '/products', '/cart', '/checkout', '/food', '/food/cart', '/food/checkout'];
const isAllowedPath = (pathname) => {
  if (pathname === '/') return true;
  if (ALLOWED_PATHS.includes(pathname)) return true;
  if (pathname.startsWith('/products/')) return true;
  if (pathname.startsWith('/product/')) return true;
  if (pathname.startsWith('/food/')) return true;
  if (pathname.startsWith('/food-store/')) return true;
  return false;
};

const formatPrice = (price) => new Intl.NumberFormat('ar-SY').format(price);

const FreeShippingBanner = () => {
  const { cart, loading: cartLoading } = useCart();
  const { user } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();
  
  const FREE_SHIPPING_THRESHOLD = settings?.free_shipping_threshold || 150000;
  
  const [dismissed, setDismissed] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [justQualified, setJustQualified] = useState(false);
  
  const prevCartTotalRef = useRef(0);
  const celebrationTimeoutRef = useRef(null);

  const shouldShowOnCurrentPage = isAllowedPath(location.pathname);

  // حساب بيانات السلة
  const cartTotal = cart?.total || 0;
  const cartItemsCount = cart?.items?.length || 0;
  const hasItems = cartItemsCount > 0;
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal);
  const progress = Math.min(100, (cartTotal / FREE_SHIPPING_THRESHOLD) * 100);
  const qualifiesForFree = cartTotal >= FREE_SHIPPING_THRESHOLD;

  // التحقق من الوصول للشحن المجاني لأول مرة
  useEffect(() => {
    const prevTotal = prevCartTotalRef.current;
    const prevQualified = prevTotal >= FREE_SHIPPING_THRESHOLD;
    const nowQualified = cartTotal >= FREE_SHIPPING_THRESHOLD;
    
    // إذا وصل للحد الآن ولم يكن قد وصل من قبل
    if (nowQualified && !prevQualified && hasItems && prevTotal > 0) {
      setShowCelebration(true);
      setJustQualified(true);
      
      // إخفاء الاحتفال بعد 4 ثواني
      if (celebrationTimeoutRef.current) {
        clearTimeout(celebrationTimeoutRef.current);
      }
      celebrationTimeoutRef.current = setTimeout(() => {
        setShowCelebration(false);
        setJustQualified(false);
      }, 4000);
    }
    
    // إذا السلة فارغة، أعد التعيين
    if (!hasItems) {
      setShowCelebration(false);
      setJustQualified(false);
      setDismissed(false);
    }
    
    prevCartTotalRef.current = cartTotal;
  }, [cartTotal, hasItems, FREE_SHIPPING_THRESHOLD]);

  // تنظيف عند إزالة المكون
  useEffect(() => {
    return () => {
      if (celebrationTimeoutRef.current) {
        clearTimeout(celebrationTimeoutRef.current);
      }
    };
  }, []);

  // الإغلاق
  const handleDismiss = () => {
    setDismissed(true);
    setShowCelebration(false);
  };

  // شروط عدم الإظهار
  const isCustomer = !user || user?.user_type === 'buyer' || user?.user_type === 'customer';
  
  // لا تظهر إذا:
  // - ليس عميل
  // - ليس في صفحة مسموحة
  // - تم الإغلاق
  // - السلة فارغة
  // - السلة قيد التحميل
  if (!isCustomer || !shouldShowOnCurrentPage || dismissed || !hasItems || cartLoading) {
    return null;
  }

  // إذا وصل للشحن المجاني ولا يوجد احتفال، لا تُظهر الشريط
  if (qualifiesForFree && !showCelebration) {
    return null;
  }

  // شريط الاحتفال - يظهر فقط لحظة الوصول للحد
  if (showCelebration) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 flex items-center justify-between shadow-lg z-50 sticky top-0"
        >
          <div className="flex items-center gap-2 flex-1 justify-center">
            <PartyPopper className="w-5 h-5 animate-bounce" />
            <span className="font-bold text-sm">
              🎉 هيولا! حصلت على توصيل مجاني
            </span>
            <PartyPopper className="w-5 h-5 animate-bounce" />
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/20 rounded-full transition-colors mr-2"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      </AnimatePresence>
    );
  }

  // شريط التقدم - يظهر عندما لم يصل للحد بعد
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white px-4 py-2 shadow-md z-50 sticky top-0"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Truck className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium">
                  أضف {formatPrice(remaining)} ل.س للشحن المجاني
                </span>
                <span className="text-white/80">{Math.round(progress)}%</span>
              </div>
              {/* شريط التقدم */}
              <div className="w-full bg-white/30 rounded-full h-2 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="h-full bg-white rounded-full"
                />
              </div>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/20 rounded-full transition-colors flex-shrink-0"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FreeShippingBanner;
