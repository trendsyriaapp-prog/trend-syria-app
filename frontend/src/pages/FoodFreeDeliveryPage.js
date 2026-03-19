import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Truck, ChevronRight, Package, Store, Star } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

const FoodFreeDeliveryPage = () => {
  const [freeDeliveryProducts, setFreeDeliveryProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userCity, setUserCity] = useState(null);
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
        const [productsRes, settingsRes] = await Promise.all([
          axios.get(`${API}/food/products`, { params: { city: userCity, limit: 100 } }),
          axios.get(`${API}/settings/public`).catch(() => ({ data: { food_free_delivery_threshold: 75000 } }))
        ]);
        
        const allProductsData = productsRes.data || [];
        const threshold = settingsRes.data?.food_free_delivery_threshold || food_free_delivery_threshold || 75000;
        
        // فلترة منتجات التوصيل المجاني
        const freeDelivery = allProductsData.filter(p => p.price >= threshold);
        const regular = allProductsData.filter(p => p.price < threshold);
        
        setFreeDeliveryProducts(freeDelivery);
        setAllProducts(regular);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, [userCity, food_free_delivery_threshold]);

  // مكون بطاقة المنتج
  const ProductCard = ({ product, isFreeDelivery = false }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all"
    >
      <Link to={`/food/product/${product.id}`}>
        <div className="relative aspect-square bg-gray-100">
          {product.images?.[0] || product.image ? (
            <img 
              src={product.images?.[0] || product.image} 
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package size={40} className="text-gray-300" />
            </div>
          )}
          {isFreeDelivery && (
            <div className="absolute top-2 right-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
              <Truck size={10} />
              توصيل مجاني
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-bold text-sm text-gray-900 truncate">{product.name}</h3>
          {product.store_name && (
            <div className="flex items-center gap-1 text-gray-500 mt-1">
              <Store size={12} className="text-green-500" />
              <span className="text-xs truncate">{product.store_name}</span>
            </div>
          )}
          <div className="flex items-center justify-between mt-2">
            <span className={`font-bold text-sm ${isFreeDelivery ? 'text-green-600' : 'text-gray-900'}`}>
              {product.price?.toLocaleString()} ل.س
            </span>
            {product.rating && (
              <div className="flex items-center gap-1">
                <Star size={12} className="text-yellow-500 fill-yellow-500" />
                <span className="text-xs text-gray-500">{product.rating}</span>
              </div>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );

  if (!userCity) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Truck size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">يرجى اختيار مدينتك أولاً</p>
          <Link to="/food" className="text-green-600 font-medium">
            العودة لقسم الطعام
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <Link to="/food" className="p-1 hover:bg-white/20 rounded-full">
              <ChevronRight size={24} />
            </Link>
            <h1 className="text-xl font-bold">توصيل مجاني</h1>
          </div>
          <p className="text-sm text-green-100">
            منتجات تحصل على توصيل مجاني عند الطلب
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : (
          <>
            {/* قسم منتجات التوصيل المجاني */}
            <section className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                  <Truck size={20} className="text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">منتجات التوصيل المجاني</h2>
                  <p className="text-xs text-gray-500">{freeDeliveryProducts.length} منتج</p>
                </div>
              </div>
              
              {freeDeliveryProducts.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {freeDeliveryProducts.map((product) => (
                    <ProductCard key={product.id} product={product} isFreeDelivery={true} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-white rounded-xl">
                  <Truck size={40} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-gray-500">لا توجد منتجات بتوصيل مجاني حالياً</p>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default FoodFreeDeliveryPage;
