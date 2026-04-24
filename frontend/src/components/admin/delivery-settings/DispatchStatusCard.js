// /app/frontend/src/components/admin/delivery-settings/DispatchStatusCard.js
// بطاقة حالة التوزيع التلقائي

import { RefreshCw } from 'lucide-react';

const DispatchStatusCard = ({ dispatchStatus, onRefresh }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-l from-blue-500 to-indigo-500 p-2 text-white">
        <div className="flex items-center gap-2">
          <span className="text-xs">🚀</span>
          <h2 className="font-bold text-sm">حالة التوزيع التلقائي</h2>
        </div>
      </div>
      <div className="p-2">
        {dispatchStatus ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
              <span className="text-gray-600 text-sm">النظام</span>
              <span className={`font-bold ${dispatchStatus.background_task_running ? 'text-green-600' : 'text-red-600'}`}>
                {dispatchStatus.background_task_running ? '✅ يعمل' : '❌ متوقف'}
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
              <span className="text-gray-600 text-sm">السائقين المتاحين</span>
              <span className="font-bold text-blue-600">{dispatchStatus.available_drivers}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
              <span className="text-gray-600 text-sm">بانتظار التوزيع</span>
              <span className="font-bold text-orange-600">{dispatchStatus.pending_dispatch}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
              <span className="text-gray-600 text-sm">تم توزيعها اليوم</span>
              <span className="font-bold text-purple-600">{dispatchStatus.dispatched_today}</span>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-4">جاري التحميل...</div>
        )}
        <button
          onClick={onRefresh}
          className="mt-2 w-full bg-blue-100 text-blue-700 py-1.5 rounded-lg hover:bg-blue-200 flex items-center justify-center gap-2"
        >
          <RefreshCw size={16} />
          تحديث
        </button>
      </div>
    </div>
  );
};

export default DispatchStatusCard;
