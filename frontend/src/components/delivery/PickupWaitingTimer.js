// /app/frontend/src/components/delivery/PickupWaitingTimer.js
// مؤقت انتظار السائق عند المتجر - يظهر في نافذة إدخال كود الاستلام

import { useState, useEffect, useCallback } from 'react';
import logger from '../../lib/logger';
import { Clock, CheckCircle, TrendingUp } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const PickupWaitingTimer = ({ 
  arrivedAt, // ISO string - وقت وصول السائق
  theme = 'dark',
  compact = false,
  maxMinutes = null, // الحد الأقصى بالدقائق (إذا تم تحديده، يختفي العداد بعده)
  onMaxReached = null, // callback عند الوصول للحد الأقصى
  labelPrefix = "وقت الانتظار" // نص العنوان
}) => {
  const isDark = theme === 'dark';
  const [isHidden, setIsHidden] = useState(false); // لإخفاء العداد بعد انتهاء الوقت
  
  // إعدادات التعويض (من الخادم)
  const [settings, setSettings] = useState({
    max_waiting_time_minutes: 10,
    compensation_per_5_minutes: 500
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  
  // حالة المؤقت
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [compensation, setCompensation] = useState(0);

  // جلب إعدادات التعويض من الخادم
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API}/api/settings/delivery-wait-compensation`);
        if (res.data) {
          setSettings({
            max_waiting_time_minutes: res.data.max_waiting_time_minutes || 10,
            compensation_per_5_minutes: res.data.compensation_per_5_minutes || 500
          });
        }
      } catch (error) {
        logger.log('Using default wait compensation settings');
      } finally {
        setLoadingSettings(false);
      }
    };
    fetchSettings();
  }, []);

  // حساب الوقت المنقضي
  const calculateElapsed = useCallback(() => {
    if (!arrivedAt) return 0;
    
    const arrivedDate = new Date(arrivedAt);
    const now = new Date();
    const diff = Math.floor((now - arrivedDate) / 1000);
    
    return Math.max(0, diff);
  }, [arrivedAt]);

  // حساب التعويض - تعويض واحد ثابت بعد تجاوز الحد
  const calculateCompensation = useCallback((elapsedSecs) => {
    const elapsedMinutes = elapsedSecs / 60;
    const maxWaiting = settings.max_waiting_time_minutes;
    
    if (elapsedMinutes <= maxWaiting) {
      return 0;
    }
    
    // تعويض ثابت واحد بعد تجاوز وقت الانتظار المسموح
    return settings.compensation_per_5_minutes;
  }, [settings]);

  // تحديث المؤقت كل ثانية
  useEffect(() => {
    if (!arrivedAt || loadingSettings) return;

    const update = () => {
      const elapsed = calculateElapsed();
      const comp = calculateCompensation(elapsed);
      
      // إذا تم تحديد maxMinutes وتجاوزنا الحد، أخفِ العداد
      if (maxMinutes && elapsed >= maxMinutes * 60) {
        setIsHidden(true);
        if (onMaxReached) onMaxReached();
        return;
      }
      
      setElapsedSeconds(elapsed);
      setCompensation(comp);
    };

    update();
    
    // استمر بالتحديث
    if (!isHidden) {
      const interval = setInterval(update, 1000);
      return () => clearInterval(interval);
    }
  }, [arrivedAt, loadingSettings, calculateElapsed, calculateCompensation, settings, maxMinutes, onMaxReached, isHidden]);

  // تحويل الثواني لدقائق:ثواني
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // حساب الوقت المتبقي قبل بدء التعويض
  const maxWaitingSeconds = settings.max_waiting_time_minutes * 60;
  const isOvertime = elapsedSeconds >= maxWaitingSeconds;
  const remainingBeforeCompensation = Math.max(0, maxWaitingSeconds - elapsedSeconds);
  const hasCompensation = compensation > 0;

  if (!arrivedAt || loadingSettings) {
    return null;
  }
  
  // إخفاء العداد إذا تم تجاوز الحد الأقصى المحدد
  if (isHidden) {
    return null;
  }

  // الشكل المضغوط
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${
        hasCompensation 
          ? 'bg-green-500/20 text-green-400'
          : isOvertime 
            ? 'bg-amber-500/20 text-amber-400' 
            : 'bg-blue-500/20 text-blue-400'
      }`}>
        {hasCompensation ? <CheckCircle size={12} /> : <Clock size={12} />}
        <span className="text-xs font-bold">
          {formatTime(elapsedSeconds)}
        </span>
        {compensation > 0 && (
          <span className="text-xs font-bold text-green-400">
            +{compensation.toLocaleString()}
          </span>
        )}
      </div>
    );
  }

  // الشكل الكامل
  return (
    <div className={`rounded-xl overflow-hidden mb-4 ${
      hasCompensation
        ? isDark ? 'bg-green-500/10 border border-green-500/30' : 'bg-green-50 border border-green-200'
        : isOvertime
          ? isDark ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-amber-50 border border-amber-200'
          : isDark ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
    }`}>
      <div className="p-3">
        {/* العنوان والوقت */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {hasCompensation ? (
              <CheckCircle size={18} className="text-green-500" />
            ) : isOvertime ? (
              <TrendingUp size={18} className="text-amber-500" />
            ) : (
              <Clock size={18} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
            )}
            <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
              {hasCompensation 
                ? '✅ تستحق تعويض!' 
                : isOvertime 
                  ? `⏰ تجاوزت ${labelPrefix}` 
                  : labelPrefix}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xl font-bold ${
              hasCompensation 
                ? 'text-green-500'
                : isOvertime 
                  ? 'text-amber-500' 
                  : isDark ? 'text-blue-400' : 'text-blue-600'
            }`}>
              {formatTime(elapsedSeconds)}
            </span>
          </div>
        </div>

        {/* شريط التقدم */}
        <div className={`h-2 rounded-full overflow-hidden mb-2 ${isDark ? 'bg-[#333]' : 'bg-gray-200'}`}>
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              hasCompensation 
                ? 'bg-green-500'
                : isOvertime 
                  ? 'bg-amber-500' 
                  : 'bg-blue-500'
            }`}
            style={{ 
              width: hasCompensation ? '100%' : `${Math.min(100, (elapsedSeconds / maxWaitingSeconds) * 100)}%` 
            }}
          />
        </div>

        {/* معلومات التعويض */}
        {hasCompensation ? (
          // تستحق تعويض ثابت
          <div className={`p-3 rounded-lg ${
            isDark ? 'bg-green-500/20' : 'bg-green-100'
          }`}>
            <div className="text-center">
              <p className={`text-xs mb-1 ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                💰 تعويضك:
              </p>
              <p className="text-2xl font-bold text-green-500">
                +{compensation.toLocaleString()} ل.س
              </p>
            </div>
          </div>
        ) : isOvertime ? (
          // تجاوز الوقت لكن لا تعويض بعد
          <div className={`p-2 rounded-lg ${
            isDark ? 'bg-amber-500/20' : 'bg-amber-100'
          }`}>
            <div className="text-center">
              <p className={`text-sm ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                ⏰ تجاوزت وقت الانتظار المسموح
              </p>
            </div>
          </div>
        ) : (
          // لم يتجاوز الوقت بعد
          <div className="flex items-center justify-between">
            <p className={`text-xs ${isDark ? 'text-blue-300/70' : 'text-blue-600'}`}>
              متبقي قبل التعويض: {formatTime(remainingBeforeCompensation)}
            </p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              (الحد: {settings.max_waiting_time_minutes} دقائق)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PickupWaitingTimer;
