// /app/frontend/src/components/delivery/orders-map/components/PriorityPopup.js
// نافذة طلب الأولوية المنبثقة

import { motion } from 'framer-motion';
import { Navigation } from 'lucide-react';

const PriorityPopup = ({
  show,
  order,
  countdown,
  onAccept,
  onReject,
  isDark
}) => {
  if (!show || !order) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70">
      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 50 }}
        className={`w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl ${
          isDark ? 'bg-[#1a1a1a] border border-[#333]' : 'bg-white'
        }`}
      >
        {/* Header مع countdown */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 text-white relative">
          <div className="absolute top-2 left-2 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <span className="text-2xl font-bold">{countdown}</span>
          </div>
          <div className="text-center">
            <span className="text-4xl">⚡</span>
            <h3 className="text-xl font-bold mt-2">طلب أولوية!</h3>
            <p className="text-sm text-white/80">أنت الأقرب للمطعم</p>
          </div>
          {/* شريط التقدم */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/30">
            <motion.div
              className="h-full bg-white"
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{ duration: 25, ease: 'linear' }}
            />
          </div>
        </div>

        {/* تفاصيل الطلب */}
        <div className="p-4">
          {/* اسم المطعم */}
          <div className={`rounded-xl p-3 mb-3 ${
            isDark ? 'bg-[#252525]' : 'bg-gray-100'
          }`}>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🍔</span>
              <div>
                <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {order.store_name || order.restaurant_name}
                </p>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  طلب #{order.order_number || order.id?.slice(-6)}
                </p>
              </div>
            </div>
          </div>

          {/* المسافة والمبلغ */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className={`rounded-xl p-3 text-center ${
              isDark ? 'bg-green-500/20' : 'bg-green-50'
            }`}>
              <p className="text-green-500 text-2xl font-bold">
                {(order.driver_delivery_fee || order.delivery_fee || 0).toLocaleString()}
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>ل.س ربحك</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${
              isDark ? 'bg-blue-500/20' : 'bg-blue-50'
            }`}>
              <p className="text-blue-500 text-2xl font-bold">
                {order.distance_to_store_km?.toFixed(1) || '؟'}
              </p>
              <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>كم للمطعم</p>
            </div>
          </div>

          {/* أزرار القبول والرفض */}
          <div className="flex gap-2">
            <button
              onClick={onReject}
              className={`flex-1 py-3 rounded-xl font-bold ${
                isDark 
                  ? 'bg-[#252525] text-gray-400 border border-[#444]' 
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              ❌ رفض
            </button>
            <button
              onClick={onAccept}
              className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-green-500 to-teal-500 text-white flex items-center justify-center gap-2"
            >
              <Navigation size={18} />
              ✅ قبول
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PriorityPopup;
