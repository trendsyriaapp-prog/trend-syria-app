import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

const CITIES = ['دمشق', 'حلب', 'حمص', 'اللاذقية', 'طرطوس', 'حماة', 'دير الزور', 'الرقة', 'الحسكة', 'درعا', 'السويداء', 'إدلب', 'القنيطرة'];

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      toast({ title: "مرحباً بك!", description: "تم تسجيل الدخول بنجاح" });
      navigate('/');
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "بيانات الدخول غير صحيحة",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#FF6B00] flex items-center justify-center mx-auto mb-4">
            <span className="text-black font-bold text-2xl">ت</span>
          </div>
          <h1 className="text-2xl font-bold">تسجيل الدخول</h1>
          <p className="text-white/50 mt-2">مرحباً بعودتك إلى تريند سوريا</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#121212] rounded-2xl p-6 border border-white/5">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">البريد الإلكتروني</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg py-3 px-4 text-white placeholder:text-white/30 focus:border-[#FF6B00] focus:outline-none transition-colors"
                placeholder="example@email.com"
                required
                data-testid="email-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">كلمة المرور</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg py-3 px-4 pl-12 text-white placeholder:text-white/30 focus:border-[#FF6B00] focus:outline-none transition-colors"
                  placeholder="••••••••"
                  required
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF6B00] text-black font-bold py-3 rounded-full mt-6 hover:bg-[#E65000] disabled:opacity-50 transition-colors"
            data-testid="login-submit-btn"
          >
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>

          <p className="text-center text-white/50 mt-4">
            ليس لديك حساب؟{' '}
            <Link to="/register" className="text-[#FF6B00] hover:underline" data-testid="register-link">
              إنشاء حساب
            </Link>
          </p>
        </form>

        {/* Demo accounts */}
        <div className="mt-6 p-4 bg-[#121212] rounded-xl border border-white/5">
          <p className="text-sm text-white/50 mb-2">حسابات تجريبية:</p>
          <div className="space-y-1 text-sm">
            <p><span className="text-[#FF6B00]">مدير:</span> admin@trendsy.sy / admin123</p>
            <p><span className="text-[#FF6B00]">بائع:</span> seller@trendsy.sy / seller123</p>
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
    name: '',
    email: '',
    password: '',
    phone: '',
    city: 'دمشق',
    user_type: defaultType
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await register(formData);
      toast({ title: "تم التسجيل بنجاح", description: "مرحباً بك في تريند سوريا" });
      
      if (formData.user_type === 'seller') {
        navigate('/seller/documents');
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
    <div className="min-h-screen flex items-center justify-center p-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#FF6B00] flex items-center justify-center mx-auto mb-4">
            <span className="text-black font-bold text-2xl">ت</span>
          </div>
          <h1 className="text-2xl font-bold">إنشاء حساب جديد</h1>
          <p className="text-white/50 mt-2">انضم إلى تريند سوريا اليوم</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#121212] rounded-2xl p-6 border border-white/5">
          {/* Account Type */}
          <div className="flex gap-2 p-1 bg-[#0A0A0A] rounded-full mb-6">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, user_type: 'buyer' })}
              className={`flex-1 py-2 rounded-full transition-colors ${
                formData.user_type === 'buyer' ? 'bg-[#FF6B00] text-black font-bold' : ''
              }`}
              data-testid="buyer-type-btn"
            >
              مشتري
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, user_type: 'seller' })}
              className={`flex-1 py-2 rounded-full transition-colors ${
                formData.user_type === 'seller' ? 'bg-[#FF6B00] text-black font-bold' : ''
              }`}
              data-testid="seller-type-btn"
            >
              بائع
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">الاسم الكامل</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg py-3 px-4 text-white placeholder:text-white/30 focus:border-[#FF6B00] focus:outline-none transition-colors"
                placeholder="أدخل اسمك"
                required
                data-testid="name-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">البريد الإلكتروني</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg py-3 px-4 text-white placeholder:text-white/30 focus:border-[#FF6B00] focus:outline-none transition-colors"
                placeholder="example@email.com"
                required
                data-testid="email-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">كلمة المرور</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg py-3 px-4 pl-12 text-white placeholder:text-white/30 focus:border-[#FF6B00] focus:outline-none transition-colors"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  data-testid="password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">رقم الهاتف</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg py-3 px-4 text-white placeholder:text-white/30 focus:border-[#FF6B00] focus:outline-none transition-colors"
                placeholder="09xxxxxxxx"
                required
                data-testid="phone-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">المدينة</label>
              <select
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg py-3 px-4 text-white focus:border-[#FF6B00] focus:outline-none transition-colors"
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
            <p className="text-sm text-white/50 mt-4 p-3 bg-[#FF6B00]/10 rounded-lg">
              ملاحظة: ستحتاج لرفع شهادة بائع (سجل تجاري) بعد التسجيل للموافقة على حسابك
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF6B00] text-black font-bold py-3 rounded-full mt-6 hover:bg-[#E65000] disabled:opacity-50 transition-colors"
            data-testid="register-submit-btn"
          >
            {loading ? 'جاري التسجيل...' : 'إنشاء الحساب'}
          </button>

          <p className="text-center text-white/50 mt-4">
            لديك حساب بالفعل؟{' '}
            <Link to="/login" className="text-[#FF6B00] hover:underline">
              تسجيل الدخول
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
};

export { LoginPage, RegisterPage };
