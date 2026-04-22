import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import logger from "./lib/logger";

// App build info
window.APP_BUILD_VERSION = "2026-04-22";

// تعطيل console في Production
if (process.env.NODE_ENV === 'production') {
  logger.log = () => {};
  logger.warn = () => {};
  // نُبقي logger.error لأن الأخطاء مهمة
  console.info = () => {};
  console.debug = () => {};
}

// معالجة ChunkLoadError على مستوى global
// يحدث عند تحديث التطبيق والمتصفح لديه نسخة قديمة
window.addEventListener('error', (event) => {
  const isChunkError = event.message?.includes('Loading chunk') ||
                       event.message?.includes('Loading CSS chunk') ||
                       event.message?.includes('Failed to fetch dynamically imported module') ||
                       event.error?.name === 'ChunkLoadError';
  
  if (isChunkError) {
    logger.error('🔄 ChunkLoadError detected globally, reloading...');
    // منع العرض المزدوج
    event.preventDefault();
    // مسح الكاش وإعادة التحميل
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      }).finally(() => {
        window.location.reload(true);
      });
    } else {
      window.location.reload(true);
    }
  }
});

// معالجة unhandled promise rejections للـ dynamic imports
window.addEventListener('unhandledrejection', (event) => {
  const isChunkError = event.reason?.message?.includes('Loading chunk') ||
                       event.reason?.message?.includes('Loading CSS chunk') ||
                       event.reason?.message?.includes('Failed to fetch dynamically imported module') ||
                       event.reason?.name === 'ChunkLoadError';
  
  if (isChunkError) {
    logger.error('🔄 ChunkLoadError in promise rejection, reloading...');
    event.preventDefault();
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      }).finally(() => {
        window.location.reload(true);
      });
    } else {
      window.location.reload(true);
    }
  }
});

// تسجيل Service Worker للـ PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        if (process.env.NODE_ENV === 'development') {
          logger.log('✅ Service Worker مسجل بنجاح:', registration.scope);
        }
        
        // التحقق من وجود تحديث
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker?.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // يوجد تحديث جديد متاح
              logger.log('🔄 تحديث جديد متاح للتطبيق');
            }
          });
        });
      })
      .catch((error) => {
        if (process.env.NODE_ENV === 'development') {
          logger.log('❌ فشل تسجيل Service Worker:', error);
        }
      });
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
