// /app/frontend/src/components/admin/DeliverySettingsTab.js
// تبويب إعدادات التوصيل (مستويات الأداء وساعات العمل وجوائز الصدارة)

import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Award, Clock, Save, RefreshCw, CheckCircle, AlertCircle,
  Star, Zap, Crown, Diamond, Trophy, Gift, Truck, MapPin
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const DeliverySettingsTab = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    food_orders_max_distance_km: 2
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API}/api/settings/delivery-settings`);
      setSettings({
        ...settings,
        ...res.data,
        leaderboard_rewards: res.data.leaderboard_rewards || settings.leaderboard_rewards,
        max_food_orders_per_driver: res.data.max_food_orders_per_driver || 3,
        food_orders_max_distance_km: res.data.food_orders_max_distance_km || 2
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLevels = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/settings/performance-levels`, settings.performance_levels);
      alert('تم حفظ مستويات الأداء بنجاح!');
    } catch (error) {
      alert(error.response?.data?.detail || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHours = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/settings/working-hours`, settings.working_hours);
      alert('تم حفظ ساعات العمل بنجاح!');
    } catch (error) {
      alert(error.response?.data?.detail || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLeaderboardRewards = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/settings/leaderboard-rewards`, settings.leaderboard_rewards);
      alert('تم حفظ جوائز الصدارة بنجاح!');
    } catch (error) {
      alert(error.response?.data?.detail || 'حدث خطأ');
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
      alert('تم حفظ إعدادات قبول الطلبات بنجاح!');
    } catch (error) {
      alert(error.response?.data?.detail || 'حدث خطأ');
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

  return (
    <div className="space-y-6">
      {/* Order Limits Section - إعدادات قبول الطلبات */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-l from-orange-500 to-red-500 p-4 text-white">
          <div className="flex items-center gap-3">
            <Truck size={24} />
            <div>
              <h2 className="font-bold text-lg">إعدادات قبول طلبات الطعام</h2>
              <p className="text-sm text-white/80">تحكم في عدد الطلبات والمسافة المسموحة للسائق</p>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* الحد الأقصى للطلبات */}
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-lg">📦</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">الحد الأقصى للطلبات</h3>
                  <p className="text-xs text-gray-500">عدد طلبات الطعام المسموح بها في نفس الوقت</p>
                </div>
              </div>
              <input
                type="number"
                value={max_food_orders_per_driver}
                onChange={(e) => setSettings({
                  ...settings,
                  max_food_orders_per_driver: parseInt(e.target.value) || 1
                })}
                className="w-full p-3 border-2 border-orange-300 rounded-lg text-center text-2xl font-bold"
                min={1}
                max={10}
              />
              <p className="text-center text-sm text-orange-600 mt-2">
                {max_food_orders_per_driver} طلبات كحد أقصى
              </p>
            </div>

            {/* المسافة القصوى */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <MapPin size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">المسافة القصوى</h3>
                  <p className="text-xs text-gray-500">المسافة بين مواقع عملاء الطلبات</p>
                </div>
              </div>
              <input
                type="number"
                value={food_orders_max_distance_km}
                onChange={(e) => setSettings({
                  ...settings,
                  food_orders_max_distance_km: parseFloat(e.target.value) || 1
                })}
                className="w-full p-3 border-2 border-blue-300 rounded-lg text-center text-2xl font-bold"
                min={0.5}
                max={20}
                step={0.5}
              />
              <p className="text-center text-sm text-blue-600 mt-2">
                {food_orders_max_distance_km} كم كحد أقصى
              </p>
            </div>
          </div>

          {/* شرح القواعد */}
          <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <h4 className="font-bold text-gray-700 mb-2">📋 كيف تعمل هذه القواعد:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• السائق يستطيع قبول حتى <strong>{max_food_orders_per_driver} طلبات طعام</strong> في نفس الوقت</li>
              <li>• الطلب الثاني والثالث يجب أن يكون عميلهم ضمن <strong>{food_orders_max_distance_km} كم</strong> من عميل الطلب الأول</li>
              <li>• هذا يضمن توصيل الطعام ساخناً وطازجاً</li>
            </ul>
          </div>

          <button
            onClick={handleSaveOrderLimits}
            disabled={saving}
            className="mt-4 w-full bg-gradient-to-l from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 font-bold"
          >
            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            حفظ إعدادات قبول الطلبات
          </button>
        </div>
      </div>

      {/* Leaderboard Rewards Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-l from-amber-500 to-yellow-500 p-4 text-white">
          <div className="flex items-center gap-3">
            <Trophy size={24} />
            <div>
              <h2 className="font-bold text-lg">جوائز لوحة الصدارة</h2>
              <p className="text-sm text-white/80">حدد الجوائز الشهرية للمراكز الثلاثة الأولى</p>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full flex items-center justify-center text-3xl mb-2">
                🥇
              </div>
              <label className="block text-sm font-medium text-gray-600 mb-1">المركز الأول</label>
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
              <label className="block text-sm font-medium text-gray-600 mb-1">المركز الثاني</label>
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
              <label className="block text-sm font-medium text-gray-600 mb-1">المركز الثالث</label>
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
          
          <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 mb-4">
            <p className="text-sm text-amber-700 text-center">
              إجمالي الجوائز الشهرية: <strong>{formatPrice((leaderboard_rewards?.first || 50000) + (leaderboard_rewards?.second || 30000) + (leaderboard_rewards?.third || 15000))}</strong>
            </p>
          </div>

          <button
            onClick={handleSaveLeaderboardRewards}
            disabled={saving}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            حفظ جوائز الصدارة
          </button>
        </div>
      </div>

      {/* Performance Levels Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-l from-purple-500 to-indigo-500 p-4 text-white">
          <div className="flex items-center gap-3">
            <Award size={24} />
            <div>
              <h2 className="font-bold text-lg">مستويات أداء السائقين</h2>
              <p className="text-sm text-white/80">حدد عدد الطلبات المطلوبة لكل مستوى</p>
            </div>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Level Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
          <div className="bg-gray-50 rounded-xl p-4 mt-4">
            <h3 className="font-bold text-gray-700 mb-4">تعديل الحدود (عدد الطلبات الشهرية)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
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
                <label className="block text-sm font-medium text-gray-600 mb-1">
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
                <label className="block text-sm font-medium text-gray-600 mb-1">
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
                <label className="block text-sm font-medium text-gray-600 mb-1">
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
              className="mt-4 bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
              حفظ مستويات الأداء
            </button>
          </div>
        </div>
      </div>

      {/* Working Hours Section */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-l from-blue-500 to-cyan-500 p-4 text-white">
          <div className="flex items-center gap-3">
            <Clock size={24} />
            <div>
              <h2 className="font-bold text-lg">ساعات عمل التوصيل</h2>
              <p className="text-sm text-white/80">حدد أوقات العمل المسموحة للسائقين</p>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-4">
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
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
                <label className="block text-sm font-medium text-gray-600 mb-2">
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
            <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
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
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
            حفظ ساعات العمل
          </button>
        </div>
      </div>
    </div>
  );
};

const LevelCard = ({ icon, name, color, range, description }) => (
  <div 
    className="p-3 rounded-xl text-center"
    style={{ backgroundColor: `${color}15`, border: `1px solid ${color}30` }}
  >
    <span className="text-2xl">{icon}</span>
    <h4 className="font-bold mt-1" style={{ color }}>{name}</h4>
    <p className="text-sm font-medium text-gray-700">{range} طلب</p>
    <p className="text-xs text-gray-500 mt-1">{description}</p>
  </div>
);

export default DeliverySettingsTab;
