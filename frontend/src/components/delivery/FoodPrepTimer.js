// /app/frontend/src/components/delivery/FoodPrepTimer.js
// مؤقت وقت تحضير الطعام للسائق - مع إشعار صوتي عندما يقترب الوقت

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Clock, ChefHat, AlertTriangle, Bell, BellRing } from 'lucide-react';

const FoodPrepTimer = ({ 
  order,
  theme = 'dark',
  onAlmostReady // callback عندما يقترب الطلب من الجهوزية
}) => {
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [hasPlayedWarning, setHasPlayedWarning] = useState(false);
  const audioRef = useRef(null);
  const isDark = theme === 'dark';
  
  // التحقق من وجود بيانات وقت التحضير
  const expectedReadyAt = order?.expected_ready_at;
  const preparationStartedAt = order?.preparation_started_at;
  const preparationTimeMinutes = order?.preparation_time_minutes;
  const orderStatus = order?.status;
  
  // لا نعرض المؤقت إلا إذا كان الطلب في حالة "preparing"
  const shouldShowTimer = orderStatus === 'preparing' && expectedReadyAt;

  // حساب الوقت المتبقي
  const calculateRemaining = useCallback(() => {
    if (!expectedReadyAt) return null;
    
    const readyDate = new Date(expectedReadyAt);
    const now = new Date();
    const diff = Math.floor((readyDate - now) / 1000);
    
    return diff;
  }, [expectedReadyAt]);

  // تشغيل صوت التنبيه
  const playWarningSound = useCallback(() => {
    if (hasPlayedWarning) return;
    
    try {
      // إنشاء صوت تنبيه بسيط
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // صوت مزدوج (بيب بيب)
      const playBeep = (startTime) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 880; // A5 - صوت حاد
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.3);
      };
      
      // تشغيل 3 صفارات
      playBeep(audioContext.currentTime);
      playBeep(audioContext.currentTime + 0.4);
      playBeep(audioContext.currentTime + 0.8);
      
      setHasPlayedWarning(true);
      
      // إرسال callback
      if (onAlmostReady) {
        onAlmostReady(order);
      }
    } catch (err) {
      console.log('Audio warning not supported:', err);
    }
  }, [hasPlayedWarning, onAlmostReady, order]);

  useEffect(() => {
    if (!shouldShowTimer) return;

    // تحديث فوري
    const remaining = calculateRemaining();
    setRemainingSeconds(remaining);

    // تحديث كل ثانية
    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setRemainingSeconds(remaining);
      
      // إذا تبقى 3 دقائق أو أقل، نشغل التنبيه
      if (remaining !== null && remaining <= 180 && remaining > 0 && !hasPlayedWarning) {
        playWarningSound();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [shouldShowTimer, calculateRemaining, hasPlayedWarning, playWarningSound]);

  // إعادة تعيين التنبيه عند تغيير الطلب
  useEffect(() => {
    setHasPlayedWarning(false);
  }, [order?.id]);

  // تحويل الثواني لدقائق وثواني
  const formatTime = (seconds) => {
    if (seconds === null) return '--:--';
    const absSeconds = Math.abs(seconds);
    const mins = Math.floor(absSeconds / 60);
    const secs = absSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // حالة المؤقت
  const getTimerState = () => {
    if (remainingSeconds === null) return 'loading';
    if (remainingSeconds <= 0) return 'ready';
    if (remainingSeconds <= 180) return 'warning'; // آخر 3 دقائق
    return 'normal';
  };

  const timerState = getTimerState();

  // ألوان حسب الحالة
  const getColors = () => {
    switch (timerState) {
      case 'ready':
        return {
          bg: isDark ? 'bg-green-500/20' : 'bg-green-100',
          border: isDark ? 'border-green-500/50' : 'border-green-300',
          text: isDark ? 'text-green-400' : 'text-green-600',
          icon: isDark ? 'text-green-400' : 'text-green-600'
        };
      case 'warning':
        return {
          bg: isDark ? 'bg-amber-500/20' : 'bg-amber-100',
          border: isDark ? 'border-amber-500/50' : 'border-amber-300',
          text: isDark ? 'text-amber-400' : 'text-amber-600',
          icon: isDark ? 'text-amber-400' : 'text-amber-600'
        };
      default:
        return {
          bg: isDark ? 'bg-blue-500/20' : 'bg-blue-100',
          border: isDark ? 'border-blue-500/50' : 'border-blue-300',
          text: isDark ? 'text-blue-400' : 'text-blue-600',
          icon: isDark ? 'text-blue-400' : 'text-blue-600'
        };
    }
  };

  const colors = getColors();

  if (!shouldShowTimer) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-xl border-2 ${colors.bg} ${colors.border} p-3`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {timerState === 'ready' ? (
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <BellRing size={18} className={colors.icon} />
            </motion.div>
          ) : timerState === 'warning' ? (
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <Bell size={18} className={colors.icon} />
            </motion.div>
          ) : (
            <ChefHat size={18} className={colors.icon} />
          )}
          <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
            {timerState === 'ready' 
              ? '🍽️ الطلب جاهز!' 
              : timerState === 'warning'
                ? '⏰ اقترب الوقت!'
                : '🍳 جاري التحضير'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Clock size={14} className={colors.text} />
          <span className={`text-lg font-bold ${colors.text}`}>
            {timerState === 'ready' 
              ? '00:00' 
              : formatTime(remainingSeconds)}
          </span>
        </div>
      </div>
      
      {/* شريط التقدم */}
      {preparationTimeMinutes && remainingSeconds !== null && (
        <div className={`mt-2 h-1.5 rounded-full ${isDark ? 'bg-[#333]' : 'bg-gray-200'} overflow-hidden`}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ 
              width: `${Math.max(0, Math.min(100, ((preparationTimeMinutes * 60 - remainingSeconds) / (preparationTimeMinutes * 60)) * 100))}%` 
            }}
            transition={{ duration: 0.5 }}
            className={`h-full rounded-full ${
              timerState === 'ready' ? 'bg-green-500' :
              timerState === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
            }`}
          />
        </div>
      )}
      
      {/* رسالة الحالة */}
      <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        {timerState === 'ready' 
          ? 'توجه للمتجر لاستلام الطلب'
          : timerState === 'warning'
            ? '🚀 توجه للمتجر الآن!'
            : 'سيتم تنبيهك عندما يقترب الطلب من الجهوزية'}
      </p>
    </motion.div>
  );
};

export default FoodPrepTimer;
