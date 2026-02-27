import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Truck, Shield, CreditCard, ArrowLeft, Smartphone, Shirt, 
  Home as HomeIcon, Sparkles, Dumbbell, BookOpen, Gamepad2, 
  UtensilsCrossed, Heart, SprayCan, ChevronLeft
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

  return (
    <div className="min-h-screen pb-20 md:pb-0 bg-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#FF6B00]/10 to-white">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-4 text-gray-900">
              تريند <span className="text-[#FF6B00]">سوريا</span>
            </h1>
            <p className="text-gray-600 text-lg md:text-xl mb-8 max-w-2xl mx-auto">
              منصة التسوق الأولى في سوريا - توصيل مجاني لجميع المحافظات
            </p>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 bg-[#FF6B00] text-white font-bold px-8 py-4 rounded-full hover:bg-[#E65000] transition-colors shadow-lg"
              data-testid="shop-now-btn"
            >
              تسوق الآن
              <ArrowLeft size={20} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features - Smaller */}
      <section className="py-4 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: Truck, text: 'توصيل مجاني', desc: 'لجميع المحافظات' },
              { icon: Shield, text: 'ضمان الجودة', desc: 'منتجات أصلية' },
              { icon: CreditCard, text: 'شام كاش', desc: 'دفع آمن' },
              { icon: Heart, text: 'دعم 24/7', desc: 'خدمة العملاء' },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div className="p-1.5 bg-[#FF6B00]/10 rounded-full">
                  <feature.icon size={14} className="text-[#FF6B00]" />
                </div>
                <div>
                  <p className="font-bold text-[10px] text-gray-900">{feature.text}</p>
                  <p className="text-[8px] text-gray-500 hidden sm:block">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories - Smaller Size */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">الأصناف</h2>
            <Link to="/categories" className="text-[#FF6B00] flex items-center gap-1 hover:underline text-sm" data-testid="view-all-categories">
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
                >
                  <Link
                    to={`/products?category=${cat.id}`}
                    className="flex flex-col items-center gap-2 min-w-[70px]"
                    data-testid={`category-${cat.id}`}
                  >
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 hover:bg-[#FF6B00] hover:text-white hover:border-[#FF6B00] transition-all group">
                      <IconComponent size={20} className="group-hover:scale-110 transition-transform" />
                    </div>
                    <span className="text-xs font-medium text-gray-700">{cat.name}</span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">المنتجات الرائجة</h2>
            <Link to="/products" className="text-[#FF6B00] flex items-center gap-1 hover:underline text-sm" data-testid="view-all-products">
              عرض الكل
              <ChevronLeft size={16} />
            </Link>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-xl aspect-square animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {products.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-[#FF6B00] to-[#E65000] p-8 md:p-12">
            <div className="relative z-10 max-w-lg">
              <h3 className="text-2xl md:text-3xl font-bold mb-4 text-white">
                هل أنت بائع؟
              </h3>
              <p className="text-white/90 mb-6">
                انضم إلى تريند سورية وابدأ ببيع منتجاتك لآلاف العملاء في جميع أنحاء سوريا
              </p>
              <Link
                to="/register?type=seller"
                className="inline-flex items-center gap-2 bg-white text-[#FF6B00] font-bold px-6 py-3 rounded-full hover:bg-gray-100 transition-colors"
                data-testid="become-seller-btn"
              >
                سجل كبائع
                <ArrowLeft size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
