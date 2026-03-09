// /app/frontend/src/components/admin/PlatformSettingsTab.js
// إعدادات المنصة - تفعيل/إيقاف الأقسام مع إشعارات قابلة للتخصيص

import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, UtensilsCrossed, ShoppingBag, Truck, Wallet, 
  Users, Flame, Zap, Save, RefreshCw, Bell, X, Send, MessageSquare, MessageCircle, Phone
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useSettings } from '../../context/SettingsContext';

const API = process.env.REACT_APP_BACKEND_URL;

// قوالب الإشعارات الجاهزة لكل قسم
const NOTIFICATION_TEMPLATES = {
  food_enabled: [
    { title: '🍕 جديد! منصة الطعام متاحة الآن', message: 'اطلب الآن من مطاعمك المفضلة - توصيل سريع لباب بيتك!' },
    { title: '🍔 وصل الطعام لتريند سورية!', message: 'استمتع بأشهى الأطباق من أفضل المطاعم مع توصيل فوري' },
    { title: '🥗 منصة الطعام جاهزة للخدمة', message: 'اكتشف قائمة المطاعم الجديدة واطلب وجبتك المفضلة' },
    { title: '🍕 مفاجأة! الطعام أصبح متاحاً', message: 'جربوا خدمة توصيل الطعام الجديدة - سرعة وجودة' },
  ],
  shop_enabled: [
    { title: '🛒 منصة التسوق متاحة الآن!', message: 'تسوق أفضل المنتجات بأقل الأسعار مع توصيل لباب بيتك' },
    { title: '🛍️ تسوق بسهولة من تريند سورية', message: 'آلاف المنتجات بانتظارك - ابدأ التسوق الآن!' },
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
      const response = await axios.get(`${API}/api/admin/settings`);
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({ title: "خطأ", description: "فشل تحميل الإعدادات", variant: "destructive" });
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
      await axios.put(`${API}/api/admin/settings`, settings);
      await refreshSettings();
      toast({ title: "تم الحفظ", description: "تم تحديث إعدادات المنصة" });
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حفظ الإعدادات", variant: "destructive" });
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
  
  useEffect(() => {
    if (settings?.whatsapp_number) {
      setWhatsappNumber(settings.whatsapp_number);
    }
  }, [settings?.whatsapp_number]);

  const handleWhatsappNumberChange = (value) => {
    setWhatsappNumber(value);
    setSettings(prev => ({ ...prev, whatsapp_number: value }));
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-gray-700 to-gray-900 rounded-xl flex items-center justify-center">
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
          className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-green-600 disabled:opacity-50"
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
              className={`bg-white rounded-xl border-2 p-4 transition-all ${
                isEnabled ? 'border-green-200' : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 bg-gradient-to-br ${config.color} rounded-xl flex items-center justify-center`}>
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
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <p className="text-sm text-yellow-800">
          <strong>⚠️ ملاحظة:</strong> عند إيقاف أي قسم، سيختفي من التطبيق للمستخدمين ولكن البيانات ستبقى محفوظة. عند التفعيل، يمكنك إرسال إشعار للمستخدمين.
        </p>
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
              className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
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

              <div className="p-4 space-y-4">
                {/* خيار تخطي الإشعار */}
                <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
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
                            className={`block p-3 rounded-xl border-2 cursor-pointer transition-all ${
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
                        className={`block p-3 rounded-xl border-2 cursor-pointer transition-all ${
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
                            className="w-full p-3 border border-gray-200 rounded-xl text-sm"
                            data-testid="custom-notification-title"
                          />
                          <textarea
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            placeholder="نص الإشعار..."
                            rows={3}
                            className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none"
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
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={confirmActivation}
                    disabled={saving || (!skipNotification && useCustom && (!customTitle || !customMessage))}
                    className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold text-sm hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
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
