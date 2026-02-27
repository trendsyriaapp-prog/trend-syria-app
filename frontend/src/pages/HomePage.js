import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Truck, Shield, CreditCard, ArrowLeft, Smartphone, Shirt, 
  Home as HomeIcon, Sparkles, Dumbbell, BookOpen, Gamepad2, 
  UtensilsCrossed, Heart, Car, ChevronLeft
} from 'lucide-react';
import ProductCard from '../components/ProductCard';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const iconMap = {
  Smartphone, Shirt, Home: HomeIcon, Sparkles, Dumbbell, 
  BookOpen, Gamepad2, UtensilsCrossed, Heart, Car
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
    <div className="min-h-screen pb-20 md:pb-0">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FF6B00]/10 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              تريند <span className="text-[#FF6B00]">سوريا</span>
            </h1>
            <p className="text-white/70 text-lg md:text-xl mb-8 max-w-2xl mx-auto">
              منصة التسوق الأولى في سوريا - توصيل مجاني لجميع المحافظات
            </p>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 bg-[#FF6B00] text-black font-bold px-8 py-4 rounded-full hover:bg-[#E65000] transition-colors shadow-[0_0_30px_rgba(255,107,0,0.3)]"
              data-testid="shop-now-btn"
            >
              تسوق الآن
              <ArrowLeft size={20} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-8 border-y border-white/5">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                className="flex items-center gap-3 p-4 bg-[#121212] rounded-xl border border-white/5"
              >
                <div className="p-3 bg-[#FF6B00]/10 rounded-full">
                  <feature.icon size={24} className="text-[#FF6B00]" />
                </div>
                <div>
                  <p className="font-bold text-sm">{feature.text}</p>
                  <p className="text-xs text-white/50">{feature.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">الأصناف</h2>
            <Link to="/categories" className="text-[#FF6B00] flex items-center gap-1 hover:underline" data-testid="view-all-categories">
              عرض الكل
              <ChevronLeft size={18} />
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto hide-scrollbar pb-4">
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
                    className="flex flex-col items-center gap-3 min-w-[100px]"
                    data-testid={`category-${cat.id}`}
                  >
                    <div className="w-20 h-20 rounded-full bg-[#1E1E1E] flex items-center justify-center border border-white/5 hover:bg-[#FF6B00] hover:text-black transition-all group">
                      <IconComponent size={32} className="group-hover:scale-110 transition-transform" />
                    </div>
                    <span className="text-sm font-medium">{cat.name}</span>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">المنتجات الرائجة</h2>
            <Link to="/products" className="text-[#FF6B00] flex items-center gap-1 hover:underline" data-testid="view-all-products">
              عرض الكل
              <ChevronLeft size={18} />
            </Link>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-[#121212] rounded-2xl aspect-square animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-l from-[#FF6B00]/20 to-[#121212] border border-[#FF6B00]/20 p-8 md:p-12">
            <div className="relative z-10 max-w-lg">
              <h3 className="text-2xl md:text-3xl font-bold mb-4">
                هل أنت بائع؟
              </h3>
              <p className="text-white/70 mb-6">
                انضم إلى تريند سوريا وابدأ ببيع منتجاتك لآلاف العملاء في جميع أنحاء سوريا
              </p>
              <Link
                to="/register?type=seller"
                className="inline-flex items-center gap-2 bg-[#FF6B00] text-black font-bold px-6 py-3 rounded-full hover:bg-[#E65000] transition-colors"
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
