// /app/frontend/src/pages/DeliveryHomePage.js
// الصفحة الرئيسية لموظف التوصيل

import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Truck, Package, Wallet, Star, Clock, MapPin, 
  CheckCircle, TrendingUp, ShoppingBag, ShoppingCart,
  Phone, DollarSign, ToggleLeft, ToggleRight, ChevronLeft, Settings, Home
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatPrice } from '../utils/imageHelpers';
import DeliverySettingsTab from '../components/delivery/DeliverySettingsTab';

const API = process.env.REACT_APP_BACKEND_URL;

const DeliveryHomePage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'home');
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

  // تحديث URL عند تغيير التبويب
  useEffect(() => {
    if (activeTab === 'home') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', activeTab);
    }
    setSearchParams(searchParams, { replace: true });
  }, [activeTab]);

  // قراءة التبويب من URL
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, availableRes, myOrdersRes] = await Promise.all([
        axios.get(`${API}/api/delivery/stats`).catch(() => ({ data: {} })),
        axios.get(`${API}/api/delivery/available-orders`).catch(() => ({ data: [] })),
        axios.get(`${API}/api/delivery/my-product-orders`).catch(() => ({ data: { orders: [] } }))
      ]);
      
      setStats({
        todayDeliveries: statsRes.data.today_deliveries || 0,
        todayEarnings: statsRes.data.today_earnings || 0,
        totalDeliveries: statsRes.data.total_deliveries || 0,
        rating: statsRes.data.rating || 0,
        walletBalance: statsRes.data.wallet_balance || 0
      });
      setAvailableOrders(availableRes.data || []);
      const ordersData = myOrdersRes.data?.orders || myOrdersRes.data || [];
      setMyOrders(Array.isArray(ordersData) ? ordersData.filter(o => o.delivery_status === 'out_for_delivery') : []);
    } catch (error) {
      console.error('Error fetching delivery data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = () => setIsAvailable(!isAvailable);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-6 h-6 border-3 border-[#FF6B00] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header مصغر */}
      <div className="bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white px-3 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-orange-100 text-[10px]">مرحباً</p>
            <h1 className="text-base font-bold">{user?.full_name}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/?view=customer"
              className="flex items-center gap-1 bg-white/20 px-2 py-1 rounded-full text-[10px] hover:bg-white/30"
            >
              <ShoppingCart size={12} />
              <span>تسوّق الآن</span>
            </Link>
            <button
              onClick={toggleAvailability}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full font-bold text-[10px] ${
                isAvailable ? 'bg-green-500' : 'bg-white/20'
              }`}
            >
              {isAvailable ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
              {isAvailable ? 'متاح' : 'غير متاح'}
            </button>
          </div>
        </div>
        
        {/* Stats مصغرة */}
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { icon: Package, value: stats.todayDeliveries, label: 'اليوم' },
            { icon: DollarSign, value: formatPrice(stats.todayEarnings), label: 'الأرباح' },
            { icon: Star, value: stats.rating.toFixed(1), label: 'التقييم' },
            { icon: Wallet, value: formatPrice(stats.walletBalance), label: 'المحفظة' }
          ].map((item, i) => (
            <div key={i} className="bg-white/15 rounded-lg p-2 text-center">
              <item.icon size={12} className="mx-auto mb-0.5" />
              <p className="text-sm font-bold">{item.value}</p>
              <p className="text-[8px] text-orange-100">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-3 py-3">
        {/* تبويب الإعدادات */}
        {activeTab === 'settings' ? (
          <DeliverySettingsTab />
        ) : (
          <>
            {/* طلباتي الحالية */}
            {myOrders.length > 0 && (
          <section className="mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Truck size={14} className="text-blue-600" />
              <h2 className="font-bold text-gray-900 text-sm">طلباتي الحالية</h2>
              <span className="bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{myOrders.length}</span>
            </div>
            <div className="space-y-2">
              {myOrders.slice(0, 3).map((order) => (
                <Link key={order.id} to={`/delivery/order/${order.id}`}>
                  <div className="bg-white rounded-lg border border-blue-200 p-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs">#{order.id?.slice(-6)}</span>
                      <span className="bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5 rounded">قيد التوصيل</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-600">
                      <MapPin size={10} />
                      <span className="truncate">
                        {order.buyer_address?.address || (typeof order.delivery_address === 'object' 
                          ? [order.delivery_address?.area, order.delivery_address?.street, order.delivery_address?.building].filter(Boolean).join(', ')
                          : order.delivery_address)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* طلبات متاحة */}
        <section className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Package size={14} className="text-green-600" />
              <h2 className="font-bold text-gray-900 text-sm">طلبات متاحة</h2>
              <span className="bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{availableOrders.length}</span>
            </div>
            <Link to="/delivery/dashboard" className="text-[#FF6B00] text-[10px] font-medium">الكل</Link>
          </div>

          {availableOrders.length === 0 ? (
            <div className="bg-white rounded-lg p-6 text-center border">
              <Package size={28} className="text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-xs">لا توجد طلبات متاحة</p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableOrders.slice(0, 4).map((order) => (
                <Link key={order.id} to={`/delivery/order/${order.id}`}>
                  <div className="bg-white rounded-lg border p-2.5 hover:border-[#FF6B00] transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs">#{order.id?.slice(-6)}</span>
                      <span className="font-bold text-[#FF6B00] text-xs">{formatPrice(order.total)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-gray-500">
                      <span className="flex items-center gap-0.5">
                        <MapPin size={10} />
                        {order.buyer_address?.city || order.delivery_city}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Package size={10} />
                        {order.items?.length || 0} منتج
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* اختصارات */}
        <section>
          <h2 className="font-bold text-gray-900 text-sm mb-2">اختصارات</h2>
          <div className="grid grid-cols-4 gap-2">
            {[
              { to: '/delivery/dashboard', icon: TrendingUp, label: 'لوحة التحكم', color: 'text-[#FF6B00]' },
              { to: '/wallet', icon: Wallet, label: 'المحفظة', color: 'text-[#FF6B00]' },
              { to: '/delivery/history', icon: Clock, label: 'السجل', color: 'text-blue-500' },
              { to: '/?view=customer', icon: ShoppingCart, label: 'تسوّق الآن', color: 'text-purple-500' }
            ].map((item, i) => (
              <Link key={i} to={item.to}>
                <div className="bg-white rounded-lg p-3 border text-center hover:border-[#FF6B00] transition-colors">
                  <item.icon size={16} className={`${item.color} mx-auto mb-1`} />
                  <p className="text-[9px] text-gray-700 font-medium">{item.label}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
          </>
        )}
      </div>
    </div>
  );
};

export default DeliveryHomePage;
