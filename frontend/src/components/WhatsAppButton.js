// /app/frontend/src/components/WhatsAppButton.js
// زر الدردشة مع WhatsApp - يقرأ الإعدادات من الـ API

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send } from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const WhatsAppButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [settings, setSettings] = useState({
    whatsapp_enabled: true,
    whatsapp_number: '963551021618',
    support_message: 'مرحباً، أريد الاستفسار عن خدمات تريند سورية'
  });

  // جلب إعدادات الدعم من الـ API
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API}/api/admin/settings/public`);
        setSettings(prev => ({
          ...prev,
          whatsapp_enabled: res.data.whatsapp_enabled ?? true,
          whatsapp_number: res.data.whatsapp_number || '963551021618',
          support_message: res.data.support_message || prev.support_message
        }));
      } catch (err) {
        console.log('Using default WhatsApp settings');
      }
    };
    fetchSettings();
  }, []);

  const predefinedMessages = [
    { text: 'أريد الاستفسار عن منتج', icon: '🛒' },
    { text: 'لدي مشكلة في طلبي', icon: '📦' },
    { text: 'أريد التحدث مع الدعم', icon: '💬' },
    { text: 'استفسار عن التوصيل', icon: '🚚' },
  ];

  const openWhatsApp = (text = '') => {
    const finalMessage = text || message || settings.support_message;
    const url = `https://wa.me/${settings.whatsapp_number}?text=${encodeURIComponent(finalMessage)}`;
    window.open(url, '_blank');
    setIsOpen(false);
    setMessage('');
  };

  // إذا كان الدعم معطّل، لا نعرض الزر
  if (!settings.whatsapp_enabled) {
    return null;
  }

  return (
    <>
      {/* زر WhatsApp العائم */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 left-4 z-40 w-14 h-14 bg-green-500 rounded-full shadow-lg flex items-center justify-center hover:bg-green-600 transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        data-testid="whatsapp-button"
      >
        <MessageCircle size={28} className="text-white" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-white text-[10px] font-bold">!</span>
        </span>
      </motion.button>

      {/* نافذة الدردشة */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="fixed bottom-36 left-4 z-50 w-80 bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-green-500 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <MessageCircle size={20} className="text-green-500" />
                </div>
                <div className="text-white">
                  <p className="font-bold">تريند سورية</p>
                  <p className="text-xs opacity-90">متصل الآن</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30"
              >
                <X size={18} className="text-white" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              <p className="text-sm text-gray-600 text-center">
                👋 مرحباً! كيف يمكننا مساعدتك؟
              </p>

              {/* رسائل جاهزة */}
              <div className="space-y-2">
                {predefinedMessages.map((msg, index) => (
                  <button
                    key={index}
                    onClick={() => openWhatsApp(msg.text)}
                    className="w-full text-right p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors flex items-center gap-2"
                  >
                    <span>{msg.icon}</span>
                    <span className="text-sm text-gray-700">{msg.text}</span>
                  </button>
                ))}
              </div>

              {/* رسالة مخصصة */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="أو اكتب رسالتك..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-green-500"
                  onKeyPress={(e) => e.key === 'Enter' && openWhatsApp()}
                />
                <button
                  onClick={() => openWhatsApp()}
                  className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center hover:bg-green-600 transition-colors"
                >
                  <Send size={18} className="text-white" />
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 bg-gray-50 text-center">
              <p className="text-[10px] text-gray-400">
                سيتم فتح WhatsApp للتحدث معنا
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default WhatsAppButton;
