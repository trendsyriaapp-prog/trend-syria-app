import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Truck, Shield, CreditCard, ArrowLeft, Smartphone, Shirt, 
  Home as HomeIcon, Sparkles, Dumbbell, BookOpen, Gamepad2, 
  UtensilsCrossed, Heart, SprayCan, ChevronLeft, TrendingUp,
  Package, Clock, Star, ShoppingBasket, Apple, Zap, ChevronRight
} from 'lucide-react';
import ProductCard from '../components/ProductCard';
import FeaturedProducts from '../components/FeaturedProducts';
import DailyDeal from '../components/DailyDeal';
import RecommendedProducts from '../components/RecommendedProducts';
import { useScroll } from '../context/ScrollContext';
import { useSettings } from '../context/SettingsContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const iconMap = {
  Smartphone, Shirt, Home: HomeIcon, Sparkles, Dumbbell, 
  BookOpen, Gamepad2, UtensilsCrossed, Heart, SprayCan,
  ShoppingBasket, Apple
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

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes, adsRes, shopFlashRes, sponsoredRes] = await Promise.all([
        axios.get(`${API}/products/featured`),
        axios.get(`${API}/categories`),
        axios.get(`${API}/ads/active`).catch(() => ({ data: [] })),
        axios.get(`${API}/products/flash-products`).catch(() => ({ data: { products: [], flash_sale: null } })),
        axios.get(`${API}/products/sponsored`).catch(() => ({ data: [] }))
      ]);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
      setAds(adsRes.data || []);
      setShopFlashProducts(shopFlashRes.data?.products || []);
      setShopFlashSale(shopFlashRes.data?.flash_sale || null);
      setSponsoredProducts(sponsoredRes.data || []);
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
      {/* Hero Section - Compact */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#FF6B00]/8 via-[#FF6B00]/5 to-transparent">
        <div className="max-w-7xl mx-auto px-4 py-2 md:py-3">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-2"
          >
            <h1 className="text-2xl md:text-3xl font-extrabold mb-3 text-gray-900 tracking-tight">
              تريند <span className="text-[#FF6B00] relative inline-block">
                سورية
                <svg className="absolute -bottom-1 left-0 right-0 w-full h-1" viewBox="0 0 100 8">
                  <path d="M0 6 Q50 0 100 6" stroke="#FF6B00" strokeWidth="2" fill="none" strokeLinecap="round"/>
                </svg>
              </span>
            </h1>
            <p className="text-gray-500 text-xs md:text-sm max-w-xl mx-auto mt-1">
              منصة التسوق الأولى في سورية - توصيل مجاني داخل المحافظات
            </p>
          </motion.div>
          
          {/* Features - Compact Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { icon: Truck, text: 'توصيل مجاني', color: 'bg-emerald-50 text-emerald-600' },
              { icon: Shield, text: 'ضمان الجودة', color: 'bg-blue-50 text-blue-600' },
              { icon: CreditCard, text: 'دفع آمن', color: 'bg-purple-50 text-purple-600' },
              { icon: Clock, text: 'دعم 24/7', color: 'bg-amber-50 text-amber-600' },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ scale: 1.02, y: -2 }}
                className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-default"
              >
                <div className={`p-2 rounded-lg ${feature.color}`}>
                  <feature.icon size={16} />
                </div>
                <span className="font-semibold text-xs text-gray-700">{feature.text}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories - Horizontal Scroll */}
      <section className="py-2">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="section-title text-base font-bold text-gray-900">الأصناف</h2>
            <Link 
              to="/categories" 
              className="text-[#FF6B00] flex items-center gap-1 hover:gap-2 transition-all text-sm font-medium" 
              data-testid="view-all-categories"
            >
              عرض الكل
              <ChevronLeft size={16} />
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
        <section className="py-2">
          <div className="max-w-7xl mx-auto px-4">
            <div className="relative overflow-hidden rounded-2xl">
              <motion.div
                key={currentAdIndex}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                <Link to={ads[currentAdIndex]?.link || '#'}>
                  {/* تصميم بانر الطعام الجديد */}
                  {ads[currentAdIndex]?.link === '/food' ? (
                    <div className="relative h-24 md:h-28 rounded-2xl overflow-hidden bg-gradient-to-r from-[#FF6B00] via-[#FF8C00] to-[#FFB347]">
                      {/* خلفية مزخرفة */}
                      <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-2 right-4 text-6xl">🍕</div>
                        <div className="absolute bottom-2 left-8 text-4xl">🍔</div>
                        <div className="absolute top-4 left-1/3 text-3xl">🌮</div>
                        <div className="absolute bottom-4 right-1/4 text-3xl">🍜</div>
                      </div>
                      
                      {/* المحتوى */}
                      <div className="relative h-full flex items-center justify-between px-4 md:px-6">
                        <div className="text-white">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full text-[10px] font-medium">
                              جديد ✨
                            </span>
                          </div>
                          <h3 className="text-lg md:text-xl font-bold mb-0.5">قسم الطعام</h3>
                          <p className="text-white/90 text-xs md:text-sm">توصيل سريع من أفضل المطاعم</p>
                        </div>
                        
                        {/* زر الطلب */}
                        <div className="flex flex-col items-center gap-1">
                          <div className="bg-white text-[#FF6B00] px-4 py-2 rounded-full font-bold text-sm shadow-lg hover:shadow-xl transition-shadow">
                            اطلب الآن
                          </div>
                          <span className="text-white/80 text-[10px]">🚴 توصيل 30 دقيقة</span>
                        </div>
                      </div>
                      
                      {/* تأثير لامع */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 animate-pulse"></div>
                    </div>
                  ) : (
                    /* البانرات الأخرى */
                    <div 
                      className="relative h-16 md:h-20 rounded-2xl overflow-hidden"
                      style={{ backgroundColor: ads[currentAdIndex]?.background_color || '#FF6B00' }}
                    >
                      {ads[currentAdIndex]?.image ? (
                        <img 
                          src={ads[currentAdIndex].image} 
                          alt={ads[currentAdIndex].title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center px-4">
                          <div className="text-center text-white">
                            <h3 className="text-sm md:text-base font-bold">{ads[currentAdIndex]?.title}</h3>
                            {ads[currentAdIndex]?.description && (
                              <p className="text-xs opacity-90 mt-0.5">{ads[currentAdIndex].description}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Link>
              </motion.div>
              
              {/* Dots indicator */}
              {ads.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {ads.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentAdIndex(i)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        i === currentAdIndex ? 'bg-white w-4' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Daily Deal - صفقة اليوم */}
      <DailyDeal />

      {/* Flash Sale Products - Shop */}
      {shopFlashProducts.length > 0 && shopFlashSale && (
        <section className="py-3">
          <div className="max-w-7xl mx-auto px-4">
            {/* Flash Sale Header with Countdown */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg">
                  <Zap size={16} className="text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">عروض فلاش</h2>
                  <p className="text-xs text-gray-500">{shopFlashSale.name}</p>
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
                    <Link to={`/product/${product.id}`}>
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

      {/* Sponsored Products - المنتجات المُعلن عنها */}
      {sponsoredProducts.length > 0 && (
        <section className="py-3">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                  <Star size={16} className="text-white" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">منتجات مُعلن عنها</h2>
                  <p className="text-xs text-gray-500">إعلانات مميزة</p>
                </div>
              </div>
              <Link 
                to="/products"
                className="text-purple-600 flex items-center gap-1 hover:gap-2 transition-all text-sm font-medium"
              >
                عرض الكل
                <ChevronLeft size={16} />
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
                    <Link to={`/product/${product.id}`}>
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

      {/* Featured Products - Sponsored */}
      <FeaturedProducts />

      {/* Featured Products */}
      <section className="py-2">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1 bg-[#FF6B00]/10 rounded-lg">
                <TrendingUp size={16} className="text-[#FF6B00]" />
              </div>
              <h2 className="text-base font-bold text-gray-900">المنتجات الرائجة</h2>
            </div>
            <Link 
              to="/products" 
              className="text-[#FF6B00] flex items-center gap-1 hover:gap-2 transition-all text-sm font-medium" 
              data-testid="view-all-products"
            >
              عرض الكل
              <ChevronLeft size={16} />
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

      {/* قسم التوصيات الذكية */}
      <section className="py-4 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto">
          <RecommendedProducts />
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
