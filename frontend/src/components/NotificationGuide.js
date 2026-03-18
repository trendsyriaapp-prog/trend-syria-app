import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, BellRing, Smartphone, Monitor, Chrome, Globe,
  CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp,
  Settings, Shield, Volume2, Vibrate, RefreshCw
} from 'lucide-react';
import usePushNotifications from '../hooks/usePushNotifications';
import PushNotificationButton from './PushNotificationButton';

/**
 * دليل تفعيل الإشعارات - قسم في صفحة الإعدادات
 */
const NotificationGuide = ({ userType }) => {
  const [expandedSection, setExpandedSection] = useState(null);
  const {
    isSupported,
    isSubscribed,
    permission,
    subscribe
  } = usePushNotifications(userType);

  // تحديد الرسائل حسب نوع المستخدم
  const getUserBenefits = () => {
    if (userType === 'delivery') {
      return {
        title: 'إشعارات السائق',
        benefits: [
          { icon: '🚀', text: 'استلم طلبات جديدة فوراً' },
          { icon: '💰', text: 'كن أول من يقبل واكسب أكثر' },
          { icon: '📍', text: 'تنبيهات تغيير العنوان' },
          { icon: '⭐', text: 'إشعارات التقييمات الجديدة' }
        ]
      };
    }
    if (userType === 'buyer') {
      return {
        title: 'إشعارات العميل',
        benefits: [
          { icon: '📦', text: 'تتبع حالة طلبك لحظة بلحظة' },
          { icon: '🚚', text: 'تنبيه عند خروج الطلب للتوصيل' },
          { icon: '🎁', text: 'عروض وخصومات حصرية' },
          { icon: '✅', text: 'إشعار وصول الطلب' }
        ]
      };
    }
    // seller
    return {
      title: 'إشعارات البائع',
      benefits: [
        { icon: '🔔', text: 'طلبات جديدة فوراً' },
        { icon: '⚡', text: 'استجابة سريعة = عملاء سعداء' },
        { icon: '💬', text: 'رسائل العملاء' },
        { icon: '📊', text: 'تقارير المبيعات اليومية' }
      ]
    };
  };

  const userBenefits = getUserBenefits();

  // خطوات التفعيل حسب المتصفح
  const browserGuides = [
    {
      id: 'chrome-mobile',
      title: 'Chrome على الموبايل',
      icon: <Smartphone className="text-green-500" size={20} />,
      steps: [
        'افتح التطبيق في متصفح Chrome',
        'اضغط على زر "تفعيل الإشعارات" أدناه',
        'عند ظهور نافذة الإذن، اختر "السماح"',
        'إذا لم تظهر النافذة: اضغط على 🔒 بجانب عنوان الموقع',
        'اختر "إعدادات الموقع" ثم "الإشعارات" ثم "السماح"'
      ]
    },
    {
      id: 'chrome-desktop',
      title: 'Chrome على الكمبيوتر',
      icon: <Chrome className="text-blue-500" size={20} />,
      steps: [
        'اضغط على زر "تفعيل الإشعارات"',
        'ستظهر نافذة في أعلى يسار الشاشة',
        'اختر "السماح" (Allow)',
        'إذا اخترت "حظر" سابقاً: اضغط على 🔒 بجانب العنوان',
        'غيّر الإشعارات إلى "السماح"'
      ]
    },
    {
      id: 'safari',
      title: 'Safari على iPhone/iPad',
      icon: <Globe className="text-gray-500" size={20} />,
      steps: [
        'افتح "الإعدادات" على جهازك',
        'انزل إلى Safari',
        'اختر "الإشعارات"',
        'فعّل "السماح بالإشعارات"',
        'ثم ارجع للتطبيق واضغط "تفعيل"'
      ],
      note: 'ملاحظة: Safari يتطلب iOS 16.4 أو أحدث'
    },
    {
      id: 'android-app',
      title: 'كتطبيق على Android',
      icon: <Smartphone className="text-green-600" size={20} />,
      steps: [
        'افتح الموقع في Chrome',
        'اضغط على ⋮ (ثلاث نقاط) في الأعلى',
        'اختر "إضافة إلى الشاشة الرئيسية"',
        'الآن لديك التطبيق! افتحه',
        'فعّل الإشعارات من داخل التطبيق'
      ],
      note: 'كتطبيق ستحصل على تجربة أفضل وإشعارات موثوقة أكثر'
    }
  ];

  // حالة الإشعارات الحالية
  const getStatusInfo = () => {
    if (!isSupported) {
      return {
        icon: <XCircle className="text-red-500" size={24} />,
        title: 'المتصفح غير مدعوم',
        description: 'متصفحك لا يدعم إشعارات Push. جرب Chrome أو Firefox.',
        color: 'red'
      };
    }
    if (permission === 'denied') {
      return {
        icon: <XCircle className="text-red-500" size={24} />,
        title: 'الإشعارات محظورة',
        description: 'لقد حظرت الإشعارات سابقاً. اتبع الخطوات أدناه لتفعيلها من إعدادات المتصفح.',
        color: 'red'
      };
    }
    if (isSubscribed) {
      return {
        icon: <CheckCircle2 className="text-green-500" size={24} />,
        title: 'الإشعارات مفعّلة',
        description: 'ستتلقى إشعارات حتى عندما يكون التطبيق مغلقاً.',
        color: 'green'
      };
    }
    return {
      icon: <AlertCircle className="text-yellow-500" size={24} />,
      title: 'الإشعارات غير مفعّلة',
      description: 'فعّل الإشعارات للحصول على تنبيهات فورية.',
      color: 'yellow'
    };
  };

  const statusInfo = getStatusInfo();

  const toggleSection = (sectionId) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  return (
    <div className="space-y-4" data-testid="notification-guide">
      {/* الحالة الحالية */}
      <div className={`rounded-xl p-4 border-2 ${
        statusInfo.color === 'green' ? 'bg-green-50 border-green-200' :
        statusInfo.color === 'red' ? 'bg-red-50 border-red-200' :
        'bg-yellow-50 border-yellow-200'
      }`}>
        <div className="flex items-start gap-3">
          {statusInfo.icon}
          <div className="flex-1">
            <h3 className="font-bold text-gray-900">{statusInfo.title}</h3>
            <p className="text-sm text-gray-600 mt-1">{statusInfo.description}</p>
          </div>
          <PushNotificationButton userType={userType} />
        </div>
      </div>

      {/* فوائد الإشعارات */}
      <div className="bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] rounded-xl p-4 text-white">
        <div className="flex items-center gap-2 mb-3">
          <BellRing size={20} />
          <h3 className="font-bold">{userBenefits.title}</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {userBenefits.benefits.map((benefit, index) => (
            <div key={index} className="flex items-center gap-2 bg-white/20 rounded-lg p-2">
              <span className="text-lg">{benefit.icon}</span>
              <span className="text-xs font-medium">{benefit.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* زر التفعيل الكبير - إذا لم تكن مفعلة */}
      {!isSubscribed && permission !== 'denied' && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={subscribe}
          className="w-full bg-[#FF6B00] text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 shadow-lg"
          data-testid="enable-notifications-btn"
        >
          <Bell size={24} />
          تفعيل الإشعارات الآن
        </motion.button>
      )}

      {/* خطوات التفعيل حسب المتصفح */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-3 bg-gray-50 border-b">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Settings size={18} />
            خطوات التفعيل حسب المتصفح
          </h3>
        </div>
        
        <div className="divide-y">
          {browserGuides.map((guide) => (
            <div key={guide.id}>
              <button
                onClick={() => toggleSection(guide.id)}
                className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {guide.icon}
                  <span className="font-medium text-gray-900">{guide.title}</span>
                </div>
                {expandedSection === guide.id ? (
                  <ChevronUp size={20} className="text-gray-400" />
                ) : (
                  <ChevronDown size={20} className="text-gray-400" />
                )}
              </button>
              
              <AnimatePresence>
                {expandedSection === guide.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 bg-gray-50">
                      <ol className="space-y-2">
                        {guide.steps.map((step, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <span className="flex-shrink-0 w-5 h-5 bg-[#FF6B00] text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </span>
                            <span className="text-gray-700">{step}</span>
                          </li>
                        ))}
                      </ol>
                      {guide.note && (
                        <div className="mt-3 p-2 bg-blue-50 rounded-lg text-xs text-blue-700 flex items-start gap-2">
                          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                          {guide.note}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      {/* نصائح إضافية */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
        <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
          <Shield size={18} />
          نصائح مهمة
        </h4>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <Volume2 size={16} className="flex-shrink-0 mt-0.5" />
            <span>تأكد من عدم كتم صوت الجهاز لسماع الإشعارات</span>
          </li>
          <li className="flex items-start gap-2">
            <Vibrate size={16} className="flex-shrink-0 mt-0.5" />
            <span>فعّل الاهتزاز في إعدادات الجهاز للتنبيه الصامت</span>
          </li>
          <li className="flex items-start gap-2">
            <RefreshCw size={16} className="flex-shrink-0 mt-0.5" />
            <span>إذا لم تصلك إشعارات، جرب تسجيل الخروج والدخول مرة أخرى</span>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default NotificationGuide;
