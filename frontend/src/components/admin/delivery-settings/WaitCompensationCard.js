// /app/frontend/src/components/admin/delivery-settings/WaitCompensationCard.js
// بطاقة تعويض انتظار السائق في المطعم

import { Save, RefreshCw } from 'lucide-react';

const WaitCompensationCard = ({ 
  waitCompensationSettings, 
  setWaitCompensationSettings, 
  saving, 
  onSave 
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-l from-red-500 to-rose-500 p-2 text-white">
        <div className="flex items-center gap-2">
          <span className="text-xs">⏰</span>
          <div>
            <h2 className="font-bold text-sm">تعويض انتظار السائق في المطعم</h2>
            <p className="text-sm text-white/80">حماية السائقين من تأخيرات المطاعم</p>
          </div>
        </div>
      </div>
      
      <div className="p-2 space-y-3">
        {/* توضيح النظام */}
        <div className="bg-rose-50 rounded-lg p-4 border border-rose-200">
          <h4 className="font-bold text-rose-800 mb-2">🛡️ كيف يعمل نظام حماية السائقين:</h4>
          <ol className="text-sm text-rose-700 space-y-1 list-decimal list-inside">
            <li>السائق يصل للمطعم/المتجر ويضغط "وصلت"</li>
            <li>يبدأ عداد الانتظار</li>
            <li>إذا تجاوز الانتظار <strong>{waitCompensationSettings.max_waiting_time_minutes} دقائق</strong>، يستحق التعويض</li>
            <li>التعويض ثابت: <strong>{waitCompensationSettings.compensation_per_5_minutes?.toLocaleString()} ل.س</strong></li>
          </ol>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {/* وقت الانتظار المسموح */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">⏱️</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-800">وقت الانتظار المسموح</h3>
                <p className="text-xs text-gray-500">بعده يبدأ حساب التعويض</p>
              </div>
            </div>
            <input
              type="number"
              value={waitCompensationSettings.max_waiting_time_minutes || ''}
              onChange={(e) => setWaitCompensationSettings({
                ...waitCompensationSettings,
                max_waiting_time_minutes: e.target.value === '' ? '' : parseInt(e.target.value) || 0
              })}
              className="w-full p-3 border border-blue-300 rounded-lg text-center text-sm font-bold"
              min={5}
              max={30}
            />
            <p className="text-center text-sm text-blue-600 mt-2">دقيقة</p>
          </div>

          {/* قيمة التعويض */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">💰</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-800">قيمة التعويض</h3>
                <p className="text-xs text-gray-500">المبلغ المضاف للسائق عند تجاوز وقت الانتظار</p>
              </div>
            </div>
            <input
              type="number"
              value={waitCompensationSettings.compensation_per_5_minutes || ''}
              onChange={(e) => setWaitCompensationSettings({
                ...waitCompensationSettings,
                compensation_per_5_minutes: e.target.value === '' ? '' : parseInt(e.target.value) || 0
              })}
              className="w-full p-3 border border-green-300 rounded-lg text-center text-sm font-bold"
              min={100}
              step={100}
            />
            <p className="text-center text-sm text-green-600 mt-2">ل.س</p>
          </div>
        </div>

        {/* إعدادات Geofencing */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h4 className="font-bold text-blue-800 mb-1.5">📍 التحقق من موقع السائق (Geofencing):</h4>
          <p className="text-sm text-blue-600 mb-1.5">
            عند ضغط السائق "وصلت للمتجر"، يتم التحقق من أنه فعلاً قرب المتجر
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">المسافة المسموحة من المتجر</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={waitCompensationSettings.geofencing_max_distance_meters || ''}
                  onChange={(e) => setWaitCompensationSettings({
                    ...waitCompensationSettings,
                    geofencing_max_distance_meters: e.target.value === '' ? '' : parseInt(e.target.value) || 0
                  })}
                  onBlur={(e) => {
                    if (e.target.value === '' || parseInt(e.target.value) < 50) {
                      setWaitCompensationSettings({...waitCompensationSettings, geofencing_max_distance_meters: 150});
                    }
                  }}
                  className="w-24 p-2 border border-blue-300 rounded text-center text-sm font-bold"
                  min={50}
                  max={500}
                  step={10}
                />
                <span className="text-sm text-blue-600 font-medium">متر</span>
              </div>
            </div>
            <div className="text-center p-2 bg-white rounded-lg border border-blue-200">
              <p className="text-xs text-gray-500">مثال</p>
              <p className="text-lg font-bold text-blue-600">{waitCompensationSettings.geofencing_max_distance_meters}م</p>
              <p className="text-xs text-gray-500">≈ {Math.round(waitCompensationSettings.geofencing_max_distance_meters / 80)} دقيقة مشي</p>
            </div>
          </div>
          <p className="text-xs text-blue-500 mt-2">
            💡 إذا كان السائق أبعد من هذه المسافة، لن يستطيع تسجيل وصوله
          </p>
        </div>

        {/* نظام التحذيرات */}
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <h4 className="font-bold text-red-800 mb-1.5">⚠️ نظام تحذيرات المطاعم:</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">مخالفات قبل التحذير</label>
              <input
                type="number"
                value={waitCompensationSettings.warnings_before_alert || ''}
                onChange={(e) => setWaitCompensationSettings({
                  ...waitCompensationSettings,
                  warnings_before_alert: e.target.value === '' ? '' : parseInt(e.target.value) || 0
                })}
                className="w-full p-2 border border-gray-300 rounded-lg text-center"
                min={1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">مخالفات قبل التحذير الأخير</label>
              <input
                type="number"
                value={waitCompensationSettings.warnings_before_final || ''}
                onChange={(e) => setWaitCompensationSettings({
                  ...waitCompensationSettings,
                  warnings_before_final: e.target.value === '' ? '' : parseInt(e.target.value) || 0
                })}
                onBlur={(e) => {
                  if (e.target.value === '' || parseInt(e.target.value) < 1) {
                    setWaitCompensationSettings({...waitCompensationSettings, warnings_before_final: 7});
                  }
                }}
                className="w-full p-2 border border-gray-300 rounded-lg text-center"
                min={1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">مخالفات قبل الإيقاف</label>
              <input
                type="number"
                value={waitCompensationSettings.warnings_before_suspend || ''}
                onChange={(e) => setWaitCompensationSettings({
                  ...waitCompensationSettings,
                  warnings_before_suspend: e.target.value === '' ? '' : parseInt(e.target.value) || 0
                })}
                className="w-full p-2 border border-gray-300 rounded-lg text-center"
                min={1}
              />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">مدة الإيقاف (ساعات)</label>
            <input
              type="number"
              value={waitCompensationSettings.suspend_duration_hours || ''}
              onChange={(e) => setWaitCompensationSettings({
                ...waitCompensationSettings,
                suspend_duration_hours: e.target.value === '' ? '' : parseInt(e.target.value) || 0
              })}
              className="w-32 p-2 border border-gray-300 rounded-lg text-center"
              min={1}
            />
          </div>
        </div>

        <button
          onClick={onSave}
          disabled={saving}
          className="mt-2 w-full bg-gradient-to-l from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white px-4 py-1.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 font-bold"
        >
          {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
          حفظ إعدادات تعويض الانتظار
        </button>
      </div>
    </div>
  );
};

export default WaitCompensationCard;
