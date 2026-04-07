// /app/frontend/src/pages/AdminPage.js
// لوحة تحكم المدير - ترند سورية
// تم تقسيم الملف إلى مكونات منفصلة في /components/admin/

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, Package, ShoppingBag, Clock, AlertTriangle, Bell, 
  ChevronRight, Truck, DollarSign, ShieldCheck, Megaphone, Shield,
  UtensilsCrossed, Ticket, Flame, Settings, TrendingUp, Home, Flag, Map, BarChart2, Camera, Phone, Store, Trash2, User, Headphones, MessageCircle, MessageSquare, Wrench, LogOut, Wallet, Zap
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
import PendingFoodItemsTab from '../components/admin/PendingFoodItemsTab';
import PaymentSettingsTab from '../components/admin/PaymentSettingsTab';
import PlatformWalletTab from '../components/admin/PlatformWalletTab';
import FeedbackTab from '../components/admin/FeedbackTab';
import AllPendingJoinRequests from '../components/admin/AllPendingJoinRequests';
import AllPendingItemsTab from '../components/admin/AllPendingItemsTab';
import AllWithdrawRequestsTab from '../components/admin/AllWithdrawRequestsTab';
import SellerPromotionsTab from '../components/admin/SellerPromotionsTab';
import DriverSecurityTab from '../components/admin/DriverSecurityTab';
import SellerManagementTab from '../components/admin/SellerManagementTab';
import FoodStoreManagementTab from '../components/admin/FoodStoreManagementTab';

const API = process.env.REACT_APP_BACKEND_URL;

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, token, logout } = useAuth();
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
  const [pendingFoodStores, setPendingFoodStores] = useState([]);
  const [pendingFoodItems, setPendingFoodItems] = useState([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState([]);
  const [commissionsReport, setCommissionsReport] = useState(null);
  const [commissionRates, setCommissionRates] = useState(null);
  const [callRequestsCount, setCallRequestsCount] = useState(0);
  const [emergencyCount, setEmergencyCount] = useState(0);

  // تحديث URL عند تغيير التبويب + التمرير للأعلى
  useEffect(() => {
    // التمرير للأعلى عند تغيير التبويب
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0; // للمتصفحات القديمة
    
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
        axios.get(`${API}/api/admin/stats`),
        axios.get(`${API}/api/admin/sellers/pending`),
        axios.get(`${API}/api/admin/products/pending`),
        axios.get(`${API}/api/admin/notifications`),
        axios.get(`${API}/api/admin/users`),
        axios.get(`${API}/api/admin/sellers/all`),
        axios.get(`${API}/api/admin/orders`),
        axios.get(`${API}/api/admin/products/all`),
        axios.get(`${API}/api/admin/delivery/pending`),
        axios.get(`${API}/api/admin/delivery/all`),
        axios.get(`${API}/api/admin/food/stores?status=pending`),
        axios.get(`${API}/api/payment/admin/withdrawals?status=pending`),
        axios.get(`${API}/api/admin/food-items/pending`)
      ];
      
      if (user?.user_type === 'admin') {
        requests.push(axios.get(`${API}/api/admin/sub-admins`));
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
      setPendingFoodStores(responses[10]?.data || []);
      setPendingWithdrawals(responses[11]?.data || []);
      setPendingFoodItems(responses[12]?.data || []);
      
      if (user?.user_type === 'admin' && responses[13]) {
        setSubAdmins(responses[13].data);
      }
      
      // Fetch commissions data
      try {
        const [commissionsRes, ratesRes] = await Promise.all([
          axios.get(`${API}/api/admin/commissions`),
          axios.get(`${API}/api/admin/commissions/rates`)
        ]);
        setCommissionsReport(commissionsRes.data);
        setCommissionRates(ratesRes.data);
      } catch (err) {
        console.log('Commission data not available yet');
      }
      
      // Fetch call requests and emergency counts
      try {
        const [callRes, emergencyRes] = await Promise.all([
          axios.get(`${API}/api/admin/call-requests/count`).catch(() => ({ data: { count: 0 } })),
          axios.get(`${API}/api/admin/emergency-help/count`).catch(() => ({ data: { count: 0 } }))
        ]);
        setCallRequestsCount(callRes.data?.count || 0);
        setEmergencyCount(emergencyRes.data?.count || 0);
      } catch (err) {
        console.log('Call requests or emergency data not available');
        setCallRequestsCount(0);
        setEmergencyCount(0);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleApproveSeller = async (sellerId) => {
    // تحديث فوري للواجهة
    setPendingSellers(prev => prev.filter(s => s.id !== sellerId));
    
    try {
      await axios.post(`${API}/api/admin/sellers/${sellerId}/approve`);
      // لا نحتاج إشعار نجاح - اختفاء العنصر كافٍ
    } catch (error) {
      fetchData();
      toast({ title: "خطأ", description: "فشل تفعيل البائع", variant: "destructive" });
    }
  };

  const handleRejectSeller = async (sellerId, reason = '') => {
    // تحديث فوري للواجهة
    setPendingSellers(prev => prev.filter(s => s.id !== sellerId));
    
    try {
      await axios.post(`${API}/api/admin/sellers/${sellerId}/reject`, { reason });
      // لا نحتاج إشعار نجاح
    } catch (error) {
      fetchData();
      toast({ title: "خطأ", description: "فشل رفض البائع", variant: "destructive" });
    }
  };

  const handleApproveProduct = async (productId) => {
    // تحديث فوري للواجهة
    setPendingProducts(prev => prev.filter(p => p.id !== productId));
    
    try {
      await axios.post(`${API}/api/admin/products/${productId}/approve`);
      // لا نحتاج إشعار نجاح
    } catch (error) {
      fetchData();
      toast({ title: "خطأ", description: "فشل الموافقة على المنتج", variant: "destructive" });
    }
  };

  const handleRejectProduct = async (productId, reason = '') => {
    // تحديث فوري للواجهة
    setPendingProducts(prev => prev.filter(p => p.id !== productId));
    
    try {
      await axios.post(`${API}/api/admin/products/${productId}/reject`, { 
        approved: false, 
        rejection_reason: reason 
      });
      // لا نحتاج إشعار نجاح
    } catch (error) {
      fetchData();
      toast({ title: "خطأ", description: "فشل رفض المنتج", variant: "destructive" });
    }
  };

  const handleApproveDelivery = async (driverId) => {
    // تحديث فوري للواجهة
    setPendingDelivery(prev => prev.filter(d => d.id !== driverId));
    
    try {
      await axios.post(`${API}/api/admin/delivery/${driverId}/approve`);
      // لا نحتاج إشعار نجاح
    } catch (error) {
      fetchData();
      toast({ title: "خطأ", description: "فشل تفعيل موظف التوصيل", variant: "destructive" });
    }
  };

  const handleRejectDelivery = async (driverId, reason = '') => {
    // تحديث فوري للواجهة
    setPendingDelivery(prev => prev.filter(d => d.id !== driverId));
    
    try {
      await axios.post(`${API}/api/admin/delivery/${driverId}/reject`, { reason });
      // لا نحتاج إشعار نجاح
    } catch (error) {
      fetchData();
      toast({ title: "خطأ", description: "فشل رفض موظف التوصيل", variant: "destructive" });
    }
  };

  const handleAddSubAdmin = async (newSubAdmin) => {
    try {
      await axios.post(`${API}/api/admin/sub-admins`, newSubAdmin);
      // لا نحتاج إشعار نجاح
      fetchData(); // نحتاج fetchData هنا للحصول على البيانات الجديدة
    } catch (error) {
      toast({ 
        title: "خطأ", 
        description: error.response?.data?.detail || "فشل إضافة المدير التنفيذي", 
        variant: "destructive" 
      });
    }
  };

  // Delete modals
  const [deleteSubAdminModal, setDeleteSubAdminModal] = useState({ isOpen: false, id: null });
  const [deleteNotificationModal, setDeleteNotificationModal] = useState({ isOpen: false, id: null });

  const handleDeleteSubAdmin = async () => {
    if (!deleteSubAdminModal.id) return;
    const idToDelete = deleteSubAdminModal.id;
    
    // تحديث فوري للواجهة
    setSubAdmins(prev => prev.filter(s => s.id !== idToDelete));
    setDeleteSubAdminModal({ isOpen: false, id: null });
    
    try {
      await axios.delete(`${API}/api/admin/sub-admins/${idToDelete}`);
      // لا نحتاج إشعار نجاح
    } catch (error) {
      fetchData();
      toast({ title: "خطأ", description: "فشل حذف المدير التنفيذي", variant: "destructive" });
    }
  };

  const handleSendNotification = async (newNotification) => {
    try {
      await axios.post(`${API}/api/admin/notifications`, newNotification);
      // لا نحتاج إشعار نجاح
      fetchData(); // نحتاج fetchData للحصول على الإشعار الجديد
    } catch (error) {
      toast({ title: "خطأ", description: "فشل إرسال الإشعار", variant: "destructive" });
    }
  };

  const handleDeleteNotification = async () => {
    if (!deleteNotificationModal.id) return;
    const idToDelete = deleteNotificationModal.id;
    
    // تحديث فوري للواجهة
    setNotifications(prev => prev.filter(n => n.id !== idToDelete));
    setDeleteNotificationModal({ isOpen: false, id: null });
    
    try {
      await axios.delete(`${API}/api/admin/notifications/${idToDelete}`);
      // لا نحتاج إشعار نجاح
    } catch (error) {
      fetchData();
      toast({ title: "خطأ", description: "فشل حذف الإشعار", variant: "destructive" });
    }
  };

  const handleSaveRates = async (rates) => {
    await axios.put(`${API}/api/admin/commissions/rates`, rates);
    const res = await axios.get(`${API}/api/admin/commissions/rates`);
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
    'users': 'عملاء',
    'sellers': 'جميع البائعين',
    'products': 'جميع المنتجات',
    'orders': 'جميع الطلبات',
    'pending-products': 'المنتجات المعلقة',
    'pending-sellers': 'البائعين المعلقين',
    'pending-delivery': 'موظفي التوصيل المعلقين',
    'pending-food-stores': 'متاجر الطعام المعلقة',
    'pending-food-items': 'الأطباق المعلقة',
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
    'driver-security': 'تأمينات السائقين',
    'seller-management': 'إدارة البائعين',
    'food-store-management': 'إدارة متاجر الطعام',
    'violations': 'مخالفات السائقين',
    'price-reports': 'بلاغات الأسعار',
    'support-tickets': 'محادثات الدعم',
    'emergency-help': 'طلبات المساعدة الطارئة',
    'driver-reports': 'البلاغات الأخلاقية',
    'food-stores': 'متاجر الطعام',
    'featured-stores': 'المتاجر المميزة',
    'food-offers': 'عروض الفلاش',
    'coupons': 'كوبونات الخصم',
    'daily-deals': 'صفقات اليوم',
    'seller-promotions': 'فلاش',
    'platform-settings': 'تفعيل/إيقاف الأقسام',
    'analytics': 'التحليلات والإحصائيات',
    'drivers-map': 'خريطة السائقين',
    'drivers-performance': 'أداء السائقين',
    'activity-log': 'سجل النشاط',
    'support-management': 'طلبات الاتصال',
    'problem-solver': 'حل المشاكل',
    'ticker-messages': 'شريط العروض المتحرك',
    'image-settings': 'إعدادات الصور',
    'product-badges': 'شارات المنتجات',
    'categories': 'إدارة الفئات',
    'call-requests': 'طلبات الاتصال',
    'recorded-calls': 'المكالمات المسجلة',
    'payment-settings': 'إعدادات الدفع',
    'platform-wallet': 'محفظة المنصة',
    'feedback': 'اقتراحات المستخدمين',
    'all-join-requests': 'جميع طلبات الانضمام',
    'all-pending-items': 'جميع العناصر المعلقة',
    'all-withdraw-requests': 'جميع طلبات السحب'
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
                onDelete={(id) => setDeleteSubAdminModal({ isOpen: true, id })} 
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
                onDelete={(id) => setDeleteNotificationModal({ isOpen: true, id })} 
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
            {activeTab === 'driver-security' && user.user_type === 'admin' && (
              <DriverSecurityTab />
            )}
            {activeTab === 'seller-management' && user.user_type === 'admin' && (
              <SellerManagementTab />
            )}
            {activeTab === 'food-store-management' && user.user_type === 'admin' && (
              <FoodStoreManagementTab />
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
            {activeTab === 'pending-food-stores' && (
              <FoodStoresTab pendingOnly={true} pendingFoodStores={pendingFoodStores} onRefresh={fetchData} />
            )}
            {activeTab === 'pending-food-items' && (
              <PendingFoodItemsTab />
            )}
            
            {activeTab === 'featured-stores' && user.user_type === 'admin' && (
              <FeaturedStoresTab />
            )}
            {activeTab === 'food-offers' && user.user_type === 'admin' && (
              <FoodOffersTab token={localStorage.getItem('token')} />
            )}
            {activeTab === 'coupons' && user.user_type === 'admin' && (
              <CouponsTab token={localStorage.getItem('token')} />
            )}
            {activeTab === 'daily-deals' && user.user_type === 'admin' && (
              <DailyDealsTab />
            )}
            {activeTab === 'seller-promotions' && user.user_type === 'admin' && (
              <SellerPromotionsTab />
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
            {activeTab === 'payment-settings' && user.user_type === 'admin' && (
              <PaymentSettingsTab />
            )}
            {activeTab === 'platform-wallet' && user.user_type === 'admin' && (
              <PlatformWalletTab />
            )}
            {activeTab === 'feedback' && (
              <FeedbackTab />
            )}
            {activeTab === 'all-join-requests' && (
              <AllPendingJoinRequests />
            )}
            {activeTab === 'all-pending-items' && (
              <AllPendingItemsTab />
            )}
            {activeTab === 'all-withdraw-requests' && (
              <AllWithdrawRequestsTab />
            )}
          </>
        ) : (
          <>
            {/* Overview - Main Dashboard */}
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-lg font-bold text-gray-900">
                {user.user_type === 'admin' ? 'لوحة التحكم' : 'لوحة المدير التنفيذي'}
              </h1>
              <div className="flex items-center gap-2">
                {user.user_type === 'sub_admin' && (
                  <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">مدير تنفيذي</span>
                )}
                
                {/* أيقونة الخريطة */}
                <button
                  onClick={() => setActiveTab('drivers-map')}
                  className="relative p-2 bg-green-50 hover:bg-green-100 rounded-full transition-colors"
                  title="خريطة السائقين"
                  data-testid="map-icon"
                >
                  <Map size={20} className="text-green-600" />
                </button>
                
                {/* أيقونة طلبات الاتصال */}
                <button
                  onClick={() => setActiveTab('call-requests')}
                  className="relative p-2 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors"
                  title="طلبات الاتصال"
                  data-testid="call-requests-icon"
                >
                  <Phone size={20} className="text-blue-600" />
                  {callRequestsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {callRequestsCount > 9 ? '9+' : callRequestsCount}
                    </span>
                  )}
                </button>
                
                {/* أيقونة الطوارئ */}
                <button
                  onClick={() => setActiveTab('emergency-help')}
                  className={`relative p-2 rounded-full transition-colors ${emergencyCount > 0 ? 'bg-red-100 hover:bg-red-200 animate-pulse' : 'bg-red-50 hover:bg-red-100'}`}
                  title="طلبات الطوارئ"
                  data-testid="emergency-icon"
                >
                  <Headphones size={20} className={emergencyCount > 0 ? 'text-red-600' : 'text-red-500'} />
                  {emergencyCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                      {emergencyCount > 9 ? '9+' : emergencyCount}
                    </span>
                  )}
                </button>
                
                {/* أيقونة الإشعارات */}
                <button
                  onClick={() => setActiveTab('notifications')}
                  className="relative p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                  title="الإشعارات"
                  data-testid="notifications-icon"
                >
                  <Bell size={20} className="text-gray-600" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {notifications.length > 9 ? '9+' : notifications.length}
                    </span>
                  )}
                </button>

                {/* أيقونة حل المشاكل */}
                <button
                  onClick={() => setActiveTab('problem-solver')}
                  className="relative p-2 bg-purple-100 hover:bg-purple-200 rounded-full transition-colors"
                  title="حل المشاكل"
                  data-testid="problem-solver-icon"
                >
                  <Wrench size={20} className="text-purple-600" />
                </button>
              </div>
            </div>

            {/* الموافقات المعلقة - 3 أيقونات رئيسية */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              {/* طلبات الانضمام (بائعين + سائقين + متاجر طعام) */}
              <div 
                className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setActiveTab('all-join-requests')}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <Users size={20} className="text-amber-600" />
                  </div>
                  <span className="text-xl font-bold text-amber-600">
                    {(stats?.pending_sellers || pendingSellers.length || 0) + 
                     (stats?.pending_delivery || pendingDelivery.length || 0) + 
                     (pendingFoodStores.length || 0)}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-gray-800 mb-1">طلبات الانضمام</h3>
                <div className="flex flex-wrap gap-1">
                  <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">
                    بائعين: {stats?.pending_sellers || pendingSellers.length || 0}
                  </span>
                  <span className="text-[9px] bg-cyan-100 text-cyan-700 px-1.5 py-0.5 rounded-full">
                    سائقين: {stats?.pending_delivery || pendingDelivery.length || 0}
                  </span>
                  <span className="text-[9px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                    متاجر: {pendingFoodStores.length || 0}
                  </span>
                </div>
              </div>

              {/* العناصر المعلقة (منتجات + أطباق) */}
              <div 
                className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-3 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setActiveTab('all-pending-items')}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Package size={20} className="text-blue-600" />
                  </div>
                  <span className="text-xl font-bold text-blue-600">
                    {(stats?.pending_products || pendingProducts.length || 0) + 
                     (pendingFoodItems.length || 0)}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-gray-800 mb-1">العناصر المعلقة</h3>
                <div className="flex flex-wrap gap-1">
                  <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                    منتجات: {stats?.pending_products || pendingProducts.length || 0}
                  </span>
                  <span className="text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">
                    أطباق: {pendingFoodItems.length || 0}
                  </span>
                </div>
              </div>

              {/* السحوبات */}
              <div 
                className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-3 hover:shadow-md transition-all cursor-pointer"
                onClick={() => setActiveTab('all-withdraw-requests')}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <DollarSign size={20} className="text-purple-600" />
                  </div>
                  <span className="text-xl font-bold text-purple-600">
                    {pendingWithdrawals.length || 0}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-gray-800 mb-1">طلبات السحب</h3>
                <p className="text-[9px] text-gray-500">بانتظار الموافقة</p>
              </div>
            </div>

            {/* ======== الأقسام المجمّعة ======== */}
            <div className="space-y-3">
              
              {/* 👥 المستخدمين */}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="bg-blue-50 px-3 py-1.5 border-b border-blue-100">
                  <h3 className="text-xs font-bold text-blue-700 flex items-center gap-1.5">
                    <Users size={12} /> المستخدمين
                  </h3>
                </div>
                <div className="grid grid-cols-5 gap-px bg-gray-100">
                  {[
                    { icon: User, label: 'عملاء', tab: 'users' },
                    { icon: Store, label: 'بائعين', tab: 'sellers' },
                    { icon: Store, label: 'إدارة البائعين', tab: 'seller-management' },
                    { icon: UtensilsCrossed, label: 'إدارة المطاعم', tab: 'food-store-management' },
                    { icon: Truck, label: 'سائقين', tab: 'delivery' },
                  ].map((item, i) => (
                    <button key={i} onClick={() => setActiveTab(item.tab)} className="bg-white p-2 flex flex-col items-center gap-1 hover:bg-blue-50 transition-colors">
                      <item.icon size={16} className="text-blue-600" />
                      <span className="text-[10px] text-gray-600">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 🎧 الدعم الفني */}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="bg-indigo-50 px-3 py-1.5 border-b border-indigo-100">
                  <h3 className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                    <Headphones size={12} /> الدعم الفني
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-px bg-gray-100">
                  {[
                    { icon: MessageCircle, label: 'محادثات الدعم', tab: 'support-tickets' },
                    { icon: MessageSquare, label: 'اقتراحات المستخدمين', tab: 'feedback' },
                  ].map((item, i) => (
                    <button key={i} onClick={() => setActiveTab(item.tab)} className="bg-white p-2 flex flex-col items-center gap-1 hover:bg-indigo-50 transition-colors">
                      <item.icon size={16} className="text-indigo-600" />
                      <span className="text-[10px] text-gray-600">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 🚚 التوصيل */}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="bg-cyan-50 px-3 py-1.5 border-b border-cyan-100">
                  <h3 className="text-xs font-bold text-cyan-700 flex items-center gap-1.5">
                    <Truck size={12} /> إعدادات التوصيل
                  </h3>
                </div>
                <div className="grid grid-cols-4 gap-px bg-gray-100">
                  {[
                    { icon: BarChart2, label: 'الأداء', tab: 'drivers-performance' },
                    { icon: Settings, label: 'الإعدادات', tab: 'delivery-settings' },
                    { icon: Shield, label: 'التأمينات', tab: 'driver-security' },
                    { icon: Package, label: 'الصناديق', tab: 'delivery-boxes' },
                    { icon: AlertTriangle, label: 'المخالفات', tab: 'violations' },
                    { icon: DollarSign, label: 'التحديات', tab: 'challenges' },
                    { icon: Phone, label: 'المكالمات المسجلة', tab: 'recorded-calls' },
                  ].map((item, i) => (
                    <button key={i} onClick={() => setActiveTab(item.tab)} className="bg-white p-2 flex flex-col items-center gap-1 hover:bg-cyan-50 transition-colors">
                      <item.icon size={16} className="text-cyan-600" />
                      <span className="text-[10px] text-gray-600">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 🏪 المتاجر والمنتجات */}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="bg-purple-50 px-3 py-1.5 border-b border-purple-100">
                  <h3 className="text-xs font-bold text-purple-700 flex items-center gap-1.5">
                    <Package size={12} /> المتاجر والمنتجات
                  </h3>
                </div>
                <div className="grid grid-cols-4 gap-px bg-gray-100">
                  {[
                    { icon: Package, label: 'المنتجات', tab: 'products' },
                    { icon: ShoppingBag, label: 'الطلبات', tab: 'orders' },
                    { icon: DollarSign, label: 'العمولات', tab: 'commissions' },
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
                    { icon: Zap, label: 'فلاش', tab: 'seller-promotions' },
                    { icon: Megaphone, label: 'عروض فلاش', tab: 'food-offers' },
                    { icon: Ticket, label: 'الكوبونات', tab: 'coupons' },
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
                      { icon: DollarSign, label: 'الدفع', tab: 'payment-settings' },
                      { icon: Wallet, label: 'محفظة المنصة', tab: 'platform-wallet' },
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
                  <div className="grid grid-cols-2 gap-px bg-gray-100">
                    {[
                      { icon: TrendingUp, label: 'التحليلات', tab: 'analytics' },
                      { icon: Clock, label: 'سجل النشاط', tab: 'activity-log' },
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

            {/* تسجيل الخروج */}
            <button 
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="w-full mt-2 bg-red-500 hover:bg-red-600 rounded-lg p-2.5 text-white flex items-center justify-center gap-2 transition-all"
            >
              <LogOut size={16} />
              <span className="text-xs font-bold">تسجيل الخروج</span>
            </button>
          </>
        )}

        {/* Delete Sub-Admin Modal */}
        {deleteSubAdminModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-sm p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 size={20} className="text-red-600" />
                </div>
                <h3 className="font-bold">حذف المدير التنفيذي</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                هل تريد حذف هذا المدير التنفيذي؟ لا يمكن التراجع عن هذا الإجراء.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteSubAdminModal({ isOpen: false, id: null })}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleDeleteSubAdmin}
                  className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  حذف
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Notification Modal */}
        {deleteNotificationModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-sm p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 size={20} className="text-red-600" />
                </div>
                <h3 className="font-bold">حذف الإشعار</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                هل تريد حذف هذا الإشعار؟
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteNotificationModal({ isOpen: false, id: null })}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleDeleteNotification}
                  className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  حذف
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
