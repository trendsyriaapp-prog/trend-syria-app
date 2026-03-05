// /app/frontend/src/components/FeaturedProducts.js
// مكون عرض المنتجات المميزة (المعلن عنها)

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Star, ChevronLeft, Sparkles, ShoppingCart, Truck, Loader2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const FeaturedProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingToCart, setAddingToCart] = useState({});
  const { addToCart } = useCart();
  const { settings } = useSettings();
  const { toast } = useToast();

  const freeShippingThreshold = settings?.free_shipping_threshold || 150000;
  
  useEffect(() => {
    fetchFeaturedProducts();
  }, []);
  
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
      toast({
        title: "تمت الإضافة",
        description: `تم إضافة ${product.name} للسلة`
      });
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
                to={`/product/${item.product.id}`}
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
                    src={item.product.images?.[0] || 'https://via.placeholder.com/150'}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
                
                {/* Info */}
                <div className="p-2">
                  <h3 className="text-[11px] font-medium text-gray-900 truncate mb-1">
                    {item.product.name}
                  </h3>
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
};

export default FeaturedProducts;
