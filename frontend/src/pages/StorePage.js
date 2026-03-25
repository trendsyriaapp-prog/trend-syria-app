import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Store, Users, Package, Heart, ArrowRight, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const StorePage = () => {
  const { sellerId } = useParams();
  const { user, token } = useAuth();
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    fetchStore();
  }, [sellerId]);

  const fetchStore = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API}/stores/${sellerId}`, { headers });
      setStore(res.data);
      setFollowing(res.data.is_following);
    } catch (error) {
      console.error('Error fetching store:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!user) {
      alert('يجب تسجيل الدخول أولاً');
      return;
    }
    
    setFollowLoading(true);
    try {
      if (following) {
        await axios.delete(`${API}/stores/${sellerId}/follow`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFollowing(false);
        setStore(prev => ({ ...prev, followers_count: prev.followers_count - 1 }));
      } else {
        await axios.post(`${API}/stores/${sellerId}/follow`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFollowing(true);
        setStore(prev => ({ ...prev, followers_count: prev.followers_count + 1 }));
      }
    } catch (error) {
      alert(error.response?.data?.detail || 'حدث خطأ');
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">المتجر غير موجود</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Store Header */}
      <div className="bg-gradient-to-br from-[#FF6B00] to-[#E65000] text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            {/* Store Icon */}
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <Store size={32} className="text-white" />
            </div>
            
            {/* Store Name */}
            <h1 className="text-xl font-bold mb-2">{store.business_name}</h1>
            
            {/* Stats */}
            <div className="flex justify-center gap-6 text-sm">
              <div className="flex items-center gap-1">
                <Package size={16} />
                <span>{store.products_count} منتج</span>
              </div>
              <div className="flex items-center gap-1">
                <Users size={16} />
                <span>{store.followers_count} متابع</span>
              </div>
            </div>
            
            {/* Follow Button */}
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`mt-4 px-6 py-2 rounded-full text-sm font-bold transition-colors flex items-center gap-2 mx-auto ${
                following
                  ? 'bg-white/20 text-white hover:bg-white/30'
                  : 'bg-white text-[#FF6B00] hover:bg-gray-100'
              }`}
              data-testid="follow-btn"
            >
              {followLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <Heart size={16} fill={following ? 'currentColor' : 'none'} />
                  {following ? 'متابَع' : 'متابعة'}
                </>
              )}
            </button>
          </motion.div>
        </div>
      </div>

      {/* Products */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <h2 className="text-lg font-bold text-gray-900 mb-3">منتجات المتجر</h2>
        
        {store.products.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-xl border border-gray-200">
            <Package size={40} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">لا توجد منتجات حالياً</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {store.products.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Link
                  to={`/products/${product.id}`}
                  className="block bg-white rounded-xl overflow-hidden border border-gray-200 hover:shadow-md transition-shadow"
                  data-testid={`product-${product.id}`}
                >
                  <div className="aspect-square bg-gray-100 relative">
                    <img
                      src={product.images?.[0] || 'https://via.placeholder.com/200'}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-2">
                    <h3 className="text-sm font-bold text-gray-900 line-clamp-1">{product.name}</h3>
                    <p className="text-sm font-bold text-[#FF6B00]">{formatPrice(product.price)}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Back Button */}
      <div className="fixed bottom-24 left-4 z-40">
        <Link
          to="/"
          className="flex items-center gap-2 bg-white shadow-lg rounded-full px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors border border-gray-100"
        >
          <ArrowRight size={18} />
          <span className="text-sm">العودة</span>
        </Link>
      </div>
    </div>
  );
};

export default StorePage;
