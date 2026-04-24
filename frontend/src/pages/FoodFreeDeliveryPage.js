import React, { useState, useEffect } from 'react';
import logger from '../lib/logger';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Truck, Package, Store, Star } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

// بطاقة منتج طعام - توجه لصفحة المتجر
const FoodProductCard = ({ product, badgeSettings }) => {
  // حساب الشارات
  const getBadges = () => {
    if (!badgeSettings?.enabled || !badgeSettings?.badge_types) return [];
    const badges = [];
    const { badge_types } = badgeSettings;
    
    // شارة التوصيل المجاني
    if (badge_types.free_shipping?.enabled) {
      const threshold = badge_types.free_shipping.threshold || 75000;
      if (product.price >= threshold) {
        badges.push({
          text: '🚚 توصيل مجاني',
          color: 'bg-[#FF6B00]'
        });
      }
    }
    
    // شارة جديد
    if (badge_types.new?.enabled && product.created_at) {
      const daysOld = Math.floor((Date.now() - new Date(product.created_at).getTime()) / (1000 * 60 * 60 * 24));
      if (daysOld <= (badge_types.new.days || 7)) {
        badges.push({
          text: '✨ جديد',
          color: 'bg-blue-500'
        });
      }
    }
    
    return badges.slice(0, 2);
  };

  const badges = getBadges();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all"
    >
      <Link to={`/food/store/${product.store_id}?highlight=${product.id}`}>
        <div className="relative aspect-square bg-gray-100">
          {product.images?.[0] || product.image ? (
            <img 
              src={product.images?.[0] || product.image} 
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package size={32} className="text-gray-300" />
            </div>
          )}
          {/* الشارات */}
          {badges.length > 0 && (
            <div className="absolute top-2 right-2 flex flex-col gap-1">
              {badges.map((badge, i) => (
                <span key={i} className={`${badge.color} text-white px-2 py-0.5 rounded-full text-[10px] font-bold`}>
                  {badge.text}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="p-2">
          <h3 className="font-medium text-sm text-gray-900 truncate">{product.name}</h3>
          {product.store_name && (
            <div className="flex items-center gap-1 text-gray-500 mt-0.5">
              <Store size={10} className="text-[#FF6B00]" />
              <span className="text-[10px] truncate">{product.store_name}</span>
            </div>
          )}
          <div className="flex items-center justify-between mt-1">
            <span className="text-[#FF6B00] font-bold text-sm">
              {product.price?.toLocaleString()} ل.س
            </span>
            {product.rating && (
              <div className="flex items-center gap-0.5">
                <Star size={10} className="text-yellow-500 fill-yellow-500" />
                <span className="text-[10px] text-gray-500">{product.rating}</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

const FoodFreeDeliveryPage = () => {
  const [freeDeliveryProducts, setFreeDeliveryProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userCity, setUserCity] = useState(null);
  const [badgeSettings, setBadgeSettings] = useState(null);
  const { food_free_delivery_threshold } = useSettings();

  useEffect(() => {
    const savedCity = localStorage.getItem('food_delivery_city');
    if (savedCity) {
      setUserCity(savedCity);
    }
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!userCity) return;
      
      setLoading(true);
      try {
        const [productsRes, settingsRes, badgeRes] = await Promise.all([
          axios.get(`${API}/api/food/products`, { params: { city: userCity, limit: 100 } }),
          axios.get(`${API}/api/settings/public`).catch(() => ({ data: { food_free_delivery_threshold: 75000 } })),
          axios.get(`${API}/api/settings/product-badges`).catch(() => ({ data: null }))
        ]);
        
        const allProductsData = productsRes.data?.products || productsRes.data || [];
        const threshold = settingsRes.data?.food_free_delivery_threshold || food_free_delivery_threshold || 75000;
        
        // فلترة منتجات التوصيل المجاني
        const freeDelivery = allProductsData.filter(p => p.price >= threshold);
        
        setFreeDeliveryProducts(freeDelivery);
        setBadgeSettings(badgeRes.data);
      } catch (error) {
        logger.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, [userCity, food_free_delivery_threshold]);

  if (!userCity) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Truck size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">يرجى اختيار مدينتك أولاً</p>
          <Link to="/food" className="text-[#FF6B00] font-medium">
            العودة لقسم الطعام
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header مصغّر بدون سهم رجوع */}
      <div className="bg-gradient-to-r from-[#FF6B00] to-[#FF8533] text-white px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          <Truck size={20} />
          <h1 className="text-base font-bold">توصيل مجاني</h1>
          <span className="text-xs text-green-100">({freeDeliveryProducts.length} منتج)</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF6B00]"></div>
          </div>
        ) : freeDeliveryProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {freeDeliveryProducts.map((product) => (
              <FoodProductCard 
                key={product.id} 
                product={product} 
                badgeSettings={badgeSettings}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl">
            <Truck size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">لا توجد منتجات بتوصيل مجاني حالياً</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FoodFreeDeliveryPage;
