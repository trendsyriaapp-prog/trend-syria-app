import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Star, ShoppingCart, Minus, Plus, Truck, Shield, 
  MessageCircle, ChevronLeft, Camera, X, Send, Loader2, Store, Play, Zap, Share2, Clock, Ruler, Check
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
  const [showFullImage, setShowFullImage] = useState(null);
  
  return (
    <div className="bg-white rounded-lg p-3 border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#FF6B00] flex items-center justify-center">
            <span className="text-white font-bold text-xs">{review.user_name?.[0]}</span>
          </div>
          <span className="font-bold text-sm text-gray-900">{review.user_name}</span>
        </div>
        <StarRating rating={review.rating} readonly size={12} />
      </div>
      
      <p className="text-sm text-gray-700 mb-2">{review.comment}</p>
      
      {/* Review Images */}
      {review.images && review.images.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-2">
          {review.images.map((img, i) => (
            <div key={i} className="relative">
              <img
                src={img}
                alt="صورة من العميل"
                className="w-16 h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setShowFullImage(img)}
              />
            </div>
          ))}
        </div>
      )}
      
      <p className="text-[10px] text-gray-400">
        {new Date(review.created_at).toLocaleDateString('ar-SY')}
      </p>

      {/* Full Image Modal */}
      {showFullImage && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowFullImage(null)}
        >
          <img
            src={showFullImage}
            alt="صورة مكبرة"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
};

// بيانات دليل المقاسات
const SIZE_GUIDES = {
  clothes: {
    title: 'دليل مقاسات الملابس',
    headers: ['المقاس', 'الصدر (سم)', 'الخصر (سم)', 'الطول (سم)'],
    rows: [
      ['S', '86-91', '71-76', '165-170'],
      ['M', '91-96', '76-81', '170-175'],
      ['L', '96-101', '81-86', '175-180'],
      ['XL', '101-106', '86-91', '180-185'],
      ['XXL', '106-111', '91-96', '185-190'],
      ['3XL', '111-116', '96-101', '190-195'],
    ]
  },
  shoes: {
    title: 'دليل مقاسات الأحذية',
    headers: ['المقاس EU', 'طول القدم (سم)', 'المقاس US'],
    rows: [
      ['36', '22.5', '4'],
      ['37', '23', '5'],
      ['38', '23.5', '6'],
      ['39', '24', '7'],
      ['40', '24.5', '7.5'],
      ['41', '25', '8'],
      ['42', '25.5', '9'],
      ['43', '26.5', '10'],
      ['44', '27', '11'],
      ['45', '27.5', '12'],
      ['46', '28', '13'],
    ]
  },
  pants: {
    title: 'دليل مقاسات البناطيل',
    headers: ['المقاس', 'الخصر (سم)', 'الورك (سم)', 'طول الساق (سم)'],
    rows: [
      ['28', '71', '89', '76'],
      ['30', '76', '94', '78'],
      ['32', '81', '99', '80'],
      ['34', '86', '104', '81'],
      ['36', '91', '109', '82'],
      ['38', '96', '114', '83'],
      ['40', '101', '119', '84'],
      ['42', '106', '124', '85'],
    ]
  }
};

// مكون دليل المقاسات
const SizeGuideModal = ({ isOpen, onClose, sizeType }) => {
  if (!isOpen) return null;
  
  const guide = SIZE_GUIDES[sizeType] || SIZE_GUIDES.clothes;
  
  return (
    <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gradient-to-r from-[#FF6B00] to-[#FF8533]">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Ruler size={16} />
            {guide.title}
          </h3>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-3 overflow-y-auto max-h-[60vh]">
          {/* Tips */}
          <div className="bg-blue-50 rounded-lg p-2 mb-3 text-[11px] text-blue-700">
            <p className="font-bold mb-1">💡 نصائح لاختيار المقاس:</p>
            <ul className="space-y-0.5 list-disc mr-4">
              <li>قس جسمك بشريط قياس مرن</li>
              <li>إذا كنت بين مقاسين، اختر المقاس الأكبر</li>
              <li>راجع تقييمات المشترين السابقين</li>
            </ul>
          </div>
          
          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-gray-100">
                  {guide.headers.map((header, i) => (
                    <th key={i} className="py-2 px-2 text-right font-bold text-gray-700 border-b border-gray-200">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {guide.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    {row.map((cell, cellIndex) => (
                      <td 
                        key={cellIndex} 
                        className={`py-2 px-2 border-b border-gray-100 ${cellIndex === 0 ? 'font-bold text-[#FF6B00]' : 'text-gray-600'}`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* How to measure */}
          <div className="mt-3 p-2 bg-gray-50 rounded-lg">
            <p className="font-bold text-[11px] text-gray-700 mb-1">📏 طريقة القياس:</p>
            {sizeType === 'clothes' && (
              <ul className="text-[10px] text-gray-600 space-y-0.5">
                <li><strong>الصدر:</strong> قس حول أعرض جزء من الصدر</li>
                <li><strong>الخصر:</strong> قس حول أضيق جزء من الخصر</li>
                <li><strong>الطول:</strong> قف مستقيماً وقس من الرأس للقدم</li>
              </ul>
            )}
            {sizeType === 'shoes' && (
              <ul className="text-[10px] text-gray-600 space-y-0.5">
                <li><strong>طول القدم:</strong> قف على ورقة وارسم حول قدمك</li>
                <li>قس من الكعب لأطول إصبع</li>
                <li>قس كلا القدمين واختر الأكبر</li>
              </ul>
            )}
            {sizeType === 'pants' && (
              <ul className="text-[10px] text-gray-600 space-y-0.5">
                <li><strong>الخصر:</strong> قس حول خط حزام البنطال</li>
                <li><strong>الورك:</strong> قس حول أعرض جزء من الأرداف</li>
                <li><strong>طول الساق:</strong> من الخصر للكاحل من الداخل</li>
              </ul>
            )}
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full bg-[#FF6B00] text-white font-bold py-2 rounded-full text-xs hover:bg-[#E65000] transition-colors"
          >
            فهمت، اختيار المقاس
          </button>
        </div>
      </motion.div>
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
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [showFullGallery, setShowFullGallery] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [galleryTouchStart, setGalleryTouchStart] = useState(null);
  const [galleryTouchEnd, setGalleryTouchEnd] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  
  // Q&A states
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [answeringId, setAnsweringId] = useState(null);
  const [newAnswer, setNewAnswer] = useState('');
  
  // Similar products state
  const [similarProducts, setSimilarProducts] = useState([]);
  
  // Shipping state
  const [shippingInfo, setShippingInfo] = useState(null);
  const [customerCity, setCustomerCity] = useState('');
  const [cities, setCities] = useState([]);

  // الحد الأدنى للسحب للتنقل بين الصور
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && product?.images?.length > 1) {
      // سحب لليسار = الصورة التالية
      setCurrentImage(prev => prev === product.images.length - 1 ? 0 : prev + 1);
    }
    if (isRightSwipe && product?.images?.length > 1) {
      // سحب لليمين = الصورة السابقة
      setCurrentImage(prev => prev === 0 ? product.images.length - 1 : prev - 1);
    }
  };

  useEffect(() => {
    fetchProduct();
    fetchSimilarProducts();
    fetchCities();
  }, [id]);

  useEffect(() => {
    // Get user's city from localStorage or user profile
    if (user?.city) {
      setCustomerCity(user.city);
    }
  }, [user]);

  useEffect(() => {
    // Calculate shipping when product and customer city are available
    if (product && customerCity) {
      calculateShipping();
    }
  }, [product, customerCity]);

  const fetchCities = async () => {
    try {
      const res = await axios.get(`${API}/shipping/cities`);
      setCities(res.data);
    } catch (error) {
      console.error('Error fetching cities:', error);
    }
  };

  const calculateShipping = async () => {
    if (!product?.id || !customerCity) return;
    try {
      const res = await axios.get(`${API}/shipping/calculate?product_id=${product.id}&customer_city=${encodeURIComponent(customerCity)}`);
      setShippingInfo(res.data);
    } catch (error) {
      console.error('Error calculating shipping:', error);
    }
  };

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

  const fetchQuestions = async () => {
    try {
      const res = await axios.get(`${API}/products/${id}/questions`);
      setQuestions(res.data);
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
  };

  const fetchSimilarProducts = async () => {
    try {
      const res = await axios.get(`${API}/products/${id}/similar`);
      setSimilarProducts(res.data);
    } catch (error) {
      console.error('Error fetching similar products:', error);
    }
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim() || askingQuestion) return;
    
    if (!user) {
      toast({
        title: "يجب تسجيل الدخول",
        description: "سجل دخولك لطرح سؤال",
        variant: "destructive"
      });
      navigate('/login');
      return;
    }

    setAskingQuestion(true);
    try {
      await axios.post(`${API}/products/${id}/questions`, { question: newQuestion });
      toast({ title: "تم إرسال السؤال", description: "سيرد البائع قريباً" });
      setNewQuestion('');
      fetchQuestions();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل إرسال السؤال",
        variant: "destructive"
      });
    } finally {
      setAskingQuestion(false);
    }
  };

  const handleAnswerQuestion = async (questionId) => {
    if (!newAnswer.trim()) return;
    
    try {
      await axios.post(`${API}/products/${id}/questions/${questionId}/answer`, { answer: newAnswer });
      toast({ title: "تم إضافة الرد" });
      setNewAnswer('');
      setAnsweringId(null);
      fetchQuestions();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل إضافة الرد",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (id) {
      fetchQuestions();
    }
  }, [id]);

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

    // التحقق من اختيار المقاس إذا كان المنتج يحتوي على مقاسات
    if (product.available_sizes && product.available_sizes.length > 0 && !selectedSize) {
      toast({
        title: "يرجى اختيار المقاس",
        description: "اختر المقاس المناسب قبل الإضافة للسلة",
        variant: "destructive"
      });
      return;
    }

    setAddingToCart(true);
    try {
      await addToCart(product.id, quantity, selectedSize);
      toast({
        title: "تمت الإضافة",
        description: `تمت إضافة ${quantity} ${product.name}${selectedSize ? ` (${selectedSize})` : ''} إلى السلة`
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }

  if (!product) return null;

  // دالة المشاركة
  const handleShare = async () => {
    const shareUrl = window.location.href;
    const shareText = `${product.name} - ${formatPrice(product.price)} | تريند سورية`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "تم النسخ",
        description: "تم نسخ رابط المنتج"
      });
    }
  };

  return (
    <div className="min-h-screen pb-32 md:pb-10 bg-gray-50">
      {/* زر الرجوع */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            data-testid="back-btn"
          >
            <ChevronLeft size={24} className="text-gray-700 rotate-180" />
          </button>
          <span className="font-bold text-gray-800 truncate flex-1">{product?.name || 'تفاصيل المنتج'}</span>
          <button
            onClick={handleShare}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            data-testid="share-btn"
          >
            <Share2 size={20} className="text-gray-600" />
          </button>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto">

        <div className="flex flex-col">
          {/* Images */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3"
          >
            <div 
              className="aspect-square max-h-[500px] overflow-hidden bg-white relative cursor-pointer"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onClick={() => { setGalleryIndex(currentImage); setShowFullGallery(true); }}
            >
              <img
                src={product.images?.[currentImage] || 'https://via.placeholder.com/600'}
                alt={product.name}
                className="w-full h-full object-contain select-none"
                onContextMenu={(e) => e.preventDefault()}
                draggable="false"
              />
              
              {/* نقاط التنقل بين الصور - داخل الصورة */}
              {product.images?.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10">
                  <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-full">
                    {product.images.map((_, i) => (
                      <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); setCurrentImage(i); }}
                        className={`rounded-full transition-all ${
                          currentImage === i 
                            ? 'bg-white w-[7px] h-[7px]' 
                            : 'bg-white/60 hover:bg-white/80 w-[6px] h-[6px]'
                        }`}
                        data-testid={`dot-${i}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* خط مستقيم أسفل الصورة مع أيقونة الفيديو */}
            <div className="h-[1px] bg-gray-200 relative">
              {(product.video || product.video_url) && (
                <div className="absolute right-2 -top-2.5 z-20">
                  <button
                    onClick={() => {
                      if (product.video) {
                        const videoWindow = window.open('', '_blank');
                        videoWindow.document.write(`<video src="${product.video}" controls autoplay style="width:100%;height:100vh;background:#000;"></video>`);
                      } else if (product.video_url) {
                        window.open(product.video_url, '_blank');
                      }
                    }}
                    className="flex items-center gap-1 bg-gradient-to-r from-red-500 to-pink-500 text-white px-2 py-1 rounded-full text-[8px] font-bold hover:from-red-600 hover:to-pink-600 transition-all shadow"
                    data-testid="video-btn"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="white" strokeWidth="1">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    مشاهدة فيديو
                  </button>
                </div>
              )}
            </div>
            
            {/* شريط المميزات */}
            <div className="flex items-center justify-center gap-2 py-1.5 bg-gradient-to-r from-green-50 via-white to-orange-50 mt-4 px-2 flex-wrap">
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Truck size={8} className="text-white" />
                </div>
                <span className="text-[11px] text-gray-700 font-medium">توصيل مجاني داخل المحافظات</span>
              </div>
              <div className="w-px h-3 bg-gray-300"></div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-[#FF6B00] rounded-full flex items-center justify-center flex-shrink-0">
                  <Shield size={8} className="text-white" />
                </div>
                <span className="text-[11px] text-gray-700 font-medium">ضمان استرداد الأموال خلال ساعة</span>
              </div>
              <div className="w-px h-3 bg-gray-300"></div>
              <div className="flex items-center gap-1">
                <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Clock size={8} className="text-white" />
                </div>
                <span className="text-[11px] text-gray-700 font-medium">تسليم خلال 1-3 أيام</span>
              </div>
            </div>
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto w-full px-4 -mt-1"
          >
            <h1 className="text-sm md:text-base font-bold mb-0.5 text-gray-900" data-testid="product-name">
              {product.name}
            </h1>

            {/* Rating */}
            <div className="flex items-center gap-2 mb-0.5">
              <StarRating rating={Math.round(product.rating || 0)} readonly size={12} />
              <span className="text-[10px] text-gray-600">({product.reviews_count || 0} تقييم)</span>
            </div>

            {/* Description */}
            <p className="text-xs text-gray-600 mb-1.5 leading-snug">
              {product.description}
            </p>

            {/* Product Dimensions & Weight */}
            {(product.length_cm || product.width_cm || product.height_cm || product.weight_kg) && (
              <div className="mb-1.5 p-1.5 bg-gray-50 rounded-lg border border-gray-200">
                <h4 className="font-bold text-gray-900 text-[10px] mb-0.5">مواصفات المنتج</h4>
                <div className="flex gap-3 text-center text-[10px]">
                  {product.length_cm && (
                    <div>
                      <p className="text-[9px] text-gray-500">الطول</p>
                      <p className="font-bold text-gray-900">{product.length_cm} سم</p>
                    </div>
                  )}
                  {product.width_cm && (
                    <div>
                      <p className="text-[9px] text-gray-500">العرض</p>
                      <p className="font-bold text-gray-900">{product.width_cm} سم</p>
                    </div>
                  )}
                  {product.height_cm && (
                    <div>
                      <p className="text-[9px] text-gray-500">الارتفاع</p>
                      <p className="font-bold text-gray-900">{product.height_cm} سم</p>
                    </div>
                  )}
                  {product.weight_kg && (
                    <div>
                      <p className="text-[9px] text-gray-500">الوزن</p>
                      <p className="font-bold text-gray-900">{product.weight_kg} كغ</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stock */}
            <div className="mb-1.5">
              {product.stock > 0 ? (
                <span className="text-green-600 font-medium text-xs">متوفر ({product.stock} قطعة)</span>
              ) : (
                <span className="text-red-500 font-medium text-xs">غير متوفر</span>
              )}
            </div>

            {/* Shipping Cost Calculator */}
            <div className="mb-2 p-2 bg-gradient-to-r from-blue-50 to-white rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <Truck size={16} className="text-blue-600" />
                <h4 className="font-bold text-gray-900 text-[11px]">تكلفة الشحن</h4>
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <select
                  value={customerCity}
                  onChange={(e) => setCustomerCity(e.target.value)}
                  className="flex-1 text-xs p-2 border border-gray-200 rounded-lg focus:border-[#FF6B00] focus:outline-none"
                  data-testid="shipping-city-select"
                >
                  <option value="">اختر محافظتك</option>
                  {cities.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              {shippingInfo && (
                <div className={`p-2 rounded-lg ${
                  shippingInfo.shipping_type === 'free' 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-orange-50 border border-orange-200'
                }`}>
                  {shippingInfo.shipping_type === 'free' ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <Check size={12} className="text-white" />
                      </div>
                      <div>
                        <p className="text-green-700 font-bold text-xs">توصيل مجاني! 🎉</p>
                        <p className="text-green-600 text-[10px]">المنتج من نفس محافظتك ({shippingInfo.seller_city})</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-orange-700 font-bold text-xs">
                          تكلفة الشحن: {formatPrice(shippingInfo.shipping_cost)}
                        </p>
                        <p className="text-orange-600 text-[10px]">
                          من {shippingInfo.seller_city} إلى {shippingInfo.customer_city}
                        </p>
                      </div>
                      <Truck size={20} className="text-orange-500" />
                    </div>
                  )}
                </div>
              )}

              {!customerCity && (
                <p className="text-[10px] text-gray-500 mt-1">
                  اختر محافظتك لمعرفة تكلفة الشحن
                </p>
              )}
            </div>

            {/* Size Selection */}
            {product.available_sizes && product.available_sizes.length > 0 && (
              <div className="mb-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-1.5">
                  <h4 className="font-bold text-gray-900 text-[11px]">
                    اختر المقاس
                    {product.size_type === 'clothes' && ' (ملابس)'}
                    {product.size_type === 'shoes' && ' (أحذية)'}
                    {product.size_type === 'pants' && ' (بناطيل)'}
                  </h4>
                  <button
                    onClick={() => setShowSizeGuide(true)}
                    className="flex items-center gap-1 text-[10px] text-[#FF6B00] font-bold hover:underline"
                    data-testid="size-guide-btn"
                  >
                    <Ruler size={12} />
                    دليل المقاسات
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {product.available_sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`min-w-[36px] h-8 px-2 rounded-lg text-xs font-bold transition-all ${
                        selectedSize === size
                          ? 'bg-[#FF6B00] text-white border-2 border-[#FF6B00]'
                          : 'bg-white text-gray-700 border border-gray-300 hover:border-[#FF6B00]'
                      }`}
                      data-testid={`size-${size}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  {!selectedSize ? (
                    <p className="text-[10px] text-red-500">* يرجى اختيار المقاس</p>
                  ) : (
                    <p className="text-[10px] text-green-600 font-bold">✓ المقاس المختار: {selectedSize}</p>
                  )}
                </div>
              </div>
            )}

            {/* Seller/Store Info */}
            <div className="mt-1.5 p-1.5 bg-white rounded-lg border border-gray-200">
              <p className="text-[10px] text-gray-500">المتجر</p>
              <Link 
                to={`/store/${product.seller_id || ''}`}
                className="font-bold text-xs text-[#FF6B00] hover:underline flex items-center gap-1"
              >
                <Store size={12} />
                {product.business_name || 'متجر'}
              </Link>
              
              {/* معلومات البائع والموقع للمدير فقط */}
              {user?.user_type === 'admin' && (
                <div className="mt-1.5 pt-1.5 border-t border-gray-200">
                  <p className="text-[10px] text-red-500 font-bold mb-0.5">معلومات للمدير فقط:</p>
                  <p className="text-[10px] text-gray-600">اسم البائع: {product.seller_name}</p>
                  {product.seller_phone && (
                    <p className="text-[10px] text-gray-600">رقم الهاتف: {product.seller_phone}</p>
                  )}
                  {product.city && (
                    <p className="text-[10px] text-gray-600">📍 الموقع: {product.city}</p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Reviews Section */}
        <section className="mt-4 px-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle size={16} className="text-[#FF6B00]" />
            <h2 className="text-sm font-bold text-gray-900">تعليقات وصور العملاء ({product.reviews?.length || 0})</h2>
          </div>
          
          {/* Review Form - Only show if user can review */}
          {canReview && (
            <ReviewForm productId={product.id} onSuccess={fetchProduct} />
          )}
          
          {user && !canReview && product.reviews?.some(r => r.user_id === user.id) && (
            <p className="text-gray-500 mb-3 bg-green-50 p-2 rounded-lg border border-green-200 text-xs">
              ✅ لقد قمت بتقييم هذا المنتج مسبقاً
            </p>
          )}

          {user && !canReview && !product.reviews?.some(r => r.user_id === user.id) && (
            <p className="text-gray-500 mb-3 bg-yellow-50 p-2 rounded-lg border border-yellow-200 text-sm">
              ⚠️ يجب شراء المنتج أولاً لتتمكن من تقييمه
            </p>
          )}

          {/* Reviews List */}
          {product.reviews?.length > 0 ? (
            <div className="space-y-3 mt-4">
              {product.reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-white rounded-xl border border-gray-200">
              <Star size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">لا توجد تعليقات أو صور بعد</p>
              <p className="text-gray-400 text-xs">كن أول من يشارك تجربته!</p>
            </div>
          )}
        </section>

        {/* Q&A Section - Public Questions */}
        <section className="mt-4 px-4 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle size={16} className="text-green-600" />
            <h2 className="text-sm font-bold text-gray-900">أسئلة وأجوبة ({questions.length})</h2>
          </div>

          {/* Ask Question Form */}
          <form onSubmit={handleAskQuestion} className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder={user ? "اطرح سؤالك عن المنتج..." : "سجل دخولك لطرح سؤال"}
                className="flex-1 bg-white border border-gray-300 rounded-full py-2 px-4 text-sm placeholder:text-gray-400 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/20"
                disabled={!user}
                data-testid="question-input"
              />
              <button
                type="submit"
                disabled={!newQuestion.trim() || askingQuestion || !user}
                className="px-4 py-2 bg-green-500 text-white rounded-full text-sm font-bold hover:bg-green-600 disabled:opacity-50 transition-colors"
                data-testid="ask-question-btn"
              >
                {askingQuestion ? '...' : 'إرسال'}
              </button>
            </div>
          </form>

          {/* Questions List */}
          {questions.length > 0 ? (
            <div className="space-y-3">
              {questions.map((q) => (
                <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-3" data-testid={`question-${q.id}`}>
                  {/* Question */}
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 font-bold text-xs">{q.user_name?.[0] || '؟'}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-xs text-gray-900">{q.user_name}</span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(q.created_at).toLocaleDateString('ar-SY')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{q.question}</p>
                    </div>
                  </div>

                  {/* Answer */}
                  {q.answer ? (
                    <div className="mt-3 mr-9 bg-green-50 rounded-lg p-2 border border-green-200">
                      <div className="flex items-center gap-2 mb-1">
                        <Store size={12} className="text-green-600" />
                        <span className="font-bold text-xs text-green-700">{q.answered_by_name || 'البائع'}</span>
                        <span className="text-[10px] text-gray-400">
                          {q.answered_at && new Date(q.answered_at).toLocaleDateString('ar-SY')}
                        </span>
                      </div>
                      <p className="text-sm text-green-800">{q.answer}</p>
                    </div>
                  ) : (
                    /* Show answer form for seller/admin */
                    (user?.id === product.seller_id || user?.user_type === 'admin' || user?.user_type === 'sub_admin') && (
                      answeringId === q.id ? (
                        <div className="mt-3 mr-9 flex gap-2">
                          <input
                            type="text"
                            value={newAnswer}
                            onChange={(e) => setNewAnswer(e.target.value)}
                            placeholder="اكتب ردك..."
                            className="flex-1 bg-white border border-gray-300 rounded-full py-1.5 px-3 text-sm focus:border-green-500 focus:outline-none"
                            data-testid={`answer-input-${q.id}`}
                          />
                          <button
                            onClick={() => handleAnswerQuestion(q.id)}
                            className="px-3 py-1.5 bg-green-500 text-white rounded-full text-xs font-bold hover:bg-green-600"
                          >
                            رد
                          </button>
                          <button
                            onClick={() => { setAnsweringId(null); setNewAnswer(''); }}
                            className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-full text-xs font-bold hover:bg-gray-300"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAnsweringId(q.id)}
                          className="mt-2 mr-9 text-xs text-green-600 font-bold hover:underline"
                          data-testid={`reply-btn-${q.id}`}
                        >
                          + إضافة رد
                        </button>
                      )
                    )
                  )}

                  {/* Show "waiting for answer" if no answer and user is not seller */}
                  {!q.answer && user?.id !== product.seller_id && user?.user_type !== 'admin' && user?.user_type !== 'sub_admin' && (
                    <p className="mt-2 mr-9 text-xs text-gray-400 italic">في انتظار رد البائع...</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 bg-white rounded-xl border border-gray-200">
              <MessageCircle size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">لا توجد أسئلة بعد</p>
              <p className="text-gray-400 text-xs">كن أول من يسأل عن هذا المنتج!</p>
            </div>
          )}
        </section>
      </div>
      
      {/* قسم المنتجات المشابهة */}
      {similarProducts.length > 0 && (
        <section className="mt-4 mb-24 md:mb-8">
          <div className="max-w-7xl mx-auto px-4">
            <h2 className="text-lg font-bold text-gray-900 mb-3">منتجات مشابهة</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {similarProducts.map((item) => (
                <Link
                  key={item.id}
                  to={`/products/${item.id}`}
                  className="bg-white rounded-xl overflow-hidden border border-gray-100 hover:border-[#FF6B00] hover:shadow-md transition-all group"
                  data-testid={`similar-product-${item.id}`}
                >
                  <div className="aspect-square relative overflow-hidden bg-gray-50">
                    <img
                      src={item.images?.[0] || 'https://via.placeholder.com/200'}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-2">
                    <h3 className="font-medium text-xs text-gray-800 line-clamp-2 mb-1 group-hover:text-[#FF6B00] transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-[#FF6B00] font-bold text-sm">{formatPrice(item.price)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
      
      {/* الشريط السفلي الثابت - السعر والأزرار */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg safe-area-inset-bottom">
        <div className="flex items-center gap-2 p-3">
          {/* السعر والكمية */}
          <div className="flex-1">
            <p className="text-lg font-bold text-[#FF6B00]">{formatPrice(product.price)}</p>
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">الكمية:</span>
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded-full"
                data-testid="decrease-qty"
              >
                <Minus size={12} />
              </button>
              <span className="w-6 text-center text-sm font-bold">{quantity}</span>
              <button
                onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded-full"
                data-testid="increase-qty"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>
          
          {/* زر إضافة للسلة */}
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0 || addingToCart}
            className="flex items-center justify-center gap-1 bg-white border-2 border-[#FF6B00] text-[#FF6B00] font-bold px-4 py-2 rounded-full text-sm hover:bg-[#FF6B00]/5 disabled:opacity-50 transition-colors"
            data-testid="add-to-cart-btn"
          >
            {addingToCart ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <>
                <ShoppingCart size={16} />
                <span>السلة</span>
              </>
            )}
          </button>
          
          {/* زر الطلب المباشر */}
          <button
            onClick={() => {
              handleAddToCart();
              setTimeout(() => navigate('/checkout'), 500);
            }}
            disabled={product.stock === 0 || addingToCart}
            className="flex items-center justify-center gap-1 bg-[#FF6B00] text-white font-bold px-4 py-2 rounded-full text-sm hover:bg-[#E65000] disabled:opacity-50 transition-colors"
            data-testid="buy-now-btn"
          >
            <Zap size={16} />
            <span>اشتري الآن</span>
          </button>
        </div>
      </div>

      {/* معرض الصور بملء الشاشة - مثل Trendyol */}
      {showFullGallery && product?.images && (
        <div className="fixed inset-0 bg-black z-[200]">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
            <button
              onClick={() => setShowFullGallery(false)}
              className="w-10 h-10 rounded-full bg-black/30 flex items-center justify-center text-white"
            >
              <X size={24} />
            </button>
            <span className="text-white text-sm font-bold">
              {galleryIndex + 1} / {product.images.length}
            </span>
            <div className="w-10" />
          </div>

          {/* الصورة */}
          <div 
            className="absolute inset-0 flex items-center justify-center"
            onTouchStart={(e) => {
              setGalleryTouchEnd(null);
              setGalleryTouchStart(e.targetTouches[0].clientX);
            }}
            onTouchMove={(e) => {
              setGalleryTouchEnd(e.targetTouches[0].clientX);
            }}
            onTouchEnd={() => {
              if (!galleryTouchStart || !galleryTouchEnd) return;
              const distance = galleryTouchStart - galleryTouchEnd;
              const isLeftSwipe = distance > 50;
              const isRightSwipe = distance < -50;
              
              if (isLeftSwipe && product.images.length > 1) {
                setGalleryIndex(prev => prev === product.images.length - 1 ? 0 : prev + 1);
              }
              if (isRightSwipe && product.images.length > 1) {
                setGalleryIndex(prev => prev === 0 ? product.images.length - 1 : prev - 1);
              }
            }}
          >
            <img
              src={product.images[galleryIndex]}
              alt={product.name}
              className="max-w-full max-h-full object-contain"
              onContextMenu={(e) => e.preventDefault()}
              draggable="false"
            />
          </div>

          {/* نقاط التنقل */}
          {product.images.length > 1 && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
              <div className="flex items-center gap-2">
                {product.images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setGalleryIndex(i)}
                    className={`rounded-full transition-all ${
                      galleryIndex === i 
                        ? 'bg-white w-3 h-3' 
                        : 'bg-white/50 w-2 h-2'
                    }`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* الصور المصغرة */}
          <div className="absolute bottom-20 left-0 right-0 px-4">
            <div className="flex justify-center gap-2 overflow-x-auto">
              {product.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setGalleryIndex(i)}
                  className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                    galleryIndex === i ? 'border-white' : 'border-transparent opacity-60'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Size Guide Modal */}
      <SizeGuideModal 
        isOpen={showSizeGuide} 
        onClose={() => setShowSizeGuide(false)} 
        sizeType={product?.size_type || 'clothes'} 
      />
    </div>
  );
};

export default ProductDetailPage;
