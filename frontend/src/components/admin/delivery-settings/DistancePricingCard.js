// /app/frontend/src/components/admin/delivery-settings/DistancePricingCard.js
// بطاقة إعدادات أجور التوصيل بالمسافة

import { useState } from 'react';
import { MapPin, Save, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const DistancePricingCard = ({ 
  distanceSettings, 
  setDistanceSettings,
  onRefresh 
}) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/api/admin/settings/distance-pricing`, distanceSettings, {
        withCredentials: true
      });
      toast({ title: "تم الحفظ", description: "تم حفظ إعدادات الأسعار بنجاح" });
    } catch (error) {
      toast({ title: "خطأ", description: "فشل في حفظ الإعدادات", variant: "destructive" });
    }
    setSaving(false);
  };

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
              className="w-full bg-white border border-green-300 rounded-lg py-2 px-3 text-center font-bold text-green-600 text-sm"
              placeholder="500"
            />
            <p className="text-[9px] text-gray-500 text-center mt-1">ل.س</p>
          </div>

          {/* السعر لكل كم */}
          <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">📏</span>
              </div>
              <div>
                <h3 className="font-bold text-[10px] text-gray-800">لكل كيلومتر</h3>
              </div>
            </div>
            <input
              type="number"
              value={distanceSettings.price_per_km || ''}
              onChange={(e) => setDistanceSettings({
                ...distanceSettings,
                price_per_km: e.target.value === '' ? '' : parseInt(e.target.value) || 0
              })}
              className="w-full bg-white border border-blue-300 rounded-lg py-2 px-3 text-center font-bold text-blue-600 text-sm"
              placeholder="200"
            />
            <p className="text-[9px] text-gray-500 text-center mt-1">ل.س/كم</p>
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
              className="w-full bg-white border border-orange-300 rounded-lg py-2 px-3 text-center font-bold text-orange-600 text-sm"
              placeholder="1000"
            />
            <p className="text-[9px] text-gray-500 text-center mt-1">ل.س</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-2 w-full bg-gradient-to-l from-green-500 to-teal-500 text-white py-2 rounded-lg font-bold text-sm hover:from-green-600 hover:to-teal-600 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
          حفظ رسوم التوصيل
        </button>
      </div>
    </div>
  );
};

export default DistancePricingCard;
