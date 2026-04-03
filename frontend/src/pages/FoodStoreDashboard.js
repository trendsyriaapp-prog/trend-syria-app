// /app/frontend/src/pages/FoodStoreDashboard.js
// لوحة تحكم متجر الطعام

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Store, Package, ShoppingBag, Plus, Edit, Trash2, 
  Clock, DollarSign, Star, TrendingUp, Eye, EyeOff,
  Image, Save, X, ChevronRight, AlertTriangle, Check, 
  ChefHat, Truck, Phone, MapPin, Timer, Wallet, Bell, Navigation, BarChart3,
  LogOut, Settings, User, Flame, Camera, Upload, RotateCcw, Zap, Percent, Sparkles, Loader2 as LoaderIcon, Home, XCircle, LayoutGrid
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import useNotificationSound from '../hooks/useNotificationSound';
import SellerDriverTrackingMap from '../components/SellerDriverTrackingMap';
import SellerAnalytics from '../components/seller/SellerAnalytics';
import GoogleMapsLocationPicker from '../components/GoogleMapsLocationPicker';
import SimpleImageCapture from '../components/seller/SimpleImageCapture';
import DriverWaitingAlert from '../components/seller/DriverWaitingAlert';
import NotificationsDropdown from '../components/NotificationsDropdown';

const API = process.env.REACT_APP_BACKEND_URL;

// المدن السورية
const SYRIAN_CITIES = [
  'دمشق', 'حلب', 'حمص', 'حماة', 'اللاذقية', 'طرطوس', 
  'دير الزور', 'الرقة', 'الحسكة', 'درعا', 'السويداء', 
  'القنيطرة', 'إدلب', 'ريف دمشق'
];

// مكون نموذج طلب السحب
const WithdrawForm = ({ balance, onClose, onSuccess, token }) => {
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState('shamcash');
  const [bankDetails, setBankDetails] = useState({ bank_name: '', account_number: '', account_holder: '' });
  const [submitting, setSubmitting] = useState(false);
  const minWithdrawal = 50000;

  const withdrawalMethods = [
    { id: 'shamcash', name: 'شام كاش', icon: '💳' },
    { id: 'syriatel_cash', name: 'سيرياتيل كاش', icon: '📱' },
    { id: 'mtn_cash', name: 'MTN Cash', icon: '📲' },
    { id: 'bank_account', name: 'حساب بنكي', icon: '🏦' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const withdrawAmount = parseInt(amount);
    
    if (withdrawAmount < minWithdrawal) {
      toast({ title: "خطأ", description: `الحد الأدنى للسحب ${minWithdrawal.toLocaleString()} ل.س`, variant: "destructive" });
      return;
    }
    if (withdrawAmount > balance) {
      toast({ title: "خطأ", description: "المبلغ أكبر من الرصيد المتاح", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const params = {
        amount: withdrawAmount,
        method: method,
      };
      
      if (method === 'bank_account') {
        params.bank_name = bankDetails.bank_name;
        params.account_number = bankDetails.account_number;
        params.account_holder = bankDetails.account_holder;
      } else {
        params.phone = phone;
      }
      
      await axios.post(`${API}/api/wallet/withdraw`, params, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: "تم الإرسال", description: "تم إرسال طلب السحب بنجاح" });
      onSuccess();
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || "فشل إرسال الطلب", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-600 mb-1">المبلغ (ل.س)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="مثال: 100000"
          className="w-full p-3 border border-gray-300 rounded-xl text-lg"
          required
          min={minWithdrawal}
        />
        <p className="text-xs text-gray-400 mt-1">
          الحد الأدنى: {minWithdrawal.toLocaleString()} ل.س | المتاح: {balance.toLocaleString()} ل.س
        </p>
      </div>
      
      {/* اختيار طريقة السحب */}
      <div>
        <label className="block text-sm text-gray-600 mb-2">طريقة السحب</label>
        <div className="grid grid-cols-2 gap-2">
          {withdrawalMethods.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(m.id)}
              className={`p-2 rounded-xl border-2 text-xs font-bold transition-all flex items-center gap-1 ${
                method === m.id
                  ? 'border-[#FF6B00] bg-orange-50 text-[#FF6B00]'
                  : 'border-gray-200 bg-white text-gray-700'
              }`}
            >
              <span>{m.icon}</span>
              <span>{m.name}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* حقول حسب طريقة السحب */}
      {method !== 'bank_account' ? (
        <div>
          <label className="block text-sm text-gray-600 mb-1">
            رقم {withdrawalMethods.find(m => m.id === method)?.name}
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="09XXXXXXXX"
            className="w-full p-3 border border-gray-300 rounded-xl"
            required
          />
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="text"
            value={bankDetails.bank_name}
            onChange={(e) => setBankDetails({...bankDetails, bank_name: e.target.value})}
            placeholder="اسم البنك"
            className="w-full p-3 border border-gray-300 rounded-xl"
            required
          />
          <input
            type="text"
            value={bankDetails.account_number}
            onChange={(e) => setBankDetails({...bankDetails, account_number: e.target.value})}
            placeholder="رقم الحساب"
            className="w-full p-3 border border-gray-300 rounded-xl"
            required
          />
          <input
            type="text"
            value={bankDetails.account_holder}
            onChange={(e) => setBankDetails({...bankDetails, account_holder: e.target.value})}
            placeholder="اسم صاحب الحساب"
            className="w-full p-3 border border-gray-300 rounded-xl"
            required
          />
        </div>
      )}
      
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-[#FF6B00] text-white font-bold py-3 rounded-xl disabled:opacity-50"
        >
          {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl"
        >
          إلغاء
        </button>
      </div>
    </form>
  );
};

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
  const [walletData, setWalletData] = useState({ balance: 0, pending: 0, total_earned: 0, transactions: [] });
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showStoreToggleConfirm, setShowStoreToggleConfirm] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [flashEnabledForMe, setFlashEnabledForMe] = useState(true); // هل فلاش الطعام مفعل
  
  // مرجع لصوت الإشعار وتتبع الطلبات
  const audioRef = useRef(null);
  const lastNotificationId = useRef(null);
  const previousPendingCountRef = useRef(0);
  
  // Hook لتشغيل الأصوات
  const { playFood } = useNotificationSound();

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
        `${API}/api/food/stores/${store.id}/toggle-status`,
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
      const res = await axios.get(`${API}/api/notifications/unread`, {
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

  // جلب بيانات المحفظة
  const fetchWalletData = async () => {
    if (!token) return;
    try {
      const res = await axios.get(`${API}/api/wallet/balance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWalletData({
        balance: res.data.balance || 0,
        pending: res.data.pending_balance || 0,
        total_earned: res.data.total_earned || 0,
        transactions: res.data.transactions || []
      });
    } catch (error) {
      console.error('Error fetching wallet:', error);
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
      const res = await axios.get(`${API}/api/food/my-store`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStore(res.data.store);
      setProducts(res.data.products || []);
      
      // جلب العروض
      const offersRes = await axios.get(`${API}/api/food/my-offers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOffers(offersRes.data || []);
      
      // جلب معلومات العمولة
      try {
        const commissionRes = await axios.get(`${API}/api/food/my-store/commission`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCommissionInfo(commissionRes.data);
      } catch (e) {
        console.log('Commission info not available');
      }
      
      // جلب إعدادات الفلاش للتحقق من التفعيل
      try {
        const flashRes = await axios.get(`${API}/api/seller/promotion-settings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFlashEnabledForMe(flashRes.data?.flash_enabled_for_me !== false);
      } catch (e) {
        console.log('Flash settings not available');
      }
      
      // جلب بيانات المحفظة
      await fetchWalletData();
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
    if (!window.confirm('هل تريد حذف هذا الصنف؟')) return;
    
    try {
      await axios.delete(`${API}/api/food/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: "تم الحذف", description: "تم حذف الصنف بنجاح" });
      fetchStoreData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حذف الصنف", variant: "destructive" });
    }
  };

  const handleToggleAvailability = async (productId, currentStatus) => {
    try {
      await axios.patch(`${API}/api/food/products/${productId}`, 
        { is_available: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      fetchStoreData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل تحديث حالة الصنف", variant: "destructive" });
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // No store - redirect to registration (only after data is fetched)
  if (!store && dataFetched) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md w-full shadow-lg">
          <Store size={48} className="mx-auto text-[#FF6B00] mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">ليس لديك متجر طعام</h2>
          <p className="text-gray-600 mb-6">أنشئ متجرك الآن وابدأ ببيع منتجاتك</p>
          <button
            onClick={() => navigate('/join/food-seller')}
            className="w-full bg-[#FF6B00] text-white py-3 rounded-xl font-bold hover:bg-[#E65000]"
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
        <div className="w-8 h-8 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
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
    <div className="min-h-screen bg-gray-50">
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
                <img src={store.logo} alt={store.name} className="w-14 h-14 rounded-xl object-cover border border-gray-200" />
              ) : (
                <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Store size={24} className="text-[#FF6B00]" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-1 bg-yellow-50 px-1.5 py-0.5 rounded-full w-fit mb-1">
                  <Star size={10} className="text-yellow-500 fill-yellow-500" />
                  <span className="text-[10px] font-bold text-yellow-700">{store.rating?.toFixed(1) || '0.0'}</span>
                </div>
                <h1 className="text-sm font-bold text-gray-900">{store.name}</h1>
                <div className="flex items-center gap-2 text-xs mt-0.5">
                  <span className={`flex items-center gap-1 ${store.manual_close ? 'text-red-600' : 'text-green-600'}`}>
                    <span className={`w-2 h-2 rounded-full ${store.manual_close ? 'bg-red-500' : 'bg-green-500'}`}></span>
                    {store.manual_close ? 'مغلق' : 'مفتوح'}
                  </span>
                  <span className="text-gray-400">•</span>
                  <span className="text-gray-500">{products.length} صنف</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <NotificationsDropdown />
              <button 
                onClick={() => setShowWalletModal(true)}
                className="h-9 bg-[#FF6B00] text-white px-3 rounded-full flex items-center gap-1 hover:bg-[#E65000] transition-colors text-xs font-bold"
                title="المحفظة"
              >
                <Wallet size={14} />
                <span>{walletData.balance?.toLocaleString() || 0}</span>
              </button>
              <button
                onClick={() => setShowStoreToggleConfirm(true)}
                disabled={togglingStore}
                className={`h-9 px-3 rounded-full text-xs font-bold transition-all ${
                  store.manual_close 
                    ? 'bg-orange-100 text-[#FF6B00] hover:bg-orange-200' 
                    : 'bg-red-100 text-red-600 hover:bg-red-200'
                }`}
              >
                {togglingStore ? '...' : (store.manual_close ? 'فتح' : 'إغلاق')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* المحتوى الرئيسي - صفحة واحدة */}
      <div className="max-w-4xl mx-auto px-4 py-4 pb-32">
        
        {/* قسم الطلبات - تبويب منفصل */}
        {activeTab === 'orders' && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <ShoppingBag size={20} className="text-[#FF6B00]" />
              الطلبات
            </h2>
            <StoreOrdersTab 
              token={token} 
              onNewOrder={(pendingCount) => {
                if (soundEnabled) {
                  playFood();
                  toast({
                    title: "🔔 طلب جديد!",
                    description: `لديك ${pendingCount} طلب في الانتظار`,
                  });
                }
              }}
            />
          </div>
        )}

        {/* محتوى الأصناف */}
        {activeTab === 'menu' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <LayoutGrid size={18} className="text-[#FF6B00]" />
                الأصناف ({products.length})
              </h3>
              <button
                onClick={() => setShowAddProduct(true)}
                className="flex items-center gap-2 bg-[#FF6B00] text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-[#E65000]"
              >
                <Plus size={16} />
                إضافة صنف
              </button>
            </div>
            {products.length === 0 ? (
              <div className="bg-gray-50 rounded-xl p-8 text-center">
                <Package size={40} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">لم تقم بإضافة أي أصناف بعد</p>
              </div>
            ) : (
              <div className="space-y-2">
                {products.map((product) => (
                  <div key={product.id} className={`relative bg-gray-50 rounded-xl p-3 ${
                    product.approval_status === 'rejected' ? 'border-2 border-red-300 bg-red-50/50' :
                    product.approval_status === 'pending' || !product.is_approved ? 'border-2 border-yellow-300 bg-yellow-50/50' :
                    !product.is_available ? 'border-2 border-dashed border-gray-300' : ''
                  }`}>
                    {/* شارات حالة الصنف */}
                    {product.approval_status === 'rejected' ? (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full z-10 flex items-center gap-1">
                        <X size={10} />
                        مرفوض
                      </div>
                    ) : product.approval_status === 'pending' || !product.is_approved ? (
                      <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full z-10 flex items-center gap-1">
                        <Clock size={10} />
                        بانتظار الموافقة
                      </div>
                    ) : !product.is_available ? (
                      <div className="absolute top-2 right-2 bg-gray-500 text-white text-xs px-2 py-0.5 rounded-full z-10">
                        مخفي عن العملاء
                      </div>
                    ) : (
                      <div className="absolute top-2 right-2 bg-[#FF6B00] text-white text-xs px-2 py-0.5 rounded-full z-10 flex items-center gap-1">
                        <Check size={10} />
                        نشط
                      </div>
                    )}
                    
                    {/* سبب الرفض إذا كان مرفوضاً */}
                    {product.approval_status === 'rejected' && product.rejection_reason && (
                      <div className="mb-2 p-2 bg-red-100 rounded-lg border border-red-200">
                        <p className="text-xs text-red-700 font-medium">سبب الرفض:</p>
                        <p className="text-xs text-red-600">{product.rejection_reason}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {product.images?.[0] ? (
                          <img 
                            src={product.images[0]} 
                            alt={product.name} 
                            className={`w-14 h-14 rounded-lg object-cover ${!product.is_available ? 'grayscale opacity-50' : ''}`} 
                          />
                        ) : (
                          <div className={`w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center ${!product.is_available ? 'opacity-50' : ''}`}>
                            <Package size={20} className="text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-bold ${!product.is_available ? 'text-gray-400' : 'text-gray-900'}`}>{product.name}</h4>
                        <p className={`font-bold text-sm ${!product.is_available ? 'text-gray-400' : 'text-green-600'}`}>{(product.price || 0).toLocaleString()} ل.س</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {/* أزرار حسب حالة الصنف */}
                        {product.approval_status === 'rejected' ? (
                          /* صنف مرفوض - زر إعادة إرسال */
                          <button
                            onClick={() => { setEditingProduct(product); setShowAddProduct(true); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-100 text-orange-700 hover:bg-orange-200"
                          >
                            <RotateCcw size={14} />
                            <span>تعديل وإعادة إرسال</span>
                          </button>
                        ) : product.approval_status === 'pending' || !product.is_approved ? (
                          /* صنف معلق - بدون زر إظهار/إخفاء */
                          null
                        ) : (
                          /* صنف موافق عليه - زر إظهار/إخفاء */
                          <button
                            onClick={() => handleToggleAvailability(product.id, product.is_available)}
                            data-testid={`toggle-availability-${product.id}`}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              product.is_available 
                                ? 'bg-orange-100 text-[#FF6B00] hover:bg-orange-200' 
                                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                            }`}
                          >
                            {product.is_available ? (
                              <>
                                <Eye size={14} />
                                <span>متاح</span>
                              </>
                            ) : (
                              <>
                                <EyeOff size={14} />
                                <span>إظهار</span>
                              </>
                            )}
                          </button>
                        )}
                        
                        {/* زر التعديل - للجميع ما عدا المرفوض */}
                        {product.approval_status !== 'rejected' && (
                          <button
                            onClick={() => { setEditingProduct(product); setShowAddProduct(true); }}
                            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                          >
                            <Edit size={16} />
                          </button>
                        )}
                        
                        {/* زر الحذف - للجميع */}
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
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

        {activeTab === 'flash' && (
          <PromoteFoodTab 
            store={store} 
            products={products} 
            token={token} 
            walletBalance={walletData.balance} 
            onPromotionSuccess={(newBalance) => {
              setWalletData(prev => ({...prev, balance: newBalance}));
              fetchWalletData(); // إعادة جلب الرصيد للتأكد
            }} 
          />
        )}

        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
              <Settings size={18} className="text-[#FF6B00]" />
              الإعدادات
            </h3>
            <StoreSettings store={store} token={token} onUpdate={fetchStoreData} />
          </div>
        )}
      </div>

      {/* الشريط السفلي الثابت */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 shadow-lg pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-4xl mx-auto flex">
          {[
            { id: 'orders', label: 'الطلبات', icon: ShoppingBag },
            { id: 'menu', label: 'الأصناف', icon: LayoutGrid },
            ...(flashEnabledForMe ? [{ id: 'flash', label: 'فلاش', icon: Zap }] : []),
            { id: 'settings', label: 'الإعدادات', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-3 transition-all ${
                activeTab === tab.id
                  ? 'text-[#FF6B00] bg-orange-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon size={20} />
              <span className="text-xs mt-1 font-medium">{tab.label}</span>
            </button>
          ))}
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
      
      {/* Modal طلب سحب */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowWithdrawModal(false)}>
          <div 
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4">طلب سحب</h2>
            
            <WithdrawForm 
              balance={walletData.balance}
              onClose={() => setShowWithdrawModal(false)}
              onSuccess={() => {
                setShowWithdrawModal(false);
                fetchWalletData();
              }}
              token={token}
            />
          </div>
        </div>
      )}

      {/* Modal المحفظة */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setShowWalletModal(false)}>
          <div 
            className="bg-white w-full max-w-lg rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Wallet className="text-[#FF6B00]" size={24} />
                محفظتي
              </h2>
              <button 
                onClick={() => setShowWalletModal(false)}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
              >
                <X size={20} />
              </button>
            </div>

            {/* الرصيد */}
            <div className="bg-gradient-to-l from-[#FF6B00] to-[#FF8533] text-white rounded-2xl p-6 mb-4">
              <p className="text-sm opacity-90 mb-1">الرصيد المتاح</p>
              <p className="text-3xl font-bold">{walletData.balance?.toLocaleString() || 0} ل.س</p>
            </div>

            {/* الأرباح المعلقة */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-yellow-600" />
                  <span className="text-sm text-yellow-800">أرباح معلقة</span>
                </div>
                <span className="font-bold text-yellow-800">{walletData.pending?.toLocaleString() || 0} ل.س</span>
              </div>
              <p className="text-xs text-yellow-600 mt-1">تُضاف للرصيد بعد اكتمال التوصيل</p>
            </div>

            {/* إجمالي الأرباح */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">إجمالي الأرباح</span>
                <span className="font-bold text-gray-900">{walletData.total_earned?.toLocaleString() || 0} ل.س</span>
              </div>
            </div>

            {/* زر طلب سحب */}
            <button
              onClick={() => {
                setShowWalletModal(false);
                setShowWithdrawModal(true);
              }}
              disabled={walletData.balance < 50000}
              className="w-full py-4 bg-[#FF6B00] text-white rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#E65000] transition-colors"
            >
              {walletData.balance < 50000 ? `الحد الأدنى للسحب 50,000 ل.س` : 'طلب سحب'}
            </button>
          </div>
        </div>
      )}
      
      {/* Modal تأكيد إغلاق/فتح المتجر */}
      {showStoreToggleConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowStoreToggleConfirm(false)}>
          <div 
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-3 ${
                store.manual_close ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {store.manual_close ? (
                  <Store size={32} className="text-[#FF6B00]" />
                ) : (
                  <X size={32} className="text-red-600" />
                )}
              </div>
              <h2 className="text-lg font-bold text-gray-900">
                {store.manual_close ? 'فتح المتجر' : 'إغلاق المتجر'}
              </h2>
              <p className="text-sm text-gray-500 mt-2">
                {store.manual_close 
                  ? 'هل تريد فتح المتجر واستقبال الطلبات؟'
                  : 'هل تريد إغلاق المتجر؟ لن تستقبل طلبات جديدة.'
                }
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowStoreToggleConfirm(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  toggleStoreStatus(!store.manual_close);
                  setShowStoreToggleConfirm(false);
                }}
                className={`flex-1 py-3 rounded-xl font-bold text-white ${
                  store.manual_close ? 'bg-green-500' : 'bg-red-500'
                }`}
              >
                {store.manual_close ? 'نعم، افتح المتجر' : 'نعم، أغلق المتجر'}
              </button>
            </div>
          </div>
        </div>
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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [storeLogo, setStoreLogo] = useState(store.logo || null);
  
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
    address: store.address || '',
    city: store.city || 'دمشق',
    latitude: store.latitude || null,
    longitude: store.longitude || null,
    delivery_time: store.delivery_time || 15, // يُعرض كـ "وقت التحضير"
    working_hours: store.working_hours || defaultWorkingHours,
  });
  const [saving, setSaving] = useState(false);
  
  // رفع صورة المتجر
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // التحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      toast({ title: "خطأ", description: "يرجى اختيار صورة", variant: "destructive" });
      return;
    }
    
    // التحقق من حجم الملف (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "خطأ", description: "حجم الصورة يجب أن يكون أقل من 2 ميجابايت", variant: "destructive" });
      return;
    }
    
    setUploadingLogo(true);
    try {
      // تحويل الصورة إلى base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const imageDataUrl = event.target.result;
        
        try {
          // تحديث صورة المتجر
          await axios.put(`${API}/api/food/my-store`, { logo: imageDataUrl }, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          setStoreLogo(imageDataUrl);
          toast({ title: "تم", description: "تم تحديث الصورة" });
          onUpdate();
        } catch (error) {
          toast({ title: "خطأ", description: "فشل تحديث الصورة", variant: "destructive" });
        } finally {
          setUploadingLogo(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({ title: "خطأ", description: "فشل قراءة الصورة", variant: "destructive" });
      setUploadingLogo(false);
    }
  };
  
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
    // التحقق من الحقول الإجبارية
    if (!formData.address || formData.address.trim() === '') {
      toast({ title: "خطأ", description: "يرجى كتابة العنوان (إجباري)", variant: "destructive" });
      return;
    }
    if (!formData.latitude || !formData.longitude) {
      toast({ title: "خطأ", description: "يرجى تحديد الموقع على الخريطة (إجباري)", variant: "destructive" });
      return;
    }
    
    setSaving(true);
    try {
      await axios.put(`${API}/api/food/my-store`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: "تم الحفظ", description: "تم تحديث المعلومات" });
      onUpdate();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حفظ التغييرات", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg p-3 border border-gray-100 space-y-3">
      <h3 className="font-bold text-sm text-gray-900">الإعدادات</h3>
      
      {/* صورة المتجر */}
      <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
        <div className="relative">
          {storeLogo ? (
            <img 
              src={storeLogo} 
              alt="الصورة الرئيسية" 
              className="w-20 h-20 rounded-xl object-cover border-2 border-white shadow"
            />
          ) : (
            <div className="w-20 h-20 rounded-xl bg-orange-100 flex items-center justify-center border-2 border-white shadow">
              <Store size={32} className="text-[#FF6B00]" />
            </div>
          )}
          {uploadingLogo && (
            <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="font-medium text-gray-900 text-sm">الصورة الرئيسية</p>
          <p className="text-xs text-gray-500 mb-2">PNG, JPG (أقصى 2 ميجابايت)</p>
          <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FF6B00] text-white rounded-lg text-xs font-medium cursor-pointer hover:bg-[#E65000] transition-colors">
            <Camera size={14} />
            {uploadingLogo ? 'جاري الرفع...' : 'تغيير الصورة'}
            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
              disabled={uploadingLogo}
            />
          </label>
        </div>
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">الاسم</label>
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

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">وقت التحضير (دقيقة)</label>
        <input
          type="number"
          value={formData.delivery_time}
          onChange={(e) => setFormData({ ...formData, delivery_time: parseInt(e.target.value) })}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
          placeholder="مثال: 15"
        />
        <p className="text-[10px] text-gray-400 mt-1">الوقت اللازم لتحضير الطلب قبل التوصيل</p>
      </div>

      {/* العنوان والموقع */}
      <div className="border-t pt-4 mt-4">
        <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
          <MapPin size={18} className="text-blue-500" />
          العنوان والموقع
        </h4>
        
        <div className="space-y-3">
          {/* المدينة */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">المدينة</label>
            <select
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              {SYRIAN_CITIES.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
          
          {/* العنوان */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              العنوان <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00]"
              placeholder="الحي، الشارع، رقم البناء (إجباري)"
              required
            />
          </div>
          
          {/* الخريطة */}
          <div>
            <GoogleMapsLocationPicker
              label="📍 الموقع على الخريطة (إجباري)"
              required={true}
              currentLocation={formData.latitude ? { 
                latitude: formData.latitude, 
                longitude: formData.longitude 
              } : null}
              onLocationSelect={(location) => {
                if (location) {
                  setFormData({ 
                    ...formData, 
                    latitude: location.latitude, 
                    longitude: location.longitude 
                  });
                } else {
                  setFormData({ 
                    ...formData, 
                    latitude: null, 
                    longitude: null 
                  });
                }
              }}
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
          ⏰ سيظهر للعملاء "مغلق" خارج ساعات العمل المحددة
        </p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-[#FF6B00] text-white py-3 rounded-xl font-bold hover:bg-[#E65000] disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Save size={18} />
        )}
        حفظ التغييرات
      </button>

      {/* قسم الإحصائيات */}
      <div className="border-t pt-4 mt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 size={18} className="text-purple-500" />
            الإحصائيات
          </h4>
        </div>
        <SellerAnalytics token={token} />
      </div>

      {/* رابط تصفح كعميل */}
      <Link
        to="/food?view=customer"
        className="w-full flex items-center justify-center gap-2 bg-[#FF6B00]/10 border-2 border-[#FF6B00] text-[#FF6B00] py-3 rounded-xl font-bold hover:bg-[#FF6B00]/20 transition-colors mt-2"
      >
        <Home size={18} />
        تصفح كعميل
      </Link>

      {/* زر تسجيل الخروج */}
      <button
        onClick={() => {
          logout();
          navigate('/login');
          toast({ title: 'تم تسجيل الخروج', description: 'نراك قريباً!' });
        }}
        className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2 mt-2"
        data-testid="logout-btn"
      >
        <LogOut size={18} />
        تسجيل الخروج
      </button>
    </div>
  );
};

// Offers Tab Component
const OffersTab = ({ offers, products, token, onUpdate, showAddOffer, setShowAddOffer }) => {
  const { toast } = useToast();
  const [editingOffer, setEditingOffer] = useState(null);

  const handleToggleOffer = async (offer) => {
    try {
      await axios.put(`${API}/api/food/offers/${offer.id}`, 
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
      await axios.delete(`${API}/api/food/offers/${offerId}`, {
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
                offer.is_active ? 'border-orange-200' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-bold text-gray-900">{offer.name}</h4>
                  <p className="text-sm text-purple-600">{getOfferDescription(offer)}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  offer.is_active 
                    ? 'bg-orange-100 text-[#FF6B00]' 
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
                      : 'bg-orange-100 text-[#FF6B00] hover:bg-orange-200'
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
      await axios.post(`${API}/api/food/offers`, {
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
    category: product?.category || '',
    images: product?.images || [],
    preparation_time: product?.preparation_time || '',
    weight_variants: product?.weight_variants || [],
    admin_video: null, // فيديو التحقق للأدمن
  });
  const [saving, setSaving] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [showImageCapture, setShowImageCapture] = useState(false);
  const [imageCaptureMode, setImageCaptureMode] = useState('camera');
  const [maxImagesPerProduct, setMaxImagesPerProduct] = useState(3);
  const [newWeightVariant, setNewWeightVariant] = useState({ weight: '', unit: 'g', price: '' });
  const [sellingType, setSellingType] = useState(product?.weight_variants?.length > 0 ? 'weight' : 'piece'); // piece أو weight
  const [directUploadInput, setDirectUploadInput] = useState(null);

  // جلب إعدادات الصور
  useEffect(() => {
    const fetchImageSettings = async () => {
      try {
        const res = await fetch(`${API}/api/image/settings`);
        if (res.ok) {
          const data = await res.json();
          if (data.max_images_per_product) {
            setMaxImagesPerProduct(data.max_images_per_product);
          }
        }
      } catch (error) {
        // تجاهل الخطأ - استخدام القيمة الافتراضية
      }
    };
    fetchImageSettings();
  }, []);

  // رفع صورة مباشر بدون تعديل
  const handleDirectUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // تحويل الصورة إلى base64
    const reader = new FileReader();
    reader.onloadend = () => {
      if (formData.images.length < maxImagesPerProduct) {
        setFormData(prev => ({
          ...prev,
          images: [...prev.images, reader.result]
        }));
        toast({ title: "تم بنجاح", description: "تم رفع الصورة" });
      } else {
        toast({ title: "تنبيه", description: `الحد الأقصى ${maxImagesPerProduct} صور`, variant: "destructive" });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // إعادة تعيين الـ input
  };

  // رفع فيديو التحقق للأدمن
  const handleAdminVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "خطأ",
          description: "حجم الفيديو كبير جداً (الحد الأقصى 10MB)",
          variant: "destructive"
        });
        return;
      }
      setUploadingVideo(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          admin_video: reader.result
        }));
        setUploadingVideo(false);
        toast({
          title: "تم رفع فيديو التحقق ✅",
          description: "سيراجعه الأدمن قبل نشر الصنف"
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // إضافة متغير وزن
  const handleAddWeightVariant = () => {
    if (!newWeightVariant.weight || !newWeightVariant.price) {
      toast({ title: "تنبيه", description: "أدخل الوزن والسعر", variant: "destructive" });
      return;
    }
    setFormData({
      ...formData,
      weight_variants: [...formData.weight_variants, {
        weight: parseFloat(newWeightVariant.weight),
        unit: newWeightVariant.unit,
        price: parseFloat(newWeightVariant.price)
      }]
    });
    setNewWeightVariant({ weight: '', unit: 'g', price: '' });
  };

  // حذف متغير وزن
  const handleRemoveWeightVariant = (index) => {
    setFormData({
      ...formData,
      weight_variants: formData.weight_variants.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price) {
      toast({ title: "تنبيه", description: "يرجى ملء الحقول المطلوبة", variant: "destructive" });
      return;
    }

    // التحقق من فيديو التحقق للأدمن (إجباري للأصناف الجديدة)
    if (!product && !formData.admin_video) {
      toast({
        title: "فيديو التحقق مطلوب 📹",
        description: "يرجى رفع فيديو قصير يُظهر الصنف الحقيقي للمراجعة",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const submitData = {
        ...formData,
        store_id: store.id,
        price: parseFloat(formData.price),
        preparation_time: formData.preparation_time ? parseInt(formData.preparation_time) : null,
        weight_variants: formData.weight_variants,
        admin_video: formData.admin_video,
      };
      
      if (product) {
        // Edit existing product
        await axios.put(`${API}/api/food/products/${product.id}`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast({ title: "تم التحديث", description: "تم تحديث الصنف بنجاح" });
      } else {
        // Add new product
        await axios.post(`${API}/api/food/products`, submitData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast({ title: "تمت الإضافة", description: "تم إضافة الصنف بنجاح" });
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
            {product ? 'تعديل الصنف' : 'إضافة صنف جديد'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم الصنف *</label>
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
              placeholder="وصف الصنف..."
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                وقت التحضير (دقيقة)
                <span className="text-gray-400 text-xs mr-1">(للمطاعم فقط - اختياري)</span>
              </label>
              <input
                type="number"
                value={formData.preparation_time}
                onChange={(e) => setFormData({ ...formData, preparation_time: e.target.value })}
                placeholder="15"
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
                <div className="flex justify-between items-center py-2 bg-orange-100 rounded-lg px-3 -mx-1">
                  <span className="font-bold text-[#FF6B00]">صافي ربحك ✅</span>
                  <span className="font-bold text-[#FF6B00] text-lg">
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
              {/* اقتراحات سريعة */}
              <div className="flex flex-wrap gap-1 mb-2">
                {['وجبات', 'مشروبات', 'حلويات', 'خضار وفواكه', 'لحوم ودجاج', 'ألبان وأجبان', 'مخبوزات', 'مواد غذائية', 'أخرى'].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: suggestion })}
                    className={`px-2 py-1 text-[10px] rounded-full border transition-all ${
                      formData.category === suggestion
                        ? 'bg-[#FF6B00] text-white border-[#FF6B00]'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-[#FF6B00] hover:bg-orange-50'
                    }`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="أو اكتب تصنيفك الخاص"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
              />
            </div>
          </div>

          {/* قسم نوع البيع */}
          <div className="border border-gray-200 rounded-xl p-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              نوع البيع
            </label>
            
            {/* اختيار نوع البيع */}
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => {
                  setSellingType('piece');
                  setFormData({ ...formData, weight_variants: [] });
                }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  sellingType === 'piece' 
                    ? 'bg-[#FF6B00] text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                بالقطعة
              </button>
              <button
                type="button"
                onClick={() => setSellingType('weight')}
                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                  sellingType === 'weight' 
                    ? 'bg-[#FF6B00] text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                بالوزن
              </button>
            </div>

            {/* نصيحة تعليمية */}
            {sellingType === 'piece' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
                <p className="text-[11px] text-amber-800">
                  💡 <strong>نصيحة:</strong> عند البيع بالقطعة، يمكنك كتابة تفاصيل إضافية في الوصف مثل:
                  <br />• الوزن التقريبي (مثال: "وزن القطعة ~200 جرام")
                  <br />• عدد القطع (مثال: "العبوة تحتوي 6 قطع")
                  <br />• الحجم (مثال: "حجم كبير / وسط / صغير")
                </p>
              </div>
            )}

            {sellingType === 'weight' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3">
                <p className="text-[11px] text-blue-800">
                  ⚖️ <strong>البيع بالوزن:</strong> أضف الأوزان المتاحة وسعر كل وزن.
                  <br />مثال: 100 جرام = 3000 ل.س، 500 جرام = 12000 ل.س
                </p>
              </div>
            )}
            
            {/* متغيرات الوزن - تظهر فقط عند اختيار "بالوزن" */}
            {sellingType === 'weight' && (
              <>
                {/* متغيرات الوزن الموجودة */}
                {formData.weight_variants.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {formData.weight_variants.map((variant, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
                        <span className="text-sm font-medium">
                          {variant.weight} {variant.unit === 'g' ? 'جرام' : variant.unit === 'kg' ? 'كيلو' : 'قطعة'}
                        </span>
                        <span className="text-sm font-bold text-[#FF6B00]">{variant.price.toLocaleString()} ل.س</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveWeightVariant(index)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* إضافة متغير وزن جديد */}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-500 block mb-1">الوزن</label>
                    <input
                      type="number"
                      value={newWeightVariant.weight}
                      onChange={(e) => setNewWeightVariant({ ...newWeightVariant, weight: e.target.value })}
                      placeholder="100"
                      className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm"
                    />
                  </div>
                  <div className="w-24">
                    <label className="text-[10px] text-gray-500 block mb-1">الوحدة</label>
                    <select
                      value={newWeightVariant.unit}
                      onChange={(e) => setNewWeightVariant({ ...newWeightVariant, unit: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm"
                    >
                      <option value="g">جرام</option>
                      <option value="kg">كيلو</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-500 block mb-1">السعر (ل.س)</label>
                    <input
                      type="number"
                      value={newWeightVariant.price}
                      onChange={(e) => setNewWeightVariant({ ...newWeightVariant, price: e.target.value })}
                      placeholder="5000"
                      className="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddWeightVariant}
                    className="bg-[#FF6B00] text-white p-2 rounded-lg hover:bg-[#E65000]"
                  >
                    <Plus size={20} />
                  </button>
                </div>

                {formData.weight_variants.length === 0 && (
                  <p className="text-[10px] text-red-500 mt-2">⚠️ أضف الأوزان المطلوبة</p>
                )}
              </>
            )}
          </div>

          {/* Images Section - محسّن */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                صور الصنف ({formData.images.length}/{maxImagesPerProduct})
              </label>
            </div>
            
            {/* نصيحة الخلفية البيضاء */}
            <p className="text-[10px] text-blue-600 bg-blue-50 p-2 rounded-lg mb-2">
              📸 ضع خلفية بيضاء خلف الصنف عند التصوير للحصول على جودة أفضل
            </p>
            
            {/* أزرار الكاميرا والمعرض والرفع المباشر */}
            {formData.images.length < maxImagesPerProduct && (
              <div className="space-y-2 mb-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setImageCaptureMode('camera');
                      setShowImageCapture(true);
                    }}
                    className="flex-1 py-2.5 bg-[#FF6B00] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#E65000]"
                  >
                    <Camera size={16} />
                    تصوير بالكاميرا
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setImageCaptureMode('gallery');
                      setShowImageCapture(true);
                    }}
                    className="flex-1 py-2.5 bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00] rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#FF6B00]/20"
                  >
                    <Image size={16} />
                    من المعرض
                  </button>
                </div>
                {/* زر الرفع المباشر بدون تعديل */}
                <label className="w-full py-2 bg-[#FF6B00] text-white rounded-lg text-xs flex items-center justify-center gap-2 hover:bg-[#E65000] cursor-pointer font-bold">
                  <Upload size={14} />
                  رفع مباشر بدون تعديل
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleDirectUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}
            
            {/* معاينة الصور */}
            <div className="flex gap-2 flex-wrap">
              {formData.images.map((img, i) => (
                <div key={i} className="relative group">
                  <img src={img} alt="" className="w-20 h-20 rounded-lg object-cover border border-gray-200" />
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData,
                      images: formData.images.filter((_, idx) => idx !== i)
                    })}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                  {i === 0 && (
                    <span className="absolute bottom-0 left-0 right-0 bg-[#FF6B00] text-white text-[8px] text-center py-0.5 rounded-b-lg">
                      رئيسية
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* قسم فيديو التحقق للأدمن */}
          {!product && (
            <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-3">
              <label className="block text-[11px] font-bold mb-2 text-orange-800">
                📹 فيديو التحقق للمراجعة (إجباري)
                <span className="text-red-500 mr-1">*</span>
              </label>
              <p className="text-[9px] text-orange-700 mb-2">
                صوّر فيديو قصير (30 ثانية) يُظهر الصنف الحقيقي.
                <br/>
                <strong>هذا الفيديو للأدمن فقط ولن يظهر للعملاء.</strong>
              </p>
              {formData.admin_video ? (
                <div className="relative bg-orange-100 rounded-lg p-2">
                  <video 
                    src={formData.admin_video} 
                    className="w-full h-28 object-cover rounded"
                    controls
                  />
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, admin_video: null })}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg"
                  >
                    <X size={14} />
                  </button>
                  <div className="absolute bottom-1 left-1 bg-[#FF6B00] text-white text-[8px] px-2 py-0.5 rounded-full font-bold">
                    ✓ تم الرفع
                  </div>
                </div>
              ) : (
                <label className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg text-[11px] flex items-center justify-center gap-2 hover:from-orange-600 hover:to-red-600 font-bold cursor-pointer shadow-md">
                  {uploadingVideo ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Upload size={14} />
                      📹 ارفع فيديو التحقق
                    </>
                  )}
                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleAdminVideoUpload}
                    className="hidden"
                    disabled={uploadingVideo}
                  />
                </label>
              )}
              <p className="text-[8px] text-orange-600 mt-1">الحد الأقصى: 30 ثانية / 10MB</p>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-[#FF6B00] text-white py-3 rounded-xl font-bold hover:bg-[#E65000] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جاري رفع الصنف...</span>
                </div>
                <span className="text-[9px] opacity-80">يرجى الانتظار</span>
              </div>
            ) : (
              <>
                <Save size={18} />
                {product ? 'حفظ التغييرات' : 'إضافة الصنف'}
              </>
            )}
          </button>
        </form>
      </motion.div>
      
      {/* مكون التقاط الصور المتقدم */}
      <SimpleImageCapture
        isOpen={showImageCapture}
        onClose={() => setShowImageCapture(false)}
        mode={imageCaptureMode}
        onImageReady={(imageUrl) => {
          setFormData(prev => ({
            ...prev,
            images: [...prev.images, imageUrl].slice(0, maxImagesPerProduct)
          }));
          toast({
            title: "تم بنجاح ✨",
            description: "تم إضافة الصورة"
          });
        }}
      />
    </div>
  );
};

// Store Orders Tab Component
const StoreOrdersTab = ({ token, onNewOrder }) => {
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const previousPendingCountRef = useRef(0);
  
  // Modal لبدء التحضير مع تحديد الوقت
  const [showPrepModal, setShowPrepModal] = useState(null);
  const [prepTime, setPrepTime] = useState(15);
  const [prepSubmitting, setPrepSubmitting] = useState(false);
  
  // حالة طلب السائق الجديدة
  const [requestingDriver, setRequestingDriver] = useState(null);
  const [showSetPrepTimeModal, setShowSetPrepTimeModal] = useState(null);
  const [newPrepTime, setNewPrepTime] = useState(15);
  const [settingPrepTime, setSettingPrepTime] = useState(false);

  // التحقق من الطلبات الجديدة وتشغيل الصوت
  useEffect(() => {
    const pendingCount = orders.filter(o => o.status === 'pending').length;
    
    if (pendingCount > previousPendingCountRef.current && previousPendingCountRef.current !== 0) {
      // هناك طلب جديد!
      if (onNewOrder) {
        onNewOrder(pendingCount);
      }
    }
    previousPendingCountRef.current = pendingCount;
  }, [orders, onNewOrder]);

  useEffect(() => {
    fetchOrders();
    // Polling every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchOrders = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const res = await axios.get(`${API}/api/food/orders/store/orders`, {
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
      await axios.post(`${API}/api/food/orders/store/orders/${orderId}/status`, null, {
        params: { new_status: newStatus },
        headers: { Authorization: `Bearer ${token}` }
      });
      // لا نحتاج إشعار نجاح - تغيير الحالة كافٍ
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
        `${API}/api/food/orders/store/orders/${orderId}/start-preparation`,
        { preparation_time_minutes: prepTime },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // لا نحتاج إشعار نجاح
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
      paid: 'bg-blue-100 text-blue-700',
      confirmed: 'bg-blue-100 text-blue-700',
      preparing: 'bg-orange-100 text-orange-700',
      ready: 'bg-orange-100 text-[#FF6B00]',
      out_for_delivery: 'bg-purple-100 text-purple-700',
      delivered: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'بانتظار الدفع',
      paid: 'مدفوع - بانتظار الموافقة',
      confirmed: 'تم التأكيد',
      preparing: 'جاري التحضير',
      ready: 'جاهز للاستلام',
      out_for_delivery: 'في الطريق',
      delivered: 'تم التسليم',
      cancelled: 'ملغي'
    };
    return labels[status] || status;
  };

  // الإبلاغ عن وصول كاذب للسائق
  const reportFalseArrival = async (orderId) => {
    if (!window.confirm('هل أنت متأكد أن السائق لم يصل فعلياً للمتجر؟')) {
      return;
    }

    try {
      const res = await axios.post(
        `${API}/api/food/orders/store/orders/${orderId}/report-false-arrival`,
        null,
        { 
          params: { reason: 'السائق لم يصل فعلياً' },
          headers: { Authorization: `Bearer ${token}` } 
        }
      );
      // لا نحتاج إشعار نجاح
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

  // طلب سائق للطلب
  const requestDriver = async (orderId) => {
    setRequestingDriver(orderId);
    try {
      const res = await axios.post(
        `${API}/api/food/orders/store/orders/${orderId}/request-driver`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      // لا نحتاج إشعار نجاح
      fetchOrders();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل طلب السائق",
        variant: "destructive"
      });
    } finally {
      setRequestingDriver(null);
    }
  };

  // تحديد وقت التحضير بعد قبول السائق
  const setPreparationTime = async (orderId) => {
    setSettingPrepTime(true);
    try {
      const res = await axios.post(
        `${API}/api/food/orders/store/orders/${orderId}/set-preparation-time`,
        { preparation_time_minutes: newPrepTime },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast({
        title: "تم تحديد وقت التحضير",
        description: `سيتم إبلاغ السائق. كود الاستلام: ${res.data.pickup_code}`
      });
      setShowSetPrepTimeModal(null);
      setNewPrepTime(15);
      fetchOrders();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل تحديد وقت التحضير",
        variant: "destructive"
      });
    } finally {
      setSettingPrepTime(false);
    }
  };

  // جلب حالة السائق للطلب
  const getDriverStatusText = (order) => {
    if (!order.driver_requested) return null;
    
    switch (order.driver_status) {
      case 'waiting_for_driver':
        return { text: 'بانتظار اتصال السائقين...', color: 'text-yellow-600', bg: 'bg-yellow-50' };
      case 'waiting_for_acceptance':
        return { text: 'بانتظار قبول السائق...', color: 'text-blue-600', bg: 'bg-blue-50' };
      case 'driver_accepted':
        return { 
          text: `✅ السائق ${order.driver_name || ''} قبل - سيصل خلال ${order.driver_estimated_arrival_minutes || '?'} دقيقة`, 
          color: 'text-[#FF6B00]', 
          bg: 'bg-orange-50' 
        };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
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
              filter === f.id ? 'bg-[#FF6B00] text-white' : 'bg-white text-gray-600 border'
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
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    <span className="font-bold text-[#FF6B00]">{order.total?.toLocaleString()} ل.س</span>
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
                  {(order.status === 'pending' || order.status === 'paid') && (
                    <div className="space-y-3">
                      {/* مكون حالة السائقين */}
                      <DriverAvailabilityCheck orderId={order.id} token={token} />
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(order.id, 'confirmed')}
                          data-testid={`confirm-order-${order.id}`}
                          className="flex-1 bg-[#FF6B00] text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-[#E65000]"
                        >
                          <Check size={16} />
                          قبول الطلب
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
                    <div className="space-y-3">
                      {/* حالة السائق */}
                      {order.driver_requested && (
                        <div className={`${getDriverStatusText(order)?.bg || 'bg-gray-50'} border rounded-lg p-3`}>
                          <div className="flex items-center gap-2">
                            <Truck size={16} className={getDriverStatusText(order)?.color || 'text-gray-600'} />
                            <span className={`text-sm font-medium ${getDriverStatusText(order)?.color || 'text-gray-600'}`}>
                              {getDriverStatusText(order)?.text}
                            </span>
                          </div>
                          
                          {/* إذا قبل السائق - يطلب تحديد وقت التحضير */}
                          {order.driver_status === 'driver_accepted' && order.waiting_for_preparation_time && (
                            <button
                              onClick={() => {
                                setShowSetPrepTimeModal(order);
                                setNewPrepTime(15);
                              }}
                              data-testid={`set-prep-time-${order.id}`}
                              className="mt-3 w-full bg-orange-500 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-orange-600"
                            >
                              <Timer size={16} />
                              حدد وقت التحضير
                            </button>
                          )}
                        </div>
                      )}
                      
                      {/* إذا لم يُطلب سائق بعد - يجب طلب السائق أولاً قبل بدء التحضير */}
                      {!order.driver_requested && (
                        <div className="space-y-2">
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-center">
                            <p className="text-amber-700 text-xs">⚠️ يجب طلب سائق أولاً قبل بدء التحضير</p>
                          </div>
                          <button
                            onClick={() => requestDriver(order.id)}
                            disabled={requestingDriver === order.id}
                            data-testid={`request-driver-${order.id}`}
                            className="w-full bg-blue-500 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-600 disabled:opacity-50"
                          >
                            {requestingDriver === order.id ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <Truck size={16} />
                                طلب سائق
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
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
                        className="w-full bg-[#FF6B00] text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-[#E65000]"
                      >
                        <Package size={16} />
                        الطلب جاهز
                      </button>
                    </div>
                  )}

                  {order.status === 'ready' && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                      <p className="text-[#FF6B00] text-sm mb-2">بانتظار موظف التوصيل</p>
                      
                      {/* كود الاستلام */}
                      {order.pickup_code && (
                        <div className="bg-white rounded-lg p-4 mt-2 border-2 border-dashed border-[#FF6B00]">
                          <p className="text-xs text-gray-500 mb-2">كود الاستلام - أعطه لموظف التوصيل</p>
                          <div className="flex justify-center gap-2" dir="ltr">
                            {order.pickup_code.split('').map((digit, i) => (
                              <span 
                                key={i} 
                                className="w-12 h-14 flex items-center justify-center text-2xl font-bold bg-[#FF6B00] text-white rounded-lg shadow-md"
                              >
                                {digit}
                              </span>
                            ))}
                          </div>
                          {order.pickup_code_verified && (
                            <p className="text-[#FF6B00] text-xs mt-2 font-bold">
                              ✅ تم تأكيد الاستلام
                            </p>
                          )}
                        </div>
                      )}
                      
                      {/* معلومات السائق مع الصورة */}
                      {order.driver_name && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-3">
                            {/* صورة موظف التوصيل */}
                            {order.driver_image ? (
                              <img 
                                src={order.driver_image} 
                                alt={order.driver_name}
                                className="w-14 h-14 rounded-full object-cover border-2 border-blue-400"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-full bg-blue-200 flex items-center justify-center border-2 border-blue-400">
                                <span className="text-2xl">🏍️</span>
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="text-sm text-blue-800 font-bold">
                                {order.driver_name}
                              </p>
                              <p className="text-[10px] text-blue-600">موظف التوصيل</p>
                              {order.driver_phone && (
                                <p className="text-[11px] text-gray-600 font-mono" dir="ltr">
                                  {order.driver_phone}
                                </p>
                              )}
                            </div>
                            {order.driver_phone && (
                              <a 
                                href={`tel:${order.driver_phone}`}
                                className="bg-blue-500 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-blue-600 flex items-center gap-1"
                              >
                                📞 اتصال
                              </a>
                            )}
                          </div>
                          {order.driver_arrived_at && (
                            <>
                              {/* مؤقت انتظار السائق - تنبيه للبائع */}
                              {!order.pickup_code_verified && (
                                <DriverWaitingAlert
                                  arrivedAt={order.driver_arrived_at}
                                  driverName={order.driver_name || 'السائق'}
                                  orderId={order.id}
                                />
                              )}
                              
                              {order.pickup_code_verified && (
                                <p className="text-xs text-[#FF6B00] mt-2 font-bold">
                                  ✅ تم تسليم الطلب للسائق
                                </p>
                              )}
                              
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
                        </div>
                      )}
                    </div>
                  )}

                  {order.status === 'out_for_delivery' && (
                    <div className="space-y-2">
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <p className="text-purple-700 text-sm font-medium flex items-center justify-center gap-2 mb-3">
                          <Navigation size={16} className="animate-pulse" />
                          جاري التوصيل للعميل
                        </p>
                        {/* معلومات السائق مع الصورة */}
                        {order.driver_name && (
                          <div className="flex items-center gap-3 bg-white rounded-lg p-2">
                            {order.driver_image ? (
                              <img 
                                src={order.driver_image} 
                                alt={order.driver_name}
                                className="w-12 h-12 rounded-full object-cover border-2 border-purple-400"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-purple-200 flex items-center justify-center border-2 border-purple-400">
                                <span className="text-xl">🏍️</span>
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="text-sm text-purple-800 font-bold">{order.driver_name}</p>
                              <p className="text-[10px] text-purple-600">في الطريق للعميل</p>
                            </div>
                            {order.driver_phone && (
                              <a 
                                href={`tel:${order.driver_phone}`}
                                className="bg-purple-500 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-purple-600"
                              >
                                📞 اتصال
                              </a>
                            )}
                          </div>
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

      {/* Modal تحديد وقت التحضير (بعد قبول السائق) */}
      {showSetPrepTimeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="bg-white rounded-t-3xl w-full max-w-lg p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">تحديد وقت التحضير</h3>
              <button 
                onClick={() => setShowSetPrepTimeModal(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-orange-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-[#FF6B00] mb-2 font-medium flex items-center gap-2">
                <Check size={16} />
                السائق {showSetPrepTimeModal.driver_name} قبل الطلب!
              </p>
              <p className="text-xs text-[#FF6B00]">
                سيصل السائق خلال {showSetPrepTimeModal.driver_estimated_arrival_minutes || '?'} دقيقة
              </p>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-700">
                <strong>الخطوة التالية:</strong> حدد كم دقيقة تحتاج لتحضير الطلب #{showSetPrepTimeModal.order_number}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                سيتم إبلاغ السائق بالوقت المناسب للذهاب للمتجر
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                وقت التحضير المطلوب
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 15, 20, 25, 30, 45, 60].map((time) => (
                  <button
                    key={time}
                    onClick={() => setNewPrepTime(time)}
                    data-testid={`new-prep-time-${time}`}
                    className={`py-3 rounded-xl text-sm font-medium transition-all ${
                      newPrepTime === time
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {time} د
                  </button>
                ))}
              </div>
              
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  value={newPrepTime}
                  onChange={(e) => setNewPrepTime(parseInt(e.target.value) || 15)}
                  min={3}
                  max={120}
                  className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-center"
                />
                <span className="text-sm text-gray-500">دقيقة</span>
              </div>
            </div>

            {/* معاينة الجدول الزمني */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-xs text-gray-500 mb-2">الجدول الزمني المتوقع:</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">وصول السائق للمتجر:</span>
                  <span className="font-medium">{showSetPrepTimeModal.driver_estimated_arrival_minutes || '?'} دقيقة</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">جاهزية الطلب:</span>
                  <span className="font-medium text-[#FF6B00]">{newPrepTime} دقيقة</span>
                </div>
                {newPrepTime > (showSetPrepTimeModal.driver_estimated_arrival_minutes || 0) && (
                  <div className="flex justify-between text-blue-600">
                    <span>سيُبلغ السائق بالانتظار:</span>
                    <span className="font-medium">{newPrepTime - (showSetPrepTimeModal.driver_estimated_arrival_minutes || 0)} دقيقة</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setPreparationTime(showSetPrepTimeModal.id)}
              disabled={settingPrepTime}
              data-testid="confirm-set-prep-time"
              className="w-full bg-blue-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-600 disabled:opacity-50"
            >
              {settingPrepTime ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Timer size={20} />
                  تأكيد وبدء التحضير
                </>
              )}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

// مكون المؤقت التنازلي للترويج
const PromotionCountdown = ({ expiresAt }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft('انتهى');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}س ${minutes}د`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}د ${seconds}ث`);
      } else {
        setTimeLeft(`${seconds}ث`);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  return (
    <span className="flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 px-2 py-1 rounded-full">
      <Timer size={12} />
      {timeLeft}
    </span>
  );
};

// Promote Food Tab Component - روّج منتجك (النظام الجديد البسيط)
const PromoteFoodTab = ({ store, products, token, walletBalance = 0, onPromotionSuccess }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({ cost_per_product: 1000, duration_hours: 24 });
  const [myPromotions, setMyPromotions] = useState({ active: [], expired: [] });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      const [settingsRes, promotionsRes, flashStatusRes] = await Promise.all([
        axios.get(`${API}/api/seller/promotion-settings`, { headers }),
        axios.get(`${API}/api/seller/my-promotions`, { headers }),
        axios.get(`${API}/api/flash/status`)
      ]);
      
      setSettings({
        ...settingsRes.data,
        flashStatus: flashStatusRes.data
      } || { cost_per_product: 1000, duration_hours: 24 });
      setMyPromotions(promotionsRes.data || { active: [], expired: [] });
    } catch (error) {
      console.error('Error fetching promotion data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async () => {
    if (!selectedProduct) {
      toast({ title: "خطأ", description: "يرجى اختيار منتج للترويج", variant: "destructive" });
      return;
    }

    if (walletBalance < settings.cost_per_product) {
      toast({ title: "رصيد غير كافٍ", description: `تحتاج ${settings.cost_per_product.toLocaleString()} ل.س للترويج`, variant: "destructive" });
      return;
    }

    try {
      setSubmitting(true);
      const res = await axios.post(
        `${API}/api/seller/promote-product`,
        { product_id: selectedProduct.id, discount_percentage: discount },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast({ title: "تم بنجاح! 🚀", description: settings.flashStatus?.status === 'live' 
          ? "منتجك الآن يظهر في Flash!" 
          : "تم حجز منتجك في Flash القادم الساعة 1:00 ظهراً" });
      
      setSelectedProduct(null);
      setDiscount(0);
      fetchData();
      
      if (onPromotionSuccess) {
        onPromotionSuccess(res.data.new_balance);
      }
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || "فشل في ترويج المنتج", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // المنتجات الموافق عليها فقط
  const approvedProducts = products?.filter(p => p.is_approved !== false) || [];
  const activeProductIds = myPromotions.active?.map(p => p.product_id) || [];
  const availableProducts = approvedProducts.filter(p => !activeProductIds.includes(p.id));

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoaderIcon className="w-8 h-8 animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  // إذا كان الفلاش معطل لبائعي الطعام، لا نعرض شيئاً
  if (settings.flash_enabled_for_me === false) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* شريط حالة Flash للبائع */}
      {settings.flashStatus && (
        <div className={`rounded-xl p-3 flex items-center justify-between ${
          settings.flashStatus.status === 'live' 
            ? 'bg-orange-100 border border-orange-300' 
            : 'bg-yellow-100 border border-yellow-300'
        }`}>
          <div className="flex items-center gap-2">
            {settings.flashStatus.status === 'live' ? (
              <>
                <div className="w-2 h-2 bg-[#FF6B00] rounded-full animate-pulse"></div>
                <span className="font-bold text-[#FF6B00] text-sm">⚡ Flash نشط الآن!</span>
              </>
            ) : (
              <>
                <span className="text-xl">🔔</span>
                <span className="font-bold text-yellow-800 text-sm">
                  Flash يبدأ {settings.flashStatus.next_day_name ? `يوم ${settings.flashStatus.next_day_name}` : 'قريباً'}
                </span>
              </>
            )}
          </div>
          <div className="text-xs font-medium">
            {settings.flashStatus.status === 'live' 
              ? `ينتهي خلال: ${settings.flashStatus.remaining_formatted}` 
              : `يبدأ بعد: ${settings.flashStatus.until_start_formatted}`
            }
          </div>
        </div>
      )}

      {/* بانر فلاش */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap size={24} />
          <h2 className="font-bold text-lg">فلاش - روّج منتجك ⚡</h2>
        </div>
        <p className="text-sm opacity-90 mb-3">
          {settings.flashStatus?.status === 'live' 
            ? '⏳ Flash نشط الآن! انتظر انتهاءه لإضافة منتجك للـ Flash القادم' 
            : `أضف منتجك الآن وسيظهر في Flash ${settings.flashStatus?.next_day_name ? `يوم ${settings.flashStatus.next_day_name}` : 'القادم'}`}
        </p>
        <div className="flex flex-wrap gap-2">
          <div className="bg-white/20 rounded-lg px-3 py-1.5 text-xs flex items-center gap-1">
            <Clock size={12} />
            <span>يبدأ: الساعة 1:00 ظهراً {settings.flashStatus?.allowed_days?.length === 7 ? 'يومياً' : ''}</span>
          </div>
          <div className="bg-white/20 rounded-lg px-3 py-1.5 text-xs flex items-center gap-1">
            <Wallet size={12} />
            <span>التكلفة: {settings.cost_per_product?.toLocaleString()} ل.س</span>
          </div>
        </div>
      </div>

      {/* الترويجات النشطة */}
      {myPromotions.active?.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <h3 className="font-bold text-[#FF6B00] mb-3 flex items-center gap-2">
            <Sparkles size={18} />
            ترويجاتك النشطة ({myPromotions.active.length})
          </h3>
          <div className="space-y-2">
            {myPromotions.active.map(promo => (
              <div key={promo.id} className="bg-white rounded-lg p-3 flex items-center gap-3">
                {promo.product_image && (
                  <img src={promo.product_image} alt={promo.product_name} className="w-12 h-12 rounded-lg object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{promo.product_name}</p>
                  {/* السعر الأصلي والسعر بعد الخصم */}
                  {promo.discount_percentage > 0 && promo.original_price && (
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      <span className="line-through">{promo.original_price?.toLocaleString()}</span>
                      <span className="mx-1">←</span>
                      <span className="text-red-600 font-medium">{(promo.discounted_price || Math.round(promo.original_price * (1 - promo.discount_percentage/100))).toLocaleString()} ل.س</span>
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <PromotionCountdown expiresAt={promo.expires_at} />
                    {promo.discount_percentage > 0 && (
                      <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full text-xs font-bold">-{promo.discount_percentage}%</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* اختيار منتج للترويج */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Package size={18} className="text-orange-500" />
          اختر منتج للترويج
        </h3>
        
        {/* رسالة تنبيه عند Flash النشط */}
        {settings.flashStatus?.status === 'live' && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 font-medium flex items-center gap-2">
              <Clock size={16} />
              Flash نشط الآن! لا يمكن إضافة منتجات حتى انتهائه
            </p>
            <p className="text-xs text-yellow-600 mt-1">
              ينتهي خلال: {settings.flashStatus.remaining_formatted}
            </p>
          </div>
        )}
        
        {settings.flashStatus?.status === 'live' ? (
          <div className="text-center py-8 text-gray-400">
            <Zap size={40} className="mx-auto mb-2 opacity-30" />
            <p>انتظر انتهاء Flash الحالي</p>
          </div>
        ) : availableProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package size={40} className="mx-auto mb-2 opacity-30" />
            <p>لا توجد منتجات متاحة للترويج</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {availableProducts.map(product => (
              <div 
                key={product.id}
                onClick={() => setSelectedProduct(selectedProduct?.id === product.id ? null : product)}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                  selectedProduct?.id === product.id 
                    ? 'bg-orange-50 border-2 border-orange-500' 
                    : 'bg-gray-50 border-2 border-transparent hover:border-orange-200'
                }`}
              >
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedProduct?.id === product.id ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
                }`}>
                  {selectedProduct?.id === product.id && <Check size={14} className="text-white" />}
                </div>
                
                {(product.images?.[0] || product.image) && (
                  <img src={product.images?.[0] || product.image} alt={product.name} className="w-12 h-12 rounded-lg object-cover" />
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{product.name}</p>
                  <p className="text-sm text-gray-500">{product.price?.toLocaleString()} ل.س</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* إضافة خصم (اختياري) */}
      {selectedProduct && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Percent size={18} className="text-red-500" />
            إضافة خصم (اختياري)
          </h3>
          <p className="text-sm text-gray-500 mb-3">أضف خصم لجذب المزيد من العملاء</p>
          
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="50"
              step="5"
              value={discount}
              onChange={(e) => setDiscount(parseInt(e.target.value))}
              className="flex-1 accent-red-500"
            />
            <div className="w-16 text-center">
              <span className={`text-lg font-bold ${discount > 0 ? 'text-red-500' : 'text-gray-400'}`}>{discount}%</span>
            </div>
          </div>
          
          {discount > 0 && (
            <div className="mt-3 p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-700">
                السعر بعد الخصم: <span className="font-bold">{Math.round(selectedProduct.price * (1 - discount/100)).toLocaleString()} ل.س</span>
                <span className="line-through text-gray-400 mr-2">{selectedProduct.price?.toLocaleString()}</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* زر الترويج */}
      {selectedProduct && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">المنتج المختار</p>
              <p className="font-bold text-gray-900">{selectedProduct.name}</p>
            </div>
            <div className="text-left">
              <p className="text-sm text-gray-500">التكلفة</p>
              <p className="font-bold text-purple-600">{settings.cost_per_product?.toLocaleString()} ل.س</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">رصيد محفظتك</span>
            <span className={`font-bold ${walletBalance >= settings.cost_per_product ? 'text-green-600' : 'text-red-600'}`}>
              {walletBalance?.toLocaleString()} ل.س
            </span>
          </div>
          
          <button
            onClick={handlePromote}
            disabled={submitting || walletBalance < settings.cost_per_product}
            className={`w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all ${
              walletBalance >= settings.cost_per_product
                ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:opacity-90'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <>
                <LoaderIcon className="animate-spin" size={20} />
                جاري الترويج...
              </>
            ) : walletBalance < settings.cost_per_product ? (
              <>
                <Wallet size={20} />
                رصيد غير كافٍ
              </>
            ) : (
              <>
                <Zap size={20} />
                روّج الآن ⚡ {settings.cost_per_product?.toLocaleString()} ل.س
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

// Flash Sales Tab Component - OLD (kept for reference)
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
        axios.get(`${API}/api/food/flash-sales/available`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/api/food/my-flash-requests`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/api/food/flash-sale-settings`, {
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
    
    // تحديث فوري للواجهة
    setMyRequests(prev => prev.filter(req => req.id !== requestId));
    
    try {
      const res = await axios.delete(`${API}/api/food/flash-sale-request/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ 
        title: "تم الإلغاء", 
        description: `تم استرداد ${res.data.refunded?.toLocaleString() || 0} ل.س` 
      });
    } catch (error) {
      // إرجاع البيانات عند الفشل
      fetchData();
      toast({ title: "خطأ", description: error.response?.data?.detail || "فشل الإلغاء", variant: "destructive" });
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-orange-100 text-[#FF6B00]',
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
      await axios.post(`${API}/api/food/flash-sale-request`, {
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
                <span className="text-[#FF6B00] font-bold text-lg">
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
        const res = await axios.get(`${API}/api/food/orders/check-drivers-availability/${orderId}`, {
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
    none: 'bg-orange-50 border-orange-200',
    low: 'bg-orange-50 border-orange-200',
    medium: 'bg-orange-50 border-orange-200',
    high: 'bg-red-50 border-red-200',
    error: 'bg-gray-50 border-gray-200'
  }[data.warning_level] || 'bg-gray-50 border-gray-200';

  const textColor = {
    none: 'text-[#FF6B00]',
    low: 'text-[#FF6B00]',
    medium: 'text-orange-700',
    high: 'text-red-700',
    error: 'text-gray-700'
  }[data.warning_level] || 'text-gray-700';

  const subTextColor = {
    none: 'text-[#FF6B00]',
    low: 'text-[#FF6B00]',
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
