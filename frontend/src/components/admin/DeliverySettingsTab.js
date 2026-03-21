// /app/frontend/src/components/admin/DeliverySettingsTab.js
// تبويب إعدادات التوصيل (مستويات الأداء وساعات العمل وجوائز الصدارة)

import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Award, Clock, Save, RefreshCw, CheckCircle, AlertCircle,
  Star, Zap, Crown, Diamond, Trophy, Gift, Truck, MapPin
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const DeliverySettingsTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [releaseModal, setReleaseModal] = useState(false);
  const [processUndeliveredModal, setProcessUndeliveredModal] = useState(false);
  const [settings, setSettings] = useState({
    performance_levels: {
      beginner_max: 9,
      bronze_max: 29,
      silver_max: 59,
      gold_max: 99
    },
    working_hours: {
      start_hour: 8,
      end_hour: 18,
      is_enabled: true
    },
    leaderboard_rewards: {
      first: 50000,
      second: 30000,
      third: 15000
    },
    // إعدادات قبول الطلبات
    max_food_orders_per_driver: 3,
    food_orders_max_distance_km: 5
  });

  // التصنيف النشط للفلتر
  const [activeCategory, setActiveCategory] = useState('all');

  // إعدادات أجور التوصيل بالمسافة
  const [distanceSettings, setDistanceSettings] = useState({
    base_fee: 500,
    price_per_km: 200,
    min_fee: 1000,
    enabled_for_food: true,
    enabled_for_products: true
  });

  // إعدادات أرباح السائق
  const [driverEarningsSettings, setDriverEarningsSettings] = useState({
    base_fee: 1000,
    price_per_km: 300,
    min_fee: 1500
  });

  // وقت انتظار التوصيل
  const [waitTimeMinutes, setWaitTimeMinutes] = useState(10);

  // إعدادات تعويض انتظار السائق (جديد)
  const [waitCompensationSettings, setWaitCompensationSettings] = useState({
    max_waiting_time_minutes: 10,
    compensation_per_5_minutes: 500,
    max_compensation_per_order: 2000,
    warnings_before_alert: 3,
    warnings_before_final: 7,
    warnings_before_suspend: 10,
    suspend_duration_hours: 24,
    geofencing_max_distance_meters: 150,
    max_product_orders_per_driver: 7  // الحد الأقصى لطلبات المنتجات للسائق
  });

  // إعدادات وقت التوصيل والعقوبات
  const [deliveryTimeSettings, setDeliveryTimeSettings] = useState({
    buffer_minutes: 8,
    warning_before_minutes: 3,
    warnings_before_penalty: 3,
    penalty_amount: 500,
    max_penalty_per_day: 2000
  });

  // إعدادات ساعات توصيل المنتجات
  const [productDeliveryHours, setProductDeliveryHours] = useState({
    start_hour: 8,
    start_minute: 0,
    end_hour: 23,
    end_minute: 0
  });

  // تقرير الطلبات غير المُسلّمة
  const [undeliveredReport, setUndeliveredReport] = useState(null);

  // إعدادات حدود الطلبات الذكية
  const [smartOrderLimits, setSmartOrderLimits] = useState({
    max_orders_different_stores: 5,
    max_orders_same_store: 7,
    priority_timeout_seconds: 15,
    enable_smart_priority: true
  });

  // حالة التوزيع التلقائي
  const [dispatchStatus, setDispatchStatus] = useState(null);
  const [violationsReport, setViolationsReport] = useState(null);
  
  // إعدادات تعليق الأرباح (Hold Period)
  const [holdSettings, setHoldSettings] = useState({
    food_hold_hours: 1,
    products_hold_hours: 24,
    enabled: true
  });
  const [holdSummary, setHoldSummary] = useState(null);

  useEffect(() => {
    fetchSettings();
    fetchDistanceSettings();
    fetchDriverEarningsSettings();
    fetchWaitTime();
    fetchSmartOrderLimits();
    fetchWaitCompensationSettings();
    fetchDispatchStatus();
    fetchViolationsReport();
    fetchDeliveryTimeSettings();
    fetchProductDeliveryHours();
    fetchUndeliveredReport();
    fetchHoldSettings();
    fetchHoldSummary();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API}/api/settings/delivery-settings`);
      setSettings({
        ...settings,
        ...res.data,
        leaderboard_rewards: res.data.leaderboard_rewards || settings.leaderboard_rewards,
        max_food_orders_per_driver: res.data.max_food_orders_per_driver || 3,
        food_orders_max_distance_km: res.data.food_orders_max_distance_km || 5
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDistanceSettings = async () => {
    try {
      const res = await axios.get(`${API}/api/settings/distance-delivery`);
      setDistanceSettings(res.data);
    } catch (error) {
      console.error('Error fetching distance settings:', error);
    }
  };

  const fetchDriverEarningsSettings = async () => {
    try {
      const res = await axios.get(`${API}/api/settings/driver-earnings`);
      setDriverEarningsSettings(res.data);
    } catch (error) {
      console.error('Error fetching driver earnings settings:', error);
    }
  };

  const fetchWaitTime = async () => {
    try {
      const res = await axios.get(`${API}/api/settings/delivery-wait-time`);
      setWaitTimeMinutes(res.data.delivery_wait_time_minutes || 10);
    } catch (error) {
      console.error('Error fetching wait time:', error);
    }
  };

  const handleSaveDistanceSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/settings/distance-delivery`, distanceSettings);
      toast({ title: 'نجاح', description: 'تم حفظ إعدادات أجور التوصيل بالمسافة بنجاح' });
    } catch (error) {
      toast({ title: 'خطأ', description: error.response?.data?.detail || 'حدث خطأ', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDriverEarningsSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/settings/driver-earnings`, driverEarningsSettings);
      toast({ title: 'نجاح', description: 'تم حفظ إعدادات أرباح السائق بنجاح' });
    } catch (error) {
      toast({ title: 'خطأ', description: error.response?.data?.detail || 'حدث خطأ', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWaitTime = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/settings/delivery-wait-time?wait_time_minutes=${waitTimeMinutes}`);
      toast({ title: 'نجاح', description: 'تم حفظ وقت الانتظار بنجاح' });
    } catch (error) {
      toast({ title: 'خطأ', description: error.response?.data?.detail || 'حدث خطأ', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const fetchSmartOrderLimits = async () => {
    try {
      const res = await axios.get(`${API}/api/settings/smart-order-limits`);
      setSmartOrderLimits(res.data);
    } catch (error) {
      console.error('Error fetching smart order limits:', error);
    }
  };

  const fetchWaitCompensationSettings = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/settings/delivery`);
      if (res.data.settings) {
        setWaitCompensationSettings(prev => ({...prev, ...res.data.settings}));
      }
    } catch (error) {
      console.error('Error fetching wait compensation settings:', error);
    }
  };

  const fetchDispatchStatus = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/dispatch/status`);
      setDispatchStatus(res.data.status);
    } catch (error) {
      console.error('Error fetching dispatch status:', error);
    }
  };

  const fetchViolationsReport = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/violations/report?days=30`);
      setViolationsReport(res.data.report);
    } catch (error) {
      console.error('Error fetching violations report:', error);
    }
  };

  const fetchDeliveryTimeSettings = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/delivery-time-settings`);
      if (res.data.settings) {
        setDeliveryTimeSettings(prev => ({...prev, ...res.data.settings}));
      }
    } catch (error) {
      console.error('Error fetching delivery time settings:', error);
    }
  };

  const handleSaveDeliveryTimeSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/admin/delivery-time-settings`, deliveryTimeSettings);
      toast({ title: 'نجاح', description: 'تم حفظ إعدادات وقت التوصيل بنجاح' });
    } catch (error) {
      console.error('Error saving delivery time settings:', error);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء حفظ الإعدادات', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWaitCompensationSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/admin/settings/delivery`, waitCompensationSettings);
      toast({ title: 'نجاح', description: 'تم حفظ إعدادات تعويض الانتظار بنجاح' });
    } catch (error) {
      toast({ title: 'خطأ', description: error.response?.data?.detail || 'حدث خطأ', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSmartOrderLimits = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/settings/smart-order-limits`, smartOrderLimits);
      toast({ title: 'نجاح', description: 'تم حفظ إعدادات الحدود الذكية بنجاح' });
    } catch (error) {
      toast({ title: 'خطأ', description: error.response?.data?.detail || 'حدث خطأ', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // جلب إعدادات تعليق الأرباح
  const fetchHoldSettings = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/settings/earnings-hold`);
      setHoldSettings(res.data.settings || holdSettings);
    } catch (error) {
      console.error('Error fetching hold settings:', error);
    }
  };

  const fetchHoldSummary = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/held-earnings/summary`);
      setHoldSummary(res.data.summary);
    } catch (error) {
      console.error('Error fetching hold summary:', error);
    }
  };

  const handleSaveHoldSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/admin/settings/earnings-hold`, holdSettings);
      toast({ title: 'نجاح', description: 'تم حفظ إعدادات تعليق الأرباح بنجاح' });
    } catch (error) {
      toast({ title: 'خطأ', description: error.response?.data?.detail || 'حدث خطأ', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleReleaseAllHeld = async () => {
    setReleaseModal(false);
    try {
      const res = await axios.post(`${API}/api/admin/held-earnings/release-all`);
      toast({ title: 'نجاح', description: res.data.message });
      fetchHoldSummary();
    } catch (error) {
      toast({ title: 'خطأ', description: error.response?.data?.detail || 'حدث خطأ', variant: 'destructive' });
    }
  };

  const handleSaveLevels = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/settings/performance-levels`, settings.performance_levels);
      toast({ title: 'نجاح', description: 'تم حفظ مستويات الأداء بنجاح' });
    } catch (error) {
      toast({ title: 'خطأ', description: error.response?.data?.detail || 'حدث خطأ', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHours = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/settings/working-hours`, settings.working_hours);
      toast({ title: 'نجاح', description: 'تم حفظ ساعات العمل بنجاح' });
    } catch (error) {
      toast({ title: 'خطأ', description: error.response?.data?.detail || 'حدث خطأ', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLeaderboardRewards = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/settings/leaderboard-rewards`, settings.leaderboard_rewards);
      toast({ title: 'نجاح', description: 'تم حفظ جوائز الصدارة بنجاح' });
    } catch (error) {
      toast({ title: 'خطأ', description: error.response?.data?.detail || 'حدث خطأ', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOrderLimits = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/settings/order-limits`, {
        max_food_orders_per_driver: settings.max_food_orders_per_driver,
        food_orders_max_distance_km: settings.food_orders_max_distance_km
      });
      toast({ title: 'نجاح', description: 'تم حفظ إعدادات قبول الطلبات بنجاح' });
    } catch (error) {
      toast({ title: 'خطأ', description: error.response?.data?.detail || 'حدث خطأ', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // حفظ إعدادات حدود توصيل الطعام
  const handleSaveFoodDeliveryLimits = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/api/settings/food-delivery-limits`, {
        max_distance_km: settings.food_orders_max_distance_km || 5
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: 'نجاح', description: 'تم حفظ إعدادات حدود التوصيل بنجاح' });
    } catch (error) {
      toast({ title: 'خطأ', description: error.response?.data?.detail || 'حدث خطأ في حفظ الإعدادات', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // جلب إعدادات ساعات توصيل المنتجات
  const fetchProductDeliveryHours = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/api/admin/settings/product-delivery-hours`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.settings) {
        setProductDeliveryHours({
          start_hour: res.data.settings.start_hour || 8,
          start_minute: res.data.settings.start_minute || 0,
          end_hour: res.data.settings.end_hour || 23,
          end_minute: res.data.settings.end_minute || 0
        });
      }
    } catch (error) {
      console.error('Error fetching product delivery hours:', error);
    }
  };

  // حفظ إعدادات ساعات توصيل المنتجات
  const handleSaveProductDeliveryHours = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/api/admin/settings/product-delivery-hours`, productDeliveryHours, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: 'نجاح', description: 'تم حفظ ساعات توصيل المنتجات بنجاح' });
    } catch (error) {
      toast({ title: 'خطأ', description: error.response?.data?.detail || 'حدث خطأ', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // جلب تقرير الطلبات غير المُسلّمة
  const fetchUndeliveredReport = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/api/admin/delivery/undelivered-report`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUndeliveredReport(res.data.report);
    } catch (error) {
      console.error('Error fetching undelivered report:', error);
    }
  };

  // معالجة الطلبات غير المُسلّمة (خصم من رصيد السائقين)
  const handleProcessUndelivered = async () => {
    setProcessUndeliveredModal(false);
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API}/api/admin/delivery/process-undelivered`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: 'نجاح', description: `تم معالجة ${res.data.deductions.length} طلب. إجمالي الخصم: ${formatPrice(res.data.total_deducted)}` });
      fetchUndeliveredReport();
    } catch (error) {
      toast({ title: 'خطأ', description: error.response?.data?.detail || 'حدث خطأ', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  const { performance_levels, working_hours, leaderboard_rewards, max_food_orders_per_driver, food_orders_max_distance_km } = settings;

  // تصنيفات الأقسام
  const CATEGORIES = [
    { id: 'all', name: 'الكل', icon: '📋' },
    { id: 'prices', name: 'الأسعار', icon: '💰' },
    { id: 'times', name: 'الأوقات', icon: '⏰' },
    { id: 'orders', name: 'الطلبات', icon: '🚚' },
    { id: 'penalties', name: 'العقوبات', icon: '⚠️' },
    { id: 'rewards', name: 'المكافآت', icon: '🏆' },
  ];

  return (
    <div className="space-y-3">
      {/* فلتر التصنيفات */}
      <div className="bg-white rounded-lg border border-gray-200 p-2 sticky top-0 z-10">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeCategory === cat.id 
                  ? 'bg-orange-500 text-white shadow' 
                  : 'text-gray-600 text-sm hover:bg-gray-100'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
      {/* Dispatch Status & Violations Report - حالة التوزيع التلقائي */}
      {(activeCategory === 'all' || activeCategory === 'orders' || activeCategory === 'penalties') && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {/* حالة التوزيع */}
        {(activeCategory === 'all' || activeCategory === 'orders') && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-l from-blue-500 to-indigo-500 p-2 text-white">
            <div className="flex items-center gap-2">
              <span className="text-xs">🚀</span>
              <h2 className="font-bold text-sm">حالة التوزيع التلقائي</h2>
            </div>
          </div>
          <div className="p-2">
            {dispatchStatus ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                  <span className="text-gray-600 text-sm">النظام</span>
                  <span className={`font-bold ${dispatchStatus.background_task_running ? 'text-green-600' : 'text-red-600'}`}>
                    {dispatchStatus.background_task_running ? '✅ يعمل' : '❌ متوقف'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                  <span className="text-gray-600 text-sm">السائقين المتاحين</span>
                  <span className="font-bold text-blue-600">{dispatchStatus.available_drivers}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                  <span className="text-gray-600 text-sm">بانتظار التوزيع</span>
                  <span className="font-bold text-orange-600">{dispatchStatus.pending_dispatch}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-purple-50 rounded-lg">
                  <span className="text-gray-600 text-sm">تم توزيعها اليوم</span>
                  <span className="font-bold text-purple-600">{dispatchStatus.dispatched_today}</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">جاري التحميل...</div>
            )}
            <button
              onClick={fetchDispatchStatus}
              className="mt-2 w-full bg-blue-100 text-blue-700 py-1.5 rounded-lg hover:bg-blue-200 flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} />
              تحديث
            </button>
          </div>
        </div>
        )}

        {/* تقرير المخالفات */}
        {(activeCategory === 'all' || activeCategory === 'penalties') && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-l from-red-500 to-rose-500 p-2 text-white">
            <div className="flex items-center gap-2">
              <span className="text-xs">📊</span>
              <h2 className="font-bold text-sm">تقرير المخالفات (30 يوم)</h2>
            </div>
          </div>
          <div className="p-2">
            {violationsReport ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                  <span className="text-gray-600 text-sm">إجمالي المخالفات</span>
                  <span className="font-bold text-red-600">{violationsReport.total_violations}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-green-50 rounded-lg">
                  <span className="text-gray-600 text-sm">إجمالي التعويضات</span>
                  <span className="font-bold text-green-600">{formatPrice(violationsReport.total_compensations)}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
                  <span className="text-gray-600 text-sm">متوسط وقت التأخير</span>
                  <span className="font-bold text-yellow-600">{violationsReport.average_waiting_minutes} دقيقة</span>
                </div>
                {violationsReport.violating_stores?.length > 0 && (
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">المتاجر المخالفة:</p>
                    <div className="space-y-1">
                      {violationsReport.violating_stores.slice(0, 3).map((store, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-gray-600 text-sm">{store.name}</span>
                          <span className="text-red-600">{store.count} مخالفة</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-4">جاري التحميل...</div>
            )}
            <button
              onClick={fetchViolationsReport}
              className="mt-2 w-full bg-red-100 text-red-700 py-1.5 rounded-lg hover:bg-red-200 flex items-center justify-center gap-2"
            >
              <RefreshCw size={16} />
              تحديث
            </button>
          </div>
        </div>
        )}
      </div>
      )}

      {/* Distance Delivery Settings - إعدادات أجور التوصيل بالمسافة */}
      {(activeCategory === 'all' || activeCategory === 'prices') && (
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
            onClick={handleSaveDistanceSettings}
            disabled={saving}
            className="mt-2 w-full bg-gradient-to-l from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold disabled:opacity-50"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            حفظ
          </button>
        </div>
      </div>
      )}

      {/* Driver Earnings Settings - إعدادات أرباح السائق */}
      {(activeCategory === 'all' || activeCategory === 'prices') && (
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
            onClick={handleSaveDriverEarningsSettings}
            disabled={saving}
            className="w-full bg-gradient-to-l from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-3 py-1.5 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold disabled:opacity-50"
          >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            حفظ
          </button>
        </div>
      </div>
      )}

      {/* Wait Time Settings - إعدادات وقت الانتظار */}
      {(activeCategory === 'all' || activeCategory === 'times') && (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-l from-purple-500 to-pink-500 p-2 text-white">
          <div className="flex items-center gap-2">
            <Clock size={18} />
            <div>
              <h2 className="font-bold text-sm">وقت انتظار التوصيل</h2>
              <p className="text-sm text-white/80">الوقت الذي ينتظره السائق إذا لم يرد العميل</p>
            </div>
          </div>
        </div>
        
        <div className="p-2">
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">⏱️</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-800">وقت الانتظار</h3>
                <p className="text-xs text-gray-500">بعد هذا الوقت يمكن للسائق ترك الطلب عند الباب</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={waitTimeMinutes}
                onChange={(e) => setWaitTimeMinutes(parseInt(e.target.value) || 10)}
                className="flex-1 p-3 border border-purple-300 rounded-lg text-center text-sm font-bold"
                min={1}
                max={60}
              />
              <span className="text-lg font-bold text-purple-600">دقيقة</span>
            </div>
            <p className="text-center text-xs text-gray-500 mt-2">
              الحد الأدنى: 1 دقيقة | الحد الأقصى: 60 دقيقة
            </p>
          </div>

          <div className="mt-2 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h4 className="font-bold text-yellow-800 mb-2">⚠️ كيف يعمل النظام:</h4>
            <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
              <li>السائق يصل للعميل ويطلب كود التسليم</li>
              <li>إذا لم يرد العميل، يضغط السائق "العميل لا يرد"</li>
              <li>يبدأ مؤقت ({waitTimeMinutes} دقيقة)</li>
              <li>بعد انتهاء الوقت، يترك الطلب عند الباب</li>
              <li>الأموال لا تُسترد للعميل</li>
            </ol>
          </div>

          <button
            onClick={handleSaveWaitTime}
            disabled={saving}
            className="mt-2 w-full bg-gradient-to-l from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-1.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 font-bold"
          >
            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            حفظ وقت الانتظار
          </button>
        </div>
      </div>
      )}

      {/* Wait Compensation Settings - إعدادات تعويض انتظار السائق في المطعم */}
      {(activeCategory === 'all' || activeCategory === 'penalties') && (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-l from-red-500 to-rose-500 p-2 text-white">
          <div className="flex items-center gap-2">
            <span className="text-xs">⏰</span>
            <div>
              <h2 className="font-bold text-sm">تعويض انتظار السائق في المطعم</h2>
              <p className="text-sm text-white/80">حماية السائقين من تأخيرات المطاعم</p>
            </div>
          </div>
        </div>
        
        <div className="p-2 space-y-3">
          {/* توضيح النظام */}
          <div className="bg-rose-50 rounded-lg p-4 border border-rose-200">
            <h4 className="font-bold text-rose-800 mb-2">🛡️ كيف يعمل نظام حماية السائقين:</h4>
            <ol className="text-sm text-rose-700 space-y-1 list-decimal list-inside">
              <li>السائق يصل للمطعم ويضغط "وصلت للمطعم"</li>
              <li>يبدأ عداد الانتظار</li>
              <li>إذا تجاوز الانتظار <strong>{waitCompensationSettings.max_waiting_time_minutes} دقائق</strong>، يُحسب التعويض</li>
              <li>التعويض يُخصم من المطعم ويُضاف لمحفظة السائق</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {/* وقت الانتظار المسموح */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">⏱️</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">وقت الانتظار المسموح</h3>
                  <p className="text-xs text-gray-500">بعده يبدأ حساب التعويض</p>
                </div>
              </div>
              <input
                type="number"
                value={waitCompensationSettings.max_waiting_time_minutes}
                onChange={(e) => setWaitCompensationSettings({
                  ...waitCompensationSettings,
                  max_waiting_time_minutes: parseInt(e.target.value) || 10
                })}
                className="w-full p-3 border border-blue-300 rounded-lg text-center text-sm font-bold"
                min={5}
                max={30}
              />
              <p className="text-center text-sm text-blue-600 mt-2">دقيقة</p>
            </div>

            {/* التعويض لكل 5 دقائق */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">💰</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">تعويض كل 5 دقائق</h3>
                  <p className="text-xs text-gray-500">المبلغ المضاف للسائق</p>
                </div>
              </div>
              <input
                type="number"
                value={waitCompensationSettings.compensation_per_5_minutes}
                onChange={(e) => setWaitCompensationSettings({
                  ...waitCompensationSettings,
                  compensation_per_5_minutes: parseInt(e.target.value) || 500
                })}
                className="w-full p-3 border border-green-300 rounded-lg text-center text-sm font-bold"
                min={100}
                step={100}
              />
              <p className="text-center text-sm text-green-600 mt-2">ل.س</p>
            </div>

            {/* الحد الأقصى للتعويض */}
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">🔒</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">الحد الأقصى</h3>
                  <p className="text-xs text-gray-500">أقصى تعويض للطلب الواحد</p>
                </div>
              </div>
              <input
                type="number"
                value={waitCompensationSettings.max_compensation_per_order}
                onChange={(e) => setWaitCompensationSettings({
                  ...waitCompensationSettings,
                  max_compensation_per_order: parseInt(e.target.value) || 2000
                })}
                className="w-full p-3 border border-amber-300 rounded-lg text-center text-sm font-bold"
                min={500}
                step={500}
              />
              <p className="text-center text-sm text-amber-600 mt-2">ل.س</p>
            </div>
          </div>

          {/* أمثلة على التعويضات */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
            <h4 className="font-bold text-gray-700 mb-1.5">📊 أمثلة على التعويضات:</h4>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[12, 15, 20, 30].map(minutes => {
                const extraMinutes = Math.max(0, minutes - waitCompensationSettings.max_waiting_time_minutes);
                const units = Math.ceil(extraMinutes / 5);
                const comp = Math.min(units * waitCompensationSettings.compensation_per_5_minutes, waitCompensationSettings.max_compensation_per_order);
                return (
                  <div key={minutes} className="bg-white rounded-lg p-2 shadow-sm">
                    <div className="text-xs">⏱️</div>
                    <div className="text-sm text-gray-600 text-sm">{minutes} دقيقة</div>
                    <div className={`font-bold ${comp > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                      {comp > 0 ? `+${formatPrice(comp)}` : 'لا تعويض'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* إعدادات Geofencing - التحقق من موقع السائق */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="font-bold text-blue-800 mb-1.5">📍 التحقق من موقع السائق (Geofencing):</h4>
            <p className="text-sm text-blue-600 mb-1.5">
              عند ضغط السائق "وصلت للمتجر"، يتم التحقق من أنه فعلاً قرب المتجر
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">المسافة المسموحة من المتجر</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={waitCompensationSettings.geofencing_max_distance_meters}
                    onChange={(e) => setWaitCompensationSettings({
                      ...waitCompensationSettings,
                      geofencing_max_distance_meters: parseInt(e.target.value) || 150
                    })}
                    className="w-24 p-2 border border-blue-300 rounded text-center text-sm font-bold"
                    min={50}
                    max={500}
                    step={10}
                  />
                  <span className="text-sm text-blue-600 font-medium">متر</span>
                </div>
              </div>
              <div className="text-center p-2 bg-white rounded-lg border border-blue-200">
                <p className="text-xs text-gray-500">مثال</p>
                <p className="text-lg font-bold text-blue-600">{waitCompensationSettings.geofencing_max_distance_meters}م</p>
                <p className="text-xs text-gray-500">≈ {Math.round(waitCompensationSettings.geofencing_max_distance_meters / 80)} دقيقة مشي</p>
              </div>
            </div>
            <p className="text-xs text-blue-500 mt-2">
              💡 إذا كان السائق أبعد من هذه المسافة، لن يستطيع تسجيل وصوله
            </p>
          </div>

          {/* نظام التحذيرات */}
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <h4 className="font-bold text-red-800 mb-1.5">⚠️ نظام تحذيرات المطاعم:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">مخالفات قبل التحذير</label>
                <input
                  type="number"
                  value={waitCompensationSettings.warnings_before_alert}
                  onChange={(e) => setWaitCompensationSettings({
                    ...waitCompensationSettings,
                    warnings_before_alert: parseInt(e.target.value) || 3
                  })}
                  className="w-full p-2 border border-gray-300 rounded-lg text-center"
                  min={1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">مخالفات قبل التحذير الأخير</label>
                <input
                  type="number"
                  value={waitCompensationSettings.warnings_before_final}
                  onChange={(e) => setWaitCompensationSettings({
                    ...waitCompensationSettings,
                    warnings_before_final: parseInt(e.target.value) || 7
                  })}
                  className="w-full p-2 border border-gray-300 rounded-lg text-center"
                  min={1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">مخالفات قبل الإيقاف</label>
                <input
                  type="number"
                  value={waitCompensationSettings.warnings_before_suspend}
                  onChange={(e) => setWaitCompensationSettings({
                    ...waitCompensationSettings,
                    warnings_before_suspend: parseInt(e.target.value) || 10
                  })}
                  className="w-full p-2 border border-gray-300 rounded-lg text-center"
                  min={1}
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">مدة الإيقاف (ساعات)</label>
              <input
                type="number"
                value={waitCompensationSettings.suspend_duration_hours}
                onChange={(e) => setWaitCompensationSettings({
                  ...waitCompensationSettings,
                  suspend_duration_hours: parseInt(e.target.value) || 24
                })}
                className="w-32 p-2 border border-gray-300 rounded-lg text-center"
                min={1}
              />
            </div>
          </div>

          <button
            onClick={handleSaveWaitCompensationSettings}
            disabled={saving}
            className="mt-2 w-full bg-gradient-to-l from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white px-4 py-1.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 font-bold"
          >
            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            حفظ إعدادات تعويض الانتظار
          </button>
        </div>
      </div>
      )}

      {/* Order Limits Section - إعدادات قبول الطلبات */}
      {(activeCategory === 'all' || activeCategory === 'orders') && (
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
                value={max_food_orders_per_driver}
                onChange={(e) => setSettings({
                  ...settings,
                  max_food_orders_per_driver: parseInt(e.target.value) || 1
                })}
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
                value={waitCompensationSettings.max_product_orders_per_driver || 7}
                onChange={(e) => setWaitCompensationSettings({
                  ...waitCompensationSettings,
                  max_product_orders_per_driver: parseInt(e.target.value) || 7
                })}
                className="w-full p-3 border border-purple-300 rounded-lg text-center text-sm font-bold"
                min={1}
                max={15}
              />
              <p className="text-center text-sm text-purple-600 mt-2">
                {waitCompensationSettings.max_product_orders_per_driver || 7} طلبات منتجات
              </p>
            </div>

            {/* المسافة القصوى */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <MapPin size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">المسافة القصوى</h3>
                  <p className="text-xs text-gray-500">بين عملاء الطعام</p>
                </div>
              </div>
              <input
                type="number"
                value={food_orders_max_distance_km}
                onChange={(e) => setSettings({
                  ...settings,
                  food_orders_max_distance_km: parseFloat(e.target.value) || 5
                })}
                className="w-full p-3 border border-blue-300 rounded-lg text-center text-sm font-bold"
                min={1}
                max={20}
                step={0.5}
              />
              <p className="text-center text-sm text-blue-600 mt-2">
                {food_orders_max_distance_km} كم
              </p>
            </div>
          </div>

          {/* شرح القواعد */}
          <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-bold text-gray-700 mb-2">📋 كيف تعمل هذه القواعد:</h4>
            <ul className="text-sm text-gray-600 text-sm space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-orange-500">🍔</span>
                <span><strong>طلبات الطعام:</strong> السائق يستطيع قبول حتى <strong>{max_food_orders_per_driver} طلبات</strong> طعام في نفس الوقت</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-500">🛍️</span>
                <span><strong>طلبات المنتجات:</strong> السائق يستطيع قبول حتى <strong>{waitCompensationSettings.max_product_orders_per_driver || 7} طلبات</strong> منتجات (التوصيل نفس اليوم)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">📍</span>
                <span><strong>المسافة:</strong> يجب ألا تزيد المسافة بين عملاء الطعام عن <strong>{food_orders_max_distance_km} كم</strong></span>
              </li>
            </ul>
          </div>

          <button
            onClick={() => { handleSaveFoodDeliveryLimits(); handleSaveWaitCompensationSettings(); }}
            disabled={saving}
            className="mt-2 w-full bg-gradient-to-l from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-4 py-1.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 font-bold"
          >
            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            حفظ إعدادات قبول الطلبات
          </button>
        </div>
      </div>
      )}

      {/* Smart Order Limits - إعدادات الحدود الذكية */}
      {(activeCategory === 'all' || activeCategory === 'orders') && (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-l from-purple-500 to-indigo-500 p-2 text-white">
          <div className="flex items-center gap-2">
            <span className="text-xs">🧠</span>
            <div>
              <h2 className="font-bold text-sm">الحدود الذكية والأولوية</h2>
              <p className="text-sm text-white/80">إعدادات متقدمة لتوزيع الطلبات بذكاء</p>
            </div>
          </div>
        </div>
        
        <div className="p-2 space-y-3">
          {/* تفعيل الأولوية الذكية */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              <div>
                <h3 className="font-bold text-gray-800">الأولوية الذكية</h3>
                <p className="text-xs text-gray-500">طلب من نفس المطعم يظهر للسائق الذاهب إليه أولاً</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={smartOrderLimits.enable_smart_priority}
                onChange={(e) => setSmartOrderLimits({
                  ...smartOrderLimits,
                  enable_smart_priority: e.target.checked
                })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* الحد من مطاعم مختلفة */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">🏪</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">الحد من مطاعم مختلفة</h3>
                  <p className="text-xs text-gray-500">عدد الطلبات من مطاعم مختلفة</p>
                </div>
              </div>
              <input
                type="number"
                value={smartOrderLimits.max_orders_different_stores}
                onChange={(e) => setSmartOrderLimits({
                  ...smartOrderLimits,
                  max_orders_different_stores: parseInt(e.target.value) || 1
                })}
                className="w-full p-3 border border-blue-300 rounded-lg text-center text-sm font-bold"
                min={1}
                max={10}
              />
              <p className="text-center text-sm text-blue-600 mt-2">
                {smartOrderLimits.max_orders_different_stores} طلبات
              </p>
            </div>

            {/* الحد من نفس المطعم */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">🍔</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">الحد من نفس المطعم</h3>
                  <p className="text-xs text-gray-500">عدد الطلبات من نفس المطعم</p>
                </div>
              </div>
              <input
                type="number"
                value={smartOrderLimits.max_orders_same_store}
                onChange={(e) => setSmartOrderLimits({
                  ...smartOrderLimits,
                  max_orders_same_store: parseInt(e.target.value) || 1
                })}
                className="w-full p-3 border border-green-300 rounded-lg text-center text-sm font-bold"
                min={1}
                max={15}
              />
              <p className="text-center text-sm text-green-600 mt-2">
                {smartOrderLimits.max_orders_same_store} طلبات
              </p>
            </div>
          </div>

          {/* مدة الأولوية */}
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">⏱️</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-800">مدة الأولوية</h3>
                <p className="text-xs text-gray-500">الوقت المتاح للسائق لقبول الطلب ذو الأولوية</p>
              </div>
            </div>
            <input
              type="number"
              value={smartOrderLimits.priority_timeout_seconds}
              onChange={(e) => setSmartOrderLimits({
                ...smartOrderLimits,
                priority_timeout_seconds: parseInt(e.target.value) || 10
              })}
              className="w-full p-3 border border-amber-300 rounded-lg text-center text-sm font-bold"
              min={5}
              max={60}
            />
            <p className="text-center text-sm text-amber-600 mt-2">
              {smartOrderLimits.priority_timeout_seconds} ثانية
            </p>
          </div>

          {/* شرح القواعد الذكية */}
          <div className="p-2 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
            <h4 className="font-bold text-purple-700 mb-2">🧠 كيف تعمل الحدود الذكية:</h4>
            <ul className="text-sm text-gray-600 text-sm space-y-1">
              <li>• السائق يقبل حتى <strong className="text-blue-600">{smartOrderLimits.max_orders_different_stores} طلبات</strong> من مطاعم مختلفة</li>
              <li>• إذا كان الطلب من <strong className="text-green-600">نفس المطعم</strong> الذي يذهب إليه، يمكنه قبول حتى <strong className="text-green-600">{smartOrderLimits.max_orders_same_store} طلبات</strong></li>
              <li>• طلب من نفس المطعم يظهر <strong className="text-amber-600">للسائق الذاهب إليه أولاً</strong> لمدة {smartOrderLimits.priority_timeout_seconds} ثانية</li>
              <li>• إذا رفض، الطلب يظهر لباقي السائقين</li>
            </ul>
          </div>

          <button
            onClick={handleSaveSmartOrderLimits}
            disabled={saving}
            className="mt-2 w-full bg-gradient-to-l from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white px-4 py-1.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 font-bold"
          >
            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            حفظ إعدادات الحدود الذكية
          </button>
        </div>
      </div>
      )}

      {/* إعدادات وقت التوصيل والعقوبات */}
      {(activeCategory === 'all' || activeCategory === 'penalties') && (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-l from-red-500 to-pink-500 p-2 text-white">
          <div className="flex items-center gap-2">
            <span className="text-xs">⏱️</span>
            <div>
              <h2 className="font-bold text-sm">إعدادات وقت التوصيل والعقوبات</h2>
              <p className="text-sm text-white/80">تحكم في وقت التوصيل ونظام العقوبات للتأخير</p>
            </div>
          </div>
        </div>
        
        <div className="p-2 space-y-3">
          {/* شرح النظام */}
          <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-bold text-blue-700 mb-2">ℹ️ كيف يعمل النظام:</h4>
            <p className="text-sm text-gray-600 text-sm">
              عندما يستلم السائق الطلب من المطعم، يبدأ العداد. الوقت المسموح = وقت GPS + Buffer الإضافي.
              إذا تأخر السائق، يحصل على تحذيرات أولاً ثم خصومات.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* Buffer الإضافي */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">➕</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">الوقت الإضافي (Buffer)</h3>
                  <p className="text-xs text-gray-500">يُضاف لوقت GPS لحماية السائق</p>
                </div>
              </div>
              <input
                type="number"
                value={deliveryTimeSettings.buffer_minutes}
                onChange={(e) => setDeliveryTimeSettings({
                  ...deliveryTimeSettings,
                  buffer_minutes: parseInt(e.target.value) || 5
                })}
                className="w-full p-3 border border-green-300 rounded-lg text-center text-sm font-bold"
                min={3}
                max={20}
              />
              <p className="text-center text-sm text-green-600 mt-2">
                {deliveryTimeSettings.buffer_minutes} دقائق
              </p>
              <p className="text-xs text-gray-500 mt-1 text-center">
                مثال: GPS يقول 15 دقيقة → السائق لديه {15 + deliveryTimeSettings.buffer_minutes} دقيقة
              </p>
            </div>

            {/* التحذير قبل انتهاء الوقت */}
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">⚠️</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">تحذير قبل الانتهاء</h3>
                  <p className="text-xs text-gray-500">متى يظهر تحذير للسائق</p>
                </div>
              </div>
              <input
                type="number"
                value={deliveryTimeSettings.warning_before_minutes}
                onChange={(e) => setDeliveryTimeSettings({
                  ...deliveryTimeSettings,
                  warning_before_minutes: parseInt(e.target.value) || 3
                })}
                className="w-full p-3 border border-amber-300 rounded-lg text-center text-sm font-bold"
                min={1}
                max={10}
              />
              <p className="text-center text-sm text-amber-600 mt-2">
                {deliveryTimeSettings.warning_before_minutes} دقائق قبل الانتهاء
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {/* عدد التحذيرات قبل الخصم */}
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">🔔</span>
                </div>
                <h3 className="font-bold text-gray-800 text-sm">تحذيرات قبل الخصم</h3>
              </div>
              <input
                type="number"
                value={deliveryTimeSettings.warnings_before_penalty}
                onChange={(e) => setDeliveryTimeSettings({
                  ...deliveryTimeSettings,
                  warnings_before_penalty: parseInt(e.target.value) || 3
                })}
                className="w-full p-2 border border-orange-300 rounded-lg text-center text-sm font-bold"
                min={1}
                max={10}
              />
              <p className="text-center text-xs text-orange-600 mt-1">
                {deliveryTimeSettings.warnings_before_penalty} تحذيرات
              </p>
            </div>

            {/* مبلغ الخصم */}
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">💸</span>
                </div>
                <h3 className="font-bold text-gray-800 text-sm">مبلغ الخصم</h3>
              </div>
              <input
                type="number"
                value={deliveryTimeSettings.penalty_amount}
                onChange={(e) => setDeliveryTimeSettings({
                  ...deliveryTimeSettings,
                  penalty_amount: parseInt(e.target.value) || 500
                })}
                className="w-full p-2 border border-red-300 rounded-lg text-center text-sm font-bold"
                min={100}
                max={5000}
                step={100}
              />
              <p className="text-center text-xs text-red-600 mt-1">
                {deliveryTimeSettings.penalty_amount} ل.س
              </p>
            </div>

            {/* الحد الأقصى للخصم اليومي */}
            <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">🛡️</span>
                </div>
                <h3 className="font-bold text-gray-800 text-sm">حد الخصم اليومي</h3>
              </div>
              <input
                type="number"
                value={deliveryTimeSettings.max_penalty_per_day}
                onChange={(e) => setDeliveryTimeSettings({
                  ...deliveryTimeSettings,
                  max_penalty_per_day: parseInt(e.target.value) || 2000
                })}
                className="w-full p-2 border border-purple-300 rounded-lg text-center text-sm font-bold"
                min={500}
                max={10000}
                step={500}
              />
              <p className="text-center text-xs text-purple-600 mt-1">
                {deliveryTimeSettings.max_penalty_per_day} ل.س كحد أقصى
              </p>
            </div>
          </div>

          {/* شرح آلية العقوبات */}
          <div className="p-2 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border border-red-200">
            <h4 className="font-bold text-red-700 mb-2">⚖️ آلية العقوبات:</h4>
            <ul className="text-sm text-gray-600 text-sm space-y-1">
              <li>• التأخير الأول: <strong className="text-amber-600">تحذير 1/{deliveryTimeSettings.warnings_before_penalty}</strong></li>
              <li>• التأخير الثاني: <strong className="text-amber-600">تحذير 2/{deliveryTimeSettings.warnings_before_penalty}</strong></li>
              <li>• التأخير الثالث: <strong className="text-amber-600">تحذير 3/{deliveryTimeSettings.warnings_before_penalty}</strong></li>
              <li>• التأخير الرابع وما بعده: <strong className="text-red-600">خصم {deliveryTimeSettings.penalty_amount} ل.س</strong></li>
              <li>• الحد الأقصى للخصم في اليوم: <strong className="text-purple-600">{deliveryTimeSettings.max_penalty_per_day} ل.س</strong></li>
            </ul>
          </div>

          <button
            onClick={handleSaveDeliveryTimeSettings}
            disabled={saving}
            className="mt-2 w-full bg-gradient-to-l from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white px-4 py-1.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 font-bold"
          >
            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            حفظ إعدادات وقت التوصيل
          </button>
        </div>
      </div>
      )}

      {/* Leaderboard Rewards Section */}
      {(activeCategory === 'all' || activeCategory === 'rewards') && (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-l from-amber-500 to-yellow-500 p-2 text-white">
          <div className="flex items-center gap-2">
            <Trophy size={18} />
            <div>
              <h2 className="font-bold text-sm">جوائز لوحة الصدارة</h2>
              <p className="text-sm text-white/80">حدد الجوائز الشهرية للمراكز الثلاثة الأولى</p>
            </div>
          </div>
        </div>
        
        <div className="p-2">
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center text-3xl mb-2">
                🥇
              </div>
              <label className="block text-sm font-medium text-gray-600 text-sm mb-1">المركز الأول</label>
              <input
                type="number"
                value={leaderboard_rewards?.first || 50000}
                onChange={(e) => setSettings({
                  ...settings,
                  leaderboard_rewards: {
                    ...leaderboard_rewards,
                    first: parseInt(e.target.value) || 0
                  }
                })}
                className="w-full p-2 border rounded-lg text-center"
                min={0}
                step={5000}
              />
              <p className="text-xs text-gray-500 mt-1">{formatPrice(leaderboard_rewards?.first || 50000)}</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-gray-400 to-gray-500 rounded-full flex items-center justify-center text-3xl mb-2">
                🥈
              </div>
              <label className="block text-sm font-medium text-gray-600 text-sm mb-1">المركز الثاني</label>
              <input
                type="number"
                value={leaderboard_rewards?.second || 30000}
                onChange={(e) => setSettings({
                  ...settings,
                  leaderboard_rewards: {
                    ...leaderboard_rewards,
                    second: parseInt(e.target.value) || 0
                  }
                })}
                className="w-full p-2 border rounded-lg text-center"
                min={0}
                step={5000}
              />
              <p className="text-xs text-gray-500 mt-1">{formatPrice(leaderboard_rewards?.second || 30000)}</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-orange-400 to-orange-500 rounded-full flex items-center justify-center text-3xl mb-2">
                🥉
              </div>
              <label className="block text-sm font-medium text-gray-600 text-sm mb-1">المركز الثالث</label>
              <input
                type="number"
                value={leaderboard_rewards?.third || 15000}
                onChange={(e) => setSettings({
                  ...settings,
                  leaderboard_rewards: {
                    ...leaderboard_rewards,
                    third: parseInt(e.target.value) || 0
                  }
                })}
                className="w-full p-2 border rounded-lg text-center"
                min={0}
                step={5000}
              />
              <p className="text-xs text-gray-500 mt-1">{formatPrice(leaderboard_rewards?.third || 15000)}</p>
            </div>
          </div>
          
          <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 mb-2">
            <p className="text-sm text-amber-700 text-center">
              إجمالي الجوائز الشهرية: <strong>{formatPrice((leaderboard_rewards?.first || 50000) + (leaderboard_rewards?.second || 30000) + (leaderboard_rewards?.third || 15000))}</strong>
            </p>
          </div>

          <button
            onClick={handleSaveLeaderboardRewards}
            disabled={saving}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            حفظ جوائز الصدارة
          </button>
        </div>
      </div>
      )}

      {/* Performance Levels Section */}
      {(activeCategory === 'all' || activeCategory === 'rewards') && (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-l from-purple-500 to-indigo-500 p-2 text-white">
          <div className="flex items-center gap-2">
            <Award size={18} />
            <div>
              <h2 className="font-bold text-sm">مستويات أداء السائقين</h2>
              <p className="text-sm text-white/80">حدد عدد الطلبات المطلوبة لكل مستوى</p>
            </div>
          </div>
        </div>
        
        <div className="p-2 space-y-3">
          {/* Level Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
            <LevelCard 
              icon="🌱"
              name="مبتدئ"
              color="#10b981"
              range={`0 - ${performance_levels.beginner_max}`}
              description="السائقون الجدد"
            />
            <LevelCard 
              icon="🥉"
              name="برونزي"
              color="#b45309"
              range={`${performance_levels.beginner_max + 1} - ${performance_levels.bronze_max}`}
              description="أداء جيد"
            />
            <LevelCard 
              icon="🥈"
              name="فضي"
              color="#6b7280"
              range={`${performance_levels.bronze_max + 1} - ${performance_levels.silver_max}`}
              description="أداء ممتاز"
            />
            <LevelCard 
              icon="🥇"
              name="ذهبي"
              color="#f59e0b"
              range={`${performance_levels.silver_max + 1} - ${performance_levels.gold_max}`}
              description="أداء متميز"
            />
            <LevelCard 
              icon="💎"
              name="ماسي"
              color="#7c3aed"
              range={`${performance_levels.gold_max + 1}+`}
              description="نخبة السائقين"
            />
          </div>

          {/* Settings Inputs */}
          <div className="bg-gray-50 rounded-lg p-4 mt-2">
            <h3 className="font-bold text-gray-700 mb-2">تعديل الحدود (عدد الطلبات الشهرية)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-600 text-sm mb-1">
                  مبتدئ (حتى)
                </label>
                <input
                  type="number"
                  value={performance_levels.beginner_max}
                  onChange={(e) => setSettings({
                    ...settings,
                    performance_levels: {
                      ...performance_levels,
                      beginner_max: parseInt(e.target.value) || 0
                    }
                  })}
                  className="w-full p-2 border rounded-lg"
                  min={1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 text-sm mb-1">
                  برونزي (حتى)
                </label>
                <input
                  type="number"
                  value={performance_levels.bronze_max}
                  onChange={(e) => setSettings({
                    ...settings,
                    performance_levels: {
                      ...performance_levels,
                      bronze_max: parseInt(e.target.value) || 0
                    }
                  })}
                  className="w-full p-2 border rounded-lg"
                  min={performance_levels.beginner_max + 1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 text-sm mb-1">
                  فضي (حتى)
                </label>
                <input
                  type="number"
                  value={performance_levels.silver_max}
                  onChange={(e) => setSettings({
                    ...settings,
                    performance_levels: {
                      ...performance_levels,
                      silver_max: parseInt(e.target.value) || 0
                    }
                  })}
                  className="w-full p-2 border rounded-lg"
                  min={performance_levels.bronze_max + 1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 text-sm mb-1">
                  ذهبي (حتى)
                </label>
                <input
                  type="number"
                  value={performance_levels.gold_max}
                  onChange={(e) => setSettings({
                    ...settings,
                    performance_levels: {
                      ...performance_levels,
                      gold_max: parseInt(e.target.value) || 0
                    }
                  })}
                  className="w-full p-2 border rounded-lg"
                  min={performance_levels.silver_max + 1}
                />
              </div>
            </div>
            
            <button
              onClick={handleSaveLevels}
              disabled={saving}
              className="mt-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-1.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
              حفظ مستويات الأداء
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Working Hours Section */}
      {(activeCategory === 'all' || activeCategory === 'times') && (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-l from-blue-500 to-cyan-500 p-2 text-white">
          <div className="flex items-center gap-2">
            <Clock size={18} />
            <div>
              <h2 className="font-bold text-sm">ساعات عمل التوصيل</h2>
              <p className="text-sm text-white/80">حدد أوقات العمل المسموحة للسائقين</p>
            </div>
          </div>
        </div>
        
        <div className="p-2">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-2">
            <div>
              <h3 className="font-bold text-gray-700">تفعيل قيود ساعات العمل</h3>
              <p className="text-sm text-gray-500">
                {working_hours.is_enabled 
                  ? 'السائقون يستطيعون أخذ الطلبات فقط خلال ساعات العمل المحددة'
                  : 'السائقون يستطيعون أخذ الطلبات في أي وقت'
                }
              </p>
            </div>
            <button
              onClick={() => setSettings({
                ...settings,
                working_hours: { ...working_hours, is_enabled: !working_hours.is_enabled }
              })}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                working_hours.is_enabled ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <span className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                working_hours.is_enabled ? 'left-8' : 'left-1'
              }`} />
            </button>
          </div>

          {/* Hours Settings */}
          {working_hours.is_enabled && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-600 text-sm mb-2">
                  ساعة البدء
                </label>
                <select
                  value={working_hours.start_hour}
                  onChange={(e) => setSettings({
                    ...settings,
                    working_hours: { ...working_hours, start_hour: parseInt(e.target.value) }
                  })}
                  className="w-full p-3 border rounded-lg"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i === 0 ? '12:00 صباحاً' : i < 12 ? `${i}:00 صباحاً` : i === 12 ? '12:00 ظهراً' : `${i - 12}:00 مساءً`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 text-sm mb-2">
                  ساعة الانتهاء
                </label>
                <select
                  value={working_hours.end_hour}
                  onChange={(e) => setSettings({
                    ...settings,
                    working_hours: { ...working_hours, end_hour: parseInt(e.target.value) }
                  })}
                  className="w-full p-3 border rounded-lg"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i} disabled={i <= working_hours.start_hour}>
                      {i === 0 ? '12:00 صباحاً' : i < 12 ? `${i}:00 صباحاً` : i === 12 ? '12:00 ظهراً' : `${i - 12}:00 مساءً`}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Preview */}
          {working_hours.is_enabled && (
            <div className="mt-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 text-blue-700">
                <Clock size={18} />
                <span className="font-bold">
                  ساعات العمل: من {working_hours.start_hour}:00 إلى {working_hours.end_hour}:00
                </span>
              </div>
              <p className="text-sm text-blue-600 mt-1">
                ({working_hours.end_hour - working_hours.start_hour} ساعات عمل يومياً)
              </p>
            </div>
          )}

          <button
            onClick={handleSaveHours}
            disabled={saving}
            className="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            حفظ ساعات العمل
          </button>
        </div>
      </div>
      )}

      {/* Product Delivery Hours Section */}
      {(activeCategory === 'all' || activeCategory === 'times') && (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-l from-purple-500 to-indigo-500 p-2 text-white">
          <div className="flex items-center gap-2">
            <Truck size={18} />
            <div>
              <h2 className="font-bold text-sm">ساعات توصيل المنتجات</h2>
              <p className="text-sm text-white/80">حدد الأوقات التي يُسمح فيها للسائق بتوصيل المنتجات للعميل</p>
            </div>
          </div>
        </div>
        
        <div className="p-2">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-2">
            <p className="text-amber-800 text-sm">
              <strong>ملاحظة:</strong> السائق لن يستطيع تأكيد تسليم الطلب خارج هذه الساعات لعدم إزعاج العميل ليلاً أو صباحاً باكراً.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-600 text-sm mb-2">
                أول وقت للتوصيل (صباحاً)
              </label>
              <div className="flex gap-2">
                <select
                  value={productDeliveryHours.start_hour}
                  onChange={(e) => setProductDeliveryHours({
                    ...productDeliveryHours,
                    start_hour: parseInt(e.target.value)
                  })}
                  className="flex-1 p-3 border rounded-lg"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i === 0 ? '12' : i > 12 ? i - 12 : i}:00 {i < 12 ? 'صباحاً' : 'مساءً'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 text-sm mb-2">
                آخر وقت للتوصيل (مساءً)
              </label>
              <div className="flex gap-2">
                <select
                  value={productDeliveryHours.end_hour}
                  onChange={(e) => setProductDeliveryHours({
                    ...productDeliveryHours,
                    end_hour: parseInt(e.target.value)
                  })}
                  className="flex-1 p-3 border rounded-lg"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i === 0 ? '12' : i > 12 ? i - 12 : i}:00 {i < 12 ? 'صباحاً' : 'مساءً'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="mt-2 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 text-purple-700">
              <Clock size={18} />
              <span className="font-bold">
                التوصيل مسموح من {productDeliveryHours.start_hour}:00 إلى {productDeliveryHours.end_hour}:00
              </span>
            </div>
            <p className="text-sm text-purple-600 mt-1">
              خارج هذه الأوقات، السائق لن يستطيع تأكيد التسليم
            </p>
          </div>

          <button
            onClick={handleSaveProductDeliveryHours}
            disabled={saving}
            className="mt-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-1.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            حفظ ساعات التوصيل
          </button>
        </div>
      </div>
      )}

      {/* Earnings Hold Settings Section */}
      {(activeCategory === 'all' || activeCategory === 'penalties') && (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-l from-yellow-500 to-amber-500 p-2 text-white">
          <div className="flex items-center gap-2">
            <Clock size={18} />
            <div>
              <h2 className="font-bold text-sm">⏳ تعليق الأرباح (Hold Period)</h2>
              <p className="text-sm text-white/80">تعليق الأرباح لفترة معينة قبل إضافتها للرصيد المتاح</p>
            </div>
          </div>
        </div>
        
        <div className="p-2">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-2">
            <p className="text-amber-800 text-sm">
              <strong>الهدف:</strong> حماية المنصة من الإرجاعات - الأرباح تبقى معلقة حتى انتهاء فترة الإرجاع المسموحة للعميل.
            </p>
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between mb-2 p-2 bg-gray-50 rounded-lg">
            <span className="font-medium text-gray-700">تفعيل نظام التعليق</span>
            <button
              onClick={() => setHoldSettings({ ...holdSettings, enabled: !holdSettings.enabled })}
              className={`w-14 h-8 rounded-full transition-colors ${
                holdSettings.enabled ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow-md transition-transform ${
                holdSettings.enabled ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {holdSettings.enabled && (
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="block text-sm font-medium text-gray-600 text-sm mb-2">
                  🍔 فترة تعليق طلبات الطعام (ساعات)
                </label>
                <input
                  type="number"
                  value={holdSettings.food_hold_hours}
                  onChange={(e) => setHoldSettings({ ...holdSettings, food_hold_hours: parseInt(e.target.value) || 1 })}
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
                  value={holdSettings.products_hold_hours}
                  onChange={(e) => setHoldSettings({ ...holdSettings, products_hold_hours: parseInt(e.target.value) || 24 })}
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
                  onClick={() => setReleaseModal(true)}
                  className="mt-3 w-full bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm flex items-center justify-center gap-2"
                >
                  <CheckCircle size={16} />
                  إطلاق جميع الأرباح المعلقة الآن
                </button>
              )}
            </div>
          )}

          <button
            onClick={handleSaveHoldSettings}
            disabled={saving}
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-1.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            حفظ إعدادات التعليق
          </button>
        </div>
      </div>
      )}

      {/* Undelivered Orders Report Section */}
      {(activeCategory === 'all' || activeCategory === 'penalties') && (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-l from-red-500 to-orange-500 p-2 text-white">
          <div className="flex items-center gap-2">
            <AlertCircle size={18} />
            <div>
              <h2 className="font-bold text-sm">الطلبات غير المُسلّمة</h2>
              <p className="text-sm text-white/80">مراقبة وخصم قيمة الطلبات التي لم يسلمها السائقون</p>
            </div>
          </div>
        </div>
        
        <div className="p-2">
          {undeliveredReport ? (
            <div className="space-y-3">
              {/* طلبات اليوم */}
              <div className="p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                <h3 className="font-bold text-yellow-800 mb-2">طلبات اليوم (قيد التوصيل)</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-yellow-700">{undeliveredReport.today.count}</span>
                    <span className="text-yellow-600 mr-2">طلب</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-yellow-600">القيمة الإجمالية</p>
                    <p className="font-bold text-yellow-800">{formatPrice(undeliveredReport.today.total_value)}</p>
                  </div>
                </div>
              </div>

              {/* طلبات الأمس (تحتاج خصم) */}
              <div className="p-2 bg-red-50 rounded-lg border border-red-200">
                <h3 className="font-bold text-red-800 mb-2">طلبات الأمس (تحتاج خصم)</h3>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-bold text-red-700">{undeliveredReport.yesterday_pending_penalty.count}</span>
                    <span className="text-red-600 mr-2">طلب</span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm text-red-600">القيمة الإجمالية</p>
                    <p className="font-bold text-red-800">{formatPrice(undeliveredReport.yesterday_pending_penalty.total_value)}</p>
                  </div>
                </div>

                {undeliveredReport.yesterday_pending_penalty.count > 0 && (
                  <button
                    onClick={() => setProcessUndeliveredModal(true)}
                    disabled={saving}
                    className="mt-2 w-full bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {saving ? <RefreshCw size={18} className="animate-spin" /> : <AlertCircle size={18} />}
                    خصم {formatPrice(undeliveredReport.yesterday_pending_penalty.total_value)} من رصيد السائقين
                  </button>
                )}
              </div>

              <button
                onClick={fetchUndeliveredReport}
                className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1"
              >
                <RefreshCw size={14} />
                تحديث التقرير
              </button>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <RefreshCw size={18} className="animate-spin mx-auto mb-2" />
              جاري تحميل التقرير...
            </div>
          )}
        </div>
      </div>
      )}
      </div>

      {/* Release Earnings Modal */}
      <ReleaseEarningsModal
        isOpen={releaseModal}
        onClose={() => setReleaseModal(false)}
        onConfirm={handleReleaseAllHeld}
      />

      {/* Process Undelivered Orders Modal */}
      <ProcessUndeliveredModal
        isOpen={processUndeliveredModal}
        onClose={() => setProcessUndeliveredModal(false)}
        onConfirm={handleProcessUndelivered}
      />
    </div>
  );
};

const LevelCard = ({ icon, name, color, range, description }) => (
  <div 
    className="p-3 rounded-lg text-center"
    style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
  >
    <span className="text-2xl">{icon}</span>
    <h4 className="font-bold mt-1" style={{ color }}>{name}</h4>
    <p className="text-sm font-medium text-gray-700">{range} طلب</p>
    <p className="text-xs text-gray-500 mt-1">{description}</p>
  </div>
);

// Release Earnings Confirmation Modal
const ReleaseEarningsModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle size={16} className="text-green-600" />
          </div>
          <div>
            <h3 className="font-bold">إطلاق الأرباح المعلقة</h3>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-2">
          هل تريد إطلاق جميع الأرباح المعلقة للسائقين الآن؟ سيتم تحويل المبالغ إلى محافظهم.
        </p>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-sm"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm flex items-center justify-center gap-2"
          >
            <CheckCircle size={16} />
            تأكيد الإطلاق
          </button>
        </div>
      </div>
    </div>
  );
};

// Process Undelivered Orders Confirmation Modal
const ProcessUndeliveredModal = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
            <AlertCircle size={16} className="text-red-600" />
          </div>
          <div>
            <h3 className="font-bold">خصم الطلبات غير المُسلّمة</h3>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-2">
          هل أنت متأكد من خصم قيمة الطلبات غير المُسلّمة من رصيد السائقين؟ لا يمكن التراجع عن هذا الإجراء.
        </p>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-sm"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm flex items-center justify-center gap-2"
          >
            <AlertCircle size={16} />
            تأكيد الخصم
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeliverySettingsTab;
