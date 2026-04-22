// /app/frontend/src/components/admin/RejectModal.js
// نافذة رفض العناصر (منتجات، طلبات انضمام، إلخ)

import { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const COMMON_REJECTION_REASONS = [
  'صور غير واضحة أو غير مناسبة',
  'معلومات ناقصة أو غير دقيقة',
  'السعر غير مناسب',
  'المنتج مخالف لسياسة المنصة',
  'وصف المنتج غير كافٍ',
  'أخرى'
];

const RejectModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'رفض',
  itemName = '',
  processing = false 
}) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const handleConfirm = () => {
    const finalReason = selectedReason === 'أخرى' ? customReason : selectedReason;
    if (finalReason.trim()) {
      onConfirm(finalReason);
      // Reset state
      setSelectedReason('');
      setCustomReason('');
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setCustomReason('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={handleClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="bg-red-500 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={20} />
                <h3 className="font-bold">{title}</h3>
              </div>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-red-600 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-4 space-y-4">
              {itemName && (
                <p className="text-gray-700 text-sm">
                  هل أنت متأكد من رفض <span className="font-bold text-red-600">{itemName}</span>؟
                </p>
              )}
              
              {/* Reason Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  سبب الرفض
                </label>
                <div className="space-y-2">
                  {COMMON_REJECTION_REASONS.map((reason) => (
                    <label
                      key={reason}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                        selectedReason === reason
                          ? 'border-red-500 bg-red-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reject-reason"
                        value={reason}
                        checked={selectedReason === reason}
                        onChange={(e) => setSelectedReason(e.target.value)}
                        className="text-red-500"
                      />
                      <span className="text-sm text-gray-700">{reason}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              {/* Custom Reason Input */}
              {selectedReason === 'أخرى' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <textarea
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="اكتب سبب الرفض..."
                    className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none"
                    rows={3}
                  />
                </motion.div>
              )}
            </div>
            
            {/* Actions */}
            <div className="p-4 bg-gray-50 flex gap-2">
              <button
                onClick={handleClose}
                disabled={processing}
                className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                إلغاء
              </button>
              <button
                onClick={handleConfirm}
                disabled={processing || (!selectedReason || (selectedReason === 'أخرى' && !customReason.trim()))}
                className="flex-1 py-2 px-4 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    جاري الرفض...
                  </>
                ) : (
                  'تأكيد الرفض'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default RejectModal;
