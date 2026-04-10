// /app/frontend/src/hooks/usePushNotifications.js
// Hook لإدارة إشعارات Push - متوافق مع جميع المكونات

import { useState, useEffect, useCallback } from 'react';
import { getFCMToken, setupForegroundHandler } from '../firebase';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Capacitor } from '@capacitor/core';

const API = process.env.REACT_APP_BACKEND_URL;

// التحقق إذا كان التطبيق يعمل داخل Capacitor (Android/iOS)
const isNativeApp = () => {
  try {
    // طريقة 1: Capacitor API
    if (Capacitor.isNativePlatform()) {
      return true;
    }
    // طريقة 2: التحقق من platform
    if (Capacitor.getPlatform() === 'android' || Capacitor.getPlatform() === 'ios') {
      return true;
    }
    // طريقة 3: التحقق من User Agent (TrendSyria-App)
    if (navigator.userAgent.includes('TrendSyria-App')) {
      return true;
    }
    // طريقة 4: التحقق من window.Capacitor
    if (window.Capacitor?.isNativePlatform?.()) {
      return true;
    }
    return false;
  } catch {
    // طريقة احتياطية: User Agent
    return navigator.userAgent.includes('TrendSyria-App');
  }
};

const usePushNotifications = (userType = null) => {
  const { token: authToken, user } = useAuth();
  const [fcmToken, setFcmToken] = useState(null);
  const [permission, setPermission] = useState('default');
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // للتوافق مع المكونات القديمة
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isNative, setIsNative] = useState(false);

  // التحقق من دعم الإشعارات
  useEffect(() => {
    const checkSupport = () => {
      // إذا كان التطبيق يعمل داخل Capacitor (Android/iOS)
      // الإشعارات تُدار بواسطة Capacitor Push Notifications plugin
      if (isNativeApp()) {
        setIsNative(true);
        setIsSupported(true); // مدعوم عبر Native
        setIsSubscribed(true); // نفترض أنها مفعّلة في التطبيق
        return true;
      }
      
      // للمتصفحات العادية
      if (!('Notification' in window)) {
        setIsSupported(false);
        setError('المتصفح لا يدعم الإشعارات');
        return false;
      }
      if (!('serviceWorker' in navigator)) {
        setIsSupported(false);
        setError('المتصفح لا يدعم Service Workers');
        return false;
      }
      return true;
    };

    if (checkSupport() && !isNativeApp()) {
      setPermission(Notification.permission);
      setIsSubscribed(Notification.permission === 'granted');
    }
  }, []);

  // تسجيل Service Worker - فقط للمتصفحات وليس للتطبيق الأصلي
  useEffect(() => {
    // لا تسجل Service Worker في تطبيق Capacitor
    if (isNativeApp()) return;
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((registration) => {
          console.log('Firebase SW registered:', registration.scope);
        })
        .catch((err) => {
          console.error('Firebase SW registration failed:', err);
        });
    }
  }, []);

  // طلب الإذن والحصول على Token
  const requestPermission = useCallback(async () => {
    // في التطبيق الأصلي، الإشعارات تُدار بواسطة Capacitor
    if (isNativeApp()) {
      setIsSubscribed(true);
      setPermission('granted');
      return 'native-app';
    }
    
    if (!isSupported) return null;
    
    setLoading(true);
    setIsLoading(true);
    setError(null);

    try {
      // طلب الإذن
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        setError('تم رفض إذن الإشعارات');
        setLoading(false);
        setIsLoading(false);
        return null;
      }

      // الحصول على FCM Token
      const token = await getFCMToken();
      
      if (token) {
        setFcmToken(token);
        setIsSubscribed(true);
        
        // تسجيل Token في الخادم
        if (authToken) {
          try {
            await axios.post(`${API}/api/push/register-token`, {
              token: token,
              device_type: 'web'
            }, {
              headers: { Authorization: `Bearer ${authToken}` }
            });
            console.log('FCM Token registered with server');
          } catch (err) {
            console.error('Failed to register token with server:', err);
          }
        }
      }

      setLoading(false);
      setIsLoading(false);
      return token;
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      setError(err.message);
      setLoading(false);
      setIsLoading(false);
      return null;
    }
  }, [isSupported, authToken]);

  // دالة subscribe للتوافق مع المكونات القديمة
  const subscribe = useCallback(async () => {
    return await requestPermission();
  }, [requestPermission]);

  // تسجيل Token عند تسجيل الدخول
  useEffect(() => {
    if (authToken && user && permission === 'granted' && !fcmToken) {
      requestPermission();
    }
  }, [authToken, user, permission, fcmToken, requestPermission]);

  // إعداد معالج الإشعارات في الواجهة
  useEffect(() => {
    if (permission !== 'granted') return;

    const handleForegroundMessage = (payload) => {
      console.log('Foreground notification:', payload);
    };

    setupForegroundHandler(handleForegroundMessage);
  }, [permission]);

  // إلغاء تسجيل Token
  const unregisterToken = useCallback(async () => {
    if (!fcmToken || !authToken) return;

    try {
      await axios.delete(`${API}/api/push/unregister-token`, {
        params: { token: fcmToken },
        headers: { Authorization: `Bearer ${authToken}` }
      });
      setFcmToken(null);
      setIsSubscribed(false);
      console.log('FCM Token unregistered');
    } catch (err) {
      console.error('Failed to unregister token:', err);
    }
  }, [fcmToken, authToken]);

  // دالة unsubscribe للتوافق
  const unsubscribe = useCallback(async () => {
    return await unregisterToken();
  }, [unregisterToken]);

  return {
    // الخصائص الجديدة
    fcmToken,
    permission,
    loading,
    error,
    isSupported,
    isNative,
    requestPermission,
    unregisterToken,
    
    // الخصائص للتوافق مع المكونات القديمة
    isLoading,
    isSubscribed,
    subscribe,
    unsubscribe
  };
};

export default usePushNotifications;
