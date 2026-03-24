// /app/frontend/src/components/admin/PlatformSettingsTab.js
// إعدادات المنصة - تفعيل/إيقاف الأقسام مع إشعارات قابلة للتخصيص

import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, UtensilsCrossed, ShoppingBag, Truck, Wallet, 
  Users, Flame, Zap, Save, RefreshCw, Bell, X, Send, MessageSquare, MessageCircle, Phone,
  Gift, Calendar, AlertCircle
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useSettings } from '../../context/SettingsContext';

const API = process.env.REACT_APP_BACKEND_URL;

// 🎁 مكون عرض الشحن المجاني الشامل
const GlobalFreeShippingPromo = () => {
  const { toast } = useToast();
  const [promo, setPromo] = useState({
    is_active: false,
    applies_to: 'all',
    end_date: '',
    message: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPromo();
  }, []);

  const fetchPromo = async () => {
    try {
      const res = await axios.get(`${API}/api/settings/global-free-shipping`);
      setPromo({
        is_active: res.data.is_active || false,
        applies_to: res.data.applies_to || 'all',
        end_date: res.data.end_date ? res.data.end_date.split('T')[0] : '',
        message: res.data.message || ''
      });
    } catch (error) {
      console.error('Error fetching promo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/api/settings/global-free-shipping`, {
        is_active: promo.is_active,
        applies_to: promo.applies_to,
        end_date: promo.end_date ? new Date(promo.end_date).toISOString() : null,
        message: promo.message || null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ 
        title: promo.is_active ? "🎉 تم تفعيل العرض" : "تم إلغاء العرض",
        description: promo.is_active ? "الشحن المجاني الشامل مفعّل الآن" : "تم إيقاف عرض الشحن المجاني"
      });
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حفظ الإعدادات", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className={`bg-gradient-to-r ${promo.is_active ? 'from-green-50 to-emerald-50 border-green-300' : 'from-gray-50 to-gray-100 border-gray-200'} rounded-lg border-2 p-4 transition-all`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 ${promo.is_active ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gray-400'} rounded-lg flex items-center justify-center`}>
            <Gift size={24} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">🎁 عرض الشحن المجاني الشامل</h3>
            <p className="text-xs text-gray-500">تفعيل توصيل مجاني لجميع الطلبات (المنصة تتحمل التكلفة)</p>
          </div>
        </div>
        
        {/* Toggle */}
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={promo.is_active}
            onChange={(e) => setPromo({ ...promo, is_active: e.target.checked })}
            className="sr-only peer"
            data-testid="toggle-global-free-shipping"
          />
          <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
        </label>
      </div>

      {promo.is_active && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-3 pt-3 border-t border-green-200"
        >
          {/* نوع العرض */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">يُطبق على:</label>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'all', label: '🌟 جميع الطلبات', color: 'green' },
                { value: 'food', label: '🍕 طلبات الطعام فقط', color: 'orange' },
                { value: 'products', label: '🛒 طلبات المنتجات فقط', color: 'blue' }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setPromo({ ...promo, applies_to: opt.value })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    promo.applies_to === opt.value
                      ? `bg-${opt.color}-500 text-white`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* تاريخ الانتهاء */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Calendar size={14} className="inline ml-1" />
              تاريخ انتهاء العرض (اختياري):
            </label>
            <input
              type="date"
              value={promo.end_date}
              onChange={(e) => setPromo({ ...promo, end_date: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className="border border-gray-300 rounded-lg py-2 px-3 text-sm focus:border-green-500 focus:outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">اتركه فارغاً لعرض بدون تاريخ انتهاء (يدوي)</p>
          </div>

          {/* رسالة للعملاء */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">رسالة للعملاء (تظهر في التطبيق):</label>
            <input
              type="text"
              value={promo.message}
              onChange={(e) => setPromo({ ...promo, message: e.target.value })}
              placeholder="🎉 احتفالاً بالافتتاح - توصيل مجاني!"
              className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:border-green-500 focus:outline-none"
            />
          </div>

          {/* تحذير */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle size={18} className="text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <strong>ملاحظة:</strong> السائقون سيحصلون على أجرة التوصيل كاملة. المنصة ستتحمل هذه التكلفة خلال فترة العرض.
            </div>
          </div>
        </motion.div>
      )}

      {/* زر الحفظ */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={`mt-4 w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
          promo.is_active 
            ? 'bg-green-500 hover:bg-green-600 text-white' 
            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
        } disabled:opacity-50`}
        data-testid="save-global-free-shipping"
      >
        {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
        {promo.is_active ? 'تفعيل العرض' : 'حفظ الإعدادات'}
      </button>
    </div>
  );
};

// 🔒 مكون إغلاق المنصة
const PlatformClosureSettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    platform_closed_for_customers: false,
    platform_closed_for_sellers: false,
    platform_closed_message: 'المنصة مغلقة مؤقتاً، سنعود قريباً!',
    platform_closed_message_sellers: 'المنصة مغلقة للبائعين مؤقتاً للصيانة'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/platform-status`);
      setSettings({
        platform_closed_for_customers: res.data.platform_closed_for_customers || false,
        platform_closed_for_sellers: res.data.platform_closed_for_sellers || false,
        platform_closed_message: res.data.platform_closed_message || 'المنصة مغلقة مؤقتاً، سنعود قريباً!',
        platform_closed_message_sellers: res.data.platform_closed_message_sellers || 'المنصة مغلقة للبائعين مؤقتاً للصيانة'
      });
    } catch (error) {
      console.error('Error fetching platform status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/api/admin/settings`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ 
        title: "تم الحفظ!",
        description: "تم تحديث إعدادات المنصة"
      });
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حفظ الإعدادات", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  const isClosed = settings.platform_closed_for_customers || settings.platform_closed_for_sellers;

  return (
    <div className={`bg-gradient-to-r ${isClosed ? 'from-red-50 to-orange-50 border-red-300' : 'from-green-50 to-emerald-50 border-green-300'} rounded-lg border-2 p-4 transition-all`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 ${isClosed ? 'bg-gradient-to-br from-red-500 to-orange-600' : 'bg-gradient-to-br from-green-500 to-emerald-600'} rounded-lg flex items-center justify-center`}>
            <AlertCircle size={24} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">حالة المنصة</h3>
            <p className="text-xs text-gray-500">إغلاق/فتح المنصة للعملاء والبائعين</p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${isClosed ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {isClosed ? '🔒 مغلقة' : '🟢 مفتوحة'}
        </span>
      </div>

      <div className="space-y-4">
        {/* إغلاق للعملاء */}
        <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-gray-600" />
            <span className="text-sm font-medium">إغلاق المنصة للعملاء</span>
          </div>
          <button
            onClick={() => setSettings({...settings, platform_closed_for_customers: !settings.platform_closed_for_customers})}
            className={`relative w-12 h-6 rounded-full transition-colors ${settings.platform_closed_for_customers ? 'bg-red-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.platform_closed_for_customers ? 'right-1' : 'left-1'}`} />
          </button>
        </div>

        {/* إغلاق للبائعين */}
        <div className="flex items-center justify-between p-3 bg-white/50 rounded-lg">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-gray-600" />
            <span className="text-sm font-medium">إغلاق المنصة للبائعين</span>
          </div>
          <button
            onClick={() => setSettings({...settings, platform_closed_for_sellers: !settings.platform_closed_for_sellers})}
            className={`relative w-12 h-6 rounded-full transition-colors ${settings.platform_closed_for_sellers ? 'bg-red-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.platform_closed_for_sellers ? 'right-1' : 'left-1'}`} />
          </button>
        </div>

        {/* رسالة الإغلاق للعملاء */}
        {settings.platform_closed_for_customers && (
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">رسالة الإغلاق للعملاء</label>
            <textarea
              value={settings.platform_closed_message}
              onChange={(e) => setSettings({...settings, platform_closed_message: e.target.value})}
              className="w-full bg-white border rounded-lg p-2 text-sm resize-none"
              rows={2}
              placeholder="الرسالة التي ستظهر للعملاء..."
            />
          </div>
        )}

        {/* رسالة الإغلاق للبائعين */}
        {settings.platform_closed_for_sellers && (
          <div>
            <label className="text-xs font-medium text-gray-700 mb-1 block">رسالة الإغلاق للبائعين</label>
            <textarea
              value={settings.platform_closed_message_sellers}
              onChange={(e) => setSettings({...settings, platform_closed_message_sellers: e.target.value})}
              className="w-full bg-white border rounded-lg p-2 text-sm resize-none"
              rows={2}
              placeholder="الرسالة التي ستظهر للبائعين..."
            />
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className={`w-full mt-4 py-2 rounded-lg text-white font-medium transition-colors ${saving ? 'bg-gray-400' : isClosed ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
      >
        {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
      </button>
    </div>
  );
};

// 👥 مكون إعدادات برنامج الإحالات
const ReferralProgramSettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    is_active: true,
    referrer_reward: 10000,
    referee_discount: 20,
    min_order_for_reward: 30000
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/api/referrals/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings({
        is_active: res.data.is_active ?? true,
        referrer_reward: res.data.referrer_reward || 10000,
        referee_discount: res.data.referee_discount || 20,
        min_order_for_reward: res.data.min_order_for_reward || 30000
      });
    } catch (error) {
      console.error('Error fetching referral settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/api/referrals/admin/settings`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ 
        title: "تم الحفظ!",
        description: settings.is_active ? "برنامج الإحالات مفعّل" : "برنامج الإحالات متوقف"
      });
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حفظ الإعدادات", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return null;

  return (
    <div className={`bg-gradient-to-r ${settings.is_active ? 'from-pink-50 to-rose-50 border-pink-300' : 'from-gray-50 to-gray-100 border-gray-200'} rounded-lg border-2 p-4 transition-all`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 ${settings.is_active ? 'bg-gradient-to-br from-pink-500 to-rose-600' : 'bg-gray-400'} rounded-lg flex items-center justify-center`}>
            <Users size={24} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">برنامج الإحالات</h3>
            <p className="text-xs text-gray-500">ادعُ صديقاً واكسب مكافآت</p>
          </div>
        </div>
        
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.is_active}
            onChange={(e) => setSettings({ ...settings, is_active: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
        </label>
      </div>

      {settings.is_active && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-3"
        >
          {/* مكافأة المُحيل */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              💰 مكافأة المُحيل (ل.س)
            </label>
            <input
              type="number"
              value={settings.referrer_reward}
              onChange={(e) => setSettings({ ...settings, referrer_reward: parseInt(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:border-pink-500 focus:outline-none"
              placeholder="10000"
            />
            <p className="text-xs text-gray-500 mt-1">المبلغ الذي يحصل عليه المُحيل عند إتمام الإحالة</p>
          </div>

          {/* خصم المُحال */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              🎁 خصم الصديق (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={settings.referee_discount}
              onChange={(e) => setSettings({ ...settings, referee_discount: parseInt(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:border-pink-500 focus:outline-none"
              placeholder="20"
            />
            <p className="text-xs text-gray-500 mt-1">نسبة الخصم التي يحصل عليها الصديق الجديد على أول طلب</p>
          </div>

          {/* الحد الأدنى للطلب */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              📦 الحد الأدنى للطلب (ل.س)
            </label>
            <input
              type="number"
              value={settings.min_order_for_reward}
              onChange={(e) => setSettings({ ...settings, min_order_for_reward: parseInt(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:border-pink-500 focus:outline-none"
              placeholder="30000"
            />
            <p className="text-xs text-gray-500 mt-1">الحد الأدنى لقيمة الطلب لاحتساب الإحالة كناجحة</p>
          </div>

          {/* أزرار إرسال الإشعارات */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">📢 إرسال تذكير للمستخدمين</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    const res = await axios.post(`${API}/api/referrals/admin/send-reminder`, {}, {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    toast({ 
                      title: "تم الإرسال!",
                      description: `تم إرسال الإشعار لـ ${res.data.users_notified} مستخدم`
                    });
                  } catch (e) {
                    toast({ title: "خطأ", description: "فشل إرسال الإشعارات", variant: "destructive" });
                  }
                }}
                className="py-2 px-3 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
              >
                <Bell size={14} />
                للجميع
              </button>
              <button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('token');
                    const res = await axios.post(`${API}/api/referrals/admin/send-to-inactive`, {}, {
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    toast({ 
                      title: "تم الإرسال!",
                      description: `تم إرسال الإشعار لـ ${res.data.users_notified} مستخدم غير نشط`
                    });
                  } catch (e) {
                    toast({ title: "خطأ", description: "فشل إرسال الإشعارات", variant: "destructive" });
                  }
                }}
                className="py-2 px-3 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
              >
                <Bell size={14} />
                غير النشطين
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">غير النشطين = لم يطلبوا منذ أسبوع</p>
          </div>
        </motion.div>
      )}

      {/* زر الحفظ */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={`mt-4 w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
          settings.is_active 
            ? 'bg-pink-500 hover:bg-pink-600 text-white' 
            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
        } disabled:opacity-50`}
        data-testid="save-referral-settings"
      >
        {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
        حفظ الإعدادات
      </button>
    </div>
  );
};

// ⚡ مكون التسعير الديناميكي (Surge Pricing)
const SurgePricingSettings = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    is_active: false,
    multiplier: 1.5,
    fixed_amount: 0,
    reason: 'زيادة الطلب',
    applies_to: 'all',
    min_order_value: 0,
    max_surge_amount: 0
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/api/settings/surge-pricing`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings({
        is_active: res.data.is_active ?? false,
        multiplier: res.data.multiplier || 1.5,
        fixed_amount: res.data.fixed_amount || 0,
        reason: res.data.reason || 'زيادة الطلب',
        applies_to: res.data.applies_to || 'all',
        min_order_value: res.data.min_order_value || 0,
        max_surge_amount: res.data.max_surge_amount || 0
      });
    } catch (error) {
      console.error('Error fetching surge pricing settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API}/api/settings/surge-pricing`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ 
        title: settings.is_active ? "⚡ تم تفعيل التسعير الديناميكي" : "تم الإيقاف",
        description: res.data.example ? `مثال: ${res.data.example.original_fee.toLocaleString()} → ${res.data.example.surge_fee.toLocaleString()} ل.س` : ""
      });
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || "فشل حفظ الإعدادات", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // حساب مثال على الزيادة
  const exampleFee = 5000;
  let surgeFee = exampleFee;
  if (settings.is_active) {
    if (settings.fixed_amount > 0) {
      surgeFee = exampleFee + settings.fixed_amount;
    } else {
      surgeFee = Math.round(exampleFee * settings.multiplier);
    }
    if (settings.max_surge_amount > 0) {
      surgeFee = Math.min(surgeFee, exampleFee + settings.max_surge_amount);
    }
  }

  if (loading) return null;

  return (
    <div className={`bg-gradient-to-r ${settings.is_active ? 'from-orange-50 to-red-50 border-orange-300' : 'from-gray-50 to-gray-100 border-gray-200'} rounded-lg border-2 p-4 transition-all`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 ${settings.is_active ? 'bg-gradient-to-br from-orange-500 to-red-600' : 'bg-gray-400'} rounded-lg flex items-center justify-center`}>
            <Zap size={24} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">التسعير الديناميكي</h3>
            <p className="text-xs text-gray-500">زيادة أسعار التوصيل في أوقات الذروة</p>
          </div>
        </div>
        
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={settings.is_active}
            onChange={(e) => setSettings({ ...settings, is_active: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
        </label>
      </div>

      {settings.is_active && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-3"
        >
          {/* سبب الزيادة */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              📝 سبب الزيادة (يظهر للعملاء)
            </label>
            <select
              value={settings.reason}
              onChange={(e) => setSettings({ ...settings, reason: e.target.value })}
              className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:border-orange-500 focus:outline-none"
            >
              <option value="زيادة الطلب">زيادة الطلب</option>
              <option value="ساعات الذروة">ساعات الذروة</option>
              <option value="طقس سيء">طقس سيء</option>
              <option value="عطلة رسمية">عطلة رسمية</option>
              <option value="مناسبة خاصة">مناسبة خاصة</option>
            </select>
          </div>

          {/* نوع الزيادة */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                📈 نسبة الزيادة
              </label>
              <select
                value={settings.multiplier}
                onChange={(e) => setSettings({ ...settings, multiplier: parseFloat(e.target.value), fixed_amount: 0 })}
                className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:border-orange-500 focus:outline-none"
                disabled={settings.fixed_amount > 0}
              >
                <option value="1.25">25% زيادة</option>
                <option value="1.5">50% زيادة</option>
                <option value="1.75">75% زيادة</option>
                <option value="2">100% زيادة (الضعف)</option>
                <option value="2.5">150% زيادة</option>
                <option value="3">200% زيادة</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                💰 أو مبلغ ثابت (ل.س)
              </label>
              <input
                type="number"
                value={settings.fixed_amount}
                onChange={(e) => setSettings({ ...settings, fixed_amount: parseInt(e.target.value) || 0 })}
                className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:border-orange-500 focus:outline-none"
                placeholder="0 = استخدم النسبة"
              />
            </div>
          </div>

          {/* يطبق على */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              🎯 يطبق على
            </label>
            <select
              value={settings.applies_to}
              onChange={(e) => setSettings({ ...settings, applies_to: e.target.value })}
              className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:border-orange-500 focus:outline-none"
            >
              <option value="all">جميع الطلبات</option>
              <option value="food_only">طلبات الطعام فقط</option>
              <option value="products_only">طلبات المنتجات فقط</option>
            </select>
          </div>

          {/* الحد الأقصى للزيادة */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              🔒 الحد الأقصى للزيادة (ل.س)
            </label>
            <input
              type="number"
              value={settings.max_surge_amount}
              onChange={(e) => setSettings({ ...settings, max_surge_amount: parseInt(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded-lg py-2 px-3 text-sm focus:border-orange-500 focus:outline-none"
              placeholder="0 = بدون حد"
            />
            <p className="text-xs text-gray-500 mt-1">حد أقصى للزيادة حتى لو كانت النسبة أكبر (0 = بدون حد)</p>
          </div>

          {/* مثال على الزيادة */}
          <div className="bg-orange-100 rounded-lg p-3">
            <p className="text-sm font-medium text-orange-800 mb-1">مثال على التطبيق:</p>
            <div className="flex items-center gap-2 text-orange-700">
              <span>رسوم توصيل {exampleFee.toLocaleString()} ل.س</span>
              <span>→</span>
              <span className="font-bold">{surgeFee.toLocaleString()} ل.س</span>
              <span className="text-xs bg-orange-200 px-2 py-0.5 rounded">
                +{((surgeFee - exampleFee) / exampleFee * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* زر الحفظ */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={`mt-4 w-full py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${
          settings.is_active 
            ? 'bg-orange-500 hover:bg-orange-600 text-white' 
            : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
        } disabled:opacity-50`}
        data-testid="save-surge-pricing-settings"
      >
        {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
        {settings.is_active ? 'تفعيل التسعير الديناميكي' : 'حفظ الإعدادات'}
      </button>
    </div>
  );
};

// 🚫 مكون إعدادات إلغاء الطلب للسائق
const DriverCancelSettings = () => {
  const { toast } = useToast();
  console.log('DriverCancelSettings: Component mounted');
  const [settings, setSettings] = useState({
    enabled: true,
    cancel_window_seconds: 120,
    max_cancel_rate: 10,
    lookback_orders: 50,
    warning_threshold: 7,
    suspension_threshold: 15
  });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('لم يتم العثور على token');
        setLoading(false);
        return;
      }

      // Fetch settings
      try {
        const res = await axios.get(`${API}/api/settings/driver-cancel`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSettings(res.data);
        setError(null);
      } catch (err) {
        console.error('Error fetching driver cancel settings:', err);
        setError('فشل تحميل الإعدادات: ' + (err.response?.data?.detail || err.message));
      } finally {
        setLoading(false);
      }

      // Fetch stats
      try {
        const statsRes = await axios.get(`${API}/api/settings/driver-cancel/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(statsRes.data);
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };
    
    fetchData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/api/settings/driver-cancel`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: "✅ تم الحفظ", description: "تم تحديث إعدادات إلغاء السائق" });
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || "فشل الحفظ", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg p-6 border-4 border-blue-500 animate-pulse" data-testid="driver-cancel-loading">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-20 bg-gray-100 rounded"></div>
        <p className="mt-2 text-gray-500 text-sm">جاري تحميل إعدادات إلغاء السائق...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg p-6 border border-red-200">
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle size={24} />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-6 border-4 border-red-500" data-testid="driver-cancel-settings">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
          <AlertCircle className="text-red-600" size={24} />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">إعدادات إلغاء الطلب (السائق)</h3>
          <p className="text-sm text-gray-500">التحكم في قدرة السائقين على إلغاء الطلبات</p>
        </div>
      </div>

      {/* تفعيل/إيقاف */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-4">
        <div>
          <p className="font-bold text-gray-900">تفعيل إلغاء الطلب للسائقين</p>
          <p className="text-sm text-gray-500">السماح للسائقين بإلغاء الطلبات ضمن شروط</p>
        </div>
        <button
          onClick={() => setSettings(s => ({ ...s, enabled: !s.enabled }))}
          className={`w-14 h-7 rounded-full transition-colors ${
            settings.enabled ? 'bg-red-500' : 'bg-gray-300'
          }`}
        >
          <div className={`w-6 h-6 bg-white rounded-full shadow transform transition-transform ${
            settings.enabled ? 'translate-x-7' : 'translate-x-0.5'
          }`} />
        </button>
      </div>

      {settings.enabled && (
        <div className="space-y-3">
          {/* مهلة الإلغاء */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              مهلة الإلغاء (بالثواني)
            </label>
            <input
              type="number"
              value={settings.cancel_window_seconds}
              onChange={(e) => setSettings(s => ({ ...s, cancel_window_seconds: parseInt(e.target.value) || 0 }))}
              className="w-full p-3 border border-gray-200 rounded-lg"
            />
            <p className="text-xs text-gray-500 mt-1">
              الوقت المسموح للسائق لإلغاء الطلب بعد قبوله ({Math.floor(settings.cancel_window_seconds / 60)} دقيقة و {settings.cancel_window_seconds % 60} ثانية)
            </p>
          </div>

          {/* نسبة الإلغاء القصوى */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                نسبة الإلغاء القصوى (%)
              </label>
              <input
                type="number"
                value={settings.max_cancel_rate}
                onChange={(e) => setSettings(s => ({ ...s, max_cancel_rate: parseInt(e.target.value) || 0 }))}
                className="w-full p-3 border border-gray-200 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                عدد الطلبات للحساب
              </label>
              <input
                type="number"
                value={settings.lookback_orders}
                onChange={(e) => setSettings(s => ({ ...s, lookback_orders: parseInt(e.target.value) || 0 }))}
                className="w-full p-3 border border-gray-200 rounded-lg"
              />
            </div>
          </div>

          {/* حدود التحذير والإيقاف */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ⚠️ نسبة التحذير (%)
              </label>
              <input
                type="number"
                value={settings.warning_threshold}
                onChange={(e) => setSettings(s => ({ ...s, warning_threshold: parseInt(e.target.value) || 0 }))}
                className="w-full p-3 border border-yellow-200 rounded-lg bg-yellow-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                🔴 نسبة الإيقاف (%)
              </label>
              <input
                type="number"
                value={settings.suspension_threshold}
                onChange={(e) => setSettings(s => ({ ...s, suspension_threshold: parseInt(e.target.value) || 0 }))}
                className="w-full p-3 border border-red-200 rounded-lg bg-red-50"
              />
            </div>
          </div>

          {/* إحصائيات */}
          {stats && (
            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <h4 className="font-bold text-gray-900 mb-3">📊 إحصائيات الإلغاءات</h4>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{stats.total_cancellations}</p>
                  <p className="text-xs text-gray-500">إجمالي الإلغاءات</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{stats.today_cancellations}</p>
                  <p className="text-xs text-gray-500">اليوم</p>
                </div>
                <div className="bg-white p-3 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">{stats.week_cancellations}</p>
                  <p className="text-xs text-gray-500">هذا الأسبوع</p>
                </div>
              </div>

              {/* أكثر الأسباب */}
              {stats.top_reasons?.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">أكثر أسباب الإلغاء:</p>
                  <div className="space-y-1">
                    {stats.top_reasons.slice(0, 5).map((r, i) => (
                      <div key={i} className="flex justify-between text-sm bg-white p-2 rounded">
                        <span className="text-gray-600">{r.reason}</span>
                        <span className="font-bold text-gray-900">{r.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* زر الحفظ */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors disabled:bg-gray-400"
      >
        {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
        حفظ الإعدادات
      </button>
    </div>
  );
};

// قوالب الإشعارات الجاهزة لكل قسم
const NOTIFICATION_TEMPLATES = {
  food_enabled: [
    { title: '🍕 جديد! منصة الطعام متاحة الآن', message: 'اطلب الآن من مطاعمك المفضلة - توصيل سريع لباب بيتك!' },
    { title: '🍔 وصل الطعام لترند سورية!', message: 'استمتع بأشهى الأطباق من أفضل المطاعم مع توصيل فوري' },
    { title: '🥗 منصة الطعام جاهزة للخدمة', message: 'اكتشف قائمة المطاعم الجديدة واطلب وجبتك المفضلة' },
    { title: '🍕 مفاجأة! الطعام أصبح متاحاً', message: 'جربوا خدمة توصيل الطعام الجديدة - سرعة وجودة' },
  ],
  shop_enabled: [
    { title: '🛒 منصة التسوق متاحة الآن!', message: 'تسوق أفضل المنتجات بأقل الأسعار مع توصيل لباب بيتك' },
    { title: '🛍️ تسوق بسهولة من ترند سورية', message: 'آلاف المنتجات بانتظارك - ابدأ التسوق الآن!' },
    { title: '🎁 منصة التسوق عادت!', message: 'عروض حصرية ومنتجات متنوعة - لا تفوت الفرصة' },
  ],
  delivery_enabled: [
    { title: '🚚 خدمة التوصيل السريع متاحة', message: 'توصيل موثوق وسريع لجميع طلباتك أينما كنت' },
    { title: '📦 توصيل سريع وآمن', message: 'فريق توصيل محترف لضمان وصول طلباتك بأمان' },
  ],
  wallet_enabled: [
    { title: '💰 المحفظة الإلكترونية جاهزة', message: 'ادفع بسهولة واحصل على كاشباك على كل عملية!' },
    { title: '💳 شحن سهل، دفع أسهل', message: 'استخدم محفظتك الإلكترونية للدفع السريع والآمن' },
  ],
  referral_enabled: [
    { title: '👥 برنامج الإحالة مفعّل!', message: 'ادعُ أصدقاءك واربح مكافآت على كل إحالة ناجحة' },
    { title: '🎁 اربح مع كل صديق تدعوه', message: 'شارك رمز الإحالة واحصل على رصيد مجاني!' },
  ],
  daily_deals_enabled: [
    { title: '🔥 صفقات اليوم عادت!', message: 'تصفح العروض الحصرية واحصل على خصومات مميزة!' },
    { title: '💥 عروض يومية لا تُفوّت', message: 'خصومات جديدة كل يوم - تابعنا للمزيد!' },
    { title: '🔥 صفقة اليوم بانتظارك', message: 'وفّر أكثر مع عروضنا اليومية المميزة' },
  ],
  flash_sales_enabled: [
    { title: '⚡ عروض الفلاش متاحة الآن!', message: 'خصومات محدودة الوقت - اغتنم الفرصة قبل انتهاء العرض!' },
    { title: '💨 سرّع! عروض فلاش حصرية', message: 'خصومات كبيرة لفترة محدودة جداً - لا تتأخر!' },
    { title: '⚡ فلاش سيل! خصومات مذهلة', message: 'عروض تنتهي قريباً - اشترِ الآن!' },
  ],
};

const PlatformSettingsTab = () => {
  const { toast } = useToast();
  const { refreshSettings } = useSettings();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // حالة نافذة الإشعار
  const [notificationModal, setNotificationModal] = useState({
    isOpen: false,
    settingKey: null,
    settingTitle: '',
  });
  const [selectedTemplate, setSelectedTemplate] = useState(0);
  const [customTitle, setCustomTitle] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [skipNotification, setSkipNotification] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/api/admin/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      const errorMsg = error.response?.data?.detail || "فشل تحميل الإعدادات";
      toast({ title: "خطأ", description: errorMsg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // عند النقر على زر التفعيل - فتح نافذة الإشعار إذا كان القسم معطل حالياً
  const handleToggleClick = (key, title) => {
    const currentValue = settings?.[key] ?? true;
    
    // إذا كان القسم معطل وسنفعله - نفتح نافذة الإشعار
    if (!currentValue) {
      const templates = NOTIFICATION_TEMPLATES[key] || [];
      setNotificationModal({
        isOpen: true,
        settingKey: key,
        settingTitle: title,
      });
      setSelectedTemplate(0);
      setCustomTitle(templates[0]?.title || '');
      setCustomMessage(templates[0]?.message || '');
      setUseCustom(false);
      setSkipNotification(false);
    } else {
      // إذا كان مفعل وسنوقفه - نغير مباشرة بدون إشعار
      setSettings(prev => ({ ...prev, [key]: false }));
    }
  };

  // تأكيد التفعيل مع الإشعار
  const confirmActivation = async () => {
    const { settingKey } = notificationModal;
    const templates = NOTIFICATION_TEMPLATES[settingKey] || [];
    
    let notificationData = null;
    if (!skipNotification) {
      if (useCustom) {
        notificationData = { title: customTitle, message: customMessage };
      } else {
        notificationData = templates[selectedTemplate];
      }
    }
    
    // تحديث الإعدادات مع بيانات الإشعار
    setSaving(true);
    try {
      await axios.put(`${API}/api/admin/settings`, {
        [settingKey]: true,
        notification: notificationData
      });
      
      setSettings(prev => ({ ...prev, [settingKey]: true }));
      await refreshSettings();
      
      toast({ 
        title: "تم التفعيل", 
        description: skipNotification 
          ? "تم تفعيل القسم بدون إرسال إشعار" 
          : "تم تفعيل القسم وإرسال الإشعار للمستخدمين"
      });
    } catch (error) {
      toast({ title: "خطأ", description: "فشل تفعيل القسم", variant: "destructive" });
    } finally {
      setSaving(false);
      setNotificationModal({ isOpen: false, settingKey: null, settingTitle: '' });
    }
  };

  // حفظ الإعدادات بدون تغيير (للأقسام المعطلة)
  const saveSettings = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/api/admin/settings`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await refreshSettings();
      toast({ title: "تم الحفظ", description: "تم تحديث إعدادات المنصة" });
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || "فشل حفظ الإعدادات", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const SETTINGS_CONFIG = [
    {
      key: 'food_enabled',
      title: 'منصة الطعام 🍕',
      description: 'تفعيل قسم المطاعم وتوصيل الطعام',
      icon: UtensilsCrossed,
      color: 'from-orange-500 to-red-500'
    },
    {
      key: 'shop_enabled',
      title: 'منصة التسوق 🛒',
      description: 'تفعيل قسم التسوق والمنتجات',
      icon: ShoppingBag,
      color: 'from-blue-500 to-purple-500'
    },
    {
      key: 'delivery_enabled',
      title: 'خدمة التوصيل 🚚',
      description: 'تفعيل خدمة التوصيل وتسجيل السائقين',
      icon: Truck,
      color: 'from-green-500 to-teal-500'
    },
    {
      key: 'wallet_enabled',
      title: 'المحفظة الإلكترونية 💰',
      description: 'تفعيل المحفظة والدفع الإلكتروني',
      icon: Wallet,
      color: 'from-yellow-500 to-orange-500'
    },
    {
      key: 'referral_enabled',
      title: 'نظام الإحالة 👥',
      description: 'تفعيل برنامج دعوة الأصدقاء',
      icon: Users,
      color: 'from-pink-500 to-rose-500'
    },
    {
      key: 'daily_deals_enabled',
      title: 'صفقات اليوم 🔥',
      description: 'تفعيل عروض اليوم في الصفحة الرئيسية',
      icon: Flame,
      color: 'from-red-500 to-orange-500'
    },
    {
      key: 'flash_sales_enabled',
      title: 'عروض الفلاش ⚡',
      description: 'تفعيل عروض الفلاش والخصومات السريعة',
      icon: Zap,
      color: 'from-purple-500 to-indigo-500'
    },
    {
      key: 'whatsapp_enabled',
      title: 'دعم WhatsApp 💬',
      description: 'تفعيل/إيقاف زر الدردشة مع الدعم الفني',
      icon: MessageCircle,
      color: 'from-green-500 to-emerald-600',
      hasInput: true,
      inputKey: 'whatsapp_number',
      inputLabel: 'رقم الواتساب',
      inputPlaceholder: '963XXXXXXXXX'
    }
  ];

  // حالة إدخال رقم الواتساب
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [productsFreeShipping, setProductsFreeShipping] = useState(150000);
  const [foodFreeDelivery, setFoodFreeDelivery] = useState(100000);
  
  useEffect(() => {
    if (settings?.whatsapp_number) {
      setWhatsappNumber(settings.whatsapp_number);
    }
    if (settings?.products_free_shipping_threshold) {
      setProductsFreeShipping(settings.products_free_shipping_threshold);
    }
    if (settings?.food_free_delivery_threshold) {
      setFoodFreeDelivery(settings.food_free_delivery_threshold);
    }
  }, [settings?.whatsapp_number, settings?.products_free_shipping_threshold, settings?.food_free_delivery_threshold]);

  const handleWhatsappNumberChange = (value) => {
    setWhatsappNumber(value);
    setSettings(prev => ({ ...prev, whatsapp_number: value }));
  };

  const handleProductsFreeShippingChange = (value) => {
    const numValue = parseInt(value) || 0;
    setProductsFreeShipping(numValue);
    setSettings(prev => ({ ...prev, products_free_shipping_threshold: numValue }));
  };

  const handleFoodFreeDeliveryChange = (value) => {
    const numValue = parseInt(value) || 0;
    setFoodFreeDelivery(numValue);
    setSettings(prev => ({ ...prev, food_free_delivery_threshold: numValue }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentTemplates = NOTIFICATION_TEMPLATES[notificationModal.settingKey] || [];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg flex items-center justify-center">
            <Settings size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">إعدادات المنصة</h2>
            <p className="text-xs text-gray-500">تفعيل وإيقاف أقسام التطبيق</p>
          </div>
        </div>
        <button
          onClick={saveSettings}
          disabled={saving}
          className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-green-600 disabled:opacity-50"
          data-testid="save-settings-btn"
        >
          {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
          حفظ
        </button>
      </div>

      {/* Settings List */}
      <div className="space-y-3">
        {SETTINGS_CONFIG.map((config, index) => {
          const Icon = config.icon;
          const isEnabled = settings?.[config.key] ?? true;
          
          return (
            <motion.div
              key={config.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`bg-white rounded-lg border-2 p-4 transition-all ${
                isEnabled ? 'border-green-200' : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 bg-gradient-to-br ${config.color} rounded-lg flex items-center justify-center`}>
                    <Icon size={24} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{config.title}</h3>
                    <p className="text-sm text-gray-500">{config.description}</p>
                  </div>
                </div>
                
                {/* Toggle Switch */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={() => handleToggleClick(config.key, config.title)}
                    className="sr-only peer"
                    data-testid={`toggle-${config.key}`}
                  />
                  <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
              
              {/* Status Badge */}
              <div className="mt-3 flex justify-end">
                <span className={`text-xs px-3 py-1 rounded-full ${
                  isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {isEnabled ? '✓ مفعّل' : '✗ متوقف'}
                </span>
              </div>
              
              {/* حقل إدخال رقم الواتساب */}
              {config.hasInput && isEnabled && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <label className="text-xs text-gray-600 mb-1 block">{config.inputLabel}</label>
                  <div className="flex items-center gap-2">
                    <Phone size={16} className="text-gray-400" />
                    <input
                      type="tel"
                      value={whatsappNumber}
                      onChange={(e) => handleWhatsappNumberChange(e.target.value)}
                      placeholder={config.inputPlaceholder}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-green-500"
                      dir="ltr"
                      data-testid="whatsapp-number-input"
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">مثال: 963551021618 (بدون + أو 00)</p>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Warning Note */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>⚠️ ملاحظة:</strong> عند إيقاف أي قسم، سيختفي من التطبيق للمستخدمين ولكن البيانات ستبقى محفوظة. عند التفعيل، يمكنك إرسال إشعار للمستخدمين.
        </p>
      </div>

      {/* 🚫 إعدادات إلغاء السائق - في أعلى الصفحة */}
      <DriverCancelSettings />

      {/* 🔒 إغلاق المنصة */}
      <PlatformClosureSettings />

      {/* 🎁 عرض الشحن المجاني الشامل */}
      <GlobalFreeShippingPromo />

      {/* 👥 برنامج الإحالات */}
      <ReferralProgramSettings />

      {/* ⚡ التسعير الديناميكي */}
      <SurgePricingSettings />

      {/* إعدادات الشحن المجاني */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
            <Truck size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">إعدادات الشحن المجاني</h3>
            <p className="text-xs text-gray-500">تحديد الحد الأدنى للحصول على شحن مجاني</p>
          </div>
        </div>

        <div className="space-y-3">
          {/* حد الشحن المجاني للمنتجات */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              🛒 الحد الأدنى للشحن المجاني (المنتجات)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={productsFreeShipping}
                onChange={(e) => handleProductsFreeShippingChange(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg py-2 px-3 text-sm focus:border-orange-500 focus:outline-none"
                placeholder="150000"
              />
              <span className="text-sm text-gray-500">ل.س</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">عند طلب منتجات بهذا المبلغ أو أكثر، يحصل المشتري على شحن مجاني</p>
          </div>

          {/* حد التوصيل المجاني للطعام */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              🍕 الحد الأدنى للتوصيل المجاني (الطعام)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={foodFreeDelivery}
                onChange={(e) => handleFoodFreeDeliveryChange(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg py-2 px-3 text-sm focus:border-orange-500 focus:outline-none"
                placeholder="100000"
              />
              <span className="text-sm text-gray-500">ل.س</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">عند طلب طعام بهذا المبلغ أو أكثر من <strong>نفس المتجر</strong>، يحصل المشتري على توصيل مجاني</p>
          </div>

          {/* رسوم توصيل الطعام الموحدة */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              🚚 رسوم توصيل الطعام
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={settings?.food_delivery_fee || 5000}
                onChange={(e) => setSettings(prev => ({ ...prev, food_delivery_fee: parseInt(e.target.value) || 0 }))}
                className="flex-1 border border-gray-300 rounded-lg py-2 px-3 text-sm focus:border-orange-500 focus:outline-none"
                placeholder="5000"
              />
              <span className="text-sm text-gray-500">ل.س</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">رسوم التوصيل الموحدة لجميع متاجر الطعام (تذهب للسائق)</p>
          </div>
        </div>
      </div>

      {/* نافذة الإشعار */}
      <AnimatePresence>
        {notificationModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setNotificationModal({ isOpen: false, settingKey: null, settingTitle: '' })}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                    <Bell size={20} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">تفعيل {notificationModal.settingTitle}</h3>
                    <p className="text-xs text-gray-500">اختر إشعار لإرساله للمستخدمين</p>
                  </div>
                </div>
                <button
                  onClick={() => setNotificationModal({ isOpen: false, settingKey: null, settingTitle: '' })}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                {/* خيار تخطي الإشعار */}
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={skipNotification}
                    onChange={(e) => setSkipNotification(e.target.checked)}
                    className="w-5 h-5 text-orange-500 rounded"
                  />
                  <span className="text-sm text-gray-700">تفعيل بدون إرسال إشعار</span>
                </label>

                {!skipNotification && (
                  <>
                    {/* القوالب الجاهزة */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                        <MessageSquare size={16} />
                        قوالب جاهزة
                      </h4>
                      <div className="space-y-2">
                        {currentTemplates.map((template, index) => (
                          <label
                            key={index}
                            className={`block p-3 rounded-lg border-2 cursor-pointer transition-all ${
                              !useCustom && selectedTemplate === index
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="radio"
                                name="template"
                                checked={!useCustom && selectedTemplate === index}
                                onChange={() => {
                                  setSelectedTemplate(index);
                                  setUseCustom(false);
                                }}
                                className="mt-1"
                              />
                              <div>
                                <p className="font-bold text-gray-900 text-sm">{template.title}</p>
                                <p className="text-xs text-gray-500 mt-1">{template.message}</p>
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* إشعار مخصص */}
                    <div className="space-y-2">
                      <label
                        className={`block p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          useCustom ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="template"
                            checked={useCustom}
                            onChange={() => setUseCustom(true)}
                          />
                          <span className="font-bold text-gray-900 text-sm">✏️ كتابة إشعار مخصص</span>
                        </div>
                      </label>

                      {useCustom && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="space-y-3 mt-3"
                        >
                          <input
                            type="text"
                            value={customTitle}
                            onChange={(e) => setCustomTitle(e.target.value)}
                            placeholder="عنوان الإشعار..."
                            className="w-full p-3 border border-gray-200 rounded-lg text-sm"
                            data-testid="custom-notification-title"
                          />
                          <textarea
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            placeholder="نص الإشعار..."
                            rows={3}
                            className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none"
                            data-testid="custom-notification-message"
                          />
                        </motion.div>
                      )}
                    </div>
                  </>
                )}

                {/* أزرار التأكيد */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setNotificationModal({ isOpen: false, settingKey: null, settingTitle: '' })}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-200"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={confirmActivation}
                    disabled={saving || (!skipNotification && useCustom && (!customTitle || !customMessage))}
                    className="flex-1 py-3 bg-green-500 text-white rounded-lg font-bold text-sm hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
                    data-testid="confirm-activation-btn"
                  >
                    {saving ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                    {skipNotification ? 'تفعيل' : 'تفعيل وإرسال'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PlatformSettingsTab;
