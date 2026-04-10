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
  'timeout': 'انتهت مهلة الاتصال، يرجى المحاولة مرة أخرى',
  'store not found': 'المتجر غير موجود',
  'product not found': 'المنتج غير موجود',
  'order not found': 'الطلب غير موجود',
  'user not found': 'المستخدم غير موجود',
  'insufficient balance': 'الرصيد غير كافٍ',
  'out of stock': 'المنتج غير متوفر حالياً',
};

/**
 * ترجمة رسالة خطأ من الإنجليزية للعربية
 */
const translateError = (msg) => {
  if (!msg || typeof msg !== 'string') return msg;
  
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
