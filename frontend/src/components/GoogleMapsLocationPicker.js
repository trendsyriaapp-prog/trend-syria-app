// /app/frontend/src/components/GoogleMapsLocationPicker.js
// مكون اختيار الموقع مع خريطة تفاعلية
// يستخدم OpenStreetMap + Leaflet (مجاني)

import { useState, lazy, Suspense } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

// تحميل الخريطة بشكل كسول لتحسين الأداء
const InteractiveMapPicker = lazy(() => import('./InteractiveMapPicker'));

/**
 * مكون لاختيار الموقع مع خريطة تفاعلية
 * يدعم: GPS، الضغط على الخريطة، سحب الدبوس
 */
const GoogleMapsLocationPicker = ({ 
  onLocationSelect, 
  currentLocation = null,
  required = true,
  label = "موقع التوصيل",
  warningMessage = null
}) => {
  const [showMap, setShowMap] = useState(!!currentLocation?.latitude);

  // إذا لم تكن الخريطة مفتوحة، أظهر زر لفتحها
  if (!showMap && !currentLocation?.latitude) {
    return (
      <div className="space-y-3">
        <label className="block text-sm font-bold text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>

        {/* تنبيه مخصص */}
        {warningMessage && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="text-sm font-bold text-amber-800">تنبيه مهم!</p>
              <p className="text-xs text-amber-700 mt-1">{warningMessage}</p>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowMap(true)}
          className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold text-sm hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg"
        >
          <MapPin className="w-5 h-5" />
          <span>فتح الخريطة لتحديد الموقع</span>
        </button>
      </div>
    );
  }

  // عرض الخريطة التفاعلية
  return (
    <Suspense fallback={
      <div className="bg-gray-100 rounded-xl p-8 flex flex-col items-center justify-center" style={{ height: '300px' }}>
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
        <p className="text-sm text-gray-600">جاري تحميل الخريطة...</p>
      </div>
    }>
      <InteractiveMapPicker
        onLocationSelect={onLocationSelect}
        currentLocation={currentLocation}
        label={label}
        warningMessage={warningMessage}
        height="300px"
      />
    </Suspense>
  );
};

export default GoogleMapsLocationPicker;
