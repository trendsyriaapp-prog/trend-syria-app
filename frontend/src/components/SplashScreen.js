// /app/frontend/src/components/SplashScreen.js
// شاشة البداية - ترند سورية

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SplashScreen = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // إخفاء شاشة البداية بعد 2.5 ثانية
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onComplete();
      }, 500); // انتظار انتهاء الـ animation
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #FF6B00 0%, #FF8C00 50%, #FFA500 100%)'
          }}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.2, opacity: 0 }}
            transition={{ 
              duration: 0.6,
              ease: "easeOut"
            }}
            className="flex flex-col items-center"
          >
            {/* اللوجو */}
            <motion.img
              src="/images/logo.png"
              alt="ترند سورية"
              className="w-64 h-64 md:w-80 md:h-80 object-contain drop-shadow-2xl"
              animate={{ 
                scale: [1, 1.05, 1],
              }}
              transition={{ 
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
            
            {/* شريط التحميل */}
            <motion.div 
              className="mt-8 w-48 h-1 bg-white/30 rounded-full overflow-hidden"
            >
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 2.3, ease: "easeInOut" }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
