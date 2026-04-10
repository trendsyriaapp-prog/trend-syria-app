// /app/frontend/src/pages/JoinAsFoodSellerPage.js
// صفحة التسجيل كمتجر طعام

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  UtensilsCrossed, ShoppingCart, Apple, Store, MapPin, 
  Phone, Clock, ArrowLeft, CheckCircle, Upload, Image, Cake,
  Coffee, Croissant, Beef, Milk
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { compressDocumentImage } from '../utils/imageCompression';
import GoogleMapsLocationPicker from '../components/GoogleMapsLocationPicker';

const API = process.env.REACT_APP_BACKEND_URL;

// الأنواع الرئيسية
const MAIN_TYPES = [
  { 
    id: 'food', 
    name: 'طعام', 
    icon: UtensilsCrossed, 
    color: 'bg-orange-500',
    description: 'مطاعم، كافيهات، حلويات'
  },
  { 
    id: 'market', 
    name: 'ماركت', 
    icon: ShoppingCart, 
    color: 'bg-blue-500',
    description: 'متاجر، محلات، بقالة'
  },
];

// الأصناف الفرعية حسب النوع الرئيسي
const SUB_CATEGORIES = {
  food: [
    { id: 'restaurants', name: 'وجبات سريعة', icon: '🍔', description: 'شاورما، برغر، بيتزا، سندويشات' },
    { id: 'hot_drinks', name: 'مشروبات ساخنة', icon: '☕', description: 'قهوة، شاي، نسكافيه' },
    { id: 'sweets', name: 'حلويات', icon: '🍰', description: 'حلويات شرقية وغربية، كيك' },
  ],
  market: [
    { id: 'supermarket', name: 'سوبرماركت', icon: '🛒', description: 'مواد غذائية، مستلزمات منزلية' },
    { id: 'bakery', name: 'مخابز', icon: '🥖', description: 'خبز، معجنات، فطائر' },
    { id: 'butcher', name: 'ملاحم', icon: '🍖', description: 'لحوم، دجاج، أسماك' },
    { id: 'dairy', name: 'ألبان وأجبان', icon: '🧀', description: 'حليب، لبن، أجبان' },
    { id: 'vegetables', name: 'خضار وفواكه', icon: '🥬', description: 'خضار طازجة، فواكه موسمية' },
  ]
};

// الإعدادات الافتراضية حسب النوع الرئيسي
const DEFAULT_SETTINGS = {
  food: {
    default_delivery_time: 25,
    default_minimum_order: 15000,
    default_delivery_fee: 5000,
    default_free_delivery: 50000
  },
  market: {
    default_delivery_time: 15,
    default_minimum_order: 20000,
    default_delivery_fee: 5000,
    default_free_delivery: 60000
  }
};

const CITIES = [
  'دمشق', 'حلب', 'حمص', 'حماة', 'اللاذقية', 'طرطوس', 
  'دير الزور', 'الرقة', 'الحسكة', 'درعا', 'السويداء', 'القنيطرة', 'إدلب'
];

const JoinAsFoodSellerPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(0); // تبدأ من 0 (شاشة الترحيب)
  const [loading, setLoading] = useState(false);
  const [sameHoursAllDays, setSameHoursAllDays] = useState(true);
  const [mainType, setMainType] = useState(''); // food or market
  const [selectedCategories, setSelectedCategories] = useState([]); // الأصناف المختارة
  
  // ساعات العمل الافتراضية
  const defaultWorkingHours = {
    sunday: { is_open: true, open_hour: 8, open_minute: 0, close_hour: 22, close_minute: 0 },
    monday: { is_open: true, open_hour: 8, open_minute: 0, close_hour: 22, close_minute: 0 },
    tuesday: { is_open: true, open_hour: 8, open_minute: 0, close_hour: 22, close_minute: 0 },
    wednesday: { is_open: true, open_hour: 8, open_minute: 0, close_hour: 22, close_minute: 0 },
    thursday: { is_open: true, open_hour: 8, open_minute: 0, close_hour: 22, close_minute: 0 },
    friday: { is_open: true, open_hour: 10, open_minute: 0, close_hour: 22, close_minute: 0 },
    saturday: { is_open: true, open_hour: 8, open_minute: 0, close_hour: 22, close_minute: 0 },
  };
  
  const [formData, setFormData] = useState({
    store_type: '',
    sub_categories: [],
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
    latitude: null,
    longitude: null,
    working_hours: defaultWorkingHours,
  });
  
  const DAY_NAMES = {
    sunday: 'الأحد',
    monday: 'الإثنين',
    tuesday: 'الثلاثاء',
    wednesday: 'الأربعاء',
    thursday: 'الخميس',
    friday: 'الجمعة',
    saturday: 'السبت',
  };
  
  const handleWorkingHoursChange = (day, field, value) => {
    const newHours = { ...formData.working_hours };
    newHours[day] = { ...newHours[day], [field]: value };
    
    // إذا كان "نفس الساعات لكل الأيام" مفعل، نطبق على كل الأيام
    if (sameHoursAllDays && field !== 'is_open') {
      Object.keys(newHours).forEach(d => {
        if (d !== day) {
          newHours[d] = { ...newHours[d], [field]: value };
        }
      });
    }
    
    setFormData({ ...formData, working_hours: newHours });
  };

  // اختيار النوع الرئيسي (طعام أو ماركت)
  const handleMainTypeSelect = (typeId) => {
    setMainType(typeId);
    setSelectedCategories([]);
    const defaults = DEFAULT_SETTINGS[typeId];
    setFormData({ 
      ...formData, 
      store_type: typeId,
      sub_categories: [],
      delivery_time: defaults?.default_delivery_time || 30,
      minimum_order: defaults?.default_minimum_order || 0,
      delivery_fee: defaults?.default_delivery_fee || 5000,
      free_delivery_minimum: defaults?.default_free_delivery || 0
    });
    setStep(2); // الانتقال لاختيار الأصناف (كانت 2، الآن 2 أيضاً لكن step يبدأ من 0)
  };

  // اختيار/إلغاء صنف فرعي
  const handleCategoryToggle = (categoryId) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  // تأكيد الأصناف والانتقال للخطوة التالية
  const handleCategoriesConfirm = () => {
    if (selectedCategories.length === 0) {
      toast({
        title: "اختر صنفاً واحداً على الأقل",
        description: "يجب اختيار صنف واحد على الأقل للمتابعة",
        variant: "destructive"
      });
      return;
    }
    setFormData({
      ...formData,
      sub_categories: selectedCategories
    });
    setStep(4); // الانتقال لإدخال معلومات المتجر
  };

  const handleTypeSelect = (typeId) => {
    // للتوافق مع الكود القديم
    handleMainTypeSelect(typeId);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleImageUpload = async (e, field) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // ضغط الصورة تلقائياً قبل الرفع
      const compressedImage = await compressDocumentImage(file);
      setFormData({ ...formData, [field]: compressedImage });
    } catch (error) {
      console.error('Error compressing image:', error);
      toast({
        title: "خطأ",
        description: "فشل في معالجة الصورة، يرجى المحاولة مرة أخرى",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!token) {
      toast({ title: "تنبيه", description: "يجب تسجيل الدخول أولاً", variant: "destructive" });
      navigate('/login');
      return;
    }

    // التحقق من تحديد موقع المتجر - إجباري
    if (!formData.latitude || !formData.longitude) {
      toast({ title: "تنبيه", description: "يرجى تحديد موقع المتجر على الخريطة (إجباري)", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/api/food/stores`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast({ 
        title: "تم التسجيل بنجاح! 🎉", 
        description: "سيتم مراجعة طلبك من قبل الإدارة" 
      });
      setStep(6); // Success step
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
            onClick={() => step > 0 ? setStep(step - 1) : navigate(-1)}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4"
          >
            <ArrowLeft size={20} />
            رجوع
          </button>
          <h1 className="text-2xl font-bold">{step === 0 ? 'انضم لعائلة ترند سورية' : 'انضم كمتجر طعام'}</h1>
          <p className="text-orange-100 text-sm mt-1">{step === 0 ? 'ابدأ رحلتك في عالم التجارة الإلكترونية' : 'ابدأ ببيع منتجاتك في ترند سورية'}</p>
          
          {/* Progress */}
          {step > 0 && step < 6 && (
            <div className="flex gap-2 mt-4">
              {[1, 2, 3, 4, 5].map((s) => (
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
        {/* Step 0: Welcome Screen */}
        {step === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Welcome Message */}
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-[#FF6B00] rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Store size={40} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">مرحباً بك!</h2>
              <p className="text-gray-600">اختر النوع المناسب لنشاطك التجاري</p>
            </div>

            {/* Food Type Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-5 border-2 border-orange-200"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 bg-orange-500 rounded-xl flex items-center justify-center text-white shadow">
                  <UtensilsCrossed size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-orange-800">قسم الطعام</h3>
                  <p className="text-sm text-orange-600">مطاعم، كافيهات، حلويات</p>
                </div>
              </div>
              <div className="space-y-2 mr-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="text-sm">وصول لآلاف العملاء الجائعين</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="text-sm">نظام طلبات متكامل وسهل</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="text-sm">توصيل سريع خلال 30 دقيقة</span>
                </div>
              </div>
            </motion.div>

            {/* Market Type Card */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 border-2 border-blue-200"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow">
                  <ShoppingCart size={28} />
                </div>
                <div>
                  <h3 className="font-bold text-xl text-blue-800">قسم الماركت</h3>
                  <p className="text-sm text-blue-600">متاجر، محلات، بقالة</p>
                </div>
              </div>
              <div className="space-y-2 mr-2">
                <div className="flex items-center gap-2 text-gray-700">
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="text-sm">بيع المنتجات المتنوعة (لحوم، ألبان، مخبوزات)</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="text-sm">إدارة المخزون بسهولة</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <CheckCircle size={16} className="text-green-500" />
                  <span className="text-sm">عمولة مناسبة على المبيعات</span>
                </div>
              </div>
            </motion.div>

            {/* CTA Button */}
            <button
              onClick={() => setStep(1)}
              className="w-full bg-gradient-to-l from-[#E65000] to-[#FF6B00] text-white py-4 rounded-xl font-bold text-lg hover:from-[#D14500] hover:to-[#E65000] transition-all shadow-lg"
            >
              ابدأ التسجيل الآن
            </button>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="bg-white rounded-xl p-3 text-center border border-gray-100 shadow-sm">
                <p className="text-2xl font-bold text-[#FF6B00]">+500</p>
                <p className="text-[10px] text-gray-500">متجر نشط</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center border border-gray-100 shadow-sm">
                <p className="text-2xl font-bold text-[#FF6B00]">+10K</p>
                <p className="text-[10px] text-gray-500">طلب شهرياً</p>
              </div>
              <div className="bg-white rounded-xl p-3 text-center border border-gray-100 shadow-sm">
                <p className="text-2xl font-bold text-[#FF6B00]">24/7</p>
                <p className="text-[10px] text-gray-500">دعم فني</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 1: Select Main Type (Food or Market) */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h2 className="text-lg font-bold text-gray-900 mb-4">اختر نوع متجرك</h2>
            {MAIN_TYPES.map((type) => (
              <motion.button
                key={type.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleMainTypeSelect(type.id)}
                className="w-full bg-white rounded-xl p-5 border-2 border-gray-200 hover:border-[#FF6B00] transition-all flex items-center gap-4 text-right"
              >
                <div className={`w-16 h-16 ${type.color} rounded-xl flex items-center justify-center text-white`}>
                  <type.icon size={32} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-xl text-gray-900">{type.name}</h3>
                  <p className="text-sm text-gray-500">{type.description}</p>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Step 2: Select Sub-Categories */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-2">اختر أصناف متجرك</h2>
            <p className="text-sm text-gray-500 mb-4">يمكنك اختيار أكثر من صنف</p>
            
            <div className="grid grid-cols-2 gap-3">
              {SUB_CATEGORIES[mainType]?.map((category) => (
                <motion.button
                  key={category.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleCategoryToggle(category.id)}
                  className={`bg-white rounded-xl p-4 border-2 transition-all text-center ${
                    selectedCategories.includes(category.id)
                      ? 'border-[#FF6B00] bg-orange-50 ring-2 ring-orange-200'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-4xl mb-2">{category.icon}</div>
                  <h3 className="font-bold text-gray-900 text-sm">{category.name}</h3>
                  <p className="text-[10px] text-gray-500 mt-1">{category.description}</p>
                  {selectedCategories.includes(category.id) && (
                    <div className="mt-2">
                      <CheckCircle size={20} className="mx-auto text-[#FF6B00]" />
                    </div>
                  )}
                </motion.button>
              ))}
            </div>

            {selectedCategories.length > 0 && (
              <div className="mt-4 p-3 bg-orange-50 rounded-xl border border-orange-200">
                <p className="text-sm text-orange-800">
                  <span className="font-bold">الأصناف المختارة: </span>
                  {selectedCategories.map(id => {
                    const cat = SUB_CATEGORIES[mainType]?.find(c => c.id === id);
                    return cat?.name;
                  }).join('، ')}
                </p>
              </div>
            )}

            <button
              onClick={handleCategoriesConfirm}
              disabled={selectedCategories.length === 0}
              className="w-full mt-6 bg-[#FF6B00] text-white py-3 rounded-xl font-bold hover:bg-[#E65000] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              متابعة ({selectedCategories.length} صنف مختار)
            </button>
          </motion.div>
        )}

        {/* Step 4: Basic Info */}
        {step === 4 && (
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

              {/* تحديد موقع المتجر - إجباري */}
              <GoogleMapsLocationPicker
                label="📍 موقع المتجر على الخريطة"
                required={true}
                currentLocation={formData.latitude ? { latitude: formData.latitude, longitude: formData.longitude } : null}
                onLocationSelect={(location) => {
                  if (location) {
                    setFormData({ ...formData, latitude: location.latitude, longitude: location.longitude });
                  } else {
                    setFormData({ ...formData, latitude: null, longitude: null });
                  }
                }}
              />

              <button
                type="button"
                onClick={() => {
                  if (formData.name && formData.phone && formData.city && formData.address && formData.latitude && formData.longitude) {
                    setStep(5);
                  } else if (!formData.latitude || !formData.longitude) {
                    toast({ title: "تنبيه", description: "يرجى تحديد موقع المتجر على الخريطة", variant: "destructive" });
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

        {/* Step 5: Additional Info & Images */}
        {step === 5 && (
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

              {/* ساعات العمل */}
              <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Clock size={18} className="text-[#FF6B00]" />
                    ساعات العمل *
                  </h3>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={sameHoursAllDays}
                      onChange={(e) => setSameHoursAllDays(e.target.checked)}
                      className="w-4 h-4 text-[#FF6B00] rounded"
                    />
                    <span className="text-gray-600">نفس الساعات لكل الأيام</span>
                  </label>
                </div>
                
                {sameHoursAllDays ? (
                  // عرض مبسط - ساعات موحدة
                  <div className="bg-white rounded-lg p-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm text-gray-600">من</span>
                      <select
                        value={formData.working_hours.sunday.open_hour}
                        onChange={(e) => handleWorkingHoursChange('sunday', 'open_hour', parseInt(e.target.value))}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      >
                        {[...Array(24)].map((_, i) => (
                          <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                        ))}
                      </select>
                      <span className="text-sm text-gray-600">إلى</span>
                      <select
                        value={formData.working_hours.sunday.close_hour}
                        onChange={(e) => handleWorkingHoursChange('sunday', 'close_hour', parseInt(e.target.value))}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      >
                        {[...Array(24)].map((_, i) => (
                          <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                        ))}
                      </select>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      ✓ سيتم تطبيق هذه الساعات على جميع أيام الأسبوع
                    </p>
                  </div>
                ) : (
                  // عرض تفصيلي - كل يوم على حدة
                  <div className="space-y-2">
                    {Object.entries(DAY_NAMES).map(([day, arabicName]) => (
                      <div key={day} className="bg-white rounded-lg p-3 flex items-center gap-3 flex-wrap">
                        <label className="flex items-center gap-2 min-w-[80px]">
                          <input
                            type="checkbox"
                            checked={formData.working_hours[day]?.is_open !== false}
                            onChange={(e) => handleWorkingHoursChange(day, 'is_open', e.target.checked)}
                            className="w-4 h-4 text-[#FF6B00] rounded"
                          />
                          <span className="text-sm font-medium">{arabicName}</span>
                        </label>
                        
                        {formData.working_hours[day]?.is_open !== false && (
                          <>
                            <select
                              value={formData.working_hours[day]?.open_hour || 8}
                              onChange={(e) => handleWorkingHoursChange(day, 'open_hour', parseInt(e.target.value))}
                              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                            >
                              {[...Array(24)].map((_, i) => (
                                <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                              ))}
                            </select>
                            <span className="text-gray-400">-</span>
                            <select
                              value={formData.working_hours[day]?.close_hour || 22}
                              onChange={(e) => handleWorkingHoursChange(day, 'close_hour', parseInt(e.target.value))}
                              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
                            >
                              {[...Array(24)].map((_, i) => (
                                <option key={i} value={i}>{i.toString().padStart(2, '0')}:00</option>
                              ))}
                            </select>
                          </>
                        )}
                        
                        {formData.working_hours[day]?.is_open === false && (
                          <span className="text-red-500 text-sm">مغلق</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

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

        {/* Step 6: Success */}
        {step === 6 && (
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
