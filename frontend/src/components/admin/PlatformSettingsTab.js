// /app/frontend/src/components/admin/PlatformSettingsTab.js
// إعدادات المنصة - تفعيل/إيقاف الأقسام

import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Settings, UtensilsCrossed, ShoppingBag, Truck, Wallet, 
  Users, Flame, Zap, Save, RefreshCw
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useSettings } from '../../context/SettingsContext';

const API = process.env.REACT_APP_BACKEND_URL;

const PlatformSettingsTab = () => {
  const { toast } = useToast();
  const { refreshSettings } = useSettings();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/api/admin/settings`);
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({ title: "خطأ", description: "فشل تحميل الإعدادات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/admin/settings`, settings);
      // تحديث الإعدادات العامة في Context
      await refreshSettings();
      toast({ title: "تم الحفظ", description: "تم تحديث إعدادات المنصة - ستظهر التغييرات فوراً" });
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حفظ الإعدادات", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const SETTINGS_CONFIG = [
    {
      key: 'food_enabled',
      title: 'منصة الطعام 🍕',
      description: 'تفعيل قسم المطاعم وتوصيل الطعام',
      icon: UtensilsCrossed,
      color: 'from-orange-500 to-red-500'
    },
    {
      key: 'shop_enabled',
      title: 'منصة التسوق 🛒',
      description: 'تفعيل قسم التسوق والمنتجات',
      icon: ShoppingBag,
      color: 'from-blue-500 to-purple-500'
    },
    {
      key: 'delivery_enabled',
      title: 'خدمة التوصيل 🚚',
      description: 'تفعيل خدمة التوصيل وتسجيل السائقين',
      icon: Truck,
      color: 'from-green-500 to-teal-500'
    },
    {
      key: 'wallet_enabled',
      title: 'المحفظة الإلكترونية 💰',
      description: 'تفعيل المحفظة والدفع الإلكتروني',
      icon: Wallet,
      color: 'from-yellow-500 to-orange-500'
    },
    {
      key: 'referral_enabled',
      title: 'نظام الإحالة 👥',
      description: 'تفعيل برنامج دعوة الأصدقاء',
      icon: Users,
      color: 'from-pink-500 to-rose-500'
    },
    {
      key: 'daily_deals_enabled',
      title: 'صفقات اليوم 🔥',
      description: 'تفعيل عروض اليوم في الصفحة الرئيسية',
      icon: Flame,
      color: 'from-red-500 to-orange-500'
    },
    {
      key: 'flash_sales_enabled',
      title: 'عروض الفلاش ⚡',
      description: 'تفعيل عروض الفلاش والخصومات السريعة',
      icon: Zap,
      color: 'from-purple-500 to-indigo-500'
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl flex items-center justify-center">
            <Settings size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">إعدادات المنصة</h2>
            <p className="text-xs text-gray-500">تفعيل وإيقاف أقسام التطبيق</p>
          </div>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-green-600 disabled:opacity-50"
          data-testid="save-settings-btn"
        >
          {saving ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <Save size={16} />
          )}
          حفظ
        </button>
      </div>

      {/* Settings List */}
      <div className="space-y-3">
        {SETTINGS_CONFIG.map((config, index) => {
          const Icon = config.icon;
          const isEnabled = settings?.[config.key] ?? true;
          
          return (
            <motion.div
              key={config.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white rounded-xl border-2 p-4 transition-all ${
                isEnabled ? 'border-green-200' : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 bg-gradient-to-br ${config.color} rounded-xl flex items-center justify-center`}>
                    <Icon size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{config.title}</h3>
                    <p className="text-sm text-gray-500">{config.description}</p>
                  </div>
                </div>
                
                {/* Toggle Switch */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => handleToggle(config.key)}
                    className="sr-only peer"
                    data-testid={`toggle-${config.key}`}
                  />
                  <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
              
              {/* Status Badge */}
              <div className="mt-3 flex justify-end">
                <span className={`text-xs px-3 py-1 rounded-full ${
                  isEnabled 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  {isEnabled ? '✓ مفعّل' : '✗ متوقف'}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Warning Note */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <p className="text-sm text-yellow-800">
          <strong>⚠️ ملاحظة:</strong> عند إيقاف أي قسم، سيختفي من التطبيق للمستخدمين ولكن البيانات ستبقى محفوظة. يمكنك إعادة تفعيله في أي وقت.
        </p>
      </div>
    </div>
  );
};

export default PlatformSettingsTab;
