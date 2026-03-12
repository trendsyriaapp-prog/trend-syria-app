import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import { Map, X, Navigation, Phone, Package, UtensilsCrossed, Locate, Layers, Route } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// إصلاح مشكلة أيقونات Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// أيقونات مخصصة
const createIcon = (color, emoji) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background: ${color};
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">${emoji}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36]
  });
};

const foodStoreIcon = createIcon('#22c55e', '🍔');
const productStoreIcon = createIcon('#3b82f6', '📦');
const customerIcon = createIcon('#ef4444', '🏠');
const driverIcon = createIcon('#f97316', '🚗');

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
  orders = [], 
  foodOrders = [], 
  driverLocation,
  onSelectOrder,
  onTakeOrder,
  onTakeFoodOrder,
  myOrders = [],        // طلبات السائق الحالية
  myFoodOrders = []     // طلبات الطعام للسائق
}) => {
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
  
  // التنقل خطوة بخطوة
  const [stepByStepMode, setStepByStepMode] = useState(false); // وضع خطوة بخطوة
  const [currentStepIndex, setCurrentStepIndex] = useState(0); // المحطة الحالية
  const [allStepsData, setAllStepsData] = useState([]); // جميع المحطات
  const [currentStepRoute, setCurrentStepRoute] = useState([]); // مسار المحطة الحالية

  // ألوان المسارات
  const routeColors = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#ef4444', '#eab308'];

  // جلب المسار من OSRM (مجاني بدون API Key)
  const fetchRoute = async (start, waypoint, end) => {
    setLoadingRoute(true);
    try {
      // OSRM يستخدم [lon, lat]
      const coords = `${start[1]},${start[0]};${waypoint[1]},${waypoint[0]};${end[1]},${end[0]}`;
      
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes[0]) {
          const route = data.routes[0];
          // تحويل الإحداثيات من [lon, lat] إلى [lat, lon] لـ Leaflet
          const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
          setRouteCoordinates(coords);
          
          // معلومات المسار
          setRouteInfo({
            distance: (route.distance / 1000).toFixed(1), // كم
            duration: Math.round(route.duration / 60) // دقيقة
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
    const driverPos = currentDriverLocation || driverLocation;
    if (!driverPos) {
      alert('يرجى تفعيل موقعك أولاً');
      return;
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

    // جمع جميع نقاط التوقف
    const allPoints = [{
      position: [driverPos.latitude, driverPos.longitude],
      type: 'driver',
      label: 'موقعك',
      order: null
    }];

    // إضافة المتاجر
    allMyOrders.forEach((order) => {
      if (order.store_latitude && order.store_longitude) {
        allPoints.push({
          position: [order.store_latitude, order.store_longitude],
          type: 'store',
          label: order.store_name || order.seller_name || 'متجر',
          order: order,
          isFood: !!order.store_name
        });
      }
    });

    // إضافة العملاء
    allMyOrders.forEach((order) => {
      if (order.latitude && order.longitude) {
        allPoints.push({
          position: [order.latitude, order.longitude],
          type: 'customer',
          label: order.customer_name || 'عميل',
          order: order,
          isFood: !!order.store_name
        });
      }
    });

    if (allPoints.length < 2) {
      alert('لا توجد نقاط كافية لرسم المسار');
      setLoadingRoute(false);
      setShowAllMyRoutes(false);
      return;
    }

    // جلب المسار المُحسَّن
    const optimizedData = await fetchOptimizedRoute(allPoints);
    
    if (optimizedData) {
      // ترتيب النقاط حسب الترتيب المُحسَّن
      const orderedPoints = optimizedData.optimizedOrder.map(idx => ({
        ...allPoints[idx],
        originalIndex: idx
      }));

      // إنشاء الـ segments الملونة
      const segments = [];
      let totalDistance = optimizedData.distance;
      let totalDuration = optimizedData.duration;

      // تقسيم المسار إلى segments
      const legs = optimizedData.legs || [];
      let currentGeometryIndex = 0;

      for (let i = 0; i < orderedPoints.length - 1; i++) {
        const fromPoint = orderedPoints[i];
        const toPoint = orderedPoints[i + 1];
        
        // جلب مسار كل قطعة على حدة للتلوين
        const segmentRoute = await fetchSingleRoute([fromPoint.position, toPoint.position]);
        
        // تحديد اللون بناءً على نوع النقطة الوجهة
        let segmentColor;
        if (toPoint.type === 'store') {
          segmentColor = toPoint.isFood ? '#22c55e' : '#3b82f6'; // أخضر للمطعم، أزرق للمتجر
        } else {
          segmentColor = '#ef4444'; // أحمر للعميل
        }

        segments.push({
          coordinates: segmentRoute.coordinates,
          color: segmentColor,
          fromPoint,
          toPoint,
          stopNumber: i + 1,
          distance: segmentRoute.distance,
          duration: segmentRoute.duration
        });
      }

      // إضافة علامات النقاط المُرقمة
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
    } else {
      // Fallback: ترتيب بسيط (المتاجر أولاً ثم العملاء)
      const stores = allPoints.filter(p => p.type === 'store');
      const customers = allPoints.filter(p => p.type === 'customer');
      const driverPoint = allPoints.find(p => p.type === 'driver');
      
      const orderedPoints = [driverPoint, ...stores, ...customers];
      const segments = [];
      let totalDistance = 0;
      let totalDuration = 0;

      for (let i = 0; i < orderedPoints.length - 1; i++) {
        const fromPoint = orderedPoints[i];
        const toPoint = orderedPoints[i + 1];
        const segmentRoute = await fetchSingleRoute([fromPoint.position, toPoint.position]);
        
        let segmentColor;
        if (toPoint.type === 'store') {
          segmentColor = toPoint.isFood ? '#22c55e' : '#3b82f6';
        } else {
          segmentColor = '#ef4444';
        }

        segments.push({
          coordinates: segmentRoute.coordinates,
          color: segmentColor,
          fromPoint,
          toPoint,
          stopNumber: i + 1,
          distance: segmentRoute.distance,
          duration: segmentRoute.duration
        });

        totalDistance += segmentRoute.distance || 0;
        totalDuration += segmentRoute.duration || 0;
      }

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
    }

    setLoadingRoute(false);
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
    const driverPos = currentDriverLocation || driverLocation;
    if (!driverPos) {
      alert('يرجى تفعيل موقعك أولاً');
      return;
    }

    const allMyOrders = [...(myOrders || []), ...(myFoodOrders || [])].filter(o => 
      o.status !== 'delivered' && o.delivery_status !== 'delivered'
    );

    if (allMyOrders.length === 0) {
      alert('لا توجد طلبات للتنقل إليها');
      return;
    }

    setLoadingRoute(true);

    // جمع جميع نقاط التوقف
    const allPoints = [{
      position: [driverPos.latitude, driverPos.longitude],
      type: 'driver',
      label: 'موقعك',
      order: null
    }];

    // إضافة المتاجر
    allMyOrders.forEach((order) => {
      if (order.store_latitude && order.store_longitude) {
        allPoints.push({
          position: [order.store_latitude, order.store_longitude],
          type: 'store',
          label: order.store_name || order.seller_name || 'متجر',
          order: order,
          isFood: !!order.store_name
        });
      }
    });

    // إضافة العملاء
    allMyOrders.forEach((order) => {
      if (order.latitude && order.longitude) {
        allPoints.push({
          position: [order.latitude, order.longitude],
          type: 'customer',
          label: order.customer_name || 'عميل',
          order: order,
          isFood: !!order.store_name
        });
      }
    });

    if (allPoints.length < 2) {
      alert('لا توجد نقاط كافية');
      setLoadingRoute(false);
      return;
    }

    // جلب المسار المُحسَّن
    const optimizedData = await fetchOptimizedRoute(allPoints);
    
    let orderedPoints;
    if (optimizedData) {
      orderedPoints = optimizedData.optimizedOrder.map(idx => ({
        ...allPoints[idx],
        originalIndex: idx
      }));
    } else {
      // Fallback: ترتيب بسيط
      const stores = allPoints.filter(p => p.type === 'store');
      const customers = allPoints.filter(p => p.type === 'customer');
      const driverPoint = allPoints.find(p => p.type === 'driver');
      orderedPoints = [driverPoint, ...stores, ...customers];
    }

    // إنشاء بيانات الخطوات
    const steps = [];
    for (let i = 0; i < orderedPoints.length - 1; i++) {
      const fromPoint = orderedPoints[i];
      const toPoint = orderedPoints[i + 1];
      const routeData = await fetchSingleRoute([fromPoint.position, toPoint.position]);
      
      steps.push({
        stepNumber: i + 1,
        from: fromPoint,
        to: toPoint,
        route: routeData.coordinates,
        distance: routeData.distance,
        duration: routeData.duration
      });
    }

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

    setLoadingRoute(false);
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
    const driverPos = currentDriverLocation || driverLocation;
    if (!driverPos) {
      alert('يرجى تفعيل موقعك أولاً');
      return;
    }

    const storeCoords = [order.store_latitude, order.store_longitude];
    const customerCoords = [order.latitude, order.longitude];
    const driverCoords = [driverPos.latitude, driverPos.longitude];

    if (storeCoords[0] && customerCoords[0]) {
      setSelectedOrderForRoute(order);
      fetchRoute(driverCoords, storeCoords, customerCoords);
    }
  };

  // إخفاء المسار
  const hideRoute = () => {
    setSelectedOrderForRoute(null);
    setRouteCoordinates([]);
    setRouteInfo(null);
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
        }
      );
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

  // تصفية العلامات حسب الطبقة المختارة
  const filteredMarkers = markers.filter(m => {
    if (showLayer === 'all') return true;
    if (showLayer === 'food') return m.type === 'food-store' || m.type === 'driver';
    if (showLayer === 'products') return m.type === 'product-store' || m.type === 'driver';
    if (showLayer === 'customers') return m.type === 'customer' || m.type === 'driver';
    return true;
  });

  // عدد الطلبات التي لديها GPS
  const ordersWithGPS = markers.filter(m => m.type === 'customer' && m.hasRealGPS).length;
  const totalOrders = foodOrders.length + orders.length;

  return (
    <>
      {/* زر فتح الخريطة */}
      <button
        onClick={() => setIsOpen(true)}
        disabled={totalOrders === 0}
        className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
          totalOrders > 0 
            ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600' 
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        <Map size={18} />
        🗺️ عرض الخريطة ({totalOrders} طلب)
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
              className="w-full h-full bg-white"
              style={{ paddingTop: 'env(safe-area-inset-top)', margin: 0 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header شريط علوي موحد */}
              <div className="bg-white flex items-center justify-between px-2 py-1.5 gap-2">
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m12 19 7-7-7-7"/>
                      <path d="M19 12H5"/>
                    </svg>
                  </button>
                  <span className="text-xs font-bold text-gray-800 whitespace-nowrap">خريطة الطلبات</span>
                  <button
                    onClick={getDriverLocation}
                    className="p-1.5 bg-orange-500 text-white rounded-full"
                    title="تحديث موقعي"
                  >
                    <Locate size={14} />
                  </button>
                </div>
                
                {/* دليل الألوان */}
                <div className="flex flex-1 justify-around text-[9px]">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span> مطعم
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> متجر
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span> عميل
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span> موقعك
                  </span>
                </div>
              </div>

              {/* فلاتر الطبقات */}
              <div className="bg-white px-2 py-1 flex gap-1">
                {[
                  { key: 'all', label: 'الكل', icon: '🗺️' },
                  { key: 'food', label: 'طعام', icon: '🍔' },
                  { key: 'products', label: 'منتجات', icon: '📦' },
                  { key: 'customers', label: 'عملاء', icon: '🏠' },
                ].map(layer => (
                  <button
                    key={layer.key}
                    onClick={() => setShowLayer(layer.key)}
                    className={`flex-1 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-all ${
                      showLayer === layer.key
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {layer.icon} {layer.label}
                  </button>
                ))}
              </div>

              {/* زر عرض جميع مساراتي */}
              {(myOrders?.length > 0 || myFoodOrders?.length > 0) && !stepByStepMode && (
                <div className="bg-white px-2 py-1.5 border-t border-gray-100 space-y-1.5">
                  {!showAllMyRoutes ? (
                    <>
                      <button
                        onClick={showAllMyOrdersRoutes}
                        disabled={loadingRoute}
                        className="w-full py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                      >
                        {loadingRoute ? '⏳ جاري التحميل...' : '🗺️ عرض كل المسارات'}
                      </button>
                      <button
                        onClick={startStepByStepNavigation}
                        disabled={loadingRoute}
                        className="w-full py-2 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                      >
                        {loadingRoute ? '⏳ جاري التحميل...' : '🚗 ابدأ التنقل خطوة بخطوة'}
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
                  <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
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
                        <div className="text-center min-w-[140px]">
                          <p className="font-bold text-xs mb-1">{marker.title}</p>
                          {marker.order && (
                            <>
                              <div className="text-[10px] text-gray-600 mb-1 text-right">
                                <p className="font-medium truncate">{marker.order.delivery_address || marker.order.address}</p>
                                {(marker.order.customer_phone || marker.order.delivery_phone) && (
                                  <p className="text-blue-600">
                                    📞 {marker.order.customer_phone || marker.order.delivery_phone}
                                  </p>
                                )}
                              </div>
                              {marker.order.total && (
                                <p className="text-orange-600 font-bold text-xs mb-1">
                                  {(marker.order.total).toLocaleString()} ل.س
                                </p>
                              )}
                              {marker.type !== 'customer' && (
                                <button
                                  onClick={() => {
                                    if (marker.type === 'food-store') {
                                      onTakeFoodOrder?.(marker.order);
                                    } else {
                                      onTakeOrder?.(marker.order);
                                    }
                                    setIsOpen(false);
                                  }}
                                  className="w-full py-1 bg-orange-500 text-white rounded text-[10px] font-bold mb-1"
                                >
                                  قبول الطلب
                                </button>
                              )}
                              {/* زر عرض المسار */}
                              {marker.order && marker.order.latitude && marker.order.store_latitude && (
                                <button
                                  onClick={() => showRouteForOrder(marker.order)}
                                  disabled={loadingRoute}
                                  className="w-full py-1 bg-blue-500 text-white rounded text-[10px] font-bold flex items-center justify-center gap-1"
                                >
                                  {loadingRoute ? '⏳' : <Route size={10} />}
                                  {loadingRoute ? '...' : 'المسار'}
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
                      {optimizedStops.map((stop, idx) => {
                        // تحديد لون العلامة
                        let bgColor = '#f97316'; // برتقالي للسائق
                        let emoji = '🚗';
                        
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
                                      {stop.order.delivery_address || stop.order.address}
                                    </p>
                                    {stop.order.total && (
                                      <p className="text-orange-600 font-bold">
                                        {stop.order.total.toLocaleString()} ل.س
                                      </p>
                                    )}
                                    {(stop.order.customer_phone || stop.order.delivery_phone) && (
                                      <p className="text-blue-600">
                                        📞 {stop.order.customer_phone || stop.order.delivery_phone}
                                      </p>
                                    )}
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
                      {allStepsData[currentStepIndex] && (
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
                                <p className="text-xs text-blue-600 mt-1">
                                  📞 {allStepsData[currentStepIndex].to.order.customer_phone || allStepsData[currentStepIndex].to.order.delivery_phone}
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
                  <div className="absolute bottom-4 left-4 right-4 bg-white rounded-xl shadow-lg p-4 z-[1000]">
                    {/* شريط التقدم */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-teal-500 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${((currentStepIndex + 1) / allStepsData.length) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-bold text-gray-600">
                        {currentStepIndex + 1}/{allStepsData.length}
                      </span>
                    </div>

                    {/* معلومات المحطة الحالية */}
                    {allStepsData[currentStepIndex] && (
                      <div className="text-center mb-3">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-bold mb-2 ${
                          allStepsData[currentStepIndex].to.type === 'store'
                            ? (allStepsData[currentStepIndex].to.isFood ? 'bg-green-500' : 'bg-blue-500')
                            : 'bg-red-500'
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
                          <span className="text-orange-600 font-bold">
                            📍 {routeInfo?.distance || '0'} كم
                          </span>
                          <span className="text-blue-600 font-bold">
                            ⏱️ {routeInfo?.duration || '0'} دقيقة
                          </span>
                        </div>

                        {/* رقم الهاتف */}
                        {allStepsData[currentStepIndex].to.order && (
                          <a 
                            href={`tel:${allStepsData[currentStepIndex].to.order.customer_phone || allStepsData[currentStepIndex].to.order.delivery_phone}`}
                            className="inline-flex items-center gap-1 text-blue-600 text-sm mt-2"
                          >
                            📞 {allStepsData[currentStepIndex].to.order.customer_phone || allStepsData[currentStepIndex].to.order.delivery_phone}
                          </a>
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
                  <div className="absolute bottom-4 left-4 right-4 bg-white rounded-xl shadow-lg p-3 z-[1000]">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-sm text-gray-800">🛣️ مسار التوصيل</h4>
                      <button 
                        onClick={hideRoute}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    
                    {/* خطوات المسار */}
                    <div className="flex items-center justify-center gap-1 mb-3 text-xs">
                      <span className="flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                        <span className="w-4 h-4 bg-orange-500 text-white rounded-full text-[10px] flex items-center justify-center">1</span>
                        موقعك
                      </span>
                      <span className="text-gray-400">➜</span>
                      <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full">
                        <span className="w-4 h-4 bg-green-500 text-white rounded-full text-[10px] flex items-center justify-center">2</span>
                        المتجر
                      </span>
                      <span className="text-gray-400">➜</span>
                      <span className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full">
                        <span className="w-4 h-4 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center">3</span>
                        العميل
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-orange-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-500">المسافة الإجمالية</p>
                        <p className="font-bold text-orange-600 text-lg">{routeInfo.distance} كم</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-500">الوقت المتوقع</p>
                        <p className="font-bold text-blue-600 text-lg">{routeInfo.duration} د</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* معلومات المسار المُحسَّن (جميع الطلبات) */}
                {routeInfo && showAllMyRoutes && (
                  <div className="absolute bottom-4 left-4 right-4 bg-white rounded-xl shadow-lg p-3 z-[1000]">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-sm text-gray-800">🛣️ المسار المُحسَّن لجميع طلباتك</h4>
                      <button 
                        onClick={hideAllRoutes}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    
                    {/* دليل الألوان */}
                    <div className="flex items-center justify-center gap-3 mb-3 text-[10px]">
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-orange-500"></span>
                        <span>موقعك</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-green-500"></span>
                        <span>مطعم</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                        <span>متجر</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 rounded-full bg-red-500"></span>
                        <span>عميل</span>
                      </span>
                    </div>
                    
                    {/* إحصائيات المسار */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-purple-50 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-gray-500">نقاط التوقف</p>
                        <p className="font-bold text-purple-600 text-lg">{routeInfo.stopsCount || optimizedStops.length}</p>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-gray-500">المسافة</p>
                        <p className="font-bold text-orange-600 text-lg">{routeInfo.distance} كم</p>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-gray-500">الوقت</p>
                        <p className="font-bold text-blue-600 text-lg">{routeInfo.duration} د</p>
                      </div>
                    </div>

                    {/* ملاحظة */}
                    <p className="text-[10px] text-gray-400 text-center mt-2">
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
