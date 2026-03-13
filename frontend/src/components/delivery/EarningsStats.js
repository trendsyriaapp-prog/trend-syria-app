// /app/frontend/src/components/delivery/EarningsStats.js
// إحصائيات الأرباح للسائق مع رسوم بيانية

import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Package, Clock, ChevronLeft, ChevronRight, Utensils, ShoppingBag } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function EarningsStats({ token }) {
  const [period, setPeriod] = useState('week');
  const [chartType, setChartType] = useState('daily');
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // overview, chart, history

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
      const res = await fetch(`${API_URL}/api/delivery/earnings/stats?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      const res = await fetch(`${API_URL}/api/delivery/earnings/chart?chart_type=${chartType}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setChartData(data);
      }
    } catch (err) {
      console.error('Error fetching chart:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${API_URL}/api/delivery/earnings/history?page=${historyPage}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data.orders);
        setTotalPages(data.total_pages);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
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
      <div className="driver-earnings-card">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-6 h-6 text-green-400" />
          <h2 className="text-lg font-bold text-white">إحصائيات الأرباح</h2>
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
                  ? 'bg-green-500 text-black'
                  : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
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
                    ? 'bg-green-500 text-black'
                    : 'bg-[#252525] text-gray-400 border border-[#333] hover:border-green-500'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Main Stats Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Current Earnings */}
            <div className="driver-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">{stats.period_label}</span>
                <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                  stats.comparison.is_improvement
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {stats.comparison.is_improvement ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>{Math.abs(stats.comparison.earnings_change)}%</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-green-400">
                {formatNumber(stats.current.earnings)}
                <span className="text-sm font-normal text-gray-500 mr-1">ل.س</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {stats.previous.label}: {formatNumber(stats.previous.earnings)} ل.س
              </div>
            </div>

            {/* Orders Count */}
            <div className="driver-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-sm">عدد الطلبات</span>
                <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                  stats.comparison.orders_change >= 0
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {stats.comparison.orders_change >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>{Math.abs(stats.comparison.orders_change)}%</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-white">
                {stats.current.orders}
                <span className="text-sm font-normal text-gray-500 mr-1">طلب</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {stats.previous.label}: {stats.previous.orders} طلب
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="driver-card p-4">
            <h3 className="font-semibold mb-3 text-white">تفاصيل الطلبات</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <Utensils className="w-5 h-5 text-green-400" />
                  </div>
                  <span className="text-gray-300">طلبات الطعام</span>
                </div>
                <span className="font-semibold text-white">{stats.current.food_orders} طلب</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <ShoppingBag className="w-5 h-5 text-blue-400" />
                  </div>
                  <span className="text-gray-300">طلبات المنتجات</span>
                </div>
                <span className="font-semibold text-white">{stats.current.product_orders} طلب</span>
              </div>
              <div className="border-t border-[#333] pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">متوسط الربح لكل طلب</span>
                  <span className="font-semibold text-green-400">
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
                    ? 'bg-green-500 text-black'
                    : 'bg-[#252525] text-gray-400 border border-[#333] hover:border-green-500'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="driver-card p-4">
            <h3 className="font-semibold mb-4 text-white">الأرباح</h3>
            
            {/* Simple Bar Chart */}
            <div className="space-y-3">
              {chartData.data.map((item, index) => {
                const maxValue = chartData.summary.max_earnings || 1;
                const percentage = (item.earnings / maxValue) * 100;
                
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">{item.label}</span>
                      <span className="font-medium text-white">{formatNumber(item.earnings)} ل.س</span>
                    </div>
                    <div className="h-8 bg-[#1a1a1a] rounded-xl overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-l from-green-400 to-green-600 rounded-xl transition-all duration-500 flex items-center justify-end px-3"
                        style={{ width: `${Math.max(percentage, 5)}%` }}
                      >
                        {item.orders > 0 && (
                          <span className="text-black text-xs font-bold">
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
            <div className="mt-4 pt-4 border-t border-[#333] grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-green-400">
                  {formatNumber(chartData.summary.total_earnings)}
                </div>
                <div className="text-xs text-gray-500">إجمالي الأرباح</div>
              </div>
              <div>
                <div className="text-lg font-bold text-white">
                  {chartData.summary.total_orders}
                </div>
                <div className="text-xs text-gray-500">إجمالي الطلبات</div>
              </div>
              <div>
                <div className="text-lg font-bold text-yellow-400">
                  {chartData.summary.best_period}
                </div>
                <div className="text-xs text-gray-500">أفضل فترة</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          <div className="driver-card overflow-hidden">
            <div className="p-4 bg-[#1a1a1a] border-b border-[#333]">
              <h3 className="font-semibold text-white">سجل الأرباح</h3>
            </div>
            
            {history.length === 0 ? (
              <div className="p-8 text-center">
                <Package className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                <p className="text-gray-400">لا توجد طلبات مسلمة بعد</p>
              </div>
            ) : (
              <div className="divide-y divide-[#333]">
                {history.map((order, index) => (
                  <div key={index} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        order.type === 'food' ? 'bg-green-500/20' : 'bg-blue-500/20'
                      }`}>
                        {order.type === 'food' ? (
                          <Utensils className="w-6 h-6 text-green-400" />
                        ) : (
                          <ShoppingBag className="w-6 h-6 text-blue-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-white">
                          #{order.order_number}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.source} • {formatDate(order.delivered_at)}
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-green-400 text-lg">
                        +{formatNumber(order.earnings)} ل.س
                      </div>
                      <div className="text-xs text-gray-500">
                        الطلب: {formatNumber(order.order_total)} ل.س
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 bg-[#1a1a1a] border-t border-[#333] flex items-center justify-between">
                <button
                  onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                  disabled={historyPage === 1}
                  className="p-2 rounded-xl bg-[#252525] border border-[#333] disabled:opacity-50 text-white"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <span className="text-sm text-gray-400">
                  صفحة {historyPage} من {totalPages}
                </span>
                <button
                  onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                  disabled={historyPage === totalPages}
                  className="p-2 rounded-xl bg-[#252525] border border-[#333] disabled:opacity-50 text-white"
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
