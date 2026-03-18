import { useState } from 'react';
import { MapPin, ExternalLink, Check, X, Loader2 } from 'lucide-react';

/**
 * مكون لاختيار الموقع من Google Maps
 * يسمح للمستخدم بمشاركة موقعه أو فتح Google Maps لتحديد الموقع
 */
const GoogleMapsLocationPicker = ({ 
  onLocationSelect, 
  currentLocation = null,
  required = true,
  label = "موقع التوصيل"
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // استخدام GPS الهاتف مباشرة
  const getCurrentLocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('المتصفح لا يدعم تحديد الموقع');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        onLocationSelect({
          latitude,
          longitude,
          source: 'gps'
        });
        setLoading(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        if (err.code === 1) {
          setError('تم رفض إذن الموقع. يرجى السماح بالوصول للموقع من إعدادات المتصفح');
        } else if (err.code === 2) {
          setError('لا يمكن تحديد الموقع. تأكد من تفعيل GPS');
        } else {
          setError('انتهت مهلة تحديد الموقع. حاول مرة أخرى');
        }
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // فتح Google Maps لتحديد الموقع
  const openGoogleMaps = () => {
    // فتح Google Maps في نافذة جديدة
    // المستخدم يمكنه نسخ الإحداثيات من هناك
    const url = currentLocation 
      ? `https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`
      : 'https://www.google.com/maps';
    window.open(url, '_blank');
  };

  // معالجة لصق رابط Google Maps
  const handlePasteLink = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const coords = extractCoordsFromGoogleMapsLink(text);
      if (coords) {
        onLocationSelect({
          ...coords,
          source: 'google_maps_link'
        });
        setError(null);
      } else {
        setError('الرابط غير صالح. يرجى نسخ رابط من Google Maps');
      }
    } catch (err) {
      setError('لا يمكن قراءة الحافظة. يرجى لصق الرابط يدوياً');
    }
  };

  // استخراج الإحداثيات من رابط Google Maps
  const extractCoordsFromGoogleMapsLink = (text) => {
    // أنماط مختلفة لروابط Google Maps
    const patterns = [
      // https://www.google.com/maps?q=33.5138,36.2765
      /[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
      // https://www.google.com/maps/@33.5138,36.2765,15z
      /@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
      // https://maps.google.com/maps?ll=33.5138,36.2765
      /[?&]ll=(-?\d+\.?\d*),(-?\d+\.?\d*)/,
      // https://www.google.com/maps/place/.../@33.5138,36.2765
      /place\/[^@]*@(-?\d+\.?\d*),(-?\d+\.?\d*)/,
      // إحداثيات مباشرة: 33.5138,36.2765
      /^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/,
      // goo.gl short links with coordinates
      /(-?\d{1,3}\.\d+),\s*(-?\d{1,3}\.\d+)/
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        const latitude = parseFloat(match[1]);
        const longitude = parseFloat(match[2]);
        // التحقق من أن الإحداثيات منطقية
        if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
          return { latitude, longitude };
        }
      }
    }
    return null;
  };

  // إزالة الموقع
  const clearLocation = () => {
    onLocationSelect(null);
  };

  const isLocationSet = currentLocation && currentLocation.latitude && currentLocation.longitude;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      {/* حالة الموقع */}
      <div className={`p-3 rounded-xl border-2 ${
        isLocationSet 
          ? 'border-green-500 bg-green-50' 
          : 'border-gray-200 bg-gray-50'
      }`}>
        {isLocationSet ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                <Check size={20} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-green-700 text-sm">تم تحديد الموقع ✓</p>
                <p className="text-xs text-green-600">
                  {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={openGoogleMaps}
                className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                title="عرض على الخريطة"
              >
                <ExternalLink size={16} />
              </button>
              <button
                type="button"
                onClick={clearLocation}
                className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                title="إزالة الموقع"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-2">
            <MapPin size={32} className="text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">لم يتم تحديد الموقع بعد</p>
          </div>
        )}
      </div>

      {/* أزرار تحديد الموقع */}
      {!isLocationSet && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {/* زر GPS */}
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={loading}
              className="flex items-center justify-center gap-2 p-3 bg-blue-500 text-white rounded-xl font-bold text-sm hover:bg-blue-600 disabled:opacity-70 transition-all relative"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>جاري التحديد...</span>
                </>
              ) : (
                <>
                  <MapPin size={18} />
                  <span>موقعي الحالي</span>
                </>
              )}
            </button>

            {/* زر Google Maps */}
            <button
              type="button"
              onClick={handlePasteLink}
              className="flex items-center justify-center gap-2 p-3 bg-green-500 text-white rounded-xl font-bold text-sm hover:bg-green-600 transition-all"
            >
            <ExternalLink size={18} />
            <span>لصق من Maps</span>
          </button>
        </div>
        
        {/* رسالة انتظار GPS */}
        {loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3">
            <Loader2 size={20} className="animate-spin text-blue-500" />
            <div>
              <p className="text-sm font-bold text-blue-700">جاري تحديد موقعك...</p>
              <p className="text-xs text-blue-600">يرجى السماح بالوصول للموقع إذا طُلب منك</p>
            </div>
          </div>
        )}
      </div>
      )}

      {/* رسالة المساعدة */}
      {!isLocationSet && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700 font-bold mb-2">💡 كيفية تحديد الموقع:</p>
          <div className="text-xs text-blue-600 space-y-2">
            <div className="flex items-start gap-2">
              <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">1</span>
              <span>اضغط <strong>"موقعي الحالي"</strong> للتحديد التلقائي</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="bg-blue-200 text-blue-800 rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">2</span>
              <div>
                <span>أو افتح Google Maps:</span>
                <ul className="mt-1 mr-2 space-y-0.5 text-[10px] text-blue-500">
                  <li>• حدد موقعك على الخريطة</li>
                  <li>• انسخ الرابط من شريط العنوان</li>
                  <li>• اضغط <strong>"لصق من Maps"</strong></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* رسالة الخطأ */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm font-bold text-red-700 mb-1">⚠️ تعذر تحديد الموقع</p>
          <p className="text-xs text-red-600">{error}</p>
          <p className="text-xs text-gray-600 mt-2">
            💡 جرّب استخدام زر "لصق من Maps" بدلاً من ذلك
          </p>
        </div>
      )}
    </div>
  );
};

export default GoogleMapsLocationPicker;
