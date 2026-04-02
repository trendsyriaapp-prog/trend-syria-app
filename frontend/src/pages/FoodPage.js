// /app/frontend/src/pages/FoodPage.js
// صفحة توصيل الطعام - وجبات سريعة، ماركت، خضار، حلويات، مقاهي، مخابز، مشروبات

import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  UtensilsCrossed, ShoppingCart, Apple, Search, MapPin, 
  Star, Clock, ChevronLeft, Filter, Store, Heart, Sparkles, Cake,
  Scale, Package, Utensils, IceCream, Coffee, Croissant, GlassWater, X,
  ShoppingBasket, Truck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import FreeShippingBanner from '../components/FreeShippingBanner';

const API = process.env.REACT_APP_BACKEND_URL;

// خريطة الأيقونات الديناميكية
const ICON_MAP = {
  UtensilsCrossed, ShoppingCart, Apple, Store, Cake, Coffee, 
  Croissant, GlassWater, ShoppingBasket, Package, Scale, Utensils, IceCream
};

// دالة للحصول على الأيقونة
const getIcon = (iconName) => ICON_MAP[iconName] || Package;

// إعدادات كل قسم - ألوان وأيقونات ووحدات القياس
const CATEGORY_CONFIG = {
  // قسم الطعام
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
    emoji: '🍔',
    mainCategory: 'food'
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
    emoji: '🍰',
    mainCategory: 'food'
  },
  drinks: {
    name: 'مشروبات',
    icon: Coffee,
    color: 'bg-amber-600',
    textColor: 'text-amber-600',
    bgLight: 'bg-amber-50',
    borderColor: 'border-amber-600',
    gradient: 'from-amber-600 to-amber-700',
    unit: 'كوب',
    unitIcon: Coffee,
    emoji: '☕',
    mainCategory: 'food'
  },
  // قسم الماركت
  supermarket: {
    name: 'سوبرماركت',
    icon: ShoppingCart,
    color: 'bg-blue-500',
    textColor: 'text-blue-500',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-500',
    gradient: 'from-blue-500 to-blue-600',
    unit: 'قطعة',
    unitIcon: Package,
    emoji: '🛒',
    mainCategory: 'market'
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
    emoji: '🥬',
    mainCategory: 'market'
  }
};

// الأقسام الرئيسية
const MAIN_SECTIONS = {
  food: {
    name: 'طعام',
    icon: '🍔',
    color: 'from-orange-500 to-orange-600',
    categories: ['restaurants', 'sweets', 'drinks']
  },
  market: {
    name: 'ماركت',
    icon: '🛒',
    color: 'from-[#FF6B00] to-[#FF8533]',
    categories: ['supermarket', 'vegetables']
  }
};

// للتوافق مع الكود القديم
const foodCategories = Object.entries(CATEGORY_CONFIG).map(([id, config]) => ({
  id,
  name: config.name,
  icon: config.icon,
  color: config.color
}));


// مكون المتاجر - تمرير أفقي حر
const StoresCarousel = ({ stores, featuredStores, isFeatured, StoreCard }) => {
  // استخدام المتاجر المميزة إذا كانت مفعلة، وإلا أفضل المتاجر
  const displayStores = isFeatured && featuredStores.length > 0 ? featuredStores : stores;
  
  return (
    <section className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-900">المتاجر</h2>
          {isFeatured && featuredStores.length > 0 && (
            <span className="text-[10px] bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white px-2 py-0.5 rounded-full">
              مميزة
            </span>
          )}
        </div>
        <Link 
          to="/food/stores" 
          className="text-[#FF6B00] flex items-center gap-1 hover:gap-2 transition-all text-xs font-medium"
        >
          عرض الكل
          <ChevronLeft size={14} />
        </Link>
      </div>
      
      {/* تمرير أفقي حر - المستخدم يتحكم */}
      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
        {displayStores.map((store) => (
          <div key={store.id} className="flex-shrink-0 w-44">
            <StoreCard store={store} />
          </div>
        ))}
      </div>
    </section>
  );
};

const FoodPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const searchParam = searchParams.get('search');
  const filterParam = searchParams.get('filter');
  const { user, token } = useAuth();
  const navigate = useNavigate();
  
  const [activeCategory, setActiveCategory] = useState(categoryParam || 'all');
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [flashSales, setFlashSales] = useState([]);
  const [foodBanners, setFoodBanners] = useState([]);
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParam || '');
  const [userCity, setUserCity] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('checking'); // 'checking', 'requesting', 'denied', 'error', 'success'
  const [globalFreeShipping, setGlobalFreeShipping] = useState(null);
  const [badgeSettings, setBadgeSettings] = useState(null);
  const [dynamicCategories, setDynamicCategories] = useState([]);
  const [activeStoreGroup, setActiveStoreGroup] = useState(0);
  const storesScrollRef = useRef(null);
  const [featuredStores, setFeaturedStores] = useState([]);
  const [isFeaturedEnabled, setIsFeaturedEnabled] = useState(false);
  const [freeDeliveryProducts, setFreeDeliveryProducts] = useState([]);
  const [showOnlyFreeDelivery, setShowOnlyFreeDelivery] = useState(filterParam === 'free_delivery');
  const [foodFavorites, setFoodFavorites] = useState([]);

  // إحداثيات المدن السورية الرئيسية
  const CITY_COORDINATES = {
    'دمشق': { lat: 33.5138, lng: 36.2765 },
    'حلب': { lat: 36.2021, lng: 37.1343 },
    'حمص': { lat: 34.7324, lng: 36.7137 },
    'حماة': { lat: 35.1318, lng: 36.7519 },
    'اللاذقية': { lat: 35.5317, lng: 35.7919 },
    'طرطوس': { lat: 34.8890, lng: 35.8866 },
    'دير الزور': { lat: 35.3359, lng: 40.1408 },
    'الرقة': { lat: 35.9594, lng: 39.0078 },
    'الحسكة': { lat: 36.5067, lng: 40.7440 },
    'درعا': { lat: 32.6189, lng: 36.1021 },
    'السويداء': { lat: 32.7090, lng: 36.5663 },
    'إدلب': { lat: 35.9306, lng: 36.6347 },
    'القنيطرة': { lat: 33.1260, lng: 35.8245 },
    'ريف دمشق': { lat: 33.4500, lng: 36.3000 }
  };

  // حساب المسافة بين نقطتين (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // نصف قطر الأرض بالكيلومتر
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // تحديد أقرب مدينة من الإحداثيات
  const getNearestCity = (latitude, longitude) => {
    let nearestCity = 'دمشق';
    let minDistance = Infinity;

    Object.entries(CITY_COORDINATES).forEach(([city, coords]) => {
      const distance = calculateDistance(latitude, longitude, coords.lat, coords.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearestCity = city;
      }
    });

    return nearestCity;
  };

  // طلب إذن GPS وتحديد المدينة
  const requestGPSLocation = () => {
    setGpsStatus('requesting');
    
    if (!navigator.geolocation) {
      setGpsStatus('error');
      return;
    }

    // timeout إضافي للتأكد من عدم التعليق
    const timeoutId = setTimeout(() => {
      setGpsStatus('error');
    }, 15000); // 15 ثانية كحد أقصى

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        const { latitude, longitude } = position.coords;
        const city = getNearestCity(latitude, longitude);
        
        // التحقق من أن المدينة ضمن سوريا
        if (city) {
          setUserCity(city);
          localStorage.setItem('food_delivery_city', city);
          localStorage.setItem('food_gps_granted', 'true');
          setGpsStatus('success');
        } else {
          setGpsStatus('error');
        }
      },
      (error) => {
        clearTimeout(timeoutId);
        console.error('GPS Error:', error);
        if (error.code === error.PERMISSION_DENIED) {
          setGpsStatus('denied');
        } else if (error.code === error.TIMEOUT) {
          setGpsStatus('error');
        } else {
          setGpsStatus('error');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 دقائق cache
      }
    );
  };

  // تحديث showOnlyFreeDelivery عند تغير filterParam
  useEffect(() => {
    setShowOnlyFreeDelivery(filterParam === 'free_delivery');
  }, [filterParam]);

  // جلب الفئات الديناميكية من الـ API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${API}/api/categories/food`);
        setDynamicCategories(res.data);
      } catch (err) {
        console.log('Using default categories');
        // استخدام الفئات الافتراضية في حالة الخطأ
        setDynamicCategories(Object.entries(CATEGORY_CONFIG).map(([id, config]) => ({
          id,
          name: config.name,
          icon: config.icon?.name || 'UtensilsCrossed',
          color: config.color?.replace('bg-', '#') || '#FF6B00'
        })));
      }
    };
    fetchCategories();
  }, []);

  // دالة تغيير الفئة مع تحديث URL
  const handleCategoryChange = (categoryId) => {
    setActiveCategory(categoryId);
    // تحديث URL مع الحفاظ على باقي المعاملات
    const newParams = new URLSearchParams(searchParams);
    if (categoryId === 'all') {
      newParams.delete('category');
    } else {
      newParams.set('category', categoryId);
    }
    setSearchParams(newParams);
  };

  // تحديث searchQuery عند تغير searchParam
  useEffect(() => {
    setSearchQuery(searchParam || '');
  }, [searchParam]);

  // جلب المفضلة للأطعمة
  useEffect(() => {
    const fetchFoodFavorites = async () => {
      if (!user || !token) return;
      try {
        const res = await axios.get(`${API}/api/stores/favorites`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        // استخراج IDs المنتجات المفضلة
        const favIds = res.data.map(f => f.product_id);
        setFoodFavorites(favIds);
      } catch (error) {
        console.error('Error fetching favorites:', error);
      }
    };
    fetchFoodFavorites();
  }, [user, token]);

  // دالة إضافة/إزالة من المفضلة
  const toggleFoodFavorite = async (productId, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user || !token) {
      // إذا لم يكن مسجل الدخول، توجيه لصفحة تسجيل الدخول
      navigate('/login');
      return;
    }
    
    const isFavorite = foodFavorites.includes(productId);
    
    try {
      if (isFavorite) {
        await axios.delete(`${API}/api/stores/favorites/${productId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFoodFavorites(prev => prev.filter(id => id !== productId));
      } else {
        await axios.post(`${API}/api/stores/favorites/${productId}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFoodFavorites(prev => [...prev, productId]);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  // تحديد الموقع عند فتح الصفحة
  useEffect(() => {
    const initLocation = () => {
      // تحقق إذا كان المستخدم قد وافق مسبقاً
      const gpsGranted = localStorage.getItem('food_gps_granted');
      const savedCity = localStorage.getItem('food_delivery_city');
      
      if (gpsGranted === 'true' && savedCity) {
        // موقع محفوظ - استخدمه ثم حدّث في الخلفية
        setUserCity(savedCity);
        setGpsStatus('success');
        
        // تحديث الموقع في الخلفية
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { latitude, longitude } = position.coords;
              const city = getNearestCity(latitude, longitude);
              if (city !== savedCity) {
                setUserCity(city);
                localStorage.setItem('food_delivery_city', city);
              }
            },
            () => {}, // تجاهل الأخطاء في التحديث الخلفي
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
          );
        }
      } else {
        // طلب GPS لأول مرة - مباشرة بدون انتظار
        requestGPSLocation();
      }
    };
    
    initLocation();
  }, []);

  useEffect(() => {
    if (userCity) {
      fetchData();
    }
  }, [activeCategory, userCity, searchQuery]);

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
      const [storesRes, productsRes, flashRes, bannersRes, promoRes, badgeRes, featuredRes, publicSettingsRes] = await Promise.all([
        axios.get(`${API}/api/food/stores`, { params: { 
          category: activeCategory !== 'all' ? activeCategory : undefined,
          city: userCity,
          search: searchQuery || undefined
        }}),
        axios.get(`${API}/api/food/products`, { params: { 
          category: activeCategory !== 'all' ? activeCategory : undefined,
          city: userCity,
          search: searchQuery || undefined,
          limit: 100
        }}),
        axios.get(`${API}/api/food/flash-sales/active`),
        axios.get(`${API}/api/food/banners`).catch(() => ({ data: [] })),
        axios.get(`${API}/api/settings/global-free-shipping`).catch(() => ({ data: null })),
        axios.get(`${API}/api/settings/product-badges`).catch(() => ({ data: null })),
        axios.get(`${API}/api/settings/featured-stores/public`).catch(() => ({ data: { is_featured: false, stores: [] } })),
        axios.get(`${API}/api/settings/public`).catch(() => ({ data: { food_free_delivery_threshold: 100000 } }))
      ]);
      setStores(storesRes.data || []);
      setProducts(productsRes.data || []);
      setFlashSales(flashRes.data || []);
      setFoodBanners(bannersRes.data || []);
      setBadgeSettings(badgeRes.data || null);
      
      // المتاجر المميزة
      const featuredData = featuredRes.data;
      setIsFeaturedEnabled(featuredData?.is_featured || false);
      setFeaturedStores(featuredData?.stores || []);
      
      // تعيين عرض الشحن المجاني إذا كان مفعلاً ويشمل الطعام
      const promo = promoRes.data;
      if (promo?.is_active && ['all', 'food'].includes(promo.applies_to)) {
        setGlobalFreeShipping(promo);
      } else {
        setGlobalFreeShipping(null);
      }
      
      // جلب منتجات التوصيل المجاني (سعرها >= حد التوصيل المجاني)
      const foodThreshold = publicSettingsRes.data?.food_free_delivery_threshold || 100000;
      try {
        const allProducts = productsRes.data || [];
        const freeDeliveryItems = allProducts.filter(p => p.price >= foodThreshold);
        setFreeDeliveryProducts(freeDeliveryItems.slice(0, 10));
      } catch (err) {
        console.error('Error filtering free delivery products:', err);
        setFreeDeliveryProducts([]);
      }
    } catch (error) {
      console.error('Error fetching food data:', error);
      setStores([]);
      setProducts([]);
      setFlashSales([]);
      setFoodBanners([]);
      setGlobalFreeShipping(null);
      setFreeDeliveryProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCitySelect = (city) => {
    setUserCity(city);
    localStorage.setItem('food_delivery_city', city);
    setGpsStatus('success');
  };

  // شاشة طلب تفعيل GPS
  if (gpsStatus === 'checking' || gpsStatus === 'requesting') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-[#FF6B00]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <MapPin size={40} className="text-[#FF6B00]" />
            </motion.div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">جاري تحديد موقعك...</h2>
          <p className="text-sm text-gray-500">يرجى السماح بالوصول لموقعك لعرض المطاعم القريبة</p>
          <div className="mt-4 flex justify-center">
            <div className="w-8 h-8 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin"></div>
          </div>
        </motion.div>
      </div>
    );
  }

  // شاشة رفض GPS أو خطأ
  if (gpsStatus === 'denied' || gpsStatus === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full"
        >
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin size={40} className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {gpsStatus === 'denied' ? 'تم رفض الوصول للموقع' : 'خطأ في تحديد الموقع'}
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              لعرض المطاعم والمتاجر القريبة منك، نحتاج الوصول لموقعك.
              <br />
              هذا يضمن لك توصيل أسرع وتجربة أفضل.
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={requestGPSLocation}
              className="w-full bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white py-3 rounded-xl font-bold hover:from-[#E65000] hover:to-[#FF6B00] transition-all flex items-center justify-center gap-2"
            >
              <MapPin size={20} />
              تفعيل الموقع
            </button>
            
            <p className="text-xs text-gray-400 text-center">
              💡 تأكد من تفعيل خدمات الموقع في إعدادات جهازك
            </p>
          </div>

          {/* رسالة توضيحية إضافية */}
          <div className="mt-6 p-4 bg-orange-50 rounded-xl border border-orange-100">
            <h3 className="font-bold text-orange-800 text-sm mb-2">🛵 لماذا نحتاج موقعك؟</h3>
            <ul className="text-xs text-orange-700 space-y-1">
              <li>• عرض المطاعم في مدينتك فقط</li>
              <li>• ضمان وصول الطلب بسرعة</li>
              <li>• حساب تكلفة التوصيل بدقة</li>
            </ul>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      {/* شريط قسم الطعام مع المدينة - وميض برتقالي */}
      <motion.div 
        className="relative text-white px-4 py-3 overflow-hidden"
        animate={{
          background: [
            'linear-gradient(to right, #FF6B00, #FF8C00, #FFA033)',
            'linear-gradient(to right, #FF8C00, #FFA033, #FFB347)',
            'linear-gradient(to right, #FFA033, #FF8C00, #FF6B00)',
            'linear-gradient(to right, #FF6B00, #FF8C00, #FFA033)',
          ]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
      >
        {/* زخارف خلفية */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 right-5 text-3xl animate-bounce">🍕</div>
          <div className="absolute bottom-0 left-10 text-2xl">🍔</div>
          <div className="absolute top-1 left-1/4 text-xl">🌮</div>
          <div className="absolute bottom-1 right-1/3 text-xl">🍟</div>
          <div className="absolute top-0 left-1/2 text-lg">☕</div>
          <div className="absolute bottom-0 right-1/4 text-lg">🧁</div>
        </div>
        
        <div className="relative max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            {/* أيقونة الانتقال لصفحة المنتجات */}
            <Link 
              to="/products"
              className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <Package size={18} className="text-white" />
            </Link>
            <h1 className="text-base font-bold">قسم الطعام</h1>
            {/* عرض المدينة الحالية (من GPS) */}
            <div className="mr-auto flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs border border-white/30">
              <MapPin size={12} />
              <span>{userCity || 'جاري التحديد...'}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Categories with Food Images */}
      {/* الفئات */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-2">
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar">
            <button
              onClick={() => handleCategoryChange('all')}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full whitespace-nowrap transition-all ${
                activeCategory === 'all'
                  ? 'bg-[#FF6B00] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Store size={12} />
              <span className="text-xs font-medium">الكل</span>
            </button>
            {(dynamicCategories.length > 0 ? dynamicCategories : foodCategories).map((cat) => {
              const IconComp = typeof cat.icon === 'string' ? getIcon(cat.icon) : cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full whitespace-nowrap transition-all ${
                    activeCategory === cat.id
                      ? 'bg-[#FF6B00] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <IconComp size={12} />
                  <span className="text-xs font-medium">{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 🎁 بانر الشحن المجاني الشامل - خارج الحاوية ليكون بعرض الشاشة */}
      {!loading && globalFreeShipping && (
        <FreeShippingBanner promo={globalFreeShipping} variant="food" />
      )}

      {/* 🚚 شريط فلتر التوصيل المجاني */}
      {showOnlyFreeDelivery && (
        <div className="bg-gradient-to-r from-[#FF6B00] to-[#FF8533] text-white">
          <div className="max-w-7xl mx-auto px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck size={18} />
                <span className="font-bold text-sm">عرض منتجات التوصيل المجاني فقط</span>
              </div>
              <button 
                onClick={() => {
                  setShowOnlyFreeDelivery(false);
                  setSearchParams({});
                }}
                className="flex items-center gap-1 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-xs transition-all"
              >
                <X size={14} />
                <span>إلغاء الفلتر</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* Stores Section - 2x2 Grid */}
            {(stores.length > 0 || featuredStores.length > 0) && (
              <StoresCarousel 
                stores={stores} 
                featuredStores={featuredStores}
                isFeatured={isFeaturedEnabled}
                StoreCard={StoreCard}
              />
            )}

            {/* Flash Sales Banner */}
            {flashSales.length > 0 && (
              <section className="mb-4">
                {flashSales.slice(0, 1).map((flash) => (
                  <FlashSaleBanner key={flash.id} flash={flash} />
                ))}
              </section>
            )}

            {/* 🚚 قسم توصيلها مجاني */}
            {freeDeliveryProducts.length > 0 && (
              <section className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gradient-to-r from-[#FF6B00] to-[#FF8533] rounded-lg">
                      <Truck size={16} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-900">توصيل مجاني</h2>
                      <p className="text-[10px] text-gray-500">اطلب واحصل على توصيل مجاني فوراً!</p>
                    </div>
                  </div>
                  <Link 
                    to="/food/free-delivery"
                    className="flex items-center gap-1 text-xs text-[#FF6B00] hover:text-[#E65000] font-medium"
                  >
                    <span>عرض الكل</span>
                    <ChevronLeft size={14} />
                  </Link>
                </div>
                
                <div className="relative">
                  <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                    {freeDeliveryProducts.map((product, i) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex-shrink-0 w-36"
                      >
                        <Link to={`/food/store/${product.store_id}?highlight=${product.id}`}>
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
                              <div className="absolute top-2 right-2 bg-gradient-to-r from-[#FF6B00] to-[#FF8533] text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                                <Truck size={10} />
                                توصيل مجاني
                              </div>
                            </div>
                            <div className="p-2">
                              <h3 className="font-medium text-sm text-gray-900 truncate">{product.name}</h3>
                              {product.store_name && (
                                <div className="flex items-center gap-1 text-gray-500 mt-0.5">
                                  <Store size={10} className="text-[#FF6B00]" />
                                  <span className="text-[10px] truncate">{product.store_name}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[#FF6B00] font-bold text-sm">
                                  {product.price?.toLocaleString()} ل.س
                                </span>
                              </div>
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* Products Section */}
            {showOnlyFreeDelivery ? (
              // عرض منتجات التوصيل المجاني فقط
              <section>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-gradient-to-r from-[#FF6B00] to-[#FF8533] rounded-lg">
                      <Truck size={16} className="text-white" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">منتجات التوصيل المجاني</h2>
                  </div>
                  <span className="text-sm text-gray-500">{freeDeliveryProducts.length} منتج</span>
                </div>
                {freeDeliveryProducts.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {freeDeliveryProducts.map((product) => (
                      <FoodProductCard key={product.id} product={product} badgeSettings={badgeSettings} foodFavorites={foodFavorites} toggleFoodFavorite={toggleFoodFavorite} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Truck size={48} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">لا توجد منتجات بتوصيل مجاني حالياً</p>
                  </div>
                )}
              </section>
            ) : products.length > 0 ? (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold text-gray-900">المنتجات</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {products.map((product) => (
                    <FoodProductCard key={product.id} product={product} badgeSettings={badgeSettings} foodFavorites={foodFavorites} toggleFoodFavorite={toggleFoodFavorite} />
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
  const isOpen = store.is_open !== false; // افتراضياً مفتوح إذا لم يُحدد
  const isSuspended = store.is_suspended === true; // متجر معلق
  
  const cardContent = (
    <motion.div
      whileHover={isOpen && !isSuspended ? { scale: 1.02 } : {}}
      whileTap={isOpen && !isSuspended ? { scale: 0.98 } : {}}
      className={`bg-white rounded-xl border-2 ${store.store_type ? categoryConfig.borderColor : 'border-gray-200'} overflow-hidden transition-shadow relative
        ${isOpen && !isSuspended ? 'hover:shadow-md' : 'grayscale opacity-70'}`}
    >
      {/* شارة معلق */}
      {isSuspended && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 rounded-xl">
          <div className="bg-orange-600 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg flex items-center gap-2">
            <Store size={16} />
            <span>متوقف مؤقتاً</span>
          </div>
        </div>
      )}
      
      {/* شارة مغلق */}
      {!isOpen && !isSuspended && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 rounded-xl">
          <div className="bg-red-600 text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg flex items-center gap-2">
            <Clock size={16} />
            <span>مغلق الآن</span>
          </div>
        </div>
      )}
      
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
            <p className="text-[10px] text-gray-500 truncate">{typeof store.address === 'object' 
              ? [store.address?.area, store.address?.street, store.address?.building].filter(Boolean).join(', ')
              : store.address}</p>
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
        {/* حالة الفتح/الإغلاق/التعليق */}
        {isSuspended && (
          <div className="mt-2 text-xs text-orange-600 font-medium">
            متوقف مؤقتاً
          </div>
        )}
        {!isOpen && !isSuspended && store.open_status && (
          <div className="mt-2 text-xs text-red-600 font-medium">
            {store.open_status}
            {store.next_open_time && (
              <span className="text-gray-500 mr-1">• يفتح {store.next_open_time}</span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
  
  // إذا كان المتجر معلق أو مغلقاً، لا نجعله رابطاً قابلاً للنقر
  if (isSuspended) {
    return <div className="cursor-not-allowed" data-testid={`store-card-suspended-${store.id}`}>{cardContent}</div>;
  }
  
  if (!isOpen) {
    return <div className="cursor-not-allowed" data-testid={`store-card-closed-${store.id}`}>{cardContent}</div>;
  }
  
  return (
    <Link to={`/food/store/${store.id}`} data-testid={`store-card-${store.id}`}>
      {cardContent}
    </Link>
  );
};

// بطاقة منتج الطعام - توجه للمتجر وليس لصفحة المنتج
const FoodProductCard = ({ product, badgeSettings, foodFavorites = [], toggleFoodFavorite }) => {
  // جلب إعدادات القسم حسب نوع المتجر
  const categoryConfig = CATEGORY_CONFIG[product.store_type] || CATEGORY_CONFIG.restaurants;
  const UnitIcon = categoryConfig.unitIcon;
  
  // التحقق من حالة المتجر (مفتوح/مغلق)
  const isStoreOpen = product.store_is_open !== false;
  
  const [badgeIndex, setBadgeIndex] = useState(0);
  const [activeBadge, setActiveBadge] = useState(null);
  
  const isNew = product.created_at && 
    (new Date() - new Date(product.created_at)) < 7 * 24 * 60 * 60 * 1000;

  // تحديد الشارة المناسبة
  useEffect(() => {
    if (!badgeSettings?.enabled || !badgeSettings?.badge_types) {
      setActiveBadge(null);
      return;
    }
    const { badge_types } = badgeSettings;
    // الأولوية: الأكثر مبيعاً > الأكثر زيارة > شحن مجاني
    if (badge_types.best_seller?.enabled && (product.sales_count || 0) >= (badge_types.best_seller.min_sales || 10)) {
      setActiveBadge({ messages: badge_types.best_seller.messages || ['🔥 الأكثر مبيعاً'], type: 'best_seller' });
    } else if (badge_types.most_viewed?.enabled && (product.views || 0) >= (badge_types.most_viewed.min_views || 100)) {
      setActiveBadge({ messages: badge_types.most_viewed.messages || ['👁️ الأكثر زيارة'], type: 'most_viewed' });
    } else if (badge_types.free_shipping?.enabled) {
      const threshold = product.free_delivery_minimum || badge_types.free_shipping.threshold || 30000;
      const price = product.price || 0;
      
      if (price >= threshold) {
        setActiveBadge({ messages: badge_types.free_shipping.messages || ['🚚 شحن مجاني'], type: 'free_shipping' });
      } else {
        const unitsNeeded = Math.ceil(threshold / price);
        if (unitsNeeded >= 2 && unitsNeeded <= 3) {
          setActiveBadge({
            messages: [
              `🛒 اشترِ ${unitsNeeded} = شحن مجاني`,
              `📦 ${unitsNeeded} قطع = توصيل مجاني`,
              `✨ وفّر التوصيل بـ ${unitsNeeded} قطع`
            ],
            type: 'buy_x'
          });
        } else {
          setActiveBadge(null);
        }
      }
    } else {
      setActiveBadge(null);
    }
  }, [product, badgeSettings]);

  // دوران الشارة
  useEffect(() => {
    if (!activeBadge || activeBadge.messages.length <= 1) return;
    const interval = setInterval(() => {
      setBadgeIndex((prev) => (prev + 1) % activeBadge.messages.length);
    }, badgeSettings?.rotation_speed || 3000);
    return () => clearInterval(interval);
  }, [activeBadge, badgeSettings?.rotation_speed]);

  const bgColors = [
    'from-blue-500 via-blue-600 to-blue-500',
    'from-emerald-500 via-emerald-600 to-emerald-500',
    'from-violet-500 via-violet-600 to-violet-500',
    'from-rose-800 via-rose-900 to-rose-800'
  ];

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
  };

  const cardContent = (
    <motion.div
      whileHover={isStoreOpen ? { y: -4 } : {}}
      className={`bg-white rounded-xl border-2 ${categoryConfig.borderColor} overflow-hidden transition-all relative
        ${isStoreOpen ? 'hover:shadow-md' : 'grayscale opacity-70'}`}
    >
      {/* شارة مغلق على المنتج */}
      {!isStoreOpen && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 rounded-xl">
          <div className="bg-red-600 text-white px-3 py-1.5 rounded-full font-bold text-xs shadow-lg flex items-center gap-1.5">
            <Clock size={14} />
            <span>المتجر مغلق</span>
          </div>
        </div>
      )}
      
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
        <div className="absolute top-1 right-1 flex flex-col gap-1">
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

        {/* شارة التوصيل/المبيعات - حركة slide-up */}
        {activeBadge && isStoreOpen && (
          <div className="absolute bottom-1 left-1 overflow-hidden h-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={badgeIndex}
                initial={{ y: 24, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -24, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={`text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-lg bg-gradient-to-r ${bgColors[badgeIndex % 4]}`}
              >
                {activeBadge.messages[badgeIndex]}
              </motion.div>
            </AnimatePresence>
          </div>
        )}
        
        {/* Favorite */}
        <button 
          className={`absolute top-1 left-1 p-1.5 rounded-full transition-colors ${
            foodFavorites.includes(product.id) 
              ? 'bg-red-500 text-white' 
              : 'bg-white/80 hover:bg-white text-gray-500'
          }`}
          onClick={(e) => toggleFoodFavorite(product.id, e)}
        >
          <Heart size={14} className={foodFavorites.includes(product.id) ? 'fill-current' : ''} />
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
  );

  // إذا كان المتجر مغلقاً، لا نجعل المنتج رابطاً قابلاً للنقر
  if (!isStoreOpen) {
    return <div className="cursor-not-allowed">{cardContent}</div>;
  }

  return (
    <Link to={`/food/store/${product.store_id}?highlight=${product.id}`}>
      {cardContent}
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
    cafes: 'لا توجد مقاهي حالياً',
    bakery: 'لا توجد مخابز حالياً',
    drinks: 'لا توجد متاجر مشروبات حالياً',
    all: 'لا توجد متاجر أو منتجات متاحة حالياً'
  };

  const joinMessages = {
    restaurants: 'انضم كمطعم وجبات سريعة',
    market: 'انضم كمتجر ماركت',
    vegetables: 'انضم كمتجر خضار وفواكه',
    sweets: 'انضم كمتجر حلويات',
    cafes: 'انضم كمقهى',
    bakery: 'انضم كمخبز',
    drinks: 'انضم كمتجر مشروبات',
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden -mx-4"
      style={{ backgroundColor: flash.banner_color || '#FF4500' }}
    >
      <div className="px-3 py-2 text-white max-w-7xl mx-auto">
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
