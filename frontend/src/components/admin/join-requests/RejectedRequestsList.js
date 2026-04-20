// /app/frontend/src/components/admin/join-requests/RejectedRequestsList.js
// قائمة الطلبات المرفوضة

import { Store, Truck, Archive, Phone, Trash2, Loader2 } from 'lucide-react';

// دالة تنسيق التاريخ
export const formatDate = (dateStr) => {
  if (!dateStr) return 'غير محدد';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'اليوم';
  if (diffDays === 1) return 'أمس';
  if (diffDays < 7) return `منذ ${diffDays} أيام`;
  if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`;
  return date.toLocaleDateString('ar-SY');
};

const RejectedRequestsList = ({ 
  rejectedRequests, 
  actionLoading, 
  onDelete 
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between bg-red-50 px-3 py-2 rounded-lg">
        <h3 className="font-bold text-red-700 flex items-center gap-2">
          <Archive size={18} />
          سجل الطلبات المرفوضة ({rejectedRequests.length})
        </h3>
        <span className="text-xs text-red-500 bg-red-100 px-2 py-1 rounded-full">
          تُحذف تلقائياً بعد 30 يوم
        </span>
      </div>
      
      {rejectedRequests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Archive size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">لا توجد طلبات مرفوضة</p>
        </div>
      ) : (
        rejectedRequests.map((item) => (
          <div key={`rejected-${item.id}`} className="bg-white rounded-xl border border-red-200 p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.type === 'driver' ? 'bg-cyan-100' : 'bg-amber-100'}`}>
                  {item.type === 'driver' ? (
                    <Truck size={20} className="text-cyan-600" />
                  ) : (
                    <Store size={20} className="text-amber-600" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-gray-800">{item.name || 'غير معروف'}</h4>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${item.type === 'driver' ? 'bg-cyan-100 text-cyan-700' : 'bg-amber-100 text-amber-700'}`}>
                      {item.type === 'driver' ? 'سائق' : 'بائع'}
                    </span>
                    <span>•</span>
                    <span>{formatDate(item.rejected_at)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => onDelete(item.id)}
                disabled={actionLoading === item.id}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="حذف السجل"
              >
                {actionLoading === item.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
              </button>
            </div>
            
            {item.reason && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-700">
                  <span className="font-medium">سبب الرفض:</span> {item.reason}
                </p>
              </div>
            )}
            
            {item.phone && (
              <div className="mt-2 text-sm text-gray-500 flex items-center gap-1">
                <Phone size={14} />
                {item.phone}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default RejectedRequestsList;
