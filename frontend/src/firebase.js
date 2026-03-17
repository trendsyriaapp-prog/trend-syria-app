// /app/frontend/src/firebase.js
// تهيئة Firebase للإشعارات

import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
let app = null;
let messaging = null;

const initializeFirebase = async () => {
  try {
    // Check if messaging is supported
    const supported = await isSupported();
    if (!supported) {
      console.log('Firebase Messaging is not supported in this browser');
      return null;
    }

    if (!app) {
      app = initializeApp(firebaseConfig);
    }
    
    if (!messaging) {
      messaging = getMessaging(app);
    }
    
    return messaging;
  } catch (error) {
    console.error('Error initializing Firebase:', error);
    return null;
  }
};

// Get FCM token
export const getFCMToken = async () => {
  try {
    const messagingInstance = await initializeFirebase();
    if (!messagingInstance) return null;

    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Get token
    const token = await getToken(messagingInstance, {
      vapidKey: process.env.REACT_APP_VAPID_KEY
    });

    if (token) {
      console.log('FCM Token:', token.substring(0, 20) + '...');
      return token;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
};

// Listen for foreground messages
export const onMessageListener = () => {
  return new Promise(async (resolve) => {
    const messagingInstance = await initializeFirebase();
    if (!messagingInstance) {
      resolve(null);
      return;
    }

    onMessage(messagingInstance, (payload) => {
      console.log('Foreground message received:', payload);
      resolve(payload);
    });
  });
};

// Setup foreground message handler
export const setupForegroundHandler = async (callback) => {
  const messagingInstance = await initializeFirebase();
  if (!messagingInstance) return () => {};

  return onMessage(messagingInstance, (payload) => {
    console.log('Message received in foreground:', payload);
    
    // Show notification manually in foreground
    if (payload.notification) {
      const { title, body, icon, image } = payload.notification;
      
      // Create and show notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body,
          icon: icon || '/images/logo.png',
          image,
          badge: '/images/badge.png',
          tag: 'trend-syria-notification',
          renotify: true
        });
      }
      
      // Call callback for UI update
      if (callback) {
        callback(payload);
      }
    }
  });
};

export { initializeFirebase };
