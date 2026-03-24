// /app/frontend/src/components/seller/DriverWaitingAlert.js
// تنبيه للبائع عندما يكون السائق ينتظر - يظهر بعد 5 دقائق

import { useState, useEffect, useCallback } from 'react';
import { Clock, AlertTriangle, Truck } from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DriverWaitingAlert = ({ 
  arrivedAt, // ISO string - وقت وصول السائق
  driverName = 'السائق',
  orderId,
  onGiveCode // callback عند الضغط على "أعطِ الكود"
}) => {
  // إعدادات التعويض (من الخادم)
  const [settings, setSettings] = useState({
    max_waiting_time_minutes: 10,
    compensation_per_5_minutes: 500,
    max_compensation_per_order: 2000
  });
  
  // حالة المؤقت
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [deduction, setDeduction] = useState(0);
  const [showAlert, setShowAlert] = useState(false);

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

  // حساب الخصم
  const calculateDeduction = useCallback((elapsedSecs) => {
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
    if (!arrivedAt) return;

    const update = () => {
      const elapsed = calculateElapsed();
      setElapsedSeconds(elapsed);
      setDeduction(calculateDeduction(elapsed));
      
      // إظهار التنبيه بعد 5 دقائق (300 ثانية)
      setShowAlert(elapsed >= 300);
    };

    update();
    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, [arrivedAt, calculateElapsed, calculateDeduction]);

  // تحويل الثواني لدقائق:ثواني
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const isOvertime = elapsedSeconds >= (settings.max_waiting_time_minutes * 60);

  if (!arrivedAt) {
    return null;
  }

  // أقل من 5 دقائق - إظهار فقط رسالة بسيطة
  if (!showAlert) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
        <div className="flex items-center gap-2">
          <Truck size={18} className="text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">
              {driverName} وصل للمتجر
            </p>
            <p className="text-xs text-green-600">
              منذ {formatTime(elapsedSeconds)} - أعطِه كود الاستلام
            </p>
          </div>
        </div>
      </div>
    );
  }

  // أكثر من 5 دقائق - إظهار تنبيه قوي
  return (
    <div className={`rounded-xl overflow-hidden mt-2 border-2 ${
      isOvertime 
        ? 'bg-red-50 border-red-400 animate-pulse' 
        : 'bg-amber-50 border-amber-400'
    }`}>
      <div className="p-3">
        {/* رأس التنبيه */}
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            isOvertime ? 'bg-red-500' : 'bg-amber-500'
          }`}>
            <AlertTriangle size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <p className={`text-sm font-bold ${isOvertime ? 'text-red-700' : 'text-amber-700'}`}>
              {isOvertime ? '⚠️ تأخير! ستُخصم منك!' : '⏰ أسرع! السائق ينتظر'}
            </p>
            <p className={`text-xs ${isOvertime ? 'text-red-600' : 'text-amber-600'}`}>
              {driverName} ينتظر منذ {elapsedMinutes} دقيقة
            </p>
          </div>
          <div className={`text-2xl font-bold ${isOvertime ? 'text-red-600' : 'text-amber-600'}`}>
            {formatTime(elapsedSeconds)}
          </div>
        </div>

        {/* شريط التقدم */}
        <div className="h-2 rounded-full overflow-hidden mb-2 bg-gray-200">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${
              isOvertime ? 'bg-red-500' : 'bg-amber-500'
            }`}
            style={{ 
              width: `${Math.min(100, (elapsedSeconds / (settings.max_waiting_time_minutes * 60)) * 100)}%` 
            }}
          />
        </div>

        {/* معلومات الخصم */}
        {isOvertime && deduction > 0 && (
          <div className="bg-red-100 rounded-lg p-2 mb-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-red-700">
                الخصم الحالي:
              </p>
              <p className="text-lg font-bold text-red-600">
                -{deduction.toLocaleString()} ل.س
              </p>
            </div>
            <p className="text-xs text-red-500 mt-1">
              يزيد {settings.compensation_per_5_minutes.toLocaleString()} ل.س كل 5 دقائق (حد أقصى {settings.max_compensation_per_order.toLocaleString()})
            </p>
          </div>
        )}

        {!isOvertime && (
          <div className="bg-amber-100 rounded-lg p-2 mb-2">
            <p className="text-xs text-amber-700 text-center">
              متبقي <span className="font-bold">{formatTime((settings.max_waiting_time_minutes * 60) - elapsedSeconds)}</span> قبل بدء الخصم
            </p>
          </div>
        )}

        {/* زر إعطاء الكود */}
        {onGiveCode && (
          <button
            onClick={onGiveCode}
            className={`w-full py-3 rounded-xl font-bold text-white text-sm ${
              isOvertime 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            📱 أعطِ السائق كود الاستلام الآن
          </button>
        )}
      </div>
    </div>
  );
};

export default DriverWaitingAlert;
