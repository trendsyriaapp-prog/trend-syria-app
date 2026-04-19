// Firebase Cloud Messaging Service Worker
// هذا الملف يعالج الإشعارات في الخلفية

importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

// Firebase configuration
firebase.initializeApp({
  apiKey: "AIzaSyCFQTtfozQ_hQ-XQ5gMI8WoRRvs85poqxU",
  authDomain: "trend-syria-c0176.firebaseapp.com",
  projectId: "trend-syria-c0176",
  storageBucket: "trend-syria-c0176.firebasestorage.app",
  messagingSenderId: "207729030923",
  appId: "1:207729030923:web:9eb0fb08f02e43435b140e",
  measurementId: "G-YTFZ6574V8"
});

// Get messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'تريند سوريا';
  
  // تحديد إذا كان طلب عاجل
  const isPriorityOrder = payload.data?.type === 'priority_order';
  
  const notificationOptions = {
    body: payload.notification?.body || 'لديك إشعار جديد',
    icon: payload.notification?.icon || '/images/logo.png',
    image: payload.notification?.image,
    badge: '/images/badge.png',
    tag: isPriorityOrder ? 'priority-order-urgent' : (payload.data?.tag || 'trend-syria-notification'),
    data: payload.data,
    vibrate: isPriorityOrder ? [300, 100, 300, 100, 300] : [200, 100, 200],
    requireInteraction: true,
    // أولوية عالية للطلبات العاجلة
    silent: false,
    renotify: true,
    actions: isPriorityOrder ? [
      {
        action: 'accept',
        title: '✅ قبول'
      },
      {
        action: 'reject',
        title: '❌ رفض'
      }
    ] : [
      {
        action: 'open',
        title: 'فتح'
      },
      {
        action: 'close',
        title: 'إغلاق'
      }
    ]
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification clicked:', event);

  event.notification.close();

  // Handle action buttons
  if (event.action === 'close' || event.action === 'reject') {
    return;
  }

  // Get the URL to open
  let urlToOpen = '/';
  
  if (event.notification.data) {
    const data = event.notification.data;
    
    // Determine URL based on notification type
    if (data.type === 'priority_order') {
      // 🔔 طلب عاجل - فتح صفحة طلباتي
      urlToOpen = data.click_action || '/delivery/dashboard?tab=my';
      
      // إذا ضغط قبول، نضيف معلمة للقبول التلقائي
      if (event.action === 'accept' && data.order_id) {
        urlToOpen += `&accept_order=${data.order_id}`;
      }
    } else if (data.type === 'order') {
      urlToOpen = `/orders/${data.order_id}`;
    } else if (data.type === 'chat') {
      urlToOpen = `/chat/${data.chat_id}`;
    } else if (data.type === 'delivery') {
      urlToOpen = '/delivery';
    } else if (data.url) {
      urlToOpen = data.url;
    } else if (data.click_action) {
      urlToOpen = data.click_action;
    }
  }

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          if (client.navigate) {
            return client.navigate(urlToOpen);
          }
          return client;
        }
      }
      
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle push events directly
self.addEventListener('push', (event) => {
  console.log('[firebase-messaging-sw.js] Push event received');
  
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('[firebase-messaging-sw.js] Push data:', data);
    } catch (e) {
      console.log('[firebase-messaging-sw.js] Push data (text):', event.data.text());
    }
  }
});

// Service worker install event
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker installed');
  self.skipWaiting();
});

// Service worker activate event
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw.js] Service Worker activated');
  event.waitUntil(clients.claim());
});
