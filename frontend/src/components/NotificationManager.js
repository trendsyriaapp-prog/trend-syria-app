// /app/frontend/src/components/NotificationManager.js
// مدير إشعارات Firebase

import { useEffect, useState } from 'react';
import axios from 'axios';
import { requestNotificationPermission, onMessageListener } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const NotificationManager = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [fcmToken, setFcmToken] = useState(null);

  useEffect(() => {
    // طلب إذن الإشعارات عند تحميل التطبيق
    const initNotifications = async () => {
      try {
        const token = await requestNotificationPermission();
        if (token) {
          setFcmToken(token);
          
          // إرسال التوكن للسيرفر إذا كان المستخدم مسجل
          if (user) {
            await saveFcmToken(token);
          }
        }
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };

    initNotifications();
  }, [user]);

  // حفظ FCM Token في السيرفر
  const saveFcmToken = async (token) => {
    try {
      await axios.post(`${API}/api/notifications/fcm-token`, {
        fcm_token: token
      });
      console.log('✅ FCM Token saved to server');
    } catch (error) {
      console.error('Error saving FCM token:', error);
    }
  };

  // الاستماع للإشعارات الواردة (التطبيق مفتوح)
  useEffect(() => {
    const unsubscribe = onMessageListener()
      .then((payload) => {
        if (payload) {
          // عرض الإشعار كـ Toast
          toast({
            title: payload.notification?.title || 'إشعار جديد',
            description: payload.notification?.body || '',
          });
        }
      })
      .catch((err) => console.log('Failed to receive message:', err));

    return () => {
      // Cleanup if needed
    };
  }, [toast]);

  // هذا المكون لا يعرض شيء - فقط يدير الإشعارات
  return null;
};

export default NotificationManager;
