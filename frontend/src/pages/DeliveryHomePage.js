// /app/frontend/src/pages/DeliveryHomePage.js
// الصفحة الرئيسية لموظف التوصيل

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Truck, Package, Wallet, Star, Clock, MapPin, 
  CheckCircle, AlertCircle, TrendingUp, ShoppingBag,
  Phone, Navigation, DollarSign, ToggleLeft, ToggleRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../utils/imageHelpers';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DeliveryHomePage = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    todayDeliveries: 0,
    todayEarnings: 0,
    totalDeliveries: 0,
    rating: 0,
    walletBalance: 0
  });
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, availableRes, myOrdersRes] = await Promise.all([
        axios.get(`${API}/delivery/stats`).catch(() => ({ data: {} })),
        axios.get(`${API}/delivery/available-orders`).catch(() => ({ data: [] })),
        axios.get(`${API}/delivery/my-orders`).catch(() => ({ data: [] }))
      ]);
      
      setStats({
        todayDeliveries: statsRes.data.today_deliveries || 0,
        todayEarnings: statsRes.data.today_earnings || 0,
        totalDeliveries: statsRes.data.total_deliveries || 0,
        rating: statsRes.data.rating || 0,
        walletBalance: statsRes.data.wallet_balance || 0
      });
      setAvailableOrders(availableRes.data || []);
      setMyOrders(myOrdersRes.data?.filter(o => o.delivery_status === 'out_for_delivery') || []);
    } catch (error) {
      console.error('Error fetching delivery data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async () => {
    setIsAvailable(!isAvailable);
    // يمكن إضافة API لتحديث حالة التوفر
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
      <div className="bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-orange-100 text-sm">مرحباً</p>
              <h1 className="text-xl font-bold">{user?.full_name}</h1>
            </div>
            <button
              onClick={toggleAvailability}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-colors ${
                isAvailable ? 'bg-green-500 text-white' : 'bg-white/20 text-white'
              }`}
            >
              {isAvailable ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
              {isAvailable ? 'متاح' : 'غير متاح'}
            </button>
          </div>
          
          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <Package size={20} className="mx-auto mb-1" />
              <p className="text-lg font-bold">{stats.todayDeliveries}</p>
              <p className="text-[10px] text-orange-100">توصيلات اليوم</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <DollarSign size={20} className="mx-auto mb-1" />
              <p className="text-lg font-bold">{formatPrice(stats.todayEarnings)}</p>
              <p className="text-[10px] text-orange-100">أرباح اليوم</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <Star size={20} className="mx-auto mb-1" />
              <p className="text-lg font-bold">{stats.rating.toFixed(1)}</p>
              <p className="text-[10px] text-orange-100">التقييم</p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <Wallet size={20} className="mx-auto mb-1" />
              <p className="text-lg font-bold">{formatPrice(stats.walletBalance)}</p>
              <p className="text-[10px] text-orange-100">المحفظة</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* My Current Orders */}
        {myOrders.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Truck size={18} className="text-blue-600" />
              </div>
              <h2 className="font-bold text-gray-900">طلباتي الحالية</h2>
              <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">{myOrders.length}</span>
            </div>
            <div className="space-y-3">
              {myOrders.map((order) => (
                <Link key={order.id} to={`/delivery/order/${order.id}`}>
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="bg-white rounded-xl border-2 border-blue-200 p-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-gray-900">طلب #{order.id?.slice(-6)}</span>
                      <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">قيد التوصيل</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin size={14} />
                      <span>{order.buyer_address?.address || order.delivery_address}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <Phone size={14} />
                      <span>{order.buyer_address?.phone || order.delivery_phone}</span>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Available Orders */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Package size={18} className="text-green-600" />
              </div>
              <h2 className="font-bold text-gray-900">طلبات متاحة</h2>
              <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">{availableOrders.length}</span>
            </div>
            <Link to="/delivery/dashboard" className="text-[#FF6B00] text-sm font-medium">
              عرض الكل
            </Link>
          </div>

          {availableOrders.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
              <Package size={48} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">لا توجد طلبات متاحة حالياً</p>
              <p className="text-gray-400 text-sm mt-1">سيتم إشعارك عند توفر طلبات جديدة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableOrders.slice(0, 5).map((order) => (
                <Link key={order.id} to={`/delivery/order/${order.id}`}>
                  <motion.div
                    whileHover={{ scale: 1.01 }}
                    className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:border-[#FF6B00] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-gray-900">طلب #{order.id?.slice(-6)}</span>
                      <span className="font-bold text-[#FF6B00]">{formatPrice(order.total)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin size={14} />
                      <span className="truncate">{order.buyer_address?.city || order.delivery_city}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Package size={12} />
                        {order.items?.length || 0} منتج
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {order.order_source === 'food' ? 'طعام' : 'متجر'}
                      </span>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Quick Actions */}
        <section className="mb-6">
          <h2 className="font-bold text-gray-900 mb-3">اختصارات سريعة</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link to="/delivery/dashboard">
              <div className="bg-white rounded-xl p-4 border border-gray-200 text-center hover:border-[#FF6B00] transition-colors">
                <TrendingUp size={24} className="text-[#FF6B00] mx-auto mb-2" />
                <p className="font-medium text-gray-900 text-sm">لوحة التحكم</p>
              </div>
            </Link>
            <Link to="/delivery/wallet">
              <div className="bg-white rounded-xl p-4 border border-gray-200 text-center hover:border-[#FF6B00] transition-colors">
                <Wallet size={24} className="text-green-500 mx-auto mb-2" />
                <p className="font-medium text-gray-900 text-sm">المحفظة</p>
              </div>
            </Link>
            <Link to="/delivery/history">
              <div className="bg-white rounded-xl p-4 border border-gray-200 text-center hover:border-[#FF6B00] transition-colors">
                <Clock size={24} className="text-blue-500 mx-auto mb-2" />
                <p className="font-medium text-gray-900 text-sm">سجل التوصيلات</p>
              </div>
            </Link>
            <Link to="/">
              <div className="bg-white rounded-xl p-4 border border-gray-200 text-center hover:border-[#FF6B00] transition-colors">
                <ShoppingBag size={24} className="text-purple-500 mx-auto mb-2" />
                <p className="font-medium text-gray-900 text-sm">تصفح كعميل</p>
              </div>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DeliveryHomePage;
