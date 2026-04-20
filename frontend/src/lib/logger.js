/**
 * Production-safe Logger Utility
 * يستبدل console.log/warn/error بنظام تسجيل آمن للإنتاج
 * 
 * في بيئة التطوير: يعرض جميع الرسائل
 * في بيئة الإنتاج: يخفي الرسائل العادية ويُظهر الأخطاء فقط
 */

const isDevelopment = process.env.NODE_ENV === 'development';

const logger = {
  /**
   * سجل رسالة عادية (تظهر فقط في التطوير)
   */
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * سجل تحذير (تظهر فقط في التطوير)
   */
  warn: (...args) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  /**
   * سجل خطأ (تظهر دائماً - مهمة للتتبع)
   */
  error: (...args) => {
    console.error(...args);
    // يمكن إضافة إرسال الأخطاء لخدمة مراقبة مثل Sentry هنا
  },

  /**
   * سجل معلومات التصحيح (تظهر فقط في التطوير)
   */
  debug: (...args) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  /**
   * سجل معلومات (تظهر فقط في التطوير)
   */
  info: (...args) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  /**
   * مجموعة من الرسائل (تظهر فقط في التطوير)
   */
  group: (label) => {
    if (isDevelopment) {
      console.group(label);
    }
  },

  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd();
    }
  },

  /**
   * جدول بيانات (تظهر فقط في التطوير)
   */
  table: (data) => {
    if (isDevelopment) {
      console.table(data);
    }
  },

  /**
   * قياس الوقت (تظهر فقط في التطوير)
   */
  time: (label) => {
    if (isDevelopment) {
      console.time(label);
    }
  },

  timeEnd: (label) => {
    if (isDevelopment) {
      console.timeEnd(label);
    }
  }
};

export default logger;
