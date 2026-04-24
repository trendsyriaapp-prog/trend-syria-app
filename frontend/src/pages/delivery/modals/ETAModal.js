// /app/frontend/src/pages/delivery/modals/ETAModal.js
// نافذة الوقت المتوقع للوصول

import { motion } from 'framer-motion';
import { Clock, Navigation } from 'lucide-react';

const ETAModal = ({ 
  isOpen, 
  estimatedTime, 
  setEstimatedTime, 
  onConfirm, 
  onClose 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 text-white">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Clock size={24} />
            الوقت المتوقع للوصول
          </h3>
          <p className="text-sm text-white/80">حدد المدة المتوقعة للوصول للعميل</p>
        </div>
        
        <div className="p-4">
          {/* خيارات سريعة */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {[15, 20, 30, 45].map((mins) => (
              <button
                key={mins}
                onClick={() => setEstimatedTime(mins)}
                className={`py-3 rounded-xl font-bold text-sm transition-all ${
                  estimatedTime === mins
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {mins} د
              </button>
            ))}
          </div>

          {/* إدخال مخصص */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              أو أدخل وقت مخصص (بالدقائق)
            </label>
            <input
              type="number"
              value={estimatedTime}
              onChange={(e) => setEstimatedTime(parseInt(e.target.value) || 30)}
              min="5"
              max="120"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 text-center text-xl font-bold"
            />
          </div>

          {/* أزرار */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 rounded-xl font-bold text-gray-700"
            >
              إلغاء
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 bg-orange-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <Navigation size={18} />
              انطلق
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ETAModal;
