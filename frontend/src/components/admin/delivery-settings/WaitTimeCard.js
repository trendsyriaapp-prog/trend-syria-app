// /app/frontend/src/components/admin/delivery-settings/WaitTimeCard.js
// بطاقة وقت انتظار التوصيل

import { Clock, Save, RefreshCw } from 'lucide-react';

const WaitTimeCard = ({ 
  waitTimeMinutes, 
  setWaitTimeMinutes, 
  saving, 
  onSave 
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-l from-purple-500 to-pink-500 p-2 text-white">
        <div className="flex items-center gap-2">
          <Clock size={18} />
          <div>
            <h2 className="font-bold text-sm">وقت انتظار التوصيل</h2>
            <p className="text-sm text-white/80">الوقت الذي ينتظره السائق إذا لم يرد العميل</p>
          </div>
        </div>
      </div>
      
      <div className="p-2">
        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs">⏱️</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-800">وقت الانتظار</h3>
              <p className="text-xs text-gray-500">بعد هذا الوقت يمكن للسائق ترك الطلب عند الباب</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={waitTimeMinutes || ''}
              onChange={(e) => setWaitTimeMinutes(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
              onBlur={(e) => { if (e.target.value === '' || parseInt(e.target.value) < 1) setWaitTimeMinutes(10); }}
              className="flex-1 p-3 border border-purple-300 rounded-lg text-center text-sm font-bold"
              min={1}
              max={60}
            />
            <span className="text-lg font-bold text-purple-600">دقيقة</span>
          </div>
          <p className="text-center text-xs text-gray-500 mt-2">
            الحد الأدنى: 1 دقيقة | الحد الأقصى: 60 دقيقة
          </p>
        </div>

        <div className="mt-2 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <h4 className="font-bold text-yellow-800 mb-2">⚠️ كيف يعمل النظام:</h4>
          <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
            <li>السائق يصل للعميل ويطلب كود التسليم</li>
            <li>إذا لم يرد العميل، يضغط السائق "العميل لا يرد"</li>
            <li>يبدأ مؤقت ({waitTimeMinutes} دقيقة)</li>
            <li>بعد انتهاء الوقت، يترك الطلب عند الباب</li>
            <li>الأموال لا تُسترد للعميل</li>
          </ol>
        </div>

        <button
          onClick={onSave}
          disabled={saving}
          className="mt-2 w-full bg-gradient-to-l from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-1.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 font-bold"
        >
          {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
          حفظ وقت الانتظار
        </button>
      </div>
    </div>
  );
};

export default WaitTimeCard;
