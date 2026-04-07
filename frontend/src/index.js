import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

// App build info
window.APP_BUILD_VERSION = "2026-04-07-v3";

// تسجيل Service Worker للـ PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then((registration) => {
        console.log('✅ Service Worker مسجل بنجاح:', registration.scope);
      })
      .catch((error) => {
        console.log('❌ فشل تسجيل Service Worker:', error);
      });
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
