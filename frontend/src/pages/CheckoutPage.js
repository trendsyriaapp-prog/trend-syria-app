import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  MapPin, CreditCard, Check, Loader2, Plus, ChevronDown, 
  ChevronUp, ShoppingBag, Truck, X, Edit2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CITIES = ['دمشق', 'حلب', 'حمص', 'اللاذقية', 'طرطوس', 'حماة', 'دير الزور', 'الرقة', 'الحسكة', 'درعا', 'السويداء', 'إدلب', 'القنيطرة', 'ريف دمشق'];

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

  // Data states
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [savedPayments, setSavedPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Selection states
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [useNewPayment, setUseNewPayment] = useState(false);

  // Expand/collapse states
  const [addressExpanded, setAddressExpanded] = useState(true);
  const [paymentExpanded, setPaymentExpanded] = useState(false);
  const [confirmExpanded, setConfirmExpanded] = useState(false);

  // New address form
  const [newAddress, setNewAddress] = useState({
    title: 'المنزل',
    city: 'دمشق',
    area: '',
    street: '',
    phone: '',
    is_default: false
  });

  // New payment form
  const [newPayment, setNewPayment] = useState({
    type: 'shamcash',
    phone: '',
    holder_name: '',
    is_default: false
  });

  // Order states
  const [orderId, setOrderId] = useState(null);
  const [otp, setOtp] = useState('');
  const [orderComplete, setOrderComplete] = useState(false);

  useEffect(() => {
    if (user) fetchSavedData();
  }, [user]);

  const fetchSavedData = async () => {
    try {
      const [addressesRes, paymentsRes] = await Promise.all([
        axios.get(`${API}/user/addresses`),
        axios.get(`${API}/user/payment-methods`)
      ]);
      setSavedAddresses(addressesRes.data);
      setSavedPayments(paymentsRes.data);
      
      // Auto-select defaults
      const defaultAddress = addressesRes.data.find(a => a.is_default);
      const defaultPayment = paymentsRes.data.find(p => p.is_default);
      
      if (defaultAddress) {
        setSelectedAddressId(defaultAddress.id);
        setAddressExpanded(false);
        setPaymentExpanded(true);
      } else if (addressesRes.data.length > 0) {
        setSelectedAddressId(addressesRes.data[0].id);
      } else {
        setUseNewAddress(true);
      }
      
      if (defaultPayment) {
        setSelectedPaymentId(defaultPayment.id);
      } else if (paymentsRes.data.length > 0) {
        setSelectedPaymentId(paymentsRes.data[0].id);
      } else {
        setUseNewPayment(true);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setUseNewAddress(true);
      setUseNewPayment(true);
    } finally {
      setLoading(false);
    }
  };

  const handleAddressSelect = (id) => {
    setSelectedAddressId(id);
    setUseNewAddress(false);
    setAddressExpanded(false);
    setPaymentExpanded(true);
  };

  const handlePaymentSelect = (id) => {
    setSelectedPaymentId(id);
    setUseNewPayment(false);
    setPaymentExpanded(false);
    setConfirmExpanded(true);
  };

  const handleCreateOrder = async () => {
    // Validate selections
    if (!useNewAddress && !selectedAddressId) {
      toast({ title: "خطأ", description: "يرجى اختيار عنوان التوصيل", variant: "destructive" });
      setAddressExpanded(true);
      return;
    }
    if (!useNewPayment && !selectedPaymentId) {
      toast({ title: "خطأ", description: "يرجى اختيار طريقة الدفع", variant: "destructive" });
      setPaymentExpanded(true);
      return;
    }

    // Validate new address fields
    if (useNewAddress && (!newAddress.area || !newAddress.phone)) {
      toast({ title: "خطأ", description: "يرجى إكمال بيانات العنوان", variant: "destructive" });
      setAddressExpanded(true);
      return;
    }

    // Validate new payment fields
    if (useNewPayment && (!newPayment.phone || !newPayment.holder_name)) {
      toast({ title: "خطأ", description: "يرجى إكمال بيانات الدفع", variant: "destructive" });
      setPaymentExpanded(true);
      return;
    }

    setSubmitting(true);

    try {
      // Get address details
      let addressData;
      if (useNewAddress) {
        // Save new address first
        const savedAddr = await axios.post(`${API}/user/addresses`, newAddress);
        addressData = {
          address: `${newAddress.area}${newAddress.street ? ' - ' + newAddress.street : ''}`,
          city: newAddress.city,
          phone: newAddress.phone
        };
      } else {
        const addr = savedAddresses.find(a => a.id === selectedAddressId);
        addressData = {
          address: `${addr.area}${addr.street ? ' - ' + addr.street : ''}`,
          city: addr.city,
          phone: addr.phone
        };
      }

      // Get payment details
      let paymentData;
      if (useNewPayment) {
        // Save new payment first
        await axios.post(`${API}/user/payment-methods`, newPayment);
        paymentData = {
          payment_method: newPayment.type,
          payment_phone: newPayment.phone
        };
      } else {
        const pay = savedPayments.find(p => p.id === selectedPaymentId);
        paymentData = {
          payment_method: pay.type,
          payment_phone: pay.phone
        };
      }

      // Create order
      const res = await axios.post(`${API}/orders`, {
        items: cart.items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        ...addressData,
        ...paymentData
      });

      setOrderId(res.data.order_id);
      
      // Init payment
      await axios.post(`${API}/payment/shamcash/init?order_id=${res.data.order_id}`);
      
      // Expand confirm section for OTP
      setAddressExpanded(false);
      setPaymentExpanded(false);
      setConfirmExpanded(true);

      toast({
        title: "تم إنشاء الطلب",
        description: "أدخل رمز التحقق لإتمام الدفع"
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "حدث خطأ في إنشاء الطلب",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (otp.length !== 6) {
      toast({ title: "خطأ", description: "يرجى إدخال رمز التحقق (6 أرقام)", variant: "destructive" });
      return;
    }

    setSubmitting(true);

    try {
      const paymentPhone = useNewPayment ? newPayment.phone : savedPayments.find(p => p.id === selectedPaymentId)?.phone;
      
      await axios.post(`${API}/payment/shamcash/verify`, {
        order_id: orderId,
        phone: paymentPhone,
        otp: otp
      });

      clearCart();
      setOrderComplete(true);
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
      setSubmitting(false);
    }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  if (cart.items.length === 0 && !orderId) {
    navigate('/cart');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
      </div>
    );
  }

  // Success Screen
  if (orderComplete) {
    return (
      <div className="min-h-screen pb-20 md:pb-10 bg-gray-50">
        <div className="max-w-lg mx-auto px-3 py-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 border border-gray-200 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-green-500" />
            </div>
            <h2 className="text-lg font-bold mb-2 text-gray-900">تم الطلب بنجاح!</h2>
            <p className="text-gray-500 text-sm mb-4">
              شكراً لتسوقك من تريند سورية
              <br />
              سيتم التوصيل خلال 2-5 أيام
            </p>
            
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-500">رقم الطلب</p>
              <p className="font-bold text-[#FF6B00] text-lg">{orderId?.slice(0, 8).toUpperCase()}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => navigate('/orders')}
                className="flex-1 bg-[#FF6B00] text-white font-bold py-2.5 rounded-full hover:bg-[#E65000] transition-colors text-sm"
                data-testid="view-orders-btn"
              >
                متابعة الطلب
              </button>
              <button
                onClick={() => navigate('/')}
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-2.5 rounded-full hover:bg-gray-200 transition-colors text-sm"
                data-testid="continue-shopping-btn"
              >
                متابعة التسوق
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const selectedAddress = savedAddresses.find(a => a.id === selectedAddressId);
  const selectedPayment = savedPayments.find(p => p.id === selectedPaymentId);
  const paymentMethod = useNewPayment 
    ? PAYMENT_METHODS.find(m => m.id === newPayment.type)
    : PAYMENT_METHODS.find(m => m.id === selectedPayment?.type);

  return (
    <div className="min-h-screen pb-24 md:pb-10 bg-gray-50">
      <div className="max-w-lg mx-auto px-3 py-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <ShoppingBag size={18} className="text-[#FF6B00]" />
            إتمام الطلب
          </h1>
          <span className="text-xs text-gray-500">{cart.items.length} منتج</span>
        </div>

        {/* Section 1: Address */}
        <div className="bg-white rounded-xl border border-gray-200 mb-3 overflow-hidden">
          <button
            onClick={() => setAddressExpanded(!addressExpanded)}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
            data-testid="address-section-toggle"
          >
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                (selectedAddressId || (useNewAddress && newAddress.area)) ? 'bg-green-100' : 'bg-[#FF6B00]/10'
              }`}>
                {(selectedAddressId || (useNewAddress && newAddress.area)) 
                  ? <Check size={14} className="text-green-600" />
                  : <MapPin size={14} className="text-[#FF6B00]" />
                }
              </div>
              <div className="text-right">
                <h3 className="font-bold text-sm text-gray-900">عنوان التوصيل</h3>
                {selectedAddress && !useNewAddress && (
                  <p className="text-[10px] text-gray-500">{selectedAddress.title} - {selectedAddress.city}</p>
                )}
                {useNewAddress && newAddress.area && (
                  <p className="text-[10px] text-gray-500">{newAddress.city} - {newAddress.area}</p>
                )}
              </div>
            </div>
            {addressExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
          </button>

          <AnimatePresence>
            {addressExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-3 border-t border-gray-100 pt-3">
                  {/* Saved addresses */}
                  {savedAddresses.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {savedAddresses.map((addr) => (
                        <button
                          key={addr.id}
                          onClick={() => handleAddressSelect(addr.id)}
                          className={`w-full p-2 rounded-lg border text-right transition-all ${
                            selectedAddressId === addr.id && !useNewAddress
                              ? 'border-[#FF6B00] bg-[#FF6B00]/5'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          data-testid={`address-${addr.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                selectedAddressId === addr.id && !useNewAddress ? 'border-[#FF6B00]' : 'border-gray-300'
                              }`}>
                                {selectedAddressId === addr.id && !useNewAddress && (
                                  <div className="w-2 h-2 rounded-full bg-[#FF6B00]" />
                                )}
                              </div>
                              <div>
                                <span className="font-bold text-xs text-gray-900">{addr.title}</span>
                                {addr.is_default && (
                                  <span className="mr-1 text-[8px] bg-[#FF6B00] text-white px-1 py-0.5 rounded">افتراضي</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <p className="text-[10px] text-gray-600 mt-1 mr-6">{addr.city} - {addr.area}</p>
                          <p className="text-[10px] text-gray-500 mr-6">{addr.phone}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* New address button/form */}
                  {!useNewAddress ? (
                    <button
                      onClick={() => { setUseNewAddress(true); setSelectedAddressId(null); }}
                      className="w-full flex items-center justify-center gap-1 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-[#FF6B00] hover:text-[#FF6B00] transition-colors text-xs"
                      data-testid="add-new-address-btn"
                    >
                      <Plus size={14} />
                      إضافة عنوان جديد
                    </button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-50 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-xs text-gray-900">عنوان جديد</h4>
                        {savedAddresses.length > 0 && (
                          <button onClick={() => { setUseNewAddress(false); setSelectedAddressId(savedAddresses[0].id); }} className="text-gray-400 hover:text-gray-600">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <select
                          value={newAddress.city}
                          onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                          className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs text-gray-900"
                          data-testid="new-address-city"
                        >
                          {CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                        </select>
                        <input
                          type="text"
                          value={newAddress.area}
                          onChange={(e) => setNewAddress({ ...newAddress, area: e.target.value })}
                          placeholder="المنطقة / الحي *"
                          className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs placeholder:text-gray-400"
                          data-testid="new-address-area"
                        />
                        <input
                          type="text"
                          value={newAddress.street}
                          onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
                          placeholder="الشارع / البناء (اختياري)"
                          className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs placeholder:text-gray-400"
                          data-testid="new-address-street"
                        />
                        <input
                          type="tel"
                          value={newAddress.phone}
                          onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                          placeholder="رقم الهاتف *"
                          className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs placeholder:text-gray-400"
                          data-testid="new-address-phone"
                        />
                        <button
                          onClick={() => { setAddressExpanded(false); setPaymentExpanded(true); }}
                          disabled={!newAddress.area || !newAddress.phone}
                          className="w-full bg-[#FF6B00] text-white py-2 rounded-lg font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          data-testid="confirm-new-address-btn"
                        >
                          تأكيد العنوان
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Section 2: Payment */}
        <div className="bg-white rounded-xl border border-gray-200 mb-3 overflow-hidden">
          <button
            onClick={() => setPaymentExpanded(!paymentExpanded)}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
            data-testid="payment-section-toggle"
          >
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                (selectedPaymentId || (useNewPayment && newPayment.phone)) ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {(selectedPaymentId || (useNewPayment && newPayment.phone))
                  ? <Check size={14} className="text-green-600" />
                  : <CreditCard size={14} className="text-gray-400" />
                }
              </div>
              <div className="text-right">
                <h3 className="font-bold text-sm text-gray-900">طريقة الدفع</h3>
                {selectedPayment && !useNewPayment && (
                  <p className="text-[10px] text-gray-500">{PAYMENT_METHODS.find(m => m.id === selectedPayment.type)?.name} - {selectedPayment.phone}</p>
                )}
                {useNewPayment && newPayment.phone && (
                  <p className="text-[10px] text-gray-500">{PAYMENT_METHODS.find(m => m.id === newPayment.type)?.name} - {newPayment.phone}</p>
                )}
              </div>
            </div>
            {paymentExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
          </button>

          <AnimatePresence>
            {paymentExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-3 border-t border-gray-100 pt-3">
                  {/* Saved payments */}
                  {savedPayments.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {savedPayments.map((pay) => {
                        const method = PAYMENT_METHODS.find(m => m.id === pay.type);
                        return (
                          <button
                            key={pay.id}
                            onClick={() => handlePaymentSelect(pay.id)}
                            className={`w-full p-2 rounded-lg border text-right transition-all ${
                              selectedPaymentId === pay.id && !useNewPayment
                                ? 'border-[#FF6B00] bg-[#FF6B00]/5'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                            data-testid={`payment-${pay.id}`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                                selectedPaymentId === pay.id && !useNewPayment ? 'border-[#FF6B00]' : 'border-gray-300'
                              }`}>
                                {selectedPaymentId === pay.id && !useNewPayment && (
                                  <div className="w-2 h-2 rounded-full bg-[#FF6B00]" />
                                )}
                              </div>
                              <span className="text-lg">{method?.icon}</span>
                              <div>
                                <span className="font-bold text-xs text-gray-900">{method?.name}</span>
                                {pay.is_default && (
                                  <span className="mr-1 text-[8px] bg-[#FF6B00] text-white px-1 py-0.5 rounded">افتراضي</span>
                                )}
                              </div>
                            </div>
                            <p className="text-[10px] text-gray-600 mt-1 mr-8">{pay.phone} - {pay.holder_name}</p>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* New payment button/form */}
                  {!useNewPayment ? (
                    <button
                      onClick={() => { setUseNewPayment(true); setSelectedPaymentId(null); }}
                      className="w-full flex items-center justify-center gap-1 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-[#FF6B00] hover:text-[#FF6B00] transition-colors text-xs"
                      data-testid="add-new-payment-btn"
                    >
                      <Plus size={14} />
                      إضافة طريقة دفع جديدة
                    </button>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gray-50 rounded-lg p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-xs text-gray-900">طريقة دفع جديدة</h4>
                        {savedPayments.length > 0 && (
                          <button onClick={() => { setUseNewPayment(false); setSelectedPaymentId(savedPayments[0].id); }} className="text-gray-400 hover:text-gray-600">
                            <X size={14} />
                          </button>
                        )}
                      </div>
                      <div className="space-y-2">
                        <div className="grid grid-cols-3 gap-1.5">
                          {PAYMENT_METHODS.map((method) => (
                            <button
                              key={method.id}
                              type="button"
                              onClick={() => setNewPayment({ ...newPayment, type: method.id })}
                              className={`p-2 rounded-lg border transition-all text-center ${
                                newPayment.type === method.id
                                  ? 'border-[#FF6B00] bg-white'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                              data-testid={`new-payment-type-${method.id}`}
                            >
                              <span className="text-lg block">{method.icon}</span>
                              <span className="text-[9px] font-medium text-gray-700">{method.name}</span>
                            </button>
                          ))}
                        </div>
                        <input
                          type="tel"
                          value={newPayment.phone}
                          onChange={(e) => setNewPayment({ ...newPayment, phone: e.target.value })}
                          placeholder="رقم المحفظة *"
                          className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs placeholder:text-gray-400"
                          data-testid="new-payment-phone"
                        />
                        <input
                          type="text"
                          value={newPayment.holder_name}
                          onChange={(e) => setNewPayment({ ...newPayment, holder_name: e.target.value })}
                          placeholder="اسم صاحب الحساب *"
                          className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 text-xs placeholder:text-gray-400"
                          data-testid="new-payment-holder"
                        />
                        <button
                          onClick={() => { setPaymentExpanded(false); setConfirmExpanded(true); }}
                          disabled={!newPayment.phone || !newPayment.holder_name}
                          className="w-full bg-[#FF6B00] text-white py-2 rounded-lg font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                          data-testid="confirm-new-payment-btn"
                        >
                          تأكيد طريقة الدفع
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Section 3: Order Summary & Confirmation */}
        <div className="bg-white rounded-xl border border-gray-200 mb-3 overflow-hidden">
          <button
            onClick={() => setConfirmExpanded(!confirmExpanded)}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
            data-testid="confirm-section-toggle"
          >
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${orderId ? 'bg-green-100' : 'bg-gray-100'}`}>
                {orderId ? <Check size={14} className="text-green-600" /> : <ShoppingBag size={14} className="text-gray-400" />}
              </div>
              <div className="text-right">
                <h3 className="font-bold text-sm text-gray-900">تأكيد الطلب</h3>
                <p className="text-[10px] text-gray-500">{formatPrice(cart.total)}</p>
              </div>
            </div>
            {confirmExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
          </button>

          <AnimatePresence>
            {confirmExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-3 pb-3 border-t border-gray-100 pt-3">
                  {/* Order Summary */}
                  <div className="bg-gray-50 rounded-lg p-2 mb-3">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>المجموع</span>
                      <span className="font-bold text-gray-900">{formatPrice(cart.total)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>التوصيل</span>
                      <span className="font-bold text-green-600">مجاني</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-200">
                      <span>الإجمالي</span>
                      <span className="text-[#FF6B00]">{formatPrice(cart.total)}</span>
                    </div>
                  </div>

                  {/* Selected info summary */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <MapPin size={12} className="text-[#FF6B00]" />
                        <span className="text-[10px] text-gray-700">
                          {useNewAddress 
                            ? `${newAddress.city} - ${newAddress.area}` 
                            : selectedAddress 
                              ? `${selectedAddress.city} - ${selectedAddress.area}`
                              : 'لم يتم اختيار عنوان'
                          }
                        </span>
                      </div>
                      <button onClick={() => setAddressExpanded(true)} className="text-[#FF6B00]">
                        <Edit2 size={12} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{paymentMethod?.icon}</span>
                        <span className="text-[10px] text-gray-700">
                          {paymentMethod?.name} - {useNewPayment ? newPayment.phone : selectedPayment?.phone}
                        </span>
                      </div>
                      <button onClick={() => setPaymentExpanded(true)} className="text-[#FF6B00]">
                        <Edit2 size={12} />
                      </button>
                    </div>
                  </div>

                  {/* OTP Section (shows after order created) */}
                  {orderId ? (
                    <div className="text-center">
                      <div className="mb-3">
                        <p className="text-xs text-gray-600 mb-2">أدخل رمز التحقق المرسل إلى</p>
                        <p className="text-sm font-bold text-gray-900">{useNewPayment ? newPayment.phone : selectedPayment?.phone}</p>
                      </div>
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2.5 px-3 text-gray-900 text-center text-lg tracking-widest placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none mb-2"
                        placeholder="------"
                        maxLength={6}
                        data-testid="otp-input"
                      />
                      <p className="text-[9px] text-gray-400 mb-3">للتجربة: أدخل أي 6 أرقام</p>
                      <button
                        onClick={handleVerifyPayment}
                        disabled={submitting || otp.length !== 6}
                        className="w-full bg-[#FF6B00] text-white font-bold py-2.5 rounded-full hover:bg-[#E65000] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 text-sm"
                        data-testid="verify-payment-btn"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="animate-spin" size={16} />
                            جاري التحقق...
                          </>
                        ) : (
                          <>
                            <Check size={16} />
                            تأكيد الدفع
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleCreateOrder}
                      disabled={submitting || (!selectedAddressId && !useNewAddress) || (!selectedPaymentId && !useNewPayment)}
                      className="w-full bg-[#FF6B00] text-white font-bold py-2.5 rounded-full hover:bg-[#E65000] disabled:opacity-50 transition-colors flex items-center justify-center gap-2 text-sm"
                      data-testid="create-order-btn"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          جاري إنشاء الطلب...
                        </>
                      ) : (
                        <>
                          <Truck size={16} />
                          تأكيد الطلب ({formatPrice(cart.total)})
                        </>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Free delivery banner */}
        <div className="flex items-center justify-center gap-2 text-xs text-green-600 bg-green-50 rounded-lg py-2">
          <Truck size={14} />
          <span>توصيل مجاني لجميع أنحاء سوريا</span>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
