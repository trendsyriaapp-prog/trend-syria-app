// /app/frontend/src/components/delivery/WaitingTimerBadge.js
// شارة العداد المصغرة - تظهر في بطاقة الطلب

import { useState, useEffect, useCallback } from 'react';
import { Clock } from 'lucide-react';

const WaitingTimerBadge = ({ 
  arrivedAt, // ISO string - وقت وصول السائق
  theme = 'dark',
  maxWaitingMinutes = 10, // الحد الأقصى قبل التعويض
  hideAfterMinutes = null, // إخفاء العداد بعد هذا الوقت (null = لا يختفي)
  label = null // نص مخصص
}) => {
  const isDark = theme === 'dark';
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isHidden, setIsHidden] = useState(false);

  // حساب الوقت المنقضي
  const calculateElapsed = useCallback(() => {
    if (!arrivedAt) return 0;
    
    const arrivedDate = new Date(arrivedAt);
    const now = new Date();
    const diff = Math.floor((now - arrivedDate) / 1000);
    
    return Math.max(0, diff);
  }, [arrivedAt]);

  // تحديث المؤقت كل ثانية
  useEffect(() => {
    if (!arrivedAt) return;

    // حساب أولي
    setElapsedSeconds(calculateElapsed());

    // تحديث كل ثانية
    const interval = setInterval(() => {
      setElapsedSeconds(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [arrivedAt, calculateElapsed]);

  if (!arrivedAt) return null;

  // تحويل الثواني لصيغة دقائق:ثواني
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  // هل تجاوز الحد المسموح؟
  const isOverLimit = minutes >= maxWaitingMinutes;
  const remainingForCompensation = Math.max(0, (maxWaitingMinutes * 60) - elapsedSeconds);
  const remainingMinutes = Math.floor(remainingForCompensation / 60);
  const remainingSeconds = remainingForCompensation % 60;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${
      isOverLimit
        ? (isDark ? 'bg-red-500/20 border border-red-500/30' : 'bg-red-50 border border-red-200')
        : (isDark ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-amber-50 border border-amber-200')
    }`}>
      <Clock size={16} className={`${
        isOverLimit
          ? (isDark ? 'text-red-400' : 'text-red-500')
          : (isDark ? 'text-amber-400' : 'text-amber-500')
      } ${!isOverLimit ? 'animate-pulse' : ''}`} />
      
      <div className="flex items-center gap-2">
        <span className={`font-bold ${
          isOverLimit
            ? (isDark ? 'text-red-400' : 'text-red-600')
            : (isDark ? 'text-amber-400' : 'text-amber-600')
        }`}>
          ⏱️ {timeString}
        </span>
        
        {isOverLimit ? (
          <span className={`text-xs ${isDark ? 'text-red-300' : 'text-red-500'}`}>
            💰 تستحق تعويض!
          </span>
        ) : (
          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            متبقي {remainingMinutes}:{remainingSeconds.toString().padStart(2, '0')}
          </span>
        )}
      </div>
    </div>
  );
};

export default WaitingTimerBadge;
