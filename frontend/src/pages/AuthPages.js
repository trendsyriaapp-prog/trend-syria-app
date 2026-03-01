import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Phone, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

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
      const userData = await login(formData.phone, formData.password);
      toast({ title: "مرحباً بك!", description: "تم تسجيل الدخول بنجاح" });
      
      // توجيه حسب نوع المستخدم
      if (userData.user_type === 'admin' || userData.user_type === 'sub_admin') {
        navigate('/admin');
      } else if (userData.user_type === 'seller') {
        navigate('/seller/dashboard');
      } else if (userData.user_type === 'delivery') {
        navigate('/delivery/dashboard');
      } else {
        navigate('/');
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
          <div className="w-16 h-16 rounded-full bg-[#FF6B00] flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">ت</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">تسجيل الدخول</h1>
          <p className="text-gray-500 mt-2">مرحباً بعودتك إلى تريند سورية</p>
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
            className="w-full bg-[#FF6B00] text-white font-bold py-3 rounded-full mt-6 hover:bg-[#E65000] disabled:opacity-50 transition-colors"
            data-testid="login-submit-btn"
          >
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>

          <p className="text-center text-gray-500 mt-4">
            ليس لديك حساب؟{' '}
            <Link to="/register" className="text-[#FF6B00] hover:underline font-medium" data-testid="register-link">
              إنشاء حساب
            </Link>
          </p>
        </form>

        {/* Demo accounts */}
        <div className="mt-6 p-4 bg-white rounded-xl border border-gray-200">
          <p className="text-sm text-gray-500 mb-2">حسابات تجريبية:</p>
          <div className="space-y-1 text-sm text-gray-700">
            <p><span className="text-[#FF6B00] font-medium">مدير:</span> 0911111111 / admin123</p>
            <p><span className="text-[#FF6B00] font-medium">بائع:</span> 0922222222 / seller123</p>
          </div>
        </div>
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
    city: 'دمشق',
    user_type: defaultType
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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

    setLoading(true);

    try {
      const res = await register(formData);
      toast({ title: "تم التسجيل بنجاح", description: "مرحباً بك في تريند سورية" });
      
      if (formData.user_type === 'seller') {
        navigate('/seller/documents');
      } else if (formData.user_type === 'delivery') {
        navigate('/delivery/documents');
      } else {
        navigate('/');
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
          <div className="w-16 h-16 rounded-full bg-[#FF6B00] flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">ت</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">إنشاء حساب جديد</h1>
          <p className="text-gray-500 mt-2">انضم إلى تريند سورية الآن</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          {/* Account Type */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-full mb-6">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, user_type: 'buyer' })}
              className={`flex-1 py-2 rounded-full transition-colors text-sm ${
                formData.user_type === 'buyer' ? 'bg-[#FF6B00] text-white font-bold' : 'text-gray-600'
              }`}
              data-testid="buyer-type-btn"
            >
              مشتري
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, user_type: 'seller' })}
              className={`flex-1 py-2 rounded-full transition-colors text-sm ${
                formData.user_type === 'seller' ? 'bg-[#FF6B00] text-white font-bold' : 'text-gray-600'
              }`}
              data-testid="seller-type-btn"
            >
              بائع
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, user_type: 'delivery' })}
              className={`flex-1 py-2 rounded-full transition-colors text-sm ${
                formData.user_type === 'delivery' ? 'bg-[#FF6B00] text-white font-bold' : 'text-gray-600'
              }`}
              data-testid="delivery-type-btn"
            >
              موظف توصيل
            </button>
          </div>

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
