import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellRing, X, Smartphone } from 'lucide-react';
import usePushNotifications from '../hooks/usePushNotifications';

/**
 * Popup لطلب إذن الإشعارات - يظهر تلقائياً عند أول تسجيل دخول
 */
const PushNotificationPrompt = ({ userType, userName }) => {
  const [showPrompt, setShowPrompt] = useState(false);
  
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe
  } = usePushNotifications(userType);

  // التحقق من إظهار الـ popup
  useEffect(() => {
    const storageKey = `push_prompt_shown_${userType}`;
    const wasShown = localStorage.getItem(storageKey);
    
    // لا نظهر إذا تم عرضه سابقاً أو مشترك بالفعل
    if (wasShown || isSubscribed) {
      return;
    }

    // إظهار الـ popup بعد ثانيتين
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [isSubscribed, userType]);

  const handleEnable = async () => {
    const storageKey = `push_prompt_shown_${userType}`;
    localStorage.setItem(storageKey, 'true');
    
    const result = await subscribe();
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    const storageKey = `push_prompt_shown_${userType}`;
    localStorage.setItem(storageKey, 'true');
    setShowPrompt(false);
  };

  const handleRemindLater = () => {
    // لا نحفظ شيء - سيظهر مرة أخرى
    setShowPrompt(false);
  };

  // تحديد النص حسب نوع المستخدم
  const getPromptText = () => {
    if (userType === 'delivery') {
      return {
        title: 'لا تفوّت أي طلب! 🚀',
        description: 'فعّل الإشعارات لتصلك تنبيهات فورية عند توفر طلبات جديدة للتوصيل، حتى لو كان التطبيق مغلقاً.',
        benefit: 'كن أول من يقبل الطلبات واكسب المزيد!'
      };
    }
    if (userType === 'buyer') {
      return {
        title: 'تابع طلبك لحظة بلحظة! 📦',
        description: 'فعّل الإشعارات لتعرف متى يغادر طلبك المتجر ومتى يصل إليك، حتى لو كان التطبيق مغلقاً.',
        benefit: 'لا تفوت لحظة وصول طلبك!'
      };
    }
    // seller
    return {
      title: 'طلب جديد؟ لن يفوتك! 🔔',
      description: 'فعّل الإشعارات لتصلك تنبيهات فورية عند وصول طلبات جديدة لمطعمك، حتى لو كان التطبيق مغلقاً.',
      benefit: 'استجب بسرعة وحافظ على رضا عملائك!'
    };
  };

  const text = getPromptText();

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={handleRemindLater}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] p-6 text-white text-center relative">
            <button
              onClick={handleDismiss}
              className="absolute top-3 left-3 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
            >
              <X size={18} />
            </button>
            
            <motion.div
              animate={{ 
                scale: [1, 1.1, 1],
                rotate: [0, -10, 10, 0]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                repeatDelay: 1
              }}
              className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4"
            >
              <BellRing size={40} className="text-white" />
            </motion.div>
            
            <h2 className="text-xl font-bold mb-1">{text.title}</h2>
            <p className="text-white/80 text-sm">مرحباً {userName}!</p>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-600 text-sm text-center mb-4 leading-relaxed">
              {text.description}
            </p>
            
            {/* Benefit highlight */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-6">
              <div className="flex items-center gap-2 text-green-700">
                <Smartphone size={18} />
                <span className="text-sm font-bold">{text.benefit}</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleEnable}
                disabled={isLoading}
                className="w-full bg-[#FF6B00] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#E65000] transition-colors disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    جاري التفعيل...
                  </>
                ) : (
                  <>
                    <Bell size={18} />
                    تفعيل الإشعارات
                  </>
                )}
              </button>
              
              <button
                onClick={handleRemindLater}
                className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors"
              >
                ذكّرني لاحقاً
              </button>
              
              <button
                onClick={handleDismiss}
                className="w-full text-gray-400 py-2 text-xs hover:text-gray-600 transition-colors"
              >
                لا أريد الإشعارات
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PushNotificationPrompt;
