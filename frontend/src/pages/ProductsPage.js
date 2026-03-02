import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Filter, X, ChevronDown, MapPin, DollarSign, ArrowUpDown, Loader2 } from 'lucide-react';
import ProductCard from '../components/ProductCard';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);
  
  // Price filter states
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [selectedCity, setSelectedCity] = useState('');

  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const priceMin = searchParams.get('price_min') || '';
  const priceMax = searchParams.get('price_max') || '';
  const cityFilter = searchParams.get('city') || '';
  const sort = searchParams.get('sort') || 'newest';

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
    return cat?.name || id;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
  };

  return (
    <div className="min-h-screen pb-20 md:pb-10 bg-[#FAFAFA]">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {search ? `نتائج البحث: "${search}"` : category ? getCategoryName(category) : 'جميع المنتجات'}
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
        {(category || search || priceMin || priceMax || cityFilter) && (
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {category && (
              <span className="inline-flex items-center gap-2 px-3 py-1 bg-[#FF6B00]/10 text-[#FF6B00] rounded-full text-sm font-medium">
                {getCategoryName(category)}
                <button onClick={() => setCategory('')} data-testid="clear-category">
                  <X size={14} />
                </button>
              </span>
            )}
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
                      <ProductCard product={product} />
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
