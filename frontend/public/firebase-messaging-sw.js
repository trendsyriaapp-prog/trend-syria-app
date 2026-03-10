// Firebase Messaging Service Worker
// هذا الملف مطلوب لاستقبال الإشعارات في الخلفية

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA7ml-NqGBoOjjGGQ7MIt_-EPElvQBiKwY",
  authDomain: "trend-syria-90b5a.firebaseapp.com",
  projectId: "trend-syria-90b5a",
  storageBucket: "trend-syria-90b5a.appspot.com",
  messagingSenderId: "154439677377",
  appId: "1:154439677377:web:1aab558c5a5fceaa82ab40"
});

const messaging = firebase.messaging();

// معالجة الإشعارات في الخلفية
messaging.onBackgroundMessage((payload) => {
  console.log('📬 Received background message:', payload);
  
  const notificationTitle = payload.notification?.title || 'ترند سورية';
  const notificationOptions = {
    body: payload.notification?.body || 'لديك إشعار جديد',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [100, 50, 100],
    data: payload.data || {},
    actions: [
      { action: 'open', title: 'فتح' },
      { action: 'close', title: 'إغلاق' }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// معالجة النقر على الإشعار
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    const urlToOpen = event.notification.data?.url || '/';
    event.waitUntil(
      clients.openWindow(urlToOpen)
    );
  }
});
