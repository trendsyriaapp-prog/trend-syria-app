import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import axios from 'axios';
import { Loader2, Navigation, MapPin, Clock, RefreshCw, Route } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import 'leaflet/dist/leaflet.css';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// أيقونات مخصصة
const createIcon = (emoji, color) => {
  return new Icon({
    iconUrl: `data:image/svg+xml,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 50">
        <path d="M20 0 C8.954 0 0 8.954 0 20 C0 35 20 50 20 50 S40 35 40 20 C40 8.954 31.046 0 20 0Z" fill="${color}"/>
        <circle cx="20" cy="18" r="12" fill="white"/>
        <text x="20" y="23" font-size="14" text-anchor="middle">${emoji}</text>
      </svg>
    `)}`,
    iconSize: [35, 45],
    iconAnchor: [17, 45],
    popupAnchor: [0, -45]
  });
};

const driverIcon = createIcon('🏍️', '#f97316');
const customerIcon = createIcon('🏠', '#22c55e');

// مكون لتعديل حدود الخريطة
const FitBoundsComponent = ({ driverPos, customerPos }) => {
  const map = useMap();
  
  useEffect(() => {
    if (driverPos && customerPos) {
      const bounds = [driverPos, customerPos];
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [map, driverPos, customerPos]);
  
  return null;
};

/**
 * مكون خريطة تتبع السائق للعميل
 */
const DriverTrackingMap = ({ orderId, orderStatus }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [locationData, setLocationData] = useState(null);
  const [error, setError] = useState(null);
  const [soundPlayed, setSoundPlayed] = useState(false);
  const audioRef = useRef(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);

  // جلب موقع السائق
  const fetchDriverLocation = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await axios.get(`${API}/delivery/location/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLocationData(res.data);
      setLastUpdate(new Date());
      setError(null);
      
      // جلب المسار الفعلي إذا كان هناك موقع للسائق والعميل
      if (res.data.driver_latitude && res.data.customer_latitude) {
        await fetchRoute(
          res.data.driver_latitude, 
          res.data.driver_longitude,
          res.data.customer_latitude,
          res.data.customer_longitude
        );
      }
    } catch (err) {
      console.error('Error fetching driver location:', err);
      setError('فشل في جلب موقع السائق');
    } finally {
      setLoading(false);
    }
  };

  // جلب المسار من OSRM
  const fetchRoute = async (driverLat, driverLon, customerLat, customerLon) => {
    try {
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${driverLon},${driverLat};${customerLon},${customerLat}?overview=full&geometries=geojson`;
      const res = await axios.get(osrmUrl);
      
      if (res.data.routes && res.data.routes.length > 0) {
        const route = res.data.routes[0];
        // تحويل الإحداثيات من [lon, lat] إلى [lat, lon] لـ Leaflet
        const coords = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
        setRouteCoordinates(coords);
        setRouteData({
          distance: (route.distance / 1000).toFixed(1), // km
          duration: Math.ceil(route.duration / 60) // minutes
        });
      }
    } catch (err) {
      console.error('Error fetching route:', err);
      // في حالة الفشل، نستخدم الحساب البسيط
    }
  };

  // جلب الموقع عند التحميل وكل 5 ثواني (تتبع مباشر)
  useEffect(() => {
    fetchDriverLocation();
    
    const interval = setInterval(fetchDriverLocation, 5000);
    
    return () => clearInterval(interval);
  }, [orderId]);

  // حساب المسافة بين نقطتين
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // نصف قطر الأرض بالكيلومتر
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // حساب الوقت المتوقع للوصول
  const estimateArrivalTime = (distance) => {
    // افتراض سرعة 30 كم/ساعة في المدينة
    const timeInHours = distance / 30;
    const timeInMinutes = Math.ceil(timeInHours * 60);
    return timeInMinutes;
  };

  // دالة تشغيل صوت الإشعار
  const playNotificationSound = () => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/notification.mp3');
      }
      audioRef.current.play().catch(e => console.log('Audio play failed:', e));
    } catch (e) {
      console.log('Audio error:', e);
    }
  };

  // حساب المسافة للتتبع
  const driverLat = locationData?.driver_latitude;
  const driverLon = locationData?.driver_longitude;
  const customerLat = locationData?.customer_latitude;
  const customerLon = locationData?.customer_longitude;
  
  const isNearby = driverLat && driverLon && customerLat && customerLon
    ? calculateDistance(driverLat, driverLon, customerLat, customerLon) < 0.5
    : false;

  // تشغيل صوت الإشعار عند اقتراب السائق
  useEffect(() => {
    if (isNearby && !soundPlayed) {
      playNotificationSound();
      setSoundPlayed(true);
    }
  }, [isNearby, soundPlayed]);

  if (loading) {
    return (
      <div className="bg-gray-100 rounded-xl p-6 flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-500" size={24} />
        <span className="mr-2 text-gray-600">جاري تحميل موقع السائق...</span>
      </div>
    );
  }

  // إذا لم يتم تعيين سائق بعد
  if (!locationData?.has_driver) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
        <Clock size={32} className="text-yellow-500 mx-auto mb-2" />
        <p className="text-yellow-700 font-bold">في انتظار تعيين سائق</p>
        <p className="text-yellow-600 text-sm">سيتم إشعارك عند قبول السائق للطلب</p>
      </div>
    );
  }

  // إذا لم يكن هناك موقع للسائق
  if (!locationData?.driver_latitude) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
        <Navigation size={32} className="text-blue-500 mx-auto mb-2" />
        <p className="text-blue-700 font-bold">السائق في الطريق</p>
        <p className="text-blue-600 text-sm">جاري تحديث الموقع...</p>
      </div>
    );
  }

  const driverPos = [locationData.driver_latitude, locationData.driver_longitude];
  const customerPos = locationData.customer_latitude && locationData.customer_longitude 
    ? [locationData.customer_latitude, locationData.customer_longitude]
    : null;

  // استخدام بيانات المسار الفعلي إذا كانت متاحة، أو الحساب البسيط
  let displayDistance = null;
  let displayTime = null;
  
  if (routeData) {
    displayDistance = parseFloat(routeData.distance);
    displayTime = routeData.duration;
  } else if (customerPos) {
    displayDistance = calculateDistance(
      locationData.driver_latitude, locationData.driver_longitude,
      locationData.customer_latitude, locationData.customer_longitude
    );
    displayTime = estimateArrivalTime(displayDistance);
  }

  // مركز الخريطة
  const center = customerPos 
    ? [(driverPos[0] + customerPos[0]) / 2, (driverPos[1] + customerPos[1]) / 2]
    : driverPos;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden" data-testid="driver-tracking-map">
      {/* إشعار اقتراب السائق */}
      {displayDistance && displayDistance < 0.5 && (
        <div className="bg-green-500 text-white p-3 flex items-center gap-2 animate-pulse">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            🏍️
          </div>
          <div>
            <p className="font-bold text-sm">السائق وصل!</p>
            <p className="text-xs text-white/90">على بعد {Math.round(displayDistance * 1000)} متر منك</p>
          </div>
        </div>
      )}
      
      {/* معلومات التتبع */}
      <div className={`p-3 ${displayDistance && displayDistance < 0.5 ? 'bg-green-600' : 'bg-gradient-to-l from-orange-500 to-orange-600'} text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation size={18} />
            <span className="font-bold text-sm">تتبع السائق</span>
            {routeData && (
              <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                <Route size={10} />
                مسار فعلي
              </span>
            )}
          </div>
          <button
            onClick={fetchDriverLocation}
            className="p-1.5 bg-white/20 rounded-full hover:bg-white/30"
            title="تحديث الموقع"
            data-testid="refresh-tracking"
          >
            <RefreshCw size={14} />
          </button>
        </div>
        
        {displayDistance !== null && (
          <div className="flex items-center gap-4 mt-2 text-sm">
            <div className="flex items-center gap-1">
              <MapPin size={14} />
              <span>{displayDistance < 1 ? `${Math.round(displayDistance * 1000)} متر` : `${displayDistance.toFixed(1)} كم`}</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={14} />
              <span>~{displayTime} دقيقة</span>
            </div>
          </div>
        )}
      </div>

      {/* الخريطة */}
      <div className="h-48">
        <MapContainer
          center={center}
          zoom={14}
          className="h-full w-full"
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap'
          />
          
          {/* تعديل حدود الخريطة لتشمل السائق والعميل */}
          {customerPos && <FitBoundsComponent driverPos={driverPos} customerPos={customerPos} />}
          
          {/* موقع السائق */}
          <Marker position={driverPos} icon={driverIcon}>
            <Popup>
              <div className="text-center">
                <span className="font-bold">🏍️ موظف التوصيل</span>
                <p className="text-xs text-gray-500">في الطريق إليك</p>
              </div>
            </Popup>
          </Marker>
          
          {/* موقع العميل */}
          {customerPos && (
            <Marker position={customerPos} icon={customerIcon}>
              <Popup>
                <div className="text-center">
                  <span className="font-bold">🏠 موقع التسليم</span>
                  <p className="text-xs text-gray-500">
                    {typeof locationData.delivery_address === 'object' 
                      ? [locationData.delivery_address?.area, locationData.delivery_address?.street, locationData.delivery_address?.building].filter(Boolean).join(', ')
                      : locationData.delivery_address}
                  </p>
                </div>
              </Popup>
            </Marker>
          )}
          
          {/* المسار الفعلي أو خط مستقيم */}
          {routeCoordinates.length > 0 ? (
            <Polyline
              positions={routeCoordinates}
              color="#f97316"
              weight={4}
              opacity={0.8}
            />
          ) : customerPos && (
            <Polyline
              positions={[driverPos, customerPos]}
              color="#f97316"
              weight={3}
              dashArray="10, 10"
            />
          )}
        </MapContainer>
      </div>

      {/* آخر تحديث */}
      {lastUpdate && (
        <div className="p-2 bg-gray-50 text-center">
          <p className="text-xs text-gray-500">
            آخر تحديث: {lastUpdate.toLocaleTimeString('ar-SA')}
          </p>
        </div>
      )}
    </div>
  );
};

export default DriverTrackingMap;
