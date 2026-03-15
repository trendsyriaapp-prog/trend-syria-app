// /app/frontend/src/pages/FoodPage.js
// صفحة توصيل الطعام - وجبات سريعة، ماركت، خضار، حلويات

import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  UtensilsCrossed, ShoppingCart, Apple, Search, MapPin, 
  Star, Clock, ChevronLeft, Filter, Truck, Store, Heart, Sparkles, Cake,
  Scale, Package, Utensils, IceCream
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// إعدادات كل قسم - ألوان وأيقونات ووحدات القياس
const CATEGORY_CONFIG = {
  restaurants: {
    name: 'وجبات سريعة',
    icon: UtensilsCrossed,
    color: 'bg-red-500',
    textColor: 'text-red-500',
    bgLight: 'bg-red-50',
    borderColor: 'border-red-500',
    gradient: 'from-red-500 to-red-600',
    unit: 'وجبة',
    unitIcon: Utensils,
    emoji: '🍔'
  },
  market: {
    name: 'ماركت',
    icon: ShoppingCart,
    color: 'bg-blue-500',
    textColor: 'text-blue-500',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-500',
    gradient: 'from-blue-500 to-blue-600',
    unit: 'قطعة',
    unitIcon: Package,
    emoji: '🛒'
  },
  vegetables: {
    name: 'خضار وفواكه',
    icon: Apple,
    color: 'bg-emerald-500',
    textColor: 'text-emerald-500',
    bgLight: 'bg-emerald-50',
    borderColor: 'border-emerald-500',
    gradient: 'from-emerald-500 to-emerald-600',
    unit: 'كيلو',
    unitIcon: Scale,
    emoji: '🥬'
  },
  sweets: {
    name: 'حلويات',
    icon: Cake,
    color: 'bg-pink-500',
    textColor: 'text-pink-500',
    bgLight: 'bg-pink-50',
    borderColor: 'border-pink-500',
    gradient: 'from-pink-500 to-pink-600',
    unit: 'قطعة',
    unitIcon: IceCream,
    emoji: '🍰'
  }
};

// للتوافق مع الكود القديم
const foodCategories = Object.entries(CATEGORY_CONFIG).map(([id, config]) => ({
  id,
  name: config.name,
  icon: config.icon,
  color: config.color
}));

// قائمة المدن السورية
const SYRIAN_CITIES = ['دمشق', 'حلب', 'حمص', 'حماة', 'اللاذقية', 'طرطوس', 'دير الزور', 'الرقة', 'الحسكة', 'درعا', 'السويداء', 'القنيطرة', 'إدلب'];

const FoodPage = () => {
  const [searchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const { user } = useAuth();
  
  const [activeCategory, setActiveCategory] = useState(categoryParam || 'all');
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [flashSales, setFlashSales] = useState([]);
  const [foodBanners, setFoodBanners] = useState([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userCity, setUserCity] = useState(null);
  const [showCitySelector, setShowCitySelector] = useState(false);

  // جلب مدينة المستخدم من العنوان الافتراضي
  useEffect(() => {
    const fetchUserCity = async () => {
      const savedCity = localStorage.getItem('food_delivery_city');
      
      if (savedCity) {
        setUserCity(savedCity);
        setShowCitySelector(false);
        return;
      }
      
      // محاولة جلب العنوان الافتراضي للمستخدم
      if (user) {
        try {
          const res = await axios.get(`${API}/user/addresses`);
          const addresses = res.data || [];
          const defaultAddr = addresses.find(a => a.is_default) || addresses[0];
          
          if (defaultAddr?.city) {
            setUserCity(defaultAddr.city);
            localStorage.setItem('food_delivery_city', defaultAddr.city);
            setShowCitySelector(false);
            return;
          }
        } catch (error) {
          console.error('Error fetching user addresses:', error);
        }
        
        // إذا لم يوجد عنوان، استخدم مدينة المستخدم
        if (user.city) {
          setUserCity(user.city);
          localStorage.setItem('food_delivery_city', user.city);
          setShowCitySelector(false);
          return;
        }
      }
      
      // إظهار نافذة اختيار المدينة
      setShowCitySelector(true);
    };
    
    fetchUserCity();
  }, [user]);

  useEffect(() => {
    if (userCity) {
      fetchData();
    }
  }, [activeCategory, userCity]);

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
    if (!userCity) return;
    
    setLoading(true);
    try {
      // جلب المتاجر والمنتجات الغذائية في نفس مدينة العميل فقط
      const [storesRes, productsRes, flashRes, bannersRes] = await Promise.all([
        axios.get(`${API}/food/stores`, { params: { 
          category: activeCategory !== 'all' ? activeCategory : undefined,
          city: userCity
        }}),
        axios.get(`${API}/food/products`, { params: { 
          category: activeCategory !== 'all' ? activeCategory : undefined,
          city: userCity
        }}),
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

  const handleCitySelect = (city) => {
    setUserCity(city);
    localStorage.setItem('food_delivery_city', city);
    setShowCitySelector(false);
  };

  // نافذة اختيار المدينة
  if (showCitySelector) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-[#FF6B00]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin size={32} className="text-[#FF6B00]" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">اختر مدينتك</h2>
            <p className="text-sm text-gray-500 mt-2">سنعرض لك المتاجر والمطاعم في مدينتك فقط</p>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {SYRIAN_CITIES.map((city) => (
              <button
                key={city}
                onClick={() => handleCitySelect(city)}
                className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-[#FF6B00] hover:text-white transition-colors"
              >
                {city}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-gray-50 pt-10">
      {/* شريط قسم الطعام مع المدينة */}
      <div className="bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white px-4 py-2">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="text-xl">🍕</span>
            <h1 className="text-base font-bold">قسم الطعام</h1>
            {/* زر تغيير المدينة */}
            <button 
              onClick={() => setShowCitySelector(true)}
              className="mr-auto flex items-center gap-1 bg-white/20 rounded-full px-3 py-1 text-xs hover:bg-white/30 transition-colors"
            >
              <MapPin size={12} />
              <span>{userCity || 'اختر مدينة'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Categories with Food Images */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex gap-2 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => setActiveCategory('all')}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                activeCategory === 'all'
                  ? 'bg-[#FF6B00] text-white'
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
                    ? 'bg-[#FF6B00] text-white'
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
            <div className="w-8 h-8 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin"></div>
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
                  <Link to="/food/stores" className="text-[#FF6B00] text-sm flex items-center gap-1">
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
                    <FoodProductCard key={product.id} product={product} />
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

const StoreCard = ({ store }) => {
  // جلب إعدادات القسم حسب نوع المتجر
  const categoryConfig = CATEGORY_CONFIG[store.store_type] || CATEGORY_CONFIG.restaurants;
  const CategoryIcon = categoryConfig.icon;
  
  return (
    <Link to={`/food/store/${store.id}`}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={`bg-white rounded-xl border-2 ${store.store_type ? categoryConfig.borderColor : 'border-gray-200'} overflow-hidden hover:shadow-md transition-shadow`}
      >
        <div className={`h-24 bg-gradient-to-br ${categoryConfig.bgLight} relative overflow-hidden`}>
          {store.cover_image ? (
            <img src={store.cover_image} alt={store.name} className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full bg-gradient-to-br ${categoryConfig.gradient} opacity-20`} />
          )}
          {/* شارة نوع المتجر */}
          <div className={`absolute top-2 left-2 ${categoryConfig.color} text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1`}>
            <CategoryIcon size={10} />
            <span>{categoryConfig.name}</span>
          </div>
          <div className="absolute bottom-2 right-2">
            {store.logo ? (
              <img src={store.logo} alt={store.name} className={`w-12 h-12 rounded-full object-cover border-2 ${categoryConfig.borderColor} shadow-lg`} />
            ) : (
              <div className={`w-12 h-12 ${categoryConfig.color} rounded-full flex items-center justify-center border-2 border-white shadow-lg`}>
                <CategoryIcon size={20} className="text-white" />
              </div>
            )}
          </div>
        </div>
        <div className="p-3">
          <h3 className="font-bold text-gray-900 text-sm truncate">{store.name}</h3>
          <p className={`text-xs ${categoryConfig.textColor} truncate font-medium`}>{categoryConfig.emoji} {categoryConfig.name}</p>
          {/* العنوان الكامل */}
          {store.address && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin size={10} className="text-gray-400 flex-shrink-0" />
              <p className="text-[10px] text-gray-500 truncate">{store.address}</p>
            </div>
          )}
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
};

// بطاقة منتج الطعام - توجه للمتجر وليس لصفحة المنتج
const FoodProductCard = ({ product }) => {
  // جلب إعدادات القسم حسب نوع المتجر
  const categoryConfig = CATEGORY_CONFIG[product.store_type] || CATEGORY_CONFIG.restaurants;
  const UnitIcon = categoryConfig.unitIcon;
  
  const isNew = product.created_at && 
    (new Date() - new Date(product.created_at)) < 7 * 24 * 60 * 60 * 1000;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
  };

  return (
    <Link to={`/food/store/${product.store_id}`}>
      <motion.div
        whileHover={{ y: -4 }}
        className={`bg-white rounded-xl border-2 ${categoryConfig.borderColor} overflow-hidden hover:shadow-md transition-all`}
      >
        <div className="aspect-[4/3] relative overflow-hidden bg-gray-100">
          {(product.image || product.images?.[0]) ? (
            <img 
              src={product.image || product.images?.[0]} 
              alt={product.name} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${categoryConfig.bgLight}`}>
              <categoryConfig.icon size={32} className={categoryConfig.textColor} />
            </div>
          )}
          
          {/* Badges */}
          <div className="absolute top-2 right-2 flex flex-col gap-1">
            {isNew && (
              <span className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles size={10} />
                جديد
              </span>
            )}
            {product.original_price && product.original_price > product.price && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                خصم {Math.round((1 - product.price / product.original_price) * 100)}%
              </span>
            )}
          </div>

          {/* شارة نوع القسم */}
          <div className={`absolute bottom-2 right-2 ${categoryConfig.color} text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1`}>
            <UnitIcon size={10} />
            <span>/{categoryConfig.unit}</span>
          </div>
          
          {/* Favorite */}
          <button 
            className="absolute top-2 left-2 p-1.5 bg-white/80 rounded-full hover:bg-white transition-colors"
            onClick={(e) => e.preventDefault()}
          >
            <Heart size={14} className="text-gray-500" />
          </button>
        </div>
        
        <div className="p-3">
          <h3 className="font-bold text-gray-900 text-sm truncate mb-1">{product.name}</h3>
          {product.store_name && (
            <p className={`text-xs ${categoryConfig.textColor} mb-2 truncate flex items-center gap-1 font-medium`}>
              <categoryConfig.icon size={10} />
              {product.store_name}
            </p>
          )}
          <div className="flex items-center justify-between">
            <div>
              <span className={`${categoryConfig.textColor} font-bold text-sm`}>{formatPrice(product.price)}</span>
              <span className="text-gray-400 text-[10px] mr-1">/{categoryConfig.unit}</span>
              {product.original_price && product.original_price > product.price && (
                <span className="text-gray-400 text-xs line-through mr-1">
                  {formatPrice(product.original_price)}
                </span>
              )}
            </div>
            {product.rating > 0 && (
              <div className="flex items-center gap-0.5 text-xs text-gray-600">
                <Star size={10} className="text-yellow-500 fill-yellow-500" />
                {product.rating.toFixed(1)}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
};

const EmptyState = ({ category }) => {
  const categoryConfig = CATEGORY_CONFIG[category] || null;
  const CategoryIcon = categoryConfig?.icon || Store;
  
  const messages = {
    restaurants: 'لا توجد مطاعم وجبات سريعة حالياً',
    market: 'لا توجد متاجر ماركت حالياً',
    vegetables: 'لا توجد متاجر خضار وفواكه حالياً',
    sweets: 'لا توجد متاجر حلويات حالياً',
    all: 'لا توجد متاجر أو منتجات متاحة حالياً'
  };

  const joinMessages = {
    restaurants: 'انضم كمطعم وجبات سريعة',
    market: 'انضم كمتجر ماركت',
    vegetables: 'انضم كمتجر خضار وفواكه',
    sweets: 'انضم كمتجر حلويات',
    all: 'انضم كمتجر طعام'
  };

  return (
    <div className="text-center py-12">
      <div className={`w-20 h-20 ${categoryConfig?.bgLight || 'bg-orange-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
        <CategoryIcon size={32} className={categoryConfig?.textColor || 'text-[#FF6B00]'} />
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{messages[category] || messages.all}</h3>
      <p className="text-gray-500 text-sm mb-4">
        كن أول من ينضم في ترند سورية! {categoryConfig?.emoji || '🍽️'}
      </p>
      <Link
        to="/join/food-seller"
        className={`inline-flex items-center gap-2 ${categoryConfig?.color || 'bg-[#FF6B00]'} text-white px-6 py-2 rounded-full font-medium hover:opacity-90 transition-colors`}
      >
        <CategoryIcon size={18} />
        {joinMessages[category] || joinMessages.all}
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
                      c === 'restaurants' ? 'وجبات' : 
                      c === 'market' ? 'ماركت' : 
                      c === 'vegetables' ? 'خضار' :
                      c === 'sweets' ? 'حلويات' : c
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
