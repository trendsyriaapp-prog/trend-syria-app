// /app/frontend/src/components/admin/delivery-settings/DistancePricingCard.js
// بطاقة إعدادات أجور التوصيل بالمسافة (رسوم العميل)

import { MapPin, Save, RefreshCw } from 'lucide-react';

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const DistancePricingCard = ({ 
  distanceSettings, 
  setDistanceSettings,
  saving,
  onSave
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-l from-green-500 to-teal-500 p-2 text-white">
        <div className="flex items-center gap-2">
          <MapPin size={18} />
          <div>
            <h2 className="font-bold text-xs">💳 رسوم التوصيل (يدفعها العميل)</h2>
            <p className="text-[10px] text-white/80">المبلغ الذي يدفعه العميل كرسوم توصيل</p>
          </div>
        </div>
      </div>
      
      <div className="p-2">
        {/* تنبيه توضيحي */}
        <div className="mb-2 p-2 bg-green-100 border border-green-300 rounded-lg">
          <p className="text-[10px] text-green-800 font-medium">
            💡 <strong>هذا المبلغ يظهر للعميل</strong> كـ "رسوم التوصيل" في صفحة الدفع.
          </p>
        </div>
        
        {/* صيغة الحساب */}
        <div className="mb-2 p-2 bg-gradient-to-r from-green-50 to-teal-50 rounded-lg border border-green-200">
          <div className="text-center py-1.5 bg-white rounded border border-dashed border-green-300">
            <span className="text-xs font-bold text-gray-800">
              الأجرة = <span className="text-green-600">{formatPrice(distanceSettings.base_fee)}</span> + (المسافة × <span className="text-blue-600">{formatPrice(distanceSettings.price_per_km)}</span>)
            </span>
          </div>
          <p className="text-center text-[10px] text-gray-500 mt-1">
            مثال: 3 كم = {formatPrice(distanceSettings.base_fee + (3 * distanceSettings.price_per_km))}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {/* الرسوم الأساسية */}
          <div className="bg-green-50 rounded-lg p-2 border border-green-200">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">💰</span>
              </div>
              <div>
                <h3 className="font-bold text-[10px] text-gray-800">الرسوم الأساسية</h3>
              </div>
            </div>
            <input
              type="number"
              value={distanceSettings.base_fee || ''}
              onChange={(e) => setDistanceSettings({
                ...distanceSettings,
                base_fee: e.target.value === '' ? '' : parseInt(e.target.value) || 0
              })}
              onBlur={(e) => {
                if (e.target.value === '') {
                  setDistanceSettings({...distanceSettings, base_fee: 0});
                }
              }}
              className="w-full p-1.5 border border-green-300 rounded text-center text-sm font-bold"
              min={0}
              step={100}
            />
            <p className="text-center text-[9px] text-green-600 mt-0.5">ل.س</p>
          </div>

          {/* سعر الكيلومتر */}
          <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">📏</span>
              </div>
              <div>
                <h3 className="font-bold text-[10px] text-gray-800">سعر الكيلومتر</h3>
              </div>
            </div>
            <input
              type="number"
              value={distanceSettings.price_per_km || ''}
              onChange={(e) => setDistanceSettings({
                ...distanceSettings,
                price_per_km: e.target.value === '' ? '' : parseInt(e.target.value) || 0
              })}
              onBlur={(e) => {
                if (e.target.value === '') {
                  setDistanceSettings({...distanceSettings, price_per_km: 0});
                }
              }}
              className="w-full p-1.5 border border-blue-300 rounded text-center text-sm font-bold"
              min={0}
              step={50}
            />
            <p className="text-center text-[9px] text-blue-600 mt-0.5">ل.س/كم</p>
          </div>

          {/* الحد الأدنى */}
          <div className="bg-orange-50 rounded-lg p-2 border border-orange-200">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">⬇️</span>
              </div>
              <div>
                <h3 className="font-bold text-[10px] text-gray-800">الحد الأدنى</h3>
              </div>
            </div>
            <input
              type="number"
              value={distanceSettings.min_fee || ''}
              onChange={(e) => setDistanceSettings({
                ...distanceSettings,
                min_fee: e.target.value === '' ? '' : parseInt(e.target.value) || 0
              })}
              onBlur={(e) => {
                if (e.target.value === '') {
                  setDistanceSettings({...distanceSettings, min_fee: 0});
                }
              }}
              className="w-full p-1.5 border border-orange-300 rounded text-center text-sm font-bold"
              min={0}
              step={100}
            />
            <p className="text-center text-[9px] text-orange-600 mt-0.5">ل.س</p>
          </div>
        </div>

        {/* تفعيل النظام */}
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <label className="flex items-center gap-1.5 p-2 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100">
            <input
              type="checkbox"
              checked={distanceSettings.enabled_for_food}
              onChange={(e) => setDistanceSettings({
                ...distanceSettings,
                enabled_for_food: e.target.checked
              })}
              className="w-4 h-4 text-green-500 rounded"
            />
            <div>
              <span className="font-bold text-[10px] text-gray-800">🍔 طلبات الطعام</span>
            </div>
          </label>

          <label className="flex items-center gap-1.5 p-2 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100">
            <input
              type="checkbox"
              checked={distanceSettings.enabled_for_products}
              onChange={(e) => setDistanceSettings({
                ...distanceSettings,
                enabled_for_products: e.target.checked
              })}
              className="w-4 h-4 text-green-500 rounded"
            />
            <div>
              <span className="font-bold text-[10px] text-gray-800">📦 طلبات المنتجات</span>
            </div>
          </label>
        </div>

        <button
          onClick={onSave}
          disabled={saving}
          className="mt-2 w-full bg-gradient-to-l from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold disabled:opacity-50"
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          حفظ
        </button>
      </div>
    </div>
  );
};

export default DistancePricingCard;
