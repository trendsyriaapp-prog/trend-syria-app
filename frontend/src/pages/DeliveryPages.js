import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { 
  Truck, Clock, Upload, Camera, CreditCard, AlertTriangle, Navigation, Home, Volume2, VolumeX, LogOut, Wallet, Star, Settings
} from 'lucide-react';
import { PickupChecklist, DeliveryChecklist, ReturnChecklist } from '../components/delivery/DeliveryChecklists';
import AvailableOrdersList from '../components/delivery/AvailableOrdersList';
import MyOrdersList from '../components/delivery/MyOrdersList';
import RouteMapModal from '../components/delivery/RouteMapModal';
import MyBoxCard from '../components/delivery/MyBoxCard';
import DriverPerformance from '../components/delivery/DriverPerformance';
import DriverChallenges from '../components/delivery/DriverChallenges';
import DriverLeaderboard from '../components/delivery/DriverLeaderboard';
import DriverAchievements from '../components/delivery/DriverAchievements';
import DriverPenaltyPoints from '../components/delivery/DriverPenaltyPoints';
import DeliverySettingsTab from '../components/delivery/DeliverySettingsTab';
import NotificationsDropdown from '../components/NotificationsDropdown';
import useNotificationSound from '../hooks/useNotificationSound';
import useDriverLocationTracker from '../hooks/useDriverLocationTracker';
import PushNotificationButton from '../components/PushNotificationButton';
import PushNotificationPrompt from '../components/PushNotificationPrompt';

import EarningsStats from '../components/delivery/EarningsStats';
import '../styles/driver-dark-theme.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// صفحة رفع وثائق موظف التوصيل
const DeliveryDocuments = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [docs, setDocs] = useState({
    national_id: '',
    personal_photo: '',
    id_photo: '',
    motorcycle_license: ''
  });

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await axios.get(`${API}/delivery/documents/status`);
      setStatus(res.data.status);
    } catch (error) {
      console.error(error);
    }
  };

  const handleImageUpload = (field) => (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "خطأ",
          description: "حجم الصورة يجب أن يكون أقل من 5MB",
          variant: "destructive"
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocs(prev => ({ ...prev, [field]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!docs.national_id || !docs.personal_photo || !docs.id_photo || !docs.motorcycle_license) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول ورفع جميع الصور",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/delivery/documents`, docs);
      toast({
        title: "تم بنجاح",
        description: "تم إرسال الوثائق، في انتظار موافقة الإدارة"
      });
      setStatus('pending');
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "حدث خطأ",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (status === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 text-center max-w-sm">
          <Clock size={48} className="text-yellow-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">في انتظار الموافقة</h2>
          <p className="text-sm text-gray-500">تم إرسال وثائقك وهي قيد المراجعة من قبل الإدارة</p>
        </div>
      </div>
    );
  }

  if (status === 'approved') {
    navigate('/delivery/dashboard');
    return null;
  }

  if (status === 'rejected') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 text-center max-w-sm">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">تم رفض طلبك</h2>
          <p className="text-sm text-gray-500">للأسف تم رفض طلبك. يرجى التواصل مع الإدارة للمزيد من المعلومات</p>
        </div>
      </div>
    );
  }

  // Image upload field component
  const ImageUploadField = ({ field, label, icon: Icon, value, onUpload }) => (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <label className="block text-sm font-bold text-gray-700 mb-2">
        <Icon size={16} className="inline ml-1" />
        {label}
      </label>
      <div className="relative">
        {value ? (
          <div className="relative">
            <img src={value} alt={label} className="w-full h-40 object-cover rounded-lg" />
            <button
              type="button"
              onClick={() => setDocs(prev => ({ ...prev, [field]: '' }))}
              className="absolute top-2 left-2 bg-red-500 text-white p-1 rounded-full"
            >
              ✕
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#FF6B00] transition-colors">
            <Upload size={24} className="text-gray-400 mb-2" />
            <span className="text-sm text-gray-500">اضغط لرفع الصورة</span>
            <input
              type="file"
              accept="image/*"
              onChange={onUpload}
              className="hidden"
            />
          </label>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-2">تسجيل موظف توصيل</h1>
        <p className="text-sm text-gray-500 mb-6">يرجى ملء البيانات ورفع الوثائق المطلوبة</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* رقم الهوية الوطنية */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <CreditCard size={16} className="inline ml-1" />
              رقم الهوية الوطنية
            </label>
            <input
              type="text"
              value={docs.national_id}
              onChange={(e) => setDocs(prev => ({ ...prev, national_id: e.target.value }))}
              className="w-full p-3 border border-gray-300 rounded-lg text-sm"
              placeholder="أدخل رقم الهوية الوطنية"
              required
            />
          </div>

          <ImageUploadField
            field="personal_photo"
            label="صورة شخصية حديثة"
            icon={Camera}
            value={docs.personal_photo}
            onUpload={handleImageUpload('personal_photo')}
          />

          <ImageUploadField
            field="id_photo"
            label="صورة الهوية كاملة (الوجهين)"
            icon={CreditCard}
            value={docs.id_photo}
            onUpload={handleImageUpload('id_photo')}
          />

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Truck size={16} className="inline ml-1" />
              شهادة/رخصة الدراجة (باسمك)
            </label>
            <div className="relative">
              {docs.motorcycle_license ? (
                <div className="relative">
                  <img src={docs.motorcycle_license} alt="رخصة الدراجة" className="w-full h-40 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => setDocs(prev => ({ ...prev, motorcycle_license: '' }))}
                    className="absolute top-2 left-2 bg-red-500 text-white p-1 rounded-full"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#FF6B00] transition-colors">
                  <Upload size={24} className="text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">اضغط لرفع شهادة الدراجة</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload('motorcycle_license')}
                    className="hidden"
                  />
                </label>
              )}
            </div>
            <p className="text-[10px] text-red-500 mt-2">* يجب أن تكون الشهادة باسمك الشخصي</p>
          </div>

          {/* زر الإرسال */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF6B00] text-white py-3 rounded-xl font-bold disabled:opacity-50"
          >
            {loading ? 'جاري الإرسال...' : 'إرسال الوثائق'}
          </button>
        </form>
      </div>
    </div>
  );
};

// لوحة تحكم موظف التوصيل
const DeliveryDashboard = () => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'available');
  const [docStatus, setDocStatus] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);

  // حالة توفر السائق
  const [isAvailable, setIsAvailable] = useState(false);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);

  // ⭐ نظام الثيم (فاتح/داكن) مع تبديل تلقائي
  const [themeMode, setThemeMode] = useState(() => {
    // استرجاع الإعداد المحفوظ
    return localStorage.getItem('driverThemeMode') || 'auto';
  });
  
  // حساب الثيم الحالي مباشرة
  const calculateCurrentTheme = (mode) => {
    if (mode === 'auto') {
      const hour = new Date().getHours();
      // من 6 صباحاً إلى 6 مساءً = فاتح
      const isDay = hour >= 6 && hour < 18;
      return isDay ? 'light' : 'dark';
    }
    return mode;
  };
  
  const [currentTheme, setCurrentTheme] = useState(() => calculateCurrentTheme(
    localStorage.getItem('driverThemeMode') || 'auto'
  ));

  // حساب الثيم التلقائي حسب الوقت
  useEffect(() => {
    const updateAutoTheme = () => {
      setCurrentTheme(calculateCurrentTheme(themeMode));
    };
    
    updateAutoTheme();
    // حفظ الإعداد
    localStorage.setItem('driverThemeMode', themeMode);
    // تحديث كل دقيقة
    const interval = setInterval(updateAutoTheme, 60000);
    return () => clearInterval(interval);
  }, [themeMode]);

  // صوت التنبيه للطلبات الجديدة - مع أصوات مختلفة لكل نوع
  const { playSound, playFood, playProduct, playPriority } = useNotificationSound();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const previousAvailableCountRef = useRef(0);
  const previousFoodCountRef = useRef(0);
  const previousProductCountRef = useRef(0);

  // تحديث URL عند تغيير التبويب
  useEffect(() => {
    if (activeTab === 'available') {
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
  
  // Checklist states
  const [showPickupChecklist, setShowPickupChecklist] = useState(null);
  const [showDeliveryChecklist, setShowDeliveryChecklist] = useState(null);
  const [showReturnChecklist, setShowReturnChecklist] = useState(null);
  
  // Delivery Code Modal - لطلبات المنتجات
  const [showDeliveryCodeModal, setShowDeliveryCodeModal] = useState(null);
  const [deliveryCodeInput, setDeliveryCodeInput] = useState('');
  const [deliveryCodeError, setDeliveryCodeError] = useState('');
  const [verifyingCode, setVerifyingCode] = useState(false);
  
  // ETA Modal - الوقت المتوقع للوصول
  const [showETAModal, setShowETAModal] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(30);
  
  // Ratings
  const [myRatings, setMyRatings] = useState({ ratings: [], average_rating: 0, total_ratings: 0 });
  
  // Food orders states
  const [availableFoodOrders, setAvailableFoodOrders] = useState([]);
  const [myFoodOrders, setMyFoodOrders] = useState([]);
  const [orderTypeFilter, setOrderTypeFilter] = useState('all'); // 'all', 'products', 'food' - الافتراضي الكل
  
  // State لعرض الخريطة مع مسار طلب معين
  const [showRouteMapForOrder, setShowRouteMapForOrder] = useState(null);

  // تتبع موقع السائق تلقائياً عندما يكون لديه طلبات قيد التوصيل
  const currentOrderId = myFoodOrders.find(o => o.status === 'out_for_delivery')?.id || 
                         myOrders.find(o => o.delivery_status === 'out_for_delivery')?.id;
  const hasActiveDelivery = !!currentOrderId;
  
  const { isTracking } = useDriverLocationTracker(hasActiveDelivery, currentOrderId);

  // جلب حالة التوفر
  const fetchAvailability = async () => {
    try {
      const res = await axios.get(`${API}/delivery/availability`);
      setIsAvailable(res.data.is_available);
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
  };

  // تبديل حالة التوفر
  const toggleAvailability = async () => {
    setIsLoadingAvailability(true);
    try {
      const res = await axios.put(`${API}/delivery/availability`, {
        is_available: !isAvailable
      });
      setIsAvailable(res.data.is_available);
      toast({
        title: res.data.is_available ? "🟢 أنت متاح الآن" : "⚫ أنت غير متاح",
        description: res.data.is_available 
          ? "ستتلقى إشعارات بالطلبات الجديدة" 
          : "لن تتلقى إشعارات حتى تصبح متاحاً"
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تحديث حالة التوفر",
        variant: "destructive"
      });
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  // التحقق من الطلبات الجديدة وتشغيل الصوت المناسب - فقط إذا كان متاحاً
  useEffect(() => {
    if (soundEnabled && isAvailable) {
      const currentFoodCount = availableFoodOrders.length;
      const currentProductCount = availableOrders.length;
      const totalAvailable = currentFoodCount + currentProductCount;
      
      // التحقق من طلبات طعام جديدة
      if (currentFoodCount > previousFoodCountRef.current && previousFoodCountRef.current !== 0) {
        playFood(); // 🍔 صوت مميز للطعام
        toast({
          title: "🍔 طلب طعام جديد!",
          description: `هناك ${currentFoodCount} طلب طعام متاح`,
        });
      }
      // التحقق من طلبات منتجات جديدة
      else if (currentProductCount > previousProductCountRef.current && previousProductCountRef.current !== 0) {
        playProduct(); // 📦 صوت مميز للمنتجات
        toast({
          title: "📦 طلب منتجات جديد!",
          description: `هناك ${currentProductCount} طلب منتجات متاح`,
        });
      }
      // طلب جديد عام (أول مرة)
      else if (totalAvailable > previousAvailableCountRef.current && previousAvailableCountRef.current === 0 && totalAvailable > 0) {
        playSound('default');
        toast({
          title: "🔔 طلبات متاحة!",
          description: `هناك ${totalAvailable} طلب متاح للتوصيل`,
        });
      }
      
      previousAvailableCountRef.current = totalAvailable;
      previousFoodCountRef.current = currentFoodCount;
      previousProductCountRef.current = currentProductCount;
    }
  }, [availableOrders, availableFoodOrders, soundEnabled, isAvailable, playSound, playFood, playProduct, toast]);

  // تحديث الطلبات كل 45 ثانية
  useEffect(() => {
    if (docStatus === 'approved') {
      const interval = setInterval(() => {
        fetchOrders();
      }, 45000); // كل 45 ثانية
      return () => clearInterval(interval);
    }
  }, [docStatus]);

  useEffect(() => {
    checkStatusAndFetch();
    fetchWallet();
    fetchMyRatings();
    fetchAvailability();
  }, []);

  const fetchMyRatings = async () => {
    try {
      const res = await axios.get(`${API}/delivery/my-ratings`);
      setMyRatings(res.data);
    } catch (error) {
      console.error('Error fetching ratings:', error);
    }
  };

  const fetchWallet = async () => {
    try {
      const res = await axios.get(`${API}/wallet/balance`);
      setWalletBalance(res.data.balance || 0);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    }
  };

  const checkStatusAndFetch = async () => {
    try {
      const statusRes = await axios.get(`${API}/delivery/documents/status`);
      setDocStatus(statusRes.data.status);
      
      if (statusRes.data.status === 'approved') {
        fetchOrders();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const [availableRes, myProductRes, availableFoodRes, myFoodRes] = await Promise.all([
        axios.get(`${API}/delivery/available-orders`),
        axios.get(`${API}/delivery/my-product-orders`).catch(() => ({ data: { orders: [], is_locked: false } })),
        axios.get(`${API}/food/orders/delivery/available`).catch(() => ({ data: { single_orders: [], batch_orders: [] } })),
        axios.get(`${API}/delivery/my-food-orders`).catch(() => ({ data: [] }))
      ]);
      setAvailableOrders(availableRes.data);
      // استخدام my-product-orders الذي يحتوي على معلومات القفل
      const productOrdersData = myProductRes.data;
      setMyOrders(productOrdersData.orders || []);
      
      // معالجة طلبات الطعام - دمج الطلبات الفردية والمجمعة مع إزالة التكرار
      const foodData = availableFoodRes.data || {};
      const singleOrders = foodData.single_orders || [];
      const batchOrders = (foodData.batch_orders || []).flatMap(batch => 
        batch.orders.map(order => ({ ...order, is_batch: true, batch_info: batch }))
      );
      
      // إزالة أي طلبات مكررة بناءً على الـ id
      const allFoodOrders = [...singleOrders, ...batchOrders];
      const uniqueFoodOrders = allFoodOrders.filter((order, index, self) => 
        index === self.findIndex(o => o.id === order.id)
      );
      setAvailableFoodOrders(uniqueFoodOrders);
      
      setMyFoodOrders(myFoodRes.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleTakeOrder = async (orderId) => {
    try {
      await axios.post(`${API}/orders/${orderId}/delivery/pickup`);
      toast({
        title: "تم بنجاح",
        description: "تم استلام الطلب من البائع"
      });
      setShowPickupChecklist(null);
      fetchOrders();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "حدث خطأ",
        variant: "destructive"
      });
    }
  };

  const handleTakeFoodOrder = async (order) => {
    try {
      // التحقق من نوع الطلب (عادي أم تجميعي)
      if (order.is_batch && order.batch_info?.batch_id) {
        // قبول جميع طلبات الدفعة
        await axios.post(`${API}/food/orders/delivery/batch/${order.batch_info.batch_id}/accept`);
        toast({
          title: "تم بنجاح",
          description: `تم قبول الطلب التجميعي (${order.batch_info.stores?.length || 0} متاجر)`
        });
        // إزالة جميع طلبات الدفعة من القائمة
        setAvailableFoodOrders(prev => prev.filter(o => o.batch_info?.batch_id !== order.batch_info.batch_id));
      } else {
        // طلب عادي
        await axios.post(`${API}/food/orders/delivery/${order.id}/accept`);
        toast({
          title: "تم بنجاح",
          description: "تم قبول طلب التوصيل"
        });
        // إزالة الطلب من القائمة المحلية فوراً بعد النجاح
        setAvailableFoodOrders(prev => prev.filter(o => o.id !== order.id));
      }
      fetchOrders();
    } catch (error) {
      // عند الفشل، لا نغير شيء - الطلب يبقى كما هو
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "حدث خطأ",
        variant: "destructive"
      });
    }
  };

  const handleOnTheWay = async (orderId, eta = null) => {
    try {
      await axios.post(`${API}/orders/${orderId}/delivery/on-the-way`, {
        estimated_minutes: eta || estimatedTime
      });
      toast({
        title: "تم التحديث",
        description: `تم إعلام العميل أنك في الطريق - الوصول خلال ${eta || estimatedTime} دقيقة`
      });
      setShowETAModal(null);
      setEstimatedTime(30);
      fetchOrders();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "حدث خطأ",
        variant: "destructive"
      });
    }
  };

  // فتح نافذة إدخال الوقت المتوقع
  const openETAModal = (orderId) => {
    setShowETAModal(orderId);
    setEstimatedTime(30);
  };

  const handleCompleteOrder = async (orderId, note) => {
    // إذا كان الطلب يحتوي على delivery_code، نفتح نافذة إدخال الكود
    const order = showDeliveryChecklist;
    if (order?.delivery_code && !order?.delivery_code_verified) {
      setShowDeliveryChecklist(null);
      setShowDeliveryCodeModal(order);
      setDeliveryCodeInput('');
      setDeliveryCodeError('');
      return;
    }
    
    // إذا تم التحقق من الكود مسبقاً أو لا يوجد كود، نُكمل التسليم مباشرة
    try {
      await axios.post(`${API}/orders/${orderId}/delivery/delivered`);
      toast({
        title: "تم بنجاح",
        description: "تم تسليم الطلب وإضافة أجرتك للمحفظة"
      });
      setShowDeliveryChecklist(null);
      fetchOrders();
      fetchWallet();
    } catch (error) {
      // إذا كان الخطأ بسبب عدم التحقق من الكود
      if (error.response?.data?.detail?.includes('كود التسليم')) {
        const order = myOrders.find(o => o.id === orderId);
        if (order) {
          setShowDeliveryChecklist(null);
          setShowDeliveryCodeModal(order);
          setDeliveryCodeInput('');
          setDeliveryCodeError('');
        }
      } else {
        toast({
          title: "خطأ",
          description: error.response?.data?.detail || "حدث خطأ",
          variant: "destructive"
        });
      }
    }
  };

  // التحقق من كود التسليم للمنتجات
  const handleVerifyDeliveryCode = async () => {
    if (!deliveryCodeInput || deliveryCodeInput.length !== 4) {
      setDeliveryCodeError('الكود يجب أن يكون 4 أرقام');
      return;
    }
    
    setVerifyingCode(true);
    setDeliveryCodeError('');
    
    try {
      await axios.post(`${API}/orders/${showDeliveryCodeModal.id}/delivery/verify-code`, {
        delivery_code: deliveryCodeInput
      });
      toast({
        title: "تم بنجاح ✅",
        description: "تم التحقق من الكود وتسليم الطلب بنجاح"
      });
      setShowDeliveryCodeModal(null);
      setDeliveryCodeInput('');
      fetchOrders();
      fetchWallet();
    } catch (error) {
      setDeliveryCodeError(error.response?.data?.detail || 'كود خاطئ');
    } finally {
      setVerifyingCode(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  if (docStatus === 'not_submitted') {
    navigate('/delivery/documents');
    return null;
  }

  if (docStatus === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 text-center max-w-sm">
          <Clock size={48} className="text-yellow-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">في انتظار الموافقة</h2>
          <p className="text-sm text-gray-500">وثائقك قيد المراجعة من قبل الإدارة</p>
        </div>
      </div>
    );
  }

  if (docStatus === 'rejected') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 text-center max-w-sm">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">تم رفض طلبك</h2>
          <p className="text-sm text-gray-500">يرجى التواصل مع الإدارة</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-20 ${currentTheme === 'dark' ? 'driver-dark' : 'driver-light'}`}>
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Header - الاسم والأيقونات في سطر واحد */}
        <div className={`flex items-center justify-between mb-4 p-4 rounded-2xl ${
          currentTheme === 'dark' ? 'driver-card' : 'bg-white shadow-sm border'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-black font-bold text-lg">
              {(user?.full_name || user?.name || 'س').charAt(0)}
            </div>
            <div>
              <h1 className={`text-lg font-bold ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                مرحباً، {user?.full_name || user?.name}
              </h1>
              <p className={`text-xs ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>موظف توصيل</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* ⭐ زر تبديل الثيم */}
            <button
              onClick={() => {
                const modes = ['auto', 'light', 'dark'];
                const currentIndex = modes.indexOf(themeMode);
                const nextMode = modes[(currentIndex + 1) % modes.length];
                setThemeMode(nextMode);
              }}
              className={`p-2 rounded-xl font-bold text-sm transition-all ${
                currentTheme === 'dark'
                  ? 'bg-[#252525] text-white hover:bg-[#333] border border-[#444]'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
              }`}
              title={`الوضع: ${themeMode === 'auto' ? 'تلقائي' : themeMode === 'light' ? 'فاتح' : 'داكن'}`}
            >
              {themeMode === 'auto' && '🔄'}
              {themeMode === 'light' && '☀️'}
              {themeMode === 'dark' && '🌙'}
            </button>
            {/* زر إشعارات Push */}
            <PushNotificationButton userType="delivery" size="small" />
            {/* زر تفعيل/إيقاف صوت التنبيه */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl transition-all ${
                currentTheme === 'dark'
                  ? `bg-[#252525] border ${soundEnabled ? 'border-green-500 text-green-500' : 'border-[#444] text-gray-400'}`
                  : `bg-gray-100 border ${soundEnabled ? 'border-green-500 text-green-600' : 'border-gray-300 text-gray-400'}`
              }`}
              title={soundEnabled ? 'الصوت مفعل' : 'الصوت متوقف'}
              data-testid="delivery-sound-toggle-btn"
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            {/* زر متاح/مغلق */}
            <button
              onClick={toggleAvailability}
              disabled={isLoadingAvailability}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                isAvailable 
                  ? 'bg-green-500 text-black shadow-lg shadow-green-500/30' 
                  : currentTheme === 'dark'
                    ? 'bg-[#252525] text-gray-400 border border-[#444]'
                    : 'bg-gray-200 text-gray-600'
              } ${isLoadingAvailability ? 'opacity-50' : ''}`}
            >
              {isLoadingAvailability ? '...' : (isAvailable ? '● متاح' : '○ مغلق')}
            </button>
          </div>
        </div>

        {/* التحديات والمكافآت */}
        <DriverChallenges />

        {/* Tabs */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setActiveTab('available')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'available' 
                ? 'bg-green-500 text-black' 
                : currentTheme === 'dark'
                  ? 'bg-[#1a1a1a] text-gray-400 border border-[#333]'
                  : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            طلبات متاحة ({availableOrders.length + availableFoodOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'my' 
                ? 'bg-green-500 text-black' 
                : currentTheme === 'dark'
                  ? 'bg-[#1a1a1a] text-gray-400 border border-[#333]'
                  : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            طلباتي ({myOrders.length + myFoodOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('earnings')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'earnings' 
                ? 'bg-green-500 text-black' 
                : currentTheme === 'dark'
                  ? 'bg-[#1a1a1a] text-gray-400 border border-[#333]'
                  : 'bg-white text-gray-600 border border-gray-200'
            }`}
            data-testid="earnings-tab-btn"
          >
            💰 الأرباح
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'achievements' 
                ? 'bg-green-500 text-black' 
                : currentTheme === 'dark'
                  ? 'bg-[#1a1a1a] text-gray-400 border border-[#333]'
                  : 'bg-white text-gray-600 border border-gray-200'
            }`}
            data-testid="achievements-tab-btn"
          >
            🏆 إنجازاتي
          </button>
        </div>

        {/* فلتر نوع الطلبات */}
        {(activeTab === 'available' || activeTab === 'my') && (
          <div className={`flex gap-1 mb-3 p-1 rounded-xl ${
            currentTheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-gray-100'
          }`}>
            <button
              onClick={() => setOrderTypeFilter('all')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                orderTypeFilter === 'all' 
                  ? currentTheme === 'dark'
                    ? 'bg-[#252525] text-white shadow-lg'
                    : 'bg-white text-gray-900 shadow'
                  : currentTheme === 'dark'
                    ? 'text-gray-500'
                    : 'text-gray-500'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setOrderTypeFilter('products')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1 ${
                orderTypeFilter === 'products' 
                  ? currentTheme === 'dark'
                    ? 'bg-[#252525] text-white shadow-lg'
                    : 'bg-white text-gray-900 shadow'
                  : currentTheme === 'dark'
                    ? 'text-gray-500'
                    : 'text-gray-500'
              }`}
            >
              📦 منتجات
            </button>
            <button
              onClick={() => setOrderTypeFilter('food')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1 ${
                orderTypeFilter === 'food' 
                  ? currentTheme === 'dark'
                    ? 'bg-[#252525] text-white shadow-lg'
                    : 'bg-white text-gray-900 shadow'
                  : currentTheme === 'dark'
                    ? 'text-gray-500'
                    : 'text-gray-500'
              }`}
            >
              🍔 طعام
            </button>
          </div>
        )}

        {/* Available Orders */}
        {activeTab === 'available' && (
          <>
            {/* رسالة عندما يكون السائق غير متاح */}
            {!isAvailable && (
              <div className={`rounded-2xl p-6 text-center border mb-4 ${
                currentTheme === 'dark' 
                  ? 'bg-red-900/20 border-red-800' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="text-4xl mb-3">🔴</div>
                <h3 className={`font-bold text-lg mb-2 ${
                  currentTheme === 'dark' ? 'text-red-400' : 'text-red-700'
                }`}>
                  أنت غير متاح حالياً
                </h3>
                <p className={`text-sm mb-4 ${
                  currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  لن تظهر لك الطلبات الجديدة ولن تستطيع قبول أي طلب
                </p>
                <button
                  onClick={toggleAvailability}
                  disabled={isLoadingAvailability}
                  className="bg-green-500 text-white px-6 py-3 rounded-xl font-bold text-sm"
                >
                  {isLoadingAvailability ? '...' : '🟢 اضغط لتصبح متاحاً'}
                </button>
              </div>
            )}
            
            {/* الطلبات المتاحة - تظهر فقط عندما يكون السائق متاح */}
            {isAvailable && (
              <AvailableOrdersList
                orders={orderTypeFilter === 'food' ? [] : availableOrders}
                foodOrders={orderTypeFilter === 'products' ? [] : availableFoodOrders}
                isWorkingHours={() => true}
                onTakeOrder={(order) => setShowPickupChecklist(order)}
                onTakeFoodOrder={handleTakeFoodOrder}
                orderTypeFilter={orderTypeFilter}
                theme={currentTheme}
                onShowRouteForOrder={(order, type) => setShowRouteMapForOrder({ order, type })}
              />
            )}
          </>
        )}

        {/* My Orders */}
        {activeTab === 'my' && (
          <MyOrdersList
            orders={orderTypeFilter === 'food' ? [] : myOrders}
            foodOrders={orderTypeFilter === 'products' ? [] : myFoodOrders}
            onStartDelivery={handleOnTheWay}
            onShowDeliveryChecklist={(order) => setShowDeliveryChecklist(order)}
            onOpenETAModal={openETAModal}
            orderTypeFilter={orderTypeFilter}
            theme={currentTheme}
          />
        )}

        {/* Earnings Statistics */}
        {activeTab === 'earnings' && (
          <EarningsStats token={localStorage.getItem('token')} theme={currentTheme} />
        )}

        {/* Achievements */}
        {activeTab === 'achievements' && (
          <DriverAchievements />
        )}
      </div>

      {/* ETA Modal - نافذة الوقت المتوقع */}
      {showETAModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl w-full max-w-sm overflow-hidden"
          >
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 text-white">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Clock size={24} />
                الوقت المتوقع للوصول
              </h3>
              <p className="text-sm text-white/80">حدد المدة المتوقعة للوصول للعميل</p>
            </div>
            
            <div className="p-4">
              {/* خيارات سريعة */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[15, 20, 30, 45].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => setEstimatedTime(mins)}
                    className={`py-3 rounded-xl font-bold text-sm transition-all ${
                      estimatedTime === mins
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {mins} د
                  </button>
                ))}
              </div>

              {/* إدخال مخصص */}
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  أو أدخل وقت مخصص (بالدقائق)
                </label>
                <input
                  type="number"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(parseInt(e.target.value) || 30)}
                  min="5"
                  max="120"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 text-center text-xl font-bold"
                />
              </div>

              {/* أزرار */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowETAModal(null)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-700"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => handleOnTheWay(showETAModal, estimatedTime)}
                  className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  <Navigation size={18} />
                  انطلق
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Pickup Checklist Modal */}
      {showPickupChecklist && (
        <PickupChecklist
          order={showPickupChecklist}
          onComplete={() => handleTakeOrder(showPickupChecklist.id)}
          onClose={() => setShowPickupChecklist(null)}
        />
      )}

      {/* Delivery Checklist Modal */}
      {showDeliveryChecklist && (
        <DeliveryChecklist
          order={showDeliveryChecklist}
          onComplete={(note) => handleCompleteOrder(showDeliveryChecklist.id, note)}
          onClose={() => setShowDeliveryChecklist(null)}
        />
      )}

      {/* Delivery Code Modal - نافذة إدخال كود التسليم للمنتجات */}
      {showDeliveryCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`w-full max-w-sm rounded-2xl overflow-hidden ${
              currentTheme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'
            }`}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white text-center">
              <span className="text-3xl mb-2 block">🔐</span>
              <h3 className="text-lg font-bold">كود التسليم</h3>
              <p className="text-sm text-white/80 mt-1">اطلب الكود من العميل</p>
            </div>
            
            {/* Content */}
            <div className="p-4">
              <p className={`text-sm text-center mb-4 ${
                currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}>
                طلب #{showDeliveryCodeModal.id?.slice(0, 8).toUpperCase()}
              </p>
              
              {/* Code Input */}
              <div className="flex justify-center gap-2 mb-4">
                {[0, 1, 2, 3].map((index) => (
                  <input
                    key={index}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={deliveryCodeInput[index] || ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      const newCode = deliveryCodeInput.split('');
                      newCode[index] = val;
                      setDeliveryCodeInput(newCode.join('').slice(0, 4));
                      setDeliveryCodeError('');
                      // الانتقال للحقل التالي
                      if (val && index < 3) {
                        document.getElementById(`shop-code-${index + 1}`)?.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !deliveryCodeInput[index] && index > 0) {
                        document.getElementById(`shop-code-${index - 1}`)?.focus();
                      }
                    }}
                    id={`shop-code-${index}`}
                    className={`w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 focus:outline-none focus:ring-2 ${
                      currentTheme === 'dark' 
                        ? 'bg-[#252525] border-gray-600 text-white focus:border-purple-500 focus:ring-purple-500/30' 
                        : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-500 focus:ring-purple-500/30'
                    }`}
                  />
                ))}
              </div>
              
              {/* Error */}
              {deliveryCodeError && (
                <p className="text-red-500 text-sm text-center mb-3">{deliveryCodeError}</p>
              )}
              
              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowDeliveryCodeModal(null);
                    setDeliveryCodeInput('');
                    setDeliveryCodeError('');
                  }}
                  className={`flex-1 py-3 rounded-xl font-bold ${
                    currentTheme === 'dark' 
                      ? 'bg-gray-700 text-gray-300' 
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  إلغاء
                </button>
                <button
                  onClick={handleVerifyDeliveryCode}
                  disabled={verifyingCode || deliveryCodeInput.length !== 4}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold disabled:opacity-50"
                >
                  {verifyingCode ? 'جاري التحقق...' : 'تأكيد التسليم'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Return Checklist Modal */}
      {showReturnChecklist && (
        <ReturnChecklist
          order={showReturnChecklist}
          onComplete={(reason) => {
            console.log('Return reason:', reason);
            setShowReturnChecklist(null);
            toast({
              title: "تم تسجيل الإرجاع",
              description: "سيتم مراجعة طلب الإرجاع"
            });
          }}
          onClose={() => setShowReturnChecklist(null)}
        />
      )}

      {/* Popup طلب تفعيل الإشعارات */}
      <PushNotificationPrompt 
        userType="delivery" 
        userName={user?.full_name || 'سائق التوصيل'} 
      />

      {/* Route Map Modal - عرض مسار طلب معين */}
      {showRouteMapForOrder && (
        <RouteMapModal
          order={showRouteMapForOrder.order}
          orderType={showRouteMapForOrder.type}
          onClose={() => setShowRouteMapForOrder(null)}
          theme={currentTheme}
        />
      )}

    </div>
  );
};

export { DeliveryDocuments, DeliveryDashboard };
