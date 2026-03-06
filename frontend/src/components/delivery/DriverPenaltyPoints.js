// /app/frontend/src/components/delivery/DriverPenaltyPoints.js
// عرض نقاط السلوك والمكافآت للموظف

import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, Clock, TrendingDown, TrendingUp, Gift } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('ar-SY', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const DriverPenaltyPoints = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchPoints();
  }, []);

  const fetchPoints = async () => {
    try {
      const res = await axios.get(`${API}/api/delivery/my-penalty-points`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
    } catch (error) {
      console.error('Error fetching penalty points:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 border border-gray-200 animate-pulse">
        <div className="h-20 bg-gray-100 rounded-lg"></div>
      </div>
    );
  }

  if (!data) return null;

  const { current_points, max_points, percentage, history } = data;
  const isLow = percentage <= 30;
  const isCritical = percentage <= 10;
  const isFull = percentage >= 100;

  // فصل السجلات إلى خصومات ومكافآت
  const deductions = history?.filter(h => h.type !== 'bonus') || [];
  const bonuses = history?.filter(h => h.type === 'bonus') || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl p-4 border ${
        isCritical ? 'bg-red-50 border-red-200' : 
        isLow ? 'bg-yellow-50 border-yellow-200' : 
        isFull ? 'bg-green-50 border-green-200' :
        'bg-white border-gray-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isCritical ? 'bg-red-100' : isLow ? 'bg-yellow-100' : 'bg-green-100'
          }`}>
            <Shield size={18} className={
              isCritical ? 'text-red-500' : isLow ? 'text-yellow-600' : 'text-green-600'
            } />
          </div>
          <span className="font-bold text-gray-900 text-sm">نقاط السلوك</span>
        </div>
        <span className={`text-xl font-bold ${
          isCritical ? 'text-red-600' : isLow ? 'text-yellow-600' : 'text-green-600'
        }`}>
          {current_points}/{max_points}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
          className={`h-full rounded-full ${
            isCritical ? 'bg-red-500' : isLow ? 'bg-yellow-500' : 'bg-green-500'
          }`}
        />
      </div>

      {/* Status Message */}
      {isFull && (
        <div className="flex items-center gap-2 p-2 rounded-lg mt-2 bg-green-100">
          <Gift size={14} className="text-green-600" />
          <span className="text-xs font-medium text-green-700">
            ممتاز! نقاطك في الحد الأقصى. استمر بالعمل الجيد!
          </span>
        </div>
      )}

      {isLow && !isFull && (
        <div className={`flex items-center gap-2 p-2 rounded-lg mt-2 ${
          isCritical ? 'bg-red-100' : 'bg-yellow-100'
        }`}>
          <AlertTriangle size={14} className={isCritical ? 'text-red-600' : 'text-yellow-600'} />
          <span className={`text-xs font-medium ${isCritical ? 'text-red-700' : 'text-yellow-700'}`}>
            {isCritical 
              ? 'تحذير! نقاطك منخفضة جداً. البلاغ القادم قد يؤدي للفصل.'
              : 'انتبه! نقاطك منخفضة. حافظ على سلوك مهني.'
            }
          </span>
        </div>
      )}

      {/* Bonus Tips */}
      {!isFull && (
        <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs text-blue-700 font-medium flex items-center gap-1">
            <Gift size={12} />
            اكسب نقاط: +5 عند تقييم 5⭐ | +10 كل 10 توصيلات
          </p>
        </div>
      )}

      {/* History */}
      {history && history.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1 mb-2">
            <Clock size={12} className="text-gray-400" />
            <span className="text-xs text-gray-500">آخر السجلات</span>
          </div>
          <div className="space-y-1">
            {history.slice(-4).reverse().map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1">
                  {item.type === 'bonus' ? (
                    <TrendingUp size={10} className="text-green-500" />
                  ) : (
                    <TrendingDown size={10} className="text-red-500" />
                  )}
                  <span className="text-gray-600 truncate max-w-[150px]">
                    {item.type === 'bonus' ? item.reason : item.category}
                  </span>
                </div>
                <span className={`font-medium ${item.type === 'bonus' ? 'text-green-600' : 'text-red-600'}`}>
                  {item.type === 'bonus' ? `+${item.points_added}` : `-${item.points_deducted}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default DriverPenaltyPoints;
