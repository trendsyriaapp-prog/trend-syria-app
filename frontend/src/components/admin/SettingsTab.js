// /app/frontend/src/components/admin/SettingsTab.js
// إعدادات المنصة - لوحة المدير

import { useState, useEffect } from 'react';
import logger from '../../lib/logger';
import axios from 'axios';
import { Settings, Truck, Banknote, Package, Save, AlertTriangle, AlertCircle, RefreshCw, XCircle, Bell, MapPin, Users, Cloud, Thermometer, ToggleLeft, ToggleRight } from 'lucide-react';
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
  const [governorateDeliveryEnabled, setGovernorateDeliveryEnabled] = useState(false);
  const [kmDeliveryEnabled, setKmDeliveryEnabled] = useState(true);
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
      if (res.data.governorate_delivery_enabled !== undefined) {
        setGovernorateDeliveryEnabled(res.data.governorate_delivery_enabled);
      }
      if (res.data.km_delivery_enabled !== undefined) {
        setKmDeliveryEnabled(res.data.km_delivery_enabled);
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
      logger.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const saveDeliveryFees = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/settings/delivery-fees`, {
        ...deliveryFees,
        governorate_delivery_enabled: governorateDeliveryEnabled
      });
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

  const toggleGovernorateDelivery = async () => {
    const newValue = !governorateDeliveryEnabled;
    setGovernorateDeliveryEnabled(newValue);
    try {
      await axios.put(`${API}/api/settings/delivery-system`, {
        governorate_delivery_enabled: newValue
      });
      toast({ 
        title: newValue ? "تم التفعيل" : "تم الإيقاف", 
        description: newValue ? "نظام التوصيل بالمحافظات مفعّل الآن" : "نظام التوصيل بالمحافظات معطّل" 
      });
    } catch (error) {
      setGovernorateDeliveryEnabled(!newValue);
      toast({ title: "خطأ", description: "فشل تحديث الإعداد", variant: "destructive" });
    }
  };

  const toggleKmDelivery = async () => {
    const newValue = !kmDeliveryEnabled;
    setKmDeliveryEnabled(newValue);
    try {
      await axios.put(`${API}/api/settings/delivery-system`, {
        km_delivery_enabled: newValue
      });
      toast({ 
        title: newValue ? "تم التفعيل" : "تم الإيقاف", 
        description: newValue ? "نظام التوصيل بالكيلومتر مفعّل الآن" : "نظام التوصيل بالكيلومتر معطّل" 
      });
    } catch (error) {
      setKmDeliveryEnabled(!newValue);
      toast({ title: "خطأ", description: "فشل تحديث الإعداد", variant: "destructive" });
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
      <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
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
    <section className="space-y-2" data-testid="settings-tab">
      
      {/* نظام التوصيل بالمحافظات */}
      <div className={`bg-white rounded-lg border overflow-hidden transition-all ${governorateDeliveryEnabled ? 'border-green-300' : 'border-gray-200 opacity-75'}`}>
        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin size={16} className="text-blue-500" />
            <div>
              <h3 className="font-bold text-gray-900 text-sm">🗺️ نظام التوصيل بالمحافظات</h3>
              <p className="text-xs text-gray-500">أسعار ثابتة حسب بعد المحافظة (للمنتجات)</p>
            </div>
          </div>
          <button
            onClick={toggleGovernorateDelivery}
            className={`p-1 rounded-lg transition-colors ${governorateDeliveryEnabled ? 'text-green-500' : 'text-gray-400'}`}
          >
            {governorateDeliveryEnabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
          </button>
        </div>
        {governorateDeliveryEnabled && (
          <div className="p-3 space-y-2">
            {[
              { key: 'same_city', label: 'نفس المحافظة' },
              { key: 'nearby', label: 'محافظة قريبة' },
              { key: 'medium', label: 'محافظة متوسطة البعد' },
              { key: 'far', label: 'محافظة بعيدة' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <label className="text-xs text-gray-600">{item.label}</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={deliveryFees[item.key] === 0 ? '' : deliveryFees[item.key]}
                    onChange={(e) => setDeliveryFees({
                      ...deliveryFees,
                      [item.key]: e.target.value === '' ? 0 : parseInt(e.target.value)
                    })}
                    className="w-20 p-1.5 border border-gray-300 rounded text-xs text-left"
                  />
                  <span className="text-xs text-gray-400">ل.س</span>
                </div>
              </div>
            ))}
            <button
              onClick={saveDeliveryFees}
              disabled={saving}
              className="w-full bg-blue-500 text-white py-1.5 rounded font-bold text-xs flex items-center justify-center gap-1 mt-2 disabled:opacity-50"
            >
              <Save size={14} />
              حفظ
            </button>
          </div>
        )}
        {!governorateDeliveryEnabled && (
          <div className="p-2 bg-gray-50 text-center">
            <p className="text-xs text-gray-500">⏸️ معطّل - اضغط للتفعيل</p>
          </div>
        )}
      </div>

      {/* نظام التوصيل بالكيلومتر */}
      <div className={`bg-white rounded-lg border overflow-hidden transition-all ${kmDeliveryEnabled ? 'border-green-300' : 'border-gray-200 opacity-75'}`}>
        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck size={16} className="text-[#FF6B00]" />
            <div>
              <h3 className="font-bold text-gray-900 text-sm">🔢 نظام التوصيل بالكيلومتر</h3>
              <p className="text-xs text-gray-500">للطعام - الإعدادات في: إعدادات التوصيل</p>
            </div>
          </div>
          <button
            onClick={toggleKmDelivery}
            className={`p-1 rounded-lg transition-colors ${kmDeliveryEnabled ? 'text-green-500' : 'text-gray-400'}`}
          >
            {kmDeliveryEnabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
          </button>
        </div>
        {kmDeliveryEnabled && (
          <div className="p-2 bg-orange-50 text-center">
            <p className="text-xs text-green-600">✅ مفعّل</p>
          </div>
        )}
        {!kmDeliveryEnabled && (
          <div className="p-2 bg-gray-50 text-center">
            <p className="text-xs text-gray-500">⏸️ معطّل - اضغط للتفعيل</p>
          </div>
        )}
      </div>
      
      {/* Withdrawal Limits */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-3 border-b border-gray-100 flex items-center gap-2">
          <Banknote size={16} className="text-green-500" />
          <h3 className="font-bold text-gray-900 text-sm">حدود السحب الأدنى</h3>
        </div>
        <div className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-600">للبائعين</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={withdrawalLimits.seller === 0 ? '' : withdrawalLimits.seller}
                onChange={(e) => setWithdrawalLimits({
                  ...withdrawalLimits,
                  seller: e.target.value === '' ? 0 : parseInt(e.target.value)
                })}
                className="w-24 p-1.5 border border-gray-300 rounded text-xs text-left"
                step="10000"
              />
              <span className="text-xs text-gray-400">ل.س</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-600">لموظفي التوصيل</label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={withdrawalLimits.delivery === 0 ? '' : withdrawalLimits.delivery}
                onChange={(e) => setWithdrawalLimits({
                  ...withdrawalLimits,
                  delivery: e.target.value === '' ? 0 : parseInt(e.target.value)
                })}
                className="w-24 p-1.5 border border-gray-300 rounded text-xs text-left"
                step="10000"
              />
              <span className="text-xs text-gray-400">ل.س</span>
            </div>
          </div>
          <button
            onClick={saveWithdrawalLimits}
            disabled={saving}
            className="w-full bg-green-500 text-white py-1.5 rounded font-bold text-xs flex items-center justify-center gap-1 mt-2 disabled:opacity-50"
          >
            <Save size={14} />
            حفظ
          </button>
        </div>
      </div>
      
      {/* Free Shipping Threshold - Products */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-3 border-b border-gray-100 flex items-center gap-2">
          <Package size={16} className="text-blue-500" />
          <h3 className="font-bold text-gray-900 text-sm">حد الشحن المجاني - المنتجات</h3>
        </div>
        <div className="p-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={freeShipping === 0 ? '' : freeShipping}
              onChange={(e) => setFreeShipping(e.target.value === '' ? 0 : parseInt(e.target.value))}
              className="flex-1 p-1.5 border border-gray-300 rounded text-xs text-left"
              step="10000"
            />
            <span className="text-xs text-gray-400">ل.س</span>
            <button
              onClick={saveFreeShipping}
              disabled={saving}
              className="bg-blue-500 text-white px-3 py-1.5 rounded font-bold text-xs disabled:opacity-50"
            >
              <Save size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Free Delivery Threshold - Food */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-3 border-b border-gray-100 flex items-center gap-2">
          <Truck size={16} className="text-green-500" />
          <h3 className="font-bold text-gray-900 text-sm">حد التوصيل المجاني - الطعام</h3>
        </div>
        <div className="p-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={foodFreeDelivery === 0 ? '' : foodFreeDelivery}
              onChange={(e) => setFoodFreeDelivery(e.target.value === '' ? 0 : parseInt(e.target.value))}
              className="flex-1 p-1.5 border border-gray-300 rounded text-xs text-left"
              step="10000"
            />
            <span className="text-xs text-gray-400">ل.س</span>
            <button
              onClick={saveFoodFreeDelivery}
              disabled={saving}
              className="bg-green-500 text-white px-3 py-1.5 rounded font-bold text-xs disabled:opacity-50"
            >
              <Save size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Low Stock Threshold */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-3 border-b border-gray-100 flex items-center gap-2">
          <AlertTriangle size={16} className="text-yellow-500" />
          <h3 className="font-bold text-gray-900 text-sm">حد تنبيه المخزون المنخفض</h3>
        </div>
        <div className="p-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={lowStockThreshold === 0 ? '' : lowStockThreshold}
              onChange={(e) => setLowStockThreshold(e.target.value === '' ? 1 : parseInt(e.target.value))}
              className="flex-1 p-1.5 border border-gray-300 rounded text-xs text-left"
              min="1"
              data-testid="low-stock-threshold-input"
            />
            <span className="text-xs text-gray-400">قطعة</span>
            <button
              onClick={saveLowStockThreshold}
              disabled={saving}
              className="bg-yellow-500 text-white px-3 py-1.5 rounded font-bold text-xs disabled:opacity-50"
              data-testid="save-low-stock-btn"
            >
              <Save size={14} />
            </button>
          </div>
        </div>
      </div>
      
      {/* 🚫 إعدادات إلغاء الطلب للسائق */}
      <DriverCancelSettingsSection toast={toast} />
      
      {/* 🔔 إشعارات نقص السائقين */}
      <DriverShortageAlertSettings toast={toast} />
      
      {/* ☁️ إعدادات الطقس التلقائي */}
      <AutoWeatherSettings toast={toast} />
      
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
        logger.error('Error fetching stats:', err);
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
      <div className="bg-white rounded-lg p-6 border border-gray-200 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-20 bg-gray-100 rounded"></div>
        <p className="mt-2 text-gray-500 text-sm">جاري تحميل إعدادات إلغاء السائق...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 border border-red-200">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle size={24} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-3 border border-gray-200" data-testid="driver-cancel-settings">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
          <XCircle className="text-red-600" size={16} />
        </div>
        <div>
          <h3 className="font-bold text-gray-900 text-sm">إعدادات إلغاء الطلب (السائق)</h3>
        </div>
      </div>

      {/* تفعيل/إيقاف */}
      <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg mb-3">
        <div>
          <p className="font-bold text-gray-900 text-xs">تفعيل إلغاء الطلب للسائقين</p>
        </div>
        <button
          onClick={() => setSettings(s => ({ ...s, enabled: !s.enabled }))}
          className={`w-12 h-6 rounded-full transition-colors ${
            settings.enabled ? 'bg-red-500' : 'bg-gray-300'
          }`}
        >
          <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
            settings.enabled ? 'translate-x-6' : 'translate-x-0.5'
          }`} />
        </button>
      </div>

      {settings.enabled && (
        <div className="space-y-2">
          {/* مهلة الإلغاء */}
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-600">مهلة الإلغاء (ثانية)</label>
            <input
              type="number"
              value={settings.cancel_window_seconds === 0 ? '' : settings.cancel_window_seconds}
              onChange={(e) => setSettings(s => ({ ...s, cancel_window_seconds: e.target.value === '' ? 0 : parseInt(e.target.value) }))}
              className="w-20 p-1.5 border border-gray-200 rounded text-xs text-left"
            />
          </div>

          {/* نسبة الإلغاء القصوى */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">نسبة القصوى %</label>
              <input
                type="number"
                value={settings.max_cancel_rate === 0 ? '' : settings.max_cancel_rate}
                onChange={(e) => setSettings(s => ({ ...s, max_cancel_rate: e.target.value === '' ? 0 : parseInt(e.target.value) }))}
                className="w-16 p-1.5 border border-gray-200 rounded text-xs text-left"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">طلبات الحساب</label>
              <input
                type="number"
                value={settings.lookback_orders === 0 ? '' : settings.lookback_orders}
                onChange={(e) => setSettings(s => ({ ...s, lookback_orders: e.target.value === '' ? 0 : parseInt(e.target.value) }))}
                className="w-16 p-1.5 border border-gray-200 rounded text-xs text-left"
              />
            </div>
          </div>

          {/* حدود التحذير والإيقاف */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-yellow-600">⚠️ تحذير %</label>
              <input
                type="number"
                value={settings.warning_threshold === 0 ? '' : settings.warning_threshold}
                onChange={(e) => setSettings(s => ({ ...s, warning_threshold: e.target.value === '' ? 0 : parseInt(e.target.value) }))}
                className="w-16 p-1.5 border border-yellow-200 rounded text-xs bg-yellow-50 text-left"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-red-600">🔴 إيقاف %</label>
              <input
                type="number"
                value={settings.suspension_threshold === 0 ? '' : settings.suspension_threshold}
                onChange={(e) => setSettings(s => ({ ...s, suspension_threshold: e.target.value === '' ? 0 : parseInt(e.target.value) }))}
                className="w-16 p-1.5 border border-red-200 rounded text-xs bg-red-50 text-left"
              />
            </div>
          </div>

          {/* إحصائيات */}
          {stats && (
            <div className="bg-gray-50 rounded p-2 mt-2">
              <div className="grid grid-cols-3 gap-1 text-center">
                <div className="bg-white p-2 rounded">
                  <p className="text-lg font-bold text-gray-900">{stats.total_cancellations}</p>
                  <p className="text-xs text-gray-500">إجمالي</p>
                </div>
                <div className="bg-white p-2 rounded">
                  <p className="text-lg font-bold text-blue-600">{stats.today_cancellations}</p>
                  <p className="text-xs text-gray-500">اليوم</p>
                </div>
                <div className="bg-white p-2 rounded">
                  <p className="text-lg font-bold text-purple-600">{stats.week_cancellations}</p>
                  <p className="text-xs text-gray-500">الأسبوع</p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-red-500 text-white py-1.5 rounded font-bold text-xs flex items-center justify-center gap-1 mt-2 disabled:opacity-50"
          >
            <Save size={14} />
            حفظ
          </button>
        </div>
      )}
    </div>
  );
};

// مكون إعدادات إشعارات نقص السائقين
const DriverShortageAlertSettings = ({ toast }) => {
  const [shortageAlert, setShortageAlert] = useState({
    enabled: false,
    min_available_drivers: 3,
    monitored_cities: [],
    cooldown_minutes: 30
  });
  const [availableCities, setAvailableCities] = useState([]);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    fetchSettings();
  }, []);
  
  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const [settingsRes, citiesRes] = await Promise.all([
        axios.get(`${API}/api/settings/driver-shortage-alert`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/api/settings/driver-shortage-alert/cities`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setShortageAlert(settingsRes.data);
      setAvailableCities(citiesRes.data.cities || []);
    } catch (error) {
      logger.error('Error fetching shortage alert settings:', error);
    }
  };
  
  const saveSettings = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/api/settings/driver-shortage-alert`, shortageAlert, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: "تم الحفظ", description: "تم تحديث إعدادات إشعارات نقص السائقين" });
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
  
  const toggleCity = (city) => {
    setShortageAlert(prev => {
      const cities = prev.monitored_cities || [];
      if (cities.includes(city)) {
        return { ...prev, monitored_cities: cities.filter(c => c !== city) };
      } else {
        return { ...prev, monitored_cities: [...cities, city] };
      }
    });
  };

  return (
    <div className="bg-white rounded-lg p-3 border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded">
          <Bell size={14} className="text-white" />
        </div>
        <h3 className="font-bold text-gray-900 text-sm">إشعارات نقص السائقين</h3>
      </div>

      {/* تفعيل/تعطيل */}
      <div className="flex items-center justify-between p-2 bg-gray-50 rounded mb-2">
        <p className="text-xs text-gray-900">تفعيل الإشعارات</p>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={shortageAlert.enabled}
            onChange={(e) => setShortageAlert(s => ({ ...s, enabled: e.target.checked }))}
            className="sr-only peer"
          />
          <div className="w-10 h-5 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-amber-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
        </label>
      </div>

      {shortageAlert.enabled && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">حد أدنى سائقين</label>
              <input
                type="number"
                min="1"
                max="20"
                value={shortageAlert.min_available_drivers}
                onChange={(e) => setShortageAlert(s => ({ ...s, min_available_drivers: parseInt(e.target.value) || 3 }))}
                className="w-14 p-1 border border-gray-200 rounded text-xs text-left"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">انتظار (دقيقة)</label>
              <input
                type="number"
                min="5"
                max="180"
                value={shortageAlert.cooldown_minutes}
                onChange={(e) => setShortageAlert(s => ({ ...s, cooldown_minutes: parseInt(e.target.value) || 30 }))}
                className="w-14 p-1 border border-gray-200 rounded text-xs text-left"
              />
            </div>
          </div>

          {/* المدن المراقبة */}
          <div>
            <label className="text-xs text-gray-600 mb-1 block">المدن المراقبة:</label>
            
            {availableCities.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">لا توجد مدن</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {availableCities.map(cityData => (
                  <label 
                    key={cityData.city}
                    className={`flex items-center gap-1 px-2 py-1 rounded border cursor-pointer text-xs ${
                      shortageAlert.monitored_cities?.includes(cityData.city)
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={shortageAlert.monitored_cities?.includes(cityData.city)}
                      onChange={() => toggleCity(cityData.city)}
                      className="w-3 h-3"
                    />
                    <span>{cityData.city}</span>
                    <span className="text-green-600">({cityData.available_drivers})</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            className="w-full bg-amber-500 text-white py-1.5 rounded font-bold text-xs flex items-center justify-center gap-1 disabled:opacity-50"
          >
            <Save size={14} />
            حفظ
          </button>
        </div>
      )}
    </div>
  );
};

// مكون إعدادات الطقس التلقائي
const AutoWeatherSettings = ({ toast }) => {
  const [settings, setSettings] = useState({
    enabled: false,
    api_key: '',
    base_amount: 5000,
    monitored_cities: ['دمشق'],
    has_api_key: false
  });
  const [currentWeather, setCurrentWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);

  const availableCities = [
    'دمشق', 'حلب', 'حمص', 'حماة', 'اللاذقية', 'طرطوس',
    'دير الزور', 'الرقة', 'إدلب', 'درعا', 'السويداء', 'القنيطرة'
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/api/settings/weather-api`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(prev => ({
        ...prev,
        ...res.data,
        api_key: res.data.has_api_key ? '**********' : ''
      }));
    } catch (err) {
      logger.error('Error fetching weather settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/api/settings/weather-api`, {
        enabled: settings.enabled,
        api_key: settings.api_key,
        base_amount: parseInt(settings.base_amount) || 5000,
        monitored_cities: settings.monitored_cities
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: 'تم الحفظ', description: 'تم تحديث إعدادات الطقس' });
      fetchSettings();
    } catch (err) {
      toast({ title: 'خطأ', description: err.response?.data?.detail || 'فشل الحفظ', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const checkWeatherNow = async () => {
    setChecking(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/api/settings/weather-current?city=${settings.monitored_cities[0] || 'دمشق'}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentWeather(res.data);
      toast({ title: 'تم الفحص', description: `الطقس في ${res.data.weather?.city}: ${res.data.weather?.condition_ar}` });
    } catch (err) {
      toast({ title: 'خطأ', description: err.response?.data?.detail || 'فشل فحص الطقس', variant: 'destructive' });
    } finally {
      setChecking(false);
    }
  };

  const triggerAutoCheck = async () => {
    setChecking(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API}/api/settings/weather-check-now`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.updated) {
        toast({ 
          title: res.data.action === 'activated' ? '⚠️ تم تفعيل رسوم الطقس' : '✅ تم إيقاف رسوم الطقس',
          description: res.data.reason || 'تحسن الطقس'
        });
      } else {
        toast({ title: 'لا تغيير', description: 'لا حاجة لتغيير رسوم الطقس' });
      }
    } catch (err) {
      toast({ title: 'خطأ', description: err.response?.data?.detail || 'فشل الفحص', variant: 'destructive' });
    } finally {
      setChecking(false);
    }
  };

  const toggleCity = (city) => {
    setSettings(prev => {
      const cities = prev.monitored_cities || [];
      if (cities.includes(city)) {
        return { ...prev, monitored_cities: cities.filter(c => c !== city) };
      } else {
        return { ...prev, monitored_cities: [...cities, city] };
      }
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-center h-32">
        <RefreshCw size={24} className="text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-3 border border-gray-200">
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded">
          <Cloud size={14} className="text-white" />
        </div>
        <h3 className="font-bold text-gray-900 text-sm">الطقس التلقائي</h3>
      </div>

      {/* مفتاح API */}
      <div className="mb-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={settings.api_key}
            onChange={(e) => setSettings(prev => ({ ...prev, api_key: e.target.value }))}
            placeholder="مفتاح OpenWeatherMap API..."
            className="flex-1 p-1.5 border border-gray-200 rounded text-xs"
          />
        </div>
      </div>

      {/* تفعيل + المبلغ */}
      <div className="flex items-center justify-between p-2 bg-gray-50 rounded mb-2">
        <div className="flex items-center gap-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings(prev => ({ ...prev, enabled: e.target.checked }))}
              className="sr-only peer"
              disabled={!settings.has_api_key && !settings.api_key}
            />
            <div className="w-10 h-5 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-disabled:opacity-50"></div>
          </label>
          <span className="text-xs">تلقائي</span>
        </div>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min="1000"
            step="1000"
            value={settings.base_amount}
            onChange={(e) => setSettings(prev => ({ ...prev, base_amount: e.target.value }))}
            className="w-20 p-1 border border-gray-200 rounded text-xs text-left"
          />
          <span className="text-xs text-gray-400">ل.س</span>
        </div>
      </div>

      {/* المدن */}
      <div className="mb-2">
        <div className="flex flex-wrap gap-1">
          {availableCities.slice(0, 6).map(city => (
            <label
              key={city}
              className={`flex items-center gap-1 px-2 py-1 rounded border cursor-pointer text-xs ${
                settings.monitored_cities?.includes(city)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200'
              }`}
            >
              <input
                type="checkbox"
                checked={settings.monitored_cities?.includes(city)}
                onChange={() => toggleCity(city)}
                className="w-3 h-3"
              />
              <span>{city}</span>
            </label>
          ))}
        </div>
      </div>

      {/* أزرار */}
      <div className="flex gap-1">
        <button
          onClick={checkWeatherNow}
          disabled={checking || !settings.has_api_key}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-gray-100 text-gray-700 rounded text-xs disabled:opacity-50"
        >
          {checking ? <RefreshCw size={12} className="animate-spin" /> : <Thermometer size={12} />}
          فحص
        </button>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex-1 bg-blue-500 text-white py-1.5 rounded font-bold text-xs flex items-center justify-center gap-1 disabled:opacity-50"
        >
          <Save size={12} />
          حفظ
        </button>
      </div>

      {/* الطقس الحالي */}
      {currentWeather?.weather && (
        <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
          <span className="font-bold">{currentWeather.weather.city}:</span> {currentWeather.weather.condition_ar} ({currentWeather.weather.temp}°C)
        </div>
      )}
    </div>
  );
};

export default SettingsTab;
