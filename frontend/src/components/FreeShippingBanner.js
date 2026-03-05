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

// مفتاح localStorage لتتبع حالة الشحن المجاني
const FREE_SHIPPING_SHOWN_KEY = 'free_shipping_shown_at';

const FreeShippingBanner = () => {
  const { cart } = useCart();
  const { user } = useAuth();
  const { settings } = useSettings();
  const location = useLocation();
  
  const FREE_SHIPPING_THRESHOLD = settings.free_shipping_threshold || 150000;
  
  const [dismissed, setDismissed] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  
  const prevQualifiedRef = useRef(false);
  const prevTotalRef = useRef(0);

  const shouldShowOnCurrentPage = isAllowedPath(location.pathname);

  // تحليل السلة
  const analyzeCart = useCallback(() => {
    if (!cart.items || cart.items.length === 0) {
      return { 
        hasItems: false, 
        total: 0, 
        remaining: FREE_SHIPPING_THRESHOLD,
        progress: 0,
        qualifiesForFree: false
      };
    }

    const cartTotal = cart.total || 0;
    const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal);
    const progress = Math.min(100, (cartTotal / FREE_SHIPPING_THRESHOLD) * 100);
    const qualifiesForFree = cartTotal >= FREE_SHIPPING_THRESHOLD;

    return {
      hasItems: true,
      total: cartTotal,
      remaining,
      progress,
      qualifiesForFree
    };
  }, [cart.items, cart.total, FREE_SHIPPING_THRESHOLD]);

  const analysis = analyzeCart();

  // التحقق إذا كان الشحن المجاني قد ظهر بالفعل في هذه الجلسة
  const hasShownFreeShipping = () => {
    const shownAt = localStorage.getItem(FREE_SHIPPING_SHOWN_KEY);
    if (!shownAt) return false;
    
    // تحقق إذا كان المبلغ المحفوظ هو نفس المبلغ الحالي أو أكثر
    const savedTotal = parseFloat(shownAt);
    return cart.total <= savedTotal;
  };

  // حفظ أن الشحن المجاني قد ظهر
  const markFreeShippingShown = () => {
    localStorage.setItem(FREE_SHIPPING_SHOWN_KEY, cart.total.toString());
  };

  // مسح العلامة عند النزول تحت الحد
  const clearFreeShippingShown = () => {
    localStorage.removeItem(FREE_SHIPPING_SHOWN_KEY);
  };

  // إظهار شريط التقدم عند وجود منتجات ولم يصل للشحن المجاني
  useEffect(() => {
    const currentTotal = cart.total || 0;
    
    // إذا السلة فارغة، أخفِ الشريط
    if (currentTotal === 0) {
      setShowBanner(false);
      setShowCelebration(false);
      setDismissed(false);
      clearFreeShippingShown();
      prevQualifiedRef.current = false;
      prevTotalRef.current = 0;
      return;
    }

    // إذا وصل للشحن المجاني
    if (analysis.qualifiesForFree) {
      // تحقق إذا كان هذا وصول جديد (لم يكن مؤهلاً من قبل أو زاد المبلغ)
      const isNewQualification = !prevQualifiedRef.current || currentTotal > prevTotalRef.current;
      const alreadyShown = hasShownFreeShipping();
      
      if (isNewQualification && !alreadyShown && !dismissed) {
        // أظهر رسالة الاحتفال
        setShowCelebration(true);
        setShowBanner(true);
        markFreeShippingShown();
        
        // أخفِ بعد 4 ثواني
        setTimeout(() => {
          setShowCelebration(false);
          setShowBanner(false);
        }, 4000);
      } else {
        // لا تظهر الشريط (سبق وظهر)
        setShowBanner(false);
        setShowCelebration(false);
      }
      
      prevQualifiedRef.current = true;
    } else {
      // لم يصل للشحن المجاني بعد
      // إذا نزل تحت الحد، امسح العلامة
      if (prevQualifiedRef.current) {
        clearFreeShippingShown();
      }
      
      // أظهر شريط التقدم
      if (!dismissed) {
        setShowBanner(true);
      }
      setShowCelebration(false);
      prevQualifiedRef.current = false;
    }
    
    prevTotalRef.current = currentTotal;
  }, [cart.total, analysis.qualifiesForFree, dismissed]);

  // إعادة تعيين عند إفراغ السلة
  useEffect(() => {
    if (!cart.items || cart.items.length === 0) {
      setShowBanner(false);
      setDismissed(false);
      setShowCelebration(false);
      clearFreeShippingShown();
      prevQualifiedRef.current = false;
      prevTotalRef.current = 0;
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
  if (dismissed || !showBanner || !analysis.hasItems) return null;

  // شريط النجاح (الشحن المجاني) - يظهر فقط لحظة الوصول
  if (showCelebration && analysis.qualifiesForFree) {
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

  // لا تظهر شريط التقدم إذا وصل للشحن المجاني
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
