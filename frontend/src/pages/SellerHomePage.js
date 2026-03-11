// /app/frontend/src/pages/SellerHomePage.js
// الصفحة الرئيسية للبائع

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Package, DollarSign, ShoppingBag, TrendingUp, Plus,
  Clock, AlertCircle, Star, Wallet, BarChart3,
  Megaphone, Gift, ChevronLeft, Eye
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../utils/imageHelpers';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SellerHomePage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    todaySales: 0,
    todayOrders: 0,
    totalProducts: 0,
    pendingOrders: 0,
    walletBalance: 0,
    rating: 0,
    totalViews: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, ordersRes] = await Promise.all([
        axios.get(`${API}/seller/stats`).catch(() => ({ data: {} })),
        axios.get(`${API}/seller/orders?status=pending&limit=5`).catch(() => ({ data: [] }))
      ]);
      
      setStats({
        todaySales: statsRes.data.today_sales || 0,
        todayOrders: statsRes.data.today_orders || 0,
        totalProducts: statsRes.data.total_products || 0,
        pendingOrders: statsRes.data.pending_orders || 0,
        walletBalance: statsRes.data.wallet_balance || 0,
        rating: statsRes.data.rating || 0,
        totalViews: statsRes.data.total_views || 0
      });
      setRecentOrders(ordersRes.data || []);
    } catch (error) {
      console.error('Error fetching seller data:', error);
    } finally {
      setLoading(false);
    }
  };

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
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-purple-200 text-sm">متجرك</p>
              <h1 className="text-xl font-bold">{user?.business_name || user?.full_name}</h1>
            </div>
            <Link 
              to="/seller/dashboard?tab=add-product"
              className="bg-white text-purple-600 px-4 py-2 rounded-full font-bold text-sm flex items-center gap-1"
            >
              <Plus size={16} />
              منتج جديد
            </Link>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <DollarSign size={20} className="mx-auto mb-1" />
              <p className="text-lg font-bold">{formatPrice(stats.todaySales)}</p>
              <p className="text-[10px] text-purple-200">مبيعات اليوم</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <ShoppingBag size={20} className="mx-auto mb-1" />
              <p className="text-lg font-bold">{stats.todayOrders}</p>
              <p className="text-[10px] text-purple-200">طلبات اليوم</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <Star size={20} className="mx-auto mb-1" />
              <p className="text-lg font-bold">{stats.rating.toFixed(1)}</p>
              <p className="text-[10px] text-purple-200">التقييم</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <Wallet size={20} className="mx-auto mb-1" />
              <p className="text-lg font-bold">{formatPrice(stats.walletBalance)}</p>
              <p className="text-[10px] text-purple-200">المحفظة</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Pending Orders Alert */}
        {stats.pendingOrders > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6"
          >
            <Link to="/seller/dashboard?tab=orders" className="flex items-center gap-3">
              <AlertCircle size={24} className="text-orange-600" />
              <div className="flex-1">
                <h3 className="font-bold text-orange-800">لديك {stats.pendingOrders} طلب بانتظار المعالجة</h3>
                <p className="text-orange-600 text-sm">اضغط هنا لمعالجة الطلبات</p>
              </div>
              <ChevronLeft size={20} className="text-orange-600" />
            </Link>
          </motion.div>
        )}

        {/* Recent Orders */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ShoppingBag size={18} className="text-blue-600" />
              </div>
              <h2 className="font-bold text-gray-900">آخر الطلبات</h2>
            </div>
            <Link to="/seller/dashboard?tab=orders" className="text-[#FF6B00] text-sm font-medium">
              عرض الكل
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
              <ShoppingBag size={48} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">لا توجد طلبات جديدة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <Link key={order.id} to={`/seller/order/${order.id}`}>
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:border-purple-300 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-gray-900">طلب #{order.id?.slice(-6)}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                        order.status === 'shipped' ? 'bg-purple-100 text-purple-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {order.status === 'pending' ? 'جديد' :
                         order.status === 'processing' ? 'قيد المعالجة' :
                         order.status === 'shipped' ? 'تم الشحن' : 'مكتمل'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{order.items?.length || 0} منتج</span>
                      <span className="font-bold text-purple-600">{formatPrice(order.total)}</span>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Store Stats */}
        <section className="mb-6">
          <h2 className="font-bold text-gray-900 mb-3">إحصائيات المتجر</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs">عدد المنتجات</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Package size={24} className="text-purple-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs">المشاهدات</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalViews}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Eye size={24} className="text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="mb-6">
          <h2 className="font-bold text-gray-900 mb-3">إجراءات سريعة</h2>
          <div className="grid grid-cols-3 gap-3">
            <Link to="/seller/dashboard?tab=products">
              <div className="bg-white rounded-xl p-4 border border-gray-200 text-center hover:border-purple-300 transition-colors">
                <Package size={24} className="text-purple-500 mx-auto mb-2" />
                <p className="font-medium text-gray-900 text-xs">منتجاتي</p>
              </div>
            </Link>
            <Link to="/seller/dashboard?tab=ads">
              <div className="bg-white rounded-xl p-4 border border-gray-200 text-center hover:border-purple-300 transition-colors">
                <Megaphone size={24} className="text-orange-500 mx-auto mb-2" />
                <p className="font-medium text-gray-900 text-xs">الإعلانات</p>
              </div>
            </Link>
            <Link to="/seller/dashboard?tab=discounts">
              <div className="bg-white rounded-xl p-4 border border-gray-200 text-center hover:border-purple-300 transition-colors">
                <Gift size={24} className="text-pink-500 mx-auto mb-2" />
                <p className="font-medium text-gray-900 text-xs">الخصومات</p>
              </div>
            </Link>
            <Link to="/seller/dashboard?tab=wallet">
              <div className="bg-white rounded-xl p-4 border border-gray-200 text-center hover:border-purple-300 transition-colors">
                <Wallet size={24} className="text-green-500 mx-auto mb-2" />
                <p className="font-medium text-gray-900 text-xs">المحفظة</p>
              </div>
            </Link>
            <Link to="/seller/dashboard?tab=analytics">
              <div className="bg-white rounded-xl p-4 border border-gray-200 text-center hover:border-purple-300 transition-colors">
                <BarChart3 size={24} className="text-blue-500 mx-auto mb-2" />
                <p className="font-medium text-gray-900 text-xs">التحليلات</p>
              </div>
            </Link>
            <Link to="/seller/dashboard?tab=reviews">
              <div className="bg-white rounded-xl p-4 border border-gray-200 text-center hover:border-purple-300 transition-colors">
                <Star size={24} className="text-yellow-500 mx-auto mb-2" />
                <p className="font-medium text-gray-900 text-xs">التقييمات</p>
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
                <p className="text-xs text-orange-100">شاهد متجرك كما يراه العملاء</p>
              </div>
            </div>
            <ChevronLeft size={20} />
          </div>
        </Link>
      </div>
    </div>
  );
};

export default SellerHomePage;
