/**
 * تبويب إدارة المناطق المسموحة
 * =============================
 * 
 * هذا التبويب مؤقت ويمكن إزالته بعد التوسع
 * يُستخدم للتحكم في المناطق الجغرافية المسموح لها بالوصول للتطبيق
 */

import { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, Save, Loader2, ToggleLeft, ToggleRight, Edit3, X, Check, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const AllowedRegionsTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    enabled: true,
    cities: [],
    blocked_message: ''
  });
  
  // حالات الإضافة
  const [newCityName, setNewCityName] = useState('');
  const [newRegionInputs, setNewRegionInputs] = useState({});
  const [editingMessage, setEditingMessage] = useState(false);
  const [tempMessage, setTempMessage] = useState('');

  // جلب الإعدادات
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/api/settings/allowed-regions/admin`);
      setSettings(response.data);
      setTempMessage(response.data.blocked_message || '');
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في جلب الإعدادات',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // تفعيل/تعطيل النظام
  const toggleSystem = async () => {
    try {
      setSaving(true);
      await axios.put(`${API}/api/settings/allowed-regions/toggle?enabled=${!settings.enabled}`, {});
      setSettings(prev => ({ ...prev, enabled: !prev.enabled }));
      toast({
        title: 'تم',
        description: `تم ${!settings.enabled ? 'تفعيل' : 'تعطيل'} نظام التقييد الجغرافي`
      });
    } catch (error) {
      console.error('Error toggling system:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في تغيير حالة النظام',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // إضافة محافظة جديدة
  const addCity = async () => {
    if (!newCityName.trim()) return;
    
    try {
      setSaving(true);
      const response = await axios.post(
        `${API}/api/settings/allowed-regions/add-city?city_name=${encodeURIComponent(newCityName.trim())}`,
        {}
      );
      setSettings(prev => ({ ...prev, cities: response.data.cities }));
      setNewCityName('');
      toast({
        title: 'تم',
        description: `تم إضافة محافظة ${newCityName}`
      });
    } catch (error) {
      console.error('Error adding city:', error);
      toast({
        title: 'خطأ',
        description: error.response?.data?.detail || 'فشل في إضافة المحافظة',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // إزالة محافظة
  const removeCity = async (cityName) => {
    if (!confirm(`هل أنت متأكد من إزالة محافظة ${cityName}؟`)) return;
    
    try {
      setSaving(true);
      const response = await axios.delete(
        `${API}/api/settings/allowed-regions/remove-city/${encodeURIComponent(cityName)}`
      );
      setSettings(prev => ({ ...prev, cities: response.data.cities }));
      toast({
        title: 'تم',
        description: `تم إزالة محافظة ${cityName}`
      });
    } catch (error) {
      console.error('Error removing city:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إزالة المحافظة',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // إضافة منطقة لمحافظة
  const addRegion = async (cityName) => {
    const regionName = newRegionInputs[cityName]?.trim();
    if (!regionName) return;
    
    try {
      setSaving(true);
      const response = await axios.post(
        `${API}/api/settings/allowed-regions/add-region?city_name=${encodeURIComponent(cityName)}&region_name=${encodeURIComponent(regionName)}`,
        {}
      );
      setSettings(prev => ({ ...prev, cities: response.data.cities }));
      setNewRegionInputs(prev => ({ ...prev, [cityName]: '' }));
      toast({
        title: 'تم',
        description: `تم إضافة منطقة ${regionName}`
      });
    } catch (error) {
      console.error('Error adding region:', error);
      toast({
        title: 'خطأ',
        description: error.response?.data?.detail || 'فشل في إضافة المنطقة',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // إزالة منطقة
  const removeRegion = async (cityName, regionName) => {
    try {
      setSaving(true);
      const response = await axios.delete(
        `${API}/api/settings/allowed-regions/remove-region?city_name=${encodeURIComponent(cityName)}&region_name=${encodeURIComponent(regionName)}`
      );
      setSettings(prev => ({ ...prev, cities: response.data.cities }));
      toast({
        title: 'تم',
        description: `تم إزالة منطقة ${regionName}`
      });
    } catch (error) {
      console.error('Error removing region:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في إزالة المنطقة',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  // حفظ رسالة الحظر
  const saveBlockedMessage = async () => {
    try {
      setSaving(true);
      await axios.put(
        `${API}/api/settings/allowed-regions`,
        { ...settings, blocked_message: tempMessage }
      );
      setSettings(prev => ({ ...prev, blocked_message: tempMessage }));
      setEditingMessage(false);
      toast({
        title: 'تم',
        description: 'تم حفظ الرسالة'
      });
    } catch (error) {
      console.error('Error saving message:', error);
      toast({
        title: 'خطأ',
        description: 'فشل في حفظ الرسالة',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="allowed-regions-tab">
      {/* العنوان وزر التفعيل */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B00] to-[#FF8533] rounded-xl flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">التقييد الجغرافي</h2>
              <p className="text-sm text-gray-500">تحديد المناطق المسموح لها باستخدام التطبيق</p>
            </div>
          </div>
          
          <button
            onClick={toggleSystem}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              settings.enabled 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            data-testid="toggle-system-button"
          >
            {settings.enabled ? (
              <>
                <ToggleRight className="w-5 h-5" />
                مفعّل
              </>
            ) : (
              <>
                <ToggleLeft className="w-5 h-5" />
                معطّل
              </>
            )}
          </button>
        </div>

        {/* تحذير إذا كان النظام معطل */}
        {!settings.enabled && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm">النظام معطّل حالياً - جميع المناطق مسموحة</span>
          </div>
        )}
      </div>

      {/* رسالة الحظر */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">رسالة المناطق غير المتاحة</h3>
          {!editingMessage ? (
            <button
              onClick={() => setEditingMessage(true)}
              className="text-[#FF6B00] hover:text-[#e55f00] text-sm flex items-center gap-1"
            >
              <Edit3 className="w-4 h-4" />
              تعديل
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={saveBlockedMessage}
                disabled={saving}
                className="text-green-600 hover:text-green-700"
              >
                <Check className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setEditingMessage(false);
                  setTempMessage(settings.blocked_message);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
        
        {editingMessage ? (
          <textarea
            value={tempMessage}
            onChange={(e) => setTempMessage(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none"
            rows={3}
            placeholder="أدخل الرسالة التي ستظهر للعملاء في المناطق غير المتاحة..."
          />
        ) : (
          <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">
            {settings.blocked_message || 'لم يتم تحديد رسالة'}
          </p>
        )}
      </div>

      {/* إضافة محافظة جديدة */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-semibold text-gray-800 mb-4">إضافة محافظة جديدة</h3>
        <div className="flex gap-3">
          <input
            type="text"
            value={newCityName}
            onChange={(e) => setNewCityName(e.target.value)}
            placeholder="اسم المحافظة (مثل: دمشق)"
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm"
            onKeyPress={(e) => e.key === 'Enter' && addCity()}
            data-testid="new-city-input"
          />
          <button
            onClick={addCity}
            disabled={saving || !newCityName.trim()}
            className="px-4 py-2 bg-[#FF6B00] text-white rounded-lg hover:bg-[#e55f00] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            data-testid="add-city-button"
          >
            <Plus className="w-4 h-4" />
            إضافة
          </button>
        </div>
      </div>

      {/* قائمة المحافظات والمناطق */}
      <div className="space-y-4">
        {settings.cities.length === 0 ? (
          <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 text-center">
            <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">لا توجد محافظات مضافة</p>
            <p className="text-sm text-gray-400 mt-1">أضف محافظة للبدء</p>
          </div>
        ) : (
          settings.cities.map((city) => (
            <div 
              key={city.name} 
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
              data-testid={`city-card-${city.name}`}
            >
              {/* اسم المحافظة */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-800">{city.name}</h4>
                    <span className="text-xs text-gray-500">{city.regions.length} منطقة</span>
                  </div>
                </div>
                <button
                  onClick={() => removeCity(city.name)}
                  disabled={saving}
                  className="text-red-500 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                  data-testid={`remove-city-${city.name}`}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* إضافة منطقة */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newRegionInputs[city.name] || ''}
                  onChange={(e) => setNewRegionInputs(prev => ({ ...prev, [city.name]: e.target.value }))}
                  placeholder="اسم المنطقة أو الحي"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && addRegion(city.name)}
                  data-testid={`new-region-input-${city.name}`}
                />
                <button
                  onClick={() => addRegion(city.name)}
                  disabled={saving || !newRegionInputs[city.name]?.trim()}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  data-testid={`add-region-button-${city.name}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* قائمة المناطق */}
              <div className="flex flex-wrap gap-2">
                {city.regions.map((region) => (
                  <div
                    key={region}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 rounded-full text-sm group hover:bg-red-50 transition-colors"
                    data-testid={`region-tag-${region}`}
                  >
                    <span className="text-gray-700 group-hover:text-red-600">{region}</span>
                    <button
                      onClick={() => removeRegion(city.name, region)}
                      disabled={saving}
                      className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ملاحظة الإزالة */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <h4 className="font-semibold text-blue-800 mb-2">كيفية إزالة هذا النظام بعد التوسع:</h4>
        <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
          <li>يمكنك تعطيل النظام من الزر أعلاه (الطريقة الأسهل)</li>
          <li>أو احذف ملف <code className="bg-blue-100 px-1 rounded">CityRestrictionGate.js</code> من الواجهة</li>
          <li>واحذف استيراده واستخدامه من <code className="bg-blue-100 px-1 rounded">App.js</code></li>
        </ol>
      </div>
    </div>
  );
};

export default AllowedRegionsTab;
