// /app/frontend/src/pages/JoinAsFoodSellerPage.js
// صفحة التسجيل كمتجر طعام

import { useState, useEffect } from 'react';
import logger from '../lib/logger';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  UtensilsCrossed, ShoppingCart, Apple, Store, MapPin, 
  Phone, Clock, ArrowLeft, CheckCircle, Upload, Image, Cake,
  Coffee, Croissant, Beef, Milk, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { compressDocumentImage } from '../utils/imageCompression';
import GoogleMapsLocationPicker from '../components/GoogleMapsLocationPicker';
import AddressPickerModal from '../components/AddressPickerModal';

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

// الأصناف الفرعية الافتراضية (تُستخدم كـ fallback)
const DEFAULT_SUB_CATEGORIES = {
  food: [
    { id: 'restaurants', name: 'مطاعم', icon: '🍽️', description: 'وجبات سريعة، شاورما، برغر، بيتزا' },
    { id: 'cafes', name: 'مقاهي', icon: '☕', description: 'قهوة، شاي، مشروبات ساخنة' },
    { id: 'sweets', name: 'حلويات', icon: '🍰', description: 'حلويات شرقية وغربية، كيك' },
    { id: 'bakery', name: 'مخابز', icon: '🥖', description: 'خبز، معجنات، فطائر' },
    { id: 'drinks', name: 'مشروبات', icon: '🥤', description: 'عصائر، مشروبات باردة' },
    { id: 'food_groceries', name: 'مواد غذائية', icon: '🛒', description: 'مواد غذائية ومعلبات' },
    { id: 'vegetables', name: 'خضروات وفواكه', icon: '🥬', description: 'خضار طازجة، فواكه موسمية' },
    { id: 'dairy', name: 'ألبان وأجبان', icon: '🧀', description: 'حليب، لبن، أجبان' },
  ],
  market: [
    { id: 'food_groceries', name: 'مواد غذائية', icon: '🛒', description: 'مواد غذائية، مستلزمات منزلية' },
    { id: 'bakery', name: 'مخابز', icon: '🥖', description: 'خبز، معجنات، فطائر' },
    { id: 'dairy', name: 'ألبان وأجبان', icon: '🧀', description: 'حليب، لبن، أجبان' },
    { id: 'vegetables', name: 'خضروات وفواكه', icon: '🥬', description: 'خضار طازجة، فواكه موسمية' },
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

const JoinAsFoodSellerPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(0); // تبدأ من 0 (شاشة الترحيب)
  const [loading, setLoading] = useState(false);
  const [sameHoursAllDays, setSameHoursAllDays] = useState(true);
  const [mainType, setMainType] = useState(''); // food or market
  const [selectedCategories, setSelectedCategories] = useState([]); // الأصناف المختارة
  
  // أصناف النشاط من API
  const [businessCategories, setBusinessCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  
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
    area: '',
    street: '',
    street_number: '',
    building_number: '',
    logo: '',
    cover_image: '',
    commercial_license: '', // رخصة المحل / السجل التجاري
    delivery_time: 30,
    minimum_order: 0,
    delivery_fee: 5000,
    free_delivery_minimum: 0,
    latitude: null,
    longitude: null,
    working_hours: defaultWorkingHours,
    // حساب استلام الأرباح
    payment_account_type: 'shamcash',
    payment_account_number: '',
    payment_account_holder: '',
    payment_bank_name: '',
  });
  
  const [showAddressModal, setShowAddressModal] = useState(false);
  
  // تحقق إذا كانت الأصناف المختارة تتطلب رخصة
  const requiresLicense = () => {
    return selectedCategories.some(catId => {
      const cat = businessCategories.find(c => c.id === catId);
      return cat?.requires_license === true;
    });
  };
  
  // جلب أصناف النشاط من API
  useEffect(() => {
    const fetchCategories = async () => {
      setLoadingCategories(true);
      try {
        const res = await axios.get(`${API}/api/settings/business-categories/public?seller_type=food_seller`);
        if (res.data.categories && res.data.categories.length > 0) {
          setBusinessCategories(res.data.categories);
        }
      } catch (error) {
        logger.error('Error fetching categories:', error);
        // لا شيء - سنستخدم الأصناف الافتراضية
      } finally {
        setLoadingCategories(false);
      }
    };
    
    fetchCategories();
  }, []);
  
  // دالة للحصول على الأصناف المتاحة
  const getSubCategories = () => {
    // إذا كانت هناك أصناف من API، نستخدمها
    if (businessCategories.length > 0) {
      return businessCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        description: cat.description || ''
      }));
    }
    // خلاف ذلك نستخدم الافتراضية
    return DEFAULT_SUB_CATEGORIES[mainType] || [];
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
      logger.error('Error compressing image:', error);
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

    // التحقق من حساب استلام الأرباح
    if (!formData.payment_account_number || !formData.payment_account_holder) {
      toast({ title: "تنبيه", description: "يرجى إدخال بيانات حساب استلام الأرباح", variant: "destructive" });
      return;
    }

    if (formData.payment_account_type === 'bank_account' && !formData.payment_bank_name) {
      toast({ title: "تنبيه", description: "يرجى إدخال اسم البنك", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // إعداد بيانات حساب الدفع
      const submitData = {
        ...formData,
        payment_account: {
          type: formData.payment_account_type,
          account_number: formData.payment_account_number,
          holder_name: formData.payment_account_holder,
          bank_name: formData.payment_account_type === 'bank_account' ? formData.payment_bank_name : null
        }
      };
      
      // حذف الحقول القديمة
      delete submitData.payment_account_type;
      delete submitData.payment_account_number;
      delete submitData.payment_account_holder;
      delete submitData.payment_bank_name;
      
      await axios.post(`${API}/api/food/stores`, submitData, {
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
            
            {loadingCategories ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
              </div>
            ) : (
              <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  {getSubCategories().map((category) => (
                    <label
                      key={category.id}
                      className={`flex items-center gap-3 p-3 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors ${
                        selectedCategories.includes(category.id)
                          ? 'bg-orange-50'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(category.id)}
                        onChange={() => handleCategoryToggle(category.id)}
                        className="w-5 h-5 text-[#FF6B00] rounded border-gray-300 focus:ring-[#FF6B00]"
                      />
                      <span className="text-2xl">{category.icon}</span>
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-sm">{category.name}</p>
                        <p className="text-[10px] text-gray-500">{category.description}</p>
                      </div>
                      {selectedCategories.includes(category.id) && (
                        <CheckCircle size={18} className="text-[#FF6B00]" />
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {selectedCategories.length > 0 && (
              <div className="mt-4 p-3 bg-orange-50 rounded-xl border border-orange-200">
                <p className="text-sm text-orange-800">
                  <span className="font-bold">الأصناف المختارة: </span>
                  {selectedCategories.map(id => {
                    const cat = getSubCategories().find(c => c.id === id);
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

              {/* زر إضافة العنوان */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان *</label>
                <button
                  type="button"
                  onClick={() => setShowAddressModal(true)}
                  className={`w-full border rounded-xl px-4 py-3 text-right flex items-center justify-between transition-colors ${
                    formData.address 
                      ? 'border-green-300 bg-green-50' 
                      : 'border-gray-200 bg-white hover:border-[#FF6B00]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin size={18} className={formData.address ? 'text-green-600' : 'text-gray-400'} />
                    {formData.address ? (
                      <span className="text-gray-800">{formData.address}</span>
                    ) : (
                      <span className="text-gray-400">اضغط لإضافة العنوان</span>
                    )}
                  </div>
                  {formData.address && (
                    <CheckCircle size={18} className="text-green-600" />
                  )}
                </button>
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
                warningMessage="يجب أن تكون في موقع المطعم/المتجر عند الضغط على 'موقعي الحالي' لتسجيل الموقع الصحيح."
              />

              <button
                type="button"
                onClick={() => {
                  if (formData.name && formData.phone && formData.address && formData.latitude && formData.longitude) {
                    setStep(5);
                  } else if (!formData.latitude || !formData.longitude) {
                    toast({ title: "تنبيه", description: "يرجى تحديد موقع المتجر على الخريطة", variant: "destructive" });
                  } else if (!formData.address) {
                    toast({ title: "تنبيه", description: "يرجى إضافة العنوان", variant: "destructive" });
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

              {/* رخصة المحل / السجل التجاري - يظهر فقط إذا كانت الأصناف تتطلب رخصة */}
              {requiresLicense() && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📋 رخصة المحل / السجل التجاري *
                  </label>
                  <label className="cursor-pointer block">
                    {formData.commercial_license ? (
                      <div className="relative">
                        <img src={formData.commercial_license} alt="License" className="w-full h-40 rounded-xl object-cover" />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setFormData({ ...formData, commercial_license: '' });
                          }}
                          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-[#FF6B00] transition-colors">
                        <Upload size={32} className="mx-auto text-gray-400 mb-2" />
                        <span className="text-sm text-gray-600">اضغط لرفع صورة الرخصة</span>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'commercial_license')}
                      className="hidden"
                    />
                  </label>
                  <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                    ⚠️ الأصناف المختارة تتطلب رخصة أو سجل تجاري
                  </p>
                </div>
              )}

              {/* تعهد المسؤولية - يظهر فقط إذا لم تكن الرخصة مطلوبة */}
              {!requiresLicense() && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      className="w-5 h-5 mt-0.5 text-[#FF6B00] rounded border-gray-300 focus:ring-[#FF6B00]"
                    />
                    <span className="text-sm text-amber-800">
                      أتعهد بأنني مسؤول عن جودة المنتجات والأطعمة التي أقدمها وأنها مطابقة للمعايير الصحية
                    </span>
                  </label>
                </div>
              )}

              {/* حساب استلام الأرباح */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
                <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  💳 حساب استلام الأرباح *
                </h3>
                <p className="text-xs text-gray-500 mb-4">اختر طريقة استلام أرباحك من المبيعات</p>

                {/* اختيار نوع الحساب */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, payment_account_type: 'shamcash'})}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                      formData.payment_account_type === 'shamcash'
                        ? 'border-green-500 bg-green-100 ring-2 ring-green-200'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl block mb-1">🏦</span>
                    <span className="text-sm font-bold text-gray-900">شام كاش</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, payment_account_type: 'bank_account'})}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                      formData.payment_account_type === 'bank_account'
                        ? 'border-green-500 bg-green-100 ring-2 ring-green-200'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <span className="text-2xl block mb-1">🏛️</span>
                    <span className="text-sm font-bold text-gray-900">حساب بنكي</span>
                  </button>
                </div>

                {/* حقول شام كاش */}
                {formData.payment_account_type === 'shamcash' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">رقم شام كاش *</label>
                      <input
                        type="tel"
                        value={formData.payment_account_number}
                        onChange={(e) => setFormData({...formData, payment_account_number: e.target.value})}
                        placeholder="09XXXXXXXX"
                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                        required
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">اسم صاحب الحساب *</label>
                      <input
                        type="text"
                        value={formData.payment_account_holder}
                        onChange={(e) => setFormData({...formData, payment_account_holder: e.target.value})}
                        placeholder="الاسم كما هو مسجل في شام كاش"
                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* حقول الحساب البنكي */}
                {formData.payment_account_type === 'bank_account' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">اسم البنك *</label>
                      <input
                        type="text"
                        value={formData.payment_bank_name}
                        onChange={(e) => setFormData({...formData, payment_bank_name: e.target.value})}
                        placeholder="مثال: بنك سورية الدولي الإسلامي"
                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">رقم الحساب / IBAN *</label>
                      <input
                        type="text"
                        value={formData.payment_account_number}
                        onChange={(e) => setFormData({...formData, payment_account_number: e.target.value})}
                        placeholder="رقم الحساب البنكي"
                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                        required
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">اسم صاحب الحساب *</label>
                      <input
                        type="text"
                        value={formData.payment_account_holder}
                        onChange={(e) => setFormData({...formData, payment_account_holder: e.target.value})}
                        placeholder="الاسم كما هو مسجل في البنك"
                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !formData.payment_account_number || !formData.payment_account_holder || (formData.payment_account_type === 'bank_account' && !formData.payment_bank_name)}
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

        {/* Step 6: Success - شاشة انتظار الموافقة */}
        {step === 6 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-8"
          >
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock size={40} className="text-amber-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">تم إرسال طلبك بنجاح!</h2>
            
            {/* الرسالة الرئيسية */}
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 text-right">
              <p className="text-gray-700 leading-relaxed">
                شكراً لاهتمامك بالانضمام إلى <strong className="text-[#FF6B00]">ترند سوريا</strong>.
              </p>
              <p className="text-gray-700 leading-relaxed mt-2 font-bold">
                سيقوم أحد أعضاء فريقنا بزيارتك للتحقق من معلوماتك وتأكيد طلبك.
              </p>
              <p className="text-gray-600 mt-2">
                سنتواصل معك قريباً على رقم الهاتف المسجل.
              </p>
            </div>
            
            {/* رقم الهاتف */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-gray-500 mb-1">رقم الهاتف المسجل</p>
              <p className="text-lg font-mono font-bold text-gray-900" dir="ltr">{formData.phone || user?.phone}</p>
            </div>
            
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
      
      {/* نافذة إضافة العنوان */}
      <AddressPickerModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onSave={(addressData) => {
          setFormData({
            ...formData,
            city: addressData.city,
            area: addressData.area,
            street: addressData.street,
            street_number: addressData.street_number,
            building_number: addressData.building_number,
            address: addressData.full_address
          });
        }}
        initialAddress={{
          city: formData.city,
          area: formData.area,
          street: formData.street,
          street_number: formData.street_number,
          building_number: formData.building_number
        }}
        title="إضافة عنوان المتجر"
      />
    </div>
  );
};

export default JoinAsFoodSellerPage;
