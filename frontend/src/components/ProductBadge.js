// /app/frontend/src/components/ProductBadge.js
// شارة المنتج المتغيرة الألوان

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ProductBadge = ({ 
  product, 
  badgeSettings,
  className = "" 
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeBadge, setActiveBadge] = useState(null);

  // تحديد نوع الشارة المناسب للمنتج
  useEffect(() => {
    if (!badgeSettings?.enabled || !badgeSettings?.badge_types) {
      setActiveBadge(null);
      return;
    }

    const { badge_types } = badgeSettings;
    
    // أولوية الشارات: الأكثر مبيعاً > الأكثر زيارة > شحن مجاني
    if (badge_types.best_seller?.enabled && product.sales_count >= (badge_types.best_seller.min_sales || 10)) {
      setActiveBadge({
        type: 'best_seller',
        messages: badge_types.best_seller.messages || ['🔥 الأكثر مبيعاً']
      });
    } else if (badge_types.most_viewed?.enabled && product.views >= (badge_types.most_viewed.min_views || 100)) {
      setActiveBadge({
        type: 'most_viewed',
        messages: badge_types.most_viewed.messages || ['👁️ الأكثر زيارة']
      });
    } else if (badge_types.free_shipping?.enabled) {
      const threshold = badge_types.free_shipping.threshold || 50000;
      const price = product.price || 0;
      
      if (price >= threshold) {
        setActiveBadge({
          type: 'free_shipping',
          messages: badge_types.free_shipping.messages || ['🚚 شحن مجاني']
        });
      } else {
        const unitsNeeded = Math.ceil(threshold / price);
        if (unitsNeeded >= 2 && unitsNeeded <= 3) {
          setActiveBadge({
            type: 'free_shipping_qty',
            messages: [
              `🛒 اشترِ ${unitsNeeded} = شحن مجاني`,
              `📦 ${unitsNeeded} قطع = توصيل مجاني`,
              `✨ وفّر التوصيل بـ ${unitsNeeded} قطع`
            ]
          });
        } else {
          setActiveBadge(null);
        }
      }
    } else {
      setActiveBadge(null);
    }
  }, [product, badgeSettings]);

  // دوران الرسائل
  useEffect(() => {
    if (!activeBadge || activeBadge.messages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeBadge.messages.length);
    }, badgeSettings?.rotation_speed || 3000);

    return () => clearInterval(interval);
  }, [activeBadge, badgeSettings?.rotation_speed]);

  // إذا لم تكن هناك شارة، لا نعرض شيء
  if (!activeBadge) return null;

  // الألوان المتغيرة
  const colors = badgeSettings?.colors || ['#3B82F6', '#10B981', '#8B5CF6', '#991B1B'];
  const bgColors = [
    'from-blue-500 via-blue-600 to-blue-500',
    'from-emerald-500 via-emerald-600 to-emerald-500',
    'from-violet-500 via-violet-600 to-violet-500',
    'from-rose-800 via-rose-900 to-rose-800'
  ];

  return (
    <div className={`absolute top-2 right-2 z-10 ${className}`}>
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, y: -10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          className={`bg-gradient-to-r ${bgColors[currentIndex % bgColors.length]} text-white text-[9px] md:text-[10px] font-bold px-2 py-1 rounded-full shadow-lg`}
        >
          {activeBadge.messages[currentIndex]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ProductBadge;
