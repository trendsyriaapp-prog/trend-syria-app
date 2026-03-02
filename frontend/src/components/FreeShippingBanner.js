import { useState, useEffect, useRef } from 'react';
import { Truck, X, AlertCircle, PartyPopper } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const FREE_SHIPPING_THRESHOLD = 150000;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price);
};

const FreeShippingBanner = () => {
  const { cart } = useCart();
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [hideSuccess, setHideSuccess] = useState(true); // يبدأ مخفي للشريط الأخضر
  const prevSellerCountRef = useRef(1);
  const timerRef = useRef(null);
  const hasShownSuccessRef = useRef(false);

  // تحليل السلة
  const analyzeCart = () => {
    if (!cart.items || cart.items.length === 0) {
      return { show: false, sellerCount: 0 };
    }

    // جمع معرفات البائعين
    const sellerIds = new Set();
    cart.items.forEach(item => {
      if (item.product?.seller_id) {
        sellerIds.add(item.product.seller_id);
      }
    });

    const isSingleSeller = sellerIds.size === 1;
    const sellerCount = sellerIds.size;
    const cartTotal = cart.total || 0;
    const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - cartTotal);
    const progress = Math.min(100, (cartTotal / FREE_SHIPPING_THRESHOLD) * 100);

    // تحديد الرسالة المناسبة
    if (sellerCount > 1) {
      return {
        show: true,
        type: 'warning',
        icon: AlertCircle,
        message: 'الشحن المجاني متاح فقط عند الشراء من متجر واحد',
        progress: 0,
        showProgress: false,
        sellerCount
      };
    }

    if (isSingleSeller && cartTotal >= FREE_SHIPPING_THRESHOLD) {
      // لا نظهر شريط النجاح - فقط نخفيه
      return {
        show: false, // لا يظهر الشريط الأخضر
        type: 'success',
        icon: PartyPopper,
        message: 'مبروك! التوصيل مجاني داخل المحافظة',
        progress: 100,
        showProgress: false,
        isSuccess: true,
        sellerCount
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
        sellerCount
      };
    }

    return { show: false, sellerCount: 0 };
  };

  const analysis = analyzeCart();

  // إدارة إخفاء الشريط الأخضر (النجاح) - يظهر فقط عند الانتقال للمجاني
  useEffect(() => {
    // إذا كان الشحن مجاني ولم يُعرض من قبل في هذه الجلسة
    if (analysis.isSuccess && !hasShownSuccessRef.current) {
      hasShownSuccessRef.current = true;
      setHideSuccess(false); // أظهر الشريط
      timerRef.current = setTimeout(() => {
        setHideSuccess(true); // أخفه بعد 2 ثانية
      }, 2000);
    }
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [analysis.isSuccess]);

  // إذا تغير عدد البائعين (أضاف من متجر آخر) - أظهر الشريط مجدداً
  useEffect(() => {
    const currentSellerCount = analysis.sellerCount || 0;
    
    // إذا أصبح هناك أكثر من متجر - أظهر التحذير
    if (currentSellerCount > 1 && prevSellerCountRef.current === 1) {
      setHideSuccess(false);
      setDismissed(false);
      hasShownSuccessRef.current = false;
    }
    
    // إذا عاد لمتجر واحد ولم يعد مؤهل للمجاني - أعد الإظهار
    if (currentSellerCount === 1 && !analysis.isSuccess) {
      setHideSuccess(false);
      hasShownSuccessRef.current = false;
    }
    
    prevSellerCountRef.current = currentSellerCount;
  }, [analysis.sellerCount, analysis.isSuccess]);

  // إعادة تعيين عند تغيير حالة السلة جذرياً
  useEffect(() => {
    if (!analysis.isSuccess) {
      setHideSuccess(false);
    }
  }, [cart.total, analysis.isSuccess]);

  // لا تظهر إذا:
  // - لم يسجل دخول
  // - السلة فارغة أو لا يوجد ما يُعرض
  // - تم الإغلاق يدوياً
  // - الشحن مجاني وتم إخفاؤه تلقائياً (إلا إذا أضاف من متجر آخر)
  if (!user || !analysis.show || dismissed) {
    return null;
  }
  
  // إخفاء الشريط الأخضر بعد الوقت المحدد
  if (analysis.isSuccess && hideSuccess) {
    return null;
  }

  const bgColors = {
    info: 'bg-gradient-to-r from-[#FF6B00] to-[#FF8533]',
    warning: 'bg-gradient-to-r from-amber-500 to-amber-400',
    success: 'bg-gradient-to-r from-green-500 to-green-400'
  };

  const Icon = analysis.icon;

  return (
    <div className={`sticky top-0 z-50 ${bgColors[analysis.type]} text-white shadow-lg transition-all duration-300`}>
      <div className="max-w-4xl mx-auto px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Icon size={18} className="flex-shrink-0" />
            <span className="text-xs font-medium truncate">{analysis.message}</span>
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
        {analysis.showProgress && (
          <div className="mt-1.5 h-1 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${analysis.progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default FreeShippingBanner;
