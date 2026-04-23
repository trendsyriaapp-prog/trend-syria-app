// /app/frontend/src/components/GoogleMapsLocationPicker.js
// مكون اختيار الموقع مع خريطة ملء الشاشة
// يستخدم OpenStreetMap + Leaflet (مجاني)

import { useState, useEffect, lazy, Suspense } from 'react';
import { MapPin, Loader2, Check, ChevronLeft } from 'lucide-react';

// تحميل الخريطة بشكل كسول لتحسين الأداء
const FullScreenMapPicker = lazy(() => import('./FullScreenMapPicker'));

/**
 * مكون لاختيار الموقع مع خريطة ملء الشاشة
 * يدعم: GPS، الضغط على الخريطة، سحب الدبوس
 * 
 * يدعم API القديمة والجديدة:
 * - الجديدة: currentLocation, onLocationSelect
 * - القديمة: latitude, longitude, onLocationChange
 */
const GoogleMapsLocationPicker = ({ 
  // API الجديدة
  onLocationSelect, 
  currentLocation = null,
  // API القديمة (للتوافق)
  latitude,
  longitude,
  onLocationChange,
  // خيارات مشتركة
  required = true,
  label = "موقع التوصيل",
  warningMessage = null,
  height = "300px"
}) => {
  // تحويل API القديمة للجديدة
  const effectiveLocation = currentLocation || (latitude && longitude ? { latitude, longitude } : null);
  
  const handleLocationSelect = (location) => {
    // استدعاء API الجديدة
    if (onLocationSelect) {
      onLocationSelect(location);
    }
    // استدعاء API القديمة
    if (onLocationChange && location) {
      onLocationChange(location.latitude, location.longitude);
    }
  };

  const [showMap, setShowMap] = useState(false);
  const hasLocation = effectiveLocation?.latitude && effectiveLocation?.longitude;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* تنبيه مخصص */}
      {warningMessage && !hasLocation && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 flex items-start gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <p className="text-sm font-bold text-amber-800">تنبيه مهم!</p>
            <p className="text-xs text-amber-700 mt-1">{warningMessage}</p>
          </div>
        </div>
      )}

      {/* زر فتح الخريطة أو عرض الموقع المحدد */}
      {hasLocation ? (
        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="font-bold text-green-800 text-sm">تم تحديد الموقع</p>
                <p className="text-[10px] text-green-600" dir="ltr">
                  {effectiveLocation.latitude.toFixed(6)}, {effectiveLocation.longitude.toFixed(6)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowMap(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-1"
            >
              تعديل
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowMap(true)}
          className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-[#FF6B00] to-[#FF8533] text-white rounded-xl font-bold text-sm hover:from-[#E65000] hover:to-[#FF6B00] transition-all shadow-lg"
        >
          <MapPin className="w-5 h-5" />
          <span>فتح الخريطة لتحديد الموقع</span>
        </button>
      )}

      {/* الخريطة بملء الشاشة */}
      <Suspense fallback={
        <div className="fixed inset-0 z-50 bg-white flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-10 h-10 text-[#FF6B00] animate-spin mx-auto mb-3" />
            <p className="text-gray-600">جاري تحميل الخريطة...</p>
          </div>
        </div>
      }>
        <FullScreenMapPicker
          isOpen={showMap}
          onClose={() => setShowMap(false)}
          onConfirm={handleLocationSelect}
          currentLocation={effectiveLocation}
          title={label}
        />
      </Suspense>
    </div>
  );
};

export default GoogleMapsLocationPicker;
