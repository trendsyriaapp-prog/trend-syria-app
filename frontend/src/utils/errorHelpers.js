// /app/frontend/src/utils/errorHelpers.js
// دوال مساعدة لمعالجة أخطاء الـ API

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
    return detail;
  }
  
  // إذا كان مصفوفة (أخطاء Pydantic validation)
  if (Array.isArray(detail)) {
    return detail.map(d => {
      if (typeof d === 'string') return d;
      return d.msg || d.message || JSON.stringify(d);
    }).join(', ');
  }
  
  // إذا كان كائن له msg
  if (detail?.msg) {
    return detail.msg;
  }
  
  // إذا كان كائن له message
  if (detail?.message) {
    return detail.message;
  }
  
  // الرسالة الافتراضية
  return defaultMsg;
};

export default getErrorMessage;
