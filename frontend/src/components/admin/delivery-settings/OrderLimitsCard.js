// /app/frontend/src/components/admin/delivery-settings/OrderLimitsCard.js
// بطاقة إعدادات قبول طلبات الطعام

import { Truck, MapPin, Save, RefreshCw } from 'lucide-react';

const OrderLimitsCard = ({ 
  settings,
  setSettings,
  waitCompensationSettings,
  setWaitCompensationSettings,
  saving, 
  onSave 
}) => {
  const { max_food_orders_per_driver, food_orders_max_distance_km } = settings;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-l from-orange-500 to-red-500 p-2 text-white">
        <div className="flex items-center gap-2">
          <Truck size={18} />
          <div>
            <h2 className="font-bold text-sm">إعدادات قبول طلبات الطعام</h2>
            <p className="text-sm text-white/80">تحكم في عدد الطلبات والمسافة المسموحة للسائق</p>
          </div>
        </div>
      </div>
      
      <div className="p-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {/* الحد الأقصى لطلبات الطعام */}
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">🍔</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-800">طلبات الطعام</h3>
                <p className="text-xs text-gray-500">الحد الأقصى في نفس الوقت</p>
              </div>
            </div>
            <input
              type="number"
              value={max_food_orders_per_driver || ''}
              onChange={(e) => setSettings({
                ...settings,
                max_food_orders_per_driver: e.target.value === '' ? '' : parseInt(e.target.value) || 0
              })}
              onBlur={(e) => {
                if (e.target.value === '' || parseInt(e.target.value) < 1) {
                  setSettings({...settings, max_food_orders_per_driver: 1});
                }
              }}
              className="w-full p-3 border border-orange-300 rounded-lg text-center text-sm font-bold"
              min={1}
              max={10}
            />
            <p className="text-center text-sm text-orange-600 mt-2">
              {max_food_orders_per_driver} طلبات طعام
            </p>
          </div>

          {/* الحد الأقصى لطلبات المنتجات */}
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">🛍️</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-800">طلبات المنتجات</h3>
                <p className="text-xs text-gray-500">الحد الأقصى في نفس الوقت</p>
              </div>
            </div>
            <input
              type="number"
              value={waitCompensationSettings.max_product_orders_per_driver || ''}
              onChange={(e) => setWaitCompensationSettings({
                ...waitCompensationSettings,
                max_product_orders_per_driver: e.target.value === '' ? '' : parseInt(e.target.value) || 0
              })}
              onBlur={(e) => {
                if (e.target.value === '' || parseInt(e.target.value) < 1) {
                  setWaitCompensationSettings({...waitCompensationSettings, max_product_orders_per_driver: 1});
                }
              }}
              className="w-full p-3 border border-purple-300 rounded-lg text-center text-sm font-bold"
              min={1}
              max={15}
            />
            <p className="text-center text-sm text-purple-600 mt-2">
              {waitCompensationSettings.max_product_orders_per_driver || 7} طلبات منتجات
            </p>
          </div>

          {/* المسافة القصوى للطعام */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <MapPin size={16} className="text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">المسافة القصوى (طعام)</h3>
                <p className="text-xs text-gray-500">بين عملاء طلبات الطعام</p>
              </div>
            </div>
            <input
              type="number"
              value={food_orders_max_distance_km || ''}
              onChange={(e) => setSettings({
                ...settings,
                food_orders_max_distance_km: e.target.value === '' ? '' : parseFloat(e.target.value) || 0
              })}
              onBlur={(e) => {
                if (e.target.value === '' || parseFloat(e.target.value) < 1) {
                  setSettings({...settings, food_orders_max_distance_km: 5});
                }
              }}
              className="w-full p-3 border border-blue-300 rounded-lg text-center text-sm font-bold"
              min={1}
              max={20}
              step={0.5}
            />
            <p className="text-center text-sm text-blue-600 mt-2">
              {food_orders_max_distance_km || 5} كم
            </p>
          </div>
        </div>

        {/* شرح القواعد */}
        <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-bold text-gray-700 mb-2">📋 كيف تعمل هذه القواعد:</h4>
          <ul className="text-sm text-gray-600 text-sm space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-orange-500">🍔</span>
              <span><strong>طلبات الطعام:</strong> حتى <strong>{max_food_orders_per_driver} طلبات</strong>، المسافة بين العملاء لا تزيد عن <strong>{food_orders_max_distance_km || 5} كم</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-purple-500">🛍️</span>
              <span><strong>طلبات المنتجات:</strong> حتى <strong>{waitCompensationSettings.max_product_orders_per_driver || 7} طلبات</strong> (بدون حد للمسافة)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500">🔥</span>
              <span><strong>طلب طعام تجميعي:</strong> يقفل السائق حتى ينتهي (لضمان جودة الطعام)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">📦</span>
              <span><strong>طلب منتجات تجميعي:</strong> لا يقفل السائق (المنتجات لا تتلف)</span>
            </li>
          </ul>
        </div>

        <button
          onClick={onSave}
          disabled={saving}
          className="mt-2 w-full bg-gradient-to-l from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-4 py-1.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 font-bold"
        >
          {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
          حفظ إعدادات قبول الطلبات
        </button>
      </div>
    </div>
  );
};

export default OrderLimitsCard;
