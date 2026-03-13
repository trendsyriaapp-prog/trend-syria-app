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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header with tabs */}
      <div className="bg-gradient-to-l from-orange-500 to-orange-600 rounded-xl p-4 text-white">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-6 h-6" />
          <h2 className="text-lg font-bold">إحصائيات الأرباح</h2>
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
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-orange-600'
                  : 'bg-white/20 hover:bg-white/30'
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
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  period === p.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Main Stats Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Current Earnings */}
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500 text-sm">{stats.period_label}</span>
                <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                  stats.comparison.is_improvement
                    ? 'bg-green-100 text-green-600'
                    : 'bg-red-100 text-red-600'
                }`}>
                  {stats.comparison.is_improvement ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>{Math.abs(stats.comparison.earnings_change)}%</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {formatNumber(stats.current.earnings)}
                <span className="text-sm font-normal text-gray-500 mr-1">ل.س</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {stats.previous.label}: {formatNumber(stats.previous.earnings)} ل.س
              </div>
            </div>

            {/* Orders Count */}
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500 text-sm">عدد الطلبات</span>
                <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                  stats.comparison.orders_change >= 0
                    ? 'bg-green-100 text-green-600'
                    : 'bg-red-100 text-red-600'
                }`}>
                  {stats.comparison.orders_change >= 0 ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>{Math.abs(stats.comparison.orders_change)}%</span>
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.current.orders}
                <span className="text-sm font-normal text-gray-500 mr-1">طلب</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {stats.previous.label}: {stats.previous.orders} طلب
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <h3 className="font-semibold mb-3 text-gray-800">تفاصيل الطلبات</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Utensils className="w-4 h-4 text-orange-600" />
                  </div>
                  <span className="text-gray-700">طلبات الطعام</span>
                </div>
                <span className="font-semibold">{stats.current.food_orders} طلب</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <ShoppingBag className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-gray-700">طلبات المنتجات</span>
                </div>
                <span className="font-semibold">{stats.current.product_orders} طلب</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">متوسط الربح لكل طلب</span>
                  <span className="font-semibold text-orange-600">
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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  chartType === c.id
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Chart */}
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <h3 className="font-semibold mb-4 text-gray-800">الأرباح</h3>
            
            {/* Simple Bar Chart */}
            <div className="space-y-3">
              {chartData.data.map((item, index) => {
                const maxValue = chartData.summary.max_earnings || 1;
                const percentage = (item.earnings / maxValue) * 100;
                
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">{item.label}</span>
                      <span className="font-medium">{formatNumber(item.earnings)} ل.س</span>
                    </div>
                    <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-l from-orange-400 to-orange-500 rounded-full transition-all duration-500 flex items-center justify-end px-2"
                        style={{ width: `${Math.max(percentage, 5)}%` }}
                      >
                        {item.orders > 0 && (
                          <span className="text-white text-xs font-medium">
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
            <div className="mt-4 pt-4 border-t grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-gray-900">
                  {formatNumber(chartData.summary.total_earnings)}
                </div>
                <div className="text-xs text-gray-500">إجمالي الأرباح</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-900">
                  {chartData.summary.total_orders}
                </div>
                <div className="text-xs text-gray-500">إجمالي الطلبات</div>
              </div>
              <div>
                <div className="text-lg font-bold text-orange-600">
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
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="p-3 bg-gray-50 border-b">
              <h3 className="font-semibold text-gray-800">سجل الأرباح</h3>
            </div>
            
            {history.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>لا توجد طلبات مسلمة بعد</p>
              </div>
            ) : (
              <div className="divide-y">
                {history.map((order, index) => (
                  <div key={index} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        order.type === 'food' ? 'bg-orange-100' : 'bg-blue-100'
                      }`}>
                        {order.type === 'food' ? (
                          <Utensils className={`w-5 h-5 text-orange-600`} />
                        ) : (
                          <ShoppingBag className={`w-5 h-5 text-blue-600`} />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          #{order.order_number}
                        </div>
                        <div className="text-xs text-gray-500">
                          {order.source} • {formatDate(order.delivered_at)}
                        </div>
                      </div>
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-green-600">
                        +{formatNumber(order.earnings)} ل.س
                      </div>
                      <div className="text-xs text-gray-400">
                        الطلب: {formatNumber(order.order_total)} ل.س
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-3 bg-gray-50 border-t flex items-center justify-between">
                <button
                  onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                  disabled={historyPage === 1}
                  className="p-2 rounded-lg bg-white border disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600">
                  صفحة {historyPage} من {totalPages}
                </span>
                <button
                  onClick={() => setHistoryPage(p => Math.min(totalPages, p + 1))}
                  disabled={historyPage === totalPages}
                  className="p-2 rounded-lg bg-white border disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
