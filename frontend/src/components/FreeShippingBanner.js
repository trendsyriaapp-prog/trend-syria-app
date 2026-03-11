import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Truck, X, PartyPopper } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

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
  const { user, token } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();
  
  const FREE_SHIPPING_THRESHOLD = settings?.free_shipping_threshold || 3000000;
  
  const [dismissed, setDismissed] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [cartTotal, setCartTotal] = useState(0);
  const [cartItemsCount, setCartItemsCount] = useState(0);
  
  const prevCartTotalRef = useRef(0);
  const celebrationTimeoutRef = useRef(null);
  const fetchIntervalRef = useRef(null);

  const shouldShowOnCurrentPage = isAllowedPath(location.pathname);

  // جلب بيانات السلة مباشرة من الـ API
  const fetchCartData = async () => {
    if (!token) return;
    
    try {
      const res = await axios.get(`${API}/api/cart`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const total = res.data?.total || 0;
      const itemsCount = res.data?.items?.length || 0;
      
      setCartTotal(total);
      setCartItemsCount(itemsCount);
    } catch (error) {
      // تجاهل الأخطاء
    }
  };

  // جلب بيانات السلة عند تحميل المكون وعند تغيير الصفحة
  useEffect(() => {
    fetchCartData();
    
    // جلب البيانات كل 3 ثواني
    fetchIntervalRef.current = setInterval(fetchCartData, 3000);
    
    return () => {
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current);
      }
    };
  }, [token, location.pathname]);

  // الاستماع لتغييرات السلة
  useEffect(() => {
    const handleCartUpdate = () => {
      fetchCartData();
    };

    window.addEventListener('cart-updated', handleCartUpdate);
    window.addEventListener('storage', handleCartUpdate);
    
    return () => {
      window.removeEventListener('cart-updated', handleCartUpdate);
      window.removeEventListener('storage', handleCartUpdate);
    };
  }, [token]);

  // حساب البيانات
  const hasItems = cartItemsCount > 0;
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal);
  const progress = Math.min(100, (cartTotal / FREE_SHIPPING_THRESHOLD) * 100);
  const qualifiesForFree = cartTotal >= FREE_SHIPPING_THRESHOLD;

  // التحقق من الوصول للشحن المجاني لأول مرة
  useEffect(() => {
    const prevTotal = prevCartTotalRef.current;
    const prevQualified = prevTotal >= FREE_SHIPPING_THRESHOLD;
    const nowQualified = cartTotal >= FREE_SHIPPING_THRESHOLD;
    
    if (nowQualified && !prevQualified && hasItems && prevTotal > 0) {
      setShowCelebration(true);
      
      if (celebrationTimeoutRef.current) {
        clearTimeout(celebrationTimeoutRef.current);
      }
      celebrationTimeoutRef.current = setTimeout(() => {
        setShowCelebration(false);
      }, 4000);
    }
    
    if (!hasItems) {
      setShowCelebration(false);
      setDismissed(false);
    }
    
    prevCartTotalRef.current = cartTotal;
  }, [cartTotal, hasItems, FREE_SHIPPING_THRESHOLD]);

  // تنظيف
  useEffect(() => {
    return () => {
      if (celebrationTimeoutRef.current) {
        clearTimeout(celebrationTimeoutRef.current);
      }
    };
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    setShowCelebration(false);
  };

  // شروط عدم الإظهار
  const isCustomer = !user || user?.user_type === 'buyer' || user?.user_type === 'customer';
  
  if (!isCustomer || !shouldShowOnCurrentPage || dismissed || !hasItems) {
    return null;
  }

  if (qualifiesForFree && !showCelebration) {
    return null;
  }

  // شريط الاحتفال
  if (showCelebration) {
    return (
      <>
        <div className="h-10" /> {/* Spacer */}
        <AnimatePresence>
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 flex items-center justify-between shadow-lg z-40 fixed top-[60px] left-0 right-0"
            data-testid="free-shipping-celebration"
          >
            <div className="flex items-center gap-2 flex-1 justify-center">
              <PartyPopper className="w-5 h-5 animate-bounce" />
              <span className="font-bold text-sm">
                🎉 مبروك! حصلت على توصيل مجاني
              </span>
              <PartyPopper className="w-5 h-5 animate-bounce" />
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white/20 rounded-full transition-colors mr-2"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        </AnimatePresence>
      </>
    );
  }

  // شريط التقدم
  return (
    <>
      <div className="h-10" /> {/* Spacer */}
      <AnimatePresence>
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white px-4 py-2 shadow-md z-40 fixed top-[60px] left-0 right-0"
          data-testid="free-shipping-progress"
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
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

export default FreeShippingBanner;
