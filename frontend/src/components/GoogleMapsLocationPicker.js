import { useState } from 'react';
import { MapPin, Check, X, Loader2, Settings, MapPinOff, ExternalLink } from 'lucide-react';

/**
 * مكون لاختيار الموقع من Google Maps
 * يسمح للمستخدم بمشاركة موقعه أو فتح Google Maps لتحديد الموقع
 * 
 * @param {string} warningMessage - رسالة التنبيه (اختياري - للبائعين فقط)
 */
const GoogleMapsLocationPicker = ({ 
  onLocationSelect, 
  currentLocation = null,
  required = true,
  label = "موقع التوصيل",
  warningMessage = null  // رسالة تنبيه مخصصة (null = لا تنبيه)
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [showGPSModal, setShowGPSModal] = useState(false);

  // فتح إعدادات الموقع في الهاتف
  const openLocationSettings = () => {
    // للتطبيقات المحلية عبر Capacitor
    if (window.Capacitor?.isNativePlatform()) {
      try {
        if (window.Capacitor.Plugins?.App) {
          window.Capacitor.Plugins.App.openUrl({ url: 'app-settings:location' });
        }
      } catch (e) {
        // fallback للويب
        alert('يرجى فتح إعدادات الهاتف يدوياً وتفعيل خدمة الموقع (GPS)');
      }
    } else {
      // للويب - إظهار تعليمات
      alert('يرجى تفعيل خدمة الموقع من إعدادات المتصفح أو الهاتف');
    }
    setShowLocationPrompt(false);
    setShowGPSModal(false);
  };

  // إغلاق نافذة GPS
  const closeGPSModal = () => {
    setShowGPSModal(false);
    setError(null);
  };

  // استخدام GPS الهاتف مباشرة
  const getCurrentLocation = () => {
    setLoading(true);
    setError(null);
    setShowLocationPrompt(false);

    if (!navigator.geolocation) {
      setError('المتصفح لا يدعم تحديد الموقع');
      setShowLocationPrompt(true);
      setLoading(false);
      return;
    }

    // إعداد timeout يدوي للتأكد من الاستجابة
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError('خدمة الموقع (GPS) غير مفعّلة أو بطيئة. يرجى تفعيل GPS والانتظار.');
      setShowLocationPrompt(true);
      setShowGPSModal(true);
    }, 35000);  // 35 ثانية

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        const { latitude, longitude, accuracy } = position.coords;
        onLocationSelect({
          latitude,
          longitude,
          accuracy: Math.round(accuracy), // دقة الموقع بالمتر
          source: 'gps'
        });
        setLoading(false);
        setError(null);
        setShowLocationPrompt(false);
        setShowGPSModal(false);
      },
      (err) => {
        clearTimeout(timeoutId);
        console.error('Geolocation error:', err);
        setLoading(false);
        
        if (err.code === 1) {
          setError('تم رفض إذن الموقع. يرجى السماح من إعدادات الهاتف.');
          setShowLocationPrompt(true);
          setShowGPSModal(true);
        } else if (err.code === 2) {
          setError('خدمة الموقع (GPS) غير مفعّلة. يرجى تفعيلها من الإعدادات.');
          setShowLocationPrompt(true);
          setShowGPSModal(true);
        } else if (err.code === 3) {
          setError('انتهت المهلة. تأكد من تفعيل GPS وحاول مرة أخرى.');
          setShowLocationPrompt(true);
          setShowGPSModal(true);
        } else {
          setError('حدث خطأ في تحديد الموقع. حاول مرة أخرى.');
          setShowLocationPrompt(true);
          setShowGPSModal(true);
        }
      },
      {
        enableHighAccuracy: false, // موقع تقريبي أولاً - أسرع بكثير!
        timeout: 30000,            // 30 ثانية - وقت كافي
        maximumAge: 60000          // يستخدم cache لمدة دقيقة - أسرع!
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
                <p className="font-bold text-green-700 text-sm">تم تحديد الموقع بدقة ✓</p>
                <p className="text-xs text-green-600">
                  {currentLocation.latitude.toFixed(6)}, {currentLocation.longitude.toFixed(6)}
                </p>
                {currentLocation.accuracy && (
                  <p className="text-[10px] text-green-500 mt-0.5">
                    📍 دقة: ±{currentLocation.accuracy} متر
                  </p>
                )}
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
        <div className="space-y-3">
          {/* تنبيه مخصص (يظهر فقط إذا تم تمرير رسالة) */}
          {warningMessage && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-sm font-bold text-amber-800">تنبيه مهم!</p>
                <p className="text-xs text-amber-700 mt-1">{warningMessage}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-2">
            {/* زر GPS */}
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={loading}
              className="flex items-center justify-center gap-2 p-4 bg-blue-500 text-white rounded-xl font-bold text-sm hover:bg-blue-600 disabled:opacity-70 transition-all relative"
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
      {!isLocationSet && !loading && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-600">
            💡 تأكد أنك في موقع المتجر، ثم اضغط <strong>"موقعي الحالي"</strong>
          </p>
        </div>
      )}

      {/* رسالة الخطأ مع زر فتح الإعدادات */}
      {error && !showGPSModal && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm font-bold text-red-700 mb-1">⚠️ تعذر تحديد الموقع</p>
          <p className="text-xs text-red-600">{error}</p>
          
          {showLocationPrompt && (
            <button
              type="button"
              onClick={() => setShowGPSModal(true)}
              className="mt-3 w-full flex items-center justify-center gap-2 p-2 bg-orange-500 text-white rounded-lg font-bold text-sm hover:bg-orange-600 transition-all"
            >
              <Settings size={16} />
              <span>فتح إعدادات الموقع</span>
            </button>
          )}
        </div>
      )}

      {/* نافذة عائمة لتفعيل GPS */}
      {showGPSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* رأس النافذة */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPinOff size={40} className="text-white" />
              </div>
              <h3 className="text-xl font-bold text-white">
                خدمة الموقع غير مفعّلة
              </h3>
            </div>
            
            {/* محتوى النافذة */}
            <div className="p-6 text-center">
              <p className="text-gray-600 mb-6 leading-relaxed">
                يرجى تفعيل خدمة الموقع (GPS) من إعدادات الهاتف لتتمكن من تحديد موقع متجرك تلقائياً
              </p>
              
              {/* زر فتح الإعدادات */}
              <button
                type="button"
                onClick={openLocationSettings}
                className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-bold text-base hover:from-orange-600 hover:to-red-600 transition-all shadow-lg mb-3"
              >
                <Settings size={22} />
                <span>فتح إعدادات الموقع</span>
              </button>
              
              {/* زر الإلغاء */}
              <button
                type="button"
                onClick={closeGPSModal}
                className="w-full p-3 text-gray-500 font-medium hover:text-gray-700 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleMapsLocationPicker;
