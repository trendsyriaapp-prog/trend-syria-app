// /app/frontend/src/hooks/usePushNotifications.js
// Hook لإدارة إشعارات Push

import { useState, useEffect, useCallback } from 'react';
import { getFCMToken, setupForegroundHandler } from '../firebase';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const usePushNotifications = () => {
  const { token: authToken, user } = useAuth();
  const [fcmToken, setFcmToken] = useState(null);
  const [permission, setPermission] = useState('default');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(true);

  // التحقق من دعم الإشعارات
  useEffect(() => {
    const checkSupport = () => {
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

    if (checkSupport()) {
      setPermission(Notification.permission);
    }
  }, []);

  // تسجيل Service Worker
  useEffect(() => {
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
    if (!isSupported) return null;
    
    setLoading(true);
    setError(null);

    try {
      // طلب الإذن
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        setError('تم رفض إذن الإشعارات');
        setLoading(false);
        return null;
      }

      // الحصول على FCM Token
      const token = await getFCMToken();
      
      if (token) {
        setFcmToken(token);
        
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
      return token;
    } catch (err) {
      console.error('Error requesting notification permission:', err);
      setError(err.message);
      setLoading(false);
      return null;
    }
  }, [isSupported, authToken]);

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
      // يمكن إضافة toast أو تحديث UI هنا
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
      console.log('FCM Token unregistered');
    } catch (err) {
      console.error('Failed to unregister token:', err);
    }
  }, [fcmToken, authToken]);

  return {
    fcmToken,
    permission,
    loading,
    error,
    isSupported,
    requestPermission,
    unregisterToken
  };
};

export default usePushNotifications;
