// مكون بانر الشحن المجاني الموحد مع عداد تنازلي
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Truck, Sparkles, Gift, Clock } from 'lucide-react';

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
    ? 'from-green-500 via-emerald-500 to-teal-500' 
    : 'from-amber-400 via-orange-500 to-red-500';
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-gradient-to-r ${gradientClass} py-3 text-white overflow-hidden`}
      data-testid="free-shipping-banner"
    >
      {/* خلفية مزخرفة */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-10 text-4xl">🚚</div>
        <div className="absolute bottom-0 left-20 text-3xl">📦</div>
        <div className="absolute top-1 left-1/3 text-2xl">✨</div>
      </div>
      
      <div className="relative flex items-center gap-3 px-4">
        {/* أيقونة متحركة */}
        <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
          <Truck size={20} className="animate-bounce" />
        </div>
        
        {/* المحتوى الرئيسي */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Gift size={14} className="text-yellow-300" />
            <h3 className="font-bold text-sm">توصيل مجاني!</h3>
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px] font-bold animate-pulse">
              عرض محدود
            </span>
          </div>
          <p className="text-white/90 text-xs">
            {promo.message || 'استمتع بتوصيل مجاني لجميع طلباتك! 🎉'}
          </p>
        </div>
        
        {/* العداد التنازلي */}
        {timeLeft && (
          <div className="flex items-center gap-1.5 flex-shrink-0 bg-black/20 rounded-xl px-3 py-1.5">
            <Clock size={14} className="text-yellow-300" />
            <div className="flex gap-1 text-xs font-bold">
              {timeLeft.days > 0 && (
                <span className="bg-white/20 rounded px-1.5 py-0.5">{timeLeft.days}d</span>
              )}
              <span className="bg-white/20 rounded px-1.5 py-0.5">
                {timeLeft.hours.toString().padStart(2, '0')}:
                {timeLeft.minutes.toString().padStart(2, '0')}:
                {timeLeft.seconds.toString().padStart(2, '0')}
              </span>
            </div>
          </div>
        )}
        
        <Sparkles size={18} className="text-yellow-300 animate-pulse flex-shrink-0" />
      </div>
    </motion.div>
  );
};

export default FreeShippingBanner;
