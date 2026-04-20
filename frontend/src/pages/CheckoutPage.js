import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import logger from '../lib/logger';
import { 
  MapPin, CreditCard, Check, Loader2, Plus, FileText,
  ShoppingBag, Truck, X, ChevronLeft, Clock, Wallet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../hooks/use-toast';
import GoogleMapsLocationPicker from '../components/GoogleMapsLocationPicker';

const API = process.env.REACT_APP_BACKEND_URL;

const CITIES = ['دمشق', 'حلب', 'حمص', 'اللاذقية', 'طرطوس', 'حماة', 'دير الزور', 'الرقة', 'الحسكة', 'درعا', 'السويداء', 'إدلب', 'القنيطرة', 'ريف دمشق'];

const PAYMENT_METHODS = [
  { id: 'wallet', name: 'المحفظة', icon: '👛', description: 'الدفع من رصيد محفظتك', available: true },
  { id: 'bank_card', name: 'بطاقة بنكية', icon: '💳', description: 'Visa / Mastercard', available: false, comingSoon: true },
  { id: 'shamcash', name: 'شام كاش', icon: '🏦', description: 'محفظة إلكترونية', available: true },
  { id: 'bank_account', name: 'حساب بنكي', icon: '🏛️', description: 'تحويل بنكي', available: true },
];

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, clearCart } = useCart();
  const { toast } = useToast();

  const [savedAddresses, setSavedAddresses] = useState([]);
  const [savedPayments, setSavedPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // رصيد المحفظة
  const [walletBalance, setWalletBalance] = useState(0);

  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [useNewPayment, setUseNewPayment] = useState(false);

  const [newAddress, setNewAddress] = useState({
    title: 'المنزل', city: 'دمشق', area: '', street_number: '', building_number: '', apartment_number: '', phone: '', is_default: false,
    latitude: null, longitude: null,
    address_details: '', // العنوان التفصيلي
    landmark: '' // علامة مميزة قريبة
  });

  const [newPayment, setNewPayment] = useState({
    type: 'shamcash', phone: '', holder_name: '', is_default: false
  });

  const [orderId, setOrderId] = useState(null);
  const [orderNumber, setOrderNumber] = useState(null);
  const [otp, setOtp] = useState('');
  const [orderComplete, setOrderComplete] = useState(false);
  
  // ملاحظة لموظف التوصيل (إجبارية)
  const [deliveryNote, setDeliveryNote] = useState('');
  
  // حالة الشحن
  const [shippingInfo, setShippingInfo] = useState(null);
  const [sellerShippingDetails, setSellerShippingDetails] = useState([]);
  const [shippingLoading, setShippingLoading] = useState(false);

  useEffect(() => {
    if (user) fetchSavedData();
  }, [user]);

  // حساب الشحن عند تغيير العنوان
  useEffect(() => {
    const calculateShipping = async () => {
      let selectedCity = null;
      
      if (useNewAddress) {
        selectedCity = newAddress.city;
      } else if (selectedAddressId) {
        const addr = savedAddresses.find(a => a.id === selectedAddressId);
        selectedCity = addr?.city;
      }
      
      if (selectedCity && cart.items.length > 0) {
        setShippingLoading(true);
        try {
          // جلب بيانات الشحن العامة والتفصيلية لكل بائع
          const [shippingRes, detailedRes] = await Promise.all([
            axios.get(`${API}/api/shipping/cart?customer_city=${encodeURIComponent(selectedCity)}`),
            axios.get(`${API}/api/shipping/cart/detailed?customer_city=${encodeURIComponent(selectedCity)}`)
          ]);
          setShippingInfo(shippingRes.data);
          setSellerShippingDetails(detailedRes.data.sellers || []);
        } catch (error) {
          logger.error('Error calculating shipping:', error);
          setShippingInfo(null);
          setSellerShippingDetails([]);
        } finally {
          setShippingLoading(false);
        }
      }
    };
    
    calculateShipping();
  }, [selectedAddressId, useNewAddress, newAddress.city, savedAddresses, cart.items.length, cart.total]);
  
  // حساب الشحن الفعلي من بيانات البائعين
  const allSellersFreeShipping = sellerShippingDetails.length > 0 && 
    sellerShippingDetails.every(s => s.shipping_status === 'free');
  const actualShippingCost = sellerShippingDetails.length > 0
    ? sellerShippingDetails.reduce((sum, s) => sum + (s.shipping_cost || 0), 0)
    : (shippingInfo?.shipping_cost || 0);
  const isFreeShipping = allSellersFreeShipping || (shippingInfo?.qualifies_for_free === true);
  const finalShippingCost = isFreeShipping ? 0 : actualShippingCost;

  const fetchSavedData = async () => {
    try {
      const [addressesRes, paymentsRes, walletRes] = await Promise.all([
        axios.get(`${API}/api/user/addresses`),
        axios.get(`${API}/api/user/payment-methods`),
        axios.get(`${API}/api/wallet/balance`).catch(() => ({ data: { balance: 0 } }))
      ]);
      setSavedAddresses(addressesRes.data);
      setSavedPayments(paymentsRes.data);
      setWalletBalance(walletRes.data?.balance || 0);
      
      const defaultAddress = addressesRes.data.find(a => a.is_default);
      const defaultPayment = paymentsRes.data.find(p => p.is_default);
      
      if (defaultAddress) setSelectedAddressId(defaultAddress.id);
      else if (addressesRes.data.length > 0) setSelectedAddressId(addressesRes.data[0].id);
      else setUseNewAddress(true);
      
      if (defaultPayment) setSelectedPaymentId(defaultPayment.id);
      else if (paymentsRes.data.length > 0) setSelectedPaymentId(paymentsRes.data[0].id);
      else setUseNewPayment(true);
    } catch (error) {
      setUseNewAddress(true);
      setUseNewPayment(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrder = async () => {
    if (!useNewAddress && !selectedAddressId) {
      toast({ title: "خطأ", description: "يرجى اختيار عنوان التوصيل", variant: "destructive" });
      return;
    }
    // التحقق من ملاحظة التوصيل - إجبارية
    if (!deliveryNote || deliveryNote.trim().length < 10) {
      toast({ title: "خطأ", description: "يرجى كتابة ملاحظة لموظف التوصيل (10 أحرف على الأقل) مثل: اسم الشارع، رقم البناية، لون الباب", variant: "destructive" });
      return;
    }
    if (!useNewPayment && !selectedPaymentId) {
      toast({ title: "خطأ", description: "يرجى اختيار طريقة الدفع", variant: "destructive" });
      return;
    }
    if (useNewAddress && (!newAddress.area || !newAddress.phone || !newAddress.street_number || !newAddress.building_number || !newAddress.apartment_number)) {
      toast({ title: "خطأ", description: "يرجى إكمال جميع بيانات العنوان", variant: "destructive" });
      return;
    }
    // التحقق من العنوان التفصيلي والعلامة المميزة - إجباري
    if (useNewAddress && (!newAddress.address_details || newAddress.address_details.length < 10)) {
      toast({ title: "خطأ", description: "يرجى كتابة العنوان التفصيلي (10 أحرف على الأقل)", variant: "destructive" });
      return;
    }
    if (useNewAddress && (!newAddress.landmark || newAddress.landmark.length < 5)) {
      toast({ title: "خطأ", description: "يرجى كتابة علامة مميزة قريبة", variant: "destructive" });
      return;
    }
    // التحقق من تحديد الموقع على الخريطة - إجباري
    if (useNewAddress && (!newAddress.latitude || !newAddress.longitude)) {
      toast({ title: "خطأ", description: "يرجى تحديد موقعك على الخريطة (إجباري)", variant: "destructive" });
      return;
    }
    if (useNewPayment && newPayment.type !== 'bank_card' && newPayment.type !== 'wallet' && (!newPayment.phone || !newPayment.holder_name)) {
      toast({ title: "خطأ", description: "يرجى إكمال بيانات الدفع", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      let addressData;
      if (useNewAddress) {
        await axios.post(`${API}/api/user/addresses`, newAddress);
        const fullAddress = `${newAddress.area} - شارع ${newAddress.street_number} - بناء ${newAddress.building_number} - منزل ${newAddress.apartment_number}`;
        addressData = { 
          address: fullAddress, 
          city: newAddress.city, 
          phone: newAddress.phone,
          latitude: newAddress.latitude,
          longitude: newAddress.longitude,
          address_details: newAddress.address_details,
          landmark: newAddress.landmark
        };
      } else {
        const addr = savedAddresses.find(a => a.id === selectedAddressId);
        const fullAddress = `${addr.area}${addr.street_number ? ' - شارع ' + addr.street_number : ''}${addr.building_number ? ' - بناء ' + addr.building_number : ''}${addr.apartment_number ? ' - منزل ' + addr.apartment_number : ''}`;
        addressData = { 
          address: fullAddress, 
          city: addr.city, 
          phone: addr.phone,
          latitude: addr.latitude || null,
          longitude: addr.longitude || null,
          address_details: addr.address_details || '',
          landmark: addr.landmark || ''
        };
      }

      let paymentData;
      if (useNewPayment) {
        // التحقق من رصيد المحفظة إذا اختار الدفع بالمحفظة
        if (newPayment.type === 'wallet') {
          const totalWithShipping = cart.total + finalShippingCost;
          if (walletBalance < totalWithShipping) {
            toast({ 
              title: "رصيد غير كافٍ", 
              description: `رصيد محفظتك ${formatPrice(walletBalance)} والمطلوب ${formatPrice(totalWithShipping)}`,
              variant: "destructive" 
            });
            setSubmitting(false);
            return;
          }
        }
        // لا نحفظ طريقة الدفع للبطاقة أو المحفظة
        if (newPayment.type !== 'bank_card' && newPayment.type !== 'wallet') {
          await axios.post(`${API}/api/user/payment-methods`, newPayment);
        }
        paymentData = { payment_method: newPayment.type, payment_phone: newPayment.phone || '' };
      } else {
        const pay = savedPayments.find(p => p.id === selectedPaymentId);
        paymentData = { payment_method: pay.type, payment_phone: pay.phone };
      }

      const res = await axios.post(`${API}/api/orders`, {
        items: cart.items.map(i => ({ 
          product_id: i.product_id, 
          quantity: i.quantity,
          selected_size: i.selected_size 
        })),
        ...addressData, 
        ...paymentData,
        delivery_note: deliveryNote.trim()
      });

      setOrderId(res.data.order_id);
      setOrderNumber(res.data.order_number);
      
      // معالجة مختلفة حسب طريقة الدفع
      if (paymentData.payment_method === 'wallet') {
        // الدفع من المحفظة - يتم فوراً
        try {
          await axios.post(`${API}/api/payment/wallet/pay?order_id=${res.data.order_id}`);
          clearCart();
          setOrderComplete(true);
          toast({ title: "تم الدفع بنجاح!", description: "تم خصم المبلغ من محفظتك" });
        } catch (walletError) {
          toast({ title: "خطأ", description: walletError.response?.data?.detail || "فشل الدفع من المحفظة", variant: "destructive" });
        }
      } else if (paymentData.payment_method === 'bank_card') {
        // البطاقة البنكية - قريباً
        toast({ title: "قريباً", description: "الدفع بالبطاقة البنكية سيتوفر قريباً", variant: "destructive" });
        return;
      } else {
        // المحافظ الإلكترونية - نحتاج OTP
        await axios.post(`${API}/api/payment/shamcash/init?order_id=${res.data.order_id}`);
        toast({ title: "تم إنشاء الطلب", description: "أدخل رمز التحقق لإتمام الدفع" });
      }
    } catch (error) {
      let errorMsg = error.response?.data?.detail || "فشل إنشاء الطلب، يرجى المحاولة مرة أخرى";
      if (errorMsg === "Not Found") errorMsg = "المنتج غير متوفر حالياً";
      toast({ title: "خطأ في إنشاء الطلب", description: errorMsg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (otp.length !== 6) {
      toast({ title: "خطأ", description: "يرجى إدخال 6 أرقام", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const paymentPhone = useNewPayment ? newPayment.phone : savedPayments.find(p => p.id === selectedPaymentId)?.phone;
      await axios.post(`${API}/api/payment/shamcash/verify`, { order_id: orderId, phone: paymentPhone, otp });
      clearCart();
      setOrderComplete(true);
      toast({ title: "تم الدفع بنجاح!", description: "سيتم توصيل طلبك قريباً" });
    } catch (error) {
      toast({ title: "خطأ", description: "رمز التحقق غير صحيح", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle redirects in useEffect to avoid render warnings
  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (cart.items.length === 0 && !orderId && !orderComplete) {
      navigate('/cart');
    }
  }, [user, cart.items.length, orderId, orderComplete, navigate]);

  // Show loading while checking auth/cart
  if (!user || (cart.items.length === 0 && !orderId && !orderComplete)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
      </div>
    );
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
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-xl p-6 border border-gray-200 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-green-500" />
            </div>
            <h2 className="text-lg font-bold mb-2 text-gray-900">تم الطلب بنجاح!</h2>
            <p className="text-gray-500 text-sm mb-4">شكراً لتسوقك من ترند سورية<br />سيتم التوصيل خلال 2-5 أيام</p>
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-500">رقم الطلب</p>
              <p className="font-bold text-[#FF6B00] text-lg">#{orderNumber || orderId?.slice(0, 8).toUpperCase()}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigate('/orders')} className="flex-1 bg-[#FF6B00] text-white font-bold py-2.5 rounded-full text-sm" data-testid="view-orders-btn">متابعة الطلب</button>
              <button onClick={() => navigate('/')} className="flex-1 bg-gray-100 text-gray-700 font-bold py-2.5 rounded-full text-sm" data-testid="continue-shopping-btn">متابعة التسوق</button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  const selectedPaymentMethod = useNewPayment 
    ? PAYMENT_METHODS.find(m => m.id === newPayment.type)
    : PAYMENT_METHODS.find(m => m.id === savedPayments.find(p => p.id === selectedPaymentId)?.type);

  return (
    <div className="min-h-screen pb-24 md:pb-10 bg-gray-50">
      <div className="max-w-lg mx-auto px-3 py-3">
        {/* Header */}
        <h1 className="text-sm font-bold text-gray-900 mb-3">إتمام الطلب</h1>

        {/* Single Card Container */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          
          {/* Section 1: Address */}
          <div className="p-3 border-b border-gray-100">
            <h3 className="font-bold text-xs text-gray-900 mb-2 flex items-center gap-1.5">
              <MapPin size={14} className="text-[#FF6B00]" />
              عنوان التوصيل
            </h3>

            {savedAddresses.length > 0 && !useNewAddress && (
              <div className="space-y-1.5 mb-2">
                {savedAddresses.map((addr) => (
                  <button
                    key={addr.id}
                    onClick={() => { setSelectedAddressId(addr.id); setUseNewAddress(false); }}
                    className={`w-full p-2 rounded-lg border text-right transition-all flex items-center gap-2 ${
                      selectedAddressId === addr.id ? 'border-[#FF6B00] bg-[#FF6B00]/5' : 'border-gray-200'
                    }`}
                    data-testid={`address-${addr.id}`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      selectedAddressId === addr.id ? 'border-[#FF6B00]' : 'border-gray-300'
                    }`}>
                      {selectedAddressId === addr.id && <div className="w-2 h-2 rounded-full bg-[#FF6B00]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-[11px] text-gray-900">{addr.title}</span>
                        {addr.is_default && <span className="text-[8px] bg-[#FF6B00] text-white px-1 py-0.5 rounded">افتراضي</span>}
                      </div>
                      <p className="text-[10px] text-gray-500 truncate">{addr.city} - {addr.area}</p>
                      <p className="text-[10px] text-gray-400 truncate">شارع {addr.street_number} - بناء {addr.building_number} - منزل {addr.apartment_number}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!useNewAddress && savedAddresses.length > 0 ? (
              <button
                onClick={() => { setUseNewAddress(true); setSelectedAddressId(null); }}
                className="w-full flex items-center justify-center gap-1 py-1.5 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-[#FF6B00] hover:text-[#FF6B00] transition-colors text-[10px]"
                data-testid="add-new-address-btn"
              >
                <Plus size={12} />
                عنوان جديد
              </button>
            ) : (
              <div className="bg-gray-50 rounded-lg p-2 space-y-1.5">
                {savedAddresses.length > 0 && (
                  <div className="flex justify-end">
                    <button onClick={() => { setUseNewAddress(false); setSelectedAddressId(savedAddresses[0].id); }} className="text-gray-400 hover:text-gray-600">
                      <X size={14} />
                    </button>
                  </div>
                )}
                <select
                  value={newAddress.city}
                  onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                  className="w-full bg-white border border-gray-200 rounded-lg py-1.5 px-2 text-[11px] text-gray-900"
                  data-testid="new-address-city"
                >
                  {CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                </select>
                <input
                  type="text"
                  value={newAddress.area}
                  onChange={(e) => setNewAddress({ ...newAddress, area: e.target.value })}
                  placeholder="المنطقة / الحي *"
                  className="w-full bg-white border border-gray-200 rounded-lg py-1.5 px-2 text-[11px] placeholder:text-gray-400"
                  data-testid="new-address-area"
                />
                <div className="grid grid-cols-3 gap-1.5">
                  <input
                    type="text"
                    value={newAddress.street_number}
                    onChange={(e) => setNewAddress({ ...newAddress, street_number: e.target.value })}
                    placeholder="رقم الشارع *"
                    className="w-full bg-white border border-gray-200 rounded-lg py-1.5 px-2 text-[11px] placeholder:text-gray-400"
                    data-testid="new-address-street"
                  />
                  <input
                    type="text"
                    value={newAddress.building_number}
                    onChange={(e) => setNewAddress({ ...newAddress, building_number: e.target.value })}
                    placeholder="رقم البناء *"
                    className="w-full bg-white border border-gray-200 rounded-lg py-1.5 px-2 text-[11px] placeholder:text-gray-400"
                    data-testid="new-address-building"
                  />
                  <input
                    type="text"
                    value={newAddress.apartment_number}
                    onChange={(e) => setNewAddress({ ...newAddress, apartment_number: e.target.value })}
                    placeholder="رقم المنزل *"
                    className="w-full bg-white border border-gray-200 rounded-lg py-1.5 px-2 text-[11px] placeholder:text-gray-400"
                    data-testid="new-address-apartment"
                  />
                </div>
                <input
                  type="tel"
                  value={newAddress.phone}
                  onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                  placeholder="رقم الهاتف *"
                  className="w-full bg-white border border-gray-200 rounded-lg py-1.5 px-2 text-[11px] placeholder:text-gray-400"
                  data-testid="new-address-phone"
                />
                
                {/* العنوان التفصيلي - إجباري */}
                <div className="mt-3 p-2 bg-orange-50 rounded-lg border border-orange-200">
                  <label className="block text-[11px] font-bold text-orange-700 mb-1">
                    📍 العنوان التفصيلي *
                  </label>
                  <textarea
                    value={newAddress.address_details}
                    onChange={(e) => setNewAddress({ ...newAddress, address_details: e.target.value })}
                    placeholder="الشارع، رقم البناء، الطابق، رقم الباب..."
                    className="w-full bg-white border border-orange-200 rounded-lg py-2 px-2 text-[11px] placeholder:text-gray-400 min-h-[60px]"
                    data-testid="new-address-details"
                  />
                  
                  <label className="block text-[11px] font-bold text-orange-700 mb-1 mt-2">
                    🏪 علامة مميزة قريبة *
                  </label>
                  <input
                    type="text"
                    value={newAddress.landmark}
                    onChange={(e) => setNewAddress({ ...newAddress, landmark: e.target.value })}
                    placeholder="مثال: قرب صيدلية الأمل، مقابل مسجد..."
                    className="w-full bg-white border border-orange-200 rounded-lg py-1.5 px-2 text-[11px] placeholder:text-gray-400"
                    data-testid="new-address-landmark"
                  />
                  <p className="text-[9px] text-orange-600 mt-1">⚠️ هذه المعلومات تساعد السائق في إيجاد موقعك بسهولة</p>
                </div>
                
                {/* تحديد الموقع من Google Maps - إجباري */}
                <GoogleMapsLocationPicker
                  label="📍 موقع التوصيل على الخريطة"
                  required={true}
                  currentLocation={newAddress.latitude ? { latitude: newAddress.latitude, longitude: newAddress.longitude } : null}
                  onLocationSelect={(location) => {
                    if (location) {
                      setNewAddress({ ...newAddress, latitude: location.latitude, longitude: location.longitude });
                      // تعبئة ملاحظة التوصيل بالعنوان المُجلب إذا كان فارغاً
                      if (location.address && !deliveryNote) {
                        setDeliveryNote(location.address);
                      }
                    } else {
                      setNewAddress({ ...newAddress, latitude: null, longitude: null });
                    }
                  }}
                  warningMessage="حدد الموقع الذي تريد استلام طلبك فيه بدقة لضمان وصول التوصيل."
                />
              </div>
            )}
          </div>

          {/* Section: Delivery Note - ملاحظة لموظف التوصيل */}
          <div className="p-3 border-b border-gray-100">
            <h3 className="font-bold text-xs text-gray-900 mb-2 flex items-center gap-1.5">
              <FileText size={14} className="text-[#FF6B00]" />
              ملاحظة لموظف التوصيل <span className="text-red-500">*</span>
            </h3>
            <textarea
              value={deliveryNote}
              onChange={(e) => setDeliveryNote(e.target.value)}
              placeholder="مثال: البناية أمام صيدلية الشفاء - باب أزرق - الطابق 3 - شقة 5"
              className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] outline-none"
              rows={3}
              data-testid="delivery-note-input"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              اكتب تفاصيل تساعد موظف التوصيل للوصول إليك (اسم الشارع، رقم البناية، لون الباب، طابق، علامة مميزة)
            </p>
            {deliveryNote.length > 0 && deliveryNote.length < 10 && (
              <p className="text-[10px] text-red-500 mt-1">
                يجب أن تكون الملاحظة 10 أحرف على الأقل ({deliveryNote.length}/10)
              </p>
            )}
          </div>

          {/* Section 2: Payment */}
          <div className="p-3 border-b border-gray-100">
            <h3 className="font-bold text-xs text-gray-900 mb-2 flex items-center gap-1.5">
              <CreditCard size={14} className="text-[#FF6B00]" />
              طريقة الدفع
            </h3>

            {savedPayments.length > 0 && !useNewPayment && (
              <div className="space-y-1.5 mb-2">
                {savedPayments.map((pay) => {
                  const method = PAYMENT_METHODS.find(m => m.id === pay.type);
                  return (
                    <button
                      key={pay.id}
                      onClick={() => { setSelectedPaymentId(pay.id); setUseNewPayment(false); }}
                      className={`w-full p-2 rounded-lg border text-right transition-all flex items-center gap-2 ${
                        selectedPaymentId === pay.id ? 'border-[#FF6B00] bg-[#FF6B00]/5' : 'border-gray-200'
                      }`}
                      data-testid={`payment-${pay.id}`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedPaymentId === pay.id ? 'border-[#FF6B00]' : 'border-gray-300'
                      }`}>
                        {selectedPaymentId === pay.id && <div className="w-2 h-2 rounded-full bg-[#FF6B00]" />}
                      </div>
                      <span className="text-base">{method?.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-[11px] text-gray-900">{method?.name}</span>
                          {pay.is_default && <span className="text-[8px] bg-[#FF6B00] text-white px-1 py-0.5 rounded">افتراضي</span>}
                        </div>
                        <p className="text-[10px] text-gray-500">{pay.phone}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {!useNewPayment && savedPayments.length > 0 ? (
              <button
                onClick={() => { setUseNewPayment(true); setSelectedPaymentId(null); }}
                className="w-full flex items-center justify-center gap-1 py-1.5 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-[#FF6B00] hover:text-[#FF6B00] transition-colors text-[10px]"
                data-testid="add-new-payment-btn"
              >
                <Plus size={12} />
                طريقة دفع جديدة
              </button>
            ) : (
              <div className="bg-gray-50 rounded-lg p-2 space-y-1.5">
                {savedPayments.length > 0 && (
                  <div className="flex justify-end">
                    <button onClick={() => { setUseNewPayment(false); setSelectedPaymentId(savedPayments[0].id); }} className="text-gray-400 hover:text-gray-600">
                      <X size={14} />
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-1">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => method.available && setNewPayment({ ...newPayment, type: method.id })}
                      disabled={!method.available}
                      className={`p-1.5 rounded-lg border transition-all text-center relative ${
                        !method.available
                          ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                          : newPayment.type === method.id 
                          ? 'border-[#FF6B00] bg-white' 
                          : 'border-gray-200 bg-white'
                      }`}
                      data-testid={`new-payment-type-${method.id}`}
                    >
                      {method.comingSoon && (
                        <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[7px] px-1 py-0.5 rounded-full">
                          قريباً
                        </span>
                      )}
                      <span className="text-base block">{method.icon}</span>
                      <span className="text-[9px] text-gray-700">{method.name}</span>
                    </button>
                  ))}
                </div>
                
                {/* إخفاء حقول الإدخال للبطاقة */}
                {newPayment.type !== 'bank_card' && newPayment.type !== 'wallet' && (
                  <>
                    <input
                      type="tel"
                      value={newPayment.phone}
                      onChange={(e) => setNewPayment({ ...newPayment, phone: e.target.value })}
                      placeholder="رقم المحفظة *"
                      className="w-full bg-white border border-gray-200 rounded-lg py-1.5 px-2 text-[11px] placeholder:text-gray-400"
                      data-testid="new-payment-phone"
                    />
                    <input
                      type="text"
                      value={newPayment.holder_name}
                      onChange={(e) => setNewPayment({ ...newPayment, holder_name: e.target.value })}
                      placeholder="اسم صاحب الحساب *"
                      className="w-full bg-white border border-gray-200 rounded-lg py-1.5 px-2 text-[11px] placeholder:text-gray-400"
                      data-testid="new-payment-holder"
                    />
                  </>
                )}
                
                {/* رسالة توضيحية للبطاقة البنكية */}
                {newPayment.type === 'bank_card' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
                    <p className="text-[10px] text-blue-700">الدفع بالبطاقة البنكية قريباً</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Order Summary */}
          <div className="p-3">
            <h3 className="font-bold text-xs text-gray-900 mb-2 flex items-center gap-1.5">
              <ShoppingBag size={14} className="text-[#FF6B00]" />
              ملخص الطلب
            </h3>

            <div className="bg-gray-50 rounded-lg p-2 mb-3 text-[11px]">
              <div className="flex justify-between text-gray-600 mb-1">
                <span>المجموع ({cart.items.length} منتج)</span>
                <span className="font-bold text-gray-900">{formatPrice(cart.total)}</span>
              </div>
              
              {/* تكلفة الشحن */}
              <div className="flex justify-between text-gray-600 mb-1">
                <span>التوصيل</span>
                {shippingLoading ? (
                  <span className="text-gray-400">جاري الحساب...</span>
                ) : isFreeShipping ? (
                  <span className="font-bold text-green-600">مجاني</span>
                ) : finalShippingCost > 0 ? (
                  <span className="font-bold text-gray-900">{formatPrice(finalShippingCost)}</span>
                ) : (
                  <span className="text-gray-400">اختر العنوان</span>
                )}
              </div>
              
              {/* رسالة الشحن */}
              {shippingInfo && !isFreeShipping && (
                <div className="text-[10px] py-1 mb-1">
                  {shippingInfo.remaining_for_free ? (
                    <p className="text-amber-600 bg-amber-50 rounded px-2 py-1">
                      أضف {formatPrice(shippingInfo.remaining_for_free)} للتوصيل المجاني
                    </p>
                  ) : shippingInfo.no_free_option ? (
                    <p className="text-gray-500">
                      {shippingInfo.seller_count > 1 
                        ? "الشحن المجاني متاح فقط عند الشراء من متجر واحد"
                        : `الشحن من ${shippingInfo.seller_city} إلى ${shippingInfo.customer_city}`
                      }
                    </p>
                  ) : null}
                </div>
              )}
              
              <div className="flex justify-between font-bold text-gray-900 pt-1 border-t border-gray-200 text-xs">
                <span>الإجمالي</span>
                <span className="text-[#FF6B00]">
                  {formatPrice(cart.total + finalShippingCost)}
                </span>
              </div>
            </div>

            {/* OTP Section */}
            {orderId ? (
              <div className="text-center">
                <p className="text-[11px] text-gray-600 mb-1">أدخل رمز التحقق المرسل إلى</p>
                <p className="text-xs font-bold text-gray-900 mb-2">{selectedPaymentMethod?.name} - {useNewPayment ? newPayment.phone : savedPayments.find(p => p.id === selectedPaymentId)?.phone}</p>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-gray-900 text-center text-lg tracking-widest placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none mb-1"
                  placeholder="------"
                  maxLength={6}
                  data-testid="otp-input"
                />
                <p className="text-[9px] text-gray-400 mb-2">للتجربة: أدخل أي 6 أرقام</p>
                <button
                  onClick={handleVerifyPayment}
                  disabled={submitting || otp.length !== 6}
                  className="w-full bg-[#FF6B00] text-white font-bold py-2 rounded-full disabled:opacity-50 flex items-center justify-center gap-2 text-xs"
                  data-testid="verify-payment-btn"
                >
                  {submitting ? <><Loader2 className="animate-spin" size={14} /> جاري التحقق...</> : <><Check size={14} /> تأكيد الدفع</>}
                </button>
              </div>
            ) : (
              <button
                onClick={handleCreateOrder}
                disabled={submitting || (!selectedAddressId && !(useNewAddress && newAddress.area && newAddress.phone)) || (!selectedPaymentId && !(useNewPayment && newPayment.phone && newPayment.holder_name))}
                className="w-full bg-[#FF6B00] text-white font-bold py-2.5 rounded-full disabled:opacity-50 flex items-center justify-center gap-2 text-xs"
                data-testid="create-order-btn"
              >
                {submitting ? (
                  <><Loader2 className="animate-spin" size={14} /> جاري إنشاء الطلب...</>
                ) : (
                  <><Truck size={14} /> تأكيد الطلب • {formatPrice(cart.total + finalShippingCost)}</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Free delivery banner */}
        <div className="flex items-center justify-center gap-2 text-[10px] text-gray-600 bg-gray-100 rounded-lg py-2 mt-3">
          <Truck size={12} />
          <span>توصيل مجاني عند الشراء من متجر واحد بنفس المحافظة (أكثر من 150,000 ل.س)</span>
        </div>
        
        {/* Refund policy notice */}
        <div className="flex items-center justify-center gap-2 text-[10px] text-green-700 bg-green-50 border border-green-200 rounded-lg py-2 mt-2">
          <Clock size={12} />
          <span>يمكنك إلغاء الطلب واسترداد أموالك خلال ساعة من بعد الدفع</span>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
