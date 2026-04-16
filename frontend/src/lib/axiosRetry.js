/**
 * Axios مع إعادة المحاولة التلقائية
 * مُحسّن للإنترنت البطيء والمتقطع في سوريا
 */

import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

// إعدادات إعادة المحاولة
const RETRY_CONFIG = {
  maxRetries: 3,           // أقصى عدد محاولات
  retryDelay: 2000,        // تأخير بين المحاولات (2 ثانية)
  retryableStatuses: [408, 429, 500, 502, 503, 504], // حالات HTTP قابلة للإعادة
  timeout: 30000,          // مهلة الطلب (30 ثانية)
};

/**
 * إنشاء axios instance مع retry
 */
const createAxiosWithRetry = (config = {}) => {
  const instance = axios.create({
    baseURL: API,
    timeout: config.timeout || RETRY_CONFIG.timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Interceptor للطلبات - إضافة التوكن
  instance.interceptors.request.use(
    (config) => {
      // إضافة التوكن إذا موجود
      try {
        const authData = localStorage.getItem('auth');
        if (authData) {
          const { token } = JSON.parse(authData);
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
      } catch (e) {}
      
      // إضافة عداد المحاولات
      config._retryCount = config._retryCount || 0;
      
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Interceptor للاستجابات - إعادة المحاولة عند الفشل
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const config = error.config;
      
      // التحقق من إمكانية إعادة المحاولة
      if (!config || config._retryCount >= RETRY_CONFIG.maxRetries) {
        return Promise.reject(error);
      }

      // التحقق من نوع الخطأ
      const shouldRetry = 
        !error.response || // فشل الشبكة
        RETRY_CONFIG.retryableStatuses.includes(error.response?.status) || // أخطاء قابلة للإعادة
        error.code === 'ECONNABORTED' || // timeout
        error.code === 'ERR_NETWORK'; // خطأ شبكة

      if (!shouldRetry) {
        return Promise.reject(error);
      }

      // زيادة عداد المحاولات
      config._retryCount += 1;
      
      console.log(`🔄 إعادة المحاولة ${config._retryCount}/${RETRY_CONFIG.maxRetries} - ${config.url}`);

      // انتظار قبل إعادة المحاولة (exponential backoff)
      const delay = RETRY_CONFIG.retryDelay * Math.pow(2, config._retryCount - 1);
      await new Promise(resolve => setTimeout(resolve, delay));

      // إعادة المحاولة
      return instance(config);
    }
  );

  return instance;
};

// Instance افتراضي
const axiosRetry = createAxiosWithRetry();

/**
 * طلب GET مع retry
 */
export const fetchWithRetry = async (url, options = {}) => {
  try {
    const response = await axiosRetry.get(url, options);
    return response.data;
  } catch (error) {
    console.error(`❌ فشل الطلب بعد ${RETRY_CONFIG.maxRetries} محاولات:`, url);
    throw error;
  }
};

/**
 * طلب POST مع retry
 */
export const postWithRetry = async (url, data, options = {}) => {
  try {
    const response = await axiosRetry.post(url, data, options);
    return response.data;
  } catch (error) {
    console.error(`❌ فشل الطلب بعد ${RETRY_CONFIG.maxRetries} محاولات:`, url);
    throw error;
  }
};

/**
 * طلب PUT مع retry
 */
export const putWithRetry = async (url, data, options = {}) => {
  try {
    const response = await axiosRetry.put(url, data, options);
    return response.data;
  } catch (error) {
    console.error(`❌ فشل الطلب بعد ${RETRY_CONFIG.maxRetries} محاولات:`, url);
    throw error;
  }
};

/**
 * طلب DELETE مع retry
 */
export const deleteWithRetry = async (url, options = {}) => {
  try {
    const response = await axiosRetry.delete(url, options);
    return response.data;
  } catch (error) {
    console.error(`❌ فشل الطلب بعد ${RETRY_CONFIG.maxRetries} محاولات:`, url);
    throw error;
  }
};

export { createAxiosWithRetry, RETRY_CONFIG };
export default axiosRetry;
