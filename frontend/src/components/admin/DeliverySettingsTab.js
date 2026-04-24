// /app/frontend/src/components/admin/DeliverySettingsTab.js
// تبويب إعدادات التوصيل - النسخة المُحسّنة والمُقسّمة

import { useState, useEffect } from 'react';
import logger from '../../lib/logger';
import axios from 'axios';
import { useToast } from '../../hooks/use-toast';

// استيراد المكونات المُقسّمة
import {
  DispatchStatusCard,
  ViolationsReportCard,
  DistancePricingCard,
  DriverEarningsCard,
  WaitTimeCard,
  WaitCompensationCard,
  OrderLimitsCard,
  SmartPriorityCard,
  DeliveryTimeSettingsCard,
  ProductDeliveryHoursCard,
  PerformanceLevelsCard,
  LeaderboardRewardsCard,
  WorkingHoursCard,
  HoldSettingsCard,
  CustomerProtectionCard,
  UndeliveredOrdersCard,
  ReleaseEarningsModal,
  ProcessUndeliveredModal
} from './delivery-settings';

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
  
  // التصنيف النشط للفلتر
  const [activeCategory, setActiveCategory] = useState('all');

  // ====== States ======
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
    max_food_orders_per_driver: 3,
    food_orders_max_distance_km: 5
  });

  const [distanceSettings, setDistanceSettings] = useState({
    base_fee: 500,
    price_per_km: 200,
    min_fee: 1000,
    enabled_for_food: true,
    enabled_for_products: true
  });

  const [driverEarningsSettings, setDriverEarningsSettings] = useState({
    base_fee: 1000,
    price_per_km: 300,
    min_fee: 1500
  });

  const [waitTimeMinutes, setWaitTimeMinutes] = useState(10);

  const [waitCompensationSettings, setWaitCompensationSettings] = useState({
    max_waiting_time_minutes: 10,
    compensation_per_5_minutes: 500,
    max_compensation_per_order: 2000,
    warnings_before_alert: 3,
    warnings_before_final: 7,
    warnings_before_suspend: 10,
    suspend_duration_hours: 24,
    geofencing_max_distance_meters: 150,
    max_product_orders_per_driver: 7
  });

  const [deliveryTimeSettings, setDeliveryTimeSettings] = useState({
    buffer_minutes: 8,
    warning_before_minutes: 3,
    warnings_before_penalty: 3,
    penalty_amount: 500,
    max_penalty_per_day: 2000
  });

  const [productDeliveryHours, setProductDeliveryHours] = useState({
    start_hour: 8,
    start_minute: 0,
    end_hour: 23,
    end_minute: 0
  });

  const [smartOrderLimits, setSmartOrderLimits] = useState({
    max_orders_different_stores: 5,
    max_orders_same_store: 7,
    priority_timeout_seconds: 15,
    enable_smart_priority: true
  });

  const [dispatchStatus, setDispatchStatus] = useState(null);
  const [violationsReport, setViolationsReport] = useState(null);
  const [undeliveredReport, setUndeliveredReport] = useState(null);
  
  const [holdSettings, setHoldSettings] = useState({
    food_hold_hours: 1,
    products_hold_hours: 24,
    enabled: true
  });
  const [holdSummary, setHoldSummary] = useState(null);
  
  const [customerProtection, setCustomerProtection] = useState({
    customer_protection_enabled: true,
    delay_notification_minutes: 5,
    free_cancel_delay_minutes: 15,
    compensation_coupon_delay_minutes: 20,
    compensation_coupon_percent: 10,
    max_coupon_value: 15000,
    seller_compensation_on_cancel_percent: 50
  });

  // ====== Fetch Functions ======
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
    fetchCustomerProtectionSettings();
  }, []);
  
  const fetchCustomerProtectionSettings = async () => {
    try {
      const res = await axios.get(`${API}/api/settings/customer-protection`);
      if (res.data) {
        setCustomerProtection(prev => ({ ...prev, ...res.data }));
      }
    } catch (error) {
      logger.error('Error fetching customer protection settings:', error);
    }
  };

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
      logger.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDistanceSettings = async () => {
    try {
      const res = await axios.get(`${API}/api/settings/distance-delivery`);
      setDistanceSettings(res.data);
    } catch (error) {
      logger.error('Error fetching distance settings:', error);
    }
  };

  const fetchDriverEarningsSettings = async () => {
    try {
      const res = await axios.get(`${API}/api/settings/driver-earnings`);
      setDriverEarningsSettings(res.data);
    } catch (error) {
      logger.error('Error fetching driver earnings settings:', error);
    }
  };

  const fetchWaitTime = async () => {
    try {
      const res = await axios.get(`${API}/api/settings/delivery-wait-time`);
      setWaitTimeMinutes(res.data.delivery_wait_time_minutes || 10);
    } catch (error) {
      logger.error('Error fetching wait time:', error);
    }
  };

  const fetchSmartOrderLimits = async () => {
    try {
      const res = await axios.get(`${API}/api/settings/smart-order-limits`);
      setSmartOrderLimits(res.data);
    } catch (error) {
      logger.error('Error fetching smart order limits:', error);
    }
  };

  const fetchWaitCompensationSettings = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/settings/delivery`);
      if (res.data.settings) {
        setWaitCompensationSettings(prev => ({...prev, ...res.data.settings}));
      }
    } catch (error) {
      logger.error('Error fetching wait compensation settings:', error);
    }
  };

  const fetchDispatchStatus = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/dispatch/status`);
      setDispatchStatus(res.data.status);
    } catch (error) {
      logger.error('Error fetching dispatch status:', error);
    }
  };

  const fetchViolationsReport = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/violations/report?days=30`);
      setViolationsReport(res.data.report);
    } catch (error) {
      logger.error('Error fetching violations report:', error);
    }
  };

  const fetchDeliveryTimeSettings = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/delivery-time-settings`);
      if (res.data.settings) {
        setDeliveryTimeSettings(prev => ({...prev, ...res.data.settings}));
      }
    } catch (error) {
      logger.error('Error fetching delivery time settings:', error);
    }
  };

  const fetchProductDeliveryHours = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/settings/product-delivery-hours`);
      if (res.data.settings) {
        setProductDeliveryHours({
          start_hour: res.data.settings.start_hour || 8,
          start_minute: res.data.settings.start_minute || 0,
          end_hour: res.data.settings.end_hour || 23,
          end_minute: res.data.settings.end_minute || 0
        });
      }
    } catch (error) {
      logger.error('Error fetching product delivery hours:', error);
    }
  };

  const fetchUndeliveredReport = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/delivery/undelivered-report`);
      setUndeliveredReport(res.data.report);
    } catch (error) {
      logger.error('Error fetching undelivered report:', error);
    }
  };

  const fetchHoldSettings = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/settings/earnings-hold`);
      setHoldSettings(res.data.settings || holdSettings);
    } catch (error) {
      logger.error('Error fetching hold settings:', error);
    }
  };

  const fetchHoldSummary = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/held-earnings/summary`);
      setHoldSummary(res.data.summary);
    } catch (error) {
      logger.error('Error fetching hold summary:', error);
    }
  };

  // ====== Save Handlers ======
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

  const handleSaveDeliveryTimeSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/admin/delivery-time-settings`, deliveryTimeSettings);
      toast({ title: 'نجاح', description: 'تم حفظ إعدادات وقت التوصيل بنجاح' });
    } catch (error) {
      logger.error('Error saving delivery time settings:', error);
      toast({ title: 'خطأ', description: 'حدث خطأ أثناء حفظ الإعدادات', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProductDeliveryHours = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/admin/settings/product-delivery-hours`, productDeliveryHours);
      toast({ title: 'نجاح', description: 'تم حفظ ساعات توصيل المنتجات بنجاح' });
    } catch (error) {
      toast({ title: 'خطأ', description: error.response?.data?.detail || 'حدث خطأ', variant: 'destructive' });
    } finally {
      setSaving(false);
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

  const handleSaveFoodDeliveryLimits = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/settings/food-delivery-limits`, {
        max_distance_km: settings.food_orders_max_distance_km || 5
      });
      toast({ title: 'نجاح', description: 'تم حفظ إعدادات حدود التوصيل بنجاح' });
    } catch (error) {
      toast({ title: 'خطأ', description: error.response?.data?.detail || 'حدث خطأ في حفظ الإعدادات', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOrderLimits = async () => {
    handleSaveFoodDeliveryLimits();
    handleSaveWaitCompensationSettings();
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

  const saveCustomerProtectionSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/settings/customer-protection`, customerProtection);
      toast({ title: 'نجاح', description: 'تم حفظ إعدادات حماية العميل بنجاح' });
    } catch (error) {
      toast({ title: 'خطأ', description: 'فشل في حفظ الإعدادات', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleProcessUndelivered = async () => {
    setProcessUndeliveredModal(false);
    setSaving(true);
    try {
      const res = await axios.post(`${API}/api/admin/delivery/process-undelivered`, {});
      toast({ title: 'نجاح', description: `تم معالجة ${res.data.deductions.length} طلب. إجمالي الخصم: ${formatPrice(res.data.total_deducted)}` });
      fetchUndeliveredReport();
    } catch (error) {
      toast({ title: 'خطأ', description: error.response?.data?.detail || 'حدث خطأ', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ====== Loading State ======
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent"></div>
      </div>
    );
  }

  // ====== Categories ======
  const CATEGORIES = [
    { id: 'all', name: 'الكل', icon: '📋' },
    { id: 'prices', name: 'الأسعار', icon: '💰' },
    { id: 'times', name: 'الأوقات', icon: '⏰' },
    { id: 'orders', name: 'الطلبات', icon: '🚚' },
    { id: 'penalties', name: 'العقوبات', icon: '⚠️' },
    { id: 'rewards', name: 'المكافآت', icon: '🏆' },
  ];

  // ====== Render ======
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
        {/* Dispatch Status & Violations Report */}
        {(activeCategory === 'all' || activeCategory === 'orders' || activeCategory === 'penalties') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {(activeCategory === 'all' || activeCategory === 'orders') && (
              <DispatchStatusCard 
                dispatchStatus={dispatchStatus} 
                onRefresh={fetchDispatchStatus} 
              />
            )}
            {(activeCategory === 'all' || activeCategory === 'penalties') && (
              <ViolationsReportCard 
                violationsReport={violationsReport} 
                onRefresh={fetchViolationsReport} 
              />
            )}
          </div>
        )}

        {/* Distance Delivery Settings */}
        {(activeCategory === 'all' || activeCategory === 'prices') && (
          <DistancePricingCard 
            distanceSettings={distanceSettings}
            setDistanceSettings={setDistanceSettings}
            saving={saving}
            onSave={handleSaveDistanceSettings}
          />
        )}

        {/* Driver Earnings Settings */}
        {(activeCategory === 'all' || activeCategory === 'prices') && (
          <DriverEarningsCard 
            driverEarningsSettings={driverEarningsSettings}
            setDriverEarningsSettings={setDriverEarningsSettings}
            saving={saving}
            onSave={handleSaveDriverEarningsSettings}
          />
        )}

        {/* Wait Time Settings */}
        {(activeCategory === 'all' || activeCategory === 'times') && (
          <WaitTimeCard 
            waitTimeMinutes={waitTimeMinutes}
            setWaitTimeMinutes={setWaitTimeMinutes}
            saving={saving}
            onSave={handleSaveWaitTime}
          />
        )}

        {/* Wait Compensation Settings */}
        {(activeCategory === 'all' || activeCategory === 'penalties') && (
          <WaitCompensationCard 
            waitCompensationSettings={waitCompensationSettings}
            setWaitCompensationSettings={setWaitCompensationSettings}
            saving={saving}
            onSave={handleSaveWaitCompensationSettings}
          />
        )}

        {/* Order Limits */}
        {(activeCategory === 'all' || activeCategory === 'orders') && (
          <OrderLimitsCard 
            settings={settings}
            setSettings={setSettings}
            waitCompensationSettings={waitCompensationSettings}
            setWaitCompensationSettings={setWaitCompensationSettings}
            saving={saving}
            onSave={handleSaveOrderLimits}
          />
        )}

        {/* Smart Priority */}
        {(activeCategory === 'all' || activeCategory === 'orders') && (
          <SmartPriorityCard 
            smartOrderLimits={smartOrderLimits}
            setSmartOrderLimits={setSmartOrderLimits}
            saving={saving}
            onSave={handleSaveSmartOrderLimits}
          />
        )}

        {/* Delivery Time Settings */}
        {(activeCategory === 'all' || activeCategory === 'penalties') && (
          <DeliveryTimeSettingsCard 
            deliveryTimeSettings={deliveryTimeSettings}
            setDeliveryTimeSettings={setDeliveryTimeSettings}
            saving={saving}
            onSave={handleSaveDeliveryTimeSettings}
          />
        )}

        {/* Product Delivery Hours */}
        {(activeCategory === 'all' || activeCategory === 'times') && (
          <ProductDeliveryHoursCard 
            productDeliveryHours={productDeliveryHours}
            setProductDeliveryHours={setProductDeliveryHours}
            saving={saving}
            onSave={handleSaveProductDeliveryHours}
          />
        )}

        {/* Performance Levels */}
        {(activeCategory === 'all' || activeCategory === 'rewards') && (
          <PerformanceLevelsCard 
            settings={settings}
            setSettings={setSettings}
            saving={saving}
            onSave={handleSaveLevels}
          />
        )}

        {/* Leaderboard Rewards */}
        {(activeCategory === 'all' || activeCategory === 'rewards') && (
          <LeaderboardRewardsCard 
            settings={settings}
            setSettings={setSettings}
            saving={saving}
            onSave={handleSaveLeaderboardRewards}
          />
        )}

        {/* Working Hours */}
        {(activeCategory === 'all' || activeCategory === 'times') && (
          <WorkingHoursCard 
            settings={settings}
            setSettings={setSettings}
            saving={saving}
            onSave={handleSaveHours}
          />
        )}

        {/* Hold Settings */}
        {(activeCategory === 'all' || activeCategory === 'prices') && (
          <HoldSettingsCard 
            holdSettings={holdSettings}
            setHoldSettings={setHoldSettings}
            holdSummary={holdSummary}
            saving={saving}
            onSave={handleSaveHoldSettings}
            onReleaseAll={() => setReleaseModal(true)}
          />
        )}

        {/* Customer Protection & Undelivered Orders */}
        {(activeCategory === 'all' || activeCategory === 'penalties') && (
          <>
            <CustomerProtectionCard 
              customerProtection={customerProtection}
              setCustomerProtection={setCustomerProtection}
              saving={saving}
              onSave={saveCustomerProtectionSettings}
            />
            <UndeliveredOrdersCard 
              undeliveredReport={undeliveredReport}
              saving={saving}
              onRefresh={fetchUndeliveredReport}
              onProcessUndelivered={() => setProcessUndeliveredModal(true)}
            />
          </>
        )}
      </div>

      {/* Modals */}
      <ReleaseEarningsModal
        isOpen={releaseModal}
        onClose={() => setReleaseModal(false)}
        onConfirm={handleReleaseAllHeld}
      />

      <ProcessUndeliveredModal
        isOpen={processUndeliveredModal}
        onClose={() => setProcessUndeliveredModal(false)}
        onConfirm={handleProcessUndelivered}
      />
    </div>
  );
};

export default DeliverySettingsTab;
