import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { MapPin, Phone, CreditCard, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CITIES = ['دمشق', 'حلب', 'حمص', 'اللاذقية', 'طرطوس', 'حماة', 'دير الزور', 'الرقة', 'الحسكة', 'درعا', 'السويداء', 'إدلب', 'القنيطرة'];

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, clearCart } = useCart();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [otp, setOtp] = useState('');

  const [formData, setFormData] = useState({
    address: '',
    city: user?.city || 'دمشق',
    phone: user?.phone || '',
    shamcash_phone: ''
  });

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(`${API}/orders`, {
        items: cart.items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        address: formData.address,
        city: formData.city,
        phone: formData.phone,
        payment_method: 'shamcash',
        shamcash_phone: formData.shamcash_phone
      });

      setOrderId(res.data.order_id);
      
      // Init ShamCash payment
      await axios.post(`${API}/payment/shamcash/init?order_id=${res.data.order_id}`);
      
      setStep(2);
      toast({
        title: "تم إنشاء الطلب",
        description: "أدخل رمز التحقق المرسل إلى رقم شام كاش"
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "حدث خطأ في إنشاء الطلب",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/payment/shamcash/verify`, {
        order_id: orderId,
        phone: formData.shamcash_phone,
        otp: otp
      });

      clearCart();
      setStep(3);
      toast({
        title: "تم الدفع بنجاح!",
        description: "سيتم توصيل طلبك قريباً"
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "رمز التحقق غير صحيح",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  if (cart.items.length === 0 && step === 1) {
    navigate('/cart');
    return null;
  }

  return (
    <div className="min-h-screen pb-20 md:pb-10">
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[
            { num: 1, label: 'العنوان' },
            { num: 2, label: 'الدفع' },
            { num: 3, label: 'تأكيد' }
          ].map((s, i) => (
            <div key={s.num} className="flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                step >= s.num ? 'bg-[#FF6B00] text-black' : 'bg-[#121212] text-white/50'
              }`}>
                {step > s.num ? <Check size={20} /> : s.num}
              </div>
              <span className={`mr-2 text-sm ${step >= s.num ? 'text-white' : 'text-white/50'}`}>
                {s.label}
              </span>
              {i < 2 && <div className={`w-12 h-0.5 mx-2 ${step > s.num ? 'bg-[#FF6B00]' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Address */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bg-[#121212] rounded-2xl p-6 border border-white/5 mb-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <MapPin className="text-[#FF6B00]" />
                عنوان التوصيل
              </h2>

              <form onSubmit={handleCreateOrder} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">المدينة</label>
                  <select
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg py-3 px-4 text-white focus:border-[#FF6B00] focus:outline-none"
                    required
                    data-testid="checkout-city"
                  >
                    {CITIES.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">العنوان التفصيلي</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg py-3 px-4 text-white placeholder:text-white/30 focus:border-[#FF6B00] focus:outline-none"
                    placeholder="الحي، الشارع، البناء، رقم الطابق..."
                    rows={3}
                    required
                    data-testid="checkout-address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">رقم الهاتف للتواصل</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg py-3 px-4 text-white placeholder:text-white/30 focus:border-[#FF6B00] focus:outline-none"
                    placeholder="09xxxxxxxx"
                    required
                    data-testid="checkout-phone"
                  />
                </div>

                <div className="pt-4 border-t border-white/10">
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <CreditCard size={18} className="text-[#FF6B00]" />
                    رقم شام كاش للدفع
                  </label>
                  <input
                    type="tel"
                    value={formData.shamcash_phone}
                    onChange={(e) => setFormData({ ...formData, shamcash_phone: e.target.value })}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg py-3 px-4 text-white placeholder:text-white/30 focus:border-[#FF6B00] focus:outline-none"
                    placeholder="رقم حساب شام كاش"
                    required
                    data-testid="checkout-shamcash"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#FF6B00] text-black font-bold py-3 rounded-full mt-4 hover:bg-[#E65000] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  data-testid="submit-order-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      متابعة للدفع
                      <span className="text-sm">({formatPrice(cart.total)})</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {/* Step 2: Payment OTP */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bg-[#121212] rounded-2xl p-6 border border-white/5">
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-full bg-[#FF6B00]/20 flex items-center justify-center mx-auto mb-4">
                  <CreditCard size={40} className="text-[#FF6B00]" />
                </div>
                <h2 className="text-xl font-bold">تأكيد الدفع - شام كاش</h2>
                <p className="text-white/50 mt-2">
                  أدخل رمز التحقق المرسل إلى {formData.shamcash_phone}
                </p>
              </div>

              <form onSubmit={handleVerifyPayment}>
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2 text-center">رمز التحقق (OTP)</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg py-4 px-4 text-white text-center text-2xl tracking-widest placeholder:text-white/30 focus:border-[#FF6B00] focus:outline-none"
                    placeholder="------"
                    maxLength={6}
                    required
                    data-testid="otp-input"
                  />
                  <p className="text-xs text-white/30 text-center mt-2">
                    للتجربة: أدخل أي 6 أرقام
                  </p>
                </div>

                <div className="bg-[#0A0A0A] rounded-lg p-4 mb-6">
                  <div className="flex justify-between text-white/70 mb-2">
                    <span>المبلغ المطلوب</span>
                    <span className="font-bold text-white">{formatPrice(cart.total)}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-[#FF6B00] text-black font-bold py-3 rounded-full hover:bg-[#E65000] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  data-testid="verify-payment-btn"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      جاري التحقق...
                    </>
                  ) : (
                    'تأكيد الدفع'
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className="bg-[#121212] rounded-2xl p-8 border border-white/5">
              <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                <Check size={48} className="text-green-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2">تم الطلب بنجاح!</h2>
              <p className="text-white/50 mb-6">
                شكراً لتسوقك من تريند سوريا
                <br />
                سيتم توصيل طلبك خلال 2-5 أيام عمل
              </p>
              
              <div className="bg-[#0A0A0A] rounded-lg p-4 mb-6">
                <p className="text-sm text-white/50">رقم الطلب</p>
                <p className="font-bold text-[#FF6B00]">{orderId?.slice(0, 8).toUpperCase()}</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/orders')}
                  className="flex-1 bg-[#FF6B00] text-black font-bold py-3 rounded-full hover:bg-[#E65000] transition-colors"
                  data-testid="view-orders-btn"
                >
                  متابعة الطلب
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 bg-[#1E1E1E] text-white font-bold py-3 rounded-full hover:bg-white/10 transition-colors"
                  data-testid="continue-shopping-btn"
                >
                  متابعة التسوق
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CheckoutPage;
