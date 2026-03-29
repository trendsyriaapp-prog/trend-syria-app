import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Star, Send, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const RateDriverModal = ({ order, onClose, onSuccess }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const ratingLabels = {
    1: 'سيء جداً',
    2: 'سيء',
    3: 'مقبول',
    4: 'جيد',
    5: 'ممتاز'
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار تقييم",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/api/delivery/rate/${order.id}`, {
        rating,
        comment: comment.trim() || null
      });

      toast({
        title: "شكراً لك!",
        description: "تم إرسال تقييمك بنجاح"
      });

      onSuccess?.();
      onClose();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل إرسال التقييم",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl max-w-md w-full overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#FF6B00] to-orange-500 text-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">قيّم موظف التوصيل</h2>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full">
              <X size={20} />
            </button>
          </div>
          <p className="text-sm opacity-90 mt-1">
            كيف كانت تجربتك مع موظف التوصيل؟
          </p>
        </div>

        {/* Driver Info */}
        {order?.delivery_driver_name && (
          <div className="p-4 bg-gray-50 border-b flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
              {order.delivery_driver_photo ? (
                <img 
                  src={order.delivery_driver_photo} 
                  alt={order.delivery_driver_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl">👤</span>
              )}
            </div>
            <div>
              <p className="font-bold text-gray-900">{order.delivery_driver_name}</p>
              <p className="text-xs text-gray-500">موظف التوصيل</p>
            </div>
          </div>
        )}

        {/* Rating Stars */}
        <div className="p-6">
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  size={40}
                  className={`transition-colors ${
                    star <= (hoverRating || rating)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Rating Label */}
          <p className="text-center text-lg font-bold text-gray-900 h-7">
            {ratingLabels[hoverRating || rating] || 'اختر تقييمك'}
          </p>

          {/* Comment */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              تعليق (اختياري)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="شاركنا تجربتك مع موظف التوصيل..."
              className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none h-24 focus:border-[#FF6B00] focus:outline-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-400 text-left mt-1">
              {comment.length}/500
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${
              rating > 0
                ? 'bg-[#FF6B00] text-white hover:bg-[#E65000]'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {submitting ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <Send size={18} />
                إرسال التقييم
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default RateDriverModal;
