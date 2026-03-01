import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { 
  Truck, Package, MapPin, Phone, User, Clock, 
  CheckCircle, Upload, Camera, CreditCard, AlertTriangle,
  ChevronRight, Navigation
} from 'lucide-react';

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

          {/* صورة شخصية */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Camera size={16} className="inline ml-1" />
              صورة شخصية حديثة
            </label>
            <div className="relative">
              {docs.personal_photo ? (
                <div className="relative">
                  <img src={docs.personal_photo} alt="صورة شخصية" className="w-full h-40 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => setDocs(prev => ({ ...prev, personal_photo: '' }))}
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
                    onChange={handleImageUpload('personal_photo')}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* صورة الهوية */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <CreditCard size={16} className="inline ml-1" />
              صورة الهوية كاملة (الوجهين)
            </label>
            <div className="relative">
              {docs.id_photo ? (
                <div className="relative">
                  <img src={docs.id_photo} alt="صورة الهوية" className="w-full h-40 object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => setDocs(prev => ({ ...prev, id_photo: '' }))}
                    className="absolute top-2 left-2 bg-red-500 text-white p-1 rounded-full"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#FF6B00] transition-colors">
                  <Upload size={24} className="text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">اضغط لرفع صورة الهوية</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload('id_photo')}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* رخصة الدراجة */}
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

  useEffect(() => {
    checkStatusAndFetch();
  }, []);

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
      await axios.post(`${API}/delivery/take-order/${orderId}`);
      toast({
        title: "تم بنجاح",
        description: "تم تعيينك لتوصيل هذا الطلب"
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

  const handleCompleteOrder = async (orderId) => {
    try {
      await axios.post(`${API}/delivery/complete-order/${orderId}`);
      toast({
        title: "تم بنجاح",
        description: "تم تسليم الطلب بنجاح"
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

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
  };

  // التحقق من أوقات العمل - معطل للاختبار
  const isWorkingHours = () => {
    return true; // تم تعطيل التحقق من أوقات العمل للاختبار
    // const now = new Date();
    // const hour = now.getHours();
    // return hour >= 8 && hour < 18;
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
        {/* Header with Back Button */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => navigate('/')}
            className="w-8 h-8 bg-white rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
            data-testid="back-btn"
          >
            <ChevronRight size={18} className="text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">مرحباً، {user?.full_name || user?.name}</h1>
            <p className="text-xs text-gray-500">موظف توصيل</p>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${isWorkingHours() ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
            {isWorkingHours() ? 'أوقات العمل' : 'خارج أوقات العمل'}
          </div>
        </div>

        {/* أوقات العمل */}
        <div className="bg-blue-50 rounded-lg p-3 mb-4 flex items-center gap-2">
          <Clock size={16} className="text-blue-600" />
          <span className="text-xs text-blue-700">أوقات العمل: 8 صباحاً - 6 مساءً</span>
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
          <div className="space-y-3">
            {availableOrders.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                <Package size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">لا توجد طلبات متاحة حالياً</p>
              </div>
            ) : (
              availableOrders.map((order) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                >
                  <div className="p-3">
                    {/* رقم الطلب والسعر */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-sm text-gray-900">#{order.id?.slice(0, 8)}</span>
                      <span className="font-bold text-[#FF6B00]">{formatPrice(order.total)}</span>
                    </div>

                    {/* من أين - البائع */}
                    <div className="bg-green-50 rounded-lg p-2 mb-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <Navigation size={12} className="text-white" />
                        </div>
                        <span className="text-xs font-bold text-green-700">من (البائع)</span>
                      </div>
                      {order.seller_addresses?.map((seller, i) => (
                        <div key={i} className="mr-8 text-xs text-gray-600">
                          <p className="font-medium">{seller.business_name || seller.name}</p>
                          <p>{seller.city}</p>
                          <p className="flex items-center gap-1">
                            <Phone size={10} /> {seller.phone}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* إلى أين - المشتري */}
                    <div className="bg-blue-50 rounded-lg p-2 mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <MapPin size={12} className="text-white" />
                        </div>
                        <span className="text-xs font-bold text-blue-700">إلى (المشتري)</span>
                      </div>
                      <div className="mr-8 text-xs text-gray-600">
                        <p className="font-medium">{order.buyer_address?.name}</p>
                        <p>{order.buyer_address?.address}</p>
                        <p>{order.buyer_address?.city}</p>
                        <p className="flex items-center gap-1">
                          <Phone size={10} /> {order.buyer_address?.phone}
                        </p>
                      </div>
                    </div>

                    {/* عدد المنتجات */}
                    <p className="text-xs text-gray-500 mb-3">
                      عدد المنتجات: {order.items?.length || 0}
                    </p>

                    {/* زر أخذ الطلب */}
                    <button
                      onClick={() => handleTakeOrder(order.id)}
                      disabled={!isWorkingHours()}
                      className="w-full bg-[#FF6B00] text-white py-2 rounded-lg font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isWorkingHours() ? 'أخذ الطلب' : 'خارج أوقات العمل'}
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {/* My Orders */}
        {activeTab === 'my' && (
          <div className="space-y-3">
            {myOrders.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                <Truck size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">لم تأخذ أي طلبات بعد</p>
              </div>
            ) : (
              myOrders.map((order) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-xl border border-gray-200 p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-gray-900">#{order.id?.slice(0, 8)}</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      order.delivery_status === 'delivered' 
                        ? 'bg-green-100 text-green-600' 
                        : 'bg-yellow-100 text-yellow-600'
                    }`}>
                      {order.delivery_status === 'delivered' ? 'تم التسليم' : 'قيد التوصيل'}
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 mb-1">
                    <MapPin size={12} className="inline ml-1" />
                    {order.address}, {order.city}
                  </p>
                  <p className="text-xs text-gray-600 mb-2">
                    <Phone size={12} className="inline ml-1" />
                    {order.phone}
                  </p>
                  <p className="font-bold text-[#FF6B00] text-sm mb-3">{formatPrice(order.total)}</p>

                  {order.delivery_status !== 'delivered' && (
                    <button
                      onClick={() => handleCompleteOrder(order.id)}
                      className="w-full bg-green-500 text-white py-2 rounded-lg font-bold text-sm"
                    >
                      <CheckCircle size={14} className="inline ml-1" />
                      تأكيد التسليم
                    </button>
                  )}
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export { DeliveryDocuments, DeliveryDashboard };
