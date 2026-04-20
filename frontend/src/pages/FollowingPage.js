import { useState, useEffect, useCallback } from 'react';
import logger from '../lib/logger';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store, Package, Heart, Loader2, ArrowRight, ChevronDown } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;

const FollowingPage = () => {
  const { user, token } = useAuth();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);

  const fetchFollowing = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    
    try {
      const res = await axios.get(`${API}/api/user/following?page=${pageNum}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // دعم الـ API الجديد مع pagination
      const data = res.data.data || res.data;
      const totalCount = res.data.total || data.length;
      const totalPages = res.data.pages || 1;
      
      if (append) {
        setStores(prev => [...prev, ...data]);
      } else {
        setStores(data);
      }
      
      setTotal(totalCount);
      setHasMore(pageNum < totalPages);
    } catch (error) {
      logger.error('Error fetching following:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchFollowing(1);
    } else {
      setLoading(false);
    }
  }, [token, fetchFollowing]);

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchFollowing(nextPage, true);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Heart size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">يجب تسجيل الدخول لعرض المتاجر المتابعة</p>
          <Link
            to="/login"
            className="inline-block bg-[#FF6B00] text-white px-6 py-2 rounded-full font-bold"
          >
            تسجيل الدخول
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="text-gray-500">
            <ArrowRight size={20} />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">المتاجر المتابعة</h1>
          <span className="text-sm text-gray-500">({total})</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4">
        {stores.length === 0 ? (
          <div className="text-center py-16">
            <Heart size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">لا تتابع أي متجر حالياً</p>
            <p className="text-gray-400 text-sm mb-4">تابع المتاجر لتبقى على اطلاع بأحدث المنتجات</p>
            <Link
              to="/"
              className="inline-block bg-[#FF6B00] text-white px-6 py-2 rounded-full font-bold text-sm"
            >
              تصفح المنتجات
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {stores.map((store, index) => (
                <motion.div
                  key={store.seller_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    to={`/store/${store.seller_id}`}
                    className="block bg-white rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow"
                    data-testid={`store-${store.seller_id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-[#FF6B00]/10 rounded-full flex items-center justify-center">
                        <Store size={24} className="text-[#FF6B00]" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900">{store.business_name}</h3>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Package size={14} />
                          <span>{store.products_count} منتج</span>
                        </div>
                      </div>
                      <Heart size={20} className="text-[#FF6B00]" fill="#FF6B00" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
            
            {/* Load More Button */}
            {hasMore && (
              <div className="text-center mt-6">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 px-6 py-2 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 font-medium transition-colors"
                  data-testid="load-more-following"
                >
                  {loadingMore ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <ChevronDown size={18} />
                  )}
                  {loadingMore ? 'جاري التحميل...' : 'عرض المزيد'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FollowingPage;
