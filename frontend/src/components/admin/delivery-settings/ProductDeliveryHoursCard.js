// /app/frontend/src/components/admin/delivery-settings/ProductDeliveryHoursCard.js
// بطاقة ساعات توصيل المنتجات

import { Clock, Save, RefreshCw } from 'lucide-react';

const ProductDeliveryHoursCard = ({ 
  productDeliveryHours, 
  setProductDeliveryHours, 
  saving, 
  onSave 
}) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-l from-indigo-500 to-purple-500 p-2 text-white">
        <div className="flex items-center gap-2">
          <Clock size={18} />
          <div>
            <h2 className="font-bold text-sm">ساعات توصيل المنتجات</h2>
            <p className="text-sm text-white/80">تحديد أوقات تسليم طلبات المنتجات</p>
          </div>
        </div>
      </div>
      
      <div className="p-2 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {/* وقت البداية */}
          <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
            <h3 className="font-bold text-indigo-800 mb-2">🌅 بداية التوصيل</h3>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">الساعة</label>
                <input
                  type="number"
                  value={productDeliveryHours.start_hour}
                  onChange={(e) => setProductDeliveryHours({
                    ...productDeliveryHours,
                    start_hour: parseInt(e.target.value) || 0
                  })}
                  className="w-full p-2 border border-indigo-300 rounded-lg text-center font-bold"
                  min={0}
                  max={23}
                />
              </div>
              <span className="text-xl font-bold text-gray-400">:</span>
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">الدقيقة</label>
                <input
                  type="number"
                  value={productDeliveryHours.start_minute}
                  onChange={(e) => setProductDeliveryHours({
                    ...productDeliveryHours,
                    start_minute: parseInt(e.target.value) || 0
                  })}
                  className="w-full p-2 border border-indigo-300 rounded-lg text-center font-bold"
                  min={0}
                  max={59}
                  step={15}
                />
              </div>
            </div>
          </div>

          {/* وقت النهاية */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <h3 className="font-bold text-purple-800 mb-2">🌙 نهاية التوصيل</h3>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">الساعة</label>
                <input
                  type="number"
                  value={productDeliveryHours.end_hour}
                  onChange={(e) => setProductDeliveryHours({
                    ...productDeliveryHours,
                    end_hour: parseInt(e.target.value) || 0
                  })}
                  className="w-full p-2 border border-purple-300 rounded-lg text-center font-bold"
                  min={0}
                  max={23}
                />
              </div>
              <span className="text-xl font-bold text-gray-400">:</span>
              <div className="flex-1">
                <label className="block text-xs text-gray-600 mb-1">الدقيقة</label>
                <input
                  type="number"
                  value={productDeliveryHours.end_minute}
                  onChange={(e) => setProductDeliveryHours({
                    ...productDeliveryHours,
                    end_minute: parseInt(e.target.value) || 0
                  })}
                  className="w-full p-2 border border-purple-300 rounded-lg text-center font-bold"
                  min={0}
                  max={59}
                  step={15}
                />
              </div>
            </div>
          </div>
        </div>

        {/* عرض الوقت */}
        <div className="p-3 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-lg text-center">
          <p className="text-sm text-gray-700">
            التوصيل متاح من 
            <span className="font-bold text-indigo-600 mx-1">
              {String(productDeliveryHours.start_hour).padStart(2, '0')}:{String(productDeliveryHours.start_minute).padStart(2, '0')}
            </span>
            إلى
            <span className="font-bold text-purple-600 mx-1">
              {String(productDeliveryHours.end_hour).padStart(2, '0')}:{String(productDeliveryHours.end_minute).padStart(2, '0')}
            </span>
          </p>
        </div>

        <button
          onClick={onSave}
          disabled={saving}
          className="w-full bg-gradient-to-l from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white px-4 py-1.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 font-bold"
        >
          {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
          حفظ ساعات التوصيل
        </button>
      </div>
    </div>
  );
};

export default ProductDeliveryHoursCard;
