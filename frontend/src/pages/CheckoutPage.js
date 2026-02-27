import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { MapPin, Phone, CreditCard, Check, Loader2, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CITIES = ['دمشق', 'حلب', 'حمص', 'اللاذقية', 'طرطوس', 'حماة', 'دير الزور', 'الرقة', 'الحسكة', 'درعا', 'السويداء', 'إدلب', 'القنيطرة'];

const PAYMENT_METHODS = [
  { id: 'shamcash', name: 'شام كاش', icon: '💳', color: 'bg-orange-500' },
  { id: 'syriatel_cash', name: 'سيرياتيل كاش', icon: '📱', color: 'bg-red-500' },
  { id: 'mtn_cash', name: 'MTN Cash', icon: '📲', color: 'bg-yellow-500' },
];

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
    payment_method: 'shamcash',
    payment_phone: ''
  });

  const selectedPayment = PAYMENT_METHODS.find(p => p.id === formData.payment_method);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(`${API}/orders`, {
        items: cart.items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        address: formData.address,
        city: formData.city,
        phone: formData.phone,
        payment_method: formData.payment_method,
        payment_phone: formData.payment_phone
      });

      setOrderId(res.data.order_id);
      
      // Init payment
      await axios.post(`${API}/payment/shamcash/init?order_id=${res.data.order_id}`);
      
      setStep(2);
      toast({
        title: "تم إنشاء الطلب",
        description: `أدخل رمز التحقق المرسل إلى رقم ${selectedPayment.name}`
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
        phone: formData.payment_phone,
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
    <div className="min-h-screen pb-20 md:pb-10 bg-gray-50">
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
                step >= s.num ? 'bg-[#FF6B00] text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {step > s.num ? <Check size={20} /> : s.num}
              </div>
              <span className={`mr-2 text-sm ${step >= s.num ? 'text-gray-900' : 'text-gray-500'}`}>
                {s.label}
              </span>
              {i < 2 && <div className={`w-12 h-0.5 mx-2 ${step > s.num ? 'bg-[#FF6B00]' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Address & Payment Method */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-900">
                <MapPin className="text-[#FF6B00]" />
                عنوان التوصيل
              </h2>

              <form onSubmit={handleCreateOrder} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">المدينة</label>
                  <select
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-3 px-4 text-gray-900 focus:border-[#FF6B00] focus:outline-none"
                    required
                    data-testid="checkout-city"
                  >
                    {CITIES.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">العنوان التفصيلي</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-3 px-4 text-gray-900 placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none"
                    placeholder="الحي، الشارع، البناء، رقم الطابق..."
                    rows={3}
                    required
                    data-testid="checkout-address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">رقم الهاتف للتواصل</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-3 px-4 text-gray-900 placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none"
                    placeholder="09xxxxxxxx"
                    required
                    data-testid="checkout-phone"
                  />
                </div>

                {/* Payment Method Selection */}
                <div className="pt-4 border-t border-gray-200">
                  <label className="block text-sm font-medium mb-3 text-gray-700 flex items-center gap-2">
                    <CreditCard size={18} className="text-[#FF6B00]" />
                    طريقة الدفع
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map((method) => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, payment_method: method.id })}
                        className={`p-3 rounded-xl border-2 transition-all text-center ${
                          formData.payment_method === method.id
                            ? 'border-[#FF6B00] bg-[#FF6B00]/5'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        data-testid={`payment-${method.id}`}
                      >
                        <span className="text-2xl block mb-1">{method.icon}</span>
                        <span className="text-xs font-medium text-gray-700">{method.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    رقم {selectedPayment?.name} للدفع
                  </label>
                  <input
                    type="tel"
                    value={formData.payment_phone}
                    onChange={(e) => setFormData({ ...formData, payment_phone: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-3 px-4 text-gray-900 placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none"
                    placeholder={`رقم حساب ${selectedPayment?.name}`}
                    required
                    data-testid="checkout-payment-phone"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#FF6B00] text-white font-bold py-3 rounded-full mt-4 hover:bg-[#E65000] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
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
            <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
              <div className="text-center mb-6">
                <div className="w-20 h-20 rounded-full bg-[#FF6B00]/10 flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">{selectedPayment?.icon}</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">تأكيد الدفع - {selectedPayment?.name}</h2>
                <p className="text-gray-500 mt-2">
                  أدخل رمز التحقق المرسل إلى {formData.payment_phone}
                </p>
              </div>

              <form onSubmit={handleVerifyPayment}>
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2 text-center text-gray-700">رمز التحقق (OTP)</label>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-4 px-4 text-gray-900 text-center text-2xl tracking-widest placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none"
                    placeholder="------"
                    maxLength={6}
                    required
                    data-testid="otp-input"
                  />
                  <p className="text-xs text-gray-400 text-center mt-2">
                    للتجربة: أدخل أي 6 أرقام
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex justify-between text-gray-600 mb-2">
                    <span>المبلغ المطلوب</span>
                    <span className="font-bold text-gray-900">{formatPrice(cart.total)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>طريقة الدفع</span>
                    <span className="font-bold text-gray-900">{selectedPayment?.name}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full bg-[#FF6B00] text-white font-bold py-3 rounded-full hover:bg-[#E65000] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
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
            <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm">
              <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <Check size={48} className="text-green-500" />
              </div>
              <h2 className="text-2xl font-bold mb-2 text-gray-900">تم الطلب بنجاح!</h2>
              <p className="text-gray-500 mb-6">
                شكراً لتسوقك من تريند سورية
                <br />
                سيتم توصيل طلبك خلال 2-5 أيام عمل
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-500">رقم الطلب</p>
                <p className="font-bold text-[#FF6B00]">{orderId?.slice(0, 8).toUpperCase()}</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => navigate('/orders')}
                  className="flex-1 bg-[#FF6B00] text-white font-bold py-3 rounded-full hover:bg-[#E65000] transition-colors"
                  data-testid="view-orders-btn"
                >
                  متابعة الطلب
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-full hover:bg-gray-200 transition-colors"
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
