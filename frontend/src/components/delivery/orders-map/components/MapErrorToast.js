// /app/frontend/src/components/delivery/orders-map/components/MapErrorToast.js
// رسالة الخطأ في الخريطة

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';

const MapErrorToast = ({
  error,
  onClose,
  isDark
}) => {
  // إخفاء تلقائي بعد 5 ثواني
  useEffect(() => {
    if (error) {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, onClose]);

  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="absolute top-20 left-4 right-4 z-[1002]"
        >
          <div className={`rounded-xl p-4 ${
            isDark ? 'bg-red-900/90 border border-red-700' : 'bg-red-100 border border-red-300'
          }`}>
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <p className={`font-bold ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                  خطأ
                </p>
                <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                  {error}
                </p>
              </div>
              <button
                onClick={onClose}
                className={`text-xl ${isDark ? 'text-red-400' : 'text-red-600'}`}
              >
                ×
              </button>
            </div>
            {/* شريط التقدم */}
            <div className="mt-2 h-1 bg-red-500/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-red-500"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 5, ease: 'linear' }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MapErrorToast;
