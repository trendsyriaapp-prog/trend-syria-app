// /app/frontend/src/pages/FoodCartPage.js
// سلة طلبات الطعام

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  ShoppingBag, Plus, Minus, Trash2, MapPin, Phone, 
  CreditCard, Wallet, Clock, ArrowLeft, Store, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

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
  
  const [deliveryInfo, setDeliveryInfo] = useState({
    address: user?.address || '',
    city: user?.city || '',
    phone: user?.phone || '',
    notes: '',
    payment_method: 'wallet'
  });

  // حساب رسوم التوصيل
  const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const storeDeliveryFee = store?.delivery_fee || 5000;
  const freeDeliveryMin = store?.free_delivery_minimum || 0;
  const isFreeDelivery = freeDeliveryMin > 0 && subtotal >= freeDeliveryMin;
  const deliveryFee = isFreeDelivery ? 0 : storeDeliveryFee;
  const total = subtotal + deliveryFee;
  const remainingForFree = freeDeliveryMin > 0 ? Math.max(0, freeDeliveryMin - subtotal) : 0;

  useEffect(() => {
    if (storeId) {
      fetchStore();
      loadCart();
      if (token) fetchWallet();
    }
  }, [storeId, token]);

  const fetchStore = async () => {
    try {
      const res = await axios.get(`${API}/food/stores/${storeId}`);
      setStore(res.data);
    } catch (error) {
      toast({ title: "خطأ", description: "المتجر غير موجود", variant: "destructive" });
      navigate('/food');
    } finally {
      setLoading(false);
    }
  };

  const fetchWallet = async () => {
    try {
      const res = await axios.get(`${API}/wallet/balance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWalletBalance(res.data.balance || 0);
    } catch (error) {
      console.error('Error fetching wallet:', error);
    }
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

  const handleSubmit = async () => {
    if (!token) {
      toast({ title: "تنبيه", description: "يجب تسجيل الدخول أولاً", variant: "destructive" });
      navigate('/login');
      return;
    }

    if (!deliveryInfo.address || !deliveryInfo.city || !deliveryInfo.phone) {
      toast({ title: "تنبيه", description: "يرجى ملء جميع بيانات التوصيل", variant: "destructive" });
      return;
    }

    if (deliveryInfo.payment_method === 'wallet' && walletBalance < total) {
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
      const orderData = {
        store_id: storeId,
        items: cartItems.map(item => ({
          product_id: item.product_id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        delivery_address: deliveryInfo.address,
        delivery_city: deliveryInfo.city,
        delivery_phone: deliveryInfo.phone,
        notes: deliveryInfo.notes,
        payment_method: deliveryInfo.payment_method
      };

      const res = await axios.post(`${API}/food/orders`, orderData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Clear cart
      localStorage.removeItem(`food_cart_${storeId}`);
      
      toast({ title: "تم الطلب بنجاح! 🎉", description: `رقم الطلب: ${res.data.order_number}` });
      navigate(`/food/order/${res.data.order_id}`);
    } catch (error) {
      toast({ 
        title: "خطأ", 
        description: error.response?.data?.detail || "فشل إنشاء الطلب", 
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
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
            className="w-full bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600"
          >
            تصفح المنتجات
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
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
              <Store size={18} className="text-green-600" />
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
                    <p className="text-green-600 font-bold">{item.price.toLocaleString()} ل.س</p>
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
                      className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center hover:bg-green-200"
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

        {/* Delivery Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <MapPin size={18} className="text-green-600" />
            معلومات التوصيل
          </h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المدينة</label>
            <select
              value={deliveryInfo.city}
              onChange={(e) => setDeliveryInfo({ ...deliveryInfo, city: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3"
            >
              <option value="">اختر المدينة</option>
              {['دمشق', 'حلب', 'حمص', 'حماة', 'اللاذقية', 'طرطوس'].map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">العنوان التفصيلي</label>
            <input
              type="text"
              value={deliveryInfo.address}
              onChange={(e) => setDeliveryInfo({ ...deliveryInfo, address: e.target.value })}
              placeholder="الحي، الشارع، بالقرب من..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف</label>
            <input
              type="tel"
              value={deliveryInfo.phone}
              onChange={(e) => setDeliveryInfo({ ...deliveryInfo, phone: e.target.value })}
              placeholder="09xxxxxxxx"
              className="w-full border border-gray-200 rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات (اختياري)</label>
            <textarea
              value={deliveryInfo.notes}
              onChange={(e) => setDeliveryInfo({ ...deliveryInfo, notes: e.target.value })}
              placeholder="تعليمات خاصة للتوصيل..."
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-3"
            />
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <CreditCard size={18} className="text-green-600" />
            طريقة الدفع
          </h2>
          
          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="payment"
              value="wallet"
              checked={deliveryInfo.payment_method === 'wallet'}
              onChange={(e) => setDeliveryInfo({ ...deliveryInfo, payment_method: e.target.value })}
              className="w-4 h-4 text-green-600"
            />
            <Wallet size={20} className="text-green-600" />
            <div className="flex-1">
              <p className="font-medium text-gray-900">المحفظة</p>
              <p className="text-sm text-gray-500">الرصيد: {walletBalance.toLocaleString()} ل.س</p>
            </div>
            {walletBalance < total && (
              <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded-full">رصيد غير كافي</span>
            )}
          </label>
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

        {/* Free Delivery Progress */}
        {freeDeliveryMin > 0 && !isFreeDelivery && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-green-800">توصيل مجاني عند</span>
              <span className="text-sm font-bold text-green-700">{freeDeliveryMin.toLocaleString()} ل.س</span>
            </div>
            <div className="w-full bg-green-200 rounded-full h-2.5 mb-2">
              <div 
                className="bg-green-500 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${Math.min(100, (subtotal / freeDeliveryMin) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-green-700">
              أضف منتجات بقيمة {remainingForFree.toLocaleString()} ل.س للتوصيل المجاني
            </p>
          </div>
        )}

        {/* Free Delivery Achieved */}
        {isFreeDelivery && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-lg">✓</span>
            </div>
            <div>
              <p className="font-bold text-green-800">مبروك! توصيل مجاني 🎉</p>
              <p className="text-xs text-green-600">لقد حصلت على توصيل مجاني لهذا الطلب</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Summary */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">المجموع الفرعي</span>
              <span className="text-gray-900">{subtotal.toLocaleString()} ل.س</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">رسوم التوصيل</span>
              {isFreeDelivery ? (
                <span className="text-green-600 font-medium">مجاني ✓</span>
              ) : (
                <span className="text-gray-900">{deliveryFee.toLocaleString()} ل.س</span>
              )}
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span className="text-gray-900">الإجمالي</span>
              <span className="text-green-600">{total.toLocaleString()} ل.س</span>
            </div>
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={submitting || (store?.minimum_order && subtotal < store.minimum_order)}
            className="w-full bg-green-500 text-white py-4 rounded-xl font-bold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
    </div>
  );
};

export default FoodCartPage;
