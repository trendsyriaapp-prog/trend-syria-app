// /app/frontend/src/components/delivery/orders-map/components/ExternalPriorityPopup.js
// Popup الطلب العاجل الخارجي - يظهر حتى لو الخريطة مغلقة

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Popup الطلب العاجل الخارجي
 * @param {boolean} showPriorityPopup - هل يُعرض الـ popup
 * @param {Object} priorityOrder - بيانات الطلب العاجل
 * @param {number} priorityCountdown - العد التنازلي
 * @param {boolean} isMapOpen - هل الخريطة مفتوحة
 * @param {Function} onAccept - دالة قبول الطلب
 * @param {Function} onReject - دالة رفض الطلب
 */
const ExternalPriorityPopup = ({
  showPriorityPopup,
  priorityOrder,
  priorityCountdown,
  isMapOpen,
  onAccept,
  onReject
}) => {
  return (
    <AnimatePresence>
      {showPriorityPopup && priorityOrder && !isMapOpen && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          className="fixed top-4 left-4 right-4 z-[9999] rounded-2xl shadow-2xl overflow-hidden border-4 bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 border-yellow-300"
          style={{ 
            boxShadow: '0 0 40px rgba(251, 191, 36, 0.5)',
            maxWidth: '400px',
            margin: '0 auto'
          }}
          data-testid="external-priority-popup"
        >
          {/* العد التنازلي */}
          <div className="absolute top-2 left-2 w-12 h-12 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
            <span className="text-2xl font-bold text-white">{priorityCountdown}</span>
          </div>
          
          <div className="p-4 text-center">
            <div className="mb-2">
              <span className="text-3xl">🔔</span>
            </div>
            <h3 className="text-lg font-bold text-white mb-1">طلب عاجل!</h3>
            <p className="text-sm text-white/90 mb-3">من نفس المطعم الذي أنت ذاهب إليه</p>
            
            <div className="bg-white/20 backdrop-blur rounded-xl p-3 mb-3">
              <p className="text-white font-bold text-lg">🍔 {priorityOrder.store_name || priorityOrder.restaurant_name}</p>
              <p className="text-white/80 text-sm">📍 {priorityOrder.delivery_address?.city || priorityOrder.delivery_area}</p>
            </div>
            
            <p className="text-white font-bold text-xl mb-4">
              💰 +{(priorityOrder.driver_delivery_fee || priorityOrder.delivery_fee || 0).toLocaleString()} ل.س
            </p>
            
            <div className="flex gap-2">
              <button
                onClick={onReject}
                data-testid="external-priority-reject-btn"
                className="flex-1 py-3 bg-white/20 backdrop-blur text-white rounded-xl font-bold hover:bg-white/30 transition-all"
              >
                ❌ رفض
              </button>
              <button
                onClick={onAccept}
                data-testid="external-priority-accept-btn"
                className="flex-1 py-3 bg-white text-amber-600 rounded-xl font-bold hover:bg-gray-100 transition-all"
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

export default ExternalPriorityPopup;
