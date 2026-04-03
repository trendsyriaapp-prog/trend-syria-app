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
  { id: 'suggestion', label: 'اقتراح', icon: Lightbulb, color: 'text-yellow-500 bg-yellow-50 border-yellow-200' },
  { id: 'complaint', label: 'شكوى', icon: AlertCircle, color: 'text-red-500 bg-red-50 border-red-200' },
  { id: 'question', label: 'استفسار', icon: HelpCircle, color: 'text-blue-500 bg-blue-50 border-blue-200' },
];

const FeedbackButton = () => {
  const location = useLocation();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState('suggestion');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // إخفاء في صفحة تفاصيل المنتج
  const isProductDetailPage = location.pathname.startsWith('/products/');
  if (isProductDetailPage) return null;

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
        title: "تم الإرسال بنجاح",
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

  return (
    <>
      {/* شريط جانبي على اليسار */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-[55] flex items-center"
        data-testid="feedback-side-button"
      >
        <div className="bg-[#FF6B00]/90 hover:bg-[#FF6B00] text-white py-3 px-1.5 rounded-r-lg shadow-lg transition-all hover:px-2 group">
          <div className="flex flex-col items-center gap-1">
            <MessageSquarePlus size={18} />
            <span className="text-[10px] font-bold writing-vertical">ملاحظات</span>
          </div>
        </div>
      </button>

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
              initial={{ x: -100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white p-4 flex items-center justify-between">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <MessageSquarePlus size={20} />
                  ساعدنا نحسّن التطبيق
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
                          className={`flex-1 p-2 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                            feedbackType === type.id
                              ? `${type.color} border-current`
                              : 'bg-gray-50 border-gray-200 text-gray-500'
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
                      feedbackType === 'suggestion' 
                        ? "أقترح إضافة ميزة..." 
                        : feedbackType === 'complaint'
                          ? "واجهت مشكلة في..."
                          : "لدي استفسار عن..."
                    }
                    className="w-full p-3 border border-gray-200 rounded-xl resize-none h-28 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/50 focus:border-[#FF6B00]"
                    dir="rtl"
                  />
                </div>

                {/* معلومات المستخدم */}
                {user && (
                  <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
                    سيتم إرسال الرسالة باسم: {user.name || user.phone}
                  </div>
                )}

                {/* زر الإرسال */}
                <button
                  type="submit"
                  disabled={submitting || !message.trim()}
                  className="w-full bg-[#FF6B00] hover:bg-[#E55A00] disabled:bg-gray-300 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      جارٍ الإرسال...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      إرسال
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSS للنص العمودي */}
      <style>{`
        .writing-vertical {
          writing-mode: vertical-rl;
          text-orientation: mixed;
        }
      `}</style>
    </>
  );
};

export default FeedbackButton;
