import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, User, KeyRound, Eye, EyeOff, ArrowRight, CheckCircle, AlertCircle, HelpCircle, MessageSquare, RefreshCw } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // الخطوات: 1=إدخال الهاتف، 2=التحقق من الهوية، 3=كلمة مرور جديدة، 4=النجاح
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // بيانات المستخدم
  const [phone, setPhone] = useState('');
  const [hasEmergencyPhone, setHasEmergencyPhone] = useState(false);
  const [verificationType, setVerificationType] = useState('sms'); // sms, emergency, or name
  const [emergencyLast4, setEmergencyLast4] = useState('');
  const [fullName, setFullName] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // SMS related
  const [smsSent, setSmsSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [mockCode, setMockCode] = useState(''); // للتطوير فقط

  // عداد إعادة إرسال SMS
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // الخطوة 1: البحث عن الحساب
  const handleFindAccount = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/api/auth/forgot-password`, { phone });
      setHasEmergencyPhone(response.data.has_emergency_phone);
      setVerificationType('sms'); // الافتراضي هو SMS
      setStep(2);
      toast({ title: "تم العثور على الحساب", description: "اختر طريقة التحقق" });
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "رقم الهاتف غير مسجل",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // إرسال كود SMS
  const handleSendSMS = async () => {
    setLoading(true);
    try {
      const response = await axios.post(`${API}/api/auth/send-sms-code`, { phone });
      setSmsSent(true);
      setCountdown(60); // انتظار 60 ثانية قبل إعادة الإرسال
      
      // في وضع المحاكاة، نعرض الكود
      if (response.data.mock_mode && response.data.mock_code) {
        setMockCode(response.data.mock_code);
      }
      
      toast({ title: "تم الإرسال", description: "تحقق من رسائل هاتفك" });
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل إرسال الكود",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // التحقق من كود SMS
  const handleVerifySMS = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/api/auth/verify-sms-code`, { phone, code: smsCode });
      setResetToken(response.data.reset_token);
      setStep(3);
      toast({ title: "تم التحقق بنجاح", description: "أدخل كلمة المرور الجديدة" });
    } catch (error) {
      toast({
        title: "فشل التحقق",
        description: error.response?.data?.detail || "الكود غير صحيح",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // الخطوة 2: التحقق من الهوية (الطرق البديلة)
  const handleVerifyIdentity = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        phone,
        verification_type: verificationType,
        emergency_last_4: verificationType === 'emergency' ? emergencyLast4 : null,
        full_name: verificationType === 'name' ? fullName : null
      };

      const response = await axios.post(`${API}/api/auth/verify-identity`, payload);
      setResetToken(response.data.reset_token);
      setStep(3);
      toast({ title: "تم التحقق بنجاح", description: "أدخل كلمة المرور الجديدة" });
    } catch (error) {
      toast({
        title: "فشل التحقق",
        description: error.response?.data?.detail || "بيانات التحقق غير صحيحة",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // الخطوة 3: إعادة تعيين كلمة المرور
  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        title: "خطأ",
        description: "كلمتا المرور غير متطابقتين",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "خطأ",
        description: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API}/api/auth/reset-password`, {
        phone,
        reset_token: resetToken,
        new_password: newPassword
      });
      setStep(4);
      toast({ title: "تم بنجاح!", description: "تم تغيير كلمة المرور" });
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "حدث خطأ أثناء تغيير كلمة المرور",
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
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#FF6B00] flex items-center justify-center mx-auto mb-4">
            <KeyRound className="text-white" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">استعادة كلمة المرور</h1>
          <p className="text-gray-500 mt-2">
            {step === 1 && "أدخل رقم هاتفك للبدء"}
            {step === 2 && "تحقق من هويتك"}
            {step === 3 && "أنشئ كلمة مرور جديدة"}
            {step === 4 && "تم بنجاح!"}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 w-16 rounded-full transition-colors ${
                s <= step ? 'bg-[#FF6B00]' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <AnimatePresence mode="wait">
            {/* الخطوة 1: إدخال رقم الهاتف */}
            {step === 1 && (
              <motion.form
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleFindAccount}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">رقم الهاتف</label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg py-3 px-4 pr-12 text-gray-900 placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none transition-colors"
                      placeholder="09xxxxxxxx"
                      required
                      data-testid="forgot-phone-input"
                    />
                    <Phone size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#FF6B00] text-white font-bold py-3 rounded-full hover:bg-[#E65000] disabled:opacity-50 transition-colors"
                  data-testid="find-account-btn"
                >
                  {loading ? 'جاري البحث...' : 'البحث عن الحساب'}
                </button>
              </motion.form>
            )}

            {/* الخطوة 2: التحقق من الهوية */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* اختيار طريقة التحقق - 3 خيارات */}
                <div className="flex gap-1 p-1 bg-gray-100 rounded-full mb-4">
                  <button
                    type="button"
                    onClick={() => { setVerificationType('sms'); setSmsSent(false); }}
                    className={`flex-1 py-2 rounded-full transition-colors text-xs ${
                      verificationType === 'sms' ? 'bg-[#FF6B00] text-white font-bold' : 'text-gray-600'
                    }`}
                    data-testid="verify-sms-btn"
                  >
                    <MessageSquare size={14} className="inline ml-1" />
                    كود SMS
                  </button>
                  {hasEmergencyPhone && (
                    <button
                      type="button"
                      onClick={() => setVerificationType('emergency')}
                      className={`flex-1 py-2 rounded-full transition-colors text-xs ${
                        verificationType === 'emergency' ? 'bg-[#FF6B00] text-white font-bold' : 'text-gray-600'
                      }`}
                      data-testid="verify-emergency-btn"
                    >
                      رقم الطوارئ
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setVerificationType('name')}
                    className={`flex-1 py-2 rounded-full transition-colors text-xs ${
                      verificationType === 'name' ? 'bg-[#FF6B00] text-white font-bold' : 'text-gray-600'
                    }`}
                    data-testid="verify-name-btn"
                  >
                    الاسم الثلاثي
                  </button>
                </div>

                {/* التحقق عبر SMS */}
                {verificationType === 'sms' && (
                  <form onSubmit={handleVerifySMS} className="space-y-4">
                    {!smsSent ? (
                      <div className="text-center py-4">
                        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <MessageSquare size={28} className="text-[#FF6B00]" />
                        </div>
                        <p className="text-gray-700 mb-2">سنرسل كود تحقق إلى رقمك</p>
                        <p className="text-lg font-bold text-gray-900 mb-4 direction-ltr">{phone}</p>
                        <button
                          type="button"
                          onClick={handleSendSMS}
                          disabled={loading}
                          className="w-full bg-[#FF6B00] text-white font-bold py-3 rounded-full hover:bg-[#E65000] disabled:opacity-50 transition-colors"
                          data-testid="send-sms-btn"
                        >
                          {loading ? 'جاري الإرسال...' : 'إرسال الكود'}
                        </button>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 text-center">
                          أدخل الكود المرسل إلى {phone}
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={smsCode}
                            onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg py-4 px-4 text-gray-900 text-center text-3xl tracking-[0.5em] placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none transition-colors font-mono"
                            placeholder="••••••"
                            maxLength={6}
                            required
                            autoFocus
                            data-testid="sms-code-input"
                          />
                        </div>
                        
                        {/* وضع المحاكاة - عرض الكود للتطوير */}
                        {mockCode && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-800 text-center">
                              <span className="font-medium">وضع التطوير:</span> الكود هو{' '}
                              <span className="font-bold text-lg">{mockCode}</span>
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-center gap-2 mt-3">
                          {countdown > 0 ? (
                            <p className="text-sm text-gray-500">
                              إعادة الإرسال بعد {countdown} ثانية
                            </p>
                          ) : (
                            <button
                              type="button"
                              onClick={handleSendSMS}
                              disabled={loading}
                              className="text-sm text-[#FF6B00] hover:underline flex items-center gap-1"
                            >
                              <RefreshCw size={14} />
                              إعادة إرسال الكود
                            </button>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={loading || smsCode.length !== 6}
                          className="w-full bg-[#FF6B00] text-white font-bold py-3 rounded-full mt-4 hover:bg-[#E65000] disabled:opacity-50 transition-colors"
                          data-testid="verify-sms-code-btn"
                        >
                          {loading ? 'جاري التحقق...' : 'تحقق'}
                        </button>
                      </div>
                    )}
                  </form>
                )}

                {/* التحقق عبر رقم الطوارئ */}
                {verificationType === 'emergency' && hasEmergencyPhone && (
                  <form onSubmit={handleVerifyIdentity} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">
                        آخر 4 أرقام من رقم الطوارئ
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={emergencyLast4}
                          onChange={(e) => setEmergencyLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg py-3 px-4 text-gray-900 text-center text-2xl tracking-widest placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none transition-colors"
                          placeholder="XXXX"
                          maxLength={4}
                          required
                          data-testid="emergency-last4-input"
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-2 text-center">
                        أدخل آخر 4 أرقام من رقم الطوارئ الذي سجلته عند إنشاء الحساب
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#FF6B00] text-white font-bold py-3 rounded-full hover:bg-[#E65000] disabled:opacity-50 transition-colors"
                      data-testid="verify-identity-btn"
                    >
                      {loading ? 'جاري التحقق...' : 'تحقق'}
                    </button>
                  </form>
                )}

                {/* التحقق عبر الاسم الثلاثي */}
                {verificationType === 'name' && (
                  <form onSubmit={handleVerifyIdentity} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700">الاسم الثلاثي</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 rounded-lg py-3 px-4 pr-12 text-gray-900 placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none transition-colors"
                          placeholder="الاسم الثلاثي كما في التسجيل"
                          required
                          data-testid="fullname-input"
                        />
                        <User size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" />
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        أدخل اسمك الثلاثي كما كتبته عند التسجيل
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#FF6B00] text-white font-bold py-3 rounded-full hover:bg-[#E65000] disabled:opacity-50 transition-colors"
                      data-testid="verify-identity-btn"
                    >
                      {loading ? 'جاري التحقق...' : 'تحقق'}
                    </button>
                  </form>
                )}

                {/* زر الرجوع */}
                <button
                  type="button"
                  onClick={() => { setStep(1); setSmsSent(false); setMockCode(''); }}
                  className="w-full bg-gray-100 text-gray-700 font-medium py-3 rounded-full hover:bg-gray-200 transition-colors mt-2"
                >
                  رجوع
                </button>

                {/* نسيت كل شيء؟ */}
                <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-start gap-2">
                    <HelpCircle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-amber-800">
                      <p className="font-medium">لا تستطيع التحقق؟</p>
                      <p className="text-amber-700 mt-1">
                        تواصل مع الدعم على واتساب:{' '}
                        <a 
                          href="https://wa.me/963900000000" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[#FF6B00] font-medium hover:underline"
                        >
                          0900000000
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* الخطوة 3: كلمة المرور الجديدة */}
            {step === 3 && (
              <motion.form
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleResetPassword}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">كلمة المرور الجديدة</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg py-3 px-4 pl-12 text-gray-900 placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none transition-colors"
                      placeholder="••••••••"
                      required
                      minLength={6}
                      data-testid="new-password-input"
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
                  <label className="block text-sm font-medium mb-2 text-gray-700">تأكيد كلمة المرور</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg py-3 px-4 pl-12 text-gray-900 placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none transition-colors"
                      placeholder="••••••••"
                      required
                      minLength={6}
                      data-testid="confirm-password-input"
                    />
                    {confirmPassword && (
                      <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        {newPassword === confirmPassword ? (
                          <CheckCircle size={20} className="text-green-500" />
                        ) : (
                          <AlertCircle size={20} className="text-red-500" />
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || newPassword !== confirmPassword}
                  className="w-full bg-[#FF6B00] text-white font-bold py-3 rounded-full hover:bg-[#E65000] disabled:opacity-50 transition-colors"
                  data-testid="reset-password-btn"
                >
                  {loading ? 'جاري الحفظ...' : 'حفظ كلمة المرور الجديدة'}
                </button>
              </motion.form>
            )}

            {/* الخطوة 4: النجاح */}
            {step === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={40} className="text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">تم تغيير كلمة المرور بنجاح!</h2>
                <p className="text-gray-500 mb-6">يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة</p>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full bg-[#FF6B00] text-white font-bold py-3 rounded-full hover:bg-[#E65000] transition-colors"
                  data-testid="go-to-login-btn"
                >
                  تسجيل الدخول
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* رابط العودة */}
        {step !== 4 && (
          <p className="text-center text-gray-500 mt-4">
            <Link to="/login" className="text-[#FF6B00] hover:underline font-medium flex items-center justify-center gap-1">
              <ArrowRight size={18} />
              العودة لتسجيل الدخول
            </Link>
          </p>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
