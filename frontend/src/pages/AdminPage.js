// /app/frontend/src/pages/AdminPage.js
// لوحة تحكم المدير - ترند سورية
// تم تقسيم الملف إلى مكونات منفصلة في /components/admin/

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, Package, ShoppingBag, Clock, AlertTriangle, Bell, 
  ChevronRight, Truck, DollarSign, ShieldCheck, Megaphone,
  UtensilsCrossed, Ticket, Flame, Settings, TrendingUp, Home, Flag, Map, BarChart2, Camera, Phone, Store
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
import TickerMessagesTab from '../components/admin/TickerMessagesTab';
import ImageSettingsTab from '../components/admin/ImageSettingsTab';
import EmergencyHelpTab from '../components/admin/EmergencyHelpTab';
import ProductBadgesTab from '../components/admin/ProductBadgesTab';
import CategoriesTab from '../components/admin/CategoriesTab';
import CallRequestsTab from '../components/admin/CallRequestsTab';
import FeaturedStoresTab from '../components/admin/FeaturedStoresTab';
import RecordedCallsTab from '../components/admin/RecordedCallsTab';
import HomepageSectionsTab from '../components/admin/HomepageSectionsTab';

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
    'emergency-help': 'طلبات المساعدة الطارئة',
    'driver-reports': 'البلاغات الأخلاقية',
    'food-stores': 'متاجر الطعام',
    'featured-stores': 'المتاجر المميزة',
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
    'problem-solver': 'حل المشاكل',
    'ticker-messages': 'شريط العروض المتحرك',
    'image-settings': 'إعدادات الصور',
    'product-badges': 'شارات المنتجات',
    'categories': 'إدارة الفئات',
    'call-requests': 'طلبات الاتصال',
    'recorded-calls': 'المكالمات المسجلة'
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
            {activeTab === 'emergency-help' && (
              <EmergencyHelpTab token={localStorage.getItem('token')} />
            )}
            {activeTab === 'driver-reports' && (
              <DriverReportsTab />
            )}
            {activeTab === 'food-stores' && (
              <FoodStoresTab />
            )}
            
            {activeTab === 'featured-stores' && user.user_type === 'admin' && (
              <FeaturedStoresTab />
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
            {activeTab === 'ticker-messages' && user.user_type === 'admin' && (
              <TickerMessagesTab />
            )}
            {activeTab === 'image-settings' && user.user_type === 'admin' && (
              <ImageSettingsTab token={token} />
            )}
            {activeTab === 'product-badges' && user.user_type === 'admin' && (
              <ProductBadgesTab />
            )}
            {activeTab === 'categories' && user.user_type === 'admin' && (
              <CategoriesTab />
            )}
            {activeTab === 'call-requests' && (
              <CallRequestsTab />
            )}
            {activeTab === 'recorded-calls' && user.user_type === 'admin' && (
              <RecordedCallsTab />
            )}
            {activeTab === 'homepage-sections' && user.user_type === 'admin' && (
              <HomepageSectionsTab />
            )}
          </>
        ) : (
          <>
            {/* Overview - Main Dashboard */}
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-lg font-bold text-gray-900">
                {user.user_type === 'admin' ? 'لوحة التحكم' : 'لوحة المدير التنفيذي'}
              </h1>
              {user.user_type === 'sub_admin' && (
                <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">مدير تنفيذي</span>
              )}
            </div>

            {/* تنبيهات المعلقات */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
              <p className="text-[10px] font-bold text-amber-700 mb-1.5 flex items-center gap-1">
                <Clock size={12} /> الموافقات المعلقة
              </p>
              <div className="flex gap-1.5 flex-wrap">
                <button onClick={() => setActiveTab('pending-sellers')} className="bg-amber-100 text-amber-700 text-[10px] px-2 py-1 rounded-full hover:bg-amber-200 flex items-center gap-1">
                  <Users size={10} /> بائعين ({stats?.pending_sellers || 0})
                </button>
                <button onClick={() => setActiveTab('pending-products')} className="bg-amber-100 text-amber-700 text-[10px] px-2 py-1 rounded-full hover:bg-amber-200 flex items-center gap-1">
                  <Package size={10} /> منتجات ({stats?.pending_products || 0})
                </button>
                <button onClick={() => setActiveTab('pending-delivery')} className="bg-amber-100 text-amber-700 text-[10px] px-2 py-1 rounded-full hover:bg-amber-200 flex items-center gap-1">
                  <Truck size={10} /> سائقين ({stats?.pending_delivery || 0})
                </button>
              </div>
            </div>

            {/* ======== الأقسام المجمّعة ======== */}
            <div className="space-y-3">
              
              {/* 👥 المستخدمين والدعم */}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="bg-blue-50 px-3 py-1.5 border-b border-blue-100">
                  <h3 className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                    <Users size={12} /> المستخدمين والدعم
                  </h3>
                </div>
                <div className="grid grid-cols-4 gap-px bg-gray-100">
                  {[
                    { icon: Users, label: 'المستخدمين', tab: 'users' },
                    { icon: Users, label: 'البائعين', tab: 'sellers' },
                    { icon: Bell, label: 'الإشعارات', tab: 'notifications', badge: notifications.length },
                    { icon: Ticket, label: 'تذاكر الدعم', tab: 'support-tickets' },
                    { icon: ShieldCheck, label: 'إدارة الدعم', tab: 'support-management' },
                  ].map((item, i) => (
                    <button key={i} onClick={() => setActiveTab(item.tab)} className="bg-white p-2 flex flex-col items-center gap-1 hover:bg-blue-50 transition-colors">
                      <item.icon size={16} className="text-blue-600" />
                      <span className="text-[10px] text-gray-600">{item.label}</span>
                      {item.badge > 0 && <span className="text-[8px] bg-red-500 text-white px-1 rounded-full">{item.badge}</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* 🚚 التوصيل */}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="bg-cyan-50 px-3 py-1.5 border-b border-cyan-100">
                  <h3 className="text-xs font-bold text-cyan-700 flex items-center gap-1.5">
                    <Truck size={12} /> التوصيل والسائقين
                  </h3>
                </div>
                <div className="grid grid-cols-4 gap-px bg-gray-100">
                  {[
                    { icon: Truck, label: 'السائقين', tab: 'delivery' },
                    { icon: Map, label: 'الخريطة', tab: 'drivers-map' },
                    { icon: BarChart2, label: 'الأداء', tab: 'drivers-performance' },
                    { icon: Settings, label: 'الإعدادات', tab: 'delivery-settings' },
                    { icon: Package, label: 'الصناديق', tab: 'delivery-boxes' },
                    { icon: AlertTriangle, label: 'المخالفات', tab: 'violations' },
                    { icon: DollarSign, label: 'التحديات', tab: 'challenges' },
                    { icon: AlertTriangle, label: 'طوارئ', tab: 'emergency-help', urgent: true },
                    { icon: Phone, label: 'طلبات اتصال', tab: 'call-requests', urgent: true },
                    { icon: Phone, label: 'المكالمات المسجلة', tab: 'recorded-calls' },
                  ].map((item, i) => (
                    <button key={i} onClick={() => setActiveTab(item.tab)} className={`bg-white p-2 flex flex-col items-center gap-1 hover:bg-cyan-50 transition-colors ${item.urgent ? 'bg-red-50' : ''}`}>
                      <item.icon size={16} className={item.urgent ? 'text-red-500' : 'text-cyan-600'} />
                      <span className={`text-[10px] ${item.urgent ? 'text-red-600 font-bold' : 'text-gray-600'}`}>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 🏪 البائعين والمنتجات */}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="bg-purple-50 px-3 py-1.5 border-b border-purple-100">
                  <h3 className="text-xs font-bold text-purple-700 flex items-center gap-1.5">
                    <Package size={12} /> البائعين والمنتجات
                  </h3>
                </div>
                <div className="grid grid-cols-4 gap-px bg-gray-100">
                  {[
                    { icon: Package, label: 'المنتجات', tab: 'products' },
                    { icon: ShoppingBag, label: 'الطلبات', tab: 'orders' },
                    { icon: DollarSign, label: 'العمولات', tab: 'commissions' },
                    { icon: DollarSign, label: 'السحب', tab: 'withdrawals' },
                    { icon: UtensilsCrossed, label: 'المطاعم', tab: 'food-stores' },
                    { icon: Store, label: 'المتاجر المميزة', tab: 'featured-stores' },
                    { icon: AlertTriangle, label: 'المخزون', tab: 'low-stock' },
                    { icon: Flag, label: 'بلاغات السعر', tab: 'price-reports' },
                    { icon: AlertTriangle, label: 'البلاغات', tab: 'driver-reports' },
                  ].map((item, i) => (
                    <button key={i} onClick={() => setActiveTab(item.tab)} className="bg-white p-2 flex flex-col items-center gap-1 hover:bg-purple-50 transition-colors">
                      <item.icon size={16} className="text-purple-600" />
                      <span className="text-[10px] text-gray-600">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 🎁 العروض والتسويق */}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="bg-orange-50 px-3 py-1.5 border-b border-orange-100">
                  <h3 className="text-xs font-bold text-orange-700 flex items-center gap-1.5">
                    <Megaphone size={12} /> العروض والتسويق
                  </h3>
                </div>
                <div className="grid grid-cols-4 gap-px bg-gray-100">
                  {[
                    { icon: Flame, label: 'صفقات اليوم', tab: 'daily-deals' },
                    { icon: Megaphone, label: 'عروض فلاش', tab: 'food-offers' },
                    { icon: Ticket, label: 'الكوبونات', tab: 'coupons' },
                    { icon: Megaphone, label: 'البانرات', tab: 'banners' },
                    { icon: Megaphone, label: 'الإعلانات', tab: 'ads' },
                    { icon: Megaphone, label: 'شريط العروض', tab: 'ticker-messages' },
                    { icon: Flame, label: 'شارات المنتجات', tab: 'product-badges' },
                  ].map((item, i) => (
                    <button key={i} onClick={() => setActiveTab(item.tab)} className="bg-white p-2 flex flex-col items-center gap-1 hover:bg-orange-50 transition-colors">
                      <item.icon size={16} className="text-orange-600" />
                      <span className="text-[10px] text-gray-600">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* ⚙️ الإعدادات */}
              {user.user_type === 'admin' && (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="bg-gray-100 px-3 py-1.5 border-b border-gray-200">
                    <h3 className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                      <Settings size={12} /> الإعدادات والنظام
                    </h3>
                  </div>
                  <div className="grid grid-cols-4 gap-px bg-gray-100">
                    {[
                      { icon: Settings, label: 'المنصة', tab: 'settings' },
                      { icon: Home, label: 'أقسام الرئيسية', tab: 'homepage-sections' },
                      { icon: Settings, label: 'الأقسام', tab: 'platform-settings' },
                      { icon: Camera, label: 'الصور', tab: 'image-settings' },
                      { icon: ShieldCheck, label: 'المدراء', tab: 'sub-admins', badge: subAdmins.length },
                      { icon: Package, label: 'الفئات', tab: 'categories' },
                    ].map((item, i) => (
                      <button key={i} onClick={() => setActiveTab(item.tab)} className="bg-white p-2 flex flex-col items-center gap-1 hover:bg-gray-50 transition-colors">
                        <item.icon size={16} className="text-gray-600" />
                        <span className="text-[10px] text-gray-600">{item.label}</span>
                        {item.badge > 0 && <span className="text-[8px] bg-blue-500 text-white px-1 rounded-full">{item.badge}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 📊 التقارير والتحليلات */}
              {user.user_type === 'admin' && (
                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  <div className="bg-indigo-50 px-3 py-1.5 border-b border-indigo-100">
                    <h3 className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                      <TrendingUp size={12} /> التقارير والتحليلات
                    </h3>
                  </div>
                  <div className="grid grid-cols-4 gap-px bg-gray-100">
                    {[
                      { icon: TrendingUp, label: 'التحليلات', tab: 'analytics' },
                      { icon: Clock, label: 'سجل النشاط', tab: 'activity-log' },
                      { icon: AlertTriangle, label: 'حل المشاكل', tab: 'problem-solver' },
                    ].map((item, i) => (
                      <button key={i} onClick={() => setActiveTab(item.tab)} className="bg-white p-2 flex flex-col items-center gap-1 hover:bg-indigo-50 transition-colors">
                        <item.icon size={16} className="text-indigo-600" />
                        <span className="text-[10px] text-gray-600">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* تصفح كعميل */}
            <Link to="/?view=customer" className="block mt-3">
              <div className="bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] rounded-lg p-2.5 text-white flex items-center justify-between hover:opacity-90 transition-all">
                <div className="flex items-center gap-2">
                  <Home size={16} />
                  <span className="text-xs font-bold">تصفح كعميل</span>
                </div>
                <ChevronRight size={16} className="rotate-180" />
              </div>
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
