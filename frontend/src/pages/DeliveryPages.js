import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { 
  Truck, Clock, Upload, Camera, CreditCard, AlertTriangle, Navigation, Home, Volume2, VolumeX, LogOut, Wallet, Star
} from 'lucide-react';
import { PickupChecklist, DeliveryChecklist, ReturnChecklist } from '../components/delivery/DeliveryChecklists';
import AvailableOrdersList from '../components/delivery/AvailableOrdersList';
import MyOrdersList from '../components/delivery/MyOrdersList';
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

  // صوت التنبيه للطلبات الجديدة
  const { playSound } = useNotificationSound();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const previousAvailableCountRef = useRef(0);

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
  
  // ETA Modal - الوقت المتوقع للوصول
  const [showETAModal, setShowETAModal] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(30);
  
  // Ratings
  const [myRatings, setMyRatings] = useState({ ratings: [], average_rating: 0, total_ratings: 0 });
  
  // Food orders states
  const [availableFoodOrders, setAvailableFoodOrders] = useState([]);
  const [myFoodOrders, setMyFoodOrders] = useState([]);
  const [orderTypeFilter, setOrderTypeFilter] = useState('all'); // 'all', 'products', 'food' - الافتراضي الكل

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

  // التحقق من الطلبات الجديدة وتشغيل الصوت - فقط إذا كان متاحاً
  useEffect(() => {
    if (soundEnabled && isAvailable) {
      const totalAvailable = availableOrders.length + availableFoodOrders.length;
      if (totalAvailable > previousAvailableCountRef.current && previousAvailableCountRef.current !== 0) {
        // هناك طلب جديد متاح!
        playSound();
        toast({
          title: "🔔 طلب جديد متاح!",
          description: `هناك ${totalAvailable} طلب متاح للتوصيل`,
        });
      }
      previousAvailableCountRef.current = totalAvailable;
    }
  }, [availableOrders, availableFoodOrders, soundEnabled, isAvailable, playSound, toast]);

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
      const [availableRes, myRes, availableFoodRes, myFoodRes] = await Promise.all([
        axios.get(`${API}/delivery/available-orders`),
        axios.get(`${API}/delivery/my-orders`),
        axios.get(`${API}/food/orders/delivery/available`).catch(() => ({ data: { single_orders: [], batch_orders: [] } })),
        axios.get(`${API}/delivery/my-food-orders`).catch(() => ({ data: [] }))
      ]);
      setAvailableOrders(availableRes.data);
      setMyOrders(myRes.data);
      
      // معالجة طلبات الطعام - دمج الطلبات الفردية والمجمعة
      const foodData = availableFoodRes.data || {};
      const singleOrders = foodData.single_orders || [];
      const batchOrders = (foodData.batch_orders || []).flatMap(batch => 
        batch.orders.map(order => ({ ...order, is_batch: true, batch_info: batch }))
      );
      setAvailableFoodOrders([...singleOrders, ...batchOrders]);
      
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
      await axios.post(`${API}/food/orders/delivery/${order.id}/accept`);
      toast({
        title: "تم بنجاح",
        description: "تم قبول طلب التوصيل"
      });
      fetchOrders();
    } catch (error) {
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
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "حدث خطأ",
        variant: "destructive"
      });
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
    <div className="driver-dark min-h-screen pb-20">
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Header - الاسم والأيقونات في سطر واحد */}
        <div className="flex items-center justify-between mb-4 driver-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-black font-bold text-lg">
              {(user?.full_name || user?.name || 'س').charAt(0)}
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">مرحباً، {user?.full_name || user?.name}</h1>
              <p className="text-xs text-gray-400">موظف توصيل</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* زر إشعارات Push */}
            <PushNotificationButton userType="delivery" size="small" />
            {/* زر تفعيل/إيقاف صوت التنبيه */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`driver-icon-btn ${soundEnabled ? '!border-green-500 !text-green-500' : ''}`}
              title={soundEnabled ? 'الصوت مفعل' : 'الصوت متوقف'}
              data-testid="delivery-sound-toggle-btn"
            >
              {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
            {/* زر متاح/مغلق */}
            <button
              onClick={toggleAvailability}
              disabled={isLoadingAvailability}
              className={`driver-status-toggle ${
                isAvailable ? 'driver-status-online' : 'driver-status-offline'
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
                ? 'driver-tab-active' 
                : 'driver-tab'
            }`}
          >
            طلبات متاحة ({availableOrders.length + availableFoodOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'my' 
                ? 'driver-tab-active' 
                : 'driver-tab'
            }`}
          >
            طلباتي ({myOrders.length + myFoodOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('earnings')}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'earnings' 
                ? 'driver-tab-active' 
                : 'driver-tab'
            }`}
            data-testid="earnings-tab-btn"
          >
            💰 الأرباح
          </button>
        </div>

        {/* فلتر نوع الطلبات */}
        {(activeTab === 'available' || activeTab === 'my') && (
          <div className="driver-filter-group flex gap-1 mb-3">
            <button
              onClick={() => setOrderTypeFilter('all')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                orderTypeFilter === 'all' ? 'driver-filter-btn-active' : 'driver-filter-btn'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setOrderTypeFilter('products')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1 ${
                orderTypeFilter === 'products' ? 'driver-filter-btn-active' : 'driver-filter-btn'
              }`}
            >
              📦 منتجات
            </button>
            <button
              onClick={() => setOrderTypeFilter('food')}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1 ${
                orderTypeFilter === 'food' ? 'driver-filter-btn-active' : 'driver-filter-btn'
              }`}
            >
              🍔 طعام
            </button>
          </div>
        )}

        {/* Available Orders */}
        {activeTab === 'available' && (
          <AvailableOrdersList
            orders={orderTypeFilter === 'food' ? [] : availableOrders}
            foodOrders={orderTypeFilter === 'products' ? [] : availableFoodOrders}
            isWorkingHours={() => true}
            onTakeOrder={(order) => setShowPickupChecklist(order)}
            onTakeFoodOrder={handleTakeFoodOrder}
            orderTypeFilter={orderTypeFilter}
            myOrders={myOrders}
            myFoodOrders={myFoodOrders}
          />
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
          />
        )}

        {/* Earnings Statistics */}
        {activeTab === 'earnings' && (
          <EarningsStats token={localStorage.getItem('token')} />
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

    </div>
  );
};

export { DeliveryDocuments, DeliveryDashboard };
