// /app/frontend/src/components/admin/RejectModal.js
// نافذة رفض موحدة مع حقل سبب اختياري وأسباب جاهزة

import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, XCircle, AlertTriangle, ChevronDown } from 'lucide-react';

// أسباب الرفض الجاهزة
const PRESET_REASONS = [
  "الوثائق غير واضحة",
  "معلومات ناقصة أو غير صحيحة",
  "مخالفة لشروط الاستخدام",
  "جودة الصور غير مقبولة",
  "السعر غير مناسب",
  "المنتج غير مطابق للوصف",
  "عدم استيفاء الشروط المطلوبة",
  "تكرار أو نسخة مكررة",
];

const RejectModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "تأكيد الرفض",
  itemName = "",
  processing = false
}) => {
  const [reason, setReason] = useState('');
  const [showPresets, setShowPresets] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(reason.trim());
    setReason('');
    setShowPresets(false);
  };

  const handleClose = () => {
    setReason('');
    setShowPresets(false);
    onClose();
  };

  const selectPreset = (preset) => {
    setReason(preset);
    setShowPresets(false);
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
          
          {/* Preset Reasons Dropdown */}
          <div className="relative mb-3">
            <button
              type="button"
              onClick={() => setShowPresets(!showPresets)}
              className="w-full flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              data-testid="preset-reasons-toggle"
            >
              <span>اختر من الأسباب الجاهزة</span>
              <ChevronDown size={18} className={`transition-transform ${showPresets ? 'rotate-180' : ''}`} />
            </button>
            
            {showPresets && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-48 overflow-y-auto"
              >
                {PRESET_REASONS.map((preset, index) => (
                  <button
                    key={`preset-${preset.substring(0, 15)}`}
                    onClick={() => selectPreset(preset)}
                    className="w-full text-right px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors border-b border-gray-50 last:border-0"
                    data-testid={`preset-reason-${index}`}
                  >
                    {preset}
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="أو اكتب سبباً مخصصاً..."
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
