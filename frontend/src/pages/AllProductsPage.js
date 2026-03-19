import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Package, Search, SlidersHorizontal } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import LazyImage from '../components/LazyImage';

const API = process.env.REACT_APP_BACKEND_URL;

// Cache للمنتجات - يعمل على مستوى الـ module
const productsCache = {
  data: null,
  badgeSettings: null,
  timestamp: null,
  TTL: 2 * 60 * 1000 // 2 دقيقة
};

const AllProductsPage = () => {
  const [products, setProducts] = useState(productsCache.data || []);
  const [loading, setLoading] = useState(!productsCache.data);
  const [badgeSettings, setBadgeSettings] = useState(productsCache.badgeSettings);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const productsPerPage = 20;

  useEffect(() => {
    const fetchProducts = async () => {
      // التحقق من الـ cache
      const now = Date.now();
      if (productsCache.data && productsCache.timestamp && (now - productsCache.timestamp < productsCache.TTL)) {
        setProducts(productsCache.data);
        setBadgeSettings(productsCache.badgeSettings);
        setLoading(false);
        return;
      }
      
      try {
        if (!productsCache.data) setLoading(true);
        
        const [productsRes, badgeRes] = await Promise.all([
          axios.get(`${API}/api/products?limit=50`),
          axios.get(`${API}/api/settings/product-badges`).catch(() => ({ data: null }))
        ]);
        
        // Handle both array and object response
        let allProducts = Array.isArray(productsRes.data) 
          ? productsRes.data 
          : productsRes.data?.products || [];
        
        // حفظ في الـ cache
        productsCache.data = allProducts;
        productsCache.badgeSettings = badgeRes.data;
        productsCache.timestamp = now;
        
        setProducts(allProducts);
        setBadgeSettings(badgeRes.data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, []);

  // الترتيب والتصفية باستخدام useMemo للأداء
  const filteredProducts = useMemo(() => {
    let result = [...products];
    
    // التصفية حسب البحث
    if (searchTerm) {
      result = result.filter(product => 
        product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // الترتيب
    if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === 'price_low') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price_high') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'popular') {
      result.sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0));
    }
    
    return result;
  }, [products, searchTerm, sortBy]);

  // Paginate
  const displayedProducts = filteredProducts.slice(0, page * productsPerPage);

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  // Loading skeleton
  const ProductSkeleton = () => (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-200 rounded w-1/2" />
        <div className="h-5 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header - مصغر بدون سهم الرجوع */}
      <div className="bg-gradient-to-l from-[#FF6B00] to-[#FF8C00] text-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white/20 rounded-md flex items-center justify-center">
              <Package size={14} />
            </div>
            <div className="flex-1">
              <h1 className="text-sm font-bold">جميع المنتجات</h1>
              <p className="text-white/80 text-[10px]">
                {filteredProducts.length} منتج
              </p>
            </div>
            
            {/* Search inline */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="ابحث..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-2 pr-7 py-1.5 text-xs rounded-md text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sort Options - مصغر أكثر */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 py-1.5">
          <div className="flex items-center gap-1 overflow-x-auto">
            <SlidersHorizontal size={12} className="text-gray-400 flex-shrink-0" />
            {[
              { value: 'newest', label: 'الأحدث' },
              { value: 'popular', label: 'الأكثر مبيعاً' },
              { value: 'price_low', label: 'الأقل سعراً' },
              { value: 'price_high', label: 'الأعلى سعراً' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value)}
                className={`px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap transition-colors ${
                  sortBy === option.value
                    ? 'bg-[#FF6B00] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[...Array(20)].map((_, i) => (
              <ProductSkeleton key={i} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package size={64} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-bold text-gray-600 mb-2">لا توجد منتجات</h3>
            <p className="text-gray-500">
              {searchTerm ? 'لم يتم العثور على منتجات تطابق بحثك' : 'لا توجد منتجات متاحة حالياً'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {displayedProducts.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  badgeSettings={badgeSettings}
                />
              ))}
            </div>

            {/* Load More Button */}
            {displayedProducts.length < filteredProducts.length && (
              <div className="text-center mt-8">
                <button
                  onClick={loadMore}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white font-bold px-8 py-3 rounded-full hover:shadow-lg transition-all"
                >
                  عرض المزيد
                  <span className="text-white/80 text-sm">
                    ({filteredProducts.length - displayedProducts.length} متبقي)
                  </span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AllProductsPage;
