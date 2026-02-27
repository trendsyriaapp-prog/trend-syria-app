import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Star, ShoppingCart, Minus, Plus, Truck, Shield, 
  MessageCircle, ChevronRight, ChevronLeft 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { toast } = useToast();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [currentImage, setCurrentImage] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const res = await axios.get(`${API}/products/${id}`);
      setProduct(res.data);
    } catch (error) {
      toast({
        title: "خطأ",
        description: "المنتج غير موجود",
        variant: "destructive"
      });
      navigate('/products');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!user) {
      toast({
        title: "يجب تسجيل الدخول",
        description: "سجل دخولك لإضافة المنتجات للسلة",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }

    setAddingToCart(true);
    try {
      await addToCart(product.id, quantity);
      toast({
        title: "تمت الإضافة",
        description: `تمت إضافة ${quantity} ${product.name} إلى السلة`
      });
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

  const handleContactSeller = () => {
    if (!user) {
      toast({
        title: "يجب تسجيل الدخول",
        description: "سجل دخولك للتواصل مع البائع",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }
    navigate(`/messages/${product.seller_id}?product=${product.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="min-h-screen pb-20 md:pb-10">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-white/50 mb-6">
          <a href="/" className="hover:text-white">الرئيسية</a>
          <ChevronLeft size={16} />
          <a href="/products" className="hover:text-white">المنتجات</a>
          <ChevronLeft size={16} />
          <span className="text-white">{product.name}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Images */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="aspect-square rounded-2xl overflow-hidden bg-[#121212] mb-4">
              <img
                src={product.images?.[currentImage] || 'https://via.placeholder.com/600'}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto hide-scrollbar">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImage(i)}
                    className={`w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors ${
                      currentImage === i ? 'border-[#FF6B00]' : 'border-transparent'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <h1 className="text-2xl md:text-3xl font-bold mb-4" data-testid="product-name">
              {product.name}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={20}
                    className={i < Math.round(product.rating) ? 'fill-[#FF6B00] text-[#FF6B00]' : 'text-white/20'}
                  />
                ))}
              </div>
              <span className="text-white/70">({product.reviews_count} تقييم)</span>
            </div>

            {/* Price */}
            <div className="mb-6">
              <span className="text-3xl font-bold text-[#FF6B00]" data-testid="product-price">
                {formatPrice(product.price)}
              </span>
            </div>

            {/* Description */}
            <p className="text-white/70 mb-6 leading-relaxed">
              {product.description}
            </p>

            {/* Stock */}
            <div className="mb-6">
              {product.stock > 0 ? (
                <span className="text-green-500 font-medium">متوفر ({product.stock} قطعة)</span>
              ) : (
                <span className="text-red-500 font-medium">غير متوفر</span>
              )}
            </div>

            {/* Quantity */}
            {product.stock > 0 && (
              <div className="flex items-center gap-4 mb-6">
                <span className="text-white/70">الكمية:</span>
                <div className="flex items-center gap-2 bg-[#121212] rounded-full p-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    data-testid="decrease-qty"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="w-12 text-center font-bold" data-testid="quantity">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    data-testid="increase-qty"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 mb-8">
              <button
                onClick={handleAddToCart}
                disabled={product.stock === 0 || addingToCart}
                className="flex-1 flex items-center justify-center gap-2 bg-[#FF6B00] text-black font-bold py-4 rounded-full hover:bg-[#E65000] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                data-testid="add-to-cart-btn"
              >
                {addingToCart ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-black" />
                ) : (
                  <>
                    <ShoppingCart size={20} />
                    أضف للسلة
                  </>
                )}
              </button>
              <button
                onClick={handleContactSeller}
                className="p-4 bg-[#121212] border border-white/10 rounded-full hover:bg-white/5 transition-colors"
                data-testid="contact-seller-btn"
              >
                <MessageCircle size={20} />
              </button>
            </div>

            {/* Features */}
            <div className="space-y-3 border-t border-white/10 pt-6">
              <div className="flex items-center gap-3 text-white/70">
                <Truck size={20} className="text-[#FF6B00]" />
                <span>توصيل مجاني لجميع المحافظات</span>
              </div>
              <div className="flex items-center gap-3 text-white/70">
                <Shield size={20} className="text-[#FF6B00]" />
                <span>ضمان استرجاع خلال 14 يوم</span>
              </div>
            </div>

            {/* Seller */}
            <div className="mt-6 p-4 bg-[#121212] rounded-xl border border-white/5">
              <p className="text-sm text-white/50">البائع</p>
              <p className="font-bold">{product.seller_name}</p>
            </div>
          </motion.div>
        </div>

        {/* Reviews */}
        {product.reviews?.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-bold mb-6">التقييمات</h2>
            <div className="space-y-4">
              {product.reviews.map((review) => (
                <div key={review.id} className="bg-[#121212] rounded-xl p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold">{review.user_name}</span>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className={i < review.rating ? 'fill-[#FF6B00] text-[#FF6B00]' : 'text-white/20'}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-white/70">{review.comment}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default ProductDetailPage;
