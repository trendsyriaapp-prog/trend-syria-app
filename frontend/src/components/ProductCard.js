import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, ShoppingCart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../hooks/use-toast';

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const ProductCard = ({ product }) => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();

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

  return (
    <motion.div
      whileHover={{ y: -5 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <Link 
        to={`/product/${product.id}`}
        className="block bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-[#FF6B00] hover:shadow-lg transition-all group"
        data-testid={`product-card-${product.id}`}
      >
        {/* Image with Watermark */}
        <div className="aspect-square relative overflow-hidden bg-gray-50">
          <img
            src={product.images?.[0] || 'https://via.placeholder.com/400?text=No+Image'}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          
          {/* Watermark - تريند سوريا */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute inset-0 flex items-center justify-center">
              <span 
                className="text-white/20 text-2xl md:text-3xl font-bold rotate-[-30deg] select-none"
                style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}
              >
                تريند سوريا
              </span>
            </div>
          </div>
          
          {/* Diagonal Watermark Pattern */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-2 right-2 bg-[#FF6B00]/80 text-white text-[8px] font-bold px-2 py-0.5 rounded-full">
              تريند سوريا
            </div>
          </div>

          {product.stock <= 5 && product.stock > 0 && (
            <span className="absolute top-2 left-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              كمية محدودة
            </span>
          )}
          {product.stock === 0 && (
            <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              نفذت الكمية
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-bold text-sm line-clamp-2 mb-2 text-gray-900 group-hover:text-[#FF6B00] transition-colors">
            {product.name}
          </h3>
          
          {/* Rating */}
          <div className="flex items-center gap-1 mb-2">
            <Star size={14} className="fill-[#FF6B00] text-[#FF6B00]" />
            <span className="text-sm text-gray-600">{product.rating || 0}</span>
            <span className="text-xs text-gray-400">({product.reviews_count || 0})</span>
          </div>

          {/* Price & Add to Cart */}
          <div className="flex items-center justify-between">
            <span className="text-[#FF6B00] font-bold">{formatPrice(product.price)}</span>
            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0}
              className="p-2 bg-[#FF6B00] text-white rounded-full hover:bg-[#E65000] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-testid={`add-to-cart-${product.id}`}
            >
              <ShoppingCart size={18} />
            </button>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
