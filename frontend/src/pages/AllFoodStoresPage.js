// /app/frontend/src/pages/AllFoodStoresPage.js
// صفحة عرض جميع متاجر الطعام

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  ArrowRight, Store, Star, Clock, MapPin, Search, Filter,
  ChevronDown, X, Truck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import LazyImage from '../components/LazyImage';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AllFoodStoresPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('rating'); // rating, delivery_time, min_order
  const [showFilters, setShowFilters] = useState(false);
  const [userCity, setUserCity] = useState(null);

  useEffect(() => {
    // جلب مدينة المستخدم
    if (user?.addresses?.length > 0) {
      const defaultAddress = user.addresses.find(a => a.is_default) || user.addresses[0];
      setUserCity(defaultAddress.city);
    }
  }, [user]);

  useEffect(() => {
    fetchStores();
  }, [userCity, sortBy]);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const params = {};
      if (userCity) params.city = userCity;
      
      const res = await axios.get(`${API}/food/stores`, { params });
      let storesData = res.data || [];
      
      // الترتيب
      if (sortBy === 'rating') {
        storesData.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      } else if (sortBy === 'delivery_time') {
        storesData.sort((a, b) => (a.delivery_time || 30) - (b.delivery_time || 30));
      } else if (sortBy === 'min_order') {
        storesData.sort((a, b) => (a.min_order || 0) - (b.min_order || 0));
      }
      
      setStores(storesData);
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setLoading(false);
    }
  };

  // تصفية المتاجر حسب البحث
  const filteredStores = stores.filter(store => 
    store.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const StoreCard = ({ store }) => {
    const isOpen = store.is_open !== false && !store.manual_close;
    
    return (
      <Link to={`/food/store/${store.id}`}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all ${
            !isOpen ? 'opacity-75' : ''
          }`}
        >
          {/* صورة الغلاف */}
          <div className="relative h-32">
            <LazyImage
              src={store.cover_image || store.logo || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400'}
              alt={store.name}
              wrapperClassName="w-full h-full"
            />
            
            {/* شارة الحالة */}
            {!isOpen && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                  {store.manual_close ? 'مغلق مؤقتاً' : 'مغلق'}
                </span>
              </div>
            )}
            
            {/* شارة التوصيل المجاني */}
            {store.free_delivery_threshold && (
              <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                <Truck size={10} />
                توصيل مجاني
              </div>
            )}
            
            {/* التقييم */}
            {store.rating > 0 && (
              <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full flex items-center gap-1">
                <Star size={12} className="text-yellow-500 fill-yellow-500" />
                <span className="text-xs font-bold">{store.rating?.toFixed(1)}</span>
              </div>
            )}
          </div>
          
          {/* المعلومات */}
          <div className="p-3">
            <h3 className="font-bold text-gray-900 truncate">{store.name}</h3>
            
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Clock size={12} />
                <span>{store.delivery_time || 30} د</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin size={12} />
                <span>{store.city || 'دمشق'}</span>
              </div>
            </div>
            
            <div className="mt-2 text-xs text-gray-400">
              الحد الأدنى: {(store.min_order || 0).toLocaleString()} ل.س
            </div>
          </div>
        </motion.div>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* الهيدر - مصغر */}
      <div className="bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white sticky top-0 z-40">
        <div className="px-3 py-2">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate(-1)}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <ArrowRight size={18} />
            </button>
            <div className="w-6 h-6 bg-white/20 rounded-md flex items-center justify-center">
              <Store size={14} />
            </div>
            <div className="flex-1">
              <h1 className="text-sm font-bold">جميع المتاجر</h1>
              <p className="text-[10px] text-white/80">{filteredStores.length} متجر</p>
            </div>
            
            {/* البحث مدمج */}
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="ابحث..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white rounded-md pr-7 pl-2 py-1.5 text-gray-900 text-xs placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* خيارات الترتيب - مصغر */}
      <div className="bg-white border-b border-gray-100 px-3 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-[10px] font-medium text-gray-700 bg-gray-100 rounded-md px-2 py-0.5 focus:outline-none"
          >
            <option value="rating">الأعلى تقييماً</option>
            <option value="delivery_time">الأسرع توصيلاً</option>
            <option value="min_order">أقل حد أدنى</option>
          </select>
        </div>
        
        {userCity && (
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <MapPin size={12} />
            <span>{userCity}</span>
          </div>
        )}
      </div>
      
      {/* قائمة المتاجر */}
      <div className="p-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                <div className="h-32 bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredStores.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {filteredStores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Store size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">لا توجد متاجر</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-2 text-[#FF6B00] text-sm font-medium"
              >
                مسح البحث
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AllFoodStoresPage;
