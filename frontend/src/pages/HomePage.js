import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Truck, Shield, CreditCard, ArrowLeft, Smartphone, Shirt, 
  Home as HomeIcon, Sparkles, Dumbbell, BookOpen, Gamepad2, 
  UtensilsCrossed, Heart, SprayCan, ChevronLeft, TrendingUp,
  Package, Clock, Star
} from 'lucide-react';
import ProductCard from '../components/ProductCard';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const iconMap = {
  Smartphone, Shirt, Home: HomeIcon, Sparkles, Dumbbell, 
  BookOpen, Gamepad2, UtensilsCrossed, Heart, SprayCan
};

const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        axios.get(`${API}/products/featured`),
        axios.get(`${API}/categories`)
      ]);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Seed data on first load
  useEffect(() => {
    const seedData = async () => {
      try {
        await axios.post(`${API}/seed`);
        fetchData();
      } catch (error) {
        // Ignore if already seeded
      }
    };
    seedData();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen pb-20 md:pb-0 bg-[#FAFAFA]">
      {/* Hero Section - Compact */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#FF6B00]/8 via-[#FF6B00]/5 to-transparent">
        <div className="max-w-7xl mx-auto px-4 py-4 md:py-6">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-4"
          >
            <h1 className="text-3xl md:text-4xl font-extrabold mb-2 text-gray-900 tracking-tight">
              تريند <span className="text-[#FF6B00] relative">
                سورية
                <svg className="absolute -bottom-1 left-0 right-0 w-full h-2" viewBox="0 0 100 10">
                  <path d="M0 8 Q50 0 100 8" stroke="#FF6B00" strokeWidth="3" fill="none" strokeLinecap="round"/>
                </svg>
              </span>
            </h1>
            <p className="text-gray-500 text-sm md:text-base max-w-xl mx-auto">
              منصة التسوق الأولى في سورية - توصيل مجاني داخل المحافظات
            </p>
          </motion.div>
          
          {/* Features - Compact Cards */}
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3"
          >
            {[
              { icon: Truck, text: 'توصيل مجاني', color: 'bg-emerald-50 text-emerald-600' },
              { icon: Shield, text: 'ضمان الجودة', color: 'bg-blue-50 text-blue-600' },
              { icon: CreditCard, text: 'دفع آمن', color: 'bg-purple-50 text-purple-600' },
              { icon: Clock, text: 'دعم 24/7', color: 'bg-amber-50 text-amber-600' },
            ].map((feature, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                whileHover={{ scale: 1.02, y: -2 }}
                className="flex items-center gap-2 p-2.5 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-default"
              >
                <div className={`p-2 rounded-lg ${feature.color}`}>
                  <feature.icon size={16} />
                </div>
                <span className="font-semibold text-xs text-gray-700">{feature.text}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Categories - Horizontal Scroll */}
      <section className="py-4">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title text-lg font-bold text-gray-900">الأصناف</h2>
            <Link 
              to="/categories" 
              className="text-[#FF6B00] flex items-center gap-1 hover:gap-2 transition-all text-sm font-medium" 
              data-testid="view-all-categories"
            >
              عرض الكل
              <ChevronLeft size={16} />
            </Link>
          </div>
          
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
            {categories.map((cat, i) => {
              const IconComponent = iconMap[cat.icon] || Smartphone;
              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Link
                    to={`/products?category=${cat.id}`}
                    className="category-item flex flex-col items-center gap-2 min-w-[70px]"
                    data-testid={`category-${cat.id}`}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center border-2 border-gray-100 hover:border-[#FF6B00] hover:bg-[#FF6B00] hover:text-white transition-all duration-300 group shadow-sm">
                      <IconComponent size={22} className="group-hover:scale-110 transition-transform" />
                    </div>
                    <span className="text-xs font-medium text-gray-600 text-center leading-tight">{cat.name}</span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-4">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-[#FF6B00]/10 rounded-lg">
                <TrendingUp size={18} className="text-[#FF6B00]" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">المنتجات الرائجة</h2>
            </div>
            <Link 
              to="/products" 
              className="text-[#FF6B00] flex items-center gap-1 hover:gap-2 transition-all text-sm font-medium" 
              data-testid="view-all-products"
            >
              عرض الكل
              <ChevronLeft size={16} />
            </Link>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                  <div className="aspect-[4/5] shimmer" />
                  <div className="p-3 space-y-2">
                    <div className="h-4 shimmer rounded w-full" />
                    <div className="h-3 shimmer rounded w-2/3" />
                    <div className="h-5 shimmer rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <motion.div 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4"
            >
              {products.map((product, i) => (
                <motion.div key={product.id} variants={itemVariants}>
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* CTA Banner - Modern Style */}
      <section className="py-6">
        <div className="max-w-7xl mx-auto px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-[#FF6B00] via-[#FF7B1C] to-[#FF8C00] p-6 md:p-10"
          >
            {/* Decorative Elements */}
            <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-60 h-60 bg-black/5 rounded-full translate-x-1/3 translate-y-1/3" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-right">
                <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1 mb-3">
                  <Package size={14} className="text-white" />
                  <span className="text-white/90 text-xs font-medium">انضم لأكثر من 500 بائع</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-extrabold mb-2 text-white">
                  هل أنت بائع؟
                </h3>
                <p className="text-white/85 text-sm md:text-base max-w-md">
                  ابدأ ببيع منتجاتك لآلاف العملاء في جميع أنحاء سورية
                </p>
              </div>
              <Link
                to="/register?type=seller"
                className="inline-flex items-center gap-2 bg-white text-[#FF6B00] font-bold px-6 py-3 rounded-full hover:bg-gray-50 hover:shadow-lg transition-all group"
                data-testid="become-seller-btn"
              >
                سجل كبائع مجاناً
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
