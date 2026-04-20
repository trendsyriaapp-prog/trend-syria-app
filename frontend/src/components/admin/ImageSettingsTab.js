// /app/frontend/src/components/admin/ImageSettingsTab.js
// إعدادات صور المنتجات - لوحة المدير

import { useState, useEffect } from 'react';
import logger from '../../lib/logger';
import axios from 'axios';
import { 
  Image, Settings, Save, Loader2, Camera, 
  Utensils, Package, BarChart3, RefreshCw,
  CheckCircle, AlertCircle, Info, CreditCard, ExternalLink
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const ImageSettingsTab = ({ token }) => {
  const [settings, setSettings] = useState({
    max_images_per_product: 3,
    enable_pro_processing: true,
    enable_food_enhancement: true
  });
  const [usage, setUsage] = useState(null);
  const [photoRoomCredits, setPhotoRoomCredits] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetchSettings();
    fetchPhotoRoomCredits();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/settings/images`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings({
        max_images_per_product: res.data.max_images_per_product || 3,
        enable_pro_processing: res.data.enable_pro_processing ?? true,
        enable_food_enhancement: res.data.enable_food_enhancement ?? true
      });
      setUsage(res.data.usage);
    } catch (error) {
      logger.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPhotoRoomCredits = async () => {
    try {
      const res = await axios.get(`${API}/api/image/photoroom-credits`);
      setPhotoRoomCredits(res.data);
    } catch (error) {
      logger.error('Error fetching PhotoRoom credits:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      await axios.post(`${API}/api/settings/images`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ type: 'success', text: 'تم حفظ الإعدادات بنجاح' });
    } catch (error) {
      setMessage({ type: 'error', text: 'فشل حفظ الإعدادات' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="image-settings-tab">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#FF6B00] to-orange-500 rounded-lg flex items-center justify-center">
            <Camera className="text-white" size={20} />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">إعدادات صور المنتجات</h2>
            <p className="text-xs text-gray-500">التحكم في معالجة الصور وحدودها</p>
          </div>
        </div>
        <button
          onClick={fetchSettings}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="تحديث"
        >
          <RefreshCw size={18} className="text-gray-600" />
        </button>
      </div>

      {/* إحصائيات الاستخدام */}
      {usage && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={18} className="text-blue-600" />
            <h3 className="font-bold text-blue-900">إحصائيات هذا الشهر</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{usage.pro_images_used || 0}</p>
              <p className="text-xs text-gray-600">صور احترافية</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{usage.food_images_used || 0}</p>
              <p className="text-xs text-gray-600">صور طعام</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-purple-600">{usage.remaining_pro_images || 50}</p>
              <p className="text-xs text-gray-600">متبقي (Pro)</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-orange-600">{usage.days_until_reset || 0}</p>
              <p className="text-xs text-gray-600">يوم للتجديد</p>
            </div>
          </div>
          
          {/* شريط التقدم */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>استخدام Remove.bg</span>
              <span>{usage.pro_images_used || 0}/50</span>
            </div>
            <div className="h-2 bg-white rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  (usage.pro_images_used || 0) > 40 ? 'bg-red-500' :
                  (usage.pro_images_used || 0) > 25 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, ((usage.pro_images_used || 0) / 50) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* رصيد PhotoRoom */}
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CreditCard size={18} className="text-purple-600" />
            <h3 className="font-bold text-purple-900">رصيد PhotoRoom</h3>
          </div>
          <button
            onClick={fetchPhotoRoomCredits}
            className="p-1 hover:bg-purple-100 rounded transition-colors"
            title="تحديث"
          >
            <RefreshCw size={14} className="text-purple-600" />
          </button>
        </div>
        
        {photoRoomCredits ? (
          photoRoomCredits.success ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className={`text-2xl font-bold ${
                    photoRoomCredits.credits_available > 50 ? 'text-green-600' :
                    photoRoomCredits.credits_available > 10 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {photoRoomCredits.credits_available || 0}
                  </p>
                  <p className="text-xs text-gray-600">صور متاحة</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{photoRoomCredits.credits_used || 0}</p>
                  <p className="text-xs text-gray-600">صور مستخدمة</p>
                </div>
                <div className="bg-white rounded-lg p-3 text-center">
                  <p className={`text-2xl font-bold ${photoRoomCredits.subscription_active ? 'text-green-600' : 'text-red-600'}`}>
                    {photoRoomCredits.subscription_active ? 'نشط' : 'غير نشط'}
                  </p>
                  <p className="text-xs text-gray-600">الاشتراك</p>
                </div>
              </div>
              
              {photoRoomCredits.credits_available < 20 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle size={16} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-yellow-800 font-medium">الرصيد منخفض!</p>
                    <p className="text-xs text-yellow-700">يُنصح بشحن الرصيد للاستمرار بجودة عالية.</p>
                  </div>
                </div>
              )}
              
              <a
                href="https://www.photoroom.com/api/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                <CreditCard size={16} />
                شحن الرصيد
                <ExternalLink size={14} />
              </a>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-red-800 font-medium">لا يوجد رصيد</p>
                  <p className="text-xs text-red-700 mb-2">{photoRoomCredits.error || 'لم يتم ربط حساب PhotoRoom'}</p>
                  <p className="text-xs text-gray-600">التطبيق يستخدم حالياً البديل المجاني (rembg)</p>
                </div>
              </div>
              <a
                href="https://www.photoroom.com/api/pricing"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full mt-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                <CreditCard size={16} />
                إنشاء حساب وشحن
                <ExternalLink size={14} />
              </a>
            </div>
          )
        ) : (
          <div className="flex items-center justify-center py-4">
            <Loader2 size={20} className="animate-spin text-purple-600" />
          </div>
        )}
      </div>

      {/* الإعدادات */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* حد الصور */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Image size={20} className="text-purple-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-gray-900">الحد الأقصى للصور</h3>
              <p className="text-xs text-gray-500 mb-3">عدد الصور المسموح لكل منتج</p>
              
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={settings.max_images_per_product}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    max_images_per_product: parseInt(e.target.value)
                  }))}
                  className="flex-1 accent-purple-600"
                />
                <div className="w-12 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="font-bold text-purple-700">{settings.max_images_per_product}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                <Info size={12} />
                <span>القيمة الحالية: {settings.max_images_per_product} صور لكل منتج</span>
              </div>
            </div>
          </div>
        </div>

        {/* المعالجة الاحترافية */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Package size={20} className="text-orange-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">المعالجة الاحترافية (المنتجات)</h3>
                  <p className="text-xs text-gray-500">إزالة الخلفية + تحسين الصورة للمنتجات العادية</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enable_pro_processing}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      enable_pro_processing: e.target.checked
                    }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>
              
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Remove.bg</span>
                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">تصحيح ألوان</span>
                <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">توسيط ذكي</span>
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">ظل</span>
              </div>
            </div>
          </div>
        </div>

        {/* معالجة الطعام */}
        <div className="p-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Utensils size={20} className="text-green-600" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900">تحسين صور الطعام</h3>
                  <p className="text-xs text-gray-500">تحسين الألوان بدون إزالة الخلفية (مجاني)</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enable_food_enhancement}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      enable_food_enhancement: e.target.checked
                    }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
              
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">زيادة التشبع</span>
                <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">إضاءة أفضل</span>
                <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full">ألوان دافئة</span>
                <span className="text-[10px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">مجاني ♾️</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ملاحظة */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-bold mb-1">ملاحظة مهمة:</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li><strong>المنتجات العادية:</strong> تستخدم Remove.bg (50 صورة مجانية/شهر)</li>
              <li><strong>صور الطعام:</strong> معالجة محلية مجانية بدون حد</li>
              <li>عند انتهاء الحد، تستخدم المعالجة المحلية تلقائياً</li>
            </ul>
          </div>
        </div>
      </div>

      {/* رسالة النجاح/الخطأ */}
      {message && (
        <div className={`p-3 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-700' 
            : 'bg-red-100 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {/* زر الحفظ */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-gradient-to-r from-[#FF6B00] to-orange-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
      >
        {saving ? (
          <>
            <Loader2 className="animate-spin" size={18} />
            جاري الحفظ...
          </>
        ) : (
          <>
            <Save size={18} />
            حفظ الإعدادات
          </>
        )}
      </button>
    </div>
  );
};

export default ImageSettingsTab;
