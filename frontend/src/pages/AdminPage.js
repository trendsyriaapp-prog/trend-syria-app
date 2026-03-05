// /app/frontend/src/pages/AdminPage.js
// لوحة تحكم المدير - تريند سورية
// تم تقسيم الملف إلى مكونات منفصلة في /components/admin/

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Users, Package, ShoppingBag, Clock, AlertTriangle, Bell, 
  ChevronRight, Truck, DollarSign, ShieldCheck, Megaphone
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

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  // State
  const [stats, setStats] = useState(null);
  const [pendingSellers, setPendingSellers] = useState([]);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [subAdmins, setSubAdmins] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [allUsers, setAllUsers] = useState([]);
  const [allSellers, setAllSellers] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [pendingDelivery, setPendingDelivery] = useState([]);
  const [allDelivery, setAllDelivery] = useState([]);
  const [commissionsReport, setCommissionsReport] = useState(null);
  const [commissionRates, setCommissionRates] = useState(null);

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

  const handleRejectSeller = async (sellerId) => {
    if (!window.confirm('هل تريد رفض هذا البائع؟')) return;
    try {
      await axios.post(`${API}/admin/sellers/${sellerId}/reject`);
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

  const handleRejectProduct = async (productId) => {
    const reason = window.prompt('سبب الرفض (اختياري):');
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

  const handleRejectDelivery = async (driverId) => {
    if (!window.confirm('هل تريد رفض موظف التوصيل هذا؟')) return;
    try {
      await axios.post(`${API}/admin/delivery/${driverId}/reject`);
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
    'ads': 'إدارة الإعلانات'
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
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
