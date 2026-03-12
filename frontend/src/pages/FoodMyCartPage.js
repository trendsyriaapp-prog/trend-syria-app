// صفحة سلة الطعام المجمعة - تعرض جميع الطلبات من مختلف المتاجر
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Store, Trash2, ShoppingBag, Plus, Minus, UtensilsCrossed, Truck, Check, ShoppingCart, Loader2, MapPin, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFoodCart } from '../context/FoodCartContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// دالة تنسيق السعر
const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const FoodMyCartPage = () => {
  const navigate = useNavigate();
  const { stores, totalItems, totalAmount, clearStoreCart, clearAllFoodCarts, refresh } = useFoodCart();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [storeDetails, setStoreDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [fetchedStoreIds, setFetchedStoreIds] = useState([]);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  
  // العنوان الافتراضي
  const [defaultAddress, setDefaultAddress] = useState(null);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [showAddressSelector, setShowAddressSelector] = useState(false);

  useEffect(() => {
    // فقط اجلب البيانات إذا تغيرت المتاجر
    const currentStoreIds = stores.map(s => s.storeId).sort().join(',');
    const prevStoreIds = fetchedStoreIds.sort().join(',');
    
    if (currentStoreIds !== prevStoreIds) {
      fetchStoreDetails();
      setFetchedStoreIds(stores.map(s => s.storeId));
    } else if (stores.length === 0) {
      setLoading(false);
    }
  }, [stores.length]);

  // جلب العنوان الافتراضي
  useEffect(() => {
    const fetchAddresses = async () => {
      if (!user || !token) return;
      
      try {
        const res = await axios.get(`${API}/user/addresses`);
        const addresses = res.data || [];
        setSavedAddresses(addresses);
        
        // اختيار العنوان الافتراضي أو الأول
        const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
        if (defaultAddr) {
          setDefaultAddress(defaultAddr);
        }
      } catch (error) {
        console.error('Error fetching addresses:', error);
      }
    };
    
    fetchAddresses();
  }, [user, token]);

  const fetchStoreDetails = async () => {
    if (stores.length === 0) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const details = {};
    
    try {
      // جلب جميع المتاجر بالتوازي
      const promises = stores.map(store => 
        axios.get(`${API}/food/stores/${store.storeId}`)
          .then(res => ({ storeId: store.storeId, data: res.data }))
          .catch(err => {
            console.error('Error fetching store:', store.storeId, err);
            return { storeId: store.storeId, data: null };
          })
      );
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        if (result.data) {
          details[result.storeId] = result.data;
        }
      });
      
      setStoreDetails(details);
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateItemQuantity = (storeId, itemId, newQuantity) => {
    const cartKey = `food_cart_${storeId}`;
    const cart = JSON.parse(localStorage.getItem(cartKey) || '[]');
    
    if (newQuantity <= 0) {
      const newCart = cart.filter(item => item.id !== itemId);
      if (newCart.length === 0) {
        localStorage.removeItem(cartKey);
      } else {
        localStorage.setItem(cartKey, JSON.stringify(newCart));
      }
    } else {
      const newCart = cart.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      );
      localStorage.setItem(cartKey, JSON.stringify(newCart));
    }
    
    window.dispatchEvent(new CustomEvent('foodCartUpdated'));
    refresh();
  };

  const removeItem = (storeId, itemId) => {
    updateItemQuantity(storeId, itemId, 0);
  };

  // إكمال جميع الطلبات دفعة واحدة
  const handleCheckoutAll = () => {
    if (!user || !token) {
      toast({
        title: "تنبيه",
        description: "يجب تسجيل الدخول أولاً",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }
    
    if (stores.length === 0) {
      toast({
        title: "تنبيه",
        description: "السلة فارغة",
        variant: "destructive"
      });
      return;
    }
    
    // الانتقال لصفحة الدفع الموحد
    navigate('/food/batch-checkout', {
      state: {
        stores: stores,
        storeDetails: storeDetails,
        totalAmount: totalAmount,
        selectedAddress: defaultAddress
      }
    });
  };

  if (loading && stores.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (totalItems === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Header */}
        <div className="bg-gradient-to-b from-[#FF6B00] to-[#FF8C00] text-white px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1">
              <ArrowRight size={24} />
            </button>
            <h1 className="text-lg font-bold">سلة الطعام</h1>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <ShoppingBag size={40} className="text-[#FF6B00]" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">سلة الطعام فارغة</h2>
          <p className="text-gray-500 text-center mb-6">لم تقم بإضافة أي منتجات طعام بعد</p>
          <Link
            to="/food"
            className="bg-[#FF6B00] text-white px-6 py-3 rounded-full font-bold hover:bg-[#E65000] transition-colors flex items-center gap-2"
          >
            <UtensilsCrossed size={20} />
            تصفح المطاعم
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#FF6B00] to-[#FF8C00] text-white px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1">
              <ArrowRight size={24} />
            </button>
            <div>
              <h1 className="text-lg font-bold">سلة الطعام</h1>
              <p className="text-orange-100 text-xs">{totalItems} منتج من {stores.length} متجر</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (window.confirm('هل تريد مسح جميع سلات الطعام؟')) {
                clearAllFoodCarts();
              }
            }}
            className="text-white/80 hover:text-white text-sm"
          >
            مسح الكل
          </button>
        </div>
      </div>

      {/* عنوان التوصيل */}
      {user && (
        <div className="px-3 mb-2 mt-2">
          <div 
            onClick={() => setShowAddressSelector(!showAddressSelector)}
            className="bg-white rounded-lg border border-gray-200 p-2 cursor-pointer hover:border-[#FF6B00] transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <MapPin size={14} className="text-[#FF6B00]" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">التوصيل إلى</p>
                  {defaultAddress ? (
                    <p className="font-bold text-gray-900 text-xs">
                      {defaultAddress.title || 'المنزل'} - {defaultAddress.city}
                    </p>
                  ) : (
                    <p className="font-medium text-[#FF6B00] text-xs">اختر عنوان التوصيل</p>
                  )}
                </div>
              </div>
              <ChevronDown size={16} className={`text-gray-400 transition-transform ${showAddressSelector ? 'rotate-180' : ''}`} />
            </div>
            
            {/* قائمة العناوين */}
            {showAddressSelector && savedAddresses.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                {savedAddresses.map((addr) => (
                  <div
                    key={addr.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDefaultAddress(addr);
                      setShowAddressSelector(false);
                    }}
                    className={`p-1.5 rounded-lg cursor-pointer transition-all ${
                      defaultAddress?.id === addr.id 
                        ? 'bg-orange-50 border border-[#FF6B00]' 
                        : 'bg-gray-50 hover:bg-orange-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 text-xs">{addr.title || 'عنوان'}</p>
                        <p className="text-[10px] text-gray-500">{addr.city} - {addr.area}</p>
                      </div>
                      {defaultAddress?.id === addr.id && (
                        <Check size={12} className="text-[#FF6B00]" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Store Carts */}
      <div className="px-3 space-y-2">
        <AnimatePresence>
          {stores.map((store) => {
            const details = storeDetails[store.storeId];
            // حساب نسبة التقدم للشحن المجاني
            const freeDeliveryMin = details?.free_delivery_minimum || 0;
            const storeTotal = store.totalAmount;
            const qualifiesForFree = freeDeliveryMin > 0 && storeTotal >= freeDeliveryMin;
            const progressPercent = freeDeliveryMin > 0 
              ? Math.min((storeTotal / freeDeliveryMin) * 100, 100) 
              : 0;
            const remainingForFree = freeDeliveryMin > 0 && !qualifiesForFree 
              ? freeDeliveryMin - storeTotal 
              : 0;
            
            return (
              <motion.div
                key={store.storeId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              >
                {/* Store Header */}
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-[#FF6B00] rounded-full flex items-center justify-center">
                      <Store size={14} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm">{details?.name || 'متجر'}</h3>
                      <p className="text-[10px] text-gray-500">{store.itemCount} منتج</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link
                      to={`/food/cart/${store.storeId}`}
                      className="bg-[#FF6B00] text-white text-[10px] px-2 py-1 rounded-full font-medium"
                    >
                      إكمال الطلب
                    </Link>
                    <button
                      onClick={() => clearStoreCart(store.storeId)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded-full"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Items */}
                <div className="divide-y divide-gray-100">
                  {store.items.map((item) => (
                    <div key={item.id} className="p-2 flex items-center gap-2">
                      {/* Image */}
                      <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <UtensilsCrossed size={14} className="text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 text-xs truncate">{item.name}</h4>
                        <p className="text-[#FF6B00] font-bold text-xs">{formatPrice(item.price)}</p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateItemQuantity(store.storeId, item.id, item.quantity - 1)}
                          className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-5 text-center font-bold text-xs">{item.quantity}</span>
                        <button
                          onClick={() => updateItemQuantity(store.storeId, item.id, item.quantity + 1)}
                          className="w-6 h-6 bg-[#FF6B00] text-white rounded-full flex items-center justify-center hover:bg-[#E65000]"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* شريط تقدم الشحن المجاني */}
                {freeDeliveryMin > 0 && (
                  <div className={`p-2 mx-2 mb-2 rounded-lg border ${
                    qualifiesForFree 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-orange-50 border-orange-200'
                  }`}>
                    {qualifiesForFree ? (
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <Check size={12} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <span className="text-xs font-bold text-green-700">🎉 توصيل مجاني!</span>
                          <div className="h-1.5 mt-0.5 bg-green-200 rounded-full overflow-hidden">
                            <div className="h-full w-full bg-green-500 rounded-full" />
                          </div>
                        </div>
                        <span className="text-xs font-bold text-green-600">100%</span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1">
                            <Truck size={12} className="text-orange-600" />
                            <span className="text-[10px] font-medium text-orange-700">
                              أضف {formatPrice(remainingForFree)} للتوصيل المجاني
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-orange-600">
                            {Math.round(progressPercent)}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-orange-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-500"
                            style={{ width: `${progressPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Store Total */}
                <div className="bg-gray-50 p-2 flex items-center justify-between">
                  <span className="text-xs text-gray-600">المجموع:</span>
                  <span className="font-bold text-sm text-[#FF6B00]">{formatPrice(store.totalAmount)}</span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Total Summary */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-2 z-40 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">الإجمالي ({totalItems} منتج)</span>
          <span className="text-lg font-bold text-[#FF6B00]">{formatPrice(totalAmount)}</span>
        </div>
        
        {/* زر إكمال جميع الطلبات */}
        {stores.length > 1 && (
          <button
            onClick={handleCheckoutAll}
            disabled={checkoutLoading}
            className="w-full bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white py-2.5 rounded-lg font-bold hover:from-[#E65000] hover:to-[#FF6B00] transition-all flex items-center justify-center gap-2 mb-1 shadow-md text-sm"
            data-testid="checkout-all-btn"
          >
            {checkoutLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                <ShoppingCart size={16} />
                إكمال جميع الطلبات ({stores.length} متجر)
              </>
            )}
          </button>
        )}
        
        <p className="text-[10px] text-gray-500 text-center">
          {stores.length > 1 
            ? '🛵 سائق واحد سيجمع جميع طلباتك ويوصلها دفعة واحدة'
            : 'اضغط على "إكمال الطلب" لإتمام طلبك'
          }
        </p>
      </div>
    </div>
  );
};

export default FoodMyCartPage;
