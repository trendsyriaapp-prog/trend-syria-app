// /app/frontend/src/components/admin/delivery-settings/DriverEarningsCard.js
// بطاقة إعدادات أرباح السائق

import { Truck, Save, RefreshCw } from 'lucide-react';

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const DriverEarningsCard = ({ 
  driverEarningsSettings, 
  setDriverEarningsSettings,
  saving,
  onSave
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-l from-amber-500 to-orange-500 p-2 text-white">
        <div className="flex items-center gap-2">
          <Truck size={18} />
          <div>
            <h2 className="font-bold text-xs">🛵 ربح السائق (تدفعه المنصة للسائق)</h2>
            <p className="text-[10px] text-white/80">المبلغ الذي يستلمه السائق مقابل كل طلب</p>
          </div>
        </div>
      </div>
      
      <div className="p-2 space-y-2">
        {/* تنبيه توضيحي */}
        <div className="p-2 bg-orange-100 border border-orange-300 rounded-lg">
          <p className="text-[10px] text-orange-800 font-medium">
            💡 <strong>هذا المبلغ يُضاف لمحفظة السائق</strong> بعد إتمام التوصيل. (لا يراه العميل)
          </p>
        </div>
        
        {/* توضيح المعادلة */}
        <div className="bg-amber-50 rounded-lg p-2 border border-amber-200">
          <div className="text-center py-1.5 bg-white rounded border border-dashed border-amber-300">
            <span className="text-xs font-bold text-gray-800">
              الربح = <span className="text-orange-600">{formatPrice(driverEarningsSettings.base_fee)}</span> + (المسافة × <span className="text-amber-600">{formatPrice(driverEarningsSettings.price_per_km)}</span>)
            </span>
          </div>
          <p className="text-center text-[10px] text-amber-600 mt-1">
            مثال: 5 كم = {formatPrice(driverEarningsSettings.base_fee + (5 * driverEarningsSettings.price_per_km))}
          </p>
        </div>

        {/* الإعدادات */}
        <div className="grid grid-cols-3 gap-1.5">
          {/* الأجرة الأساسية للسائق */}
          <div className="bg-orange-50 rounded-lg p-2 border border-orange-200">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">💰</span>
              </div>
              <h3 className="font-bold text-[10px] text-gray-800">الأجرة الأساسية</h3>
            </div>
            <input
              type="number"
              value={driverEarningsSettings.base_fee || ''}
              onChange={(e) => setDriverEarningsSettings({...driverEarningsSettings, base_fee: e.target.value === '' ? '' : parseInt(e.target.value) || 0})}
              onBlur={(e) => {
                if (e.target.value === '') {
                  setDriverEarningsSettings({...driverEarningsSettings, base_fee: 0});
                }
              }}
              className="w-full p-1.5 border border-orange-300 rounded text-center text-sm font-bold"
            />
            <p className="text-center text-[9px] text-orange-600 mt-0.5">ل.س</p>
          </div>

          {/* سعر الكيلومتر للسائق */}
          <div className="bg-amber-50 rounded-lg p-2 border border-amber-200">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">🛣️</span>
              </div>
              <h3 className="font-bold text-[10px] text-gray-800">سعر الكيلومتر</h3>
            </div>
            <input
              type="number"
              value={driverEarningsSettings.price_per_km || ''}
              onChange={(e) => setDriverEarningsSettings({...driverEarningsSettings, price_per_km: e.target.value === '' ? '' : parseInt(e.target.value) || 0})}
              onBlur={(e) => {
                if (e.target.value === '') {
                  setDriverEarningsSettings({...driverEarningsSettings, price_per_km: 0});
                }
              }}
              className="w-full p-1.5 border border-amber-300 rounded text-center text-sm font-bold"
            />
            <p className="text-center text-[9px] text-amber-600 mt-0.5">ل.س/كم</p>
          </div>

          {/* الحد الأدنى لربح السائق */}
          <div className="bg-yellow-50 rounded-lg p-2 border border-yellow-200">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">🛡️</span>
              </div>
              <h3 className="font-bold text-[10px] text-gray-800">الحد الأدنى</h3>
            </div>
            <input
              type="number"
              value={driverEarningsSettings.min_fee || ''}
              onChange={(e) => setDriverEarningsSettings({...driverEarningsSettings, min_fee: e.target.value === '' ? '' : parseInt(e.target.value) || 0})}
              onBlur={(e) => {
                if (e.target.value === '') {
                  setDriverEarningsSettings({...driverEarningsSettings, min_fee: 0});
                }
              }}
              className="w-full p-1.5 border border-yellow-300 rounded text-center text-sm font-bold"
            />
            <p className="text-center text-[9px] text-yellow-600 mt-0.5">ل.س</p>
          </div>
        </div>

        {/* مقارنة الأرباح */}
        <div className="bg-gradient-to-l from-orange-100 to-amber-100 rounded-lg p-2 border border-orange-200">
          <h4 className="font-bold text-[10px] text-orange-800 mb-1.5">📊 أمثلة:</h4>
          <div className="grid grid-cols-3 gap-1.5 text-center">
            {[2, 5, 10].map(km => {
              const earnings = Math.max(
                driverEarningsSettings.base_fee + (km * driverEarningsSettings.price_per_km),
                driverEarningsSettings.min_fee
              );
              return (
                <div key={km} className="bg-white rounded p-1.5 shadow-sm">
                  <div className="text-xs text-gray-600">{km} كم</div>
                  <div className="font-bold text-xs text-orange-600">{formatPrice(earnings)}</div>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={onSave}
          disabled={saving}
          className="w-full bg-gradient-to-l from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold disabled:opacity-50"
        >
          {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
          حفظ
        </button>
      </div>
    </div>
  );
};

export default DriverEarningsCard;
