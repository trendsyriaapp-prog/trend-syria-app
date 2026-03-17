import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  ArrowLeft, Smartphone, Shirt, 
  Home as HomeIcon, Dumbbell, BookOpen, Gamepad2, 
  UtensilsCrossed, SprayCan, ChevronLeft, TrendingUp,
  Package, Star, ShoppingBasket, Apple, Zap, ChevronRight,
  Pill, Car, MapPin, Watch, Gift, Sparkles, Laptop, Footprints,
  Sofa, Refrigerator, Coffee, Cake, Croissant, GlassWater
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import FeaturedProducts from '../components/FeaturedProducts';
import DailyDeal from '../components/DailyDeal';
import RecommendedProducts from '../components/RecommendedProducts';
import FreeShippingBanner from '../components/FreeShippingBanner';
import { useScroll } from '../context/ScrollContext';
import { useSettings } from '../context/SettingsContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const iconMap = {
  Smartphone, Shirt, Home: HomeIcon, Dumbbell, 
  BookOpen, Gamepad2, UtensilsCrossed, SprayCan,
  ShoppingBasket, Apple, Pill, Car, Watch, Gift, Sparkles,
  Laptop, Footprints, Sofa, Refrigerator, Coffee, Cake, Croissant, GlassWater
};

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
  const location = useLocation();
  const { restoreScrollPosition } = useScroll();
  const { isFeatureEnabled } = useSettings();
  
  // التحقق من تفعيل منصة الطعام
  const foodEnabled = isFeatureEnabled('food_enabled');

  // استعادة موقع التمرير عند العودة للصفحة بعد تحميل البيانات
  useEffect(() => {
    if (!loading) {
      // تأخير لضمان تحميل المحتوى بالكامل
      const timer = setTimeout(() => {
        restoreScrollPosition(location.pathname);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [loading, location.pathname, restoreScrollPosition]);

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
      const [productsRes, categoriesRes, adsRes, shopFlashRes, sponsoredRes, promoRes, tickerRes] = await Promise.all([
        axios.get(`${API}/products/featured`),
        axios.get(`${API}/categories`),
        axios.get(`${API}/ads/active`).catch(() => ({ data: [] })),
        axios.get(`${API}/products/flash-products`).catch(() => ({ data: { products: [], flash_sale: null } })),
        axios.get(`${API}/products/sponsored`).catch(() => ({ data: [] })),
        axios.get(`${API}/settings/global-free-shipping`).catch(() => ({ data: null })),
        axios.get(`${API}/settings/ticker-messages`).catch(() => ({ data: { messages: [], is_enabled: true } }))
      ]);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
      setAds(adsRes.data || []);
      setShopFlashProducts(shopFlashRes.data?.products || []);
      setShopFlashSale(shopFlashRes.data?.flash_sale || null);
      setSponsoredProducts(sponsoredRes.data || []);
      
      // شريط العروض
      setTickerMessages(tickerRes.data?.messages || []);
      setTickerEnabled(tickerRes.data?.is_enabled !== false);
      
      // تعيين عرض الشحن المجاني إذا كان مفعلاً ويشمل المنتجات
      const promo = promoRes.data;
      if (promo?.is_active && ['all', 'products'].includes(promo.applies_to)) {
        setGlobalFreeShipping(promo);
      } else {
        setGlobalFreeShipping(null);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
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

      {/* Ads Banner Carousel */}
      {ads.length > 0 && (
        <div className="relative overflow-hidden h-14 md:h-16">
          {ads.map((ad, index) => (
            <motion.div
              key={index}
              className="absolute inset-0"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ 
                y: currentAdIndex === index ? 0 : '-100%',
                opacity: currentAdIndex === index ? 1 : 0
              }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
              <Link to={ad?.link || '#'} className="block h-full">
                {/* تصميم بانر الطعام الجديد */}
                {ad?.link === '/food' ? (
                  <div className="relative h-full bg-gradient-to-r from-[#FF6B00] via-[#FF8C00] to-[#FFB347]">
                    {/* خلفية مزخرفة */}
                    <div className="absolute inset-0 opacity-15">
                      <div className="absolute top-1 right-8 text-2xl">🍕</div>
                      <div className="absolute bottom-1 left-10 text-xl">🍔</div>
                      <div className="absolute top-2 left-1/4 text-lg">🌮</div>
                    </div>
                    
                    {/* المحتوى */}
                    <div className="relative h-full flex items-center justify-between px-3 md:px-4 max-w-7xl mx-auto">
                      <div className="text-white">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded-full text-[8px] font-medium">
                            جديد ✨
                          </span>
                        </div>
                        <h3 className="text-xs md:text-sm font-bold">قسم الطعام</h3>
                        <p className="text-white/90 text-[9px] md:text-[10px]">توصيل سريع من أفضل المطاعم</p>
                      </div>
                      
                      {/* زر الطلب */}
                      <div className="bg-white text-[#FF6B00] px-2.5 py-1 rounded-full font-bold text-[10px] shadow-md">
                        اطلب الآن
                      </div>
                    </div>
                  </div>
                ) : (
                  /* البانرات الأخرى */
                  <div 
                    className="relative h-full"
                    style={{ backgroundColor: ad?.background_color || '#FF6B00' }}
                  >
                    {ad?.image ? (
                      <img 
                        src={ad.image} 
                        alt={ad.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center px-4">
                        <div className="text-center text-white">
                          <h3 className="text-xs md:text-sm font-bold">{ad?.title}</h3>
                          {ad?.description && (
                            <p className="text-[10px] opacity-90 mt-0.5">{ad.description}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Link>
            </motion.div>
          ))}
              
              {/* Dots indicator */}
              {ads.length > 1 && (
                <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
                  {ads.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentAdIndex(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        i === currentAdIndex ? 'bg-white w-3' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
      )}

      {/* Daily Deal - صفقة اليوم */}
      <DailyDeal />

      {/* 1. Sponsored Products - المنتجات المُعلن عنها */}
      {sponsoredProducts.length > 0 && (
        <section className="py-1.5">
          <div className="max-w-7xl mx-auto px-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                  <Star size={14} className="text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">منتجات مُعلن عنها</h2>
                </div>
              </div>
              <Link 
                to="/products"
                className="text-purple-600 flex items-center gap-1 hover:gap-2 transition-all text-xs font-medium"
              >
                عرض الكل
                <ChevronLeft size={14} />
              </Link>
            </div>
            
            {/* Sponsored Products Horizontal Scroll */}
            <div className="relative">
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                {sponsoredProducts.map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex-shrink-0 w-36"
                  >
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
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. Flash Sale Products - عروض فلاش */}
      {shopFlashProducts.length > 0 && shopFlashSale && (
        <section className="py-1.5">
          <div className="max-w-7xl mx-auto px-3">
            {/* Flash Sale Header with Countdown */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg">
                  <Zap size={14} className="text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">عروض فلاش</h2>
                </div>
              </div>
              <FlashCountdown endTime={shopFlashSale.end_time} color="orange" />
            </div>
            
            {/* Flash Products Horizontal Scroll */}
            <div className="relative">
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                {shopFlashProducts.map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex-shrink-0 w-36"
                  >
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
                  </motion.div>
                ))}
              </div>
              
              {/* View All Arrow */}
              <Link 
                to="/products"
                className="absolute left-0 top-1/2 -translate-y-1/2 bg-white shadow-lg rounded-full p-2 hover:bg-orange-50 transition-colors"
              >
                <ChevronLeft size={20} className="text-orange-500" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* 3. قسم التوصيات الذكية */}
      <section className="py-1.5 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto">
          <RecommendedProducts />
        </div>
      </section>

      {/* 4. المنتجات الرائجة */}
      <section className="py-1.5">
        <div className="max-w-7xl mx-auto px-3">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-[#FF6B00]/10 rounded-lg">
                <TrendingUp size={14} className="text-[#FF6B00]" />
              </div>
              <h2 className="text-sm font-bold text-gray-900">المنتجات الرائجة</h2>
            </div>
            <Link 
              to="/products" 
              className="text-[#FF6B00] flex items-center gap-1 hover:gap-2 transition-all text-xs font-medium" 
              data-testid="view-all-products"
            >
              عرض الكل
              <ChevronLeft size={14} />
            </Link>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                  <div className="aspect-[4/5] shimmer" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 shimmer rounded w-full" />
                    <div className="h-3 shimmer rounded w-2/3" />
                    <div className="h-5 shimmer rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
              {products.map((product, i) => (
                <motion.div 
                  key={product.id} 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

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

export default HomePage;
