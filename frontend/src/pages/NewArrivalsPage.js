import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Sparkles, Package, MapPin, Loader2 } from 'lucide-react';
import LazyImage from '../components/LazyImage';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const NewArrivalsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchProducts = async () => {
      try {
        const res = await axios.get(`${API}/products/newly-added`);
        setProducts(res.data || []);
      } catch (error) {
        console.error('Error fetching new arrivals:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white py-1.5 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-white/20 rounded-lg">
              <Sparkles size={16} />
            </div>
            <div>
              <h1 className="text-base font-bold">منتجات جديدة</h1>
              <p className="text-white/80 text-xs">أحدث المنتجات المضافة</p>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : products.length > 0 ? (
          <>
            <p className="text-gray-600 mb-4">{products.length} منتج</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {products.map((product) => (
                <Link key={product.id} to={`/products/${product.id}`}>
                  <div className="bg-white rounded-xl overflow-hidden border-2 border-blue-100 hover:border-blue-300 transition-all shadow-sm hover:shadow-md">
                    <div className="relative aspect-square bg-gray-100">
                      <LazyImage 
                        src={product.images?.[0]} 
                        alt={product.name}
                        className="w-full h-full"
                        aspectRatio="1/1"
                      />
                      <div className="absolute top-2 right-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                        <Sparkles size={10} />
                        جديد
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-sm text-gray-900 truncate">{product.name}</h3>
                      {product.city && (
                        <div className="flex items-center gap-1 text-gray-500 mt-1">
                          <MapPin size={12} className="text-blue-500" />
                          <span className="text-xs">{product.city}</span>
                        </div>
                      )}
                      <div className="mt-2">
                        <span className="text-blue-600 font-bold">
                          {product.price?.toLocaleString()} ل.س
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <Sparkles size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">لا توجد منتجات جديدة حالياً</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewArrivalsPage;
