// مكون بانر الشحن المجاني الموحد مع عداد تنازلي
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Truck, Sparkles } from 'lucide-react';

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
    : 'from-blue-500 to-indigo-600';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-r ${gradientClass} py-2 px-3 text-white`}
      data-testid="free-shipping-banner"
    >
      <div className="flex items-center gap-2 max-w-7xl mx-auto">
        <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
          <Truck size={14} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-xs">🎁 توصيل مجاني!</h3>
          <p className="text-white/90 text-[10px] truncate">
            {promo.message || 'توصيل مجاني لجميع الطلبات!'}
          </p>
        </div>
        {/* العداد التنازلي مدمج */}
        {timeLeft && (
          <div className="flex gap-1 flex-shrink-0">
            {timeLeft.days > 0 && (
              <div className="bg-white/20 rounded px-1.5 py-0.5 text-center">
                <div className="text-[10px] font-bold">{timeLeft.days}d</div>
              </div>
            )}
            <div className="bg-white/20 rounded px-1.5 py-0.5 text-center">
              <div className="text-[10px] font-bold">
                {timeLeft.hours.toString().padStart(2, '0')}:
                {timeLeft.minutes.toString().padStart(2, '0')}:
                {timeLeft.seconds.toString().padStart(2, '0')}
              </div>
            </div>
          </div>
        )}
        <Sparkles size={14} className="text-yellow-300 animate-pulse flex-shrink-0" />
      </div>
    </motion.div>
  );
};

export default FreeShippingBanner;
