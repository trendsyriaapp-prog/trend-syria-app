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

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// خريطة الأيقونات الديناميكية
const ICON_MAP = {
  UtensilsCrossed, ShoppingCart, Apple, Store, Cake, Coffee, 
  Croissant, GlassWater, ShoppingBasket, Package, Scale, Utensils, IceCream
};

// دالة للحصول على الأيقونة
const getIcon = (iconName) => ICON_MAP[iconName] || Package;

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
  },
  cafes: {
    name: 'مقاهي',
    icon: Coffee,
    color: 'bg-amber-600',
    textColor: 'text-amber-600',
    bgLight: 'bg-amber-50',
    borderColor: 'border-amber-600',
    gradient: 'from-amber-600 to-amber-700',
    unit: 'كوب',
    unitIcon: Coffee,
    emoji: '☕'
  },
  bakery: {
    name: 'مخابز',
    icon: Croissant,
    color: 'bg-yellow-600',
    textColor: 'text-yellow-600',
    bgLight: 'bg-yellow-50',
    borderColor: 'border-yellow-600',
    gradient: 'from-yellow-600 to-yellow-700',
    unit: 'قطعة',
    unitIcon: Croissant,
    emoji: '🥐'
  },
  drinks: {
    name: 'مشروبات',
    icon: GlassWater,
    color: 'bg-cyan-500',
    textColor: 'text-cyan-500',
    bgLight: 'bg-cyan-50',
    borderColor: 'border-cyan-500',
    gradient: 'from-cyan-500 to-cyan-600',
    unit: 'كوب',
    unitIcon: GlassWater,
    emoji: '🥤'
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

import FreeShippingBanner from '../components/FreeShippingBanner';

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
  const { user } = useAuth();
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
  const [showCitySelector, setShowCitySelector] = useState(false);
  const [globalFreeShipping, setGlobalFreeShipping] = useState(null);
  const [badgeSettings, setBadgeSettings] = useState(null);
  const [dynamicCategories, setDynamicCategories] = useState([]);
  const [activeStoreGroup, setActiveStoreGroup] = useState(0);
  const storesScrollRef = useRef(null);
  const [featuredStores, setFeaturedStores] = useState([]);
  const [isFeaturedEnabled, setIsFeaturedEnabled] = useState(false);
  const [freeDeliveryProducts, setFreeDeliveryProducts] = useState([]);
  const [showOnlyFreeDelivery, setShowOnlyFreeDelivery] = useState(filterParam === 'free_delivery');

  // تحديث showOnlyFreeDelivery عند تغير filterParam
  useEffect(() => {
    setShowOnlyFreeDelivery(filterParam === 'free_delivery');
  }, [filterParam]);

  // جلب الفئات الديناميكية من الـ API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await axios.get(`${API}/categories/food`);
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
        axios.get(`${API}/food/stores`, { params: { 
          category: activeCategory !== 'all' ? activeCategory : undefined,
          city: userCity,
          search: searchQuery || undefined
        }}),
        axios.get(`${API}/food/products`, { params: { 
          category: activeCategory !== 'all' ? activeCategory : undefined,
          city: userCity,
          search: searchQuery || undefined,
          limit: 100
        }}),
        axios.get(`${API}/food/flash-sales/active`),
        axios.get(`${API}/food/banners`).catch(() => ({ data: [] })),
        axios.get(`${API}/settings/global-free-shipping`).catch(() => ({ data: null })),
        axios.get(`${API}/settings/product-badges`).catch(() => ({ data: null })),
        axios.get(`${API}/settings/featured-stores/public`).catch(() => ({ data: { is_featured: false, stores: [] } })),
        axios.get(`${API}/settings/public`).catch(() => ({ data: { food_free_delivery_threshold: 100000 } }))
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
            {/* زر تغيير المدينة */}
            <button 
              onClick={() => setShowCitySelector(true)}
              className="mr-auto flex items-center gap-1 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs hover:bg-white/30 transition-colors border border-white/30"
            >
              <MapPin size={12} />
              <span>{userCity || 'اختر مدينة'}</span>
            </button>
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
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
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
                    <div className="p-1.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                      <Truck size={16} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-gray-900">توصيل مجاني</h2>
                      <p className="text-[10px] text-gray-500">اطلب واحصل على توصيل مجاني فوراً!</p>
                    </div>
                  </div>
                  <Link 
                    to="/food/free-delivery"
                    className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
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
                              <div className="absolute top-2 right-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                                <Truck size={10} />
                                توصيل مجاني
                              </div>
                            </div>
                            <div className="p-2">
                              <h3 className="font-medium text-sm text-gray-900 truncate">{product.name}</h3>
                              {product.store_name && (
                                <div className="flex items-center gap-1 text-gray-500 mt-0.5">
                                  <Store size={10} className="text-green-500" />
                                  <span className="text-[10px] truncate">{product.store_name}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-green-600 font-bold text-sm">
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
                    <div className="p-1.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                      <Truck size={16} className="text-white" />
                    </div>
                    <h2 className="text-lg font-bold text-gray-900">منتجات التوصيل المجاني</h2>
                  </div>
                  <span className="text-sm text-gray-500">{freeDeliveryProducts.length} منتج</span>
                </div>
                {freeDeliveryProducts.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {freeDeliveryProducts.map((product) => (
                      <FoodProductCard key={product.id} product={product} badgeSettings={badgeSettings} />
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
                    <FoodProductCard key={product.id} product={product} badgeSettings={badgeSettings} />
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
  
  const cardContent = (
    <motion.div
      whileHover={isOpen ? { scale: 1.02 } : {}}
      whileTap={isOpen ? { scale: 0.98 } : {}}
      className={`bg-white rounded-xl border-2 ${store.store_type ? categoryConfig.borderColor : 'border-gray-200'} overflow-hidden transition-shadow relative
        ${isOpen ? 'hover:shadow-md' : 'grayscale opacity-70'}`}
    >
      {/* شارة مغلق */}
      {!isOpen && (
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
        {/* حالة الفتح/الإغلاق */}
        {!isOpen && store.open_status && (
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
  
  // إذا كان المتجر مغلقاً، لا نجعله رابطاً قابلاً للنقر
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
const FoodProductCard = ({ product, badgeSettings }) => {
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
          className="absolute top-1 left-1 p-1.5 bg-white/80 rounded-full hover:bg-white transition-colors"
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
