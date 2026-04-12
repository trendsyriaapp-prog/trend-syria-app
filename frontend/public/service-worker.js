const CACHE_NAME = 'trend-syria-v5';
const STATIC_CACHE = 'trend-syria-static-v5';
const DYNAMIC_CACHE = 'trend-syria-dynamic-v5';
const API_CACHE = 'trend-syria-api-v5';
const IMAGE_CACHE = 'trend-syria-images-v5';

const urlsToCache = [
  '/',
  '/index.html',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/offline.html'
];

// APIs للتخزين المؤقت (للعمل offline والسرعة)
const CACHEABLE_APIS = [
  '/api/categories',
  '/api/products/homepage-data',
  '/api/admin/settings/public',
  '/api/settings/ticker-messages'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('✅ تم فتح الكاش');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.log('خطأ في التثبيت:', error);
      })
  );
  self.skipWaiting();
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // ========== تخزين الصور ==========
  if (request.destination === 'image' || url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(cache => {
        return cache.match(request).then(cachedResponse => {
          if (cachedResponse) {
            // تحديث الكاش في الخلفية (Stale While Revalidate)
            fetch(request).then(response => {
              if (response.ok) {
                cache.put(request, response.clone());
              }
            }).catch(() => {});
            return cachedResponse;
          }
          return fetch(request).then(response => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          }).catch(() => {
            // صورة placeholder إذا فشل التحميل
            return new Response('', { status: 404 });
          });
        });
      })
    );
    return;
  }
  
  // API Requests
  if (url.pathname.includes('/api/')) {
    // التحقق إذا كان API قابل للتخزين
    const isCacheableApi = CACHEABLE_APIS.some(api => url.pathname.includes(api));
    
    if (isCacheableApi) {
      // Network First, fallback to Cache
      event.respondWith(
        fetch(request)
          .then(response => {
            // تخزين النسخة الجديدة
            const responseClone = response.clone();
            caches.open(API_CACHE).then(cache => {
              cache.put(request, responseClone);
            });
            return response;
          })
          .catch(() => {
            // إذا فشل الاتصال، استخدم الكاش
            return caches.match(request);
          })
      );
    } else {
      // API غير قابل للتخزين - اتصال مباشر فقط
      event.respondWith(
        fetch(request).catch(() => {
          return new Response(JSON.stringify({ 
            offline: true, 
            message: 'أنت غير متصل بالإنترنت' 
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
      );
    }
    return;
  }
  
  // Static Files - Cache First
  event.respondWith(
    caches.match(request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(request)
          .then((response) => {
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then((cache) => {
                cache.put(request, responseToCache);
              });
            return response;
          });
      })
      .catch(() => {
        // عرض صفحة Offline
        if (request.destination === 'document') {
          return caches.match('/offline.html');
        }
        return caches.match('/');
      })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [STATIC_CACHE, DYNAMIC_CACHE, API_CACHE, IMAGE_CACHE];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('🗑️ حذف الكاش القديم:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Push Notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const title = data.title || 'ترند سورية';
  const options = {
    body: data.message || 'لديك إشعار جديد',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [100, 50, 100],
    data: data.url || '/',
    actions: [
      { action: 'open', title: 'فتح' },
      { action: 'close', title: 'إغلاق' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data || '/')
    );
  }
});
