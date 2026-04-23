// /app/frontend/src/pages/MultiStepRegister.js
// صفحة تسجيل متعددة الخطوات - جمع كل المعلومات قبل إنشاء الحساب

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  User, Phone, Lock, Eye, EyeOff, MapPin, ArrowRight, ArrowLeft,
  Store, Utensils, Bike, ShoppingBag, Camera, Upload, FileText,
  Check, Loader2, Shield, AlertCircle
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;

// المدن السورية
const SYRIAN_CITIES = [
  'دمشق', 'حلب', 'حمص', 'حماة', 'اللاذقية', 'طرطوس', 'دير الزور',
  'الرقة', 'الحسكة', 'درعا', 'السويداء', 'القنيطرة', 'إدلب', 'ريف دمشق'
];

const MultiStepRegister = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { login } = useAuth();
  
  const defaultType = searchParams.get('type') || 'buyer';
  
  // الخطوة الحالية
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // بيانات التسجيل الأساسية
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    city: 'حلب',
    user_type: defaultType,
    emergency_phone: ''
  });
  
  // بيانات البائع
  const [sellerData, setSellerData] = useState({
    business_category: '',
    business_name: '',
    national_id: null,
    commercial_reg: null,
    responsibility_accepted: false
  });
  
  // بيانات بائع الطعام
  const [foodSellerData, setFoodSellerData] = useState({
    store_name: '',
    store_name_en: '',
    business_category: '',
    description: '',
    store_logo: null,
    store_image: null,
    commercial_license: null,
    city: 'حلب',
    area: '',
    address_details: ''
  });
  
  // بيانات موظف التوصيل
  const [deliveryData, setDeliveryData] = useState({
    national_id: '',
    personal_photo: null,
    id_photo: null,
    bike_photo: null,
    fuel_type: 'بنزين',
    home_address: '',
    home_latitude: null,
    home_longitude: null
  });
  
  // بيانات OTP
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [registrationId, setRegistrationId] = useState(null);
  const otpInputsRef = useRef([]);
  
  // أصناف الأنشطة التجارية
  const [businessCategories, setBusinessCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSellerType, setShowSellerType] = useState(false);
  
  // جلب أصناف الأنشطة التجارية
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const sellerType = formData.user_type === 'food_seller' ? 'food_seller' : 'seller';
        const res = await axios.get(`${API}/api/settings/business-categories/public?seller_type=${sellerType}`);
        setBusinessCategories(res.data.categories || []);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };
    
    if (formData.user_type === 'seller' || formData.user_type === 'food_seller') {
      fetchCategories();
    }
  }, [formData.user_type]);
  
  // تحديد عدد الخطوات حسب نوع المستخدم
  const getTotalSteps = () => {
    switch (formData.user_type) {
      case 'buyer': return 2; // بيانات أساسية + OTP
      case 'seller': return 3; // بيانات أساسية + وثائق + OTP
      case 'food_seller': return 3; // بيانات أساسية + بيانات المطعم + OTP
      case 'delivery': return 3; // بيانات أساسية + وثائق + OTP
      default: return 2;
    }
  };
  
  // التحقق من صحة الخطوة الحالية
  const validateCurrentStep = () => {
    if (step === 1) {
      // التحقق من البيانات الأساسية
      const nameParts = formData.full_name.trim().split(' ').filter(p => p.length > 0);
      if (nameParts.length < 3) {
        toast({ title: "خطأ", description: "يرجى إدخال الاسم الثلاثي كاملاً", variant: "destructive" });
        return false;
      }
      if (!formData.phone || formData.phone.length < 10) {
        toast({ title: "خطأ", description: "يرجى إدخال رقم هاتف صحيح", variant: "destructive" });
        return false;
      }
      if (formData.password.length < 6) {
        toast({ title: "خطأ", description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        toast({ title: "خطأ", description: "كلمة المرور وتأكيدها غير متطابقتين", variant: "destructive" });
        return false;
      }
      return true;
    }
    
    if (step === 2 && formData.user_type === 'seller') {
      if (!sellerData.business_category) {
        toast({ title: "خطأ", description: "يرجى اختيار صنف النشاط التجاري", variant: "destructive" });
        return false;
      }
      if (!sellerData.national_id) {
        toast({ title: "خطأ", description: "يرجى رفع صورة الهوية", variant: "destructive" });
        return false;
      }
      const selectedCat = businessCategories.find(c => c.id === sellerData.business_category);
      if (selectedCat?.requires_license && !sellerData.commercial_reg) {
        toast({ title: "خطأ", description: "هذا الصنف يتطلب رخصة أو سجل تجاري", variant: "destructive" });
        return false;
      }
      if (!selectedCat?.requires_license && !sellerData.responsibility_accepted) {
        toast({ title: "خطأ", description: "يرجى الموافقة على تعهد المسؤولية", variant: "destructive" });
        return false;
      }
      return true;
    }
    
    if (step === 2 && formData.user_type === 'food_seller') {
      if (!foodSellerData.store_name.trim()) {
        toast({ title: "خطأ", description: "يرجى إدخال اسم المطعم", variant: "destructive" });
        return false;
      }
      if (!foodSellerData.business_category) {
        toast({ title: "خطأ", description: "يرجى اختيار صنف المطعم", variant: "destructive" });
        return false;
      }
      if (!foodSellerData.store_logo) {
        toast({ title: "خطأ", description: "يرجى رفع شعار المطعم", variant: "destructive" });
        return false;
      }
      return true;
    }
    
    if (step === 2 && formData.user_type === 'delivery') {
      if (!deliveryData.national_id.trim()) {
        toast({ title: "خطأ", description: "يرجى إدخال رقم الهوية", variant: "destructive" });
        return false;
      }
      if (!deliveryData.personal_photo) {
        toast({ title: "خطأ", description: "يرجى رفع صورة شخصية", variant: "destructive" });
        return false;
      }
      if (!deliveryData.id_photo) {
        toast({ title: "خطأ", description: "يرجى رفع صورة الهوية", variant: "destructive" });
        return false;
      }
      if (!deliveryData.bike_photo) {
        toast({ title: "خطأ", description: "يرجى رفع صورة المركبة", variant: "destructive" });
        return false;
      }
      return true;
    }
    
    return true;
  };
  
  // الانتقال للخطوة التالية
  const nextStep = async () => {
    if (!validateCurrentStep()) return;
    
    const totalSteps = getTotalSteps();
    
    // إذا كانت الخطوة الأخيرة قبل OTP
    if (step === totalSteps - 1) {
      await sendOTP();
    } else {
      setStep(step + 1);
    }
  };
  
  // الرجوع للخطوة السابقة
  const prevStep = () => {
    if (otpSent) {
      setOtpSent(false);
      setOtp(['', '', '', '', '', '']);
    } else if (step > 1) {
      setStep(step - 1);
    }
  };
  
  // إرسال OTP
  const sendOTP = async () => {
    setOtpLoading(true);
    try {
      const res = await axios.post(`${API}/api/auth/send-registration-otp`, {
        phone: formData.phone,
        full_name: formData.full_name
      });
      
      setRegistrationId(res.data.registration_id);
      setOtpSent(true);
      setStep(getTotalSteps());
      toast({ 
        title: "تم إرسال رمز التحقق", 
        description: "تم إرسال رمز التحقق إلى WhatsApp" 
      });
    } catch (error) {
      const msg = error.response?.data?.detail || "فشل إرسال رمز التحقق";
      toast({ title: "خطأ", description: msg, variant: "destructive" });
    } finally {
      setOtpLoading(false);
    }
  };
  
  // التحقق من OTP وإنشاء الحساب
  const verifyOTPAndRegister = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast({ title: "خطأ", description: "يرجى إدخال رمز التحقق كاملاً", variant: "destructive" });
      return;
    }
    
    setLoading(true);
    try {
      // تجميع كل البيانات
      const registrationData = {
        registration_id: registrationId,
        otp: otpCode,
        ...formData,
        seller_data: formData.user_type === 'seller' ? sellerData : null,
        food_seller_data: formData.user_type === 'food_seller' ? foodSellerData : null,
        delivery_data: formData.user_type === 'delivery' ? deliveryData : null
      };
      
      const res = await axios.post(`${API}/api/auth/verify-registration-otp`, registrationData, {
        withCredentials: true
      });
      
      // حفظ بيانات المستخدم
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      toast({ title: "تم التسجيل بنجاح", description: "مرحباً بك في ترند سورية" });
      
      // تحديث الـ context وتوجيه المستخدم
      await login(formData.phone, formData.password, true);
      
      // توجيه حسب نوع المستخدم
      if (formData.user_type === 'buyer') {
        navigate('/', { replace: true });
      } else {
        // البائعين والتوصيل يذهبون لصفحة انتظار الموافقة
        navigate('/pending-approval', { replace: true });
      }
    } catch (error) {
      const msg = error.response?.data?.detail || "فشل التحقق من الرمز";
      toast({ title: "خطأ", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  
  // معالجة تغيير OTP
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };
  
  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };
  
  // رفع الصور
  const handleImageUpload = async (file, setter, fieldName) => {
    if (!file) return;
    
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    
    try {
      const res = await axios.post(`${API}/api/upload/image`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (typeof setter === 'function') {
        setter(res.data.url);
      } else if (fieldName) {
        // للـ objects المتعددة
        if (fieldName.startsWith('seller_')) {
          setSellerData(prev => ({ ...prev, [fieldName.replace('seller_', '')]: res.data.url }));
        } else if (fieldName.startsWith('food_')) {
          setFoodSellerData(prev => ({ ...prev, [fieldName.replace('food_', '')]: res.data.url }));
        } else if (fieldName.startsWith('delivery_')) {
          setDeliveryData(prev => ({ ...prev, [fieldName.replace('delivery_', '')]: res.data.url }));
        }
      }
      
      toast({ title: "تم", description: "تم رفع الصورة بنجاح" });
    } catch (error) {
      toast({ title: "خطأ", description: "فشل رفع الصورة", variant: "destructive" });
    }
  };
  
  // مكون رفع الصور
  const ImageUploader = ({ label, value, onChange, icon: Icon = Camera }) => (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div 
        className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all
          ${value ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-[#FF6B00]'}`}
        onClick={() => document.getElementById(`upload-${label}`)?.click()}
      >
        {value ? (
          <div className="relative">
            <img src={value} alt={label} className="w-full h-32 object-cover rounded-lg" />
            <div className="absolute top-2 right-2 bg-green-500 text-white p-1 rounded-full">
              <Check size={16} />
            </div>
          </div>
        ) : (
          <div className="py-4">
            <Icon className="w-10 h-10 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-500">اضغط لرفع الصورة</p>
          </div>
        )}
        <input
          id={`upload-${label}`}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onChange(file);
          }}
        />
      </div>
    </div>
  );
  
  // عرض اختيار نوع الحساب - شريط التبويبات
  const renderAccountTypeSelection = () => (
    <div className="space-y-4">
      {/* شريط التبويبات - 3 خيارات */}
      <div className="bg-gray-100 rounded-full p-1 flex">
        <button
          type="button"
          data-testid="account-type-delivery"
          onClick={() => {
            setFormData({ ...formData, user_type: 'delivery' });
            setShowSellerType(false);
          }}
          className={`flex-1 py-3 px-2 rounded-full text-sm font-medium transition-all ${
            formData.user_type === 'delivery' 
              ? 'bg-[#FF6B00] text-white' 
              : 'text-gray-500'
          }`}
        >
          موظف توصيل
        </button>
        
        <button
          type="button"
          data-testid="account-type-seller"
          onClick={() => setShowSellerType(true)}
          className={`flex-1 py-3 px-2 rounded-full text-sm font-medium transition-all ${
            formData.user_type === 'seller' || formData.user_type === 'food_seller'
              ? 'bg-[#FF6B00] text-white' 
              : 'text-gray-500'
          }`}
        >
          بائع
        </button>
        
        <button
          type="button"
          data-testid="account-type-buyer"
          onClick={() => {
            setFormData({ ...formData, user_type: 'buyer' });
            setShowSellerType(false);
          }}
          className={`flex-1 py-3 px-2 rounded-full text-sm font-medium transition-all ${
            formData.user_type === 'buyer' 
              ? 'bg-[#FF6B00] text-white' 
              : 'text-gray-500'
          }`}
        >
          مشتري
        </button>
      </div>
      
      {/* اختيار نوع البائع */}
      <AnimatePresence>
        {showSellerType && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-gray-50 rounded-xl p-4 space-y-3"
          >
            <p className="text-sm text-gray-600 text-center">اختر نوع البيع</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                data-testid="seller-type-products"
                onClick={() => {
                  setFormData({ ...formData, user_type: 'seller' });
                  setShowSellerType(false);
                }}
                className={`p-3 rounded-xl border-2 bg-white ${
                  formData.user_type === 'seller' ? 'border-[#FF6B00]' : 'border-gray-200'
                }`}
              >
                <Store className="w-6 h-6 mx-auto mb-1 text-[#FF6B00]" />
                <p className="text-xs font-medium">بائع منتجات</p>
              </button>
              <button
                type="button"
                data-testid="seller-type-food"
                onClick={() => {
                  setFormData({ ...formData, user_type: 'food_seller' });
                  setShowSellerType(false);
                }}
                className={`p-3 rounded-xl border-2 bg-white ${
                  formData.user_type === 'food_seller' ? 'border-[#FF6B00]' : 'border-gray-200'
                }`}
              >
                <Utensils className="w-6 h-6 mx-auto mb-1 text-[#FF6B00]" />
                <p className="text-xs font-medium">مطعم / طعام</p>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
  
  // الخطوة 1: البيانات الأساسية
  const renderStep1 = () => (
    <div className="space-y-4">
      {/* نوع الحساب */}
      {renderAccountTypeSelection()}
      
      {/* الاسم الثلاثي */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700">الاسم الثلاثي *</label>
        <div className="relative">
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 pr-12 focus:border-[#FF6B00] focus:outline-none"
            placeholder="الاسم الأول الأب العائلة"
            required
          />
          <User size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </div>
      
      {/* رقم الهاتف */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700">رقم الهاتف *</label>
        <div className="relative">
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 pr-12 focus:border-[#FF6B00] focus:outline-none"
            placeholder="09xxxxxxxx"
            required
          />
          <Phone size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </div>
      
      {/* كلمة المرور */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700">كلمة المرور *</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 pr-12 focus:border-[#FF6B00] focus:outline-none"
            placeholder="******"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
          <Lock size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </div>
      
      {/* تأكيد كلمة المرور */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700">تأكيد كلمة المرور *</label>
        <div className="relative">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 pr-12 focus:border-[#FF6B00] focus:outline-none"
            placeholder="******"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          >
            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
          <Lock size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
        </div>
      </div>
      
      {/* المدينة - للمشترين فقط */}
      {formData.user_type === 'buyer' && (
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">المدينة *</label>
          <div className="relative">
            <select
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 pr-12 focus:border-[#FF6B00] focus:outline-none appearance-none"
            >
              {SYRIAN_CITIES.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <MapPin size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </div>
      )}
    </div>
  );
  
  // الخطوة 2: بيانات البائع
  const renderSellerStep = () => (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-xl p-3 mb-4">
        <p className="text-sm text-blue-700 text-center">
          📋 أكمل بيانات نشاطك التجاري للمراجعة
        </p>
      </div>
      
      {/* صنف النشاط */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700">صنف النشاط التجاري *</label>
        {loadingCategories ? (
          <div className="flex justify-center py-4">
            <Loader2 className="animate-spin text-[#FF6B00]" size={24} />
          </div>
        ) : (
          <select
            value={sellerData.business_category}
            onChange={(e) => {
              const cat = businessCategories.find(c => c.id === e.target.value);
              setSellerData({ 
                ...sellerData, 
                business_category: e.target.value,
                business_name: cat?.name || ''
              });
            }}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 focus:border-[#FF6B00] focus:outline-none"
          >
            <option value="">-- اختر الصنف --</option>
            {businessCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
            ))}
          </select>
        )}
      </div>
      
      {/* صورة الهوية */}
      <ImageUploader
        label="صورة الهوية / إخراج القيد *"
        value={sellerData.national_id}
        onChange={(file) => handleImageUpload(file, null, 'seller_national_id')}
        icon={FileText}
      />
      
      {/* السجل التجاري - إذا كان مطلوباً */}
      {businessCategories.find(c => c.id === sellerData.business_category)?.requires_license && (
        <ImageUploader
          label="السجل التجاري / رخصة المحل *"
          value={sellerData.commercial_reg}
          onChange={(file) => handleImageUpload(file, null, 'seller_commercial_reg')}
          icon={FileText}
        />
      )}
      
      {/* تعهد المسؤولية - إذا لم يكن مطلوباً رخصة */}
      {sellerData.business_category && !businessCategories.find(c => c.id === sellerData.business_category)?.requires_license && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={sellerData.responsibility_accepted}
              onChange={(e) => setSellerData({ ...sellerData, responsibility_accepted: e.target.checked })}
              className="w-5 h-5 mt-0.5 rounded border-gray-300 text-[#FF6B00] focus:ring-[#FF6B00]"
            />
            <div>
              <p className="text-sm font-medium text-amber-800">تعهد بالمسؤولية الكاملة</p>
              <p className="text-xs text-amber-600 mt-1">
                أتعهد بأنني المسؤول الوحيد عن المنتجات التي سأبيعها، وأن جميع المنتجات أصلية وقانونية.
              </p>
            </div>
          </label>
        </div>
      )}
    </div>
  );
  
  // الخطوة 2: بيانات بائع الطعام
  const renderFoodSellerStep = () => (
    <div className="space-y-4">
      <div className="bg-orange-50 rounded-xl p-3 mb-4">
        <p className="text-sm text-orange-700 text-center">
          🍔 أكمل بيانات مطعمك للمراجعة
        </p>
      </div>
      
      {/* اسم المطعم */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700">اسم المطعم *</label>
        <input
          type="text"
          value={foodSellerData.store_name}
          onChange={(e) => setFoodSellerData({ ...foodSellerData, store_name: e.target.value })}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 focus:border-[#FF6B00] focus:outline-none"
          placeholder="مثال: مطعم الشام"
        />
      </div>
      
      {/* صنف المطعم */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700">صنف المطعم *</label>
        {loadingCategories ? (
          <div className="flex justify-center py-4">
            <Loader2 className="animate-spin text-[#FF6B00]" size={24} />
          </div>
        ) : (
          <select
            value={foodSellerData.business_category}
            onChange={(e) => setFoodSellerData({ ...foodSellerData, business_category: e.target.value })}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 focus:border-[#FF6B00] focus:outline-none"
          >
            <option value="">-- اختر الصنف --</option>
            {businessCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
            ))}
          </select>
        )}
      </div>
      
      {/* شعار المطعم */}
      <ImageUploader
        label="شعار المطعم (Logo) *"
        value={foodSellerData.store_logo}
        onChange={(file) => handleImageUpload(file, null, 'food_store_logo')}
        icon={Camera}
      />
      
      {/* صورة المطعم */}
      <ImageUploader
        label="صورة المطعم / الواجهة"
        value={foodSellerData.store_image}
        onChange={(file) => handleImageUpload(file, null, 'food_store_image')}
        icon={Camera}
      />
    </div>
  );
  
  // الخطوة 2: بيانات موظف التوصيل
  const renderDeliveryStep = () => (
    <div className="space-y-4">
      <div className="bg-green-50 rounded-xl p-3 mb-4">
        <p className="text-sm text-green-700 text-center">
          🚴 أكمل بياناتك للانضمام كموظف توصيل
        </p>
      </div>
      
      {/* رقم الهوية */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700">رقم الهوية *</label>
        <input
          type="text"
          value={deliveryData.national_id}
          onChange={(e) => setDeliveryData({ ...deliveryData, national_id: e.target.value })}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 focus:border-[#FF6B00] focus:outline-none"
          placeholder="رقم الهوية الوطنية"
        />
      </div>
      
      {/* صورة شخصية */}
      <ImageUploader
        label="صورة شخصية حديثة *"
        value={deliveryData.personal_photo}
        onChange={(file) => handleImageUpload(file, null, 'delivery_personal_photo')}
        icon={User}
      />
      
      {/* صورة الهوية */}
      <ImageUploader
        label="صورة الهوية *"
        value={deliveryData.id_photo}
        onChange={(file) => handleImageUpload(file, null, 'delivery_id_photo')}
        icon={FileText}
      />
      
      {/* صورة المركبة */}
      <ImageUploader
        label="صورة المركبة (دراجة/سيارة) *"
        value={deliveryData.bike_photo}
        onChange={(file) => handleImageUpload(file, null, 'delivery_bike_photo')}
        icon={Bike}
      />
      
      {/* نوع الوقود */}
      <div>
        <label className="block text-sm font-medium mb-2 text-gray-700">نوع الوقود *</label>
        <select
          value={deliveryData.fuel_type}
          onChange={(e) => setDeliveryData({ ...deliveryData, fuel_type: e.target.value })}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 focus:border-[#FF6B00] focus:outline-none"
        >
          <option value="بنزين">بنزين</option>
          <option value="مازوت">مازوت</option>
          <option value="كهرباء">كهرباء</option>
          <option value="دراجة هوائية">دراجة هوائية</option>
        </select>
      </div>
    </div>
  );
  
  // شاشة OTP
  const renderOTPStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-800">التحقق من رقم الهاتف</h3>
        <p className="text-sm text-gray-500 mt-2">
          تم إرسال رمز التحقق إلى WhatsApp
        </p>
        <p className="text-[#FF6B00] font-medium mt-1" dir="ltr">{formData.phone}</p>
      </div>
      
      {/* حقول OTP */}
      <div className="flex justify-center gap-2" dir="ltr">
        {otp.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (otpInputsRef.current[index] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleOtpChange(index, e.target.value)}
            onKeyDown={(e) => handleOtpKeyDown(index, e)}
            className="w-12 h-14 text-center text-xl font-bold border-2 rounded-xl focus:border-[#FF6B00] focus:outline-none"
          />
        ))}
      </div>
      
      <div className="text-center">
        <p className="text-xs text-gray-400">
          🧪 وضع الاختبار: استخدم الرمز <span className="font-bold text-[#FF6B00]">123456</span>
        </p>
      </div>
      
      <button
        onClick={verifyOTPAndRegister}
        disabled={loading || otp.join('').length !== 6}
        className="w-full py-3.5 bg-gradient-to-r from-[#FF6B00] to-[#FF8533] text-white rounded-xl font-bold disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="animate-spin mx-auto" size={24} />
        ) : (
          'تأكيد وإنشاء الحساب'
        )}
      </button>
      
      <button
        onClick={sendOTP}
        disabled={otpLoading}
        className="w-full py-2 text-[#FF6B00] text-sm"
      >
        {otpLoading ? 'جاري الإرسال...' : 'إعادة إرسال الرمز'}
      </button>
    </div>
  );
  
  // عرض الخطوة الحالية
  const renderCurrentStep = () => {
    if (otpSent) {
      return renderOTPStep();
    }
    
    switch (step) {
      case 1:
        return renderStep1();
      case 2:
        if (formData.user_type === 'seller') return renderSellerStep();
        if (formData.user_type === 'food_seller') return renderFoodSellerStep();
        if (formData.user_type === 'delivery') return renderDeliveryStep();
        return null;
      default:
        return null;
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-8 bg-gray-50" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <img 
            src="/images/logo.png" 
            alt="ترند سوريا" 
            className="w-16 h-16 object-contain mx-auto mb-3 rounded-2xl"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/icons/icon-192.png';
            }}
          />
          <h1 className="text-xl font-bold text-gray-900">إنشاء حساب جديد</h1>
          
          {/* Progress indicator */}
          {!otpSent && (
            <div className="flex items-center justify-center gap-2 mt-4">
              {Array.from({ length: getTotalSteps() }).map((_, i) => (
                <div
                  key={i}
                  className={`h-2 rounded-full transition-all ${
                    i + 1 === step ? 'w-8 bg-[#FF6B00]' : 
                    i + 1 < step ? 'w-4 bg-green-500' : 'w-4 bg-gray-200'
                  }`}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Form */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <AnimatePresence mode="wait">
            <motion.div
              key={otpSent ? 'otp' : step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderCurrentStep()}
            </motion.div>
          </AnimatePresence>
          
          {/* Navigation buttons */}
          {!otpSent && (
            <div className="flex gap-3 mt-6">
              {step > 1 && (
                <button
                  onClick={prevStep}
                  className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium flex items-center justify-center gap-2"
                >
                  <ArrowRight size={18} />
                  السابق
                </button>
              )}
              
              <button
                onClick={nextStep}
                disabled={loading || otpLoading}
                className={`flex-1 py-3 bg-gradient-to-r from-[#FF6B00] to-[#FF8533] text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50`}
              >
                {otpLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : step === getTotalSteps() - 1 ? (
                  'إرسال رمز التحقق'
                ) : (
                  <>
                    التالي
                    <ArrowLeft size={18} />
                  </>
                )}
              </button>
            </div>
          )}
          
          {/* Back button for OTP */}
          {otpSent && (
            <button
              onClick={prevStep}
              className="w-full py-2 text-gray-500 text-sm mt-4 flex items-center justify-center gap-2"
            >
              <ArrowRight size={16} />
              العودة لتعديل البيانات
            </button>
          )}
        </div>
        
        {/* Login link */}
        <p className="text-center text-gray-500 text-sm mt-6">
          لديك حساب؟{' '}
          <button onClick={() => navigate('/login')} className="text-[#FF6B00] font-medium">
            تسجيل الدخول
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default MultiStepRegister;
