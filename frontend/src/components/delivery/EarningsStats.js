// /app/frontend/src/components/delivery/EarningsStats.js
// إحصائيات الأرباح للسائق مع رسوم بيانية

import { useState, useEffect } from 'react';
import logger from '../../lib/logger';
import { TrendingUp, TrendingDown, DollarSign, Package, Clock, ChevronLeft, ChevronRight, Utensils, ShoppingBag } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function EarningsStats({ theme = 'dark' }) {
  const [period, setPeriod] = useState('week');
  const [chartType, setChartType] = useState('daily');
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, chart, history
  
  // تحديد الثيم
  const isDark = theme === 'dark';

  useEffect(() => {
    fetchStats();
  }, [period]);

  useEffect(() => {
    fetchChartData();
  }, [chartType]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab, historyPage]);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/delivery/earnings/stats?period=${period}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      logger.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/delivery/earnings/chart?chart_type=${chartType}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setChartData(data);
      }
    } catch (err) {
      logger.error('Error fetching chart:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/delivery/earnings/history?page=${historyPage}&limit=10`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.orders);
        setTotalPages(data.total_pages);
      }
    } catch (err) {
      logger.error('Error fetching history:', err);
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('ar-SY').format(num);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SY', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header with tabs */}
      <div className={`rounded-2xl p-4 border ${
        isDark ? 'bg-gradient-to-br from-green-900/30 to-emerald-900/20 border-green-800' : 'bg-gradient-to-br from-green-100 to-emerald-50 border-green-200'
      }`}>
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className={`w-6 h-6 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
          <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>إحصائيات الأرباح</h2>
        </div>
        
        {/* Tab buttons */}
        <div className="flex gap-2">
          {[
            { id: 'overview', label: 'نظرة عامة' },
            { id: 'chart', label: 'الرسم البياني' },
            { id: 'history', label: 'السجل' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-green-500 text-white'
                  : isDark 
                    ? 'bg-[#1a1a1a] text-gray-400 hover:text-white border border-[#333]' 
                    : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div className="space-y-4">
          {/* Period Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { id: 'today', label: 'اليوم' },
              { id: 'week', label: 'الأسبوع' },
              { id: 'month', label: 'الشهر' },
              { id: 'year', label: 'السنة' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                  period === p.id
                    ? 'bg-green-500 text-white'
                    : isDark 
                      ? 'bg-[#252525] text-gray-400 border border-[#333] hover:border-green-500' 
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-green-500'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Main Stats Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Current Earnings */}
            <div className={`rounded-2xl p-4 border ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200 shadow-sm'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{stats.period_label}</span>
                <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                  stats.comparison.is_improvement
                    ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                    : isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
                }`}>
                  {stats.comparison.is_improvement ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>{Math.abs(stats.comparison.earnings_change)}%</span>
                </div>
              </div>
              <div className={`text-2xl font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                {formatNumber(stats.current.earnings)}
                <span className={`text-sm font-normal mr-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>ل.س</span>
              </div>
              <div className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {stats.previous.label}: {formatNumber(stats.previous.earnings)} ل.س
              </div>
            </div>

            {/* Orders Count */}
            <div className={`rounded-2xl p-4 border ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200 shadow-sm'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>عدد الطلبات</span>
                <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                  stats.comparison.orders_change >= 0
                    ? isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'
                    : isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-100 text-red-700'
                }`}>
                  {stats.comparison.orders_change >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>{Math.abs(stats.comparison.orders_change)}%</span>
                </div>
              </div>
              <div className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {stats.current.orders}
                <span className={`text-sm font-normal mr-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>طلب</span>
              </div>
              <div className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {stats.previous.label}: {stats.previous.orders} طلب
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className={`rounded-2xl p-4 border ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200 shadow-sm'}`}>
            <h3 className={`font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>تفاصيل الطلبات</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-green-500/20' : 'bg-green-100'}`}>
                    <Utensils className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                  </div>
                  <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>طلبات الطعام</span>
                </div>
                <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.current.food_orders} طلب</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDark ? 'bg-blue-500/20' : 'bg-blue-100'}`}>
                    <ShoppingBag className={`w-5 h-5 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                  </div>
                  <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>طلبات المنتجات</span>
                </div>
                <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stats.current.product_orders} طلب</span>
              </div>
              <div className={`border-t pt-3 ${isDark ? 'border-[#333]' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>متوسط الربح لكل طلب</span>
                  <span className={`font-semibold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                    {formatNumber(stats.current.avg_per_order)} ل.س
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart Tab */}
      {activeTab === 'chart' && chartData && (
        <div className="space-y-4">
          {/* Chart Type Selector */}
          <div className="flex gap-2">
            {[
              { id: 'daily', label: 'يومي' },
              { id: 'weekly', label: 'أسبوعي' },
              { id: 'monthly', label: 'شهري' }
            ].map(c => (
              <button
                key={c.id}
                onClick={() => setChartType(c.id)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  chartType === c.id
                    ? 'bg-green-500 text-white'
                    : isDark 
                      ? 'bg-[#252525] text-gray-400 border border-[#333] hover:border-green-500' 
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-green-500'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className={`rounded-2xl p-4 border ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200 shadow-sm'}`}>
            <h3 className={`font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>الأرباح</h3>
            
            {/* Simple Bar Chart */}
            <div className="space-y-3">
              {chartData.data.map((item, index) => {
                const maxValue = chartData.summary.max_earnings || 1;
                const percentage = (item.earnings / maxValue) * 100;
                
                return (
                  <div key={`earnings-${item.label}`} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>{item.label}</span>
                      <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{formatNumber(item.earnings)} ل.س</span>
                    </div>
                    <div className={`h-8 rounded-xl overflow-hidden ${isDark ? 'bg-[#1a1a1a]' : 'bg-gray-100'}`}>
                      <div
                        className="h-full bg-gradient-to-l from-green-400 to-green-600 rounded-xl transition-all duration-500 flex items-center justify-end px-3"
                        style={{ width: `${Math.max(percentage, 5)}%` }}
                      >
                        {item.orders > 0 && (
                          <span className="text-white text-xs font-bold">
                            {item.orders} طلب
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className={`mt-4 pt-4 border-t grid grid-cols-3 gap-2 text-center ${isDark ? 'border-[#333]' : 'border-gray-200'}`}>
              <div>
                <div className={`text-lg font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                  {formatNumber(chartData.summary.total_earnings)}
                </div>
                <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>إجمالي الأرباح</div>
              </div>
              <div>
                <div className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {chartData.summary.total_orders}
                </div>
                <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>إجمالي الطلبات</div>
              </div>
              <div>
                <div className={`text-lg font-bold ${isDark ? 'text-yellow-400' : 'text-amber-600'}`}>
                  {chartData.summary.best_period}
                </div>
                <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>أفضل فترة</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          <div className={`rounded-2xl overflow-hidden border ${isDark ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className={`p-4 border-b ${isDark ? 'bg-[#252525] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
              <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>سجل الأرباح</h3>
            </div>
            
            {history.length === 0 ? (
              <div className="p-8 text-center">
                <Package className={`w-12 h-12 mx-auto mb-2 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>لا توجد طلبات مسلمة بعد</p>
              </div>
            ) : (
              <div className={`divide-y ${isDark ? 'divide-[#333]' : 'divide-gray-100'}`}>
                {history.map((order) => (
                  <div key={order._id || order.id || `order-${order.delivered_at}`} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        order.type === 'food' 
                          ? isDark ? 'bg-green-500/20' : 'bg-green-100'
                          : isDark ? 'bg-blue-500/20' : 'bg-blue-100'
                      }`}>
                        {order.type === 'food' ? (
                          <Utensils className={`w-6 h-6 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                        ) : (
                          <ShoppingBag className={`w-6 h-6 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
                        )}
                      </div>
                      <div>
                        <div className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                          #{order.order_number}
                        </div>
                        <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          {order.source} • {formatDate(order.delivered_at)}
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className={`font-bold text-lg ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                        +{formatNumber(order.earnings)} ل.س
                      </div>
                      <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        الطلب: {formatNumber(order.order_total)} ل.س
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={`p-4 border-t flex items-center justify-between ${isDark ? 'bg-[#252525] border-[#333]' : 'bg-gray-50 border-gray-200'}`}>
                <button
                  onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                  disabled={historyPage === 1}
                  className={`p-2 rounded-xl border disabled:opacity-50 ${isDark ? 'bg-[#1a1a1a] border-[#333] text-white' : 'bg-white border-gray-200 text-gray-700'}`}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  صفحة {historyPage} من {totalPages}
                </span>
                <button
                  onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                  disabled={historyPage === totalPages}
                  className={`p-2 rounded-xl border disabled:opacity-50 ${isDark ? 'bg-[#1a1a1a] border-[#333] text-white' : 'bg-white border-gray-200 text-gray-700'}`}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
