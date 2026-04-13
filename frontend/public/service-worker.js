// /app/frontend/public/service-worker.js
// Service Worker محسّن للأداء والعمل Offline
// إصدار: 6.0 - ديسمبر 2025

const CACHE_VERSION = 'v7';
const STATIC_CACHE = `trend-syria-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `trend-syria-dynamic-${CACHE_VERSION}`;
const API_CACHE = `trend-syria-api-${CACHE_VERSION}`;
const IMAGE_CACHE = `trend-syria-images-${CACHE_VERSION}`;
const FONT_CACHE = `trend-syria-fonts-${CACHE_VERSION}`;

// ========== الملفات الأساسية للتخزين ==========
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json'
];

// ========== APIs للتخزين المؤقت (Stale-While-Revalidate) ==========
const CACHEABLE_APIS = [
  '/api/categories',
  '/api/products/homepage-data',
  '/api/products/featured',
  '/api/products/best-sellers',
  '/api/products/newly-added',
  '/api/settings/public',
  '/api/settings/ticker-messages',
  '/api/settings/homepage-sections',
  '/api/settings/business-categories'
];

// ========== APIs للـ Network Only (لا تخزين) ==========
const NETWORK_ONLY_APIS = [
  '/api/auth/',
  '/api/cart/',
  '/api/orders/',
  '/api/wallet/',
  '/api/notifications/',
  '/api/messages/',
  '/api/payment/',
  '/api/chat/',
  '/api/voip/'
];

// ========== إعدادات الكاش ==========
const CACHE_CONFIG = {
  api: {
    maxAge: 5 * 60 * 1000,      // 5 دقائق
    maxEntries: 50
  },
  images: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 أيام
    maxEntries: 200
  },
  static: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 يوم
    maxEntries: 100
  },
  fonts: {
    maxAge: 365 * 24 * 60 * 60 * 1000, // سنة كاملة
    maxEntries: 20
  }
};

// ========== Install Event ==========
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Caching core assets');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        console.log('✅ Service Worker installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker install failed:', error);
      })
  );
});

// ========== Activate Event ==========
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');
  
  const cacheWhitelist = [STATIC_CACHE, DYNAMIC_CACHE, API_CACHE, IMAGE_CACHE];
  
  event.waitUntil(
    Promise.all([
      // حذف الكاش القديم
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (!cacheWhitelist.includes(cacheName)) {
              console.log('🗑️ Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // تنظيف كاش الصور القديم
      cleanOldCacheEntries(IMAGE_CACHE, CACHE_CONFIG.images.maxEntries),
      cleanOldCacheEntries(API_CACHE, CACHE_CONFIG.api.maxEntries)
    ]).then(() => {
      console.log('✅ Service Worker activated');
      return self.clients.claim();
    })
  );
});

// ========== Fetch Event ==========
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // تجاهل طلبات غير HTTP/HTTPS
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // ========== 1. معالجة الصور (Cache First with Network Fallback) ==========
  if (isImageRequest(request, url)) {
    event.respondWith(handleImageRequest(request));
    return;
  }
  
  // ========== 2. معالجة API ==========
  if (url.pathname.includes('/api/')) {
    // تحقق إذا كان API للـ Network Only
    if (NETWORK_ONLY_APIS.some(api => url.pathname.includes(api))) {
      event.respondWith(fetch(request).catch(() => offlineApiResponse()));
      return;
    }
    
    // API قابل للتخزين
    if (CACHEABLE_APIS.some(api => url.pathname.includes(api))) {
      event.respondWith(handleCacheableApiRequest(request));
      return;
    }
    
    // API عادي - Network with Cache Fallback
    event.respondWith(
      fetch(request)
        .catch(() => caches.match(request))
        .catch(() => offlineApiResponse())
    );
    return;
  }
  
  // ========== 3. معالجة الملفات الثابتة (Stale-While-Revalidate) ==========
  if (isStaticAsset(url)) {
    event.respondWith(handleStaticRequest(request));
    return;
  }
  
  // ========== 4. معالجة صفحات التنقل ==========
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }
  
  // ========== 5. الباقي - Network First ==========
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
      .catch(() => offlineResponse())
  );
});

// ========== Helper Functions ==========

function isImageRequest(request, url) {
  return request.destination === 'image' || 
         url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i) ||
         url.pathname.includes('/uploads/') ||
         url.pathname.includes('/images/');
}

function isStaticAsset(url) {
  return url.pathname.match(/\.(js|css|woff|woff2|ttf|eot)$/i) ||
         url.pathname.startsWith('/static/');
}

// معالجة طلبات الصور
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE);
  
  // 1. تحقق من الكاش
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    // تحديث الكاش في الخلفية (Stale-While-Revalidate)
    fetchAndCache(request, IMAGE_CACHE).catch(() => {});
    return cachedResponse;
  }
  
  // 2. جلب من الشبكة
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // 3. إرجاع placeholder إذا فشل
    return placeholderImageResponse();
  }
}

// معالجة API القابل للتخزين
async function handleCacheableApiRequest(request) {
  const cache = await caches.open(API_CACHE);
  
  try {
    // محاولة الشبكة أولاً
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // تخزين النسخة الجديدة
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Fallback إلى الكاش
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return offlineApiResponse();
  }
}

// معالجة الملفات الثابتة
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  // Stale-While-Revalidate
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });
  
  return cachedResponse || fetchPromise;
}

// معالجة التنقل
async function handleNavigationRequest(request) {
  try {
    // محاولة الشبكة
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Fallback إلى الصفحة المخزنة أو offline
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) {
      return offlinePage;
    }
    
    // إرجاع الصفحة الرئيسية كـ fallback
    return caches.match('/');
  }
}

// جلب وتخزين في الخلفية
async function fetchAndCache(request, cacheName) {
  const cache = await caches.open(cacheName);
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

// تنظيف الكاش القديم
async function cleanOldCacheEntries(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxEntries) {
    const toDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(toDelete.map(key => cache.delete(key)));
    console.log(`🧹 Cleaned ${toDelete.length} old cache entries from ${cacheName}`);
  }
}

// استجابة Offline للـ API
function offlineApiResponse() {
  return new Response(
    JSON.stringify({ 
      offline: true, 
      message: 'أنت غير متصل بالإنترنت',
      timestamp: new Date().toISOString()
    }), 
    {
      status: 503,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    }
  );
}

// استجابة Offline عامة
function offlineResponse() {
  return new Response('أنت غير متصل بالإنترنت', {
    status: 503,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  });
}

// صورة Placeholder
function placeholderImageResponse() {
  // SVG placeholder صغير
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
    <rect fill="#f3f4f6" width="200" height="200"/>
    <text x="100" y="100" text-anchor="middle" fill="#9ca3af" font-size="14">صورة</text>
  </svg>`;
  
  return new Response(svg, {
    headers: { 
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'no-store'
    }
  });
}

// ========== Push Notifications ==========
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  
  const title = data.title || 'ترند سورية';
  const options = {
    body: data.body || data.message || 'لديك إشعار جديد',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [100, 50, 100],
    tag: data.tag || 'default',
    renotify: true,
    data: {
      url: data.url || data.click_action || '/',
      ...data
    },
    actions: [
      { action: 'open', title: 'فتح' },
      { action: 'close', title: 'إغلاق' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ========== Notification Click ==========
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // البحث عن نافذة مفتوحة
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // فتح نافذة جديدة
        return clients.openWindow(urlToOpen);
      })
  );
});

// ========== Background Sync ==========
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-cart') {
    event.waitUntil(syncCart());
  }
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOrders());
  }
});

async function syncCart() {
  // يمكن إضافة منطق مزامنة السلة هنا
  console.log('🔄 Syncing cart...');
}

async function syncOrders() {
  // يمكن إضافة منطق مزامنة الطلبات هنا
  console.log('🔄 Syncing orders...');
}

// ========== Message Handler ==========
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(cacheNames.map(name => caches.delete(name)));
      }).then(() => {
        console.log('🗑️ All caches cleared');
      })
    );
  }
  
  if (event.data?.type === 'CACHE_URLS') {
    const urls = event.data.urls || [];
    event.waitUntil(
      caches.open(DYNAMIC_CACHE).then((cache) => {
        return Promise.all(
          urls.map(url => 
            fetch(url).then(response => {
              if (response.ok) {
                return cache.put(url, response);
              }
            }).catch(() => {})
          )
        );
      })
    );
  }
});

console.log('🎉 Service Worker v6 loaded');
