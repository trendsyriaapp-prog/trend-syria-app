// /app/frontend/src/components/admin/RejectModal.js
// نافذة رفض موحدة مع حقل سبب اختياري

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, XCircle, AlertTriangle } from 'lucide-react';

const RejectModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "تأكيد الرفض",
  itemName = "",
  processing = false
}) => {
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(reason.trim());
    setReason('');
  };

  const handleClose = () => {
    setReason('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-xl"
        data-testid="reject-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{title}</h3>
              {itemName && (
                <p className="text-sm text-gray-500">{itemName}</p>
              )}
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            data-testid="reject-modal-close"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            سبب الرفض <span className="text-gray-400 font-normal">(اختياري)</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="يمكنك كتابة سبب الرفض هنا ليصل إلى صاحب الطلب..."
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            data-testid="reject-reason-input"
          />
          <p className="text-xs text-gray-400 mt-2">
            سيتم إرسال إشعار للمستخدم بالرفض{reason ? ' مع السبب المحدد' : ''}
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-gray-100">
          <button
            onClick={handleClose}
            disabled={processing}
            className="flex-1 py-2.5 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            data-testid="reject-modal-cancel"
          >
            إلغاء
          </button>
          <button
            onClick={handleConfirm}
            disabled={processing}
            className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            data-testid="reject-modal-confirm"
          >
            {processing ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <XCircle size={18} />
                تأكيد الرفض
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default RejectModal;
