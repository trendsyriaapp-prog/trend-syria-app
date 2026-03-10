import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Truck, X, PartyPopper } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { motion, AnimatePresence } from 'framer-motion';

// الصفحات المسموحة
const ALLOWED_PATHS = ['/', '/products', '/cart', '/checkout'];
const isAllowedPath = (pathname) => {
  if (pathname === '/') return true;
  if (ALLOWED_PATHS.includes(pathname)) return true;
  if (pathname.startsWith('/products/')) return true;
  return false;
};

const formatPrice = (price) => new Intl.NumberFormat('ar-SY').format(price);

// مفتاح localStorage لتتبع المتاجر التي تم تحقيق الشحن المجاني معها
const FREE_SHIPPING_SELLERS_KEY = 'free_shipping_qualified_sellers';

const FreeShippingBanner = () => {
  const { cart } = useCart();
  const { user } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();
  
  const FREE_SHIPPING_THRESHOLD = settings.free_shipping_threshold || 150000;
  
  const [dismissed, setDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  
  const prevQualifiedSellersRef = useRef(new Set());

  const shouldShowOnCurrentPage = isAllowedPath(location.pathname);

  // الحصول على المتاجر التي تم تحقيق الشحن المجاني معها من localStorage
  const getQualifiedSellers = () => {
    try {
      const saved = localStorage.getItem(FREE_SHIPPING_SELLERS_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  };

  // حفظ المتاجر المؤهلة
  const saveQualifiedSellers = (sellers) => {
    localStorage.setItem(FREE_SHIPPING_SELLERS_KEY, JSON.stringify([...sellers]));
  };

  // مسح المتاجر المؤهلة
  const clearQualifiedSellers = () => {
    localStorage.removeItem(FREE_SHIPPING_SELLERS_KEY);
  };

  // تحليل السلة وتجميع المنتجات حسب المتجر
  const analyzeCart = useCallback(() => {
    if (!cart.items || cart.items.length === 0) {
      return { 
        hasItems: false, 
        total: 0, 
        remaining: FREE_SHIPPING_THRESHOLD,
        progress: 0,
        qualifiesForFree: false,
        qualifiedSellers: new Set(),
        sellerTotals: {}
      };
    }

    const cartTotal = cart.total || 0;
    const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal);
    const progress = Math.min(100, (cartTotal / FREE_SHIPPING_THRESHOLD) * 100);
    
    // تجميع حسب المتجر
    const sellerTotals = {};
    cart.items.forEach(item => {
      const sellerId = item.product?.seller_id || item.seller_id;
      if (sellerId) {
        const itemTotal = (item.product?.price || item.price || 0) * (item.quantity || 1);
        sellerTotals[sellerId] = (sellerTotals[sellerId] || 0) + itemTotal;
      }
    });

    // المتاجر التي وصلت للحد
    const qualifiedSellers = new Set();
    Object.entries(sellerTotals).forEach(([sellerId, total]) => {
      if (total >= FREE_SHIPPING_THRESHOLD) {
        qualifiedSellers.add(sellerId);
      }
    });

    const qualifiesForFree = qualifiedSellers.size > 0;

    return {
      hasItems: true,
      total: cartTotal,
      remaining,
      progress,
      qualifiesForFree,
      qualifiedSellers,
      sellerTotals
    };
  }, [cart.items, cart.total, FREE_SHIPPING_THRESHOLD]);

  const analysis = analyzeCart();

  // التحقق من وجود متجر جديد مؤهل
  useEffect(() => {
    // إذا السلة فارغة
    if (!analysis.hasItems) {
      setShowBanner(false);
      setShowCelebration(false);
      setDismissed(false);
      clearQualifiedSellers();
      prevQualifiedSellersRef.current = new Set();
      return;
    }

    const savedQualifiedSellers = getQualifiedSellers();
    const currentQualifiedSellers = analysis.qualifiedSellers;

    // البحث عن متجر جديد مؤهل (لم يكن مؤهلاً من قبل)
    let newQualifiedSeller = null;
    currentQualifiedSellers.forEach(sellerId => {
      if (!savedQualifiedSellers.has(sellerId)) {
        newQualifiedSeller = sellerId;
      }
    });

    if (newQualifiedSeller && !dismissed) {
      // متجر جديد وصل للحد! أظهر الاحتفال
      setShowCelebration(true);
      setShowBanner(true);
      
      // أضف المتجر للقائمة المحفوظة
      savedQualifiedSellers.add(newQualifiedSeller);
      saveQualifiedSellers(savedQualifiedSellers);
      
      // أخفِ بعد 4 ثواني
      setTimeout(() => {
        setShowCelebration(false);
        setShowBanner(false);
      }, 4000);
    } else if (!analysis.qualifiesForFree && analysis.hasItems && !dismissed) {
      // لم يصل لأي شحن مجاني بعد - أظهر شريط التقدم
      setShowBanner(true);
      setShowCelebration(false);
    } else {
      // وصل للشحن المجاني لكل المتاجر أو تم الإغلاق
      setShowBanner(false);
      setShowCelebration(false);
    }

    // تحديث المتاجر المؤهلة في الذاكرة المؤقتة
    // إزالة المتاجر التي لم تعد مؤهلة
    const updatedSavedSellers = new Set();
    savedQualifiedSellers.forEach(sellerId => {
      if (currentQualifiedSellers.has(sellerId)) {
        updatedSavedSellers.add(sellerId);
      }
    });
    
    if (updatedSavedSellers.size !== savedQualifiedSellers.size) {
      saveQualifiedSellers(updatedSavedSellers);
    }

    prevQualifiedSellersRef.current = currentQualifiedSellers;
  }, [analysis.hasItems, analysis.qualifiesForFree, analysis.qualifiedSellers, dismissed]);

  // إعادة تعيين عند إفراغ السلة
  useEffect(() => {
    if (!cart.items || cart.items.length === 0) {
      setShowBanner(false);
      setDismissed(false);
      setShowCelebration(false);
      clearQualifiedSellers();
      prevQualifiedSellersRef.current = new Set();
    }
  }, [cart.items]);

  // الإغلاق
  const handleDismiss = () => {
    setDismissed(true);
    setShowBanner(false);
    setShowCelebration(false);
  };

  // شروط عدم الإظهار
  const isCustomer = user?.user_type === 'buyer' || user?.user_type === 'customer';
  
  if (!user || !isCustomer || !shouldShowOnCurrentPage) return null;
  if (dismissed || !analysis.hasItems) return null;
  
  // إذا وصل للشحن المجاني لكل المتاجر ولا يوجد احتفال، لا تُظهر
  if (analysis.qualifiesForFree && !showCelebration) {
    console.log('FreeShippingBanner: Not showing - qualifies for free and no celebration');
    return null;
  }
  
  console.log('FreeShippingBanner: SHOULD SHOW NOW!');

  // شريط النجاح (الشحن المجاني) - يظهر فقط لحظة الوصول لمتجر جديد
  if (showCelebration) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed top-[52px] left-0 right-0 z-50 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white shadow-lg"
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

  // لا تظهر شريط التقدم إذا وصل للشحن المجاني من أي متجر
  if (analysis.qualifiesForFree) {
    return null;
  }

  // شريط التقدم العادي (لم يصل للشحن المجاني بعد)
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="fixed top-[52px] left-0 right-0 z-50 bg-gradient-to-r from-[#FF6B00] to-[#FF8533] text-white shadow-lg"
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
