import { useState, useEffect, useLayoutEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  ArrowLeft, Smartphone, Shirt, 
  Home as HomeIcon, Dumbbell, BookOpen, Gamepad2, 
  UtensilsCrossed, SprayCan, ChevronLeft, TrendingUp,
  Package, Star, ShoppingBasket, Apple, Zap, ChevronRight,
  Pill, Car, MapPin, Watch, Gift, Sparkles, Laptop, Footprints,
  Sofa, Refrigerator, Coffee, Cake, Croissant, GlassWater, Truck
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import FeaturedProducts from '../components/FeaturedProducts';
import DailyDeal from '../components/DailyDeal';
import RecommendedProducts from '../components/RecommendedProducts';
import FreeShippingBanner from '../components/FreeShippingBanner';
import { useSettings } from '../context/SettingsContext';
import { useScroll } from '../context/ScrollContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const iconMap = {
  Smartphone, Shirt, Home: HomeIcon, Dumbbell, 
  BookOpen, Gamepad2, UtensilsCrossed, SprayCan,
  ShoppingBasket, Apple, Pill, Car, Watch, Gift, Sparkles,
  Laptop, Footprints, Sofa, Refrigerator, Coffee, Cake, Croissant, GlassWater
};

// مكون Skeleton للمنتجات - ارتفاع ثابت لمنع القفزات
const ProductSkeleton = ({ count = 4 }) => (
  <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2" style={{ minHeight: '200px' }}>
    {[...Array(count)].map((_, i) => (
      <div key={i} className="flex-shrink-0 w-36 animate-pulse">
        <div className="bg-white rounded-xl overflow-hidden border-2 border-gray-100">
          <div className="aspect-square bg-gray-200" />
          <div className="p-2 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-2 bg-gray-200 rounded w-1/2" />
            <div className="h-3 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

// مكون Section Header
const SectionHeader = ({ icon: Icon, title, linkTo, linkColor = 'text-purple-600', iconBg = 'from-purple-500 to-pink-500' }) => (
  <div className="flex items-center justify-between mb-2">
    <div className="flex items-center gap-2">
      <div className={`p-1 bg-gradient-to-r ${iconBg} rounded-lg`}>
        <Icon size={14} className="text-white" />
      </div>
      <h2 className="text-sm font-bold text-gray-900">{title}</h2>
    </div>
    <Link 
      to={linkTo}
      className={`${linkColor} flex items-center gap-1 hover:gap-2 transition-all text-xs font-medium`}
    >
      عرض الكل
      <ChevronLeft size={14} />
    </Link>
  </div>
);

const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [ads, setAds] = useState([]);
  const [shopFlashProducts, setShopFlashProducts] = useState([]);
  const [shopFlashSale, setShopFlashSale] = useState(null);
  const [sponsoredProducts, setSponsoredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [globalFreeShipping, setGlobalFreeShipping] = useState(null);
  const [tickerMessages, setTickerMessages] = useState([]);
  const [tickerEnabled, setTickerEnabled] = useState(true);
  const [currentTickerIndex, setCurrentTickerIndex] = useState(0);
  const [badgeSettings, setBadgeSettings] = useState(null);
  const [extraProducts, setExtraProducts] = useState([]);
  const [freeShippingProducts, setFreeShippingProducts] = useState([]);
  const [bestSellers, setBestSellers] = useState([]);
  const [newlyAddedProducts, setNewlyAddedProducts] = useState([]);
  const [sectionsSettings, setSectionsSettings] = useState({
    sponsored_enabled: true,
    flash_sale_enabled: true,
    free_shipping_enabled: true,
    best_sellers_enabled: true,
    new_arrivals_enabled: true
  });
  const location = useLocation();
  const { isFeatureEnabled } = useSettings();
  const { signalContentReady, isNavigatingBack } = useScroll();
  
  // التحقق من تفعيل منصة الطعام
  const foodEnabled = isFeatureEnabled('food_enabled');

  // إشارة لاكتمال تحميل البيانات
  useLayoutEffect(() => {
    if (!loading && isNavigatingBack) {
      // تأخير قصير للسماح للـ DOM بالتحديث
      requestAnimationFrame(() => {
        signalContentReady();
      });
    }
  }, [loading, isNavigatingBack, signalContentReady]);

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-rotate ads
  useEffect(() => {
    if (ads.length > 1) {
      const timer = setInterval(() => {
        setCurrentAdIndex((prev) => (prev + 1) % ads.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [ads.length]);

  // Auto-rotate ticker messages
  useEffect(() => {
    if (tickerMessages.length > 1) {
      const timer = setInterval(() => {
        setCurrentTickerIndex((prev) => (prev + 1) % tickerMessages.length);
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [tickerMessages.length]);

  const fetchData = async () => {
    try {
      // التحقق من الكاش أولاً
      const cachedData = sessionStorage.getItem('homepage_cache');
      const cacheTimestamp = sessionStorage.getItem('homepage_cache_time');
      const cacheAge = cacheTimestamp ? Date.now() - parseInt(cacheTimestamp) : Infinity;
      
      // استخدام الكاش إذا كان أقل من 5 دقائق
      if (cachedData && cacheAge < 5 * 60 * 1000) {
        const data = JSON.parse(cachedData);
        applyHomepageData(data);
        setLoading(false);
        return;
      }
      
      // جلب البيانات من API الموحد
      const response = await axios.get(`${API}/products/homepage-data`);
      const data = response.data;
      
      // حفظ في الكاش
      sessionStorage.setItem('homepage_cache', JSON.stringify(data));
      sessionStorage.setItem('homepage_cache_time', Date.now().toString());
      
      applyHomepageData(data);
      
    } catch (error) {
      console.error('Error fetching homepage data:', error);
      // في حالة الخطأ، جرب الطريقة القديمة
      await fetchDataLegacy();
    } finally {
      setLoading(false);
    }
  };
  
  // تطبيق بيانات الصفحة الرئيسية
  const applyHomepageData = (data) => {
    setCategories(data.categories || []);
    setAds(data.ads || []);
    setSponsoredProducts(data.sponsored_products || []);
    setShopFlashSale(data.flash_sale);
    setShopFlashProducts(data.flash_products || []);
    setFreeShippingProducts(data.free_shipping_products || []);
    setBestSellers(data.best_sellers || []);
    setNewlyAddedProducts(data.new_arrivals || []);
    setExtraProducts(data.extra_products || []);
    setProducts(data.best_sellers || []);
    
    // الإعدادات
    if (data.settings) {
      setSectionsSettings(data.settings.sections || {
        sponsored_enabled: true,
        flash_sale_enabled: true,
        free_shipping_enabled: true,
        best_sellers_enabled: true,
        new_arrivals_enabled: true
      });
      
      if (data.settings.ticker) {
        setTickerMessages(data.settings.ticker.messages || []);
        setTickerEnabled(data.settings.ticker.is_enabled !== false);
      }
      
      if (data.settings.badge) {
        setBadgeSettings(data.settings.badge);
      }
      
      if (data.settings.free_shipping?.is_active) {
        setGlobalFreeShipping(data.settings.free_shipping);
      }
    }
  };
  
  // الطريقة القديمة كـ fallback
  const fetchDataLegacy = async () => {
    try {
      const [productsRes, categoriesRes, adsRes, shopFlashRes, sponsoredRes, promoRes, tickerRes, sectionsRes] = await Promise.all([
        axios.get(`${API}/products/featured`),
        axios.get(`${API}/categories`),
        axios.get(`${API}/ads/active`).catch(() => ({ data: [] })),
        axios.get(`${API}/products/flash-products`).catch(() => ({ data: { products: [], flash_sale: null } })),
        axios.get(`${API}/products/sponsored`).catch(() => ({ data: [] })),
        axios.get(`${API}/settings/global-free-shipping`).catch(() => ({ data: null })),
        axios.get(`${API}/settings/ticker-messages`).catch(() => ({ data: { messages: [], is_enabled: true } })),
        axios.get(`${API}/settings/homepage-sections`).catch(() => ({ data: {
          sponsored_enabled: true,
          flash_sale_enabled: true,
          free_shipping_enabled: true,
          best_sellers_enabled: true,
          new_arrivals_enabled: true
        }}))
      ]);
      setProducts(productsRes.data);
      setSectionsSettings(sectionsRes.data);
      setCategories(categoriesRes.data);
      setAds(adsRes.data || []);
      setShopFlashProducts(shopFlashRes.data?.products || []);
      setShopFlashSale(shopFlashRes.data?.flash_sale || null);
      setSponsoredProducts(sponsoredRes.data || []);
      
      setTickerMessages(tickerRes.data?.messages || []);
      setTickerEnabled(tickerRes.data?.is_enabled !== false);
      
      try {
        const badgeRes = await axios.get(`${API}/settings/product-badges`);
        setBadgeSettings(badgeRes.data);
      } catch (err) {}
      
      try {
        const extraRes = await axios.get(`${API}/products?limit=20&skip=0`);
        setExtraProducts(extraRes.data?.products || extraRes.data || []);
      } catch (err) {}
      
      try {
        const settingsRes = await axios.get(`${API}/settings/public`).catch(() => ({ data: { free_shipping_threshold: 150000 } }));
        const threshold = settingsRes.data?.free_shipping_threshold || 150000;
        const freeShipRes = await axios.get(`${API}/products?price_min=${threshold}&limit=10`);
        const freeShipProducts = freeShipRes.data?.products || freeShipRes.data || [];
        setFreeShippingProducts(freeShipProducts.slice(0, 10));
      } catch (err) {}
      
      try {
        const bestSellersRes = await axios.get(`${API}/products/best-sellers`);
        setBestSellers(bestSellersRes.data || []);
      } catch (err) {}
      
      try {
        const newlyAddedRes = await axios.get(`${API}/products/newly-added`);
        setNewlyAddedProducts(newlyAddedRes.data || []);
      } catch (err) {}
      
      const promo = promoRes.data;
      if (promo?.is_active && ['all', 'products'].includes(promo.applies_to)) {
        setGlobalFreeShipping(promo);
      } else {
        setGlobalFreeShipping(null);
      }
    } catch (error) {
      console.error('Error in legacy fetch:', error);
    }
  };

  // Seed data on first load
  useEffect(() => {
    const seedData = async () => {
      try {
        await axios.post(`${API}/seed`);
        fetchData();
      } catch (error) {
        // Ignore if already seeded
      }
    };
    seedData();
  }, []);

  return (
    <div className="min-h-screen pb-20 md:pb-0 bg-[#FAFAFA]">
      {/* 🎯 شريط العروض المتحرك - Offers Ticker (عمودي) */}
      {tickerEnabled && tickerMessages.length > 0 && (
        <div className={`text-white overflow-hidden transition-all duration-500 ${
          ['bg-gradient-to-r from-blue-500 via-blue-600 to-blue-500',
           'bg-gradient-to-r from-emerald-500 via-emerald-600 to-emerald-500',
           'bg-gradient-to-r from-violet-500 via-violet-600 to-violet-500',
           'bg-gradient-to-r from-rose-800 via-rose-900 to-rose-800'
          ][currentTickerIndex % 4]
        }`}>
          <div className="ticker-wrapper">
            {tickerMessages.map((msg, i) => (
              <div 
                key={i} 
                className={`ticker-item transition-all duration-500 ease-in-out ${
                  currentTickerIndex === i 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 -translate-y-full'
                }`}
              >
                <span className="flex items-center gap-1.5 md:gap-2 text-[11px] md:text-sm font-medium">
                  {msg.highlight && <span className="bg-white/20 px-1.5 md:px-2 py-0.5 rounded-full text-[9px] md:text-xs">حصري</span>}
                  {msg.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🎁 بانر الشحن المجاني الشامل */}
      {globalFreeShipping && (
        <FreeShippingBanner promo={globalFreeShipping} />
      )}

      {/* Categories - Horizontal Scroll */}
      <section className="py-1.5">
        <div className="max-w-7xl mx-auto px-3">
          <div className="flex items-center justify-between mb-1.5">
            <h2 className="section-title text-sm font-bold text-gray-900">الأصناف</h2>
            <Link 
              to="/categories" 
              className="text-[#FF6B00] flex items-center gap-1 hover:gap-2 transition-all text-xs font-medium" 
              data-testid="view-all-categories"
            >
              عرض الكل
              <ChevronLeft size={14} />
            </Link>
          </div>
          
          <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
            {categories
              .filter(cat => foodEnabled || cat.type !== 'food')
              .map((cat, i) => {
              const IconComponent = iconMap[cat.icon] || Smartphone;
              const isFood = cat.type === 'food';
              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.03 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="flex-shrink-0"
                >
                  <Link
                    to={isFood ? `/food?category=${cat.id}` : `/products?category=${cat.id}`}
                    className="category-item flex flex-col items-center gap-1 w-[56px]"
                    data-testid={`category-${cat.id}`}
                  >
                    <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center border-2 transition-all duration-300 group shadow-sm ${
                      isFood 
                        ? 'border-green-200 hover:border-green-500 hover:bg-green-500 hover:text-white text-green-600' 
                        : 'border-gray-100 hover:border-[#FF6B00] hover:bg-[#FF6B00] hover:text-white'
                    }`}>
                      <IconComponent size={18} className="group-hover:scale-110 transition-transform" />
                    </div>
                    <span className={`text-[9px] font-medium text-center leading-tight ${isFood ? 'text-green-600' : 'text-gray-600'}`}>{cat.name}</span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* بانر الطعام الثابت مع تأثير النبض بألوان مختلفة */}
      {foodEnabled && (
        <div className="h-14 md:h-16">
          <Link to="/food" className="block h-full">
            <motion.div 
              className="relative h-full"
              animate={{
                background: [
                  'linear-gradient(to right, #E65100, #F57C00, #FF9800)',
                  'linear-gradient(to right, #AD1457, #C2185B, #D81B60)',
                  'linear-gradient(to right, #6A1B9A, #7B1FA2, #8E24AA)',
                  'linear-gradient(to right, #B71C1C, #C62828, #D32F2F)',
                  'linear-gradient(to right, #FF6F00, #FF8F00, #FFA000)',
                  'linear-gradient(to right, #D84315, #E64A19, #F4511E)',
                  'linear-gradient(to right, #E65100, #F57C00, #FF9800)',
                ]
              }}
              transition={{
                duration: 6,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            >
              {/* خلفية مزخرفة */}
              <div className="absolute inset-0 opacity-15">
                <div className="absolute top-1 right-8 text-2xl">🍕</div>
                <div className="absolute bottom-1 left-10 text-xl">🍔</div>
                <div className="absolute top-2 left-1/4 text-lg">🌮</div>
              </div>
              
              {/* المحتوى */}
              <div className="relative h-full flex items-center justify-between px-3 md:px-4 max-w-7xl mx-auto">
                <div className="text-white" style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <motion.span 
                      className="bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full text-[9px] font-bold"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      جديد ✨
                    </motion.span>
                  </div>
                  <h3 className="text-sm md:text-base font-bold">قسم الطعام</h3>
                  <p className="text-white text-[10px] md:text-xs font-medium">توصيل سريع من أفضل المطاعم</p>
                </div>
                
                {/* زر الطلب مع نبض */}
                <motion.div 
                  className="bg-white px-2.5 py-1 rounded-full font-bold text-[10px] shadow-lg"
                  animate={{ 
                    scale: [1, 1.05, 1],
                    color: ['#E65100', '#AD1457', '#6A1B9A', '#B71C1C', '#FF6F00', '#D84315', '#E65100']
                  }}
                  transition={{ duration: 6, repeat: Infinity }}
                >
                  اطلب الآن
                </motion.div>
              </div>
            </motion.div>
          </Link>
        </div>
      )}

      {/* Daily Deal - صفقة اليوم */}
      <DailyDeal />

      {/* 1. Sponsored Products - مروّج */}
      {sectionsSettings.sponsored_enabled && (
      <section className="py-1.5" style={{ minHeight: '240px' }}>
        <div className="max-w-7xl mx-auto px-3">
          <SectionHeader 
            icon={Star} 
            title="إعلانات مميزة" 
            linkTo="/products/sponsored"
            linkColor="text-purple-600"
            iconBg="from-purple-500 to-pink-500"
          />
          
          {/* Sponsored Products Horizontal Scroll */}
          <div className="relative" style={{ minHeight: '200px' }}>
            {loading ? (
              <ProductSkeleton count={4} />
            ) : sponsoredProducts.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                {sponsoredProducts.map((product, i) => (
                  <div key={product.id} className="flex-shrink-0 w-36">
                    <Link to={`/products/${product.id}`}>
                      <div className="bg-white rounded-xl overflow-hidden border-2 border-purple-100 hover:border-purple-300 transition-all shadow-sm hover:shadow-md">
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
                          {/* Sponsored Badge */}
                          <div className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                            إعلان
                          </div>
                          {/* شارة التوصيل */}
                          <SmallProductBadge product={product} badgeSettings={badgeSettings} />
                        </div>
                        <div className="p-2">
                          <h3 className="font-medium text-sm text-gray-900 truncate">{product.name}</h3>
                          {product.city && (
                            <div className="flex items-center gap-1 text-gray-500 mt-0.5">
                              <MapPin size={10} className="text-purple-500" />
                              <span className="text-[10px]">{product.city}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-purple-600 font-bold text-sm">
                              {product.price?.toLocaleString()} ل.س
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2" style={{ minHeight: '200px' }}>
                <p className="text-gray-400 text-sm text-center py-4 w-full">لا توجد منتجات مروّجة حالياً</p>
              </div>
            )}
          </div>
        </div>
      </section>
      )}

      {/* 2. Flash Sale Products - عروض فلاش */}
      {sectionsSettings.flash_sale_enabled && (
      <section className="py-1.5" style={{ minHeight: '240px' }}>
        <div className="max-w-7xl mx-auto px-3">
          <SectionHeader 
            icon={Zap} 
            title="عروض فلاش" 
            linkTo="/products/flash-sale"
            linkColor="text-orange-600"
            iconBg="from-orange-500 to-red-500"
          />
          
          {/* Flash Products Horizontal Scroll */}
          <div className="relative" style={{ minHeight: '200px' }}>
            {loading ? (
              <ProductSkeleton count={4} />
            ) : shopFlashProducts.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                {shopFlashProducts.map((product, i) => (
                  <div key={product.id} className="flex-shrink-0 w-36">
                    <Link to={`/products/${product.id}`}>
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
                          {/* Discount Badge */}
                          <div className="absolute top-2 right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                            -{product.flash_discount}%
                          </div>
                          {/* شارة التوصيل */}
                          <SmallProductBadge product={product} badgeSettings={badgeSettings} />
                        </div>
                        <div className="p-2">
                          <h3 className="font-medium text-sm text-gray-900 truncate">{product.name}</h3>
                          {product.city && (
                            <div className="flex items-center gap-1 text-gray-500 mt-0.5">
                              <MapPin size={10} className="text-orange-500" />
                              <span className="text-[10px]">{product.city}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-orange-600 font-bold text-sm">
                              {product.flash_price?.toLocaleString()}
                            </span>
                            <span className="text-gray-400 text-xs line-through">
                              {product.price?.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2" style={{ minHeight: '200px' }}>
                <p className="text-gray-400 text-sm text-center py-4 w-full">لا توجد عروض فلاش حالياً</p>
              </div>
            )}
          </div>
        </div>
      </section>
      )}

      {/* 3. 🚚 شحن مجاني - منتجات تستحق شحن مجاني */}
      {sectionsSettings.free_shipping_enabled && freeShippingProducts.length > 0 && (
        <section className="py-1.5" style={{ minHeight: '240px' }}>
          <div className="max-w-7xl mx-auto px-3">
            <SectionHeader 
              icon={Truck} 
              title="شحن مجاني" 
              linkTo="/products/free-shipping"
              linkColor="text-green-600"
              iconBg="from-green-500 to-emerald-500"
            />
            
            <div className="relative" style={{ minHeight: '200px' }}>
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                {freeShippingProducts.map((product, i) => (
                  <div key={product.id} className="flex-shrink-0 w-36">
                    <Link to={`/products/${product.id}`}>
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
                          {/* شارة شحن مجاني */}
                          <div className="absolute top-2 right-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                            <Truck size={10} />
                            شحن مجاني
                          </div>
                          {/* شارة التوصيل */}
                          <SmallProductBadge product={product} badgeSettings={badgeSettings} />
                        </div>
                        <div className="p-2">
                          <h3 className="font-medium text-sm text-gray-900 truncate">{product.name}</h3>
                          {product.city && (
                            <div className="flex items-center gap-1 text-gray-500 mt-0.5">
                              <MapPin size={10} className="text-green-500" />
                              <span className="text-[10px]">{product.city}</span>
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
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 4. 🔥 الأكثر مبيعاً */}
      {sectionsSettings.best_sellers_enabled && bestSellers.length > 0 && (
        <section className="py-1.5" style={{ minHeight: '240px' }}>
          <div className="max-w-7xl mx-auto px-3">
            <SectionHeader 
              icon={TrendingUp} 
              title="الأكثر مبيعاً" 
              linkTo="/products/best-sellers"
              linkColor="text-red-600"
              iconBg="from-red-500 to-pink-500"
            />
            
            <div className="relative" style={{ minHeight: '200px' }}>
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                {bestSellers.slice(0, 10).map((product, i) => (
                  <div key={product.id} className="flex-shrink-0 w-36">
                    <Link to={`/products/${product.id}`}>
                      <div className="bg-white rounded-xl overflow-hidden border-2 border-red-100 hover:border-red-300 transition-all shadow-sm hover:shadow-md">
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
                          {/* شارة المبيعات */}
                          <div className="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                            <TrendingUp size={10} />
                            {product.sales_count || 0} مبيع
                          </div>
                          <SmallProductBadge product={product} badgeSettings={badgeSettings} />
                        </div>
                        <div className="p-2">
                          <h3 className="font-medium text-sm text-gray-900 truncate">{product.name}</h3>
                          {product.city && (
                            <div className="flex items-center gap-1 text-gray-500 mt-0.5">
                              <MapPin size={10} className="text-red-500" />
                              <span className="text-[10px]">{product.city}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-red-600 font-bold text-sm">
                              {product.price?.toLocaleString()} ل.س
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 5. 🆕 منتجات جديدة */}
      {sectionsSettings.new_arrivals_enabled && newlyAddedProducts.length > 0 && (
        <section className="py-1.5" style={{ minHeight: '240px' }}>
          <div className="max-w-7xl mx-auto px-3">
            <SectionHeader 
              icon={Sparkles} 
              title="منتجات جديدة" 
              linkTo="/products/new-arrivals"
              linkColor="text-blue-600"
              iconBg="from-blue-500 to-cyan-500"
            />
            
            <div className="relative" style={{ minHeight: '200px' }}>
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                {newlyAddedProducts.slice(0, 10).map((product, i) => (
                  <div key={product.id} className="flex-shrink-0 w-36">
                    <Link to={`/products/${product.id}`}>
                      <div className="bg-white rounded-xl overflow-hidden border-2 border-blue-100 hover:border-blue-300 transition-all shadow-sm hover:shadow-md">
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
                          {/* شارة جديد */}
                          <div className="absolute top-2 right-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                            <Sparkles size={10} />
                            جديد
                          </div>
                          <SmallProductBadge product={product} badgeSettings={badgeSettings} />
                        </div>
                        <div className="p-2">
                          <h3 className="font-medium text-sm text-gray-900 truncate">{product.name}</h3>
                          {product.city && (
                            <div className="flex items-center gap-1 text-gray-500 mt-0.5">
                              <MapPin size={10} className="text-blue-500" />
                              <span className="text-[10px]">{product.city}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-blue-600 font-bold text-sm">
                              {product.price?.toLocaleString()} ل.س
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 6. قسم منتجات إضافية - شبكة عادية مع شارات */}
      {extraProducts.length > 0 && (
        <section className="py-4 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            <SectionHeader 
              icon={Package}
              title="المزيد من المنتجات" 
              linkTo="/category/all"
              linkColor="text-[#FF6B00]"
              iconBg="from-[#FF6B00] to-[#FF8C00]"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-3">
              {extraProducts.slice(0, 20).map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  badgeSettings={badgeSettings}
                />
              ))}
            </div>
            
            {/* زر عرض المزيد */}
            <div className="text-center mt-4">
              <Link 
                to="/category/all"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white font-bold px-6 py-2.5 rounded-full hover:shadow-lg transition-all"
              >
                عرض جميع المنتجات
                <ChevronLeft size={18} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA Banner - Modern Style */}
      <section className="py-6">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-[#FF6B00] via-[#FF7B1C] to-[#FF8C00] p-6 md:p-10"
          >
            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-60 h-60 bg-black/5 rounded-full translate-x-1/3 translate-y-1/3" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-right">
                <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1 mb-3">
                  <Package size={14} className="text-white" />
                  <span className="text-white/90 text-xs font-medium">انضم لأكثر من 500 بائع</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-extrabold mb-2 text-white">
                  هل أنت بائع؟
                </h3>
                <p className="text-white/85 text-sm md:text-base max-w-md">
                  ابدأ ببيع منتجاتك لآلاف العملاء في جميع أنحاء سورية
                </p>
              </div>
              <Link
                to="/register?type=seller"
                className="inline-flex items-center gap-2 bg-white text-[#FF6B00] font-bold px-6 py-3 rounded-full hover:bg-gray-50 hover:shadow-lg transition-all group"
                data-testid="become-seller-btn"
              >
                سجل كبائع مجاناً
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="bg-white border-t border-gray-100 py-6 mt-4">
        <div className="max-w-7xl mx-auto px-4">
          {/* Logo and Description */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              <span className="text-[#FF6B00]">ترند</span> سورية
            </h3>
            <p className="text-gray-500 text-sm">منصة التسوق والتوصيل الأولى في سوريا</p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            <Link to="/about" className="text-gray-600 hover:text-[#FF6B00] text-sm transition-colors">
              من نحن
            </Link>
            <span className="text-gray-300">|</span>
            <Link to="/privacy" className="text-gray-600 hover:text-[#FF6B00] text-sm transition-colors">
              سياسة الخصوصية
            </Link>
            <span className="text-gray-300">|</span>
            <Link to="/terms" className="text-gray-600 hover:text-[#FF6B00] text-sm transition-colors">
              شروط الاستخدام
            </Link>
            <span className="text-gray-300">|</span>
            <Link to="/returns" className="text-gray-600 hover:text-[#FF6B00] text-sm transition-colors">
              سياسة الإرجاع
            </Link>
          </div>

          {/* Contact Info */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500 mb-4">
            <a href="mailto:trendsyria.app@gmail.com" className="hover:text-[#FF6B00] transition-colors">
              trendsyria.app@gmail.com
            </a>
            <span className="hidden sm:inline">•</span>
            <span>حلب، سوريا</span>
          </div>

          {/* Copyright */}
          <div className="text-center text-gray-400 text-xs">
            © 2025 ترند سورية. جميع الحقوق محفوظة.
          </div>
        </div>
      </footer>
    </div>
  );
};

// Flash Countdown Component
const FlashCountdown = ({ endTime, color = 'orange' }) => {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const end = new Date(endTime).getTime();
      const now = new Date().getTime();
      const difference = end - now;

      if (difference <= 0) return;

      setTimeLeft({
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  const gradients = {
    orange: 'from-orange-500 to-red-500',
    green: 'from-green-500 to-emerald-500',
    purple: 'from-purple-500 to-pink-500'
  };

  return (
    <div className={`flex items-center gap-1 bg-gradient-to-r ${gradients[color]} text-white px-2 py-1 rounded-lg`}>
      <span className="text-xs">ينتهي خلال</span>
      <div className="flex gap-0.5 font-mono font-bold text-sm">
        <span className="bg-white/20 px-1 rounded">{String(timeLeft.hours).padStart(2, '0')}</span>
        <span>:</span>
        <span className="bg-white/20 px-1 rounded">{String(timeLeft.minutes).padStart(2, '0')}</span>
        <span>:</span>
        <span className="bg-white/20 px-1 rounded">{String(timeLeft.seconds).padStart(2, '0')}</span>
      </div>
    </div>
  );
};

// مكون الشارة الصغيرة للبطاقات المصغرة - مع حركة slide-up
const SmallProductBadge = ({ product, badgeSettings }) => {
  const [badgeText, setBadgeText] = useState(null);
  const [colorIndex, setColorIndex] = useState(0);
  const [badgeMessages, setBadgeMessages] = useState([]);
  
  const bgColors = [
    'from-blue-500 to-blue-600',
    'from-emerald-500 to-emerald-600',
    'from-violet-500 to-violet-600',
    'from-rose-600 to-rose-700'
  ];

  useEffect(() => {
    if (!badgeSettings?.enabled || !badgeSettings?.badge_types) {
      setBadgeText(null);
      setBadgeMessages([]);
      return;
    }
    
    const { badge_types } = badgeSettings;
    const price = product.flash_price || product.price || 0;
    
    // الأولوية: الأكثر مبيعاً > الأكثر زيارة > شحن مجاني
    if (badge_types.best_seller?.enabled && (product.sales_count || 0) >= (badge_types.best_seller.min_sales || 10)) {
      setBadgeMessages(['🔥 الأكثر مبيعاً']);
      setColorIndex(3);
    } else if (badge_types.most_viewed?.enabled && (product.views || 0) >= (badge_types.most_viewed.min_views || 100)) {
      setBadgeMessages(['👁️ رائج']);
      setColorIndex(2);
    } else if (badge_types.free_shipping?.enabled) {
      const threshold = badge_types.free_shipping.threshold || 30000;
      
      if (price >= threshold) {
        setBadgeMessages(['🚚 شحن مجاني']);
        setColorIndex(1);
      } else {
        const unitsNeeded = Math.ceil(threshold / price);
        if (unitsNeeded >= 2 && unitsNeeded <= 3) {
          setBadgeMessages([
            `✨ ${unitsNeeded} = شحن مجاني`,
            `🛒 ${unitsNeeded} قطع = توصيل`,
            `📦 وفّر بـ ${unitsNeeded} قطع`
          ]);
          setColorIndex(0);
        } else {
          setBadgeMessages([]);
        }
      }
    } else {
      setBadgeMessages([]);
    }
  }, [product, badgeSettings]);

  // دوران الشارة والألوان
  useEffect(() => {
    if (badgeMessages.length === 0) return;
    
    const interval = setInterval(() => {
      setColorIndex((prev) => (prev + 1) % bgColors.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [badgeMessages.length]);

  // تحديث النص المعروض
  useEffect(() => {
    if (badgeMessages.length > 0) {
      setBadgeText(badgeMessages[colorIndex % badgeMessages.length]);
    } else {
      setBadgeText(null);
    }
  }, [colorIndex, badgeMessages]);

  if (!badgeText) return null;

  return (
    <div className="absolute bottom-1 left-1 overflow-hidden h-5">
      <AnimatePresence mode="wait">
        <motion.div
          key={colorIndex}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`bg-gradient-to-r ${bgColors[colorIndex % bgColors.length]} text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-md`}
        >
          {badgeText}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default HomePage;
