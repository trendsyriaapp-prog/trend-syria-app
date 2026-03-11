// /app/frontend/src/components/DailyDeal.js
// مكون صفقة اليوم - عرض يومي محدود الوقت

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Flame, ChevronLeft, Percent, ShoppingCart, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

// حساب الوقت المتبقي
const calculateTimeLeft = (endTime) => {
  const difference = new Date(endTime) - new Date();
  
  if (difference <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, expired: true };
  }
  
  return {
    hours: Math.floor(difference / (1000 * 60 * 60)),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    expired: false
  };
};

// مكون العداد التنازلي
const CountdownTimer = ({ endTime }) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(endTime));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(endTime));
    }, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  if (timeLeft.expired) {
    return <span className="text-red-300">انتهى العرض</span>;
  }

  return (
    <div className="flex items-center gap-1 text-white">
      <Clock size={14} />
      <div className="flex gap-1 font-mono text-sm">
        <span className="bg-white/20 px-1.5 py-0.5 rounded">{String(timeLeft.hours).padStart(2, '0')}</span>
        <span>:</span>
        <span className="bg-white/20 px-1.5 py-0.5 rounded">{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span>:</span>
        <span className="bg-white/20 px-1.5 py-0.5 rounded">{String(timeLeft.seconds).padStart(2, '0')}</span>
      </div>
    </div>
  );
};

const DailyDeal = ({ onAddToCart }) => {
  const navigate = useNavigate();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchDeal();
  }, []);

  const fetchDeal = async () => {
    try {
      const response = await axios.get(`${API}/api/daily-deals/active`);
      setDeal(response.data.deal);
    } catch (error) {
      console.error('Error fetching daily deal:', error);
    } finally {
      setLoading(false);
    }
  };

  // تبديل المنتجات تلقائياً
  useEffect(() => {
    if (!deal) return;
    const items = [...(deal.products || []), ...(deal.food_items || [])];
    if (items.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [deal]);

  if (loading) {
    return (
      <div className="mx-4 h-40 bg-gradient-to-r from-orange-400 to-red-500 rounded-2xl animate-pulse" />
    );
  }

  if (!deal) {
    return null; // لا يوجد صفقة نشطة
  }

  const allItems = [...(deal.products || []), ...(deal.food_items || [])];
  const currentItem = allItems[currentIndex];
  const bgColor = deal.background_color || '#FF6B00';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-4"
    >
      <div
        className="relative rounded-2xl overflow-hidden shadow-lg"
        style={{ background: `linear-gradient(135deg, ${bgColor}, ${bgColor}dd)` }}
      >
        {/* خلفية متحركة */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white rounded-full blur-3xl animate-pulse" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        {/* المحتوى */}
        <div className="relative p-4">
          {/* العنوان والعداد */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1.5 rounded-lg">
                <Flame size={18} className="text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">{deal.title}</h3>
                <p className="text-white/70 text-xs">{deal.description}</p>
              </div>
            </div>
            <CountdownTimer endTime={deal.end_time} />
          </div>

          {/* عرض المنتج الحالي */}
          {currentItem && (
            <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3 backdrop-blur-sm">
              <div className="relative">
                <img
                  src={currentItem.images?.[0] || currentItem.image || 'https://via.placeholder.com/80'}
                  alt={currentItem.name}
                  className="w-20 h-20 object-cover rounded-xl bg-white"
                />
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  -{deal.discount_percentage}%
                </div>
              </div>

              <div className="flex-1">
                <h4 className="text-white font-bold text-sm line-clamp-1">{currentItem.name}</h4>
                {currentItem.city && (
                  <div className="flex items-center gap-1 text-white/70 mt-0.5">
                    <MapPin size={10} />
                    <span className="text-[10px]">{currentItem.city}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-white/60 text-xs line-through">
                    {formatPrice(currentItem.original_price)}
                  </span>
                  <span className="text-yellow-300 font-bold">
                    {formatPrice(currentItem.deal_price)}
                  </span>
                </div>
                
                {/* أزرار */}
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => {
                      if (currentItem.images) {
                        navigate(`/product/${currentItem.id}`);
                      } else {
                        // Food item - navigate to store
                      }
                    }}
                    className="flex-1 bg-white text-gray-800 text-xs font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1"
                    data-testid="daily-deal-view"
                  >
                    عرض
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => onAddToCart && onAddToCart(currentItem)}
                    className="bg-yellow-400 text-gray-800 p-2 rounded-lg"
                    data-testid="daily-deal-add-cart"
                  >
                    <ShoppingCart size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* نقاط التنقل */}
          {allItems.length > 1 && (
            <div className="flex justify-center gap-1.5 mt-3">
              {allItems.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    idx === currentIndex ? 'bg-white w-4' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* شريط التقدم */}
        <div className="h-1 bg-white/20">
          <motion.div
            key={currentIndex}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 4, ease: 'linear' }}
            className="h-full bg-white/60"
          />
        </div>
      </div>
    </motion.div>
  );
};

export default DailyDeal;
