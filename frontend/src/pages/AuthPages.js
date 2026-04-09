import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Phone, User, AlertCircle, CheckCircle, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;
const CITIES = ['دمشق', 'حلب', 'حمص', 'اللاذقية', 'طرطوس', 'حماة', 'دير الزور', 'الرقة', 'الحسكة', 'درعا', 'السويداء', 'إدلب', 'القنيطرة'];

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({ phone: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await login(formData.phone, formData.password);
      toast({ title: "مرحباً بك!", description: "تم تسجيل الدخول بنجاح" });
      
      // توجيه حسب نوع المستخدم - مع استبدال صفحة الدخول من السجل
      const userType = response.user?.user_type;
      if (userType === 'admin' || userType === 'sub_admin') {
        navigate('/admin', { replace: true });
      } else if (userType === 'seller') {
        // البائع: التحقق من حالة الوثائق أولاً
        try {
          const token = response.token;
          const docRes = await axios.get(`${API}/api/seller/documents/status`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const docStatus = docRes.data?.status;
          
          if (!docStatus || docStatus === 'not_submitted') {
            // لم يرفع الوثائق بعد
            navigate('/seller/documents', { replace: true });
          } else if (docStatus === 'pending') {
            // في انتظار الموافقة
            navigate('/seller/pending', { replace: true });
          } else if (docStatus === 'rejected') {
            // مرفوض - يحتاج إعادة رفع
            navigate('/seller/documents', { replace: true });
          } else {
            // معتمد
            navigate('/seller/dashboard', { replace: true });
          }
        } catch (docError) {
          // إذا فشل التحقق، نوجهه لصفحة الوثائق
          navigate('/seller/documents', { replace: true });
        }
      } else if (userType === 'food_seller') {
        // بائع الطعام: التحقق من حالة الوثائق أولاً
        try {
          const token = response.token;
          const docRes = await axios.get(`${API}/api/seller/documents/status`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const docStatus = docRes.data?.status;
          
          if (!docStatus || docStatus === 'not_submitted') {
            // لم يرفع الوثائق بعد
            navigate('/seller/documents', { replace: true });
          } else if (docStatus === 'pending') {
            // في انتظار الموافقة
            navigate('/seller/pending', { replace: true });
          } else if (docStatus === 'rejected') {
            // مرفوض - يعرض سبب الرفض
            navigate('/seller/documents', { replace: true });
          } else {
            // معتمد
            navigate('/food/dashboard', { replace: true });
          }
        } catch (docError) {
          // إذا فشل التحقق، نوجهه لصفحة الوثائق
          navigate('/seller/documents', { replace: true });
        }
      } else if (userType === 'delivery') {
        // موظف التوصيل: التحقق من حالة الوثائق أولاً
        try {
          const token = response.token;
          const docRes = await axios.get(`${API}/api/delivery/documents/status`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const docStatus = docRes.data?.status;
          
          if (!docStatus || docStatus === 'not_submitted') {
            // لم يرفع الوثائق بعد
            navigate('/delivery/documents', { replace: true });
          } else if (docStatus === 'pending') {
            // في انتظار الموافقة
            navigate('/delivery/pending', { replace: true });
          } else if (docStatus === 'rejected') {
            // مرفوض - يحتاج إعادة رفع
            navigate('/delivery/documents', { replace: true });
          } else {
            // معتمد
            navigate('/delivery/dashboard', { replace: true });
          }
        } catch (docError) {
          // إذا فشل التحقق، نوجهه لصفحة الوثائق
          navigate('/delivery/documents', { replace: true });
        }
      } else {
        navigate('/', { replace: true });
      }
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <img 
            src="/images/logo.png" 
            alt="ترند سوريا" 
            className="w-20 h-20 object-contain mx-auto mb-4"
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

  // عند الضغط على "بائع"، نظهر خيارات نوع البيع
  const handleSellerClick = () => {
    setShowSellerType(true);
  };

  // اختيار نوع البيع
  const selectSellerType = (type) => {
    setFormData({ ...formData, user_type: type });
    setShowSellerType(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // التحقق من الاسم الثلاثي
    const nameParts = formData.full_name.trim().split(' ').filter(p => p.length > 0);
    if (nameParts.length < 3) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال الاسم الثلاثي كاملاً",
        variant: "destructive"
      });
      return;
    }

    // التحقق من تطابق كلمة السر
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "خطأ",
        description: "كلمة المرور وتأكيدها غير متطابقتين",
        variant: "destructive"
      });
      return;
    }

    // التحقق من طول كلمة السر
    if (formData.password.length < 6) {
      toast({
        title: "خطأ",
        description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const res = await register(formData);
      toast({ title: "تم التسجيل بنجاح", description: "مرحباً بك في ترند سورية" });
      
      if (formData.user_type === 'seller') {
        navigate('/seller/documents', { replace: true });
      } else if (formData.user_type === 'food_seller') {
        navigate('/food-seller/setup', { replace: true });
      } else if (formData.user_type === 'delivery') {
        navigate('/delivery/documents', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "حدث خطأ في التسجيل",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

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
            className="w-20 h-20 object-contain mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900">إنشاء حساب جديد</h1>
          <p className="text-gray-500 mt-2">انضم إلى ترند سورية الآن</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
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

            <div>
              <label className="block text-sm font-medium mb-2 text-gray-700">رقم الطوارئ (اختياري)</label>
              <div className="relative">
                <input
                  type="tel"
                  value={formData.emergency_phone}
                  onChange={(e) => setFormData({ ...formData, emergency_phone: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-3 px-4 pr-12 text-gray-900 placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none transition-colors"
                  placeholder="09xxxxxxxx"
                  data-testid="emergency-phone-input"
                />
                <Phone size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
              <p className="text-xs text-gray-400 mt-1">رقم شخص قريب منك - يُستخدم لاستعادة كلمة المرور</p>
            </div>
          </div>

          {formData.user_type === 'seller' && (
            <p className="text-sm text-gray-600 mt-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
              ملاحظة: ستحتاج لرفع شهادة بائع (سجل تجاري) بعد التسجيل للموافقة على حسابك
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF6B00] text-white font-bold py-3 rounded-full mt-6 hover:bg-[#E65000] disabled:opacity-50 transition-colors"
            data-testid="register-submit-btn"
          >
            {loading ? 'جاري التسجيل...' : 'إنشاء الحساب'}
          </button>

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
