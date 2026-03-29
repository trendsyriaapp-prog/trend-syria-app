import { useState, useEffect } from 'react';
import axios from 'axios';
import { Star, MessageSquare, Send, Loader2, Package, CheckCircle } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const StarRating = ({ rating, size = 12 }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        size={size}
        className={star <= rating ? 'fill-[#FF6B00] text-[#FF6B00]' : 'text-gray-300'}
      />
    ))}
  </div>
);

const SellerReviewsTab = () => {
  const { toast } = useToast();
  const [pendingReviews, setPendingReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPendingReviews();
  }, []);

  const fetchPendingReviews = async () => {
    try {
      const res = await axios.get(`${API}/api/reviews/seller/pending`);
      setPendingReviews(res.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (reviewId) => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/reviews/${reviewId}/reply`, { reply: replyText });
      toast({ title: "تم إضافة الرد بنجاح" });
      setReplyingTo(null);
      setReplyText('');
      fetchPendingReviews();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "حدث خطأ",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare size={18} className="text-[#FF6B00]" />
          <h2 className="font-bold text-gray-900">تقييمات تنتظر ردك</h2>
          <span className="bg-[#FF6B00] text-white text-xs px-2 py-0.5 rounded-full">
            {pendingReviews.length}
          </span>
        </div>

        {pendingReviews.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
            <p className="text-gray-600 font-bold">لا توجد تقييمات تنتظر الرد</p>
            <p className="text-gray-400 text-sm mt-1">أحسنت! لقد رددت على جميع تقييمات عملائك</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingReviews.map((review) => (
              <div key={review.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                {/* Product Info */}
                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-200">
                  {review.product_image ? (
                    <img 
                      src={review.product_image} 
                      alt={review.product_name}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                      <Package size={20} className="text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-sm text-gray-900">{review.product_name}</p>
                    <p className="text-[10px] text-gray-500">
                      {new Date(review.created_at).toLocaleDateString('ar-SY')}
                    </p>
                  </div>
                </div>

                {/* Review Content */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#FF6B00] flex items-center justify-center">
                        <span className="text-white font-bold text-xs">{review.user_name?.[0]}</span>
                      </div>
                      <span className="font-bold text-sm text-gray-900">{review.user_name}</span>
                    </div>
                    <StarRating rating={review.rating} />
                  </div>
                  <p className="text-sm text-gray-700">{review.comment}</p>
                  
                  {/* Review Images */}
                  {review.images && review.images.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-2">
                      {review.images.map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt="صورة من العميل"
                          className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Reply Form */}
                {replyingTo === review.id ? (
                  <div className="bg-white rounded-lg p-3 border border-[#FF6B00]">
                    <textarea
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none"
                      placeholder="اكتب ردك على تقييم العميل..."
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleReply(review.id)}
                        disabled={submitting || !replyText.trim()}
                        className="bg-[#FF6B00] text-white text-xs font-bold py-2 px-4 rounded-full hover:bg-[#E65000] disabled:opacity-50 flex items-center gap-1"
                      >
                        {submitting ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
                        إرسال الرد
                      </button>
                      <button
                        onClick={() => { setReplyingTo(null); setReplyText(''); }}
                        className="bg-gray-200 text-gray-700 text-xs font-bold py-2 px-4 rounded-full hover:bg-gray-300"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setReplyingTo(review.id)}
                    className="w-full bg-[#FF6B00] text-white text-sm font-bold py-2.5 rounded-full hover:bg-[#E65000] flex items-center justify-center gap-2"
                    data-testid={`reply-btn-${review.id}`}
                  >
                    <MessageSquare size={16} />
                    رد على هذا التقييم
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tips Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-200">
        <h3 className="font-bold text-blue-800 mb-2 text-sm">نصائح للرد على التقييمات</h3>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• اشكر العميل على تقييمه حتى لو كان سلبياً</li>
          <li>• كن محترفاً ولا ترد بطريقة دفاعية</li>
          <li>• قدم حلولاً للمشاكل المذكورة</li>
          <li>• الردود تظهر للجميع وتؤثر على سمعة متجرك</li>
        </ul>
      </div>
    </div>
  );
};

export default SellerReviewsTab;
