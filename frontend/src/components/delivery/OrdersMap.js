import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import logger from '../../lib/logger';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, X, Navigation, Phone, PhoneOff, Package, UtensilsCrossed, Locate, Layers, Route } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import useNotificationSound from '../../hooks/useNotificationSound';
import { useModalBackHandler } from '../../hooks/useBackButton';

// استيراد المكونات المُستخرجة
import {
  createIcon,
  createNumberedIcon,
  createRoutePointIcon,
  foodStoreIcon,
  productStoreIcon,
  customerIcon,
  driverIcon,
  DEFAULT_CENTER
} from './orders-map/MapIcons';

import {
  MapUpdater,
  calculateDistanceKm,
  calculateDistanceFromRoute
} from './orders-map/MapHelpers';

import {
  speakInstruction,
  announceNewOrder,
  announceOrderAccepted,
  announceNavigation,
  announceArrival,
  announcePriorityOrder
} from './orders-map/VoiceAnnouncements';

// استيراد المكونات UI المُستخرجة
import { 
  MapLayerFilters, 
  MapOrderFilters, 
  StationsSummary, 
  MapErrorToast, 
  NavigationBar,
  ActivateNavigationButton,
  MapTopBar,
  GpsErrorMessage,
  PriorityPopup,
  GoogleMapsButton,
  StepByStepCard,
  RouteDetailsCard,
  OptimizedRouteCard,
  ExternalPriorityPopup,
  OpenMapButton,
  MarkerPopupContent,
  RouteLinePopup,
  StopMarkerPopup 
} from './orders-map/components';

// استيراد الـ Hooks المُستخرجة
import useTheme from './orders-map/hooks/useTheme';

const API = process.env.REACT_APP_BACKEND_URL;

// ملاحظة: تم استخراج دوال الأيقونات والمساعدة والتنبيهات الصوتية إلى:
// - ./orders-map/MapIcons.js
// - ./orders-map/MapHelpers.js
// - ./orders-map/VoiceAnnouncements.js

const OrdersMap = ({ 
  orders: ordersProp, 
  foodOrders: foodOrdersProp, 
  driverLocation,
  onSelectOrder,
  onTakeOrder,
  onTakeFoodOrder,
  myOrders: myOrdersProp,        // طلبات السائق الحالية
  myFoodOrders: myFoodOrdersProp,     // طلبات الطعام للسائق
  theme = 'dark'                 // الثيم: dark, light, auto
}) => {
  // استخدام useMemo لتجنب إنشاء مصفوفات جديدة في كل render
  const orders = useMemo(() => ordersProp || [], [ordersProp]);
  const foodOrders = useMemo(() => foodOrdersProp || [], [foodOrdersProp]);
  const myOrders = useMemo(() => myOrdersProp || [], [myOrdersProp]);
  const myFoodOrders = useMemo(() => myFoodOrdersProp || [], [myFoodOrdersProp]);
  
  // فلترة الطلبات النشطة فقط (غير المسلمة وغير الملغاة)
  const activeMyOrders = useMemo(() => 
    myOrders.filter(o => o.status !== 'delivered' && o.delivery_status !== 'delivered' && o.status !== 'cancelled'),
    [myOrders]
  );
  const activeMyFoodOrders = useMemo(() => 
    myFoodOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled'),
    [myFoodOrders]
  );
  
  // عدد الطلبات النشطة
  const activeOrdersCount = activeMyOrders.length + activeMyFoodOrders.length;
  
  // ⭐ استخدام useTheme hook بدلاً من الكود المتكرر
  const { 
    themeMode, 
    currentTheme, 
    effectiveTheme, 
    isDark 
  } = useTheme(theme);
  
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [showLayer, setShowLayer] = useState('all'); // all, food, products, customers
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [currentDriverLocation, setCurrentDriverLocation] = useState(null);
  const [gpsRequested, setGpsRequested] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [selectedOrderForRoute, setSelectedOrderForRoute] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [multiRouteSegments, setMultiRouteSegments] = useState([]); // مسارات متعددة
  const [showAllMyRoutes, setShowAllMyRoutes] = useState(false); // عرض جميع مسارات طلباتي
  const [optimizedStops, setOptimizedStops] = useState([]); // النقاط المُرقمة المُحسَّنة
  
  // ⭐ دعم زر الرجوع للخريطة
  const closeMap = useCallback(() => setIsOpen(false), []);
  useModalBackHandler(isOpen, closeMap);
  
  // ⭐ فلتر الطلبات الجديد: متاحة / طلباتي / الكل
  const [orderFilter, setOrderFilter] = useState('myOrders'); // 'available', 'myOrders', 'all'
  const [selectedAvailableOrder, setSelectedAvailableOrder] = useState(null); // الطلب المتاح المحدد للـ popup
  
  // 🔊 أصوات الإشعارات المختلفة
  const { playPriority, playSuccess } = useNotificationSound();
  
  // رسالة الخطأ داخل الخريطة
  const [mapError, setMapError] = useState(null);
  
  // التنقل خطوة بخطوة
  const [stepByStepMode, setStepByStepMode] = useState(false); // وضع خطوة بخطوة
  const [currentStepIndex, setCurrentStepIndex] = useState(0); // المحطة الحالية
  const [allStepsData, setAllStepsData] = useState([]); // جميع المحطات
  const [currentStepRoute, setCurrentStepRoute] = useState([]); // مسار المحطة الحالية

  // ⭐ ملخص المحطات للسائق
  const [showStationsSummary, setShowStationsSummary] = useState(false);
  const [orderedStations, setOrderedStations] = useState([]); // المحطات مرتبة
  const [totalEarnings, setTotalEarnings] = useState(0); // إجمالي الأرباح
  const [totalDistance, setTotalDistance] = useState(0); // إجمالي المسافة

  // ⭐ تحسينات الملاحة الجديدة
  const [isNavigationMode, setIsNavigationMode] = useState(false); // وضع الملاحة الكامل
  const [liveTrackingEnabled, setLiveTrackingEnabled] = useState(false); // تتبع GPS مباشر
  const [driverSpeed, setDriverSpeed] = useState(0); // سرعة السائق (كم/س)
  const [estimatedArrival, setEstimatedArrival] = useState(null); // وقت الوصول المتوقع
  const [lastPosition, setLastPosition] = useState(null); // آخر موقع للحساب
  const [distanceFromRoute, setDistanceFromRoute] = useState(0); // المسافة عن المسار
  const [navigationInstructions, setNavigationInstructions] = useState([]); // تعليمات الملاحة
  const [currentInstruction, setCurrentInstruction] = useState(null); // التعليمة الحالية
  const [arrivalAnnouncedFor, setArrivalAnnouncedFor] = useState(null); // تتبع الإعلان عن الوصول لتجنب التكرار

  // ⭐ إشعار الأولوية الذكية
  const [priorityOrder, setPriorityOrder] = useState(null); // الطلب ذو الأولوية
  const priorityOrderRef = useRef(null); // ref للحفاظ على القيمة في الـ interval
  const [priorityCountdown, setPriorityCountdown] = useState(0); // العد التنازلي
  const [showPriorityPopup, setShowPriorityPopup] = useState(false);
  const showPriorityPopupRef = useRef(false); // ref للحفاظ على القيمة في الـ interval
  const [dismissedPriorityUntil, setDismissedPriorityUntil] = useState(0); // وقت إيقاف الإشعارات مؤقتاً
  
  // تحميل الطلبات المرفوضة من localStorage عند البدء
  const [rejectedOrderIds, setRejectedOrderIds] = useState(() => {
    try {
      const saved = localStorage.getItem('rejectedOrderIds');
      if (saved) {
        const parsed = JSON.parse(saved);
        // تنظيف الطلبات القديمة (أكثر من ساعة)
        const now = Date.now();
        const validEntries = parsed.filter(entry => 
          typeof entry === 'object' && entry.timestamp && (now - entry.timestamp) < 3600000
        );
        return validEntries.map(e => e.id);
      }
    } catch (e) {
      logger.log('Error loading rejected orders:', e);
    }
    return [];
  });
  
  const [maxLimitOrderIds, setMaxLimitOrderIds] = useState([]); // الطلبات المؤجلة بسبب الحد الأقصى
  const maxLimitOrderIdsRef = useRef([]); // ref للحفاظ على القيمة الصحيحة في الـ interval
  const [previousOrderCount, setPreviousOrderCount] = useState(0); // عدد الطلبات السابق لمراقبة التغيير

  // تحديث الـ ref عند تغيير الـ state
  useEffect(() => {
    maxLimitOrderIdsRef.current = maxLimitOrderIds;
  }, [maxLimitOrderIds]);

  // ref للطلبات المرفوضة للحفاظ على القيمة الصحيحة في الـ interval
  const rejectedOrderIdsRef = useRef([]);
  useEffect(() => {
    rejectedOrderIdsRef.current = rejectedOrderIds;
  }, [rejectedOrderIds]);

  // تحديث ref الـ popup
  useEffect(() => {
    showPriorityPopupRef.current = showPriorityPopup;
  }, [showPriorityPopup]);

  // تحديث ref الـ priorityOrder
  useEffect(() => {
    priorityOrderRef.current = priorityOrder;
  }, [priorityOrder]);

  // ⭐ مراقبة تغيير عدد الطلبات - لإعادة إظهار الطلبات المؤجلة عند انخفاض العدد
  useEffect(() => {
    const currentOrderCount = activeOrdersCount;
    
    // إذا انخفض عدد الطلبات (السائق سلّم طلب)
    if (currentOrderCount < previousOrderCount && maxLimitOrderIds.length > 0) {
      // مسح قائمة الطلبات المؤجلة بسبب الحد الأقصى
      setMaxLimitOrderIds([]);
      maxLimitOrderIdsRef.current = [];
      logger.log('تم مسح الطلبات المؤجلة - أصبح لديك مجال لطلبات جديدة');
    }
    
    // فقط تحديث إذا تغير العدد فعلاً
    if (currentOrderCount !== previousOrderCount) {
      setPreviousOrderCount(currentOrderCount);
    }
  }, [activeOrdersCount]); // استخدام العدد المفلتر

  // ⭐ جلب طلبات الأولوية كل 10 ثواني - يعمل دائماً عندما السائق لديه طلبات
  useEffect(() => {
    let intervalId = null;
    
    // الحد الأقصى للطلبات (من نفس المطعم = 7، من مطاعم مختلفة = 5)
    const MAX_ORDERS_SAME_STORE = 7;
    
    // يعمل حتى لو الخريطة مغلقة - طالما السائق لديه طلبات نشطة
    if (activeOrdersCount > 0) {
      const checkPriorityOrders = async () => {
        // تحقق إذا تم إيقاف الإشعارات مؤقتاً
        if (Date.now() < dismissedPriorityUntil) {
          return;
        }
        
        // لا تعرض popup جديد إذا كان هناك popup مفتوح
        if (showPriorityPopupRef.current) {
          logger.log('🔒 Popup مفتوح بالفعل، تجاهل الطلبات الجديدة');
          return;
        }
        
        // ⭐ التحقق من الحد الأقصى - لا تعرض popup إذا السائق وصل للحد
        const currentOrdersCount = activeOrdersCount;
        if (currentOrdersCount >= MAX_ORDERS_SAME_STORE) {
          logger.log('🚫 السائق وصل للحد الأقصى، لن يظهر popup الأولوية:', currentOrdersCount);
          return;
        }
        
        try {
          const response = await axios.get(`${API}/api/food/orders/delivery/priority-orders`);
          const priorityOrders = response.data.priority_orders || [];
          
          // تصفية الطلبات المرفوضة يدوياً والمؤجلة بسبب الحد الأقصى
          // استخدام الـ refs للحصول على القيم الحالية الصحيحة
          const allExcludedIds = [...rejectedOrderIdsRef.current, ...maxLimitOrderIdsRef.current];
          
          // ⭐ جلب قائمة المطاعم المرفوضة (لمدة 10 دقائق)
          let rejectedStoreNames = [];
          try {
            const savedStores = JSON.parse(localStorage.getItem('rejectedStores') || '[]');
            const now = Date.now();
            // تنظيف المطاعم القديمة (أكثر من 10 دقائق)
            const validStores = savedStores.filter(s => (now - s.timestamp) < 600000);
            localStorage.setItem('rejectedStores', JSON.stringify(validStores));
            rejectedStoreNames = validStores.map(s => s.name);
          } catch (e) {
            logger.log('Error loading rejected stores:', e);
          }
          
          // تصفية الطلبات: استبعاد IDs المرفوضة + المطاعم المرفوضة
          const availableOrders = priorityOrders.filter(o => {
            // استبعاد بالـ ID
            if (allExcludedIds.includes(o.id)) return false;
            // استبعاد بإسم المطعم
            const storeName = o.store_name || o.restaurant_name;
            if (storeName && rejectedStoreNames.includes(storeName)) return false;
            return true;
          });
          
          logger.log('Priority check:', { 
            total: priorityOrders.length, 
            rejected: rejectedOrderIdsRef.current.length,
            maxLimit: maxLimitOrderIdsRef.current.length,
            rejectedStores: rejectedStoreNames.length,
            excluded: allExcludedIds.length,
            available: availableOrders.length,
            currentOrders: currentOrdersCount,
            maxOrderLimit: MAX_ORDERS_SAME_STORE
          });
          
          // إذا وجد طلب جديد ذو أولوية
          if (availableOrders.length > 0) {
            const newPriorityOrder = availableOrders[0];
            setPriorityOrder(newPriorityOrder);
            setPriorityCountdown(25); // 25 ثانية للسائق ليوقف الدراجة ويقرر
            setShowPriorityPopup(true);
            
            // 🔊 تشغيل صوت الأولوية العاجل
            playPriority();
            announcePriorityOrder(newPriorityOrder.store_name);
          }
        } catch (error) {
          logger.error('Error checking priority orders:', error);
        }
      };
      
      // تأخير أول استدعاء لإعطاء وقت للـ state للتحديث
      const initialTimeout = setTimeout(checkPriorityOrders, 2000);
      intervalId = setInterval(checkPriorityOrders, 10000);
      
      return () => {
        clearTimeout(initialTimeout);
        if (intervalId) clearInterval(intervalId);
      };
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [myFoodOrders, myOrders, dismissedPriorityUntil]); // يعمل دائماً بدون شرط isOpen

  // ⭐ العد التنازلي للأولوية - الـ popup يختفي بعد انتهاء العد
  useEffect(() => {
    let countdownInterval = null;
    
    if (showPriorityPopup && priorityCountdown > 0) {
      countdownInterval = setInterval(() => {
        setPriorityCountdown(prev => {
          if (prev <= 1) {
            // ⏰ انتهى الوقت - إخفاء الـ popup وإرساله لسائق آخر
            // إضافة الطلب للمرفوضات (انتهى الوقت)
            const currentOrder = priorityOrderRef.current; // استخدام ref
            if (currentOrder) {
              const orderId = currentOrder.id;
              const storeName = currentOrder.store_name || currentOrder.restaurant_name;
              
              // إضافة ID للمرفوضات
              if (!rejectedOrderIdsRef.current.includes(orderId)) {
                rejectedOrderIdsRef.current = [...rejectedOrderIdsRef.current, orderId];
              }
              
              // حفظ في localStorage
              try {
                const savedData = JSON.parse(localStorage.getItem('rejectedOrderIds') || '[]');
                if (!savedData.find(e => e.id === orderId)) {
                  savedData.push({ id: orderId, timestamp: Date.now(), storeName, reason: 'timeout' });
                  localStorage.setItem('rejectedOrderIds', JSON.stringify(savedData));
                }
                
                // ⭐ إضافة المطعم للمرفوضات أيضاً (لمنع طلبات أخرى من نفس المطعم)
                if (storeName) {
                  const rejectedStores = JSON.parse(localStorage.getItem('rejectedStores') || '[]');
                  if (!rejectedStores.find(s => s.name === storeName)) {
                    rejectedStores.push({ name: storeName, timestamp: Date.now() });
                    localStorage.setItem('rejectedStores', JSON.stringify(rejectedStores));
                  }
                }
              } catch (e) {}
              
              logger.log('⏰ انتهى الوقت - الطلب سيذهب لسائق آخر:', orderId, 'من المطعم:', storeName);
            }
            
            // إخفاء الـ popup
            setShowPriorityPopup(false);
            setPriorityOrder(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [showPriorityPopup]); // إزالة priorityCountdown من dependencies

  // قبول طلب الأولوية
  const acceptPriorityOrder = async () => {
    if (!priorityOrder) return;
    
    try {
      await axios.post(`${API}/api/food/orders/delivery/${priorityOrder.id}/accept`);
      playSuccess(); // 🔊 صوت النجاح
      announceOrderAccepted(priorityOrder.order_number || priorityOrder.id?.slice(-4));
      setShowPriorityPopup(false);
      setPriorityOrder(null);
      onTakeFoodOrder?.(priorityOrder);
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'حدث خطأ';
      
      // التحقق إذا كان الخطأ بسبب الحد الأقصى
      const isMaxLimitError = errorMessage.includes('الحد الأقصى') || 
                              errorMessage.includes('حد الطلبات') ||
                              errorMessage.includes('maximum') ||
                              errorMessage.includes('limit');
      
      if (isMaxLimitError) {
        // إضافة الطلب لقائمة المؤجلة بسبب الحد الأقصى
        // سيظهر مرة أخرى عندما ينقص عدد الطلبات
        const orderId = priorityOrder.id;
        setMaxLimitOrderIds(prev => {
          // تأكد من عدم التكرار
          if (prev.includes(orderId)) return prev;
          return [...prev, orderId];
        });
        // تحديث الـ ref فوراً لمنع الـ interval من إظهار الطلب مرة أخرى
        if (!maxLimitOrderIdsRef.current.includes(orderId)) {
          maxLimitOrderIdsRef.current = [...maxLimitOrderIdsRef.current, orderId];
        }
        logger.log('🚫 تم تأجيل الطلب بسبب الحد الأقصى:', orderId);
        logger.log('📋 قائمة المؤجلة الآن:', maxLimitOrderIdsRef.current);
        
        // إيقاف الإشعارات لمدة 60 ثانية لمنع الظهور المتكرر (زيادة من 30 إلى 60)
        setDismissedPriorityUntil(Date.now() + 60000);
      }
      
      // إغلاق popup الإشعار أولاً ثم إظهار الخطأ
      setShowPriorityPopup(false);
      setPriorityOrder(null);
      // عرض الخطأ - سيختفي تلقائياً بعد 5 ثواني بفضل شريط التقدم
      setMapError(errorMessage);
      // تشغيل صوت خطأ
      speakInstruction(errorMessage);
    }
  };

  // رفض طلب الأولوية
  const rejectPriorityOrder = () => {
    // إضافة الطلب للقائمة المرفوضة
    if (priorityOrder) {
      const orderId = priorityOrder.id;
      const storeName = priorityOrder.store_name || priorityOrder.restaurant_name;
      
      const newRejectedIds = rejectedOrderIds.includes(orderId) 
        ? rejectedOrderIds 
        : [...rejectedOrderIds, orderId];
      
      setRejectedOrderIds(newRejectedIds);
      
      // تحديث الـ ref فوراً لمنع الـ interval من إظهار الطلب مرة أخرى
      if (!rejectedOrderIdsRef.current.includes(orderId)) {
        rejectedOrderIdsRef.current = [...rejectedOrderIdsRef.current, orderId];
      }
      
      // حفظ في localStorage مع timestamp واسم المطعم
      try {
        const savedData = JSON.parse(localStorage.getItem('rejectedOrderIds') || '[]');
        if (!savedData.find(e => e.id === orderId)) {
          savedData.push({ 
            id: orderId, 
            timestamp: Date.now(),
            storeName: storeName // حفظ اسم المطعم لتصفية الطلبات من نفس المطعم
          });
          localStorage.setItem('rejectedOrderIds', JSON.stringify(savedData));
        }
        
        // ⭐ إضافة المطعم للقائمة المرفوضة مؤقتاً (لمدة 10 دقائق)
        if (storeName) {
          const rejectedStores = JSON.parse(localStorage.getItem('rejectedStores') || '[]');
          if (!rejectedStores.find(s => s.name === storeName)) {
            rejectedStores.push({ name: storeName, timestamp: Date.now() });
            localStorage.setItem('rejectedStores', JSON.stringify(rejectedStores));
          }
        }
      } catch (e) {
        logger.log('Error saving rejected order:', e);
      }
      
      logger.log('❌ تم رفض الطلب:', orderId, 'من المطعم:', storeName);
      logger.log('📋 قائمة المرفوضة الآن:', rejectedOrderIdsRef.current);
    }
    
    // إيقاف الإشعارات لمدة 60 ثانية
    setDismissedPriorityUntil(Date.now() + 60000);
    
    setShowPriorityPopup(false);
    setPriorityOrder(null);
  };

  // ⭐ تتبع GPS مباشر - كل 5 ثواني
  useEffect(() => {
    let watchId = null;
    
    if (liveTrackingEnabled && isOpen) {
      // مراقبة الموقع بشكل مستمر
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const newLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              speed: position.coords.speed, // م/ث
              heading: position.coords.heading
            };
            
            // حساب السرعة بالكم/س
            if (position.coords.speed) {
              setDriverSpeed(Math.round(position.coords.speed * 3.6)); // تحويل من م/ث لكم/س
            } else if (lastPosition) {
              // حساب السرعة يدوياً
              const dist = calculateDistanceKm(
                lastPosition.latitude, lastPosition.longitude,
                newLocation.latitude, newLocation.longitude
              );
              const timeDiff = (Date.now() - lastPosition.timestamp) / 1000 / 3600; // بالساعات
              if (timeDiff > 0) {
                setDriverSpeed(Math.round(dist / timeDiff));
              }
            }
            
            setLastPosition({ ...newLocation, timestamp: Date.now() });
            setCurrentDriverLocation(newLocation);
            setMapCenter([newLocation.latitude, newLocation.longitude]);
            
            // ⭐ التحقق من الابتعاد عن المسار
            if (routeCoordinates.length > 0) {
              const distFromRoute = calculateDistanceFromRoute(newLocation, routeCoordinates);
              setDistanceFromRoute(distFromRoute);
              
              // إعادة حساب المسار إذا ابتعد أكثر من 100 متر
              if (distFromRoute > 0.1 && selectedOrderForRoute) {
                logger.log('🔄 إعادة حساب المسار - ابتعدت عن المسار');
                showRouteForOrder(selectedOrderForRoute);
              }
            }
            
            // ⭐ التحقق من الاقتراب من الوجهة وإعلان الوصول تلقائياً
            if (selectedOrderForRoute && routeCoordinates.length > 0) {
              // الحصول على موقع الوجهة (آخر نقطة في المسار)
              const destination = routeCoordinates[routeCoordinates.length - 1];
              if (destination) {
                const distanceToDestination = calculateDistanceKm(
                  newLocation.latitude, newLocation.longitude,
                  destination[0], destination[1]
                );
                
                // إذا اقترب أقل من 100 متر (0.1 كم) ولم يتم الإعلان بعد
                if (distanceToDestination < 0.1 && arrivalAnnouncedFor !== selectedOrderForRoute.id) {
                  const destinationName = selectedOrderForRoute.customer_name || 
                                         selectedOrderForRoute.store_name || 
                                         'الوجهة';
                  announceArrival(destinationName);
                  setArrivalAnnouncedFor(selectedOrderForRoute.id);
                  logger.log('🎯 تم الإعلان عن الوصول إلى:', destinationName);
                }
              }
            }
            
            // ⭐ تحديث وقت الوصول المتوقع
            if (routeInfo && driverSpeed > 0) {
              const remainingKm = parseFloat(routeInfo.distance) || 0;
              const etaMinutes = Math.round((remainingKm / driverSpeed) * 60);
              setEstimatedArrival(etaMinutes);
            }
          },
          (error) => {
            logger.error('خطأ GPS:', error);
          },
          {
            enableHighAccuracy: false,
            timeout: 10000,
            maximumAge: 60000
          }
        );
      }
    }
    
    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [liveTrackingEnabled, isOpen, routeCoordinates, selectedOrderForRoute]);

  // ⭐ تبديل وضع الملاحة
  const toggleNavigationMode = () => {
    if (!isNavigationMode) {
      setIsNavigationMode(true);
      setLiveTrackingEnabled(true);
      speakInstruction('تم تفعيل وضع الملاحة');
    } else {
      setIsNavigationMode(false);
      setLiveTrackingEnabled(false);
      speakInstruction('تم إيقاف وضع الملاحة');
    }
  };

  // ⭐ الاستماع لحدث فتح الخريطة وتركيز على طلب معين
  useEffect(() => {
    const handleFocusOrder = (event) => {
      const { order, latitude, longitude } = event.detail;
      if (latitude && longitude) {
        // فتح الخريطة
        setIsOpen(true);
        // تركيز على موقع الطلب
        setMapCenter([latitude, longitude]);
        
        // رسم المسار تلقائياً بعد فتح الخريطة
        setTimeout(() => {
          // التأكد من وجود إحداثيات المتجر والعميل
          if (order.store_latitude && order.store_longitude) {
            showRouteForOrder(order);
          } else if (order.latitude && order.longitude) {
            // إذا لم يكن هناك إحداثيات متجر، نحاول استخدام بيانات الطلب
            const orderWithCoords = {
              ...order,
              store_latitude: order.store_latitude || order.seller_addresses?.[0]?.latitude || 33.5138,
              store_longitude: order.store_longitude || order.seller_addresses?.[0]?.longitude || 36.2765,
              latitude: latitude,
              longitude: longitude
            };
            showRouteForOrder(orderWithCoords);
          }
        }, 800);
      }
    };

    window.addEventListener('focusOrderOnMap', handleFocusOrder);
    return () => {
      window.removeEventListener('focusOrderOnMap', handleFocusOrder);
    };
  }, [currentDriverLocation]);

  // قبول طلب الطعام من الخريطة مع عرض الخطأ داخلها
  const handleAcceptFoodOrderFromMap = async (order) => {
    try {
      await axios.post(`${API}/api/food/orders/delivery/${order.id}/accept`);
      playSuccess(); // 🔊 صوت النجاح
      setMapError(null);
      onTakeFoodOrder?.(order); // استدعاء الـ callback الأصلي لتحديث البيانات
    } catch (error) {
      const errorMessage = error.response?.data?.detail || "حدث خطأ";
      setMapError(errorMessage);
      // إخفاء الرسالة بعد 5 ثواني
      setTimeout(() => setMapError(null), 5000);
    }
  };

  // قبول طلب المنتجات من الخريطة مع عرض الخطأ داخلها
  const handleAcceptOrderFromMap = async (order) => {
    try {
      playSuccess(); // 🔊 صوت النجاح
      // نستدعي الـ callback الأصلي مباشرة
      onTakeOrder?.(order);
      setMapError(null);
    } catch (error) {
      const errorMessage = error.response?.data?.detail || "حدث خطأ";
      setMapError(errorMessage);
      setTimeout(() => setMapError(null), 5000);
    }
  };

  // ⭐ حساب وترتيب المحطات للسائق (ذكي: المتجر قبل العميل)
  const calculateOrderedStations = () => {
    const stations = [];
    let totalDist = 0;
    let totalEarn = 0;
    let stationNumber = 1;

    // جمع كل الطلبات (طعام + منتجات) التي قبلها السائق
    const allMyOrders = [...(activeMyFoodOrders || []), ...(activeMyOrders || [])];

    if (allMyOrders.length === 0) {
      setOrderedStations([]);
      setTotalDistance(0);
      setTotalEarnings(0);
      return;
    }

    // ترتيب ذكي: لكل طلب، أضف المتجر أولاً ثم العميل
    allMyOrders.forEach((order, idx) => {
      const isFood = order.restaurant_id || order.order_type === 'food' || order.store_id;
      const storeName = isFood 
        ? (order.store_name || order.restaurant_name || 'المطعم') 
        : (order.seller_name || order.store_name || 'المتجر');
      
      // قراءة إحداثيات المتجر من store_location أو الحقول المباشرة
      const storeLat = order.store_location?.latitude || order.store_latitude;
      const storeLon = order.store_location?.longitude || order.store_longitude;
      
      // قراءة إحداثيات العميل من delivery_address أو الحقول المباشرة
      const customerLat = order.delivery_address?.latitude || order.delivery_address?.lat || order.latitude;
      const customerLon = order.delivery_address?.longitude || order.delivery_address?.lng || order.longitude;

      // إضافة محطة المتجر
      if (storeLat && storeLon) {
        stations.push({
          number: stationNumber++,
          type: 'store',
          isFood: isFood,
          name: storeName,
          address: order.store_address || '',
          phone: order.store_phone || order.restaurant_phone || order.seller_phone || '',
          position: [storeLat, storeLon],
          action: 'استلام',
          orderId: order.id,
          order: order
        });
      }

      // إضافة محطة العميل
      if (customerLat && customerLon) {
        stations.push({
          number: stationNumber++,
          type: 'customer',
          isFood: isFood,
          name: order.customer_name || order.buyer_name || 'العميل',
          address: typeof order.delivery_address === 'string' 
            ? order.delivery_address 
            : (order.delivery_address?.area || order.delivery_address?.city || order.address || ''),
          phone: order.customer_phone || order.delivery_phone || '',
          position: [customerLat, customerLon],
          action: 'تسليم',
          orderId: order.id,
          order: order,
          total: order.total
        });

        // إضافة الربح
        totalEarn += order.driver_delivery_fee || order.driver_earnings || 0;
      }

      // حساب المسافة
      if (storeLat && storeLon && customerLat && customerLon) {
        const dist = calculateDistanceKm(storeLat, storeLon, customerLat, customerLon);
        totalDist += dist;
      }
    });

    setOrderedStations(stations);
    setTotalDistance(totalDist);
    setTotalEarnings(totalEarn);
  };

  // تحديث المحطات عند تغيير الطلبات
  useEffect(() => {
    calculateOrderedStations();
  }, [activeMyFoodOrders, activeMyOrders]);

  // ألوان المسارات
  const routeColors = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#eab308'];

  // جلب المسار من OSRM (مجاني بدون API Key) مع المسافات المنفصلة والربح
  const fetchRoute = async (start, waypoint, end) => {
    setLoadingRoute(true);
    try {
      // جلب المسار الكامل
      const coords = `${start[1]},${start[0]};${waypoint[1]},${waypoint[0]};${end[1]},${end[0]}`;
      
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          // تحويل الإحداثيات من [lon, lat] إلى [lat, lon] لـ Leaflet
          const routeCoords = route.geometry.coordinates.map(c => [c[1], c[0]]);
          setRouteCoordinates(routeCoords);
          
          // حساب المسافات المنفصلة من legs
          const legs = route.legs || [];
          const distanceToStore = legs[0] ? (legs[0].distance / 1000).toFixed(1) : 0;
          const distanceToCustomer = legs[1] ? (legs[1].distance / 1000).toFixed(1) : 0;
          const durationToStore = legs[0] ? Math.round(legs[0].duration / 60) : 0;
          const durationToCustomer = legs[1] ? Math.round(legs[1].duration / 60) : 0;
          
          // المسافة الإجمالية
          const totalDistance = (route.distance / 1000).toFixed(1);
          const totalDuration = Math.round(route.duration / 60);
          
          // جلب ربح السائق من الـ API
          let driverEarnings = 0;
          try {
            const earningsResponse = await axios.get(`${API}/api/shipping/calculate-driver-earnings`, {
              params: {
                store_lat: waypoint[0],
                store_lon: waypoint[1],
                customer_lat: end[0],
                customer_lon: end[1],
                driver_lat: start[0],
                driver_lon: start[1]
              }
            });
            driverEarnings = earningsResponse.data.earnings || 0;
          } catch (err) {
            logger.error('Error fetching driver earnings:', err);
          }
          
          // معلومات المسار مع التفاصيل
          setRouteInfo({
            distance: totalDistance,
            duration: totalDuration,
            distanceToStore: distanceToStore,
            distanceToCustomer: distanceToCustomer,
            durationToStore: durationToStore,
            durationToCustomer: durationToCustomer,
            driverEarnings: driverEarnings
          });
        }
      } else {
        // في حالة فشل API، نرسم خط مستقيم
        setRouteCoordinates([start, waypoint, end]);
        setRouteInfo(null);
      }
    } catch (error) {
      logger.error('Error fetching route:', error);
      // خط مستقيم كبديل
      setRouteCoordinates([start, waypoint, end]);
      setRouteInfo(null);
    }
    setLoadingRoute(false);
  };

  // جلب مسار واحد وإرجاع الإحداثيات
  const fetchSingleRoute = async (points) => {
    try {
      const coordsStr = points.map(p => `${p[1]},${p[0]}`).join(';');
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coordsStr}?overview=full&geometries=geojson`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes[0]) {
          return {
            coordinates: data.routes[0].geometry.coordinates.map(c => [c[1], c[0]]),
            distance: data.routes[0].distance,
            duration: data.routes[0].duration
          };
        }
      }
    } catch (error) {
      logger.error('Error fetching route segment:', error);
    }
    // خط مستقيم كبديل
    return { coordinates: points, distance: 0, duration: 0 };
  };

  // جلب المسار المُحسَّن باستخدام OSRM Trip API
  const fetchOptimizedRoute = async (points) => {
    try {
      // OSRM Trip API يحسب أفضل ترتيب للنقاط
      const coordsStr = points.map(p => `${p.position[1]},${p.position[0]}`).join(';');
      const response = await fetch(
        `https://router.project-osrm.org/trip/v1/driving/${coordsStr}?overview=full&geometries=geojson&source=first&roundtrip=false`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.trips && data.trips[0] && data.waypoints) {
          // الحصول على الترتيب المُحسَّن
          const optimizedOrder = data.waypoints.map(wp => wp.waypoint_index);
          const trip = data.trips[0];
          
          return {
            optimizedOrder,
            geometry: trip.geometry.coordinates.map(c => [c[1], c[0]]),
            distance: trip.distance,
            duration: trip.duration,
            legs: trip.legs
          };
        }
      }
    } catch (error) {
      logger.error('Error fetching optimized route:', error);
    }
    return null;
  };

  // عرض جميع مسارات طلباتي بألوان مختلفة - مُحسَّن
  const showAllMyOrdersRoutes = async () => {
    // استخدام موقع السائق أو موقع دمشق كافتراضي
    let driverPos = currentDriverLocation || driverLocation;
    
    // إذا لم يتوفر موقع السائق، استخدم موقع افتراضي (دمشق)
    if (!driverPos || !driverPos.latitude) {
      logger.log('استخدام موقع افتراضي - دمشق');
      driverPos = { latitude: 33.5138, longitude: 36.2765 };
      setCurrentDriverLocation(driverPos);
    }

    const allMyOrders = [...(myOrders || []), ...(myFoodOrders || [])].filter(o => 
      o.status !== 'delivered' && o.delivery_status !== 'delivered'
    );

    if (allMyOrders.length === 0) {
      alert('لا توجد طلبات لعرض مساراتها');
      return;
    }

    setLoadingRoute(true);
    setShowAllMyRoutes(true);
    setSelectedOrderForRoute(null);
    setRouteCoordinates([]);

    try {
      // جمع جميع نقاط التوقف
      const allPoints = [{
        position: [driverPos.latitude, driverPos.longitude],
        type: 'driver',
        label: 'موقعك',
        order: null
      }];

      // إضافة المتاجر (مع fallback للإحداثيات المفقودة)
      allMyOrders.forEach((order) => {
        let storeLat = order.store_latitude || order.seller_addresses?.[0]?.latitude;
        let storeLng = order.store_longitude || order.seller_addresses?.[0]?.longitude;
        
        // إذا لم تتوفر إحداثيات المتجر، استخدم موقع افتراضي قريب
        if (!storeLat || !storeLng) {
          logger.log('⚠️ طلب بدون إحداثيات متجر:', order.id?.substring(0, 8));
          storeLat = 33.5138 + (Math.random() * 0.01 - 0.005);
          storeLng = 36.2765 + (Math.random() * 0.01 - 0.005);
        }
        
        allPoints.push({
          position: [storeLat, storeLng],
          type: 'store',
          label: order.store_name || order.seller_name || 'متجر',
          order: order,
          isFood: !!order.store_name
        });
      });

      // إضافة العملاء (مع fallback للإحداثيات المفقودة)
      allMyOrders.forEach((order) => {
        let custLat = order.latitude || order.buyer_address?.latitude;
        let custLng = order.longitude || order.buyer_address?.longitude;
        
        // إذا لم تتوفر إحداثيات العميل، استخدم موقع افتراضي قريب
        if (!custLat || !custLng) {
          logger.log('⚠️ طلب بدون إحداثيات عميل:', order.id?.substring(0, 8));
          custLat = 33.5000 + (Math.random() * 0.01 - 0.005);
          custLng = 36.2900 + (Math.random() * 0.01 - 0.005);
        }
        
        allPoints.push({
          position: [custLat, custLng],
          type: 'customer',
          label: order.customer_name || 'عميل',
          order: order,
          isFood: !!order.store_name
        });
      });

      if (allPoints.length < 2) {
        alert('لا توجد نقاط كافية لرسم المسار');
        setLoadingRoute(false);
        setShowAllMyRoutes(false);
        return;
      }

      // ⭐ استخدام OSRM Trip API للحصول على الترتيب الأمثل
      // المتطلبات: يجب زيارة المتجر قبل العميل لكل طلب
      
      // جمع جميع النقاط للتحسين
      const driverPoint = allPoints.find(p => p.type === 'driver');
      const stores = allPoints.filter(p => p.type === 'store');
      const customers = allPoints.filter(p => p.type === 'customer');
      
      // إنشاء خريطة لربط كل متجر بعميله
      const orderPairs = []; // [{store, customer, orderId}]
      allMyOrders.forEach((order, idx) => {
        const store = stores[idx];
        const customer = customers[idx];
        if (store && customer) {
          orderPairs.push({ store, customer, orderId: order.id });
        }
      });
      
      // ⭐ حساب الترتيب الأمثل باستخدام أقرب نقطة (Nearest Neighbor Algorithm)
      const optimizeOrdersRoute = () => {
        const optimizedSequence = [driverPoint];
        const remainingPairs = [...orderPairs];
        let currentPos = driverPoint.position;
        
        while (remainingPairs.length > 0) {
          // إيجاد أقرب متجر لم تتم زيارته
          let nearestIdx = 0;
          let nearestDist = Infinity;
          
          remainingPairs.forEach((pair, idx) => {
            const storeDist = calculateDistanceKm(
              currentPos[0], currentPos[1],
              pair.store.position[0], pair.store.position[1]
            );
            if (storeDist < nearestDist) {
              nearestDist = storeDist;
              nearestIdx = idx;
            }
          });
          
          // إضافة المتجر ثم العميل
          const nearest = remainingPairs[nearestIdx];
          optimizedSequence.push(nearest.store);
          optimizedSequence.push(nearest.customer);
          
          // تحديث الموقع الحالي (موقع العميل بعد التسليم)
          currentPos = nearest.customer.position;
          
          // إزالة من القائمة
          remainingPairs.splice(nearestIdx, 1);
        }
        
        return optimizedSequence;
      };
      
      const orderedPoints = optimizeOrdersRoute();
      logger.log('✅ ترتيب المسار المُحسَّن:', orderedPoints.map((p, i) => `${i+1}. ${p.label} (${p.type})`));

      // جلب جميع المسارات بشكل متوازي للسرعة
      const routePromises = [];
      for (let i = 0; i < orderedPoints.length - 1; i++) {
        const fromPoint = orderedPoints[i];
        const toPoint = orderedPoints[i + 1];
        routePromises.push(
          fetchSingleRoute([fromPoint.position, toPoint.position])
            .then(route => ({
              route,
              fromPoint,
              toPoint,
              index: i
            }))
            .catch(() => ({
              route: { coordinates: [fromPoint.position, toPoint.position], distance: 0, duration: 0 },
              fromPoint,
              toPoint,
              index: i
            }))
        );
      }

      // انتظار جميع المسارات
      const routeResults = await Promise.all(routePromises);
      
      // ترتيب النتائج حسب index
      routeResults.sort((a, b) => a.index - b.index);

      const segments = [];
      let totalDistance = 0;
      let totalDuration = 0;

      routeResults.forEach(({ route, fromPoint, toPoint }, idx) => {
        let segmentColor;
        if (toPoint.type === 'store') {
          segmentColor = toPoint.isFood ? '#22c55e' : '#3b82f6';
        } else {
          segmentColor = '#ef4444';
        }

        segments.push({
          coordinates: route.coordinates || [fromPoint.position, toPoint.position],
          color: segmentColor,
          fromPoint,
          toPoint,
          stopNumber: idx + 1,
          distance: route.distance || 0,
          duration: route.duration || 0
        });

        totalDistance += route.distance || 0;
        totalDuration += route.duration || 0;
      });

      const numberedStops = orderedPoints.map((point, idx) => ({
        ...point,
        stopNumber: idx + 1
      }));

      setMultiRouteSegments(segments);
      setOptimizedStops(numberedStops);
      setRouteInfo({
        distance: (totalDistance / 1000).toFixed(1),
        duration: Math.round(totalDuration / 60),
        stopsCount: orderedPoints.length
      });
    } catch (error) {
      logger.error('خطأ في تحميل المسارات:', error);
      alert('حدث خطأ أثناء تحميل المسارات');
    } finally {
      setLoadingRoute(false);
    }
  };

  // إخفاء جميع المسارات
  const hideAllRoutes = () => {
    setShowAllMyRoutes(false);
    setMultiRouteSegments([]);
    setOptimizedStops([]);
    setSelectedOrderForRoute(null);
    setRouteCoordinates([]);
    setRouteInfo(null);
    // إخفاء وضع خطوة بخطوة أيضاً
    setStepByStepMode(false);
    setCurrentStepIndex(0);
    setAllStepsData([]);
    setCurrentStepRoute([]);
  };

  // بدء وضع التنقل خطوة بخطوة
  const startStepByStepNavigation = async () => {
    // استخدام موقع السائق أو موقع دمشق كافتراضي
    let driverPos = currentDriverLocation || driverLocation;
    
    // إذا لم يتوفر موقع السائق، استخدم موقع افتراضي (دمشق)
    if (!driverPos || !driverPos.latitude) {
      logger.log('استخدام موقع افتراضي - دمشق');
      driverPos = { latitude: 33.5138, longitude: 36.2765 };
      setCurrentDriverLocation(driverPos);
    }

    const allMyOrders = [...(myOrders || []), ...(myFoodOrders || [])].filter(o => 
      o.status !== 'delivered' && o.delivery_status !== 'delivered'
    );

    if (allMyOrders.length === 0) {
      alert('لا توجد طلبات للتنقل إليها');
      return;
    }

    setLoadingRoute(true);

    try {
      // جمع جميع نقاط التوقف
      const allPoints = [{
        position: [driverPos.latitude, driverPos.longitude],
        type: 'driver',
        label: 'موقعك',
        order: null
      }];

      // إضافة المتاجر (مع fallback)
      allMyOrders.forEach((order) => {
        let storeLat = order.store_latitude || order.seller_addresses?.[0]?.latitude;
        let storeLng = order.store_longitude || order.seller_addresses?.[0]?.longitude;
        if (!storeLat || !storeLng) {
          storeLat = 33.5138 + (Math.random() * 0.01 - 0.005);
          storeLng = 36.2765 + (Math.random() * 0.01 - 0.005);
        }
        allPoints.push({
          position: [storeLat, storeLng],
          type: 'store',
          label: order.store_name || order.seller_name || 'متجر',
          order: order,
          isFood: !!order.store_name
        });
      });

      // إضافة العملاء (مع fallback)
      allMyOrders.forEach((order) => {
        let custLat = order.latitude || order.buyer_address?.latitude;
        let custLng = order.longitude || order.buyer_address?.longitude;
        if (!custLat || !custLng) {
          custLat = 33.5000 + (Math.random() * 0.01 - 0.005);
          custLng = 36.2900 + (Math.random() * 0.01 - 0.005);
        }
        allPoints.push({
          position: [custLat, custLng],
          type: 'customer',
          label: order.customer_name || 'عميل',
          order: order,
          isFood: !!order.store_name
        });
      });

      if (allPoints.length < 2) {
        alert('لا توجد نقاط كافية');
        setLoadingRoute(false);
        return;
      }

      // ترتيب بسيط: السائق -> المتاجر -> العملاء
      const driverPoint = allPoints.find(p => p.type === 'driver');
      const stores = allPoints.filter(p => p.type === 'store');
      const customers = allPoints.filter(p => p.type === 'customer');
      const orderedPoints = [driverPoint, ...stores, ...customers];

      // جلب جميع المسارات بشكل متوازي
      const routePromises = [];
      for (let i = 0; i < orderedPoints.length - 1; i++) {
        const fromPoint = orderedPoints[i];
        const toPoint = orderedPoints[i + 1];
        routePromises.push(
          fetchSingleRoute([fromPoint.position, toPoint.position])
            .then(routeData => ({
              stepNumber: i + 1,
              from: fromPoint,
              to: toPoint,
              route: routeData.coordinates || [fromPoint.position, toPoint.position],
              distance: routeData.distance || 0,
              duration: routeData.duration || 0,
              index: i
            }))
            .catch(() => ({
              stepNumber: i + 1,
              from: fromPoint,
              to: toPoint,
              route: [fromPoint.position, toPoint.position],
              distance: 0,
              duration: 0,
              index: i
            }))
        );
      }

      // انتظار جميع المسارات
      const steps = await Promise.all(routePromises);
      steps.sort((a, b) => a.index - b.index);

      setAllStepsData(steps);
      setCurrentStepIndex(0);
      setStepByStepMode(true);
      setShowAllMyRoutes(false);
      
      // عرض المسار الأول
      if (steps.length > 0) {
        setCurrentStepRoute(steps[0].route);
        setRouteInfo({
          distance: (steps[0].distance / 1000).toFixed(1),
          duration: Math.round(steps[0].duration / 60)
        });
        // توسيط الخريطة على الوجهة
        setMapCenter(steps[0].to.position);
      }
    } catch (error) {
      logger.error('خطأ في بدء التنقل:', error);
      alert('حدث خطأ أثناء تحميل المسارات');
    } finally {
      setLoadingRoute(false);
    }
  };

  // الانتقال للمحطة التالية
  const goToNextStep = () => {
    if (currentStepIndex < allStepsData.length - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      const nextStep = allStepsData[nextIndex];
      setCurrentStepRoute(nextStep.route);
      setRouteInfo({
        distance: (nextStep.distance / 1000).toFixed(1),
        duration: Math.round(nextStep.duration / 60)
      });
      setMapCenter(nextStep.to.position);
    } else {
      // انتهت جميع المحطات
      alert('🎉 مبروك! أكملت جميع التوصيلات');
      hideAllRoutes();
    }
  };

  // إيقاف وضع خطوة بخطوة
  const stopStepByStep = () => {
    setStepByStepMode(false);
    setCurrentStepIndex(0);
    setAllStepsData([]);
    setCurrentStepRoute([]);
    setRouteInfo(null);
  };

  // عرض المسار لطلب معين
  const showRouteForOrder = (order) => {
    let driverPos = currentDriverLocation || driverLocation;
    
    // إذا لم يكن موقع السائق متاحاً، استخدم موقع المتجر كنقطة بداية
    // أو حاول الحصول على الموقع
    if (!driverPos) {
      // محاولة الحصول على الموقع
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newLocation = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            };
            setCurrentDriverLocation(newLocation);
            // إعادة استدعاء الدالة بعد الحصول على الموقع
            const storeCoords = [order.store_latitude, order.store_longitude];
            const customerCoords = [order.latitude, order.longitude];
            if (storeCoords[0] && customerCoords[0]) {
              setSelectedOrderForRoute(order);
              fetchRoute([newLocation.latitude, newLocation.longitude], storeCoords, customerCoords);
            }
          },
          (error) => {
            // إذا فشل الحصول على الموقع، استخدم موقع المتجر كبداية
            logger.log('استخدام موقع المتجر كنقطة بداية');
            const storeCoords = [order.store_latitude, order.store_longitude];
            const customerCoords = [order.latitude, order.longitude];
            if (storeCoords[0] && customerCoords[0]) {
              setSelectedOrderForRoute(order);
              // رسم المسار من المتجر للعميل فقط
              fetchRouteStoreToCustomer(storeCoords, customerCoords, order);
            }
          },
          { enableHighAccuracy: false, timeout: 30000 }
        );
      }
      return;
    }

    const storeCoords = [order.store_latitude, order.store_longitude];
    const customerCoords = [order.latitude, order.longitude];
    const driverCoords = [driverPos.latitude, driverPos.longitude];

    if (storeCoords[0] && customerCoords[0]) {
      setSelectedOrderForRoute(order);
      setArrivalAnnouncedFor(null); // إعادة تعيين عند تغيير الطلب
      fetchRoute(driverCoords, storeCoords, customerCoords);
    }
  };

  // رسم المسار من المتجر للعميل فقط (بدون موقع السائق)
  const fetchRouteStoreToCustomer = async (storeCoords, customerCoords, order) => {
    setLoadingRoute(true);
    try {
      const coords = `${storeCoords[1]},${storeCoords[0]};${customerCoords[1]},${customerCoords[0]}`;
      
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          const routeCoords = route.geometry.coordinates.map(c => [c[1], c[0]]);
          setRouteCoordinates(routeCoords);
          
          const totalDistance = (route.distance / 1000).toFixed(1);
          const totalDuration = Math.round(route.duration / 60);
          
          // جلب ربح السائق
          let driverEarnings = 0;
          try {
            const earningsResponse = await axios.get(`${API}/api/shipping/calculate-driver-earnings`, {
              params: {
                store_lat: storeCoords[0],
                store_lon: storeCoords[1],
                customer_lat: customerCoords[0],
                customer_lon: customerCoords[1]
              }
            });
            driverEarnings = earningsResponse.data.earnings || 0;
          } catch (err) {
            logger.error('Error fetching driver earnings:', err);
          }
          
          setRouteInfo({
            distance: totalDistance,
            duration: totalDuration,
            distanceToStore: '0',
            distanceToCustomer: totalDistance,
            durationToStore: 0,
            durationToCustomer: totalDuration,
            driverEarnings: driverEarnings
          });
        }
      }
    } catch (error) {
      logger.error('Error fetching route:', error);
    }
    setLoadingRoute(false);
  };

  // إخفاء المسار
  const hideRoute = () => {
    setSelectedOrderForRoute(null);
    setRouteCoordinates([]);
    setRouteInfo(null);
    setArrivalAnnouncedFor(null); // إعادة تعيين عند إخفاء المسار
  };

  // الحصول على موقع السائق الحالي مع طلب الإذن
  const getDriverLocation = () => {
    setGpsRequested(true);
    setGpsError(null);
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentDriverLocation({ latitude, longitude });
          setMapCenter([latitude, longitude]);
          setGpsError(null);
        },
        (error) => {
          logger.log('Error getting location:', error);
          let errorMessage = 'تعذر الحصول على موقعك';
          if (error.code === error.PERMISSION_DENIED) {
            errorMessage = 'يجب السماح بالوصول للموقع لعرض الطلبات على الخريطة';
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            errorMessage = 'الموقع غير متاح حالياً';
          } else if (error.code === error.TIMEOUT) {
            errorMessage = 'انتهت مهلة الحصول على الموقع';
          }
          setGpsError(errorMessage);
          // استخدام موقع افتراضي عند فشل الحصول على الموقع
          const defaultLocation = { latitude: 33.5138, longitude: 36.2765 };
          setCurrentDriverLocation(defaultLocation);
          setMapCenter([defaultLocation.latitude, defaultLocation.longitude]);
        },
        { enableHighAccuracy: false, timeout: 30000, maximumAge: 60000 }
      );
    } else {
      setGpsError('المتصفح لا يدعم خدمة الموقع');
      // إذا لم يكن الـ geolocation متاحاً، استخدم موقع افتراضي
      const defaultLocation = { latitude: 33.5138, longitude: 36.2765 };
      setCurrentDriverLocation(defaultLocation);
      setMapCenter([defaultLocation.latitude, defaultLocation.longitude]);
    }
  };

  // تحديث مركز الخريطة عند فتحها - مع طلب GPS
  useEffect(() => {
    if (isOpen && !gpsRequested) {
      getDriverLocation();
    }
  }, [isOpen, gpsRequested]);

  // تتبع موقع السائق وتحديث المسار تلقائياً كل 2 ثانية
  useEffect(() => {
    let watchId;
    let updateInterval;

    if (isOpen && selectedOrderForRoute) {
      // مراقبة موقع السائق باستمرار
      if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            setCurrentDriverLocation({ latitude, longitude });
          },
          (error) => {
            logger.log('Watch position error:', error);
          },
          { enableHighAccuracy: false, maximumAge: 1000 }
        );
      }

      // تحديث المسار كل 2 ثانية
      updateInterval = setInterval(() => {
        if (currentDriverLocation && selectedOrderForRoute) {
          const driverCoords = [currentDriverLocation.latitude, currentDriverLocation.longitude];
          const storeCoords = [selectedOrderForRoute.store_latitude, selectedOrderForRoute.store_longitude];
          const customerCoords = [selectedOrderForRoute.latitude, selectedOrderForRoute.longitude];
          
          if (storeCoords[0] && customerCoords[0]) {
            fetchRoute(driverCoords, storeCoords, customerCoords);
          }
        }
      }, 2000);
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
      if (updateInterval) clearInterval(updateInterval);
    };
  }, [isOpen, selectedOrderForRoute, currentDriverLocation]);

  // الحصول على إحداثيات الطلب - GPS حقيقي فقط
  const getOrderCoordinates = (order) => {
    // إذا كان الطلب يحتوي على إحداثيات GPS حقيقية (الصيغة القديمة)
    if (order.latitude && order.longitude) {
      return [order.latitude, order.longitude];
    }
    // إذا كان delivery_address كائن مع lat/lng (الصيغة الجديدة)
    if (order.delivery_address && typeof order.delivery_address === 'object') {
      const addr = order.delivery_address;
      const lat = addr.latitude || addr.lat;
      const lng = addr.longitude || addr.lng;
      if (lat && lng) {
        return [lat, lng];
      }
    }
    // إذا لا يوجد GPS، نرجع null
    return null;
  };

  // الحصول على إحداثيات المتجر - GPS حقيقي فقط
  const getStoreCoordinates = (order) => {
    // إذا كان المتجر يحتوي على إحداثيات GPS مباشرة
    if (order.store_latitude && order.store_longitude) {
      return [order.store_latitude, order.store_longitude];
    }
    // إذا كان store_location موجود (الصيغة الجديدة)
    if (order.store_location?.latitude && order.store_location?.longitude) {
      return [order.store_location.latitude, order.store_location.longitude];
    }
    // إذا لا يوجد GPS للمتجر، نستخدم إحداثيات الطلب مع إزاحة صغيرة
    if (order.latitude && order.longitude) {
      return [order.latitude + 0.002, order.longitude + 0.002];
    }
    return null;
  };

  // تجميع جميع العلامات
  const markers = [];

  // إضافة موقع السائق (من GPS الهاتف أو من props)
  const activeDriverLocation = currentDriverLocation || driverLocation;
  if (activeDriverLocation) {
    markers.push({
      id: 'driver',
      type: 'driver',
      position: [activeDriverLocation.latitude, activeDriverLocation.longitude],
      title: 'موقعك الحالي',
      icon: driverIcon
    });
  }

  // إضافة طلبات الطعام - فقط التي لديها GPS (استبعاد طلباتي)
  const myFoodOrderIds = new Set(myFoodOrders.map(o => o.id));
  foodOrders.forEach(order => {
    // ⭐ استبعاد الطلبات التي قبلها السائق بالفعل
    if (myFoodOrderIds.has(order.id)) return;
    
    const customerCoords = getOrderCoordinates(order);
    const storeCoords = getStoreCoordinates(order);
    
    // موقع المتجر (إذا متوفر)
    if (storeCoords) {
      markers.push({
        id: `food-store-${order.id}`,
        type: 'food-store',
        position: storeCoords,
        title: order.store_name || 'متجر طعام',
        order: order,
        icon: foodStoreIcon
      });
    }
    
    // موقع العميل (إذا متوفر)
    if (customerCoords) {
      markers.push({
        id: `customer-${order.id}`,
        type: 'customer',
        position: customerCoords,
        title: order.customer_name || 'العميل',
        order: order,
        icon: customerIcon,
        hasRealGPS: true
      });
    }
  });

  // إضافة طلبات المنتجات - فقط التي لديها GPS (استبعاد طلباتي)
  const myOrderIds = new Set(myOrders.map(o => o.id));
  orders.forEach(order => {
    if (order.order_source === 'food') return;
    // ⭐ استبعاد الطلبات التي قبلها السائق بالفعل
    if (myOrderIds.has(order.id)) return;
    
    const customerCoords = getOrderCoordinates(order);
    const storeCoords = getStoreCoordinates(order);
    
    // موقع البائع (إذا متوفر)
    if (storeCoords) {
      markers.push({
        id: `product-store-${order.id}`,
        type: 'product-store',
        position: storeCoords,
        title: order.seller_name || 'متجر',
        order: order,
        icon: productStoreIcon
      });
    }
    
    // موقع العميل (إذا متوفر)
    if (customerCoords) {
      markers.push({
        id: `product-customer-${order.id}`,
        type: 'customer',
        position: customerCoords,
        title: order.customer_name || 'العميل',
        order: order,
        icon: customerIcon,
        hasRealGPS: true
      });
    }
  });

  // إضافة طلباتي من الطعام (المقبولة والنشطة فقط)
  activeMyFoodOrders.forEach(order => {
    const customerCoords = getOrderCoordinates(order);
    const storeCoords = getStoreCoordinates(order);
    
    // موقع المتجر (إذا متوفر)
    if (storeCoords) {
      markers.push({
        id: `my-food-store-${order.id}`,
        type: 'food-store',
        position: storeCoords,
        title: order.store_name || 'متجر طعام',
        order: order,
        icon: foodStoreIcon,
        isMyOrder: true
      });
    }
    
    // موقع العميل (إذا متوفر)
    if (customerCoords) {
      markers.push({
        id: `my-food-customer-${order.id}`,
        type: 'customer',
        position: customerCoords,
        title: order.customer_name || 'العميل',
        order: order,
        icon: customerIcon,
        hasRealGPS: true,
        isMyOrder: true
      });
    }
  });

  // إضافة طلباتي من المنتجات (المقبولة والنشطة فقط)
  activeMyOrders.forEach(order => {
    if (order.order_source === 'food') return;
    
    const customerCoords = getOrderCoordinates(order);
    const storeCoords = getStoreCoordinates(order);
    
    // موقع البائع (إذا متوفر)
    if (storeCoords) {
      markers.push({
        id: `my-product-store-${order.id}`,
        type: 'product-store',
        position: storeCoords,
        title: order.seller_name || 'متجر',
        order: order,
        icon: productStoreIcon,
        isMyOrder: true
      });
    }
    
    // موقع العميل (إذا متوفر)
    if (customerCoords) {
      markers.push({
        id: `my-product-customer-${order.id}`,
        type: 'customer',
        position: customerCoords,
        title: order.customer_name || 'العميل',
        order: order,
        icon: customerIcon,
        hasRealGPS: true,
        isMyOrder: true
      });
    }
  });

  // ⭐ إنشاء خطوط ملونة تربط كل متجر بعميله (ألوان غامقة وأعرض)
  const MY_FOOD_COLOR = '#15803D'; // أخضر غامق - طلباتي الطعام
  const MY_PRODUCT_COLOR = '#7C3AED'; // بنفسجي غامق - طلباتي المنتجات

  const orderRouteLines = useMemo(() => {
    const lines = [];

    // خطوط لطلبات الطعام الخاصة بي (النشطة فقط)
    activeMyFoodOrders.forEach(order => {
      const storeCoords = getStoreCoordinates(order);
      const customerCoords = getOrderCoordinates(order);
      
      if (storeCoords && customerCoords) {
        lines.push({
          id: `route-food-${order.id}`,
          positions: [storeCoords, customerCoords],
          color: MY_FOOD_COLOR,
          dashArray: null, // خط متصل دائماً
          weight: 6,
          opacity: 0.9,
          orderId: order.id,
          storeName: order.store_name || order.restaurant_name,
          customerName: order.customer_name
        });
      }
    });

    // خطوط لطلبات المنتجات الخاصة بي (النشطة فقط)
    activeMyOrders.forEach(order => {
      if (order.order_source === 'food') return;
      
      const storeCoords = getStoreCoordinates(order);
      const customerCoords = getOrderCoordinates(order);
      
      if (storeCoords && customerCoords) {
        lines.push({
          id: `route-product-${order.id}`,
          positions: [storeCoords, customerCoords],
          color: MY_PRODUCT_COLOR,
          dashArray: null, // خط متصل دائماً
          weight: 6,
          opacity: 0.9,
          orderId: order.id,
          storeName: order.seller_name || order.store_name,
          customerName: order.customer_name
        });
      }
    });

    return lines;
  }, [activeMyFoodOrders, activeMyOrders]);

  // ⭐ خطوط للطلبات المتاحة (ألوان غامقة وأعرض)
  const availableRouteLines = useMemo(() => {
    const lines = [];
    const AVAILABLE_FOOD_COLOR = '#D97706'; // برتقالي غامق - طلبات الطعام المتاحة
    const AVAILABLE_PRODUCT_COLOR = '#1D4ED8'; // أزرق غامق - طلبات المنتجات المتاحة
    
    // خطوط لطلبات الطعام المتاحة
    foodOrders.forEach(order => {
      const storeCoords = getStoreCoordinates(order);
      const customerCoords = getOrderCoordinates(order);
      
      if (storeCoords && customerCoords) {
        lines.push({
          id: `avail-food-${order.id}`,
          positions: [storeCoords, customerCoords],
          color: AVAILABLE_FOOD_COLOR,
          dashArray: null, // خط متصل
          weight: 5,
          opacity: 0.85,
          orderId: order.id,
          storeName: order.store_name || order.restaurant_name,
          customerName: order.customer_name,
          isAvailable: true
        });
      }
    });

    // خطوط لطلبات المنتجات المتاحة
    orders.forEach(order => {
      if (order.order_source === 'food') return;
      
      const storeCoords = getStoreCoordinates(order);
      const customerCoords = getOrderCoordinates(order);
      
      if (storeCoords && customerCoords) {
        lines.push({
          id: `avail-product-${order.id}`,
          positions: [storeCoords, customerCoords],
          color: AVAILABLE_PRODUCT_COLOR,
          dashArray: null, // خط متصل
          weight: 5,
          opacity: 0.85,
          orderId: order.id,
          storeName: order.seller_name || order.store_name,
          customerName: order.customer_name,
          isAvailable: true
        });
      }
    });

    return lines;
  }, [foodOrders, orders]);

  // تصفية العلامات حسب الطبقة المختارة + فلتر الطلبات + التحقق من صحة الإحداثيات
  const filteredMarkers = markers.filter(m => {
    // التحقق من وجود إحداثيات صحيحة
    if (!m.position || !m.position[0] || !m.position[1] || 
        isNaN(m.position[0]) || isNaN(m.position[1])) {
      return false;
    }
    
    // السائق يظهر دائماً
    if (m.type === 'driver') return true;
    
    // ⭐ تطبيق فلتر الطلبات (متاحة / طلباتي / الكل)
    if (orderFilter === 'available') {
      // فقط الطلبات المتاحة (غير المقبولة من السائق)
      if (m.isMyOrder) return false;
    } else if (orderFilter === 'myOrders') {
      // فقط طلباتي المقبولة
      if (!m.isMyOrder) return false;
    }
    // orderFilter === 'all' يعرض الجميع
    
    // تطبيق فلتر الطبقات (طعام / منتجات / عملاء)
    if (showLayer === 'all') return true;
    if (showLayer === 'food') return m.type === 'food-store';
    if (showLayer === 'products') return m.type === 'product-store';
    if (showLayer === 'customers') return m.type === 'customer';
    return true;
  });

  // عدد الطلبات التي لديها GPS
  const ordersWithGPS = markers.filter(m => m.type === 'customer' && m.hasRealGPS).length;
  // حساب عدد الطلبات - يشمل الطلبات المتاحة وطلباتي (النشطة فقط)
  const totalOrders = (foodOrders?.length || 0) + (orders?.length || 0) + activeOrdersCount;
  
  // هل نعرض طلباتي فقط (بدون طلبات متاحة)؟
  const isMyOrdersOnly = activeOrdersCount > 0 && orders?.length === 0 && foodOrders?.length === 0;

  return (
    <>
      {/* زر فتح الخريطة */}
      <OpenMapButton
        onClick={() => setIsOpen(true)}
        totalOrders={totalOrders}
        isMyOrdersOnly={isMyOrdersOnly}
      />

      {/* نافذة الخريطة */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed z-[9999]"
            style={{ top: 0, left: 0, right: 0, bottom: 0, margin: 0, padding: 0 }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={`w-full h-full ${currentTheme === 'dark' ? 'bg-[#0f0f0f]' : 'bg-gray-100'}`}
              style={{ paddingTop: 'env(safe-area-inset-top)', margin: 0 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header شريط علوي موحد */}
              <MapTopBar
                onClose={() => setIsOpen(false)}
                onLocateDriver={getDriverLocation}
                themeMode={themeMode}
                setThemeMode={setThemeMode}
                currentTheme={currentTheme}
                setCurrentTheme={setCurrentTheme}
              />

              {/* رسالة خطأ GPS */}
              <GpsErrorMessage
                gpsError={gpsError}
                onRetry={() => {
                  setGpsRequested(false);
                  setGpsError(null);
                  getDriverLocation();
                }}
              />

              {/* فلاتر الطبقات */}
              <MapLayerFilters
                showLayer={showLayer}
                setShowLayer={setShowLayer}
                currentTheme={currentTheme}
              />

              {/* ⭐ فلاتر الطلبات: متاحة / طلباتي / الكل */}
              <MapOrderFilters
                orderFilter={orderFilter}
                setOrderFilter={setOrderFilter}
                availableCount={(orders?.length || 0) + (foodOrders?.length || 0)}
                activeOrdersCount={activeOrdersCount}
                currentTheme={currentTheme}
              />

              {/* زر عرض ملخص المحطات + بطاقة الملخص */}
              <StationsSummary
                show={showStationsSummary}
                stations={orderedStations}
                totalDistance={totalDistance}
                totalEarnings={totalEarnings}
                onToggle={() => setShowStationsSummary(!showStationsSummary)}
                isDark={currentTheme === 'dark'}
              />

              {/* ⭐ إشعار الأولوية الذكية (طلب من نفس المطعم) */}
              <PriorityPopup
                showPriorityPopup={showPriorityPopup}
                priorityOrder={priorityOrder}
                priorityCountdown={priorityCountdown}
                onAccept={acceptPriorityOrder}
                onReject={rejectPriorityOrder}
              />

              {/* رسالة الخطأ - أعلى الشاشة مع شريط تقدم */}
              <MapErrorToast 
                error={mapError} 
                onClose={() => setMapError(null)} 
              />

              {/* ⭐ شريط وضع الملاحة */}
              <NavigationBar
                isNavigationMode={isNavigationMode}
                toggleNavigationMode={toggleNavigationMode}
                driverSpeed={driverSpeed}
                routeInfo={routeInfo}
                estimatedArrival={estimatedArrival}
                distanceFromRoute={distanceFromRoute}
              />

              {/* ⭐ زر تفعيل وضع الملاحة (عند وجود مسار) */}
              <ActivateNavigationButton
                hasRoute={routeCoordinates.length > 0}
                isNavigationMode={isNavigationMode}
                toggleNavigationMode={toggleNavigationMode}
              />

              {/* زر فتح Google Maps */}
              <GoogleMapsButton
                show={activeOrdersCount > 0 && !stepByStepMode}
                activeMyOrders={activeMyOrders}
                activeMyFoodOrders={activeMyFoodOrders}
                currentDriverLocation={currentDriverLocation}
              />

              {/* الخريطة - ملء الشاشة */}
              <div className="h-[calc(100vh-62px)]">
                <MapContainer
                  center={mapCenter}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={true}
                >
                  {/* خريطة تتبدل حسب الثيم - مع دعم اللغة العربية */}
                  <TileLayer
                    key={currentTheme} // مهم لإعادة تحميل الخريطة عند تغيير الثيم
                    attribution='&copy; OpenStreetMap'
                    url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&hl=ar"
                    className={currentTheme === 'dark' ? 'dark-map-tiles' : ''}
                  />
                  <MapUpdater center={mapCenter} zoom={12} />
                  
                  {/* ⭐ خطوط ملونة تربط كل متجر بعميله (طلباتي) */}
                  {orderFilter !== 'available' && orderRouteLines.map(line => (
                    <Polyline
                      key={line.id}
                      positions={line.positions}
                      pathOptions={{
                        color: line.color,
                        weight: line.weight,
                        opacity: line.opacity,
                        dashArray: line.dashArray
                      }}
                    >
                      <Popup>
                        <RouteLinePopup line={line} isAvailable={false} />
                      </Popup>
                    </Polyline>
                  ))}
                  
                  {/* ⭐ خطوط للطلبات المتاحة (أخضر متقطع) */}
                  {orderFilter !== 'myOrders' && availableRouteLines.map(line => (
                    <Polyline
                      key={line.id}
                      positions={line.positions}
                      pathOptions={{
                        color: line.color,
                        weight: line.weight,
                        opacity: line.opacity,
                        dashArray: line.dashArray
                      }}
                    >
                      <Popup>
                        <RouteLinePopup line={line} isAvailable={true} />
                      </Popup>
                    </Polyline>
                  ))}

                  {filteredMarkers.map(marker => (
                    <Marker
                      key={marker.id}
                      position={marker.position}
                      icon={marker.icon}
                      eventHandlers={{
                        click: () => setSelectedMarker(marker)
                      }}
                    >
                      <Popup>
                        <MarkerPopupContent
                          marker={marker}
                          onAcceptFoodOrder={handleAcceptFoodOrderFromMap}
                          onAcceptOrder={handleAcceptOrderFromMap}
                          onShowRoute={showRouteForOrder}
                        />
                      </Popup>
                    </Marker>
                  ))}

                  {/* رسم المسار */}
                  {routeCoordinates.length > 0 && (
                    <>
                      {/* خط المسار */}
                      <Polyline
                        positions={routeCoordinates}
                        color="#f97316"
                        weight={6}
                        opacity={0.9}
                      />
                      {/* خط متقطع فوق المسار للتوضيح */}
                      <Polyline
                        positions={routeCoordinates}
                        color="#ffffff"
                        weight={2}
                        opacity={0.5}
                        dashArray="10, 15"
                      />
                    </>
                  )}

                  {/* رسم المسارات المتعددة (جميع طلباتي) */}
                  {showAllMyRoutes && multiRouteSegments.length > 0 && (
                    <>
                      {/* رسم كل segment بلون مختلف */}
                      {multiRouteSegments.map((segment, idx) => (
                        <Polyline
                          key={`segment-${idx}`}
                          positions={segment.coordinates}
                          color={segment.color}
                          weight={6}
                          opacity={0.9}
                        />
                      ))}
                      
                      {/* خط أبيض متقطع فوق المسار */}
                      {multiRouteSegments.map((segment, idx) => (
                        <Polyline
                          key={`segment-dash-${idx}`}
                          positions={segment.coordinates}
                          color="#ffffff"
                          weight={2}
                          opacity={0.4}
                          dashArray="8, 12"
                        />
                      ))}
                    </>
                  )}

                  {/* علامات النقاط المُرقمة (جميع طلباتي) */}
                  {showAllMyRoutes && optimizedStops.length > 0 && (
                    <>
                      {optimizedStops.filter(stop => 
                        stop.position && stop.position[0] && stop.position[1] && 
                        !isNaN(stop.position[0]) && !isNaN(stop.position[1])
                      ).map((stop, idx) => {
                        // تحديد لون العلامة
                        let bgColor = '#f97316'; // برتقالي للسائق
                        let emoji = '🏍️';
                        
                        if (stop.type === 'store') {
                          bgColor = stop.isFood ? '#22c55e' : '#3b82f6';
                          emoji = stop.isFood ? '🍔' : '📦';
                        } else if (stop.type === 'customer') {
                          bgColor = '#ef4444';
                          emoji = '🏠';
                        }

                        return (
                          <Marker
                            key={`stop-${idx}`}
                            position={stop.position}
                            icon={L.divIcon({
                              className: 'numbered-stop-marker',
                              html: `<div style="
                                position: relative;
                                width: 44px;
                                height: 44px;
                              ">
                                <div style="
                                  background: ${bgColor};
                                  width: 40px;
                                  height: 40px;
                                  border-radius: 50%;
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                  font-size: 18px;
                                  border: 3px solid white;
                                  box-shadow: 0 3px 12px rgba(0,0,0,0.4);
                                ">${emoji}</div>
                                <div style="
                                  position: absolute;
                                  top: -8px;
                                  right: -8px;
                                  background: #1f2937;
                                  color: white;
                                  width: 22px;
                                  height: 22px;
                                  border-radius: 50%;
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                  font-size: 11px;
                                  font-weight: bold;
                                  border: 2px solid white;
                                  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                                ">${stop.stopNumber}</div>
                              </div>`,
                              iconSize: [44, 44],
                              iconAnchor: [22, 44],
                              popupAnchor: [0, -44]
                            })}
                          >
                            <Popup>
                              <StopMarkerPopup stop={stop} />
                            </Popup>
                          </Marker>
                        );
                      })}
                    </>
                  )}

                  {/* علامات نقاط المسار عند تفعيله */}
                  {selectedOrderForRoute && routeCoordinates.length > 0 && (
                    <>
                      {/* علامة البداية (موقع السائق) */}
                      {(currentDriverLocation || driverLocation) && 
                       (currentDriverLocation?.latitude || driverLocation?.latitude) && (
                        <Marker
                          position={[
                            (currentDriverLocation || driverLocation).latitude,
                            (currentDriverLocation || driverLocation).longitude
                          ]}
                          icon={createRoutePointIcon('#f97316', 1)}
                        >
                          <Popup>📍 موقعك (نقطة البداية)</Popup>
                        </Marker>
                      )}
                      
                      {/* علامة المتجر */}
                      {selectedOrderForRoute.store_latitude && selectedOrderForRoute.store_longitude && (
                        <Marker
                          position={[
                            selectedOrderForRoute.store_latitude,
                            selectedOrderForRoute.store_longitude
                          ]}
                          icon={createRoutePointIcon('#22c55e', 2)}
                        >
                          <Popup>🏪 المتجر (استلام الطلب)</Popup>
                        </Marker>
                      )}
                      
                      {/* علامة العميل */}
                      {selectedOrderForRoute.latitude && selectedOrderForRoute.longitude && (
                        <Marker
                          position={[
                            selectedOrderForRoute.latitude,
                            selectedOrderForRoute.longitude
                          ]}
                          icon={createRoutePointIcon('#ef4444', 3)}
                        >
                          <Popup>🏠 العميل (تسليم الطلب)</Popup>
                        </Marker>
                      )}
                    </>
                  )}

                  {/* رسم المسار في وضع خطوة بخطوة */}
                  {stepByStepMode && currentStepRoute.length > 0 && (
                    <>
                      {/* خط المسار */}
                      <Polyline
                        positions={currentStepRoute}
                        color={allStepsData[currentStepIndex]?.to?.type === 'store' 
                          ? (allStepsData[currentStepIndex]?.to?.isFood ? '#22c55e' : '#3b82f6')
                          : '#ef4444'}
                        weight={7}
                        opacity={0.9}
                      />
                      {/* خط متقطع أبيض */}
                      <Polyline
                        positions={currentStepRoute}
                        color="#ffffff"
                        weight={2}
                        opacity={0.5}
                        dashArray="10, 15"
                      />
                      
                      {/* علامة الوجهة الحالية */}
                      {allStepsData[currentStepIndex] && 
                       allStepsData[currentStepIndex].to?.position &&
                       allStepsData[currentStepIndex].to.position[0] &&
                       allStepsData[currentStepIndex].to.position[1] && (
                        <Marker
                          position={allStepsData[currentStepIndex].to.position}
                          icon={L.divIcon({
                            className: 'step-destination-marker',
                            html: `<div style="
                              background: ${allStepsData[currentStepIndex].to.type === 'store' 
                                ? (allStepsData[currentStepIndex].to.isFood ? '#22c55e' : '#3b82f6')
                                : '#ef4444'};
                              width: 50px;
                              height: 50px;
                              border-radius: 50%;
                              display: flex;
                              align-items: center;
                              justify-content: center;
                              font-size: 24px;
                              border: 4px solid white;
                              box-shadow: 0 4px 15px rgba(0,0,0,0.4);
                              animation: pulse 1.5s infinite;
                            ">${allStepsData[currentStepIndex].to.type === 'store' 
                              ? (allStepsData[currentStepIndex].to.isFood ? '🍔' : '📦')
                              : '🏠'}</div>
                            <style>
                              @keyframes pulse {
                                0%, 100% { transform: scale(1); }
                                50% { transform: scale(1.1); }
                              }
                            </style>`,
                            iconSize: [50, 50],
                            iconAnchor: [25, 50],
                            popupAnchor: [0, -50]
                          })}
                        >
                          <Popup>
                            <div className="text-center min-w-[150px]">
                              <p className="font-bold text-sm mb-1">
                                {allStepsData[currentStepIndex].to.type === 'store' ? '📦 استلام الطلب' : '🚚 تسليم الطلب'}
                              </p>
                              <p className="text-xs text-gray-600">{allStepsData[currentStepIndex].to.label}</p>
                              {allStepsData[currentStepIndex].to.order && (
                                <p className="text-xs text-gray-400 mt-1">
                                  🔒 رقم العميل مخفي
                                </p>
                              )}
                            </div>
                          </Popup>
                        </Marker>
                      )}
                    </>
                  )}
                </MapContainer>

                {/* بطاقة التنقل خطوة بخطوة */}
                {/* بطاقة خطوة بخطوة */}
                <StepByStepCard
                  stepByStepMode={stepByStepMode}
                  allStepsData={allStepsData}
                  currentStepIndex={currentStepIndex}
                  routeInfo={routeInfo}
                  stopStepByStep={stopStepByStep}
                  goToNextStep={goToNextStep}
                />

                {/* معلومات المسار */}
                <RouteDetailsCard
                  routeInfo={routeInfo}
                  selectedOrderForRoute={selectedOrderForRoute}
                  hideRoute={hideRoute}
                  toggleNavigationMode={toggleNavigationMode}
                  speakInstruction={speakInstruction}
                  onCallRequest={async (order) => {
                    try {
                      const res = await axios.post(`${API}/api/call-requests`, {
                        order_id: order.id,
                        order_type: order.store_id ? 'food' : 'shopping',
                        reason: 'العميل لا يرد على الاتصال'
                      });
                      alert('✅ تم إرسال طلب للموظف. سيتواصل مع العميل ويبلغك.');
                    } catch (err) {
                      alert(err.response?.data?.detail || 'حدث خطأ');
                    }
                  }}
                />

                {/* معلومات المسار المُحسَّن (جميع الطلبات) */}
                <OptimizedRouteCard
                  routeInfo={routeInfo}
                  showAllMyRoutes={showAllMyRoutes}
                  hideAllRoutes={hideAllRoutes}
                  optimizedStops={optimizedStops}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ⭐ Popup الطلب العاجل - يظهر حتى لو الخريطة مغلقة */}
      <ExternalPriorityPopup
        showPriorityPopup={showPriorityPopup}
        priorityOrder={priorityOrder}
        priorityCountdown={priorityCountdown}
        isMapOpen={isOpen}
        onAccept={acceptPriorityOrder}
        onReject={rejectPriorityOrder}
      />
    </>
  );
};

export default OrdersMap;
