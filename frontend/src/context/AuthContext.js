import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  
  // flag لمنع fetchUser بعد login مباشرة (لأن login يُعيد بيانات المستخدم)
  const skipFetchUserRef = useRef(false);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('forcePasswordChange');
    setToken(null);
    setUser(null);
    setForcePasswordChange(false);
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  // إعداد axios interceptor لمعالجة الأخطاء
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const status = error.response?.status;
        
        // إذا كان الخطأ 401 (رمز غير صالح أو منتهي الصلاحية)
        // تجاهل خطأ 401 أثناء عملية تسجيل الدخول
        if (status === 401 && token && !skipFetchUserRef.current) {
          console.log('Token expired or invalid, logging out...');
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
  }, [token, logout]);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // إذا تم تعيين skipFetchUser، لا نستدعي fetchUser (لأن login أعاد البيانات)
      if (skipFetchUserRef.current) {
        skipFetchUserRef.current = false;
        setLoading(false);
      } else {
        fetchUser();
      }
      
      // التحقق من حالة تغيير كلمة المرور
      const savedForceChange = localStorage.getItem('forcePasswordChange');
      if (savedForceChange === 'true') {
        setForcePasswordChange(true);
      }
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async (retryCount = 0) => {
    const maxRetries = 2;
    
    try {
      const res = await axios.get(`${API}/api/auth/me`);
      setUser(res.data);
    } catch (error) {
      console.error('fetchUser error:', error);
      
      // التحقق من نوع الخطأ
      const status = error.response?.status;
      const isNetworkError = !error.response;
      const isServerError = status >= 500;
      const isTimeoutError = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
      
      // إذا كان خطأ مؤقت (شبكة، سيرفر، timeout) - نحاول مرة أخرى
      if ((isNetworkError || isServerError || isTimeoutError) && retryCount < maxRetries) {
        console.log(`Retrying fetchUser (attempt ${retryCount + 2}/${maxRetries + 1})...`);
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
      // لكن نُظهر له الصفحة الرئيسية بدون بيانات المستخدم
      if (isNetworkError || isServerError || isTimeoutError) {
        console.log('Server temporarily unavailable, keeping user session');
        // لا نُخرج المستخدم - ربما الخادم مؤقتاً غير متاح
        // المستخدم سيرى الصفحة وعند التفاعل سيتم إعادة المحاولة
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
      const savedToken = localStorage.getItem('token');
      
      if (savedToken && savedUser.id) {
        skipFetchUserRef.current = true;
        axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
        setUser(savedUser);
        setToken(savedToken);
        setLoading(false);
        return { user: savedUser, token: savedToken };
      }
    }
    
    const res = await axios.post(`${API}/api/auth/login`, { phone, password });
    
    // التحقق إذا كان يحتاج OTP
    if (res.data.requires_otp) {
      return res.data;  // إرجاع للتعامل معه في صفحة الدخول
    }
    
    const newToken = res.data.token;
    
    // منع fetchUser من الاستدعاء لأننا سنعيّن البيانات مباشرة
    skipFetchUserRef.current = true;
    
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setUser(res.data.user);  // تعيين المستخدم أولاً
    setToken(newToken);       // ثم تعيين التوكن
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
    const res = await axios.post(`${API}/api/auth/register`, data);
    const newToken = res.data.token;
    
    // منع fetchUser من الاستدعاء لأننا سنعيّن البيانات مباشرة
    skipFetchUserRef.current = true;
    
    localStorage.setItem('token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setUser(res.data.user);  // تعيين المستخدم أولاً
    setToken(newToken);       // ثم تعيين التوكن
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
      updateUser  // 🆕 لتحديث بيانات المستخدم
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
