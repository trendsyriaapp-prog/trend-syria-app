/**
 * مكون إعدادات توفير البيانات
 * يُعرض في صفحة الإعدادات للتحكم في جودة الصور والفيديو
 */

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Zap, Image, Video, Sparkles, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { 
  getDataSaverSettings, 
  saveDataSaverSettings, 
  estimateConnectionQuality,
  getConnectionInfo,
  QUALITY_SETTINGS 
} from '../lib/dataSaver';

const DataSaverSettings = ({ onClose }) => {
  const [settings, setSettings] = useState(getDataSaverSettings());
  const [connectionQuality, setConnectionQuality] = useState(estimateConnectionQuality());
  const [connectionInfo, setConnectionInfo] = useState(getConnectionInfo());
  const [showAdvanced, setShowAdvanced] = useState(false);

  // تحديث معلومات الاتصال
  useEffect(() => {
    const updateConnection = () => {
      setConnectionQuality(estimateConnectionQuality());
      setConnectionInfo(getConnectionInfo());
    };

    updateConnection();
    
    // الاستماع لتغييرات الاتصال
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      connection.addEventListener('change', updateConnection);
      return () => connection.removeEventListener('change', updateConnection);
    }
  }, []);

  // حفظ الإعدادات
  const handleSave = (newSettings) => {
    const saved = saveDataSaverSettings(newSettings);
    setSettings(saved);
  };

  // تفعيل/تعطيل وضع التوفير
  const toggleEnabled = () => {
    handleSave({ enabled: !settings.enabled });
  };

  // تغيير جودة الصور
  const setImageQuality = (quality) => {
    handleSave({ imageQuality: quality });
  };

  // تحديد لون جودة الاتصال
  const getQualityColor = (color) => {
    switch (color) {
      case 'red': return 'text-red-500 bg-red-100';
      case 'yellow': return 'text-yellow-600 bg-yellow-100';
      case 'green': return 'text-green-500 bg-green-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-md mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6" />
          <div>
            <h2 className="font-bold text-lg">توفير البيانات</h2>
            <p className="text-xs opacity-80">تحكم في استهلاك الإنترنت</p>
          </div>
        </div>
      </div>

      {/* معلومات الاتصال */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium">جودة الاتصال</span>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${getQualityColor(connectionQuality.color)}`}>
            {connectionQuality.label}
          </div>
        </div>
        {connectionInfo.effectiveType !== 'unknown' && (
          <p className="text-xs text-gray-500 mt-1 mr-7">
            نوع الشبكة: {connectionInfo.effectiveType.toUpperCase()}
            {connectionInfo.downlink && ` • ${connectionInfo.downlink} Mbps`}
          </p>
        )}
      </div>

      {/* التفعيل الرئيسي */}
      <div className="p-4 border-b">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={toggleEnabled}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              settings.enabled ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              {settings.enabled ? (
                <Zap className="w-5 h-5 text-green-600" />
              ) : (
                <WifiOff className="w-5 h-5 text-gray-400" />
              )}
            </div>
            <div>
              <p className="font-medium text-sm">وضع توفير البيانات</p>
              <p className="text-xs text-gray-500">
                {settings.enabled ? 'مفعّل - جودة أقل = تحميل أسرع' : 'معطّل - جودة كاملة'}
              </p>
            </div>
          </div>
          <div className={`w-12 h-7 rounded-full p-1 transition-colors ${
            settings.enabled ? 'bg-green-500' : 'bg-gray-300'
          }`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
              settings.enabled ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </div>
        </div>
      </div>

      {/* إعدادات الجودة */}
      {settings.enabled && (
        <div className="p-4 space-y-4">
          {/* جودة الصور */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Image className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">جودة الصور</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {['auto', 'low', 'medium', 'high'].map((quality) => (
                <button
                  key={quality}
                  onClick={() => setImageQuality(quality)}
                  className={`p-2 rounded-lg text-xs font-medium transition-all ${
                    settings.imageQuality === quality
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {quality === 'auto' && 'تلقائي'}
                  {quality === 'low' && 'منخفضة'}
                  {quality === 'medium' && 'متوسطة'}
                  {quality === 'high' && 'عالية'}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {QUALITY_SETTINGS[settings.imageQuality]?.description}
            </p>
          </div>

          {/* الإعدادات المتقدمة */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between py-2 text-sm text-gray-600"
          >
            <span>إعدادات متقدمة</span>
            {showAdvanced ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showAdvanced && (
            <div className="space-y-3 pt-2 border-t">
              {/* تحميل الفيديو */}
              <label className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">تحميل الفيديو تلقائياً</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.loadVideos}
                  onChange={(e) => handleSave({ loadVideos: e.target.checked })}
                  className="w-5 h-5 rounded text-blue-500"
                />
              </label>

              {/* الأنيميشن */}
              <label className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">تشغيل الحركات</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.loadAnimations}
                  onChange={(e) => handleSave({ loadAnimations: e.target.checked })}
                  className="w-5 h-5 rounded text-blue-500"
                />
              </label>

              {/* تحميل الصور مسبقاً */}
              <label className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Image className="w-4 h-4 text-gray-500" />
                  <span className="text-sm">تحميل الصور مسبقاً</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings.preloadImages}
                  onChange={(e) => handleSave({ preloadImages: e.target.checked })}
                  className="w-5 h-5 rounded text-blue-500"
                />
              </label>
            </div>
          )}
        </div>
      )}

      {/* نصيحة */}
      <div className="p-4 bg-blue-50 border-t">
        <div className="flex gap-2">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            {settings.enabled 
              ? 'وضع التوفير مفعّل. الصور ستُحمّل بجودة أقل لتوفير البيانات وتسريع التحميل.'
              : 'فعّل وضع التوفير إذا كان الإنترنت لديك بطيئاً للحصول على تجربة أسرع.'}
          </p>
        </div>
      </div>

      {/* زر الإغلاق */}
      {onClose && (
        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
          >
            إغلاق
          </button>
        </div>
      )}
    </div>
  );
};

export default DataSaverSettings;
