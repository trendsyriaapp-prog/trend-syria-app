// /app/frontend/src/components/RecommendedProducts.js
// قسم التوصيات الذكية

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Sparkles, ChevronLeft, TrendingUp, Tag, Heart, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;

const RecommendedProducts = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('for-you');
  const [badgeSettings, setBadgeSettings] = useState(null);

  useEffect(() => {
    fetchRecommendations();
    fetchBadgeSettings();
  }, [activeTab, user]);

  const fetchBadgeSettings = async () => {
    try {
      const res = await axios.get(`${API}/api/settings/product-badges`);
      setBadgeSettings(res.data);
    } catch (err) {
      console.log('Badge settings not available');
    }
  };

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      let endpoint = '/api/recommendations/trending';
      
      if (activeTab === 'for-you' && user) {
        endpoint = '/api/recommendations/for-you';
      } else if (activeTab === 'deals') {
        endpoint = '/api/recommendations/deals';
      }
      
      const res = await axios.get(`${API}${endpoint}?limit=8`);
      setProducts(res.data);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      // Fallback to trending
      try {
        const res = await axios.get(`${API}/api/recommendations/trending?limit=8`);
        setProducts(res.data);
      } catch (e) {
        setProducts([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ar-SY').format(price);
  };

  const tabs = [
    { id: 'for-you', label: 'مقترح لك', icon: Sparkles, requiresAuth: true },
    { id: 'trending', label: 'رائج الآن', icon: TrendingUp, requiresAuth: false },
    { id: 'deals', label: 'عروض', icon: Tag, requiresAuth: false },
  ];

  if (loading && products.length === 0) {
    return (
      <div className="px-3 py-4">
        <div className="flex gap-2 mb-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 w-20 bg-gray-200 rounded-full animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-100 rounded-xl h-48 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="py-4">
      {/* Header */}
      <div className="px-3 flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-purple-500" />
          <h2 className="font-bold text-gray-900">توصيات لك</h2>
        </div>
        <Link 
          to="/products" 
          className="text-sm text-orange-500 flex items-center gap-1"
        >
          عرض الكل
          <ChevronLeft size={16} />
        </Link>
      </div>

      {/* Tabs */}
      <div className="px-3 flex gap-2 mb-4 overflow-x-auto hide-scrollbar">
        {tabs.map((tab) => {
          // إخفاء تبويب "مقترح لك" إذا المستخدم غير مسجل
          if (tab.requiresAuth && !user) return null;
          
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Products Horizontal Scroll */}
      {loading ? (
        <div className="px-3">
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="flex-shrink-0 w-36 bg-gray-100 rounded-xl h-48 animate-pulse" />
            ))}
          </div>
        </div>
      ) : products.length === 0 ? (
        <div className="px-3 text-center py-8 text-gray-500">
          <p className="text-sm">لا توجد منتجات في هذا القسم</p>
        </div>
      ) : (
        <div className="px-3">
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {products.slice(0, 8).map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="flex-shrink-0 w-36"
              >
                <Link
                  to={`/products/${product.id}`}
                  className="block bg-white rounded-xl border-2 border-purple-100 hover:border-purple-300 overflow-hidden hover:shadow-lg transition-all"
                >
                  {/* Image */}
                  <div className="relative aspect-square">
                    <img
                      src={product.images?.[0] || product.image || 'https://via.placeholder.com/200'}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Discount Badge */}
                    {product.discount_percent > 0 && (
                      <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                        -{product.discount_percent}%
                      </span>
                    )}
                    
                    {/* Reason Badge */}
                    {product.recommendation_reason && (
                      <span className="absolute bottom-2 right-2 bg-purple-500/90 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                        {product.recommendation_reason}
                      </span>
                    )}
                    
                    {/* شارة التوصيل */}
                    <SmallBadge product={product} badgeSettings={badgeSettings} />
                    
                    {/* Favorite Button */}
                    <button className="absolute top-2 left-2 w-6 h-6 bg-white/80 rounded-full flex items-center justify-center">
                      <Heart size={12} className="text-gray-400" />
                    </button>
                  </div>
                  
                  {/* Info */}
                  <div className="p-2">
                    <h3 className="font-medium text-sm text-gray-900 truncate">{product.name}</h3>
                    {product.city && (
                      <div className="flex items-center gap-1 text-gray-500 mt-0.5">
                        <MapPin size={10} className="text-purple-500" />
                        <span className="text-[10px]">{product.city}</span>
                      </div>
                    )}
                    <p className="text-purple-600 font-bold text-sm mt-1">
                      {formatPrice(product.price)} ل.س
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
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
      setBadgeText('🔥 الأكثر مبيعاً');
      setColorIndex(3);
    } else if (badge_types.most_viewed?.enabled && (product.views || 0) >= (badge_types.most_viewed.min_views || 100)) {
      setBadgeText('👁️ رائج');
      setColorIndex(2);
    } else if (badge_types.free_shipping?.enabled) {
      const threshold = badge_types.free_shipping.threshold || 30000;
      
      if (price >= threshold) {
        setBadgeText('🚚 شحن مجاني');
        setColorIndex(1);
      } else {
        const unitsNeeded = Math.ceil(threshold / price);
        if (unitsNeeded >= 2 && unitsNeeded <= 3) {
          setBadgeText(`✨ ${unitsNeeded} = شحن مجاني`);
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
    <div className={`absolute bottom-2 left-2 bg-gradient-to-r ${bgColors[colorIndex]} text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md`}>
      {badgeText}
    </div>
  );
};

export default RecommendedProducts;
