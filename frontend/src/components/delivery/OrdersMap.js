import { useState, useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, X, Navigation, Phone, PhoneOff, Package, UtensilsCrossed, Locate, Layers, Route } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import useNotificationSound from '../../hooks/useNotificationSound';

const API = process.env.REACT_APP_BACKEND_URL;

// إصلاح مشكلة أيقونات Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// أيقونات مخصصة - محسّنة للوضع الداكن
const createIcon = (color, emoji, size = 44) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${size * 0.5}px;
      border: 4px solid white;
      box-shadow: 0 4px 15px rgba(0,0,0,0.5), 0 0 20px ${color}40;
      position: relative;
    ">${emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size],
    popupAnchor: [0, -size]
  });
};

// أيقونة مرقمة للمحطات
const createNumberedIcon = (color, number, size = 44) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: ${size * 0.45}px;
      font-weight: bold;
      color: white;
      border: 4px solid white;
      box-shadow: 0 4px 15px rgba(0,0,0,0.5), 0 0 20px ${color}40;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    ">${number}</div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size],
    popupAnchor: [0, -size]
  });
};

// ألوان محسّنة للوضع الداكن
const foodStoreIcon = createIcon('#22c55e', '🍔', 48); // أخضر ساطع - أكبر
const productStoreIcon = createIcon('#3b82f6', '📦', 48); // أزرق ساطع
const customerIcon = createIcon('#f59e0b', '🏠', 44); // أصفر/برتقالي للعميل
const driverIcon = createIcon('#ffffff', '🏍️', 50); // أبيض للسائق - الأكبر

// مكون لتحديث مركز الخريطة
const MapUpdater = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 13);
    }
  }, [center, zoom, map]);
  return null;
};

// إحداثيات دمشق كافتراضي فقط
const DEFAULT_CENTER = [33.5138, 36.2765];

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
  
  // تحديد الثيم الفعلي (للوضع التلقائي)
  const getEffectiveTheme = () => {
    if (theme === 'auto') {
      const hour = new Date().getHours();
      return (hour >= 6 && hour < 18) ? 'light' : 'dark';
    }
    return theme;
  };
  const effectiveTheme = getEffectiveTheme();
  const isDark = effectiveTheme === 'dark';
  
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [showLayer, setShowLayer] = useState('all'); // all, food, products, customers
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [currentDriverLocation, setCurrentDriverLocation] = useState(null);
  const [selectedOrderForRoute, setSelectedOrderForRoute] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [multiRouteSegments, setMultiRouteSegments] = useState([]); // مسارات متعددة
  const [showAllMyRoutes, setShowAllMyRoutes] = useState(false); // عرض جميع مسارات طلباتي
  const [optimizedStops, setOptimizedStops] = useState([]); // النقاط المُرقمة المُحسَّنة
  
  // ⭐ فلتر الطلبات الجديد: متاحة / طلباتي / الكل
  const [orderFilter, setOrderFilter] = useState('myOrders'); // 'available', 'myOrders', 'all'
  const [selectedAvailableOrder, setSelectedAvailableOrder] = useState(null); // الطلب المتاح المحدد للـ popup
  
  // 🔊 أصوات الإشعارات المختلفة
  const { playPriority, playSuccess } = useNotificationSound();
  
  // ⭐ نظام الثيم (فاتح/داكن) مع تبديل تلقائي
  const [themeMode, setThemeMode] = useState(() => {
    // استرجاع الإعداد المحفوظ من الصفحة الرئيسية أو استخدام القيمة من props
    return localStorage.getItem('driverThemeMode') || theme || 'auto';
  });
  const [currentTheme, setCurrentTheme] = useState(() => {
    // تحديد الثيم الابتدائي
    const savedMode = localStorage.getItem('driverThemeMode') || theme || 'auto';
    if (savedMode === 'auto') {
      const hour = new Date().getHours();
      return (hour >= 6 && hour < 18) ? 'light' : 'dark';
    }
    return savedMode;
  });
  
  // حساب الثيم التلقائي حسب الوقت
  useEffect(() => {
    const updateAutoTheme = () => {
      // قراءة الإعداد من localStorage (قد يتغير من الصفحة الرئيسية)
      const savedMode = localStorage.getItem('driverThemeMode') || theme || 'auto';
      
      // تحديث themeMode فقط إذا تغير لتجنب الحلقة اللانهائية
      if (savedMode !== themeMode) {
        setThemeMode(savedMode);
      }
      
      if (savedMode === 'auto') {
        const hour = new Date().getHours();
        // من 6 صباحاً إلى 6 مساءً = فاتح
        const isDay = hour >= 6 && hour < 18;
        setCurrentTheme(isDay ? 'light' : 'dark');
      } else {
        setCurrentTheme(savedMode);
      }
    };
    
    updateAutoTheme();
    // تحديث كل ثانية لالتقاط التغييرات من الصفحة الرئيسية
    const interval = setInterval(updateAutoTheme, 1000);
    return () => clearInterval(interval);
  }, [theme]); // إضافة theme للـ dependencies
  
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
  const [priorityCountdown, setPriorityCountdown] = useState(0); // العد التنازلي
  const [showPriorityPopup, setShowPriorityPopup] = useState(false);
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
      console.log('Error loading rejected orders:', e);
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

  // ⭐ مراقبة تغيير عدد الطلبات - لإعادة إظهار الطلبات المؤجلة عند انخفاض العدد
  useEffect(() => {
    const currentOrderCount = (myFoodOrders?.length || 0) + (myOrders?.length || 0);
    
    // إذا انخفض عدد الطلبات (السائق سلّم طلب)
    if (currentOrderCount < previousOrderCount && maxLimitOrderIds.length > 0) {
      // مسح قائمة الطلبات المؤجلة بسبب الحد الأقصى
      setMaxLimitOrderIds([]);
      maxLimitOrderIdsRef.current = [];
      console.log('تم مسح الطلبات المؤجلة - أصبح لديك مجال لطلبات جديدة');
    }
    
    setPreviousOrderCount(currentOrderCount);
  }, [myFoodOrders, myOrders, previousOrderCount, maxLimitOrderIds.length]);

  // ⭐ جلب طلبات الأولوية كل 10 ثواني
  useEffect(() => {
    let intervalId = null;
    
    // الحد الأقصى للطلبات (من نفس المطعم = 7، من مطاعم مختلفة = 5)
    const MAX_ORDERS_SAME_STORE = 7;
    
    if (isOpen && (myFoodOrders?.length > 0 || myOrders?.length > 0)) {
      const checkPriorityOrders = async () => {
        // تحقق إذا تم إيقاف الإشعارات مؤقتاً
        if (Date.now() < dismissedPriorityUntil) {
          return;
        }
        
        // لا تعرض popup جديد إذا كان هناك popup مفتوح
        if (showPriorityPopup || priorityOrder) {
          return;
        }
        
        // ⭐ التحقق من الحد الأقصى - لا تعرض popup إذا السائق وصل للحد
        const currentOrdersCount = (myFoodOrders?.length || 0) + (myOrders?.length || 0);
        if (currentOrdersCount >= MAX_ORDERS_SAME_STORE) {
          console.log('🚫 السائق وصل للحد الأقصى، لن يظهر popup الأولوية:', currentOrdersCount);
          return;
        }
        
        try {
          const response = await axios.get(`${API}/api/food/orders/delivery/priority-orders`);
          const priorityOrders = response.data.priority_orders || [];
          
          // تصفية الطلبات المرفوضة يدوياً والمؤجلة بسبب الحد الأقصى
          // استخدام الـ refs للحصول على القيم الحالية الصحيحة
          const allExcludedIds = [...rejectedOrderIdsRef.current, ...maxLimitOrderIdsRef.current];
          const availableOrders = priorityOrders.filter(o => !allExcludedIds.includes(o.id));
          
          console.log('Priority check:', { 
            total: priorityOrders.length, 
            rejected: rejectedOrderIdsRef.current.length,
            maxLimit: maxLimitOrderIdsRef.current.length,
            excluded: allExcludedIds.length,
            available: availableOrders.length,
            currentOrders: currentOrdersCount,
            maxOrderLimit: MAX_ORDERS_SAME_STORE
          });
          
          // إذا وجد طلب جديد ذو أولوية
          if (availableOrders.length > 0) {
            const newPriorityOrder = availableOrders[0];
            setPriorityOrder(newPriorityOrder);
            setPriorityCountdown(15);
            setShowPriorityPopup(true);
            
            // 🔊 تشغيل صوت الأولوية العاجل
            playPriority();
            announcePriorityOrder(newPriorityOrder.store_name);
          }
        } catch (error) {
          console.error('Error checking priority orders:', error);
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
  }, [isOpen, myFoodOrders, myOrders, dismissedPriorityUntil]); // إزالة rejectedOrderIds لأننا نستخدم ref

  // ⭐ العد التنازلي للأولوية - الـ popup يبقى ظاهراً بعد انتهاء العد
  useEffect(() => {
    let countdownInterval = null;
    
    if (showPriorityPopup && priorityCountdown > 0) {
      countdownInterval = setInterval(() => {
        setPriorityCountdown(prev => {
          if (prev <= 1) {
            // انتهى الوقت - لكن الـ popup يبقى ظاهراً!
            // فقط نوقف العد عند 0
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [showPriorityPopup, priorityCountdown]);

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
        console.log('🚫 تم تأجيل الطلب بسبب الحد الأقصى:', orderId);
        console.log('📋 قائمة المؤجلة الآن:', maxLimitOrderIdsRef.current);
        
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
      const newRejectedIds = rejectedOrderIds.includes(orderId) 
        ? rejectedOrderIds 
        : [...rejectedOrderIds, orderId];
      
      setRejectedOrderIds(newRejectedIds);
      
      // تحديث الـ ref فوراً لمنع الـ interval من إظهار الطلب مرة أخرى
      if (!rejectedOrderIdsRef.current.includes(orderId)) {
        rejectedOrderIdsRef.current = [...rejectedOrderIdsRef.current, orderId];
      }
      
      // حفظ في localStorage مع timestamp
      try {
        const savedData = JSON.parse(localStorage.getItem('rejectedOrderIds') || '[]');
        if (!savedData.find(e => e.id === orderId)) {
          savedData.push({ id: orderId, timestamp: Date.now() });
          localStorage.setItem('rejectedOrderIds', JSON.stringify(savedData));
        }
      } catch (e) {
        console.log('Error saving rejected order:', e);
      }
      
      console.log('❌ تم رفض الطلب:', orderId);
      console.log('📋 قائمة المرفوضة الآن:', rejectedOrderIdsRef.current);
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
                console.log('🔄 إعادة حساب المسار - ابتعدت عن المسار');
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
                  console.log('🎯 تم الإعلان عن الوصول إلى:', destinationName);
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
            console.error('خطأ GPS:', error);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
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

  // ⭐ حساب المسافة من نقطة لأقرب نقطة على المسار
  const calculateDistanceFromRoute = (location, routePoints) => {
    if (!routePoints || routePoints.length === 0) return 0;
    
    let minDistance = Infinity;
    for (const point of routePoints) {
      const dist = calculateDistanceKm(
        location.latitude, location.longitude,
        point[0], point[1]
      );
      if (dist < minDistance) {
        minDistance = dist;
      }
    }
    return minDistance;
  };

  // ⭐ حساب المسافة بين نقطتين بالكيلومتر
  const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // ⭐ تشغيل التنبيهات الصوتية - محسّن مع قراءة إعدادات المستخدم
  const speakInstruction = (text, options = {}) => {
    // التحقق من تفعيل الصوت الناطق
    const voiceEnabled = localStorage.getItem('voiceAnnouncementEnabled') !== 'false';
    if (!voiceEnabled) return;
    
    if ('speechSynthesis' in window) {
      // إلغاء أي كلام سابق
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // قراءة الإعدادات المحفوظة من localStorage
      const savedVoiceName = localStorage.getItem('selectedVoiceName');
      const savedVolume = parseFloat(localStorage.getItem('voiceVolume') || '1');
      const savedRate = parseFloat(localStorage.getItem('voiceRate') || '0.9');
      const savedPitch = parseFloat(localStorage.getItem('voicePitch') || '1.1');
      
      // دالة لتطبيق الإعدادات وتشغيل الصوت
      const applySettingsAndSpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        let selectedVoice = null;
        
        // البحث عن الصوت المحدد
        if (savedVoiceName) {
          selectedVoice = voices.find(v => v.name === savedVoiceName);
        }
        
        // إذا لم يوجد الصوت المحدد، استخدم صوت عربي افتراضي
        if (!selectedVoice) {
          selectedVoice = voices.find(v => 
            v.lang.startsWith('ar') && (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Apple'))
          ) || voices.find(v => v.lang.startsWith('ar'));
        }
        
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
        
        utterance.lang = 'ar-SA';
        // تطبيق الإعدادات - القيم من localStorage مباشرة
        utterance.rate = savedRate;
        utterance.pitch = savedPitch;
        utterance.volume = savedVolume;
        
        // تجاوز بالقيم من options إذا وجدت
        if (options.rate !== undefined) utterance.rate = options.rate;
        if (options.pitch !== undefined) utterance.pitch = options.pitch;
        if (options.volume !== undefined) utterance.volume = options.volume;
        
        window.speechSynthesis.speak(utterance);
      };
      
      // التأكد من تحميل الأصوات قبل التشغيل
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        applySettingsAndSpeak();
      } else {
        // انتظار تحميل الأصوات
        window.speechSynthesis.onvoiceschanged = () => {
          applySettingsAndSpeak();
        };
        // تشغيل بعد تأخير كبديل
        setTimeout(applySettingsAndSpeak, 100);
      }
    }
  };

  // 🔊 رسائل صوتية محسّنة للسائقين
  const announceNewOrder = (orderDetails = {}) => {
    const { storeName, total, distance, isFood } = orderDetails;
    let message = isFood ? 'طلب طعام جديد!' : 'طلب جديد!';
    
    if (storeName) {
      message += ` من ${storeName}.`;
    }
    if (total) {
      message += ` المبلغ ${total} ليرة.`;
    }
    if (distance) {
      message += ` المسافة ${distance} كيلومتر.`;
    }
    
    speakInstruction(message, { rate: 0.85 });
  };

  const announceOrderAccepted = (orderNumber) => {
    speakInstruction(`تم قبول الطلب رقم ${orderNumber}. توجه للمتجر الآن.`, { rate: 0.85 });
  };

  const announceNavigation = (destination) => {
    speakInstruction(`جاري التوجه إلى ${destination}`, { rate: 0.9 });
  };

  const announceArrival = (location) => {
    speakInstruction(`وصلت إلى ${location}. تأكد من استلام الطلب.`, { rate: 0.85 });
  };

  const announcePriorityOrder = (storeName) => {
    speakInstruction(`تنبيه! طلب عاجل من ${storeName || 'نفس المتجر'}. اقبله الآن!`, { rate: 0.95, pitch: 1.2 });
  };

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
    const allMyOrders = [...(myFoodOrders || []), ...(myOrders || [])];

    if (allMyOrders.length === 0) {
      setOrderedStations([]);
      setTotalDistance(0);
      setTotalEarnings(0);
      return;
    }

    // ترتيب ذكي: لكل طلب، أضف المتجر أولاً ثم العميل
    allMyOrders.forEach((order, idx) => {
      const isFood = order.restaurant_id || order.order_type === 'food';
      const storeName = isFood ? (order.restaurant_name || 'المطعم') : (order.seller_name || 'المتجر');
      const storeLat = order.store_latitude;
      const storeLon = order.store_longitude;
      const customerLat = order.latitude;
      const customerLon = order.longitude;

      // إضافة محطة المتجر
      if (storeLat && storeLon) {
        stations.push({
          number: stationNumber++,
          type: 'store',
          isFood: isFood,
          name: storeName,
          address: order.store_address || '',
          phone: order.restaurant_phone || order.seller_phone || '',
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
          address: order.delivery_address || order.address || '',
          phone: order.customer_phone || order.delivery_phone || '',
          position: [customerLat, customerLon],
          action: 'تسليم',
          orderId: order.id,
          order: order,
          total: order.total
        });

        // إضافة الربح
        totalEarn += order.driver_earnings || 0;
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
  }, [myFoodOrders, myOrders]);

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
            console.error('Error fetching driver earnings:', err);
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
      console.error('Error fetching route:', error);
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
      console.error('Error fetching route segment:', error);
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
      console.error('Error fetching optimized route:', error);
    }
    return null;
  };

  // عرض جميع مسارات طلباتي بألوان مختلفة - مُحسَّن
  const showAllMyOrdersRoutes = async () => {
    // استخدام موقع السائق أو موقع دمشق كافتراضي
    let driverPos = currentDriverLocation || driverLocation;
    
    // إذا لم يتوفر موقع السائق، استخدم موقع افتراضي (دمشق)
    if (!driverPos || !driverPos.latitude) {
      console.log('استخدام موقع افتراضي - دمشق');
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
          console.log('⚠️ طلب بدون إحداثيات متجر:', order.id?.substring(0, 8));
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
          console.log('⚠️ طلب بدون إحداثيات عميل:', order.id?.substring(0, 8));
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

      // ترتيب بسيط: السائق -> المتاجر -> العملاء (بدون API إضافية للسرعة)
      const driverPoint = allPoints.find(p => p.type === 'driver');
      const stores = allPoints.filter(p => p.type === 'store');
      const customers = allPoints.filter(p => p.type === 'customer');
      const orderedPoints = [driverPoint, ...stores, ...customers];

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
      console.error('خطأ في تحميل المسارات:', error);
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
      console.log('استخدام موقع افتراضي - دمشق');
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
      console.error('خطأ في بدء التنقل:', error);
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
            console.log('استخدام موقع المتجر كنقطة بداية');
            const storeCoords = [order.store_latitude, order.store_longitude];
            const customerCoords = [order.latitude, order.longitude];
            if (storeCoords[0] && customerCoords[0]) {
              setSelectedOrderForRoute(order);
              // رسم المسار من المتجر للعميل فقط
              fetchRouteStoreToCustomer(storeCoords, customerCoords, order);
            }
          },
          { enableHighAccuracy: true, timeout: 5000 }
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
            console.error('Error fetching driver earnings:', err);
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
      console.error('Error fetching route:', error);
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

  // الحصول على موقع السائق الحالي
  const getDriverLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCurrentDriverLocation({ latitude, longitude });
          setMapCenter([latitude, longitude]);
        },
        (error) => {
          console.log('Error getting location:', error);
          // استخدام موقع افتراضي عند فشل الحصول على الموقع
          const defaultLocation = { latitude: 33.5138, longitude: 36.2765 };
          setCurrentDriverLocation(defaultLocation);
          setMapCenter([defaultLocation.latitude, defaultLocation.longitude]);
        }
      );
    } else {
      // إذا لم يكن الـ geolocation متاحاً، استخدم موقع افتراضي
      const defaultLocation = { latitude: 33.5138, longitude: 36.2765 };
      setCurrentDriverLocation(defaultLocation);
      setMapCenter([defaultLocation.latitude, defaultLocation.longitude]);
    }
  };

  // تحديث مركز الخريطة عند فتحها
  useEffect(() => {
    if (isOpen) {
      getDriverLocation();
    }
  }, [isOpen]);

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
            console.log('Watch position error:', error);
          },
          { enableHighAccuracy: true, maximumAge: 1000 }
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
    // إذا كان الطلب يحتوي على إحداثيات GPS حقيقية
    if (order.latitude && order.longitude) {
      return [order.latitude, order.longitude];
    }
    // إذا لا يوجد GPS، نرجع null
    return null;
  };

  // الحصول على إحداثيات المتجر - GPS حقيقي فقط
  const getStoreCoordinates = (order) => {
    // إذا كان المتجر يحتوي على إحداثيات GPS
    if (order.store_latitude && order.store_longitude) {
      return [order.store_latitude, order.store_longitude];
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

  // إضافة طلبات الطعام - فقط التي لديها GPS
  foodOrders.forEach(order => {
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

  // إضافة طلبات المنتجات - فقط التي لديها GPS
  orders.forEach(order => {
    if (order.order_source === 'food') return;
    
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

  // إضافة طلباتي من الطعام (المقبولة)
  myFoodOrders.forEach(order => {
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

  // إضافة طلباتي من المنتجات (المقبولة)
  myOrders.forEach(order => {
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

  // تصفية العلامات حسب الطبقة المختارة + التحقق من صحة الإحداثيات
  const filteredMarkers = markers.filter(m => {
    // التحقق من وجود إحداثيات صحيحة
    if (!m.position || !m.position[0] || !m.position[1] || 
        isNaN(m.position[0]) || isNaN(m.position[1])) {
      return false;
    }
    
    if (showLayer === 'all') return true;
    if (showLayer === 'food') return m.type === 'food-store' || m.type === 'driver';
    if (showLayer === 'products') return m.type === 'product-store' || m.type === 'driver';
    if (showLayer === 'customers') return m.type === 'customer' || m.type === 'driver';
    return true;
  });

  // عدد الطلبات التي لديها GPS
  const ordersWithGPS = markers.filter(m => m.type === 'customer' && m.hasRealGPS).length;
  // حساب عدد الطلبات - يشمل الطلبات المتاحة وطلباتي
  const totalOrders = (foodOrders?.length || 0) + (orders?.length || 0) + (myOrders?.length || 0) + (myFoodOrders?.length || 0);
  
  // هل نعرض طلباتي فقط (بدون طلبات متاحة)؟
  const isMyOrdersOnly = (myOrders?.length > 0 || myFoodOrders?.length > 0) && orders?.length === 0 && foodOrders?.length === 0;

  return (
    <>
      {/* زر فتح الخريطة */}
      <button
        onClick={() => setIsOpen(true)}
        disabled={totalOrders === 0}
        className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
          totalOrders > 0 
            ? isMyOrdersOnly
              ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700'
              : 'bg-gradient-to-r from-orange-400 to-orange-600 text-white hover:from-orange-500 hover:to-orange-700' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        <Map size={18} />
        {isMyOrdersOnly 
          ? `🗺️ خريطة طلباتي (${totalOrders} طلب)`
          : `🗺️ عرض الخريطة (${totalOrders} طلب)`
        }
      </button>

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
              <div className={`flex items-center justify-between px-3 py-2 gap-2 border-b ${
                currentTheme === 'dark' 
                  ? 'bg-[#1a1a1a] border-[#333]' 
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => setIsOpen(false)}
                    className={`p-2 rounded-lg transition-colors ${
                      currentTheme === 'dark'
                        ? 'bg-[#252525] text-white hover:bg-[#333]'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m12 19 7-7-7-7"/>
                      <path d="M19 12H5"/>
                    </svg>
                  </button>
                  <span className={`text-sm font-bold whitespace-nowrap ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    خريطة الطلبات
                  </span>
                  <button
                    onClick={getDriverLocation}
                    className="p-2 bg-green-500 text-black rounded-lg font-bold"
                    title="تحديث موقعي"
                  >
                    <Locate size={16} />
                  </button>
                  
                  {/* ⭐ زر تبديل الثيم */}
                  <button
                    onClick={() => {
                      const modes = ['auto', 'light', 'dark'];
                      const currentIndex = modes.indexOf(themeMode);
                      const nextMode = modes[(currentIndex + 1) % modes.length];
                      setThemeMode(nextMode);
                      // حفظ الإعداد في localStorage
                      localStorage.setItem('driverThemeMode', nextMode);
                      // تحديث الثيم الفعلي فوراً
                      if (nextMode === 'auto') {
                        const hour = new Date().getHours();
                        setCurrentTheme((hour >= 6 && hour < 18) ? 'light' : 'dark');
                      } else {
                        setCurrentTheme(nextMode);
                      }
                    }}
                    className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 z-50 relative transition-all ${
                      currentTheme === 'dark'
                        ? 'bg-[#252525] text-white hover:bg-[#333] border border-[#444]'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                    }`}
                    title={`الوضع: ${themeMode === 'auto' ? 'تلقائي' : themeMode === 'light' ? 'فاتح' : 'داكن'}`}
                  >
                    {themeMode === 'auto' && '🔄 تلقائي'}
                    {themeMode === 'light' && '☀️ فاتح'}
                    {themeMode === 'dark' && '🌙 داكن'}
                  </button>
                </div>
                
                {/* دليل الألوان */}
                <div className={`flex flex-1 justify-around text-xs ${currentTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></span> مطعم
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50"></span> متجر
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50"></span> عميل
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className={`w-3 h-3 rounded-full shadow-lg ${currentTheme === 'dark' ? 'bg-white' : 'bg-orange-500'}`}></span> موقعك
                  </span>
                </div>
              </div>

              {/* فلاتر الطبقات */}
              <div className={`px-3 py-2 flex gap-2 border-b ${
                currentTheme === 'dark' ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200'
              }`}>
                {[
                  { key: 'all', label: 'الكل', icon: '🗺️', color: 'green' },
                  { key: 'food', label: 'طعام', icon: '🍔', color: 'green' },
                  { key: 'products', label: 'منتجات', icon: '📦', color: 'blue' },
                  { key: 'customers', label: 'عملاء', icon: '🏠', color: 'amber' },
                ].map(layer => (
                  <button
                    key={layer.key}
                    onClick={() => setShowLayer(layer.key)}
                    className={`flex-1 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                      showLayer === layer.key
                        ? 'bg-green-500 text-black'
                        : currentTheme === 'dark'
                          ? 'bg-[#252525] text-gray-400 border border-[#333] hover:border-green-500'
                          : 'bg-gray-100 text-gray-600 border border-gray-200 hover:border-green-500'
                    }`}
                  >
                    {layer.icon} {layer.label}
                  </button>
                ))}
              </div>

              {/* ⭐ فلاتر الطلبات: متاحة / طلباتي / الكل */}
              <div className={`px-3 py-2 flex gap-2 border-b ${
                currentTheme === 'dark' ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200'
              }`}>
                {/* طلبات متاحة */}
                <button
                  onClick={() => setOrderFilter('available')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center justify-center gap-1 ${
                    orderFilter === 'available'
                      ? 'bg-green-500 text-black shadow-lg shadow-green-500/30'
                      : currentTheme === 'dark'
                        ? 'bg-[#252525] text-green-400 border border-green-500/30 hover:border-green-500'
                        : 'bg-green-50 text-green-600 border border-green-200 hover:border-green-500'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-green-400"></span>
                  متاحة ({(orders?.length || 0) + (foodOrders?.length || 0)})
                </button>
                
                {/* طلباتي */}
                <button
                  onClick={() => setOrderFilter('myOrders')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center justify-center gap-1 ${
                    orderFilter === 'myOrders'
                      ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                      : currentTheme === 'dark'
                        ? 'bg-[#252525] text-blue-400 border border-blue-500/30 hover:border-blue-500'
                        : 'bg-blue-50 text-blue-600 border border-blue-200 hover:border-blue-500'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  طلباتي ({(myOrders?.length || 0) + (myFoodOrders?.length || 0)})
                </button>
                
                {/* الكل */}
                <button
                  onClick={() => setOrderFilter('all')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center justify-center gap-1 ${
                    orderFilter === 'all'
                      ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
                      : currentTheme === 'dark'
                        ? 'bg-[#252525] text-purple-400 border border-purple-500/30 hover:border-purple-500'
                        : 'bg-purple-50 text-purple-600 border border-purple-200 hover:border-purple-500'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  الكل
                </button>
              </div>

              {/* زر عرض ملخص المحطات */}
              {orderedStations.length > 0 && (
                <div className={`px-3 py-2 border-b ${
                  currentTheme === 'dark' ? 'bg-[#1a1a1a] border-[#333]' : 'bg-white border-gray-200'
                }`}>
                  <button
                    onClick={() => setShowStationsSummary(!showStationsSummary)}
                    className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                      showStationsSummary 
                        ? 'bg-blue-500 text-white' 
                        : currentTheme === 'dark'
                          ? 'bg-[#252525] text-blue-400 border border-blue-500/50 hover:bg-blue-500/20'
                          : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100'
                    }`}
                  >
                    📋 جدول المحطات ({orderedStations.length})
                    {showStationsSummary ? ' ▲' : ' ▼'}
                  </button>
                </div>
              )}

              {/* بطاقة ملخص المحطات */}
              <AnimatePresence>
                {showStationsSummary && orderedStations.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className={`border-t overflow-hidden ${
                      currentTheme === 'dark' ? 'bg-[#1a1a1a] border-[#333]' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="p-3 max-h-[200px] overflow-y-auto">
                      <div className="space-y-2">
                        {orderedStations.map((station, idx) => (
                          <div 
                            key={`station-${idx}`}
                            className={`flex items-center gap-3 p-3 rounded-xl ${
                              station.type === 'store' 
                                ? 'bg-green-500/10 border border-green-500/30' 
                                : 'bg-amber-500/10 border border-amber-500/30'
                            }`}
                          >
                            {/* رقم المحطة */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                              station.type === 'store' 
                                ? (station.isFood ? 'bg-green-500' : 'bg-blue-500')
                                : 'bg-amber-500'
                            }`}>
                              {station.number}
                            </div>
                            
                            {/* معلومات المحطة */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{station.type === 'store' ? (station.isFood ? '🍔' : '📦') : '🏠'}</span>
                                <span className={`font-bold text-sm truncate ${
                                  currentTheme === 'dark' ? 'text-white' : 'text-gray-900'
                                }`}>{station.name}</span>
                              </div>
                              <p className={`text-xs truncate ${
                                currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                              }`}>{typeof station.address === 'object' 
                                ? [station.address?.area, station.address?.street, station.address?.building].filter(Boolean).join(', ')
                                : station.address}</p>
                            </div>
                            
                            {/* الإجراء */}
                            <div className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                              station.action === 'استلام' 
                                ? 'bg-green-500 text-black' 
                                : 'bg-amber-500 text-black'
                            }`}>
                              {station.action}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* ملخص الإجمالي */}
                      <div className={`mt-3 p-3 rounded-xl border ${
                        currentTheme === 'dark' 
                          ? 'bg-[#252525] border-[#333]' 
                          : 'bg-white border-gray-200 shadow-sm'
                      }`}>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div>
                            <p className={`text-xs ${currentTheme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>المحطات</p>
                            <p className={`font-bold text-lg ${currentTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{orderedStations.length}</p>
                          </div>
                          <div>
                            <p className={`text-xs ${currentTheme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>المسافة</p>
                            <p className="font-bold text-blue-500 text-lg">{totalDistance.toFixed(1)} كم</p>
                          </div>
                          <div>
                            <p className={`text-xs ${currentTheme === 'dark' ? 'text-gray-500' : 'text-gray-500'}`}>💰 الربح</p>
                            <p className="font-bold text-green-500 text-lg">{totalEarnings.toLocaleString()} ل.س</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ⭐ إشعار الأولوية الذكية (طلب من نفس المطعم) */}
              <AnimatePresence>
                {showPriorityPopup && priorityOrder && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -20 }}
                    className={`absolute top-20 left-4 right-4 z-[2000] rounded-2xl shadow-2xl overflow-hidden border-4 ${
                      priorityCountdown > 0 
                        ? 'bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 border-yellow-300' 
                        : 'bg-gradient-to-br from-red-400 via-red-500 to-red-600 border-red-300'
                    }`}
                    style={{ boxShadow: priorityCountdown > 0 ? '0 0 40px rgba(251, 191, 36, 0.5)' : '0 0 40px rgba(239, 68, 68, 0.5)' }}
                  >
                    {/* شريط العد التنازلي */}
                    <div className="h-2 bg-black/20">
                      {priorityCountdown > 0 ? (
                        <motion.div
                          initial={{ width: '100%' }}
                          animate={{ width: '0%' }}
                          transition={{ duration: priorityCountdown, ease: 'linear' }}
                          className="h-full bg-white"
                        />
                      ) : (
                        <div className="h-full bg-white animate-pulse" />
                      )}
                    </div>
                    
                    <div className="p-5 text-black">
                      {/* العنوان */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className={`text-4xl ${priorityCountdown > 0 ? 'animate-bounce' : 'animate-pulse'}`}>
                            {priorityCountdown > 0 ? '🔔' : '⚠️'}
                          </span>
                          <div>
                            <p className="font-black text-lg">
                              {priorityCountdown > 0 ? 'طلب جديد من نفس المطعم!' : '⏰ قرر الآن!'}
                            </p>
                            <p className={`text-sm ${priorityCountdown > 0 ? 'text-black/70' : 'text-white font-bold'}`}>
                              {priorityCountdown > 0 ? 'أنت ذاهب لهذا المطعم الآن' : 'الطلب قد يُأخذ من سائق آخر'}
                            </p>
                          </div>
                        </div>
                        <div className={`rounded-full w-16 h-16 flex flex-col items-center justify-center ${
                          priorityCountdown > 0 ? 'bg-black text-yellow-400' : 'bg-white text-red-500 animate-pulse'
                        }`}>
                          {priorityCountdown > 0 ? (
                            <>
                              <span className="font-black text-2xl">{priorityCountdown}</span>
                              <span className="text-xs">ثانية</span>
                            </>
                          ) : (
                            <span className="font-black text-xl">!</span>
                          )}
                        </div>
                      </div>

                      {/* معلومات الطلب */}
                      <div className="bg-black/10 rounded-xl p-4 mb-4">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-2xl">🍔</span>
                          <span className="font-bold text-lg">{priorityOrder.restaurant_name}</span>
                        </div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-xl">🏠</span>
                          <span className="font-medium">{priorityOrder.customer_name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xl">📍</span>
                          <span className="text-sm text-black/70 truncate">
                            {typeof priorityOrder.delivery_address === 'object' 
                              ? [priorityOrder.delivery_address?.area, priorityOrder.delivery_address?.street, priorityOrder.delivery_address?.building].filter(Boolean).join(', ')
                              : priorityOrder.delivery_address}
                          </span>
                        </div>
                      </div>

                      {/* الربح المتوقع */}
                      <div className="bg-green-500 text-white rounded-xl p-4 mb-4 text-center">
                        <span className="text-sm">💰 ربح إضافي: </span>
                        <span className="font-black text-2xl">+{(priorityOrder.driver_earnings || priorityOrder.total * 0.1 || 1500).toLocaleString()} ل.س</span>
                      </div>

                      {/* أزرار القبول والرفض */}
                      <div className="grid grid-cols-2 gap-4">
                        <button
                          onClick={rejectPriorityOrder}
                          className="py-4 bg-white/50 hover:bg-white/70 rounded-xl font-bold text-lg transition-colors border-2 border-black/20"
                        >
                          ❌ رفض
                        </button>
                        <button
                          onClick={acceptPriorityOrder}
                          className="py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg transition-colors shadow-xl"
                        >
                          ✅ قبول
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* رسالة الخطأ - أعلى الشاشة مع شريط تقدم */}
              <AnimatePresence>
                {mapError && (
                  <motion.div
                    initial={{ opacity: 0, y: -50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -50 }}
                    className="absolute top-0 left-0 right-0 z-[9999]"
                  >
                    <div className="bg-red-600 text-white shadow-2xl">
                      {/* Header */}
                      <div className="px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">⚠️</span>
                          <div>
                            <p className="font-bold text-base">{mapError}</p>
                            <p className="text-xs opacity-80">يرجى إتمام الطلبات الحالية أولاً</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setMapError(null)}
                          className="text-white/80 hover:text-white bg-red-700 hover:bg-red-800 rounded-full p-2 transition-colors"
                        >
                          <X size={18} />
                        </button>
                      </div>
                      {/* شريط التقدم */}
                      <div className="h-1 bg-red-800">
                        <motion.div 
                          initial={{ width: '100%' }}
                          animate={{ width: '0%' }}
                          transition={{ duration: 5, ease: 'linear' }}
                          onAnimationComplete={() => setMapError(null)}
                          className="h-full bg-white/50"
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ⭐ شريط وضع الملاحة */}
              {isNavigationMode && (
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white px-3 py-2">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs font-bold">وضع الملاحة مفعّل</span>
                    </div>
                    <button
                      onClick={toggleNavigationMode}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      إيقاف ✕
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {/* السرعة */}
                    <div className="bg-gray-700/50 rounded-lg p-2">
                      <p className="text-[10px] text-gray-400">السرعة</p>
                      <p className="text-lg font-bold text-green-400">{driverSpeed}</p>
                      <p className="text-[10px] text-gray-400">كم/س</p>
                    </div>
                    
                    {/* المسافة المتبقية */}
                    <div className="bg-gray-700/50 rounded-lg p-2">
                      <p className="text-[10px] text-gray-400">المسافة</p>
                      <p className="text-lg font-bold text-blue-400">{routeInfo?.distance || '0'}</p>
                      <p className="text-[10px] text-gray-400">كم</p>
                    </div>
                    
                    {/* وقت الوصول */}
                    <div className="bg-gray-700/50 rounded-lg p-2">
                      <p className="text-[10px] text-gray-400">الوصول</p>
                      <p className="text-lg font-bold text-orange-400">
                        {estimatedArrival || routeInfo?.duration || '0'}
                      </p>
                      <p className="text-[10px] text-gray-400">دقيقة</p>
                    </div>
                  </div>
                  
                  {/* تحذير الابتعاد عن المسار */}
                  {distanceFromRoute > 0.05 && (
                    <div className="mt-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-2 text-center">
                      <p className="text-yellow-400 text-xs font-bold">
                        ⚠️ ابتعدت عن المسار ({(distanceFromRoute * 1000).toFixed(0)} متر)
                      </p>
                      <p className="text-yellow-300/70 text-[10px]">جاري إعادة حساب المسار...</p>
                    </div>
                  )}
                </div>
              )}

              {/* ⭐ زر تفعيل وضع الملاحة (عند وجود مسار) */}
              {routeCoordinates.length > 0 && !isNavigationMode && (
                <div className="bg-[#1a1a1a] px-3 py-2 border-t border-[#333]">
                  <button
                    onClick={toggleNavigationMode}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                  >
                    <Navigation size={18} />
                    🚀 تفعيل وضع الملاحة
                  </button>
                </div>
              )}

              {/* زر عرض جميع مساراتي */}
              {(myOrders?.length > 0 || myFoodOrders?.length > 0) && !stepByStepMode && (
                <div className="bg-[#1a1a1a] px-3 py-2 border-t border-[#333] space-y-2">
                  {!showAllMyRoutes ? (
                    <>
                      <button
                        onClick={showAllMyOrdersRoutes}
                        disabled={loadingRoute}
                        className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                      >
                        {loadingRoute ? '⏳ جاري التحميل...' : '🗺️ عرض كل المسارات'}
                      </button>
                      <button
                        onClick={startStepByStepNavigation}
                        disabled={loadingRoute}
                        className="w-full py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                      >
                        {loadingRoute ? '⏳ جاري التحميل...' : '🏍️ ابدأ التنقل خطوة بخطوة'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={hideAllRoutes}
                      className="w-full py-2 bg-gray-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                    >
                      ✕ إخفاء المسارات
                    </button>
                  )}
                </div>
              )}

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
                        <div className="text-right min-w-[180px] max-w-[220px]">
                          {/* اسم العميل */}
                          <p className="font-bold text-xs mb-1 text-gray-800">👤 {marker.title}</p>
                          
                          {marker.order && (
                            <>
                              {/* معلومات التواصل */}
                              <div className="text-[10px] text-gray-600 mb-2 bg-gray-50 rounded p-1.5">
                                <p className="font-medium truncate mb-1">📍 {
                                  typeof (marker.order.delivery_address || marker.order.address) === 'object'
                                    ? [(marker.order.delivery_address || marker.order.address)?.area, (marker.order.delivery_address || marker.order.address)?.street, (marker.order.delivery_address || marker.order.address)?.building].filter(Boolean).join(', ')
                                    : (marker.order.delivery_address || marker.order.address)
                                }</p>
                                <p className="text-gray-400 text-xs">
                                  🔒 رقم العميل مخفي (استخدم زر الاتصال)
                                </p>
                                {/* رقم المطعم/البائع */}
                                {(marker.order.restaurant_phone || marker.order.store_phone || marker.order.seller_phone) && (
                                  <p className="text-green-600">
                                    📞 {marker.order.restaurant_id ? 'المطعم' : 'البائع'}: {marker.order.restaurant_phone || marker.order.store_phone || marker.order.seller_phone}
                                  </p>
                                )}
                              </div>
                              
                              {/* قائمة المنتجات/الأطعمة */}
                              {marker.order.items && marker.order.items.length > 0 && (
                                <div className="text-[10px] mb-2 bg-orange-50 rounded p-1.5 max-h-[80px] overflow-y-auto">
                                  <p className="font-bold text-orange-700 mb-1">🍽️ الأصناف:</p>
                                  {marker.order.items.slice(0, 5).map((item, idx) => (
                                    <p key={idx} className="text-gray-700 truncate">
                                      • {item.name} {item.quantity > 1 ? `×${item.quantity}` : ''}
                                    </p>
                                  ))}
                                  {marker.order.items.length > 5 && (
                                    <p className="text-gray-500 text-[9px]">+{marker.order.items.length - 5} أصناف أخرى</p>
                                  )}
                                </div>
                              )}
                              
                              {/* السعر الإجمالي */}
                              {marker.order.total && (
                                <div className="bg-blue-50 rounded p-1.5 mb-2">
                                  <p className="text-blue-700 font-bold text-xs text-center">
                                    💰 المجموع: {(marker.order.total).toLocaleString()} ل.س
                                  </p>
                                </div>
                              )}
                              
                              {/* زر قبول الطلب - يظهر على المطعم/المتجر (وليس العميل) */}
                              {(marker.type === 'food-store' || marker.type === 'product-store') && (
                                <button
                                  onClick={() => {
                                    if (marker.type === 'food-store') {
                                      handleAcceptFoodOrderFromMap(marker.order);
                                    } else {
                                      handleAcceptOrderFromMap(marker.order);
                                    }
                                  }}
                                  className="w-full py-1.5 bg-green-500 hover:bg-green-600 text-white rounded text-[10px] font-bold mb-1 transition-colors"
                                >
                                  ✅ قبول الطلب
                                </button>
                              )}
                              {/* زر عرض المسار */}
                              {marker.order && marker.order.latitude && marker.order.store_latitude && (
                                <button
                                  onClick={() => showRouteForOrder(marker.order)}
                                  disabled={loadingRoute}
                                  className="w-full py-1.5 bg-blue-500 text-white rounded text-[10px] font-bold flex items-center justify-center gap-1"
                                >
                                  {loadingRoute ? '⏳' : <Route size={10} />}
                                  {loadingRoute ? '...' : '🗺️ المسار'}
                                </button>
                              )}
                            </>
                          )}
                        </div>
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
                              <div className="text-center min-w-[160px]">
                                <div className="flex items-center justify-center gap-1 mb-1">
                                  <span className="bg-gray-800 text-white text-xs px-2 py-0.5 rounded-full">
                                    نقطة {stop.stopNumber}
                                  </span>
                                </div>
                                <p className="font-bold text-sm mb-1">
                                  {stop.type === 'driver' ? '📍 موقعك (البداية)' : 
                                   stop.type === 'store' ? `🏪 ${stop.label}` : 
                                   `🏠 ${stop.label}`}
                                </p>
                                {stop.order && (
                                  <div className="text-[11px] text-gray-600 text-right space-y-1">
                                    {stop.type === 'store' ? (
                                      <p className="text-green-600 font-medium">📦 استلام الطلب</p>
                                    ) : (
                                      <p className="text-red-600 font-medium">🚚 تسليم الطلب</p>
                                    )}
                                    <p className="truncate">
                                      {typeof (stop.order.delivery_address || stop.order.address) === 'object'
                                        ? [(stop.order.delivery_address || stop.order.address)?.area, (stop.order.delivery_address || stop.order.address)?.street, (stop.order.delivery_address || stop.order.address)?.building].filter(Boolean).join(', ')
                                        : (stop.order.delivery_address || stop.order.address)}
                                    </p>
                                    {stop.order.total && (
                                      <p className="text-orange-600 font-bold">
                                        {stop.order.total.toLocaleString()} ل.س
                                      </p>
                                    )}
                                    <p className="text-gray-400 text-xs">
                                      🔒 رقم العميل مخفي
                                    </p>
                                    {stop.order.order_code && (
                                      <p className="text-gray-500">
                                        كود: {stop.order.order_code}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
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
                          icon={L.divIcon({
                            className: 'route-marker',
                            html: `<div style="
                              background: #f97316;
                              width: 30px;
                              height: 30px;
                              border-radius: 50%;
                              display: flex;
                              align-items: center;
                              justify-content: center;
                              font-size: 14px;
                              border: 3px solid white;
                              box-shadow: 0 2px 10px rgba(0,0,0,0.4);
                              font-weight: bold;
                              color: white;
                            ">1</div>`,
                            iconSize: [30, 30],
                            iconAnchor: [15, 15]
                          })}
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
                          icon={L.divIcon({
                            className: 'route-marker',
                            html: `<div style="
                              background: #22c55e;
                              width: 30px;
                              height: 30px;
                              border-radius: 50%;
                              display: flex;
                              align-items: center;
                              justify-content: center;
                              font-size: 14px;
                              border: 3px solid white;
                              box-shadow: 0 2px 10px rgba(0,0,0,0.4);
                              font-weight: bold;
                              color: white;
                            ">2</div>`,
                            iconSize: [30, 30],
                            iconAnchor: [15, 15]
                          })}
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
                          icon={L.divIcon({
                            className: 'route-marker',
                            html: `<div style="
                              background: #ef4444;
                              width: 30px;
                              height: 30px;
                              border-radius: 50%;
                              display: flex;
                              align-items: center;
                              justify-content: center;
                              font-size: 14px;
                              border: 3px solid white;
                              box-shadow: 0 2px 10px rgba(0,0,0,0.4);
                              font-weight: bold;
                              color: white;
                            ">3</div>`,
                            iconSize: [30, 30],
                            iconAnchor: [15, 15]
                          })}
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
                {stepByStepMode && allStepsData.length > 0 && (
                  <div className="absolute bottom-4 left-4 right-4 bg-[#1a1a1a] border border-[#333] rounded-2xl shadow-2xl p-4 z-[1000]">
                    {/* شريط التقدم */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 bg-[#333] rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-teal-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${((currentStepIndex + 1) / allStepsData.length) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-bold text-gray-400">
                        {currentStepIndex + 1}/{allStepsData.length}
                      </span>
                    </div>

                    {/* معلومات المحطة الحالية */}
                    {allStepsData[currentStepIndex] && (
                      <div className="text-center mb-3">
                        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-bold mb-2 ${
                          allStepsData[currentStepIndex].to.type === 'store'
                            ? (allStepsData[currentStepIndex].to.isFood ? 'bg-green-500' : 'bg-blue-500')
                            : 'bg-amber-500'
                        }`}>
                          {allStepsData[currentStepIndex].to.type === 'store' ? (
                            <>
                              {allStepsData[currentStepIndex].to.isFood ? '🍔' : '📦'}
                              اذهب إلى: {allStepsData[currentStepIndex].to.label}
                            </>
                          ) : (
                            <>
                              🏠 سلّم الطلب إلى: {allStepsData[currentStepIndex].to.label}
                            </>
                          )}
                        </div>
                        
                        {/* المسافة والوقت */}
                        <div className="flex justify-center gap-4 text-sm">
                          <span className="text-green-400 font-bold">
                            📍 {routeInfo?.distance || '0'} كم
                          </span>
                          <span className="text-blue-400 font-bold">
                            ⏱️ {routeInfo?.duration || '0'} دقيقة
                          </span>
                        </div>

                        {/* رقم الهاتف - مخفي */}
                        {allStepsData[currentStepIndex].to.order && (
                          <p className="text-gray-400 text-xs mt-2">
                            🔒 رقم العميل مخفي - استخدم زر الاتصال من صفحة الطلب
                          </p>
                        )}
                      </div>
                    )}

                    {/* الأزرار */}
                    <div className="flex gap-2">
                      <button
                        onClick={stopStepByStep}
                        className="flex-1 py-2.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-bold"
                      >
                        ✕ إلغاء
                      </button>
                      <button
                        onClick={goToNextStep}
                        className={`flex-2 py-2.5 px-6 rounded-lg text-sm font-bold text-white ${
                          allStepsData[currentStepIndex]?.to?.type === 'store'
                            ? 'bg-gradient-to-r from-green-500 to-green-600'
                            : 'bg-gradient-to-r from-blue-500 to-blue-600'
                        }`}
                      >
                        {allStepsData[currentStepIndex]?.to?.type === 'store' 
                          ? '✓ استلمت الطلب' 
                          : (currentStepIndex === allStepsData.length - 1 ? '🎉 أنهيت التوصيل' : '✓ سلّمت الطلب')}
                      </button>
                    </div>
                  </div>
                )}

                {/* معلومات المسار */}
                {routeInfo && selectedOrderForRoute && (
                  <div className="absolute bottom-4 left-4 right-4 bg-[#1a1a1a] border border-[#333] rounded-2xl shadow-2xl p-4 z-[1000]">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-sm text-white">🛣️ تفاصيل التوصيلة</h4>
                      <button 
                        onClick={hideRoute}
                        className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-[#333]"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    
                    {/* المسافات المنفصلة */}
                    <div className="bg-[#252525] rounded-xl p-3 mb-3 border border-[#333]">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-white text-black rounded-full text-xs flex items-center justify-center">🏍️</span>
                          <span className="text-gray-500">➜</span>
                          <span className="w-6 h-6 bg-green-500 text-white rounded-full text-xs flex items-center justify-center">🏪</span>
                          <span className="text-gray-400 mr-1">للمتجر</span>
                        </span>
                        <span className="font-bold text-green-400">{routeInfo.distanceToStore || '0'} كم</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span className="w-6 h-6 bg-green-500 text-white rounded-full text-xs flex items-center justify-center">🏪</span>
                          <span className="text-gray-500">➜</span>
                          <span className="w-6 h-6 bg-amber-500 text-white rounded-full text-xs flex items-center justify-center">🏠</span>
                          <span className="text-gray-400 mr-1">للعميل</span>
                        </span>
                        <span className="font-bold text-amber-400">{routeInfo.distanceToCustomer || '0'} كم</span>
                      </div>
                    </div>
                    
                    {/* الإجمالي والوقت والربح */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-3 text-center">
                        <p className="text-xs text-gray-500">المجموع</p>
                        <p className="font-bold text-blue-400">{routeInfo.distance} كم</p>
                      </div>
                      <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-3 text-center">
                        <p className="text-xs text-gray-500">الوقت</p>
                        <p className="font-bold text-purple-400">{routeInfo.duration} د</p>
                      </div>
                      <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-3 text-center">
                        <p className="text-xs text-gray-500">💰 ربحك</p>
                        <p className="font-bold text-green-400">{(routeInfo.driverEarnings || 0).toLocaleString()} ل.س</p>
                      </div>
                    </div>

                    {/* أزرار الإجراءات */}
                    <div className="flex gap-2">
                      {/* زر الاتصال VoIP */}
                      <button
                        onClick={() => {
                          // فتح صفحة الطلب للاتصال عبر VoIP
                          alert('استخدم زر "اتصل بالعميل" من صفحة تفاصيل الطلب');
                        }}
                        className="flex-1 py-3 bg-blue-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                      >
                        <Phone size={16} />
                        اتصل (مشفر)
                      </button>
                      
                      {/* زر لم يرد - طلب مساعدة الموظف */}
                      <button
                        onClick={async () => {
                          try {
                            const res = await axios.post(`${API}/api/call-requests`, {
                              order_id: selectedOrderForRoute.id,
                              order_type: selectedOrderForRoute.store_id ? 'food' : 'shopping',
                              reason: 'العميل لا يرد على الاتصال'
                            }, {
                              headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                            });
                            alert('✅ تم إرسال طلب للموظف. سيتواصل مع العميل ويبلغك.');
                          } catch (err) {
                            alert(err.response?.data?.detail || 'حدث خطأ');
                          }
                        }}
                        className="py-3 px-4 bg-orange-500 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                        title="طلب مساعدة الموظف"
                      >
                        <PhoneOff size={16} />
                        لم يرد
                      </button>
                      
                      {/* زر بدء الملاحة */}
                      <button
                        onClick={() => {
                          toggleNavigationMode();
                          speakInstruction('جاري بدء الملاحة، اتجه نحو المتجر');
                        }}
                        className="flex-1 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                      >
                        <Navigation size={16} />
                        ابدأ الملاحة
                      </button>
                    </div>
                  </div>
                )}

                {/* معلومات المسار المُحسَّن (جميع الطلبات) */}
                {routeInfo && showAllMyRoutes && (
                  <div className="absolute bottom-4 left-4 right-4 bg-[#1a1a1a] border border-[#333] rounded-2xl shadow-2xl p-4 z-[1000]">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-sm text-white">🛣️ المسار المُحسَّن لجميع طلباتك</h4>
                      <button 
                        onClick={hideAllRoutes}
                        className="text-gray-500 hover:text-white p-1 rounded-lg hover:bg-[#333]"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    
                    {/* دليل الألوان */}
                    <div className="flex items-center justify-center gap-4 mb-3 text-xs">
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-white shadow-lg"></span>
                        <span className="text-gray-400">موقعك</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50"></span>
                        <span className="text-gray-400">مطعم</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50"></span>
                        <span className="text-gray-400">متجر</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-amber-500 shadow-lg shadow-amber-500/50"></span>
                        <span className="text-gray-400">عميل</span>
                      </span>
                    </div>
                    
                    {/* إحصائيات المسار */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl p-3 text-center">
                        <p className="text-xs text-gray-500">نقاط التوقف</p>
                        <p className="font-bold text-purple-400 text-lg">{routeInfo.stopsCount || optimizedStops.length}</p>
                      </div>
                      <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl p-3 text-center">
                        <p className="text-xs text-gray-500">المسافة</p>
                        <p className="font-bold text-blue-400 text-lg">{routeInfo.distance} كم</p>
                      </div>
                      <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-3 text-center">
                        <p className="text-xs text-gray-500">الوقت</p>
                        <p className="font-bold text-green-400 text-lg">{routeInfo.duration} د</p>
                      </div>
                    </div>

                    {/* ملاحظة */}
                    <p className="text-xs text-gray-500 text-center mt-3">
                      اضغط على أي علامة لرؤية تفاصيل الطلب
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default OrdersMap;
