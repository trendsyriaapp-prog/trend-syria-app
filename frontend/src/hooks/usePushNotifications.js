import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Hook لإدارة إشعارات Push
 * يسمح بالاشتراك وإلغاء الاشتراك من الإشعارات
 */
export const usePushNotifications = (userType = null) => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState('default');
  const [error, setError] = useState(null);

  // التحقق من دعم المتصفح
  useEffect(() => {
    const checkSupport = () => {
      const supported = 'serviceWorker' in navigator && 
                       'PushManager' in window && 
                       'Notification' in window;
      setIsSupported(supported);
      
      if (supported) {
        setPermission(Notification.permission);
        checkSubscription();
      }
    };
    
    checkSupport();
  }, []);

  // التحقق من وجود اشتراك حالي
  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error('Error checking subscription:', err);
    }
  };

  // تسجيل Service Worker
  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw-push.js', {
        scope: '/'
      });
      console.log('Service Worker registered:', registration.scope);
      return registration;
    } catch (err) {
      console.error('Service Worker registration failed:', err);
      throw err;
    }
  };

  // تحويل المفتاح العام من Base64 URL Safe
  const urlBase64ToUint8Array = (base64String) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  // الاشتراك في الإشعارات
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError('المتصفح لا يدعم إشعارات Push');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // طلب إذن الإشعارات
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== 'granted') {
        setError('تم رفض إذن الإشعارات');
        setIsLoading(false);
        return false;
      }

      // تسجيل Service Worker
      const registration = await registerServiceWorker();
      await navigator.serviceWorker.ready;

      // الحصول على المفتاح العام من الخادم
      const keyResponse = await axios.get(`${API}/push/vapid-public-key`);
      const vapidPublicKey = keyResponse.data.publicKey;

      // إنشاء الاشتراك
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // إرسال الاشتراك للخادم
      const subscriptionJSON = subscription.toJSON();
      await axios.post(`${API}/push/subscribe`, {
        subscription: {
          endpoint: subscriptionJSON.endpoint,
          keys: subscriptionJSON.keys
        },
        user_type: userType
      });

      setIsSubscribed(true);
      console.log('Push notification subscribed successfully');
      return true;
    } catch (err) {
      console.error('Subscription error:', err);
      setError(err.message || 'فشل في الاشتراك');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, userType]);

  // إلغاء الاشتراك
  const unsubscribe = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // إلغاء الاشتراك محلياً
        await subscription.unsubscribe();

        // إلغاء الاشتراك من الخادم
        const subscriptionJSON = subscription.toJSON();
        await axios.post(`${API}/push/unsubscribe`, {
          subscription: {
            endpoint: subscriptionJSON.endpoint,
            keys: subscriptionJSON.keys
          }
        });
      }

      setIsSubscribed(false);
      console.log('Push notification unsubscribed');
      return true;
    } catch (err) {
      console.error('Unsubscribe error:', err);
      setError(err.message || 'فشل في إلغاء الاشتراك');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // تبديل حالة الاشتراك
  const toggleSubscription = useCallback(async () => {
    if (isSubscribed) {
      return await unsubscribe();
    } else {
      return await subscribe();
    }
  }, [isSubscribed, subscribe, unsubscribe]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    error,
    subscribe,
    unsubscribe,
    toggleSubscription
  };
};

export default usePushNotifications;
