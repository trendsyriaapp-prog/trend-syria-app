import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Phone, User, AlertCircle, CheckCircle, KeyRound, Smartphone, Shield, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import axios from 'axios';
import logger from '../lib/logger';

const API = process.env.REACT_APP_BACKEND_URL;
const CITIES = ['دمشق', 'حلب', 'حمص', 'اللاذقية', 'طرطوس', 'حماة', 'دير الزور', 'الرقة', 'الحسكة', 'درعا', 'السويداء', 'إدلب', 'القنيطرة'];

// دالة للحصول على معرف الجهاز (بدون @capacitor/device)
const getDeviceId = async () => {
  try {
    // محاولة استخدام Capacitor Device إذا كان متاحاً (في التطبيق)
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Device) {
      const info = await window.Capacitor.Plugins.Device.getId();
      return info.identifier || info.uuid || `app-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
  } catch (error) {
    logger.log('Capacitor Device not available, using fallback');
  }
  
  // Fallback للويب
  let deviceId = localStorage.getItem('device_id');
  if (!deviceId) {
    deviceId = `web-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('device_id', deviceId);
  }
  return deviceId;
};

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({ phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // حالة OTP للجهاز الجديد
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otpData, setOtpData] = useState({ phone: '', device_id: '', expires_in: 600 });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const otpInputsRef = useRef([]);

  // مؤقت إعادة الإرسال
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // الحصول على معرف الجهاز
      const deviceId = await getDeviceId();
      
      const response = await axios.post(`${API}/api/auth/login`, {
        phone: formData.phone,
        password: formData.password,
        device_id: deviceId
      });
      
      // التحقق إذا كان يحتاج OTP
      if (response.data.requires_otp) {
        setOtpData({
          phone: response.data.phone,
          device_id: deviceId,
          expires_in: response.data.otp_expires_in
        });
        setShowOtpScreen(true);
        setResendTimer(60);
        toast({
          title: "جهاز جديد",
          description: "تم إرسال رمز التحقق إلى WhatsApp"
        });
        return;
      }
      
      // تسجيل دخول ناجح بدون OTP
      await completeLogin(response.data);
      
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "رقم الهاتف أو كلمة المرور غير صحيحة",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length > 1) return;
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    
    // الانتقال للحقل التالي تلقائياً
    if (value && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const verifyOtp = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast({ title: "خطأ", description: "يرجى إدخال رمز التحقق كاملاً", variant: "destructive" });
      return;
    }

    setOtpLoading(true);
    try {
      const response = await axios.post(`${API}/api/auth/verify-device-otp`, {
        phone: formData.phone,
        otp: otpCode,
        device_id: otpData.device_id,
        device_name: navigator.userAgent.includes('Mobile') ? 'هاتف' : 'كمبيوتر'
      });
      
      toast({ title: "تم التحقق", description: "تم التحقق من الجهاز بنجاح" });
      await completeLogin(response.data);
      
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "رمز التحقق غير صحيح",
        variant: "destructive"
      });
      setOtp(['', '', '', '', '', '']);
      otpInputsRef.current[0]?.focus();
    } finally {
      setOtpLoading(false);
    }
  };

  const resendOtp = async () => {
    if (resendTimer > 0) return;
    
    try {
      await axios.post(`${API}/api/auth/resend-device-otp?phone=${formData.phone}&device_id=${otpData.device_id}`);
      setResendTimer(60);
      toast({ title: "تم", description: "تم إرسال رمز التحقق مرة أخرى" });
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل إعادة الإرسال",
        variant: "destructive"
      });
    }
  };

  const completeLogin = async (data) => {
    // 🔒 النظام يستخدم httpOnly cookies - لا نحفظ token في localStorage
    // الـ cookies تُدار تلقائياً من الخادم
    localStorage.setItem('user', JSON.stringify(data.user));
    
    // تحديث Context
    await login(formData.phone, formData.password, true); // skipApi = true
    
    toast({ title: "مرحباً بك!", description: "تم تسجيل الدخول بنجاح" });
    
    // توجيه حسب نوع المستخدم
    const userType = data.user?.user_type;
    const isApproved = data.user?.is_approved;
    
    if (userType === 'admin' || userType === 'sub_admin') {
      navigate('/admin', { replace: true });
    } else if (userType === 'seller') {
      // إذا لم يكن معتمداً، وجّه لصفحة رفع الوثائق
      if (!isApproved) {
        navigate('/seller/documents', { replace: true });
      } else {
        navigate('/seller/dashboard', { replace: true });
      }
    } else if (userType === 'food_seller') {
      // إذا لم يكن معتمداً، وجّه لصفحة رفع الوثائق
      if (!isApproved) {
        navigate('/seller/documents', { replace: true });
      } else {
        navigate('/food/dashboard', { replace: true });
      }
    } else if (userType === 'delivery') {
      // إذا لم يكن معتمداً، وجّه لصفحة رفع الوثائق
      if (!isApproved) {
        navigate('/delivery/documents', { replace: true });
      } else {
        navigate('/delivery/dashboard', { replace: true });
      }
    } else {
      navigate('/', { replace: true });
    }
  };

  // شاشة OTP
  if (showOtpScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-[#FF6B00]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield size={40} className="text-[#FF6B00]" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">التحقق من الجهاز</h1>
            <p className="text-gray-500 mt-2">
              تم اكتشاف جهاز جديد. أدخل رمز التحقق المرسل إلى WhatsApp
            </p>
            <p className="text-sm text-[#FF6B00] font-medium mt-1">{otpData.phone}</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            {/* حقول OTP */}
            <div className="flex justify-center gap-2 mb-6" dir="ltr">
              {otp.map((digit, otpIndex) => (
                <input
                  key={`otp-input-${otpIndex}`}
                  ref={(el) => (otpInputsRef.current[otpIndex] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(otpIndex, e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => handleOtpKeyDown(otpIndex, e)}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 transition-colors"
                />
              ))}
            </div>

            {/* زر التحقق */}
            <button
              onClick={verifyOtp}
              disabled={otpLoading || otp.join('').length !== 6}
              className="w-full bg-[#FF6B00] text-white py-3 rounded-xl font-bold hover:bg-[#E65000] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {otpLoading ? (
                <RefreshCw size={20} className="animate-spin" />
              ) : (
                <>
                  <CheckCircle size={20} />
                  تأكيد
                </>
              )}
            </button>

            {/* إعادة الإرسال */}
            <div className="text-center mt-4">
              {resendTimer > 0 ? (
                <p className="text-sm text-gray-500">
                  إعادة الإرسال بعد <span className="font-bold text-[#FF6B00]">{resendTimer}</span> ثانية
                </p>
              ) : (
                <button
                  onClick={resendOtp}
                  className="text-sm text-[#FF6B00] font-medium hover:underline"
                >
                  إعادة إرسال الرمز
                </button>
              )}
            </div>

            {/* زر الرجوع */}
            <button
              onClick={() => {
                setShowOtpScreen(false);
                setOtp(['', '', '', '', '', '']);
              }}
              className="w-full mt-4 text-gray-500 text-sm hover:text-gray-700"
            >
              ← العودة لتسجيل الدخول
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <img 
            src="/images/logo.png" 
            alt="ترند سوريا" 
            className="w-20 h-20 object-contain mx-auto mb-4 rounded-2xl"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/icons/icon-192.png';
            }}
          />
          <h1 className="text-2xl font-bold text-gray-900">تسجيل الدخول</h1>
          <p className="text-gray-500 mt-2">مرحباً بعودتك إلى ترند سورية</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">رقم الهاتف</label>
              <div className="relative">
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-3 px-4 pr-12 text-gray-900 placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none transition-colors"
                  placeholder="09xxxxxxxx"
                  required
                  data-testid="phone-input"
                />
                <Phone size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">كلمة المرور</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-3 px-4 pl-12 text-gray-900 placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none transition-colors"
                  placeholder="••••••••"
                  required
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            onClick={handleSubmit}
            className="w-full bg-[#FF6B00] text-white font-bold py-3 rounded-full mt-6 hover:bg-[#E65000] disabled:opacity-50 transition-colors cursor-pointer"
            data-testid="login-submit-btn"
          >
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>

          <div className="text-center mt-4">
            <Link 
              to="/forgot-password" 
              className="text-sm text-gray-500 hover:text-[#FF6B00] transition-colors"
              data-testid="forgot-password-link"
            >
              نسيت كلمة المرور؟
            </Link>
          </div>

          <p className="text-center text-gray-500 mt-3">
            ليس لديك حساب؟{' '}
            <Link to="/register" className="text-[#FF6B00] hover:underline font-medium" data-testid="register-link">
              إنشاء حساب
            </Link>
          </p>
        </form>

      </motion.div>
    </div>
  );
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register } = useAuth();
  const { toast } = useToast();

  const defaultType = searchParams.get('type') || 'buyer';

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    city: 'دمشق',
    user_type: defaultType,
    emergency_phone: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSellerType, setShowSellerType] = useState(false);
  
  // حالات OTP الجديدة
  const [step, setStep] = useState(1); // 1: بيانات, 2: OTP
  const [otpSent, setOtpSent] = useState(false);
  const [registrationId, setRegistrationId] = useState(null);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const otpInputsRef = useRef([]);

  // تحميل مسبق للصفحات التالية عند فتح صفحة التسجيل
  useEffect(() => {
    // تحميل صفحات البائع والتوصيل مسبقاً
    const timer = setTimeout(() => {
      import('./SellerPages').catch(() => {});
      import('./DeliveryPages').catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // عند الضغط على "بائع"، نظهر خيارات نوع البيع (بدون اختيار افتراضي)
  const handleSellerClick = () => {
    // إظهار خيارات نوع البيع فقط، بدون تعيين نوع افتراضي
    setShowSellerType(true);
    // إذا لم يكن نوع البائع محدد مسبقاً، لا نعين شيء
    if (formData.user_type !== 'seller' && formData.user_type !== 'food_seller') {
      setFormData({ ...formData, user_type: '' }); // لا شيء مختار
    }
  };

  // اختيار نوع البيع
  const selectSellerType = (type) => {
    setFormData({ ...formData, user_type: type });
    setShowSellerType(false);
  };
  
  // التحقق من إظهار حقول التسجيل
  const shouldShowRegistrationFields = () => {
    // للمشتري وموظف التوصيل: نظهر الحقول مباشرة
    if (formData.user_type === 'buyer' || formData.user_type === 'delivery') {
      return true;
    }
    // للبائعين: نظهر الحقول فقط بعد اختيار نوع البيع
    if (formData.user_type === 'seller' || formData.user_type === 'food_seller') {
      return !showSellerType; // الحقول تظهر فقط بعد إغلاق قائمة الاختيار
    }
    // إذا لم يتم اختيار نوع الحساب بعد
    return false;
  };

  // التحقق من البيانات الأساسية
  const validateForm = () => {
    const nameParts = formData.full_name.trim().split(' ').filter(p => p.length > 0);
    if (nameParts.length < 3) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال الاسم الثلاثي كاملاً",
        variant: "destructive"
      });
      return false;
    }

    if (!formData.phone || formData.phone.length < 10) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رقم هاتف صحيح",
        variant: "destructive"
      });
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "خطأ",
        description: "كلمة المرور وتأكيدها غير متطابقتين",
        variant: "destructive"
      });
      return false;
    }

    if (formData.password.length < 6) {
      toast({
        title: "خطأ",
        description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  // إرسال OTP
  const sendOTP = async (e) => {
    e?.preventDefault();
    if (!validateForm()) return;

    setOtpLoading(true);
    try {
      const res = await axios.post(`${API}/api/auth/send-registration-otp`, {
        phone: formData.phone,
        full_name: formData.full_name
      });
      
      setRegistrationId(res.data.registration_id);
      setOtpSent(true);
      setStep(2);
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

  // التحقق من OTP فقط (للبائعين وموظفي التوصيل)
  const verifyOTPOnly = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast({ title: "خطأ", description: "يرجى إدخال رمز التحقق كاملاً", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // التحقق من OTP فقط بدون إنشاء الحساب
      await axios.post(`${API}/api/auth/verify-otp-only`, {
        registration_id: registrationId,
        otp: otpCode,
        phone: formData.phone
      });
      
      // حفظ بيانات التسجيل مؤقتاً للاستخدام في صفحة الوثائق
      const pendingRegistration = {
        registration_id: registrationId,
        full_name: formData.full_name,
        phone: formData.phone,
        password: formData.password,
        city: formData.city,
        user_type: formData.user_type
      };
      sessionStorage.setItem('pending_registration', JSON.stringify(pendingRegistration));
      
      toast({ title: "تم التحقق بنجاح", description: "أكمل بياناتك لإنشاء الحساب" });
      
      // توجيه لصفحة الوثائق حسب نوع المستخدم
      if (formData.user_type === 'seller') {
        navigate('/seller/documents', { replace: true });
      } else if (formData.user_type === 'food_seller') {
        navigate('/join/food-seller', { replace: true });
      } else if (formData.user_type === 'delivery') {
        navigate('/delivery/documents', { replace: true });
      }
    } catch (error) {
      const msg = error.response?.data?.detail || "رمز التحقق غير صحيح";
      toast({ title: "خطأ", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // التحقق من OTP وإنشاء الحساب (للمشترين فقط)
  const verifyOTPAndRegister = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      toast({ title: "خطأ", description: "يرجى إدخال رمز التحقق كاملاً", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const registrationData = {
        registration_id: registrationId,
        otp: otpCode,
        ...formData
      };
      
      const res = await axios.post(`${API}/api/auth/verify-registration-otp`, registrationData, {
        withCredentials: true
      });
      
      localStorage.setItem('user', JSON.stringify(res.data.user));
      toast({ title: "تم التسجيل بنجاح", description: "مرحباً بك في ترند سورية" });
      
      // المشتري يذهب للصفحة الرئيسية مباشرة
      navigate('/', { replace: true });
    } catch (error) {
      const msg = error.response?.data?.detail || "فشل التحقق من الرمز";
      toast({ title: "خطأ", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // العودة للخطوة السابقة
  const goBack = () => {
    setOtpSent(false);
    setOtp(['', '', '', '', '', '']);
    setStep(1);
  };

  // شاشة OTP
  if (step === 2 && otpSent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 py-10 bg-gray-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <img 
              src="/images/logo.png" 
              alt="ترند سوريا" 
              className="w-20 h-20 object-contain mx-auto mb-4 rounded-2xl"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/icons/icon-192.png';
              }}
            />
            <h1 className="text-2xl font-bold text-gray-900">التحقق من رقم الهاتف</h1>
            <p className="text-gray-500 mt-2">تم إرسال رمز التحقق إلى WhatsApp</p>
            <p className="text-[#FF6B00] font-medium mt-1" dir="ltr">{formData.phone}</p>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
            {/* حقول OTP */}
            <div className="flex justify-center gap-2 mb-6" dir="ltr">
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
                  data-testid={`otp-input-${index}`}
                />
              ))}
            </div>

            <div className="text-center mb-6">
              <p className="text-xs text-gray-400">
                🧪 وضع الاختبار: استخدم الرمز <span className="font-bold text-[#FF6B00]">123456</span>
              </p>
            </div>

            <button
              onClick={formData.user_type === 'buyer' ? verifyOTPAndRegister : verifyOTPOnly}
              disabled={loading || otp.join('').length !== 6}
              className="w-full bg-[#FF6B00] text-white font-bold py-3 rounded-full hover:bg-[#E65000] disabled:opacity-50 transition-colors"
              data-testid="verify-otp-btn"
            >
              {loading ? 'جاري التحقق...' : (formData.user_type === 'buyer' ? 'إنشاء الحساب' : 'تحقق')}
            </button>

            <button
              onClick={sendOTP}
              disabled={otpLoading}
              className="w-full py-2 text-[#FF6B00] text-sm mt-4"
            >
              {otpLoading ? 'جاري الإرسال...' : 'إعادة إرسال الرمز'}
            </button>

            <button
              onClick={goBack}
              className="w-full py-2 text-gray-500 text-sm mt-2 flex items-center justify-center gap-2"
            >
              ← العودة لتعديل البيانات
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-10 bg-gray-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <img 
            src="/images/logo.png" 
            alt="ترند سوريا" 
            className="w-20 h-20 object-contain mx-auto mb-4 rounded-2xl"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = '/icons/icon-192.png';
            }}
          />
          <h1 className="text-2xl font-bold text-gray-900">إنشاء حساب جديد</h1>
          <p className="text-gray-500 mt-2">انضم إلى ترند سورية الآن</p>
        </div>

        <form onSubmit={sendOTP} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          {/* Account Type */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-full mb-4">
            <button
              type="button"
              onClick={() => {
                setFormData({ ...formData, user_type: 'buyer' });
                setShowSellerType(false);
              }}
              className={`flex-1 py-2 rounded-full transition-colors text-sm ${
                formData.user_type === 'buyer' ? 'bg-[#FF6B00] text-white font-bold' : 'text-gray-600'
              }`}
              data-testid="buyer-type-btn"
            >
              مشتري
            </button>
            <button
              type="button"
              onClick={handleSellerClick}
              className={`flex-1 py-2 rounded-full transition-colors text-sm ${
                (formData.user_type === 'seller' || formData.user_type === 'food_seller') ? 'bg-[#FF6B00] text-white font-bold' : 'text-gray-600'
              }`}
              data-testid="seller-type-btn"
            >
              بائع
            </button>
            <button
              type="button"
              onClick={() => {
                setFormData({ ...formData, user_type: 'delivery' });
                setShowSellerType(false);
              }}
              className={`flex-1 py-2 rounded-full transition-colors text-sm ${
                formData.user_type === 'delivery' ? 'bg-[#FF6B00] text-white font-bold' : 'text-gray-600'
              }`}
              data-testid="delivery-type-btn"
            >
              موظف توصيل
            </button>
          </div>

          {/* Seller Type Selection */}
          {showSellerType && (
            <div className="mb-4 p-3 bg-orange-50 rounded-xl border border-orange-200">
              <p className="text-sm text-gray-700 mb-3 text-center font-medium">ما نوع البيع؟</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => selectSellerType('seller')}
                  className={`flex-1 py-3 px-2 rounded-xl border-2 transition-all text-sm ${
                    formData.user_type === 'seller' 
                      ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00] font-bold' 
                      : 'border-gray-200 bg-white text-gray-700 hover:border-[#FF6B00]/50'
                  }`}
                >
                  <span className="text-lg mb-1 block">📦</span>
                  منتجات عادية
                </button>
                <button
                  type="button"
                  onClick={() => selectSellerType('food_seller')}
                  className={`flex-1 py-3 px-2 rounded-xl border-2 transition-all text-sm ${
                    formData.user_type === 'food_seller' 
                      ? 'border-[#FF6B00] bg-[#FF6B00]/10 text-[#FF6B00] font-bold' 
                      : 'border-gray-200 bg-white text-gray-700 hover:border-[#FF6B00]/50'
                  }`}
                >
                  <span className="text-lg mb-1 block">🍔</span>
                  طعام / ماركت
                </button>
              </div>
            </div>
          )}

          {/* Show selected seller type badge */}
          {!showSellerType && (formData.user_type === 'seller' || formData.user_type === 'food_seller') && (
            <div className="mb-4 flex items-center justify-center gap-2">
              <span className="text-xs bg-[#FF6B00]/10 text-[#FF6B00] px-3 py-1 rounded-full">
                {formData.user_type === 'seller' ? '📦 بائع منتجات' : '🍔 بائع طعام/ماركت'}
              </span>
              <button 
                type="button" 
                onClick={() => setShowSellerType(true)}
                className="text-xs text-gray-500 hover:text-[#FF6B00]"
              >
                تغيير
              </button>
            </div>
          )}

          {/* حقول التسجيل - تظهر فقط بعد اختيار نوع الحساب */}
          {shouldShowRegistrationFields() ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">الاسم الثلاثي *</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-3 px-4 pr-12 text-gray-900 placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none transition-colors"
                  placeholder="مثال: محمد أحمد علي"
                  required
                  data-testid="name-input"
                />
                <User size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              <p className="text-xs text-gray-400 mt-1">أدخل اسمك الثلاثي كاملاً</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">رقم الهاتف *</label>
              <div className="relative">
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-3 px-4 pr-12 text-gray-900 placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none transition-colors"
                  placeholder="09xxxxxxxx"
                  required
                  data-testid="phone-input"
                />
                <Phone size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              <p className="text-xs text-gray-400 mt-1">سيُستخدم لتسجيل الدخول</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">كلمة المرور *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-3 px-4 pl-12 text-gray-900 placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none transition-colors"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">6 أحرف على الأقل</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">تأكيد كلمة المرور *</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className={`w-full bg-gray-50 border rounded-lg py-3 px-4 pl-12 text-gray-900 placeholder:text-gray-400 focus:outline-none transition-colors ${
                    formData.confirmPassword && formData.password !== formData.confirmPassword 
                      ? 'border-red-500 focus:border-red-500' 
                      : formData.confirmPassword && formData.password === formData.confirmPassword
                        ? 'border-green-500 focus:border-green-500'
                        : 'border-gray-200 focus:border-[#FF6B00]'
                  }`}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  data-testid="confirm-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle size={12} /> كلمة المرور غير متطابقة
                </p>
              )}
              {formData.confirmPassword && formData.password === formData.confirmPassword && (
                <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                  <CheckCircle size={12} /> كلمة المرور متطابقة
                </p>
              )}
            </div>

            {/* المدينة - تُعرض فقط للمشترين، أما البائعين والسائقين فيُدخلونها لاحقاً */}
            {formData.user_type === 'buyer' && (
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">المدينة</label>
                <select
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-3 px-4 text-gray-900 focus:border-[#FF6B00] focus:outline-none transition-colors"
                  required
                  data-testid="city-select"
                >
                  {CITIES.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            )}

          </div>
          ) : (
            /* رسالة للمستخدم لاختيار نوع البيع */
            showSellerType && (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">اختر نوع البيع للمتابعة</p>
              </div>
            )
          )}

          {formData.user_type === 'food_seller' && (
            <p className="text-sm text-gray-600 mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
              ملاحظة: ستحتاج لرفع شهادة بائع (سجل تجاري) بعد التسجيل للموافقة على حسابك
            </p>
          )}

          {/* زر الإرسال - يظهر فقط إذا تم اختيار نوع الحساب */}
          {shouldShowRegistrationFields() && (
          <button
            type="submit"
            disabled={otpLoading}
            className="w-full bg-[#FF6B00] text-white font-bold py-3 rounded-full mt-6 hover:bg-[#E65000] disabled:opacity-50 transition-colors"
            data-testid="register-submit-btn"
          >
            {otpLoading ? 'جاري إرسال رمز التحقق...' : 'إرسال رمز التحقق'}
          </button>
          )}

          {/* Terms Agreement */}
          <p className="text-center text-xs text-gray-500 mt-3">
            بالتسجيل، أنت توافق على{' '}
            <Link to="/terms" className="text-[#FF6B00] hover:underline">شروط الاستخدام</Link>
            {' '}و{' '}
            <Link to="/privacy" className="text-[#FF6B00] hover:underline">سياسة الخصوصية</Link>
          </p>

          <p className="text-center text-gray-500 mt-4">
            لديك حساب بالفعل؟{' '}
            <Link to="/login" className="text-[#FF6B00] hover:underline font-medium">
              تسجيل الدخول
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
};

export { LoginPage, RegisterPage };
