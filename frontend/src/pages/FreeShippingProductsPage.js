import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Truck, Package, MapPin, ChevronRight, Loader2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FreeShippingProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(150000);

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchProducts = async () => {
      try {
        // Get threshold first
        const settingsRes = await axios.get(`${API}/settings/public`).catch(() => ({ data: { free_shipping_threshold: 150000 } }));
        const thresh = settingsRes.data?.free_shipping_threshold || 150000;
        setThreshold(thresh);
        
        // Get products
        const res = await axios.get(`${API}/products?price_min=${thresh}&limit=50`);
        const prods = res.data?.products || res.data || [];
        setProducts(prods);
      } catch (error) {
        console.error('Error fetching free shipping products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white py-2 px-4">
        <div className="max-w-7xl mx-auto">
          <Link to="/" className="flex items-center gap-2 text-white/80 hover:text-white mb-1 text-xs">
            <ChevronRight size={14} />
            <span>العودة للرئيسية</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="p-1 bg-white/20 rounded-lg">
              <Truck size={16} />
            </div>
            <div>
              <h1 className="text-base font-bold">شحن مجاني</h1>
              <p className="text-white/80 text-xs">منتجات بسعر {threshold.toLocaleString()} ل.س وأكثر</p>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          </div>
        ) : products.length > 0 ? (
          <>
            <p className="text-gray-600 mb-4">{products.length} منتج</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {products.map((product) => (
                <Link key={product.id} to={`/products/${product.id}`}>
                  <div className="bg-white rounded-xl overflow-hidden border-2 border-green-100 hover:border-green-300 transition-all shadow-sm hover:shadow-md">
                    <div className="relative aspect-square bg-gray-100">
                      {product.images?.[0] ? (
                        <img 
                          src={product.images[0]} 
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={32} className="text-gray-300" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                        <Truck size={10} />
                        شحن مجاني
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-sm text-gray-900 truncate">{product.name}</h3>
                      {product.city && (
                        <div className="flex items-center gap-1 text-gray-500 mt-1">
                          <MapPin size={12} className="text-green-500" />
                          <span className="text-xs">{product.city}</span>
                        </div>
                      )}
                      <div className="mt-2">
                        <span className="text-green-600 font-bold">
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
            <Truck size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">لا توجد منتجات بشحن مجاني حالياً</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FreeShippingProductsPage;
