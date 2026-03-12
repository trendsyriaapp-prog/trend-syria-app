// صفحة سلة الطعام المجمعة - تعرض جميع الطلبات من مختلف المتاجر
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Store, Trash2, ShoppingBag, Plus, Minus, UtensilsCrossed, Truck, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFoodCart } from '../context/FoodCartContext';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// دالة تنسيق السعر
const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const FoodMyCartPage = () => {
  const navigate = useNavigate();
  const { stores, totalItems, totalAmount, clearStoreCart, clearAllFoodCarts, refresh } = useFoodCart();
  const [storeDetails, setStoreDetails] = useState({});
  const [loading, setLoading] = useState(true);
  const [fetchedStoreIds, setFetchedStoreIds] = useState([]);

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

      {/* Store Carts */}
      <div className="p-4 space-y-4">
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
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                {/* Store Header */}
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#FF6B00] rounded-full flex items-center justify-center">
                      <Store size={18} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{details?.name || 'متجر'}</h3>
                      <p className="text-xs text-gray-500">{store.itemCount} منتج</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/food/cart/${store.storeId}`}
                      className="bg-[#FF6B00] text-white text-xs px-3 py-1.5 rounded-full font-medium"
                    >
                      إكمال الطلب
                    </Link>
                    <button
                      onClick={() => clearStoreCart(store.storeId)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-full"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Items */}
                <div className="divide-y divide-gray-100">
                  {store.items.map((item) => (
                    <div key={item.id} className="p-3 flex items-center gap-3">
                      {/* Image */}
                      <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <UtensilsCrossed size={20} className="text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 text-sm truncate">{item.name}</h4>
                        <p className="text-[#FF6B00] font-bold text-sm">{formatPrice(item.price)}</p>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateItemQuantity(store.storeId, item.id, item.quantity - 1)}
                          className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateItemQuantity(store.storeId, item.id, item.quantity + 1)}
                          className="w-7 h-7 bg-[#FF6B00] text-white rounded-full flex items-center justify-center hover:bg-[#E65000]"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* شريط تقدم الشحن المجاني */}
                {freeDeliveryMin > 0 && (
                  <div className={`p-3 mx-3 mb-3 rounded-xl border ${
                    qualifiesForFree 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-orange-50 border-orange-200'
                  }`}>
                    {qualifiesForFree ? (
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <Check size={16} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <span className="text-sm font-bold text-green-700">🎉 توصيل مجاني!</span>
                          <div className="h-2 mt-1 bg-green-200 rounded-full overflow-hidden">
                            <div className="h-full w-full bg-green-500 rounded-full" />
                          </div>
                        </div>
                        <span className="text-sm font-bold text-green-600">100%</span>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <Truck size={16} className="text-orange-600" />
                            <span className="text-xs font-medium text-orange-700">
                              أضف {formatPrice(remainingForFree)} للتوصيل المجاني
                            </span>
                          </div>
                          <span className="text-xs font-bold text-orange-600">
                            {Math.round(progressPercent)}%
                          </span>
                        </div>
                        <div className="h-2 bg-orange-200 rounded-full overflow-hidden">
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
                <div className="bg-gray-50 p-3 flex items-center justify-between">
                  <span className="text-sm text-gray-600">المجموع:</span>
                  <span className="font-bold text-[#FF6B00]">{formatPrice(store.totalAmount)}</span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Total Summary */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-3 z-40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-600">الإجمالي ({totalItems} منتج)</span>
          <span className="text-xl font-bold text-[#FF6B00]">{formatPrice(totalAmount)}</span>
        </div>
        <p className="text-xs text-gray-500 text-center">
          اختر متجراً لإكمال الطلب • رسوم التوصيل تُحسب لكل متجر على حدة
        </p>
      </div>
    </div>
  );
};

export default FoodMyCartPage;
