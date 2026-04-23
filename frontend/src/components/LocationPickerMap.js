import { useState, useEffect, useRef, useCallback } from 'react';
import logger from '../lib/logger';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import { MapPin, Navigation, X, Check, Loader2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icon
const customIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map clicks
const MapClickHandler = ({ onLocationSelect }) => {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// مكون لإصلاح حجم الخريطة عند فتحها (يحل مشكلة الـ tiles المختفية)
const MapResizer = () => {
  const map = useMap();
  
  useEffect(() => {
    // إصلاح حجم الخريطة بعد التحميل
    const timer1 = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    
    const timer2 = setTimeout(() => {
      map.invalidateSize();
    }, 300);
    
    const timer3 = setTimeout(() => {
      map.invalidateSize();
    }, 500);
    
    // إصلاح عند تغيير حجم النافذة
    const handleResize = () => {
      map.invalidateSize();
    };
    
    window.addEventListener('resize', handleResize);
    
    // إصلاح عند التكبير/التصغير
    map.on('zoomend', () => {
      setTimeout(() => map.invalidateSize(), 100);
    });
    
    map.on('moveend', () => {
      setTimeout(() => map.invalidateSize(), 100);
    });
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);
  
  return null;
};

// Component to center map on location
const MapCenterController = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 15);
    }
  }, [center, map]);
  return null;
};

const LocationPickerMap = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  initialLat = null, 
  initialLng = null,
  title = "حدد موقعك على الخريطة"
}) => {
  // Default to Damascus center
  const defaultLat = 33.5138;
  const defaultLng = 36.2765;
  
  const [selectedLat, setSelectedLat] = useState(initialLat || defaultLat);
  const [selectedLng, setSelectedLng] = useState(initialLng || defaultLng);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [address, setAddress] = useState('');
  const [gpsAccuracy, setGpsAccuracy] = useState(null); // دقة GPS بالمتر
  const [accuracyStatus, setAccuracyStatus] = useState(null); // 'good', 'poor', null
  const mapRef = useRef(null);

  useEffect(() => {
    if (isOpen && initialLat && initialLng) {
      setSelectedLat(initialLat);
      setSelectedLng(initialLng);
    }
  }, [isOpen, initialLat, initialLng]);

  // معالج زر الرجوع في الهاتف (Back button)
  useEffect(() => {
    if (!isOpen) return;

    // إضافة entry إلى history عند فتح الخريطة
    const handleBackButton = (e) => {
      e.preventDefault();
      onClose();
    };

    // إضافة state جديد للـ history
    window.history.pushState({ locationPicker: true }, '');
    
    // الاستماع لحدث popstate (زر الرجوع)
    window.addEventListener('popstate', handleBackButton);

    return () => {
      window.removeEventListener('popstate', handleBackButton);
      // إزالة state من history إذا لم يتم الضغط على زر الرجوع
      if (window.history.state?.locationPicker) {
        window.history.back();
      }
    };
  }, [isOpen, onClose]);

  const handleLocationSelect = (lat, lng) => {
    setSelectedLat(lat);
    setSelectedLng(lng);
    setGpsAccuracy(null); // إعادة تعيين الدقة عند النقر اليدوي
    setAccuracyStatus(null);
    reverseGeocode(lat, lng);
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=ar`
      );
      const data = await response.json();
      if (data.display_name) {
        setAddress(data.display_name);
      }
    } catch (error) {
      logger.error('Reverse geocode error:', error);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('المتصفح لا يدعم تحديد الموقع');
      return;
    }

    setGettingLocation(true);
    setGpsAccuracy(null);
    setAccuracyStatus(null);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setSelectedLat(latitude);
        setSelectedLng(longitude);
        setGpsAccuracy(Math.round(accuracy));
        
        // تحديد حالة الدقة
        if (accuracy <= 50) {
          setAccuracyStatus('good'); // دقة ممتازة
        } else if (accuracy <= 100) {
          setAccuracyStatus('moderate'); // دقة مقبولة
        } else {
          setAccuracyStatus('poor'); // دقة ضعيفة
        }
        
        reverseGeocode(latitude, longitude);
        setGettingLocation(false);
      },
      (error) => {
        logger.error('Geolocation error:', error);
        alert('تعذر تحديد موقعك. تأكد من تفعيل خدمة الموقع.');
        setGettingLocation(false);
      },
      { enableHighAccuracy: false, timeout: 30000, maximumAge: 60000 }
    );
  };

  const handleConfirm = () => {
    if (selectedLat && selectedLng) {
      onConfirm(selectedLat, selectedLng, address);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-[1000] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg">{title}</h2>
              <p className="text-sm text-white/80">انقر على الخريطة لتحديد موقعك</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Map Container */}
        <div className="relative h-[400px]">
          <MapContainer
            center={[selectedLat, selectedLng]}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap'
            />
            <MapResizer />
            <MapClickHandler onLocationSelect={handleLocationSelect} />
            <MapCenterController center={[selectedLat, selectedLng]} />
            <Marker position={[selectedLat, selectedLng]} icon={customIcon} />
          </MapContainer>

          {/* Get Current Location Button */}
          <button
            onClick={getCurrentLocation}
            disabled={gettingLocation}
            className="absolute bottom-4 right-4 z-[500] bg-white shadow-lg rounded-full p-3 hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="موقعي الحالي"
          >
            {gettingLocation ? (
              <Loader2 size={24} className="text-[#FF6B00] animate-spin" />
            ) : (
              <Navigation size={24} className="text-[#FF6B00]" />
            )}
          </button>
        </div>

        {/* Selected Location Info */}
        <div className="p-4 bg-gray-50 border-t">
          {/* مؤشر دقة GPS */}
          {gpsAccuracy !== null && (
            <div className={`mb-3 p-3 rounded-xl flex items-center gap-3 ${
              accuracyStatus === 'good' 
                ? 'bg-green-50 border border-green-200' 
                : accuracyStatus === 'moderate'
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                accuracyStatus === 'good' 
                  ? 'bg-green-100' 
                  : accuracyStatus === 'moderate'
                  ? 'bg-yellow-100'
                  : 'bg-red-100'
              }`}>
                {accuracyStatus === 'good' ? (
                  <Check size={20} className="text-green-600" />
                ) : accuracyStatus === 'moderate' ? (
                  <Navigation size={20} className="text-yellow-600" />
                ) : (
                  <MapPin size={20} className="text-red-600" />
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm font-bold ${
                  accuracyStatus === 'good' 
                    ? 'text-green-700' 
                    : accuracyStatus === 'moderate'
                    ? 'text-yellow-700'
                    : 'text-red-700'
                }`}>
                  {accuracyStatus === 'good' 
                    ? '✓ موقع دقيق جداً' 
                    : accuracyStatus === 'moderate'
                    ? '⚠ دقة مقبولة'
                    : '⚠ دقة منخفضة'}
                </p>
                <p className={`text-xs ${
                  accuracyStatus === 'good' 
                    ? 'text-green-600' 
                    : accuracyStatus === 'moderate'
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}>
                  الدقة: ±{gpsAccuracy} متر
                  {accuracyStatus === 'poor' && ' - يُفضل تحريك المؤشر يدوياً'}
                </p>
              </div>
            </div>
          )}
          
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#FF6B00]/10 rounded-full flex items-center justify-center flex-shrink-0">
              <MapPin size={20} className="text-[#FF6B00]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800">الموقع المحدد:</p>
              {address ? (
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{address}</p>
              ) : (
                <p className="text-xs text-gray-400 mt-1">انقر على الخريطة لتحديد الموقع</p>
              )}
              <p className="text-[10px] text-gray-400 mt-1 font-mono">
                {selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-white border-t flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 border-2 border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedLat || !selectedLng}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white rounded-xl font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Check size={20} />
            تأكيد الموقع
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationPickerMap;
