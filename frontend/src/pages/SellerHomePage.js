// /app/frontend/src/pages/SellerHomePage.js
// الصفحة الرئيسية للبائع

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Package, DollarSign, ShoppingBag, Plus, Clock, AlertCircle, 
  Star, Wallet, BarChart3, Megaphone, Gift, ChevronLeft, Eye
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
        <div className="animate-spin w-6 h-6 border-3 border-purple-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header مصغر */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-3 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-purple-200 text-[10px]">متجرك</p>
            <h1 className="text-base font-bold">{user?.business_name || user?.full_name}</h1>
          </div>
          <Link 
            to="/seller/dashboard?tab=add-product"
            className="bg-white text-purple-600 px-3 py-1.5 rounded-full font-bold text-[10px] flex items-center gap-1"
          >
            <Plus size={12} />
            منتج جديد
          </Link>
        </div>
        
        {/* Stats مصغرة */}
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { icon: DollarSign, value: formatPrice(stats.todaySales), label: 'المبيعات' },
            { icon: ShoppingBag, value: stats.todayOrders, label: 'الطلبات' },
            { icon: Star, value: stats.rating.toFixed(1), label: 'التقييم' },
            { icon: Wallet, value: formatPrice(stats.walletBalance), label: 'المحفظة' }
          ].map((item, i) => (
            <div key={i} className="bg-white/15 rounded-lg p-2 text-center">
              <item.icon size={12} className="mx-auto mb-0.5" />
              <p className="text-sm font-bold">{item.value}</p>
              <p className="text-[8px] text-purple-200">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-3 py-3">
        {/* تنبيه طلبات معلقة */}
        {stats.pendingOrders > 0 && (
          <Link to="/seller/dashboard?tab=orders">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4 flex items-center gap-2">
              <AlertCircle size={16} className="text-orange-600" />
              <div className="flex-1">
                <span className="font-bold text-orange-800 text-xs">{stats.pendingOrders} طلب بانتظار المعالجة</span>
              </div>
              <ChevronLeft size={14} className="text-orange-600" />
            </div>
          </Link>
        )}

        {/* آخر الطلبات */}
        <section className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <ShoppingBag size={14} className="text-blue-600" />
              <h2 className="font-bold text-gray-900 text-sm">آخر الطلبات</h2>
            </div>
            <Link to="/seller/dashboard?tab=orders" className="text-purple-600 text-[10px] font-medium">الكل</Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="bg-white rounded-lg p-6 text-center border">
              <ShoppingBag size={28} className="text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-xs">لا توجد طلبات جديدة</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentOrders.slice(0, 3).map((order) => (
                <Link key={order.id} to={`/seller/order/${order.id}`}>
                  <div className="bg-white rounded-lg border p-2.5 hover:border-purple-300 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs">#{order.id?.slice(-6)}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {order.status === 'pending' ? 'جديد' : 'مكتمل'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-gray-600">{order.items?.length || 0} منتج</span>
                      <span className="font-bold text-purple-600">{formatPrice(order.total)}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* إحصائيات */}
        <section className="mb-4">
          <h2 className="font-bold text-gray-900 text-sm mb-2">إحصائيات</h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-lg p-3 border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-[10px]">المنتجات</p>
                  <p className="text-xl font-bold">{stats.totalProducts}</p>
                </div>
                <Package size={20} className="text-purple-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg p-3 border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-[10px]">المشاهدات</p>
                  <p className="text-xl font-bold">{stats.totalViews}</p>
                </div>
                <Eye size={20} className="text-blue-500" />
              </div>
            </div>
          </div>
        </section>

        {/* اختصارات */}
        <section className="mb-4">
          <h2 className="font-bold text-gray-900 text-sm mb-2">اختصارات</h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { to: '/seller/dashboard?tab=products', icon: Package, label: 'منتجاتي', color: 'text-purple-500' },
              { to: '/seller/dashboard?tab=ads', icon: Megaphone, label: 'الإعلانات', color: 'text-orange-500' },
              { to: '/seller/dashboard?tab=discounts', icon: Gift, label: 'الخصومات', color: 'text-pink-500' },
              { to: '/seller/dashboard?tab=wallet', icon: Wallet, label: 'المحفظة', color: 'text-green-500' },
              { to: '/seller/dashboard?tab=analytics', icon: BarChart3, label: 'التحليلات', color: 'text-blue-500' },
              { to: '/seller/dashboard?tab=reviews', icon: Star, label: 'التقييمات', color: 'text-yellow-500' }
            ].map((item, i) => (
              <Link key={i} to={item.to}>
                <div className="bg-white rounded-lg p-3 border text-center hover:border-purple-300 transition-colors">
                  <item.icon size={16} className={`${item.color} mx-auto mb-1`} />
                  <p className="text-[9px] text-gray-700 font-medium">{item.label}</p>
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
                <p className="text-[9px] text-orange-100">شاهد متجرك كما يراه العملاء</p>
              </div>
            </div>
            <ChevronLeft size={16} />
          </div>
        </Link>
      </div>
    </div>
  );
};

export default SellerHomePage;
