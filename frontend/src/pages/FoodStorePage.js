// /app/frontend/src/pages/FoodStorePage.js
// صفحة تفاصيل متجر الطعام

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  Store, Star, Clock, MapPin, Phone, Plus, Minus, ShoppingBag,
  ArrowLeft, Heart, Share2, ChevronLeft, MessageCircle, User, DollarSign, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const FoodStorePage = () => {
  const { storeId } = useParams();
  const [searchParams] = useSearchParams();
  const highlightedProductId = searchParams.get('highlight');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const highlightedRef = useRef(null);

  const [store, setStore] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showReviews, setShowReviews] = useState(false);
  const [reviews, setReviews] = useState({ reviews: [], stats: null });
  const [priceRating, setPriceRating] = useState(null);
  const [badgeSettings, setBadgeSettings] = useState(null);
  const [contentReady, setContentReady] = useState(false); // للتحكم بظهور المحتوى

  useEffect(() => {
    fetchStore();
    loadCart();
    fetchPriceRating();
    fetchBadgeSettings();
  }, [storeId]);

  // التمرير للمنتج المحدد فوراً عند توفر ref
  useEffect(() => {
    if (!highlightedProductId || !store) return;
    
    // استخدام requestAnimationFrame للتمرير الفوري بعد render
    const scrollToHighlighted = () => {
      if (highlightedRef.current) {
        const element = highlightedRef.current;
        const elementRect = element.getBoundingClientRect();
        const absoluteElementTop = elementRect.top + window.pageYOffset;
        const offsetPosition = absoluteElementTop - 120;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'instant'
        });
        setContentReady(true);
      } else {
        // إذا لم يكن الـ ref جاهزاً، حاول مرة أخرى
        requestAnimationFrame(scrollToHighlighted);
      }
    };
    
    requestAnimationFrame(scrollToHighlighted);
  }, [highlightedProductId, store]);
  
  // إظهار المحتوى فوراً إذا لم يكن هناك منتج للتمييز
  useEffect(() => {
    if (!highlightedProductId && !loading) {
      setContentReady(true);
    }
  }, [highlightedProductId, loading]);

  const fetchBadgeSettings = async () => {
    try {
      const res = await axios.get(`${API}/api/settings/product-badges`);
      setBadgeSettings(res.data);
    } catch (e) {
      // لا مشكلة
    }
  };

  const fetchStore = async () => {
    try {
      const [storeRes, offersRes] = await Promise.all([
        axios.get(`${API}/api/food/stores/${storeId}`),
        axios.get(`${API}/api/food/stores/${storeId}/offers`)
      ]);
      setStore(storeRes.data);
      setOffers(offersRes.data || []);
    } catch (error) {
      toast({ title: "خطأ", description: "المتجر غير موجود", variant: "destructive" });
      navigate('/food');
    } finally {
      setLoading(false);
    }
  };

  const loadCart = () => {
    const savedCart = localStorage.getItem(`food_cart_${storeId}`);
    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  };

  const fetchPriceRating = async () => {
    try {
      const res = await axios.get(`${API}/api/price-reports/store/${storeId}/rating`);
      setPriceRating(res.data);
    } catch (e) {
      // لا مشكلة إذا فشل - المتجر جديد أو لا توجد بيانات
    }
  };

  const saveCart = (newCart) => {
    localStorage.setItem(`food_cart_${storeId}`, JSON.stringify(newCart));
    setCart(newCart);
    // إرسال حدث لتحديث شريط التوصيل
    window.dispatchEvent(new CustomEvent('foodCartUpdated'));
  };

  const addToCart = (product, quantity = 1) => {
    // منع الإضافة إذا الزائر غير مسجل
    if (!user) {
      toast({ 
        title: "يجب تسجيل الدخول", 
        description: "سجل دخولك لإضافة الطعام للسلة", 
        variant: "destructive" 
      });
      return;
    }
    
    // منع الإضافة إذا المتجر مغلق
    if (store?.is_open === false) {
      toast({ 
        title: "المتجر مغلق", 
        description: "لا يمكنك الطلب حالياً، يرجى العودة عندما يفتح المتجر", 
        variant: "destructive" 
      });
      return;
    }
    
    const existingIndex = cart.findIndex(item => item.product_id === product.id);
    
    if (existingIndex >= 0) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += quantity;
      saveCart(newCart);
    } else {
      const newItem = {
        product_id: product.id,
        name: product.name,
        price: product.price,
        image: product.images?.[0] || null,
        quantity: quantity
      };
      saveCart([...cart, newItem]);
    }
    
    // لا نعرض رسالة toast - الشريط السفلي يُظهر التحديث
  };

  const getCartQuantity = (productId) => {
    const item = cart.find(i => i.product_id === productId);
    return item?.quantity || 0;
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Group products by category
  const productsByCategory = store?.products?.reduce((acc, product) => {
    const cat = product.category || 'عام';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(product);
    return acc;
  }, {}) || {};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!store) {
    return null;
  }

  return (
    <div className={`min-h-screen bg-gray-50 pb-24 ${highlightedProductId && !contentReady ? 'invisible' : 'visible'}`}>
      {/* بانر المتجر مغلق */}
      {store.is_open === false && (
        <div className="bg-red-600 text-white px-4 py-3 text-center sticky top-0 z-50">
          <div className="flex items-center justify-center gap-2">
            <Clock size={18} />
            <span className="font-bold">المتجر مغلق حالياً</span>
          </div>
          {store.open_status && (
            <p className="text-sm text-red-100 mt-1">
              {store.open_status}
              {store.next_open_time && ` • يفتح ${store.next_open_time}`}
            </p>
          )}
        </div>
      )}

      {/* Header Image */}
      <div className={`relative h-48 bg-gradient-to-br from-[#FF6B00] to-[#E65000] ${store.is_open === false ? 'grayscale' : ''}`}>
        {store.cover_image && (
          <img 
            src={store.cover_image} 
            alt={store.name} 
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/30" />
        
        {/* Store Logo */}
        <div className="absolute -bottom-12 right-4">
          <div className="w-24 h-24 bg-white rounded-2xl shadow-lg flex items-center justify-center overflow-hidden">
            {store.logo ? (
              <img src={store.logo} alt={store.name} className="w-full h-full object-cover" />
            ) : (
              <Store size={40} className="text-[#FF6B00]" />
            )}
          </div>
        </div>
      </div>

      {/* Store Info */}
      <div className="px-4 pt-16 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">{store.name}</h1>
        <p className="text-gray-500 text-sm">{store.category_name}</p>
        
        <div className="flex flex-wrap items-center gap-4 mt-3">
          {store.rating > 0 && (
            <button
              onClick={async () => {
                if (!reviews.stats) {
                  try {
                    const res = await axios.get(`${API}/api/food/orders/store/${storeId}/reviews`);
                    setReviews(res.data);
                  } catch (e) {}
                }
                setShowReviews(true);
              }}
              className="flex items-center gap-1 hover:bg-yellow-50 px-2 py-1 rounded-lg transition-colors"
            >
              <Star size={16} className="text-yellow-500 fill-yellow-500" />
              <span className="font-medium">{store.rating.toFixed(1)}</span>
              <span className="text-gray-400 text-sm">({store.reviews_count} تقييم)</span>
            </button>
          )}
          
          {/* شارة تقييم الأسعار */}
          {priceRating && (
            <div 
              className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                priceRating.status === 'excellent' || priceRating.status === 'good' 
                  ? 'bg-green-50 text-green-700' 
                  : priceRating.status === 'average' 
                    ? 'bg-yellow-50 text-yellow-700'
                    : 'bg-red-50 text-red-700'
              }`}
              title={`تقييم الأسعار: ${priceRating.rating}/5`}
            >
              <DollarSign size={14} />
              <span className="text-xs font-medium">{priceRating.status_text}</span>
              {priceRating.show_warning && (
                <AlertTriangle size={12} className="text-orange-500" />
              )}
            </div>
          )}
          
          <div className="flex items-center gap-1 text-gray-600">
            <Clock size={16} />
            <span className="text-sm">{store.delivery_time} دقيقة</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <MapPin size={16} />
            <span className="text-sm">{typeof store.address === 'object' 
              ? [store.address?.area, store.address?.street, store.address?.building].filter(Boolean).join(', ') || store.city
              : (store.address || store.city)}</span>
          </div>
        </div>

        {store.minimum_order > 0 && (
          <div className="mt-3 bg-yellow-50 text-yellow-700 text-sm px-3 py-2 rounded-lg inline-block">
            الحد الأدنى للطلب: {store.minimum_order.toLocaleString()} ل.س
          </div>
        )}

        {store.description && (
          <p className="text-gray-600 text-sm mt-3">{store.description}</p>
        )}
      </div>

      {/* Active Offers Banner */}
      {offers.length > 0 && (
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 text-white mb-2">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-lg">🎁</span>
              <h3 className="font-bold text-sm">عروض المتجر</h3>
            </div>
            <div className="space-y-1.5">
              {offers.slice(0, 2).map((offer) => (
                <div 
                  key={offer.id}
                  className="bg-white/20 rounded-lg px-2.5 py-1.5 text-xs"
                >
                  <span className="font-bold">{offer.name}</span>
                  {offer.offer_type === 'buy_x_get_y' && (
                    <span className="mr-1">
                      - اشترِ {offer.buy_quantity} واحصل على {offer.get_quantity} مجاناً!
                    </span>
                  )}
                  {offer.offer_type === 'percentage' && (
                    <span className="mr-1">- خصم {offer.discount_percentage}%</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Products */}
      <div className="px-4">
        {Object.keys(productsByCategory).length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600">لا توجد منتجات متاحة حالياً</p>
          </div>
        ) : (
          Object.entries(productsByCategory).map(([category, products]) => (
            <div key={category} className="mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3">{category}</h2>
              <div className="space-y-3">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    cartQuantity={getCartQuantity(product.id)}
                    onAdd={() => addToCart(product)}
                    onView={() => setSelectedProduct(product)}
                    isStoreClosed={store?.is_open === false}
                    badgeSettings={badgeSettings}
                    isHighlighted={product.id === highlightedProductId}
                    highlightedRef={product.id === highlightedProductId ? highlightedRef : null}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Button - يظهر فقط إذا المتجر مفتوح */}
      {cartItemsCount > 0 && store?.is_open !== false && (
        <div className="fixed bottom-16 left-0 right-0 p-3 bg-white border-t border-gray-200 z-40 shadow-lg">
          <button
            onClick={() => navigate(`/food/cart/${storeId}`)}
            className="w-full bg-[#FF6B00] text-white py-3 rounded-xl font-bold flex items-center justify-between px-4 hover:bg-[#E65000]"
            data-testid="view-cart-button"
          >
            <div className="flex items-center gap-2">
              <ShoppingBag size={20} />
              <span>عرض السلة ({cartItemsCount})</span>
            </div>
            <span>{cartTotal.toLocaleString()} ل.س</span>
          </button>
        </div>
      )}

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductModal
            product={selectedProduct}
            cartQuantity={getCartQuantity(selectedProduct.id)}
            onAdd={(qty) => {
              addToCart(selectedProduct, qty);
              setSelectedProduct(null);
            }}
            onClose={() => setSelectedProduct(null)}
          />
        )}
        
        {showReviews && (
          <ReviewsModal
            reviews={reviews.reviews}
            stats={reviews.stats}
            storeName={store?.name}
            onClose={() => setShowReviews(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const ProductCard = ({ product, cartQuantity, onAdd, onView, isStoreClosed, badgeSettings, isHighlighted, highlightedRef }) => {
  const [badgeIndex, setBadgeIndex] = React.useState(0);
  const [activeBadge, setActiveBadge] = React.useState(null);

  // تحديد الشارة المناسبة
  React.useEffect(() => {
    if (!badgeSettings?.enabled || !badgeSettings?.badge_types) {
      setActiveBadge(null);
      return;
    }
    const { badge_types } = badgeSettings;
    
    if (badge_types.best_seller?.enabled && (product.sales_count || 0) >= (badge_types.best_seller.min_sales || 10)) {
      setActiveBadge({ messages: badge_types.best_seller.messages || ['🔥 الأكثر مبيعاً'] });
    } else if (badge_types.most_viewed?.enabled && (product.views || 0) >= (badge_types.most_viewed.min_views || 100)) {
      setActiveBadge({ messages: badge_types.most_viewed.messages || ['👁️ الأكثر زيارة'] });
    } else if (badge_types.free_shipping?.enabled) {
      const threshold = badge_types.free_shipping.threshold || 30000;
      
      if (product.price >= threshold) {
        // السعر أعلى من الحد - شحن مجاني مباشر
        setActiveBadge({ messages: badge_types.free_shipping.messages || ['🚚 شحن مجاني'] });
      } else {
        // حساب عدد القطع المطلوبة للشحن المجاني
        const neededQty = Math.ceil(threshold / product.price);
        
        if (neededQty <= 3) {
          // إظهار شارة "اشترِ X = شحن مجاني"
          setActiveBadge({
            messages: [`🛒 اشترِ ${neededQty} = شحن مجاني`, `📦 ${neededQty} قطع = توصيل مجاني`, `✨ وفّر التوصيل بـ ${neededQty} قطع`]
          });
        } else {
          setActiveBadge(null);
        }
      }
    } else {
      setActiveBadge(null);
    }
  }, [product, badgeSettings]);

  // دوران الشارة
  React.useEffect(() => {
    if (!activeBadge || activeBadge.messages.length <= 1) return;
    const interval = setInterval(() => {
      setBadgeIndex((prev) => (prev + 1) % activeBadge.messages.length);
    }, badgeSettings?.rotation_speed || 3000);
    return () => clearInterval(interval);
  }, [activeBadge, badgeSettings?.rotation_speed]);

  const bgColors = [
    'from-blue-500 via-blue-600 to-blue-500',
    'from-emerald-500 via-emerald-600 to-emerald-500',
    'from-violet-500 via-violet-600 to-violet-500',
    'from-rose-800 via-rose-900 to-rose-800'
  ];

  return (
    <motion.div
      ref={highlightedRef}
      whileTap={{ scale: 0.98 }}
      onClick={onView}
      initial={isHighlighted ? { scale: 1.02 } : {}}
      animate={isHighlighted ? { 
        scale: [1.02, 1, 1.02],
      } : {}}
      transition={isHighlighted ? { duration: 1.5, repeat: 3 } : {}}
      className={`relative bg-white rounded-xl p-3 flex gap-3 cursor-pointer transition-all
        ${isHighlighted ? 'border-4 border-purple-500 bg-gradient-to-r from-purple-50 to-pink-50 shadow-xl ring-4 ring-purple-200' : 'border-2 border-gray-200'}
        ${isStoreClosed ? 'opacity-60' : 'hover:shadow-md'}`}
    >
      {/* شريط "المنتج المحدد" */}
      {isHighlighted && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg animate-bounce">
          ⭐ المنتج الذي اخترته
        </div>
      )}
      
      <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0 relative">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag size={24} className="text-gray-400" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-gray-900 truncate">{product.name}</h3>
        {/* شارة المنتج */}
        {activeBadge && (
          <AnimatePresence mode="wait">
            <motion.div
              key={badgeIndex}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className={`inline-block text-white text-xs font-bold px-3 py-1 rounded-full shadow-md bg-gradient-to-r ${bgColors[badgeIndex % 4]} mt-1`}
            >
              {activeBadge.messages[badgeIndex]}
            </motion.div>
          </AnimatePresence>
        )}
        {product.description && !activeBadge && (
          <p className="text-sm text-gray-500 line-clamp-1 mt-1">{product.description}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <div>
            <span className="font-bold text-[#E65000]">{product.price.toLocaleString()} ل.س</span>
            {product.original_price && (
              <span className="text-sm text-gray-400 line-through mr-2">
                {product.original_price.toLocaleString()}
              </span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isStoreClosed) onAdd();
            }}
            disabled={isStoreClosed}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm
              ${isStoreClosed 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                : cartQuantity > 0 
                  ? 'bg-[#FF6B00] text-white' 
                  : 'bg-orange-100 text-[#E65000]'
              }`}
          >
            {cartQuantity > 0 && !isStoreClosed ? cartQuantity : <Plus size={20} />}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const ProductModal = ({ product, cartQuantity, onAdd, onClose }) => {
  const [quantity, setQuantity] = useState(1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-lg rounded-t-2xl overflow-hidden max-h-[85vh] overflow-y-auto pb-16 relative"
      >
        {/* زر الإغلاق */}
        <button
          onClick={onClose}
          className="absolute top-3 left-3 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-gray-600 hover:bg-white hover:text-gray-900 shadow-md"
        >
          ✕
        </button>
        
        {/* Product Image */}
        <div className="h-48 bg-gray-100 relative">
          {product.images?.[0] ? (
            <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag size={48} className="text-gray-400" />
            </div>
          )}
        </div>

        <div className="p-4">
          <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
          {product.description && (
            <p className="text-gray-600 mt-2">{product.description}</p>
          )}
          
          <div className="flex items-center gap-2 mt-3">
            <span className="text-2xl font-bold text-[#E65000]">{product.price.toLocaleString()} ل.س</span>
            {product.original_price && (
              <span className="text-lg text-gray-400 line-through">
                {product.original_price.toLocaleString()}
              </span>
            )}
          </div>

          {product.preparation_time && (
            <div className="flex items-center gap-2 mt-3 text-gray-600">
              <Clock size={16} />
              <span>وقت التحضير: {product.preparation_time} دقيقة</span>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="flex items-center justify-center gap-6 mt-6">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200"
            >
              <Minus size={20} />
            </button>
            <span className="text-2xl font-bold w-12 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-12 h-12 bg-orange-100 text-[#E65000] rounded-full flex items-center justify-center hover:bg-orange-200"
            >
              <Plus size={20} />
            </button>
          </div>

          {/* Add Button */}
          <button
            onClick={() => onAdd(quantity)}
            className="w-full bg-[#FF6B00] text-white py-4 rounded-xl font-bold mt-6 mb-20 flex items-center justify-center gap-2 hover:bg-[#E65000]"
          >
            <Plus size={20} />
            إضافة للسلة - {(product.price * quantity).toLocaleString()} ل.س
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Reviews Modal Component
const ReviewsModal = ({ reviews, stats, storeName, onClose }) => {
  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('ar-SY', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white px-4 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xl font-bold text-gray-900">تقييمات {storeName}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          
          {/* Stats */}
          {stats && (
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="flex items-center gap-1">
                  <Star size={24} className="text-yellow-500 fill-yellow-500" />
                  <span className="text-3xl font-bold text-gray-900">{stats.average}</span>
                </div>
                <p className="text-sm text-gray-500">{stats.total} تقييم</p>
              </div>
              
              <div className="flex-1 space-y-1">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = stats.distribution?.[rating] || 0;
                  const percent = stats.total > 0 ? (count / stats.total) * 100 : 0;
                  return (
                    <div key={rating} className="flex items-center gap-2 text-sm">
                      <span className="w-3 text-gray-500">{rating}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-yellow-400 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="w-6 text-gray-400 text-xs">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Reviews List */}
        <div className="flex-1 overflow-y-auto p-4">
          {reviews.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">لا توجد تقييمات بعد</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                        <User size={18} className="text-[#E65000]" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{review.customer_name}</p>
                        <p className="text-xs text-gray-500">{formatDate(review.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          size={14}
                          className={review.store_rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                        />
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-gray-700 text-sm">{review.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default FoodStorePage;
