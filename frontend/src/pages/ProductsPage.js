import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Filter, X, ChevronDown } from 'lucide-react';
import ProductCard from '../components/ProductCard';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ProductsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1');

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [category, search, page]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (search) params.append('search', search);
      params.append('page', page);
      params.append('limit', 20);

      const res = await axios.get(`${API}/products?${params}`);
      setProducts(res.data.products);
      setTotalPages(res.data.pages);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API}/categories`);
      setCategories(res.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const setCategory = (cat) => {
    const params = new URLSearchParams(searchParams);
    if (cat) {
      params.set('category', cat);
    } else {
      params.delete('category');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchParams({});
  };

  const getCategoryName = (id) => {
    const cat = categories.find(c => c.id === id);
    return cat?.name || id;
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
            <span>تصفية</span>
          </button>
        </div>

        {/* Active Filters */}
        {(category || search) && (
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
          </div>
        )}

        <div className="flex gap-4">
          {/* Sidebar Filters - Desktop */}
          <aside className={`${showFilters ? 'fixed inset-0 z-50 bg-black/50 p-4' : 'hidden'} md:block md:relative md:bg-transparent md:p-0 md:w-56 flex-shrink-0`}>
            <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-3 md:hidden">
                <h3 className="font-bold text-gray-900">تصفية</h3>
                <button onClick={() => setShowFilters(false)} className="text-gray-500">
                  <X size={24} />
                </button>
              </div>
              
              <h3 className="font-bold mb-2 text-gray-800 text-sm">الأصناف</h3>
              <div className="space-y-1">
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
            </div>
          </aside>

          {/* Products Grid */}
          <main className="flex-1">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {[...Array(12)].map((_, i) => (
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
                  {products.map((product, i) => (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <ProductCard product={product} />
                    </motion.div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-6">
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          const params = new URLSearchParams(searchParams);
                          params.set('page', String(i + 1));
                          setSearchParams(params);
                        }}
                        className={`w-10 h-10 rounded-full transition-colors font-bold ${
                          page === i + 1 ? 'bg-[#FF6B00] text-white' : 'bg-white border border-gray-200 text-gray-700 hover:border-[#FF6B00]'
                        }`}
                        data-testid={`page-${i + 1}`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
