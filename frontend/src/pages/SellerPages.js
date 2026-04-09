import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Upload, FileText, Check, Clock, X, Plus, 
  Package, DollarSign, ShoppingBag, Loader2,
  Megaphone, Wallet, TrendingUp, Gift, BookOpen, Star, MessageSquare, Send, Home, ShoppingCart,
  Store, CreditCard, Edit2, Trash2, Save, Bell, Volume2, VolumeX, LogOut, ChevronRight,
  Eye, EyeOff, RotateCcw, AlertTriangle, CheckCircle, Shield, Flame, Zap, Settings, Rocket
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { formatPrice } from '../utils/imageHelpers';
import NotificationsDropdown from '../components/NotificationsDropdown';
import useNotificationSound from '../hooks/useNotificationSound';
import PushNotificationButton from '../components/PushNotificationButton';
import PushNotificationPrompt from '../components/PushNotificationPrompt';

// Imported Components
import SellerAdsTab from '../components/seller/SellerAdsTab';
import SellerAdAnalytics from '../components/seller/SellerAdAnalytics';
import SellerDiscountsTab from '../components/seller/SellerDiscountsTab';
import SellerReviewsTab from '../components/seller/SellerReviewsTab';
import ImageBackgroundSelector from '../components/seller/ImageBackgroundSelector';
import OrderLabelPrint from '../components/seller/OrderLabelPrint';
import StoreSettingsTab from '../components/seller/StoreSettingsTab';
import AddProductModal from '../components/seller/AddProductModal';
import EditProductModal from '../components/seller/EditProductModal';
import SellerStatsCard from '../components/seller/SellerStatsCard';
import SellerAnalytics from '../components/seller/SellerAnalytics';
import PromoteProductTab from '../components/seller/PromoteProductTab';
import SellerProductsGrid from '../components/seller/SellerProductsGrid';
import SellerOrdersSection from '../components/seller/SellerOrdersSection';
import StatDetailsModal from '../components/seller/StatDetailsModal';

const API = process.env.REACT_APP_BACKEND_URL;

// دالة مساعدة لاستخراج رسالة الخطأ من الـ API
const getErrorMessage = (error, defaultMsg = "حدث خطأ") => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) return detail.map(d => d.msg || d).join(', ');
  if (detail?.msg) return detail.msg;
  return defaultMsg;
};

// مكون عرض أطباق الطعام
const FoodItemsGrid = ({ items, onEdit, onDelete, onChangeAvailability }) => {
  const [showStatusMenu, setShowStatusMenu] = useState(null);
  
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-8 bg-orange-50 rounded-xl border border-orange-200">
        <Package className="mx-auto mb-2 text-orange-300" size={40} />
        <p className="text-orange-600 text-sm font-medium">لا توجد أطباق بعد</p>
        <p className="text-orange-400 text-xs">أضف أول طبق لقائمة الطعام</p>
      </div>
    );
  }

  const getStatusInfo = (item) => {
    const status = item.availability_status || (item.is_available ? 'available' : 'unavailable');
    const statusMap = {
      'available': { label: 'متاح', color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-100', icon: '🟢' },
      'sold_out_today': { label: 'نفد اليوم', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-100', icon: '🟡' },
      'unavailable': { label: 'متوقف', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-100', icon: '🔴' }
    };
    return statusMap[status] || statusMap['available'];
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {items.map(item => {
        const statusInfo = getStatusInfo(item);
        const currentStatus = item.availability_status || (item.is_available ? 'available' : 'unavailable');
        
        return (
          <div key={item.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden relative">
            <div className="relative">
              <img 
                src={item.image || '/placeholder.svg'} 
                alt={item.name} 
                className={`w-full h-24 object-cover ${currentStatus !== 'available' ? 'opacity-60 grayscale' : ''}`}
              />
              {/* شارة الحالة */}
              <div className={`absolute top-1 right-1 ${statusInfo.color} text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full`}>
                {statusInfo.icon} {statusInfo.label}
              </div>
            </div>
            <div className="p-2">
              <h3 className="font-bold text-xs text-gray-900 truncate">{item.name}</h3>
              <p className="text-[10px] text-gray-500 truncate">{item.description}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[#FF6B00] font-bold text-xs">{item.price?.toLocaleString()} ل.س</span>
                <span className="text-gray-400 text-[9px]">{item.preparation_time} دقيقة</span>
              </div>
              
              {/* أزرار تغيير الحالة */}
              <div className="flex gap-0.5 mt-2 relative">
                <button
                  onClick={() => onChangeAvailability(item.id, 'available')}
                  disabled={currentStatus === 'available'}
                  className={`flex-1 py-1.5 rounded-l text-[9px] font-bold transition-all ${
                    currentStatus === 'available' 
                      ? 'bg-[#FF6B00] text-white' 
                      : 'bg-orange-100 text-[#FF6B00] hover:bg-orange-200'
                  }`}
                  title="متاح"
                >
                  🟢
                </button>
                <button
                  onClick={() => onChangeAvailability(item.id, 'sold_out_today')}
                  disabled={currentStatus === 'sold_out_today'}
                  className={`flex-1 py-1.5 text-[9px] font-bold transition-all ${
                    currentStatus === 'sold_out_today' 
                      ? 'bg-yellow-500 text-white' 
                      : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                  }`}
                  title="نفد اليوم"
                >
                  🟡
                </button>
                <button
                  onClick={() => onChangeAvailability(item.id, 'unavailable')}
                  disabled={currentStatus === 'unavailable'}
                  className={`flex-1 py-1.5 rounded-r text-[9px] font-bold transition-all ${
                    currentStatus === 'unavailable' 
                      ? 'bg-red-500 text-white' 
                      : 'bg-red-100 text-red-600 hover:bg-red-200'
                  }`}
                  title="متوقف"
                >
                  🔴
                </button>
              </div>
              
              {/* أزرار التعديل والحذف */}
              <div className="flex gap-1 mt-1">
                <button
                  onClick={() => onEdit(item)}
                  className="flex-1 bg-gray-100 text-gray-600 py-1 rounded text-[9px] font-bold hover:bg-gray-200"
                >
                  تعديل
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  className="px-2 bg-red-50 text-red-500 py-1 rounded text-[9px] hover:bg-red-100"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// مكون عرض طلبات الطعام
const FoodOrdersSection = ({ orders, onStatusChange, actionLoading }) => {
  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-8 bg-orange-50 rounded-xl border border-orange-200">
        <ShoppingBag className="mx-auto mb-2 text-orange-300" size={40} />
        <p className="text-orange-600 text-sm font-medium">لا توجد طلبات</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-700',
      'accepted': 'bg-blue-100 text-blue-700',
      'preparing': 'bg-orange-100 text-orange-700',
      'ready': 'bg-orange-100 text-[#FF6B00]',
      'out_for_delivery': 'bg-purple-100 text-purple-700',
      'delivered': 'bg-emerald-100 text-emerald-700',
      'cancelled': 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusText = (status) => {
    const texts = {
      'pending': 'جديد',
      'accepted': 'مقبول',
      'preparing': 'قيد التحضير',
      'ready': 'جاهز',
      'out_for_delivery': 'في الطريق',
      'delivered': 'تم التسليم',
      'cancelled': 'ملغي'
    };
    return texts[status] || status;
  };

  const isLoading = (orderId, status) => actionLoading === `food-${orderId}-${status}`;

  return (
    <div className="space-y-2">
      {orders.slice(0, 10).map(order => (
        <div key={order.id} className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-gray-900">#{order.id?.slice(-6)}</span>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${getStatusColor(order.status)}`}>
                {getStatusText(order.status)}
              </span>
            </div>
            <span className="text-[#FF6B00] font-bold text-xs">{order.total?.toLocaleString()} ل.س</span>
          </div>
          
          {/* تفاصيل الطلب */}
          <div className="text-[10px] text-gray-600 mb-2">
            <p>العميل: {order.customer_name || 'غير معروف'}</p>
            <p>العنوان: {order.delivery_address || 'غير محدد'}</p>
          </div>

          {/* كود الاستلام - يظهر عندما يكون الطلب جاهز */}
          {order.status === 'ready' && order.pickup_code && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 mb-2 text-center">
              <p className="text-[10px] text-gray-500 mb-1">كود الاستلام - أعطه لموظف التوصيل</p>
              <div className="flex justify-center gap-1 flex-wrap" dir="ltr">
                {order.pickup_code.split('').map((digit, i) => (
                  <span 
                    key={i} 
                    className="w-8 h-10 flex items-center justify-center text-lg font-bold bg-[#FF6B00] text-white rounded-lg shadow-md"
                  >
                    {digit}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* أزرار الإجراءات حسب الحالة */}
          {order.status === 'pending' && (
            <div className="flex gap-2">
              <button
                onClick={() => onStatusChange(order.id, 'accepted')}
                disabled={isLoading(order.id, 'accepted')}
                className="flex-1 bg-[#FF6B00] text-white py-1.5 rounded text-[10px] font-bold hover:bg-[#E65000] disabled:opacity-70 flex items-center justify-center gap-1"
              >
                {isLoading(order.id, 'accepted') ? (
                  <><Loader2 size={12} className="animate-spin" /> جاري...</>
                ) : 'استلام الطلب'}
              </button>
              <button
                onClick={() => onStatusChange(order.id, 'rejected')}
                disabled={isLoading(order.id, 'rejected')}
                className="flex-1 bg-red-100 text-red-600 py-1.5 rounded text-[10px] font-bold hover:bg-red-200 disabled:opacity-70 flex items-center justify-center gap-1"
              >
                {isLoading(order.id, 'rejected') ? (
                  <><Loader2 size={12} className="animate-spin" /> جاري...</>
                ) : 'رفض'}
              </button>
            </div>
          )}
          
          {order.status === 'accepted' && (
            <button
              onClick={() => onStatusChange(order.id, 'preparing')}
              disabled={isLoading(order.id, 'preparing')}
              className="w-full bg-orange-500 text-white py-1.5 rounded text-[10px] font-bold hover:bg-orange-600 disabled:opacity-70 flex items-center justify-center gap-1"
            >
              {isLoading(order.id, 'preparing') ? (
                <><Loader2 size={12} className="animate-spin" /> جاري...</>
              ) : 'بدء التحضير'}
            </button>
          )}
          
          {order.status === 'preparing' && (
            <button
              onClick={() => onStatusChange(order.id, 'ready')}
              disabled={isLoading(order.id, 'ready')}
              className="w-full bg-[#FF6B00] text-white py-1.5 rounded text-[10px] font-bold hover:bg-[#E65000] disabled:opacity-70 flex items-center justify-center gap-1"
            >
              {isLoading(order.id, 'ready') ? (
                <><Loader2 size={12} className="animate-spin" /> جاري...</>
              ) : 'الطلب جاهز'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

// WithdrawModal - مكون طلب السحب
const WithdrawModal = ({ balance, onClose, onSuccess, token }) => {
  const { toast } = useToast();
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [shamcashPhone, setShamcashPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const minWithdrawal = 50000;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const amount = parseInt(withdrawAmount);
    if (amount < minWithdrawal) {
      toast({ title: "خطأ", description: `الحد الأدنى للسحب ${minWithdrawal.toLocaleString()} ل.س`, variant: "destructive" });
      return;
    }
    if (amount > balance) {
      toast({ title: "خطأ", description: "المبلغ أكبر من الرصيد المتاح", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/api/wallet/withdraw`, {
        amount,
        shamcash_phone: shamcashPhone
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: "تم الإرسال", description: "تم إرسال طلب السحب بنجاح" });
      onSuccess();
    } catch (error) {
      toast({ title: "خطأ", description: getErrorMessage(error, "فشل إرسال الطلب"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-6 w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900 mb-4">طلب سحب</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">المبلغ (ل.س)</label>
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="مثال: 50000"
              className="w-full p-3 border border-gray-300 rounded-xl text-lg"
              required
              min={minWithdrawal}
            />
            <p className="text-xs text-gray-400 mt-1">
              الحد الأدنى: {minWithdrawal.toLocaleString()} ل.س | المتاح: {balance.toLocaleString()} ل.س
            </p>
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">رقم شام كاش</label>
            <input
              type="tel"
              value={shamcashPhone}
              onChange={(e) => setShamcashPhone(e.target.value)}
              placeholder="09XXXXXXXX"
              className="w-full p-3 border border-gray-300 rounded-xl"
              required
            />
          </div>
          
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
      </motion.div>
    </div>
  );
};

// Seller Documents Upload Page
const SellerDocumentsPage = () => {
  const navigate = useNavigate();
  const { user, fetchUser, token } = useAuth();
  const { toast } = useToast();

  const [businessName, setBusinessName] = useState('');
  const [sellerType, setSellerType] = useState('');
  const [nationalId, setNationalId] = useState(null);
  const [commercialReg, setCommercialReg] = useState(null);
  const [shopPhoto, setShopPhoto] = useState(null);
  const [healthCert, setHealthCert] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [rejectionReason, setRejectionReason] = useState(null);

  // أنواع البائعين
  const sellerTypes = [
    {
      id: 'traditional_shop',
      name: 'متجر تقليدي',
      icon: '🏪',
      description: 'محل تجاري بموقع ثابت',
      requiredDocs: ['nationalId', 'commercialReg', 'shopPhoto']
    },
    {
      id: 'restaurant',
      name: 'مطعم/طعام',
      icon: '🍳',
      description: 'مطعم أو محل طعام',
      requiredDocs: ['nationalId', 'commercialReg', 'healthCert']
    }
  ];

  useEffect(() => {
    if (user) {
      checkStatus();
    }
  }, [user]);

  const checkStatus = async () => {
    try {
      const res = await axios.get(`${API}/api/seller/documents/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus(res.data.status);
      setRejectionReason(res.data.rejection_reason);
      if (res.data.business_name) {
        setBusinessName(res.data.business_name);
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const handleFileChange = (setter) => (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const selectedType = sellerTypes.find(t => t.id === sellerType);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!sellerType) {
      toast({ title: "خطأ", description: "يرجى اختيار نوع النشاط", variant: "destructive" });
      return;
    }
    if (!nationalId) {
      toast({ title: "خطأ", description: "يرجى رفع صورة الهوية", variant: "destructive" });
      return;
    }
    if (!commercialReg) {
      toast({ title: "خطأ", description: "يرجى رفع السجل التجاري", variant: "destructive" });
      return;
    }
    if (sellerType === 'traditional_shop' && !shopPhoto) {
      toast({ title: "خطأ", description: "يرجى رفع صورة المحل", variant: "destructive" });
      return;
    }
    if (sellerType === 'restaurant' && !healthCert) {
      toast({ title: "خطأ", description: "يرجى رفع الشهادة الصحية", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/api/seller/documents`, {
        business_name: businessName,
        seller_type: sellerType,
        national_id: nationalId,
        commercial_registration: commercialReg,
        shop_photo: shopPhoto,
        health_certificate: healthCert
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast({
        title: "تم الإرسال",
        description: "تم رفع المستندات بنجاح، سيتم مراجعتها"
      });
      setStatus('pending');
    } catch (error) {
      toast({
        title: "خطأ",
        description: getErrorMessage(error, "حدث خطأ"),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || !['seller', 'food_seller'].includes(user.user_type)) {
    navigate('/');
    return null;
  }

  if (user.is_approved) {
    navigate('/seller/dashboard');
    return null;
  }

  // مكون رفع الصور
  const ImageUploader = ({ label, value, onChange, inputId }) => (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <div 
        className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center hover:border-[#FF6B00]/50 transition-colors cursor-pointer"
        onClick={() => document.getElementById(inputId).click()}
      >
        {value ? (
          <div className="relative">
            <img src={value} alt={label} className="w-full h-32 object-cover rounded-lg" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange({ target: { files: [] } }); }}
              className="absolute top-1 left-1 bg-red-500 text-white p-1 rounded-full text-xs"
            >
              ✕
            </button>
          </div>
        ) : (
          <>
            <Upload size={24} className="mx-auto mb-2 text-white/40" />
            <p className="text-white/50 text-sm">اضغط للرفع</p>
          </>
        )}
      </div>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        onChange={onChange}
        className="hidden"
      />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-[#FF6B00]/20 flex items-center justify-center mx-auto mb-4">
            <FileText size={32} className="text-[#FF6B00]" />
          </div>
          <h1 className="text-2xl font-bold">تأكيد حساب البائع</h1>
          <p className="text-white/50 mt-2 text-sm">ارفع المستندات المطلوبة للموافقة على حسابك</p>
        </div>

        {status === 'pending' ? (
          <div className="bg-[#121212] rounded-2xl p-6 border border-white/5 text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
              <Clock size={32} className="text-yellow-500" />
            </div>
            <h3 className="font-bold mb-2">في انتظار الموافقة</h3>
            <p className="text-white/50 text-sm">
              تم رفع مستنداتك بنجاح. سيتم مراجعتها والرد عليك قريباً.
            </p>
          </div>
        ) : status === 'rejected' ? (
          <div className="bg-[#121212] rounded-2xl p-6 border border-white/5 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <X size={32} className="text-red-500" />
            </div>
            <h3 className="font-bold mb-2">تم الرفض</h3>
            {rejectionReason ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-right">
                <p className="text-red-400 text-sm font-medium">سبب الرفض:</p>
                <p className="text-white/70 text-sm mt-1">{rejectionReason}</p>
              </div>
            ) : (
              <p className="text-white/50 text-sm mb-4">
                عذراً، تم رفض طلبك. يمكنك إعادة المحاولة بمستندات صحيحة.
              </p>
            )}
            <button
              onClick={() => setStatus(null)}
              className="bg-[#FF6B00] text-black font-bold px-6 py-2 rounded-full"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-[#121212] rounded-2xl p-5 border border-white/5 space-y-4">
            {/* اسم النشاط */}
            <div>
              <label className="block text-sm font-medium mb-2">اسم النشاط التجاري</label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg py-3 px-4 text-white placeholder:text-white/30 focus:border-[#FF6B00] focus:outline-none"
                placeholder="اسم نشاطك التجاري"
                required
                data-testid="business-name-input"
              />
            </div>

            {/* اختيار نوع النشاط */}
            <div>
              <label className="block text-sm font-medium mb-2">نوع النشاط</label>
              <div className="grid grid-cols-2 gap-3">
                {sellerTypes.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSellerType(type.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-center ${
                      sellerType === type.id
                        ? 'border-[#FF6B00] bg-[#FF6B00]/10'
                        : 'border-white/10 hover:border-white/20'
                    }`}
                  >
                    <span className="text-3xl block mb-2">{type.icon}</span>
                    <span className="text-sm font-medium block">{type.name}</span>
                    <span className="text-[10px] text-white/50 block mt-1">{type.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* الوثائق المطلوبة */}
            {sellerType && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 pt-2"
              >
                <p className="text-xs text-white/50 text-center">📋 الوثائق المطلوبة لـ{selectedType?.name}</p>
                
                {/* صورة الهوية - مطلوبة للجميع */}
                <ImageUploader
                  label="صورة الهوية الشخصية"
                  value={nationalId}
                  onChange={handleFileChange(setNationalId)}
                  inputId="national-id-input"
                />

                {/* السجل التجاري - مطلوب للجميع */}
                <ImageUploader
                  label="السجل التجاري"
                  value={commercialReg}
                  onChange={handleFileChange(setCommercialReg)}
                  inputId="commercial-reg-input"
                />

                {/* صورة المحل - للمتاجر فقط */}
                {sellerType === 'traditional_shop' && (
                  <ImageUploader
                    label="صورة المحل"
                    value={shopPhoto}
                    onChange={handleFileChange(setShopPhoto)}
                    inputId="shop-photo-input"
                  />
                )}

                {/* الشهادة الصحية - للمطاعم فقط */}
                {sellerType === 'restaurant' && (
                  <ImageUploader
                    label="الشهادة الصحية"
                    value={healthCert}
                    onChange={handleFileChange(setHealthCert)}
                    inputId="health-cert-input"
                  />
                )}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading || !sellerType}
              className="w-full bg-[#FF6B00] text-black font-bold py-3 rounded-full mt-4 hover:bg-[#E65000] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              data-testid="submit-docs-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  جاري الإرسال...
                </>
              ) : (
                'إرسال للمراجعة'
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

// Seller Dashboard
const SellerDashboardPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, token, logout } = useAuth();
  const { toast } = useToast();

  // تحديد نوع البائع (منتجات أو طعام)
  const isFoodSeller = user?.user_type === 'food_seller';
  
  const [products, setProducts] = useState([]);
  const [foodItems, setFoodItems] = useState([]); // للأطباق
  const [orders, setOrders] = useState([]);
  const [foodOrders, setFoodOrders] = useState([]); // طلبات الطعام
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [duplicatingProduct, setDuplicatingProduct] = useState(null); // المنتج المراد نسخه
  const [saving, setSaving] = useState(false);
  const [editingStock, setEditingStock] = useState(null); // لتعديل الكمية المباشر
  const [newStockValue, setNewStockValue] = useState('');
  // قراءة التبويب من URL أو استخدام 'orders' كافتراضي (الطلبات هي الصفحة الرئيسية)
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'orders');
  const [walletBalance, setWalletBalance] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingTransactions, setDeletingTransactions] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [actionLoading, setActionLoading] = useState(null); // لتتبع الزر قيد التحميل
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [activeStatView, setActiveStatView] = useState(null);
  const [printLabelOrder, setPrintLabelOrder] = useState(null);
  const [commissionInfo, setCommissionInfo] = useState(null);
  const [storeLogo, setStoreLogo] = useState(null);
  const [flashEnabled, setFlashEnabled] = useState(true); // هل الفلاش مفعل لهذا البائع

  // صوت التنبيه للطلبات الجديدة
  const { playSound } = useNotificationSound();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const previousPendingCountRef = useRef(0);

  // حماية الصفحة - التحقق من حالة الوثائق للبائعين (ليس بائعي الطعام)
  useEffect(() => {
    const checkDocumentsStatus = async () => {
      if (user?.user_type === 'seller' && token) {
        try {
          const res = await axios.get(`${API}/api/seller/documents/status`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const status = res.data?.status;
          
          if (!status || status === 'not_submitted') {
            navigate('/seller/documents', { replace: true });
          } else if (status === 'pending') {
            navigate('/seller/pending', { replace: true });
          } else if (status === 'rejected') {
            navigate('/seller/documents', { replace: true });
          }
          // إذا approved، يبقى في هذه الصفحة
        } catch (error) {
          // إذا فشل (404)، يوجه لصفحة الوثائق
          if (error.response?.status === 404) {
            navigate('/seller/documents', { replace: true });
          }
        }
      }
    };
    
    checkDocumentsStatus();
  }, [user, token, navigate]);

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

  // التحقق من الطلبات الجديدة وتشغيل الصوت
  useEffect(() => {
    if (soundEnabled) {
      // للطعام أو المنتجات
      const currentOrders = isFoodSeller ? foodOrders : orders;
      const pendingStatuses = isFoodSeller ? ['pending'] : ['pending', 'paid'];
      const pendingCount = currentOrders.filter(o => pendingStatuses.includes(o.status)).length;
      
      if (pendingCount > previousPendingCountRef.current && previousPendingCountRef.current !== 0) {
        // هناك طلب جديد!
        playSound();
        toast({
          title: "🔔 طلب جديد!",
          description: `لديك ${pendingCount} طلب في الانتظار`,
        });
      }
      previousPendingCountRef.current = pendingCount;
    }
  }, [foodOrders, orders, isFoodSeller, soundEnabled, playSound, toast]);

  // تحديث الطلبات كل 30 ثانية لجميع البائعين
  useEffect(() => {
    if (user?.is_approved) {
      const interval = setInterval(() => {
        fetchData();
      }, 30000); // كل 30 ثانية
      return () => clearInterval(interval);
    }
  }, [user?.is_approved]);

  useEffect(() => {
    if (user?.user_type === 'seller' || user?.user_type === 'food_seller') {
      fetchData();
      fetchWallet();
      fetchCommissionInfo();
    }
  }, [user]);

  const fetchCommissionInfo = async () => {
    try {
      const endpoint = isFoodSeller ? '/api/food/my-store/commission' : '/api/seller/commission';
      const res = await axios.get(`${API}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCommissionInfo(res.data);
    } catch (error) {
      console.log('Commission info not available');
    }
  };

  const fetchWallet = async () => {
    try {
      const [balanceRes, transRes] = await Promise.all([
        axios.get(`${API}/api/wallet/balance`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/api/wallet/transactions?limit=20`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setWalletBalance(balanceRes.data.balance || 0);
      setPendingBalance(balanceRes.data.pending_balance || 0);
      setTotalEarned(balanceRes.data.total_earned || 0);
      setWalletTransactions(transRes.data || []);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    }
  };
  
  const fetchWalletData = fetchWallet;
  
  // حذف سجلات المحفظة
  const handleClearTransactions = async () => {
    setDeletingTransactions(true);
    try {
      await axios.delete(`${API}/api/wallet/transactions/clear`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: "تم الحذف", description: "تم حذف سجلات المحفظة بنجاح" });
      setWalletTransactions([]);
      setShowDeleteConfirm(false);
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل حذف السجلات",
        variant: "destructive"
      });
    } finally {
      setDeletingTransactions(false);
    }
  };

  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      // جلب صورة المتجر
      try {
        const settingsRes = await axios.get(`${API}/api/auth/seller/store-settings`, { headers });
        if (settingsRes.data?.store_logo) {
          setStoreLogo(settingsRes.data.store_logo);
        }
      } catch (e) {
        console.log('Could not fetch store logo');
      }
      
      // جلب إعدادات الفلاش للتحقق من التفعيل
      try {
        const flashRes = await axios.get(`${API}/api/seller/promotion-settings`, { headers });
        setFlashEnabled(flashRes.data?.flash_enabled_for_me !== false);
      } catch (e) {
        console.log('Could not fetch flash settings');
      }
      
      if (isFoodSeller) {
        // بائع طعام - جلب الأطباق وطلبات الطعام
        const [menuRes, foodOrdersRes] = await Promise.all([
          axios.get(`${API}/api/food/my-items`, { headers }),
          axios.get(`${API}/api/food/orders/seller`, { headers })
        ]);
        setFoodItems(menuRes.data || []);
        setFoodOrders(foodOrdersRes.data || []);
      } else {
        // بائع منتجات - جلب المنتجات والطلبات
        const [productsRes, ordersRes] = await Promise.all([
          axios.get(`${API}/api/products/seller/my-products`, { headers }),
          axios.get(`${API}/api/orders/seller/my-orders`, { headers })
        ]);
        setProducts(productsRes.data || []);
        // فلترة الطلبات: لا تظهر الطلبات بانتظار الدفع فقط - أظهر المدفوعة وما فوق
        const paidOrders = (ordersRes.data || []).filter(order => 
          order.status !== 'pending' && order.payment_status !== 'pending'
        );
        setOrders(paidOrders);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (productData) => {
    setSaving(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      if (isFoodSeller) {
        // إضافة طبق جديد
        await axios.post(`${API}/api/food/items`, productData, { headers });
        toast({
          title: "تم الإضافة",
          description: "تمت إضافة الطبق بنجاح"
        });
      } else {
        // إضافة منتج جديد
        await axios.post(`${API}/api/products`, productData, { headers });
        toast({
          title: "تم الإضافة",
          description: "تمت إضافة المنتج بنجاح"
        });
      }
      setShowAddProduct(false);
      fetchData();
    } catch (error) {
      toast({
        title: "خطأ",
        description: getErrorMessage(error, "حدث خطأ"),
        variant: "destructive"
      });
      // إعادة رمي الخطأ ليعرف AddProductModal أن هناك مشكلة
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    const itemName = isFoodSeller ? 'الطبق' : 'المنتج';
    if (!window.confirm(`هل تريد حذف هذا ${itemName}؟`)) return;

    // تحديث فوري للواجهة - إخفاء المنتج
    if (isFoodSeller) {
      setFoodItems(prevItems => prevItems.filter(item => item.id !== productId));
    } else {
      setProducts(prevProducts => prevProducts.filter(product => product.id !== productId));
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      if (isFoodSeller) {
        await axios.delete(`${API}/api/food/items/${productId}`, { headers });
      } else {
        await axios.delete(`${API}/api/products/${productId}`, { headers });
      }
      // لا نحتاج إشعار نجاح - اختفاء المنتج كافٍ
    } catch (error) {
      // إرجاع البيانات عند الفشل
      fetchData();
      toast({
        title: "خطأ",
        description: getErrorMessage(error, `فشل حذف ${itemName}`),
        variant: "destructive"
      });
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setEditPrice(product.price.toString());
    setEditStock(product.stock.toString());
  };

  // نسخ منتج - يفتح نموذج إضافة منتج جديد مع البيانات المنسوخة
  const handleDuplicateProduct = (product) => {
    // إنشاء نسخة من المنتج بدون الـ ID والحالة
    const duplicatedData = {
      name: `${product.name} (نسخة)`,
      description: product.description || '',
      price: product.price,
      original_price: product.original_price || product.price,
      stock: product.stock || 10,
      category: product.category || '',
      subcategory: product.subcategory || '',
      images: product.images || [],
      specifications: product.specifications || {},
      tags: product.tags || [],
      colors: product.colors || [],
      sizes: product.sizes || [],
      discount_percentage: product.discount_percentage || 0,
    };
    
    setDuplicatingProduct(duplicatedData);
    setShowAddProduct(true);
    
    toast({
      title: "نسخ المنتج",
      description: "تم نسخ بيانات المنتج - عدّل الاسم والتفاصيل ثم احفظ"
    });
  };

  const handleSaveEdit = async () => {
    if (!editingProduct) return;
    
    setSavingEdit(true);
    try {
      await axios.put(`${API}/api/products/${editingProduct.id}`, {
        price: parseFloat(editPrice),
        stock: parseInt(editStock)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast({
        title: "تم التحديث",
        description: "تم تحديث المنتج بنجاح"
      });
      
      setEditingProduct(null);
      fetchData();
    } catch (error) {
      toast({
        title: "خطأ",
        description: getErrorMessage(error, "فشل تحديث المنتج"),
        variant: "destructive"
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSellerAction = async (orderId, action) => {
    // تحديد الحالة الجديدة
    const newStatusMap = {
      'confirm': 'confirmed',
      'preparing': 'preparing', 
      'shipped': 'shipped'
    };
    const newStatus = newStatusMap[action];
    
    // 1. تحديث فوري للواجهة (Optimistic Update) - بدون الكود مؤقتاً
    setActionLoading(`${orderId}-${action}`);
    setOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus, delivery_status: newStatus }
          : order
      )
    );
    
    try {
      const endpoints = {
        'confirm': `/api/orders/${orderId}/seller/confirm`,
        'preparing': `/api/orders/${orderId}/seller/preparing`,
        'shipped': `/api/orders/${orderId}/seller/shipped`
      };
      
      const response = await axios.post(`${API}${endpoints[action]}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // 2. إذا كان الإجراء "shipped"، نحدّث الطلب بكود الاستلام
      if (action === 'shipped' && response.data?.pickup_code) {
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId 
              ? { ...order, pickup_code: response.data.pickup_code, pickup_code_verified: false }
              : order
          )
        );
      }
      // لا نحتاج إشعار نجاح - تغيير الحالة كافٍ
    } catch (error) {
      // 3. إرجاع الحالة السابقة عند الفشل
      fetchData();
      toast({
        title: "خطأ",
        description: getErrorMessage(error, "فشل في تنفيذ الإجراء"),
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  // تحديث الكمية المتبقية مباشرة
  const handleUpdateStock = async (productId) => {
    const stockValue = parseInt(newStockValue);
    if (isNaN(stockValue) || stockValue < 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رقم صحيح",
        variant: "destructive"
      });
      return;
    }

    // تحديث فوري للواجهة
    setProducts(prevProducts => 
      prevProducts.map(product => 
        product.id === productId 
          ? { ...product, stock: stockValue }
          : product
      )
    );
    setEditingStock(null);
    setNewStockValue('');

    try {
      await axios.put(`${API}/api/products/${productId}`, {
        stock: stockValue
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // لا نحتاج إشعار نجاح
    } catch (error) {
      fetchData();
      toast({
        title: "خطأ",
        description: getErrorMessage(error, "فشل تحديث الكمية"),
        variant: "destructive"
      });
    }
  };

  // تحديث الكمية المتبقية لمنتجات الطعام
  const handleUpdateFoodStock = async (productId) => {
    const stockValue = parseInt(newStockValue);
    if (isNaN(stockValue) || stockValue < 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رقم صحيح",
        variant: "destructive"
      });
      return;
    }

    // تحديث فوري للواجهة
    setFoodItems(prevItems => 
      prevItems.map(item => 
        item.id === productId 
          ? { ...item, stock: stockValue }
          : item
      )
    );
    setEditingStock(null);
    setNewStockValue('');

    try {
      await axios.put(`${API}/api/food/products/${productId}`, {
        stock: stockValue
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // لا نحتاج إشعار نجاح
    } catch (error) {
      fetchData();
      toast({
        title: "خطأ",
        description: getErrorMessage(error, "فشل تحديث الكمية"),
        variant: "destructive"
      });
    }
  };

  // تبديل حالة توفر المنتج (إظهار/إخفاء)
  const handleToggleAvailability = async (productId, currentStatus) => {
    // تحديث فوري للواجهة
    setProducts(prevProducts => 
      prevProducts.map(product => 
        product.id === productId 
          ? { ...product, is_available: !currentStatus }
          : product
      )
    );
    
    try {
      await axios.put(`${API}/api/products/${productId}`, {
        is_available: !currentStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // لا نحتاج إشعار نجاح - تغيير الحالة كافٍ
    } catch (error) {
      // إرجاع الحالة السابقة عند الفشل
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === productId 
            ? { ...product, is_available: currentStatus }
            : product
        )
      );
      toast({
        title: "خطأ",
        description: getErrorMessage(error, "فشل تحديث حالة المنتج"),
        variant: "destructive"
      });
    }
  };

  // دوال خاصة ببائع الطعام
  // Handler جديد لتغيير حالة توفر منتج الطعام (3 حالات)
  const handleChangeFoodAvailability = async (itemId, newStatus) => {
    // تحديث فوري للواجهة
    setFoodItems(prevItems => 
      prevItems.map(item => 
        item.id === itemId 
          ? { ...item, availability_status: newStatus }
          : item
      )
    );
    
    try {
      await axios.put(`${API}/api/food/products/${itemId}/availability?status=${newStatus}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // لا نحتاج إشعار نجاح - تغيير الحالة كافٍ
    } catch (error) {
      // إرجاع الحالة السابقة عند الفشل
      fetchData();
      toast({
        title: "خطأ",
        description: getErrorMessage(error, "فشل في تغيير حالة الطبق"),
        variant: "destructive"
      });
    }
  };

  // Handler قديم (للتوافق الخلفي)
  const handleToggleFoodAvailability = async (itemId, currentStatus) => {
    const newStatus = currentStatus ? 'unavailable' : 'available';
    await handleChangeFoodAvailability(itemId, newStatus);
  };

  const handleFoodOrderStatus = async (orderId, newStatus) => {
    // 1. تحديث فوري للواجهة (Optimistic Update)
    setActionLoading(`food-${orderId}-${newStatus}`);
    setFoodOrders(prevOrders => 
      prevOrders.map(order => 
        order.id === orderId 
          ? { ...order, status: newStatus }
          : order
      )
    );
    
    try {
      const response = await axios.post(`${API}/api/food/orders/store/orders/${orderId}/status`, null, {
        params: { new_status: newStatus },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // 2. إذا كان الإجراء "ready"، نحدّث الطلب بكود الاستلام
      if (newStatus === 'ready' && response.data?.pickup_code) {
        setFoodOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId 
              ? { ...order, pickup_code: response.data.pickup_code, pickup_code_verified: false }
              : order
          )
        );
      }
      // لا نحتاج إشعار نجاح - تغيير الحالة كافٍ
    } catch (error) {
      // 3. إرجاع الحالة السابقة عند الفشل
      fetchData();
      toast({
        title: "خطأ",
        description: getErrorMessage(error, "فشل في تحديث الطلب"),
        variant: "destructive"
      });
    } finally {
      setActionLoading(null);
    }
  };

  if (!user || (user.user_type !== 'seller' && user.user_type !== 'food_seller')) {
    navigate('/');
    return null;
  }

  if (!user.is_approved) {
    navigate('/seller/documents');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }

  // حساب الإحصائيات حسب نوع البائع
  const displayOrders = (isFoodSeller ? foodOrders : orders) || [];
  const displayItems = (isFoodSeller ? foodItems : products) || [];
  const totalSales = displayOrders.reduce((sum, o) => sum + (o.status === 'paid' || o.status === 'delivered' ? (o.total || 0) : 0), 0);
  const paidOrders = displayOrders.filter(o => o.status === 'paid' || o.status === 'delivered').length;

  // التسميات حسب نوع البائع
  const labels = isFoodSeller ? {
    dashboardTitle: user?.store_name || 'لوحة تحكم المطعم',
    addButton: 'إضافة طبق',
    itemsTab: 'قائمة الطعام',
    itemsTabId: 'menu',
    guideButton: 'إعدادات المطعم',
    guideIcon: Store
  } : {
    dashboardTitle: user?.store_name || user?.full_name || 'لوحة تحكم البائع',
    addButton: 'إضافة منتج',
    itemsTab: 'منتجاتي',
    itemsTabId: 'products',
    guideButton: 'إرشادات التغليف',
    guideIcon: BookOpen
  };

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* معلومات المتجر */}
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 bg-[#FF6B00]/10 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                {storeLogo ? (
                  <img src={storeLogo} alt="شعار المتجر" className="w-full h-full object-cover" />
                ) : (
                  <Package size={28} className="text-[#FF6B00]" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1 bg-yellow-50 px-1.5 py-0.5 rounded-full w-fit mb-1">
                  <Star size={10} className="text-yellow-500 fill-yellow-500" />
                  <span className="text-[10px] font-bold text-yellow-700">{user?.rating?.toFixed(1) || '0.0'}</span>
                </div>
                <h1 className="text-sm font-bold text-gray-900 truncate">{user?.name || 'متجري'}</h1>
                <p className="text-xs text-gray-500 mt-0.5">{displayItems.length} منتج • <span className="text-[#FF6B00]">نشط</span></p>
              </div>
            </div>
            
            {/* الأزرار */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <NotificationsDropdown />
              <button 
                onClick={() => setShowWalletModal(true)}
                className="h-9 bg-[#FF6B00] text-white px-3 rounded-full flex items-center gap-1 hover:bg-[#E65000] transition-colors text-xs font-bold"
                title="المحفظة"
              >
                <Wallet size={14} />
                <span>{walletBalance?.toLocaleString() || 0}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* المحتوى الرئيسي */}
      <div className="max-w-4xl mx-auto px-4 py-4 pb-24" style={{ paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))' }}>
        
        {/* قسم الطلبات - تبويب منفصل */}
        {activeTab === 'orders' && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <ShoppingBag size={20} className="text-[#FF6B00]" />
              الطلبات
              {displayOrders.filter(o => o.status === 'pending' || o.status === 'paid').length > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {displayOrders.filter(o => o.status === 'pending' || o.status === 'paid').length} جديد
                </span>
              )}
            </h2>
            {isFoodSeller ? (
              <FoodOrdersSection 
                orders={foodOrders} 
                onStatusChange={handleFoodOrderStatus}
                actionLoading={actionLoading}
              />
            ) : (
              <SellerOrdersSection 
                orders={orders} 
                onSellerAction={handleSellerAction} 
                onPrintLabel={setPrintLabelOrder}
                actionLoading={actionLoading}
              />
            )}
          </div>
        )}

        {/* محتوى المنتجات */}
        {activeTab === 'products' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Package size={18} className="text-[#FF6B00]" />
                منتجاتي ({displayItems.length})
              </h3>
              <button
                onClick={() => setShowAddProduct(true)}
                className="flex items-center gap-2 bg-[#FF6B00] text-white px-4 py-2 rounded-xl text-sm font-bold"
              >
                <Plus size={16} />
                إضافة منتج
              </button>
            </div>
            {displayItems.length === 0 ? (
              <div className="bg-orange-50 rounded-xl p-8 text-center border border-orange-200">
                <Package size={40} className="mx-auto text-orange-300 mb-3" />
                <p className="text-orange-600 font-medium">لم تقم بإضافة أي منتجات بعد</p>
              </div>
            ) : (
              <div className="space-y-2">
                {displayItems.map((product) => (
                  <div key={product.id} className={`relative bg-gray-50 rounded-xl p-3 ${
                    product.approval_status === 'rejected' ? 'border-2 border-red-300 bg-red-50/50' :
                    product.approval_status === 'pending' || !product.is_approved ? 'border-2 border-yellow-300 bg-yellow-50/50' :
                    !product.is_available ? 'border-2 border-dashed border-gray-300' : ''
                  }`}>
                    {/* شارات حالة المنتج */}
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
                        <h4 className={`font-bold text-sm ${!product.is_available ? 'text-gray-400' : 'text-gray-900'}`}>{product.name}</h4>
                        <p className={`font-bold text-sm ${!product.is_available ? 'text-gray-400' : 'text-[#FF6B00]'}`}>{(product.price || 0).toLocaleString()} ل.س</p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {/* أزرار حسب حالة المنتج */}
                        {product.approval_status === 'rejected' ? (
                          /* منتج مرفوض - زر إعادة إرسال */
                          <button
                            onClick={() => { setEditingProduct(product); setShowAddProduct(true); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-orange-100 text-orange-700 hover:bg-orange-200"
                          >
                            <RotateCcw size={14} />
                            <span>تعديل وإعادة إرسال</span>
                          </button>
                        ) : product.approval_status === 'pending' || !product.is_approved ? (
                          /* منتج معلق - بدون زر إظهار/إخفاء */
                          null
                        ) : (
                          /* منتج موافق عليه - زر إظهار/إخفاء */
                          <button
                            onClick={() => isFoodSeller ? handleChangeFoodAvailability(product.id, product.is_available ? 'unavailable' : 'available') : handleToggleAvailability(product.id, product.is_available)}
                            data-testid={`toggle-availability-${product.id}`}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                              product.is_available 
                                ? 'bg-orange-100 text-[#FF6B00] hover:bg-orange-200 border border-orange-300' 
                                : 'bg-orange-100 text-orange-700 hover:bg-orange-200 border border-orange-300'
                            }`}
                          >
                            {product.is_available ? (
                              <>
                                <Eye size={16} />
                                <span>متاح</span>
                              </>
                            ) : (
                              <>
                                <EyeOff size={16} />
                                <span>إظهار</span>
                              </>
                            )}
                          </button>
                        )}
                        
                        {/* صف أزرار التعديل والحذف */}
                        <div className="flex items-center gap-1">
                          {/* زر التعديل - للجميع ما عدا المرفوض (له زر خاص) */}
                          {product.approval_status !== 'rejected' && (
                            <button
                              onClick={() => { setEditingProduct(product); setShowAddProduct(true); }}
                              className="p-2.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 border border-blue-300"
                            >
                              <Edit2 size={18} />
                            </button>
                          )}
                          
                          {/* زر الحذف - للجميع */}
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-2.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 border border-red-300"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* زر المخزون - سطر منفصل أسفل كل شيء - فقط للمنتجات الموافق عليها */}
                    {(product.is_approved === true && product.approval_status !== 'pending' && product.approval_status !== 'rejected') && (
                      <div className="mt-2 flex justify-end">
                        {editingStock === product.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={newStockValue}
                              onChange={(e) => setNewStockValue(e.target.value)}
                              className="w-16 px-2 py-1.5 text-sm border-2 border-[#FF6B00] rounded-lg focus:outline-none"
                              autoFocus
                              min="0"
                            />
                            <button
                              onClick={() => isFoodSeller ? handleUpdateFoodStock(product.id) : handleUpdateStock(product.id)}
                              className="p-1.5 bg-[#FF6B00] text-white rounded-lg"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              onClick={() => { setEditingStock(null); setNewStockValue(''); }}
                              className="p-1.5 bg-gray-400 text-white rounded-lg"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditingStock(product.id); setNewStockValue(product.stock?.toString() || '0'); }}
                            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all border ${
                              (product.stock || 0) <= 5 
                                ? 'bg-red-100 text-red-600 border-red-300 hover:bg-red-200' 
                                : (product.stock || 0) <= 10 
                                  ? 'bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200'
                                  : 'bg-orange-100 text-[#FF6B00] border-orange-300 hover:bg-orange-200'
                            }`}
                          >
                            <Package size={14} />
                            <span>المخزون: {product.stock || 0}</span>
                            <Edit2 size={12} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Wallet size={18} className="text-[#FF6B00]" />
              المحفظة
            </h3>
            <div className="bg-gradient-to-r from-[#FF6B00] to-orange-500 rounded-xl p-4 text-white">
              <p className="text-white/80 text-sm">رصيد المحفظة</p>
              <p className="text-2xl font-bold">{formatPrice(walletBalance)}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">أرباح معلقة</p>
                <p className="font-bold text-gray-900">{formatPrice(pendingBalance)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">إجمالي الأرباح</p>
                <p className="font-bold text-[#FF6B00]">{formatPrice(totalEarned)}</p>
              </div>
            </div>
            <button
              onClick={() => setShowWithdrawModal(true)}
              disabled={walletBalance < 50000}
              className="w-full py-3 bg-[#FF6B00] text-white rounded-xl font-bold disabled:opacity-50"
            >
              طلب سحب
            </button>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp size={18} className="text-[#FF6B00]" />
                الإحصائيات
              </h3>
              <button
                onClick={() => setActiveTab('settings')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                data-testid="back-to-settings-btn"
              >
                <ChevronRight size={16} className="rotate-180" />
                رجوع
              </button>
            </div>
            <SellerAnalytics token={token} />
          </div>
        )}

        {/* تبويب فلاش */}
        {activeTab === 'flash' && (
          <PromoteProductTab 
            products={products} 
            token={token} 
            walletBalance={walletBalance}
            onPromotionSuccess={(newBalance) => {
              setWalletBalance(newBalance);
              fetchWallet(); // إعادة جلب الرصيد للتأكد
            }}
          />
        )}

        {/* تبويب إرشادات التغليف */}
        {activeTab === 'packaging' && (
          <div className="space-y-4">
            {/* Intro */}
            <div className="bg-gradient-to-r from-[#FF6B00] to-orange-500 text-white rounded-2xl p-4">
              <h2 className="font-bold text-lg mb-2">📦 التغليف الجيد = عميل سعيد</h2>
              <p className="text-sm opacity-90">
                التغليف الصحيح يحمي منتجاتك ويضمن وصولها سليمة للعميل. اتبع هذه الإرشادات لتجنب المشاكل والإرجاعات.
              </p>
            </div>

            {/* قواعد التغليف الأساسية */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Package size={18} className="text-blue-600" />
                </div>
                <span className="font-bold text-gray-900">قواعد التغليف الأساسية</span>
              </div>
              <div className="space-y-3">
                {[
                  { icon: '1️⃣', title: 'اختر الصندوق المناسب', desc: 'حجم الصندوق يجب أن يناسب المنتج - لا كبير جداً ولا صغير' },
                  { icon: '2️⃣', title: 'استخدم مواد الحماية', desc: 'ورق فقاعات، ورق تغليف، أو فوم لحماية المنتج من الصدمات' },
                  { icon: '3️⃣', title: 'املأ الفراغات', desc: 'لا تترك فراغات داخل الصندوق - املأها بورق أو فوم' },
                  { icon: '4️⃣', title: 'أغلق بإحكام', desc: 'استخدم شريط لاصق قوي وأغلق جميع الجوانب' },
                  { icon: '5️⃣', title: 'ألصق ملصق الطلب', desc: 'ألصق ملصق الطلب في مكان واضح على الصندوق' }
                ].map((item, index) => (
                  <div key={index} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                    <span className="text-xl">{item.icon}</span>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{item.title}</p>
                      <p className="text-gray-600 text-xs">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* تغليف حسب نوع المنتج */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Gift size={18} className="text-purple-600" />
                </div>
                <span className="font-bold text-gray-900">تغليف حسب نوع المنتج</span>
              </div>
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-bold text-blue-800 mb-2">📱 الإلكترونيات</h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• استخدم صندوق مقوى قوي</li>
                    <li>• لف المنتج بورق فقاعات طبقتين على الأقل</li>
                    <li>• ضع علامة "قابل للكسر" على الصندوق</li>
                    <li>• تأكد من إزالة البطارية إن وجدت</li>
                  </ul>
                </div>
                <div className="p-3 bg-pink-50 rounded-lg border border-pink-200">
                  <h4 className="font-bold text-pink-800 mb-2">👕 الملابس</h4>
                  <ul className="text-xs text-pink-700 space-y-1">
                    <li>• اطوِ الملابس بعناية</li>
                    <li>• استخدم كيس بلاستيكي شفاف للحماية من الرطوبة</li>
                    <li>• لا تضغط على الملابس كثيراً</li>
                    <li>• أبقِ البطاقات والملصقات مرئية</li>
                  </ul>
                </div>
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <h4 className="font-bold text-red-800 mb-2">🏺 المنتجات القابلة للكسر</h4>
                  <ul className="text-xs text-red-700 space-y-1">
                    <li>• استخدم صندوق مزدوج (صندوق داخل صندوق)</li>
                    <li>• لف كل قطعة على حدة بورق فقاعات</li>
                    <li>• ضع 5 سم من الحشو في القاع والأعلى</li>
                    <li>• اكتب "قابل للكسر - تعامل بحذر" بخط واضح</li>
                  </ul>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <h4 className="font-bold text-[#FF6B00] mb-2">💄 مستحضرات التجميل</h4>
                  <ul className="text-xs text-[#FF6B00] space-y-1">
                    <li>• تأكد من إغلاق الأغطية بإحكام</li>
                    <li>• ضع المنتجات السائلة في كيس بلاستيكي</li>
                    <li>• استخدم فواصل بين المنتجات</li>
                    <li>• لا تعرض للحرارة الشديدة</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* ملصق الطلب */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Package size={18} className="text-[#FF6B00]" />
                </div>
                <span className="font-bold text-gray-900">ملصق الطلب</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 mb-3">
                <p className="text-sm text-gray-700 mb-3">
                  يمكنك طباعة ملصق الطلب مباشرة من صفحة الطلبات. الملصق يحتوي على:
                </p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>✓ رقم الطلب</li>
                  <li>✓ اسم العميل</li>
                  <li>✓ رقم الهاتف</li>
                  <li>✓ عنوان التوصيل</li>
                  <li>✓ عدد القطع</li>
                  <li>✓ باركود للمسح</li>
                </ul>
              </div>
              <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <Package size={18} className="text-[#FF6B00]" />
                <p className="text-sm text-orange-700">
                  اضغط على زر "طباعة الملصق" في صفحة تفاصيل الطلب
                </p>
              </div>
            </div>

            {/* تجنب هذه الأخطاء */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h3 className="font-bold text-red-800 mb-3 flex items-center gap-2">
                <AlertTriangle size={18} />
                تجنب هذه الأخطاء
              </h3>
              <div className="space-y-2">
                {[
                  'استخدام صناديق تالفة أو مستعملة بحالة سيئة',
                  'عدم ملء الفراغات داخل الصندوق',
                  'التغليف بشكل فضفاض يسمح بحركة المنتج',
                  'عدم وضع ملصق الطلب أو وضعه في مكان مخفي',
                  'استخدام شريط لاصق ضعيف',
                  'إرسال منتج مختلف عن المطلوب'
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-red-700">
                    <span className="text-red-500">✕</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* تنبيه مهم - المسؤولية المالية */}
            <div className="bg-orange-100 border-2 border-orange-400 rounded-xl p-4">
              <h3 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                <span className="text-xl">💰</span>
                تنبيه مهم - المسؤولية المالية
              </h3>
              <p className="text-sm text-orange-800 leading-relaxed">
                <strong>إذا وصل المنتج تالفاً بسبب خطأ في التغليف</strong> وطلب العميل استبدال أو استرجاع، 
                ستكون <strong>تكلفة الشحن على حسابك</strong> (البائع) وليس العميل.
              </p>
              <p className="text-xs text-orange-700 mt-2">
                راجع سياسة الإرجاع للمزيد من التفاصيل.
              </p>
            </div>

            {/* نصائح للتميز */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <h3 className="font-bold text-[#FF6B00] mb-3 flex items-center gap-2">
                <CheckCircle size={18} />
                نصائح للتميز
              </h3>
              <div className="space-y-2">
                {[
                  'أضف بطاقة شكر صغيرة للعميل',
                  'استخدم تغليف يحمل شعار متجرك',
                  'أرفق فاتورة مطبوعة داخل الصندوق',
                  'صوّر المنتج قبل التغليف كدليل',
                  'تأكد من نظافة الصندوق من الخارج'
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-[#FF6B00]">
                    <span className="text-[#FF6B00]">✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* قائمة الفحص قبل التسليم */}
            <div className="bg-white rounded-xl border-2 border-[#FF6B00] p-4">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Shield size={18} className="text-[#FF6B00]" />
                قائمة الفحص قبل التسليم
              </h3>
              <div className="space-y-2">
                {[
                  'المنتج مطابق للطلب (النوع، اللون، المقاس)',
                  'المنتج سليم وبدون عيوب',
                  'التغليف محكم وآمن',
                  'ملصق الطلب واضح ومقروء',
                  'الصندوق نظيف ومرتب',
                  'جميع الملحقات موجودة'
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <div className="w-5 h-5 border-2 border-gray-300 rounded flex-shrink-0"></div>
                    <span className="text-sm text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4">
            {/* إعدادات المتجر */}
            <StoreSettingsTab onLogoUpdate={(logo) => setStoreLogo(logo)} />
            
            {/* روابط إضافية */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-3">
              {/* الإحصائيات */}
              <button
                onClick={() => setActiveTab('analytics')}
                className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors"
                data-testid="seller-analytics-btn"
              >
                <div className="flex items-center gap-3">
                  <TrendingUp size={20} className="text-[#FF6B00]" />
                  <span className="font-medium text-gray-900">الإحصائيات</span>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </button>
              
              {/* تسوّق الآن */}
              <Link
                to="/?view=customer"
                className="flex items-center justify-between bg-[#FF6B00]/10 border-2 border-[#FF6B00] rounded-xl p-4"
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart size={20} className="text-[#FF6B00]" />
                  <span className="font-medium text-[#FF6B00]">تسوّق الآن</span>
                </div>
                <ChevronRight size={20} className="text-[#FF6B00]" />
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* الشريط السفلي الثابت */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 shadow-lg pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-4xl mx-auto flex">
          {[
            { id: 'orders', label: 'الطلبات', icon: ShoppingBag },
            { id: 'products', label: 'المنتجات', icon: Package },
            ...(flashEnabled ? [{ id: 'flash', label: 'فلاش', icon: Zap }] : []),
            { id: 'packaging', label: 'التغليف', icon: Gift },
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

      {/* Modal إضافة/تعديل منتج */}
      <AddProductModal
        isOpen={showAddProduct}
        onClose={() => {
          setShowAddProduct(false);
          setEditingProduct(null);
        }}
        product={editingProduct}
        token={token}
        toast={toast}
        onSave={handleAddProduct}
        onSuccess={() => {
          setShowAddProduct(false);
          setEditingProduct(null);
          fetchData();
        }}
      />

      {/* Modal طلب سحب */}
      {showWithdrawModal && (
        <WithdrawModal
          balance={walletBalance}
          token={token}
          onClose={() => setShowWithdrawModal(false)}
          onSuccess={() => {
            setShowWithdrawModal(false);
            fetchWalletData();
          }}
        />
      )}

      {/* Modal المحفظة */}
      {showWalletModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setShowWalletModal(false)}>
          <div 
            className="bg-white w-full max-w-lg rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto"
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
              <p className="text-3xl font-bold">{walletBalance?.toLocaleString() || 0} ل.س</p>
            </div>

            {/* الأرباح المعلقة */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock size={18} className="text-yellow-600" />
                  <span className="text-sm text-yellow-800">أرباح معلقة</span>
                </div>
                <span className="font-bold text-yellow-800">{pendingBalance?.toLocaleString() || 0} ل.س</span>
              </div>
              <p className="text-xs text-yellow-600 mt-1">تُضاف للرصيد بعد اكتمال التوصيل</p>
            </div>

            {/* إجمالي الأرباح */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">إجمالي الأرباح</span>
                <span className="font-bold text-gray-900">{totalEarned?.toLocaleString() || 0} ل.س</span>
              </div>
            </div>
            
            {/* سجل المعاملات */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-gray-900 text-sm">سجل المعاملات</h3>
                {walletTransactions.length > 0 && (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600"
                  >
                    <Trash2 size={12} />
                    حذف
                  </button>
                )}
              </div>
              
              {walletTransactions.length === 0 ? (
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-gray-400 text-sm">لا توجد معاملات</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {walletTransactions.slice(0, 5).map((tx) => (
                    <div key={tx.id} className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-700">{tx.description}</p>
                        <p className="text-[10px] text-gray-400">
                          {new Date(tx.created_at).toLocaleDateString('ar-SY')}
                        </p>
                      </div>
                      <span className={`font-bold text-sm ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount?.toLocaleString()} ل.س
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-gray-400 mt-2 text-center">السجلات الأقدم من 3 أشهر تُحذف تلقائياً</p>
            </div>

            {/* زر طلب سحب */}
            <button
              onClick={() => {
                setShowWalletModal(false);
                setShowWithdrawModal(true);
              }}
              disabled={walletBalance < 50000}
              className="w-full py-4 bg-[#FF6B00] text-white rounded-xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#E65000] transition-colors"
            >
              {walletBalance < 50000 ? `الحد الأدنى للسحب 50,000 ل.س` : 'طلب سحب'}
            </button>
          </div>
        </div>
      )}

      {/* Modal تأكيد حذف السجلات */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div 
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-3">
                <Trash2 size={32} className="text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">حذف سجلات المحفظة</h2>
              <p className="text-sm text-gray-500 mt-2">
                هل أنت متأكد من حذف جميع سجلات المعاملات؟
              </p>
              <p className="text-xs text-green-600 mt-2 bg-green-50 rounded-lg p-2">
                ✓ الرصيد الحالي لن يتغير
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={handleClearTransactions}
                disabled={deletingTransactions}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deletingTransactions ? 'جاري الحذف...' : 'تأكيد الحذف'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal طباعة الملصق */}
      {printLabelOrder && (
        <OrderLabelPrint
          order={printLabelOrder}
          onClose={() => setPrintLabelOrder(null)}
        />
      )}
    </div>
  );
};

export default SellerDashboardPage;

// صفحة انتظار موافقة الإدارة على وثائق البائع
const SellerPendingApproval = () => {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);

  const checkStatus = async () => {
    setChecking(true);
    try {
      const res = await axios.get(`${API}/api/seller/documents/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const status = res.data?.status;
      
      if (status === 'approved') {
        toast({ title: "تم الاعتماد!", description: "تم اعتماد وثائقك. يمكنك الآن بيع منتجاتك." });
        navigate('/seller/dashboard', { replace: true });
      } else if (status === 'rejected') {
        toast({ title: "تم الرفض", description: res.data?.rejection_reason || "تم رفض وثائقك. يرجى إعادة رفعها.", variant: "destructive" });
        navigate('/seller/documents', { replace: true });
      } else {
        toast({ title: "جاري المراجعة", description: "لا يزال طلبك قيد المراجعة. يرجى الانتظار." });
      }
    } catch (error) {
      toast({ title: "خطأ", description: "فشل التحقق من الحالة", variant: "destructive" });
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
      >
        {/* أيقونة الانتظار */}
        <div className="w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock size={48} className="text-amber-600" />
        </div>
        
        {/* العنوان */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">جاري مراجعة وثائقك</h1>
        <p className="text-gray-600 mb-6">
          تم استلام وثائقك بنجاح وهي قيد المراجعة من قبل الإدارة.
          <br />
          سيتم إعلامك فور اتخاذ القرار.
        </p>
        
        {/* معلومات المستخدم */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-500">الحساب</p>
          <p className="font-bold text-gray-900">{user?.name || user?.full_name}</p>
          <p className="text-gray-600">{user?.phone}</p>
        </div>
        
        {/* ملاحظة */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-right">
          <p className="text-blue-800 text-sm">
            <strong>ملاحظة:</strong> عادة تستغرق المراجعة من ساعة إلى 24 ساعة.
            يمكنك الضغط على "تحقق من الحالة" للتحديث.
          </p>
        </div>
        
        {/* الأزرار */}
        <div className="space-y-3">
          <button
            onClick={checkStatus}
            disabled={checking}
            className="w-full bg-amber-500 text-white py-3 rounded-xl font-bold hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {checking ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <Check size={20} />
                تحقق من الحالة
              </>
            )}
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={20} />
            تسجيل الخروج
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export { SellerDocumentsPage, SellerDashboardPage, SellerPendingApproval };
