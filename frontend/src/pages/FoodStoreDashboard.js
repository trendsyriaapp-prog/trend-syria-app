// /app/frontend/src/pages/FoodStoreDashboard.js
// لوحة تحكم متجر الطعام

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Store, Package, ShoppingBag, Plus, Edit, Trash2, 
  Clock, DollarSign, Star, TrendingUp, Eye, EyeOff,
  Image, Save, X, ChevronRight, AlertTriangle, Check, 
  ChefHat, Truck, Phone, MapPin, Timer, Wallet, Bell, Navigation, BarChart3,
  LogOut, Settings, User, Flame
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import SellerDriverTrackingMap from '../components/SellerDriverTrackingMap';
import SellerAnalytics from '../components/seller/SellerAnalytics';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FoodStoreDashboard = () => {
  const navigate = useNavigate();
  const { user, token, logout, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [offers, setOffers] = useState([]);
  const [commissionInfo, setCommissionInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dataFetched, setDataFetched] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  // الصفحة الرئيسية = الطلبات (orders)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'orders');
  
  // تحديث URL عند تغيير التبويب
  useEffect(() => {
    if (activeTab === 'orders') {
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
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddOffer, setShowAddOffer] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [driverArrivingAlert, setDriverArrivingAlert] = useState(null);
  const [togglingStore, setTogglingStore] = useState(false);
  const [showCloseReason, setShowCloseReason] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [showDailyDealModal, setShowDailyDealModal] = useState(false);
  const [selectedProductForDeal, setSelectedProductForDeal] = useState(null);
  
  // مرجع لصوت الإشعار
  const audioRef = useRef(null);
  const lastNotificationId = useRef(null);

  // تشغيل صوت الإشعار
  const playNotificationSound = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/notification.mp3');
      }
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
    } catch (e) {
      console.log('Audio error:', e);
    }
  };

  // تبديل حالة المتجر (فتح/إغلاق)
  const toggleStoreStatus = async (shouldClose, reason = '') => {
    if (!store) return;
    
    setTogglingStore(true);
    try {
      const res = await axios.post(
        `${API}/food/stores/${store.id}/toggle-status`,
        { is_closed: shouldClose, close_reason: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // تحديث حالة المتجر محلياً
      setStore(prev => ({
        ...prev,
        manual_close: shouldClose,
        manual_close_reason: shouldClose ? reason : null
      }));
      
      toast({
        title: shouldClose ? "تم إغلاق المتجر" : "تم فتح المتجر",
        description: res.data.message,
      });
      
      setShowCloseReason(false);
      setCloseReason('');
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "حدث خطأ أثناء تغيير حالة المتجر",
        variant: "destructive"
      });
    } finally {
      setTogglingStore(false);
    }
  };

  // فحص الإشعارات الجديدة (اقتراب السائق)
  const checkDriverArrivingNotifications = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/notifications/unread`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const notifications = res.data || [];
      const driverArriving = notifications.find(n => 
        n.type === 'driver_arriving_store' && 
        n.id !== lastNotificationId.current
      );
      
      if (driverArriving) {
        lastNotificationId.current = driverArriving.id;
        setDriverArrivingAlert(driverArriving);
        playNotificationSound();
        
        // إخفاء الإشعار بعد 10 ثواني
        setTimeout(() => setDriverArrivingAlert(null), 10000);
      }
    } catch (error) {
      // Ignore errors
    }
  };

  useEffect(() => {
    if (!authLoading && token) {
      fetchStoreData();
      checkDriverArrivingNotifications();
      
      // فحص الإشعارات كل 10 ثواني
      const interval = setInterval(checkDriverArrivingNotifications, 10000);
      return () => clearInterval(interval);
    } else if (!authLoading && !token) {
      // إذا لم يكن هناك توكن بعد انتهاء التحميل، توجيه لصفحة الدخول
      setLoading(false);
    }
  }, [token, authLoading]);

  const fetchStoreData = async () => {
    try {
      const res = await axios.get(`${API}/food/my-store`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStore(res.data.store);
      setProducts(res.data.products || []);
      
      // جلب العروض
      const offersRes = await axios.get(`${API}/food/my-offers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOffers(offersRes.data || []);
      
      // جلب معلومات العمولة
      try {
        const commissionRes = await axios.get(`${API}/food/my-store/commission`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCommissionInfo(commissionRes.data);
      } catch (e) {
        console.log('Commission info not available');
      }
    } catch (error) {
      if (error.response?.status === 404) {
        // No store found
        setStore(null);
      }
      console.error('Error fetching store:', error);
    } finally {
      setLoading(false);
      setDataFetched(true);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('هل تريد حذف هذا المنتج؟')) return;
    
    try {
      await axios.delete(`${API}/food/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: "تم الحذف", description: "تم حذف المنتج بنجاح" });
      fetchStoreData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حذف المنتج", variant: "destructive" });
    }
  };

  const handleToggleAvailability = async (productId, currentStatus) => {
    try {
      await axios.patch(`${API}/food/products/${productId}`, 
        { is_available: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      fetchStoreData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل تحديث حالة المنتج", variant: "destructive" });
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // No store - redirect to registration (only after data is fetched)
  if (!store && dataFetched) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md w-full shadow-lg">
          <Store size={48} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">ليس لديك متجر طعام</h2>
          <p className="text-gray-600 mb-6">أنشئ متجرك الآن وابدأ ببيع منتجاتك</p>
          <button
            onClick={() => navigate('/join/food-seller')}
            className="w-full bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600"
          >
            إنشاء متجر طعام
          </button>
        </div>
      </div>
    );
  }

  // Wait for store data before checking approval
  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Store not approved
  if (!store.is_approved) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md w-full shadow-lg">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock size={32} className="text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">متجرك قيد المراجعة</h2>
          <p className="text-gray-600 mb-4">
            طلبك لإنشاء متجر "{store.name}" قيد المراجعة من قبل الإدارة.
            <br />
            سيتم إشعارك عند الموافقة.
          </p>
          <div className="bg-yellow-50 rounded-xl p-4 text-sm text-yellow-700">
            عادةً ما تستغرق المراجعة 24-48 ساعة
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* إشعار اقتراب السائق */}
      {driverArrivingAlert && (
        <motion.div 
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 shadow-lg"
        >
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
              <span className="text-2xl">🏍️</span>
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg">{driverArrivingAlert.title}</p>
              <p className="text-white/90 text-sm">{driverArrivingAlert.message}</p>
            </div>
            <button 
              onClick={() => setDriverArrivingAlert(null)}
              className="p-2 hover:bg-white/20 rounded-full"
            >
              <X size={20} />
            </button>
          </div>
        </motion.div>
      )}

      {/* Header - ثابت مع اسم المطعم والنجوم */}
      <div className={`bg-white border-b border-gray-200 sticky top-0 z-40 ${driverArrivingAlert ? 'mt-20' : ''}`}>
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {store.logo ? (
                <img src={store.logo} alt={store.name} className="w-12 h-12 rounded-xl object-cover border border-gray-200" />
              ) : (
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Store size={20} className="text-green-600" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-gray-900">{store.name}</h1>
                  <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-full">
                    <Star size={12} className="text-yellow-500 fill-yellow-500" />
                    <span className="text-xs font-bold text-yellow-700">{store.rating?.toFixed(1) || '0.0'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs mt-0.5">
                  <span className={`flex items-center gap-1 ${store.manual_close ? 'text-red-600' : 'text-green-600'}`}>
                    <span className={`w-2 h-2 rounded-full ${store.manual_close ? 'bg-red-500' : 'bg-green-500'}`}></span>
                    {store.manual_close ? 'مغلق' : 'مفتوح'}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500">{products.length} طبق</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => toggleStoreStatus(!store.manual_close)}
              disabled={togglingStore}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                store.manual_close 
                  ? 'bg-green-500 text-white hover:bg-green-600' 
                  : 'bg-red-100 text-red-600 hover:bg-red-200'
              }`}
            >
              {togglingStore ? '...' : (store.manual_close ? 'فتح المتجر' : 'إغلاق')}
            </button>
          </div>
        </div>
      </div>

      {/* المحتوى الرئيسي - صفحة واحدة */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        
        {/* قسم الطلبات - دائماً في الأعلى */}
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <ShoppingBag size={20} className="text-green-600" />
            الطلبات
          </h2>
          <StoreOrdersTab token={token} />
        </div>

        {/* التبويبات الأفقية */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* شريط التبويبات */}
          <div className="flex border-b border-gray-200 overflow-x-auto hide-scrollbar">
            {[
              { id: 'menu', label: 'القائمة', icon: ChefHat },
              { id: 'wallet', label: 'المحفظة', icon: Wallet },
              { id: 'analytics', label: 'الإحصائيات', icon: BarChart3 },
              { id: 'settings', label: 'الإعدادات', icon: Settings },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-green-600 border-b-2 border-green-500 bg-green-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* محتوى التبويب */}
          <div className="p-4">
            {/* القائمة - الأطباق */}
            {activeTab === 'menu' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-900">أطباق المطعم ({products.length})</h3>
                  <button
                    onClick={() => setShowAddProduct(true)}
                    className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-green-600"
                  >
                    <Plus size={16} />
                    إضافة طبق
                  </button>
                </div>
                {/* قائمة الأطباق */}
                {products.length === 0 ? (
                  <div className="bg-gray-50 rounded-xl p-8 text-center">
                    <Package size={40} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">لم تقم بإضافة أي أطباق بعد</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {products.map((product) => (
                      <div key={product.id} className={`bg-white rounded-xl p-3 border ${!product.is_available ? 'opacity-60' : 'border-gray-100'}`}>
                        <div className="flex items-center gap-3">
                          {product.images?.[0] ? (
                            <img src={product.images[0]} alt={product.name} className="w-14 h-14 rounded-lg object-cover" />
                          ) : (
                            <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Package size={20} className="text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900">{product.name}</h4>
                            <p className="text-green-600 font-bold text-sm">{(product.price || 0).toLocaleString()} ل.س</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleToggleAvailability(product)}
                              className={`p-2 rounded-lg ${product.is_available ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}
                            >
                              {product.is_available ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                            <button
                              onClick={() => { setEditingProduct(product); setShowAddProduct(true); }}
                              className="p-2 bg-blue-100 text-blue-600 rounded-lg"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="p-2 bg-red-100 text-red-600 rounded-lg"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* المحفظة */}
            {activeTab === 'wallet' && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white">
                  <p className="text-white/80 text-sm">رصيد المحفظة</p>
                  <p className="text-2xl font-bold">0 ل.س</p>
                </div>
                <button
                  onClick={() => navigate('/seller/dashboard?tab=wallet')}
                  className="w-full py-3 bg-green-100 text-green-700 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  <Wallet size={18} />
                  إدارة المحفظة
                </button>
              </div>
            )}

            {/* الإحصائيات */}
            {activeTab === 'analytics' && (
              <SellerAnalytics storeId={store.id} token={token} />
            )}

            {/* الإعدادات */}
            {activeTab === 'settings' && (
              <StoreSettings store={store} token={token} onUpdate={fetchStoreData} />
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      {showAddProduct && (
        <ProductModal
          store={store}
          product={editingProduct}
          token={token}
          commissionInfo={commissionInfo}
          onClose={() => {
            setShowAddProduct(false);
            setEditingProduct(null);
          }}
          onSave={() => {
            setShowAddProduct(false);
            setEditingProduct(null);
            fetchStoreData();
          }}
        />
      )}
    </div>
  );
};

// Store Settings Component
const StoreSettings = ({ store, token, onUpdate }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [sameHoursAllDays, setSameHoursAllDays] = useState(true);
  
  const defaultWorkingHours = {
    sunday: { is_open: true, open_hour: 8, open_minute: 0, close_hour: 22, close_minute: 0 },
    monday: { is_open: true, open_hour: 8, open_minute: 0, close_hour: 22, close_minute: 0 },
    tuesday: { is_open: true, open_hour: 8, open_minute: 0, close_hour: 22, close_minute: 0 },
    wednesday: { is_open: true, open_hour: 8, open_minute: 0, close_hour: 22, close_minute: 0 },
    thursday: { is_open: true, open_hour: 8, open_minute: 0, close_hour: 22, close_minute: 0 },
    friday: { is_open: true, open_hour: 10, open_minute: 0, close_hour: 22, close_minute: 0 },
    saturday: { is_open: true, open_hour: 8, open_minute: 0, close_hour: 22, close_minute: 0 },
  };
  
  const DAY_NAMES = {
    sunday: 'الأحد',
    monday: 'الإثنين',
    tuesday: 'الثلاثاء',
    wednesday: 'الأربعاء',
    thursday: 'الخميس',
    friday: 'الجمعة',
    saturday: 'السبت',
  };
  
  const [formData, setFormData] = useState({
    name: store.name || '',
    description: store.description || '',
    phone: store.phone || '',
    delivery_time: store.delivery_time || 30,
    minimum_order: store.minimum_order || 0,
    delivery_fee: store.delivery_fee || 5000,
    free_delivery_minimum: store.free_delivery_minimum || 0,
    working_hours: store.working_hours || defaultWorkingHours,
  });
  const [saving, setSaving] = useState(false);
  
  const handleWorkingHoursChange = (day, field, value) => {
    const newHours = { ...formData.working_hours };
    newHours[day] = { ...newHours[day], [field]: value };
    
    if (sameHoursAllDays && field !== 'is_open') {
      Object.keys(newHours).forEach(d => {
        if (d !== day) {
          newHours[d] = { ...newHours[d], [field]: value };
        }
      });
    }
    
    setFormData({ ...formData, working_hours: newHours });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/food/my-store`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: "تم الحفظ", description: "تم تحديث معلومات المتجر" });
      onUpdate();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حفظ التغييرات", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-3 border border-gray-100 space-y-3">
      <h3 className="font-bold text-sm text-gray-900">إعدادات المتجر</h3>
      
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">اسم المتجر</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">الوصف</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">وقت التوصيل (د)</label>
          <input
            type="number"
            value={formData.delivery_time}
            onChange={(e) => setFormData({ ...formData, delivery_time: parseInt(e.target.value) })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">الحد الأدنى</label>
          <input
            type="number"
            value={formData.minimum_order}
            onChange={(e) => setFormData({ ...formData, minimum_order: parseInt(e.target.value) })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {/* إعدادات التوصيل - مصغرة */}
      <div className="border-t pt-3">
        <h4 className="font-bold text-xs text-gray-900 mb-2 flex items-center gap-1">
          <Truck size={14} className="text-green-600" />
          التوصيل
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-600 mb-1">رسوم التوصيل</label>
            <input
              type="number"
              value={formData.delivery_fee}
              onChange={(e) => setFormData({ ...formData, delivery_fee: parseInt(e.target.value) })}
              min="0"
              step="500"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">توصيل مجاني عند</label>
            <input
              type="number"
              value={formData.free_delivery_minimum}
              onChange={(e) => setFormData({ ...formData, free_delivery_minimum: parseInt(e.target.value) })}
              min="0"
              step="5000"
              placeholder="0 = معطل"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      {/* ساعات العمل */}
      <div className="border-t pt-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-gray-900 flex items-center gap-2">
            <Clock size={18} className="text-orange-500" />
            ساعات العمل
          </h4>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={sameHoursAllDays}
              onChange={(e) => setSameHoursAllDays(e.target.checked)}
              className="w-4 h-4 text-orange-500 rounded"
            />
            <span className="text-gray-600">نفس الساعات لكل الأيام</span>
          </label>
        </div>
        
        <div className="bg-orange-50 rounded-xl p-3 space-y-2">
          {sameHoursAllDays ? (
            <div className="bg-white rounded-lg p-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-600">من</span>
                <select
                  value={formData.working_hours?.sunday?.open_hour || 8}
                  onChange={(e) => handleWorkingHoursChange('sunday', 'open_hour', parseInt(e.target.value))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  {[...Array(24)].map((_, i) => (
                    <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                  ))}
                </select>
                <span className="text-sm text-gray-600">إلى</span>
                <select
                  value={formData.working_hours?.sunday?.close_hour || 22}
                  onChange={(e) => handleWorkingHoursChange('sunday', 'close_hour', parseInt(e.target.value))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  {[...Array(24)].map((_, i) => (
                    <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            Object.entries(DAY_NAMES).map(([day, arabicName]) => (
              <div key={day} className="bg-white rounded-lg p-3 flex items-center gap-3 flex-wrap">
                <label className="flex items-center gap-2 min-w-[80px]">
                  <input
                    type="checkbox"
                    checked={formData.working_hours?.[day]?.is_open !== false}
                    onChange={(e) => handleWorkingHoursChange(day, 'is_open', e.target.checked)}
                    className="w-4 h-4 text-orange-500 rounded"
                  />
                  <span className="text-sm font-medium">{arabicName}</span>
                </label>
                
                {formData.working_hours?.[day]?.is_open !== false && (
                  <>
                    <select
                      value={formData.working_hours?.[day]?.open_hour || 8}
                      onChange={(e) => handleWorkingHoursChange(day, 'open_hour', parseInt(e.target.value))}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                    >
                      {[...Array(24)].map((_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                      ))}
                    </select>
                    <span className="text-gray-400">-</span>
                    <select
                      value={formData.working_hours?.[day]?.close_hour || 22}
                      onChange={(e) => handleWorkingHoursChange(day, 'close_hour', parseInt(e.target.value))}
                      className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                    >
                      {[...Array(24)].map((_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                      ))}
                    </select>
                  </>
                )}
                
                {formData.working_hours?.[day]?.is_open === false && (
                  <span className="text-red-500 text-sm">مغلق</span>
                )}
              </div>
            ))
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          ⏰ سيظهر للعملاء أن متجرك "مغلق" خارج ساعات العمل المحددة
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Save size={18} />
        )}
        حفظ التغييرات
      </button>

      {/* زر تسجيل الخروج */}
      <div className="border-t pt-4 mt-4">
        <button
          onClick={() => {
            logout();
            navigate('/login');
            toast({ title: 'تم تسجيل الخروج', description: 'نراك قريباً!' });
          }}
          className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
          data-testid="logout-btn"
        >
          <LogOut size={18} />
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
};

// Offers Tab Component
const OffersTab = ({ offers, products, token, onUpdate, showAddOffer, setShowAddOffer }) => {
  const { toast } = useToast();
  const [editingOffer, setEditingOffer] = useState(null);

  const handleToggleOffer = async (offer) => {
    try {
      await axios.put(`${API}/food/offers/${offer.id}`, 
        { is_active: !offer.is_active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ 
        title: offer.is_active ? "تم تعطيل العرض" : "تم تفعيل العرض",
        description: offer.is_active ? "لن يظهر العرض للعملاء" : "سيظهر العرض للعملاء الآن"
      });
      onUpdate();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل تحديث العرض", variant: "destructive" });
    }
  };

  const handleDeleteOffer = async (offerId) => {
    if (!window.confirm('هل تريد حذف هذا العرض؟')) return;
    
    try {
      await axios.delete(`${API}/food/offers/${offerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: "تم الحذف", description: "تم حذف العرض" });
      onUpdate();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حذف العرض", variant: "destructive" });
    }
  };

  const getOfferTypeLabel = (type) => {
    switch (type) {
      case 'buy_x_get_y': return 'اشترِ واحصل مجاناً';
      case 'percentage': return 'خصم نسبة مئوية';
      case 'fixed_discount': return 'خصم مبلغ ثابت';
      default: return type;
    }
  };

  const getOfferDescription = (offer) => {
    switch (offer.offer_type) {
      case 'buy_x_get_y':
        return `اشترِ ${offer.buy_quantity} واحصل على ${offer.get_quantity} مجاناً`;
      case 'percentage':
        return `خصم ${offer.discount_percentage}%`;
      case 'fixed_discount':
        return `خصم ${offer.discount_amount?.toLocaleString()} ل.س`;
      default:
        return '';
    }
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => {
          setEditingOffer(null);
          setShowAddOffer(true);
        }}
        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90"
      >
        <Plus size={20} />
        إنشاء عرض جديد
      </button>

      {/* Quick Offer Templates */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <span className="text-lg">🎁</span>
          عروض سريعة
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setEditingOffer({
                name: 'اشترِ 2 واحصل على 1 مجاناً',
                offer_type: 'buy_x_get_y',
                buy_quantity: 2,
                get_quantity: 1,
                is_active: true
              });
              setShowAddOffer(true);
            }}
            className="bg-white rounded-lg p-3 text-sm text-right hover:shadow-md transition-shadow border border-purple-100"
          >
            <span className="block font-bold text-purple-600">2+1 مجاناً</span>
            <span className="text-xs text-gray-500">اشترِ 2 واحصل على الثالث</span>
          </button>
          <button
            onClick={() => {
              setEditingOffer({
                name: 'اشترِ 3 واحصل على 1 مجاناً',
                offer_type: 'buy_x_get_y',
                buy_quantity: 3,
                get_quantity: 1,
                is_active: true
              });
              setShowAddOffer(true);
            }}
            className="bg-white rounded-lg p-3 text-sm text-right hover:shadow-md transition-shadow border border-purple-100"
          >
            <span className="block font-bold text-purple-600">3+1 مجاناً</span>
            <span className="text-xs text-gray-500">اشترِ 3 واحصل على الرابع</span>
          </button>
        </div>
      </div>

      {offers.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
          <span className="text-5xl mb-3 block">🎉</span>
          <p className="text-gray-600 mb-2">لم تقم بإنشاء أي عروض بعد</p>
          <p className="text-sm text-gray-400">العروض تزيد المبيعات بنسبة 30% في المتوسط!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {offers.map((offer) => (
            <motion.div
              key={offer.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`bg-white rounded-xl p-4 border-2 ${
                offer.is_active ? 'border-green-200' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-bold text-gray-900">{offer.name}</h4>
                  <p className="text-sm text-purple-600">{getOfferDescription(offer)}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  offer.is_active 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {offer.is_active ? 'نشط' : 'معطل'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                <span className="bg-gray-100 px-2 py-1 rounded">
                  {getOfferTypeLabel(offer.offer_type)}
                </span>
                <span>استُخدم {offer.usage_count || 0} مرة</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleToggleOffer(offer)}
                  className={`flex-1 py-2 rounded-lg font-medium text-sm ${
                    offer.is_active
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {offer.is_active ? 'تعطيل' : 'تفعيل'}
                </button>
                <button
                  onClick={() => handleDeleteOffer(offer.id)}
                  className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add/Edit Offer Modal */}
      {showAddOffer && (
        <OfferModal
          offer={editingOffer}
          products={products}
          token={token}
          onClose={() => {
            setShowAddOffer(false);
            setEditingOffer(null);
          }}
          onSave={() => {
            setShowAddOffer(false);
            setEditingOffer(null);
            onUpdate();
          }}
        />
      )}
    </div>
  );
};

// Offer Modal Component
const OfferModal = ({ offer, products, token, onClose, onSave }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: offer?.name || '',
    offer_type: offer?.offer_type || 'buy_x_get_y',
    buy_quantity: offer?.buy_quantity || 2,
    get_quantity: offer?.get_quantity || 1,
    discount_percentage: offer?.discount_percentage || '',
    discount_amount: offer?.discount_amount || '',
    min_order_amount: offer?.min_order_amount || '',
    applicable_products: offer?.applicable_products || [],
    is_active: offer?.is_active !== false,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast({ title: "تنبيه", description: "يرجى إدخال اسم العرض", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API}/food/offers`, {
        ...formData,
        buy_quantity: parseInt(formData.buy_quantity),
        get_quantity: parseInt(formData.get_quantity),
        discount_percentage: formData.discount_percentage ? parseFloat(formData.discount_percentage) : null,
        discount_amount: formData.discount_amount ? parseFloat(formData.discount_amount) : null,
        min_order_amount: formData.min_order_amount ? parseFloat(formData.min_order_amount) : null,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: "تم الإنشاء", description: "تم إنشاء العرض بنجاح" });
      onSave();
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || "فشل إنشاء العرض", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="bg-white rounded-t-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
          <h3 className="font-bold text-lg">
            {offer?.id ? 'تعديل العرض' : 'عرض جديد'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم العرض *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="مثال: عرض نهاية الأسبوع"
              className="w-full border border-gray-200 rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">نوع العرض</label>
            <select
              value={formData.offer_type}
              onChange={(e) => setFormData({ ...formData, offer_type: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3"
            >
              <option value="buy_x_get_y">اشترِ X واحصل على Y مجاناً</option>
              <option value="percentage">خصم نسبة مئوية</option>
              <option value="fixed_discount">خصم مبلغ ثابت</option>
            </select>
          </div>

          {formData.offer_type === 'buy_x_get_y' && (
            <div className="bg-purple-50 rounded-xl p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اشترِ (كمية)</label>
                  <input
                    type="number"
                    value={formData.buy_quantity}
                    onChange={(e) => setFormData({ ...formData, buy_quantity: e.target.value })}
                    min="1"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">احصل مجاناً</label>
                  <input
                    type="number"
                    value={formData.get_quantity}
                    onChange={(e) => setFormData({ ...formData, get_quantity: e.target.value })}
                    min="1"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3"
                  />
                </div>
              </div>
              <p className="text-sm text-purple-700 font-medium">
                مثال: اشترِ {formData.buy_quantity} من أي منتج واحصل على {formData.get_quantity} مجاناً
              </p>
            </div>
          )}

          {formData.offer_type === 'percentage' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نسبة الخصم (%)</label>
              <input
                type="number"
                value={formData.discount_percentage}
                onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
                min="1"
                max="100"
                placeholder="مثال: 20"
                className="w-full border border-gray-200 rounded-xl px-4 py-3"
              />
            </div>
          )}

          {formData.offer_type === 'fixed_discount' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">مبلغ الخصم (ل.س)</label>
              <input
                type="number"
                value={formData.discount_amount}
                onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                min="0"
                step="1000"
                placeholder="مثال: 5000"
                className="w-full border border-gray-200 rounded-xl px-4 py-3"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأدنى للطلب (اختياري)</label>
            <input
              type="number"
              value={formData.min_order_amount}
              onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
              min="0"
              step="5000"
              placeholder="اتركه فارغاً لتطبيق العرض على جميع الطلبات"
              className="w-full border border-gray-200 rounded-xl px-4 py-3"
            />
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 rounded"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">
              تفعيل العرض فوراً
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check size={20} />
                إنشاء العرض
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

// Product Modal Component
const ProductModal = ({ store, product, token, commissionInfo, onClose, onSave }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || '',
    original_price: product?.original_price || '',
    category: product?.category || '',
    images: product?.images || [],
    preparation_time: product?.preparation_time || '',
  });
  const [saving, setSaving] = useState(false);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, images: [...formData.images, reader.result] });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (index) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price) {
      toast({ title: "تنبيه", description: "يرجى ملء الحقول المطلوبة", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (product) {
        // Edit existing product
        await axios.put(`${API}/food/products/${product.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast({ title: "تم التحديث", description: "تم تحديث المنتج بنجاح" });
      } else {
        // Add new product
        await axios.post(`${API}/food/products`, {
          ...formData,
          store_id: store.id,
          price: parseFloat(formData.price),
          original_price: formData.original_price ? parseFloat(formData.original_price) : null,
          preparation_time: formData.preparation_time ? parseInt(formData.preparation_time) : null,
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast({ title: "تمت الإضافة", description: "تم إضافة المنتج بنجاح" });
      }
      onSave();
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || "حدث خطأ", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {product ? 'تعديل المنتج' : 'إضافة منتج جديد'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم المنتج *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="مثال: شاورما لحمة"
              className="w-full border border-gray-200 rounded-xl px-4 py-3"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="وصف المنتج..."
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-3"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">السعر *</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0"
                className="w-full border border-gray-200 rounded-xl px-4 py-3"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">السعر قبل الخصم</label>
              <input
                type="number"
                value={formData.original_price}
                onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                placeholder="اختياري"
                className="w-full border border-gray-200 rounded-xl px-4 py-3"
              />
            </div>
          </div>

          {/* حاسبة الأرباح والعمولة */}
          {formData.price > 0 && commissionInfo && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
              <h4 className="font-bold text-amber-800 mb-3 flex items-center gap-2">
                <DollarSign size={18} />
                تفاصيل أرباحك من هذا المنتج
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center py-2 border-b border-amber-200">
                  <span className="text-gray-700">سعر البيع</span>
                  <span className="font-bold text-gray-900">{Number(formData.price).toLocaleString()} ل.س</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-amber-200">
                  <span className="text-red-600">عمولة المنصة ({commissionInfo.commission_percentage})</span>
                  <span className="font-bold text-red-600">- {Math.round(Number(formData.price) * commissionInfo.commission_rate).toLocaleString()} ل.س</span>
                </div>
                <div className="flex justify-between items-center py-2 bg-green-100 rounded-lg px-3 -mx-1">
                  <span className="font-bold text-green-700">صافي ربحك ✅</span>
                  <span className="font-bold text-green-700 text-lg">
                    {Math.round(Number(formData.price) * (1 - commissionInfo.commission_rate)).toLocaleString()} ل.س
                  </span>
                </div>
              </div>
              <p className="mt-3 text-xs text-amber-700 text-center">
                💡 هذا هو المبلغ الذي ستحصل عليه عند بيع كل قطعة من هذا المنتج
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">التصنيف</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="مثال: وجبات رئيسية"
                className="w-full border border-gray-200 rounded-xl px-4 py-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">وقت التحضير (دقيقة)</label>
              <input
                type="number"
                value={formData.preparation_time}
                onChange={(e) => setFormData({ ...formData, preparation_time: e.target.value })}
                placeholder="15"
                className="w-full border border-gray-200 rounded-xl px-4 py-3"
              />
            </div>
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">صور المنتج</label>
            <div className="flex gap-2 flex-wrap">
              {formData.images.map((img, i) => (
                <div key={i} className="relative">
                  <img src={img} alt="" className="w-20 h-20 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(i)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center cursor-pointer hover:border-green-500">
                <Plus size={24} className="text-gray-400" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {product ? 'حفظ التغييرات' : 'إضافة المنتج'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

// Store Orders Tab Component
const StoreOrdersTab = ({ token }) => {
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  
  // Modal لبدء التحضير مع تحديد الوقت
  const [showPrepModal, setShowPrepModal] = useState(null);
  const [prepTime, setPrepTime] = useState(15);
  const [prepSubmitting, setPrepSubmitting] = useState(false);

  useEffect(() => {
    fetchOrders();
    // Polling every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchOrders = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const res = await axios.get(`${API}/food/orders/store/orders`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      await axios.post(`${API}/food/orders/store/orders/${orderId}/status`, null, {
        params: { new_status: newStatus },
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: "تم التحديث", description: "تم تحديث حالة الطلب" });
      fetchOrders();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل تحديث الحالة", variant: "destructive" });
    }
  };

  // بدء التحضير مع تحديد الوقت
  const startPreparation = async (orderId) => {
    setPrepSubmitting(true);
    try {
      const res = await axios.post(
        `${API}/food/orders/store/orders/${orderId}/start-preparation`,
        { preparation_time_minutes: prepTime },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ 
        title: "تم بدء التحضير", 
        description: `سيتم إرسال الطلب للسائق قبل ${Math.max(0, prepTime - 7)} دقيقة من الجهوزية`
      });
      setShowPrepModal(null);
      setPrepTime(15);
      fetchOrders();
    } catch (error) {
      toast({ 
        title: "خطأ", 
        description: error.response?.data?.detail || "فشل بدء التحضير", 
        variant: "destructive" 
      });
    } finally {
      setPrepSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      preparing: 'bg-orange-100 text-orange-700',
      ready: 'bg-green-100 text-green-700',
      out_for_delivery: 'bg-purple-100 text-purple-700',
      delivered: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  // الإبلاغ عن وصول كاذب للسائق
  const reportFalseArrival = async (orderId) => {
    if (!window.confirm('هل أنت متأكد أن السائق لم يصل فعلياً للمتجر؟')) {
      return;
    }

    try {
      const res = await axios.post(
        `${API}/food/orders/store/orders/${orderId}/report-false-arrival`,
        null,
        { 
          params: { reason: 'السائق لم يصل فعلياً' },
          headers: { Authorization: `Bearer ${token}` } 
        }
      );
      
      toast({ 
        title: "تم الإبلاغ", 
        description: res.data.warning || "تم إلغاء عداد الانتظار وتسجيل الشكوى"
      });
      fetchOrders();
    } catch (error) {
      toast({ 
        title: "خطأ", 
        description: error.response?.data?.detail || "فشل إرسال الشكوى", 
        variant: "destructive" 
      });
    }
  };

  // حساب الوقت المتبقي للتحضير
  const getRemainingPrepTime = (order) => {
    if (!order.expected_ready_at) return null;
    const expected = new Date(order.expected_ready_at);
    const now = new Date();
    const diffMinutes = Math.ceil((expected - now) / (1000 * 60));
    return Math.max(0, diffMinutes);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
        {[
          { id: 'all', label: 'الكل' },
          { id: 'pending', label: 'جديدة' },
          { id: 'confirmed', label: 'مؤكدة' },
          { id: 'preparing', label: 'قيد التحضير' },
          { id: 'ready', label: 'جاهزة' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            data-testid={`filter-${f.id}`}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
              filter === f.id ? 'bg-green-500 text-white' : 'bg-white text-gray-600 border'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
          <ShoppingBag size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600">لا توجد طلبات</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const remainingTime = getRemainingPrepTime(order);
            return (
              <div key={order.id} data-testid={`order-card-${order.id}`} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-bold text-gray-900">#{order.order_number}</span>
                      <span className={`text-xs px-2 py-1 rounded-full mr-2 ${getStatusColor(order.status)}`}>
                        {order.status_label}
                      </span>
                    </div>
                    <span className="font-bold text-green-600">{order.total?.toLocaleString()} ل.س</span>
                  </div>

                  {/* Items */}
                  <div className="space-y-1 mb-3">
                    {order.items?.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-600">{item.name} x{item.quantity}</span>
                        <span className="text-gray-900">{item.total?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  {/* Customer Info */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Phone size={14} />
                      {order.customer_phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={14} />
                      {order.delivery_city}
                    </span>
                  </div>

                  {/* Actions based on status */}
                  {order.status === 'pending' && (
                    <div className="space-y-3">
                      {/* مكون حالة السائقين */}
                      <DriverAvailabilityCheck orderId={order.id} token={token} />
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(order.id, 'confirmed')}
                          data-testid={`confirm-order-${order.id}`}
                          className="flex-1 bg-green-500 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-green-600"
                        >
                          <Check size={16} />
                          تأكيد الطلب
                        </button>
                        <button
                          onClick={() => updateStatus(order.id, 'cancelled')}
                          data-testid={`reject-order-${order.id}`}
                          className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                        >
                          رفض
                        </button>
                      </div>
                    </div>
                  )}

                  {order.status === 'confirmed' && (
                    <button
                      onClick={() => setShowPrepModal(order)}
                      data-testid={`start-prep-${order.id}`}
                      className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-orange-600"
                    >
                      <ChefHat size={18} />
                      بدء التحضير
                    </button>
                  )}

                  {order.status === 'preparing' && (
                    <div className="space-y-3">
                      {/* شريط التقدم */}
                      {remainingTime !== null && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-orange-700 font-medium flex items-center gap-1">
                              <Clock size={14} />
                              جاري التحضير
                            </span>
                            <span className="text-sm font-bold text-orange-600">
                              {remainingTime > 0 ? `${remainingTime} دقيقة متبقية` : 'حان الوقت!'}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-orange-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-orange-500 transition-all duration-1000"
                              style={{ 
                                width: `${Math.min(100, ((order.preparation_time_minutes - remainingTime) / order.preparation_time_minutes) * 100)}%` 
                              }}
                            />
                          </div>
                          {order.driver_name && (
                            <p className="text-xs text-orange-600 mt-2">
                              🏍️ السائق {order.driver_name} في الطريق
                            </p>
                          )}
                        </div>
                      )}
                      <button
                        onClick={() => updateStatus(order.id, 'ready')}
                        data-testid={`mark-ready-${order.id}`}
                        className="w-full bg-green-500 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-green-600"
                      >
                        <Package size={16} />
                        الطلب جاهز
                      </button>
                    </div>
                  )}

                  {order.status === 'ready' && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                      <p className="text-green-700 text-sm mb-2">بانتظار موظف التوصيل</p>
                      
                      {/* كود الاستلام */}
                      {order.pickup_code && (
                        <div className="bg-white rounded-lg p-4 mt-2 border-2 border-dashed border-green-400">
                          <p className="text-xs text-gray-500 mb-2">كود الاستلام - أعطه لموظف التوصيل</p>
                          <div className="flex justify-center gap-2" dir="ltr">
                            {order.pickup_code.split('').map((digit, i) => (
                              <span 
                                key={i} 
                                className="w-12 h-14 flex items-center justify-center text-2xl font-bold bg-green-500 text-white rounded-lg shadow-md"
                              >
                                {digit}
                              </span>
                            ))}
                          </div>
                          {order.pickup_code_verified && (
                            <p className="text-green-600 text-xs mt-2 font-bold">
                              ✅ تم تأكيد الاستلام
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* معلومات السائق */}
                      {order.driver_name && (
                        <div className="mt-3 p-2 bg-blue-50 rounded-lg">
                          <p className="text-sm text-blue-700">
                            🏍️ موظف التوصيل: <span className="font-bold">{order.driver_name}</span>
                          </p>
                          {order.driver_arrived_at && (
                            <>
                              <p className="text-xs text-blue-600 mt-1">
                                ✅ وصل للمتجر
                              </p>
                              {/* زر الإبلاغ عن وصول كاذب */}
                              {!order.pickup_code_verified && (
                                <button
                                  onClick={() => reportFalseArrival(order.id)}
                                  data-testid={`report-false-arrival-${order.id}`}
                                  className="mt-2 w-full text-xs bg-red-100 text-red-600 py-1.5 rounded-lg hover:bg-red-200 flex items-center justify-center gap-1"
                                >
                                  ⚠️ السائق لم يصل فعلياً؟
                                </button>
                              )}
                            </>
                          )}
                          {order.driver_phone && (
                            <a 
                              href={`tel:${order.driver_phone}`}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              📞 {order.driver_phone}
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {order.status === 'out_for_delivery' && (
                    <div className="space-y-2">
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                        <p className="text-purple-700 text-sm font-medium flex items-center justify-center gap-2">
                          <Navigation size={16} className="animate-pulse" />
                          جاري التوصيل للعميل
                        </p>
                        {order.driver_name && (
                          <p className="text-xs text-purple-600 mt-1">
                            🏍️ بواسطة: {order.driver_name}
                          </p>
                        )}
                      </div>
                      
                      {/* خريطة تتبع السائق للبائع */}
                      {order.driver_id && (
                        <SellerDriverTrackingMap 
                          orderId={order.id} 
                          token={token}
                          driverName={order.driver_name || 'السائق'}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal بدء التحضير */}
      {showPrepModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="bg-white rounded-t-3xl w-full max-w-lg p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">بدء تحضير الطلب</h3>
              <button 
                onClick={() => setShowPrepModal(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-orange-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-orange-700 mb-2 font-medium">
                طلب #{showPrepModal.order_number}
              </p>
              <p className="text-xs text-orange-600">
                حدد الوقت المتوقع للتحضير. سيتم إرسال الطلب للسائق الأقرب قبل 7 دقائق من الجهوزية.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                وقت التحضير المتوقع
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[10, 15, 20, 30, 45, 60].map((time) => (
                  <button
                    key={time}
                    onClick={() => setPrepTime(time)}
                    data-testid={`prep-time-${time}`}
                    className={`py-3 rounded-xl text-sm font-medium transition-all ${
                      prepTime === time
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {time} دقيقة
                  </button>
                ))}
              </div>
              
              {/* إدخال وقت مخصص */}
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  value={prepTime}
                  onChange={(e) => setPrepTime(parseInt(e.target.value) || 15)}
                  min={5}
                  max={120}
                  className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-center"
                />
                <span className="text-sm text-gray-500">دقيقة</span>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-3 mb-6">
              <p className="text-sm text-blue-700 flex items-center gap-2">
                <Truck size={16} />
                <span>
                  سيتم إرسال الطلب للسائق بعد <strong>{Math.max(0, prepTime - 7)}</strong> دقيقة
                </span>
              </p>
            </div>

            <button
              onClick={() => startPreparation(showPrepModal.id)}
              disabled={prepSubmitting}
              data-testid="confirm-start-prep"
              className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 disabled:opacity-50"
            >
              {prepSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ChefHat size={20} />
                  بدء التحضير الآن
                </>
              )}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

// Flash Sales Tab Component - طلب الانضمام لعروض الفلاش
const FlashSalesTab = ({ store, products, token }) => {
  const { toast } = useToast();
  const [flashSales, setFlashSales] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [settings, setSettings] = useState({ join_fee: 5000 });
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedFlashSale, setSelectedFlashSale] = useState(null);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const [salesRes, requestsRes, settingsRes] = await Promise.all([
        axios.get(`${API}/food/flash-sales/available`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/food/my-flash-requests`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/food/flash-sale-settings`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setFlashSales(salesRes.data || []);
      setMyRequests(requestsRes.data || []);
      setSettings(settingsRes.data || { join_fee: 5000 });
    } catch (error) {
      console.error('Error fetching flash data:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelRequest = async (requestId) => {
    if (!window.confirm('هل تريد إلغاء هذا الطلب؟ سيتم استرداد الرسوم.')) return;
    
    try {
      const res = await axios.delete(`${API}/food/flash-sale-request/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ 
        title: "تم الإلغاء", 
        description: `تم استرداد ${res.data.refunded?.toLocaleString() || 0} ل.س` 
      });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || "فشل الإلغاء", variant: "destructive" });
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700'
    };
    const labels = {
      pending: 'قيد المراجعة',
      approved: 'تمت الموافقة',
      rejected: 'مرفوض'
    };
    return { style: styles[status] || styles.pending, label: labels[status] || status };
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('ar-SY', { 
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info Card */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 p-3 text-white -mx-4">
        <div className="max-w-7xl mx-auto px-4">
          <h3 className="font-bold text-sm mb-1 flex items-center gap-2">
            <span className="text-lg">⚡</span>
            انضم لعروض الفلاش
          </h3>
          <p className="text-xs opacity-90 mb-2">
            شارك منتجاتك في عروض الفلاش لزيادة المبيعات! رسوم الانضمام {settings.join_fee?.toLocaleString()} ل.س
          </p>
          <div className="flex items-center gap-2 text-[10px] bg-white/20 rounded-lg px-2 py-1.5">
            <span>💡</span>
            <span>يتم خصم الرسوم من محفظتك تلقائياً</span>
          </div>
        </div>
      </div>

      {/* Available Flash Sales */}
      <div>
        <h4 className="font-bold text-gray-900 mb-3">عروض الفلاش المتاحة</h4>
        {flashSales.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center border border-gray-200">
            <p className="text-gray-500">لا توجد عروض فلاش متاحة حالياً</p>
          </div>
        ) : (
          <div className="space-y-3">
            {flashSales.map((sale) => (
              <motion.div
                key={sale.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-4 border-2 border-orange-200"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h5 className="font-bold text-gray-900">{sale.name}</h5>
                    <p className="text-sm text-orange-600">خصم {sale.discount_percentage}%</p>
                  </div>
                  <span className="px-3 py-1 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs rounded-full">
                    نشط
                  </span>
                </div>
                
                <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                  <span>🕐 يبدأ: {formatDateTime(sale.start_time)}</span>
                  <span>⏰ ينتهي: {formatDateTime(sale.end_time)}</span>
                </div>
                
                <button
                  onClick={() => {
                    setSelectedFlashSale(sale);
                    setShowJoinModal(true);
                  }}
                  className="w-full py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-medium hover:opacity-90"
                >
                  طلب الانضمام
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* My Requests */}
      <div>
        <h4 className="font-bold text-gray-900 mb-3">طلباتي السابقة</h4>
        {myRequests.length === 0 ? (
          <div className="bg-white rounded-xl p-6 text-center border border-gray-200">
            <p className="text-gray-500">لم تقدم أي طلبات بعد</p>
          </div>
        ) : (
          <div className="space-y-3">
            {myRequests.map((req) => {
              const badge = getStatusBadge(req.status);
              return (
                <div key={req.id} className="bg-white rounded-xl p-4 border border-gray-200">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h5 className="font-bold text-gray-900">{req.flash_sale?.name || 'عرض فلاش'}</h5>
                      <p className="text-sm text-gray-500">{req.products_count} منتج</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${badge.style}`}>
                      {badge.label}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">الرسوم: {req.fee_paid?.toLocaleString()} ل.س</span>
                    <span className="text-gray-400">{formatDateTime(req.created_at)}</span>
                  </div>
                  
                  {req.status === 'pending' && (
                    <button
                      onClick={() => cancelRequest(req.id)}
                      className="w-full mt-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
                    >
                      إلغاء الطلب (استرداد الرسوم)
                    </button>
                  )}
                  
                  {req.status === 'rejected' && req.rejection_reason && (
                    <div className="mt-2 p-2 bg-red-50 rounded-lg text-sm text-red-600">
                      سبب الرفض: {req.rejection_reason}
                      {req.refunded && <span className="block text-green-600 mt-1">✓ تم استرداد الرسوم</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Join Modal */}
      {showJoinModal && selectedFlashSale && (
        <JoinFlashSaleModal
          flashSale={selectedFlashSale}
          products={products}
          settings={settings}
          token={token}
          onClose={() => {
            setShowJoinModal(false);
            setSelectedFlashSale(null);
          }}
          onSuccess={() => {
            setShowJoinModal(false);
            setSelectedFlashSale(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

// Join Flash Sale Modal
const JoinFlashSaleModal = ({ flashSale, products, settings, token, onClose, onSuccess }) => {
  const { toast } = useToast();
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const toggleProduct = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const totalFee = selectedProducts.length * (settings.join_fee || 5000);

  const handleSubmit = async () => {
    if (selectedProducts.length === 0) {
      toast({ title: "تنبيه", description: "اختر منتجاً واحداً على الأقل", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/food/flash-sale-request`, {
        flash_sale_id: flashSale.id,
        product_ids: selectedProducts
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast({ 
        title: "تم الإرسال", 
        description: `تم خصم ${totalFee.toLocaleString()} ل.س من محفظتك. طلبك قيد المراجعة.`
      });
      onSuccess();
    } catch (error) {
      toast({ 
        title: "خطأ", 
        description: error.response?.data?.detail || "فشل إرسال الطلب", 
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        className="bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">{flashSale.name}</h3>
            <p className="text-sm opacity-90">خصم {flashSale.discount_percentage}%</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20">
            <X size={20} />
          </button>
        </div>

        {/* Products List */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-sm text-gray-600 mb-4">
            اختر المنتجات التي تريد إضافتها للعرض ({settings.join_fee?.toLocaleString()} ل.س / منتج)
          </p>
          
          <div className="space-y-2">
            {products.filter(p => p.is_available).map((product) => {
              const isSelected = selectedProducts.includes(product.id);
              return (
                <div
                  key={product.id}
                  onClick={() => toggleProduct(product.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    isSelected ? 'bg-orange-500 text-white' : 'bg-gray-200'
                  }`}>
                    {isSelected && <Check size={14} />}
                  </div>
                  <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {product.images?.[0] ? (
                      <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package size={20} className="m-auto text-gray-400 mt-3" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-gray-900 truncate">{product.name}</h5>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 line-through">{product.price?.toLocaleString()}</span>
                      <span className="text-orange-600 font-bold">
                        {Math.round(product.price * (1 - flashSale.discount_percentage / 100)).toLocaleString()} ل.س
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-gray-600">المنتجات المختارة:</span>
            <span className="font-bold text-gray-900">{selectedProducts.length}</span>
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600">إجمالي الرسوم:</span>
            <span className="font-bold text-orange-600 text-lg">{totalFee.toLocaleString()} ل.س</span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={submitting || selectedProducts.length === 0}
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check size={20} />
                تأكيد وإرسال الطلب
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};


// Daily Deal Request Modal - طلب عرض يومي
const DailyDealRequestModal = ({ product, token, onClose, onSuccess }) => {
  const { toast } = useToast();
  const [discountPercentage, setDiscountPercentage] = useState(20);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const originalPrice = product.discount_price || product.price;
  const discountedPrice = Math.round(originalPrice * (1 - discountPercentage / 100));

  const handleSubmit = async () => {
    if (discountPercentage < 5 || discountPercentage > 90) {
      toast({ 
        title: "تنبيه", 
        description: "نسبة الخصم يجب أن تكون بين 5% و 90%", 
        variant: "destructive" 
      });
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${process.env.REACT_APP_BACKEND_URL}/api/daily-deals/requests/create`, {
        product_id: product.id,
        discount_percentage: discountPercentage,
        message: message
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast({ 
        title: "تم إرسال الطلب بنجاح! 🎉", 
        description: "سيقوم المدير بمراجعة طلبك والرد عليك قريباً" 
      });
      onSuccess();
    } catch (error) {
      toast({ 
        title: "خطأ", 
        description: error.response?.data?.detail || "فشل إرسال الطلب", 
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 text-white">
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <Flame size={20} />
              طلب عرض يومي
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full">
              <X size={20} />
            </button>
          </div>
          <p className="text-sm opacity-90 mt-1">قدّم منتجك لصفقات اليوم المميزة</p>
        </div>

        <div className="p-4 space-y-4">
          {/* معلومات المنتج */}
          <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
            <div className="w-16 h-16 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
              {product.images?.[0] || product.image ? (
                <img 
                  src={product.images?.[0] || product.image} 
                  alt={product.name} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package size={24} className="text-gray-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900">{product.name}</h4>
              <p className="text-sm text-gray-500">السعر الأصلي: {originalPrice.toLocaleString()} ل.س</p>
            </div>
          </div>

          {/* نسبة الخصم */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              نسبة الخصم المقترحة
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="5"
                max="70"
                step="5"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <span className="w-16 text-center font-bold text-orange-600 text-xl">
                {discountPercentage}%
              </span>
            </div>
          </div>

          {/* معاينة السعر */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">السعر بعد الخصم:</span>
              <div className="text-left">
                <span className="text-gray-400 line-through text-sm mr-2">
                  {originalPrice.toLocaleString()}
                </span>
                <span className="text-green-600 font-bold text-lg">
                  {discountedPrice.toLocaleString()} ل.س
                </span>
              </div>
            </div>
            <p className="text-xs text-orange-600 mt-2">
              💡 سيتم عرض المنتج في قسم "صفقات اليوم" على الصفحة الرئيسية
            </p>
          </div>

          {/* رسالة اختيارية */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              رسالة للإدارة (اختياري)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="مثال: منتج جديد نريد الترويج له..."
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none"
            />
          </div>

          {/* ملاحظة */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <strong>ملاحظة:</strong> هذه الخدمة مجانية! سيقوم فريق الإدارة بمراجعة طلبك والموافقة عليه خلال 24 ساعة.
          </div>

          {/* أزرار */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
            >
              إلغاء
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Flame size={18} />
                  إرسال الطلب
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ============== مكون فحص توفر السائقين ==============
const DriverAvailabilityCheck = ({ orderId, token }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAvailability = async () => {
      try {
        const res = await axios.get(`${API}/food/orders/check-drivers-availability/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(res.data);
      } catch (error) {
        console.error('Error checking driver availability:', error);
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    checkAvailability();
    // تحديث كل 30 ثانية
    const interval = setInterval(checkAvailability, 30000);
    return () => clearInterval(interval);
  }, [orderId, token]);

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500">جاري فحص توفر السائقين...</span>
      </div>
    );
  }

  if (!data) return null;

  const bgColor = {
    none: 'bg-green-50 border-green-200',
    low: 'bg-green-50 border-green-200',
    medium: 'bg-orange-50 border-orange-200',
    high: 'bg-red-50 border-red-200',
    error: 'bg-gray-50 border-gray-200'
  }[data.warning_level] || 'bg-gray-50 border-gray-200';

  const textColor = {
    none: 'text-green-700',
    low: 'text-green-700',
    medium: 'text-orange-700',
    high: 'text-red-700',
    error: 'text-gray-700'
  }[data.warning_level] || 'text-gray-700';

  const subTextColor = {
    none: 'text-green-600',
    low: 'text-green-600',
    medium: 'text-orange-600',
    high: 'text-red-600',
    error: 'text-gray-600'
  }[data.warning_level] || 'text-gray-600';

  return (
    <div className={`${bgColor} border rounded-lg p-3`}>
      <div className="flex items-start gap-2">
        <Truck size={18} className={textColor} />
        <div className="flex-1">
          <p className={`text-sm font-medium ${textColor}`}>{data.message}</p>
          {data.sub_message && (
            <p className={`text-xs ${subTextColor} mt-0.5`}>{data.sub_message}</p>
          )}
          {data.recommendation && data.warning_level !== 'none' && data.warning_level !== 'low' && (
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <AlertTriangle size={12} />
              {data.recommendation}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};


export default FoodStoreDashboard;
