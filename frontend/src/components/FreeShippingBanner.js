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
  
  // الحصول على مدينة المستخدم
  const userCity = user?.city || '';
  
  // في صفحات الطعام: التحقق من أن المستخدم في نفس مدينة المتجر
  // إذا كان المستخدم في مدينة مختلفة، لا نظهر شريط الشحن المجاني
  const [storeCity, setStoreCity] = useState('');
  
  // جلب مدينة المتجر من سلة الطعام
  useEffect(() => {
    if (isFoodPage && foodCart?.stores?.length > 0) {
      // جلب معلومات المتجر الأول في السلة
      const fetchStoreCity = async () => {
        try {
          const storeId = foodCart.stores[0]?.storeId;
          if (storeId) {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/food/stores/${storeId}`);
            const data = await response.json();
            setStoreCity(data?.city || '');
          }
        } catch (e) {
          console.error('Error fetching store city:', e);
        }
      };
      fetchStoreCity();
    }
  }, [isFoodPage, foodCart?.stores]);
  
  // التحقق من تطابق المدن (للطعام فقط)
  const citiesMatch = !isFoodPage || !userCity || !storeCity || 
    userCity.trim() === storeCity.trim() ||
    userCity.includes(storeCity) || storeCity.includes(userCity);
  
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
    
    // جلب البيانات كل 2 ثانية للاستجابة السريعة
    fetchIntervalRef.current = setInterval(fetchProductCart, 2000);
    
    return () => {
      if (fetchIntervalRef.current) {
        clearInterval(fetchIntervalRef.current);
      }
    };
  }, [fetchProductCart]);

  // الاستماع لتغييرات سلة المنتجات - استجابة فورية
  useEffect(() => {
    const handleCartUpdate = () => {
      // تحديث فوري
      fetchProductCart();
    };

    window.addEventListener('cart-updated', handleCartUpdate);
    window.addEventListener('storage', handleCartUpdate);
    
    return () => {
      window.removeEventListener('cart-updated', handleCartUpdate);
      window.removeEventListener('storage', handleCartUpdate);
    };
  }, [fetchProductCart]);

  // حساب الإجمالي - foodCart مباشرة + productCart من state
  const foodTotal = foodCart?.totalAmount || 0;
  const foodItems = foodCart?.totalItems || 0;
  const foodStores = foodCart?.stores || [];
  
  // في صفحات الطعام: نحسب لكل متجر على حدة
  // نجد المتجر الذي لم يصل للشحن المجاني بعد
  let currentStoreTotal = 0;
  let currentStoreName = '';
  let storesWithFreeShipping = 0;
  let storesWithoutFreeShipping = 0;
  
  if (isFoodPage && foodStores.length > 0) {
    for (const store of foodStores) {
      if (store.totalAmount >= FREE_SHIPPING_THRESHOLD) {
        storesWithFreeShipping++;
      } else {
        storesWithoutFreeShipping++;
        // نعرض المتجر الذي لم يصل للشحن المجاني
        if (currentStoreTotal === 0 || store.totalAmount > currentStoreTotal) {
          currentStoreTotal = store.totalAmount;
          currentStoreName = store.storeName || '';
        }
      }
    }
  }
  
  // في صفحات الطعام: نستخدم مجموع المتجر الحالي
  // في صفحات المنتجات: نستخدم المجموع الكلي
  const cartTotal = isFoodPage ? (currentStoreTotal || foodTotal) : (foodTotal + productCartTotal);
  const cartItemsCount = foodItems + productCartItems;
  
  const hasItems = cartItemsCount > 0;
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal);
  const progress = Math.min(100, (cartTotal / FREE_SHIPPING_THRESHOLD) * 100);
  const qualifiesForFree = isFoodPage 
    ? (foodStores.length > 0 && foodStores.every(s => s.totalAmount >= FREE_SHIPPING_THRESHOLD))
    : (cartTotal >= FREE_SHIPPING_THRESHOLD);
  
  // هل يوجد متجر واحد على الأقل وصل للشحن المجاني؟
  const hasAnyFreeShipping = storesWithFreeShipping > 0;
  // هل يوجد متجر لم يصل للشحن المجاني؟
  const hasStoreNeedingMore = storesWithoutFreeShipping > 0;

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
  
  // في صفحات الطعام: نظهر الشريط حتى لو السلة فارغة (لتشجيع الشراء)
  // لكن نخفيه فقط إذا كان المستخدم في مدينة مختلفة عن المتجر
  const shouldHide = !isCustomer || !shouldShowOnCurrentPage || dismissed;
  
  // إذا كنا في صفحة منتجات ولا يوجد منتجات، نخفي الشريط
  const hideForEmptyProductCart = !isFoodPage && !hasItems;
  
  if (shouldHide || hideForEmptyProductCart) {
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
  
  // إذا الشحن مجاني لكل المتاجر - نعرض شريط أخضر
  if (qualifiesForFree && !hasStoreNeedingMore) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 shadow-md z-50 fixed top-[56px] left-0 right-0"
          data-testid="free-shipping-achieved"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Truck className="w-5 h-5 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">
                    ✓ توصيل مجاني! {isFoodPage && <span className="text-white/80">(أضف من متجر آخر لشحن مجاني إضافي)</span>}
                  </span>
                  <span className="text-white/80">100%</span>
                </div>
                <div className="w-full bg-white/30 rounded-full h-2 overflow-hidden mt-1">
                  <div className="h-full bg-white rounded-full w-full" />
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
                  أضف {formatPrice(remaining)} ل.س للشحن المجاني {isFoodPage && <span className="text-white/90">(من نفس المتجر)</span>}
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
