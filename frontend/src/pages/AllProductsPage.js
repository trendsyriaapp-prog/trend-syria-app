import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Package, ChevronRight, Search, SlidersHorizontal } from 'lucide-react';
import ProductCard from '../components/ProductCard';
import LazyImage from '../components/LazyImage';

const API = process.env.REACT_APP_BACKEND_URL;

const AllProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [badgeSettings, setBadgeSettings] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const productsPerPage = 20;

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const [productsRes, badgeRes] = await Promise.all([
          axios.get(`${API}/api/products?limit=50`),
          axios.get(`${API}/api/settings/badge-settings`).catch(() => ({ data: null }))
        ]);
        
        // Handle both array and object response
        let allProducts = Array.isArray(productsRes.data) 
          ? productsRes.data 
          : productsRes.data?.products || [];
        
        // Sort products
        if (sortBy === 'newest') {
          allProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        } else if (sortBy === 'price_low') {
          allProducts.sort((a, b) => a.price - b.price);
        } else if (sortBy === 'price_high') {
          allProducts.sort((a, b) => b.price - a.price);
        } else if (sortBy === 'popular') {
          allProducts.sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0));
        }
        
        setProducts(allProducts);
        setBadgeSettings(badgeRes.data);
        setHasMore(allProducts.length > productsPerPage);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, [sortBy]);

  // Filter products by search
  const filteredProducts = products.filter(product => 
    !searchTerm || 
    product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      {/* Header */}
      <div className="bg-gradient-to-l from-[#FF6B00] to-[#FF8C00] text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <Link to="/" className="text-white/80 hover:text-white">
              <ChevronRight size={24} />
            </Link>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Package size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">جميع المنتجات</h1>
              <p className="text-white/80 text-sm">
                {filteredProducts.length} منتج
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="ابحث عن منتج..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-10 py-3 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/50"
            />
          </div>
        </div>
      </div>

      {/* Sort Options */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <SlidersHorizontal size={18} className="text-gray-500 flex-shrink-0" />
            <span className="text-sm text-gray-500 flex-shrink-0">ترتيب:</span>
            {[
              { value: 'newest', label: 'الأحدث' },
              { value: 'popular', label: 'الأكثر مبيعاً' },
              { value: 'price_low', label: 'السعر: من الأقل' },
              { value: 'price_high', label: 'السعر: من الأعلى' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setSortBy(option.value)}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                  sortBy === option.value
                    ? 'bg-[#FF6B00] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
