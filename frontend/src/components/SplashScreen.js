// /app/frontend/src/components/SplashScreen.js
// شاشة البداية - ترند سورية

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SplashScreen = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // إخفاء شاشة البداية بعد 2 ثانية
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onComplete();
      }, 500);
    }, 2000);

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
            background: 'linear-gradient(180deg, #FFA500 0%, #FF6B00 100%)'
          }}
        >
          <div className="flex flex-col items-center">
            {/* اللوجو */}
            <motion.img
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              src="/images/logo.png"
              alt="ترند سورية"
              className="w-72 h-72 md:w-96 md:h-96 object-contain"
              style={{
                filter: 'drop-shadow(0 10px 30px rgba(0,0,0,0.3))',
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
