// /app/frontend/src/components/InfiniteProductList.js
// قائمة منتجات مع تحميل لانهائي (Infinite Scroll)

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import ProductCard from './ProductCard';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const InfiniteProductList = ({ 
  category = '',
  search = '',
  city = '',
  priceMin = '',
  priceMax = '',
  initialProducts = [],
  limit = 12
}) => {
  const [products, setProducts] = useState(initialProducts);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(initialProducts.length === 0);
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);

  // Reset when filters change
  useEffect(() => {
    setProducts([]);
    setPage(1);
    setHasMore(true);
    setInitialLoading(true);
  }, [category, search, city, priceMin, priceMax]);

  // Fetch products
  const fetchProducts = useCallback(async (pageNum) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (search) params.append('search', search);
      if (city) params.append('city', city);
      if (priceMin) params.append('price_min', priceMin);
      if (priceMax) params.append('price_max', priceMax);
      params.append('page', pageNum);
      params.append('limit', limit);

      const res = await axios.get(`${API}/products?${params}`);
      const newProducts = res.data.products || res.data;
      const totalPages = res.data.pages || 1;
      
      if (pageNum === 1) {
        setProducts(newProducts);
      } else {
        setProducts(prev => {
          // Avoid duplicates
          const existingIds = new Set(prev.map(p => p.id));
          const uniqueNew = newProducts.filter(p => !existingIds.has(p.id));
          return [...prev, ...uniqueNew];
        });
      }
      
      setHasMore(pageNum < totalPages);
      setInitialLoading(false);
    } catch (error) {
      console.error('Error fetching products:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [category, search, city, priceMin, priceMax, limit, loading]);

  // Initial load
  useEffect(() => {
    if (initialLoading) {
      fetchProducts(1);
    }
  }, [initialLoading, fetchProducts]);

  // Load more on page change
  useEffect(() => {
    if (page > 1) {
      fetchProducts(page);
    }
  }, [page]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage(prev => prev + 1);
        }
      },
      {
        rootMargin: '200px',
        threshold: 0.1
      }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading]);

  if (initialLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">لا توجد منتجات</p>
      </div>
    );
  }

  return (
    <div>
      {/* Products Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {products.map((product, index) => (
          <div 
            key={`${product.id}-${index}`}
            style={{ 
              animationDelay: `${(index % 12) * 50}ms`,
              animation: 'fadeInUp 0.4s ease-out forwards'
            }}
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      {/* Load More Trigger */}
      <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
        {loading && (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin text-[#FF6B00]" />
            <span className="text-sm">جاري تحميل المزيد...</span>
          </div>
        )}
        {!hasMore && products.length > 0 && (
          <p className="text-gray-400 text-sm">تم عرض جميع المنتجات</p>
        )}
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

export default InfiniteProductList;
