import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Truck, X, PartyPopper } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useFoodCart } from '../context/FoodCartContext';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

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
  
  const isFoodPage = location.pathname.startsWith('/food');
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
    } catch (e) {}
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
                  totalAmount: store.totalAmount || 0,
                  progress: Math.min(100, ((store.totalAmount || 0) / FREE_SHIPPING_THRESHOLD) * 100),
                  isFree: (store.totalAmount || 0) >= FREE_SHIPPING_THRESHOLD,
                  remaining: Math.max(0, FREE_SHIPPING_THRESHOLD - (store.totalAmount || 0))
                };
              } catch (e) {
                return {
                  storeId: store.storeId,
                  storeName: 'متجر',
                  totalAmount: store.totalAmount || 0,
                  progress: Math.min(100, ((store.totalAmount || 0) / FREE_SHIPPING_THRESHOLD) * 100),
                  isFree: (store.totalAmount || 0) >= FREE_SHIPPING_THRESHOLD,
                  remaining: Math.max(0, FREE_SHIPPING_THRESHOLD - (store.totalAmount || 0))
                };
              }
            })
          );
          setStoresInfo(storesData);
        } catch (e) {}
      };
      fetchStoresInfo();
    } else {
      setStoresInfo([]);
    }
  }, [isFoodPage, foodCart?.stores, FREE_SHIPPING_THRESHOLD]);

  useEffect(() => {
    fetchProductCart();
    fetchIntervalRef.current = setInterval(fetchProductCart, 3000);
    return () => {
      if (fetchIntervalRef.current) clearInterval(fetchIntervalRef.current);
    };
  }, [fetchProductCart]);

  useEffect(() => {
    const handleCartUpdate = () => fetchProductCart();
    window.addEventListener('cart-updated', handleCartUpdate);
    window.addEventListener('storage', handleCartUpdate);
    return () => {
      window.removeEventListener('cart-updated', handleCartUpdate);
      window.removeEventListener('storage', handleCartUpdate);
    };
  }, [fetchProductCart]);

  const foodTotal = foodCart?.totalAmount || 0;
  const foodItems = foodCart?.totalItems || 0;
  const cartTotal = isFoodPage ? foodTotal : (foodTotal + productCartTotal);
  const cartItemsCount = foodItems + productCartItems;
  const hasItems = cartItemsCount > 0;

  useEffect(() => {
    const currentTotal = cartTotal;
    const previousTotal = prevCartTotalRef.current;
    
    if (currentTotal >= FREE_SHIPPING_THRESHOLD && previousTotal < FREE_SHIPPING_THRESHOLD && previousTotal > 0) {
      setShowCelebration(true);
      setDismissed(false);
      if (celebrationTimeoutRef.current) clearTimeout(celebrationTimeoutRef.current);
      celebrationTimeoutRef.current = setTimeout(() => setShowCelebration(false), 5000);
    }
    prevCartTotalRef.current = currentTotal;
    return () => {
      if (celebrationTimeoutRef.current) clearTimeout(celebrationTimeoutRef.current);
    };
  }, [cartTotal, FREE_SHIPPING_THRESHOLD]);

  useEffect(() => {
    setDismissed(false);
  }, [location.pathname]);

  const handleDismiss = () => {
    setDismissed(true);
    setShowCelebration(false);
  };

  const isCustomer = !user || user?.user_type === 'buyer' || user?.user_type === 'customer';
  
  if (!isCustomer || !shouldShowOnCurrentPage || dismissed) return null;
  if (!isFoodPage && !hasItems) return null;

  // شريط الاحتفال
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
          <button onClick={handleDismiss} className="p-1 hover:bg-white/20 rounded-full">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ============================================
  // صفحات الطعام - عرض كل المتاجر منفصلة
  // ============================================
  if (isFoodPage) {
    
    // عدة متاجر - عرض كل واحد بشريط منفصل
    if (storesInfo.length > 1) {
      return (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white px-3 py-2 shadow-md z-50 fixed top-[56px] left-0 right-0"
        >
          <div className="space-y-1.5 pr-6">
            {storesInfo.map((store) => (
              <div key={store.storeId} className="flex items-center gap-2">
                <Truck className="w-3 h-3 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center justify-between text-[10px] mb-0.5">
                    <span className="font-medium truncate">
                      {store.isFree 
                        ? `✓ ${store.storeName}: مجاني!`
                        : `${store.storeName}: +${formatPrice(store.remaining)}`
                      }
                    </span>
                    <span className={`mr-1 ${store.isFree ? "text-green-200" : "text-white/70"}`}>
                      {Math.round(store.progress)}%
                    </span>
                  </div>
                  <div className={`w-full rounded-full h-1 ${store.isFree ? 'bg-green-400/50' : 'bg-white/30'}`}>
                    <div 
                      className={`h-full rounded-full ${store.isFree ? 'bg-green-300' : 'bg-white'}`}
                      style={{ width: `${store.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button 
            onClick={handleDismiss} 
            className="absolute top-2 left-2 p-1 hover:bg-white/20 rounded-full"
          >
            <X className="w-3 h-3" />
          </button>
        </motion.div>
      );
    }
    
    // متجر واحد
    if (storesInfo.length === 1) {
      const store = storesInfo[0];
      const bgClass = store.isFree 
        ? "bg-gradient-to-r from-green-500 to-emerald-500" 
        : "bg-gradient-to-r from-[#FF6B00] to-[#FF8C00]";
      
      return (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`${bgClass} text-white px-4 py-2 shadow-md z-50 fixed top-[56px] left-0 right-0`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Truck className="w-5 h-5" />
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium">
                    {store.isFree 
                      ? `✓ ${store.storeName}: توصيل مجاني!`
                      : `${store.storeName}: أضف ${formatPrice(store.remaining)} ل.س للتوصيل المجاني`
                    }
                  </span>
                  <span className="text-white/80">{Math.round(store.progress)}%</span>
                </div>
                <div className="w-full bg-white/30 rounded-full h-2">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-500"
                    style={{ width: `${store.progress}%` }}
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
    
    // لا يوجد منتجات - شريط تشجيعي
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
  // صفحات المنتجات
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
