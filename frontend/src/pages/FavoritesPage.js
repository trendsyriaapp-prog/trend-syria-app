import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Loader2, ArrowRight, Trash2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const FavoritesPage = () => {
  const { user, token } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    if (token) {
      fetchFavorites();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchFavorites = async () => {
    try {
      const res = await axios.get(`${API}/api/favorites`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFavorites(res.data);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (productId) => {
    setRemoving(productId);
    try {
      await axios.delete(`${API}/api/favorites/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFavorites(favorites.filter(p => p.id !== productId));
    } catch (error) {
      alert('حدث خطأ أثناء الإزالة');
    } finally {
      setRemoving(null);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Heart size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">يجب تسجيل الدخول لعرض المفضلة</p>
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
          <Heart size={20} className="text-[#FF6B00]" fill="#FF6B00" />
          <h1 className="text-lg font-bold text-gray-900">المفضلة</h1>
          <span className="text-sm text-gray-500">({favorites.length})</span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4">
        {favorites.length === 0 ? (
          <div className="text-center py-16">
            <Heart size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 mb-2">لا توجد منتجات في المفضلة</p>
            <p className="text-gray-400 text-sm mb-4">احفظ المنتجات التي تعجبك لوقت لاحق</p>
            <Link
              to="/"
              className="inline-block bg-[#FF6B00] text-white px-6 py-2 rounded-full font-bold text-sm"
            >
              تصفح المنتجات
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {favorites.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-xl overflow-hidden border border-gray-200 relative"
              >
                {/* Remove Button */}
                <button
                  onClick={() => handleRemove(product.id)}
                  disabled={removing === product.id}
                  className="absolute top-2 left-2 z-10 p-1.5 bg-white/90 rounded-full shadow-sm hover:bg-red-50 transition-colors"
                  data-testid={`remove-favorite-${product.id}`}
                >
                  {removing === product.id ? (
                    <Loader2 size={16} className="animate-spin text-gray-400" />
                  ) : (
                    <Trash2 size={16} className="text-red-500" />
                  )}
                </button>

                <Link to={`/products/${product.id}`}>
                  <div className="aspect-square bg-gray-100">
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
    </div>
  );
};

export default FavoritesPage;
