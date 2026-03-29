import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store, Package, Heart, Loader2, ArrowRight } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;

const FollowingPage = () => {
  const { user, token } = useAuth();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchFollowing();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchFollowing = async () => {
    try {
      const res = await axios.get(`${API}/api/user/following`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStores(res.data);
    } catch (error) {
      console.error('Error fetching following:', error);
    } finally {
      setLoading(false);
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
        )}
      </div>
    </div>
  );
};

export default FollowingPage;
