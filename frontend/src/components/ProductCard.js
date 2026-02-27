import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, ShoppingCart, Heart } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

// مكون العلامة المائية المتكررة
const Watermark = () => (
  <div 
    className="absolute inset-0 pointer-events-none select-none overflow-hidden z-10"
    style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
  >
    {/* شبكة من العلامات المائية */}
    <div 
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{ transform: 'rotate(-30deg) scale(1.5)' }}
    >
      {[...Array(4)].map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 my-2">
          {[...Array(2)].map((_, colIndex) => (
            <span 
              key={colIndex}
              className="text-gray-500/25 text-xs font-bold whitespace-nowrap"
              style={{ 
                textShadow: '0 0 1px rgba(0,0,0,0.1)',
                letterSpacing: '0.5px'
              }}
            >
              تريند سورية
            </span>
          ))}
        </div>
      ))}
    </div>
    
    {/* شعار واضح في الزاوية */}
    <div className="absolute bottom-1 right-1 bg-[#FF6B00] text-white text-[6px] font-bold px-1 py-0.5 rounded">
      تريند سورية
    </div>
  </div>
);

const ProductCard = ({ product }) => {
  const { user, token } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  useEffect(() => {
    if (user && token) {
      checkFavorite();
    }
  }, [user, token, product.id]);

  const checkFavorite = async () => {
    try {
      const res = await axios.get(`${API}/favorites/check/${product.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsFavorite(res.data.is_favorite);
    } catch (error) {
      // Ignore error
    }
  };

  const handleToggleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: "يجب تسجيل الدخول",
        description: "سجل دخولك لإضافة المنتجات للمفضلة",
        variant: "destructive"
      });
      return;
    }

    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        await axios.delete(`${API}/favorites/${product.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsFavorite(false);
        toast({
          title: "تمت الإزالة",
          description: "تمت إزالة المنتج من المفضلة"
        });
      } else {
        await axios.post(`${API}/favorites/${product.id}`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsFavorite(true);
        toast({
          title: "تمت الإضافة",
          description: "تمت إضافة المنتج للمفضلة"
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "حدث خطأ",
        variant: "destructive"
      });
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: "يجب تسجيل الدخول",
        description: "سجل دخولك لإضافة المنتجات للسلة",
        variant: "destructive"
      });
      return;
    }

    try {
      await addToCart(product.id);
      toast({
        title: "تمت الإضافة",
        description: "تمت إضافة المنتج إلى السلة"
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "حدث خطأ",
        variant: "destructive"
      });
    }
  };

  // منع النقر بالزر الأيمن وسحب الصورة
  const preventImageActions = (e) => {
    e.preventDefault();
    return false;
  };

  return (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <Link 
        to={`/product/${product.id}`}
        className="block bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-[#FF6B00] hover:shadow-md transition-all group"
        data-testid={`product-card-${product.id}`}
      >
        {/* Image with Watermark - Smaller */}
        <div className="aspect-square relative overflow-hidden bg-gray-50">
          <img
            src={product.images?.[0] || 'https://via.placeholder.com/400?text=No+Image'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            draggable="false"
            onContextMenu={preventImageActions}
            onDragStart={preventImageActions}
            style={{ pointerEvents: 'none' }}
          />
          
          {/* طبقة شفافة لمنع التفاعل المباشر مع الصورة */}
          <div className="absolute inset-0 bg-transparent" onContextMenu={preventImageActions}></div>
          
          {/* العلامة المائية */}
          <Watermark />

          {/* زر المفضلة */}
          <button
            onClick={handleToggleFavorite}
            disabled={favoriteLoading}
            className={`absolute top-1 right-1 p-1.5 rounded-full z-20 transition-colors ${
              isFavorite 
                ? 'bg-red-500 text-white' 
                : 'bg-white/80 text-gray-600 hover:bg-white hover:text-red-500'
            }`}
            data-testid={`favorite-${product.id}`}
          >
            <Heart size={14} fill={isFavorite ? 'currentColor' : 'none'} />
          </button>

          {product.stock <= 5 && product.stock > 0 && (
            <span className="absolute top-1 left-1 bg-yellow-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full z-20">
              محدود
            </span>
          )}
          {product.stock === 0 && (
            <span className="absolute top-1 left-1 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full z-20">
              نفذ
            </span>
          )}
        </div>

        {/* Content - Smaller */}
        <div className="p-2">
          <h3 className="font-bold text-xs line-clamp-2 mb-1 text-gray-900 group-hover:text-[#FF6B00] transition-colors leading-tight">
            {product.name}
          </h3>
          
          {/* Rating - Smaller */}
          <div className="flex items-center gap-0.5 mb-1">
            <Star size={10} className="fill-[#FF6B00] text-[#FF6B00]" />
            <span className="text-[10px] text-gray-600">{product.rating || 0}</span>
            <span className="text-[8px] text-gray-400">({product.reviews_count || 0})</span>
          </div>

          {/* Price & Add to Cart - Smaller */}
          <div className="flex items-center justify-between">
            <span className="text-[#FF6B00] font-bold text-xs">{formatPrice(product.price)}</span>
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="p-1.5 bg-[#FF6B00] text-white rounded-full hover:bg-[#E65000] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-testid={`add-to-cart-${product.id}`}
            >
              <ShoppingCart size={12} />
            </button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
