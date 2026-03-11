/**
 * حساب المسافة بين نقطتين باستخدام صيغة Haversine
 * @param {number} lat1 - خط العرض للنقطة الأولى
 * @param {number} lon1 - خط الطول للنقطة الأولى
 * @param {number} lat2 - خط العرض للنقطة الثانية
 * @param {number} lon2 - خط الطول للنقطة الثانية
 * @returns {number} المسافة بالكيلومترات
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // نصف قطر الأرض بالكيلومترات
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRad = (deg) => deg * (Math.PI / 180);

/**
 * تقدير الوقت المتوقع للوصول
 * @param {number} distanceKm - المسافة بالكيلومترات
 * @param {number} avgSpeedKmh - السرعة المتوسطة (افتراضي 25 كم/ساعة للمدينة)
 * @returns {number} الوقت بالدقائق
 */
export const estimateTime = (distanceKm, avgSpeedKmh = 25) => {
  return Math.round((distanceKm / avgSpeedKmh) * 60);
};

/**
 * إحداثيات المناطق الشائعة في دمشق وسوريا
 * هذه إحداثيات تقريبية لمراكز المناطق
 */
export const SYRIA_LOCATIONS = {
  // دمشق
  'دمشق': { lat: 33.5138, lon: 36.2765 },
  'المزة': { lat: 33.4989, lon: 36.2456 },
  'المالكي': { lat: 33.5167, lon: 36.2833 },
  'أبو رمانة': { lat: 33.5189, lon: 36.2789 },
  'كفرسوسة': { lat: 33.4922, lon: 36.2658 },
  'المهاجرين': { lat: 33.5267, lon: 36.2956 },
  'الشعلان': { lat: 33.5122, lon: 36.2867 },
  'باب توما': { lat: 33.5133, lon: 36.3144 },
  'الصالحية': { lat: 33.5211, lon: 36.2922 },
  'الحمرا': { lat: 33.5089, lon: 36.2811 },
  'ساحة الأمويين': { lat: 33.5156, lon: 36.2867 },
  'جرمانا': { lat: 33.4833, lon: 36.3333 },
  'صحنايا': { lat: 33.4333, lon: 36.2167 },
  'قدسيا': { lat: 33.5500, lon: 36.2333 },
  'دمر': { lat: 33.5333, lon: 36.2000 },
  'المعضمية': { lat: 33.4500, lon: 36.2167 },
  'داريا': { lat: 33.4500, lon: 36.2333 },
  
  // حلب
  'حلب': { lat: 36.2021, lon: 37.1343 },
  'الشهباء': { lat: 36.2100, lon: 37.1400 },
  'العزيزية': { lat: 36.1950, lon: 37.1500 },
  
  // حمص
  'حمص': { lat: 34.7324, lon: 36.7137 },
  
  // اللاذقية
  'اللاذقية': { lat: 35.5317, lon: 35.7900 },
  
  // طرطوس
  'طرطوس': { lat: 34.8894, lon: 35.8867 },
};

/**
 * الحصول على إحداثيات منطقة من العنوان
 * @param {string} address - العنوان
 * @param {string} city - المدينة
 * @returns {{ lat: number, lon: number } | null}
 */
export const getLocationFromAddress = (address, city) => {
  // البحث في المناطق المعروفة
  const fullAddress = `${address || ''} ${city || ''}`.toLowerCase();
  
  for (const [name, coords] of Object.entries(SYRIA_LOCATIONS)) {
    if (fullAddress.includes(name.toLowerCase()) || 
        name.toLowerCase().includes(city?.toLowerCase() || '')) {
      return coords;
    }
  }
  
  // إذا لم نجد المنطقة، نستخدم مركز المدينة
  if (city) {
    const cityCoords = SYRIA_LOCATIONS[city];
    if (cityCoords) return cityCoords;
  }
  
  // افتراضي: مركز دمشق
  return SYRIA_LOCATIONS['دمشق'];
};

/**
 * حساب المسافات للطلب
 * @param {Object} driverLocation - موقع السائق { lat, lon }
 * @param {Object} order - بيانات الطلب
 * @returns {{ toSeller: number, toCustomer: number, total: number, estimatedTime: number }}
 */
export const calculateOrderDistances = (driverLocation, order) => {
  // موقع البائع/المطعم
  const sellerAddress = order.seller_addresses?.[0];
  const sellerLocation = getLocationFromAddress(
    sellerAddress?.address,
    sellerAddress?.city || order.delivery_city
  );
  
  // موقع العميل
  const customerLocation = getLocationFromAddress(
    order.buyer_address?.address || order.delivery_address,
    order.buyer_address?.city || order.delivery_city
  );
  
  // حساب المسافات
  const toSeller = calculateDistance(
    driverLocation.lat, driverLocation.lon,
    sellerLocation.lat, sellerLocation.lon
  );
  
  const toCustomer = calculateDistance(
    sellerLocation.lat, sellerLocation.lon,
    customerLocation.lat, customerLocation.lon
  );
  
  const total = toSeller + toCustomer;
  
  return {
    toSeller: Math.round(toSeller * 10) / 10, // تقريب لرقم عشري واحد
    toCustomer: Math.round(toCustomer * 10) / 10,
    total: Math.round(total * 10) / 10,
    estimatedTime: estimateTime(total)
  };
};

/**
 * الحصول على موقع المستخدم الحالي
 * @returns {Promise<{ lat: number, lon: number }>}
 */
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('المتصفح لا يدعم تحديد الموقع'));
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        });
      },
      (error) => {
        // في حالة الفشل، نستخدم موقع افتراضي (دمشق)
        console.log('تعذر الحصول على الموقع:', error.message);
        resolve(SYRIA_LOCATIONS['دمشق']);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000 // استخدام موقع محفوظ لمدة دقيقة
      }
    );
  });
};

/**
 * تنسيق المسافة للعرض
 * @param {number} distanceKm - المسافة بالكيلومترات
 * @returns {string}
 */
export const formatDistance = (distanceKm) => {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} م`;
  }
  return `${distanceKm.toFixed(1)} كم`;
};
