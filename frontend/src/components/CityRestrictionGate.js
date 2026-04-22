/**
 * نظام التقييد الجغرافي المؤقت
 * ==============================
 * 
 * هذا المكون مؤقت ويمكن إزالته بسهولة بعد التوسع (1-2 شهر)
 * 
 * كيفية الإزالة:
 * 1. احذف هذا الملف
 * 2. في App.js، احذف: import CityRestrictionGate from "./components/CityRestrictionGate"
 * 3. في App.js، احذف: <CityRestrictionGate> و </CityRestrictionGate>
 * 4. في لوحة الإدارة، يمكنك تعطيل النظام بدلاً من الحذف
 * 
 * ملاحظة مهمة: هذا النظام منفصل تماماً عن نظام العناوين والتوصيل
 * لا يتداخل مع الـ Checkout أو عناوين التوصيل المحفوظة
 */

import { useState, useEffect } from 'react';
import { MapPin, ChevronDown, Loader2, Rocket } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const CityRestrictionGate = ({ children }) => {
  // حالات المكون
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [isAllowed, setIsAllowed] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [checking, setChecking] = useState(false);

  // جلب الإعدادات من السيرفر
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(`${API_URL}/api/settings/allowed-regions`);
        const data = await response.json();
        setSettings(data);
        
        // إذا كان النظام معطل، السماح بالدخول مباشرة
        if (!data.enabled) {
          setIsAllowed(true);
        }
      } catch (error) {
        console.error('Error fetching region settings:', error);
        // في حالة الخطأ، السماح بالدخول (لا نريد حظر المستخدمين بسبب خطأ تقني)
        setIsAllowed(true);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  // الحصول على المناطق للمحافظة المختارة
  const getRegionsForCity = () => {
    if (!selectedCity || !settings?.cities) return [];
    const city = settings.cities.find(c => c.name === selectedCity);
    return city?.regions || [];
  };

  // التحقق من الاختيار
  const handleCheckAccess = () => {
    if (!selectedCity || !selectedRegion) return;

    setChecking(true);

    // التحقق من أن المنطقة مسموحة
    const city = settings.cities.find(c => c.name === selectedCity);
    const regionAllowed = city && city.regions.includes(selectedRegion);

    setTimeout(() => {
      setChecking(false);
      if (regionAllowed) {
        setIsAllowed(true);
      }
      // إذا لم تكن مسموحة، سيبقى على نفس الشاشة مع رسالة الحظر
    }, 500);
  };

  // إعادة تعيين الاختيار
  const handleReset = () => {
    setSelectedCity('');
    setSelectedRegion('');
  };

  // شاشة التحميل
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#FF6B00] mx-auto mb-4" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // إذا كان مسموحاً أو النظام معطل، عرض التطبيق
  if (isAllowed || !settings?.enabled) {
    return children;
  }

  // التحقق إذا كان الاختيار غير مسموح
  const isSelectionBlocked = selectedCity && selectedRegion && !checking && (() => {
    const city = settings.cities.find(c => c.name === selectedCity);
    return !city || !city.regions.includes(selectedRegion);
  })();

  // شاشة اختيار المنطقة
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* الشعار */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#FF6B00] to-[#FF8533] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200">
            <MapPin className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">ترند سوريا</h1>
          <p className="text-gray-500">اختر موقعك للمتابعة</p>
        </div>

        {/* بطاقة الاختيار */}
        <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-6" data-testid="city-restriction-card">
          
          {/* عنوان */}
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-gray-800">أين تتواجد؟</h2>
            <p className="text-sm text-gray-500 mt-1">حدد محافظتك ومنطقتك</p>
          </div>

          {/* اختيار المحافظة */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              المحافظة
            </label>
            <div className="relative">
              <button
                onClick={() => {
                  setShowCityDropdown(!showCityDropdown);
                  setShowRegionDropdown(false);
                }}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-right flex items-center justify-between hover:bg-gray-100 transition-colors"
                data-testid="city-selector"
              >
                <span className={selectedCity ? 'text-gray-800' : 'text-gray-400'}>
                  {selectedCity || 'اختر المحافظة'}
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showCityDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* قائمة المحافظات */}
              {showCityDropdown && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {settings.cities.map((city) => (
                    <button
                      key={city.name}
                      onClick={() => {
                        setSelectedCity(city.name);
                        setSelectedRegion('');
                        setShowCityDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-right hover:bg-orange-50 transition-colors ${
                        selectedCity === city.name ? 'bg-orange-100 text-[#FF6B00]' : 'text-gray-700'
                      }`}
                      data-testid={`city-option-${city.name}`}
                    >
                      {city.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* اختيار المنطقة */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              المنطقة / الحي
            </label>
            <div className="relative">
              <button
                onClick={() => {
                  if (selectedCity) {
                    setShowRegionDropdown(!showRegionDropdown);
                    setShowCityDropdown(false);
                  }
                }}
                disabled={!selectedCity}
                className={`w-full border rounded-xl px-4 py-3 text-right flex items-center justify-between transition-colors ${
                  selectedCity 
                    ? 'bg-gray-50 border-gray-200 hover:bg-gray-100' 
                    : 'bg-gray-100 border-gray-100 cursor-not-allowed'
                }`}
                data-testid="region-selector"
              >
                <span className={selectedRegion ? 'text-gray-800' : 'text-gray-400'}>
                  {selectedRegion || (selectedCity ? 'اختر المنطقة' : 'اختر المحافظة أولاً')}
                </span>
                <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${showRegionDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* قائمة المناطق */}
              {showRegionDropdown && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {getRegionsForCity().map((region) => (
                    <button
                      key={region}
                      onClick={() => {
                        setSelectedRegion(region);
                        setShowRegionDropdown(false);
                      }}
                      className={`w-full px-4 py-3 text-right hover:bg-orange-50 transition-colors ${
                        selectedRegion === region ? 'bg-orange-100 text-[#FF6B00]' : 'text-gray-700'
                      }`}
                      data-testid={`region-option-${region}`}
                    >
                      {region}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* رسالة الحظر */}
          {isSelectionBlocked && (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100" data-testid="blocked-message">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Rocket className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-800 mb-1">قريباً في منطقتك!</h3>
                  <p className="text-sm text-blue-700 leading-relaxed">
                    {settings.blocked_message}
                  </p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="mt-4 w-full py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                اختر منطقة أخرى
              </button>
            </div>
          )}

          {/* زر المتابعة */}
          {!isSelectionBlocked && (
            <button
              onClick={handleCheckAccess}
              disabled={!selectedCity || !selectedRegion || checking}
              className={`w-full py-4 rounded-xl font-semibold text-white transition-all ${
                selectedCity && selectedRegion && !checking
                  ? 'bg-gradient-to-r from-[#FF6B00] to-[#FF8533] hover:shadow-lg hover:shadow-orange-200 active:scale-[0.98]'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
              data-testid="continue-button"
            >
              {checking ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري التحقق...
                </span>
              ) : (
                'متابعة'
              )}
            </button>
          )}
        </div>

        {/* نص أسفل */}
        <p className="text-center text-xs text-gray-400 mt-6">
          نحن نتوسع باستمرار لتغطية المزيد من المناطق
        </p>
      </div>
    </div>
  );
};

export default CityRestrictionGate;
