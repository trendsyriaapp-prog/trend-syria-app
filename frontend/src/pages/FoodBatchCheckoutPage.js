// صفحة الدفع الموحد - إكمال جميع طلبات الطعام دفعة واحدة
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  ArrowRight, Store, MapPin, Phone, CreditCard, Wallet, 
  Clock, Loader2, Check, Package, Bike, Plus, Home, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFoodCart } from '../context/FoodCartContext';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const FoodBatchCheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token } = useAuth();
  const { clearAllFoodCarts } = useFoodCart();
  const { toast } = useToast();
  
  const { stores = [], storeDetails = {}, totalAmount = 0 } = location.state || {};
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  
  // العناوين المحفوظة
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  
  // عنوان جديد
  const [newAddress, setNewAddress] = useState({
    title: 'المنزل',
    city: 'دمشق',
    area: '',
    street_number: '',
    building_number: '',
    apartment_number: '',
    phone: '',
    is_default: false
  });
  
  // طرق الدفع
  const [savedPayments, setSavedPayments] = useState([]);
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [useNewPayment, setUseNewPayment] = useState(false);
  const [newPayment, setNewPayment] = useState({
    type: 'wallet',
    phone: '',
    holder_name: '',
    is_default: false
  });
  
  // حساب رسوم التوصيل لكل متجر
  const [deliveryFees, setDeliveryFees] = useState({});
  
  useEffect(() => {
    if (!user || !token) {
      navigate('/login', { replace: true });
      return;
    }
    
    if (!stores || stores.length === 0) {
      navigate('/food/my-cart', { replace: true });
      return;
    }
    
    fetchInitialData();
  }, [user, token]);
  
  // حساب رسوم التوصيل
  useEffect(() => {
    if (!stores || stores.length === 0) return;
    
    const fees = {};
    stores.forEach(store => {
      const details = storeDetails[store.storeId];
      const freeMin = details?.free_delivery_minimum || 0;
      const baseFee = details?.delivery_fee || 5000;
      
      if (freeMin > 0 && store.totalAmount >= freeMin) {
        fees[store.storeId] = 0;
      } else {
        fees[store.storeId] = baseFee;
      }
    });
    setDeliveryFees(fees);
  }, [stores.length]);
  
  const totalDeliveryFee = Object.values(deliveryFees).reduce((sum, fee) => sum + fee, 0);
  const grandTotal = totalAmount + totalDeliveryFee;
  
  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [walletRes, addressesRes, paymentsRes] = await Promise.all([
        axios.get(`${API}/wallet/balance`, {
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => ({ data: { balance: 0 } })),
        axios.get(`${API}/user/addresses`).catch(() => ({ data: [] })),
        axios.get(`${API}/user/payment-methods`).catch(() => ({ data: [] }))
      ]);
      
      setWalletBalance(walletRes.data.balance || 0);
      setSavedAddresses(addressesRes.data || []);
      setSavedPayments(paymentsRes.data || []);
      
      // تعيين العنوان الافتراضي
      const defaultAddr = addressesRes.data.find(a => a.is_default);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
      } else if (addressesRes.data.length > 0) {
        setSelectedAddressId(addressesRes.data[0].id);
      } else {
        setUseNewAddress(true);
      }
      
      // تعيين طريقة الدفع الافتراضية
      const defaultPayment = paymentsRes.data.find(p => p.is_default);
      if (defaultPayment) {
        setSelectedPaymentId(defaultPayment.id);
      }
      
      // تعبئة بيانات المستخدم
      if (user) {
        setNewAddress(prev => ({
          ...prev,
          city: user.city || prev.city,
          phone: user.phone || prev.phone
        }));
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmit = async () => {
    // التحقق من العنوان
    let addressData;
    if (useNewAddress || savedAddresses.length === 0) {
      if (!newAddress.area || !newAddress.city || !newAddress.phone) {
        toast({
          title: "تنبيه",
          description: "يرجى ملء جميع بيانات العنوان",
          variant: "destructive"
        });
        return;
      }
      const fullAddress = `${newAddress.area}${newAddress.street_number ? ' - شارع ' + newAddress.street_number : ''}${newAddress.building_number ? ' - بناء ' + newAddress.building_number : ''}${newAddress.apartment_number ? ' - شقة ' + newAddress.apartment_number : ''}`;
      addressData = {
        address: fullAddress,
        city: newAddress.city,
        phone: newAddress.phone
      };
      
      // حفظ العنوان الجديد
      if (newAddress.is_default || savedAddresses.length === 0) {
        try {
          await axios.post(`${API}/user/addresses`, newAddress);
        } catch (e) {}
      }
    } else {
      const addr = savedAddresses.find(a => a.id === selectedAddressId);
      if (!addr) {
        toast({
          title: "تنبيه",
          description: "يرجى اختيار عنوان التوصيل",
          variant: "destructive"
        });
        return;
      }
      const fullAddress = `${addr.area}${addr.street_number ? ' - شارع ' + addr.street_number : ''}${addr.building_number ? ' - بناء ' + addr.building_number : ''}${addr.apartment_number ? ' - شقة ' + addr.apartment_number : ''}`;
      addressData = {
        address: fullAddress,
        city: addr.city,
        phone: addr.phone
      };
    }
    
    // تحديد طريقة الدفع
    let paymentMethod = 'wallet';
    if (useNewPayment || savedPayments.length === 0) {
      paymentMethod = newPayment.type;
    } else if (selectedPaymentId) {
      const pay = savedPayments.find(p => p.id === selectedPaymentId);
      paymentMethod = pay?.type || 'wallet';
    }
    
    // التحقق من الرصيد إذا كان الدفع من المحفظة
    if (paymentMethod === 'wallet' && walletBalance < grandTotal) {
      toast({
        title: "رصيد غير كافي",
        description: `رصيد المحفظة: ${formatPrice(walletBalance)}، المطلوب: ${formatPrice(grandTotal)}`,
        variant: "destructive"
      });
      return;
    }
    
    setSubmitting(true);
    
    try {
      // حفظ طريقة الدفع الجديدة إذا كانت محفظة إلكترونية
      if (useNewPayment && newPayment.type !== 'wallet' && newPayment.type !== 'card') {
        try {
          await axios.post(`${API}/user/payment-methods`, newPayment);
        } catch (e) {}
      }
      
      // تجهيز البيانات للإرسال
      const batchOrders = stores.map(store => ({
        store_id: store.storeId,
        items: store.items.map(item => ({
          product_id: item.product_id || item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        notes: null
      }));
      
      const response = await axios.post(`${API}/food/orders/batch`, {
        orders: batchOrders,
        delivery_address: addressData.address,
        delivery_city: addressData.city,
        delivery_phone: addressData.phone,
        payment_method: paymentMethod
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // مسح السلة
      clearAllFoodCarts();
      
      toast({
        title: "🎉 تم إنشاء الطلبات بنجاح!",
        description: `تم إنشاء ${response.data.stores_count} طلب - رقم الدفعة: ${response.data.batch_id}`
      });
      
      // الانتقال لصفحة تأكيد الطلب
      navigate('/food/batch-success', {
        state: {
          batchId: response.data.batch_id,
          orders: response.data.orders,
          totalAmount: response.data.total_amount,
          storesCount: response.data.stores_count
        }
      });
      
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل إنشاء الطلبات",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 pb-40">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#FF6B00] to-[#FF8C00] text-white px-4 py-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowRight size={24} />
          </button>
          <div>
            <h1 className="text-lg font-bold">إكمال جميع الطلبات</h1>
            <p className="text-orange-100 text-xs">{stores.length} متجر • دفعة واحدة</p>
          </div>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {/* ملخص الطلبات */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-3 bg-gradient-to-r from-orange-50 to-orange-100 border-b border-orange-200">
            <div className="flex items-center gap-2">
              <Package size={18} className="text-[#FF6B00]" />
              <h2 className="font-bold text-gray-900">ملخص الطلبات ({stores.length} متجر)</h2>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100">
            {stores.map((store) => {
              const details = storeDetails[store.storeId];
              const deliveryFee = deliveryFees[store.storeId] || 0;
              
              return (
                <div key={store.storeId} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <Store size={14} className="text-[#FF6B00]" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-900">{details?.name || 'متجر'}</p>
                        <p className="text-xs text-gray-500">{store.itemCount} منتج</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-sm text-gray-900">{formatPrice(store.totalAmount)}</p>
                      {deliveryFee === 0 ? (
                        <p className="text-xs text-green-600 font-medium">توصيل مجاني ✓</p>
                      ) : (
                        <p className="text-xs text-gray-500">+ {formatPrice(deliveryFee)} توصيل</p>
                      )}
                    </div>
                  </div>
                  
                  {/* المنتجات */}
                  <div className="bg-gray-50 rounded-lg p-2 space-y-1">
                    {store.items.slice(0, 2).map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{item.name} × {item.quantity}</span>
                        <span className="text-gray-900">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                    {store.items.length > 2 && (
                      <p className="text-xs text-gray-400 text-center">+ {store.items.length - 2} منتجات أخرى</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* رسالة توضيحية */}
        <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
          <Bike size={24} className="text-[#FF6B00] flex-shrink-0" />
          <p className="text-sm text-gray-700">
            طلباتك مجموعة، سائق واحد سوف يقوم بجمع طلباتك من المتاجر وتوصيلها إليك دفعة واحدة
          </p>
        </div>
        
        {/* عنوان التوصيل */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <MapPin size={18} className="text-[#FF6B00]" />
            عنوان التوصيل
          </h2>
          
          {/* العناوين المحفوظة */}
          {savedAddresses.length > 0 && !useNewAddress && (
            <div className="space-y-2">
              {savedAddresses.map((addr) => (
                <label
                  key={addr.id}
                  className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                    selectedAddressId === addr.id 
                      ? 'border-[#FF6B00] bg-orange-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    checked={selectedAddressId === addr.id}
                    onChange={() => setSelectedAddressId(addr.id)}
                    className="w-4 h-4 text-[#FF6B00]"
                  />
                  <Home size={18} className="text-gray-500" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{addr.title || 'عنوان'}</p>
                      {addr.is_default && (
                        <span className="text-xs bg-orange-100 text-[#FF6B00] px-2 py-0.5 rounded-full">افتراضي</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{addr.city} - {addr.area}</p>
                    <p className="text-xs text-gray-400">{addr.phone}</p>
                  </div>
                </label>
              ))}
              
              <button
                onClick={() => setUseNewAddress(true)}
                className="w-full p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-[#FF6B00] hover:text-[#FF6B00] transition-all flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                إضافة عنوان جديد
              </button>
            </div>
          )}
          
          {/* إضافة عنوان جديد */}
          {(useNewAddress || savedAddresses.length === 0) && (
            <div className="space-y-3">
              {savedAddresses.length > 0 && (
                <button
                  onClick={() => setUseNewAddress(false)}
                  className="text-sm text-[#FF6B00] hover:underline flex items-center gap-1"
                >
                  <ArrowRight size={14} />
                  العودة للعناوين المحفوظة
                </button>
              )}
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم العنوان</label>
                  <input
                    type="text"
                    value={newAddress.title}
                    onChange={(e) => setNewAddress({ ...newAddress, title: e.target.value })}
                    placeholder="المنزل، العمل..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">المدينة</label>
                  <select
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  >
                    {['دمشق', 'حلب', 'حمص', 'حماة', 'اللاذقية', 'طرطوس'].map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">المنطقة *</label>
                <input
                  type="text"
                  value={newAddress.area}
                  onChange={(e) => setNewAddress({ ...newAddress, area: e.target.value })}
                  placeholder="المزة، المالكي..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">رقم الشارع</label>
                  <input
                    type="text"
                    value={newAddress.street_number}
                    onChange={(e) => setNewAddress({ ...newAddress, street_number: e.target.value })}
                    placeholder="15"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">رقم البناء</label>
                  <input
                    type="text"
                    value={newAddress.building_number}
                    onChange={(e) => setNewAddress({ ...newAddress, building_number: e.target.value })}
                    placeholder="3"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">رقم الشقة</label>
                  <input
                    type="text"
                    value={newAddress.apartment_number}
                    onChange={(e) => setNewAddress({ ...newAddress, apartment_number: e.target.value })}
                    placeholder="5"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف *</label>
                <input
                  type="tel"
                  value={newAddress.phone}
                  onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                  placeholder="09xxxxxxxx"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={newAddress.is_default}
                  onChange={(e) => setNewAddress({ ...newAddress, is_default: e.target.checked })}
                  className="w-4 h-4 text-[#FF6B00] rounded"
                />
                حفظ كعنوان افتراضي
              </label>
            </div>
          )}
        </div>
        
        {/* طريقة الدفع */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 mb-48">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <CreditCard size={18} className="text-[#FF6B00]" />
            طريقة الدفع
          </h2>
          
          {/* طرق الدفع المحفوظة */}
          {savedPayments.length > 0 && !useNewPayment && (
            <div className="space-y-2">
              {savedPayments.map((pay) => (
                <label
                  key={pay.id}
                  className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                    selectedPaymentId === pay.id 
                      ? 'border-[#FF6B00] bg-orange-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={selectedPaymentId === pay.id}
                    onChange={() => setSelectedPaymentId(pay.id)}
                    className="w-4 h-4 text-[#FF6B00]"
                  />
                  <CreditCard size={18} className="text-blue-600" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">
                        {pay.type === 'card' ? 'بطاقة بنكية' : 
                         pay.type === 'shamcash' ? 'شام كاش' :
                         pay.type === 'syriatel_cash' ? 'سيرياتيل' : 
                         pay.type === 'mtn_cash' ? 'MTN' : pay.type}
                      </p>
                      {pay.is_default && (
                        <span className="text-xs bg-orange-100 text-[#FF6B00] px-2 py-0.5 rounded-full">افتراضي</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{pay.holder_name} - {pay.phone}</p>
                  </div>
                </label>
              ))}
              
              {/* المحفظة */}
              <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                !selectedPaymentId && !useNewPayment
                  ? 'border-[#FF6B00] bg-orange-50' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="payment"
                  checked={!selectedPaymentId && !useNewPayment}
                  onChange={() => { setSelectedPaymentId(null); setUseNewPayment(false); }}
                  className="w-4 h-4 text-[#FF6B00]"
                />
                <Wallet size={18} className="text-[#FF6B00]" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">المحفظة</p>
                  <p className="text-sm text-gray-500">الرصيد: {formatPrice(walletBalance)}</p>
                </div>
                {walletBalance < grandTotal && !selectedPaymentId && !useNewPayment && (
                  <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">رصيد غير كافي</span>
                )}
              </label>
              
              <button
                onClick={() => setUseNewPayment(true)}
                className="w-full p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-[#FF6B00] hover:text-[#FF6B00] transition-all flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                إضافة طريقة دفع جديدة
              </button>
            </div>
          )}
          
          {/* إضافة طريقة دفع جديدة */}
          {(useNewPayment || savedPayments.length === 0) && (
            <div className="space-y-3">
              {savedPayments.length > 0 && (
                <button
                  onClick={() => setUseNewPayment(false)}
                  className="text-sm text-[#FF6B00] hover:underline flex items-center gap-1"
                >
                  <ArrowRight size={14} />
                  العودة لطرق الدفع المحفوظة
                </button>
              )}
              
              {/* المحفظة */}
              <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                newPayment.type === 'wallet'
                  ? 'border-[#FF6B00] bg-orange-50' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="newPayment"
                  value="wallet"
                  checked={newPayment.type === 'wallet'}
                  onChange={() => setNewPayment({ ...newPayment, type: 'wallet' })}
                  className="w-4 h-4 text-[#FF6B00]"
                />
                <Wallet size={20} className="text-[#FF6B00]" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">المحفظة</p>
                  <p className="text-sm text-gray-500">الرصيد: {formatPrice(walletBalance)}</p>
                </div>
                {walletBalance < grandTotal && newPayment.type === 'wallet' && (
                  <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">رصيد غير كافي</span>
                )}
              </label>
              
              {/* بطاقة بنكية */}
              <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                newPayment.type === 'card'
                  ? 'border-[#FF6B00] bg-orange-50' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="newPayment"
                  value="card"
                  checked={newPayment.type === 'card'}
                  onChange={() => setNewPayment({ ...newPayment, type: 'card' })}
                  className="w-4 h-4 text-[#FF6B00]"
                />
                <CreditCard size={20} className="text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">بطاقة بنكية</p>
                  <p className="text-sm text-gray-500">Visa / Mastercard / شام كاش</p>
                </div>
              </label>
              
              {/* شام كاش */}
              <label className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                newPayment.type === 'shamcash'
                  ? 'border-[#FF6B00] bg-orange-50' 
                  : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="newPayment"
                  value="shamcash"
                  checked={newPayment.type === 'shamcash'}
                  onChange={() => setNewPayment({ ...newPayment, type: 'shamcash' })}
                  className="w-4 h-4 text-[#FF6B00]"
                />
                <span className="text-xl">🏦</span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">شام كاش</p>
                  <p className="text-sm text-gray-500">محفظة إلكترونية</p>
                </div>
              </label>
              
              {/* حقول إضافية للمحافظ الإلكترونية */}
              {newPayment.type !== 'wallet' && newPayment.type !== 'card' && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <input
                    type="tel"
                    value={newPayment.phone}
                    onChange={(e) => setNewPayment({ ...newPayment, phone: e.target.value })}
                    placeholder="رقم المحفظة *"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={newPayment.holder_name}
                    onChange={(e) => setNewPayment({ ...newPayment, holder_name: e.target.value })}
                    placeholder="اسم صاحب الحساب *"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={newPayment.is_default}
                      onChange={(e) => setNewPayment({ ...newPayment, is_default: e.target.checked })}
                      className="w-4 h-4 text-[#FF6B00] rounded"
                    />
                    حفظ كطريقة دفع افتراضية
                  </label>
                </div>
              )}
              
              {/* رسالة للبطاقة */}
              {newPayment.type === 'card' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                  <p className="text-sm text-blue-700">سيتم توجيهك لصفحة الدفع الآمن بعد تأكيد الطلب</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Bottom Summary */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40 shadow-lg">
        <div className="space-y-2 mb-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">المجموع الفرعي</span>
            <span className="text-gray-900">{formatPrice(totalAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">رسوم التوصيل ({stores.length} متجر)</span>
            {totalDeliveryFee === 0 ? (
              <span className="text-green-600 font-medium">مجاني ✓</span>
            ) : (
              <span className="text-gray-900">{formatPrice(totalDeliveryFee)}</span>
            )}
          </div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-100">
            <span className="text-gray-900">الإجمالي</span>
            <span className="text-[#FF6B00]">{formatPrice(grandTotal)}</span>
          </div>
        </div>
        
        <button
          onClick={handleSubmit}
          disabled={submitting || (paymentMethod === 'wallet' && walletBalance < grandTotal)}
          className="w-full bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white py-4 rounded-xl font-bold hover:from-[#E65000] hover:to-[#FF6B00] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
        >
          {submitting ? (
            <Loader2 size={20} className="animate-spin" />
          ) : (
            <>
              <Check size={20} />
              تأكيد الطلبات ({stores.length} متجر)
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default FoodBatchCheckoutPage;
