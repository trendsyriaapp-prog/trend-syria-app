// /app/frontend/src/pages/delivery/modals/DeleteConfirmModal.js
// نافذة تأكيد حذف سجلات المحفظة

import { Trash2 } from 'lucide-react';

const DeleteConfirmModal = ({ 
  isOpen, 
  deleting, 
  onConfirm, 
  onClose,
  theme = 'light'
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" 
      onClick={onClose}
    >
      <div 
        className={`rounded-2xl p-6 w-full max-w-sm ${theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-center mb-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-500/20 flex items-center justify-center mb-3">
            <Trash2 size={32} className="text-red-500" />
          </div>
          <h2 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
            حذف سجلات المحفظة
          </h2>
          <p className={`text-sm mt-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
            هل أنت متأكد من حذف جميع سجلات المعاملات؟
          </p>
          <p className="text-xs text-green-500 mt-2 bg-green-500/10 rounded-lg p-2">
            ✓ الرصيد الحالي لن يتغير
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className={`flex-1 py-3 rounded-xl font-bold ${
              theme === 'dark' ? 'bg-[#252525] text-gray-300' : 'bg-gray-100 text-gray-700'
            }`}
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {deleting ? 'جاري الحذف...' : 'تأكيد الحذف'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
