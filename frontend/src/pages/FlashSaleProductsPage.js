import { useState, useEffect } from 'react';
import axios from 'axios';
import { Zap, Loader2, Clock } from 'lucide-react';
import ProductCard from '../components/ProductCard';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FlashSaleProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [flashSale, setFlashSale] = useState(null);
  const [badgeSettings, setBadgeSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, badgeRes] = await Promise.all([
          axios.get(`${API}/products/flash-products`),
          axios.get(`${API}/settings/badge-settings`).catch(() => ({ data: null }))
        ]);
        setProducts(productsRes.data?.products || []);
        setFlashSale(productsRes.data?.flash_sale || null);
        setBadgeSettings(badgeRes.data);
      } catch (error) {
        console.error('Error fetching flash products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
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
      <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white py-1.5 px-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-white/20 rounded-lg">
                <Zap size={16} />
              </div>
              <div>
                <h1 className="text-base font-bold">عروض فلاش</h1>
                <p className="text-white/80 text-xs">{products.length} منتج</p>
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
      <div className="max-w-7xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
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
            <Zap size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">لا توجد عروض فلاش حالياً</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FlashSaleProductsPage;
