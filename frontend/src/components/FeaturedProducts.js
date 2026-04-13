// /app/frontend/src/components/FeaturedProducts.js
// مكون عرض المنتجات المميزة (المعلن عنها)

import { useState, useEffect, memo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Star, ChevronLeft, Sparkles, ShoppingCart, Truck, Loader2, MapPin } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const FeaturedProducts = memo(() => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState({});
  const [badgeSettings, setBadgeSettings] = useState(null);
  const { addToCart } = useCart();
  const { settings } = useSettings();
  const { toast } = useToast();

  const freeShippingThreshold = settings?.free_shipping_threshold || 150000;
  
  useEffect(() => {
    fetchFeaturedProducts();
    fetchBadgeSettings();
  }, []);

  const fetchBadgeSettings = async () => {
    try {
      const res = await axios.get(`${API}/api/settings/product-badges`);
      setBadgeSettings(res.data);
    } catch (err) {
      console.log('Badge settings not available');
    }
  };
  
  const fetchFeaturedProducts = async () => {
    try {
      const res = await axios.get(`${API}/api/ads/featured-products?limit=6`);
      setProducts(res.data);
    } catch (error) {
      console.error('Error fetching featured products:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleClick = async (adId) => {
    try {
      await axios.post(`${API}/api/ads/click/${adId}`);
    } catch (error) {
      // Silent fail
    }
  };

  const handleAddToCart = async (e, product) => {
    e.preventDefault();
    e.stopPropagation();
    
    setAddingToCart(prev => ({ ...prev, [product.id]: true }));
    try {
      await addToCart(product, 1);
      // لا نُظهر إشعار - شريط الشحن العائم سيُظهر التقدم
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل إضافة المنتج للسلة",
        variant: "destructive"
      });
    } finally {
      setAddingToCart(prev => ({ ...prev, [product.id]: false }));
    }
  };
  
  if (loading) {
    return (
      <div className="py-3">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-36 bg-white rounded-xl overflow-hidden shadow-sm">
                <div className="aspect-square shimmer" />
                <div className="p-2 space-y-1">
                  <div className="h-3 shimmer rounded w-full" />
                  <div className="h-4 shimmer rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (products.length === 0) {
    return null; // Don't show section if no featured products
  }
  
  return (
    <section className="py-3 bg-gradient-to-b from-yellow-50/50 to-transparent" data-testid="featured-products-section">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-yellow-100 rounded-lg">
              <Sparkles size={14} className="text-yellow-600" />
            </div>
            <h2 className="text-sm font-bold text-gray-900">منتجات مميزة</h2>
            <span className="bg-yellow-100 text-yellow-700 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
              إعلان
            </span>
          </div>
          <Link 
            to="/products" 
            className="text-[#FF6B00] flex items-center gap-1 text-xs font-medium"
          >
            المزيد
            <ChevronLeft size={14} />
          </Link>
        </div>
        
        {/* Products Grid - Horizontal Scroll */}
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
          {products.map((item, i) => (
            <motion.div
              key={item.ad_id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="flex-shrink-0"
            >
              <Link
                to={`/products/${item.product.id}`}
                onClick={() => handleClick(item.ad_id)}
                className="block w-36 bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow border border-yellow-200 relative"
                data-testid={`featured-product-${item.product.id}`}
              >
                {/* Featured Badge */}
                <div className="absolute top-1 right-1 z-10 bg-gradient-to-l from-yellow-400 to-yellow-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                  <Star size={8} fill="white" />
                  مميز
                </div>
                
                {/* Image */}
                <div className="aspect-square bg-gray-100 relative">
                  <img
                    src={item.product.images?.[0] || '/placeholder.svg'}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {/* شارة التوصيل */}
                  <SmallBadge product={item.product} badgeSettings={badgeSettings} />
                </div>
                
                {/* Info */}
                <div className="p-2">
                  <h3 className="text-[11px] font-medium text-gray-900 truncate mb-0.5">
                    {item.product.name}
                  </h3>
                  {item.product.city && (
                    <div className="flex items-center gap-1 text-gray-500 mb-1">
                      <MapPin size={9} className="text-yellow-500" />
                      <span className="text-[9px]">{item.product.city}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex flex-col">
                      <p className="text-[#FF6B00] font-bold text-xs">
                        {formatPrice(item.product.price)}
                      </p>
                      {item.product.price >= freeShippingThreshold && (
                        <span className="text-green-600 text-[9px] font-bold flex items-center gap-0.5">
                          <Truck size={9} />
                          شحن مجاني
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => handleAddToCart(e, item.product)}
                      disabled={addingToCart[item.product.id]}
                      className="w-7 h-7 bg-[#FF6B00] text-white rounded-full flex items-center justify-center hover:bg-[#E65000] transition-colors disabled:opacity-50 flex-shrink-0"
                      data-testid={`add-to-cart-${item.product.id}`}
                    >
                      {addingToCart[item.product.id] ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <ShoppingCart size={14} />
                      )}
                    </button>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
});

FeaturedProducts.displayName = 'FeaturedProducts';

export default FeaturedProducts;

// مكون الشارة الصغيرة مع الدوران
const SmallBadge = ({ product, badgeSettings }) => {
  const [activeBadge, setActiveBadge] = useState(null);
  const [badgeIndex, setBadgeIndex] = useState(0);
  
  const bgColors = [
    'from-blue-500 to-blue-600',
    'from-emerald-500 to-emerald-600',
    'from-violet-500 to-violet-600',
    'from-rose-600 to-rose-700'
  ];

  useEffect(() => {
    if (!badgeSettings?.enabled || !badgeSettings?.badge_types) {
      setActiveBadge(null);
      return;
    }
    
    const { badge_types } = badgeSettings;
    const price = product.price || 0;
    
    if (badge_types.best_seller?.enabled && (product.sales_count || 0) >= (badge_types.best_seller.min_sales || 10)) {
      setActiveBadge({ messages: badge_types.best_seller.messages || ['🔥 الأكثر مبيعاً'] });
    } else if (badge_types.most_viewed?.enabled && (product.views || 0) >= (badge_types.most_viewed.min_views || 100)) {
      setActiveBadge({ messages: badge_types.most_viewed.messages || ['👁️ رائج'] });
    } else if (badge_types.free_shipping?.enabled) {
      const threshold = badge_types.free_shipping.threshold || 30000;
      
      if (price >= threshold) {
        setActiveBadge({ messages: badge_types.free_shipping.messages || ['🚚 شحن مجاني'] });
      } else {
        const unitsNeeded = Math.ceil(threshold / price);
        if (unitsNeeded >= 2 && unitsNeeded <= 3) {
          setActiveBadge({
            messages: [
              `🛒 اشترِ ${unitsNeeded} = شحن مجاني`,
              `📦 ${unitsNeeded} قطع = توصيل مجاني`,
              `✨ وفّر التوصيل بـ ${unitsNeeded} قطع`
            ]
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
  useEffect(() => {
    if (!activeBadge || activeBadge.messages.length <= 1) return;
    const interval = setInterval(() => {
      setBadgeIndex((prev) => (prev + 1) % activeBadge.messages.length);
    }, badgeSettings?.rotation_speed || 3000);
    return () => clearInterval(interval);
  }, [activeBadge, badgeSettings?.rotation_speed]);

  if (!activeBadge) return null;

  return (
    <div className={`absolute bottom-1 left-1 bg-gradient-to-r ${bgColors[badgeIndex % bgColors.length]} text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md transition-all duration-300`}>
      {activeBadge.messages[badgeIndex]}
    </div>
  );
};
