/**
 * مساعد الموقع الجغرافي
 * يتعامل مع GPS ويطلب من المستخدم تفعيله إذا كان مغلقاً
 */

// فتح إعدادات الموقع في الهاتف (للتطبيقات المحلية)
export const openLocationSettings = () => {
  // للأندرويد عبر Capacitor
  if (window.Capacitor?.isNativePlatform()) {
    try {
      // محاولة فتح إعدادات الموقع عبر Capacitor
      if (window.Capacitor.Plugins?.App) {
        window.Capacitor.Plugins.App.openUrl({ url: 'app-settings:' });
      }
    } catch (e) {
      console.log('Could not open settings:', e);
    }
  }
};

// التحقق من حالة الموقع والحصول عليه
export const getCurrentLocation = (options = {}) => {
  return new Promise((resolve, reject) => {
    // التحقق من دعم المتصفح للـ Geolocation
    if (!navigator.geolocation) {
      reject({
        code: 0,
        message: 'متصفحك لا يدعم خدمة الموقع',
        type: 'NOT_SUPPORTED'
      });
      return;
    }

    const defaultOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
      ...options
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        let errorInfo = {
          code: error.code,
          message: '',
          type: ''
        };

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorInfo.message = 'تم رفض الوصول للموقع. يرجى تفعيل صلاحية الموقع من إعدادات الهاتف.';
            errorInfo.type = 'PERMISSION_DENIED';
            break;
          case error.POSITION_UNAVAILABLE:
            errorInfo.message = 'خدمة الموقع غير متاحة. يرجى تفعيل GPS من إعدادات الهاتف.';
            errorInfo.type = 'POSITION_UNAVAILABLE';
            break;
          case error.TIMEOUT:
            errorInfo.message = 'انتهت مهلة الحصول على الموقع. حاول مرة أخرى.';
            errorInfo.type = 'TIMEOUT';
            break;
          default:
            errorInfo.message = 'حدث خطأ في الحصول على الموقع.';
            errorInfo.type = 'UNKNOWN';
        }

        reject(errorInfo);
      },
      defaultOptions
    );
  });
};

// مكون لعرض رسالة تفعيل الموقع
export const LocationErrorMessages = {
  PERMISSION_DENIED: {
    title: 'صلاحية الموقع مرفوضة',
    message: 'يرجى السماح للتطبيق بالوصول لموقعك من إعدادات الهاتف',
    action: 'فتح الإعدادات'
  },
  POSITION_UNAVAILABLE: {
    title: 'الموقع غير متاح',
    message: 'يرجى تفعيل خدمة الموقع (GPS) من إعدادات الهاتف',
    action: 'فتح الإعدادات'
  },
  TIMEOUT: {
    title: 'انتهت المهلة',
    message: 'تأكد من تفعيل GPS وأنك في مكان مفتوح',
    action: 'إعادة المحاولة'
  },
  NOT_SUPPORTED: {
    title: 'غير مدعوم',
    message: 'متصفحك لا يدعم خدمة الموقع',
    action: null
  }
};
