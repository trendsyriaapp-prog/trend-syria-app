import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Users, Package, ShoppingBag, Check, X, 
  Eye, Clock, UserPlus, Trash2, ShieldCheck, AlertTriangle, Bell, Send, ChevronRight
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

  if (!user || (user.user_type !== 'admin' && user.user_type !== 'sub_admin')) {
    navigate('/');
    return null;
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
                {activeTab === 'notifications' && 'الإشعارات'}
                {activeTab === 'sub-admins' && 'المدراء التنفيذيين'}
              </h1>
            </div>
          </>
        ) : (
          <>
            {/* الصفحة الرئيسية - نظرة عامة */}
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-base font-bold text-gray-900">
                {user.user_type === 'admin' ? 'لوحة تحكم المدير' : 'لوحة تحكم المدير التنفيذي'}
              </h1>
              {user.user_type === 'sub_admin' && (
                <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">مدير تنفيذي</span>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4">
              {[
                { icon: Users, label: 'المستخدمين', value: stats?.total_users || 0, color: 'bg-blue-100 text-blue-600', tab: 'users' },
                { icon: Users, label: 'البائعين', value: stats?.total_sellers || 0, color: 'bg-purple-100 text-purple-600', tab: 'sellers' },
                { icon: Package, label: 'المنتجات', value: stats?.total_products || 0, color: 'bg-green-100 text-green-600', tab: 'products' },
                { icon: ShoppingBag, label: 'الطلبات', value: stats?.total_orders || 0, color: 'bg-orange-100 text-orange-600', tab: 'orders' },
                { icon: Clock, label: 'بائعين معلقين', value: stats?.pending_sellers || 0, color: 'bg-yellow-100 text-yellow-600', tab: 'pending-sellers' },
                { icon: AlertTriangle, label: 'منتجات معلقة', value: stats?.pending_products || 0, color: 'bg-red-100 text-red-600', tab: 'pending-products' },
              ].map((stat, i) => (
                <div 
                  key={i} 
                  onClick={() => setActiveTab(stat.tab)}
                  className="bg-white rounded-lg p-2 border border-gray-200 shadow-sm cursor-pointer hover:shadow-md hover:border-[#FF6B00] transition-all active:scale-95"
                  data-testid={`stat-${stat.label}`}
                >
                  <div className={`w-6 h-6 rounded-full ${stat.color} flex items-center justify-center mb-1`}>
                    <stat.icon size={12} />
                  </div>
                  <p className="text-base font-bold text-gray-900">{stat.value}</p>
                  <p className="text-[9px] text-gray-500">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <button
                onClick={() => setActiveTab('notifications')}
                className="bg-white rounded-lg p-3 border border-gray-200 hover:border-[#FF6B00] transition-all flex items-center gap-2"
              >
                <Bell size={16} className="text-[#FF6B00]" />
                <span className="text-xs font-bold text-gray-700">الإشعارات ({notifications.length})</span>
              </button>
              {user.user_type === 'admin' && (
                <button
                  onClick={() => setActiveTab('sub-admins')}
                  className="bg-white rounded-lg p-3 border border-gray-200 hover:border-[#FF6B00] transition-all flex items-center gap-2"
                >
                  <ShieldCheck size={16} className="text-blue-600" />
                  <span className="text-xs font-bold text-gray-700">المدراء ({subAdmins.length})</span>
                </button>
              )}
            </div>

            {/* Overview Stats */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <h2 className="font-bold text-sm mb-3 text-gray-900">ملخص النظام</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div className="p-2 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => setActiveTab('users')}>
                  <h3 className="text-[10px] text-blue-600 mb-0.5">المستخدمين</h3>
                  <p className="text-lg font-bold text-blue-700">{stats?.total_users || 0}</p>
                </div>
                <div className="p-2 bg-purple-50 rounded-lg cursor-pointer hover:bg-purple-100 transition-colors" onClick={() => setActiveTab('sellers')}>
                  <h3 className="text-[10px] text-purple-600 mb-0.5">البائعين</h3>
                  <p className="text-lg font-bold text-purple-700">{stats?.total_sellers || 0}</p>
                </div>
                <div className="p-2 bg-green-50 rounded-lg cursor-pointer hover:bg-green-100 transition-colors" onClick={() => setActiveTab('products')}>
                  <h3 className="text-[10px] text-green-600 mb-0.5">المنتجات</h3>
                  <p className="text-lg font-bold text-green-700">{stats?.total_products || 0}</p>
                </div>
                <div className="p-2 bg-orange-50 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors" onClick={() => setActiveTab('orders')}>
                  <h3 className="text-[10px] text-orange-600 mb-0.5">الطلبات</h3>
                  <p className="text-lg font-bold text-orange-700">{stats?.total_orders || 0}</p>
                </div>
                <div className="p-2 bg-yellow-50 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors" onClick={() => setActiveTab('pending-sellers')}>
                  <h3 className="text-[10px] text-yellow-600 mb-0.5">بائعين معلقين</h3>
                  <p className="text-lg font-bold text-yellow-700">{stats?.pending_sellers || 0}</p>
                </div>
                <div className="p-2 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition-colors" onClick={() => setActiveTab('pending-products')}>
                  <h3 className="text-[10px] text-red-600 mb-0.5">منتجات معلقة</h3>
                  <p className="text-lg font-bold text-red-700">{stats?.pending_products || 0}</p>
                </div>
              </div>
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
