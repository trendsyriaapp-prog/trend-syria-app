// شريط الشحن المجاني العائم
// يظهر على جميع الصفحات ما عدا صفحات السلة
import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, X, PartyPopper, Store } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useFoodCart } from '../context/FoodCartContext';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const FreeShippingFloatingBanner = () => {
  const location = useLocation();
  const { cart } = useCart();
  const { stores: foodStores, totalAmount: foodTotalAmount } = useFoodCart();
  
  // حالة الشريط
  const [visible, setVisible] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [currentStore, setCurrentStore] = useState(null);
  const [storesProgress, setStoresProgress] = useState([]);
  const [dismissedStores, setDismissedStores] = useState([]);
  const [lastCartTotal, setLastCartTotal] = useState(0);
  const [lastFoodTotal, setLastFoodTotal] = useState(0);
  
  // الصفحات التي لا يظهر فيها الشريط
  const hiddenPaths = ['/cart', '/food/my-cart', '/food/cart/', '/checkout', '/food/batch-checkout'];
  const shouldHide = hiddenPaths.some(path => location.pathname.startsWith(path));
  
  // تحديد إذا كنا في قسم الطعام
  const isFood = location.pathname.startsWith('/food');
  
  // التحقق من وجود بيانات السلة
  const cartItems = cart?.items || [];
  const cartTotal = cart?.total || 0;
  
  // جلب بيانات الشحن للمنتجات
  const fetchProductShipping = useCallback(async () => {
    if (cartItems.length === 0) return [];
    
    try {
      // تجميع المنتجات حسب البائع
      const sellerGroups = {};
      cartItems.forEach(item => {
        // استخدام بيانات المنتج المدمجة في السلة
        const sellerId = item.product?.seller_id || item.seller_id;
        const sellerName = item.product?.seller_name || item.seller_name || 'متجر';
        const itemPrice = item.item_price || item.product?.price || 0;
        
        if (!sellerId) return; // تخطي العناصر بدون seller_id
        
        if (!sellerGroups[sellerId]) {
          sellerGroups[sellerId] = {
            seller_id: sellerId,
            seller_name: sellerName,
            subtotal: 0,
            free_shipping_threshold: 150000 // قيمة افتراضية
          };
        }
        sellerGroups[sellerId].subtotal += itemPrice * item.quantity;
      });
      
      // محاولة جلب بيانات الشحن الفعلية
      try {
        const res = await axios.get(`${API}/shipping/cart/detailed?customer_city=دمشق`);
        if (res.data.sellers) {
          res.data.sellers.forEach(seller => {
            if (sellerGroups[seller.seller_id]) {
              sellerGroups[seller.seller_id].free_shipping_threshold = seller.free_shipping_threshold || 150000;
            }
          });
        }
      } catch (e) {
        // استخدام القيم الافتراضية
      }
      
      return Object.values(sellerGroups).map(seller => ({
        ...seller,
        type: 'product',
        progress: Math.min((seller.subtotal / seller.free_shipping_threshold) * 100, 100),
        remaining: Math.max(seller.free_shipping_threshold - seller.subtotal, 0),
        isFree: seller.subtotal >= seller.free_shipping_threshold
      }));
    } catch (error) {
      return [];
    }
  }, [cartItems]);
  
  // جلب بيانات الشحن للطعام
  const fetchFoodShipping = useCallback(async () => {
    if (foodStores.length === 0) return [];
    
    try {
      const storesData = await Promise.all(
        foodStores.map(async (store) => {
          try {
            const res = await axios.get(`${API}/food/stores/${store.storeId}`);
            const storeData = res.data;
            const freeMin = storeData.free_delivery_minimum || 50000;
            
            return {
              seller_id: store.storeId,
              seller_name: storeData.name || 'متجر طعام',
              subtotal: store.totalAmount,
              free_shipping_threshold: freeMin,
              type: 'food',
              progress: Math.min((store.totalAmount / freeMin) * 100, 100),
              remaining: Math.max(freeMin - store.totalAmount, 0),
              isFree: store.totalAmount >= freeMin
            };
          } catch (e) {
            return {
              seller_id: store.storeId,
              seller_name: 'متجر طعام',
              subtotal: store.totalAmount,
              free_shipping_threshold: 50000,
              type: 'food',
              progress: Math.min((store.totalAmount / 50000) * 100, 100),
              remaining: Math.max(50000 - store.totalAmount, 0),
              isFree: store.totalAmount >= 50000
            };
          }
        })
      );
      
      return storesData;
    } catch (error) {
      return [];
    }
  }, [foodStores]);
  
  // تحديث بيانات المتاجر
  useEffect(() => {
    const updateStores = async () => {
      let stores = [];
      
      if (isFood) {
        stores = await fetchFoodShipping();
      } else {
        stores = await fetchProductShipping();
      }
      
      // تصفية المتاجر التي تم تجاهلها
      stores = stores.filter(s => !dismissedStores.includes(s.seller_id));
      
      setStoresProgress(stores);
    };
    
    updateStores();
  }, [isFood, fetchFoodShipping, fetchProductShipping, dismissedStores, cartTotal, foodTotalAmount]);
  
  // اختيار المتجر الأقرب للشحن المجاني وإظهار الشريط
  useEffect(() => {
    if (storesProgress.length === 0) {
      setCurrentStore(null);
      setVisible(false);
      return;
    }
    
    // المتاجر التي لم تصل للشحن المجاني بعد
    const pendingStores = storesProgress.filter(s => !s.isFree);
    
    if (pendingStores.length > 0) {
      // اختيار الأقرب (أعلى نسبة تقدم)
      const closest = pendingStores.reduce((prev, curr) => 
        curr.progress > prev.progress ? curr : prev
      );
      setCurrentStore(closest);
      setCelebrating(false);
      // إظهار الشريط إذا لم نكن في صفحة محظورة
      if (!shouldHide) {
        setVisible(true);
      }
    } else if (storesProgress.length > 0) {
      // جميع المتاجر وصلت للشحن المجاني
      const justCompleted = storesProgress.find(s => s.isFree && !dismissedStores.includes(s.seller_id + '_celebrated'));
      if (justCompleted) {
        setCurrentStore(justCompleted);
        setCelebrating(true);
        if (!shouldHide) {
          setVisible(true);
        }
      } else {
        setCurrentStore(null);
        setVisible(false);
      }
    }
  }, [storesProgress, dismissedStores, shouldHide]);
  
  // تحديث الإظهار عند تغيير الإجمالي
  useEffect(() => {
    const currentTotal = isFood ? foodTotalAmount : cartTotal;
    
    if (isFood) {
      setLastFoodTotal(foodTotalAmount);
    } else {
      setLastCartTotal(cartTotal);
    }
    
    // إظهار الشريط إذا كان هناك منتجات
    if (currentTotal > 0 && currentStore && !shouldHide) {
      setVisible(true);
    }
  }, [cartTotal, foodTotalAmount, isFood, currentStore, shouldHide]);
  
  // إخفاء بعد الاحتفال
  useEffect(() => {
    if (celebrating && currentStore) {
      const timer = setTimeout(() => {
        // إضافة للقائمة المحتفى بها
        setDismissedStores(prev => [...prev, currentStore.seller_id + '_celebrated']);
        setCelebrating(false);
        
        // التحقق من وجود متاجر أخرى
        const remaining = storesProgress.filter(
          s => !s.isFree && s.seller_id !== currentStore.seller_id
        );
        
        if (remaining.length === 0) {
          setVisible(false);
        }
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [celebrating, currentStore, storesProgress]);
  
  // إعادة تعيين عند تغيير القسم
  useEffect(() => {
    setDismissedStores([]);
  }, [isFood]);
  
  // إخفاء في صفحات السلة
  if (shouldHide || !visible || !currentStore) {
    return null;
  }
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="fixed top-16 left-2 right-2 z-40"
        data-testid="free-shipping-banner"
      >
        <div className={`rounded-xl shadow-md overflow-hidden ${
          celebrating 
            ? 'bg-gradient-to-r from-orange-500 to-amber-500' 
            : 'bg-white/95 backdrop-blur-sm border border-gray-100'
        }`}>
          {celebrating ? (
            // حالة الاحتفال - مصغرة
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="px-3 py-2 flex items-center gap-2"
            >
              <PartyPopper size={16} className="text-white" />
              <p className="text-white font-bold text-xs flex-1">🎉 شحن مجاني! - {currentStore.seller_name}</p>
              <span className="text-lg">🎊</span>
            </motion.div>
          ) : (
            // حالة التقدم - مصغرة
            <div className="px-3 py-2" data-testid="banner-progress-state">
              <div className="flex items-center gap-2">
                {/* أيقونة */}
                <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  {isFood ? (
                    <Store size={12} className="text-orange-600" />
                  ) : (
                    <Truck size={12} className="text-orange-600" />
                  )}
                </div>
                
                {/* شريط التقدم مع النص */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] text-gray-600 truncate" data-testid="banner-seller-name">
                      <span className="font-semibold text-gray-800">{currentStore.seller_name}</span>
                      {' - أضف '}
                      <span className="text-orange-600 font-bold">{formatPrice(currentStore.remaining)}</span>
                    </p>
                    <span className="text-[10px] font-bold text-orange-600 mr-1" data-testid="banner-progress-percent">
                      {Math.round(currentStore.progress)}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${currentStore.progress}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full"
                    />
                  </div>
                </div>
                
                {/* زر الإغلاق */}
                <button 
                  onClick={() => setVisible(false)}
                  className="p-0.5 hover:bg-gray-100 rounded-full flex-shrink-0"
                  data-testid="banner-close-btn"
                >
                  <X size={12} className="text-gray-400" />
                </button>
              </div>
              
              {/* عدد المتاجر */}
              {storesProgress.filter(s => !s.isFree).length > 1 && (
                <p className="text-[9px] text-gray-400 text-center mt-1">
                  {storesProgress.filter(s => !s.isFree).length} متاجر في السلة
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FreeShippingFloatingBanner;
