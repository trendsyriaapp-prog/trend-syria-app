// /app/frontend/src/components/delivery/DriverPenaltyPoints.js
// عرض نقاط السلوك والمكافآت للموظف

import { useState, useEffect } from 'react';
import logger from '../../lib/logger';
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
      const res = await axios.get(`${API}/api/delivery/my-penalty-points`);
      setData(res.data);
    } catch (error) {
      logger.error('Error fetching penalty points:', error);
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
      className={`rounded-xl p-2.5 border ${
        isCritical ? 'bg-red-50 border-red-200' : 
        isLow ? 'bg-yellow-50 border-yellow-200' : 
        isFull ? 'bg-orange-50 border-orange-200' :
        'bg-white border-gray-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
            isCritical ? 'bg-red-100' : isLow ? 'bg-yellow-100' : 'bg-orange-100'
          }`}>
            <Shield size={14} className={
              isCritical ? 'text-red-500' : isLow ? 'text-yellow-600' : 'text-orange-600'
            } />
          </div>
          <span className="font-bold text-gray-900 text-xs">نقاط السلوك</span>
        </div>
        <span className={`text-sm font-bold ${
          isCritical ? 'text-red-600' : isLow ? 'text-yellow-600' : 'text-orange-600'
        }`}>
          {current_points}/{max_points}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-1.5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5 }}
          className={`h-full rounded-full ${
            isCritical ? 'bg-red-500' : isLow ? 'bg-yellow-500' : 'bg-orange-500'
          }`}
        />
      </div>

      {/* Status Message - Compact */}
      {isFull && (
        <div className="flex items-center gap-1 p-1.5 rounded-lg bg-orange-100">
          <Gift size={10} className="text-orange-600" />
          <span className="text-[10px] font-medium text-orange-700">ممتاز! نقاطك في الحد الأقصى</span>
        </div>
      )}

      {isLow && !isFull && (
        <div className={`flex items-center gap-1 p-1.5 rounded-lg ${isCritical ? 'bg-red-100' : 'bg-yellow-100'}`}>
          <AlertTriangle size={10} className={isCritical ? 'text-red-600' : 'text-yellow-600'} />
          <span className={`text-[10px] font-medium ${isCritical ? 'text-red-700' : 'text-yellow-700'}`}>
            {isCritical ? 'تحذير! نقاطك منخفضة جداً' : 'انتبه! نقاطك منخفضة'}
          </span>
        </div>
      )}
    </motion.div>
  );
};

export default DriverPenaltyPoints;
