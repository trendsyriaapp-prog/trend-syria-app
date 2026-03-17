// /app/frontend/src/components/RecommendedProducts.js
// قسم التوصيات - رائج الآن + عروض

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { TrendingUp, Tag, Heart, MapPin, Sparkles, ChevronLeft } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const RecommendedProducts = () => {
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [dealsProducts, setDealsProducts] = useState([]);
  const [loadingTrending, setLoadingTrending] = useState(true);
  const [loadingDeals, setLoadingDeals] = useState(true);
  const [badgeSettings, setBadgeSettings] = useState(null);

  useEffect(() => {
    fetchTrending();
    fetchDeals();
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

  const fetchTrending = async () => {
    setLoadingTrending(true);
    try {
      const res = await axios.get(`${API}/api/recommendations/trending?limit=8`);
      setTrendingProducts(res.data);
    } catch (error) {
      console.error('Error fetching trending:', error);
      setTrendingProducts([]);
    } finally {
      setLoadingTrending(false);
    }
  };

  const fetchDeals = async () => {
    setLoadingDeals(true);
    try {
      const res = await axios.get(`${API}/api/recommendations/deals?limit=8`);
      setDealsProducts(res.data);
    } catch (error) {
      console.error('Error fetching deals:', error);
      setDealsProducts([]);
    } finally {
      setLoadingDeals(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ar-SY').format(price);
  };

  // مكون بطاقة المنتج الصغيرة
  const ProductCard = ({ product, color = 'purple' }) => {
    const colorClasses = {
      purple: { border: 'border-purple-100 hover:border-purple-300', text: 'text-purple-600', icon: 'text-purple-500', badge: 'bg-purple-500/90' },
      green: { border: 'border-green-100 hover:border-green-300', text: 'text-green-600', icon: 'text-green-500', badge: 'bg-green-500/90' },
    };
    const colors = colorClasses[color];

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex-shrink-0 w-36"
      >
        <Link
          to={`/products/${product.id}`}
          className={`block bg-white rounded-xl border-2 ${colors.border} overflow-hidden hover:shadow-lg transition-all`}
        >
          <div className="relative aspect-square">
            <img
              src={product.images?.[0] || product.image || 'https://via.placeholder.com/200'}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            
            {product.discount_percent > 0 && (
              <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                -{product.discount_percent}%
              </span>
            )}
            
            {product.recommendation_reason && (
              <span className={`absolute bottom-2 right-2 ${colors.badge} text-white text-[9px] px-1.5 py-0.5 rounded-full`}>
                {product.recommendation_reason}
              </span>
            )}
            
            <SmallBadge product={product} badgeSettings={badgeSettings} />
            
            <button className="absolute top-2 left-2 w-6 h-6 bg-white/80 rounded-full flex items-center justify-center">
              <Heart size={12} className="text-gray-400" />
            </button>
          </div>
          
          <div className="p-2">
            <h3 className="font-medium text-sm text-gray-900 truncate">{product.name}</h3>
            {product.city && (
              <div className="flex items-center gap-1 text-gray-500 mt-0.5">
                <MapPin size={10} className={colors.icon} />
                <span className="text-[10px]">{product.city}</span>
              </div>
            )}
            <p className={`${colors.text} font-bold text-sm mt-1`}>
              {formatPrice(product.price)} ل.س
            </p>
          </div>
        </Link>
      </motion.div>
    );
  };

  return (
    <div className="py-2 space-y-4">
      {/* 1. قسم رائج الآن */}
      <section>
        <div className="px-3 flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
              <TrendingUp size={14} className="text-white" />
            </div>
            <h2 className="text-sm font-bold text-gray-900">رائج الآن</h2>
          </div>
          <Link to="/products?sort=trending" className="text-purple-500 flex items-center gap-1 text-xs font-medium">
            عرض الكل
            <ChevronLeft size={14} />
          </Link>
        </div>

        <div className="px-3">
          {loadingTrending ? (
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex-shrink-0 w-36 bg-gray-100 rounded-xl h-48 animate-pulse" />
              ))}
            </div>
          ) : trendingProducts.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">لا توجد منتجات رائجة</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {trendingProducts.map((product) => (
                <ProductCard key={product.id} product={product} color="purple" />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 2. قسم العروض */}
      {(loadingDeals || dealsProducts.length > 0) && (
        <section>
          <div className="px-3 flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                <Tag size={14} className="text-white" />
              </div>
              <h2 className="text-sm font-bold text-gray-900">عروض وخصومات</h2>
            </div>
            <Link to="/products?sort=deals" className="text-green-500 flex items-center gap-1 text-xs font-medium">
              عرض الكل
              <ChevronLeft size={14} />
            </Link>
          </div>

          <div className="px-3">
            {loadingDeals ? (
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex-shrink-0 w-36 bg-gray-100 rounded-xl h-48 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                {dealsProducts.map((product) => (
                  <ProductCard key={product.id} product={product} color="green" />
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
};

// مكون الشارة الصغيرة
const SmallBadge = ({ product, badgeSettings }) => {
  const [badgeText, setBadgeText] = useState(null);
  const [colorIndex, setColorIndex] = useState(0);
  
  const bgColors = [
    'from-blue-500 to-blue-600',
    'from-emerald-500 to-emerald-600',
    'from-violet-500 to-violet-600',
    'from-rose-600 to-rose-700'
  ];

  useEffect(() => {
    if (!badgeSettings?.enabled || !badgeSettings?.badge_types) {
      setBadgeText(null);
      return;
    }
    
    const { badge_types } = badgeSettings;
    const price = product.price || 0;
    
    if (badge_types.best_seller?.enabled && (product.sales_count || 0) >= (badge_types.best_seller.min_sales || 10)) {
      setBadgeText('الأكثر مبيعاً');
      setColorIndex(3);
    } else if (badge_types.most_viewed?.enabled && (product.views || 0) >= (badge_types.most_viewed.min_views || 100)) {
      setBadgeText('رائج');
      setColorIndex(2);
    } else if (badge_types.free_shipping?.enabled) {
      const threshold = badge_types.free_shipping.threshold || 30000;
      
      if (price >= threshold) {
        setBadgeText('شحن مجاني');
        setColorIndex(1);
      } else {
        const unitsNeeded = Math.ceil(threshold / price);
        if (unitsNeeded >= 2 && unitsNeeded <= 3) {
          setBadgeText(`${unitsNeeded} = شحن مجاني`);
          setColorIndex(0);
        } else {
          setBadgeText(null);
        }
      }
    } else {
      setBadgeText(null);
    }
  }, [product, badgeSettings]);

  if (!badgeText) return null;

  return (
    <div className={`absolute bottom-1 left-1 bg-gradient-to-r ${bgColors[colorIndex]} text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-md`}>
      {badgeText}
    </div>
  );
};

export default RecommendedProducts;
