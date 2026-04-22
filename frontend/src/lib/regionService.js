/**
 * خدمة التحقق من المناطق المسموحة
 * ================================
 * 
 * تُستخدم للتحقق من أن منطقة التوصيل مسموحة قبل إتمام الطلب
 * 
 * هذه الميزة مؤقتة - للإزالة لاحقاً:
 * 1. احذف هذا الملف
 * 2. احذف استدعاء checkRegionAllowed من CheckoutPage و FoodCartPage
 * 3. احذف import من الملفات المستخدمة
 */

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Cache للإعدادات لتجنب الاستدعاءات المتكررة
let cachedSettings = null;
let cacheExpiry = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

/**
 * جلب إعدادات المناطق المسموحة
 */
export const fetchAllowedRegions = async () => {
  const now = Date.now();
  
  // استخدام الـ Cache إذا كان صالحاً
  if (cachedSettings && now < cacheExpiry) {
    return cachedSettings;
  }
  
  try {
    const response = await fetch(`${API_URL}/api/settings/allowed-regions`);
    const data = await response.json();
    
    // تخزين في الـ Cache
    cachedSettings = data;
    cacheExpiry = now + CACHE_DURATION;
    
    return data;
  } catch (error) {
    console.error('Error fetching allowed regions:', error);
    // في حالة الخطأ، السماح (لا نريد حظر الطلبات بسبب خطأ تقني)
    return { enabled: false, cities: [], blocked_message: '' };
  }
};

/**
 * التحقق من أن المنطقة مسموحة للتوصيل
 * 
 * @param {string} city - اسم المحافظة
 * @param {string} area - اسم المنطقة/الحي
 * @returns {Object} - { allowed: boolean, message: string }
 */
export const checkRegionAllowed = async (city, area) => {
  const settings = await fetchAllowedRegions();
  
  // إذا كان النظام معطل، السماح بالكل
  if (!settings.enabled) {
    return { allowed: true, message: '' };
  }
  
  // البحث عن المحافظة
  const cityData = settings.cities.find(c => c.name === city);
  
  if (!cityData) {
    return { 
      allowed: false, 
      message: settings.blocked_message || 'عذراً، الخدمة غير متاحة حالياً في هذه المحافظة. نحن نعمل على التوسع!'
    };
  }
  
  // التحقق من المنطقة
  // إذا كانت المحافظة موجودة بدون مناطق محددة، نسمح لكل المناطق
  if (!cityData.regions || cityData.regions.length === 0) {
    return { allowed: true, message: '' };
  }
  
  // البحث عن المنطقة (مقارنة مرنة)
  const regionAllowed = cityData.regions.some(r => 
    r === area || 
    r.includes(area) || 
    area.includes(r) ||
    normalizeArabicText(r) === normalizeArabicText(area)
  );
  
  if (regionAllowed) {
    return { allowed: true, message: '' };
  }
  
  return { 
    allowed: false, 
    message: settings.blocked_message || 'عذراً، الخدمة غير متاحة حالياً في هذه المنطقة. نحن نعمل على التوسع!'
  };
};

/**
 * تطبيع النص العربي للمقارنة
 */
const normalizeArabicText = (text) => {
  if (!text) return '';
  return text
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * مسح الـ Cache (يُستخدم عند تحديث الإعدادات من لوحة الإدارة)
 */
export const clearRegionCache = () => {
  cachedSettings = null;
  cacheExpiry = 0;
};
