// /app/frontend/src/components/FullScreenMapPicker.js
// خريطة ملء الشاشة لاختيار الموقع

import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Crosshair, Loader2, Check, X, Navigation, AlertTriangle, ChevronRight } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

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
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#FF6B00" width="48" height="48">
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
    </svg>
  `),
  iconSize: [48, 48],
  iconAnchor: [24, 48],
  popupAnchor: [0, -48],
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
 * مكون الخريطة بملء الشاشة
 */
const FullScreenMapPicker = ({
  isOpen,
  onClose,
  onConfirm,
  currentLocation = null,
  title = "تحديد الموقع"
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

  // تحديث الموقع عند فتح النافذة
  useEffect(() => {
    if (isOpen && currentLocation?.latitude) {
      setPosition({ lat: currentLocation.latitude, lng: currentLocation.longitude });
      setMapCenter([currentLocation.latitude, currentLocation.longitude]);
    }
  }, [isOpen, currentLocation]);

  // الحصول على موقع GPS الحالي
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      const errorMsg = 'المتصفح لا يدعم تحديد الموقع';
      setGpsError(errorMsg);
      toast({
        title: "غير مدعوم",
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
        setLoading(false);
        toast({
          title: "تم تحديد موقعك",
          description: "يمكنك تعديل الموقع بسحب الدبوس"
        });
      },
      (error) => {
        setLoading(false);
        let errorMsg = '';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMsg = 'يرجى السماح للتطبيق بالوصول لموقعك';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMsg = 'يرجى تفعيل خدمة الموقع (GPS)';
            break;
          case error.TIMEOUT:
            errorMsg = 'انتهت مهلة تحديد الموقع';
            break;
          default:
            errorMsg = 'حدث خطأ في تحديد الموقع';
        }
        
        setGpsError(errorMsg);
        toast({
          title: "تعذر تحديد الموقع",
          description: errorMsg,
          variant: "destructive"
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
  };

  // تأكيد الموقع
  const handleConfirm = () => {
    if (position) {
      onConfirm({
        latitude: position.lat,
        longitude: position.lng
      });
      onClose();
    } else {
      toast({
        title: "تنبيه",
        description: "يرجى تحديد الموقع أولاً",
        variant: "destructive"
      });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-white"
      >
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-[1001] bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3 safe-area-top">
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-800"
            >
              <ChevronRight size={24} />
              <span className="text-sm font-medium">رجوع</span>
            </button>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <MapPin size={20} className="text-[#FF6B00]" />
              {title}
            </h2>
            <div className="w-16"></div>
          </div>
        </div>

        {/* Map Container */}
        <div className="absolute inset-0 pt-14 pb-32">
          <MapContainer
            center={mapCenter}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
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
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingBottom: '80px' }}>
              <div className="text-center">
                <Crosshair className="w-16 h-16 text-gray-400 mx-auto" />
                <p className="text-sm text-gray-600 mt-3 bg-white/90 px-4 py-2 rounded-full shadow">
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
            className="absolute bottom-4 right-4 z-[1000] bg-white p-4 rounded-full shadow-xl border border-gray-200 hover:bg-gray-50 active:bg-gray-100 transition-all"
            title="موقعي الحالي"
          >
            {loading ? (
              <Loader2 className="w-7 h-7 text-blue-500 animate-spin" />
            ) : (
              <Navigation className="w-7 h-7 text-blue-500" />
            )}
          </button>

          {/* مؤشر التحميل */}
          {loading && (
            <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-[1001]">
              <div className="bg-white rounded-2xl p-6 shadow-xl text-center">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-3" />
                <p className="text-base text-gray-700 font-medium">جاري تحديد موقعك...</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Panel */}
        <div className="absolute bottom-0 left-0 right-0 z-[1001] bg-white border-t border-gray-200 px-4 py-4 safe-area-bottom">
          {/* خطأ GPS */}
          {gpsError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-600">{gpsError}</p>
            </div>
          )}

          {/* تعليمات */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
            <p className="text-xs text-blue-700 text-center">
              اضغط على الخريطة لتحديد الموقع، أو اضغط زر 
              <Navigation className="w-3 h-3 inline mx-1" /> 
              للموقع الحالي. يمكنك سحب الدبوس لتعديل الموقع.
            </p>
          </div>

          {/* الإحداثيات */}
          {position && (
            <p className="text-[10px] text-gray-400 text-center mb-3" dir="ltr">
              {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
            </p>
          )}

          {/* زر التأكيد */}
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!position}
            className="w-full flex items-center justify-center gap-2 bg-[#FF6B00] text-white py-4 rounded-xl font-bold text-base hover:bg-[#E65000] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check className="w-6 h-6" />
            تأكيد الموقع
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FullScreenMapPicker;
