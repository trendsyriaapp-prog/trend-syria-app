// /app/frontend/src/config/firebase.js
// إعدادات Firebase للإشعارات

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyA7ml-NqGBoOjjGGQ7MIt_-EPElvQBiKwY",
  authDomain: "trend-syria-90b5a.firebaseapp.com",
  projectId: "trend-syria-90b5a",
  storageBucket: "trend-syria-90b5a.appspot.com",
  messagingSenderId: "154439677377",
  appId: "1:154439677377:web:1aab558c5a5fceaa82ab40"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);

// تهيئة Messaging
let messaging = null;
try {
  messaging = getMessaging(app);
} catch (error) {
  console.log('Firebase Messaging not supported in this browser');
}

// طلب إذن الإشعارات والحصول على Token
export const requestNotificationPermission = async () => {
  try {
    if (!messaging) {
      console.log('Messaging not available');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // الحصول على FCM Token
      const token = await getToken(messaging, {
        vapidKey: 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U' // VAPID key افتراضي
      });
      
      console.log('FCM Token:', token);
      return token;
    } else {
      console.log('Notification permission denied');
      return null;
    }
  } catch (error) {
    console.error('Error getting notification permission:', error);
    return null;
  }
};

// الاستماع للإشعارات الواردة (عندما التطبيق مفتوح)
export const onMessageListener = () => {
  return new Promise((resolve) => {
    if (!messaging) {
      resolve(null);
      return;
    }
    
    onMessage(messaging, (payload) => {
      console.log('Message received:', payload);
      resolve(payload);
    });
  });
};

export { app, messaging };
