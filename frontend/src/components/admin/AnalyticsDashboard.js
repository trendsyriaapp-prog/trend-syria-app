// /app/frontend/src/components/admin/AnalyticsDashboard.js
// لوحة التحليلات والإحصائيات للمدير

import { useState, useEffect } from 'react';
import logger from '../../lib/logger';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  TrendingUp, Users, ShoppingBag, Package, DollarSign,
  Clock, ArrowUp, ArrowDown, RefreshCw, Truck, Store,
  Flame, Calendar, Award
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const AnalyticsDashboard = () => {
  const [stats, setStats] = useState(null);
  const [salesChart, setSalesChart] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [topSellers, setTopSellers] = useState([]);
  const [categoriesStats, setCategoriesStats] = useState([]);
  const [peakHours, setPeakHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChart, setActiveChart] = useState('sales');

  useEffect(() => {
    // التمرير للأعلى عند فتح الصفحة
    window.scrollTo(0, 0);
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [dashboardRes, salesRes, productsRes, sellersRes, categoriesRes, hoursRes] = await Promise.all([
        axios.get(`${API}/api/analytics/dashboard`),
        axios.get(`${API}/api/analytics/sales-chart?days=7`),
        axios.get(`${API}/api/analytics/top-products?limit=5`),
        axios.get(`${API}/api/analytics/top-sellers?limit=5`),
        axios.get(`${API}/api/analytics/categories-stats`),
        axios.get(`${API}/api/analytics/peak-hours`)
      ]);
      
      setStats(dashboardRes.data);
      setSalesChart(salesRes.data);
      setTopProducts(productsRes.data);
      setTopSellers(sellersRes.data);
      setCategoriesStats(categoriesRes.data);
      setPeakHours(hoursRes.data);
    } catch (error) {
      logger.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-SY').format(amount) + ' ل.س';
  };

  const COLORS = ['#FF6B00', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
            <TrendingUp className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">لوحة التحليلات</h2>
            <p className="text-sm text-gray-500">إحصائيات شاملة عن أداء المتجر</p>
          </div>
        </div>
        <button
          onClick={fetchAllData}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <RefreshCw size={18} />
          <span className="text-sm font-medium">تحديث</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {/* إجمالي الإيرادات */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg p-3 text-white"
        >
          <div className="flex items-center justify-between mb-2">
            <DollarSign size={24} className="opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">إجمالي</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats?.revenue?.total || 0)}</p>
          <p className="text-sm opacity-80">الإيرادات الكلية</p>
        </motion.div>

        {/* إيرادات اليوم */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg p-3 text-white"
        >
          <div className="flex items-center justify-between mb-2">
            <Calendar size={24} className="opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">اليوم</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(stats?.revenue?.today || 0)}</p>
          <p className="text-sm opacity-80">إيرادات اليوم</p>
        </motion.div>

        {/* الطلبات */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-orange-500 to-red-500 rounded-lg p-3 text-white"
        >
          <div className="flex items-center justify-between mb-2">
            <ShoppingBag size={24} className="opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">{stats?.orders?.today || 0} اليوم</span>
          </div>
          <p className="text-2xl font-bold">{stats?.orders?.total || 0}</p>
          <p className="text-sm opacity-80">إجمالي الطلبات</p>
        </motion.div>

        {/* المستخدمين */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg p-3 text-white"
        >
          <div className="flex items-center justify-between mb-2">
            <Users size={24} className="opacity-80" />
            <span className="text-xs bg-white/20 px-2 py-1 rounded-full">+{stats?.users?.new_today || 0} اليوم</span>
          </div>
          <p className="text-2xl font-bold">{stats?.users?.total || 0}</p>
          <p className="text-sm opacity-80">إجمالي المستخدمين</p>
        </motion.div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
          <Users size={20} className="mx-auto text-blue-500 mb-1" />
          <p className="text-sm font-bold text-gray-900">{stats?.users?.customers || 0}</p>
          <p className="text-xs text-gray-500">عملاء</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
          <Store size={20} className="mx-auto text-green-500 mb-1" />
          <p className="text-sm font-bold text-gray-900">{stats?.users?.sellers || 0}</p>
          <p className="text-xs text-gray-500">بائعين</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
          <Truck size={20} className="mx-auto text-orange-500 mb-1" />
          <p className="text-sm font-bold text-gray-900">{stats?.users?.delivery || 0}</p>
          <p className="text-xs text-gray-500">سائقين</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
          <Package size={20} className="mx-auto text-purple-500 mb-1" />
          <p className="text-sm font-bold text-gray-900">{stats?.products?.total || 0}</p>
          <p className="text-xs text-gray-500">منتجات</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
          <Clock size={20} className="mx-auto text-yellow-500 mb-1" />
          <p className="text-sm font-bold text-gray-900">{stats?.orders?.pending || 0}</p>
          <p className="text-xs text-gray-500">طلبات معلقة</p>
        </div>
        <div className="bg-white rounded-lg p-3 border border-gray-100 text-center">
          <Flame size={20} className="mx-auto text-red-500 mb-1" />
          <p className="text-sm font-bold text-gray-900">{stats?.food_orders?.today || 0}</p>
          <p className="text-xs text-gray-500">طلبات طعام</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="bg-white rounded-lg border border-gray-100 p-4">
        {/* Chart Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {[
            { id: 'sales', label: 'المبيعات', icon: TrendingUp },
            { id: 'categories', label: 'الفئات', icon: Package },
            { id: 'hours', label: 'أوقات الذروة', icon: Clock },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveChart(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeChart === tab.id
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sales Chart */}
        {activeChart === 'sales' && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day_name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'revenue' ? formatCurrency(value) : value,
                    name === 'revenue' ? 'الإيرادات' : 'الطلبات'
                  ]}
                  labelFormatter={(label) => `يوم ${label}`}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="orders" 
                  stroke="#FF6B00" 
                  strokeWidth={3}
                  name="الطلبات"
                  dot={{ fill: '#FF6B00' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Categories Chart */}
        {activeChart === 'categories' && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoriesStats.slice(0, 6)}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="products_count"
                  nameKey="category_name"
                  label={({ category_name, percent }) => `${category_name} ${(percent * 100).toFixed(0)}%`}
                >
                  {categoriesStats.slice(0, 6).map((entry, index) => (
                    <Cell key={`cell-${entry.category_name || entry.category_id}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} منتج`, 'العدد']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Peak Hours Chart */}
        {activeChart === 'hours' && (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHours}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="hour_label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [`${value} طلب`, 'الطلبات']} />
                <Bar dataKey="orders" fill="#FF6B00" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Top Products & Sellers */}
      <div className="grid md:grid-cols-2 gap-2">
        {/* Top Products */}
        <div className="bg-white rounded-lg border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Award className="text-orange-500" size={20} />
            <h3 className="font-bold text-gray-900">أكثر المنتجات مبيعاً</h3>
          </div>
          <div className="space-y-3">
            {topProducts.map((product, index) => (
              <div key={product.id} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0 ? 'bg-yellow-100 text-yellow-700' :
                  index === 1 ? 'bg-gray-100 text-gray-700' :
                  index === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-50 text-gray-500'
                }`}>
                  {index + 1}
                </span>
                <img 
                  src={product.images?.[0] || '/placeholder.svg'} 
                  alt={product.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate text-sm">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.sales_count || 0} مبيعات</p>
                </div>
                <p className="text-sm font-bold text-orange-500">{formatCurrency(product.price)}</p>
              </div>
            ))}
            {topProducts.length === 0 && (
              <p className="text-center text-gray-500 py-4">لا توجد بيانات</p>
            )}
          </div>
        </div>

        {/* Top Sellers */}
        <div className="bg-white rounded-lg border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Store className="text-green-500" size={20} />
            <h3 className="font-bold text-gray-900">أفضل البائعين</h3>
          </div>
          <div className="space-y-3">
            {topSellers.map((seller, index) => (
              <div key={seller.id} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0 ? 'bg-yellow-100 text-yellow-700' :
                  index === 1 ? 'bg-gray-100 text-gray-700' :
                  index === 2 ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-50 text-gray-500'
                }`}>
                  {index + 1}
                </span>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold">
                  {(seller.business_name || seller.full_name || '?')[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate text-sm">
                    {seller.business_name || seller.full_name}
                  </p>
                  <p className="text-xs text-gray-500">{seller.orders_count || 0} طلبات</p>
                </div>
                <p className="text-sm font-bold text-green-600">{formatCurrency(seller.total_sales)}</p>
              </div>
            ))}
            {topSellers.length === 0 && (
              <p className="text-center text-gray-500 py-4">لا توجد بيانات</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
