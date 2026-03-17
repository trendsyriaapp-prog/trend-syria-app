// /app/frontend/src/config/firebase.js
// إعدادات Firebase للإشعارات

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyA7ml-NqGBoOjjGGQ7MIt_-EPElvQBiKwY",
  authDomain: "trend-syria.firebaseapp.com",
  projectId: "trend-syria",
  storageBucket: "trend-syria.firebasestorage.app",
  messagingSenderId: "154439677377",
  appId: "1:154439677377:web:1aab558c5a5fceaa82ab40",
  measurementId: "G-9YDVDL56GX"
};

// تهيئة Firebase
let app = null;
let messaging = null;

const initializeFirebase = async () => {
  try {
    const supported = await isSupported();
    if (!supported) {
      console.log('Firebase Messaging not supported in this browser');
      return { app: null, messaging: null };
    }
    
    if (!app) {
      app = initializeApp(firebaseConfig);
    }
    
    if (!messaging) {
      messaging = getMessaging(app);
    }
    
    return { app, messaging };
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    return { app: null, messaging: null };
  }
};

// Initialize immediately
initializeFirebase();

// VAPID Key للمشروع
const VAPID_KEY = 'BEj7GLdDT7MElyacxbI23qQnWIgYqVVBGzESmZgyUeehvwPSMXj8a4ntZ7xdBNSM8BGI9WgS_Adncl1aemaK7ZA';

// طلب إذن الإشعارات والحصول على Token
export const requestNotificationPermission = async () => {
  try {
    const { messaging: msg } = await initializeFirebase();
    
    if (!msg) {
      console.log('Messaging not available');
      return null;
    }

    // التحقق من دعم Service Worker
    if (!('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // تسجيل Service Worker أولاً
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      
      // الحصول على FCM Token
      const token = await getToken(msg, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration
      });
      
      console.log('✅ FCM Token:', token?.substring(0, 20) + '...');
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
  return new Promise(async (resolve) => {
    const { messaging: msg } = await initializeFirebase();
    
    if (!msg) {
      resolve(null);
      return;
    }
    
    onMessage(msg, (payload) => {
      console.log('Message received:', payload);
      resolve(payload);
    });
  });
};

// للتصدير للملفات الأخرى
export const getFCMToken = requestNotificationPermission;
export const setupForegroundHandler = async (callback) => {
  const { messaging: msg } = await initializeFirebase();
  if (!msg) return () => {};
  
  return onMessage(msg, (payload) => {
    if (callback) callback(payload);
  });
};

export { app, messaging, initializeFirebase };
