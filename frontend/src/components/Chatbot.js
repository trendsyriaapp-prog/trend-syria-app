// /app/frontend/src/components/Chatbot.js
// Chatbot للدعم الفني - أيقونة عائمة + نافذة دردشة

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, X, Send, User, Bot, 
  Headphones, ChevronDown, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;

const Chatbot = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [quickQuestions, setQuickQuestions] = useState([]);
  const [showQuickQuestions, setShowQuickQuestions] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && quickQuestions.length === 0) {
      fetchQuickQuestions();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      });

      setSessionId(res.data.session_id);

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
      });

      setMessages(prev => [...prev, {
        sender: 'system',
        message: res.data.message,
        created_at: new Date().toISOString()
      }]);
    } catch (error) {
      console.error('Error requesting support:', error);
    }
  };

  const handleQuickReply = (text) => {
    sendMessage(text);
  };

  // لا تظهر للمستخدمين غير المسجلين
  if (!user) return null;

  return (
    <>
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[85%] ${isUser ? 'order-1' : 'order-2'}`}>
        {!isUser && !isSystem && (
          <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center mb-1">
            <Bot size={14} className="text-[#FF6B00]" />
          </div>
        )}
        
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isUser
              ? 'bg-[#FF6B00] text-white rounded-br-none'
              : isSystem
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
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

export default Chatbot;
