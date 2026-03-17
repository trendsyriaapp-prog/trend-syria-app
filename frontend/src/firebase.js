// /app/frontend/src/firebase.js
// إعادة تصدير من config/firebase للتوافق

export {
  requestNotificationPermission,
  onMessageListener,
  getFCMToken,
  setupForegroundHandler,
  initializeFirebase,
  app,
  messaging
} from './config/firebase';
