// /app/frontend/src/components/seller/SellerAnalytics.js
// لوحة تحليلات مفصلة للبائع

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingBag,
  Star, Clock, Package, RefreshCw, BarChart3,
  ArrowUp, ArrowDown, Calendar, Users, Download, FileSpreadsheet, FileText
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ar-SY').format(amount) + ' ل.س';
};

const SellerAnalytics = ({ token }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState('week');
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/analytics/seller-dashboard?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  // تصدير التقارير
  const handleExport = async (type, format) => {
    setExporting(`${type}-${format}`);
    try {
      const daysMap = { today: 1, week: 7, month: 30, all: 365 };
      const days = daysMap[period] || 30;
      
      let endpoint = '';
      if (type === 'sales') {
        endpoint = format === 'excel' ? `/api/reports/sales/excel?days=${days}` : `/api/reports/sales/pdf?days=${days}`;
      } else if (type === 'products') {
        endpoint = `/api/reports/products/excel`;
      } else if (type === 'analytics') {
        endpoint = `/api/reports/analytics/excel?days=${days}`;
      }
      
      const response = await axios.get(`${API}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });
      
      // تحميل الملف
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_report_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Export error:', err);
      alert('فشل تصدير التقرير');
    } finally {
      setExporting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw size={32} className="text-green-500 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-gray-500">
        <BarChart3 size={48} className="mx-auto mb-3 text-gray-300" />
        <p>لا توجد بيانات متاحة</p>
      </div>
    );
  }

  const { orders, revenue, products, ratings, chart, peak_hours } = data;

  return (
    <div className="space-y-4 pb-20" data-testid="seller-analytics">
      {/* فلتر الفترة */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
        {[
          { id: 'today', label: 'اليوم' },
          { id: 'week', label: 'الأسبوع' },
          { id: 'month', label: 'الشهر' },
          { id: 'all', label: 'الكل' }
        ].map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              period === p.id
                ? 'bg-white text-green-600 shadow-sm'
                : 'text-gray-600'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* أزرار تصدير التقارير */}
      <div className="bg-white rounded-xl p-3 border border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <Download size={16} className="text-gray-600" />
          <span className="text-xs font-bold text-gray-700">تصدير التقارير</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleExport('sales', 'excel')}
            disabled={exporting}
            className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-100 disabled:opacity-50"
            data-testid="export-sales-excel"
          >
            <FileSpreadsheet size={14} />
            {exporting === 'sales-excel' ? 'جاري...' : 'مبيعات Excel'}
          </button>
          <button
            onClick={() => handleExport('sales', 'pdf')}
            disabled={exporting}
            className="flex items-center gap-1.5 bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-red-100 disabled:opacity-50"
            data-testid="export-sales-pdf"
          >
            <FileText size={14} />
            {exporting === 'sales-pdf' ? 'جاري...' : 'مبيعات PDF'}
          </button>
          <button
            onClick={() => handleExport('products', 'excel')}
            disabled={exporting}
            className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-100 disabled:opacity-50"
            data-testid="export-products-excel"
          >
            <Package size={14} />
            {exporting === 'products-excel' ? 'جاري...' : 'المنتجات'}
          </button>
          <button
            onClick={() => handleExport('analytics', 'excel')}
            disabled={exporting}
            className="flex items-center gap-1.5 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-purple-100 disabled:opacity-50"
            data-testid="export-analytics-excel"
          >
            <BarChart3 size={14} />
            {exporting === 'analytics-excel' ? 'جاري...' : 'تقرير شامل'}
          </button>
        </div>
      </div>

      {/* إحصائيات رئيسية */}
      <div className="grid grid-cols-2 gap-3">
        {/* إجمالي الإيرادات */}
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <DollarSign size={24} />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
              {period === 'today' ? 'اليوم' : period === 'week' ? 'الأسبوع' : period === 'month' ? 'الشهر' : 'الكل'}
            </span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(revenue?.total || 0)}</p>
          <p className="text-xs opacity-80">إجمالي المبيعات</p>
        </div>

        {/* صافي الأرباح */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 text-white">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp size={24} />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
              بعد العمولة
            </span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(revenue?.net_earnings || 0)}</p>
          <p className="text-xs opacity-80">صافي أرباحك</p>
        </div>

        {/* عدد الطلبات */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBag size={20} className="text-orange-500" />
            <span className="text-sm font-medium text-gray-600">الطلبات</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{orders?.total || 0}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-green-600 flex items-center gap-1">
              <ArrowUp size={12} />
              {orders?.completed || 0} مكتمل
            </span>
            <span className="text-xs text-red-500 flex items-center gap-1">
              <ArrowDown size={12} />
              {orders?.cancelled || 0} ملغي
            </span>
          </div>
        </div>

        {/* التقييم */}
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Star size={20} className="text-yellow-500" />
            <span className="text-sm font-medium text-gray-600">التقييم</span>
          </div>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-bold text-gray-900">{ratings?.average || 0}</p>
            <span className="text-sm text-gray-500">/ 5</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">{ratings?.total || 0} تقييم</p>
        </div>
      </div>

      {/* متوسط قيمة الطلب */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">متوسط قيمة الطلب</p>
            <p className="text-xl font-bold text-purple-700">{formatCurrency(revenue?.avg_order_value || 0)}</p>
          </div>
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <BarChart3 size={24} className="text-purple-600" />
          </div>
        </div>
      </div>

      {/* الرسم البياني */}
      {chart && chart.length > 0 && (
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-green-500" />
            المبيعات خلال آخر 7 أيام
          </h3>
          <div className="space-y-3">
            {chart.map((day, index) => {
              const maxRevenue = Math.max(...chart.map(d => d.revenue)) || 1;
              const percentage = (day.revenue / maxRevenue) * 100;
              
              return (
                <div key={index} className="flex items-center gap-3">
                  <span className="w-16 text-xs text-gray-500 text-left">
                    {day.day_name}
                  </span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="w-24 text-left">
                    <span className="text-xs font-medium text-gray-900">
                      {formatCurrency(day.revenue)}
                    </span>
                    <span className="text-xs text-gray-400 mr-1">
                      ({day.orders})
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* المنتجات الأكثر مبيعاً */}
      {products?.top_selling && products.top_selling.length > 0 && (
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Package size={20} className="text-orange-500" />
            المنتجات الأكثر مبيعاً
          </h3>
          <div className="space-y-3">
            {products.top_selling.map((product, index) => (
              <div key={product.id} className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 ? 'bg-yellow-100 text-yellow-700' :
                  index === 1 ? 'bg-gray-100 text-gray-700' :
                  index === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-50 text-gray-500'
                }`}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.sold} مبيعة</p>
                </div>
                <span className="text-sm font-bold text-green-600">
                  {formatCurrency(product.revenue)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* توزيع التقييمات */}
      {ratings && (
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Star size={20} className="text-yellow-500" />
            توزيع التقييمات
          </h3>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = ratings.distribution?.[star] || 0;
              const total = ratings.total || 1;
              const percentage = (count / total) * 100;
              
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="w-12 text-sm text-gray-600 flex items-center gap-1">
                    {star} <Star size={12} className="text-yellow-500 fill-yellow-500" />
                  </span>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-8 text-xs text-gray-500 text-left">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ساعات الذروة */}
      {peak_hours && peak_hours.length > 0 && (
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Clock size={20} className="text-blue-500" />
            ساعات الذروة
          </h3>
          <div className="flex flex-wrap gap-2">
            {peak_hours.map((hour, index) => (
              <div
                key={index}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  index === 0 ? 'bg-blue-500 text-white' :
                  index === 1 ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-600'
                }`}
              >
                {hour.hour}
                <span className="opacity-70 mr-1">({hour.orders})</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            هذه أوقات الذروة لمتجرك - تأكد من جاهزيتك خلالها!
          </p>
        </div>
      )}

    </div>
  );
};

export default SellerAnalytics;
