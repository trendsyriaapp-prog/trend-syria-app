// /app/frontend/src/components/seller/SellerAdAnalytics.js
// تقارير أداء إعلانات البائع + تصدير التقارير

import { useState, useEffect } from 'react';
import logger from '../../lib/logger';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  TrendingUp, Eye, MousePointer, DollarSign, Award, 
  BarChart3, PieChart as PieChartIcon, Activity, ArrowUp, ArrowDown,
  Download, FileSpreadsheet, FileText, Package
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const COLORS = ['#FF6B00', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

const SellerAdAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);
  
  useEffect(() => {
    fetchAnalytics();
  }, []);
  
  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(`${API}/api/ads/my-analytics`);
      setAnalytics(res.data);
    } catch (error) {
      logger.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // تصدير التقارير
  const handleExport = async (type, format) => {
    setExporting(`${type}-${format}`);
    try {
      let endpoint = '';
      if (type === 'sales') {
        endpoint = format === 'excel' ? `/api/reports/sales/excel?days=30` : `/api/reports/sales/pdf?days=30`;
      } else if (type === 'products') {
        endpoint = `/api/reports/products/excel`;
      } else if (type === 'analytics') {
        endpoint = `/api/reports/analytics/excel?days=30`;
      }
      
      const response = await axios.get(`${API}${endpoint}`, {
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
      logger.error('Export error:', err);
      alert('فشل تصدير التقرير');
    } finally {
      setExporting(null);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }
  
  if (!analytics || analytics.summary.total_ads === 0) {
    return (
      <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
        <BarChart3 size={40} className="text-gray-300 mx-auto mb-3" />
        <h3 className="font-bold text-gray-700 mb-1">لا توجد بيانات</h3>
        <p className="text-gray-500 text-sm">أنشئ إعلانات لتتمكن من رؤية تقارير الأداء</p>
      </div>
    );
  }
  
  const { summary, type_chart_data, recent_ads_data, best_ad } = analytics;
  
  return (
    <section className="space-y-4" data-testid="seller-ad-analytics">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Activity size={20} className="text-[#FF6B00]" />
        <h2 className="font-bold text-gray-900">تقارير أداء الإعلانات</h2>
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
      
      {/* Summary Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {[
          { icon: BarChart3, label: 'إجمالي الإعلانات', value: summary.total_ads, color: 'bg-blue-50 text-blue-600' },
          { icon: TrendingUp, label: 'نشط الآن', value: summary.active_ads, color: 'bg-green-50 text-green-600' },
          { icon: Eye, label: 'المشاهدات', value: summary.total_views.toLocaleString(), color: 'bg-purple-50 text-purple-600' },
          { icon: MousePointer, label: 'النقرات', value: summary.total_clicks.toLocaleString(), color: 'bg-orange-50 text-orange-600' },
          { icon: Activity, label: 'معدل التحويل', value: `${summary.ctr}%`, color: 'bg-cyan-50 text-cyan-600', highlight: summary.ctr > 2 },
          { icon: DollarSign, label: 'المصروف', value: formatPrice(summary.total_spent), color: 'bg-red-50 text-red-600' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`bg-white rounded-xl p-2.5 border ${stat.highlight ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}
          >
            <div className={`w-6 h-6 rounded-lg ${stat.color} flex items-center justify-center mb-1`}>
              <stat.icon size={12} />
            </div>
            <p className="text-sm font-bold text-gray-900">{stat.value}</p>
            <p className="text-[9px] text-gray-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>
      
      {/* Best Performing Ad */}
      {best_ad && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-l from-yellow-50 to-orange-50 rounded-xl p-3 border border-yellow-200"
        >
          <div className="flex items-center gap-2 mb-2">
            <Award size={16} className="text-yellow-600" />
            <span className="text-xs font-bold text-yellow-700">أفضل إعلان أداءً</span>
          </div>
          <div className="flex items-center gap-3">
            <img 
              src={best_ad.product_image || '/placeholder.svg'} 
              alt={best_ad.product_name}
              className="w-12 h-12 rounded-lg object-cover"
            />
            <div className="flex-1">
              <h4 className="font-bold text-sm text-gray-900 truncate">{best_ad.product_name}</h4>
              <div className="flex items-center gap-4 text-[10px] text-gray-600 mt-1">
                <span className="flex items-center gap-1">
                  <Eye size={10} />
                  {best_ad.views} مشاهدة
                </span>
                <span className="flex items-center gap-1">
                  <MousePointer size={10} />
                  {best_ad.clicks} نقرة
                </span>
                <span className="flex items-center gap-1 text-green-600 font-bold">
                  <ArrowUp size={10} />
                  {best_ad.ctr}% CTR
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Performance by Ad Type */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <PieChartIcon size={16} className="text-[#FF6B00]" />
            <h3 className="text-sm font-bold text-gray-900">الأداء حسب نوع الإعلان</h3>
          </div>
          {type_chart_data.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={type_chart_data}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="views"
                  nameKey="name"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {type_chart_data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value, name) => [value.toLocaleString(), name]}
                  contentStyle={{ direction: 'rtl', textAlign: 'right' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
              لا توجد بيانات كافية
            </div>
          )}
          
          {/* Type Legend */}
          <div className="flex flex-wrap gap-2 mt-2 justify-center">
            {type_chart_data.map((item, i) => (
              <div key={i} className="flex items-center gap-1 text-[10px]">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span>{item.name}: {item.views} مشاهدة</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Views vs Clicks Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={16} className="text-[#FF6B00]" />
            <h3 className="text-sm font-bold text-gray-900">المشاهدات والنقرات</h3>
          </div>
          {type_chart_data.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={type_chart_data} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={60} />
                <Tooltip 
                  formatter={(value) => value.toLocaleString()}
                  contentStyle={{ direction: 'rtl', textAlign: 'right', fontSize: 11 }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="views" name="المشاهدات" fill="#3B82F6" radius={[0, 4, 4, 0]} />
                <Bar dataKey="clicks" name="النقرات" fill="#FF6B00" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
              لا توجد بيانات كافية
            </div>
          )}
        </div>
      </div>
      
      {/* Recent Ads Performance */}
      {recent_ads_data.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-[#FF6B00]" />
            <h3 className="text-sm font-bold text-gray-900">أداء آخر الإعلانات</h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={recent_ads_data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'ctr') return [`${value}%`, 'معدل التحويل'];
                  return [value.toLocaleString(), name === 'views' ? 'المشاهدات' : 'النقرات'];
                }}
                contentStyle={{ direction: 'rtl', textAlign: 'right', fontSize: 11 }}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="views" name="المشاهدات" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="clicks" name="النقرات" fill="#FF6B00" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      
      {/* CTR by Type */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={16} className="text-[#FF6B00]" />
          <h3 className="text-sm font-bold text-gray-900">معدل التحويل (CTR) حسب النوع</h3>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {type_chart_data.map((item, i) => {
            const isGood = item.ctr > 2;
            const isGreat = item.ctr > 5;
            return (
              <div 
                key={i} 
                className={`p-3 rounded-xl border ${isGreat ? 'border-green-300 bg-green-50' : isGood ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-700">{item.name}</span>
                  {isGreat ? (
                    <ArrowUp size={14} className="text-green-500" />
                  ) : isGood ? (
                    <ArrowUp size={14} className="text-blue-500" />
                  ) : (
                    <ArrowDown size={14} className="text-gray-400" />
                  )}
                </div>
                <p className={`text-xl font-bold ${isGreat ? 'text-green-600' : isGood ? 'text-blue-600' : 'text-gray-700'}`}>
                  {item.ctr}%
                </p>
                <p className="text-[10px] text-gray-500 mt-1">
                  {item.clicks} نقرة من {item.views} مشاهدة
                </p>
              </div>
            );
          })}
        </div>
        
        {/* CTR Tips */}
        <div className="mt-3 p-2 bg-gray-50 rounded-lg">
          <p className="text-[10px] text-gray-600">
            <span className="font-bold">💡 نصيحة:</span> معدل التحويل الجيد هو أعلى من 2%. إذا كان أقل، جرب تحسين صورة المنتج أو العنوان.
          </p>
        </div>
      </div>
    </section>
  );
};

export default SellerAdAnalytics;
