import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Zap, Package, MapPin, ChevronRight, Loader2, Clock } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FlashSaleProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [flashSale, setFlashSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    window.scrollTo(0, 0);
    const fetchProducts = async () => {
      try {
        const res = await axios.get(`${API}/products/flash-products`);
        setProducts(res.data?.products || []);
        setFlashSale(res.data?.flash_sale || null);
      } catch (error) {
        console.error('Error fetching flash products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!flashSale?.end_time) return;
    
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(flashSale.end_time).getTime();
      const diff = end - now;
      
      if (diff > 0) {
        setTimeLeft({
          hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((diff % (1000 * 60)) / 1000)
        });
      }
    }, 1000);
    
    return () => clearInterval(timer);
  }, [flashSale]);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-1.5 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-white/20 rounded-lg">
                <Zap size={16} />
              </div>
              <div>
                <h1 className="text-base font-bold">عروض فلاش</h1>
                <p className="text-white/80 text-xs">خصومات لفترة محدودة</p>
              </div>
            </div>
            {flashSale && (
              <div className="flex items-center gap-1.5 bg-white/20 px-2 py-1 rounded-lg">
                <Clock size={14} />
                <span className="font-mono font-bold text-sm">
                  {String(timeLeft.hours).padStart(2, '0')}:
                  {String(timeLeft.minutes).padStart(2, '0')}:
                  {String(timeLeft.seconds).padStart(2, '0')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
          </div>
        ) : products.length > 0 ? (
          <>
            <p className="text-gray-600 mb-4">{products.length} منتج</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {products.map((product) => (
                <Link key={product.id} to={`/products/${product.id}`}>
                  <div className="bg-white rounded-xl overflow-hidden border-2 border-orange-100 hover:border-orange-300 transition-all shadow-sm hover:shadow-md">
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
                      {product.discount_percentage && (
                        <div className="absolute top-2 right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                          {product.discount_percentage}%-
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="font-medium text-sm text-gray-900 truncate">{product.name}</h3>
                      {product.city && (
                        <div className="flex items-center gap-1 text-gray-500 mt-1">
                          <MapPin size={12} className="text-orange-500" />
                          <span className="text-xs">{product.city}</span>
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-orange-600 font-bold">
                          {product.flash_price?.toLocaleString() || product.price?.toLocaleString()} ل.س
                        </span>
                        {product.original_price && (
                          <span className="text-gray-400 text-xs line-through">
                            {product.original_price?.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <Zap size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">لا توجد عروض فلاش حالياً</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlashSaleProductsPage;
