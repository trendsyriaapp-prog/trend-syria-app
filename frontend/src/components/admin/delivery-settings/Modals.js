// /app/frontend/src/components/admin/delivery-settings/Modals.js
// النوافذ المنبثقة (Modals)

import { CheckCircle, AlertCircle } from 'lucide-react';

// Release Earnings Confirmation Modal
export const ReleaseEarningsModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle size={16} className="text-green-600" />
          </div>
          <div>
            <h3 className="font-bold">إطلاق الأرباح المعلقة</h3>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-2">
          هل تريد إطلاق جميع الأرباح المعلقة للسائقين الآن؟ سيتم تحويل المبالغ إلى محافظهم.
        </p>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-sm"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm flex items-center justify-center gap-2"
          >
            <CheckCircle size={16} />
            تأكيد الإطلاق
          </button>
        </div>
      </div>
    </div>
  );
};

// Process Undelivered Orders Confirmation Modal
export const ProcessUndeliveredModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle size={16} className="text-red-600" />
          </div>
          <div>
            <h3 className="font-bold">خصم الطلبات غير المُسلّمة</h3>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-2">
          هل أنت متأكد من خصم قيمة الطلبات غير المُسلّمة من رصيد السائقين؟ لا يمكن التراجع عن هذا الإجراء.
        </p>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-sm"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm flex items-center justify-center gap-2"
          >
            <AlertCircle size={16} />
            تأكيد الخصم
          </button>
        </div>
      </div>
    </div>
  );
};
