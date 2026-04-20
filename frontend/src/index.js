import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// App build info
window.APP_BUILD_VERSION = "2026-04-09-debug";

// تعطيل console في Production
if (process.env.NODE_ENV === 'production') {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  console.info = () => {};
  console.debug = () => {};
}

// تسجيل Service Worker للـ PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Service Worker مسجل بنجاح:', registration.scope);
        }
      })
      .catch((error) => {
        if (process.env.NODE_ENV === 'development') {
          console.log('❌ فشل تسجيل Service Worker:', error);
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
