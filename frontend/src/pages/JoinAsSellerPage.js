// /app/frontend/src/pages/JoinAsSellerPage.js
// صفحة "انضم كبائع" - صفحة تسويقية لجذب البائعين

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Store, TrendingUp, Truck, CreditCard, BarChart3, 
  Gift, Megaphone, Shield, CheckCircle, ArrowLeft,
  Users, Globe, Clock, Smartphone, ChevronRight
} from 'lucide-react';

const JoinAsSellerPage = () => {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);

  const benefits = [
    {
      icon: Store,
      title: 'متجر إلكتروني مجاني',
      description: 'افتح متجرك بدون أي رسوم اشتراك أو تكاليف خفية'
    },
    {
      icon: Users,
      title: 'آلاف العملاء',
      description: 'وصّل منتجاتك لعملاء في جميع المحافظات السورية'
    },
    {
      icon: Truck,
      title: 'توصيل متكامل',
      description: 'فريق توصيل محترف يوصل منتجاتك للعملاء'
    },
    {
      icon: CreditCard,
      title: 'دفع آمن',
      description: 'استلم أرباحك مباشرة على شام كاش'
    },
    {
      icon: BarChart3,
      title: 'تقارير مفصلة',
      description: 'تابع مبيعاتك وأداء متجرك بالأرقام'
    },
    {
      icon: Megaphone,
      title: 'إعلانات داخلية',
      description: 'روّج لمنتجاتك داخل التطبيق بسهولة'
    },
    {
      icon: Gift,
      title: 'كوبونات خصم',
      description: 'أنشئ عروض وكوبونات لجذب المزيد من العملاء'
    },
    {
      icon: Shield,
      title: 'حماية البائع',
      description: 'سياسات عادلة تحمي حقوقك كبائع'
    }
  ];

  const steps = [
    { number: '1', title: 'سجّل حسابك', description: 'أنشئ حساب بائع برقم هاتفك' },
    { number: '2', title: 'ارفع وثائقك', description: 'السجل التجاري أو أي وثيقة رسمية' },
    { number: '3', title: 'أضف منتجاتك', description: 'صور ووصف وسعر لكل منتج' },
    { number: '4', title: 'ابدأ البيع', description: 'استقبل الطلبات واكسب المال!' }
  ];

  const stats = [
    { value: '1000+', label: 'بائع نشط' },
    { value: '50,000+', label: 'عميل' },
    { value: '14', label: 'محافظة' },
    { value: '24/7', label: 'دعم فني' }
  ];

  const faqs = [
    {
      q: 'كم تكلفة فتح متجر؟',
      a: 'فتح المتجر مجاني تماماً! لا توجد رسوم اشتراك. ندفع عمولة صغيرة فقط عند إتمام البيع.'
    },
    {
      q: 'كيف أستلم أرباحي؟',
      a: 'يمكنك سحب أرباحك في أي وقت إلى حساب شام كاش الخاص بك. الحد الأدنى للسحب 50,000 ل.س.'
    },
    {
      q: 'من يتولى التوصيل؟',
      a: 'لدينا فريق توصيل محترف يستلم الطلبات من متجرك ويوصلها للعملاء. أنت فقط جهّز الطلب!'
    },
    {
      q: 'ماذا لو أرجع العميل المنتج؟',
      a: 'في حالة الإرجاع بسبب خطأ في التغليف أو المنتج، يتحمل البائع تكلفة الشحن. راجع سياسة الإرجاع للتفاصيل.'
    },
    {
      q: 'هل أحتاج سجل تجاري؟',
      a: 'نعم، نطلب وثيقة رسمية (سجل تجاري أو ما يعادله) للتحقق من هويتك كبائع موثوق.'
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-l from-[#FF6B00] to-orange-500 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-white/80 hover:text-white"
            >
              <ChevronRight size={20} />
              <span className="text-sm">الرئيسية</span>
            </button>
            <img src="/logo.png" alt="ترند سورية" className="h-8" onError={(e) => e.target.style.display = 'none'} />
          </div>
        </div>
        
        {/* Hero Section */}
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Store size={40} className="text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              افتح متجرك الإلكتروني مجاناً
            </h1>
            <p className="text-lg text-white/90 mb-8 max-w-xl mx-auto">
              انضم لآلاف البائعين على ترند سورية ووصّل منتجاتك لعملاء في كل سوريا
            </p>
            <Link
              to="/register?type=seller"
              className="inline-flex items-center gap-2 bg-white text-[#FF6B00] font-bold px-8 py-4 rounded-full text-lg hover:bg-orange-50 transition-colors shadow-lg"
            >
              سجّل الآن مجاناً
              <ArrowLeft size={20} />
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="grid grid-cols-4 gap-4">
            {stats.map((stat, i) => (
              <motion.div
                key={`stat-${stat.label}-${i}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <p className="text-2xl md:text-3xl font-bold text-[#FF6B00]">{stat.value}</p>
                <p className="text-xs text-gray-600">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            لماذا ترند سورية؟
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {benefits.map((benefit, i) => (
              <motion.div
                key={`benefit-${benefit.title}-${i}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-xl p-4 border border-gray-200 hover:border-[#FF6B00] hover:shadow-md transition-all"
              >
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
                  <benefit.icon size={20} className="text-[#FF6B00]" />
                </div>
                <h3 className="font-bold text-sm text-gray-900 mb-1">{benefit.title}</h3>
                <p className="text-xs text-gray-500">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            كيف تبدأ؟
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {steps.map((step, i) => (
              <motion.div
                key={`step-${step.number}-${i}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative"
              >
                <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                  <div className="w-10 h-10 bg-[#FF6B00] text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">
                    {step.number}
                  </div>
                  <h3 className="font-bold text-sm text-gray-900 mb-1">{step.title}</h3>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -left-2 w-4 h-0.5 bg-gray-300" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="py-12">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            أسئلة شائعة
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={`faq-${faq.q.slice(0, 20)}-${i}`}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full p-4 text-right flex items-center justify-between"
                >
                  <span className="font-bold text-sm text-gray-900">{faq.q}</span>
                  <ChevronRight 
                    size={18} 
                    className={`text-gray-400 transition-transform ${openFaq === i ? '-rotate-90' : ''}`} 
                  />
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4">
                    <p className="text-sm text-gray-600">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-l from-[#FF6B00] to-orange-500 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            جاهز لتبدأ؟
          </h2>
          <p className="text-white/90 mb-6">
            انضم الآن وابدأ البيع خلال دقائق!
          </p>
          <Link
            to="/register?type=seller"
            className="inline-flex items-center gap-2 bg-white text-[#FF6B00] font-bold px-8 py-4 rounded-full text-lg hover:bg-orange-50 transition-colors shadow-lg"
          >
            سجّل كبائع الآن
            <ArrowLeft size={20} />
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-900 py-6">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-gray-400 text-sm">
            © 2024 ترند سورية - جميع الحقوق محفوظة
          </p>
        </div>
      </div>
    </div>
  );
};

export default JoinAsSellerPage;
