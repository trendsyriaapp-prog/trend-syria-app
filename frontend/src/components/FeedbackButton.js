// /app/frontend/src/components/FeedbackButton.js
import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, X, Send, Lightbulb, AlertCircle, HelpCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const FEEDBACK_TYPES = [
  { id: 'suggestion', label: 'اقتراح تحسين', icon: Lightbulb, color: 'text-yellow-500 bg-yellow-50 border-yellow-200' },
  { id: 'complaint', label: 'شكوى', icon: AlertCircle, color: 'text-red-500 bg-red-50 border-red-200' },
  { id: 'question', label: 'استفسار', icon: HelpCircle, color: 'text-blue-500 bg-blue-50 border-blue-200' },
];

const FeedbackButton = ({ position = 'bottom-left' }) => {
  const location = useLocation();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(() => {
    // تحقق إذا كان المستخدم أخفى الزر في هذه الجلسة
    return sessionStorage.getItem('feedbackButtonHidden') === 'true';
  });
  const [feedbackType, setFeedbackType] = useState('suggestion');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // إخفاء الزر في صفحة تفاصيل المنتج لأنه يحجب السعر
  const isProductDetailPage = location.pathname.startsWith('/products/');
  if (isProductDetailPage) return null;

  // موقع الزر - أعلى من شريط التنقل السفلي (مرتفع أكثر للسائقين)
  const positionClasses = {
    'bottom-left': 'bottom-28 left-4',
    'bottom-right': 'bottom-28 right-4',
    'top-left': 'top-20 left-4',
    'top-right': 'top-20 right-4',
  };

  // إخفاء الزر
  const handleHide = (e) => {
    e.stopPropagation();
    setIsHidden(true);
    sessionStorage.setItem('feedbackButtonHidden', 'true');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim()) {
      toast({
        title: "تنبيه",
        description: "يرجى كتابة رسالتك",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/api/feedback`, {
        type: feedbackType,
        message: message.trim(),
        user_type: user?.user_type || 'guest'
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      toast({
        title: "تم الإرسال بنجاح ✅",
        description: "شكراً لك! سنراجع رسالتك قريباً"
      });

      setMessage('');
      setIsOpen(false);
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل في إرسال الرسالة",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // لا تعرض شيء إذا كان الزر مخفي
  if (isHidden) {
    return null;
  }

  return (
    <>
      {/* زر فتح النموذج مع زر الإخفاء */}
      <div className={`fixed ${positionClasses[position]} z-[55] flex flex-col items-center gap-1`}>
        {/* زر الإخفاء */}
        <button
          onClick={handleHide}
          className="w-5 h-5 bg-gray-400/80 hover:bg-gray-500 text-white rounded-full flex items-center justify-center text-xs shadow-md transition-all hover:scale-110"
          title="إخفاء"
          data-testid="feedback-hide-button"
        >
          <X size={12} />
        </button>
        
        {/* زر الملاحظات الرئيسي */}
        <button
          onClick={() => setIsOpen(true)}
          className="p-3.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-full shadow-xl hover:shadow-2xl transition-all hover:scale-110 animate-pulse"
          title="اقتراحات وملاحظات"
          data-testid="feedback-button"
          style={{ animationDuration: '3s' }}
        >
          <MessageSquarePlus size={24} />
        </button>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-4 flex items-center justify-between">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <MessageSquarePlus size={20} />
                  اقتراحات وملاحظات
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                {/* نوع الرسالة */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    نوع الرسالة
                  </label>
                  <div className="flex gap-2">
                    {FEEDBACK_TYPES.map((type) => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setFeedbackType(type.id)}
                          className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                            feedbackType === type.id
                              ? type.color + ' border-current'
                              : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <Icon size={20} />
                          <span className="text-xs font-medium">{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* الرسالة */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    رسالتك
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={
                      feedbackType === 'suggestion' ? 'اكتب اقتراحك لتحسين التطبيق...' :
                      feedbackType === 'complaint' ? 'اكتب شكواك وسنعمل على حلها...' :
                      'اكتب استفسارك...'
                    }
                    rows={4}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-purple-400 resize-none"
                  />
                </div>

                {/* معلومات المستخدم */}
                {user && (
                  <p className="text-xs text-gray-400 text-center">
                    سيتم إرسال رسالتك باسم: {user.name || user.phone}
                  </p>
                )}

                {/* زر الإرسال */}
                <button
                  type="submit"
                  disabled={submitting || !message.trim()}
                  className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Send size={18} />
                      إرسال
                    </>
                  )}
                </button>

                <p className="text-[10px] text-gray-400 text-center">
                  نقدر ملاحظاتك ونسعى دائماً لتحسين تجربتك معنا
                </p>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FeedbackButton;
