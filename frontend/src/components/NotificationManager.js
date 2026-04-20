// /app/frontend/src/components/NotificationManager.js
// مدير إشعارات Firebase

import { useEffect, useState, useCallback, useRef } from 'react';
import logger from '../lib/logger';
import axios from 'axios';
import { requestNotificationPermission, onMessageListener } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const NotificationManager = () => {
  const { user, token: authToken } = useAuth();
  const { toast } = useToast();
  const [fcmToken, setFcmToken] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const initialized = useRef(false);

  // حفظ FCM Token في السيرفر
  const saveFcmToken = useCallback(async (fcmTokenValue) => {
    if (!authToken || !fcmTokenValue) return;
    
    try {
      // استخدام API الجديد لتسجيل Token
      await axios.post(
        `${API}/api/push/register-token`, 
        { token: fcmTokenValue, device_type: 'web' },
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      logger.log('✅ FCM Token saved to server');
    } catch (error) {
      // محاولة API القديم كـ fallback
      try {
        await axios.post(
          `${API}/api/notifications/fcm-token`, 
          { fcm_token: fcmTokenValue },
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        logger.log('✅ FCM Token saved to server (fallback)');
      } catch (fallbackError) {
        logger.error('Error saving FCM token:', fallbackError);
      }
    }
  }, [authToken]);

  // طلب إذن الإشعارات
  const initNotifications = useCallback(async () => {
    if (initialized.current) return;
    
    try {
      // التحقق من دعم الإشعارات
      if (!('Notification' in window)) {
        logger.log('Notifications not supported');
        return;
      }

      const permission = Notification.permission;
      setNotificationPermission(permission);

      if (permission === 'granted') {
        const token = await requestNotificationPermission();
        if (token) {
          setFcmToken(token);
          if (user && authToken) {
            await saveFcmToken(token);
          }
        }
        initialized.current = true;
      } else if (permission === 'default') {
        // طلب الإذن فقط إذا لم يُسأل من قبل
        const token = await requestNotificationPermission();
        if (token) {
          setFcmToken(token);
          setNotificationPermission('granted');
          if (user && authToken) {
            await saveFcmToken(token);
          }
        }
        initialized.current = true;
      }
    } catch (error) {
      logger.error('Error initializing notifications:', error);
    }
  }, [user, authToken, saveFcmToken]);

  // تهيئة الإشعارات عند تسجيل الدخول
  useEffect(() => {
    if (user && authToken) {
      initNotifications();
    }
  }, [user, authToken, initNotifications]);

  // حفظ التوكن عند تغيير المستخدم
  useEffect(() => {
    if (fcmToken && user && authToken) {
      saveFcmToken(fcmToken);
    }
  }, [fcmToken, user, authToken, saveFcmToken]);

  // الاستماع للإشعارات الواردة (التطبيق مفتوح)
  useEffect(() => {
    let isSubscribed = true;

    const setupMessageListener = async () => {
      try {
        const payload = await onMessageListener();
        if (payload && isSubscribed) {
          // عرض الإشعار كـ Toast
          toast({
            title: payload.notification?.title || 'إشعار جديد',
            description: payload.notification?.body || '',
            duration: 5000,
          });
          
          // تشغيل صوت الإشعار (اختياري)
          try {
            const audio = new Audio('/notification-sound.mp3');
            audio.volume = 0.3;
            audio.play().catch(() => {});
          } catch (e) {}
        }
      } catch (err) {
        if (isSubscribed) {
          logger.log('Message listener error:', err);
        }
      }
    };

    if (notificationPermission === 'granted') {
      setupMessageListener();
    }

    return () => {
      isSubscribed = false;
    };
  }, [toast, notificationPermission]);

  // هذا المكون لا يعرض شيء - فقط يدير الإشعارات
  return null;
};

export default NotificationManager;
