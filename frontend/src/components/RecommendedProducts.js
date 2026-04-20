// /app/frontend/src/components/RecommendedProducts.js
// أقسام التوصيات - رائج الآن + عروض وخصومات + منتجات جديدة

import { useState, useEffect, memo, useRef } from 'react';
import logger from '../lib/logger';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Tag, Heart, MapPin, Sparkles, ChevronLeft } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price);
};

// ألوان شارة التوصيل المتقلبة
const deliveryBadgeColors = [
  'from-blue-500 to-blue-600',
  'from-emerald-500 to-emerald-600',
  'from-violet-500 to-violet-600',
  'from-rose-600 to-rose-700'
];

// ألوان حسب القسم
const sectionColors = {
  purple: { 
    border: 'border-purple-100 hover:border-purple-300', 
    text: 'text-purple-600', 
    icon: 'text-purple-500',
    badge: 'bg-purple-500'
  },
  green: { 
    border: 'border-green-100 hover:border-green-300', 
    text: 'text-green-600', 
    icon: 'text-green-500',
    badge: 'bg-green-500'
  },
  cyan: { 
    border: 'border-cyan-100 hover:border-cyan-300', 
    text: 'text-cyan-600', 
    icon: 'text-cyan-500',
    badge: 'bg-cyan-500'
  },
};

// مكون شارة التوصيل المتحركة - منفصل لتجنب إعادة render البطاقة
const DeliveryBadge = memo(({ deliveryBadge, badgeIndex }) => {
  if (!deliveryBadge) return null;
  
  return (
    <div className="absolute bottom-1 left-1 overflow-hidden h-5">
      <AnimatePresence mode="wait">
        <motion.div
          key={badgeIndex}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`bg-gradient-to-r ${deliveryBadgeColors[badgeIndex % deliveryBadgeColors.length]} text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-md`}
        >
          {deliveryBadge.messages[badgeIndex % deliveryBadge.messages.length]}
        </motion.div>
      </AnimatePresence>
    </div>
  );
});

// مكون بطاقة المنتج - خارج المكون الرئيسي
const ProductCard = memo(({ product, sectionColor = 'purple', deliveryBadge, badgeIndex }) => {
  const colors = sectionColors[sectionColor] || sectionColors.purple;

  return (
    <div className="flex-shrink-0 w-36">
      <Link
        to={`/products/${product.id}`}
        className={`block bg-white rounded-xl border-2 ${colors.border} overflow-hidden hover:shadow-lg transition-all`}
      >
        <div className="relative aspect-square">
          <img
            src={product.images?.[0] || product.image || '/placeholder.svg'}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          
          {/* شارة التوصية - أعلى يمين - لون القسم */}
          {product.recommendation_reason && (
            <span className={`absolute top-1 right-1 ${colors.badge} text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-md`}>
              {product.recommendation_reason}
            </span>
          )}
          
          {/* شارة التوصيل - أسفل يسار - ألوان متقلبة مع حركة للأعلى */}
          <DeliveryBadge deliveryBadge={deliveryBadge} badgeIndex={badgeIndex} />
          
          {/* زر المفضلة */}
          <button className="absolute top-1 left-1 w-6 h-6 bg-white/80 rounded-full flex items-center justify-center">
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
});

// مكون القسم - خارج المكون الرئيسي مع useRef للحفاظ على موقع الـ scroll
const Section = memo(({ title, icon: Icon, iconGradient, linkColor, linkTo, products, sectionColor, badgeIndex, getDeliveryBadge }) => {
  const scrollRef = useRef(null);

  return (
    <section className="mb-4" style={{ minHeight: '220px' }}>
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

      <div className="px-3" style={{ minHeight: '190px' }}>
        {products.length > 0 ? (
          <div ref={scrollRef} className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {products.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                sectionColor={sectionColor}
                deliveryBadge={getDeliveryBadge(product)}
                badgeIndex={badgeIndex}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center" style={{ minHeight: '190px' }}>
            <p className="text-gray-400 text-sm text-center">لا توجد منتجات حالياً</p>
          </div>
        )}
      </div>
    </section>
  );
});

const RecommendedProducts = () => {
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [dealsProducts, setDealsProducts] = useState([]);
  const [newProducts, setNewProducts] = useState([]);
  const [badgeSettings, setBadgeSettings] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [badgeIndex, setBadgeIndex] = useState(0);

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
        logger.error('Error fetching recommendations:', error);
        setLoaded(true);
      }
    };
    
    fetchAllData();
  }, []);

  // دوران الشارات العام - لا يسبب إعادة render للأقسام بفضل memo
  useEffect(() => {
    if (!loaded) return;
    const interval = setInterval(() => {
      setBadgeIndex((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, [loaded]);

  // حساب شارة التوصيل
  const getDeliveryBadge = (product) => {
    if (!badgeSettings?.enabled || !badgeSettings?.badge_types) return null;
    
    const { badge_types } = badgeSettings;
    const price = product.price || 0;
    
    if (badge_types.free_shipping?.enabled) {
      const threshold = badge_types.free_shipping.threshold || 30000;
      
      if (price >= threshold) {
        return { messages: badge_types.free_shipping.messages || ['🚚 شحن مجاني'] };
      }
      
      const unitsNeeded = Math.ceil(threshold / price);
      if (unitsNeeded >= 2 && unitsNeeded <= 3) {
        return {
          messages: [
            `🛒 ${unitsNeeded} = شحن مجاني`,
            `📦 ${unitsNeeded} قطع = توصيل`,
            `✨ وفّر بـ ${unitsNeeded} قطع`
          ]
        };
      }
    }
    
    return null;
  };

  // عرض skeleton أثناء التحميل
  if (!loaded) {
    return (
      <div className="py-2 space-y-4">
        {[
          { title: 'رائج الآن', icon: TrendingUp, gradient: 'from-purple-500 to-pink-500', link: 'text-purple-500' },
          { title: 'عروض وخصومات', icon: Tag, gradient: 'from-green-500 to-emerald-500', link: 'text-green-500' },
          { title: 'منتجات جديدة', icon: Sparkles, gradient: 'from-cyan-500 to-blue-500', link: 'text-cyan-500' }
        ].map((section, i) => (
          <div key={i} className="px-3 mb-4" style={{ minHeight: '220px' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`p-1 bg-gradient-to-r ${section.gradient} rounded-lg`}>
                  <section.icon size={14} className="text-white" />
                </div>
                <h2 className="text-sm font-bold text-gray-900">{section.title}</h2>
              </div>
              <span className={`${section.link} flex items-center gap-1 text-xs font-medium`}>
                عرض الكل
                <ChevronLeft size={14} />
              </span>
            </div>
            {/* Skeleton Cards */}
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2" style={{ minHeight: '190px' }}>
              {[1, 2, 3, 4].map(j => (
                <div key={j} className="flex-shrink-0 w-36 animate-pulse">
                  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    <div className="aspect-square bg-gray-200" />
                    <div className="p-2 space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-3/4" />
                      <div className="h-2 bg-gray-200 rounded w-1/2" />
                      <div className="h-3 bg-gray-200 rounded w-2/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="py-2">
      {/* 1. قسم رائج الآن - بنفسجي */}
      <Section
        title="رائج الآن"
        icon={TrendingUp}
        iconGradient="from-purple-500 to-pink-500"
        linkColor="text-purple-500"
        linkTo="/products?sort=trending"
        products={trendingProducts}
        sectionColor="purple"
        badgeIndex={badgeIndex}
        getDeliveryBadge={getDeliveryBadge}
      />

      {/* 2. قسم عروض وخصومات - أخضر */}
      <Section
        title="عروض وخصومات"
        icon={Tag}
        iconGradient="from-green-500 to-emerald-500"
        linkColor="text-green-500"
        linkTo="/products?sort=deals"
        products={dealsProducts}
        sectionColor="green"
        badgeIndex={badgeIndex}
        getDeliveryBadge={getDeliveryBadge}
      />

      {/* 3. قسم منتجات جديدة - سماوي */}
      <Section
        title="منتجات جديدة"
        icon={Sparkles}
        iconGradient="from-cyan-500 to-blue-500"
        linkColor="text-cyan-500"
        linkTo="/products?sort=newest"
        products={newProducts}
        sectionColor="cyan"
        badgeIndex={badgeIndex}
        getDeliveryBadge={getDeliveryBadge}
      />
    </div>
  );
};

export default RecommendedProducts;
