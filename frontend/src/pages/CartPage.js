import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft, ArrowRight, Truck, Info, Tag, CheckCircle, Loader2, X, AlertTriangle, Store, MapPin, Check } from 'lucide-react';
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
  const { cart, updateQuantity: updateCartQuantity, removeFromCart, loading } = useCart();
  const { settings } = useSettings();
  const { toast } = useToast();
  
  // دالة لتحديث الكمية مع إظهار رسالة خطأ
  const updateQuantity = async (productId, quantity, selectedSize = null, selectedWeight = null) => {
    const result = await updateCartQuantity(productId, quantity, selectedSize, selectedWeight);
    if (!result.success) {
      toast({
        title: "تنبيه",
        description: result.error,
        variant: "destructive"
      });
    }
  };
  
  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [discountAmount, setDiscountAmount] = useState(0);
  
  // Shipping state
  const [shippingInfo, setShippingInfo] = useState(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [customerAddress, setCustomerAddress] = useState(null);
  const [sellerShippingDetails, setSellerShippingDetails] = useState([]);
  
  const FREE_SHIPPING_THRESHOLD = settings.free_shipping_threshold || 150000;
  
  // Fetch customer address and calculate shipping
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (!user || cart.items.length === 0) return;
      
      try {
        // Get customer address
        const addressRes = await axios.get(`${API}/user/addresses`);
        if (!isMounted) return;
        
        const addresses = addressRes.data;
        const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
        setCustomerAddress(defaultAddr || null);
        
        if (defaultAddr?.city) {
          // Calculate shipping based on address
          setShippingLoading(true);
          const [shippingRes, detailedRes] = await Promise.all([
            axios.get(`${API}/shipping/cart?customer_city=${encodeURIComponent(defaultAddr.city)}`),
            axios.get(`${API}/shipping/cart/detailed?customer_city=${encodeURIComponent(defaultAddr.city)}`)
          ]);
          
          if (!isMounted) return;
          
          setShippingInfo(shippingRes.data);
          setSellerShippingDetails(detailedRes.data.sellers || []);
        }
      } catch (error) {
        console.error('Error fetching shipping:', error);
      } finally {
        if (isMounted) setShippingLoading(false);
      }
    };
    
    fetchData();
    
    return () => { isMounted = false; };
  }, [user, cart.items.length > 0]); // تبسيط الـ dependency
  
  // تحليل السلة لمعرفة حالة الشحن
  const cartAnalysis = (() => {
    if (!cart?.items?.length) return { sellerCount: 0, isSingleSeller: false, remainingForFree: FREE_SHIPPING_THRESHOLD, progressToFree: 0 };
    
    const sellerIds = new Set();
    cart.items.forEach(item => {
      if (item.product?.seller_id) {
        sellerIds.add(item.product.seller_id);
      }
    });
    
    const remaining = shippingInfo?.remaining_for_free || Math.max(0, FREE_SHIPPING_THRESHOLD - (cart.total || 0));
    const progress = Math.min(((cart.total || 0) / FREE_SHIPPING_THRESHOLD) * 100, 100);
    
    return {
      sellerCount: sellerIds.size,
      isSingleSeller: sellerIds.size === 1,
      remainingForFree: remaining,
      progressToFree: isNaN(progress) ? 0 : progress
    };
  })();
  
  // Check if shipping is free - نتحقق من عدة مصادر
  const allSellersFreeShipping = sellerShippingDetails.length > 0 && 
    sellerShippingDetails.every(s => s.shipping_status === 'free');
  const isFreeShipping = shippingInfo?.qualifies_for_free === true || allSellersFreeShipping;
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

        {/* عنوان العميل الحالي */}
        {customerAddress && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-3 flex items-center gap-2">
            <MapPin size={14} className="text-blue-600" />
            <span className="text-xs text-blue-700">
              عنوانك: <strong>{customerAddress.city}</strong>
            </span>
          </div>
        )}

        {/* شريط تنبيه للشحن - يظهر فقط إذا كان هناك منتجات من محافظات مختلفة */}
        {sellerShippingDetails.length > 0 && sellerShippingDetails.some(s => !s.is_same_city) && (
          <div className="bg-orange-100 border border-orange-300 rounded-lg p-2 mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={14} className="text-orange-600 flex-shrink-0" />
              <p className="text-[10px] text-orange-700">
                <strong>بعض المنتجات من محافظات أخرى</strong> - الشحن المجاني متاح فقط للمتاجر من نفس محافظتك
              </p>
            </div>
          </div>
        )}

        {/* شريط الشحن المثبت - يظهر فقط إذا لم يصل للشحن المجاني */}
        {cart?.total > 0 && !isFreeShipping && (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 mb-3 shadow-sm">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-orange-700">
                  أضف {formatPrice(cartAnalysis.remainingForFree)} للتوصيل المجاني
                </span>
                <span className="text-sm font-bold text-orange-600 bg-orange-100 px-3 py-1 rounded-full">
                  {Math.round(cartAnalysis.progressToFree)}%
                </span>
              </div>
              <div className="h-3 bg-orange-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${cartAnalysis.progressToFree}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-orange-300 to-[#FF6B00] rounded-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* رسالة الشحن المجاني عند الوصول - احتفال كبير */}
        {isFreeShipping && (
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="relative bg-gradient-to-r from-green-50 to-emerald-50 border border-green-300 rounded-xl p-4 mb-3 shadow-md overflow-hidden"
          >
            {/* النجوم المتساقطة */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(8)].map((_, i) => (
                <motion.span
                  key={i}
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ 
                    y: ['0%', '100%'], 
                    opacity: [0, 1, 1, 0],
                  }}
                  transition={{ 
                    duration: 2 + Math.random() * 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                    ease: "easeOut"
                  }}
                  className="absolute text-yellow-400"
                  style={{ left: `${10 + Math.random() * 80}%`, fontSize: '16px' }}
                >
                  ✨
                </motion.span>
              ))}
            </div>

            <div className="relative flex items-center justify-center gap-3">
              <motion.span 
                animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1.5 }}
                className="text-2xl"
              >
                🎉
              </motion.span>
              <div className="text-center">
                <span className="font-bold text-lg text-green-700 block">مبروك! حصلت على توصيل مجاني!</span>
                <span className="text-sm text-green-600">وفرت مبلغ التوصيل في هذا الطلب 💰</span>
              </div>
              <motion.span 
                animate={{ scale: [1, 1.2, 1], rotate: [0, -10, 10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1.5 }}
                className="text-2xl"
              >
                🎉
              </motion.span>
            </div>
            
            {/* شريط التقدم الممتلئ */}
            <div className="relative mt-3">
              <div className="h-3 bg-green-100 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full relative"
                >
                  <motion.div
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                  />
                </motion.div>
              </div>
              <div className="flex justify-center mt-2">
                <span className="text-xs text-green-700 font-bold bg-green-100 px-3 py-1 rounded-full">
                  ✓ 100% - توصيل مجاني!
                </span>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid md:grid-cols-3 gap-3">
          {/* Cart Items - مجمعة حسب البائع */}
          <div className="md:col-span-2 space-y-3">
            {sellerShippingDetails.length > 0 ? (
              // عرض المنتجات مجمعة حسب البائع
              sellerShippingDetails.map((seller) => (
                <div key={seller.seller_id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* رأس البائع */}
                  <div className={`p-2 border-b ${
                    seller.shipping_status === 'free' ? 'bg-green-50 border-green-200' :
                    seller.shipping_status === 'paid_can_be_free' ? 'bg-amber-50 border-amber-200' :
                    !seller.is_same_city ? 'bg-orange-50 border-orange-200' :
                    'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Store size={14} className="text-gray-600" />
                        <span className="font-bold text-xs text-gray-900">{seller.seller_name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          seller.is_same_city ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {seller.seller_city}
                          {seller.is_same_city && ' ✓'}
                        </span>
                      </div>
                      {/* حالة الشحن */}
                      <div className="flex items-center gap-1">
                        {seller.shipping_status === 'free' ? (
                          <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Truck size={10} />
                            شحن مجاني ✓
                          </span>
                        ) : seller.shipping_status === 'paid_can_be_free' ? (
                          <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                            🚚 {formatPrice(seller.shipping_cost)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                            🚚 {formatPrice(seller.shipping_cost)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* رسالة الشحن */}
                    {seller.shipping_status === 'paid_can_be_free' && seller.remaining_for_free > 0 && (
                      <p className="text-[10px] text-amber-700 mt-1 flex items-center gap-1">
                        <Info size={10} />
                        أضف {formatPrice(seller.remaining_for_free)} للشحن المجاني من هذا المتجر
                      </p>
                    )}
                    {seller.shipping_status === 'paid_no_free_option' && !seller.is_same_city && (
                      <p className="text-[10px] text-orange-600 mt-1">
                        ⚠️ الشحن من {seller.seller_city} إلى {seller.customer_city} (لا يوجد شحن مجاني)
                      </p>
                    )}
                  </div>
                  
                  {/* منتجات هذا البائع */}
                  <div className="p-2 space-y-2">
                    {seller.items.map((sellerItem) => {
                      // العثور على العنصر الأصلي في السلة (بنفس المنتج والمقاس والوزن)
                      const cartItem = cart.items.find(ci => 
                        ci.product_id === sellerItem.product_id && 
                        ci.selected_size === sellerItem.selected_size &&
                        ci.selected_weight === sellerItem.selected_weight
                      );
                      if (!cartItem) return null;
                      
                      return (
                        <div
                          key={`${sellerItem.product_id}-${sellerItem.selected_size || 'no-size'}-${sellerItem.selected_weight || 'no-weight'}`}
                          className="flex gap-2"
                          data-testid={`cart-item-${sellerItem.product_id}`}
                        >
                          <Link to={`/products/${sellerItem.product_id}`} className="flex-shrink-0">
                            <img
                              src={sellerItem.image || 'https://via.placeholder.com/100'}
                              alt={sellerItem.name}
                              className="w-14 h-14 object-cover rounded-lg"
                            />
                          </Link>
                          <div className="flex-1 min-w-0">
                            <Link 
                              to={`/products/${sellerItem.product_id}`}
                              className="font-bold text-[11px] text-gray-900 hover:text-[#FF6B00] transition-colors line-clamp-1"
                            >
                              {sellerItem.name}
                            </Link>
                            {/* مدينة المنتج */}
                            <div className="flex items-center gap-1 text-[9px] text-gray-500">
                              <MapPin size={9} className="text-gray-400" />
                              <span>{seller.seller_city}</span>
                            </div>
                            <p className="text-[#FF6B00] font-bold text-[11px]">
                              {formatPrice(cartItem.item_price || sellerItem.price)}
                            </p>
                            {cartItem.selected_size && (
                              <p className="text-[9px] text-gray-500">
                                المقاس: <span className="font-bold bg-gray-100 px-1 rounded">{cartItem.selected_size}</span>
                              </p>
                            )}
                            {cartItem.selected_weight && (
                              <p className="text-[9px] text-gray-500">
                                الوزن: <span className="font-bold bg-gray-100 px-1 rounded">{cartItem.selected_weight}</span>
                              </p>
                            )}
                            
                            <div className="flex items-center justify-between mt-1">
                              <div className="flex items-center gap-1 bg-gray-100 rounded-full">
                                <button
                                  onClick={() => updateQuantity(sellerItem.product_id, cartItem.quantity - 1, cartItem.selected_size, cartItem.selected_weight)}
                                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                                >
                                  <Minus size={10} className="text-gray-600" />
                                </button>
                                <span className="w-4 text-center text-[10px] font-bold text-gray-900">{cartItem.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(sellerItem.product_id, cartItem.quantity + 1, cartItem.selected_size, cartItem.selected_weight)}
                                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                                >
                                  <Plus size={10} className="text-gray-600" />
                                </button>
                              </div>
                              <button
                                onClick={() => removeFromCart(sellerItem.product_id, cartItem.selected_size, cartItem.selected_weight)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                          <div className="text-left self-center">
                            <span className="text-gray-900 font-bold text-[11px]">{formatPrice(sellerItem.total)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* مجموع هذا البائع */}
                  <div className="p-2 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                    <span className="text-[10px] text-gray-500">مجموع المتجر</span>
                    <span className="font-bold text-xs text-gray-900">{formatPrice(seller.subtotal)}</span>
                  </div>
                </div>
              ))
            ) : (
              // العرض القديم إذا لم تتوفر بيانات البائعين
              cart.items.map((item) => (
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
                      {/* مدينة المنتج */}
                      {item.product?.city && (
                        <div className="flex items-center gap-1 text-[9px] text-gray-500">
                          <MapPin size={9} className="text-gray-400" />
                          <span>{item.product.city}</span>
                        </div>
                      )}
                      <p className="text-[#FF6B00] font-bold text-xs mt-0.5">
                        {formatPrice(item.product?.price)}
                      </p>
                      {item.selected_size && (
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          المقاس: <span className="font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{item.selected_size}</span>
                        </p>
                      )}
                      {item.selected_weight && (
                        <p className="text-[10px] text-gray-500">
                          الوزن: <span className="font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{item.selected_weight}</span>
                        </p>
                      )}
                      
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-1 bg-gray-100 rounded-full">
                          <button
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1, item.selected_size, item.selected_weight)}
                            className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                            data-testid={`decrease-${item.product_id}`}
                          >
                            <Minus size={12} className="text-gray-600" />
                          </button>
                          <span className="w-5 text-center text-xs font-bold text-gray-900">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1, item.selected_size, item.selected_weight)}
                            className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                            data-testid={`increase-${item.product_id}`}
                          >
                            <Plus size={12} className="text-gray-600" />
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.product_id, item.selected_size, item.selected_weight)}
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
              ))
            )}
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
                
                {/* تفاصيل الشحن لكل بائع */}
                {sellerShippingDetails.length > 0 && (
                  <div className="border-t border-gray-100 pt-2 mt-2">
                    <p className="text-[10px] text-gray-500 mb-1.5 font-medium">تكلفة الشحن:</p>
                    {sellerShippingDetails.map((seller) => (
                      <div key={seller.seller_id} className="flex justify-between items-center mb-1">
                        <span className="text-[10px] text-gray-600 truncate max-w-[120px]">
                          {seller.seller_name}
                        </span>
                        {seller.shipping_status === 'free' ? (
                          <span className="text-[10px] font-bold text-green-600">مجاني ✓</span>
                        ) : (
                          <span className="text-[10px] font-bold text-gray-700">{formatPrice(seller.shipping_cost)}</span>
                        )}
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-1 border-t border-dashed border-gray-200">
                      <span className="text-[10px] text-gray-600 font-medium">إجمالي الشحن</span>
                      <span className="text-[10px] font-bold text-gray-900">
                        {sellerShippingDetails.every(s => s.shipping_status === 'free') 
                          ? 'مجاني ✓' 
                          : formatPrice(sellerShippingDetails.reduce((sum, s) => sum + s.shipping_cost, 0))
                        }
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Shipping - عرض قديم إذا لم تتوفر التفاصيل */}
                {sellerShippingDetails.length === 0 && (
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
                )}
              </div>
              
              {/* رسائل الشحن المفيدة */}
              {sellerShippingDetails.some(s => s.shipping_status === 'paid_can_be_free') && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-2">
                  <p className="text-[10px] text-amber-700 font-bold mb-1">💡 وفّر على الشحن!</p>
                  {sellerShippingDetails.filter(s => s.shipping_status === 'paid_can_be_free').map((seller) => (
                    <p key={seller.seller_id} className="text-[10px] text-amber-600">
                      أضف {formatPrice(seller.remaining_for_free)} من "{seller.seller_name}" للشحن المجاني
                    </p>
                  ))}
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
              
              {/* رسالة الشحن المجاني */}
              <div className="bg-gray-50 rounded-lg p-2 mb-2 text-[10px] text-gray-600">
                <div className="flex items-start gap-1">
                  <Info size={12} className="flex-shrink-0 mt-0.5" />
                  <span>شحن مجاني للطلبات فوق {formatPrice(FREE_SHIPPING_THRESHOLD)} من نفس المحافظة</span>
                </div>
              </div>
              
              <div className="flex justify-between font-bold text-sm pt-2 border-t border-gray-100">
                <span className="text-gray-900">الإجمالي</span>
                <span className="text-[#FF6B00]">
                  {formatPrice(
                    cart.total - discountAmount + 
                    (sellerShippingDetails.length > 0 
                      ? sellerShippingDetails.reduce((sum, s) => sum + s.shipping_cost, 0)
                      : shippingCost
                    )
                  )}
                </span>
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
