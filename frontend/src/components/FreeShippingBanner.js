import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Truck, X, PartyPopper } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useFoodCart } from '../context/FoodCartContext';
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
  
  // سلة الطعام - من Context
  const foodCart = useFoodCart();
  
  // تحديد إذا كنا في صفحات الطعام
  const isFoodPage = location.pathname.startsWith('/food');
  
  // استخدام threshold المتجر (50,000) في صفحات الطعام، وإلا استخدام الإعدادات العامة
  const FREE_SHIPPING_THRESHOLD = isFoodPage ? 50000 : (settings?.free_shipping_threshold || 3000000);
  
  const [dismissed, setDismissed] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [productCartTotal, setProductCartTotal] = useState(0);
  const [productCartItems, setProductCartItems] = useState(0);
  
  const prevCartTotalRef = useRef(0);
  const celebrationTimeoutRef = useRef(null);
  const fetchIntervalRef = useRef(null);

  const shouldShowOnCurrentPage = isAllowedPath(location.pathname);

  // جلب بيانات سلة المنتجات فقط من API
  const fetchProductCart = useCallback(async () => {
    if (!token) {
      setProductCartTotal(0);
      setProductCartItems(0);
      return;
    }
    
    try {
      const productRes = await axios.get(`${API}/api/cart`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProductCartTotal(productRes.data?.total || 0);
      setProductCartItems(productRes.data?.items?.length || 0);
    } catch (e) {
      // تجاهل الأخطاء
    }
  }, [token]);

  // جلب بيانات سلة المنتجات عند تحميل المكون
  useEffect(() => {
    fetchProductCart();
    
    // جلب البيانات كل 5 ثواني للمنتجات فقط
    fetchIntervalRef.current = setInterval(fetchProductCart, 5000);
    
    return () => {
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current);
      }
    };
  }, [fetchProductCart]);

  // الاستماع لتغييرات سلة المنتجات
  useEffect(() => {
    const handleCartUpdate = () => {
      fetchProductCart();
    };

    window.addEventListener('cart-updated', handleCartUpdate);
    
    return () => {
      window.removeEventListener('cart-updated', handleCartUpdate);
    };
  }, [fetchProductCart]);

  // حساب الإجمالي - foodCart مباشرة + productCart من state
  const foodTotal = foodCart?.totalAmount || 0;
  const foodItems = foodCart?.totalItems || 0;
  
  const cartTotal = foodTotal + productCartTotal;
  const cartItemsCount = foodItems + productCartItems;
  
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
      <AnimatePresence>
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 flex items-center justify-between shadow-lg z-50 fixed top-[56px] left-0 right-0"
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
    );
  }

  // شريط التقدم
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white px-4 py-2 shadow-md z-50 fixed top-[56px] left-0 right-0"
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
  );
};

export default FreeShippingBanner;
