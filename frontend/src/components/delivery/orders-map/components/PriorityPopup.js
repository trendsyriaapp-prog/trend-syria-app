// /app/frontend/src/components/delivery/orders-map/components/PriorityPopup.js
// نافذة طلب الأولوية المنبثقة

import { motion, AnimatePresence } from 'framer-motion';

/**
 * نافذة إشعار الأولوية الذكية
 * @param {boolean} showPriorityPopup - هل تُعرض النافذة
 * @param {Object} priorityOrder - بيانات الطلب
 * @param {number} priorityCountdown - العد التنازلي
 * @param {Function} onAccept - دالة قبول الطلب
 * @param {Function} onReject - دالة رفض الطلب
 */
const PriorityPopup = ({
  showPriorityPopup,
  priorityOrder,
  priorityCountdown,
  onAccept,
  onReject
}) => {
  return (
    <AnimatePresence>
      {showPriorityPopup && priorityOrder && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -20 }}
          className={`absolute top-20 left-4 right-4 z-[2000] rounded-2xl shadow-2xl overflow-hidden border-4 ${
            priorityCountdown > 0 
              ? 'bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 border-yellow-300' 
              : 'bg-gradient-to-br from-red-400 via-red-500 to-red-600 border-red-300'
          }`}
          style={{ 
            boxShadow: priorityCountdown > 0 ? '0 0 40px rgba(251, 191, 36, 0.5)' : '0 0 40px rgba(239, 68, 68, 0.5)',
            touchAction: 'none'
          }}
          onTouchMove={(e) => e.stopPropagation()}
          data-testid="priority-popup"
        >
          {/* شريط العد التنازلي */}
          <div className="h-2 bg-black/20">
            {priorityCountdown > 0 ? (
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: priorityCountdown, ease: 'linear' }}
                className="h-full bg-white"
              />
            ) : (
              <div className="h-full bg-white animate-pulse" />
            )}
          </div>
          
          <div className="p-5 text-black">
            {/* العنوان */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className={`text-4xl ${priorityCountdown > 0 ? 'animate-bounce' : 'animate-pulse'}`}>
                  {priorityCountdown > 0 ? '🔔' : '⚠️'}
                </span>
                <div>
                  <p className="font-black text-lg">
                    {priorityCountdown > 0 ? 'طلب جديد من نفس المطعم!' : '⏰ قرر الآن!'}
                  </p>
                  <p className={`text-sm ${priorityCountdown > 0 ? 'text-black/70' : 'text-white font-bold'}`}>
                    {priorityCountdown > 0 ? 'أنت ذاهب لهذا المطعم الآن' : 'الطلب قد يُأخذ من سائق آخر'}
                  </p>
                </div>
              </div>
              <div className={`rounded-full w-16 h-16 flex flex-col items-center justify-center ${
                priorityCountdown > 0 ? 'bg-black text-yellow-400' : 'bg-white text-red-500 animate-pulse'
              }`}>
                {priorityCountdown > 0 ? (
                  <>
                    <span className="font-black text-2xl">{priorityCountdown}</span>
                    <span className="text-xs">ثانية</span>
                  </>
                ) : (
                  <span className="font-black text-xl">!</span>
                )}
              </div>
            </div>

            {/* معلومات الطلب */}
            <div className="bg-black/10 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">🍔</span>
                <span className="font-bold text-lg">{priorityOrder.restaurant_name}</span>
              </div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xl">🏠</span>
                <span className="font-medium">{priorityOrder.customer_name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xl">📍</span>
                <span className="text-sm text-black/70 truncate">
                  {typeof priorityOrder.delivery_address === 'object' 
                    ? [priorityOrder.delivery_address?.area, priorityOrder.delivery_address?.street, priorityOrder.delivery_address?.building].filter(Boolean).join(', ')
                    : priorityOrder.delivery_address}
                </span>
              </div>
            </div>

            {/* الربح المتوقع */}
            <div className="bg-green-500 text-white rounded-xl p-4 mb-4 text-center">
              <span className="text-sm">💰 ربح إضافي: </span>
              <span className="font-black text-2xl">+{(priorityOrder.driver_earnings || priorityOrder.driver_delivery_fee || priorityOrder.delivery_fee || 1500).toLocaleString()} ل.س</span>
            </div>

            {/* أزرار القبول والرفض */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={onReject}
                data-testid="priority-reject-btn"
                className="py-4 bg-white/50 hover:bg-white/70 rounded-xl font-bold text-lg transition-colors border-2 border-black/20"
              >
                ❌ رفض
              </button>
              <button
                onClick={onAccept}
                data-testid="priority-accept-btn"
                className="py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg transition-colors shadow-xl"
              >
                ✅ قبول
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PriorityPopup;
