import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowRight, Shield, FileText, RefreshCcw, 
  ChevronDown, ChevronUp, Phone, Mail, MapPin,
  Lock, Eye, Database, Users, Truck, CreditCard, Clock
} from 'lucide-react';

// ============== Privacy Policy Page ==============
export const PrivacyPolicyPage = () => {
  const navigate = useNavigate();
  const [openSections, setOpenSections] = useState({});

  const toggleSection = (key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const sections = [
    {
      key: 'collect',
      icon: Database,
      title: 'المعلومات التي نجمعها',
      content: `نقوم بجمع المعلومات التالية:

• **المعلومات الشخصية:** الاسم الكامل، رقم الهاتف، عنوان التوصيل، المدينة.
• **معلومات الحساب:** كلمة المرور المشفرة، نوع الحساب (مشتري/بائع/توصيل).
• **معلومات المعاملات:** سجل الطلبات، المدفوعات، المحفظة الإلكترونية.
• **معلومات الجهاز:** نوع المتصفح، عنوان IP، معلومات الجهاز لتحسين الخدمة.
• **وثائق البائعين وموظفي التوصيل:** صور الهوية، السجل التجاري (للتحقق فقط).`
    },
    {
      key: 'use',
      icon: Eye,
      title: 'كيف نستخدم معلوماتك',
      content: `نستخدم معلوماتك للأغراض التالية:

• معالجة وتوصيل طلباتك.
• التواصل معك بخصوص طلباتك وحسابك.
• تحسين خدماتنا وتجربة المستخدم.
• التحقق من هوية البائعين وموظفي التوصيل.
• منع الاحتيال وضمان أمان المنصة.
• إرسال إشعارات مهمة عن طلباتك.
• الامتثال للمتطلبات القانونية.`
    },
    {
      key: 'share',
      icon: Users,
      title: 'مشاركة المعلومات',
      content: `نشارك معلوماتك في الحالات التالية فقط:

• **مع البائعين:** اسمك وعنوان التوصيل لتجهيز طلبك.
• **مع موظفي التوصيل:** اسمك وعنوانك ورقم هاتفك لتوصيل الطلب.
• **مع مزودي خدمات الدفع:** لمعالجة المدفوعات بشكل آمن.
• **للجهات القانونية:** عند الطلب بموجب القانون.

**لا نبيع معلوماتك الشخصية لأي طرف ثالث.**`
    },
    {
      key: 'protect',
      icon: Lock,
      title: 'حماية معلوماتك',
      content: `نتخذ إجراءات أمنية صارمة لحماية بياناتك:

• تشفير كلمات المرور باستخدام خوارزميات متقدمة.
• اتصالات مشفرة (HTTPS) لجميع البيانات.
• وصول محدود للموظفين المصرح لهم فقط.
• مراجعات أمنية دورية.
• نسخ احتياطية آمنة للبيانات.`
    },
    {
      key: 'rights',
      icon: Shield,
      title: 'حقوقك',
      content: `لديك الحقوق التالية:

• **الوصول:** طلب نسخة من بياناتك الشخصية.
• **التصحيح:** تعديل معلوماتك غير الدقيقة.
• **الحذف:** طلب حذف حسابك وبياناتك.
• **الاعتراض:** رفض استخدام بياناتك لأغراض تسويقية.

للممارسة أي من هذه الحقوق، تواصل معنا عبر البريد الإلكتروني.`
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowRight size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="text-[#FF6B00]" size={20} />
            <h1 className="font-bold text-gray-900">سياسة الخصوصية</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-gradient-to-r from-[#FF6B00] via-orange-500 to-amber-500 text-white p-5 mb-4 overflow-hidden"
        >
          {/* خلفية مزخرفة */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-2 right-8 text-5xl">🔒</div>
            <div className="absolute bottom-2 left-10 text-4xl">🛡️</div>
            <div className="absolute top-1/2 left-1/3 text-3xl">✨</div>
          </div>
          
          <div className="relative max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Shield size={24} />
              </div>
              <div>
                <h2 className="font-bold text-lg">خصوصيتك تهمنا</h2>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">محمية 100%</span>
              </div>
            </div>
            <p className="text-sm opacity-90 mb-2">
              نلتزم بحماية خصوصيتك وبياناتك الشخصية بأعلى معايير الأمان العالمية.
            </p>
            <div className="flex items-center gap-2 text-xs opacity-75">
              <Clock size={12} />
              <span>آخر تحديث: ديسمبر 2025</span>
            </div>
          </div>
        </motion.div>

        {/* Sections */}
        <div className="space-y-3 px-4">
          {sections.map((section, index) => (
            <motion.div
              key={section.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => toggleSection(section.key)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#FF6B00]/10 rounded-full flex items-center justify-center">
                    <section.icon size={18} className="text-[#FF6B00]" />
                  </div>
                  <span className="font-bold text-gray-900">{section.title}</span>
                </div>
                {openSections[section.key] ? (
                  <ChevronUp size={20} className="text-gray-400" />
                ) : (
                  <ChevronDown size={20} className="text-gray-400" />
                )}
              </button>
              {openSections[section.key] && (
                <div className="px-4 pb-4">
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                    {section.content}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl border border-gray-200 p-4 mt-4"
        >
          <h3 className="font-bold text-gray-900 mb-3">تواصل معنا</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p className="flex items-center gap-2">
              <Mail size={16} className="text-[#FF6B00]" />
              trendsyria.app@gmail.com
            </p>
            <p className="flex items-center gap-2">
              <MapPin size={16} className="text-[#FF6B00]" />
              حلب، سوريا
            </p>
            <p className="flex items-center gap-2">
              <Lock size={16} className="text-[#FF6B00]" />
              ساعات الدعم: 10:00 صباحاً - 11:00 مساءً
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// ============== Terms of Service Page ==============
export const TermsOfServicePage = () => {
  const navigate = useNavigate();
  const [openSections, setOpenSections] = useState({});

  const toggleSection = (key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const sections = [
    {
      key: 'acceptance',
      title: '1. قبول الشروط',
      content: `باستخدامك لمنصة "ترند سورية"، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي من هذه الشروط، يرجى عدم استخدام المنصة.

يجب أن يكون عمرك 18 عاماً أو أكثر لاستخدام هذه المنصة، أو أن تحصل على موافقة ولي أمرك.`
    },
    {
      key: 'accounts',
      title: '2. الحسابات والتسجيل',
      content: `**للمشترين:**
• يجب تقديم معلومات صحيحة ودقيقة عند التسجيل.
• أنت مسؤول عن الحفاظ على سرية كلمة مرورك.
• يجب إبلاغنا فوراً عن أي استخدام غير مصرح به لحسابك.

**للبائعين:**
• يجب تقديم وثائق رسمية صالحة (هوية، سجل تجاري).
• يجب انتظار موافقة الإدارة قبل البدء بالبيع.
• أنت مسؤول عن دقة معلومات منتجاتك.

**لموظفي التوصيل:**
• يجب تقديم وثائق رسمية صالحة.
• يجب الالتزام بأوقات العمل المحددة.
• أنت مسؤول عن سلامة الطلبات حتى التسليم.`
    },
    {
      key: 'products',
      title: '3. المنتجات والمحتوى',
      content: `**المنتجات المسموحة:**
• منتجات قانونية ومطابقة للمواصفات.
• منتجات جديدة أو مستعملة بحالة جيدة مع الإفصاح.
• منتجات لها مصدر معروف.

**المنتجات الممنوعة:**
• المنتجات المقلدة أو المزيفة.
• المواد الخطرة أو غير القانونية.
• المنتجات التي تنتهك حقوق الملكية الفكرية.
• الأسلحة والمتفجرات.
• المواد المخدرة.

**نحتفظ بالحق في:**
• رفض أو إزالة أي منتج دون إبداء الأسباب.
• تعليق أو إنهاء حسابات البائعين المخالفين.`
    },
    {
      key: 'orders',
      title: '4. الطلبات والدفع',
      content: `**إنشاء الطلبات:**
• الأسعار المعروضة تشمل جميع الرسوم باستثناء التوصيل.
• يعتبر الطلب ملزماً بعد تأكيد الدفع.
• نحتفظ بالحق في إلغاء الطلبات المشبوهة.

**الدفع:**
• نقبل الدفع عبر شام كاش والدفع عند الاستلام.
• يتم خصم عمولة المنصة من مبيعات البائع.
• يتم تحويل أرباح البائعين للمحفظة الإلكترونية.

**العمولات:**
• تتراوح العمولات بين 12% - 21% حسب فئة المنتج.
• يمكن للإدارة تعديل نسب العمولات بإشعار مسبق.`
    },
    {
      key: 'delivery',
      title: '5. التوصيل',
      content: `**مسؤوليات المنصة:**
• توفير موظفي توصيل معتمدين.
• متابعة حالة الطلبات.
• حل النزاعات بين الأطراف.

**مسؤوليات موظف التوصيل:**
• استلام الطلبات من البائعين في الوقت المحدد.
• توصيل الطلبات بحالة سليمة.
• الالتزام بأوقات العمل (8 صباحاً - 6 مساءً).

**رسوم التوصيل:**
• التوصيل داخل نفس المحافظة: حسب التعرفة المعتمدة.
• التوصيل بين المحافظات: رسوم إضافية.
• شحن مجاني: عند تجاوز الحد الأدنى للطلب في نفس المحافظة.`
    },
    {
      key: 'liability',
      title: '6. حدود المسؤولية',
      content: `**المنصة غير مسؤولة عن:**
• جودة المنتجات المباعة من قبل البائعين.
• التأخير الناتج عن ظروف خارجة عن السيطرة.
• الأضرار غير المباشرة أو التبعية.
• المحتوى المنشور من قبل المستخدمين.

**المنصة مسؤولة عن:**
• توفير بيئة آمنة للتعاملات.
• التحقق من هوية البائعين وموظفي التوصيل.
• معالجة الشكاوى والنزاعات.`
    },
    {
      key: 'termination',
      title: '7. إنهاء الخدمة',
      content: `يحق لنا تعليق أو إنهاء حسابك في الحالات التالية:

• انتهاك شروط الاستخدام.
• تقديم معلومات خاطئة أو مضللة.
• السلوك الاحتيالي أو المسيء.
• عدم النشاط لفترة طويلة.

**عند الإنهاء:**
• يجب تسوية جميع المعاملات المعلقة.
• يحق لك سحب رصيد محفظتك.
• قد نحتفظ ببعض البيانات للأغراض القانونية.`
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowRight size={20} />
          </button>
          <div className="flex items-center gap-2">
            <FileText className="text-[#FF6B00]" size={20} />
            <h1 className="font-bold text-gray-900">شروط الاستخدام</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 text-white p-5 mb-4 overflow-hidden"
        >
          {/* خلفية مزخرفة */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-2 right-8 text-5xl">📋</div>
            <div className="absolute bottom-2 left-10 text-4xl">⚖️</div>
            <div className="absolute top-1/2 left-1/4 text-3xl">📜</div>
          </div>
          
          <div className="relative max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <FileText size={24} />
              </div>
              <div>
                <h2 className="font-bold text-lg">شروط وأحكام الاستخدام</h2>
                <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">اقرأ بعناية</span>
              </div>
            </div>
            <p className="text-sm opacity-90 mb-2">
              تحكم هذه الشروط استخدامك لمنصة "ترند سورية" وتحدد حقوقك وواجباتك.
            </p>
            <div className="flex items-center gap-2 text-xs opacity-75">
              <Clock size={12} />
              <span>آخر تحديث: ديسمبر 2025</span>
            </div>
          </div>
        </motion.div>

        {/* Sections */}
        <div className="space-y-3 px-4">
          {sections.map((section, index) => (
            <motion.div
              key={section.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => toggleSection(section.key)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
              >
                <span className="font-bold text-gray-900 text-right">{section.title}</span>
                {openSections[section.key] ? (
                  <ChevronUp size={20} className="text-gray-400" />
                ) : (
                  <ChevronDown size={20} className="text-gray-400" />
                )}
              </button>
              {openSections[section.key] && (
                <div className="px-4 pb-4">
                  <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                    {section.content}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============== Return Policy Page ==============
export const ReturnPolicyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowRight size={20} />
          </button>
          <div className="flex items-center gap-2">
            <RefreshCcw className="text-[#FF6B00]" size={20} />
            <h1 className="font-bold text-gray-900">سياسة الإرجاع والاستبدال</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto space-y-4">
        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 text-white p-5 overflow-hidden"
        >
          {/* خلفية مزخرفة */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-2 right-8 text-5xl">↩️</div>
            <div className="absolute bottom-2 left-10 text-4xl">📦</div>
            <div className="absolute top-1/2 left-1/3 text-3xl">✅</div>
          </div>
          
          <div className="relative max-w-2xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <RefreshCcw size={24} />
              </div>
              <div>
                <h2 className="font-bold text-lg">الإرجاع عند التسليم فقط</h2>
                <span className="bg-yellow-400 text-gray-900 px-2 py-0.5 rounded-full text-[10px] font-bold">مهم جداً</span>
              </div>
            </div>
            <p className="text-sm opacity-90">
              يجب فحص المنتج أمام موظف التوصيل عند الاستلام. لا يمكن الإرجاع بعد التوقيع!
            </p>
          </div>
        </motion.div>

        {/* Important Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative bg-red-50 border-2 border-red-300 p-4 mx-4 overflow-hidden"
        >
          <div className="absolute top-2 left-2 text-4xl opacity-10">⚠️</div>
          <h3 className="font-bold text-red-800 mb-2 flex items-center gap-2">
            <span className="text-xl">⚠️</span>
            تنبيه هام
          </h3>
          <p className="text-red-700 text-sm leading-relaxed font-medium">
            بمجرد استلام المنتج والتوقيع على التسليم، <strong>لا يمكن إرجاع المنتج</strong>. يرجى فحص المنتج جيداً أمام موظف التوصيل قبل التوقيع.
          </p>
        </motion.div>

        {/* Return Period */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-gray-200 p-4"
        >
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
              <Truck size={16} className="text-[#FF6B00]" />
            </div>
            سياسة الإرجاع
          </h3>
          <div className="space-y-3 text-sm text-gray-700">
            <p>• الإرجاع متاح <strong>فقط عند لحظة التسليم</strong> وأمام موظف التوصيل.</p>
            <p>• يجب فحص المنتج والتأكد من سلامته قبل التوقيع على الاستلام.</p>
            <p>• بعد التوقيع على الاستلام، يعتبر البيع نهائياً ولا يمكن الإرجاع.</p>
            <p>• في حالة وجود عيب مصنعي، تواصل معنا خلال 24 ساعة مع صور توضيحية.</p>
          </div>
        </motion.div>

        {/* How to Return */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-gray-200 p-4"
        >
          <h3 className="font-bold text-gray-900 mb-4">كيفية الإرجاع عند التسليم</h3>
          <div className="space-y-4">
            {[
              { step: 1, title: 'فحص المنتج', desc: 'افحص المنتج جيداً أمام موظف التوصيل قبل التوقيع' },
              { step: 2, title: 'التأكد من المواصفات', desc: 'تأكد أن المنتج مطابق لما طلبته (اللون، المقاس، الكمية)' },
              { step: 3, title: 'إعلام الموظف', desc: 'إذا كان هناك مشكلة، أخبر موظف التوصيل فوراً قبل التوقيع' },
              { step: 4, title: 'رفض الاستلام', desc: 'يحق لك رفض استلام المنتج إذا لم يكن مطابقاً' },
              { step: 5, title: 'استرداد المبلغ', desc: 'سيتم إضافة المبلغ لمحفظتك خلال 24-48 ساعة' }
            ].map((item) => (
              <div key={item.step} className="flex gap-3">
                <div className="w-8 h-8 bg-[#FF6B00] text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">
                  {item.step}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">{item.title}</p>
                  <p className="text-gray-600 text-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Conditions for Return */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl border border-gray-200 p-4"
        >
          <h3 className="font-bold text-gray-900 mb-3">حالات يمكن فيها الإرجاع</h3>
          <div className="space-y-3">
            {[
              'المنتج تالف أو مكسور عند الاستلام',
              'المنتج مختلف عن الصور أو الوصف',
              'المقاس أو اللون خاطئ',
              'نقص في الكمية المطلوبة',
              'المنتج منتهي الصلاحية (للمنتجات الغذائية)'
            ].map((condition, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-green-600 text-xs">✓</span>
                </div>
                {condition}
              </div>
            ))}
          </div>
        </motion.div>

        {/* No Return Cases */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-red-50 border border-red-200 rounded-xl p-4"
        >
          <h3 className="font-bold text-red-800 mb-3">حالات لا يمكن فيها الإرجاع</h3>
          <div className="space-y-2">
            {[
              'بعد التوقيع على استلام الطلب',
              'تغيير رأي العميل بعد الاستلام',
              'المنتجات المستخدمة أو المفتوحة',
              'الملابس الداخلية ومنتجات العناية الشخصية',
              'المنتجات المصنوعة حسب الطلب'
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-red-700">
                <span className="text-red-500">✕</span>
                {item}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Packaging Errors - Seller Responsibility */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-orange-50 border-2 border-orange-300 rounded-xl p-4"
        >
          <h3 className="font-bold text-orange-800 mb-3 flex items-center gap-2">
            <span className="text-xl">📦</span>
            أخطاء التغليف - مسؤولية البائع
          </h3>
          <p className="text-sm text-orange-700 leading-relaxed mb-3">
            إذا وصل المنتج تالفاً بسبب <strong>خطأ في التغليف من البائع</strong>، فإن تكلفة شحن الاستبدال أو الاسترجاع تكون <strong>على حساب البائع</strong> وليس العميل.
          </p>
          <div className="bg-white rounded-lg p-3 border border-orange-200">
            <p className="text-xs font-bold text-orange-800 mb-2">أخطاء التغليف التي يتحمل البائع تكلفتها:</p>
            <div className="grid grid-cols-2 gap-2 text-xs text-orange-700">
              <div className="flex items-center gap-1">
                <span className="text-red-500">✕</span>
                <span>تغليف ضعيف أو غير كافٍ</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-red-500">✕</span>
                <span>عدم استخدام فلين للمنتجات القابلة للكسر</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-red-500">✕</span>
                <span>صندوق أكبر/أصغر من المنتج</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-red-500">✕</span>
                <span>عدم وضع علامة "قابل للكسر"</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-red-500">✕</span>
                <span>إهمال حماية المنتج من الرطوبة</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-red-500">✕</span>
                <span>تغليف ملابس بدون كيس بلاستيكي</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Manufacturing Defects */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-yellow-50 border border-yellow-200 rounded-xl p-4"
        >
          <h3 className="font-bold text-yellow-800 mb-3">العيوب المصنعية</h3>
          <p className="text-sm text-yellow-700 leading-relaxed">
            إذا اكتشفت عيباً مصنعياً بعد الاستلام، تواصل معنا خلال <strong>24 ساعة</strong> مع إرفاق صور واضحة للعيب. سنقوم بمراجعة طلبك والرد عليك خلال 48 ساعة.
          </p>
        </motion.div>

        {/* Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white rounded-xl border border-gray-200 p-4"
        >
          <h3 className="font-bold text-gray-900 mb-3">تواصل معنا</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p className="flex items-center gap-2">
              <Mail size={16} className="text-[#FF6B00]" />
              trendsyria.app@gmail.com
            </p>
            <p className="flex items-center gap-2">
              <MapPin size={16} className="text-[#FF6B00]" />
              حلب، سوريا
            </p>
            <p className="flex items-center gap-2">
              <Phone size={16} className="text-[#FF6B00]" />
              ساعات الدعم: 10:00 صباحاً - 11:00 مساءً
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
