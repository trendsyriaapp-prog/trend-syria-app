import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowRight, Package, Shield, CheckCircle, AlertTriangle,
  Box, Layers, Tag, Printer, ChevronDown, ChevronUp
} from 'lucide-react';

const PackagingGuidePage = () => {
  const navigate = useNavigate();
  const [openSections, setOpenSections] = useState({ basic: true });

  const toggleSection = (key) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowRight size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Package className="text-[#FF6B00]" size={20} />
            <h1 className="font-bold text-gray-900">إرشادات التغليف</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Intro */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-[#FF6B00] to-orange-500 text-white rounded-2xl p-4"
        >
          <h2 className="font-bold text-lg mb-2">📦 التغليف الجيد = عميل سعيد</h2>
          <p className="text-sm opacity-90">
            التغليف الصحيح يحمي منتجاتك ويضمن وصولها سليمة للعميل. اتبع هذه الإرشادات لتجنب المشاكل والإرجاعات.
          </p>
        </motion.div>

        {/* Basic Packaging Rules */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl border border-gray-200 overflow-hidden"
        >
          <button
            onClick={() => toggleSection('basic')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Box size={18} className="text-blue-600" />
              </div>
              <span className="font-bold text-gray-900">قواعد التغليف الأساسية</span>
            </div>
            {openSections.basic ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          {openSections.basic && (
            <div className="px-4 pb-4 space-y-3">
              {[
                { icon: '1️⃣', title: 'اختر الصندوق المناسب', desc: 'حجم الصندوق يجب أن يناسب المنتج - لا كبير جداً ولا صغير' },
                { icon: '2️⃣', title: 'استخدم مواد الحماية', desc: 'ورق فقاعات، ورق تغليف، أو فوم لحماية المنتج من الصدمات' },
                { icon: '3️⃣', title: 'املأ الفراغات', desc: 'لا تترك فراغات داخل الصندوق - املأها بورق أو فوم' },
                { icon: '4️⃣', title: 'أغلق بإحكام', desc: 'استخدم شريط لاصق قوي وأغلق جميع الجوانب' },
                { icon: '5️⃣', title: 'ألصق ملصق الطلب', desc: 'ألصق ملصق الطلب في مكان واضح على الصندوق' }
              ].map((item) => (
                <div key={`step-${item.icon}`} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                  <span className="text-xl">{item.icon}</span>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{item.title}</p>
                    <p className="text-gray-600 text-xs">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Category Specific */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl border border-gray-200 overflow-hidden"
        >
          <button
            onClick={() => toggleSection('categories')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Layers size={18} className="text-purple-600" />
              </div>
              <span className="font-bold text-gray-900">تغليف حسب نوع المنتج</span>
            </div>
            {openSections.categories ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          {openSections.categories && (
            <div className="px-4 pb-4 space-y-3">
              {/* Electronics */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-bold text-blue-800 mb-2">📱 الإلكترونيات</h4>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• استخدم صندوق مقوى قوي</li>
                  <li>• لف المنتج بورق فقاعات طبقتين على الأقل</li>
                  <li>• ضع علامة "قابل للكسر" على الصندوق</li>
                  <li>• تأكد من إزالة البطارية إن وجدت</li>
                </ul>
              </div>

              {/* Clothes */}
              <div className="p-3 bg-pink-50 rounded-lg border border-pink-200">
                <h4 className="font-bold text-pink-800 mb-2">👕 الملابس</h4>
                <ul className="text-xs text-pink-700 space-y-1">
                  <li>• اطوِ الملابس بعناية</li>
                  <li>• استخدم كيس بلاستيكي شفاف للحماية من الرطوبة</li>
                  <li>• لا تضغط على الملابس كثيراً</li>
                  <li>• أبقِ البطاقات والملصقات مرئية</li>
                </ul>
              </div>

              {/* Fragile */}
              <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                <h4 className="font-bold text-red-800 mb-2">🏺 المنتجات القابلة للكسر</h4>
                <ul className="text-xs text-red-700 space-y-1">
                  <li>• استخدم صندوق مزدوج (صندوق داخل صندوق)</li>
                  <li>• لف كل قطعة على حدة بورق فقاعات</li>
                  <li>• ضع 5 سم من الحشو في القاع والأعلى</li>
                  <li>• اكتب "قابل للكسر - تعامل بحذر" بخط واضح</li>
                </ul>
              </div>

              {/* Cosmetics */}
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-bold text-green-800 mb-2">💄 مستحضرات التجميل</h4>
                <ul className="text-xs text-green-700 space-y-1">
                  <li>• تأكد من إغلاق الأغطية بإحكام</li>
                  <li>• ضع المنتجات السائلة في كيس بلاستيكي</li>
                  <li>• استخدم فواصل بين المنتجات</li>
                  <li>• لا تعرض للحرارة الشديدة</li>
                </ul>
              </div>
            </div>
          )}
        </motion.div>

        {/* Order Label */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl border border-gray-200 overflow-hidden"
        >
          <button
            onClick={() => toggleSection('label')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Tag size={18} className="text-[#FF6B00]" />
              </div>
              <span className="font-bold text-gray-900">ملصق الطلب</span>
            </div>
            {openSections.label ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
          {openSections.label && (
            <div className="px-4 pb-4">
              <div className="bg-gray-50 rounded-lg p-4 mb-3">
                <p className="text-sm text-gray-700 mb-3">
                  يمكنك طباعة ملصق الطلب مباشرة من صفحة الطلبات. الملصق يحتوي على:
                </p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>✓ رقم الطلب</li>
                  <li>✓ اسم العميل</li>
                  <li>✓ رقم الهاتف</li>
                  <li>✓ عنوان التوصيل</li>
                  <li>✓ عدد القطع</li>
                  <li>✓ باركود للمسح</li>
                </ul>
              </div>
              <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <Printer size={18} className="text-[#FF6B00]" />
                <p className="text-sm text-orange-700">
                  اضغط على زر "طباعة الملصق" في صفحة تفاصيل الطلب
                </p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Warnings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-red-50 border border-red-200 rounded-xl p-4"
        >
          <h3 className="font-bold text-red-800 mb-3 flex items-center gap-2">
            <AlertTriangle size={18} />
            تجنب هذه الأخطاء
          </h3>
          <div className="space-y-2">
            {[
              'استخدام صناديق تالفة أو مستعملة بحالة سيئة',
              'عدم ملء الفراغات داخل الصندوق',
              'التغليف بشكل فضفاض يسمح بحركة المنتج',
              'عدم وضع ملصق الطلب أو وضعه في مكان مخفي',
              'استخدام شريط لاصق ضعيف',
              'إرسال منتج مختلف عن المطلوب'
            ].map((item) => (
              <div key={`mistake-${item.substring(0, 15)}`} className="flex items-center gap-2 text-sm text-red-700">
                <span className="text-red-500">✕</span>
                {item}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Seller Responsibility Warning */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-orange-100 border-2 border-orange-400 rounded-xl p-4"
        >
          <h3 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
            <span className="text-xl">💰</span>
            تنبيه مهم - المسؤولية المالية
          </h3>
          <p className="text-sm text-orange-800 leading-relaxed">
            <strong>إذا وصل المنتج تالفاً بسبب خطأ في التغليف</strong> وطلب العميل استبدال أو استرجاع، 
            ستكون <strong>تكلفة الشحن على حسابك</strong> (البائع) وليس العميل.
          </p>
          <p className="text-xs text-orange-700 mt-2">
            راجع سياسة الإرجاع للمزيد من التفاصيل.
          </p>
        </motion.div>

        {/* Success Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-green-50 border border-green-200 rounded-xl p-4"
        >
          <h3 className="font-bold text-green-800 mb-3 flex items-center gap-2">
            <CheckCircle size={18} />
            نصائح للتميز
          </h3>
          <div className="space-y-2">
            {[
              'أضف بطاقة شكر صغيرة للعميل',
              'استخدم تغليف يحمل شعار متجرك',
              'أرفق فاتورة مطبوعة داخل الصندوق',
              'صوّر المنتج قبل التغليف كدليل',
              'تأكد من نظافة الصندوق من الخارج'
            ].map((item) => (
              <div key={`tip-${item.substring(0, 15)}`} className="flex items-center gap-2 text-sm text-green-700">
                <span className="text-green-500">✓</span>
                {item}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Checklist */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl border-2 border-[#FF6B00] p-4"
        >
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Shield size={18} className="text-[#FF6B00]" />
            قائمة الفحص قبل التسليم
          </h3>
          <div className="space-y-2">
            {[
              'المنتج مطابق للطلب (النوع، اللون، المقاس)',
              'المنتج سليم وبدون عيوب',
              'التغليف محكم وآمن',
              'ملصق الطلب واضح ومقروء',
              'الصندوق نظيف ومرتب',
              'جميع الملحقات موجودة'
            ].map((item) => (
              <div key={`check-${item.substring(0, 15)}`} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <div className="w-5 h-5 border-2 border-gray-300 rounded flex-shrink-0"></div>
                <span className="text-sm text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PackagingGuidePage;
