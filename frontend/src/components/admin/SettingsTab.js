// /app/frontend/src/components/admin/SettingsTab.js
// إعدادات المنصة - لوحة المدير

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Truck, Banknote, Package, Save, AlertTriangle, AlertCircle, RefreshCw, XCircle } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useSettings } from '../../context/SettingsContext';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price);
};

const SettingsTab = ({ user }) => {
  const { toast } = useToast();
  const { refreshSettings } = useSettings();
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
  const [foodFreeDelivery, setFoodFreeDelivery] = useState(100000);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  
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
      if (res.data.food_free_delivery_threshold) {
        setFoodFreeDelivery(res.data.food_free_delivery_threshold);
      }
      if (res.data.low_stock_threshold) {
        setLowStockThreshold(res.data.low_stock_threshold);
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
      // تحديث الإعدادات في كل التطبيق
      await refreshSettings();
      toast({ title: "تم الحفظ", description: "تم تحديث حد الشحن المجاني للمنتجات" });
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

  const saveFoodFreeDelivery = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/settings/food-free-delivery`, null, {
        params: { threshold: foodFreeDelivery }
      });
      // تحديث الإعدادات في كل التطبيق
      await refreshSettings();
      toast({ title: "تم الحفظ", description: "تم تحديث حد التوصيل المجاني للطعام" });
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

  const saveLowStockThreshold = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/settings/low-stock-threshold`, null, {
        params: { threshold: lowStockThreshold }
      });
      toast({ title: "تم الحفظ", description: "تم تحديث حد تنبيه المخزون المنخفض" });
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
      
      {/* Free Shipping Threshold - Products */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <Package size={18} className="text-blue-500" />
          <h3 className="font-bold text-gray-900">حد الشحن المجاني - المنتجات</h3>
        </div>
        <div className="p-4">
          <p className="text-xs text-gray-500 mb-3">
            الحد الأدنى لقيمة الطلب للحصول على شحن مجاني للمنتجات
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

      {/* Free Delivery Threshold - Food */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <Truck size={18} className="text-green-500" />
          <h3 className="font-bold text-gray-900">حد التوصيل المجاني - الطعام</h3>
        </div>
        <div className="p-4">
          <p className="text-xs text-gray-500 mb-3">
            الحد الأدنى لقيمة الطلب للحصول على توصيل مجاني لجميع متاجر الطعام
          </p>
          <div className="flex items-center gap-2 mb-4">
            <input
              type="number"
              value={foodFreeDelivery}
              onChange={(e) => setFoodFreeDelivery(parseInt(e.target.value) || 0)}
              className="flex-1 p-2 border border-gray-300 rounded-lg text-left"
              step="10000"
            />
            <span className="text-sm text-gray-400">ل.س</span>
          </div>
          <button
            onClick={saveFoodFreeDelivery}
            disabled={saving}
            className="w-full bg-green-500 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save size={16} />
            حفظ
          </button>
        </div>
      </div>

      {/* Low Stock Threshold */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center gap-2">
          <AlertTriangle size={18} className="text-yellow-500" />
          <h3 className="font-bold text-gray-900">حد تنبيه المخزون المنخفض</h3>
        </div>
        <div className="p-4">
          <p className="text-xs text-gray-500 mb-3">
            سيتم إرسال تنبيه للبائع عند وصول مخزون أي منتج إلى هذا الحد أو أقل
          </p>
          <div className="flex items-center gap-2 mb-4">
            <input
              type="number"
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 1)}
              className="flex-1 p-2 border border-gray-300 rounded-lg text-left"
              min="1"
              data-testid="low-stock-threshold-input"
            />
            <span className="text-sm text-gray-400">قطعة</span>
          </div>
          <button
            onClick={saveLowStockThreshold}
            disabled={saving}
            className="w-full bg-yellow-500 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            data-testid="save-low-stock-btn"
          >
            <Save size={16} />
            حفظ
          </button>
        </div>
      </div>
      
      {/* 🚫 إعدادات إلغاء الطلب للسائق */}
      <DriverCancelSettingsSection toast={toast} />
      
    </section>
  );
};

// مكون إعدادات إلغاء السائق
const DriverCancelSettingsSection = ({ toast }) => {
  const [settings, setSettings] = useState({
    enabled: true,
    cancel_window_seconds: 120,
    max_cancel_rate: 10,
    lookback_orders: 50,
    warning_threshold: 7,
    suspension_threshold: 15
  });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('لم يتم العثور على token');
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get(`${API}/api/settings/driver-cancel`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSettings(res.data);
        setError(null);
      } catch (err) {
        setError('فشل تحميل الإعدادات: ' + (err.response?.data?.detail || err.message));
      } finally {
        setLoading(false);
      }

      try {
        const statsRes = await axios.get(`${API}/api/settings/driver-cancel/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(statsRes.data);
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };
    
    fetchData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/api/settings/driver-cancel`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: "✅ تم الحفظ", description: "تم تحديث إعدادات إلغاء السائق" });
    } catch (err) {
      toast({ title: "خطأ", description: err.response?.data?.detail || "فشل الحفظ", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-gray-200 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-20 bg-gray-100 rounded"></div>
        <p className="mt-2 text-gray-500 text-sm">جاري تحميل إعدادات إلغاء السائق...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl p-6 border border-red-200">
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle size={24} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200" data-testid="driver-cancel-settings">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
          <XCircle className="text-red-600" size={24} />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">إعدادات إلغاء الطلب (السائق)</h3>
          <p className="text-sm text-gray-500">التحكم في قدرة السائقين على إلغاء الطلبات</p>
        </div>
      </div>

      {/* تفعيل/إيقاف */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-4">
        <div>
          <p className="font-bold text-gray-900">تفعيل إلغاء الطلب للسائقين</p>
          <p className="text-sm text-gray-500">السماح للسائقين بإلغاء الطلبات ضمن شروط</p>
        </div>
        <button
          onClick={() => setSettings(s => ({ ...s, enabled: !s.enabled }))}
          className={`w-14 h-7 rounded-full transition-colors ${
            settings.enabled ? 'bg-red-500' : 'bg-gray-300'
          }`}
        >
          <div className={`w-6 h-6 bg-white rounded-full shadow transform transition-transform ${
            settings.enabled ? 'translate-x-7' : 'translate-x-0.5'
          }`} />
        </button>
      </div>

      {settings.enabled && (
        <div className="space-y-4">
          {/* مهلة الإلغاء */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              مهلة الإلغاء (بالثواني)
            </label>
            <input
              type="number"
              value={settings.cancel_window_seconds}
              onChange={(e) => setSettings(s => ({ ...s, cancel_window_seconds: parseInt(e.target.value) || 0 }))}
              className="w-full p-3 border border-gray-200 rounded-xl"
            />
            <p className="text-xs text-gray-500 mt-1">
              الوقت المسموح للسائق لإلغاء الطلب بعد قبوله ({Math.floor(settings.cancel_window_seconds / 60)} دقيقة و {settings.cancel_window_seconds % 60} ثانية)
            </p>
          </div>

          {/* نسبة الإلغاء القصوى */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                نسبة الإلغاء القصوى (%)
              </label>
              <input
                type="number"
                value={settings.max_cancel_rate}
                onChange={(e) => setSettings(s => ({ ...s, max_cancel_rate: parseInt(e.target.value) || 0 }))}
                className="w-full p-3 border border-gray-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                عدد الطلبات للحساب
              </label>
              <input
                type="number"
                value={settings.lookback_orders}
                onChange={(e) => setSettings(s => ({ ...s, lookback_orders: parseInt(e.target.value) || 0 }))}
                className="w-full p-3 border border-gray-200 rounded-xl"
              />
            </div>
          </div>

          {/* حدود التحذير والإيقاف */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ⚠️ نسبة التحذير (%)
              </label>
              <input
                type="number"
                value={settings.warning_threshold}
                onChange={(e) => setSettings(s => ({ ...s, warning_threshold: parseInt(e.target.value) || 0 }))}
                className="w-full p-3 border border-yellow-200 rounded-xl bg-yellow-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                🔴 نسبة الإيقاف (%)
              </label>
              <input
                type="number"
                value={settings.suspension_threshold}
                onChange={(e) => setSettings(s => ({ ...s, suspension_threshold: parseInt(e.target.value) || 0 }))}
                className="w-full p-3 border border-red-200 rounded-xl bg-red-50"
              />
            </div>
          </div>

          {/* إحصائيات */}
          {stats && (
            <div className="bg-gray-50 rounded-xl p-4 mt-4">
              <h4 className="font-bold text-gray-900 mb-3">📊 إحصائيات الإلغاءات</h4>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{stats.total_cancellations}</p>
                  <p className="text-xs text-gray-500">إجمالي</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{stats.today_cancellations}</p>
                  <p className="text-xs text-gray-500">اليوم</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{stats.week_cancellations}</p>
                  <p className="text-xs text-gray-500">الأسبوع</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* زر الحفظ */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:bg-gray-400"
      >
        {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
        حفظ الإعدادات
      </button>
    </div>
  );
};

export default SettingsTab;
