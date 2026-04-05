import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    free_shipping_threshold: 150000,
    delivery_fees: {
      same_city: 3000,
      nearby: 5000,
      medium: 8000,
      far: 12000
    }
  });
  
  // إعدادات المنصة (تفعيل/إيقاف الأقسام)
  const [platformSettings, setPlatformSettings] = useState({
    food_enabled: true,
    shop_enabled: true,
    delivery_enabled: true,
    wallet_enabled: true,
    referral_enabled: true,
    daily_deals_enabled: true,
    flash_sales_enabled: true
  });
  
  const [loading, setLoading] = useState(true);

  // جلب الإعدادات عند تحميل التطبيق
  useEffect(() => {
    fetchAllSettings();
  }, []);

  const fetchAllSettings = async () => {
    try {
      const [settingsRes, platformRes] = await Promise.all([
        axios.get(`${API}/api/settings/public`).catch(() => ({ data: {} })),
        axios.get(`${API}/api/admin/settings/public`).catch(() => ({ data: {} }))
      ]);
      
      if (settingsRes.data) {
        setSettings(prev => ({ ...prev, ...settingsRes.data }));
      }
      
      if (platformRes.data) {
        setPlatformSettings(prev => ({ ...prev, ...platformRes.data }));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // تحديث الإعدادات (يُستدعى بعد تعديل المدير)
  const refreshSettings = async () => {
    await fetchAllSettings();
  };

  // دالة للتحقق من تفعيل قسم معين
  const isFeatureEnabled = (feature) => {
    return platformSettings[feature] ?? true;
  };

  return (
    <SettingsContext.Provider value={{ 
      settings, 
      platformSettings,
      loading, 
      refreshSettings,
      isFeatureEnabled
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    // بدلاً من رمي خطأ، نعيد قيم افتراضية للتوافق
    console.warn('useSettings called outside SettingsProvider, using defaults');
    return {
      settings: { free_shipping_threshold: 150000 },
      platformSettings: { food_enabled: true },
      loading: false,
      refreshSettings: async () => {},
      isFeatureEnabled: () => true
    };
  }
  return context;
};
