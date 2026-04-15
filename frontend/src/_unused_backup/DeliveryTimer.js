// /app/frontend/src/components/delivery/DeliveryTimer.js
// عداد وقت التوصيل للسائق

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle, CheckCircle, Timer } from 'lucide-react';

const DeliveryTimer = ({ 
  orderId,
  deadline, // ISO string
  theme = 'dark',
  onTimeUp,
  compact = false
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isLate, setIsLate] = useState(false);
  const [warning, setWarning] = useState(false);
  
  const isDark = theme === 'dark';

  // حساب الوقت المتبقي
  const calculateRemaining = useCallback(() => {
    if (!deadline) return 0;
    
    const deadlineDate = new Date(deadline);
    const now = new Date();
    const diff = Math.floor((deadlineDate - now) / 1000);
    
    return diff;
  }, [deadline]);

  useEffect(() => {
    if (!deadline) return;

    // تحديث فوري
    const remaining = calculateRemaining();
    setRemainingSeconds(remaining);
    setIsLate(remaining < 0);
    setWarning(remaining > 0 && remaining <= 180); // تحذير في آخر 3 دقائق

    // تحديث كل ثانية
    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setRemainingSeconds(remaining);
      setIsLate(remaining < 0);
      setWarning(remaining > 0 && remaining <= 180);
      
      if (remaining <= 0 && onTimeUp) {
        onTimeUp();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [deadline, calculateRemaining, onTimeUp]);

  // تحويل الثواني لدقائق وثواني
  const formatTime = (seconds) => {
    const absSeconds = Math.abs(seconds);
    const mins = Math.floor(absSeconds / 60);
    const secs = absSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // حساب نسبة التقدم
  const getProgressPercentage = () => {
    if (isLate) return 100;
    // نفترض أن الوقت الإجمالي 30 دقيقة كمثال
    const totalSeconds = 30 * 60;
    const elapsed = totalSeconds - remainingSeconds;
    return Math.min(100, Math.max(0, (elapsed / totalSeconds) * 100));
  };

  // ألوان حسب الحالة
  const getColors = () => {
    if (isLate) {
      return {
        bg: isDark ? 'bg-red-500/20' : 'bg-red-100',
        border: isDark ? 'border-red-500/50' : 'border-red-300',
        text: isDark ? 'text-red-400' : 'text-red-600',
        progress: 'bg-red-500'
      };
    }
    if (warning) {
      return {
        bg: isDark ? 'bg-amber-500/20' : 'bg-amber-100',
        border: isDark ? 'border-amber-500/50' : 'border-amber-300',
        text: isDark ? 'text-amber-400' : 'text-amber-600',
        progress: 'bg-amber-500'
      };
    }
    return {
      bg: isDark ? 'bg-green-500/20' : 'bg-green-100',
      border: isDark ? 'border-green-500/50' : 'border-green-300',
      text: isDark ? 'text-green-400' : 'text-green-600',
      progress: 'bg-green-500'
    };
  };

  const colors = getColors();

  if (!deadline) return null;

  // الشكل المضغوط
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${colors.bg} ${colors.text}`}>
        {isLate ? <AlertTriangle size={12} /> : <Timer size={12} />}
        <span className="text-xs font-bold">
          {isLate ? `-${formatTime(remainingSeconds)}` : formatTime(remainingSeconds)}
        </span>
      </div>
    );
  }

  // الشكل الكامل
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border-2 ${colors.bg} ${colors.border} overflow-hidden`}
    >
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isLate ? (
              <AlertTriangle size={18} className={colors.text} />
            ) : warning ? (
              <Clock size={18} className={`${colors.text} animate-pulse`} />
            ) : (
              <Timer size={18} className={colors.text} />
            )}
            <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
              {isLate ? 'تأخر التوصيل!' : warning ? 'الوقت ينفد!' : 'وقت التوصيل'}
            </span>
          </div>
          <span className={`text-lg font-bold ${colors.text}`}>
            {isLate ? `-${formatTime(remainingSeconds)}` : formatTime(remainingSeconds)}
          </span>
        </div>
        
        {/* شريط التقدم */}
        <div className={`h-2 rounded-full ${isDark ? 'bg-[#333]' : 'bg-gray-200'} overflow-hidden`}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${getProgressPercentage()}%` }}
            transition={{ duration: 0.5 }}
            className={`h-full rounded-full ${colors.progress}`}
          />
        </div>
        
        {/* رسالة الحالة */}
        <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {isLate 
            ? 'يرجى الإسراع في التوصيل لتجنب الخصم'
            : warning
              ? 'تبقى أقل من 3 دقائق!'
              : 'وصّل في الوقت للحصول على تقييم ممتاز'}
        </p>
      </div>
    </motion.div>
  );
};

export default DeliveryTimer;
