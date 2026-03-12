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

  useEffect(() => {
    fetchRecommendations();
  }, [activeTab, user]);

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

      {/* Products Grid */}
      {loading ? (
        <div className="px-3 grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-gray-100 rounded-xl h-48 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="px-3 text-center py-8 text-gray-500">
          <p className="text-sm">لا توجد منتجات في هذا القسم</p>
        </div>
      ) : (
        <div className="px-3 grid grid-cols-2 gap-3">
          {products.slice(0, 4).map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Link
                to={`/products/${product.id}`}
                className="block bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow"
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
                    <span className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      -{product.discount_percent}%
                    </span>
                  )}
                  
                  {/* Reason Badge */}
                  {product.recommendation_reason && (
                    <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded-full">
                      {product.recommendation_reason}
                    </span>
                  )}
                  
                  {/* Favorite Button */}
                  <button className="absolute top-2 left-2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center">
                    <Heart size={16} className="text-gray-400" />
                  </button>
                </div>
                
                {/* Info */}
                <div className="p-3">
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mb-0.5">
                    {product.name}
                  </h3>
                  {product.city && (
                    <div className="flex items-center gap-1 text-gray-500 mb-1">
                      <MapPin size={10} className="text-[#FF6B00]" />
                      <span className="text-[10px]">{product.city}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <p className="text-orange-500 font-bold text-sm">
                      {formatPrice(product.price)} ل.س
                    </p>
                    {product.original_price && product.original_price > product.price && (
                      <p className="text-gray-400 text-xs line-through">
                        {formatPrice(product.original_price)}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecommendedProducts;
