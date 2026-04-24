// /app/frontend/src/components/admin/delivery-settings/SmartPriorityCard.js
// بطاقة الأولوية الذكية

import { Save, RefreshCw } from 'lucide-react';

const SmartPriorityCard = ({ 
  smartOrderLimits, 
  setSmartOrderLimits, 
  saving, 
  onSave 
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-l from-purple-500 to-indigo-500 p-2 text-white">
        <div className="flex items-center gap-2">
          <span className="text-xs">🧠</span>
          <div>
            <h2 className="font-bold text-sm">الأولوية الذكية</h2>
            <p className="text-sm text-white/80">الطلب يظهر للسائق الذاهب لنفس المكان أولاً</p>
          </div>
        </div>
      </div>
      
      <div className="p-2">
        {/* تفعيل الأولوية الذكية */}
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <div>
              <h3 className="font-bold text-sm text-gray-800">تفعيل الأولوية الذكية</h3>
              <p className="text-[10px] text-gray-500">طلب من نفس المطعم يظهر للسائق الذاهب إليه أولاً</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={smartOrderLimits.enable_smart_priority}
              onChange={(e) => setSmartOrderLimits({
                ...smartOrderLimits,
                enable_smart_priority: e.target.checked
              })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>

        {/* شرح مبسط */}
        {smartOrderLimits.enable_smart_priority && (
          <div className="mt-2 p-2 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-[10px] text-purple-700">
              💡 عندما يكون السائق ذاهب لمطعم معين، أي طلب جديد من نفس المطعم سيظهر له أولاً قبل باقي السائقين.
            </p>
          </div>
        )}

        <button
          onClick={onSave}
          disabled={saving}
          className="mt-2 w-full bg-gradient-to-l from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold disabled:opacity-50"
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          حفظ
        </button>
      </div>
    </div>
  );
};

export default SmartPriorityCard;
