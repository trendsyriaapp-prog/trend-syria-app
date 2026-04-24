// /app/frontend/src/components/delivery/orders-map/index.js
// تصدير جميع ملفات الخريطة المستخرجة

// أيقونات الخريطة
export {
  createIcon,
  createNumberedIcon,
  foodStoreIcon,
  productStoreIcon,
  customerIcon,
  driverIcon,
  pickupIcon,
  dropoffIcon,
  warehouseIcon,
  urgentIcon,
  ROUTE_COLORS,
  DEFAULT_CENTER
} from './MapIcons';

// دوال المساعدة
export {
  MapUpdater,
  calculateDistanceKm,
  calculateDistanceFromRoute,
  formatDuration,
  formatDistance,
  calculateBearing,
  isValidCoordinate,
  decodePolyline
} from './MapHelpers';

// التنبيهات الصوتية
export {
  speakInstruction,
  announceNewOrder,
  announceOrderAccepted,
  announceNavigation,
  announceArrival,
  announcePriorityOrder,
  announceDirection,
  announceRemainingDistance,
  stopAllAnnouncements
} from './VoiceAnnouncements';

// Custom Hooks
export * from './hooks';

// مكونات UI
export * from './components';
