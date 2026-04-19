// /app/frontend/src/config/firebase.js
// إعدادات Firebase للإشعارات

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyCFQTtfozQ_hQ-XQ5gMI8WoRRvs85poqxU",
  authDomain: "trend-syria-c0176.firebaseapp.com",
  projectId: "trend-syria-c0176",
  storageBucket: "trend-syria-c0176.firebasestorage.app",
  messagingSenderId: "207729030923",
  appId: "1:207729030923:web:9eb0fb08f02e43435b140e",
  measurementId: "G-YTFZ6574V8"
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
const VAPID_KEY = 'BCllBqcOB7f26ZQo4FdSrVFgpkdAoTypujdv-qRdGxFLOhMliGrN6HUILDw2-8jjobU5kxdF-y_Fa2CQMvs1VzE';

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
