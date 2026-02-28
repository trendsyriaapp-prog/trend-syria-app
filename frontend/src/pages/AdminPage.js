import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Users, Package, ShoppingBag, Check, X, 
  Eye, Clock, UserPlus, Trash2, ShieldCheck, AlertTriangle, Bell, Send
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
        axios.get(`${API}/admin/notifications`)
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
      
      if (user?.user_type === 'admin' && responses[4]) {
        setSubAdmins(responses[4].data);
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
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-900">
            {user.user_type === 'admin' ? 'لوحة تحكم المدير' : 'لوحة تحكم المدير التنفيذي'}
          </h1>
          {user.user_type === 'sub_admin' && (
            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">مدير تنفيذي</span>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
          {[
            { icon: Users, label: 'المستخدمين', value: stats?.total_users || 0, color: 'bg-blue-100 text-blue-600' },
            { icon: Users, label: 'البائعين', value: stats?.total_sellers || 0, color: 'bg-purple-100 text-purple-600' },
            { icon: Package, label: 'المنتجات', value: stats?.total_products || 0, color: 'bg-green-100 text-green-600' },
            { icon: ShoppingBag, label: 'الطلبات', value: stats?.total_orders || 0, color: 'bg-orange-100 text-orange-600' },
            { icon: Clock, label: 'بائعين معلقين', value: stats?.pending_sellers || 0, color: 'bg-yellow-100 text-yellow-600' },
            { icon: AlertTriangle, label: 'منتجات معلقة', value: stats?.pending_products || 0, color: 'bg-red-100 text-red-600' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
              <div className={`w-8 h-8 rounded-full ${stat.color} flex items-center justify-center mb-2`}>
                <stat.icon size={16} />
              </div>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-[10px] text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto hide-scrollbar">
          {[
            { id: 'overview', label: 'نظرة عامة' },
            { id: 'pending-products', label: `منتجات معلقة (${pendingProducts.length})` },
            { id: 'pending-sellers', label: `بائعين معلقين (${pendingSellers.length})` },
            { id: 'notifications', label: `الإشعارات (${notifications.length})` },
            ...(user.user_type === 'admin' ? [{ id: 'sub-admins', label: `المدراء التنفيذيين (${subAdmins.length})` }] : [])
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-colors text-sm ${
                activeTab === tab.id 
                  ? 'bg-[#FF6B00] text-white font-bold' 
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
              data-testid={`tab-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Pending Products */}
        {activeTab === 'pending-products' && (
          <section>
            {pendingProducts.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                <Check size={48} className="text-green-500 mx-auto mb-4" />
                <p className="text-gray-500">لا يوجد منتجات في انتظار الموافقة</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingProducts.map((product) => (
                  <div key={product.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-3 flex gap-3">
                      <img 
                        src={product.images?.[0] || 'https://via.placeholder.com/100'} 
                        alt={product.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                      <div className="flex-1">
                        <h3 className="font-bold text-sm text-gray-900">{product.name}</h3>
                        <p className="text-xs text-gray-500 line-clamp-1">{product.description}</p>
                        <p className="text-[#FF6B00] font-bold text-sm mt-1">{formatPrice(product.price)}</p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          البائع: {product.seller?.name || product.seller_name} - {product.business_name}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleApproveProduct(product.id)}
                          className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                          data-testid={`approve-product-${product.id}`}
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={() => handleRejectProduct(product.id)}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                          data-testid={`reject-product-${product.id}`}
                        >
                          <X size={18} />
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
              <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                <Check size={48} className="text-green-500 mx-auto mb-4" />
                <p className="text-gray-500">لا يوجد بائعين في انتظار الموافقة</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingSellers.map((doc) => (
                  <div key={doc.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="p-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-bold text-sm text-gray-900">{doc.business_name}</h3>
                          <p className="text-xs text-gray-500">{doc.seller?.name} - {doc.seller?.phone}</p>
                          <p className="text-xs text-gray-400">{doc.seller?.city}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)}
                            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            data-testid={`view-doc-${doc.id}`}
                          >
                            <Eye size={18} className="text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleApproveSeller(doc.seller_id)}
                            className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                            data-testid={`approve-seller-${doc.seller_id}`}
                          >
                            <Check size={18} />
                          </button>
                          <button
                            onClick={() => handleRejectSeller(doc.seller_id)}
                            className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                            data-testid={`reject-seller-${doc.seller_id}`}
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {selectedDoc?.id === doc.id && (
                      <div className="border-t border-gray-200 p-3 bg-gray-50">
                        <p className="text-xs text-gray-500 mb-2">شهادة البائع:</p>
                        {doc.business_license ? (
                          <img src={doc.business_license} alt="شهادة البائع" className="max-w-full max-h-64 rounded-lg" />
                        ) : (
                          <p className="text-gray-400 text-sm">لا توجد صورة</p>
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
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-900">المدراء التنفيذيين</h2>
              <button
                onClick={() => setShowAddSubAdmin(true)}
                className="flex items-center gap-2 bg-[#FF6B00] text-white px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-[#E65000] transition-colors"
                data-testid="add-sub-admin-btn"
              >
                <UserPlus size={16} />
                إضافة مدير تنفيذي
              </button>
            </div>

            {/* Add Sub-Admin Form */}
            {showAddSubAdmin && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 p-4 mb-4"
              >
                <h3 className="font-bold text-gray-900 mb-3">إضافة مدير تنفيذي جديد</h3>
                <form onSubmit={handleAddSubAdmin} className="space-y-3">
                  <input
                    type="text"
                    placeholder="الاسم الكامل"
                    value={newSubAdmin.full_name}
                    onChange={(e) => setNewSubAdmin({...newSubAdmin, full_name: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="رقم الهاتف"
                    value={newSubAdmin.phone}
                    onChange={(e) => setNewSubAdmin({...newSubAdmin, phone: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    required
                  />
                  <input
                    type="password"
                    placeholder="كلمة المرور"
                    value={newSubAdmin.password}
                    onChange={(e) => setNewSubAdmin({...newSubAdmin, password: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    required
                  />
                  <input
                    type="text"
                    placeholder="المدينة"
                    value={newSubAdmin.city}
                    onChange={(e) => setNewSubAdmin({...newSubAdmin, city: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    required
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-[#FF6B00] text-white py-2 rounded-lg font-bold text-sm"
                    >
                      إضافة
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddSubAdmin(false)}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-bold text-sm"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {subAdmins.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                <ShieldCheck size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">لا يوجد مدراء تنفيذيين</p>
              </div>
            ) : (
              <div className="space-y-3">
                {subAdmins.map((admin) => (
                  <div key={admin.id} className="bg-white rounded-xl border border-gray-200 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <ShieldCheck size={20} className="text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-gray-900">{admin.full_name || admin.name}</h3>
                          <p className="text-xs text-gray-500">{admin.phone} - {admin.city}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteSubAdmin(admin.id)}
                        className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        data-testid={`delete-sub-admin-${admin.id}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Overview */}
        {activeTab === 'overview' && (
          <section>
            <div className="bg-white rounded-xl p-4 border border-gray-200">
              <h2 className="font-bold mb-4 text-gray-900">ملخص النظام</h2>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h3 className="text-xs text-gray-500 mb-1">إجمالي المستخدمين</h3>
                  <p className="text-2xl font-bold text-gray-900">{stats?.total_users || 0}</p>
                  <p className="text-xs text-gray-500">منهم {stats?.total_sellers || 0} بائع</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h3 className="text-xs text-gray-500 mb-1">المنتجات المعتمدة</h3>
                  <p className="text-2xl font-bold text-gray-900">{stats?.total_products || 0}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h3 className="text-xs text-gray-500 mb-1">إجمالي الطلبات</h3>
                  <p className="text-2xl font-bold text-gray-900">{stats?.total_orders || 0}</p>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg">
                  <h3 className="text-xs text-yellow-600 mb-1">في انتظار الموافقة</h3>
                  <p className="text-2xl font-bold text-yellow-600">
                    {(stats?.pending_sellers || 0) + (stats?.pending_products || 0)}
                  </p>
                  <p className="text-xs text-yellow-600">
                    {stats?.pending_sellers || 0} بائع + {stats?.pending_products || 0} منتج
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default AdminDashboardPage;
