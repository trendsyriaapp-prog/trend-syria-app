import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Truck, X, AlertCircle, PartyPopper, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const FREE_SHIPPING_THRESHOLD = 150000;
const STORAGE_KEY = 'freeShippingShownForSeller';
const ITEM_COUNT_KEY = 'freeShippingItemCount';

// الصفحات المسموحة
const ALLOWED_PATHS = ['/', '/products', '/cart', '/checkout'];
const isAllowedPath = (pathname) => {
  if (pathname === '/') return true;
  if (ALLOWED_PATHS.includes(pathname)) return true;
  if (pathname.startsWith('/products/')) return true;
  return false;
};

const formatPrice = (price) => new Intl.NumberFormat('ar-SY').format(price);

// أنماط الرسوم المتحركة
const animationStyles = `
  @keyframes slideDown {
    from { transform: translateY(-100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  @keyframes slideUp {
    from { transform: translateY(0); opacity: 1; }
    to { transform: translateY(-100%); opacity: 0; }
  }
  @keyframes celebratePulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.02); }
  }
  @keyframes sparkle {
    0%, 100% { opacity: 1; transform: scale(1) rotate(0deg); }
    50% { opacity: 0.7; transform: scale(1.2) rotate(180deg); }
  }
  .banner-enter { animation: slideDown 0.4s ease-out forwards; }
  .banner-exit { animation: slideUp 0.3s ease-in forwards; }
  .banner-celebrate { animation: slideDown 0.5s ease-out forwards, celebratePulse 0.6s ease-in-out 0.5s 2; }
  .sparkle-icon { animation: sparkle 1s ease-in-out infinite; }
`;

const FreeShippingBanner = () => {
  const { cart } = useCart();
  const { user } = useAuth();
  const location = useLocation();
  
  const [dismissed, setDismissed] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  
  const timerRef = useRef(null);

  const shouldShowOnCurrentPage = isAllowedPath(location.pathname);

  // حساب عدد المنتجات الفعلي (مجموع الكميات)
  const getItemCount = useCallback(() => {
    if (!cart.items || cart.items.length === 0) return 0;
    return cart.items.reduce((sum, item) => sum + (item.quantity || 1), 0);
  }, [cart.items]);

  // الحصول على معرف البائع
  const getSellerId = useCallback(() => {
    if (!cart.items || cart.items.length === 0) return null;
    const sellerIds = new Set();
    cart.items.forEach(item => {
      if (item.product?.seller_id) sellerIds.add(item.product.seller_id);
    });
    return sellerIds.size === 1 ? Array.from(sellerIds)[0] : null;
  }, [cart.items]);

  // تحليل السلة
  const analyzeCart = useCallback(() => {
    if (!cart.items || cart.items.length === 0) {
      return { show: false, isSuccess: false, sellerId: null, total: 0 };
    }

    const sellerIds = new Set();
    cart.items.forEach(item => {
      if (item.product?.seller_id) sellerIds.add(item.product.seller_id);
    });

    const sellerCount = sellerIds.size;
    const sellerId = sellerCount === 1 ? Array.from(sellerIds)[0] : null;
    const cartTotal = cart.total || 0;
    const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal);
    const progress = Math.min(100, (cartTotal / FREE_SHIPPING_THRESHOLD) * 100);

    if (sellerCount > 1) {
      return {
        show: true, type: 'warning', icon: AlertCircle,
        message: 'الشحن المجاني متاح فقط عند الشراء من متجر واحد',
        showProgress: false, isSuccess: false, sellerId: null, total: cartTotal
      };
    }

    if (sellerId && cartTotal >= FREE_SHIPPING_THRESHOLD) {
      return {
        show: false, type: 'success', isSuccess: true, 
        sellerId, total: cartTotal, showProgress: false
      };
    }

    if (sellerId && remaining > 0) {
      return {
        show: true, type: 'info', icon: Truck,
        message: `أضف ${formatPrice(remaining)} ل.س للتوصيل المجاني`,
        progress, showProgress: true, isSuccess: false, sellerId, total: cartTotal
      };
    }

    return { show: false, isSuccess: false, sellerId: null, total: 0 };
  }, [cart.items, cart.total]);

  const analysis = analyzeCart();
  const currentSellerId = getSellerId();
  const currentItemCount = getItemCount();

  // التحقق من localStorage
  const hasShownForSeller = (sellerId) => {
    if (!sellerId) return false;
    return localStorage.getItem(STORAGE_KEY) === sellerId;
  };

  const markShownForSeller = (sellerId) => {
    if (sellerId) localStorage.setItem(STORAGE_KEY, sellerId);
  };

  // الحصول على آخر عدد منتجات محفوظ
  const getStoredItemCount = () => {
    const saved = sessionStorage.getItem(ITEM_COUNT_KEY);
    return saved ? parseInt(saved, 10) : -1; // -1 يعني لم يتم التهيئة
  };

  // حفظ عدد المنتجات
  const saveItemCount = (count) => {
    sessionStorage.setItem(ITEM_COUNT_KEY, count.toString());
  };

  // منطق إظهار الشريط الأخضر
  useEffect(() => {
    const storedCount = getStoredItemCount();
    const currentTotal = cart.total || 0;
    
    // التهيئة الأولى - فقط احفظ العدد ولا تفعل شيء
    if (storedCount === -1) {
      saveItemCount(currentItemCount);
      // سجل البائع كـ "معروض" إذا كان مؤهل
      if (analysis.isSuccess && currentSellerId) {
        markShownForSeller(currentSellerId);
      }
      return;
    }

    // الشرط الأساسي: عدد المنتجات يجب أن يزيد (تمت إضافة منتج فعلياً)
    const itemsAdded = currentItemCount > storedCount;
    
    // شروط إظهار الشريط الأخضر:
    // 1. تمت إضافة منتج (العدد زاد)
    // 2. المجموع >= الحد
    // 3. بائع واحد
    // 4. لم يُعرض من قبل لهذا البائع
    const shouldShowSuccess = 
      itemsAdded && 
      currentTotal >= FREE_SHIPPING_THRESHOLD && 
      currentSellerId !== null && 
      !hasShownForSeller(currentSellerId);

    if (shouldShowSuccess) {
      setShowSuccessBanner(true);
      markShownForSeller(currentSellerId);
      
      timerRef.current = setTimeout(() => {
        setIsExiting(true);
        setTimeout(() => {
          setShowSuccessBanner(false);
          setIsExiting(false);
        }, 300);
      }, 3000);
    }

    // حفظ العدد الحالي
    saveItemCount(currentItemCount);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentItemCount, cart.total, currentSellerId, analysis.isSuccess]);

  // مسح عند إفراغ السلة
  useEffect(() => {
    if (!cart.items || cart.items.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(ITEM_COUNT_KEY);
    }
  }, [cart.items]);

  // إعادة تعيين dismissed عند تغيير السلة
  useEffect(() => {
    setDismissed(false);
  }, [cart.items?.length]);

  // الإغلاق
  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      setDismissed(true);
      setShowSuccessBanner(false);
      setIsExiting(false);
    }, 300);
  };

  // لا تظهر شيء في حالات معينة
  // لا تظهر للمدير أو البائع أو عامل التوصيل
  const isCustomer = user?.user_type === 'buyer' || user?.user_type === 'customer';
  if (!user || !isCustomer || !shouldShowOnCurrentPage || dismissed) return null;

  // إذا كان شريط النجاح يجب أن يظهر
  if (showSuccessBanner) {
    return (
      <>
        <style>{animationStyles}</style>
        <div className={`sticky top-0 z-50 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white shadow-lg ${isExiting ? 'banner-exit' : 'banner-celebrate'}`}>
          <div className="max-w-4xl mx-auto px-2 sm:px-3 py-1.5 sm:py-2.5">
            <div className="flex items-center justify-between gap-1 sm:gap-2">
              <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
                <Sparkles size={14} className="sparkle-icon text-yellow-200 hidden sm:block" />
                <PartyPopper size={16} className="flex-shrink-0 sm:w-5 sm:h-5" />
                <Sparkles size={14} className="sparkle-icon text-yellow-200 hidden sm:block" />
                <span className="text-[11px] sm:text-sm font-bold truncate">
                  مبروك! التوصيل مجاني داخل المحافظة
                </span>
              </div>
              <button onClick={handleDismiss} className="p-0.5 sm:p-1 hover:bg-white/20 rounded-full" aria-label="إغلاق">
                <X size={12} className="sm:w-[14px] sm:h-[14px]" />
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // لا تظهر شيء إذا لم يكن هناك ما يُعرض
  if (!analysis.show) return null;

  const bgColors = {
    info: 'bg-gradient-to-r from-[#FF6B00] to-[#FF8533]',
    warning: 'bg-gradient-to-r from-amber-500 to-amber-400'
  };

  const Icon = analysis.icon;

  return (
    <div className={`sticky top-0 z-50 ${bgColors[analysis.type]} text-white shadow-lg`}>
      <div className="max-w-4xl mx-auto px-2 sm:px-3 py-1.5 sm:py-2">
        <div className="flex items-center justify-between gap-1 sm:gap-2">
          <div className="flex items-center gap-1 sm:gap-2 flex-1 min-w-0">
            <Icon size={14} className="flex-shrink-0 sm:w-[18px] sm:h-[18px]" />
            <span className="text-[10px] sm:text-xs font-medium truncate">
              {analysis.message}
            </span>
          </div>
          <button onClick={() => setDismissed(true)} className="p-0.5 sm:p-1 hover:bg-white/20 rounded-full" aria-label="إغلاق">
            <X size={12} className="sm:w-[14px] sm:h-[14px]" />
          </button>
        </div>
        
        {analysis.showProgress && (
          <div className="mt-1 sm:mt-1.5 h-1 bg-white/30 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${analysis.progress}%` }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default FreeShippingBanner;
