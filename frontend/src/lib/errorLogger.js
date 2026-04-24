// /app/frontend/src/lib/errorLogger.js
// نظام تسجيل الأخطاء المركزي - Frontend

import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * تسجيل خطأ في النظام المركزي
 * @param {Object} errorInfo - معلومات الخطأ
 * @param {string} errorInfo.error_type - نوع الخطأ (frontend, api, payment, etc.)
 * @param {string} errorInfo.error_message - رسالة الخطأ
 * @param {string} errorInfo.error_stack - Stack trace (اختياري)
 * @param {string} errorInfo.component - اسم المكون (اختياري)
 * @param {Object} errorInfo.additional_data - بيانات إضافية (اختياري)
 */
export const logError = async (errorInfo) => {
  try {
    // لا نسجل أخطاء الشبكة العادية (offline)
    if (!navigator.onLine) return;
    
    // لا نسجل أخطاء معينة غير مهمة
    const ignoredErrors = [
      'ResizeObserver loop',
      'Loading chunk',
      'Network Error',
      'timeout of',
      'Request aborted'
    ];
    
    if (ignoredErrors.some(ie => errorInfo.error_message?.includes(ie))) {
      return;
    }
    
    await axios.post(`${API}/api/errors/log`, {
      error_type: errorInfo.error_type || 'frontend',
      error_message: errorInfo.error_message || 'Unknown error',
      error_stack: errorInfo.error_stack || null,
      url: window.location.href,
      component: errorInfo.component || null,
      additional_data: errorInfo.additional_data || null
    });
  } catch (e) {
    // فشل تسجيل الخطأ - لا نفعل شيء لتجنب حلقة لا نهائية
    console.warn('[ErrorLogger] Failed to log error:', e.message);
  }
};

/**
 * تسجيل خطأ API
 * @param {Error} error - كائن الخطأ من axios
 * @param {string} endpoint - اسم الـ API endpoint
 */
export const logApiError = (error, endpoint) => {
  // لا نسجل أخطاء 401 (غير مصادق) - طبيعية
  if (error.response?.status === 401) return;
  
  // لا نسجل أخطاء 404 (غير موجود) - قد تكون طبيعية
  if (error.response?.status === 404) return;
  
  logError({
    error_type: 'api',
    error_message: error.response?.data?.detail || error.message,
    error_stack: error.stack,
    component: endpoint,
    additional_data: {
      status: error.response?.status,
      method: error.config?.method,
      url: error.config?.url
    }
  });
};

/**
 * تسجيل خطأ React Component
 * @param {Error} error - كائن الخطأ
 * @param {Object} errorInfo - معلومات من React
 * @param {string} componentName - اسم المكون
 */
export const logComponentError = (error, errorInfo, componentName) => {
  logError({
    error_type: 'frontend',
    error_message: error.message,
    error_stack: error.stack,
    component: componentName,
    additional_data: {
      componentStack: errorInfo?.componentStack
    }
  });
};

/**
 * تسجيل خطأ دفع
 * @param {string} message - رسالة الخطأ
 * @param {Object} paymentData - بيانات الدفع (بدون معلومات حساسة)
 */
export const logPaymentError = (message, paymentData) => {
  logError({
    error_type: 'payment',
    error_message: message,
    additional_data: {
      payment_method: paymentData?.method,
      amount: paymentData?.amount,
      // لا نسجل بيانات البطاقة أو كلمات المرور!
    }
  });
};

// تسجيل الأخطاء غير المعالجة تلقائياً
if (typeof window !== 'undefined') {
  // أخطاء JavaScript غير المعالجة
  window.addEventListener('error', (event) => {
    logError({
      error_type: 'frontend',
      error_message: event.message,
      error_stack: event.error?.stack,
      additional_data: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      }
    });
  });

  // Promise rejections غير المعالجة
  window.addEventListener('unhandledrejection', (event) => {
    logError({
      error_type: 'frontend',
      error_message: event.reason?.message || String(event.reason),
      error_stack: event.reason?.stack,
      additional_data: {
        type: 'unhandledrejection'
      }
    });
  });
}

export default { logError, logApiError, logComponentError, logPaymentError };
