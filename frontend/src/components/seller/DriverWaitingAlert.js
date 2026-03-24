// /app/frontend/src/components/seller/DriverWaitingAlert.js
// تنبيه للبائع عندما يكون السائق ينتظر - تنبيهين فقط (5 دقائق و 10 دقائق)

import { useState, useEffect, useCallback } from 'react';
import { Clock, AlertTriangle, Truck, XCircle } from 'lucide-react';
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
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [alertLevel, setAlertLevel] = useState(0); // 0 = لا تنبيه، 1 = 5 دقائق، 2 = 10 دقائق

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
    const diffMinutes = Math.floor((now - arrivedDate) / 1000 / 60);
    
    return Math.max(0, diffMinutes);
  }, [arrivedAt]);

  // تحديث كل 30 ثانية
  useEffect(() => {
    if (!arrivedAt) return;

    const update = () => {
      const mins = calculateElapsed();
      setElapsedMinutes(mins);
      
      // تحديد مستوى التنبيه
      if (mins >= settings.max_waiting_time_minutes) {
        setAlertLevel(2); // تنبيه المخالفة
      } else if (mins >= 5) {
        setAlertLevel(1); // تنبيه الانتظار
      } else {
        setAlertLevel(0); // لا تنبيه
      }
    };

    update();
    const interval = setInterval(update, 30000); // تحديث كل 30 ثانية

    return () => clearInterval(interval);
  }, [arrivedAt, calculateElapsed, settings.max_waiting_time_minutes]);

  if (!arrivedAt) {
    return null;
  }

  // أقل من 5 دقائق - رسالة بسيطة فقط
  if (alertLevel === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
        <div className="flex items-center gap-2">
          <Truck size={18} className="text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">
              {driverName} وصل للمتجر
            </p>
            <p className="text-xs text-green-600">
              منذ {elapsedMinutes} دقيقة - جهّز الطلب وأعطِه الكود
            </p>
          </div>
        </div>
      </div>
    );
  }

  // تنبيه المستوى الأول - 5 دقائق
  if (alertLevel === 1) {
    return (
      <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-3 mt-2 animate-pulse">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
            <Clock size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-amber-700">
              ⏰ {driverName} ينتظر منذ {elapsedMinutes} دقيقة
            </p>
            <p className="text-xs text-amber-600">
              متبقي {settings.max_waiting_time_minutes - elapsedMinutes} دقائق قبل المخالفة
            </p>
          </div>
        </div>
        
        <div className="bg-amber-100 rounded-lg p-2 mb-2">
          <p className="text-xs text-amber-700 text-center">
            ⚠️ بعد {settings.max_waiting_time_minutes - elapsedMinutes} دقائق ستُخالف بمبلغ {settings.compensation_per_5_minutes.toLocaleString()} ل.س
          </p>
        </div>

        {onGiveCode && (
          <button
            onClick={onGiveCode}
            className="w-full py-2.5 rounded-xl font-bold text-white text-sm bg-amber-500 hover:bg-amber-600"
          >
            📱 أعطِ السائق الكود الآن
          </button>
        )}
      </div>
    );
  }

  // تنبيه المستوى الثاني - 10 دقائق (مخالفة)
  return (
    <div className="bg-red-50 border-2 border-red-500 rounded-xl p-3 mt-2">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
          <XCircle size={18} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-red-700">
            🚨 مخالفة! {driverName} ينتظر منذ {elapsedMinutes} دقيقة
          </p>
        </div>
      </div>
      
      <div className="bg-red-100 rounded-lg p-3 mb-2">
        <div className="text-center">
          <p className="text-xs text-red-600 mb-1">سيُخصم من حسابك:</p>
          <p className="text-xl font-bold text-red-600">
            -{settings.compensation_per_5_minutes.toLocaleString()} ل.س
          </p>
          <p className="text-xs text-red-500 mt-1">
            (يزيد {settings.compensation_per_5_minutes.toLocaleString()} ل.س كل 5 دقائق - الحد الأقصى {settings.max_compensation_per_order.toLocaleString()} ل.س)
          </p>
        </div>
      </div>

      {onGiveCode && (
        <button
          onClick={onGiveCode}
          className="w-full py-2.5 rounded-xl font-bold text-white text-sm bg-red-500 hover:bg-red-600"
        >
          📱 أعطِ السائق الكود فوراً!
        </button>
      )}
    </div>
  );
};

export default DriverWaitingAlert;
