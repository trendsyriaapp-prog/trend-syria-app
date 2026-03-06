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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, [activeCategory]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // جلب المتاجر والمنتجات الغذائية
      const [storesRes, productsRes] = await Promise.all([
        axios.get(`${API}/food/stores`, { params: { category: activeCategory !== 'all' ? activeCategory : undefined } }),
        axios.get(`${API}/food/products`, { params: { category: activeCategory !== 'all' ? activeCategory : undefined } })
      ]);
      setStores(storesRes.data || []);
      setProducts(productsRes.data || []);
    } catch (error) {
      console.error('Error fetching food data:', error);
      setStores([]);
      setProducts([]);
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
  <Link to={`/store/${store.id}`}>
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

export default FoodPage;
