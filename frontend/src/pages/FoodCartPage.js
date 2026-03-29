// /app/frontend/src/pages/FoodCartPage.js
// سلة طلبات الطعام

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  ShoppingBag, Plus, Minus, Trash2, MapPin, Phone, 
  CreditCard, Wallet, Clock, ArrowLeft, Store, AlertTriangle,
  Ticket, Check, X, Truck, Home, Building, Star, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import GoogleMapsLocationPicker from '../components/GoogleMapsLocationPicker';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FoodCartPage = () => {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { toast } = useToast();

  const [store, setStore] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [offers, setOffers] = useState([]);
  const [appliedOffer, setAppliedOffer] = useState(null);
  
  // التحقق من تسجيل الدخول - إعادة التوجيه إذا لم يكن المستخدم مسجل
  useEffect(() => {
    if (!user && !loading) {
      toast({ 
        title: "يجب تسجيل الدخول", 
        description: "سجل دخولك لإتمام طلب الطعام", 
        variant: "destructive" 
      });
      navigate('/food');
    }
  }, [user, loading, navigate, toast]);
  
  // رسوم التوصيل بالمسافة
  const [distanceDeliveryFee, setDistanceDeliveryFee] = useState(null);
  const [calculatingDeliveryFee, setCalculatingDeliveryFee] = useState(false);
  
  // تحذير المسافة الذكي
  const [distanceWarning, setDistanceWarning] = useState(null);
  
  // العناوين وطرق الدفع المحفوظة
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [savedPayments, setSavedPayments] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [selectedPaymentId, setSelectedPaymentId] = useState(null);
  const [useNewAddress, setUseNewAddress] = useState(false);
  const [useNewPayment, setUseNewPayment] = useState(false);
  
  // حالة الكوبون
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  
  // عنوان جديد
  const [newAddress, setNewAddress] = useState({
    title: 'المنزل',
    city: 'دمشق',
    area: '',
    street_number: '',
    building_number: '',
    apartment_number: '',
    phone: '',
    is_default: false,
    latitude: null,
    longitude: null
  });
  
  // طريقة دفع جديدة
  const [newPayment, setNewPayment] = useState({
    type: 'card',
    phone: '',
    holder_name: '',
    is_default: false
  });
  
  const [deliveryInfo, setDeliveryInfo] = useState({
    address: '',
    city: '',
    phone: '',
    notes: '',
    payment_method: 'wallet'
  });
  
  // الجدولة
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  
  // Modal الخريطة لتحديد الموقع
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [tempLocation, setTempLocation] = useState({ latitude: null, longitude: null });
  
  // منع تمرير الصفحة الخلفية عند فتح Modal
  useEffect(() => {
    if (showLocationModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showLocationModal]);
  
  // إعدادات المنصة - حد التوصيل المجاني الموحد
  const [platformFreeDeliveryThreshold, setPlatformFreeDeliveryThreshold] = useState(100000);
  
  // جلب البيانات الأولية (المتجر + العناوين + طرق الدفع)
  useEffect(() => {
    let isMounted = true;
    
    const fetchAllData = async () => {
      if (!storeId) return;
      
      setLoading(true);
      
      try {
        // جلب بيانات المتجر وإعدادات المنصة
        const [storeRes, offersRes, settingsRes] = await Promise.all([
          axios.get(`${API}/api/food/stores/${storeId}`),
          axios.get(`${API}/api/food/stores/${storeId}/offers`),
          axios.get(`${API}/api/settings/public`).catch(() => ({ data: {} }))
        ]);
        
        if (!isMounted) return;
        
        setStore(storeRes.data);
        setOffers(offersRes.data || []);
        
        // تعيين حد التوصيل المجاني من إعدادات المنصة
        if (settingsRes.data?.food_free_delivery_threshold) {
          setPlatformFreeDeliveryThreshold(settingsRes.data.food_free_delivery_threshold);
        }
        
        // جلب المحفظة إذا كان المستخدم مسجل
        if (token) {
          try {
            const walletRes = await axios.get(`${API}/api/wallet/balance`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (isMounted) setWalletBalance(walletRes.data.balance || 0);
          } catch (e) {}
        }
        
        // جلب العناوين وطرق الدفع المحفوظة
        if (user) {
          try {
            const [addressesRes, paymentsRes] = await Promise.all([
              axios.get(`${API}/api/user/addresses`),
              axios.get(`${API}/api/user/payment-methods`)
            ]);
            
            if (!isMounted) return;
            
            setSavedAddresses(addressesRes.data);
            setSavedPayments(paymentsRes.data);
            
            const defaultAddress = addressesRes.data.find(a => a.is_default);
            const defaultPayment = paymentsRes.data.find(p => p.is_default);
            
            if (defaultAddress) setSelectedAddressId(defaultAddress.id);
            else if (addressesRes.data.length > 0) setSelectedAddressId(addressesRes.data[0].id);
            else setUseNewAddress(true);
            
            if (defaultPayment) setSelectedPaymentId(defaultPayment.id);
            else if (paymentsRes.data.length > 0) setSelectedPaymentId(paymentsRes.data[0].id);
            else setUseNewPayment(true);
          } catch (e) {
            if (isMounted) {
              setUseNewAddress(true);
              setUseNewPayment(true);
            }
          }
        } else {
          setUseNewAddress(true);
          setUseNewPayment(true);
        }
        
      } catch (error) {
        if (isMounted) {
          toast({ title: "خطأ", description: "المتجر غير موجود", variant: "destructive" });
          navigate('/food');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchAllData();
    loadCart();
    
    return () => { isMounted = false; };
  }, [storeId]);
  
  // تحميل بيانات المستخدم للعنوان الجديد
  useEffect(() => {
    if (user && useNewAddress) {
      setNewAddress(prev => ({
        ...prev,
        city: user.city || prev.city,
        phone: user.phone || prev.phone
      }));
    }
  }, [user, useNewAddress]);

  // حساب رسوم التوصيل والعروض
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // حساب رسوم التوصيل بالمسافة
  const calculateDistanceDeliveryFee = async () => {
    // الحصول على إحداثيات العميل
    let customerLat, customerLon;
    
    if (useNewAddress && newAddress.latitude && newAddress.longitude) {
      customerLat = newAddress.latitude;
      customerLon = newAddress.longitude;
    } else if (selectedAddressId) {
      const selectedAddr = savedAddresses.find(a => a.id === selectedAddressId);
      if (selectedAddr?.latitude && selectedAddr?.longitude) {
        customerLat = selectedAddr.latitude;
        customerLon = selectedAddr.longitude;
      }
    }
    
    // الحصول على إحداثيات المتجر
    const storeLat = store?.latitude;
    const storeLon = store?.longitude;
    
    // إذا لم تتوفر الإحداثيات، استخدم رسوم المتجر الافتراضية
    if (!customerLat || !customerLon || !storeLat || !storeLon) {
      setDistanceDeliveryFee(null);
      setDistanceWarning(null);
      return;
    }
    
    setCalculatingDeliveryFee(true);
    try {
      // استدعاء API حساب المسافة الجديد
      const [feeRes, warningRes] = await Promise.all([
        axios.get(`${API}/api/shipping/calculate-by-distance`, {
          params: {
            store_lat: storeLat,
            store_lon: storeLon,
            customer_lat: customerLat,
            customer_lon: customerLon,
            order_total: subtotal,
            order_type: 'food'
          }
        }),
        axios.post(`${API}/api/food/orders/check-distance`, {
          store_id: storeId,
          customer_lat: customerLat,
          customer_lng: customerLon
        }).catch(() => ({ data: null }))
      ]);
      
      setDistanceDeliveryFee(feeRes.data);
      
      // تعيين التحذير إذا وُجد
      if (warningRes.data?.warning) {
        setDistanceWarning(warningRes.data);
      } else {
        setDistanceWarning(null);
      }
    } catch (error) {
      console.error('Error calculating distance delivery fee:', error);
      setDistanceDeliveryFee(null);
      setDistanceWarning(null);
    } finally {
      setCalculatingDeliveryFee(false);
    }
  };
  
  // إعادة حساب رسوم التوصيل عند تغيير العنوان أو المتجر
  useEffect(() => {
    if (store && (selectedAddressId || (useNewAddress && newAddress.latitude))) {
      calculateDistanceDeliveryFee();
    }
  }, [store, selectedAddressId, useNewAddress, newAddress.latitude, newAddress.longitude, subtotal]);
  
  // حساب خصم العرض (للعروض اشترِ X واحصل على Y)
  const calculateOfferDiscount = () => {
    if (!offers.length || !cartItems.length) return { discount: 0, offer: null };
    
    let bestDiscount = 0;
    let bestOffer = null;
    
    for (const offer of offers) {
      if (!offer.is_active) continue;
      if (offer.min_order_amount && subtotal < offer.min_order_amount) continue;
      
      let discount = 0;
      
      if (offer.offer_type === 'buy_x_get_y') {
        const buyQty = offer.buy_quantity;
        const getQty = offer.get_quantity;
        
        // ترتيب حسب السعر (الأرخص مجاني)
        const sortedItems = [...cartItems].sort((a, b) => a.price - b.price);
        const totalQty = sortedItems.reduce((sum, item) => sum + item.quantity, 0);
        const sets = Math.floor(totalQty / (buyQty + getQty));
        
        if (sets > 0) {
          let freeCount = sets * getQty;
          for (const item of sortedItems) {
            if (freeCount <= 0) break;
            const freeFromItem = Math.min(item.quantity, freeCount);
            discount += item.price * freeFromItem;
            freeCount -= freeFromItem;
          }
        }
      } else if (offer.offer_type === 'percentage' && offer.discount_percentage) {
        discount = subtotal * (offer.discount_percentage / 100);
      } else if (offer.offer_type === 'fixed_discount' && offer.discount_amount) {
        discount = Math.min(offer.discount_amount, subtotal);
      }
      
      if (discount > bestDiscount) {
        bestDiscount = discount;
        bestOffer = offer;
      }
    }
    
    return { discount: bestDiscount, offer: bestOffer };
  };
  
  const offerResult = calculateOfferDiscount();
  const offerDiscount = offerResult.discount;
  const activeOffer = offerResult.offer;
  
  // خصم الكوبون
  const couponDiscount = appliedCoupon?.discount || 0;
  const isCouponFreeDelivery = appliedCoupon?.coupon?.is_free_delivery || false;
  
  const storeDeliveryFee = store?.delivery_fee || 5000;
  const freeDeliveryMin = platformFreeDeliveryThreshold; // استخدام حد المنصة الموحد
  const finalSubtotal = subtotal - offerDiscount - couponDiscount;
  
  // التحقق من تطابق مدينة المستخدم مع مدينة المتجر
  // نستخدم مدينة العنوان المثبت أولاً، ثم مدينة المستخدم كبديل
  const selectedAddress = savedAddresses.find(a => a.id === selectedAddressId);
  const userCity = selectedAddress?.city?.trim() || user?.city?.trim() || '';
  const storeCity = store?.city?.trim() || '';
  const citiesMatch = !userCity || !storeCity || 
    userCity === storeCity ||
    userCity.includes(storeCity) || storeCity.includes(userCity);
  
  // التحقق من التوصيل المجاني
  const isFreeByDistance = distanceDeliveryFee?.is_free || false;
  const qualifiesForFreeDelivery = citiesMatch && freeDeliveryMin > 0 && subtotal >= freeDeliveryMin;
  const isFreeDelivery = isCouponFreeDelivery || qualifiesForFreeDelivery || isFreeByDistance;
  
  // استخدام رسوم المسافة إذا كانت متوفرة، وإلا رسوم المتجر
  const calculatedDeliveryFee = distanceDeliveryFee?.fee ?? storeDeliveryFee;
  const deliveryFee = isFreeDelivery ? 0 : calculatedDeliveryFee;
  const deliveryDistance = distanceDeliveryFee?.distance_km || null;
  
  const total = finalSubtotal + deliveryFee;
  // إظهار المتبقي للشحن المجاني
  const freeThreshold = distanceDeliveryFee?.free_threshold || freeDeliveryMin;
  const remainingForFree = !isFreeDelivery && freeThreshold > 0 ? Math.max(0, freeThreshold - subtotal) : 0;

  // التحقق من كوبون الخصم
  const validateCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('أدخل كود الكوبون');
      return;
    }
    
    setCouponLoading(true);
    setCouponError('');
    
    try {
      const res = await axios.post(`${API}/api/coupons/validate`, {
        code: couponCode.toUpperCase(),
        order_amount: subtotal - offerDiscount,
        order_type: 'food',
        store_id: storeId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setAppliedCoupon(res.data);
      toast({ title: "تم!", description: res.data.message });
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'كوبون غير صالح';
      setCouponError(errorMsg);
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const loadCart = () => {
    const savedCart = localStorage.getItem(`food_cart_${storeId}`);
    if (savedCart) {
      setCartItems(JSON.parse(savedCart));
    }
  };

  const saveCart = (items) => {
    localStorage.setItem(`food_cart_${storeId}`, JSON.stringify(items));
    setCartItems(items);
  };

  const updateQuantity = (productId, delta) => {
    const newItems = cartItems.map(item => {
      if (item.product_id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean);
    
    saveCart(newItems);
  };

  const removeItem = (productId) => {
    const newItems = cartItems.filter(item => item.product_id !== productId);
    saveCart(newItems);
  };

  // حفظ الموقع المحدد من Modal الخريطة
  const handleSaveLocation = async () => {
    if (!tempLocation.latitude || !tempLocation.longitude) {
      toast({ title: "تنبيه", description: "يرجى تحديد موقعك على الخريطة", variant: "destructive" });
      return;
    }
    
    try {
      // تحديث العنوان المحفوظ بالموقع الجديد
      const selectedAddr = savedAddresses.find(a => a.id === selectedAddressId);
      if (selectedAddr) {
        await axios.put(`${API}/api/user/addresses/${selectedAddressId}`, {
          ...selectedAddr,
          latitude: tempLocation.latitude,
          longitude: tempLocation.longitude
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // تحديث العناوين المحلية
        setSavedAddresses(prev => prev.map(a => 
          a.id === selectedAddressId 
            ? { ...a, latitude: tempLocation.latitude, longitude: tempLocation.longitude }
            : a
        ));
        
        setShowLocationModal(false);
        toast({ title: "تم", description: "تم حفظ الموقع بنجاح", variant: "default" });
        
        // إعادة حساب رسوم التوصيل
        calculateDistanceDeliveryFee();
      }
    } catch (error) {
      console.error('Error saving location:', error);
      toast({ title: "خطأ", description: "فشل في حفظ الموقع", variant: "destructive" });
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      toast({ title: "تنبيه", description: "يجب تسجيل الدخول أولاً", variant: "destructive" });
      navigate('/login');
      return;
    }

    // التحقق من العنوان
    if (useNewAddress || savedAddresses.length === 0) {
      if (!newAddress.area || !newAddress.city || !newAddress.phone) {
        toast({ title: "تنبيه", description: "يرجى ملء جميع بيانات العنوان", variant: "destructive" });
        return;
      }
      // التحقق من تحديد الموقع - إجباري
      if (!newAddress.latitude || !newAddress.longitude) {
        toast({ title: "تنبيه", description: "يرجى تحديد موقعك على الخريطة (إجباري)", variant: "destructive" });
        return;
      }
    } else if (!selectedAddressId) {
      toast({ title: "تنبيه", description: "يرجى اختيار عنوان التوصيل", variant: "destructive" });
      return;
    } else {
      // التحقق من وجود موقع للعنوان المحفوظ
      const selectedAddr = savedAddresses.find(a => a.id === selectedAddressId);
      if (!selectedAddr?.latitude || !selectedAddr?.longitude) {
        // فتح Modal الخريطة لتحديد الموقع
        setTempLocation({ latitude: null, longitude: null });
        setShowLocationModal(true);
        return;
      }
    }

    // التحقق من طريقة الدفع
    const paymentType = useNewPayment || savedPayments.length === 0 ? newPayment.type : 
                        selectedPaymentId ? savedPayments.find(p => p.id === selectedPaymentId)?.type : 'wallet';
    
    if (paymentType === 'wallet' && walletBalance < total) {
      toast({ title: "تنبيه", description: "رصيد المحفظة غير كافي", variant: "destructive" });
      return;
    }

    if (store?.minimum_order && subtotal < store.minimum_order) {
      toast({ 
        title: "تنبيه", 
        description: `الحد الأدنى للطلب هو ${store.minimum_order.toLocaleString()} ل.س`, 
        variant: "destructive" 
      });
      return;
    }

    setSubmitting(true);
    try {
      // حفظ العنوان الجديد إذا طلب ذلك
      let addressData;
      if (useNewAddress || savedAddresses.length === 0) {
        if (newAddress.is_default || savedAddresses.length === 0) {
          await axios.post(`${API}/api/user/addresses`, newAddress);
        }
        const fullAddress = `${newAddress.area}${newAddress.street_number ? ' - شارع ' + newAddress.street_number : ''}${newAddress.building_number ? ' - بناء ' + newAddress.building_number : ''}${newAddress.apartment_number ? ' - شقة ' + newAddress.apartment_number : ''}`;
        addressData = { 
          address: fullAddress, 
          city: newAddress.city, 
          phone: newAddress.phone,
          latitude: newAddress.latitude,
          longitude: newAddress.longitude
        };
      } else {
        const addr = savedAddresses.find(a => a.id === selectedAddressId);
        const fullAddress = `${addr.area}${addr.street_number ? ' - شارع ' + addr.street_number : ''}${addr.building_number ? ' - بناء ' + addr.building_number : ''}${addr.apartment_number ? ' - شقة ' + addr.apartment_number : ''}`;
        addressData = { 
          address: fullAddress, 
          city: addr.city, 
          phone: addr.phone,
          latitude: addr.latitude || null,
          longitude: addr.longitude || null
        };
      }

      // حفظ طريقة الدفع الجديدة إذا طلب ذلك
      let paymentMethod = 'wallet';
      if (useNewPayment || savedPayments.length === 0) {
        paymentMethod = newPayment.type;
        if (newPayment.type !== 'wallet' && newPayment.type !== 'bank_card' && newPayment.is_default) {
          await axios.post(`${API}/api/user/payment-methods`, newPayment);
        }
      } else if (selectedPaymentId) {
        const pay = savedPayments.find(p => p.id === selectedPaymentId);
        paymentMethod = pay?.type || 'wallet';
      }

      const orderData = {
        store_id: storeId,
        items: cartItems.map(item => ({
          product_id: item.product_id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        delivery_address: addressData.address,
        delivery_city: addressData.city,
        delivery_phone: addressData.phone,
        delivery_latitude: addressData.latitude,
        delivery_longitude: addressData.longitude,
        notes: deliveryInfo.notes,
        payment_method: paymentMethod,
        // رسوم التوصيل
        delivery_fee: deliveryFee,
        delivery_distance_km: deliveryDistance,
        // الجدولة
        is_scheduled: isScheduled,
        scheduled_for: isScheduled && scheduledDate && scheduledTime 
          ? `${scheduledDate}T${scheduledTime}:00` 
          : null
      };

      // التحقق من صحة البيانات قبل الإرسال
      const invalidItems = orderData.items.filter(item => 
        !item.product_id || !item.name || !item.price || !item.quantity
      );
      
      if (invalidItems.length > 0) {
        toast({ 
          title: "خطأ في بيانات السلة", 
          description: "بعض المنتجات تحتوي على بيانات ناقصة. يرجى إفراغ السلة وإضافة المنتجات مرة أخرى.", 
          variant: "destructive" 
        });
        setSubmitting(false);
        return;
      }
      
      const res = await axios.post(`${API}/api/food/orders`, orderData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Clear cart
      localStorage.removeItem(`food_cart_${storeId}`);
      
      toast({ 
        title: isScheduled ? "تم جدولة الطلب! 📅" : "تم الطلب بنجاح! 🎉", 
        description: isScheduled 
          ? `سيتم تجهيز طلبك ${res.data.order_number} في الوقت المحدد` 
          : `رقم الطلب: ${res.data.order_number}` 
      });
      navigate(`/food/order/${res.data.order_id}`);
    } catch (error) {
      console.error('Order error:', error.response?.data);
      const errorDetail = error.response?.data?.detail;
      const errorMessage = typeof errorDetail === 'string' 
        ? errorDetail 
        : (Array.isArray(errorDetail) ? errorDetail.map(e => e.msg || e).join(', ') : "فشل إنشاء الطلب");
      toast({ 
        title: "خطأ", 
        description: errorMessage, 
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

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md w-full shadow-lg">
          <ShoppingBag size={48} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">السلة فارغة</h2>
          <p className="text-gray-600 mb-6">أضف بعض المنتجات من المتجر</p>
          <button
            onClick={() => navigate(`/food/store/${storeId}`)}
            className="w-full bg-[#FF6B00] text-white py-3 rounded-xl font-bold hover:bg-[#E65000]"
          >
            تصفح المنتجات
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-72">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-bold text-gray-900">سلة الطلب</h1>
            <p className="text-sm text-gray-500">{store?.name}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Cart Items */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <Store size={18} className="text-[#E65000]" />
              {store?.name}
            </h2>
          </div>
          
          <AnimatePresence>
            {cartItems.map((item) => (
              <motion.div
                key={item.product_id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 border-b border-gray-100 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <ShoppingBag size={24} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
                    <p className="text-[#E65000] font-bold">{item.price.toLocaleString()} ل.س</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.product_id, -1)}
                      className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product_id, 1)}
                      className="w-8 h-8 bg-orange-100 text-[#E65000] rounded-full flex items-center justify-center hover:bg-orange-200"
                    >
                      <Plus size={16} />
                    </button>
                    <button
                      onClick={() => removeItem(item.product_id)}
                      className="w-8 h-8 text-red-500 hover:bg-red-50 rounded-full flex items-center justify-center"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* 🚨 تحذير المسافة الذكي */}
        {distanceWarning?.warning && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl p-4 border ${
              distanceWarning.warning.level === 'high' 
                ? 'bg-red-50 border-red-200' 
                : distanceWarning.warning.level === 'medium'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-blue-50 border-blue-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{distanceWarning.warning.emoji}</span>
              <div className="flex-1">
                <p className={`font-bold text-sm ${
                  distanceWarning.warning.level === 'high' 
                    ? 'text-red-800' 
                    : distanceWarning.warning.level === 'medium'
                      ? 'text-yellow-800'
                      : 'text-blue-800'
                }`}>
                  {distanceWarning.warning.message}
                </p>
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-600">
                  <span className="flex items-center gap-1">
                    <MapPin size={12} />
                    المسافة: {distanceWarning.distance_km} كم
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    الوقت المتوقع: {distanceWarning.estimated_time_minutes} دقيقة
                  </span>
                </div>
                {distanceWarning.warning.level === 'high' && (
                  <p className="mt-2 text-xs text-red-600">
                    💡 نصيحة: جرّب مطعماً أقرب للحصول على طعام ساخن وطازج!
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Free Delivery Progress - شريط التوصيل المجاني */}
        {platformFreeDeliveryThreshold > 0 && (
          <div className={`rounded-xl p-3 border ${
            !citiesMatch 
              ? 'bg-yellow-50 border-yellow-200'
              : subtotal >= platformFreeDeliveryThreshold 
                ? 'bg-green-50 border-green-200' 
                : 'bg-orange-50 border-orange-200'
          }`}>
            {!citiesMatch ? (
              <div className="flex items-center gap-2 text-yellow-700">
                <AlertCircle size={18} className="text-yellow-600" />
                <span className="text-sm font-medium">
                  ملاحظة: أنت في {userCity} والمتجر في {storeCity}. التوصيل المجاني غير متاح.
                </span>
              </div>
            ) : subtotal >= platformFreeDeliveryThreshold ? (
              <div className="flex items-center gap-2 text-green-700">
                <Check size={18} className="text-green-600" />
                <span className="font-bold text-sm">🎉 مبروك! حصلت على توصيل مجاني</span>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-orange-700 font-medium">
                    أضف {(platformFreeDeliveryThreshold - subtotal).toLocaleString()} ل.س للتوصيل المجاني
                  </span>
                  <span className="text-orange-600 font-bold">
                    {Math.round((subtotal / platformFreeDeliveryThreshold) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-orange-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((subtotal / platformFreeDeliveryThreshold) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Delivery Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <MapPin size={18} className="text-[#E65000]" />
            عنوان التوصيل
          </h2>
          
          {/* العناوين المحفوظة */}
          {savedAddresses.length > 0 && !useNewAddress && (
            <div className="space-y-2">
              {savedAddresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`p-3 border rounded-xl transition-all ${
                    selectedAddressId === addr.id 
                      ? 'border-[#FF6B00] bg-orange-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddressId === addr.id}
                      onChange={() => setSelectedAddressId(addr.id)}
                      className="w-4 h-4 text-[#E65000]"
                    />
                    <Home size={18} className="text-gray-500" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{addr.title || 'عنوان'}</p>
                        {addr.is_default && (
                          <span className="text-xs bg-orange-100 text-[#E65000] px-2 py-0.5 rounded-full">افتراضي</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {addr.city} - {addr.area}
                        {addr.street_number && ` - شارع ${addr.street_number}`}
                      </p>
                      <p className="text-xs text-gray-400">{addr.phone}</p>
                    </div>
                  </label>
                  {/* زر تعديل الموقع */}
                  <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                    {addr.latitude ? (
                      <span className="text-[10px] text-green-600 flex items-center gap-1">
                        <Check size={12} />
                        الموقع محدد على الخريطة
                      </span>
                    ) : (
                      <span className="text-[10px] text-orange-600 flex items-center gap-1">
                        <AlertCircle size={12} />
                        يرجى تحديد الموقع
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setSelectedAddressId(addr.id);
                        setTempLocation({ latitude: addr.latitude || null, longitude: addr.longitude || null });
                        setShowLocationModal(true);
                      }}
                      className="text-[10px] text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-full transition-colors flex items-center gap-1"
                    >
                      <MapPin size={10} />
                      {addr.latitude ? 'تعديل الموقع' : 'تحديد الموقع'}
                    </button>
                  </div>
                </div>
              ))}
              
              <button
                onClick={() => setUseNewAddress(true)}
                className="w-full p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-[#FF6B00] hover:text-[#E65000] transition-all flex items-center justify-center gap-2"
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
                  className="text-sm text-[#E65000] hover:underline flex items-center gap-1"
                >
                  <ArrowLeft size={14} />
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
                <label className="block text-sm font-medium text-gray-700 mb-1">المنطقة</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
                <input
                  type="tel"
                  value={newAddress.phone}
                  onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                  placeholder="09xxxxxxxx"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                />
              </div>
              
              {/* تحديد الموقع من Google Maps - إجباري */}
              <GoogleMapsLocationPicker
                label="📍 موقع التوصيل على الخريطة"
                required={true}
                currentLocation={newAddress.latitude ? { latitude: newAddress.latitude, longitude: newAddress.longitude } : null}
                onLocationSelect={(location) => {
                  if (location) {
                    setNewAddress({ ...newAddress, latitude: location.latitude, longitude: location.longitude });
                  } else {
                    setNewAddress({ ...newAddress, latitude: null, longitude: null });
                  }
                }}
              />
              
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={newAddress.is_default}
                  onChange={(e) => setNewAddress({ ...newAddress, is_default: e.target.checked })}
                  className="w-4 h-4 text-[#E65000] rounded"
                />
                حفظ كعنوان افتراضي
              </label>
            </div>
          )}
          
          {/* ملاحظات التوصيل */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات (اختياري)</label>
            <textarea
              value={deliveryInfo.notes}
              onChange={(e) => setDeliveryInfo({ ...deliveryInfo, notes: e.target.value })}
              placeholder="تعليمات خاصة للتوصيل..."
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <CreditCard size={18} className="text-[#E65000]" />
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
                    className="w-4 h-4 text-[#E65000]"
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
                        <span className="text-xs bg-orange-100 text-[#E65000] px-2 py-0.5 rounded-full">افتراضي</span>
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
                  className="w-4 h-4 text-[#E65000]"
                />
                <Wallet size={18} className="text-[#E65000]" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">المحفظة</p>
                  <p className="text-sm text-gray-500">الرصيد: {walletBalance.toLocaleString()} ل.س</p>
                </div>
                {walletBalance < total && !selectedPaymentId && !useNewPayment && (
                  <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">رصيد غير كافي</span>
                )}
              </label>
              
              <button
                onClick={() => setUseNewPayment(true)}
                className="w-full p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-[#FF6B00] hover:text-[#E65000] transition-all flex items-center justify-center gap-2"
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
                  className="text-sm text-[#E65000] hover:underline flex items-center gap-1"
                >
                  <ArrowLeft size={14} />
                  العودة لطرق الدفع المحفوظة
                </button>
              )}
              
              {/* المحفظة */}
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="newPayment"
                  value="wallet"
                  checked={newPayment.type === 'wallet'}
                  onChange={() => setNewPayment({ ...newPayment, type: 'wallet' })}
                  className="w-4 h-4 text-[#E65000]"
                />
                <Wallet size={20} className="text-[#E65000]" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">المحفظة</p>
                  <p className="text-sm text-gray-500">الرصيد: {walletBalance.toLocaleString()} ل.س</p>
                </div>
                {walletBalance < total && newPayment.type === 'wallet' && (
                  <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">رصيد غير كافي</span>
                )}
              </label>
              
              {/* بطاقة بنكية - قريباً */}
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-not-allowed bg-gray-50 opacity-70 relative">
                <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                  قريباً
                </span>
                <input
                  type="radio"
                  name="newPayment"
                  value="bank_card"
                  disabled
                  className="w-4 h-4 text-gray-400"
                />
                <CreditCard size={20} className="text-gray-400" />
                <div className="flex-1">
                  <p className="font-medium text-gray-500">بطاقة بنكية</p>
                  <p className="text-sm text-gray-400">Visa / Mastercard</p>
                </div>
              </label>
              
              {/* شام كاش */}
              <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="newPayment"
                  value="shamcash"
                  checked={newPayment.type === 'shamcash'}
                  onChange={() => setNewPayment({ ...newPayment, type: 'shamcash' })}
                  className="w-4 h-4 text-[#E65000]"
                />
                <span className="text-xl">🏦</span>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">شام كاش</p>
                  <p className="text-sm text-gray-500">محفظة إلكترونية</p>
                </div>
              </label>
              
              {/* حقول إضافية للمحافظ الإلكترونية */}
              {newPayment.type !== 'wallet' && newPayment.type !== 'bank_card' && (
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
                      className="w-4 h-4 text-[#E65000] rounded"
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

        {/* Schedule Order Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
            <Clock size={18} className="text-blue-600" />
            جدولة الطلب (اختياري)
          </h2>
          
          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 mb-3">
            <input
              type="checkbox"
              checked={isScheduled}
              onChange={(e) => setIsScheduled(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <div className="flex-1">
              <p className="font-medium text-gray-900">جدولة الطلب لوقت لاحق</p>
              <p className="text-xs text-gray-500">اختر التاريخ والوقت المناسب لاستلام طلبك</p>
            </div>
          </label>
          
          {isScheduled && (
            <div className="space-y-3 pt-3 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">التاريخ</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                    data-testid="schedule-date-input"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">الوقت</label>
                  <input
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                    data-testid="schedule-time-input"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <AlertCircle size={12} />
                يمكنك إلغاء أو تعديل الطلب المجدول قبل وقت التجهيز
              </p>
            </div>
          )}
        </div>

        {/* Minimum Order Warning */}
        {store?.minimum_order > 0 && subtotal < store.minimum_order && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle size={20} className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">الحد الأدنى للطلب</p>
              <p className="text-sm text-yellow-700">
                أضف منتجات بقيمة {(store.minimum_order - subtotal).toLocaleString()} ل.س للوصول للحد الأدنى
              </p>
            </div>
          </div>
        )}

        {/* Coupon Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-3">
            <Ticket size={18} className="text-purple-600" />
            كوبون الخصم
          </h2>
          
          {appliedCoupon ? (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <Check size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-purple-900">{appliedCoupon.coupon.code}</p>
                    <p className="text-sm text-purple-600">
                      {appliedCoupon.coupon.is_free_delivery 
                        ? 'توصيل مجاني' 
                        : `وفرت ${appliedCoupon.discount.toLocaleString()} ل.س`
                      }
                    </p>
                  </div>
                </div>
                <button
                  onClick={removeCoupon}
                  className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => {
                  setCouponCode(e.target.value.toUpperCase());
                  setCouponError('');
                }}
                placeholder="أدخل كود الكوبون"
                data-testid="coupon-input"
                className={`flex-1 border rounded-xl px-4 py-2 font-mono uppercase ${
                  couponError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
              />
              <button
                onClick={validateCoupon}
                disabled={couponLoading || !couponCode.trim()}
                data-testid="coupon-apply-btn"
                className="px-4 py-2 bg-purple-500 text-white rounded-xl font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {couponLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'تطبيق'
                )}
              </button>
            </div>
          )}
          
          {couponError && (
            <p className="text-sm text-red-500 mt-2">{couponError}</p>
          )}
        </div>
      </div>

      {/* Bottom Summary */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-3 z-40 shadow-lg">
        <div className="max-w-2xl mx-auto">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">المجموع الفرعي</span>
              <span className="text-gray-900">{subtotal.toLocaleString()} ل.س</span>
            </div>
            
            {/* Offer Discount */}
            {offerDiscount > 0 && activeOffer && (
              <div className="flex justify-between text-sm">
                <span className="text-purple-600 flex items-center gap-1">
                  <span>🎁</span>
                  {activeOffer.name}
                </span>
                <span className="text-purple-600 font-medium">-{offerDiscount.toLocaleString()} ل.س</span>
              </div>
            )}
            
            {/* Coupon Discount */}
            {couponDiscount > 0 && appliedCoupon && (
              <div className="flex justify-between text-sm">
                <span className="text-purple-600 flex items-center gap-1">
                  <Ticket size={14} />
                  كوبون {appliedCoupon.coupon.code}
                </span>
                <span className="text-purple-600 font-medium">-{couponDiscount.toLocaleString()} ل.س</span>
              </div>
            )}
            
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">
                رسوم التوصيل
                {deliveryDistance && !isFreeDelivery && (
                  <span className="text-xs text-gray-400 mr-1">({deliveryDistance} كم)</span>
                )}
              </span>
              {calculatingDeliveryFee ? (
                <span className="text-gray-400">جاري الحساب...</span>
              ) : isFreeDelivery ? (
                <span className="text-[#E65000] font-medium">مجاني ✓</span>
              ) : (
                <span className="text-gray-900">{deliveryFee.toLocaleString()} ل.س</span>
              )}
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span className="text-gray-900">الإجمالي</span>
              <span className="text-[#E65000]">{total.toLocaleString()} ل.س</span>
            </div>
            
            {/* Savings Summary */}
            {(offerDiscount > 0 || couponDiscount > 0 || isFreeDelivery) && (
              <div className="bg-orange-50 rounded-lg p-2 text-center">
                <span className="text-sm text-orange-700 font-medium">
                  🎉 وفرت {(offerDiscount + couponDiscount + (isFreeDelivery ? storeDeliveryFee : 0)).toLocaleString()} ل.س في هذا الطلب!
                </span>
              </div>
            )}
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={submitting || (store?.minimum_order && subtotal < store.minimum_order)}
            className="w-full bg-[#FF6B00] text-white py-4 rounded-xl font-bold hover:bg-[#E65000] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Clock size={18} />
                تأكيد الطلب ({store?.delivery_time || 30} دقيقة)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal تحديد الموقع على الخريطة */}
      <AnimatePresence>
        {showLocationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 overflow-hidden"
            onClick={() => setShowLocationModal(false)}
            onTouchMove={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto overscroll-contain"
              onClick={e => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-[#FF6B00] text-white p-4 flex items-center justify-between sticky top-0 z-10">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <MapPin size={20} />
                  تحديد موقع التوصيل
                </h3>
                <button
                  onClick={() => setShowLocationModal(false)}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Content */}
              <div className="p-4">
                <p className="text-gray-600 text-sm mb-4 text-center">
                  يرجى تحديد موقعك على الخريطة لضمان وصول الطلب بدقة
                </p>
                
                {/* العنوان المحفوظ */}
                {selectedAddressId && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <p className="text-xs text-gray-500 mb-1">العنوان المسجل:</p>
                    <p className="text-sm font-medium text-gray-900">
                      {(() => {
                        const addr = savedAddresses.find(a => a.id === selectedAddressId);
                        return addr ? `${addr.area}${addr.street_number ? ' - شارع ' + addr.street_number : ''}` : '';
                      })()}
                    </p>
                  </div>
                )}
                
                {/* الخريطة */}
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <GoogleMapsLocationPicker
                    currentLocation={tempLocation.latitude ? tempLocation : null}
                    onLocationSelect={(location) => {
                      setTempLocation({ latitude: location.latitude, longitude: location.longitude });
                    }}
                    onLocationClear={() => {
                      setTempLocation({ latitude: null, longitude: null });
                    }}
                  />
                </div>
                
                {tempLocation.latitude && (
                  <p className="text-xs text-green-600 text-center mt-2 flex items-center justify-center gap-1">
                    <Check size={14} />
                    تم تحديد الموقع بنجاح
                  </p>
                )}
              </div>
              
              {/* Footer */}
              <div className="p-4 border-t bg-gray-50 flex gap-3 sticky bottom-0">
                <button
                  onClick={() => setShowLocationModal(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSaveLocation}
                  disabled={!tempLocation.latitude}
                  className="flex-1 py-3 rounded-xl bg-[#FF6B00] text-white font-bold hover:bg-[#E65000] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  حفظ الموقع
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FoodCartPage;
