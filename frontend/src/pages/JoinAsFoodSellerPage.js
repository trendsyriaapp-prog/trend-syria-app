// /app/frontend/src/pages/JoinAsFoodSellerPage.js
// صفحة التسجيل كمتجر طعام

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  UtensilsCrossed, ShoppingBasket, Apple, Store, MapPin, 
  Phone, Clock, ArrowLeft, CheckCircle, Upload, Image
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STORE_TYPES = [
  { id: 'restaurants', name: 'مطعم', icon: UtensilsCrossed, color: 'bg-red-500', description: 'وجبات جاهزة، مطاعم، كافيهات' },
  { id: 'groceries', name: 'مواد غذائية', icon: ShoppingBasket, color: 'bg-blue-500', description: 'سوبرماركت، بقالة، مواد استهلاكية' },
  { id: 'vegetables', name: 'خضروات وفواكه', icon: Apple, color: 'bg-[#FF6B00]', description: 'خضار طازجة، فواكه، منتجات زراعية' },
];

const CITIES = [
  'دمشق', 'حلب', 'حمص', 'حماة', 'اللاذقية', 'طرطوس', 
  'دير الزور', 'الرقة', 'الحسكة', 'درعا', 'السويداء', 'القنيطرة', 'إدلب'
];

const JoinAsFoodSellerPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    store_type: '',
    name: '',
    description: '',
    phone: user?.phone || '',
    address: '',
    city: '',
    logo: '',
    cover_image: '',
    delivery_time: 30,
    minimum_order: 0,
    delivery_fee: 5000,
    free_delivery_minimum: 0,
  });

  const handleTypeSelect = (typeId) => {
    setFormData({ ...formData, store_type: typeId });
    setStep(2);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleImageUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    // Convert to base64 for simplicity
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, [field]: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!token) {
      toast({ title: "تنبيه", description: "يجب تسجيل الدخول أولاً", variant: "destructive" });
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/food/stores`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast({ 
        title: "تم التسجيل بنجاح! 🎉", 
        description: "سيتم مراجعة طلبك من قبل الإدارة" 
      });
      setStep(4); // Success step
    } catch (error) {
      toast({ 
        title: "خطأ", 
        description: error.response?.data?.detail || "حدث خطأ أثناء التسجيل", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  // Check if user is logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md w-full shadow-lg">
          <Store size={48} className="mx-auto text-[#FF6B00] mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">سجّل دخولك أولاً</h2>
          <p className="text-gray-600 mb-6">لتتمكن من إنشاء متجر طعام، يجب تسجيل الدخول أو إنشاء حساب جديد</p>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/login')}
              className="flex-1 bg-[#FF6B00] text-white py-3 rounded-xl font-bold hover:bg-[#E65000]"
            >
              تسجيل الدخول
            </button>
            <button
              onClick={() => navigate('/register')}
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200"
            >
              حساب جديد
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#E65000] to-[#FF6B00] text-white px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : navigate(-1)}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4"
          >
            <ArrowLeft size={20} />
            رجوع
          </button>
          <h1 className="text-2xl font-bold">انضم كمتجر طعام</h1>
          <p className="text-orange-100 text-sm mt-1">ابدأ ببيع منتجاتك في تريند سورية</p>
          
          {/* Progress */}
          {step < 4 && (
            <div className="flex gap-2 mt-4">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`flex-1 h-1.5 rounded-full ${s <= step ? 'bg-white' : 'bg-white/30'}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Step 1: Select Type */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4">اختر نوع متجرك</h2>
            {STORE_TYPES.map((type) => (
              <motion.button
                key={type.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleTypeSelect(type.id)}
                className="w-full bg-white rounded-xl p-4 border-2 border-gray-200 hover:border-[#FF6B00] transition-all flex items-center gap-4 text-right"
              >
                <div className={`w-14 h-14 ${type.color} rounded-xl flex items-center justify-center text-white`}>
                  <type.icon size={28} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">{type.name}</h3>
                  <p className="text-sm text-gray-500">{type.description}</p>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Step 2: Basic Info */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4">معلومات المتجر</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم المتجر *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="مثال: مطعم الشام"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">وصف المتجر</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="وصف قصير عن متجرك ومنتجاتك..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="09xxxxxxxx"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00]"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المدينة *</label>
                <select
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00]"
                  required
                >
                  <option value="">اختر المدينة</option>
                  {CITIES.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان التفصيلي *</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="الحي، الشارع، بالقرب من..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00]"
                  required
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (formData.name && formData.phone && formData.city && formData.address) {
                    setStep(3);
                  } else {
                    toast({ title: "تنبيه", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
                  }
                }}
                className="w-full bg-[#FF6B00] text-white py-3 rounded-xl font-bold hover:bg-[#E65000] transition-colors"
              >
                التالي
              </button>
            </form>
          </motion.div>
        )}

        {/* Step 3: Additional Info & Images */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4">إعدادات إضافية</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">وقت التوصيل (دقيقة)</label>
                  <input
                    type="number"
                    name="delivery_time"
                    value={formData.delivery_time}
                    onChange={handleInputChange}
                    min="10"
                    max="120"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأدنى للطلب</label>
                  <input
                    type="number"
                    name="minimum_order"
                    value={formData.minimum_order}
                    onChange={handleInputChange}
                    min="0"
                    step="1000"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00]"
                  />
                </div>
              </div>

              {/* رسوم التوصيل والتوصيل المجاني */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">رسوم التوصيل (ل.س)</label>
                  <input
                    type="number"
                    name="delivery_fee"
                    value={formData.delivery_fee}
                    onChange={handleInputChange}
                    min="0"
                    step="500"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">توصيل مجاني عند</label>
                  <input
                    type="number"
                    name="free_delivery_minimum"
                    value={formData.free_delivery_minimum}
                    onChange={handleInputChange}
                    min="0"
                    step="5000"
                    placeholder="0 = معطل"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00]"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500 -mt-2">
                اترك "توصيل مجاني عند" على 0 لتعطيل التوصيل المجاني
              </p>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">شعار المتجر</label>
                <div className="flex items-center gap-4">
                  {formData.logo ? (
                    <img src={formData.logo} alt="Logo" className="w-20 h-20 rounded-xl object-cover" />
                  ) : (
                    <div className="w-20 h-20 bg-gray-100 rounded-xl flex items-center justify-center">
                      <Store size={32} className="text-gray-400" />
                    </div>
                  )}
                  <label className="flex-1 cursor-pointer">
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center hover:border-[#FF6B00] transition-colors">
                      <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">اختر صورة الشعار</span>
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'logo')}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              {/* Cover Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">صورة الغلاف</label>
                <label className="cursor-pointer block">
                  {formData.cover_image ? (
                    <img src={formData.cover_image} alt="Cover" className="w-full h-32 rounded-xl object-cover" />
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-[#FF6B00] transition-colors">
                      <Image size={32} className="mx-auto text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">اختر صورة الغلاف (اختياري)</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'cover_image')}
                    className="hidden"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#FF6B00] text-white py-3 rounded-xl font-bold hover:bg-[#E65000] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  'إرسال الطلب'
                )}
              </button>
            </form>
          </motion.div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={40} className="text-[#FF6B00]" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">تم إرسال طلبك بنجاح! 🎉</h2>
            <p className="text-gray-600 mb-6">
              سيتم مراجعة طلبك من قبل فريق الإدارة وستصلك إشعار عند الموافقة.
              <br />
              عادةً ما تستغرق المراجعة 24-48 ساعة.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate('/')}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200"
              >
                العودة للرئيسية
              </button>
              <button
                onClick={() => navigate('/food')}
                className="flex-1 bg-[#FF6B00] text-white py-3 rounded-xl font-bold hover:bg-[#E65000]"
              >
                تصفح الطعام
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default JoinAsFoodSellerPage;
