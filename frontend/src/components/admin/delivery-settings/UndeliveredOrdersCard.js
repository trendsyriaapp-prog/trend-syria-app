// /app/frontend/src/components/admin/delivery-settings/UndeliveredOrdersCard.js
// بطاقة الطلبات غير المُسلّمة

import { AlertCircle, RefreshCw } from 'lucide-react';

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const UndeliveredOrdersCard = ({ 
  undeliveredReport, 
  saving, 
  onRefresh,
  onProcessUndelivered
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-l from-red-500 to-orange-500 p-2 text-white">
        <div className="flex items-center gap-2">
          <AlertCircle size={18} />
          <div>
            <h2 className="font-bold text-sm">الطلبات غير المُسلّمة</h2>
            <p className="text-sm text-white/80">مراقبة وخصم قيمة الطلبات التي لم يسلمها السائقون</p>
          </div>
        </div>
      </div>
      
      <div className="p-2">
        {undeliveredReport ? (
          <div className="space-y-3">
            {/* طلبات اليوم */}
            <div className="p-2 bg-yellow-50 rounded-lg border border-yellow-200">
              <h3 className="font-bold text-yellow-800 mb-2">طلبات اليوم (قيد التوصيل)</h3>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-yellow-700">{undeliveredReport.today.count}</span>
                  <span className="text-yellow-600 mr-2">طلب</span>
                </div>
                <div className="text-left">
                  <p className="text-sm text-yellow-600">القيمة الإجمالية</p>
                  <p className="font-bold text-yellow-800">{formatPrice(undeliveredReport.today.total_value)}</p>
                </div>
              </div>
            </div>

            {/* طلبات الأمس (تحتاج خصم) */}
            <div className="p-2 bg-red-50 rounded-lg border border-red-200">
              <h3 className="font-bold text-red-800 mb-2">طلبات الأمس (تحتاج خصم)</h3>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-red-700">{undeliveredReport.yesterday_pending_penalty.count}</span>
                  <span className="text-red-600 mr-2">طلب</span>
                </div>
                <div className="text-left">
                  <p className="text-sm text-red-600">القيمة الإجمالية</p>
                  <p className="font-bold text-red-800">{formatPrice(undeliveredReport.yesterday_pending_penalty.total_value)}</p>
                </div>
              </div>

              {undeliveredReport.yesterday_pending_penalty.count > 0 && (
                <button
                  onClick={onProcessUndelivered}
                  disabled={saving}
                  className="mt-2 w-full bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  {saving ? <RefreshCw size={18} className="animate-spin" /> : <AlertCircle size={18} />}
                  خصم {formatPrice(undeliveredReport.yesterday_pending_penalty.total_value)} من رصيد السائقين
                </button>
              )}
            </div>

            <button
              onClick={onRefresh}
              className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
            >
              <RefreshCw size={14} />
              تحديث التقرير
            </button>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <RefreshCw size={18} className="animate-spin mx-auto mb-2" />
            جاري تحميل التقرير...
          </div>
        )}
      </div>
    </div>
  );
};

export default UndeliveredOrdersCard;
