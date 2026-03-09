import { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Bike, Clock, Percent, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const FoodDeliveryBanner = () => {
  const location = useLocation();
  const [dismissed, setDismissed] = useState(false);
  const [flashSale, setFlashSale] = useState(null);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0 });

  // إظهار الشريط فقط في صفحات الطعام
  const isFoodPage = location.pathname.startsWith('/food');

  useEffect(() => {
    if (isFoodPage) {
      fetchFlashSale();
    }
  }, [isFoodPage]);

  useEffect(() => {
    if (!flashSale?.end_time) return;

    const calculateTimeLeft = () => {
      const endTime = new Date(flashSale.end_time).getTime();
      const now = new Date().getTime();
      const difference = endTime - now;

      if (difference <= 0) {
        setFlashSale(null);
        return;
      }

      setTimeLeft({
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60)
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(timer);
  }, [flashSale]);

  const fetchFlashSale = async () => {
    try {
      const res = await axios.get(`${API}/api/food/flash-sales`);
      if (res.data && res.data.length > 0) {
        setFlashSale(res.data[0]);
      }
    } catch (error) {
      console.error('Error fetching flash sale:', error);
    }
  };

  if (!isFoodPage || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-gradient-to-r from-green-600 to-green-500 text-white"
      >
        <div className="max-w-7xl mx-auto px-3 py-1.5">
          <div className="flex items-center justify-between gap-2">
            <Link 
              to="/food" 
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              {/* أيقونة التوصيل */}
              <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-2 py-0.5">
                <Bike size={14} />
                <span className="text-xs font-medium">توصيل سريع</span>
              </div>

              {/* عرض الفلاش إذا وجد */}
              {flashSale && (
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="animate-pulse">⚡</span>
                  <span className="font-bold">{flashSale.discount_percentage}% خصم</span>
                  <span className="text-white/80">•</span>
                  <div className="flex items-center gap-1 bg-white/20 rounded px-1.5 py-0.5">
                    <Clock size={10} />
                    <span>{String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}</span>
                  </div>
                </div>
              )}

              {/* رسالة افتراضية إذا لا يوجد عرض */}
              {!flashSale && (
                <span className="text-xs text-white/90">اطلب الآن من أفضل المطاعم</span>
              )}
            </Link>

            {/* زر الإغلاق */}
            <button
              onClick={() => setDismissed(true)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FoodDeliveryBanner;
