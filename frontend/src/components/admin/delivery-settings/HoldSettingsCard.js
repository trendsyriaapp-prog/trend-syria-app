// /app/frontend/src/components/admin/delivery-settings/HoldSettingsCard.js
// بطاقة إعدادات تعليق الأرباح

import { Save, RefreshCw, CheckCircle } from 'lucide-react';

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const HoldSettingsCard = ({ 
  holdSettings, 
  setHoldSettings,
  holdSummary,
  saving, 
  onSave,
  onReleaseAll
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-l from-amber-500 to-yellow-500 p-2 text-white">
        <div className="flex items-center gap-2">
          <span className="text-xs">⏳</span>
          <div>
            <h2 className="font-bold text-sm">تعليق الأرباح (Hold Period)</h2>
            <p className="text-sm text-white/80">تأخير إضافة الأرباح لمحفظة السائق</p>
          </div>
        </div>
      </div>
      
      <div className="p-2 space-y-3">
        {/* تفعيل/إيقاف */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="font-medium text-gray-700">تفعيل نظام التعليق</p>
            <p className="text-xs text-gray-500">عند الإيقاف، الأرباح تُضاف فوراً</p>
          </div>
          <button
            onClick={() => setHoldSettings({
              ...holdSettings,
              enabled: !holdSettings?.enabled
            })}
            className={`w-12 h-6 rounded-full transition-colors ${
              holdSettings?.enabled ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
              holdSettings?.enabled ? 'translate-x-6' : 'translate-x-0.5'
            }`} />
          </button>
        </div>

        {holdSettings?.enabled && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-600 text-sm mb-2">
                🍔 فترة تعليق طلبات الطعام (ساعات)
              </label>
              <input
                type="number"
                value={holdSettings.food_hold_hours || ''}
                onChange={(e) => setHoldSettings({ ...holdSettings, food_hold_hours: e.target.value === '' ? '' : parseInt(e.target.value) || 0 })}
                onBlur={(e) => {
                  if (e.target.value === '' || parseInt(e.target.value) < 1) {
                    setHoldSettings({ ...holdSettings, food_hold_hours: 1 });
                  }
                }}
                min="1"
                max="72"
                className="w-full p-3 border rounded-lg text-lg"
              />
              <p className="text-xs text-gray-500 mt-1">الأرباح تُضاف بعد {holdSettings.food_hold_hours} ساعة</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 text-sm mb-2">
                📦 فترة تعليق طلبات المنتجات (ساعات)
              </label>
              <input
                type="number"
                value={holdSettings.products_hold_hours || ''}
                onChange={(e) => setHoldSettings({ ...holdSettings, products_hold_hours: e.target.value === '' ? '' : parseInt(e.target.value) || 0 })}
                onBlur={(e) => {
                  if (e.target.value === '' || parseInt(e.target.value) < 1) {
                    setHoldSettings({ ...holdSettings, products_hold_hours: 24 });
                  }
                }}
                min="1"
                max="168"
                className="w-full p-3 border rounded-lg text-lg"
              />
              <p className="text-xs text-gray-500 mt-1">الأرباح تُضاف بعد {holdSettings.products_hold_hours} ساعة</p>
            </div>
          </div>
        )}

        {/* Summary */}
        {holdSummary && (
          <div className="p-2 bg-yellow-50 rounded-lg border border-yellow-200 mb-2">
            <h3 className="font-bold text-yellow-800 mb-1.5">📊 ملخص الأرباح المعلقة</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-sm font-bold text-yellow-700">{holdSummary.count}</p>
                <p className="text-xs text-yellow-600">عدد المعاملات</p>
              </div>
              <div>
                <p className="text-sm font-bold text-amber-600">{formatPrice(holdSummary.food_held)}</p>
                <p className="text-xs text-amber-600">طعام معلق</p>
              </div>
              <div>
                <p className="text-sm font-bold text-blue-600">{formatPrice(holdSummary.products_held)}</p>
                <p className="text-xs text-blue-600">منتجات معلقة</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-yellow-200 text-center">
              <p className="text-sm text-yellow-700">الإجمالي المعلق: <span className="font-bold">{formatPrice(holdSummary.total_held)}</span></p>
            </div>
            
            {holdSummary.total_held > 0 && (
              <button
                onClick={onReleaseAll}
                className="mt-3 w-full bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm flex items-center justify-center gap-2"
              >
                <CheckCircle size={16} />
                إطلاق جميع الأرباح المعلقة الآن
              </button>
            )}
          </div>
        )}

        <button
          onClick={onSave}
          disabled={saving}
          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
          حفظ إعدادات التعليق
        </button>
      </div>
    </div>
  );
};

export default HoldSettingsCard;
