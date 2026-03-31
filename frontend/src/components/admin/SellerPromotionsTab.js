// /app/frontend/src/components/admin/SellerPromotionsTab.js
// إدارة فلاش البائعين

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Zap, Clock, DollarSign, Settings, Trash2, Loader2, CheckCircle, XCircle, TrendingUp, Package } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const SellerPromotionsTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    cost_per_product: 1000,
    duration_hours: 24,
    max_products_per_day: 5,
    enabled: true,
    flash_start_hour: 13,
    flash_duration_hours: 24
  });
  const [promotions, setPromotions] = useState({ active: [], expired: [], stats: {} });
  const [showSettings, setShowSettings] = useState(false);
  const [saving, setSaving] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      
      const [settingsRes, promotionsRes] = await Promise.all([
        axios.get(`${API}/api/admin/promotions/settings`, { headers }),
        axios.get(`${API}/api/admin/promotions/all`, { headers })
      ]);
      
      setSettings(settingsRes.data);
      setPromotions(promotionsRes.data);
    } catch (error) {
      console.error('Error fetching promotions data:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل بيانات الفلاش",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await axios.put(
        `${API}/api/admin/promotions/settings`,
        settings,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast({
        title: "تم الحفظ",
        description: "تم حفظ إعدادات الفلاش بنجاح"
      });
      setShowSettings(false);
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في حفظ الإعدادات",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const cancelPromotion = async (promotionId) => {
    if (!window.confirm('هل أنت متأكد من إلغاء هذا الفلاش؟ لن يتم استرداد المبلغ.')) return;
    
    try {
      await axios.delete(
        `${API}/api/admin/promotions/${promotionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast({
        title: "تم الإلغاء",
        description: "تم إلغاء الفلاش وإشعار البائع"
      });
      fetchData();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في إلغاء الفلاش",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with settings button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="text-orange-500" size={24} />
          <h2 className="font-bold text-lg">فلاش</h2>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-1 px-3 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
        >
          <Settings size={16} />
          <span className="text-sm">الإعدادات</span>
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <h3 className="font-bold text-orange-800 mb-4">إعدادات الفلاش</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">تكلفة الفلاش (ل.س)</label>
              <input
                type="number"
                value={settings.cost_per_product}
                onChange={(e) => setSettings({...settings, cost_per_product: parseInt(e.target.value) || 0})}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">ساعة بدء Flash (0-23)</label>
              <select
                value={settings.flash_start_hour || 13}
                onChange={(e) => setSettings({...settings, flash_start_hour: parseInt(e.target.value)})}
                className="w-full p-2 border rounded-lg"
              >
                {[...Array(24)].map((_, i) => (
                  <option key={i} value={i}>
                    {i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i-12}:00 PM`}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">مدة الحدث (ساعة)</label>
              <select
                value={settings.flash_duration_hours || 24}
                onChange={(e) => setSettings({...settings, flash_duration_hours: parseInt(e.target.value)})}
                className="w-full p-2 border rounded-lg"
              >
                <option value={6}>6 ساعات</option>
                <option value={12}>12 ساعة</option>
                <option value={24}>24 ساعة</option>
                <option value={48}>48 ساعة</option>
                <option value={72}>72 ساعة</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">الحد الأقصى للفلاش/يوم</label>
              <input
                type="number"
                value={settings.max_products_per_day}
                onChange={(e) => setSettings({...settings, max_products_per_day: parseInt(e.target.value) || 5})}
                className="w-full p-2 border rounded-lg"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">تفعيل الفلاش</label>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({...settings, enabled: e.target.checked})}
                className="w-5 h-5 accent-orange-500"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
              حفظ
            </button>
            <button
              onClick={() => setShowSettings(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{promotions.stats?.active_count || 0}</div>
          <div className="text-xs text-green-700">فلاش نشطة</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-gray-600">{promotions.stats?.expired_count || 0}</div>
          <div className="text-xs text-gray-700">فلاش منتهية</div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{(promotions.stats?.total_revenue || 0).toLocaleString()}</div>
          <div className="text-xs text-orange-700">إجمالي الإيرادات (ل.س)</div>
        </div>
      </div>

      {/* Current Settings Display */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-center justify-around text-sm">
        <div className="flex items-center gap-1">
          <DollarSign size={14} className="text-green-500" />
          <span>التكلفة: <b>{settings.cost_per_product?.toLocaleString()} ل.س</b></span>
        </div>
        <div className="flex items-center gap-1">
          <Clock size={14} className="text-blue-500" />
          <span>المدة: <b>{settings.duration_hours} ساعة</b></span>
        </div>
        <div className="flex items-center gap-1">
          {settings.enabled ? (
            <CheckCircle size={14} className="text-green-500" />
          ) : (
            <XCircle size={14} className="text-red-500" />
          )}
          <span>{settings.enabled ? 'مفعّل' : 'معطّل'}</span>
        </div>
      </div>

      {/* Active Promotions */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="bg-green-50 px-4 py-2 border-b border-green-200">
          <h3 className="font-bold text-green-800 flex items-center gap-2">
            <Zap size={16} />
            الفلاش النشطة ({promotions.active?.length || 0})
          </h3>
        </div>
        
        {promotions.active?.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package size={40} className="mx-auto mb-2 opacity-30" />
            <p>لا توجد فلاش نشطة</p>
          </div>
        ) : (
          <div className="divide-y">
            {promotions.active?.map(promo => (
              <div key={promo.id} className="p-3 flex items-center gap-3 hover:bg-gray-50">
                {promo.product_image && (
                  <img src={promo.product_image} alt="" className="w-12 h-12 rounded-lg object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{promo.product_name}</p>
                  <p className="text-xs text-gray-500">
                    {promo.seller_name} • {promo.is_food ? '🍽️ طعام' : '🛒 منتج'}
                  </p>
                  <p className="text-xs text-green-600">
                    ينتهي: {new Date(promo.expires_at).toLocaleString('ar')}
                  </p>
                </div>
                <div className="text-left">
                  {promo.discount_percentage > 0 && (
                    <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-bold">
                      -{promo.discount_percentage}%
                    </span>
                  )}
                  <p className="text-xs text-gray-500 mt-1">{promo.cost_paid?.toLocaleString()} ل.س</p>
                </div>
                <button
                  onClick={() => cancelPromotion(promo.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  title="إلغاء الفلاش"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Expired Promotions */}
      {promotions.expired?.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
            <h3 className="font-bold text-gray-700 flex items-center gap-2">
              <Clock size={16} />
              الفلاش المنتهية (آخر {promotions.expired?.length})
            </h3>
          </div>
          <div className="divide-y max-h-64 overflow-y-auto">
            {promotions.expired?.map(promo => (
              <div key={promo.id} className="p-3 flex items-center gap-3 opacity-60">
                {promo.product_image && (
                  <img src={promo.product_image} alt="" className="w-10 h-10 rounded-lg object-cover grayscale" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-700 truncate text-sm">{promo.product_name}</p>
                  <p className="text-xs text-gray-500">{promo.seller_name}</p>
                </div>
                <div className="text-xs text-gray-500">
                  {promo.cost_paid?.toLocaleString()} ل.س
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerPromotionsTab;
