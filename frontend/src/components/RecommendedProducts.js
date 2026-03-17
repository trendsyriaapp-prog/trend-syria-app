// /app/frontend/src/components/RecommendedProducts.js
// أقسام التوصيات - رائج الآن + عروض وخصومات + منتجات جديدة

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { TrendingUp, Tag, Heart, MapPin, Sparkles, ChevronLeft } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const RecommendedProducts = () => {
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [dealsProducts, setDealsProducts] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [badgeSettings, setBadgeSettings] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [globalBadgeIndex, setGlobalBadgeIndex] = useState(0);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [trendingRes, dealsRes, newRes, badgeRes] = await Promise.all([
          axios.get(`${API}/api/recommendations/trending?limit=8`).catch(() => ({ data: [] })),
          axios.get(`${API}/api/recommendations/deals?limit=8`).catch(() => ({ data: [] })),
          axios.get(`${API}/api/recommendations/new-products?limit=8`).catch(() => ({ data: [] })),
          axios.get(`${API}/api/settings/product-badges`).catch(() => ({ data: null }))
        ]);
        
        setTrendingProducts(trendingRes.data || []);
        setDealsProducts(dealsRes.data || []);
        setNewProducts(newRes.data || []);
        setBadgeSettings(badgeRes.data);
        setLoaded(true);
      } catch (error) {
        console.error('Error fetching recommendations:', error);
        setLoaded(true);
      }
    };
    
    fetchAllData();
  }, []);

  // دوران الشارات العام - مرة واحدة فقط
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(() => {
      setGlobalBadgeIndex((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(interval);
  }, [loaded]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ar-SY').format(price);
  };

  // حساب نص الشارة
  const getBadgeInfo = (product) => {
    if (!badgeSettings?.enabled || !badgeSettings?.badge_types) return null;
    
    const { badge_types } = badgeSettings;
    const price = product.price || 0;
    
    if (badge_types.best_seller?.enabled && (product.sales_count || 0) >= (badge_types.best_seller.min_sales || 10)) {
      const messages = badge_types.best_seller.messages || ['🔥 الأكثر مبيعاً'];
      return { messages, colorIndex: 3 };
    }
    
    if (badge_types.most_viewed?.enabled && (product.views || 0) >= (badge_types.most_viewed.min_views || 100)) {
      const messages = badge_types.most_viewed.messages || ['👁️ رائج'];
      return { messages, colorIndex: 2 };
    }
    
    if (badge_types.free_shipping?.enabled) {
      const threshold = badge_types.free_shipping.threshold || 30000;
      
      if (price >= threshold) {
        const messages = badge_types.free_shipping.messages || ['🚚 شحن مجاني'];
        return { messages, colorIndex: 1 };
      }
      
      const unitsNeeded = Math.ceil(threshold / price);
      if (unitsNeeded >= 2 && unitsNeeded <= 3) {
        return {
          messages: [
            `🛒 ${unitsNeeded} = شحن مجاني`,
            `📦 ${unitsNeeded} قطع = توصيل`,
            `✨ وفّر بـ ${unitsNeeded} قطع`
          ],
          colorIndex: 0
        };
      }
    }
    
    return null;
  };

  const bgColors = [
    'from-blue-500 to-blue-600',
    'from-emerald-500 to-emerald-600',
    'from-violet-500 to-violet-600',
    'from-rose-600 to-rose-700'
  ];

  // مكون بطاقة المنتج الصغيرة
  const ProductCard = ({ product, color = 'purple', index = 0 }) => {
    const colorClasses = {
      purple: { border: 'border-purple-100 hover:border-purple-300', text: 'text-purple-600', icon: 'text-purple-500', badge: 'bg-purple-500/90' },
      green: { border: 'border-green-100 hover:border-green-300', text: 'text-green-600', icon: 'text-green-500', badge: 'bg-green-500/90' },
      cyan: { border: 'border-cyan-100 hover:border-cyan-300', text: 'text-cyan-600', icon: 'text-cyan-500', badge: 'bg-cyan-500/90' },
    };
    const colors = colorClasses[color] || colorClasses.purple;
    const badgeInfo = getBadgeInfo(product);

    return (
      <div className="flex-shrink-0 w-36">
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
            
            {/* شارة التوصيل - مع دوران */}
            {badgeInfo && (
              <div className={`absolute bottom-1 left-1 bg-gradient-to-r ${bgColors[badgeInfo.colorIndex]} text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-md`}>
                {badgeInfo.messages[globalBadgeIndex % badgeInfo.messages.length]}
              </div>
            )}
            
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
      </div>
    );
  };

  // مكون القسم
  const Section = ({ title, icon: Icon, iconGradient, linkColor, linkTo, products, color }) => {
    if (products.length === 0) return null;

    return (
      <section className="mb-4">
        <div className="px-3 flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`p-1 bg-gradient-to-r ${iconGradient} rounded-lg`}>
              <Icon size={14} className="text-white" />
            </div>
            <h2 className="text-sm font-bold text-gray-900">{title}</h2>
          </div>
          <Link to={linkTo} className={`${linkColor} flex items-center gap-1 text-xs font-medium`}>
            عرض الكل
            <ChevronLeft size={14} />
          </Link>
        </div>

        <div className="px-3">
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {products.map((product, index) => (
              <ProductCard key={product.id} product={product} color={color} index={index} />
            ))}
          </div>
        </div>
      </section>
    );
  };

  // عرض skeleton أثناء التحميل الأولي
  if (!loaded) {
    return (
      <div className="py-2 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="px-3 mb-4">
            <div className="h-6 w-32 bg-gray-200 rounded mb-2 animate-pulse" />
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {[1, 2, 3, 4].map(j => (
                <div key={j} className="flex-shrink-0 w-36 bg-gray-100 rounded-xl h-48 animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="py-2">
      {/* 1. قسم رائج الآن */}
      <Section
        title="رائج الآن"
        icon={TrendingUp}
        iconGradient="from-purple-500 to-pink-500"
        linkColor="text-purple-500"
        linkTo="/products?sort=trending"
        products={trendingProducts}
        color="purple"
      />

      {/* 2. قسم عروض وخصومات */}
      <Section
        title="عروض وخصومات"
        icon={Tag}
        iconGradient="from-green-500 to-emerald-500"
        linkColor="text-green-500"
        linkTo="/products?sort=deals"
        products={dealsProducts}
        color="green"
      />

      {/* 3. قسم منتجات جديدة */}
      <Section
        title="منتجات جديدة"
        icon={Sparkles}
        iconGradient="from-cyan-500 to-blue-500"
        linkColor="text-cyan-500"
        linkTo="/products?sort=newest"
        products={newProducts}
        color="cyan"
      />
    </div>
  );
};

export default RecommendedProducts;
