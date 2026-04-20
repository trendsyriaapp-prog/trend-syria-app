// /app/frontend/src/components/InteractiveMapPicker.js
// خريطة تفاعلية لاختيار الموقع - OpenStreetMap + Leaflet
// مثل تطبيق وديني - يمكن للمستخدم تحريك الدبوس

import { useState, useEffect, useRef } from 'react';
import logger from '../lib/logger';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Crosshair, Loader2, Check, X, Navigation, AlertTriangle } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

// إصلاح أيقونة Leaflet الافتراضية
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// أيقونة مخصصة للموقع
const locationIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FF6B00" width="40" height="40">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `),
  iconSize: [40, 40],
  iconAnchor: [20, 40],
  popupAnchor: [0, -40],
});

// مكون لتحديث موقع الخريطة
const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

// مكون للتعامل مع أحداث الخريطة
const MapEventHandler = ({ onLocationChange }) => {
  useMapEvents({
    click: (e) => {
      onLocationChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// مكون الدبوس القابل للسحب
const DraggableMarker = ({ position, onDragEnd }) => {
  const markerRef = useRef(null);

  const eventHandlers = {
    dragend() {
      const marker = markerRef.current;
      if (marker) {
        const { lat, lng } = marker.getLatLng();
        onDragEnd(lat, lng);
      }
    },
  };

  return (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={locationIcon}
    />
  );
};

/**
 * مكون الخريطة التفاعلية لاختيار الموقع
 */
const InteractiveMapPicker = ({
  onLocationSelect,
  currentLocation = null,
  label = "حدد الموقع على الخريطة",
  warningMessage = null,
  height = "300px"
}) => {
  const { toast } = useToast();
  
  // الموقع الافتراضي (دمشق)
  const defaultLocation = { lat: 33.5138, lng: 36.2765 };
  
  const [position, setPosition] = useState(
    currentLocation?.latitude 
      ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
      : null
  );
  const [mapCenter, setMapCenter] = useState(
    currentLocation?.latitude 
      ? [currentLocation.latitude, currentLocation.longitude]
      : [defaultLocation.lat, defaultLocation.lng]
  );
  const [loading, setLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);
  const [isConfirmed, setIsConfirmed] = useState(!!currentLocation?.latitude);

  // تحديث الموقع عند تغيير currentLocation من الخارج
  useEffect(() => {
    if (currentLocation?.latitude) {
      setPosition({ lat: currentLocation.latitude, lng: currentLocation.longitude });
      setMapCenter([currentLocation.latitude, currentLocation.longitude]);
      setIsConfirmed(true);
    }
  }, [currentLocation]);

  // الحصول على موقع GPS الحالي
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      const errorMsg = 'المتصفح لا يدعم تحديد الموقع';
      setGpsError(errorMsg);
      toast({
        title: "⚠️ غير مدعوم",
        description: errorMsg,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition({ lat: latitude, lng: longitude });
        setMapCenter([latitude, longitude]);
        setIsConfirmed(false);
        setLoading(false);
        toast({
          title: "✅ تم تحديد موقعك",
          description: "يمكنك تعديل الموقع بسحب الدبوس"
        });
      },
      (error) => {
        setLoading(false);
        let errorMsg = '';
        let toastTitle = '⚠️ تعذر تحديد الموقع';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = 'يرجى السماح للتطبيق بالوصول لموقعك من إعدادات الهاتف';
            toastTitle = '🔒 صلاحية الموقع مرفوضة';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = 'يرجى تفعيل خدمة الموقع (GPS) من إعدادات الهاتف';
            toastTitle = '📍 خدمة الموقع غير مفعّلة';
            break;
          case error.TIMEOUT:
            errorMsg = 'انتهت مهلة تحديد الموقع. تأكد من تفعيل GPS وحاول مرة أخرى';
            toastTitle = '⏱️ انتهت المهلة';
            break;
          default:
            errorMsg = 'حدث خطأ غير متوقع في تحديد الموقع. حاول مرة أخرى';
        }
        
        setGpsError(errorMsg);
        toast({
          title: toastTitle,
          description: errorMsg,
          variant: "destructive",
          duration: 5000
        });
      },
      {
        enableHighAccuracy: false,
        timeout: 30000,
        maximumAge: 60000
      }
    );
  };

  // تحديث الموقع عند تحريك الدبوس أو الضغط على الخريطة
  const handleLocationChange = (lat, lng) => {
    setPosition({ lat, lng });
    setIsConfirmed(false);
  };

  // جلب العنوان من الإحداثيات (Reverse Geocoding)
  const fetchAddressFromCoordinates = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`,
        {
          headers: {
            'User-Agent': 'TrendSyria-App'
          }
        }
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      
      if (data && data.address) {
        // بناء العنوان بطريقة مفهومة
        const parts = [];
        
        // الحي أو المنطقة
        if (data.address.neighbourhood) parts.push(data.address.neighbourhood);
        else if (data.address.suburb) parts.push(data.address.suburb);
        else if (data.address.quarter) parts.push(data.address.quarter);
        
        // الشارع
        if (data.address.road) parts.push(data.address.road);
        
        // المدينة
        if (data.address.city) parts.push(data.address.city);
        else if (data.address.town) parts.push(data.address.town);
        else if (data.address.village) parts.push(data.address.village);
        
        // المحافظة
        if (data.address.state) parts.push(data.address.state);
        
        return parts.length > 0 ? parts.join('، ') : data.display_name;
      }
      
      return null;
    } catch (error) {
      logger.error('Error fetching address:', error);
      return null;
    }
  };

  // تأكيد الموقع
  const confirmLocation = async () => {
    if (position) {
      setLoading(true);
      
      // جلب العنوان
      const address = await fetchAddressFromCoordinates(position.lat, position.lng);
      
      setLoading(false);
      
      onLocationSelect({
        latitude: position.lat,
        longitude: position.lng,
        address: address || '',
        source: 'map_picker'
      });
      setIsConfirmed(true);
      
      if (address) {
        toast({
          title: "✅ تم تحديد الموقع",
          description: "تم جلب العنوان تلقائياً، يمكنك تعديله"
        });
      }
    }
  };

  // إلغاء/مسح الموقع
  const clearLocation = () => {
    setPosition(null);
    setIsConfirmed(false);
    onLocationSelect(null);
  };

  return (
    <div className="space-y-3">
      {/* العنوان */}
      <label className="block text-sm font-bold text-gray-700">
        {label} <span className="text-red-500">*</span>
      </label>

      {/* تنبيه مخصص */}
      {warningMessage && !isConfirmed && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-sm font-bold text-amber-800">تنبيه مهم!</p>
            <p className="text-xs text-amber-700 mt-1">{warningMessage}</p>
          </div>
        </div>
      )}

      {/* الخريطة */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-gray-200 shadow-lg">
        <MapContainer
          center={mapCenter}
          zoom={15}
          style={{ height, width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapUpdater center={position ? [position.lat, position.lng] : null} />
          <MapEventHandler onLocationChange={handleLocationChange} />
          
          {position && (
            <DraggableMarker
              position={[position.lat, position.lng]}
              onDragEnd={handleLocationChange}
            />
          )}
        </MapContainer>

        {/* أيقونة المركز (إذا لم يكن هناك موقع محدد) */}
        {!position && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <Crosshair className="w-12 h-12 text-gray-400 mx-auto" />
              <p className="text-xs text-gray-500 mt-2 bg-white/80 px-2 py-1 rounded">
                اضغط على الخريطة لتحديد الموقع
              </p>
            </div>
          </div>
        )}

        {/* زر GPS */}
        <button
          type="button"
          onClick={getCurrentLocation}
          disabled={loading}
          className="absolute bottom-4 right-4 z-[1000] bg-white p-3 rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-all"
          title="موقعي الحالي"
        >
          {loading ? (
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          ) : (
            <Navigation className="w-6 h-6 text-blue-500" />
          )}
        </button>

        {/* مؤشر التحميل */}
        {loading && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-[1001]">
            <div className="bg-white rounded-xl p-4 shadow-lg text-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-600">جاري تحديد موقعك...</p>
            </div>
          </div>
        )}
      </div>

      {/* خطأ GPS */}
      {gpsError && (
        <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-red-700 mb-1">تعذر تحديد الموقع</p>
            <p className="text-sm text-red-600">{gpsError}</p>
            <button
              type="button"
              onClick={getCurrentLocation}
              className="mt-2 text-xs text-red-700 underline hover:text-red-900"
            >
              حاول مرة أخرى
            </button>
          </div>
        </div>
      )}

      {/* تعليمات */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-700">
          💡 <strong>تعليمات:</strong> اضغط على الخريطة لتحديد الموقع، أو اضغط زر 
          <Navigation className="w-3 h-3 inline mx-1" /> 
          للموقع الحالي. يمكنك سحب الدبوس لتعديل الموقع.
        </p>
      </div>

      {/* أزرار التأكيد */}
      {position && (
        <div className="flex gap-2">
          {!isConfirmed ? (
            <>
              <button
                type="button"
                onClick={confirmLocation}
                className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 transition-all"
              >
                <Check className="w-5 h-5" />
                تأكيد الموقع
              </button>
              <button
                type="button"
                onClick={clearLocation}
                className="px-4 flex items-center justify-center bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-between bg-green-100 border border-green-300 rounded-xl p-3">
              <div className="flex items-center gap-2 text-green-700">
                <Check className="w-5 h-5" />
                <span className="font-bold text-sm">تم تحديد الموقع</span>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmed(false)}
                className="text-xs text-green-600 hover:text-green-800 underline"
              >
                تعديل
              </button>
            </div>
          )}
        </div>
      )}

      {/* الإحداثيات (للتطوير) */}
      {position && (
        <p className="text-[10px] text-gray-400 text-center" dir="ltr">
          {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
        </p>
      )}
    </div>
  );
};

export default InteractiveMapPicker;
