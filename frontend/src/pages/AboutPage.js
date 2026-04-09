// /app/frontend/src/pages/AboutPage.js
// صفحة من نحن

import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowRight, Heart, Target, Eye, Users, Truck, 
  Store, Shield, Clock, MapPin, Mail, Phone,
  Star, Award, Zap, CheckCircle, MessageCircle
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
    'دفع إلكتروني آمن',
    'تتبع طلبك لحظة بلحظة',
    'ضمان جودة المنتجات',
    'استرجاع سهل وسريع',
    'دعم فني على مدار الساعة',
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-l from-orange-500 to-red-500 text-white">
        <div className="p-3">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => navigate(-1)} 
              className="p-1.5 hover:bg-white/20 rounded-full transition-colors"
            >
              <ArrowRight size={20} />
            </button>
            <h1 className="text-lg font-bold">من نحن</h1>
          </div>
        </div>
        
        {/* Hero Section */}
        <div className="px-4 pb-5 pt-2 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-14 h-14 bg-white rounded-xl mx-auto mb-2 flex items-center justify-center shadow-lg">
              <span className="text-2xl">🛒</span>
            </div>
            <h2 className="text-xl font-bold mb-1">ترند سورية</h2>
            <p className="text-white/90 text-sm">منصة التسوق والتوصيل الأولى في سوريا</p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-3 -mt-3">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg p-3 mb-4"
        >
          <div className="grid grid-cols-4 gap-1">
            {stats.map((stat, index) => (
              <div key={index} className="text-center p-1.5">
                <div className="w-8 h-8 bg-orange-100 rounded-full mx-auto mb-1 flex items-center justify-center">
                  <stat.icon size={16} className="text-orange-600" />
                </div>
                <div className="text-base font-bold text-gray-800">{stat.value}</div>
                <div className="text-[10px] text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* About Us */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4"
        >
          <h3 className="text-base font-bold text-gray-800 mb-2 flex items-center gap-2">
            <span className="text-lg">📖</span>
            قصتنا
          </h3>
          <div className="space-y-2 text-gray-600 leading-relaxed text-sm">
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
        <div className="grid grid-cols-2 gap-2 mb-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="relative bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 p-3 rounded-xl text-white overflow-hidden"
          >
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <Eye size={16} />
                </div>
                <h3 className="text-sm font-bold">رؤيتنا</h3>
              </div>
              <p className="text-white/90 leading-relaxed text-xs">
                أن نكون المنصة الرائدة للتجارة الإلكترونية في سوريا، ونساهم في تطوير الاقتصاد الرقمي.
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="relative bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 p-3 rounded-xl text-white overflow-hidden"
          >
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <Target size={16} />
                </div>
                <h3 className="text-sm font-bold">مهمتنا</h3>
              </div>
              <p className="text-white/90 leading-relaxed text-xs">
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
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4"
        >
          <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="text-lg">💎</span>
            قيمنا
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {values.map((value, index) => (
              <div key={index} className="text-center p-2 bg-gray-50 rounded-lg">
                <div className={`w-8 h-8 ${value.color} rounded-lg mx-auto mb-1.5 flex items-center justify-center`}>
                  <value.icon size={16} className="text-white" />
                </div>
                <h4 className="font-bold text-gray-800 text-xs mb-0.5">{value.title}</h4>
                <p className="text-[10px] text-gray-500 leading-tight">{value.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Why Choose Us */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4"
        >
          <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="text-lg">⭐</span>
            لماذا ترند سورية؟
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {whyUs.map((item, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                <CheckCircle size={14} className="text-green-600 flex-shrink-0" />
                <span className="text-gray-700 text-xs">{item}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Our Services */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4"
        >
          <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="text-lg">🚀</span>
            خدماتنا
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-orange-50 rounded-lg p-2.5 text-center border border-orange-100">
              <div className="text-2xl mb-1">🍔</div>
              <h4 className="font-bold text-gray-800 text-xs mb-1">توصيل الطعام</h4>
              <p className="text-[10px] text-gray-600 leading-tight">
                اطلب من مطاعمك المفضلة
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-2.5 text-center border border-blue-100">
              <div className="text-2xl mb-1">📦</div>
              <h4 className="font-bold text-gray-800 text-xs mb-1">توصيل المنتجات</h4>
              <p className="text-[10px] text-gray-600 leading-tight">
                تسوق من آلاف المنتجات
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-2.5 text-center border border-green-100">
              <div className="text-2xl mb-1">🏪</div>
              <h4 className="font-bold text-gray-800 text-xs mb-1">للتجار</h4>
              <p className="text-[10px] text-gray-600 leading-tight">
                انضم كبائع الآن
              </p>
            </div>
          </div>
        </motion.div>

        {/* Join Us */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-3 mb-4 text-white"
        >
          <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
            <span className="text-base">🤝</span>
            انضم إلى عائلة ترند سورية
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/10 rounded-lg p-2.5">
              <h4 className="font-bold mb-1 flex items-center gap-1.5 text-xs">
                <Store size={14} />
                هل أنت تاجر؟
              </h4>
              <p className="text-[10px] text-white/80 mb-2">
                سجل متجرك مجاناً
              </p>
              <button 
                onClick={() => navigate('/register')}
                className="bg-white text-orange-600 px-2.5 py-1 rounded-lg text-[10px] font-bold hover:bg-orange-50 transition-colors"
              >
                سجل كبائع
              </button>
            </div>
            <div className="bg-white/10 rounded-lg p-2.5">
              <h4 className="font-bold mb-1 flex items-center gap-1.5 text-xs">
                <Truck size={14} />
                هل تريد العمل معنا؟
              </h4>
              <p className="text-[10px] text-white/80 mb-2">
                انضم كسائق توصيل
              </p>
              <button 
                onClick={() => navigate('/register')}
                className="bg-white text-orange-600 px-2.5 py-1 rounded-lg text-[10px] font-bold hover:bg-orange-50 transition-colors"
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
          className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4"
        >
          <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="text-lg">📞</span>
            تواصل معنا
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <a 
              href="https://wa.me/963945570365"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2.5 bg-green-50 rounded-lg hover:bg-green-100 transition-colors border border-green-200"
            >
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle size={14} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-500">واتساب</p>
                <p className="font-bold text-green-600 text-xs">0945570365</p>
              </div>
            </a>
            <a 
              href="mailto:trendsyria.app@gmail.com"
              className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg hover:bg-orange-50 transition-colors"
            >
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Mail size={14} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-500">البريد</p>
                <p className="font-medium text-gray-800 text-[10px] truncate">trendsyria.app@gmail.com</p>
              </div>
            </a>
            <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPin size={14} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500">الموقع</p>
                <p className="font-medium text-gray-800 text-xs">حلب، سوريا</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock size={14} className="text-white" />
              </div>
              <div>
                <p className="text-[10px] text-gray-500">ساعات الدعم</p>
                <p className="font-medium text-gray-800 text-xs">10 ص - 11 م</p>
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
          <div className="flex justify-center gap-3 text-xs">
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
          <p className="text-gray-400 text-[10px] mt-3">
            © 2025 ترند سورية. جميع الحقوق محفوظة.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default AboutPage;
