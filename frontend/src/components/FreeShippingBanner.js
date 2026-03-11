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
  const foodCart = useFoodCart();
  
  // تحديد نوع الصفحة
  const isFoodPage = location.pathname.startsWith('/food');
  const isFoodStorePage = location.pathname.startsWith('/food-store/');
  const isFoodCartPage = location.pathname.startsWith('/food/cart/');
  const isFoodMainPage = location.pathname === '/food';
  
  // استخراج store ID من URL إذا كنا في صفحة متجر
  const currentStoreId = isFoodStorePage 
    ? location.pathname.split('/food-store/')[1]?.split('/')[0]
    : isFoodCartPage 
      ? location.pathname.split('/food/cart/')[1]?.split('/')[0]
      : null;
  
  // حد الشحن المجاني
  const FREE_SHIPPING_THRESHOLD = isFoodPage ? 50000 : (settings?.free_shipping_threshold || 150000);
  
  const [dismissed, setDismissed] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [productCartTotal, setProductCartTotal] = useState(0);
  const [productCartItems, setProductCartItems] = useState(0);
  const [storesInfo, setStoresInfo] = useState([]);
  
  const prevCartTotalRef = useRef(0);
  const celebrationTimeoutRef = useRef(null);
  const fetchIntervalRef = useRef(null);

  const shouldShowOnCurrentPage = isAllowedPath(location.pathname);

  // جلب بيانات سلة المنتجات
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

  // جلب معلومات المتاجر في سلة الطعام
  useEffect(() => {
    if (isFoodPage && foodCart?.stores?.length > 0) {
      const fetchStoresInfo = async () => {
        try {
          const storesData = await Promise.all(
            foodCart.stores.map(async (store) => {
              try {
                const response = await fetch(`${API}/api/food/stores/${store.storeId}`);
                const data = await response.json();
                return {
                  storeId: store.storeId,
                  storeName: data?.name || 'متجر',
                  storeCity: data?.city || '',
                  totalAmount: store.totalAmount || 0,
                  progress: Math.min(100, ((store.totalAmount || 0) / FREE_SHIPPING_THRESHOLD) * 100),
                  isFree: (store.totalAmount || 0) >= FREE_SHIPPING_THRESHOLD,
                  remaining: Math.max(0, FREE_SHIPPING_THRESHOLD - (store.totalAmount || 0))
                };
              } catch (e) {
                return {
                  storeId: store.storeId,
                  storeName: 'متجر',
                  storeCity: '',
                  totalAmount: store.totalAmount || 0,
                  progress: Math.min(100, ((store.totalAmount || 0) / FREE_SHIPPING_THRESHOLD) * 100),
                  isFree: (store.totalAmount || 0) >= FREE_SHIPPING_THRESHOLD,
                  remaining: Math.max(0, FREE_SHIPPING_THRESHOLD - (store.totalAmount || 0))
                };
              }
            })
          );
          setStoresInfo(storesData);
        } catch (e) {
          console.error('Error fetching stores info:', e);
        }
      };
      fetchStoresInfo();
    } else {
      setStoresInfo([]);
    }
  }, [isFoodPage, foodCart?.stores, FREE_SHIPPING_THRESHOLD]);

  // جلب بيانات سلة المنتجات
  useEffect(() => {
    fetchProductCart();
    fetchIntervalRef.current = setInterval(fetchProductCart, 3000);
    return () => {
      if (fetchIntervalRef.current) clearInterval(fetchIntervalRef.current);
    };
  }, [fetchProductCart]);

  // الاستماع لتغييرات السلة
  useEffect(() => {
    const handleCartUpdate = () => fetchProductCart();
    window.addEventListener('cart-updated', handleCartUpdate);
    window.addEventListener('storage', handleCartUpdate);
    return () => {
      window.removeEventListener('cart-updated', handleCartUpdate);
      window.removeEventListener('storage', handleCartUpdate);
    };
  }, [fetchProductCart]);

  // حساب المجموع الكلي
  const foodTotal = foodCart?.totalAmount || 0;
  const foodItems = foodCart?.totalItems || 0;
  const cartTotal = isFoodPage ? foodTotal : (foodTotal + productCartTotal);
  const cartItemsCount = foodItems + productCartItems;
  const hasItems = cartItemsCount > 0;

  // منطق الاحتفال
  useEffect(() => {
    const currentTotal = cartTotal;
    const previousTotal = prevCartTotalRef.current;
    
    if (currentTotal >= FREE_SHIPPING_THRESHOLD && previousTotal < FREE_SHIPPING_THRESHOLD && previousTotal > 0) {
      setShowCelebration(true);
      setDismissed(false);
      
      if (celebrationTimeoutRef.current) clearTimeout(celebrationTimeoutRef.current);
      celebrationTimeoutRef.current = setTimeout(() => {
        setShowCelebration(false);
      }, 5000);
    }
    
    prevCartTotalRef.current = currentTotal;
    
    return () => {
      if (celebrationTimeoutRef.current) clearTimeout(celebrationTimeoutRef.current);
    };
  }, [cartTotal, FREE_SHIPPING_THRESHOLD]);

  // إعادة تعيين عند تغيير الصفحة
  useEffect(() => {
    setDismissed(false);
  }, [location.pathname]);

  const handleDismiss = () => {
    setDismissed(true);
    setShowCelebration(false);
  };

  // شروط الإخفاء
  const isCustomer = !user || user?.user_type === 'buyer' || user?.user_type === 'customer';
  
  if (!isCustomer || !shouldShowOnCurrentPage || dismissed) {
    return null;
  }

  // في صفحات المنتجات: إخفاء إذا لم يكن هناك عناصر
  if (!isFoodPage && !hasItems) {
    return null;
  }

  // ============================================
  // منطق العرض حسب السياق (الخيار 4)
  // ============================================

  // شريط الاحتفال العام
  if (showCelebration) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 flex items-center justify-between shadow-lg z-50 fixed top-[56px] left-0 right-0"
        >
          <div className="flex items-center gap-2 flex-1 justify-center">
            <PartyPopper className="w-5 h-5 animate-bounce" />
            <span className="font-bold text-sm">🎉 مبروك! حصلت على توصيل مجاني</span>
            <PartyPopper className="w-5 h-5 animate-bounce" />
          </div>
          <button onClick={handleDismiss} className="p-1 hover:bg-white/20 rounded-full transition-colors">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ============================================
  // صفحات الطعام
  // ============================================
  if (isFoodPage) {
    
    // 1. صفحة متجر معين أو سلة متجر معين
    if (currentStoreId && storesInfo.length > 0) {
      const currentStore = storesInfo.find(s => s.storeId === currentStoreId);
      
      if (currentStore) {
        if (currentStore.isFree) {
          // توصيل مجاني لهذا المتجر
          return (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 shadow-md z-50 fixed top-[56px] left-0 right-0"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <Truck className="w-5 h-5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">✓ {currentStore.storeName}: توصيل مجاني!</span>
                      <span className="text-white/80">100%</span>
                    </div>
                    <div className="w-full bg-white/30 rounded-full h-2 mt-1">
                      <div className="h-full bg-white rounded-full w-full" />
                    </div>
                  </div>
                </div>
                <button onClick={handleDismiss} className="p-1 hover:bg-white/20 rounded-full">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        } else {
          // يحتاج المزيد
          return (
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white px-4 py-2 shadow-md z-50 fixed top-[56px] left-0 right-0"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <Truck className="w-5 h-5" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium">أضف {formatPrice(currentStore.remaining)} ل.س للتوصيل المجاني</span>
                      <span className="text-white/80">{Math.round(currentStore.progress)}%</span>
                    </div>
                    <div className="w-full bg-white/30 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${currentStore.progress}%` }}
                        className="h-full bg-white rounded-full"
                      />
                    </div>
                  </div>
                </div>
                <button onClick={handleDismiss} className="p-1 hover:bg-white/20 rounded-full">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        }
      }
    }
    
    // 2. صفحة الطعام الرئيسية - عرض المتجر الأقرب للشحن المجاني
    if (isFoodMainPage || (!currentStoreId && storesInfo.length > 0)) {
      // ترتيب المتاجر حسب الأقرب للشحن المجاني (الذي لم يصل بعد)
      const storesNeedingMore = storesInfo.filter(s => !s.isFree).sort((a, b) => b.progress - a.progress);
      const allStoresFree = storesInfo.length > 0 && storesInfo.every(s => s.isFree);
      
      if (allStoresFree) {
        // كل المتاجر لديها شحن مجاني
        return (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 shadow-md z-50 fixed top-[56px] left-0 right-0"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Truck className="w-5 h-5" />
                <span className="font-medium text-sm">✓ توصيل مجاني لكل طلباتك! (أضف من متجر آخر لشحن مجاني إضافي)</span>
              </div>
              <button onClick={handleDismiss} className="p-1 hover:bg-white/20 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        );
      }
      
      if (storesNeedingMore.length > 0) {
        // عرض المتجر الأقرب للشحن المجاني
        const closestStore = storesNeedingMore[0];
        return (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white px-4 py-2 shadow-md z-50 fixed top-[56px] left-0 right-0"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Truck className="w-5 h-5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium">
                      {closestStore.storeName}: أضف {formatPrice(closestStore.remaining)} ل.س للتوصيل المجاني
                    </span>
                    <span className="text-white/80">{Math.round(closestStore.progress)}%</span>
                  </div>
                  <div className="w-full bg-white/30 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${closestStore.progress}%` }}
                      className="h-full bg-white rounded-full"
                    />
                  </div>
                </div>
              </div>
              <button onClick={handleDismiss} className="p-1 hover:bg-white/20 rounded-full">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        );
      }
      
      // لا يوجد منتجات في السلة - عرض شريط تشجيعي
      return (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white px-4 py-2 shadow-md z-50 fixed top-[56px] left-0 right-0"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Truck className="w-5 h-5" />
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium">أضف {formatPrice(FREE_SHIPPING_THRESHOLD)} ل.س للتوصيل المجاني (من نفس المتجر)</span>
                  <span className="text-white/80">0%</span>
                </div>
                <div className="w-full bg-white/30 rounded-full h-2">
                  <div className="h-full bg-white rounded-full w-0" />
                </div>
              </div>
            </div>
            <button onClick={handleDismiss} className="p-1 hover:bg-white/20 rounded-full">
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      );
    }
    
    // صفحات طعام أخرى - عرض شريط افتراضي
    return (
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white px-4 py-2 shadow-md z-50 fixed top-[56px] left-0 right-0"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Truck className="w-5 h-5" />
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium">أضف {formatPrice(FREE_SHIPPING_THRESHOLD)} ل.س للتوصيل المجاني (من نفس المتجر)</span>
                <span className="text-white/80">0%</span>
              </div>
              <div className="w-full bg-white/30 rounded-full h-2">
                <div className="h-full bg-white rounded-full w-0" />
              </div>
            </div>
          </div>
          <button onClick={handleDismiss} className="p-1 hover:bg-white/20 rounded-full">
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    );
  }

  // ============================================
  // صفحات المنتجات (غير الطعام)
  // ============================================
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal);
  const progress = Math.min(100, (cartTotal / FREE_SHIPPING_THRESHOLD) * 100);
  const qualifiesForFree = cartTotal >= FREE_SHIPPING_THRESHOLD;

  if (qualifiesForFree) {
    return (
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 shadow-md z-50 fixed top-[56px] left-0 right-0"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1">
            <Truck className="w-5 h-5" />
            <span className="font-medium text-sm">✓ توصيل مجاني!</span>
          </div>
          <button onClick={handleDismiss} className="p-1 hover:bg-white/20 rounded-full">
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white px-4 py-2 shadow-md z-50 fixed top-[56px] left-0 right-0"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Truck className="w-5 h-5" />
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium">أضف {formatPrice(remaining)} ل.س للشحن المجاني</span>
              <span className="text-white/80">{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-white/30 rounded-full h-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="h-full bg-white rounded-full"
              />
            </div>
          </div>
        </div>
        <button onClick={handleDismiss} className="p-1 hover:bg-white/20 rounded-full">
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

export default FreeShippingBanner;
