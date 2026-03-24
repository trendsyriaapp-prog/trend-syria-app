// /app/frontend/src/components/delivery/PickupWaitingTimer.js
// مؤقت انتظار السائق عند المتجر - يظهر في نافذة إدخال كود الاستلام

import { useState, useEffect, useCallback } from 'react';
import { Clock, AlertTriangle, TrendingUp, Loader2 } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PickupWaitingTimer = ({ 
  arrivedAt, // ISO string - وقت وصول السائق
  theme = 'dark',
  compact = false
}) => {
  const isDark = theme === 'dark';
  
  // إعدادات التعويض (من الخادم)
  const [settings, setSettings] = useState({
    max_waiting_time_minutes: 10,
    compensation_per_5_minutes: 500,
    max_compensation_per_order: 2000
  });
  const [loadingSettings, setLoadingSettings] = useState(true);
  
  // حالة المؤقت
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [compensation, setCompensation] = useState(0);

  // جلب إعدادات التعويض من الخادم
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API}/settings/delivery-wait-compensation`);
        if (res.data) {
          setSettings({
            max_waiting_time_minutes: res.data.max_waiting_time_minutes || 10,
            compensation_per_5_minutes: res.data.compensation_per_5_minutes || 500,
            max_compensation_per_order: res.data.max_compensation_per_order || 2000
          });
        }
      } catch (error) {
        console.log('Using default wait compensation settings');
      } finally {
        setLoadingSettings(false);
      }
    };
    fetchSettings();
  }, []);

  // حساب الوقت المنقضي والتعويض
  const calculateElapsed = useCallback(() => {
    if (!arrivedAt) return 0;
    
    const arrivedDate = new Date(arrivedAt);
    const now = new Date();
    const diff = Math.floor((now - arrivedDate) / 1000);
    
    return Math.max(0, diff);
  }, [arrivedAt]);

  // حساب التعويض
  const calculateCompensation = useCallback((elapsedSecs) => {
    const elapsedMinutes = elapsedSecs / 60;
    const maxWaiting = settings.max_waiting_time_minutes;
    
    if (elapsedMinutes <= maxWaiting) {
      return 0;
    }
    
    const extraMinutes = elapsedMinutes - maxWaiting;
    const units = Math.ceil(extraMinutes / 5);
    return Math.min(units * settings.compensation_per_5_minutes, settings.max_compensation_per_order);
  }, [settings]);

  // تحديث المؤقت كل ثانية
  useEffect(() => {
    if (!arrivedAt || loadingSettings) return;

    const update = () => {
      const elapsed = calculateElapsed();
      setElapsedSeconds(elapsed);
      setCompensation(calculateCompensation(elapsed));
    };

    update();
    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, [arrivedAt, loadingSettings, calculateElapsed, calculateCompensation]);

  // تحويل الثواني لدقائق:ثواني
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // حساب الوقت المتبقي قبل بدء التعويض
  const remainingBeforeCompensation = Math.max(0, (settings.max_waiting_time_minutes * 60) - elapsedSeconds);
  const isOvertime = remainingBeforeCompensation === 0;

  if (!arrivedAt || loadingSettings) {
    return null;
  }

  // الشكل المضغوط
  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full ${
        isOvertime 
          ? 'bg-green-500/20 text-green-400' 
          : 'bg-blue-500/20 text-blue-400'
      }`}>
        <Clock size={12} />
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
      isOvertime
        ? isDark ? 'bg-green-500/10 border border-green-500/30' : 'bg-green-50 border border-green-200'
        : isDark ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-blue-50 border border-blue-200'
    }`}>
      <div className="p-3">
        {/* العنوان والوقت */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {isOvertime ? (
              <TrendingUp size={18} className="text-green-500" />
            ) : (
              <Clock size={18} className={isDark ? 'text-blue-400' : 'text-blue-600'} />
            )}
            <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
              {isOvertime ? 'تجاوزت وقت الانتظار!' : 'وقت الانتظار'}
            </span>
          </div>
          <span className={`text-xl font-bold ${
            isOvertime 
              ? 'text-green-500' 
              : isDark ? 'text-blue-400' : 'text-blue-600'
          }`}>
            {formatTime(elapsedSeconds)}
          </span>
        </div>

        {/* شريط التقدم */}
        <div className={`h-2 rounded-full overflow-hidden mb-2 ${isDark ? 'bg-[#333]' : 'bg-gray-200'}`}>
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              isOvertime ? 'bg-green-500' : 'bg-blue-500'
            }`}
            style={{ 
              width: `${Math.min(100, (elapsedSeconds / (settings.max_waiting_time_minutes * 60)) * 100)}%` 
            }}
          />
        </div>

        {/* معلومات التعويض */}
        {isOvertime ? (
          <div className={`flex items-center justify-between p-2 rounded-lg ${
            isDark ? 'bg-green-500/20' : 'bg-green-100'
          }`}>
            <div>
              <p className={`text-xs ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                تعويضك المتوقع:
              </p>
              <p className="text-lg font-bold text-green-500">
                +{compensation.toLocaleString()} ل.س
              </p>
            </div>
            <div className={`text-left text-xs ${isDark ? 'text-green-300/70' : 'text-green-600'}`}>
              <p>تأخير: {Math.floor((elapsedSeconds / 60) - settings.max_waiting_time_minutes)} دقيقة</p>
              <p>الحد الأقصى: {settings.max_compensation_per_order.toLocaleString()} ل.س</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className={`text-xs ${isDark ? 'text-blue-300/70' : 'text-blue-600'}`}>
              متبقي قبل التعويض: {formatTime(remainingBeforeCompensation)}
            </p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              ({settings.compensation_per_5_minutes.toLocaleString()} ل.س / 5 دقائق)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PickupWaitingTimer;
