// /app/frontend/src/components/admin/delivery-settings/DriverEarningsCard.js
// بطاقة إعدادات أرباح السائق

import { useState } from 'react';
import { Truck, Save, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const DriverEarningsCard = ({ 
  driverEarningsSettings, 
  setDriverEarningsSettings 
}) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/api/admin/settings/driver-earnings`, driverEarningsSettings, {
        withCredentials: true
      });
      toast({ title: "تم الحفظ", description: "تم حفظ إعدادات أرباح السائق بنجاح" });
    } catch (error) {
      toast({ title: "خطأ", description: "فشل في حفظ الإعدادات", variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-l from-purple-500 to-violet-500 p-2 text-white">
        <div className="flex items-center gap-2">
          <Truck size={18} />
          <div>
            <h2 className="font-bold text-xs">💵 أرباح السائق (يستلمها السائق)</h2>
            <p className="text-[10px] text-white/80">المبلغ الذي يحصل عليه السائق لكل توصيلة</p>
          </div>
        </div>
      </div>
      
      <div className="p-2">
        {/* تنبيه توضيحي */}
        <div className="mb-2 p-2 bg-purple-100 border border-purple-300 rounded-lg">
          <p className="text-[10px] text-purple-800 font-medium">
            💡 <strong>هذا المبلغ يُضاف لمحفظة السائق</strong> بعد إتمام كل توصيلة بنجاح.
          </p>
        </div>
        
        {/* صيغة الحساب */}
        <div className="mb-2 p-2 bg-gradient-to-r from-purple-50 to-violet-50 rounded-lg border border-purple-200">
          <div className="text-center py-1.5 bg-white rounded border border-dashed border-purple-300">
            <span className="text-xs font-bold text-gray-800">
              ربح السائق = <span className="text-purple-600">{formatPrice(driverEarningsSettings.base_fee)}</span> + (المسافة × <span className="text-indigo-600">{formatPrice(driverEarningsSettings.price_per_km)}</span>)
            </span>
          </div>
          <p className="text-center text-[10px] text-gray-500 mt-1">
            مثال: 3 كم = {formatPrice(driverEarningsSettings.base_fee + (3 * driverEarningsSettings.price_per_km))}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {/* الربح الأساسي */}
          <div className="bg-purple-50 rounded-lg p-2 border border-purple-200">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">💵</span>
              </div>
              <div>
                <h3 className="font-bold text-[10px] text-gray-800">الربح الأساسي</h3>
              </div>
            </div>
            <input
              type="number"
              value={driverEarningsSettings.base_fee || ''}
              onChange={(e) => setDriverEarningsSettings({
                ...driverEarningsSettings,
                base_fee: e.target.value === '' ? '' : parseInt(e.target.value) || 0
              })}
              className="w-full bg-white border border-purple-300 rounded-lg py-2 px-3 text-center font-bold text-purple-600 text-sm"
              placeholder="1000"
            />
            <p className="text-[9px] text-gray-500 text-center mt-1">ل.س</p>
          </div>

          {/* الربح لكل كم */}
          <div className="bg-indigo-50 rounded-lg p-2 border border-indigo-200">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-6 h-6 bg-indigo-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">📏</span>
              </div>
              <div>
                <h3 className="font-bold text-[10px] text-gray-800">لكل كيلومتر</h3>
              </div>
            </div>
            <input
              type="number"
              value={driverEarningsSettings.price_per_km || ''}
              onChange={(e) => setDriverEarningsSettings({
                ...driverEarningsSettings,
                price_per_km: e.target.value === '' ? '' : parseInt(e.target.value) || 0
              })}
              className="w-full bg-white border border-indigo-300 rounded-lg py-2 px-3 text-center font-bold text-indigo-600 text-sm"
              placeholder="300"
            />
            <p className="text-[9px] text-gray-500 text-center mt-1">ل.س/كم</p>
          </div>

          {/* الحد الأدنى */}
          <div className="bg-pink-50 rounded-lg p-2 border border-pink-200">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">⬇️</span>
              </div>
              <div>
                <h3 className="font-bold text-[10px] text-gray-800">الحد الأدنى</h3>
              </div>
            </div>
            <input
              type="number"
              value={driverEarningsSettings.min_fee || ''}
              onChange={(e) => setDriverEarningsSettings({
                ...driverEarningsSettings,
                min_fee: e.target.value === '' ? '' : parseInt(e.target.value) || 0
              })}
              className="w-full bg-white border border-pink-300 rounded-lg py-2 px-3 text-center font-bold text-pink-600 text-sm"
              placeholder="1500"
            />
            <p className="text-[9px] text-gray-500 text-center mt-1">ل.س</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-2 w-full bg-gradient-to-l from-purple-500 to-violet-500 text-white py-2 rounded-lg font-bold text-sm hover:from-purple-600 hover:to-violet-600 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
          حفظ أرباح السائق
        </button>
      </div>
    </div>
  );
};

export default DriverEarningsCard;
