// /app/frontend/src/components/admin/SettingsTab.js
// إعدادات المنصة - لوحة المدير

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Truck, Banknote, Package, Save } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price);
};

const SettingsTab = ({ user }) => {
  const { toast } = useToast();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [deliveryFees, setDeliveryFees] = useState({
    same_city: 3000,
    nearby: 5000,
    medium: 8000,
    far: 12000
  });
  const [withdrawalLimits, setWithdrawalLimits] = useState({
    seller: 50000,
    delivery: 25000
  });
  const [freeShipping, setFreeShipping] = useState(150000);
  
  useEffect(() => {
    fetchSettings();
  }, []);
  
  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API}/api/settings`);
      setSettings(res.data);
      
      if (res.data.delivery_fees) {
        setDeliveryFees(res.data.delivery_fees);
      }
      if (res.data.min_seller_withdrawal) {
        setWithdrawalLimits({
          seller: res.data.min_seller_withdrawal,
          delivery: res.data.min_delivery_withdrawal
        });
      }
      if (res.data.free_shipping_threshold) {
        setFreeShipping(res.data.free_shipping_threshold);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const saveDeliveryFees = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/settings/delivery-fees`, deliveryFees);
      toast({ title: "تم الحفظ", description: "تم تحديث أسعار التوصيل" });
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل الحفظ",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  
  const saveWithdrawalLimits = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/settings/withdrawal-limits`, null, {
        params: {
          min_seller: withdrawalLimits.seller,
          min_delivery: withdrawalLimits.delivery
        }
      });
      toast({ title: "تم الحفظ", description: "تم تحديث حدود السحب" });
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل الحفظ",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  
  const saveFreeShipping = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/settings/free-shipping`, null, {
        params: { threshold: freeShipping }
      });
      toast({ title: "تم الحفظ", description: "تم تحديث حد الشحن المجاني" });
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل الحفظ",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };
  
  if (user.user_type !== 'admin') {
    return (
      <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
        <Settings size={40} className="text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">هذه الصفحة للمدير الرئيسي فقط</p>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }
  
  return (
    <section className="space-y-4" data-testid="settings-tab">
      
      {/* Delivery Fees */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <Truck size={18} className="text-[#FF6B00]" />
          <h3 className="font-bold text-gray-900">أسعار التوصيل</h3>
        </div>
        <div className="p-4 space-y-3">
          {[
            { key: 'same_city', label: 'نفس المحافظة' },
            { key: 'nearby', label: 'محافظة قريبة' },
            { key: 'medium', label: 'محافظة متوسطة البعد' },
            { key: 'far', label: 'محافظة بعيدة' },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <label className="text-sm text-gray-600">{item.label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={deliveryFees[item.key]}
                  onChange={(e) => setDeliveryFees({
                    ...deliveryFees,
                    [item.key]: parseInt(e.target.value) || 0
                  })}
                  className="w-24 p-2 border border-gray-300 rounded-lg text-sm text-left"
                />
                <span className="text-xs text-gray-400">ل.س</span>
              </div>
            </div>
          ))}
          <button
            onClick={saveDeliveryFees}
            disabled={saving}
            className="w-full bg-[#FF6B00] text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
          >
            <Save size={16} />
            حفظ أسعار التوصيل
          </button>
        </div>
      </div>
      
      {/* Withdrawal Limits */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <Banknote size={18} className="text-green-500" />
          <h3 className="font-bold text-gray-900">حدود السحب الأدنى</h3>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-600">للبائعين</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={withdrawalLimits.seller}
                onChange={(e) => setWithdrawalLimits({
                  ...withdrawalLimits,
                  seller: parseInt(e.target.value) || 0
                })}
                className="w-28 p-2 border border-gray-300 rounded-lg text-sm text-left"
                step="10000"
              />
              <span className="text-xs text-gray-400">ل.س</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-600">لموظفي التوصيل</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={withdrawalLimits.delivery}
                onChange={(e) => setWithdrawalLimits({
                  ...withdrawalLimits,
                  delivery: parseInt(e.target.value) || 0
                })}
                className="w-28 p-2 border border-gray-300 rounded-lg text-sm text-left"
                step="10000"
              />
              <span className="text-xs text-gray-400">ل.س</span>
            </div>
          </div>
          <button
            onClick={saveWithdrawalLimits}
            disabled={saving}
            className="w-full bg-green-500 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
          >
            <Save size={16} />
            حفظ حدود السحب
          </button>
        </div>
      </div>
      
      {/* Free Shipping Threshold */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <Package size={18} className="text-blue-500" />
          <h3 className="font-bold text-gray-900">حد الشحن المجاني</h3>
        </div>
        <div className="p-4">
          <p className="text-xs text-gray-500 mb-3">
            الحد الأدنى لقيمة الطلب للحصول على شحن مجاني (نفس المحافظة)
          </p>
          <div className="flex items-center gap-2 mb-4">
            <input
              type="number"
              value={freeShipping}
              onChange={(e) => setFreeShipping(parseInt(e.target.value) || 0)}
              className="flex-1 p-2 border border-gray-300 rounded-lg text-left"
              step="10000"
            />
            <span className="text-sm text-gray-400">ل.س</span>
          </div>
          <button
            onClick={saveFreeShipping}
            disabled={saving}
            className="w-full bg-blue-500 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save size={16} />
            حفظ
          </button>
        </div>
      </div>
      
    </section>
  );
};

export default SettingsTab;
