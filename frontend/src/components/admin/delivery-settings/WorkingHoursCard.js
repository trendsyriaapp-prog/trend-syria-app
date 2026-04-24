// /app/frontend/src/components/admin/delivery-settings/WorkingHoursCard.js
// بطاقة ساعات العمل

import { Clock, Save, RefreshCw } from 'lucide-react';

const WorkingHoursCard = ({ 
  settings, 
  setSettings, 
  saving, 
  onSave 
}) => {
  const { working_hours } = settings;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-l from-cyan-500 to-blue-500 p-2 text-white">
        <div className="flex items-center gap-2">
          <Clock size={18} />
          <div>
            <h2 className="font-bold text-sm">ساعات عمل التوصيل</h2>
            <p className="text-sm text-white/80">تحديد أوقات توفر خدمة التوصيل</p>
          </div>
        </div>
      </div>
      
      <div className="p-2 space-y-3">
        {/* تفعيل/إيقاف */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-700">تفعيل حدود ساعات العمل</p>
            <p className="text-xs text-gray-500">عند الإيقاف، التوصيل متاح 24/7</p>
          </div>
          <button
            onClick={() => setSettings({
              ...settings,
              working_hours: {
                ...working_hours,
                is_enabled: !working_hours?.is_enabled
              }
            })}
            className={`w-12 h-6 rounded-full transition-colors ${
              working_hours?.is_enabled ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
              working_hours?.is_enabled ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {working_hours?.is_enabled && (
          <div className="grid grid-cols-2 gap-2">
            {/* وقت البداية */}
            <div className="bg-cyan-50 rounded-lg p-4 border border-cyan-200">
              <h3 className="font-bold text-cyan-800 mb-2">🌅 بداية العمل</h3>
              <input
                type="number"
                value={working_hours?.start_hour || 8}
                onChange={(e) => setSettings({
                  ...settings,
                  working_hours: {
                    ...working_hours,
                    start_hour: parseInt(e.target.value) || 0
                  }
                })}
                className="w-full p-3 border border-cyan-300 rounded-lg text-center text-xl font-bold"
                min={0}
                max={23}
              />
              <p className="text-center text-sm text-cyan-600 mt-2">صباحاً</p>
            </div>

            {/* وقت النهاية */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h3 className="font-bold text-blue-800 mb-2">🌙 نهاية العمل</h3>
              <input
                type="number"
                value={working_hours?.end_hour || 18}
                onChange={(e) => setSettings({
                  ...settings,
                  working_hours: {
                    ...working_hours,
                    end_hour: parseInt(e.target.value) || 0
                  }
                })}
                className="w-full p-3 border border-blue-300 rounded-lg text-center text-xl font-bold"
                min={0}
                max={23}
              />
              <p className="text-center text-sm text-blue-600 mt-2">مساءً</p>
            </div>
          </div>
        )}

        {/* عرض الوقت */}
        <div className="p-3 bg-gradient-to-r from-cyan-100 to-blue-100 rounded-lg text-center">
          {working_hours?.is_enabled ? (
            <p className="text-sm text-gray-700">
              التوصيل متاح من 
              <span className="font-bold text-cyan-600 mx-1">{working_hours?.start_hour || 8}:00</span>
              إلى
              <span className="font-bold text-blue-600 mx-1">{working_hours?.end_hour || 18}:00</span>
            </p>
          ) : (
            <p className="text-sm text-green-600 font-medium">
              ✅ التوصيل متاح على مدار الساعة (24/7)
            </p>
          )}
        </div>

        <button
          onClick={onSave}
          disabled={saving}
          className="w-full bg-gradient-to-l from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-4 py-1.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 font-bold"
        >
          {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
          حفظ ساعات العمل
        </button>
      </div>
    </div>
  );
};

export default WorkingHoursCard;
