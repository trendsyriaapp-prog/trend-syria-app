// /app/frontend/src/components/admin/delivery-settings/ViolationsReportCard.js
// بطاقة تقرير المخالفات

import { RefreshCw } from 'lucide-react';

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const ViolationsReportCard = ({ violationsReport, onRefresh }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-l from-red-500 to-rose-500 p-2 text-white">
        <div className="flex items-center gap-2">
          <span className="text-xs">📊</span>
          <h2 className="font-bold text-sm">تقرير المخالفات (30 يوم)</h2>
        </div>
      </div>
      <div className="p-2">
        {violationsReport ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
              <span className="text-gray-600 text-sm">إجمالي المخالفات</span>
              <span className="font-bold text-red-600">{violationsReport.total_violations}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
              <span className="text-gray-600 text-sm">إجمالي التعويضات</span>
              <span className="font-bold text-green-600">{formatPrice(violationsReport.total_compensations)}</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
              <span className="text-gray-600 text-sm">متوسط وقت التأخير</span>
              <span className="font-bold text-yellow-600">{violationsReport.average_waiting_minutes} دقيقة</span>
            </div>
            {violationsReport.violating_stores?.length > 0 && (
              <div className="p-2 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">المتاجر المخالفة:</p>
                <div className="space-y-1">
                  {violationsReport.violating_stores.slice(0, 3).map((store, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-gray-600 text-sm">{store.name}</span>
                      <span className="text-red-600">{store.count} مخالفة</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-4">جاري التحميل...</div>
        )}
        <button
          onClick={onRefresh}
          className="mt-2 w-full bg-red-100 text-red-700 py-1.5 rounded-lg hover:bg-red-200 flex items-center justify-center gap-2"
        >
          <RefreshCw size={16} />
          تحديث
        </button>
      </div>
    </div>
  );
};

export default ViolationsReportCard;
