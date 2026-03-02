import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Users, Package, ShoppingBag, Check, X, 
  Eye, Clock, UserPlus, Trash2, ShieldCheck, AlertTriangle, Bell, Send, ChevronRight, Truck, DollarSign, Percent
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const AdminDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [stats, setStats] = useState(null);
  const [pendingSellers, setPendingSellers] = useState([]);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [subAdmins, setSubAdmins] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [showAddSubAdmin, setShowAddSubAdmin] = useState(false);
  const [showAddNotification, setShowAddNotification] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [allSellers, setAllSellers] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [pendingDelivery, setPendingDelivery] = useState([]);
  const [allDelivery, setAllDelivery] = useState([]);
  const [commissionsReport, setCommissionsReport] = useState(null);
  const [commissionRates, setCommissionRates] = useState(null);
  const [editingRates, setEditingRates] = useState(false);
  const [editedRates, setEditedRates] = useState({});
  const [newCategory, setNewCategory] = useState({ name: '', rate: '' });
  const [newSubAdmin, setNewSubAdmin] = useState({
    full_name: '',
    phone: '',
    password: '',
    city: ''
  });
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    target: 'all'
  });

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
        axios.get(`${API}/admin/sellers`),
        axios.get(`${API}/admin/orders`),
        axios.get(`${API}/admin/products/all`),
        axios.get(`${API}/admin/delivery/pending`),
        axios.get(`${API}/admin/delivery/all`)
      ];
      
      // فقط المدير الرئيسي يمكنه رؤية المدراء التنفيذيين
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
      
      // جلب بيانات العمولات
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

  const handleAddSubAdmin = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/admin/sub-admins`, newSubAdmin);
      toast({ title: "تمت الإضافة", description: "تم إضافة المدير التنفيذي بنجاح" });
      setShowAddSubAdmin(false);
      setNewSubAdmin({ full_name: '', phone: '', password: '', city: '' });
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

  const handleSendNotification = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/admin/notifications`, newNotification);
      toast({ title: "تم الإرسال", description: "تم إرسال الإشعار بنجاح" });
      setShowAddNotification(false);
      setNewNotification({ title: '', message: '', target: 'all' });
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

  // === دوال تعديل العمولات ===
  const handleStartEditRates = () => {
    const ratesObj = {};
    commissionRates.rates.forEach(r => {
      ratesObj[r.category] = r.rate;
    });
    ratesObj['default'] = commissionRates.default_rate;
    setEditedRates(ratesObj);
    setEditingRates(true);
  };

  const handleSaveRates = async () => {
    try {
      await axios.put(`${API}/admin/commissions/rates`, editedRates);
      toast({ title: "تم", description: "تم تحديث نسب العمولات بنجاح" });
      setEditingRates(false);
      // إعادة جلب البيانات
      const res = await axios.get(`${API}/admin/commissions/rates`);
      setCommissionRates(res.data);
    } catch (error) {
      toast({ title: "خطأ", description: "فشل تحديث نسب العمولات", variant: "destructive" });
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategory.name || !newCategory.rate) return;
    
    try {
      const rate = parseFloat(newCategory.rate) / 100;
      await axios.post(`${API}/admin/commissions/rates/category?category=${encodeURIComponent(newCategory.name)}&rate=${rate}`);
      toast({ title: "تم", description: `تم إضافة فئة ${newCategory.name}` });
      setNewCategory({ name: '', rate: '' });
      // إعادة جلب البيانات
      const res = await axios.get(`${API}/admin/commissions/rates`);
      setCommissionRates(res.data);
    } catch (error) {
      toast({ title: "خطأ", description: "فشل إضافة الفئة", variant: "destructive" });
    }
  };

  const handleDeleteCategory = async (category) => {
    if (!window.confirm(`هل أنت متأكد من حذف فئة "${category}"؟`)) return;
    
    try {
      await axios.delete(`${API}/admin/commissions/rates/category/${encodeURIComponent(category)}`);
      toast({ title: "تم", description: `تم حذف فئة ${category}` });
      // إعادة جلب البيانات
      const res = await axios.get(`${API}/admin/commissions/rates`);
      setCommissionRates(res.data);
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حذف الفئة", variant: "destructive" });
    }
  };

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

  return (
    <div className="min-h-screen pb-20 md:pb-10 bg-gray-50">
      <div className="max-w-5xl mx-auto px-3 py-4">
        
        {/* إذا كان في صفحة فرعية، أظهر زر الرجوع والمحتوى فقط */}
        {activeTab !== 'overview' ? (
          <>
            {/* Header with Back Button */}
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setActiveTab('overview')}
                className="w-8 h-8 bg-white rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
                data-testid="back-btn"
              >
                <ChevronRight size={18} className="text-gray-600" />
              </button>
              <h1 className="text-base font-bold text-gray-900">
                {activeTab === 'users' && 'جميع المستخدمين'}
                {activeTab === 'sellers' && 'جميع البائعين'}
                {activeTab === 'products' && 'جميع المنتجات'}
                {activeTab === 'orders' && 'جميع الطلبات'}
                {activeTab === 'pending-products' && 'المنتجات المعلقة'}
                {activeTab === 'pending-sellers' && 'البائعين المعلقين'}
                {activeTab === 'pending-delivery' && 'موظفي التوصيل المعلقين'}
                {activeTab === 'delivery' && 'موظفي التوصيل'}
                {activeTab === 'notifications' && 'الإشعارات'}
                {activeTab === 'sub-admins' && 'المدراء التنفيذيين'}
                {activeTab === 'commissions' && 'العمولات'}
              </h1>
            </div>
          </>
        ) : (
          <>
            {/* الصفحة الرئيسية - نظرة عامة */}
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-xl font-bold text-gray-900">
                {user.user_type === 'admin' ? 'لوحة تحكم المدير' : 'لوحة تحكم المدير التنفيذي'}
              </h1>
              {user.user_type === 'sub_admin' && (
                <span className="text-xs bg-blue-100 text-blue-600 px-3 py-1 rounded-full">مدير تنفيذي</span>
              )}
            </div>

            {/* Stats */}
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
                onClick={() => setActiveTab('notifications')}
                className="bg-white rounded-xl p-3 border border-gray-200 hover:border-[#FF6B00] hover:shadow-lg transition-all flex items-center gap-2.5"
              >
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                  <Bell size={16} className="text-[#FF6B00]" />
                </div>
                <span className="text-xs font-bold text-gray-700">الإشعارات ({notifications.length})</span>
              </button>
              {user.user_type === 'admin' && (
                <button
                  onClick={() => setActiveTab('sub-admins')}
                  className="bg-white rounded-xl p-3 border border-gray-200 hover:border-[#FF6B00] hover:shadow-lg transition-all flex items-center gap-2.5"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <ShieldCheck size={16} className="text-blue-600" />
                  </div>
                  <span className="text-xs font-bold text-gray-700">المدراء ({subAdmins.length})</span>
                </button>
              )}
            </div>
          </>
        )}

        {/* Users Section */}
        {activeTab === 'users' && (
          <section>
            <h2 className="font-bold text-sm text-gray-900 mb-3">جميع المستخدمين ({allUsers.length})</h2>
            {allUsers.length === 0 ? (
              <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
                <Users size={36} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">لا يوجد مستخدمين</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-2 px-2 text-right font-bold text-gray-700">الاسم</th>
                        <th className="py-2 px-2 text-right font-bold text-gray-700">الهاتف</th>
                        <th className="py-2 px-2 text-right font-bold text-gray-700">المدينة</th>
                        <th className="py-2 px-2 text-right font-bold text-gray-700">العنوان الكامل</th>
                        <th className="py-2 px-2 text-right font-bold text-gray-700">تاريخ التسجيل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.map((u, i) => (
                        <tr key={u.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="py-2 px-2 font-medium text-gray-900">{u.full_name || u.name}</td>
                          <td className="py-2 px-2 text-gray-600">{u.phone}</td>
                          <td className="py-2 px-2 text-gray-600">{u.city}</td>
                          <td className="py-2 px-2 text-gray-600 text-[10px]">
                            {u.addresses && u.addresses.length > 0 ? (
                              <div>
                                <p>{u.addresses[0].street}</p>
                                {u.addresses[0].street_number && <span>شارع {u.addresses[0].street_number}</span>}
                                {u.addresses[0].building_number && <span> - بناء {u.addresses[0].building_number}</span>}
                                {u.addresses[0].house_number && <span> - منزل {u.addresses[0].house_number}</span>}
                                <p className="text-gray-400">{u.addresses[0].city} - {u.addresses[0].country}</p>
                              </div>
                            ) : (
                              <span className="text-gray-400">لا يوجد عنوان</span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-gray-400 text-[10px]">
                            {u.created_at ? new Date(u.created_at).toLocaleDateString('ar-SY') : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Sellers Section */}
        {activeTab === 'sellers' && (
          <section>
            <h2 className="font-bold text-sm text-gray-900 mb-3">جميع البائعين ({allSellers.length})</h2>
            {allSellers.length === 0 ? (
              <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
                <Users size={36} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">لا يوجد بائعين</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-2 px-2 text-right font-bold text-gray-700">الاسم</th>
                        <th className="py-2 px-2 text-right font-bold text-gray-700">المتجر</th>
                        <th className="py-2 px-2 text-right font-bold text-gray-700">الهاتف</th>
                        <th className="py-2 px-2 text-right font-bold text-gray-700">المدينة</th>
                        <th className="py-2 px-2 text-right font-bold text-gray-700">العنوان الكامل</th>
                        <th className="py-2 px-2 text-right font-bold text-gray-700">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allSellers.map((s, i) => (
                        <tr key={s.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="py-2 px-2 font-medium text-gray-900">{s.full_name || s.name}</td>
                          <td className="py-2 px-2 text-gray-600">{s.documents?.business_name || '-'}</td>
                          <td className="py-2 px-2 text-gray-600">{s.phone}</td>
                          <td className="py-2 px-2 text-gray-600">{s.city}</td>
                          <td className="py-2 px-2 text-gray-600 text-[10px]">
                            {s.addresses && s.addresses.length > 0 ? (
                              <div>
                                <p>{s.addresses[0].street}</p>
                                {s.addresses[0].street_number && <span>شارع {s.addresses[0].street_number}</span>}
                                {s.addresses[0].building_number && <span> - بناء {s.addresses[0].building_number}</span>}
                                {s.addresses[0].house_number && <span> - منزل {s.addresses[0].house_number}</span>}
                                <p className="text-gray-400">{s.addresses[0].city} - {s.addresses[0].country}</p>
                              </div>
                            ) : (
                              <span className="text-gray-400">لا يوجد عنوان</span>
                            )}
                          </td>
                          <td className="py-2 px-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              s.documents?.status === 'approved' 
                                ? 'bg-green-100 text-green-600' 
                                : s.documents?.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-600'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {s.documents?.status === 'approved' ? 'معتمد' : s.documents?.status === 'pending' ? 'معلق' : 'غير مكتمل'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Products Section */}
        {activeTab === 'products' && (
          <section>
            <h2 className="font-bold text-sm text-gray-900 mb-3">جميع المنتجات ({allProducts.length})</h2>
            {allProducts.length === 0 ? (
              <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
                <Package size={36} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">لا يوجد منتجات</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {allProducts.map((product) => (
                  <div key={product.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <img 
                      src={product.images?.[0] || 'https://via.placeholder.com/150'} 
                      alt={product.name}
                      className="w-full h-24 object-cover"
                    />
                    <div className="p-2">
                      <h3 className="font-bold text-[11px] text-gray-900 line-clamp-1">{product.name}</h3>
                      <p className="text-[#FF6B00] font-bold text-xs">{formatPrice(product.price)}</p>
                      <p className="text-[9px] text-gray-400">المخزون: {product.stock}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Orders Section */}
        {activeTab === 'orders' && (
          <section>
            <h2 className="font-bold text-sm text-gray-900 mb-3">جميع الطلبات ({allOrders.length})</h2>
            {allOrders.length === 0 ? (
              <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
                <ShoppingBag size={36} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">لا يوجد طلبات</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allOrders.map((order) => (
                  <div key={order.id} className="bg-white rounded-lg border border-gray-200 p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-gray-900">#{order.id?.slice(0, 8)}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        order.status === 'paid' ? 'bg-green-100 text-green-600' :
                        order.status === 'pending_payment' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {order.status === 'paid' ? 'مدفوع' : order.status === 'pending_payment' ? 'بانتظار الدفع' : order.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600">العميل: {order.user_name}</p>
                    <p className="text-[11px] text-gray-600">المدينة: {order.city}</p>
                    <p className="text-[#FF6B00] font-bold text-xs mt-1">الإجمالي: {formatPrice(order.total)}</p>
                    <p className="text-[9px] text-gray-400 mt-1">
                      {order.created_at ? new Date(order.created_at).toLocaleDateString('ar-SY', {
                        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      }) : '-'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Pending Products */}
        {activeTab === 'pending-products' && (
          <section>
            {pendingProducts.length === 0 ? (
              <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
                <Check size={36} className="text-green-500 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">لا يوجد منتجات في انتظار الموافقة</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingProducts.map((product) => (
                  <div key={product.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="p-2 flex gap-2">
                      <img 
                        src={product.images?.[0] || 'https://via.placeholder.com/100'} 
                        alt={product.name}
                        className="w-14 h-14 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-bold text-xs text-gray-900">{product.name}</h3>
                        <p className="text-[10px] text-gray-500 line-clamp-1">{product.description}</p>
                        <p className="text-[#FF6B00] font-bold text-xs mt-0.5">{formatPrice(product.price)}</p>
                        <p className="text-[9px] text-gray-400">
                          البائع: {product.seller?.name || product.seller_name}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handleApproveProduct(product.id)}
                          className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                          data-testid={`approve-product-${product.id}`}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => handleRejectProduct(product.id)}
                          className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                          data-testid={`reject-product-${product.id}`}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Pending Sellers */}
        {activeTab === 'pending-sellers' && (
          <section>
            {pendingSellers.length === 0 ? (
              <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
                <Check size={36} className="text-green-500 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">لا يوجد بائعين في انتظار الموافقة</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingSellers.map((doc) => (
                  <div key={doc.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="p-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-xs text-gray-900">{doc.business_name}</h3>
                          <p className="text-[10px] text-gray-500">{doc.seller?.name} - {doc.seller?.phone}</p>
                          <p className="text-[10px] text-gray-400">{doc.seller?.city}</p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)}
                            className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            data-testid={`view-doc-${doc.id}`}
                          >
                            <Eye size={14} className="text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleApproveSeller(doc.seller_id)}
                            className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                            data-testid={`approve-seller-${doc.seller_id}`}
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => handleRejectSeller(doc.seller_id)}
                            className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                            data-testid={`reject-seller-${doc.seller_id}`}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {selectedDoc?.id === doc.id && (
                      <div className="border-t border-gray-200 p-2 bg-gray-50">
                        <p className="text-[10px] text-gray-500 mb-1">شهادة البائع:</p>
                        {doc.business_license ? (
                          <img src={doc.business_license} alt="شهادة البائع" className="max-w-full max-h-48 rounded-lg" />
                        ) : (
                          <p className="text-gray-400 text-xs">لا توجد صورة</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Pending Delivery Drivers */}
        {activeTab === 'pending-delivery' && (
          <section>
            {pendingDelivery.length === 0 ? (
              <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
                <Check size={36} className="text-green-500 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">لا يوجد موظفي توصيل في انتظار الموافقة</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingDelivery.map((doc) => (
                  <div key={doc.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="p-3">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-bold text-sm text-gray-900">{doc.driver_name}</h3>
                          <p className="text-xs text-gray-500">{doc.driver_phone}</p>
                          <p className="text-xs text-gray-400">{doc.driver_city}</p>
                          <p className="text-xs text-gray-600 mt-1">رقم الهوية: {doc.national_id}</p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleApproveDelivery(doc.driver_id)}
                            className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => handleRejectDelivery(doc.driver_id)}
                            className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>

                      {/* الوثائق */}
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <p className="text-[10px] text-gray-500 mb-1">صورة شخصية</p>
                          {doc.personal_photo && (
                            <img src={doc.personal_photo} alt="صورة شخصية" className="w-full h-20 object-cover rounded-lg" />
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 mb-1">صورة الهوية</p>
                          {doc.id_photo && (
                            <img src={doc.id_photo} alt="صورة الهوية" className="w-full h-20 object-cover rounded-lg" />
                          )}
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-500 mb-1">رخصة الدراجة</p>
                          {doc.motorcycle_license && (
                            <img src={doc.motorcycle_license} alt="رخصة الدراجة" className="w-full h-20 object-cover rounded-lg" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* All Delivery Drivers */}
        {activeTab === 'delivery' && (
          <section>
            {allDelivery.length === 0 ? (
              <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
                <Truck size={36} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">لا يوجد موظفي توصيل</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-2 px-2 text-right font-bold text-gray-700">الاسم</th>
                        <th className="py-2 px-2 text-right font-bold text-gray-700">الهاتف</th>
                        <th className="py-2 px-2 text-right font-bold text-gray-700">المدينة</th>
                        <th className="py-2 px-2 text-right font-bold text-gray-700">رقم الهوية</th>
                        <th className="py-2 px-2 text-right font-bold text-gray-700">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allDelivery.map((driver, i) => (
                        <tr key={driver.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="py-2 px-2 font-medium text-gray-900">{driver.full_name || driver.name}</td>
                          <td className="py-2 px-2 text-gray-600">{driver.phone}</td>
                          <td className="py-2 px-2 text-gray-600">{driver.city}</td>
                          <td className="py-2 px-2 text-gray-600">{driver.documents?.national_id || '-'}</td>
                          <td className="py-2 px-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                              driver.documents?.status === 'approved' 
                                ? 'bg-green-100 text-green-600' 
                                : driver.documents?.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-600'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {driver.documents?.status === 'approved' ? 'معتمد' : driver.documents?.status === 'pending' ? 'معلق' : 'غير مكتمل'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Sub-Admins (Admin Only) */}
        {activeTab === 'sub-admins' && user.user_type === 'admin' && (
          <section>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-sm text-gray-900">المدراء التنفيذيين</h2>
              <button
                onClick={() => setShowAddSubAdmin(true)}
                className="flex items-center gap-1 bg-[#FF6B00] text-white px-2 py-1 rounded-lg text-xs font-bold hover:bg-[#E65000] transition-colors"
                data-testid="add-sub-admin-btn"
              >
                <UserPlus size={12} />
                إضافة مدير
              </button>
            </div>

            {/* Add Sub-Admin Form */}
            {showAddSubAdmin && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg border border-gray-200 p-3 mb-3"
              >
                <h3 className="font-bold text-xs text-gray-900 mb-2">إضافة مدير تنفيذي جديد</h3>
                <form onSubmit={handleAddSubAdmin} className="space-y-2">
                  <input
                    type="text"
                    placeholder="الاسم الكامل"
                    value={newSubAdmin.full_name}
                    onChange={(e) => setNewSubAdmin({...newSubAdmin, full_name: e.target.value})}
                    className="w-full p-1.5 border border-gray-300 rounded-lg text-xs"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="رقم الهاتف"
                    value={newSubAdmin.phone}
                    onChange={(e) => setNewSubAdmin({...newSubAdmin, phone: e.target.value})}
                    className="w-full p-1.5 border border-gray-300 rounded-lg text-xs"
                    required
                  />
                  <input
                    type="password"
                    placeholder="كلمة المرور"
                    value={newSubAdmin.password}
                    onChange={(e) => setNewSubAdmin({...newSubAdmin, password: e.target.value})}
                    className="w-full p-1.5 border border-gray-300 rounded-lg text-xs"
                    required
                  />
                  <input
                    type="text"
                    placeholder="المدينة"
                    value={newSubAdmin.city}
                    onChange={(e) => setNewSubAdmin({...newSubAdmin, city: e.target.value})}
                    className="w-full p-1.5 border border-gray-300 rounded-lg text-xs"
                    required
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-[#FF6B00] text-white py-1.5 rounded-lg font-bold text-xs"
                    >
                      إضافة
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddSubAdmin(false)}
                      className="flex-1 bg-gray-200 text-gray-700 py-1.5 rounded-lg font-bold text-xs"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {subAdmins.length === 0 ? (
              <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
                <ShieldCheck size={36} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">لا يوجد مدراء تنفيذيين</p>
              </div>
            ) : (
              <div className="space-y-2">
                {subAdmins.map((admin) => (
                  <div key={admin.id} className="bg-white rounded-lg border border-gray-200 p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <ShieldCheck size={14} className="text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-xs text-gray-900">{admin.full_name || admin.name}</h3>
                          <p className="text-[10px] text-gray-500">{admin.phone} - {admin.city}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSubAdmin(admin.id)}
                        className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        data-testid={`delete-sub-admin-${admin.id}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Commissions Section */}
        {activeTab === 'commissions' && (
          <section>
            <h2 className="font-bold text-sm text-gray-900 mb-3">تقرير العمولات</h2>
            
            {/* ملخص العمولات */}
            {commissionsReport && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-white rounded-xl p-3 border border-gray-200">
                  <p className="text-[10px] text-gray-500">إجمالي المبيعات</p>
                  <p className="text-lg font-bold text-gray-900">{formatPrice(commissionsReport.summary.total_sales)}</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-200">
                  <p className="text-[10px] text-gray-500">إجمالي العمولات</p>
                  <p className="text-lg font-bold text-green-600">{formatPrice(commissionsReport.summary.total_commission)}</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-200">
                  <p className="text-[10px] text-gray-500">حصة البائعين</p>
                  <p className="text-lg font-bold text-blue-600">{formatPrice(commissionsReport.summary.total_seller_amount)}</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-gray-200">
                  <p className="text-[10px] text-gray-500">عدد الطلبات</p>
                  <p className="text-lg font-bold text-gray-900">{commissionsReport.summary.orders_count}</p>
                </div>
              </div>
            )}
            
            {/* نسب العمولات حسب الفئة */}
            {commissionRates && (
              <div className="bg-white rounded-xl p-3 border border-gray-200 mb-4">
                <h3 className="font-bold text-xs text-gray-900 mb-2 flex items-center gap-1">
                  <Percent size={14} className="text-[#FF6B00]" />
                  نسب العمولات حسب الفئة
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {commissionRates.rates.map((rate) => (
                    <div key={rate.category} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                      <span className="text-xs text-gray-700">{rate.category}</span>
                      <span className="text-xs font-bold text-[#FF6B00]">{rate.percentage}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center">
                  <span className="text-xs text-gray-500">النسبة الافتراضية</span>
                  <span className="text-xs font-bold text-gray-700">{commissionRates.default_percentage}</span>
                </div>
              </div>
            )}
            
            {/* العمولات حسب الفئة */}
            {commissionsReport?.by_category && Object.keys(commissionsReport.by_category).length > 0 && (
              <div className="bg-white rounded-xl p-3 border border-gray-200 mb-4">
                <h3 className="font-bold text-xs text-gray-900 mb-2">العمولات حسب الفئة</h3>
                <div className="space-y-2">
                  {Object.entries(commissionsReport.by_category).map(([category, data]) => (
                    <div key={category} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-xs font-bold text-gray-900">{category}</p>
                        <p className="text-[10px] text-gray-500">{data.orders_count} طلب</p>
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-green-600">{formatPrice(data.commission)}</p>
                        <p className="text-[10px] text-gray-500">من {formatPrice(data.sales)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* أعلى البائعين */}
            {commissionsReport?.by_seller && commissionsReport.by_seller.length > 0 && (
              <div className="bg-white rounded-xl p-3 border border-gray-200">
                <h3 className="font-bold text-xs text-gray-900 mb-2">أعلى البائعين (حسب العمولة)</h3>
                <div className="space-y-2">
                  {commissionsReport.by_seller.slice(0, 10).map((seller, index) => (
                    <div key={seller.seller_id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#FF6B00] text-white text-[10px] flex items-center justify-center font-bold">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-gray-900">{seller.seller_name}</p>
                          <p className="text-[10px] text-gray-500">{seller.seller_phone}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-green-600">{formatPrice(seller.commission)}</p>
                        <p className="text-[10px] text-gray-500">مبيعات: {formatPrice(seller.sales)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {!commissionsReport && (
              <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
                <DollarSign size={36} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">لا توجد بيانات عمولات بعد</p>
                <p className="text-gray-400 text-xs mt-1">ستظهر العمولات بعد إتمام أول عملية بيع</p>
              </div>
            )}
          </section>
        )}

        {/* Notifications */}
        {activeTab === 'notifications' && (
          <section>
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-sm text-gray-900">إدارة الإشعارات</h2>
              <button
                onClick={() => setShowAddNotification(true)}
                className="flex items-center gap-1 bg-[#FF6B00] text-white px-2 py-1 rounded-full text-xs font-bold"
              >
                <Bell size={12} />
                إشعار جديد
              </button>
            </div>

            {showAddNotification && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg p-3 border border-gray-200 mb-3"
              >
                <h3 className="font-bold text-xs text-gray-900 mb-2">إرسال إشعار جديد</h3>
                <form onSubmit={handleSendNotification} className="space-y-2">
                  <input
                    type="text"
                    placeholder="عنوان الإشعار"
                    value={newNotification.title}
                    onChange={(e) => setNewNotification({...newNotification, title: e.target.value})}
                    className="w-full p-1.5 border border-gray-300 rounded-lg text-xs"
                    required
                  />
                  <textarea
                    placeholder="نص الإشعار"
                    value={newNotification.message}
                    onChange={(e) => setNewNotification({...newNotification, message: e.target.value})}
                    className="w-full p-1.5 border border-gray-300 rounded-lg text-xs"
                    rows={2}
                    required
                  />
                  <div>
                    <label className="block text-[10px] text-gray-600 mb-0.5">إرسال إلى</label>
                    <select
                      value={newNotification.target}
                      onChange={(e) => setNewNotification({...newNotification, target: e.target.value})}
                      className="w-full p-1.5 border border-gray-300 rounded-lg text-xs bg-white"
                    >
                      <option value="all">الجميع</option>
                      <option value="buyers">المشترين فقط</option>
                      <option value="sellers">البائعين فقط</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-[#FF6B00] text-white py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1"
                    >
                      <Send size={12} />
                      إرسال
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddNotification(false)}
                      className="flex-1 bg-gray-200 text-gray-700 py-1.5 rounded-lg font-bold text-xs"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {notifications.length === 0 ? (
              <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
                <Bell size={36} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">لا توجد إشعارات مرسلة</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div key={notification.id} className="bg-white rounded-lg border border-gray-200 p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-bold text-xs text-gray-900">{notification.title}</h3>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                            notification.target === 'all' ? 'bg-blue-100 text-blue-600' :
                            notification.target === 'buyers' ? 'bg-green-100 text-green-600' :
                            'bg-purple-100 text-purple-600'
                          }`}>
                            {notification.target === 'all' ? 'الجميع' : 
                             notification.target === 'buyers' ? 'المشترين' : 'البائعين'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 mb-1">{notification.message}</p>
                        <p className="text-[9px] text-gray-400">
                          {new Date(notification.created_at).toLocaleDateString('ar-SY', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteNotification(notification.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
