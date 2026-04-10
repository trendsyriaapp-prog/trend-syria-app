// /app/frontend/src/utils/errorHelpers.js
// دوال مساعدة لمعالجة أخطاء الـ API

// قاموس ترجمة رسائل الخطأ الشائعة
const ERROR_TRANSLATIONS = {
  'field required': 'هذا الحقل مطلوب',
  'Field required': 'هذا الحقل مطلوب',
  'Missing': 'هذا الحقل مطلوب',
  'missing': 'هذا الحقل مطلوب',
  'value is not a valid integer': 'يجب أن تكون القيمة رقماً صحيحاً',
  'value is not a valid float': 'يجب أن تكون القيمة رقماً',
  'value is not a valid email': 'البريد الإلكتروني غير صحيح',
  'Invalid credentials': 'بيانات الدخول غير صحيحة',
  'Invalid token': 'جلسة غير صالحة، يرجى تسجيل الدخول مجدداً',
  'Token expired': 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً',
  'Not authenticated': 'يجب تسجيل الدخول',
  'Not authorized': 'غير مصرح لك بهذا الإجراء',
  'Permission denied': 'غير مصرح لك بهذا الإجراء',
  'Not found': 'العنصر غير موجود أو تم حذفه',
  'Not Found': 'العنصر غير موجود أو تم حذفه',
  'Server error': 'خطأ في الخادم، يرجى المحاولة لاحقاً',
  'Network error': 'خطأ في الاتصال، تحقق من الإنترنت',
  'Internal server error': 'خطأ داخلي في الخادم، يرجى المحاولة لاحقاً',
  'Bad request': 'طلب غير صحيح، يرجى التحقق من البيانات',
  'Unauthorized': 'يجب تسجيل الدخول للمتابعة',
  'Forbidden': 'غير مصرح لك بهذا الإجراء',
  'Input should be a valid string': 'يجب إدخال نص صحيح',
  'Input should be a valid integer': 'يجب إدخال رقم صحيح',
  'Input should be a valid number': 'يجب إدخال رقم صحيح',
  'String should have at least': 'يجب أن يكون طول النص على الأقل',
  'ensure this value': 'قيمة غير صالحة',
  'already registered': 'مسجل مسبقاً، يرجى تسجيل الدخول',
  'already exists': 'موجود مسبقاً',
  'phone already': 'رقم الهاتف مسجل مسبقاً',
  'email already': 'البريد الإلكتروني مسجل مسبقاً',
  'invalid phone': 'رقم الهاتف غير صحيح',
  'invalid password': 'كلمة المرور غير صحيحة',
  'password too short': 'كلمة المرور قصيرة جداً',
  'passwords do not match': 'كلمات المرور غير متطابقة',
  'file too large': 'حجم الملف كبير جداً',
  'invalid file type': 'نوع الملف غير مدعوم',
  'upload failed': 'فشل رفع الملف، يرجى المحاولة مرة أخرى',
  'connection refused': 'فشل الاتصال بالخادم',
  'timeout': 'الخادم مشغول، يرجى المحاولة بعد لحظات',
  'timed out': 'الخادم مشغول، يرجى المحاولة بعد لحظات',
  'store not found': 'المتجر غير موجود',
  'product not found': 'المنتج غير موجود',
  'order not found': 'الطلب غير موجود',
  'user not found': 'المستخدم غير موجود',
  'insufficient balance': 'الرصيد غير كافٍ',
  'out of stock': 'المنتج غير متوفر حالياً',
  // أخطاء قاعدة البيانات والسيرفر - يجب إخفاؤها
  'mongodb': 'الخادم مشغول حالياً، يرجى المحاولة بعد لحظات',
  'database': 'الخادم مشغول حالياً، يرجى المحاولة بعد لحظات',
  'connection error': 'مشكلة في الاتصال، يرجى المحاولة مرة أخرى',
  'server busy': 'الخادم مشغول، يرجى المحاولة بعد لحظات',
  'service unavailable': 'الخدمة غير متاحة حالياً، يرجى المحاولة لاحقاً',
  'temporarily unavailable': 'الخدمة غير متاحة مؤقتاً، يرجى المحاولة بعد لحظات',
};

// أنماط للكشف عن الأخطاء التقنية التي يجب إخفاؤها
const TECHNICAL_ERROR_PATTERNS = [
  /mongodb/i,
  /\.mongodb\.net/i,
  /pymongo/i,
  /motor/i,
  /:\d{4,5}/,  // أرقام المنافذ مثل :27017
  /shard-\d+/i,
  /replica/i,
  /connection.*pool/i,
  /socket/i,
  /tcp/i,
  /dns/i,
  /ssl/i,
  /certificate/i,
  /traceback/i,
  /exception/i,
  /error.*line \d+/i,
  /file ".*\.py"/i,
];

/**
 * التحقق إذا كانت الرسالة تحتوي على تفاصيل تقنية
 */
const isTechnicalError = (msg) => {
  if (!msg || typeof msg !== 'string') return false;
  return TECHNICAL_ERROR_PATTERNS.some(pattern => pattern.test(msg));
};

/**
 * ترجمة رسالة خطأ من الإنجليزية للعربية
 */
const translateError = (msg) => {
  if (!msg || typeof msg !== 'string') return msg;
  
  // إذا كانت رسالة تقنية - نُرجع رسالة عامة
  if (isTechnicalError(msg)) {
    return 'الخادم مشغول حالياً، يرجى المحاولة بعد لحظات';
  }
  
  // البحث عن ترجمة مطابقة
  for (const [eng, ar] of Object.entries(ERROR_TRANSLATIONS)) {
    if (msg.toLowerCase().includes(eng.toLowerCase())) {
      return ar;
    }
  }
  
  return msg;
};

/**
 * استخراج رسالة الخطأ من استجابة الـ API
 * @param {Error} error - كائن الخطأ من axios
 * @param {string} defaultMsg - الرسالة الافتراضية
 * @returns {string} رسالة الخطأ
 */
export const getErrorMessage = (error, defaultMsg = "حدث خطأ") => {
  // أخطاء الشبكة (لا يوجد response)
  if (!error?.response) {
    if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      return 'الخادم مشغول، يرجى المحاولة بعد لحظات';
    }
    if (error?.message?.includes('Network')) {
      return 'مشكلة في الاتصال، تحقق من الإنترنت';
    }
    return 'مشكلة في الاتصال بالخادم';
  }
  
  // أخطاء السيرفر (500+)
  const status = error.response?.status;
  if (status >= 500) {
    return 'الخادم مشغول حالياً، يرجى المحاولة بعد لحظات';
  }
  
  const detail = error?.response?.data?.detail;
  
  // إذا كان نص عادي
  if (typeof detail === 'string') {
    return translateError(detail);
  }
  
  // إذا كان مصفوفة (أخطاء Pydantic validation)
  if (Array.isArray(detail)) {
    return detail.map(d => {
      if (typeof d === 'string') return translateError(d);
      const msg = d.msg || d.message || JSON.stringify(d);
      return translateError(msg);
    }).join('، ');
  }
  
  // إذا كان كائن له msg
  if (detail?.msg) {
    return translateError(detail.msg);
  }
  
  // إذا كان كائن له message
  if (detail?.message) {
    return translateError(detail.message);
  }
  
  // الرسالة الافتراضية
  return defaultMsg;
};

export default getErrorMessage;
