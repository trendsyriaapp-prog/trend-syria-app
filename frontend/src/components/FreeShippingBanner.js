import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Truck, X, AlertCircle, PartyPopper, Sparkles, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

const FREE_SHIPPING_THRESHOLD = 150000;

// الصفحات المسموحة
const ALLOWED_PATHS = ['/', '/products', '/cart', '/checkout'];
const isAllowedPath = (pathname) => {
  if (pathname === '/') return true;
  if (ALLOWED_PATHS.includes(pathname)) return true;
  if (pathname.startsWith('/products/')) return true;
  return false;
};

const formatPrice = (price) => new Intl.NumberFormat('ar-SY').format(price);

const FreeShippingBanner = () => {
  const { cart } = useCart();
  const { user } = useAuth();
  const location = useLocation();
  
  const [dismissed, setDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [celebrationShown, setCelebrationShown] = useState(false);
  
  const prevTotalRef = useRef(0);

  const shouldShowOnCurrentPage = isAllowedPath(location.pathname);

  // تحليل السلة
  const analyzeCart = useCallback(() => {
    if (!cart.items || cart.items.length === 0) {
      return { 
        hasItems: false, 
        isSingleSeller: false, 
        total: 0, 
        remaining: FREE_SHIPPING_THRESHOLD,
        progress: 0,
        qualifiesForFree: false
      };
    }

    const sellerIds = new Set();
    cart.items.forEach(item => {
      if (item.product?.seller_id) sellerIds.add(item.product.seller_id);
    });

    const isSingleSeller = sellerIds.size === 1;
    const cartTotal = cart.total || 0;
    const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal);
    const progress = Math.min(100, (cartTotal / FREE_SHIPPING_THRESHOLD) * 100);
    const qualifiesForFree = isSingleSeller && cartTotal >= FREE_SHIPPING_THRESHOLD;

    return {
      hasItems: true,
      isSingleSeller,
      total: cartTotal,
      remaining,
      progress,
      qualifiesForFree,
      sellerCount: sellerIds.size
    };
  }, [cart.items, cart.total]);

  const analysis = analyzeCart();

  // إظهار الشريط عند وجود منتجات في السلة
  useEffect(() => {
    const currentTotal = cart.total || 0;
    
    // إظهار الشريط إذا كانت السلة غير فارغة
    if (currentTotal > 0 && !dismissed) {
      setShowBanner(true);
      
      // إذا وصل للشحن المجاني ولم يُحتفل من قبل
      if (analysis.qualifiesForFree && !celebrationShown) {
        setCelebrationShown(true);
      }
    }
    
    prevTotalRef.current = currentTotal;
  }, [cart.total, analysis.qualifiesForFree, celebrationShown, dismissed]);

  // إعادة تعيين عند إفراغ السلة
  useEffect(() => {
    if (!cart.items || cart.items.length === 0) {
      setShowBanner(false);
      setDismissed(false);
      setCelebrationShown(false);
      prevTotalRef.current = 0;
    }
  }, [cart.items]);

  // إخفاء تلقائي عند اكتمال الشحن المجاني (بعد 5 ثواني)
  useEffect(() => {
    if (analysis.qualifiesForFree && showBanner) {
      const timer = setTimeout(() => {
        setShowBanner(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [analysis.qualifiesForFree, showBanner]);

  // الإغلاق
  const handleDismiss = () => {
    setDismissed(true);
    setShowBanner(false);
  };

  // شروط عدم الإظهار
  const isCustomer = user?.user_type === 'buyer' || user?.user_type === 'customer';
  if (!user || !isCustomer || !shouldShowOnCurrentPage) return null;
  if (dismissed || !showBanner || !analysis.hasItems) return null;

  // شريط النجاح (الشحن المجاني)
  if (analysis.qualifiesForFree) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="sticky top-[52px] z-40 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white shadow-md"
        >
          <div className="max-w-4xl mx-auto px-2 py-1">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 flex-1">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: 2 }}
                >
                  <PartyPopper size={12} />
                </motion.div>
                <span className="text-[9px] font-bold">
                  🎉 مبروك! التوصيل مجاني
                </span>
              </div>
              <button 
                onClick={handleDismiss} 
                className="p-0.5 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={10} />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // تحذير لأكثر من بائع
  if (analysis.sellerCount > 1) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="sticky top-[52px] z-40 bg-gradient-to-r from-amber-500 to-amber-400 text-white shadow-md"
        >
          <div className="max-w-4xl mx-auto px-2 py-1">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 flex-1">
                <AlertCircle size={12} />
                <span className="text-[9px] font-medium">
                  الشحن المجاني متاح فقط من متجر واحد
                </span>
              </div>
              <button 
                onClick={handleDismiss} 
                className="p-0.5 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={10} />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // شريط التقدم العادي
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="sticky top-[52px] z-40 bg-gradient-to-r from-[#FF6B00] to-[#FF8533] text-white shadow-md"
      >
        <div className="max-w-4xl mx-auto px-2 py-1">
          {/* صف واحد مضغوط */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 flex-1">
              <motion.div
                animate={{ x: [0, 3, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Truck size={12} />
              </motion.div>
              <span className="text-[9px] font-medium">
                أضف <span className="font-bold">{formatPrice(analysis.remaining)}</span> ل.س للتوصيل المجاني
              </span>
            </div>
            
            {/* شريط التقدم المصغر */}
            <div className="w-16 h-1.5 bg-white/30 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${analysis.progress}%` }}
                transition={{ duration: 0.8 }}
                className="h-full bg-white rounded-full"
              />
            </div>
            
            <button 
              onClick={handleDismiss} 
              className="p-0.5 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={10} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FreeShippingBanner;
