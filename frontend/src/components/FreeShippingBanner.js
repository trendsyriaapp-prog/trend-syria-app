import { useState, useEffect } from 'react';
import { Truck, X, AlertCircle, MapPin, PartyPopper } from 'lucide-react';
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
  const [showCelebration, setShowCelebration] = useState(false);

  // تحليل السلة
  const analyzeCart = () => {
    if (!cart.items || cart.items.length === 0) {
      return { show: false };
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
        showProgress: false
      };
    }

    if (isSingleSeller && cartTotal >= FREE_SHIPPING_THRESHOLD) {
      return {
        show: true,
        type: 'success',
        icon: PartyPopper,
        message: 'مبروك! التوصيل مجاني داخل المحافظة',
        progress: 100,
        showProgress: false,
        celebrate: true
      };
    }

    if (isSingleSeller && remaining > 0) {
      return {
        show: true,
        type: 'info',
        icon: Truck,
        message: `أضف ${formatPrice(remaining)} ل.س من نفس المتجر للتوصيل المجاني`,
        progress: progress,
        showProgress: true
      };
    }

    return { show: false };
  };

  const analysis = analyzeCart();

  // إظهار احتفال عند الوصول للحد الأدنى
  useEffect(() => {
    if (analysis.celebrate && !showCelebration) {
      setShowCelebration(true);
      // إخفاء بعد 5 ثواني
      const timer = setTimeout(() => {
        setDismissed(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [analysis.celebrate, showCelebration]);

  // إعادة إظهار الشريط عند تغيير السلة
  useEffect(() => {
    if (!analysis.celebrate) {
      setDismissed(false);
      setShowCelebration(false);
    }
  }, [cart.total, cart.items?.length]);

  // لا تظهر إذا لم يسجل دخول أو السلة فارغة أو تم الإغلاق
  if (!user || !analysis.show || dismissed) {
    return null;
  }

  const bgColors = {
    info: 'bg-gradient-to-r from-[#FF6B00] to-[#FF8533]',
    warning: 'bg-gradient-to-r from-amber-500 to-amber-400',
    success: 'bg-gradient-to-r from-green-500 to-green-400'
  };

  const Icon = analysis.icon;

  return (
    <div className={`sticky top-0 z-50 ${bgColors[analysis.type]} text-white shadow-lg`}>
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
