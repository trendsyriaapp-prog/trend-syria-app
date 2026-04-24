// /app/frontend/src/pages/JoinAsDeliveryPage.js
// صفحة "وظائف التوصيل" - صفحة تسويقية لجذب موظفي التوصيل

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Truck, DollarSign, Clock, Smartphone, MapPin,
  Star, Shield, Users, CheckCircle, ArrowLeft,
  Calendar, Wallet, ChevronRight, Phone
} from 'lucide-react';

const JoinAsDeliveryPage = () => {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);

  const benefits = [
    {
      icon: Clock,
      title: 'مرونة كاملة',
      description: 'اشتغل الوقت اللي يناسبك - صباحاً أو مساءً'
    },
    {
      icon: DollarSign,
      title: 'دخل ممتاز',
      description: 'أجرة توصيل جيدة + مكافآت على الأداء'
    },
    {
      icon: Wallet,
      title: 'سحب فوري',
      description: 'اسحب أرباحك يومياً لحساب شام كاش'
    },
    {
      icon: Smartphone,
      title: 'تطبيق سهل',
      description: 'كل شي من التطبيق - استلم، وصّل، اقبض'
    },
    {
      icon: MapPin,
      title: 'اختر منطقتك',
      description: 'اشتغل في المنطقة اللي تعرفها'
    },
    {
      icon: Star,
      title: 'نظام تقييم عادل',
      description: 'تقييمك يعكس جودة عملك الحقيقية'
    },
    {
      icon: Shield,
      title: 'دعم متواصل',
      description: 'فريق دعم جاهز لمساعدتك 24/7'
    },
    {
      icon: Users,
      title: 'مجتمع السائقين',
      description: 'انضم لمجتمع من الزملاء الناجحين'
    }
  ];

  const requirements = [
    { icon: CheckCircle, text: 'عمر 18 سنة أو أكثر' },
    { icon: CheckCircle, text: 'هوية سورية سارية المفعول' },
    { icon: CheckCircle, text: 'دراجة نارية (بنزين أو كهرباء)' },
    { icon: CheckCircle, text: 'هاتف ذكي مع إنترنت' },
    { icon: CheckCircle, text: 'معرفة جيدة بالمنطقة' }
  ];

  const earnings = [
    { label: 'توصيل نفس المحافظة', value: '5,000 - 10,000 ل.س' },
    { label: 'توصيل بين المحافظات', value: '15,000 - 25,000 ل.س' },
    { label: 'مكافأة 10 طلبات/يوم', value: '20,000 ل.س إضافية' },
    { label: 'مكافأة تقييم 5 نجوم', value: '5,000 ل.س/أسبوع' }
  ];

  const steps = [
    { number: '1', title: 'سجّل حسابك', description: 'أنشئ حساب توصيل برقم هاتفك' },
    { number: '2', title: 'ارفع وثائقك', description: 'الهوية + صورة شخصية + صورة الدراجة' },
    { number: '3', title: 'انتظر الموافقة', description: 'نراجع وثائقك خلال 24 ساعة' },
    { number: '4', title: 'ابدأ العمل', description: 'استقبل الطلبات واكسب المال!' }
  ];

  const faqs = [
    {
      q: 'كم أقدر أكسب يومياً؟',
      a: 'يعتمد على عدد الطلبات. معدل الدخل 50,000 - 100,000 ل.س يومياً لموظف نشط.'
    },
    {
      q: 'متى أقدر أسحب أرباحي؟',
      a: 'يمكنك طلب السحب في أي وقت. الحد الأدنى 25,000 ل.س والتحويل لشام كاش.'
    },
    {
      q: 'هل أحتاج رخصة قيادة؟',
      a: 'لا، لا نطلب رخصة قيادة. نحتاج فقط صورة الهوية وصورة شخصية وصورة الدراجة.'
    },
    {
      q: 'هل أختار الطلبات أم تُفرض علي؟',
      a: 'أنت حر! ترى الطلبات المتاحة وتختار اللي يناسبك من حيث المسافة والوقت.'
    },
    {
      q: 'ما هي أوقات العمل؟',
      a: 'أوقات استلام الطلبات من 8 صباحاً حتى 6 مساءً. يمكنك العمل الوقت الذي يناسبك ضمن هذه الفترة.'
    }
  ];

  const testimonials = [
    {
      name: 'أحمد م.',
      city: 'دمشق',
      text: 'أفضل شغل بدوام جزئي! أشتغل 4 ساعات يومياً وأكسب دخل ممتاز.',
      rating: 5
    },
    {
      name: 'محمد ع.',
      city: 'حلب',
      text: 'التطبيق سهل جداً والدعم الفني ممتاز. أنصح الجميع بالانضمام.',
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-gradient-to-l from-green-600 to-emerald-500 text-white">
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
              <Truck size={40} className="text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              انضم لفريق التوصيل
            </h1>
            <p className="text-lg text-white/90 mb-8 max-w-xl mx-auto">
              اشتغل بوقتك واكسب دخل ممتاز مع ترند سورية
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-white text-green-600 font-bold px-8 py-4 rounded-full text-lg hover:bg-green-50 transition-colors shadow-lg"
            >
              سجّل الآن
              <ArrowLeft size={20} />
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Earnings Preview */}
      <div className="bg-gradient-to-l from-yellow-500 to-amber-500 py-6">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-center gap-4 text-white">
            <DollarSign size={24} />
            <span className="text-lg font-bold">متوسط الدخل اليومي: 50,000 - 100,000 ل.س</span>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            لماذا تعمل معنا؟
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {benefits.map((benefit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-xl p-4 border border-gray-200 hover:border-green-500 hover:shadow-md transition-all"
              >
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
                  <benefit.icon size={20} className="text-green-600" />
                </div>
                <h3 className="font-bold text-sm text-gray-900 mb-1">{benefit.title}</h3>
                <p className="text-xs text-gray-500">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Earnings Table */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            💰 كم أقدر أكسب؟
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {earnings.map((item, i) => (
              <div 
                key={i}
                className={`flex items-center justify-between p-4 ${i < earnings.length - 1 ? 'border-b border-gray-100' : ''}`}
              >
                <span className="text-sm text-gray-700">{item.label}</span>
                <span className="font-bold text-green-600">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Requirements */}
      <div className="py-12">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            📋 متطلبات التسجيل
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="space-y-3">
              {requirements.map((req, i) => (
                <div key={i} className="flex items-center gap-3">
                  <req.icon size={20} className="text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{req.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            كيف أبدأ؟
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {steps.map((step, i) => (
              <motion.div
                key={step.number || i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative"
              >
                <div className="bg-white rounded-xl p-4 border border-gray-200 text-center">
                  <div className="w-10 h-10 bg-green-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 font-bold text-lg">
                    {step.number}
                  </div>
                  <h3 className="font-bold text-sm text-gray-900 mb-1">{step.title}</h3>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div className="py-12">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            ⭐ ماذا يقول السائقون؟
          </h2>
          <div className="space-y-4">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-bold">{t.name[0]}</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.city}</p>
                  </div>
                  <div className="mr-auto flex">
                    {[...Array(t.rating)].map((_, j) => (
                      <Star key={j} size={14} className="text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-600">"{t.text}"</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            أسئلة شائعة
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
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
      <div className="bg-gradient-to-l from-green-600 to-emerald-500 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            جاهز للانضمام؟
          </h2>
          <p className="text-white/90 mb-6">
            سجّل الآن وابدأ الكسب خلال 24 ساعة!
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-white text-green-600 font-bold px-8 py-4 rounded-full text-lg hover:bg-green-50 transition-colors shadow-lg"
          >
            سجّل كموظف توصيل
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
          <p className="text-gray-500 text-xs mt-2">
            للاستفسارات: <a href="tel:+963XXXXXXXXX" className="text-green-400">+963 XXX XXX XXX</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default JoinAsDeliveryPage;
