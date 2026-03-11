import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Heart, Play, Flame, Sparkles, ShoppingCart, Truck, MapPin } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../hooks/use-toast';
import { useSettings } from '../context/SettingsContext';
import LazyImage from './LazyImage';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const ProductCard = ({ product, variant = 'default' }) => {
  const { user, token } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const { settings } = useSettings();
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);

  // حد الشحن المجاني
  const freeShippingThreshold = settings?.free_shipping_threshold || 150000;
  const hasFreeShipping = product.price >= freeShippingThreshold;

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

  // منع النقر بالزر الأيمن وسحب الصورة
  const preventImageActions = (e) => {
    e.preventDefault();
    return false;
  };

  // إضافة للسلة
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

    // التحقق من المخزون
    if (product.stock === 0) {
      toast({
        title: "نفذت الكمية",
        description: "هذا المنتج غير متوفر حالياً",
        variant: "destructive"
      });
      return;
    }

    // إذا كان المنتج يحتوي على مقاسات، توجيه للصفحة
    if (product.available_sizes && product.available_sizes.length > 0) {
      window.location.href = `/products/${product.id}`;
      return;
    }

    setAddingToCart(true);
    try {
      await addToCart(product.id);
      // لا نُظهر إشعار - شريط الشحن العائم سيُظهر التقدم
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "حدث خطأ",
        variant: "destructive"
      });
    } finally {
      setAddingToCart(false);
    }
  };

  // Check if product is new (created in last 7 days)
  const isNew = product.created_at && 
    (new Date() - new Date(product.created_at)) < 7 * 24 * 60 * 60 * 1000;

  // Check if product is trending (high rating or reviews)
  const isTrending = (product.rating >= 4) || (product.reviews_count >= 10);

  return (
    <motion.div
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -6 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="h-full"
    >
      <Link 
        to={`/products/${product.id}`}
        className="product-card block rounded-2xl overflow-hidden h-full relative group"
        data-testid={`product-card-${product.id}`}
      >
        {/* Image Section */}
        <div className="aspect-[4/5] relative overflow-hidden bg-gradient-to-b from-gray-100 to-gray-50">
          <LazyImage
            src={product.images?.[0] || 'https://via.placeholder.com/400?text=No+Image'}
            alt={product.name}
            className="w-full h-full"
            aspectRatio="4/5"
            onContextMenu={preventImageActions}
            onDragStart={preventImageActions}
          />
          
          {/* Gradient Overlay on Hover */}
          <motion.div 
            className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"
            initial={{ opacity: 0 }}
            animate={{ opacity: isHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
          />
          
          {/* Protection Layer */}
          <div className="absolute inset-0 bg-transparent" onContextMenu={preventImageActions}></div>

          {/* Favorite Button */}
          <motion.button
            onClick={handleToggleFavorite}
            disabled={favoriteLoading}
            className={`absolute top-2 right-2 p-2 rounded-full z-20 shadow-lg transition-all duration-300 ${
              isFavorite 
                ? 'bg-red-500 text-white scale-110' 
                : 'bg-white/95 text-gray-500 hover:text-red-500 hover:scale-110'
            }`}
            whileTap={{ scale: 0.9 }}
            data-testid={`favorite-${product.id}`}
          >
            <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} strokeWidth={2} />
          </motion.button>

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 z-20">
            {isNew && (
              <motion.span 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="badge-new text-white text-[9px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-md"
              >
                <Sparkles size={10} />
                جديد
              </motion.span>
            )}
            {isTrending && !isNew && (
              <motion.span 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-[9px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-md"
              >
                <Flame size={10} />
                رائج
              </motion.span>
            )}
            {product.stock <= 5 && product.stock > 0 && (
              <span className="badge-limited text-white text-[9px] font-bold px-2 py-1 rounded-full shadow-md">
                آخر {product.stock} قطع
              </span>
            )}
            {product.stock === 0 && (
              <span className="badge-sale text-white text-[9px] font-bold px-2 py-1 rounded-full shadow-md">
                نفذت الكمية
              </span>
            )}
          </div>

          {/* Video Badge */}
          {product.video && (
            <motion.div 
              className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/70 text-white px-2 py-1 rounded-full z-20"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <Play size={12} className="fill-current" />
              <span className="text-[10px] font-medium">فيديو</span>
            </motion.div>
          )}
          
          {/* City Badge */}
          {product.city && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-white/95 text-gray-700 px-2 py-1 rounded-full z-20 shadow-sm">
              <MapPin size={12} className="text-[#FF6B00]" />
              <span className="text-[10px] font-medium">{product.city}</span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-3 bg-white">
          {/* Product Name */}
          <h3 className="font-bold text-sm line-clamp-2 mb-1 text-gray-800 group-hover:text-[#FF6B00] transition-colors leading-snug min-h-[2.5rem]">
            {product.name}
          </h3>
          
          {/* City - تحت اسم المنتج */}
          {product.city && (
            <div className="flex items-center gap-1 mb-2 text-gray-600">
              <MapPin size={12} className="text-[#FF6B00]" />
              <span className="text-xs">{product.city}</span>
            </div>
          )}
          
          {/* Rating */}
          <div className="flex items-center gap-1 mb-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star 
                  key={i} 
                  size={12} 
                  className={i < Math.floor(product.rating || 0) 
                    ? "fill-amber-400 text-amber-400" 
                    : "fill-gray-200 text-gray-200"
                  } 
                />
              ))}
            </div>
            <span className="text-xs text-gray-500">
              ({product.reviews_count || 0})
            </span>
          </div>

          {/* Price and Cart Button */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-col flex-1">
              <span className="text-[#FF6B00] font-extrabold text-sm">
                {formatPrice(product.price)}
              </span>
              {product.original_price && product.original_price > product.price && (
                <span className="text-gray-400 text-[10px] line-through">
                  {formatPrice(product.original_price)}
                </span>
              )}
              {hasFreeShipping && (
                <span className="text-green-600 text-[10px] font-bold flex items-center gap-0.5 mt-0.5">
                  <Truck size={10} />
                  شحن مجاني
                </span>
              )}
            </div>
            
            {/* Cart Button */}
            <motion.button
              onClick={handleAddToCart}
              disabled={addingToCart || product.stock === 0}
              whileTap={{ scale: 0.9 }}
              className={`p-2 rounded-full transition-all ${
                product.stock === 0 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-[#FF6B00] text-white hover:bg-[#E65000] shadow-md hover:shadow-lg'
              }`}
              data-testid={`add-to-cart-${product.id}`}
            >
              {addingToCart ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <ShoppingCart size={16} />
              )}
            </motion.button>
          </div>
        </div>

        {/* Bottom Highlight Line on Hover */}
        <motion.div 
          className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00]"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: isHovered ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        />
      </Link>
    </motion.div>
  );
};

export default ProductCard;
