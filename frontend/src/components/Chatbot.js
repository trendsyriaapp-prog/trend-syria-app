// /app/frontend/src/components/Chatbot.js
// Chatbot للدعم الفني - أيقونة عائمة + نافذة دردشة

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, X, Send, User, Bot, 
  Headphones, ChevronDown, Loader2, HeadphonesIcon, Star
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;

const Chatbot = () => {
  const { user, token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [quickQuestions, setQuickQuestions] = useState([]);
  const [showQuickQuestions, setShowQuickQuestions] = useState(true);
  const [hasSupportRequest, setHasSupportRequest] = useState(false);
  const [messageCount, setMessageCount] = useState(0);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [pendingRatingTicket, setPendingRatingTicket] = useState(null);
  const messagesEndRef = useRef(null);
  const pollingRef = useRef(null);

  useEffect(() => {
    if (isOpen && quickQuestions.length === 0) {
      fetchQuickQuestions();
    }
    // التحقق من وجود تذكرة تحتاج تقييم عند فتح الدردشة
    if (isOpen && token) {
      checkPendingRating();
      // التحقق من التذكيرات (للتذاكر القديمة)
      checkRatingReminder();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Polling للتحقق من ردود الدعم الجديدة
  useEffect(() => {
    if (hasSupportRequest && sessionId && isOpen) {
      // بدء Polling كل 5 ثواني
      pollingRef.current = setInterval(checkForNewReplies, 5000);
      return () => {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
        }
      };
    }
  }, [hasSupportRequest, sessionId, isOpen, messageCount]);

  const checkForNewReplies = useCallback(async () => {
    if (!sessionId || !token) return;
    
    try {
      const res = await axios.get(
        `${API}/api/chatbot/check-replies/${sessionId}?last_count=${messageCount}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (res.data.has_new && res.data.new_messages?.length > 0) {
        // إضافة الرسائل الجديدة
        setMessages(prev => [...prev, ...res.data.new_messages]);
        setMessageCount(res.data.total_count);
      }
    } catch (error) {
      console.error('Error checking for new replies:', error);
    }
  }, [sessionId, messageCount, token]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchQuickQuestions = async () => {
    try {
      const res = await axios.get(`${API}/api/chatbot/quick-questions`);
      setQuickQuestions(res.data.questions);
    } catch (error) {
      console.error('Error fetching quick questions:', error);
    }
  };

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;

    const userMessage = { sender: 'user', message: text, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setShowQuickQuestions(false);

    try {
      const res = await axios.post(`${API}/api/chatbot/send`, {
        message: text,
        session_id: sessionId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSessionId(res.data.session_id);
      setMessageCount(prev => prev + 2); // رسالة المستخدم + رد البوت

      const botMessage = {
        sender: 'bot',
        message: res.data.response,
        quick_replies: res.data.quick_replies,
        needs_human: res.data.needs_human,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        sender: 'bot',
        message: 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.',
        created_at: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const requestSupport = async () => {
    if (!sessionId) return;

    try {
      const res = await axios.post(`${API}/api/chatbot/request-support`, {
        message: messages.length > 0 ? messages[messages.length - 1].message : 'طلب دعم',
        session_id: sessionId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMessages(prev => [...prev, {
        sender: 'system',
        message: res.data.message,
        created_at: new Date().toISOString()
      }]);
      
      setHasSupportRequest(true);
      setMessageCount(prev => prev + 1);
    } catch (error) {
      console.error('Error requesting support:', error);
    }
  };

  const handleQuickReply = (text) => {
    sendMessage(text);
  };

  // التحقق من وجود تذكرة تحتاج تقييم
  const checkPendingRating = async () => {
    try {
      const res = await axios.get(`${API}/api/chatbot/my-pending-rating`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.ticket) {
        setPendingRatingTicket(res.data.ticket);
        setShowRatingModal(true);
      }
    } catch (error) {
      console.error('Error checking pending rating:', error);
    }
  };

  // التحقق من التذكيرات للتذاكر القديمة
  const checkRatingReminder = async () => {
    try {
      await axios.post(`${API}/api/chatbot/check-rating-reminder`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      // صامت - لا نريد إزعاج المستخدم بأخطاء التذكير
    }
  };

  // لا تظهر للمستخدمين غير المسجلين
  if (!user) return null;

  return (
    <>
      {/* Rating Modal */}
      <AnimatePresence>
        {showRatingModal && pendingRatingTicket && (
          <RatingModal
            ticket={pendingRatingTicket}
            token={token}
            onClose={() => {
              setShowRatingModal(false);
              setPendingRatingTicket(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-20 left-4 z-50 w-14 h-14 bg-gradient-to-br from-[#FF6B00] to-orange-600 rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-shadow"
            data-testid="chatbot-toggle"
          >
            <MessageCircle size={28} className="text-white" />
            {/* Notification Badge */}
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">؟</span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed bottom-4 left-4 right-4 md:left-4 md:right-auto md:w-96 z-50 bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: 'calc(100vh - 120px)', height: '500px' }}
          >
            {/* Header */}
            <div className="bg-gradient-to-l from-[#FF6B00] to-orange-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Bot size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold">مساعد تريند سورية</h3>
                    <p className="text-xs text-white/80">نحن هنا لمساعدتك</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {/* Welcome Message */}
              {messages.length === 0 && (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Bot size={32} className="text-[#FF6B00]" />
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">مرحباً {user?.name}! 👋</h4>
                  <p className="text-sm text-gray-500">كيف يمكنني مساعدتك اليوم؟</p>
                </div>
              )}

              {/* Quick Questions */}
              {showQuickQuestions && quickQuestions.length > 0 && messages.length === 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 text-center">اختر سؤالاً أو اكتب استفسارك</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {quickQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickReply(q.text)}
                        className="bg-white border border-gray-200 rounded-full px-3 py-1.5 text-sm hover:border-[#FF6B00] hover:text-[#FF6B00] transition-colors flex items-center gap-1"
                      >
                        <span>{q.icon}</span>
                        <span>{q.text}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} onQuickReply={handleQuickReply} />
              ))}

              {/* Loading */}
              {loading && (
                <div className="flex items-center gap-2 text-gray-500">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <Loader2 size={16} className="text-[#FF6B00] animate-spin" />
                  </div>
                  <span className="text-sm">جاري الكتابة...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Request Support Button */}
            {messages.length > 0 && (
              <div className="px-4 py-2 bg-gray-100 border-t border-gray-200">
                <button
                  onClick={requestSupport}
                  className="w-full flex items-center justify-center gap-2 text-sm text-gray-600 hover:text-[#FF6B00] transition-colors"
                >
                  <Headphones size={16} />
                  التحدث مع موظف دعم
                </button>
              </div>
            )}

            {/* Input Area */}
            <div className="p-3 border-t border-gray-200 bg-white">
              <form 
                onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="اكتب سؤالك هنا..."
                  className="flex-1 p-3 bg-gray-100 rounded-xl border-0 focus:ring-2 focus:ring-[#FF6B00] focus:outline-none text-sm"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="w-10 h-10 bg-[#FF6B00] rounded-xl flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-600 transition-colors"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

const MessageBubble = ({ message, onQuickReply }) => {
  const isUser = message.sender === 'user';
  const isSystem = message.sender === 'system';
  const isSupport = message.sender === 'support';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[85%] ${isUser ? 'order-1' : 'order-2'}`}>
        {/* أيقونة البوت أو الدعم */}
        {!isUser && !isSystem && (
          <div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1 ${
            isSupport ? 'bg-green-100' : 'bg-orange-100'
          }`}>
            {isSupport ? (
              <HeadphonesIcon size={14} className="text-green-600" />
            ) : (
              <Bot size={14} className="text-[#FF6B00]" />
            )}
          </div>
        )}
        
        {/* عنوان الدعم الفني */}
        {isSupport && (
          <span className="text-xs text-green-600 font-medium mb-1 block">
            الدعم الفني {message.admin_name ? `(${message.admin_name})` : ''}
          </span>
        )}
        
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isUser
              ? 'bg-[#FF6B00] text-white rounded-br-none'
              : isSystem
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : isSupport
                  ? 'bg-green-100 text-green-800 border border-green-200 rounded-bl-none'
                  : 'bg-white text-gray-800 shadow-sm rounded-bl-none'
          }`}
        >
          <p className="text-sm whitespace-pre-line">{message.message}</p>
        </div>

        {/* Quick Replies */}
        {message.quick_replies && message.quick_replies.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.quick_replies.map((reply, i) => (
              <button
                key={i}
                onClick={() => onQuickReply(reply)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs px-3 py-1.5 rounded-full transition-colors"
              >
                {reply}
              </button>
            ))}
          </div>
        )}

        {/* Needs Human Support */}
        {message.needs_human && (
          <p className="text-xs text-gray-400 mt-1">
            لم أفهم سؤالك؟ يمكنك التواصل مع فريق الدعم
          </p>
        )}
      </div>
    </motion.div>
  );
};

// مكون نافذة التقييم
const RatingModal = ({ ticket, token, onClose }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submitRating = async () => {
    if (rating === 0) return;
    
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/chatbot/rate-support`, {
        ticket_id: ticket.id,
        rating,
        comment: comment.trim() || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSubmitted(true);
      setTimeout(onClose, 2000);
    } catch (error) {
      console.error('Error submitting rating:', error);
      alert(error.response?.data?.detail || 'حدث خطأ في إرسال التقييم');
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingText = (r) => {
    switch(r) {
      case 1: return 'سيء جداً 😞';
      case 2: return 'سيء 😕';
      case 3: return 'مقبول 😐';
      case 4: return 'جيد 🙂';
      case 5: return 'ممتاز! 🌟';
      default: return '';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl w-full max-w-sm overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          // رسالة الشكر
          <div className="p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <Star size={40} className="text-green-500 fill-green-500" />
            </motion.div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">شكراً لتقييمك!</h3>
            <p className="text-gray-500 text-sm">نسعى دائماً لتحسين خدماتنا 🙏</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-gradient-to-l from-[#FF6B00] to-orange-600 p-4 text-white text-center">
              <Headphones size={32} className="mx-auto mb-2" />
              <h3 className="font-bold">قيّم تجربة الدعم</h3>
              <p className="text-xs text-white/80">رأيك يهمنا لتحسين خدماتنا</p>
            </div>

            {/* Rating Stars */}
            <div className="p-6">
              <div className="flex justify-center gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="transition-transform hover:scale-110"
                    data-testid={`rating-star-${star}`}
                  >
                    <Star
                      size={36}
                      className={`transition-colors ${
                        star <= (hoverRating || rating)
                          ? 'text-yellow-400 fill-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
              
              {/* Rating Text */}
              <p className="text-center text-sm font-medium text-gray-700 h-6">
                {getRatingText(hoverRating || rating)}
              </p>

              {/* Comment */}
              <div className="mt-4">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="أضف تعليقاً (اختياري)..."
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                >
                  لاحقاً
                </button>
                <button
                  onClick={submitRating}
                  disabled={rating === 0 || submitting}
                  className="flex-1 py-2.5 bg-[#FF6B00] text-white rounded-xl font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  data-testid="submit-rating-btn"
                >
                  {submitting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Star size={18} />
                      إرسال التقييم
                    </>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
};

export default Chatbot;
