// /app/frontend/src/components/admin/ProductBadgesTab.js
// إعدادات شارات المنتجات للمدير

import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Save, 
  Truck, 
  Flame, 
  Eye, 
  ToggleLeft, 
  ToggleRight,
  Plus,
  Trash2,
  Palette
} from 'lucide-react';
import toast from 'react-hot-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const ProductBadgesTab = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API}/api/settings/product-badges`);
      setSettings(res.data);
    } catch (err) {
      console.error('Error fetching badge settings:', err);
      // إعدادات افتراضية
      setSettings({
        enabled: true,
        badge_types: {
          free_shipping: {
            enabled: true,
            messages: ['🚚 شحن مجاني', '💰 وفّرت التوصيل', '⚡ توصيل مجاني'],
            threshold: 50000
          },
          best_seller: {
            enabled: true,
            messages: ['🔥 الأكثر مبيعاً', '⭐ منتج مميز', '💎 الأعلى طلباً'],
            min_sales: 10
          },
          most_viewed: {
            enabled: true,
            messages: ['👁️ الأكثر زيارة', '🌟 رائج الآن', '📈 شائع'],
            min_views: 100
          }
        },
        rotation_speed: 3000,
        colors: ['#3B82F6', '#10B981', '#8B5CF6', '#991B1B']
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/settings/product-badges`, settings);
      toast.success('تم حفظ الإعدادات بنجاح');
    } catch (err) {
      toast.error('فشل في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  const toggleEnabled = () => {
    setSettings(prev => ({ ...prev, enabled: !prev.enabled }));
  };

  const toggleBadgeType = (type) => {
    setSettings(prev => ({
      ...prev,
      badge_types: {
        ...prev.badge_types,
        [type]: {
          ...prev.badge_types[type],
          enabled: !prev.badge_types[type].enabled
        }
      }
    }));
  };

  const updateMessage = (type, index, value) => {
    setSettings(prev => ({
      ...prev,
      badge_types: {
        ...prev.badge_types,
        [type]: {
          ...prev.badge_types[type],
          messages: prev.badge_types[type].messages.map((msg, i) => 
            i === index ? value : msg
          )
        }
      }
    }));
  };

  const updateThreshold = (type, field, value) => {
    setSettings(prev => ({
      ...prev,
      badge_types: {
        ...prev.badge_types,
        [type]: {
          ...prev.badge_types[type],
          [field]: parseInt(value) || 0
        }
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#FF6B00]"></div>
      </div>
    );
  }

  const badgeTypeConfig = [
    {
      key: 'free_shipping',
      title: 'شارة الشحن المجاني',
      icon: Truck,
      color: 'blue',
      thresholdLabel: 'حد السعر (ل.س)',
      thresholdField: 'threshold'
    },
    {
      key: 'best_seller',
      title: 'شارة الأكثر مبيعاً',
      icon: Flame,
      color: 'orange',
      thresholdLabel: 'الحد الأدنى للمبيعات',
      thresholdField: 'min_sales'
    },
    {
      key: 'most_viewed',
      title: 'شارة الأكثر زيارة',
      icon: Eye,
      color: 'purple',
      thresholdLabel: 'الحد الأدنى للمشاهدات',
      thresholdField: 'min_views'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">إعدادات شارات المنتجات</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-[#FF6B00] text-white px-4 py-2 rounded-lg hover:bg-[#E65100] disabled:opacity-50 transition-colors text-sm"
        >
          <Save size={16} />
          {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
        </button>
      </div>

      {/* التفعيل العام */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">تفعيل الشارات</h3>
            <p className="text-xs text-gray-500">عرض شارات متحركة على بطاقات المنتجات</p>
          </div>
          <button
            onClick={toggleEnabled}
            className={`p-1 rounded-lg transition-colors ${settings.enabled ? 'text-green-500' : 'text-gray-400'}`}
          >
            {settings.enabled ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
          </button>
        </div>
      </div>

      {/* سرعة الدوران */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <label className="block text-sm font-bold text-gray-900 mb-2">سرعة تبديل الرسائل (مللي ثانية)</label>
        <input
          type="number"
          value={settings.rotation_speed}
          onChange={(e) => setSettings(prev => ({ ...prev, rotation_speed: parseInt(e.target.value) || 3000 }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          min="1000"
          max="10000"
          step="500"
        />
        <p className="text-xs text-gray-500 mt-1">1000 = ثانية واحدة، 3000 = 3 ثواني</p>
      </div>

      {/* أنواع الشارات */}
      {badgeTypeConfig.map((config) => {
        const badgeType = settings.badge_types[config.key];
        return (
          <div key={config.key} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className={`flex items-center justify-between p-4 bg-${config.color}-50 border-b border-${config.color}-100`}>
              <div className="flex items-center gap-2">
                <config.icon size={20} className={`text-${config.color}-500`} />
                <h3 className="font-bold text-gray-900">{config.title}</h3>
              </div>
              <button
                onClick={() => toggleBadgeType(config.key)}
                className={`p-1 rounded-lg transition-colors ${badgeType.enabled ? 'text-green-500' : 'text-gray-400'}`}
              >
                {badgeType.enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
              </button>
            </div>

            {/* Content */}
            {badgeType.enabled && (
              <div className="p-4 space-y-4">
                {/* Threshold */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    {config.thresholdLabel}
                  </label>
                  <input
                    type="number"
                    value={badgeType[config.thresholdField]}
                    onChange={(e) => updateThreshold(config.key, config.thresholdField, e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                {/* Messages */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    الرسائل المتناوبة (3 رسائل)
                  </label>
                  <div className="space-y-2">
                    {badgeType.messages.map((msg, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold`}
                          style={{ backgroundColor: settings.colors[idx % settings.colors.length] }}>
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={msg}
                          onChange={(e) => updateMessage(config.key, idx, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          placeholder={`الرسالة ${idx + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">معاينة:</p>
                  <div className="flex gap-2 flex-wrap">
                    {badgeType.messages.map((msg, idx) => (
                      <span
                        key={idx}
                        className="text-white text-xs font-bold px-3 py-1 rounded-full"
                        style={{ backgroundColor: settings.colors[idx % settings.colors.length] }}
                      >
                        {msg}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* الألوان */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Palette size={18} className="text-gray-600" />
          <h3 className="font-bold text-gray-900">ألوان الشارات</h3>
        </div>
        <div className="flex gap-3 flex-wrap">
          {settings.colors.map((color, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={(e) => {
                  const newColors = [...settings.colors];
                  newColors[idx] = e.target.value;
                  setSettings(prev => ({ ...prev, colors: newColors }));
                }}
                className="w-10 h-10 rounded-lg cursor-pointer border-2 border-gray-200"
              />
              <span className="text-xs text-gray-500">لون {idx + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductBadgesTab;
