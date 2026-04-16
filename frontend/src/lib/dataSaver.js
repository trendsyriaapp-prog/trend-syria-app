/**
 * إعدادات توفير البيانات للإنترنت البطيء
 * يسمح للمستخدم بالتحكم في جودة الصور والفيديو
 */

const STORAGE_KEY = 'data_saver_settings';

// الإعدادات الافتراضية
const DEFAULT_SETTINGS = {
  enabled: false,           // هل وضع التوفير مفعّل؟
  imageQuality: 'auto',     // 'auto' | 'low' | 'medium' | 'high'
  loadVideos: true,         // تحميل الفيديوهات تلقائياً
  loadAnimations: true,     // تشغيل الأنيميشن
  preloadImages: true,      // تحميل الصور مسبقاً
};

// إعدادات الجودة
const QUALITY_SETTINGS = {
  low: {
    imageMaxWidth: 400,
    imageQuality: 0.5,
    thumbnailSize: 100,
    description: 'جودة منخفضة - توفير أكبر للبيانات'
  },
  medium: {
    imageMaxWidth: 800,
    imageQuality: 0.7,
    thumbnailSize: 200,
    description: 'جودة متوسطة - توازن جيد'
  },
  high: {
    imageMaxWidth: 1200,
    imageQuality: 0.9,
    thumbnailSize: 400,
    description: 'جودة عالية - أفضل مظهر'
  },
  auto: {
    // يتم تحديدها بناءً على سرعة الإنترنت
    description: 'تلقائي - يتكيف مع سرعة الإنترنت'
  }
};

/**
 * قراءة الإعدادات من التخزين المحلي
 */
export const getDataSaverSettings = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Error reading data saver settings:', e);
  }
  return DEFAULT_SETTINGS;
};

/**
 * حفظ الإعدادات
 */
export const saveDataSaverSettings = (settings) => {
  try {
    const newSettings = { ...getDataSaverSettings(), ...settings };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
    
    // إخطار المستمعين بالتغيير
    window.dispatchEvent(new CustomEvent('dataSaverChanged', { detail: newSettings }));
    
    return newSettings;
  } catch (e) {
    console.error('Error saving data saver settings:', e);
    return getDataSaverSettings();
  }
};

/**
 * تفعيل/تعطيل وضع توفير البيانات
 */
export const toggleDataSaver = (enabled) => {
  return saveDataSaverSettings({ enabled });
};

/**
 * الحصول على إعدادات الجودة الحالية
 */
export const getCurrentQualitySettings = () => {
  const settings = getDataSaverSettings();
  
  if (!settings.enabled) {
    return QUALITY_SETTINGS.high;
  }
  
  if (settings.imageQuality === 'auto') {
    // تحديد الجودة بناءً على سرعة الإنترنت
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      const effectiveType = connection.effectiveType;
      
      if (effectiveType === 'slow-2g' || effectiveType === '2g') {
        return QUALITY_SETTINGS.low;
      } else if (effectiveType === '3g') {
        return QUALITY_SETTINGS.medium;
      } else {
        return QUALITY_SETTINGS.high;
      }
    }
    
    // افتراضي: جودة متوسطة
    return QUALITY_SETTINGS.medium;
  }
  
  return QUALITY_SETTINGS[settings.imageQuality] || QUALITY_SETTINGS.medium;
};

/**
 * التحقق إذا كان يجب تحميل الفيديو
 */
export const shouldLoadVideo = () => {
  const settings = getDataSaverSettings();
  return !settings.enabled || settings.loadVideos;
};

/**
 * التحقق إذا كان يجب تشغيل الأنيميشن
 */
export const shouldShowAnimations = () => {
  const settings = getDataSaverSettings();
  return !settings.enabled || settings.loadAnimations;
};

/**
 * التحقق إذا كان يجب تحميل الصور مسبقاً
 */
export const shouldPreloadImages = () => {
  const settings = getDataSaverSettings();
  return !settings.enabled || settings.preloadImages;
};

/**
 * Hook للاستماع لتغييرات الإعدادات
 */
export const useDataSaverListener = (callback) => {
  if (typeof window !== 'undefined') {
    window.addEventListener('dataSaverChanged', (e) => callback(e.detail));
    return () => window.removeEventListener('dataSaverChanged', callback);
  }
  return () => {};
};

/**
 * الحصول على معلومات الاتصال
 */
export const getConnectionInfo = () => {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  
  if (!connection) {
    return {
      type: 'unknown',
      effectiveType: 'unknown',
      downlink: null,
      rtt: null,
      saveData: false
    };
  }
  
  return {
    type: connection.type || 'unknown',
    effectiveType: connection.effectiveType || 'unknown',
    downlink: connection.downlink, // Mbps
    rtt: connection.rtt, // ms
    saveData: connection.saveData || false
  };
};

/**
 * تقدير جودة الإنترنت
 */
export const estimateConnectionQuality = () => {
  const info = getConnectionInfo();
  
  if (info.effectiveType === 'slow-2g' || info.effectiveType === '2g') {
    return { quality: 'poor', label: 'ضعيف', color: 'red' };
  } else if (info.effectiveType === '3g') {
    return { quality: 'fair', label: 'متوسط', color: 'yellow' };
  } else if (info.effectiveType === '4g') {
    return { quality: 'good', label: 'جيد', color: 'green' };
  }
  
  // تقدير بناءً على RTT
  if (info.rtt !== null) {
    if (info.rtt > 500) {
      return { quality: 'poor', label: 'ضعيف', color: 'red' };
    } else if (info.rtt > 200) {
      return { quality: 'fair', label: 'متوسط', color: 'yellow' };
    } else {
      return { quality: 'good', label: 'جيد', color: 'green' };
    }
  }
  
  return { quality: 'unknown', label: 'غير معروف', color: 'gray' };
};

export { QUALITY_SETTINGS, DEFAULT_SETTINGS };
