// /app/frontend/src/pages/AdminHomePage.js
// الصفحة الرئيسية للأدمن

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Users, Package, ShoppingBag, DollarSign, Truck, Store,
  AlertCircle, CheckCircle, Clock, TrendingUp, Settings,
  Bell, FileText, BarChart3, Shield, ChevronLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../utils/imageHelpers';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminHomePage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalSellers: 0,
    totalOrders: 0,
    todayOrders: 0,
    todayRevenue: 0,
    pendingSellers: 0,
    pendingProducts: 0,
    pendingDelivery: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, ordersRes, pendingSellersRes, pendingProductsRes, pendingDeliveryRes] = await Promise.all([
        axios.get(`${API}/admin/stats`).catch(() => ({ data: {} })),
        axios.get(`${API}/admin/orders?limit=5`).catch(() => ({ data: [] })),
        axios.get(`${API}/admin/sellers/pending`).catch(() => ({ data: [] })),
        axios.get(`${API}/admin/products/pending`).catch(() => ({ data: [] })),
        axios.get(`${API}/admin/delivery/pending`).catch(() => ({ data: [] }))
      ]);
      
      setStats({
        totalUsers: statsRes.data.total_users || 0,
        totalSellers: statsRes.data.total_sellers || 0,
        totalOrders: statsRes.data.total_orders || 0,
        todayOrders: statsRes.data.today_orders || 0,
        todayRevenue: statsRes.data.today_revenue || 0,
        pendingSellers: pendingSellersRes.data?.length || 0,
        pendingProducts: pendingProductsRes.data?.length || 0,
        pendingDelivery: pendingDeliveryRes.data?.length || 0
      });
      setRecentOrders(ordersRes.data || []);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPending = stats.pendingSellers + stats.pendingProducts + stats.pendingDelivery;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#FF6B00] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-400 text-sm">لوحة التحكم</p>
              <h1 className="text-xl font-bold">مرحباً {user?.full_name}</h1>
            </div>
            <div className="flex items-center gap-2">
              {totalPending > 0 && (
                <div className="relative">
                  <Bell size={24} className="text-yellow-400" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {totalPending}
                  </span>
                </div>
              )}
              <Link to="/admin" className="bg-white/10 p-2 rounded-lg hover:bg-white/20 transition-colors">
                <Settings size={20} />
              </Link>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <ShoppingBag size={20} className="mx-auto mb-1 text-blue-400" />
              <p className="text-lg font-bold">{stats.todayOrders}</p>
              <p className="text-[10px] text-gray-400">طلبات اليوم</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <DollarSign size={20} className="mx-auto mb-1 text-green-400" />
              <p className="text-lg font-bold">{formatPrice(stats.todayRevenue)}</p>
              <p className="text-[10px] text-gray-400">إيرادات اليوم</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <Users size={20} className="mx-auto mb-1 text-purple-400" />
              <p className="text-lg font-bold">{stats.totalUsers}</p>
              <p className="text-[10px] text-gray-400">إجمالي المستخدمين</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Pending Approvals Alert */}
        {totalPending > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6"
          >
            <div className="flex items-center gap-3">
              <AlertCircle size={24} className="text-yellow-600" />
              <div className="flex-1">
                <h3 className="font-bold text-yellow-800">تنبيهات تحتاج انتباهك</h3>
                <div className="flex flex-wrap gap-3 mt-2 text-sm">
                  {stats.pendingSellers > 0 && (
                    <Link to="/admin?tab=pending-sellers" className="text-yellow-700 hover:underline">
                      {stats.pendingSellers} بائع بانتظار الموافقة
                    </Link>
                  )}
                  {stats.pendingProducts > 0 && (
                    <Link to="/admin?tab=pending-products" className="text-yellow-700 hover:underline">
                      {stats.pendingProducts} منتج معلق
                    </Link>
                  )}
                  {stats.pendingDelivery > 0 && (
                    <Link to="/admin?tab=pending-delivery" className="text-yellow-700 hover:underline">
                      {stats.pendingDelivery} موظف توصيل بانتظار الموافقة
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats Cards */}
        <section className="mb-6">
          <h2 className="font-bold text-gray-900 mb-3">إحصائيات عامة</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs">إجمالي الطلبات</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Package size={24} className="text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs">البائعين</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalSellers}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Store size={24} className="text-green-600" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="mb-6">
          <h2 className="font-bold text-gray-900 mb-3">إجراءات سريعة</h2>
          <div className="grid grid-cols-3 gap-3">
            <Link to="/admin?tab=pending-sellers">
              <div className="bg-white rounded-xl p-4 border border-gray-200 text-center hover:border-[#FF6B00] transition-colors relative">
                <Store size={24} className="text-blue-500 mx-auto mb-2" />
                <p className="font-medium text-gray-900 text-xs">البائعين المعلقين</p>
                {stats.pendingSellers > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {stats.pendingSellers}
                  </span>
                )}
              </div>
            </Link>
            <Link to="/admin?tab=pending-products">
              <div className="bg-white rounded-xl p-4 border border-gray-200 text-center hover:border-[#FF6B00] transition-colors relative">
                <Package size={24} className="text-purple-500 mx-auto mb-2" />
                <p className="font-medium text-gray-900 text-xs">المنتجات المعلقة</p>
                {stats.pendingProducts > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {stats.pendingProducts}
                  </span>
                )}
              </div>
            </Link>
            <Link to="/admin?tab=pending-delivery">
              <div className="bg-white rounded-xl p-4 border border-gray-200 text-center hover:border-[#FF6B00] transition-colors relative">
                <Truck size={24} className="text-green-500 mx-auto mb-2" />
                <p className="font-medium text-gray-900 text-xs">موظفي التوصيل</p>
                {stats.pendingDelivery > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {stats.pendingDelivery}
                  </span>
                )}
              </div>
            </Link>
          </div>
        </section>

        {/* More Actions */}
        <section className="mb-6">
          <div className="grid grid-cols-2 gap-3">
            <Link to="/admin?tab=orders">
              <div className="bg-white rounded-xl p-4 border border-gray-200 flex items-center gap-3 hover:border-[#FF6B00] transition-colors">
                <ShoppingBag size={20} className="text-[#FF6B00]" />
                <span className="font-medium text-gray-900 text-sm">إدارة الطلبات</span>
              </div>
            </Link>
            <Link to="/admin?tab=users">
              <div className="bg-white rounded-xl p-4 border border-gray-200 flex items-center gap-3 hover:border-[#FF6B00] transition-colors">
                <Users size={20} className="text-[#FF6B00]" />
                <span className="font-medium text-gray-900 text-sm">إدارة المستخدمين</span>
              </div>
            </Link>
            <Link to="/admin?tab=reports">
              <div className="bg-white rounded-xl p-4 border border-gray-200 flex items-center gap-3 hover:border-[#FF6B00] transition-colors">
                <BarChart3 size={20} className="text-[#FF6B00]" />
                <span className="font-medium text-gray-900 text-sm">التقارير</span>
              </div>
            </Link>
            <Link to="/admin?tab=settings">
              <div className="bg-white rounded-xl p-4 border border-gray-200 flex items-center gap-3 hover:border-[#FF6B00] transition-colors">
                <Settings size={20} className="text-[#FF6B00]" />
                <span className="font-medium text-gray-900 text-sm">الإعدادات</span>
              </div>
            </Link>
          </div>
        </section>

        {/* Browse as Customer */}
        <Link to="/?view=customer">
          <div className="bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] rounded-xl p-4 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingBag size={24} />
              <div>
                <p className="font-bold">تصفح كعميل</p>
                <p className="text-xs text-orange-100">شاهد التطبيق كما يراه العملاء</p>
              </div>
            </div>
            <ChevronLeft size={20} />
          </div>
        </Link>
      </div>
    </div>
  );
};

export default AdminHomePage;
