// /app/frontend/src/components/admin/delivery-settings/DeliveryTimeSettingsCard.js
// بطاقة إعدادات وقت التوصيل والعقوبات

import { Save, RefreshCw } from 'lucide-react';

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const DeliveryTimeSettingsCard = ({ 
  deliveryTimeSettings, 
  setDeliveryTimeSettings, 
  saving, 
  onSave 
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-l from-red-500 to-pink-500 p-2 text-white">
        <div className="flex items-center gap-2">
          <span className="text-xs">⏱️</span>
          <div>
            <h2 className="font-bold text-sm">إعدادات وقت التوصيل والعقوبات</h2>
            <p className="text-sm text-white/80">تحكم في وقت التوصيل ونظام العقوبات للتأخير</p>
          </div>
        </div>
      </div>
      
      <div className="p-2 space-y-3">
        {/* شرح النظام */}
        <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-bold text-blue-700 mb-2">ℹ️ كيف يعمل النظام:</h4>
          <p className="text-sm text-gray-600 text-sm">
            عندما يستلم السائق الطلب من المطعم، يبدأ العداد. الوقت المسموح = وقت GPS + Buffer الإضافي.
            إذا تأخر السائق، يحصل على تحذيرات أولاً ثم خصومات.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {/* Buffer الإضافي */}
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">➕</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-800">الوقت الإضافي (Buffer)</h3>
                <p className="text-xs text-gray-500">يُضاف لوقت GPS لحماية السائق</p>
              </div>
            </div>
            <input
              type="number"
              value={deliveryTimeSettings.buffer_minutes || ''}
              onChange={(e) => setDeliveryTimeSettings({
                ...deliveryTimeSettings,
                buffer_minutes: e.target.value === '' ? '' : parseInt(e.target.value) || 0
              })}
              onBlur={(e) => {
                if (e.target.value === '' || parseInt(e.target.value) < 3) {
                  setDeliveryTimeSettings({...deliveryTimeSettings, buffer_minutes: 5});
                }
              }}
              className="w-full p-3 border border-green-300 rounded-lg text-center text-sm font-bold"
              min={3}
              max={20}
            />
            <p className="text-center text-sm text-green-600 mt-2">دقيقة</p>
          </div>

          {/* التحذير قبل */}
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">⚠️</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-800">التحذير قبل انتهاء الوقت</h3>
                <p className="text-xs text-gray-500">ينبه السائق قبل انتهاء الوقت</p>
              </div>
            </div>
            <input
              type="number"
              value={deliveryTimeSettings.warning_before_minutes || ''}
              onChange={(e) => setDeliveryTimeSettings({
                ...deliveryTimeSettings,
                warning_before_minutes: e.target.value === '' ? '' : parseInt(e.target.value) || 0
              })}
              onBlur={(e) => {
                if (e.target.value === '' || parseInt(e.target.value) < 1) {
                  setDeliveryTimeSettings({...deliveryTimeSettings, warning_before_minutes: 3});
                }
              }}
              className="w-full p-3 border border-yellow-300 rounded-lg text-center text-sm font-bold"
              min={1}
              max={10}
            />
            <p className="text-center text-sm text-yellow-600 mt-2">دقيقة</p>
          </div>
        </div>

        {/* نظام العقوبات */}
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <h4 className="font-bold text-red-800 mb-1.5">💸 نظام العقوبات:</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">تحذيرات قبل الخصم</label>
              <input
                type="number"
                value={deliveryTimeSettings.warnings_before_penalty || ''}
                onChange={(e) => setDeliveryTimeSettings({
                  ...deliveryTimeSettings,
                  warnings_before_penalty: e.target.value === '' ? '' : parseInt(e.target.value) || 0
                })}
                className="w-full p-2 border border-gray-300 rounded-lg text-center"
                min={1}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">قيمة الخصم</label>
              <input
                type="number"
                value={deliveryTimeSettings.penalty_amount || ''}
                onChange={(e) => setDeliveryTimeSettings({
                  ...deliveryTimeSettings,
                  penalty_amount: e.target.value === '' ? '' : parseInt(e.target.value) || 0
                })}
                className="w-full p-2 border border-gray-300 rounded-lg text-center"
                min={100}
                step={100}
              />
              <p className="text-xs text-gray-500 text-center mt-1">ل.س</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الحد اليومي للخصم</label>
              <input
                type="number"
                value={deliveryTimeSettings.max_penalty_per_day || ''}
                onChange={(e) => setDeliveryTimeSettings({
                  ...deliveryTimeSettings,
                  max_penalty_per_day: e.target.value === '' ? '' : parseInt(e.target.value) || 0
                })}
                className="w-full p-2 border border-gray-300 rounded-lg text-center"
                min={100}
                step={100}
              />
              <p className="text-xs text-gray-500 text-center mt-1">ل.س</p>
            </div>
          </div>
        </div>

        {/* ملخص */}
        <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600">
            <strong>📋 ملخص:</strong> السائق لديه وقت GPS + {deliveryTimeSettings.buffer_minutes} دقائق buffer. 
            يحصل على تحذير قبل {deliveryTimeSettings.warning_before_minutes} دقائق من الانتهاء. 
            بعد {deliveryTimeSettings.warnings_before_penalty} تحذيرات، يُخصم {formatPrice(deliveryTimeSettings.penalty_amount)} 
            (حد يومي {formatPrice(deliveryTimeSettings.max_penalty_per_day)}).
          </p>
        </div>

        <button
          onClick={onSave}
          disabled={saving}
          className="w-full bg-gradient-to-l from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-4 py-1.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 font-bold"
        >
          {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
          حفظ إعدادات وقت التوصيل
        </button>
      </div>
    </div>
  );
};

export default DeliveryTimeSettingsCard;
