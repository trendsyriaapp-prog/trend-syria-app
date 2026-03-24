// مكون صغير لعرض ربح اليوم مقارنة بأمس
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, DollarSign } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const DailyEarningsWidget = ({ theme = 'dark' }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const isDark = theme === 'dark';
  
  useEffect(() => {
    fetchTodayStats();
  }, []);
  
  const fetchTodayStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/delivery/earnings/stats?period=today`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching today stats:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString('ar-SY');
  };
  
  if (loading) {
    return (
      <div className={`rounded-2xl p-4 mb-4 animate-pulse ${
        isDark ? 'bg-[#1a1a1a] border border-[#333]' : 'bg-white border border-gray-200'
      }`}>
        <div className="h-16 bg-gray-700/30 rounded-xl"></div>
      </div>
    );
  }
  
  if (!stats) return null;
  
  const { current, previous, comparison } = stats;
  const isUp = comparison.earnings_change > 0;
  const isDown = comparison.earnings_change < 0;
  const isEqual = comparison.earnings_change === 0;
  
  // حساب نسبة التقدم (اليوم مقارنة بأمس)
  const progressPercent = previous.earnings > 0 
    ? Math.min((current.earnings / previous.earnings) * 100, 150) 
    : (current.earnings > 0 ? 100 : 0);
  
  return (
    <div className={`rounded-2xl overflow-hidden mb-4 ${
      isDark 
        ? 'bg-gradient-to-br from-[#1a2e1a] to-[#1a1a1a] border border-green-900/50' 
        : 'bg-gradient-to-br from-green-50 to-white border border-green-200'
    }`}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isDark ? 'bg-green-500/20' : 'bg-green-100'
            }`}>
              <DollarSign size={16} className={isDark ? 'text-green-400' : 'text-green-600'} />
            </div>
            <span className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              ربحك اليوم
            </span>
          </div>
          
          {/* Badge التغير */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
            isUp 
              ? (isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700')
              : isDown
                ? (isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700')
                : (isDark ? 'bg-gray-500/20 text-gray-400' : 'bg-gray-100 text-gray-600')
          }`}>
            {isUp && <TrendingUp size={12} />}
            {isDown && <TrendingDown size={12} />}
            {isEqual && <Minus size={12} />}
            <span>{isEqual ? '=' : `${Math.abs(comparison.earnings_change)}%`}</span>
          </div>
        </div>
        
        {/* الرقم الكبير */}
        <div className="flex items-baseline gap-2 mb-2">
          <span className={`text-3xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
            {formatNumber(current.earnings)}
          </span>
          <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>ل.س</span>
        </div>
        
        {/* شريط التقدم */}
        <div className="relative mb-2">
          <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-[#333]' : 'bg-gray-200'}`}>
            <div 
              className={`h-full rounded-full transition-all duration-700 ease-out ${
                progressPercent >= 100 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-400' 
                  : 'bg-gradient-to-r from-amber-500 to-yellow-400'
              }`}
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
          {progressPercent >= 100 && (
            <span className="absolute -top-1 -right-1 text-xs">🎉</span>
          )}
        </div>
        
        {/* مقارنة بأمس */}
        <div className="flex items-center justify-between">
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            أمس: {formatNumber(previous.earnings)} ل.س
          </span>
          <span className={`text-xs font-medium ${
            current.orders > 0 
              ? (isDark ? 'text-white' : 'text-gray-900')
              : (isDark ? 'text-gray-500' : 'text-gray-400')
          }`}>
            {current.orders} طلب {current.orders > 0 ? '✓' : ''}
          </span>
        </div>
        
        {/* رسالة تحفيزية */}
        {current.earnings === 0 && (
          <div className={`mt-3 p-2 rounded-xl text-xs text-center ${
            isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700'
          }`}>
            💪 ابدأ يومك بقبول طلب جديد!
          </div>
        )}
        {current.earnings > 0 && current.earnings >= previous.earnings && (
          <div className={`mt-3 p-2 rounded-xl text-xs text-center ${
            isDark ? 'bg-green-500/10 text-green-400' : 'bg-green-50 text-green-700'
          }`}>
            🚀 أداء رائع! تجاوزت أرباح أمس
          </div>
        )}
        {current.earnings > 0 && current.earnings < previous.earnings && (
          <div className={`mt-3 p-2 rounded-xl text-xs text-center ${
            isDark ? 'bg-blue-500/10 text-blue-400' : 'bg-blue-50 text-blue-700'
          }`}>
            ⚡ استمر! باقي {formatNumber(previous.earnings - current.earnings)} ل.س للوصول لمستوى أمس
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyEarningsWidget;
