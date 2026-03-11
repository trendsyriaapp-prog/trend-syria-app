// /app/frontend/src/pages/AdminHomePage.js
// الصفحة الرئيسية للأدمن

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, Package, ShoppingBag, DollarSign, Truck, Store,
  AlertCircle, Clock, Settings, Bell, BarChart3, ChevronLeft
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, pendingSellersRes, pendingProductsRes, pendingDeliveryRes] = await Promise.all([
        axios.get(`${API}/admin/stats`).catch(() => ({ data: {} })),
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
        <div className="animate-spin w-6 h-6 border-3 border-gray-800 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header مصغر */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-3 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-gray-400 text-[10px]">لوحة التحكم</p>
            <h1 className="text-base font-bold">{user?.full_name}</h1>
          </div>
          <div className="flex items-center gap-2">
            {totalPending > 0 && (
              <div className="relative">
                <Bell size={18} className="text-yellow-400" />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center">
                  {totalPending}
                </span>
              </div>
            )}
            <Link to="/admin" className="bg-white/10 p-1.5 rounded-lg">
              <Settings size={14} />
            </Link>
          </div>
        </div>
        
        {/* Stats مصغرة */}
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { icon: ShoppingBag, value: stats.todayOrders, label: 'طلبات اليوم', color: 'text-blue-400' },
            { icon: DollarSign, value: formatPrice(stats.todayRevenue), label: 'الإيرادات', color: 'text-green-400' },
            { icon: Users, value: stats.totalUsers, label: 'المستخدمين', color: 'text-purple-400' }
          ].map((item, i) => (
            <div key={i} className="bg-white/10 rounded-lg p-2 text-center">
              <item.icon size={12} className={`mx-auto mb-0.5 ${item.color}`} />
              <p className="text-sm font-bold">{item.value}</p>
              <p className="text-[8px] text-gray-400">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-3 py-3">
        {/* تنبيهات */}
        {totalPending > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-yellow-600" />
              <span className="font-bold text-yellow-800 text-xs">تنبيهات تحتاج انتباهك</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {stats.pendingSellers > 0 && (
                <Link to="/admin?tab=pending-sellers" className="text-[10px] text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                  {stats.pendingSellers} بائع معلق
                </Link>
              )}
              {stats.pendingProducts > 0 && (
                <Link to="/admin?tab=pending-products" className="text-[10px] text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                  {stats.pendingProducts} منتج معلق
                </Link>
              )}
              {stats.pendingDelivery > 0 && (
                <Link to="/admin?tab=pending-delivery" className="text-[10px] text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
                  {stats.pendingDelivery} موظف معلق
                </Link>
              )}
            </div>
          </div>
        )}

        {/* إحصائيات */}
        <section className="mb-4">
          <h2 className="font-bold text-gray-900 text-sm mb-2">إحصائيات</h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-lg p-3 border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-[10px]">الطلبات</p>
                  <p className="text-xl font-bold">{stats.totalOrders}</p>
                </div>
                <Package size={20} className="text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-[10px]">البائعين</p>
                  <p className="text-xl font-bold">{stats.totalSellers}</p>
                </div>
                <Store size={20} className="text-green-500" />
              </div>
            </div>
          </div>
        </section>

        {/* إجراءات سريعة */}
        <section className="mb-4">
          <h2 className="font-bold text-gray-900 text-sm mb-2">إجراءات سريعة</h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { to: '/admin?tab=pending-sellers', icon: Store, label: 'البائعين', count: stats.pendingSellers, color: 'text-blue-500' },
              { to: '/admin?tab=pending-products', icon: Package, label: 'المنتجات', count: stats.pendingProducts, color: 'text-purple-500' },
              { to: '/admin?tab=pending-delivery', icon: Truck, label: 'التوصيل', count: stats.pendingDelivery, color: 'text-green-500' }
            ].map((item, i) => (
              <Link key={i} to={item.to}>
                <div className="bg-white rounded-lg p-3 border text-center hover:border-gray-400 transition-colors relative">
                  <item.icon size={16} className={`${item.color} mx-auto mb-1`} />
                  <p className="text-[9px] text-gray-700 font-medium">{item.label}</p>
                  {item.count > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center">
                      {item.count}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* المزيد */}
        <section className="mb-4">
          <div className="grid grid-cols-2 gap-2">
            {[
              { to: '/admin?tab=orders', icon: ShoppingBag, label: 'الطلبات' },
              { to: '/admin?tab=users', icon: Users, label: 'المستخدمين' },
              { to: '/admin?tab=reports', icon: BarChart3, label: 'التقارير' },
              { to: '/admin?tab=settings', icon: Settings, label: 'الإعدادات' }
            ].map((item, i) => (
              <Link key={i} to={item.to}>
                <div className="bg-white rounded-lg p-3 border flex items-center gap-2 hover:border-gray-400 transition-colors">
                  <item.icon size={14} className="text-gray-600" />
                  <span className="text-xs font-medium text-gray-700">{item.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* تصفح كعميل */}
        <Link to="/?view=customer">
          <div className="bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] rounded-lg p-3 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag size={16} />
              <div>
                <p className="font-bold text-sm">تصفح كعميل</p>
                <p className="text-[9px] text-orange-100">شاهد التطبيق كما يراه العملاء</p>
              </div>
            </div>
            <ChevronLeft size={16} />
          </div>
        </Link>
      </div>
    </div>
  );
};

export default AdminHomePage;
