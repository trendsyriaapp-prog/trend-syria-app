// /app/frontend/src/pages/FoodPage.js
// صفحة توصيل الطعام - مطاعم ومواد غذائية وخضروات

import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  UtensilsCrossed, ShoppingBasket, Apple, Search, MapPin, 
  Star, Clock, ChevronLeft, Filter, Truck, Store
} from 'lucide-react';
import ProductCard from '../components/ProductCard';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const foodCategories = [
  { id: 'restaurants', name: 'مطاعم', icon: UtensilsCrossed, color: 'bg-red-500' },
  { id: 'groceries', name: 'مواد غذائية', icon: ShoppingBasket, color: 'bg-blue-500' },
  { id: 'vegetables', name: 'خضروات وفواكه', icon: Apple, color: 'bg-green-500' },
];

const FoodPage = () => {
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  
  const [activeCategory, setActiveCategory] = useState(categoryParam || 'all');
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [flashSales, setFlashSales] = useState([]);
  const [foodBanners, setFoodBanners] = useState([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeCategory]);

  // Auto-rotate banners
  useEffect(() => {
    if (foodBanners.length > 1) {
      const timer = setInterval(() => {
        setCurrentBannerIndex((prev) => (prev + 1) % foodBanners.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [foodBanners.length]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // جلب المتاجر والمنتجات الغذائية وعروض الفلاش والبانرات
      const [storesRes, productsRes, flashRes, bannersRes] = await Promise.all([
        axios.get(`${API}/food/stores`, { params: { category: activeCategory !== 'all' ? activeCategory : undefined } }),
        axios.get(`${API}/food/products`, { params: { category: activeCategory !== 'all' ? activeCategory : undefined } }),
        axios.get(`${API}/food/flash-sales/active`),
        axios.get(`${API}/food/banners`).catch(() => ({ data: [] }))
      ]);
      setStores(storesRes.data || []);
      setProducts(productsRes.data || []);
      setFlashSales(flashRes.data || []);
      setFoodBanners(bannersRes.data || []);
    } catch (error) {
      console.error('Error fetching food data:', error);
      setStores([]);
      setProducts([]);
      setFlashSales([]);
      setFoodBanners([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-b from-green-600 to-green-500 text-white px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">توصيل الطعام</h1>
          <p className="text-green-100 text-sm">مطاعم • مواد غذائية • خضروات طازجة</p>
          
          {/* Search */}
          <div className="mt-4 relative">
            <input
              type="text"
              placeholder="ابحث عن مطعم أو منتج..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl py-3 px-4 pr-10 text-white placeholder:text-white/70 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            <Search size={20} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70" />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setActiveCategory('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                activeCategory === 'all'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Store size={16} />
              <span className="text-sm font-medium">الكل</span>
            </button>
            {foodCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? `${cat.color} text-white`
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <cat.icon size={16} />
                <span className="text-sm font-medium">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Flash Sales Banner */}
            {flashSales.length > 0 && (
              <section className="mb-4">
                {flashSales.slice(0, 1).map((flash) => (
                  <FlashSaleBanner key={flash.id} flash={flash} />
                ))}
              </section>
            )}

            {/* Stores Section */}
            {stores.length > 0 && (
              <section className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-gray-900">المتاجر</h2>
                  <Link to="/food/stores" className="text-green-600 text-sm flex items-center gap-1">
                    عرض الكل <ChevronLeft size={14} />
                  </Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {stores.slice(0, 4).map((store) => (
                    <StoreCard key={store.id} store={store} />
                  ))}
                </div>
              </section>
            )}

            {/* Products Section */}
            {products.length > 0 ? (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-gray-900">المنتجات</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </section>
            ) : (
              <EmptyState category={activeCategory} />
            )}
          </>
        )}
      </div>
    </div>
  );
};

const StoreCard = ({ store }) => (
  <Link to={`/food/store/${store.id}`}>
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="h-24 bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center">
        {store.logo ? (
          <img src={store.logo} alt={store.name} className="w-16 h-16 rounded-full object-cover" />
        ) : (
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
            <Store size={24} className="text-white" />
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-bold text-gray-900 text-sm truncate">{store.name}</h3>
        <p className="text-xs text-gray-500 truncate">{store.category_name}</p>
        <div className="flex items-center gap-2 mt-2">
          {store.rating > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <Star size={12} className="text-yellow-500 fill-yellow-500" />
              <span>{store.rating.toFixed(1)}</span>
            </div>
          )}
          {store.delivery_time && (
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock size={12} />
              <span>{store.delivery_time} د</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  </Link>
);

const EmptyState = ({ category }) => {
  const messages = {
    restaurants: 'لا توجد مطاعم متاحة حالياً',
    groceries: 'لا توجد متاجر مواد غذائية حالياً',
    vegetables: 'لا توجد متاجر خضروات حالياً',
    all: 'لا توجد متاجر أو منتجات متاحة حالياً'
  };

  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <UtensilsCrossed size={32} className="text-green-500" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{messages[category] || messages.all}</h3>
      <p className="text-gray-500 text-sm mb-4">
        كن أول من ينضم كمتجر طعام في تريند سورية!
      </p>
      <Link
        to="/join/food-seller"
        className="inline-flex items-center gap-2 bg-green-500 text-white px-6 py-2 rounded-full font-medium hover:bg-green-600 transition-colors"
      >
        <Store size={18} />
        انضم كمتجر طعام
      </Link>
    </div>
  );
};

// Flash Sale Banner with Countdown
const FlashSaleBanner = ({ flash }) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const endTime = new Date(flash.end_time).getTime();
      const now = new Date().getTime();
      const difference = endTime - now;

      if (difference <= 0) {
        setIsExpired(true);
        return;
      }

      setTimeLeft({
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [flash.end_time]);

  if (isExpired) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl overflow-hidden shadow-md"
      style={{ backgroundColor: flash.banner_color || '#FF4500' }}
    >
      <div className="px-3 py-2 text-white">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-lg animate-pulse">⚡</span>
            <div className="min-w-0">
              <h3 className="text-sm font-bold truncate">{flash.name}</h3>
              <div className="flex items-center gap-1.5">
                <span className="bg-white text-orange-600 px-2 py-0.5 rounded-full font-bold text-xs">
                  {flash.discount_percentage}%
                </span>
                <span className="text-white/80 text-xs truncate">
                  {!flash.applicable_categories?.length ? 'جميع الأصناف' : 
                    flash.applicable_categories.map(c => 
                      c === 'restaurants' ? 'مطاعم' : 
                      c === 'groceries' ? 'غذائية' : 'خضروات'
                    ).join(' • ')}
                </span>
              </div>
            </div>
          </div>

          {/* Countdown Timer */}
          <div className="flex items-center gap-1 text-xs">
            <div className="bg-white/20 rounded px-1.5 py-1 text-center min-w-[28px]">
              <span className="font-bold block">{String(timeLeft.hours).padStart(2, '0')}</span>
            </div>
            <span className="font-bold">:</span>
            <div className="bg-white/20 rounded px-1.5 py-1 text-center min-w-[28px]">
              <span className="font-bold block">{String(timeLeft.minutes).padStart(2, '0')}</span>
            </div>
            <span className="font-bold">:</span>
            <div className="bg-white/20 rounded px-1.5 py-1 text-center min-w-[28px]">
              <span className="font-bold block">{String(timeLeft.seconds).padStart(2, '0')}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default FoodPage;
