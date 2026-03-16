// /app/frontend/src/pages/AboutPage.js
// صفحة من نحن

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowRight, Heart, Target, Eye, Users, Truck, 
  Store, Shield, Clock, MapPin, Mail, Phone,
  Star, Award, Zap, CheckCircle
} from 'lucide-react';

const AboutPage = () => {
  const navigate = useNavigate();

  const stats = [
    { icon: Store, value: '500+', label: 'متجر ومطعم' },
    { icon: Truck, value: '100+', label: 'سائق توصيل' },
    { icon: Users, value: '10,000+', label: 'عميل سعيد' },
    { icon: MapPin, value: '14', label: 'محافظة سورية' },
  ];

  const values = [
    { 
      icon: Zap, 
      title: 'السرعة', 
      desc: 'توصيل سريع خلال 30-45 دقيقة للطعام',
      color: 'bg-yellow-500'
    },
    { 
      icon: Shield, 
      title: 'الأمان', 
      desc: 'حماية بياناتك ومعاملاتك المالية',
      color: 'bg-blue-500'
    },
    { 
      icon: Heart, 
      title: 'الجودة', 
      desc: 'نختار أفضل المتاجر والمطاعم',
      color: 'bg-red-500'
    },
    { 
      icon: Users, 
      title: 'الدعم', 
      desc: 'فريق دعم متاح من 10 صباحاً لـ 11 مساءً',
      color: 'bg-green-500'
    },
  ];

  const whyUs = [
    'توصيل مجاني داخل المحافظات',
    'دفع عند الاستلام أو إلكترونياً',
    'تتبع طلبك لحظة بلحظة',
    'ضمان جودة المنتجات',
    'استرجاع سهل وسريع',
    'دعم فني على مدار الساعة',
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-orange-500 to-red-500 text-white">
        <div className="p-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <ArrowRight size={24} />
            </button>
            <h1 className="text-xl font-bold">من نحن</h1>
          </div>
        </div>
        
        {/* Hero Section */}
        <div className="px-4 pb-8 pt-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-20 h-20 bg-white rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg">
              <span className="text-4xl">🛒</span>
            </div>
            <h2 className="text-3xl font-bold mb-2">ترند سورية</h2>
            <p className="text-white/90 text-lg">منصة التسوق والتوصيل الأولى في سوريا</p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-4">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl shadow-lg p-4 mb-6"
        >
          <div className="grid grid-cols-4 gap-2">
            {stats.map((stat, index) => (
              <div key={index} className="text-center p-2">
                <div className="w-10 h-10 bg-orange-100 rounded-full mx-auto mb-2 flex items-center justify-center">
                  <stat.icon size={20} className="text-orange-600" />
                </div>
                <div className="text-xl font-bold text-gray-800">{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* About Us */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6"
        >
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">📖</span>
            قصتنا
          </h3>
          <div className="space-y-4 text-gray-600 leading-relaxed">
            <p>
              <strong className="text-orange-600">ترند سورية</strong> هي منصة سورية 100% 
              أُسست بهدف تسهيل حياة المواطن السوري وربط المتاجر والمطاعم بالعملاء 
              عبر تطبيق سهل وسريع.
            </p>
            <p>
              نؤمن بأن كل سوري يستحق خدمة توصيل سريعة وموثوقة، سواء كان يريد 
              وجبة طعام شهية أو منتجاً من متجره المفضل.
            </p>
            <p>
              انطلقنا من <strong>حلب</strong> ونسعى للوصول إلى جميع المحافظات السورية، 
              لنكون الخيار الأول للتسوق والتوصيل في سوريا.
            </p>
          </div>
        </motion.div>

        {/* Vision & Mission */}
        <div className="grid md:grid-cols-2 gap-0 mb-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="relative bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 p-5 text-white overflow-hidden"
          >
            {/* خلفية مزخرفة */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-2 right-4 text-5xl">👁️</div>
              <div className="absolute bottom-2 left-4 text-4xl">🎯</div>
            </div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Eye size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">رؤيتنا</h3>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">2025-2030</span>
                </div>
              </div>
              <p className="text-white/90 leading-relaxed text-sm">
                أن نكون المنصة الرائدة للتجارة الإلكترونية في سوريا، ونساهم في تطوير الاقتصاد الرقمي السوري.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="relative bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 p-5 text-white overflow-hidden"
          >
            {/* خلفية مزخرفة */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-2 right-4 text-5xl">🚀</div>
              <div className="absolute bottom-2 left-4 text-4xl">💡</div>
            </div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Target size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">مهمتنا</h3>
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">كل يوم</span>
                </div>
              </div>
              <p className="text-white/90 leading-relaxed text-sm">
                توفير تجربة تسوق وتوصيل سهلة وآمنة وسريعة لكل سوري، مع دعم التجار المحليين.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Our Values */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6"
        >
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">💎</span>
            قيمنا
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {values.map((value, index) => (
              <div key={index} className="text-center p-4 bg-gray-50 rounded-xl">
                <div className={`w-12 h-12 ${value.color} rounded-xl mx-auto mb-3 flex items-center justify-center`}>
                  <value.icon size={24} className="text-white" />
                </div>
                <h4 className="font-bold text-gray-800 mb-1">{value.title}</h4>
                <p className="text-xs text-gray-500">{value.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Why Choose Us */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6"
        >
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">⭐</span>
            لماذا تختار ترند سورية؟
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            {whyUs.map((item, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
                <span className="text-gray-700">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Our Services */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6"
        >
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">🚀</span>
            خدماتنا
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-orange-50 rounded-xl p-4 text-center border border-orange-100">
              <div className="text-4xl mb-3">🍔</div>
              <h4 className="font-bold text-gray-800 mb-2">توصيل الطعام</h4>
              <p className="text-sm text-gray-600">
                اطلب من مطاعمك المفضلة واستلم خلال 30-45 دقيقة
              </p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
              <div className="text-4xl mb-3">📦</div>
              <h4 className="font-bold text-gray-800 mb-2">توصيل المنتجات</h4>
              <p className="text-sm text-gray-600">
                تسوق من آلاف المنتجات واستلم في نفس اليوم
              </p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
              <div className="text-4xl mb-3">🏪</div>
              <h4 className="font-bold text-gray-800 mb-2">للتجار</h4>
              <p className="text-sm text-gray-600">
                انضم كبائع وابدأ ببيع منتجاتك لآلاف العملاء
              </p>
            </div>
          </div>
        </motion.div>

        {/* Join Us */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-gradient-to-r from-orange-500 to-red-500 p-4 mb-4 text-white"
        >
          <h3 className="text-base font-bold mb-3 flex items-center gap-2">
            <span className="text-lg">🤝</span>
            انضم إلى عائلة ترند سورية
          </h3>
          <div className="grid md:grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-lg p-3">
              <h4 className="font-bold mb-1.5 flex items-center gap-2 text-sm">
                <Store size={16} />
                هل أنت تاجر؟
              </h4>
              <p className="text-xs text-white/80 mb-2">
                سجل متجرك مجاناً وابدأ ببيع منتجاتك
              </p>
              <button 
                onClick={() => navigate('/register')}
                className="bg-white text-orange-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-orange-50 transition-colors"
              >
                سجل كبائع
              </button>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <h4 className="font-bold mb-1.5 flex items-center gap-2 text-sm">
                <Truck size={16} />
                هل تريد العمل معنا؟
              </h4>
              <p className="text-xs text-white/80 mb-2">
                انضم كسائق توصيل واكسب دخلاً إضافياً
              </p>
              <button 
                onClick={() => navigate('/register')}
                className="bg-white text-orange-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-50 transition-colors"
              >
                سجل كسائق
              </button>
            </div>
          </div>
        </motion.div>

        {/* Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6"
        >
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">📞</span>
            تواصل معنا
          </h3>
          <div className="grid md:grid-cols-3 gap-4">
            <a 
              href="mailto:trendsyria.app@gmail.com"
              className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-orange-50 transition-colors"
            >
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                <Mail size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500">البريد الإلكتروني</p>
                <p className="font-medium text-gray-800 text-sm">trendsyria.app@gmail.com</p>
              </div>
            </a>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                <MapPin size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500">الموقع</p>
                <p className="font-medium text-gray-800">حلب، سوريا</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                <Clock size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs text-gray-500">ساعات الدعم</p>
                <p className="font-medium text-gray-800">10:00 ص - 11:00 م</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Footer Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="text-center pb-4"
        >
          <div className="flex justify-center gap-4 text-sm">
            <button 
              onClick={() => navigate('/terms')}
              className="text-orange-600 hover:underline"
            >
              شروط الاستخدام
            </button>
            <span className="text-gray-300">|</span>
            <button 
              onClick={() => navigate('/privacy')}
              className="text-orange-600 hover:underline"
            >
              سياسة الخصوصية
            </button>
            <span className="text-gray-300">|</span>
            <button 
              onClick={() => navigate('/returns')}
              className="text-orange-600 hover:underline"
            >
              سياسة الإرجاع
            </button>
          </div>
          <p className="text-gray-400 text-xs mt-4">
            © 2025 ترند سورية. جميع الحقوق محفوظة.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AboutPage;
