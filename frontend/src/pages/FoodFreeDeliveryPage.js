import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Truck, Package, Store, Star } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import ProductCard from '../components/ProductCard';

const API = process.env.REACT_APP_BACKEND_URL + '/api';

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
          axios.get(`${API}/food/products`, { params: { city: userCity, limit: 100 } }),
          axios.get(`${API}/settings/public`).catch(() => ({ data: { food_free_delivery_threshold: 75000 } })),
          axios.get(`${API}/settings/product-badges`).catch(() => ({ data: null }))
        ]);
        
        const allProductsData = productsRes.data || [];
        const threshold = settingsRes.data?.food_free_delivery_threshold || food_free_delivery_threshold || 75000;
        
        // فلترة منتجات التوصيل المجاني
        const freeDelivery = allProductsData.filter(p => p.price >= threshold);
        
        setFreeDeliveryProducts(freeDelivery);
        setBadgeSettings(badgeRes.data);
      } catch (error) {
        console.error('Error fetching products:', error);
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
          <Link to="/food" className="text-green-600 font-medium">
            العودة لقسم الطعام
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header مصغّر بدون سهم رجوع */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center gap-2">
          <Truck size={20} />
          <h1 className="text-base font-bold">توصيل مجاني</h1>
          <span className="text-xs text-green-100">({freeDeliveryProducts.length} منتج)</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : freeDeliveryProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {freeDeliveryProducts.map((product) => (
              <ProductCard 
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
