import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  CreditCard, MapPin, Plus, Trash2, Edit2, Check, X, 
  ArrowRight, User, Phone, Building, Home, Award,
  Shield, FileText, RefreshCcw, Gift, Moon, Sun, MessageCircle, Globe,
  LogOut, Wallet, Star, Truck, Volume2, Users, HelpCircle, Bell, ChevronLeft, Camera, Mic
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import LoyaltyCard from '../components/LoyaltyCard';
import SupportTickets from '../components/support/SupportTickets';
import GoogleMapsLocationPicker from '../components/GoogleMapsLocationPicker';
import NotificationGuide from '../components/NotificationGuide';
import { useNotificationSound, AVAILABLE_TONES, saveTonePreference } from '../hooks/useNotificationSound';
// مكونات السائق
import DriverLeaderboard from '../components/delivery/DriverLeaderboard';
import DriverPenaltyPoints from '../components/delivery/DriverPenaltyPoints';
import DriverAchievements from '../components/delivery/DriverAchievements';
import DriverPerformance from '../components/delivery/DriverPerformance';
import MyBoxCard from '../components/delivery/MyBoxCard';
import NotificationToneSettings from '../components/delivery/NotificationToneSettings';
import DeliverySettingsTab from '../components/delivery/DeliverySettingsTab';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SYRIAN_CITIES = [
  'دمشق', 'حلب', 'حمص', 'حماة', 'اللاذقية', 'طرطوس',
  'دير الزور', 'الرقة', 'الحسكة', 'درعا', 'السويداء',
  'القنيطرة', 'إدلب', 'ريف دمشق'
];

const PAYMENT_TYPES = [
  { id: 'shamcash', name: 'شام كاش', icon: '💳' },
  { id: 'syriatel_cash', name: 'سيرياتيل', icon: '📱' },
  { id: 'mtn_cash', name: 'MTN', icon: '📱' },
];

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const { isDarkMode: globalDarkMode, toggleDarkMode } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  
  // للسائق: استخدام الثيم الخاص به
  const [driverTheme, setDriverTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('driverThemeMode') || 'auto';
      if (savedMode === 'auto') {
        const hour = new Date().getHours();
        return hour >= 6 && hour < 18 ? 'light' : 'dark';
      }
      return savedMode;
    }
    return 'dark';
  });
  
  // تحديد الثيم المستخدم حسب نوع المستخدم
  const isDarkMode = user?.user_type === 'delivery' ? driverTheme === 'dark' : globalDarkMode;

  const [activeTab, setActiveTab] = useState(user?.user_type === 'delivery' ? 'driver' : 'loyalty');
  const [addresses, setAddresses] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // بيانات السائق
  const [walletBalance, setWalletBalance] = useState(0);
  const [myRatings, setMyRatings] = useState({ average_rating: 0, total_ratings: 0 });
  const [driverImage, setDriverImage] = useState(user?.image || null);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  
  const [newAddress, setNewAddress] = useState({
    title: '', city: 'دمشق', area: '', street_number: '', building_number: '', apartment_number: '', phone: '', is_default: false
  });
  
  const [newPayment, setNewPayment] = useState({
    type: 'shamcash', phone: '', holder_name: '', is_default: false
  });

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [addressesRes, paymentsRes] = await Promise.all([
        axios.get(`${API}/user/addresses`),
        axios.get(`${API}/user/payment-methods`)
      ]);
      setAddresses(addressesRes.data);
      setPaymentMethods(paymentsRes.data);
      
      // جلب بيانات السائق إذا كان المستخدم سائق
      if (user?.user_type === 'delivery') {
        try {
          const [walletRes, ratingsRes] = await Promise.all([
            axios.get(`${API}/wallet/balance`),
            axios.get(`${API}/delivery/my-ratings`)
          ]);
          setWalletBalance(walletRes.data?.balance || 0);
          setMyRatings(ratingsRes.data || { average_rating: 0, total_ratings: 0 });
        } catch (err) {
          console.error('Error fetching driver data:', err);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // رفع صورة السائق
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // التحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      toast({ title: "خطأ", description: "يرجى اختيار صورة صالحة", variant: "destructive" });
      return;
    }
    
    // التحقق من حجم الملف (أقصى 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "خطأ", description: "حجم الصورة كبير جداً (أقصى 5MB)", variant: "destructive" });
      return;
    }
    
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await axios.post(`${API}/delivery/update-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.image_url) {
        setDriverImage(response.data.image_url);
        toast({ title: "تم", description: "تم تحديث صورتك بنجاح" });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({ title: "خطأ", description: error.response?.data?.detail || "فشل في رفع الصورة", variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    
    // التحقق من تحديد الموقع على الخريطة - إجباري
    if (!newAddress.latitude || !newAddress.longitude) {
      toast({ title: "خطأ", description: "يرجى تحديد موقعك على الخريطة (إجباري)", variant: "destructive" });
      return;
    }
    
    try {
      if (editingAddress) {
        await axios.put(`${API}/user/addresses/${editingAddress.id}`, newAddress);
        toast({ title: "تم التحديث", description: "تم تحديث العنوان" });
      } else {
        await axios.post(`${API}/user/addresses`, newAddress);
        toast({ title: "تمت الإضافة", description: "تم إضافة العنوان" });
      }
      setShowAddAddress(false);
      setEditingAddress(null);
      setNewAddress({ title: '', city: 'دمشق', area: '', street_number: '', building_number: '', apartment_number: '', phone: '', is_default: false, latitude: null, longitude: null });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || "فشل حفظ العنوان", variant: "destructive" });
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('حذف العنوان؟')) return;
    try {
      await axios.delete(`${API}/user/addresses/${addressId}`);
      toast({ title: "تم الحذف" });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", variant: "destructive" });
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    try {
      await axios.post(`${API}/user/addresses/${addressId}/default`);
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", variant: "destructive" });
    }
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setNewAddress({
      title: address.title, city: address.city, area: address.area || '', 
      street_number: address.street_number || '', building_number: address.building_number || '', 
      apartment_number: address.apartment_number || '', phone: address.phone || '', is_default: address.is_default,
      latitude: address.latitude || null, longitude: address.longitude || null
    });
    setShowAddAddress(true);
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    try {
      if (editingPayment) {
        await axios.put(`${API}/user/payment-methods/${editingPayment.id}`, newPayment);
        toast({ title: "تم التحديث" });
      } else {
        await axios.post(`${API}/user/payment-methods`, newPayment);
        toast({ title: "تمت الإضافة" });
      }
      setShowAddPayment(false);
      setEditingPayment(null);
      setNewPayment({ type: 'shamcash', phone: '', holder_name: '', is_default: false });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || "فشل الحفظ", variant: "destructive" });
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('حذف طريقة الدفع؟')) return;
    try {
      await axios.delete(`${API}/user/payment-methods/${paymentId}`);
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", variant: "destructive" });
    }
  };

  const handleSetDefaultPayment = async (paymentId) => {
    try {
      await axios.post(`${API}/user/payment-methods/${paymentId}/default`);
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", variant: "destructive" });
    }
  };

  const handleEditPayment = (payment) => {
    setEditingPayment(payment);
    setNewPayment({ type: payment.type, phone: payment.phone, holder_name: payment.holder_name || '', is_default: payment.is_default });
    setShowAddPayment(true);
  };

  if (!user) { navigate('/login'); return null; }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-20 md:pb-10 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-xl mx-auto px-3 py-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className={`p-1.5 rounded-full ${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'}`}
            >
              <ArrowRight size={20} className={isDarkMode ? 'text-white' : 'text-gray-700'} />
            </button>
            <h1 className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>إعدادات الحساب</h1>
          </div>
          {user?.user_type === 'delivery' && (
            <a
              href="/?view=customer"
              className="flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-xs hover:bg-gray-200"
            >
              <Home size={14} />
              <span>تصفح كعميل</span>
            </a>
          )}
        </div>

        {/* Tabs - في الأعلى */}
        <div className="flex gap-1 mb-3 overflow-x-auto">
          {/* تبويب السائق - يظهر فقط للسائق */}
          {user?.user_type === 'delivery' && (
            <button
              onClick={() => setActiveTab('driver')}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg font-bold text-[10px] transition-colors whitespace-nowrap px-2 ${
                activeTab === 'driver' ? 'bg-blue-500 text-white' : isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-white border border-gray-200 text-gray-700'
              }`}
            >
              <Truck size={12} />
              معلوماتي
            </button>
          )}
          {/* تبويب نغمات الإشعارات - للسائق فقط */}
          {user?.user_type === 'delivery' && (
            <button
              onClick={() => setActiveTab('tones')}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg font-bold text-[10px] transition-colors whitespace-nowrap px-2 ${
                activeTab === 'tones' ? 'bg-purple-500 text-white' : isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-white border border-gray-200 text-gray-700'
              }`}
              data-testid="tones-tab-btn"
            >
              <Volume2 size={12} />
              النغمات
            </button>
          )}
          {/* تبويب إعدادات التوصيل - للسائق فقط */}
          {user?.user_type === 'delivery' && (
            <button
              onClick={() => setActiveTab('delivery-settings')}
              className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg font-bold text-[10px] transition-colors whitespace-nowrap px-2 ${
                activeTab === 'delivery-settings' ? 'bg-green-500 text-white' : isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-white border border-gray-200 text-gray-700'
              }`}
              data-testid="delivery-settings-tab-btn"
            >
              <MapPin size={12} />
              العنوان
            </button>
          )}
          <button
            onClick={() => setActiveTab('loyalty')}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg font-bold text-[10px] transition-colors whitespace-nowrap px-2 ${
              activeTab === 'loyalty' ? 'bg-[#FF6B00] text-white' : isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-white border border-gray-200 text-gray-700'
            }`}
          >
            <Award size={12} />
            نقاط الولاء
          </button>
          <button
            onClick={() => setActiveTab('addresses')}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg font-bold text-[10px] transition-colors whitespace-nowrap px-2 ${
              activeTab === 'addresses' ? 'bg-[#FF6B00] text-white' : isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-white border border-gray-200 text-gray-700'
            }`}
          >
            <MapPin size={12} />
            العناوين
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg font-bold text-[10px] transition-colors whitespace-nowrap px-2 ${
              activeTab === 'payments' ? 'bg-[#FF6B00] text-white' : isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-white border border-gray-200 text-gray-700'
            }`}
          >
            <CreditCard size={12} />
            طرق الدفع
          </button>
          <button
            onClick={() => setActiveTab('support')}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg font-bold text-[10px] transition-colors whitespace-nowrap px-2 ${
              activeTab === 'support' ? 'bg-[#FF6B00] text-white' : isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-white border border-gray-200 text-gray-700'
            }`}
            data-testid="support-tab-btn"
          >
            <HelpCircle size={12} />
            الدعم
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg font-bold text-[10px] transition-colors whitespace-nowrap px-2 ${
              activeTab === 'notifications' ? 'bg-[#FF6B00] text-white' : isDarkMode ? 'bg-gray-800 text-gray-300' : 'bg-white border border-gray-200 text-gray-700'
            }`}
            data-testid="notifications-tab-btn"
          >
            <Bell size={12} />
            الإشعارات
          </button>
        </div>

        {/* Driver Tab - تبويب السائق */}
        {activeTab === 'driver' && user?.user_type === 'delivery' && (
          <div className="space-y-2">
            {/* صورة السائق */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white/30 bg-white/20">
                    {driverImage ? (
                      <img src={driverImage} alt="صورتي" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User size={32} className="text-white/70" />
                      </div>
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform">
                    {uploadingImage ? (
                      <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
                    ) : (
                      <Camera size={16} className="text-blue-600" />
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                    />
                  </label>
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold text-lg">{user?.name}</p>
                  <p className="text-white/70 text-sm">{user?.phone}</p>
                  <p className="text-white/60 text-xs mt-1">اضغط على الكاميرا لتغيير صورتك</p>
                </div>
              </div>
            </div>

            {/* رصيد المحفظة */}
            <div 
              onClick={() => navigate('/wallet')}
              className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-3 cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet size={20} className="text-white" />
                  <div>
                    <p className="text-white/80 text-[10px]">رصيد المحفظة</p>
                    <p className="text-white font-bold text-lg">{new Intl.NumberFormat('ar-SY').format(walletBalance)} ل.س</p>
                  </div>
                </div>
                <span className="text-white/80 text-xs">اضغط للتفاصيل ←</span>
              </div>
            </div>

            {/* تقييمي */}
            <div className="bg-gradient-to-r from-yellow-500 to-amber-500 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star size={20} className="text-white fill-white" />
                  <div>
                    <p className="text-white/80 text-[10px]">تقييمي</p>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-bold text-lg">{myRatings.average_rating || 0}</p>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={12}
                            className={star <= Math.round(myRatings.average_rating || 0) ? 'text-white fill-white' : 'text-white/40'}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-white font-bold text-lg">{myRatings.total_ratings || 0}</p>
                  <p className="text-white/80 text-[10px]">تقييم</p>
                </div>
              </div>
            </div>

            {/* لوحة الصدارة */}
            <DriverLeaderboard />

            {/* نقاط السلوك */}
            <DriverPenaltyPoints />

            {/* الإنجازات */}
            <DriverAchievements />

            {/* مستوى الأداء */}
            <DriverPerformance />

            {/* صندوق التوصيل */}
            <MyBoxCard />
          </div>
        )}

        {/* Notification Tones Tab - تبويب نغمات الإشعارات للسائق */}
        {activeTab === 'tones' && user?.user_type === 'delivery' && (
          <div className="space-y-3">
            <NotificationToneSettings theme={isDarkMode ? 'dark' : 'light'} />
            
            {/* إعدادات الصوت الناطق */}
            <VoiceAnnouncementSettings isDarkMode={isDarkMode} />
            
            {/* ملاحظة */}
            <div className={`p-4 rounded-xl text-center ${
              isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-gray-50 border border-gray-200'
            }`}>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                🔊 اختر نغمة مميزة لكل نوع من الطلبات
              </p>
              <p className={`text-[10px] mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                النغمة المختارة ستُستخدم تلقائياً عند وصول طلبات جديدة
              </p>
            </div>
          </div>
        )}

        {/* Delivery Settings Tab - تبويب إعدادات التوصيل للسائق */}
        {activeTab === 'delivery-settings' && user?.user_type === 'delivery' && (
          <DeliverySettingsTab />
        )}

        {/* Loyalty Tab */}
        {activeTab === 'loyalty' && (
          <section data-testid="loyalty-tab">
            <LoyaltyCard />
          </section>
        )}

        {/* Addresses Tab */}
        {activeTab === 'addresses' && (
          <section>
            <div className="flex justify-between items-center mb-2">
              <h2 className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>عناوين التوصيل</h2>
              <button
                onClick={() => { setShowAddAddress(true); setEditingAddress(null); setNewAddress({ title: '', city: 'دمشق', area: '', street_number: '', building_number: '', apartment_number: '', phone: '', is_default: false }); }}
                className="flex items-center gap-0.5 text-[#FF6B00] text-[10px] font-bold"
              >
                <Plus size={14} />
                إضافة
              </button>
            </div>

            {showAddAddress && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-lg border p-3 mb-3 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <h3 className={`font-bold text-xs mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{editingAddress ? 'تعديل' : 'إضافة عنوان'}</h3>
                <form onSubmit={handleAddAddress} className="space-y-2">
                  <input type="text" placeholder="اسم العنوان (المنزل، العمل)" value={newAddress.title} onChange={(e) => setNewAddress({...newAddress, title: e.target.value})} className={`w-full p-2 border rounded-lg text-xs ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`} required />
                  <select value={newAddress.city} onChange={(e) => setNewAddress({...newAddress, city: e.target.value})} className={`w-full p-2 border rounded-lg text-xs ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300 bg-white'}`} required>
                    {SYRIAN_CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                  </select>
                  <input type="text" placeholder="المنطقة / الحي *" value={newAddress.area} onChange={(e) => setNewAddress({...newAddress, area: e.target.value})} className={`w-full p-2 border rounded-lg text-xs ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`} required />
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" placeholder="رقم الشارع *" value={newAddress.street_number} onChange={(e) => setNewAddress({...newAddress, street_number: e.target.value})} className={`w-full p-2 border rounded-lg text-xs ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`} required />
                    <input type="text" placeholder="رقم البناء *" value={newAddress.building_number} onChange={(e) => setNewAddress({...newAddress, building_number: e.target.value})} className={`w-full p-2 border rounded-lg text-xs ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`} required />
                    <input type="text" placeholder="رقم المنزل *" value={newAddress.apartment_number} onChange={(e) => setNewAddress({...newAddress, apartment_number: e.target.value})} className={`w-full p-2 border rounded-lg text-xs ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`} required />
                  </div>
                  <input type="tel" placeholder="رقم الهاتف *" value={newAddress.phone} onChange={(e) => setNewAddress({...newAddress, phone: e.target.value})} className={`w-full p-2 border rounded-lg text-xs ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`} required />
                  
                  {/* تحديد الموقع على الخريطة - إجباري */}
                  <GoogleMapsLocationPicker
                    label="📍 موقع التوصيل على الخريطة (إجباري)"
                    required={true}
                    currentLocation={newAddress.latitude ? { latitude: newAddress.latitude, longitude: newAddress.longitude } : null}
                    onLocationSelect={(location) => {
                      if (location) {
                        setNewAddress({ ...newAddress, latitude: location.latitude, longitude: location.longitude });
                      } else {
                        setNewAddress({ ...newAddress, latitude: null, longitude: null });
                      }
                    }}
                  />
                  
                  <label className={`flex items-center gap-1.5 text-[10px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <input type="checkbox" checked={newAddress.is_default} onChange={(e) => setNewAddress({...newAddress, is_default: e.target.checked})} className="w-3 h-3 accent-[#FF6B00]" />
                    عنوان افتراضي
                  </label>
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-[#FF6B00] text-white py-2 rounded-lg font-bold text-xs">{editingAddress ? 'تحديث' : 'إضافة'}</button>
                    <button type="button" onClick={() => { setShowAddAddress(false); setEditingAddress(null); }} className={`flex-1 py-2 rounded-lg font-bold text-xs ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>إلغاء</button>
                  </div>
                </form>
              </motion.div>
            )}

            {addresses.length === 0 ? (
              <div className={`rounded-lg p-6 text-center border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <MapPin size={32} className="text-gray-300 mx-auto mb-2" />
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>لا يوجد عناوين</p>
              </div>
            ) : (
              <div className="space-y-2">
                {addresses.map((address) => (
                  <div key={address.id} className={`rounded-lg border p-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${address.is_default ? 'bg-[#FF6B00]/10' : isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          <MapPin size={14} className={address.is_default ? 'text-[#FF6B00]' : 'text-gray-500'} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <h3 className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{address.title}</h3>
                            {address.is_default && <span className="text-[8px] bg-[#FF6B00] text-white px-1.5 py-0.5 rounded-full">افتراضي</span>}
                          </div>
                          <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{address.city} - {address.area}</p>
                          <p className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                            شارع {address.street_number} - بناء {address.building_number} - منزل {address.apartment_number}
                          </p>
                          <p className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>{address.phone}</p>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {!address.is_default && <button onClick={() => handleSetDefaultAddress(address.id)} className={`p-1 rounded ${isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}><Check size={12} /></button>}
                        <button onClick={() => handleEditAddress(address)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Edit2 size={12} /></button>
                        <button onClick={() => handleDeleteAddress(address.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <section>
            <div className="flex justify-between items-center mb-2">
              <h2 className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>طرق الدفع</h2>
              <button
                onClick={() => { setShowAddPayment(true); setEditingPayment(null); setNewPayment({ type: 'shamcash', phone: '', holder_name: '', is_default: false }); }}
                className="flex items-center gap-0.5 text-[#FF6B00] text-[10px] font-bold"
              >
                <Plus size={14} />
                إضافة
              </button>
            </div>

            {showAddPayment && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-lg border p-3 mb-3 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <h3 className={`font-bold text-xs mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{editingPayment ? 'تعديل' : 'إضافة طريقة دفع'}</h3>
                <form onSubmit={handleAddPayment} className="space-y-2">
                  <div className="grid grid-cols-3 gap-1.5">
                    {PAYMENT_TYPES.map((type) => (
                      <button key={type.id} type="button" onClick={() => setNewPayment({...newPayment, type: type.id})}
                        className={`p-2 rounded-lg border text-center transition-colors ${newPayment.type === type.id ? 'border-[#FF6B00] bg-[#FF6B00]/10' : isDarkMode ? 'border-gray-600' : 'border-gray-200'}`}>
                        <span className="text-lg block">{type.icon}</span>
                        <span className={`text-[9px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{type.name}</span>
                      </button>
                    ))}
                  </div>
                  <input type="tel" placeholder="رقم المحفظة" value={newPayment.phone} onChange={(e) => setNewPayment({...newPayment, phone: e.target.value})} className={`w-full p-2 border rounded-lg text-xs ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`} required />
                  <input type="text" placeholder="اسم صاحب الحساب" value={newPayment.holder_name} onChange={(e) => setNewPayment({...newPayment, holder_name: e.target.value})} className={`w-full p-2 border rounded-lg text-xs ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-300'}`} required />
                  <label className={`flex items-center gap-1.5 text-[10px] ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    <input type="checkbox" checked={newPayment.is_default} onChange={(e) => setNewPayment({...newPayment, is_default: e.target.checked})} className="w-3 h-3 accent-[#FF6B00]" />
                    طريقة دفع افتراضية
                  </label>
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-[#FF6B00] text-white py-2 rounded-lg font-bold text-xs">{editingPayment ? 'تحديث' : 'إضافة'}</button>
                    <button type="button" onClick={() => { setShowAddPayment(false); setEditingPayment(null); }} className={`flex-1 py-2 rounded-lg font-bold text-xs ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>إلغاء</button>
                  </div>
                </form>
              </motion.div>
            )}

            {paymentMethods.length === 0 ? (
              <div className={`rounded-lg p-6 text-center border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <CreditCard size={32} className="text-gray-300 mx-auto mb-2" />
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>لا يوجد طرق دفع</p>
              </div>
            ) : (
              <div className="space-y-2">
                {paymentMethods.map((payment) => {
                  const paymentType = PAYMENT_TYPES.find(t => t.id === payment.type);
                  return (
                    <div key={payment.id} className={`rounded-lg border p-2 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${payment.is_default ? 'bg-[#FF6B00]/10' : isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                            {paymentType?.icon || '💳'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1">
                              <h3 className={`font-bold text-xs ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{paymentType?.name}</h3>
                              {payment.is_default && <span className="text-[8px] bg-[#FF6B00] text-white px-1.5 py-0.5 rounded-full">افتراضي</span>}
                            </div>
                            <p className={`text-[10px] ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{payment.phone}</p>
                            <p className={`text-[10px] ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>{payment.holder_name}</p>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {!payment.is_default && <button onClick={() => handleSetDefaultPayment(payment.id)} className={`p-1 rounded ${isDarkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}><Check size={12} /></button>}
                          <button onClick={() => handleEditPayment(payment)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Edit2 size={12} /></button>
                          <button onClick={() => handleDeletePayment(payment.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={12} /></button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Support Tab */}
        {activeTab === 'support' && (
          <section>
            <SupportTickets token={localStorage.getItem('token')} />
          </section>
        )}

        {/* Notifications Guide Tab */}
        {activeTab === 'notifications' && (
          <section data-testid="notifications-section">
            <NotificationGuide userType={user?.user_type || 'buyer'} />
          </section>
        )}

        {/* Referral Banner */}
        <button
          onClick={() => navigate('/referrals')}
          className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-4 mt-6 mb-3 flex items-center gap-3 text-white shadow-lg"
        >
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <Gift size={24} className="text-white" />
          </div>
          <div className="flex-1 text-right">
            <p className="font-bold">ادعُ أصدقاءك واربح!</p>
            <p className="text-xs opacity-90">احصل على 10,000 ل.س لكل صديق</p>
          </div>
          <ChevronLeft size={20} />
        </button>

        {/* Dark Mode Toggle */}
        <div className={`rounded-xl p-4 mb-3 flex items-center justify-between ${isDarkMode ? 'bg-gray-800' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-center gap-3">
            {isDarkMode ? <Moon size={24} className="text-yellow-400" /> : <Sun size={24} className="text-orange-500" />}
            <div>
              <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('dark_mode')}</p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {isDarkMode ? t('dark_mode_enabled') : t('dark_mode_disabled')}
              </p>
            </div>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`relative w-14 h-7 rounded-full transition-colors ${isDarkMode ? 'bg-orange-500' : 'bg-gray-300'}`}
            data-testid="dark-mode-toggle"
          >
            <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${isDarkMode ? 'right-0.5' : 'left-0.5'}`} />
          </button>
        </div>

        {/* Language Toggle */}
        <div className={`rounded-xl p-4 mb-3 flex items-center justify-between ${isDarkMode ? 'bg-gray-800' : 'bg-white border border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <Globe size={24} className="text-blue-500" />
            <div>
              <p className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{t('language')}</p>
              <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {language === 'ar' ? 'العربية' : 'English'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleLanguage}
            className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${
              language === 'ar' 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            }`}
            data-testid="language-toggle"
          >
            {language === 'ar' ? 'English' : 'العربية'}
          </button>
        </div>

        {/* WhatsApp Support */}
        <a
          href="https://wa.me/963551021618?text=مرحباً، أريد الاستفسار عن خدمات ترند سورية"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 mb-4 flex items-center gap-3 text-white shadow-lg"
          data-testid="whatsapp-support-link"
        >
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <MessageCircle size={24} className="text-white" />
          </div>
          <div className="flex-1 text-right">
            <p className="font-bold">تواصل معنا عبر WhatsApp</p>
            <p className="text-xs opacity-90">دعم فني على مدار الساعة</p>
          </div>
          <ChevronLeft size={20} />
        </a>

        {/* Legal Links Section */}
        <section className="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <h3 className="text-xs font-bold text-gray-700 p-3 border-b border-gray-100">القانونية والدعم</h3>
          <div className="divide-y divide-gray-100">
            <button
              onClick={() => navigate('/about')}
              className="w-full p-3 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <Users size={14} className="text-purple-600" />
                </div>
                <span className="text-sm text-gray-900">من نحن</span>
              </div>
              <ChevronLeft size={16} className="text-gray-400" />
            </button>
            <button
              onClick={() => navigate('/privacy')}
              className="w-full p-3 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <Shield size={14} className="text-[#FF6B00]" />
                </div>
                <span className="text-sm text-gray-900">سياسة الخصوصية</span>
              </div>
              <ChevronLeft size={16} className="text-gray-400" />
            </button>
            <button
              onClick={() => navigate('/terms')}
              className="w-full p-3 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FileText size={14} className="text-blue-600" />
                </div>
                <span className="text-sm text-gray-900">شروط الاستخدام</span>
              </div>
              <ChevronLeft size={16} className="text-gray-400" />
            </button>
            <button
              onClick={() => navigate('/returns')}
              className="w-full p-3 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <RefreshCcw size={14} className="text-green-600" />
                </div>
                <span className="text-sm text-gray-900">سياسة الإرجاع والاستبدال</span>
              </div>
              <ChevronLeft size={16} className="text-gray-400" />
            </button>
          </div>
        </section>

        {/* زر تسجيل الخروج */}
        <section className="mt-4">
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-center gap-2 text-red-600 font-bold hover:bg-red-100 transition-colors"
            data-testid="logout-btn"
          >
            <LogOut size={18} />
            تسجيل الخروج
          </button>
        </section>
      </div>
    </div>
  );
};

export default SettingsPage;
