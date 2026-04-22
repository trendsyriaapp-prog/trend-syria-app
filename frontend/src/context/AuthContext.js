// /app/frontend/src/context/AuthContext.js
// 🔒 نظام المصادقة عبر httpOnly Cookies
// أكثر أماناً من localStorage - يحمي من هجمات XSS

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import logger from '../lib/logger';

const API = process.env.REACT_APP_BACKEND_URL;

const AuthContext = createContext(null);

// 🔒 إعداد axios لإرسال Cookies مع كل طلب
axios.defaults.withCredentials = true;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  // نحتفظ بـ token للتوافق مع المكونات القديمة فقط
  // لكن لا نحفظه في localStorage
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  
  // flag لمنع fetchUser بعد login مباشرة (لأن login يُعيد بيانات المستخدم)
  const skipFetchUserRef = useRef(false);
  // flag لمنع التحقق المتكرر
  const isCheckingAuthRef = useRef(false);

  const logout = useCallback(async () => {
    try {
      // 🔒 استدعاء API لمسح الكوكيز من السيرفر
      await axios.post(`${API}/api/auth/logout`);
    } catch (error) {
      // نتجاهل الخطأ - الأهم هو مسح البيانات المحلية
      logger.log('Logout API call failed, clearing local state anyway');
    }
    
    // مسح البيانات المحلية
    localStorage.removeItem('user');
    localStorage.removeItem('forcePasswordChange');
    // لا نحذف token من localStorage لأنه لم يعد موجوداً هناك
    
    setToken(null);
    setUser(null);
    setForcePasswordChange(false);
  }, []);

  // إعداد axios interceptor لمعالجة الأخطاء
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error.response?.status;
        
        // إذا كان الخطأ 401 (رمز غير صالح أو منتهي الصلاحية)
        // تجاهل خطأ 401 أثناء عملية تسجيل الدخول
        if (status === 401 && user && !skipFetchUserRef.current) {
          logger.log('Token expired or invalid, logging out...');
          logout();
          window.location.href = '/login';
        }
        
        // لا نُخرج المستخدم عند أخطاء السيرفر (500+) أو أخطاء الشبكة
        // هذه أخطاء مؤقتة ويجب إعادة المحاولة
        
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [user, logout]);

  // 🔒 التحقق من المصادقة عند بدء التطبيق
  // الآن نعتمد على الكوكيز - لا نحتاج localStorage للـ token
  useEffect(() => {
    const checkAuth = async () => {
      // تجنب التحقق المتكرر
      if (isCheckingAuthRef.current) return;
      isCheckingAuthRef.current = true;
      
      // إذا تم تعيين skipFetchUser، لا نستدعي fetchUser
      if (skipFetchUserRef.current) {
        skipFetchUserRef.current = false;
        setLoading(false);
        isCheckingAuthRef.current = false;
        return;
      }
      
      try {
        // 🔒 نحاول جلب بيانات المستخدم - الكوكيز ستُرسل تلقائياً
        const res = await axios.get(`${API}/api/auth/me`);
        setUser(res.data);
        setToken('valid'); // قيمة رمزية فقط للتوافق
        
        // التحقق من حالة تغيير كلمة المرور
        const savedForceChange = localStorage.getItem('forcePasswordChange');
        if (savedForceChange === 'true') {
          setForcePasswordChange(true);
        }
      } catch (error) {
        // 401 يعني لا توجد كوكيز صالحة - المستخدم غير مسجل
        // هذا طبيعي للمستخدمين الجدد
        if (error.response?.status === 401) {
          logger.log('No valid session, user needs to login');
        } else {
          logger.log('Auth check failed:', error.message);
        }
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
        isCheckingAuthRef.current = false;
      }
    };
    
    checkAuth();
  }, []); // يعمل مرة واحدة فقط عند بدء التطبيق

  const fetchUser = async (retryCount = 0) => {
    const maxRetries = 2;
    
    try {
      const res = await axios.get(`${API}/api/auth/me`);
      setUser(res.data);
      setToken('valid'); // قيمة رمزية
    } catch (error) {
      logger.error('fetchUser error:', error);
      
      // التحقق من نوع الخطأ
      const status = error.response?.status;
      const isNetworkError = !error.response;
      const isServerError = status >= 500;
      const isTimeoutError = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
      
      // إذا كان خطأ مؤقت (شبكة، سيرفر، timeout) - نحاول مرة أخرى
      if ((isNetworkError || isServerError || isTimeoutError) && retryCount < maxRetries) {
        logger.log(`Retrying fetchUser (attempt ${retryCount + 2}/${maxRetries + 1})...`);
        // انتظار قبل إعادة المحاولة
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return fetchUser(retryCount + 1);
      }
      
      // إذا كان 401 (غير مصرح) - نُخرج المستخدم
      if (status === 401) {
        logout();
        return;
      }
      
      // إذا كان خطأ آخر بعد استنفاد المحاولات - نبقي المستخدم
      if (isNetworkError || isServerError || isTimeoutError) {
        logger.log('Server temporarily unavailable, keeping user session');
        return;
      }
      
      // أي خطأ آخر غير معروف
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (phone, password, skipApi = false) => {
    // إذا تم التحقق من OTP مسبقاً، نستخدم البيانات المحفوظة
    if (skipApi) {
      const savedUser = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (savedUser.id) {
        skipFetchUserRef.current = true;
        setUser(savedUser);
        setToken('valid');
        setLoading(false);
        return { user: savedUser };
      }
    }
    
    // 🔒 الطلب يُرسل الكوكيز تلقائياً ويستقبل كوكيز جديدة
    const res = await axios.post(`${API}/api/auth/login`, { phone, password });
    
    // التحقق إذا كان يحتاج OTP
    if (res.data.requires_otp) {
      return res.data;  // إرجاع للتعامل معه في صفحة الدخول
    }
    
    // منع fetchUser من الاستدعاء لأننا سنعيّن البيانات مباشرة
    skipFetchUserRef.current = true;
    
    // 🔒 لا نحفظ token في localStorage - الكوكيز ستُدير المصادقة
    // نحفظ فقط بيانات المستخدم للعرض
    localStorage.setItem('user', JSON.stringify(res.data.user));
    
    setUser(res.data.user);
    setToken('valid'); // قيمة رمزية للتوافق
    setLoading(false);
    
    // التحقق من إجبار تغيير كلمة المرور
    if (res.data.force_password_change) {
      localStorage.setItem('forcePasswordChange', 'true');
      setForcePasswordChange(true);
    }
    
    return res.data;
  };

  // دالة لتحديث بيانات المستخدم (للأدوار المتعددة)
  const updateUser = (newUserData) => {
    setUser(prev => ({ ...prev, ...newUserData }));
    localStorage.setItem('user', JSON.stringify({ ...user, ...newUserData }));
  };

  const register = async (data) => {
    // 🔒 الطلب يستقبل كوكيز جديدة تلقائياً
    const res = await axios.post(`${API}/api/auth/register`, data);
    
    // منع fetchUser من الاستدعاء لأننا سنعيّن البيانات مباشرة
    skipFetchUserRef.current = true;
    
    // 🔒 لا نحفظ token في localStorage
    localStorage.setItem('user', JSON.stringify(res.data.user));
    
    setUser(res.data.user);
    setToken('valid');
    setLoading(false);
    return res.data;
  };

  const changePassword = async (currentPassword, newPassword) => {
    const res = await axios.post(`${API}/api/auth/change-password`, {
      current_password: currentPassword,
      new_password: newPassword
    });
    
    // إزالة حالة إجبار تغيير كلمة المرور
    localStorage.removeItem('forcePasswordChange');
    setForcePasswordChange(false);
    
    return res.data;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      register, 
      logout, 
      loading, 
      fetchUser,
      changePassword,
      forcePasswordChange,
      setForcePasswordChange,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
