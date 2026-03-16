// /app/frontend/src/pages/AdminPage.js
// لوحة تحكم المدير - ترند سورية
// تم تقسيم الملف إلى مكونات منفصلة في /components/admin/

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, Package, ShoppingBag, Clock, AlertTriangle, Bell, 
  ChevronRight, Truck, DollarSign, ShieldCheck, Megaphone,
  UtensilsCrossed, Ticket, Flame, Settings, TrendingUp, Home, Flag, Map, BarChart2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

// Import admin components
import UsersTab from '../components/admin/UsersTab';
import SellersTab from '../components/admin/SellersTab';
import ProductsTab from '../components/admin/ProductsTab';
import OrdersTab from '../components/admin/OrdersTab';
import PendingProductsTab from '../components/admin/PendingProductsTab';
import PendingSellersTab from '../components/admin/PendingSellersTab';
import DeliveryTab from '../components/admin/DeliveryTab';
import SubAdminsTab from '../components/admin/SubAdminsTab';
import NotificationsTab from '../components/admin/NotificationsTab';
import CommissionsTab from '../components/admin/CommissionsTab';
import WithdrawalsTab from '../components/admin/WithdrawalsTab';
import SettingsTab from '../components/admin/SettingsTab';
import AdsTab from '../components/admin/AdsTab';
import LowStockTab from '../components/admin/LowStockTab';
import DeliveryBoxesTab from '../components/admin/DeliveryBoxesTab';
import ChallengesTab from '../components/admin/ChallengesTab';
import DeliverySettingsTab from '../components/admin/DeliverySettingsTab';
import SupportTicketsTab from '../components/admin/SupportTicketsTab';
import DriverReportsTab from '../components/admin/DriverReportsTab';
import FoodStoresTab from '../components/admin/FoodStoresTab';
import FoodOffersTab from '../components/admin/FoodOffersTab';
import BannersTab from '../components/admin/BannersTab';
import CouponsTab from '../components/admin/CouponsTab';
import DailyDealsTab from '../components/admin/DailyDealsTab';
import PlatformSettingsTab from '../components/admin/PlatformSettingsTab';
import AnalyticsDashboard from '../components/admin/AnalyticsDashboard';
import ViolationsTab from '../components/admin/ViolationsTab';
import PriceReportsTab from '../components/admin/PriceReportsTab';
import DriversMapTab from '../components/admin/DriversMapTab';
import DriversPerformanceTab from '../components/admin/DriversPerformanceTab';
import ActivityLogTab from '../components/admin/ActivityLogTab';
import SupportTicketsAdmin from '../components/admin/SupportTicketsAdmin';
import ProblemSolverTools from '../components/admin/ProblemSolverTools';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, token } = useAuth();
  const { toast } = useToast();

  // State
  const [stats, setStats] = useState(null);
  const [pendingSellers, setPendingSellers] = useState([]);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [subAdmins, setSubAdmins] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  // قراءة التبويب من URL أو استخدام 'overview' كافتراضي
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'overview');
  const [allUsers, setAllUsers] = useState([]);
  const [allSellers, setAllSellers] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [pendingDelivery, setPendingDelivery] = useState([]);
  const [allDelivery, setAllDelivery] = useState([]);
  const [commissionsReport, setCommissionsReport] = useState(null);
  const [commissionRates, setCommissionRates] = useState(null);

  // تحديث URL عند تغيير التبويب
  useEffect(() => {
    if (activeTab === 'overview') {
      searchParams.delete('tab');
    } else {
      searchParams.set('tab', activeTab);
    }
    setSearchParams(searchParams, { replace: true });
  }, [activeTab]);

  // قراءة التبويب من URL عند التحميل
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Fetch all data
  useEffect(() => {
    if (user?.user_type === 'admin' || user?.user_type === 'sub_admin') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const requests = [
        axios.get(`${API}/admin/stats`),
        axios.get(`${API}/admin/sellers/pending`),
        axios.get(`${API}/admin/products/pending`),
        axios.get(`${API}/admin/notifications`),
        axios.get(`${API}/admin/users`),
        axios.get(`${API}/admin/sellers/all`),
        axios.get(`${API}/admin/orders`),
        axios.get(`${API}/admin/products/all`),
        axios.get(`${API}/admin/delivery/pending`),
        axios.get(`${API}/admin/delivery/all`)
      ];
      
      if (user?.user_type === 'admin') {
        requests.push(axios.get(`${API}/admin/sub-admins`));
      }

      const responses = await Promise.all(requests);
      setStats(responses[0].data);
      setPendingSellers(responses[1].data);
      setPendingProducts(responses[2].data);
      setNotifications(responses[3].data);
      setAllUsers(responses[4].data);
      setAllSellers(responses[5].data);
      setAllOrders(responses[6].data);
      setAllProducts(responses[7].data);
      setPendingDelivery(responses[8].data);
      setAllDelivery(responses[9].data);
      
      if (user?.user_type === 'admin' && responses[10]) {
        setSubAdmins(responses[10].data);
      }
      
      // Fetch commissions data
      try {
        const [commissionsRes, ratesRes] = await Promise.all([
          axios.get(`${API}/admin/commissions`),
          axios.get(`${API}/admin/commissions/rates`)
        ]);
        setCommissionsReport(commissionsRes.data);
        setCommissionRates(ratesRes.data);
      } catch (err) {
        console.log('Commission data not available yet');
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleApproveSeller = async (sellerId) => {
    try {
      await axios.post(`${API}/admin/sellers/${sellerId}/approve`);
      toast({ title: "تم التفعيل", description: "تم تفعيل حساب البائع بنجاح" });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل تفعيل البائع", variant: "destructive" });
    }
  };

  const handleRejectSeller = async (sellerId, reason = '') => {
    try {
      await axios.post(`${API}/admin/sellers/${sellerId}/reject`, { reason });
      toast({ title: "تم الرفض", description: "تم رفض طلب البائع" });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل رفض البائع", variant: "destructive" });
    }
  };

  const handleApproveProduct = async (productId) => {
    try {
      await axios.post(`${API}/admin/products/${productId}/approve`);
      toast({ title: "تم الموافقة", description: "تم الموافقة على المنتج" });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل الموافقة على المنتج", variant: "destructive" });
    }
  };

  const handleRejectProduct = async (productId, reason = '') => {
    try {
      await axios.post(`${API}/admin/products/${productId}/reject`, { 
        approved: false, 
        rejection_reason: reason 
      });
      toast({ title: "تم الرفض", description: "تم رفض المنتج" });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل رفض المنتج", variant: "destructive" });
    }
  };

  const handleApproveDelivery = async (driverId) => {
    try {
      await axios.post(`${API}/admin/delivery/${driverId}/approve`);
      toast({ title: "تم التفعيل", description: "تم تفعيل حساب موظف التوصيل بنجاح" });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل تفعيل موظف التوصيل", variant: "destructive" });
    }
  };

  const handleRejectDelivery = async (driverId, reason = '') => {
    try {
      await axios.post(`${API}/admin/delivery/${driverId}/reject`, { reason });
      toast({ title: "تم الرفض", description: "تم رفض طلب موظف التوصيل" });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل رفض موظف التوصيل", variant: "destructive" });
    }
  };

  const handleAddSubAdmin = async (newSubAdmin) => {
    try {
      await axios.post(`${API}/admin/sub-admins`, newSubAdmin);
      toast({ title: "تمت الإضافة", description: "تم إضافة المدير التنفيذي بنجاح" });
      fetchData();
    } catch (error) {
      toast({ 
        title: "خطأ", 
        description: error.response?.data?.detail || "فشل إضافة المدير التنفيذي", 
        variant: "destructive" 
      });
    }
  };

  const handleDeleteSubAdmin = async (subAdminId) => {
    if (!window.confirm('هل تريد حذف هذا المدير التنفيذي؟')) return;
    try {
      await axios.delete(`${API}/admin/sub-admins/${subAdminId}`);
      toast({ title: "تم الحذف", description: "تم حذف المدير التنفيذي" });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حذف المدير التنفيذي", variant: "destructive" });
    }
  };

  const handleSendNotification = async (newNotification) => {
    try {
      await axios.post(`${API}/admin/notifications`, newNotification);
      toast({ title: "تم الإرسال", description: "تم إرسال الإشعار بنجاح" });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل إرسال الإشعار", variant: "destructive" });
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    if (!window.confirm('هل تريد حذف هذا الإشعار؟')) return;
    try {
      await axios.delete(`${API}/admin/notifications/${notificationId}`);
      toast({ title: "تم الحذف", description: "تم حذف الإشعار" });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حذف الإشعار", variant: "destructive" });
    }
  };

  const handleSaveRates = async (rates) => {
    await axios.put(`${API}/admin/commissions/rates`, rates);
    const res = await axios.get(`${API}/admin/commissions/rates`);
    setCommissionRates(res.data);
  };

  // Auth check
  useEffect(() => {
    if (user && user.user_type !== 'admin' && user.user_type !== 'sub_admin') {
      navigate('/');
    }
  }, [user, navigate]);

  if (!user || (user.user_type !== 'admin' && user.user_type !== 'sub_admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }

  // Tab titles map
  const tabTitles = {
    'users': 'جميع المستخدمين',
    'sellers': 'جميع البائعين',
    'products': 'جميع المنتجات',
    'orders': 'جميع الطلبات',
    'pending-products': 'المنتجات المعلقة',
    'pending-sellers': 'البائعين المعلقين',
    'pending-delivery': 'موظفي التوصيل المعلقين',
    'delivery': 'موظفي التوصيل',
    'notifications': 'الإشعارات',
    'sub-admins': 'المدراء التنفيذيين',
    'commissions': 'العمولات',
    'withdrawals': 'طلبات السحب',
    'settings': 'إعدادات المنصة',
    'ads': 'إدارة الإعلانات',
    'low-stock': 'تقرير المخزون المنخفض',
    'delivery-boxes': 'صناديق التوصيل',
    'challenges': 'التحديات والمكافآت',
    'delivery-settings': 'إعدادات التوصيل',
    'violations': 'مخالفات السائقين',
    'price-reports': 'بلاغات الأسعار',
    'support-tickets': 'تذاكر الدعم الفني',
    'driver-reports': 'البلاغات الأخلاقية',
    'food-stores': 'متاجر الطعام',
    'food-offers': 'عروض الفلاش',
    'banners': 'إدارة البانرات',
    'coupons': 'كوبونات الخصم',
    'daily-deals': 'صفقات اليوم',
    'platform-settings': 'تفعيل/إيقاف الأقسام',
    'analytics': 'التحليلات والإحصائيات',
    'drivers-map': 'خريطة السائقين',
    'drivers-performance': 'أداء السائقين',
    'activity-log': 'سجل النشاط',
    'support-management': 'إدارة الدعم',
    'problem-solver': 'حل المشاكل'
  };

  return (
    <div className="min-h-screen pb-20 md:pb-10 bg-gray-50">
      <div className="max-w-5xl mx-auto px-3 py-4">
        
        {/* Sub-page header with back button */}
        {activeTab !== 'overview' ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setActiveTab('overview')}
                className="w-8 h-8 bg-white rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                data-testid="back-btn"
              >
                <ChevronRight size={18} className="text-gray-600" />
              </button>
              <h1 className="text-base font-bold text-gray-900">
                {tabTitles[activeTab] || ''}
              </h1>
            </div>

            {/* Tab content */}
            {activeTab === 'users' && <UsersTab allUsers={allUsers} />}
            {activeTab === 'sellers' && <SellersTab allSellers={allSellers} />}
            {activeTab === 'products' && <ProductsTab allProducts={allProducts} />}
            {activeTab === 'orders' && <OrdersTab allOrders={allOrders} />}
            {activeTab === 'pending-products' && (
              <PendingProductsTab 
                pendingProducts={pendingProducts} 
                onApprove={handleApproveProduct} 
                onReject={handleRejectProduct} 
              />
            )}
            {activeTab === 'pending-sellers' && (
              <PendingSellersTab 
                pendingSellers={pendingSellers} 
                onApprove={handleApproveSeller} 
                onReject={handleRejectSeller} 
              />
            )}
            {activeTab === 'pending-delivery' && (
              <DeliveryTab 
                pendingDelivery={pendingDelivery}
                isPending={true}
                onApprove={handleApproveDelivery} 
                onReject={handleRejectDelivery} 
              />
            )}
            {activeTab === 'delivery' && (
              <DeliveryTab allDelivery={allDelivery} isPending={false} />
            )}
            {activeTab === 'sub-admins' && user.user_type === 'admin' && (
              <SubAdminsTab 
                subAdmins={subAdmins} 
                onAdd={handleAddSubAdmin} 
                onDelete={handleDeleteSubAdmin} 
              />
            )}
            {activeTab === 'commissions' && (
              <CommissionsTab 
                commissionsReport={commissionsReport}
                commissionRates={commissionRates}
                user={user}
                onSaveRates={handleSaveRates}
                toast={toast}
                token={token}
              />
            )}
            {activeTab === 'notifications' && (
              <NotificationsTab 
                notifications={notifications} 
                onSend={handleSendNotification} 
                onDelete={handleDeleteNotification} 
              />
            )}
            {activeTab === 'withdrawals' && (
              <WithdrawalsTab />
            )}
            {activeTab === 'settings' && user.user_type === 'admin' && (
              <SettingsTab user={user} />
            )}
            {activeTab === 'ads' && user.user_type === 'admin' && (
              <AdsTab user={user} />
            )}
            {activeTab === 'low-stock' && (
              <LowStockTab />
            )}
            {activeTab === 'delivery-boxes' && user.user_type === 'admin' && (
              <DeliveryBoxesTab />
            )}
            {activeTab === 'challenges' && user.user_type === 'admin' && (
              <ChallengesTab />
            )}
            {activeTab === 'delivery-settings' && user.user_type === 'admin' && (
              <DeliverySettingsTab />
            )}
            {activeTab === 'violations' && user.user_type === 'admin' && (
              <ViolationsTab />
            )}
            {activeTab === 'price-reports' && (
              <PriceReportsTab />
            )}
            {activeTab === 'support-tickets' && (
              <SupportTicketsTab />
            )}
            {activeTab === 'driver-reports' && (
              <DriverReportsTab />
            )}
            {activeTab === 'food-stores' && (
              <FoodStoresTab />
            )}
            {activeTab === 'food-offers' && user.user_type === 'admin' && (
              <FoodOffersTab token={localStorage.getItem('token')} />
            )}
            {activeTab === 'banners' && user.user_type === 'admin' && (
              <BannersTab token={localStorage.getItem('token')} />
            )}
            {activeTab === 'coupons' && user.user_type === 'admin' && (
              <CouponsTab token={localStorage.getItem('token')} />
            )}
            {activeTab === 'daily-deals' && user.user_type === 'admin' && (
              <DailyDealsTab />
            )}
            {activeTab === 'platform-settings' && user.user_type === 'admin' && (
              <PlatformSettingsTab />
            )}
            {activeTab === 'analytics' && user.user_type === 'admin' && (
              <AnalyticsDashboard />
            )}
            {activeTab === 'drivers-map' && user.user_type === 'admin' && (
              <DriversMapTab />
            )}
            {activeTab === 'drivers-performance' && user.user_type === 'admin' && (
              <DriversPerformanceTab />
            )}
            {activeTab === 'activity-log' && user.user_type === 'admin' && (
              <ActivityLogTab />
            )}
            {activeTab === 'support-management' && (
              <SupportTicketsAdmin />
            )}
            {activeTab === 'problem-solver' && (
              <ProblemSolverTools />
            )}
          </>
        ) : (
          <>
            {/* Overview - Main Dashboard */}
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-bold text-gray-900">
                {user.user_type === 'admin' ? 'لوحة تحكم المدير' : 'لوحة تحكم المدير التنفيذي'}
              </h1>
              {user.user_type === 'sub_admin' && (
                <span className="text-xs bg-blue-100 text-blue-600 px-3 py-1 rounded-full">مدير تنفيذي</span>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
              {[
                { icon: Users, label: 'المستخدمين', value: stats?.total_users || 0, color: 'bg-blue-100 text-blue-600', tab: 'users' },
                { icon: Users, label: 'البائعين', value: stats?.total_sellers || 0, color: 'bg-purple-100 text-purple-600', tab: 'sellers' },
                { icon: Truck, label: 'موظفي التوصيل', value: stats?.total_delivery || 0, color: 'bg-cyan-100 text-cyan-600', tab: 'delivery' },
                { icon: Package, label: 'المنتجات', value: stats?.total_products || 0, color: 'bg-green-100 text-green-600', tab: 'products' },
                { icon: ShoppingBag, label: 'الطلبات', value: stats?.total_orders || 0, color: 'bg-orange-100 text-orange-600', tab: 'orders' },
                { icon: Clock, label: 'بائعين معلقين', value: stats?.pending_sellers || 0, color: 'bg-yellow-100 text-yellow-600', tab: 'pending-sellers' },
                { icon: AlertTriangle, label: 'منتجات معلقة', value: stats?.pending_products || 0, color: 'bg-red-100 text-red-600', tab: 'pending-products' },
                { icon: Truck, label: 'توصيل معلقين', value: stats?.pending_delivery || 0, color: 'bg-pink-100 text-pink-600', tab: 'pending-delivery' },
              ].map((stat, i) => (
                <div 
                  key={i} 
                  onClick={() => setActiveTab(stat.tab)}
                  className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm cursor-pointer hover:shadow-lg hover:border-[#FF6B00] transition-all active:scale-95"
                  data-testid={`stat-${stat.label}`}
                >
                  <div className={`w-8 h-8 rounded-full ${stat.color} flex items-center justify-center mb-1.5`}>
                    <stat.icon size={16} />
                  </div>
                  <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setActiveTab('commissions')}
                className="bg-white rounded-xl p-3 border border-gray-200 hover:border-green-500 hover:shadow-lg transition-all flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <DollarSign size={16} className="text-green-600" />
                </div>
                <span className="text-xs font-bold text-gray-700">العمولات</span>
              </button>
              <button
                onClick={() => setActiveTab('withdrawals')}
                className="bg-white rounded-xl p-3 border border-gray-200 hover:border-yellow-500 hover:shadow-lg transition-all flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                  <DollarSign size={16} className="text-yellow-600" />
                </div>
                <span className="text-xs font-bold text-gray-700">طلبات السحب</span>
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className="bg-white rounded-xl p-3 border border-gray-200 hover:border-[#FF6B00] hover:shadow-lg transition-all flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                  <Bell size={16} className="text-[#FF6B00]" />
                </div>
                <span className="text-xs font-bold text-gray-700">الإشعارات ({notifications.length})</span>
              </button>
              {user.user_type === 'admin' && (
                <>
                  <button
                    onClick={() => setActiveTab('sub-admins')}
                    className="bg-white rounded-xl p-3 border border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all flex items-center gap-2.5"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <ShieldCheck size={16} className="text-blue-600" />
                    </div>
                    <span className="text-xs font-bold text-gray-700">المدراء ({subAdmins.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className="bg-white rounded-xl p-3 border border-gray-200 hover:border-purple-500 hover:shadow-lg transition-all flex items-center gap-2.5"
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <Package size={16} className="text-purple-600" />
                    </div>
                    <span className="text-xs font-bold text-gray-700">إعدادات المنصة</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('ads')}
                    className="bg-white rounded-xl p-3 border border-gray-200 hover:border-orange-500 hover:shadow-lg transition-all flex items-center gap-2.5"
                    data-testid="ads-tab-btn"
                  >
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                      <Megaphone size={16} className="text-orange-600" />
                    </div>
                    <span className="text-xs font-bold text-gray-700">إدارة الإعلانات</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('low-stock')}
                    className="bg-white rounded-xl p-3 border border-gray-200 hover:border-yellow-500 hover:shadow-lg transition-all flex items-center gap-2.5"
                    data-testid="low-stock-tab-btn"
                  >
                    <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                      <AlertTriangle size={16} className="text-yellow-600" />
                    </div>
                    <span className="text-xs font-bold text-gray-700">المخزون المنخفض</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('delivery-boxes')}
                    className="bg-white rounded-xl p-3 border border-gray-200 hover:border-emerald-500 hover:shadow-lg transition-all flex items-center gap-2.5"
                    data-testid="delivery-boxes-tab-btn"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                      <Package size={16} className="text-emerald-600" />
                    </div>
                    <span className="text-xs font-bold text-gray-700">صناديق التوصيل</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('challenges')}
                    className="bg-white rounded-xl p-3 border border-gray-200 hover:border-purple-500 hover:shadow-lg transition-all flex items-center gap-2.5"
                    data-testid="challenges-tab-btn"
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <DollarSign size={16} className="text-purple-600" />
                    </div>
                    <span className="text-xs font-bold text-gray-700">التحديات والمكافآت</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('delivery-settings')}
                    className="bg-white rounded-xl p-3 border border-gray-200 hover:border-cyan-500 hover:shadow-lg transition-all flex items-center gap-2.5"
                    data-testid="delivery-settings-tab-btn"
                  >
                    <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center">
                      <Clock size={16} className="text-cyan-600" />
                    </div>
                    <span className="text-xs font-bold text-gray-700">إعدادات التوصيل</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('violations')}
                    className="bg-white rounded-xl p-3 border border-gray-200 hover:border-red-500 hover:shadow-lg transition-all flex items-center gap-2.5"
                    data-testid="violations-tab-btn"
                  >
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertTriangle size={16} className="text-red-600" />
                    </div>
                    <span className="text-xs font-bold text-gray-700">مخالفات السائقين</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('price-reports')}
                    className="bg-white rounded-xl p-3 border border-gray-200 hover:border-orange-500 hover:shadow-lg transition-all flex items-center gap-2.5"
                    data-testid="price-reports-tab-btn"
                  >
                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                      <Flag size={16} className="text-orange-600" />
                    </div>
                    <span className="text-xs font-bold text-gray-700">بلاغات الأسعار</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('support-tickets')}
                    className="bg-white rounded-xl p-3 border border-gray-200 hover:border-rose-500 hover:shadow-lg transition-all flex items-center gap-2.5"
                    data-testid="support-tickets-tab-btn"
                  >
                    <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
                      <Users size={16} className="text-rose-600" />
                    </div>
                    <span className="text-xs font-bold text-gray-700">تذاكر الدعم</span>
                  </button>

                  {/* البلاغات الأخلاقية */}
                  <button
                    onClick={() => setActiveTab('driver-reports')}
                    className="bg-white rounded-xl p-3 border border-gray-200 hover:border-red-500 hover:shadow-lg transition-all flex items-center gap-2.5"
                    data-testid="driver-reports-tab-btn"
                  >
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                      <AlertTriangle size={16} className="text-red-600" />
                    </div>
                    <span className="text-xs font-bold text-gray-700">البلاغات الأخلاقية</span>
                  </button>

                  {/* متاجر الطعام */}
                  <button
                    onClick={() => setActiveTab('food-stores')}
                    className="bg-white rounded-xl p-3 border border-gray-200 hover:border-green-500 hover:shadow-lg transition-all flex items-center gap-2.5"
                    data-testid="food-stores-tab-btn"
                  >
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <UtensilsCrossed size={16} className="text-green-600" />
                    </div>
                    <span className="text-xs font-bold text-gray-700">متاجر الطعام</span>
                  </button>

                  {/* عروض الفلاش */}
                  <button
                    onClick={() => setActiveTab('food-offers')}
                    className="bg-gradient-to-r from-orange-100 to-red-100 rounded-xl p-3 border border-orange-200 hover:border-orange-500 hover:shadow-lg transition-all flex items-center gap-2.5"
                    data-testid="food-offers-tab-btn"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                      <Megaphone size={16} className="text-white" />
                    </div>
                    <span className="text-xs font-bold text-gray-700">عروض الفلاش</span>
                  </button>

                  {/* إدارة البانرات */}
                  <button
                    onClick={() => setActiveTab('banners')}
                    className="bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl p-3 border border-blue-200 hover:border-blue-500 hover:shadow-lg transition-all flex items-center gap-2.5"
                    data-testid="banners-tab-btn"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                      <Megaphone size={16} className="text-white" />
                    </div>
                    <span className="text-xs font-bold text-gray-700">البانرات الإعلانية</span>
                  </button>

                  {/* كوبونات الخصم */}
                  <button
                    onClick={() => setActiveTab('coupons')}
                    className="bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl p-3 border border-purple-200 hover:border-purple-500 hover:shadow-lg transition-all flex items-center gap-2.5"
                    data-testid="coupons-tab-btn"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                      <Ticket size={16} className="text-white" />
                    </div>
                    <span className="text-xs font-bold text-gray-700">كوبونات الخصم</span>
                  </button>

                  {/* صفقات اليوم */}
                  <button
                    onClick={() => setActiveTab('daily-deals')}
                    className="bg-gradient-to-r from-orange-100 to-yellow-100 rounded-xl p-3 border border-orange-200 hover:border-orange-500 hover:shadow-lg transition-all flex items-center gap-2.5"
                    data-testid="daily-deals-tab-btn"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-red-500 flex items-center justify-center">
                      <Flame size={16} className="text-white" />
                    </div>
                    <span className="text-xs font-bold text-gray-700">صفقات اليوم</span>
                  </button>

                  {/* إعدادات المنصة - تفعيل/إيقاف الأقسام */}
                  <button
                    onClick={() => setActiveTab('platform-settings')}
                    className="bg-gradient-to-r from-gray-100 to-slate-100 rounded-xl p-3 border border-gray-200 hover:border-gray-500 hover:shadow-lg transition-all flex items-center gap-2.5"
                    data-testid="platform-settings-tab-btn"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-gray-600 to-gray-800 flex items-center justify-center">
                      <Settings size={16} className="text-white" />
                    </div>
                    <span className="text-xs font-bold text-gray-700">تفعيل الأقسام</span>
                  </button>

                  {/* التحليلات والإحصائيات */}
                  <button
                    onClick={() => setActiveTab('analytics')}
                    className="bg-gradient-to-r from-indigo-100 to-blue-100 rounded-xl p-3 border border-indigo-200 hover:border-indigo-500 hover:shadow-lg transition-all flex items-center gap-2.5"
                    data-testid="analytics-tab-btn"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-blue-600 flex items-center justify-center">
                      <TrendingUp size={16} className="text-white" />
                    </div>
                    <span className="text-xs font-bold text-gray-700">التحليلات</span>
                  </button>

                  {/* خريطة السائقين */}
                  <button
                    onClick={() => setActiveTab('drivers-map')}
                    className="bg-gradient-to-r from-emerald-100 to-teal-100 rounded-xl p-3 border border-emerald-200 hover:border-emerald-500 hover:shadow-lg transition-all flex items-center gap-2.5"
                    data-testid="drivers-map-tab-btn"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center">
                      <Map size={16} className="text-white" />
                    </div>
                    <span className="text-xs font-bold text-gray-700">خريطة السائقين</span>
                  </button>

                  {/* أداء السائقين */}
                  <button
                    onClick={() => setActiveTab('drivers-performance')}
                    className="bg-gradient-to-r from-violet-100 to-purple-100 rounded-xl p-3 border border-violet-200 hover:border-violet-500 hover:shadow-lg transition-all flex items-center gap-2.5"
                    data-testid="drivers-performance-tab-btn"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 flex items-center justify-center">
                      <BarChart2 size={16} className="text-white" />
                    </div>
                    <span className="text-xs font-bold text-gray-700">أداء السائقين</span>
                  </button>

                  {/* سجل النشاط */}
                  <button
                    onClick={() => setActiveTab('activity-log')}
                    className="bg-gradient-to-r from-indigo-100 to-blue-100 rounded-xl p-3 border border-indigo-200 hover:border-indigo-500 hover:shadow-lg transition-all flex items-center gap-2.5"
                    data-testid="activity-log-tab-btn"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-indigo-500 to-blue-600 flex items-center justify-center">
                      <Clock size={16} className="text-white" />
                    </div>
                    <span className="text-xs font-bold text-gray-700">سجل النشاط</span>
                  </button>

                  {/* حل المشاكل */}
                  <button
                    onClick={() => setActiveTab('problem-solver')}
                    className="bg-gradient-to-r from-red-100 to-orange-100 rounded-xl p-3 border border-red-200 hover:border-red-500 hover:shadow-lg transition-all flex items-center gap-2.5"
                    data-testid="problem-solver-tab-btn"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-red-500 to-orange-600 flex items-center justify-center">
                      <AlertTriangle size={16} className="text-white" />
                    </div>
                    <span className="text-xs font-bold text-gray-700">حل المشاكل</span>
                  </button>
                </>
              )}
            </div>

            {/* تصفح كعميل */}
            <Link to="/?view=customer" className="block mt-4">
              <div className="bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] rounded-xl p-3 text-white flex items-center justify-between hover:shadow-lg transition-all">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Home size={16} />
                  </div>
                  <div>
                    <span className="text-sm font-bold">تصفح كعميل</span>
                    <p className="text-[10px] text-orange-100">شاهد التطبيق كما يراه العملاء</p>
                  </div>
                </div>
                <ChevronRight size={18} className="rotate-180" />
              </div>
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
