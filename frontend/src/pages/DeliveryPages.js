import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { 
  Truck, Clock, Upload, Camera, CreditCard, AlertTriangle, Navigation
} from 'lucide-react';
import { PickupChecklist, DeliveryChecklist, ReturnChecklist } from '../components/delivery/DeliveryChecklists';
import DeliveryHeader from '../components/delivery/DeliveryHeader';
import AvailableOrdersList from '../components/delivery/AvailableOrdersList';
import MyOrdersList from '../components/delivery/MyOrdersList';
import MyBoxCard from '../components/delivery/MyBoxCard';
import DriverPerformance from '../components/delivery/DriverPerformance';
import DriverChallenges from '../components/delivery/DriverChallenges';
import DriverLeaderboard from '../components/delivery/DriverLeaderboard';
import DriverAchievements from '../components/delivery/DriverAchievements';
import DriverPenaltyPoints from '../components/delivery/DriverPenaltyPoints';

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
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [activeTab, setActiveTab] = useState('available');
  const [docStatus, setDocStatus] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  
  // Checklist states
  const [showPickupChecklist, setShowPickupChecklist] = useState(null);
  const [showDeliveryChecklist, setShowDeliveryChecklist] = useState(null);
  const [showReturnChecklist, setShowReturnChecklist] = useState(null);
  
  // ETA Modal - الوقت المتوقع للوصول
  const [showETAModal, setShowETAModal] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(30);
  
  // Ratings
  const [myRatings, setMyRatings] = useState({ ratings: [], average_rating: 0, total_ratings: 0 });
  
  // Working hours settings
  const [workingHoursSettings, setWorkingHoursSettings] = useState({ start_hour: 8, end_hour: 18, is_enabled: true });

  useEffect(() => {
    checkStatusAndFetch();
    fetchWallet();
    fetchMyRatings();
    fetchWorkingHours();
  }, []);

  const fetchWorkingHours = async () => {
    try {
      const res = await axios.get(`${API}/settings/delivery-settings`);
      if (res.data.working_hours) {
        setWorkingHoursSettings(res.data.working_hours);
      }
    } catch (error) {
      console.error('Error fetching working hours:', error);
    }
  };

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
      const [availableRes, myRes] = await Promise.all([
        axios.get(`${API}/delivery/available-orders`),
        axios.get(`${API}/delivery/my-orders`)
      ]);
      setAvailableOrders(availableRes.data);
      setMyOrders(myRes.data);
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

  // التحقق من أوقات العمل
  const isWorkingHours = () => {
    if (!workingHoursSettings.is_enabled) {
      return true; // إذا كان القيد معطلاً، السماح بالعمل في أي وقت
    }
    const now = new Date();
    const hour = now.getHours();
    return hour >= workingHoursSettings.start_hour && hour < workingHoursSettings.end_hour;
  };
  
  // للحصول على نص ساعات العمل
  const getWorkingHoursText = () => {
    if (!workingHoursSettings.is_enabled) {
      return 'متاح على مدار الساعة';
    }
    return `${workingHoursSettings.start_hour} صباحاً - ${workingHoursSettings.end_hour > 12 ? workingHoursSettings.end_hour - 12 : workingHoursSettings.end_hour} ${workingHoursSettings.end_hour >= 12 ? 'مساءً' : 'صباحاً'}`;
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
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <DeliveryHeader 
          user={user}
          walletBalance={walletBalance}
          myRatings={myRatings}
          isWorkingHours={isWorkingHours()}
          workingHoursText={getWorkingHoursText()}
        />

        {/* التحديات والمكافآت */}
        <DriverChallenges />

        {/* لوحة الصدارة */}
        <DriverLeaderboard />

        {/* نقاط السلوك */}
        <div className="mb-4">
          <DriverPenaltyPoints />
        </div>

        {/* الإنجازات */}
        <DriverAchievements />

        {/* تقارير الأداء */}
        <div className="mb-4">
          <DriverPerformance />
        </div>

        {/* بطاقة الصندوق */}
        <div className="mb-4">
          <MyBoxCard />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('available')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
              activeTab === 'available' 
                ? 'bg-[#FF6B00] text-white' 
                : 'bg-white border border-gray-200 text-gray-700'
            }`}
          >
            طلبات متاحة ({availableOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
              activeTab === 'my' 
                ? 'bg-[#FF6B00] text-white' 
                : 'bg-white border border-gray-200 text-gray-700'
            }`}
          >
            طلباتي ({myOrders.length})
          </button>
        </div>

        {/* Available Orders */}
        {activeTab === 'available' && (
          <AvailableOrdersList
            orders={availableOrders}
            isWorkingHours={isWorkingHours}
            onTakeOrder={(order) => setShowPickupChecklist(order)}
            onTakeFoodOrder={handleTakeFoodOrder}
          />
        )}

        {/* My Orders */}
        {activeTab === 'my' && (
          <MyOrdersList
            orders={myOrders}
            onStartDelivery={handleOnTheWay}
            onShowDeliveryChecklist={(order) => setShowDeliveryChecklist(order)}
            onOpenETAModal={openETAModal}
          />
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
    </div>
  );
};

export { DeliveryDocuments, DeliveryDashboard };
