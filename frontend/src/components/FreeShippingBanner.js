import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Truck, X, AlertCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const FREE_SHIPPING_THRESHOLD = 150000;

// الصفحات التي يظهر فيها الشريط (صفحات التسوق فقط)
const ALLOWED_PATHS = ['/', '/products', '/cart', '/checkout'];

const isAllowedPath = (pathname) => {
  if (pathname === '/') return true;
  if (ALLOWED_PATHS.includes(pathname)) return true;
  if (pathname.startsWith('/products/')) return true;
  return false;
};

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price);
};

const FreeShippingBanner = () => {
  const { cart } = useCart();
  const { user } = useAuth();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);

  // التحقق من المسار الحالي
  const shouldShowOnCurrentPage = isAllowedPath(location.pathname);

  // تحليل السلة
  const analyzeCart = () => {
    if (!cart.items || cart.items.length === 0) {
      return { show: false };
    }

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

    // تحذير: أكثر من متجر
    if (sellerCount > 1) {
      return {
        show: true,
        type: 'warning',
        icon: AlertCircle,
        message: 'الشحن المجاني متاح فقط عند الشراء من متجر واحد',
        progress: 0,
        showProgress: false
      };
    }

    // مؤهل للشحن المجاني - لا تظهر شيء
    if (isSingleSeller && cartTotal >= FREE_SHIPPING_THRESHOLD) {
      return { show: false };
    }

    // شريط التقدم - كم متبقي
    if (isSingleSeller && remaining > 0) {
      return {
        show: true,
        type: 'info',
        icon: Truck,
        message: `أضف ${formatPrice(remaining)} ل.س للتوصيل المجاني`,
        progress: progress,
        showProgress: true
      };
    }

    return { show: false };
  };

  const analysis = analyzeCart();

  // إعادة تعيين الإغلاق عند تغيير السلة
  useEffect(() => {
    setDismissed(false);
  }, [cart.items?.length]);

  // لا تظهر إذا لم يسجل دخول أو تم الإغلاق أو الصفحة غير مسموحة أو لا يوجد ما يُعرض
  if (!user || dismissed || !shouldShowOnCurrentPage || !analysis.show) {
    return null;
  }

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
          <button 
            onClick={() => setDismissed(true)}
            className="p-0.5 sm:p-1 hover:bg-white/20 rounded-full transition-colors flex-shrink-0"
            aria-label="إغلاق"
          >
            <X size={12} className="sm:w-[14px] sm:h-[14px]" />
          </button>
        </div>
        
        {/* شريط التقدم */}
        {analysis.showProgress && (
          <div className="mt-1 sm:mt-1.5 h-1 bg-white/30 rounded-full overflow-hidden">
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
