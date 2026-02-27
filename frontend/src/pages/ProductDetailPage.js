import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Star, ShoppingCart, Minus, Plus, Truck, Shield, 
  MessageCircle, ChevronLeft, Camera, X, Send, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

// مكون التقييم بالنجوم
const StarRating = ({ rating, setRating, readonly = false, size = 24 }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && setRating(star)}
          className={`${readonly ? '' : 'hover:scale-110 transition-transform cursor-pointer'}`}
        >
          <Star
            size={size}
            className={star <= rating ? 'fill-[#FF6B00] text-[#FF6B00]' : 'text-gray-300'}
          />
        </button>
      ))}
    </div>
  );
};

// مكون نموذج التقييم
const ReviewForm = ({ productId, onSuccess }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    if (images.length + files.length > 3) {
      toast({
        title: "تنبيه",
        description: "يمكنك رفع 3 صور كحد أقصى",
        variant: "destructive"
      });
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast({
        title: "خطأ",
        description: "يرجى كتابة تعليق",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/reviews`, {
        product_id: productId,
        rating,
        comment,
        images
      });

      toast({
        title: "تم إضافة التقييم",
        description: "شكراً لمشاركة رأيك!"
      });
      
      setRating(5);
      setComment('');
      setImages([]);
      onSuccess?.();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "حدث خطأ",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl p-4 border border-gray-200 mt-4">
      <h4 className="font-bold text-gray-900 mb-4">أضف تقييمك</h4>
      
      {/* Star Rating */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">تقييمك</label>
        <StarRating rating={rating} setRating={setRating} size={32} />
      </div>

      {/* Comment */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">تعليقك</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 rounded-lg py-3 px-4 text-gray-900 placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none"
          placeholder="شاركنا تجربتك مع هذا المنتج..."
          rows={3}
          required
        />
      </div>

      {/* Image Upload */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          صور المنتج (اختياري - حتى 3 صور)
        </label>
        <div className="flex gap-2 flex-wrap">
          {images.map((img, i) => (
            <div key={i} className="relative w-20 h-20">
              <img src={img} alt="" className="w-full h-full object-cover rounded-lg" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {images.length < 3 && (
            <button
              type="button"
              onClick={() => document.getElementById('review-images').click()}
              className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-[#FF6B00] transition-colors"
            >
              <Camera size={24} className="text-gray-400" />
              <span className="text-xs text-gray-400 mt-1">إضافة</span>
            </button>
          )}
        </div>
        <input
          id="review-images"
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          className="hidden"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#FF6B00] text-white font-bold py-3 rounded-full hover:bg-[#E65000] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            جاري الإرسال...
          </>
        ) : (
          <>
            <Send size={18} />
            إرسال التقييم
          </>
        )}
      </button>
    </form>
  );
};

// مكون عرض التقييم
const ReviewCard = ({ review }) => {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#FF6B00] flex items-center justify-center">
            <span className="text-white font-bold text-sm">{review.user_name?.[0]}</span>
          </div>
          <span className="font-bold text-gray-900">{review.user_name}</span>
        </div>
        <StarRating rating={review.rating} readonly size={16} />
      </div>
      
      <p className="text-gray-700 mb-3">{review.comment}</p>
      
      {/* Review Images */}
      {review.images && review.images.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-2">
          {review.images.map((img, i) => (
            <img
              key={i}
              src={img}
              alt="صورة التقييم"
              className="w-20 h-20 object-cover rounded-lg border border-gray-200"
            />
          ))}
        </div>
      )}
      
      <p className="text-xs text-gray-400">
        {new Date(review.created_at).toLocaleDateString('ar-SY')}
      </p>
    </div>
  );
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
  const [canReview, setCanReview] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const res = await axios.get(`${API}/products/${id}`);
      setProduct(res.data);
      
      // Check if user can review (has purchased this product)
      if (user) {
        try {
          const ordersRes = await axios.get(`${API}/orders`);
          const hasPurchased = ordersRes.data.some(order => 
            order.status === 'paid' && 
            order.items.some(item => item.product_id === id)
          );
          const hasReviewed = res.data.reviews?.some(r => r.user_id === user.id);
          setCanReview(hasPurchased && !hasReviewed);
        } catch (e) {
          setCanReview(false);
        }
      }
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }

  if (!product) return null;

  return (
    <div className="min-h-screen pb-20 md:pb-10 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <a href="/" className="hover:text-gray-900">الرئيسية</a>
          <ChevronLeft size={16} />
          <a href="/products" className="hover:text-gray-900">المنتجات</a>
          <ChevronLeft size={16} />
          <span className="text-gray-900">{product.name}</span>
        </nav>

        <div className="flex flex-col">
          {/* Images */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <div className="aspect-video md:aspect-[16/9] max-h-[400px] rounded-2xl overflow-hidden bg-white border border-gray-200 mb-4">
              <img
                src={product.images?.[currentImage] || 'https://via.placeholder.com/600'}
                alt={product.name}
                className="w-full h-full object-contain"
              />
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto hide-scrollbar justify-center">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImage(i)}
                    className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors ${
                      currentImage === i ? 'border-[#FF6B00]' : 'border-gray-200'
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto w-full"
          >
            <h1 className="text-2xl md:text-3xl font-bold mb-4 text-gray-900" data-testid="product-name">
              {product.name}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-3 mb-4">
              <StarRating rating={Math.round(product.rating || 0)} readonly size={20} />
              <span className="text-gray-600">({product.reviews_count || 0} تقييم)</span>
            </div>

            {/* Price */}
            <div className="mb-6">
              <span className="text-3xl font-bold text-[#FF6B00]" data-testid="product-price">
                {formatPrice(product.price)}
              </span>
            </div>

            {/* Description */}
            <p className="text-gray-600 mb-6 leading-relaxed">
              {product.description}
            </p>

            {/* Product Dimensions */}
            {(product.length_cm || product.width_cm || product.height_cm) && (
              <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <h4 className="font-bold text-gray-900 mb-3">أبعاد المنتج</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                  {product.length_cm && (
                    <div>
                      <p className="text-sm text-gray-500">الطول</p>
                      <p className="font-bold text-gray-900">{product.length_cm} سم</p>
                    </div>
                  )}
                  {product.width_cm && (
                    <div>
                      <p className="text-sm text-gray-500">العرض</p>
                      <p className="font-bold text-gray-900">{product.width_cm} سم</p>
                    </div>
                  )}
                  {product.height_cm && (
                    <div>
                      <p className="text-sm text-gray-500">الارتفاع</p>
                      <p className="font-bold text-gray-900">{product.height_cm} سم</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stock */}
            <div className="mb-6">
              {product.stock > 0 ? (
                <span className="text-green-600 font-medium">متوفر ({product.stock} قطعة)</span>
              ) : (
                <span className="text-red-500 font-medium">غير متوفر</span>
              )}
            </div>

            {/* Quantity */}
            {product.stock > 0 && (
              <div className="flex items-center gap-4 mb-6">
                <span className="text-gray-600">الكمية:</span>
                <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    data-testid="decrease-qty"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="w-12 text-center font-bold" data-testid="quantity">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="p-2 hover:bg-gray-200 rounded-full transition-colors"
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
                className="flex-1 flex items-center justify-center gap-2 bg-[#FF6B00] text-white font-bold py-4 rounded-full hover:bg-[#E65000] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                data-testid="add-to-cart-btn"
              >
                {addingToCart ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white" />
                ) : (
                  <>
                    <ShoppingCart size={20} />
                    أضف للسلة
                  </>
                )}
              </button>
              <button
                onClick={handleContactSeller}
                className="p-4 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
                data-testid="contact-seller-btn"
              >
                <MessageCircle size={20} className="text-gray-700" />
              </button>
            </div>

            {/* Features */}
            <div className="space-y-3 border-t border-gray-200 pt-6">
              <div className="flex items-center gap-3 text-gray-600">
                <Truck size={20} className="text-[#FF6B00]" />
                <span>توصيل مجاني لجميع المحافظات</span>
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Shield size={20} className="text-[#FF6B00]" />
                <span>ضمان استرجاع خلال 14 يوم</span>
              </div>
            </div>

            {/* Seller */}
            <div className="mt-6 p-4 bg-white rounded-xl border border-gray-200">
              <p className="text-sm text-gray-500">البائع</p>
              <p className="font-bold text-gray-900">{product.seller_name}</p>
              {product.city && (
                <p className="text-sm text-gray-600 mt-1">
                  <span className="inline-flex items-center gap-1">
                    📍 {product.city}
                  </span>
                </p>
              )}
            </div>
          </motion.div>
        </div>

        {/* Reviews Section */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">التقييمات ({product.reviews?.length || 0})</h2>
          
          {/* Review Form - Only show if user can review */}
          {canReview && (
            <ReviewForm productId={product.id} onSuccess={fetchProduct} />
          )}
          
          {user && !canReview && product.reviews?.some(r => r.user_id === user.id) && (
            <p className="text-gray-500 mb-4 bg-green-50 p-3 rounded-lg border border-green-200">
              ✅ لقد قمت بتقييم هذا المنتج مسبقاً
            </p>
          )}

          {user && !canReview && !product.reviews?.some(r => r.user_id === user.id) && (
            <p className="text-gray-500 mb-4 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
              ⚠️ يجب شراء المنتج أولاً لتتمكن من تقييمه
            </p>
          )}

          {/* Reviews List */}
          {product.reviews?.length > 0 ? (
            <div className="space-y-4 mt-6">
              {product.reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-white rounded-xl border border-gray-200">
              <Star size={40} className="text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">لا توجد تقييمات بعد</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ProductDetailPage;
