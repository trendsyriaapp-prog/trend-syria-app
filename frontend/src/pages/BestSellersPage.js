import { useState, useEffect } from 'react';
import axios from 'axios';
import { TrendingUp, Loader2 } from 'lucide-react';
import ProductCard from '../components/ProductCard';

const API = process.env.REACT_APP_BACKEND_URL;

const BestSellersPage = () => {
  const [products, setProducts] = useState([]);
  const [badgeSettings, setBadgeSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, badgeRes] = await Promise.all([
          axios.get(`${API}/api/products/best-sellers`),
          axios.get(`${API}/api/settings/product-badges`).catch(() => ({ data: null }))
        ]);
        setProducts(productsRes.data || []);
        setBadgeSettings(badgeRes.data);
      } catch (error) {
        console.error('Error fetching best sellers:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white py-1.5 px-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-white/20 rounded-lg">
              <TrendingUp size={16} />
            </div>
            <div>
              <h1 className="text-base font-bold">الأكثر مبيعاً</h1>
              <p className="text-white/80 text-xs">{products.length} منتج</p>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {products.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                badgeSettings={badgeSettings}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <TrendingUp size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">لا توجد منتجات حالياً</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BestSellersPage;
