// /app/frontend/src/components/admin/join-requests/RejectRequestModal.js
// Modal سبب الرفض

import { Loader2, XCircle } from 'lucide-react';

const RejectRequestModal = ({ 
  rejectModal, 
  rejectReason, 
  setRejectReason, 
  setRejectModal, 
  executeReject, 
  actionLoading 
}) => {
  if (!rejectModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full">
        <h3 className="text-lg font-bold text-gray-900 mb-2">رفض الطلب</h3>
        <p className="text-gray-600 mb-4">
          أنت على وشك رفض طلب <strong>{rejectModal.name || 'هذا الطلب'}</strong>
        </p>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            سبب الرفض <span className="text-red-500">*</span>
          </label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="اكتب سبب الرفض هنا..."
            className="w-full p-3 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            rows={3}
          />
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => {
              setRejectModal(null);
              setRejectReason('');
            }}
            className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
          >
            إلغاء
          </button>
          <button
            onClick={executeReject}
            disabled={actionLoading === rejectModal.id || !rejectReason.trim()}
            className="flex-1 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {actionLoading === rejectModal.id ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <XCircle size={18} />
            )}
            تأكيد الرفض
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectRequestModal;
