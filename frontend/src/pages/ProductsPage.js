import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Filter, X, ChevronDown, MapPin, DollarSign, ArrowUpDown, Loader2, Sparkles, Zap, TrendingUp, Tag, ChevronLeft, Package } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import FreeShippingBanner from '../components/FreeShippingBanner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// 🔥 مكون العداد التنازلي لفلاش
const FlashCountdown = ({ endTime }) => {
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

  return (
    <div className="flex items-center gap-1 bg-gradient-to-r from-orange-500 to-red-500 text-white px-2 py-1 rounded-lg">
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

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [globalFreeShipping, setGlobalFreeShipping] = useState(null);
  const [badgeSettings, setBadgeSettings] = useState(null);
  
  // New states for ads, flash, best sellers, newly added
  const [ads, setAds] = useState([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [flashProducts, setFlashProducts] = useState([]);
  const [flashSale, setFlashSale] = useState(null);
  const [bestSellers, setBestSellers] = useState([]);
  const [newlyAddedProducts, setNewlyAddedProducts] = useState([]);
  const [freeShippingProducts, setFreeShippingProducts] = useState([]);
  
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);
  
  // Price filter states
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  // جلب عرض الشحن المجاني + الإعلانات + فلاش + الأكثر مبيعاً + وصل حديثاً + شحنها مجاني
  useEffect(() => {
    const fetchExtras = async () => {
      try {
        const [promoRes, adsRes, flashRes, bestSellersRes, newlyAddedRes, badgeRes, settingsRes] = await Promise.all([
          axios.get(`${API}/settings/global-free-shipping`).catch(() => ({ data: null })),
          axios.get(`${API}/ads/active`).catch(() => ({ data: [] })),
          axios.get(`${API}/products/flash-products`).catch(() => ({ data: { products: [], flash_sale: null } })),
          axios.get(`${API}/products/best-sellers`).catch(() => ({ data: [] })),
          axios.get(`${API}/products/newly-added`).catch(() => ({ data: [] })),
          axios.get(`${API}/settings/product-badges`).catch(() => ({ data: null })),
          axios.get(`${API}/settings/platform`).catch(() => ({ data: { free_shipping_threshold: 150000 } }))
        ]);
        
        const promo = promoRes.data;
        if (promo?.is_active && ['all', 'products'].includes(promo.applies_to)) {
          setGlobalFreeShipping(promo);
        } else {
          setGlobalFreeShipping(null);
        }
        
        setAds(adsRes.data || []);
        setBadgeSettings(badgeRes.data);
        setFlashProducts(flashRes.data?.products || []);
        setFlashSale(flashRes.data?.flash_sale || null);
        setBestSellers(bestSellersRes.data || []);
        setNewlyAddedProducts(newlyAddedRes.data || []);
        
        // جلب منتجات شحنها مجاني (سعرها >= حد الشحن المجاني)
        const threshold = settingsRes.data?.free_shipping_threshold || 150000;
        try {
          const freeShipRes = await axios.get(`${API}/products?price_min=${threshold}&limit=10`);
          const freeShipProducts = freeShipRes.data?.products || freeShipRes.data || [];
          setFreeShippingProducts(freeShipProducts.slice(0, 10));
        } catch (err) {
          console.error('Error fetching free shipping products:', err);
        }
      } catch (error) {
        console.error('Error fetching extras:', error);
      }
    };
    fetchExtras();
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

  // ملاحظة: استعادة التمرير يتم التعامل معها في ScrollToTop.js

  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const priceMin = searchParams.get('price_min') || '';
  const priceMax = searchParams.get('price_max') || '';
  const cityFilter = searchParams.get('city') || '';
  const sort = searchParams.get('sort') || 'newest';
  
  // التحقق إذا كانت صفحة قسم مخصص (بدون بانرات وأقسام إضافية)
  const isSpecialSection = ['trending', 'deals', 'newest', 'popular', 'flash', 'sponsored'].includes(sort);

  // Reset when filters change
  useEffect(() => {
    setProducts([]);
    setPage(1);
    setHasMore(true);
    setLoading(true);
  }, [category, search, priceMin, priceMax, cityFilter, sort]);

  // Fetch products
  const fetchProducts = useCallback(async (pageNum, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    
    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (search) params.append('search', search);
      if (priceMin) params.append('price_min', priceMin);
      if (priceMax) params.append('price_max', priceMax);
      if (cityFilter) params.append('city', cityFilter);
      if (sort) params.append('sort', sort);
      params.append('page', pageNum);
      params.append('limit', 12);

      const res = await axios.get(`${API}/products?${params}`);
      const newProducts = res.data.products;
      
      if (append) {
        setProducts(prev => {
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueNew = newProducts.filter(p => !existingIds.has(p.id));
          return [...prev, ...uniqueNew];
        });
      } else {
        setProducts(newProducts);
      }
      
      setHasMore(res.data.has_more);
    } catch (error) {
      console.error('Error fetching products:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [category, search, priceMin, priceMax, cityFilter, sort]);

  // Initial load and filter changes
  useEffect(() => {
    if (loading && page === 1) {
      fetchProducts(1, false);
    }
  }, [loading, page, fetchProducts]);

  // Load more pages
  useEffect(() => {
    if (page > 1 && !loading) {
      fetchProducts(page, true);
    }
  }, [page]);

  // Intersection Observer
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          setPage(prev => prev + 1);
        }
      },
      { rootMargin: '200px', threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, loadingMore]);

  useEffect(() => {
    fetchCategories();
    fetchCities();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API}/categories`);
      setCategories(res.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchCities = async () => {
    try {
      const res = await axios.get(`${API}/shipping/cities`);
      setCities(res.data);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const setCategory = (cat) => {
    const params = new URLSearchParams(searchParams);
    if (cat) {
      params.set('category', cat);
    } else {
      params.delete('category');
    }
    setSearchParams(params);
  };

  const setSort = (sortValue) => {
    const params = new URLSearchParams(searchParams);
    params.set('sort', sortValue);
    setSearchParams(params);
    setShowSort(false);
  };

  const applyPriceFilter = () => {
    const params = new URLSearchParams(searchParams);
    if (minPrice) {
      params.set('price_min', minPrice);
    } else {
      params.delete('price_min');
    }
    if (maxPrice) {
      params.set('price_max', maxPrice);
    } else {
      params.delete('price_max');
    }
    setSearchParams(params);
    setShowFilters(false);
  };

  const applyCityFilter = (city) => {
    const params = new URLSearchParams(searchParams);
    if (city) {
      params.set('city', city);
    } else {
      params.delete('city');
    }
    setSearchParams(params);
    setSelectedCity(city);
  };

  const sortOptions = [
    { value: 'newest', label: 'الأحدث' },
    { value: 'popular', label: 'الأكثر مبيعاً' },
    { value: 'trending', label: 'رائج الآن' },
    { value: 'deals', label: 'عروض وخصومات' },
    { value: 'flash', label: 'عروض فلاش' },
    { value: 'sponsored', label: 'مُعلن عنها' },
    { value: 'price_low', label: 'السعر: من الأقل' },
    { value: 'price_high', label: 'السعر: من الأعلى' }
  ];

  const clearFilters = () => {
    setSearchParams({});
    setMinPrice('');
    setMaxPrice('');
    setSelectedCity('');
  };

  const clearPriceFilter = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('price_min');
    params.delete('price_max');
    params.set('page', '1');
    setSearchParams(params);
    setMinPrice('');
    setMaxPrice('');
  };

  const clearCityFilter = () => {
    const params = new URLSearchParams(searchParams);
    params.delete('city');
    params.set('page', '1');
    setSearchParams(params);
    setSelectedCity('');
  };

  const getCategoryName = (id) => {
    const cat = categories.find(c => c.id === id);
    // إذا لم يتم تحميل التصنيفات بعد، نعرض نص انتظار بدلاً من ID
    if (!cat && categories.length === 0) {
      return '...';
    }
    return cat?.name || id;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
  };

  return (
    <div className="min-h-screen pb-20 md:pb-10 bg-[#FAFAFA]">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* 🎁 بانر الشحن المجاني الشامل */}
        {!isSpecialSection && globalFreeShipping && (
          <FreeShippingBanner promo={globalFreeShipping} />
        )}

        {/* 📢 شريط الإعلانات */}
        {!isSpecialSection && ads.length > 0 && (
          <div className="mb-3">
            <div className="relative overflow-hidden h-16 md:h-20">
              {ads.map((ad, index) => (
                <div
                  key={index}
                  className={`absolute inset-0 transition-all duration-500 ease-in-out ${
                    index === currentAdIndex 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 -translate-y-full'
                  }`}
                >
                  <Link to={ad?.link || '#'} className="block h-full">
                    {ad?.link === '/food' ? (
                      <div className="relative h-full bg-gradient-to-r from-[#FF6B00] via-[#FF8C00] to-[#FFB347]">
                        <div className="absolute inset-0 opacity-15">
                          <div className="absolute top-1 right-3 text-3xl">🍕</div>
                          <div className="absolute bottom-1 left-6 text-2xl">🍔</div>
                          <div className="absolute top-2 left-1/4 text-xl">🌮</div>
                        </div>
                        <div className="relative h-full flex items-center justify-between px-3 md:px-4">
                          <div className="text-white">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded-full text-[8px] font-medium">
                                جديد ✨
                              </span>
                            </div>
                            <h3 className="text-sm md:text-base font-bold">قسم الطعام</h3>
                            <p className="text-white/90 text-[10px] md:text-xs">توصيل سريع من أفضل المطاعم</p>
                          </div>
                          <div className="bg-white text-[#FF6B00] px-3 py-1.5 rounded-full font-bold text-xs shadow-md">
                            اطلب الآن
                          </div>
                        </div>
                      </div>
                    ) : (
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
                              <h3 className="text-sm md:text-base font-bold">{ad?.title}</h3>
                              {ad?.description && (
                                <p className="text-xs opacity-90 mt-0.5">{ad.description}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </Link>
                </div>
              ))}
              
              {ads.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
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
        )}

        {/* ⚡ شريط فلاش */}
        {!isSpecialSection && flashProducts.length > 0 && flashSale && (
          <section className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg">
                  <Zap size={16} className="text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">عروض فلاش</h2>
                  <p className="text-[10px] text-gray-500">{flashSale.name}</p>
                </div>
              </div>
              <Link 
                to="/products?sort=flash"
                className="text-orange-600 flex items-center gap-1 hover:gap-2 transition-all text-xs font-medium"
              >
                عرض الكل
                <ChevronLeft size={14} />
              </Link>
            </div>
            
            <div className="relative">
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                {flashProducts.map((product, i) => (
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
            </div>
          </section>
        )}

        {/* 🔥 شريط الأكثر مبيعاً */}
        {!isSpecialSection && bestSellers.length > 0 && (
          <section className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-r from-red-500 to-pink-500 rounded-lg">
                  <TrendingUp size={16} className="text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">الأكثر مبيعاً</h2>
                  <p className="text-[10px] text-gray-500">المنتجات المفضلة لدى العملاء</p>
                </div>
              </div>
              <Link 
                to="/products?sort=popular"
                className="text-red-600 flex items-center gap-1 hover:gap-2 transition-all text-xs font-medium"
              >
                عرض الكل
                <ChevronLeft size={14} />
              </Link>
            </div>
            
            <div className="relative">
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                {bestSellers.map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex-shrink-0 w-36"
                  >
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
                          <div className="absolute top-2 right-2 bg-gradient-to-r from-red-500 to-pink-500 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                            <TrendingUp size={10} />
                            {product.sales_count} مبيع
                          </div>
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
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* 🆕 شريط وصل حديثاً */}
        {!isSpecialSection && newlyAddedProducts.length > 0 && (
          <section className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg">
                  <Sparkles size={16} className="text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">وصل حديثاً</h2>
                  <p className="text-[10px] text-gray-500">أحدث المنتجات المضافة</p>
                </div>
              </div>
              <Link 
                to="/products?sort=newest"
                className="text-purple-600 flex items-center gap-1 hover:gap-2 transition-all text-xs font-medium"
              >
                عرض الكل
                <ChevronLeft size={14} />
              </Link>
            </div>
            
            <div className="relative">
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                {newlyAddedProducts.map((product, i) => (
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
                          <div className="absolute top-2 right-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                            <Sparkles size={10} />
                            جديد
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
          </section>
        )}

        {/* 🚚 شريط شحنها مجاني */}
        {!isSpecialSection && freeShippingProducts.length > 0 && (
          <section className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                  <Truck size={16} className="text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900">شحنها مجاني</h2>
                  <p className="text-[10px] text-gray-500">اطلب واحصل على شحن مجاني فوراً!</p>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
                {freeShippingProducts.map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex-shrink-0 w-36"
                  >
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
                          <div className="absolute top-2 right-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                            <Truck size={10} />
                            شحن مجاني
                          </div>
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
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {search ? `نتائج البحث: "${search}"` 
                : category ? getCategoryName(category) 
                : sort === 'trending' ? 'رائج الآن 🔥'
                : sort === 'deals' ? 'عروض وخصومات 🏷️'
                : sort === 'newest' ? 'منتجات جديدة ✨'
                : sort === 'popular' ? 'الأكثر مبيعاً 🛒'
                : sort === 'flash' ? 'عروض فلاش ⚡'
                : sort === 'sponsored' ? 'منتجات مُعلن عنها ⭐'
                : 'جميع المنتجات'}
            </h1>
            <p className="text-gray-500 text-sm">
              {products.length} منتج
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full text-gray-700 shadow-sm"
            data-testid="filter-toggle"
          >
            <Filter size={18} />
            <span>فلتر</span>
          </button>
        </div>

        {/* Active Filters */}
        {(search || priceMin || priceMax || cityFilter) && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {search && (
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#FF6B00]/10 text-[#FF6B00] rounded-full text-sm font-medium">
                البحث: {search}
                <button onClick={clearFilters} data-testid="clear-search">
                  <X size={14} />
                </button>
              </span>
            )}
            {(priceMin || priceMax) && (
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                السعر: {priceMin ? formatPrice(priceMin) : '0'} - {priceMax ? formatPrice(priceMax) : '∞'}
                <button onClick={clearPriceFilter} data-testid="clear-price">
                  <X size={14} />
                </button>
              </span>
            )}
            {cityFilter && (
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                <MapPin size={14} />
                {cityFilter}
                <button onClick={clearCityFilter} data-testid="clear-city">
                  <X size={14} />
                </button>
              </span>
            )}
          </div>
        )}

        <div className="flex gap-4">
          {/* Sidebar Filters - Desktop */}
          <aside className={`${showFilters ? 'fixed inset-0 z-50 bg-black/50 p-4' : 'hidden'} md:block md:relative md:bg-transparent md:p-0 md:w-56 flex-shrink-0`}>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-3 md:hidden">
                <h3 className="font-bold text-gray-900">فلتر</h3>
                <button onClick={() => setShowFilters(false)} className="text-gray-500">
                  <X size={24} />
                </button>
              </div>
              
              <h3 className="font-bold mb-2 text-gray-800 text-sm">الأصناف</h3>
              <div className="space-y-1 mb-4">
                <button
                  onClick={() => { setCategory(''); setShowFilters(false); }}
                  className={`w-full text-right p-2 rounded-lg transition-colors text-sm ${!category ? 'bg-[#FF6B00] text-white font-bold' : 'hover:bg-gray-100 text-gray-700'}`}
                  data-testid="cat-all"
                >
                  الكل
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { setCategory(cat.id); setShowFilters(false); }}
                    className={`w-full text-right p-2 rounded-lg transition-colors text-sm ${category === cat.id ? 'bg-[#FF6B00] text-white font-bold' : 'hover:bg-gray-100 text-gray-700'}`}
                    data-testid={`cat-filter-${cat.id}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Price Filter */}
              <div className="border-t border-gray-100 pt-4 mb-4">
                <h3 className="font-bold mb-2 text-gray-800 text-sm flex items-center gap-2">
                  <DollarSign size={14} />
                  السعر (ل.س)
                </h3>
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="الحد الأدنى"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:border-[#FF6B00] focus:outline-none"
                    data-testid="min-price-input"
                  />
                  <input
                    type="number"
                    placeholder="الحد الأقصى"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:border-[#FF6B00] focus:outline-none"
                    data-testid="max-price-input"
                  />
                  <button
                    onClick={applyPriceFilter}
                    className="w-full p-2 bg-[#FF6B00] text-white rounded-lg text-sm font-bold hover:bg-[#E65000] transition-colors"
                    data-testid="apply-price-filter"
                  >
                    تطبيق
                  </button>
                </div>
              </div>

              {/* City Filter */}
              <div className="border-t border-gray-100 pt-4">
                <h3 className="font-bold mb-2 text-gray-800 text-sm flex items-center gap-2">
                  <MapPin size={14} />
                  المحافظة
                </h3>
                <select
                  value={selectedCity}
                  onChange={(e) => applyCityFilter(e.target.value)}
                  className="w-full p-2 text-sm border border-gray-200 rounded-lg focus:border-[#FF6B00] focus:outline-none"
                  data-testid="city-filter-select"
                >
                  <option value="">جميع المحافظات</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            </div>
          </aside>

          {/* Products Grid */}
          <main className="flex-1">

            {loading && products.length === 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                    <div className="aspect-[4/5] shimmer-effect bg-gray-100" />
                    <div className="p-3 space-y-2">
                      <div className="h-4 shimmer-effect bg-gray-100 rounded w-full" />
                      <div className="h-3 shimmer-effect bg-gray-100 rounded w-2/3" />
                      <div className="h-5 shimmer-effect bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl">
                <p className="text-gray-500 text-lg mb-4">لا توجد منتجات</p>
                <Link to="/products" className="text-[#FF6B00] hover:underline font-medium">
                  عرض جميع المنتجات
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {products.map((product, index) => (
                    <div
                      key={`${product.id}-${index}`}
                      className="product-card"
                      style={{ 
                        animationDelay: `${(index % 12) * 50}ms`,
                        animation: index < 12 ? 'fadeInUp 0.4s ease-out forwards' : 'none'
                      }}
                    >
                      <ProductCard product={product} badgeSettings={badgeSettings} />
                    </div>
                  ))}
                </div>

                {/* Infinite Scroll Trigger */}
                <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
                  {loadingMore && (
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 className="w-5 h-5 animate-spin text-[#FF6B00]" />
                      <span className="text-sm">جاري تحميل المزيد...</span>
                    </div>
                  )}
                  {!hasMore && products.length > 12 && (
                    <p className="text-gray-400 text-sm">تم عرض جميع المنتجات</p>
                  )}
                </div>
              </>
            )}
          </main>
        </div>
      </div>
      
      {/* CSS Animation */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ProductsPage;
