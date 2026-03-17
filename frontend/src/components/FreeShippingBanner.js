// مكون بانر الشحن المجاني الموحد مع عداد تنازلي
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Truck, Sparkles, Clock } from 'lucide-react';

/**
 * FreeShippingBanner - بانر الشحن المجاني مع عداد تنازلي
 * @param {Object} promo - بيانات العرض الترويجي
 * @param {string} promo.message - رسالة العرض
 * @param {string} promo.end_date - تاريخ انتهاء العرض (ISO string)
 * @param {string} variant - نوع البانر: 'food' (أخضر) أو 'products' (أزرق)
 */
const FreeShippingBanner = ({ promo, variant = 'products' }) => {
  const [timeLeft, setTimeLeft] = useState(null);
  
  useEffect(() => {
    if (!promo?.end_date) {
      setTimeLeft(null);
      return;
    }
    
    const calculateTimeLeft = () => {
      const endDate = new Date(promo.end_date);
      const now = new Date();
      const diff = endDate - now;
      
      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft({ days, hours, minutes, seconds });
    };
    
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    
    return () => clearInterval(timer);
  }, [promo?.end_date]);

  if (!promo) return null;

  // تحديد الألوان حسب النوع
  const gradientClass = variant === 'food' 
    ? 'from-green-500 to-emerald-600' 
    : 'from-amber-400 to-orange-500';
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`bg-gradient-to-r ${gradientClass} py-1.5 text-white`}
      data-testid="free-shipping-banner"
    >
      <div className="flex items-center justify-center gap-2 max-w-7xl mx-auto px-3">
        <Truck size={14} />
        <span className="text-xs font-medium">{promo.message || 'توصيل مجاني لجميع الطلبات!'}</span>
        
        {timeLeft && (
          <div className="flex items-center gap-1 bg-black/20 rounded-full px-2 py-0.5">
            <Clock size={10} />
            <span className="text-[10px] font-bold">
              {timeLeft.days > 0 && `${timeLeft.days}d `}
              {timeLeft.hours.toString().padStart(2, '0')}:
              {timeLeft.minutes.toString().padStart(2, '0')}:
              {timeLeft.seconds.toString().padStart(2, '0')}
            </span>
          </div>
        )}
        
        <Sparkles size={12} className="text-yellow-300" />
      </div>
    </motion.div>
  );
};

export default FreeShippingBanner;
