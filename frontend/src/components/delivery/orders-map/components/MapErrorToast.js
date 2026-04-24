// /app/frontend/src/components/delivery/orders-map/components/MapErrorToast.js
// رسالة الخطأ في الخريطة

import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const MapErrorToast = ({
  error,
  onClose
}) => {
  return (
    <AnimatePresence>
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="absolute top-0 left-0 right-0 z-[9999]"
        >
          <div className="bg-red-600 text-white shadow-2xl">
            {/* Header */}
            <div className="px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-bold text-base">{error}</p>
                  <p className="text-xs opacity-80">يرجى إتمام الطلبات الحالية أولاً</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                data-testid="map-error-close"
                className="text-white/80 hover:text-white bg-red-700 hover:bg-red-800 rounded-full p-2 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            {/* شريط التقدم */}
            <div className="h-1 bg-red-800">
              <motion.div 
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 5, ease: 'linear' }}
                onAnimationComplete={onClose}
                className="h-full bg-white/50"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MapErrorToast;
