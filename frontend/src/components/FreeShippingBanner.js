import { useState, useEffect, useRef } from 'react';
import { Truck, X, AlertCircle, PartyPopper } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const FREE_SHIPPING_THRESHOLD = 150000;
const STORAGE_KEY = 'freeShippingShownFor';

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price);
};

const FreeShippingBanner = () => {
  const { cart } = useCart();
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);
  const timerRef = useRef(null);
  const lastCartStateRef = useRef({ isSuccess: false, sellerId: null });

  // الحصول على معرف البائع الحالي
  const getCurrentSellerId = () => {
    if (!cart.items || cart.items.length === 0) return null;
    const sellerIds = new Set();
    cart.items.forEach(item => {
      if (item.product?.seller_id) {
        sellerIds.add(item.product.seller_id);
      }
    });
    return sellerIds.size === 1 ? Array.from(sellerIds)[0] : null;
  };

  // التحقق مما إذا كان الشريط قد ظهر لهذا البائع
  const hasShownForSeller = (sellerId) => {
    if (!sellerId) return false;
    const shown = localStorage.getItem(STORAGE_KEY);
    return shown === sellerId;
  };

  // تسجيل أن الشريط ظهر لهذا البائع
  const markShownForSeller = (sellerId) => {
    if (sellerId) {
      localStorage.setItem(STORAGE_KEY, sellerId);
    }
  };

  // تحليل السلة
  const analyzeCart = () => {
    if (!cart.items || cart.items.length === 0) {
      return { show: false, sellerCount: 0, sellerId: null };
    }

    const sellerIds = new Set();
    cart.items.forEach(item => {
      if (item.product?.seller_id) {
        sellerIds.add(item.product.seller_id);
      }
    });

    const isSingleSeller = sellerIds.size === 1;
    const sellerCount = sellerIds.size;
    const sellerId = isSingleSeller ? Array.from(sellerIds)[0] : null;
    const cartTotal = cart.total || 0;
    const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal);
    const progress = Math.min(100, (cartTotal / FREE_SHIPPING_THRESHOLD) * 100);

    if (sellerCount > 1) {
      return {
        show: true,
        type: 'warning',
        icon: AlertCircle,
        message: 'الشحن المجاني متاح فقط عند الشراء من متجر واحد',
        progress: 0,
        showProgress: false,
        sellerCount,
        sellerId: null,
        isSuccess: false
      };
    }

    if (isSingleSeller && cartTotal >= FREE_SHIPPING_THRESHOLD) {
      return {
        show: false,
        type: 'success',
        icon: PartyPopper,
        message: 'مبروك! التوصيل مجاني داخل المحافظة',
        progress: 100,
        showProgress: false,
        isSuccess: true,
        sellerCount,
        sellerId
      };
    }

    if (isSingleSeller && remaining > 0) {
      return {
        show: true,
        type: 'info',
        icon: Truck,
        message: `أضف ${formatPrice(remaining)} ل.س من نفس المتجر للتوصيل المجاني`,
        progress: progress,
        showProgress: true,
        sellerCount,
        sellerId,
        isSuccess: false
      };
    }

    return { show: false, sellerCount: 0, sellerId: null, isSuccess: false };
  };

  const analysis = analyzeCart();

  // إدارة ظهور شريط النجاح
  useEffect(() => {
    const prevState = lastCartStateRef.current;
    const currentSellerId = analysis.sellerId;
    
    // الشرط: أصبح مؤهل للمجاني الآن، ولم يكن مؤهل سابقاً، ولم يُعرض الشريط لهذا البائع
    const justQualified = analysis.isSuccess && !prevState.isSuccess;
    const differentSeller = currentSellerId && currentSellerId !== prevState.sellerId;
    const notShownBefore = !hasShownForSeller(currentSellerId);
    
    if (justQualified && notShownBefore) {
      // أظهر الشريط
      setShowSuccessBanner(true);
      markShownForSeller(currentSellerId);
      
      // أخفه بعد 2 ثانية
      timerRef.current = setTimeout(() => {
        setShowSuccessBanner(false);
      }, 2000);
    }
    
    // إذا تغير البائع وليس مؤهل للمجاني - أعد تعيين الحالة
    if (differentSeller && !analysis.isSuccess) {
      setDismissed(false);
    }
    
    // حفظ الحالة الحالية
    lastCartStateRef.current = { 
      isSuccess: analysis.isSuccess, 
      sellerId: currentSellerId 
    };
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [analysis.isSuccess, analysis.sellerId]);

  // مسح التخزين عند إفراغ السلة
  useEffect(() => {
    if (!cart.items || cart.items.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
      lastCartStateRef.current = { isSuccess: false, sellerId: null };
    }
  }, [cart.items]);

  // لا تظهر إذا لم يسجل دخول أو تم الإغلاق
  if (!user || dismissed) {
    return null;
  }
  
  // تحديد ما يجب عرضه
  let displayType = analysis.type;
  let displayMessage = analysis.message;
  let displayIcon = analysis.icon;
  let displayProgress = analysis.progress;
  let displayShowProgress = analysis.showProgress;
  
  // إذا كان شريط النجاح يجب أن يظهر
  if (showSuccessBanner && analysis.isSuccess) {
    displayType = 'success';
    displayMessage = 'مبروك! التوصيل مجاني داخل المحافظة';
    displayIcon = PartyPopper;
    displayShowProgress = false;
  } else if (!analysis.show) {
    // لا يوجد ما يُعرض
    return null;
  }

  const bgColors = {
    info: 'bg-gradient-to-r from-[#FF6B00] to-[#FF8533]',
    warning: 'bg-gradient-to-r from-amber-500 to-amber-400',
    success: 'bg-gradient-to-r from-green-500 to-green-400'
  };

  const Icon = displayIcon;

  return (
    <div className={`sticky top-0 z-50 ${bgColors[displayType]} text-white shadow-lg transition-all duration-300`}>
      <div className="max-w-4xl mx-auto px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Icon size={18} className="flex-shrink-0" />
            <span className="text-xs font-medium truncate">{displayMessage}</span>
          </div>
          <button 
            onClick={() => setDismissed(true)}
            className="p-1 hover:bg-white/20 rounded-full transition-colors flex-shrink-0"
            aria-label="إغلاق"
          >
            <X size={14} />
          </button>
        </div>
        
        {/* شريط التقدم */}
        {displayShowProgress && (
          <div className="mt-1.5 h-1 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${displayProgress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default FreeShippingBanner;
