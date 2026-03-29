import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('forcePasswordChange');
    setToken(null);
    setUser(null);
    setForcePasswordChange(false);
    delete axios.defaults.headers.common['Authorization'];
  }, []);

  // إعداد axios interceptor لمعالجة خطأ 401
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        // إذا كان الخطأ 401 (رمز غير صالح أو منتهي الصلاحية)
        if (error.response?.status === 401 && token) {
          console.log('Token expired or invalid, logging out...');
          logout();
          // توجيه لصفحة الدخول
          window.location.href = '/login';
        }
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
      fetchUser();
      // التحقق من حالة تغيير كلمة المرور
      const savedForceChange = localStorage.getItem('forcePasswordChange');
      if (savedForceChange === 'true') {
        setForcePasswordChange(true);
      }
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API}/api/auth/me`);
      setUser(res.data);
    } catch (error) {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (phone, password) => {
    const res = await axios.post(`${API}/api/auth/login`, { phone, password });
    const newToken = res.data.token;
    localStorage.setItem('token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(res.data.user);
    
    // التحقق من إجبار تغيير كلمة المرور
    if (res.data.force_password_change) {
      localStorage.setItem('forcePasswordChange', 'true');
      setForcePasswordChange(true);
    }
    
    return res.data;
  };

  const register = async (data) => {
    const res = await axios.post(`${API}/api/auth/register`, data);
    const newToken = res.data.token;
    localStorage.setItem('token', newToken);
    axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    setToken(newToken);
    setUser(res.data.user);
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
      setForcePasswordChange
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
