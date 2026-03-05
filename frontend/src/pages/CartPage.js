import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, ArrowRight, Truck, Info, Tag, CheckCircle, Loader2, X, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const CartPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { cart, updateQuantity, removeFromCart, loading } = useCart();
  const { settings } = useSettings();
  const { toast } = useToast();
  
  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  
  // Shipping state
  const [shippingInfo, setShippingInfo] = useState(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [customerAddress, setCustomerAddress] = useState(null);
  
  const FREE_SHIPPING_THRESHOLD = settings.free_shipping_threshold || 150000;
  
  // Fetch customer address and calculate shipping
  useEffect(() => {
    if (user && cart.items.length > 0) {
      fetchAddressAndShipping();
    }
  }, [user, cart.total, cart.items.length]);
  
  const fetchAddressAndShipping = async () => {
    try {
      // Get customer address
      const addressRes = await axios.get(`${API}/user/addresses`);
      const addresses = addressRes.data;
      const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
      setCustomerAddress(defaultAddr || null);
      
      if (defaultAddr?.city) {
        // Calculate shipping based on address
        setShippingLoading(true);
        const shippingRes = await axios.get(`${API}/shipping/cart?customer_city=${encodeURIComponent(defaultAddr.city)}`);
        setShippingInfo(shippingRes.data);
      }
    } catch (error) {
      console.error('Error fetching shipping:', error);
    } finally {
      setShippingLoading(false);
    }
  };
  
  // تحليل السلة لمعرفة حالة الشحن
  const cartAnalysis = () => {
    if (!cart.items.length) return { sellerCount: 0, isSingleSeller: false };
    
    const sellerIds = new Set();
    cart.items.forEach(item => {
      if (item.product?.seller_id) {
        sellerIds.add(item.product.seller_id);
      }
    });
    
    return {
      sellerCount: sellerIds.size,
      isSingleSeller: sellerIds.size === 1,
      remainingForFree: shippingInfo?.remaining_for_free || Math.max(0, FREE_SHIPPING_THRESHOLD - cart.total)
    };
  };
  
  const analysis = cartAnalysis();
  
  // Check if shipping is free
  const isFreeShipping = shippingInfo?.qualifies_for_free === true;
  const shippingCost = shippingInfo?.shipping_cost || 0;
  
  // Apply coupon
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    
    setCouponLoading(true);
    try {
      const productIds = cart.items.map(item => item.product_id);
      const res = await axios.post(`${API}/discounts/apply-coupon`, {
        code: couponCode,
        cart_total: cart.total,
        product_ids: productIds
      });
      
      setAppliedCoupon(res.data.discount);
      setDiscountAmount(res.data.discount_amount);
      toast({
        title: "تم تطبيق الخصم",
        description: res.data.message
      });
    } catch (error) {
      toast({
        title: "كود غير صالح",
        description: error.response?.data?.detail || "تعذر تطبيق الكود",
        variant: "destructive"
      });
    } finally {
      setCouponLoading(false);
    }
  };
  
  // Remove coupon
  const removeCoupon = () => {
    setAppliedCoupon(null);
    setDiscountAmount(0);
    setCouponCode('');
  };
  
  // Final total (with shipping)
  const finalTotal = cart.total - discountAmount + (isFreeShipping ? 0 : shippingCost);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
        <ShoppingBag size={48} className="text-gray-300 mb-3" />
        <h2 className="text-base font-bold mb-1 text-gray-900">سجل دخولك أولاً</h2>
        <p className="text-gray-500 text-sm mb-4">لعرض سلة التسوق الخاصة بك</p>
        <Link
          to="/login"
          className="bg-[#FF6B00] text-white font-bold px-4 py-2 rounded-full hover:bg-[#E65000] transition-colors text-sm"
          data-testid="login-to-cart-btn"
        >
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
        <ShoppingBag size={48} className="text-gray-300 mb-3" />
        <h2 className="text-base font-bold mb-1 text-gray-900">سلتك فارغة</h2>
        <p className="text-gray-500 text-sm mb-4">ابدأ بإضافة منتجات لسلتك</p>
        <Link
          to="/products"
          className="bg-[#FF6B00] text-white font-bold px-4 py-2 rounded-full hover:bg-[#E65000] transition-colors text-sm"
          data-testid="browse-products-btn"
        >
          تصفح المنتجات
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-10 bg-gray-50">
      <div className="max-w-4xl mx-auto px-3 py-4">
        {/* Header */}
        <h1 className="text-base font-bold mb-3 text-gray-900">سلة التسوق ({cart.items.length})</h1>

        <div className="grid md:grid-cols-3 gap-3">
          {/* Cart Items */}
          <div className="md:col-span-2 space-y-2">
            {cart.items.map((item) => (
              <motion.div
                key={`${item.product_id}-${item.selected_size || 'no-size'}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg p-2 border border-gray-200"
                data-testid={`cart-item-${item.product_id}`}
              >
                <div className="flex gap-2">
                  <Link to={`/products/${item.product_id}`} className="flex-shrink-0">
                    <img
                      src={item.product?.images?.[0] || 'https://via.placeholder.com/100'}
                      alt={item.product?.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link 
                      to={`/products/${item.product_id}`}
                      className="font-bold text-xs text-gray-900 hover:text-[#FF6B00] transition-colors line-clamp-2"
                    >
                      {item.product?.name}
                    </Link>
                    <p className="text-[#FF6B00] font-bold text-xs mt-0.5">
                      {formatPrice(item.product?.price)}
                    </p>
                    {/* عرض المقاس المختار */}
                    {item.selected_size && (
                      <p className="text-[10px] text-gray-500 mt-0.5">
                        المقاس: <span className="font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{item.selected_size}</span>
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between mt-1">
                      <div className="flex items-center gap-1 bg-gray-100 rounded-full">
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                          className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                          data-testid={`decrease-${item.product_id}`}
                        >
                          <Minus size={12} className="text-gray-600" />
                        </button>
                        <span className="w-5 text-center text-xs font-bold text-gray-900">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                          className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                          data-testid={`increase-${item.product_id}`}
                        >
                          <Plus size={12} className="text-gray-600" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product_id)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        data-testid={`remove-${item.product_id}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="text-left text-[10px] text-gray-500 self-end">
                    <span className="text-gray-900 font-bold text-xs">{formatPrice(item.item_total)}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Summary */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg p-3 border border-gray-200 sticky top-20">
              <h3 className="font-bold text-sm mb-2 text-gray-900">ملخص الطلب</h3>
              
              <div className="space-y-1 mb-2 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>المجموع الفرعي</span>
                  <span className="text-gray-900">{formatPrice(cart.total)}</span>
                </div>
                
                {/* Applied Coupon */}
                {appliedCoupon && discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span className="flex items-center gap-1">
                      <Tag size={10} />
                      خصم ({appliedCoupon.name})
                    </span>
                    <span className="font-bold">- {formatPrice(discountAmount)}</span>
                  </div>
                )}
                
                {/* Shipping */}
                <div className="flex justify-between text-gray-600">
                  <span>التوصيل</span>
                  {shippingLoading ? (
                    <Loader2 size={12} className="animate-spin text-gray-400" />
                  ) : isFreeShipping ? (
                    <span className="text-green-600 font-bold">مجاني ✓</span>
                  ) : shippingInfo ? (
                    <span className="text-gray-900 font-bold">{formatPrice(shippingCost)}</span>
                  ) : (
                    <span className="text-gray-400">يُحسب عند الدفع</span>
                  )}
                </div>
              </div>
              
              {/* Shipping Warning for different city */}
              {shippingInfo && shippingInfo.no_free_option && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-2">
                  <div className="flex items-start gap-1.5">
                    <AlertTriangle size={12} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] text-amber-700 font-bold">المتجر من محافظة أخرى</p>
                      <p className="text-[10px] text-amber-600">
                        عنوانك: {customerAddress?.city} • المتجر: {shippingInfo.seller_city}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Coupon Input */}
              <div className="mb-3">
                {appliedCoupon ? (
                  <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-green-600" />
                      <span className="text-xs font-bold text-green-700">{appliedCoupon.code}</span>
                    </div>
                    <button
                      onClick={removeCoupon}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="كود الخصم"
                      className="flex-1 p-2 border border-gray-300 rounded-lg text-xs focus:border-[#FF6B00] focus:outline-none text-left font-mono"
                      data-testid="coupon-input"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-200 disabled:opacity-50 transition-colors"
                      data-testid="apply-coupon-btn"
                    >
                      {couponLoading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        'تطبيق'
                      )}
                    </button>
                  </div>
                )}
              </div>
              
              {/* معلومات الشحن المجاني - فقط للمحافظة نفسها */}
              {shippingInfo && !shippingInfo.no_free_option && analysis.remainingForFree > 0 && !isFreeShipping && (
                <div className="bg-blue-50 rounded-lg p-2 mb-2 text-[10px] text-blue-700">
                  <div className="flex items-start gap-1">
                    <Truck size={12} className="flex-shrink-0 mt-0.5" />
                    <span>أضف {formatPrice(analysis.remainingForFree)} للتوصيل المجاني (نفس المحافظة)</span>
                  </div>
                </div>
              )}
              
              {/* رسالة الشحن المجاني للمحافظات المختلفة */}
              {shippingInfo && shippingInfo.no_free_option && (
                <div className="bg-gray-50 rounded-lg p-2 mb-2 text-[10px] text-gray-600">
                  <div className="flex items-start gap-1">
                    <Info size={12} className="flex-shrink-0 mt-0.5" />
                    <span>الشحن المجاني متاح للطلبات من متجر واحد بنفس المحافظة أكثر من {formatPrice(FREE_SHIPPING_THRESHOLD)}</span>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between font-bold text-sm pt-2 border-t border-gray-100">
                <span className="text-gray-900">الإجمالي</span>
                <span className="text-[#FF6B00]">{formatPrice(finalTotal)}</span>
              </div>

              <Link
                to="/checkout"
                state={{ coupon: appliedCoupon, discountAmount }}
                className="w-full flex items-center justify-center gap-1 bg-[#FF6B00] text-white font-bold py-2 rounded-full mt-3 hover:bg-[#E65000] transition-colors text-sm"
                data-testid="checkout-btn"
              >
                إتمام الشراء
                <ArrowLeft size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;
