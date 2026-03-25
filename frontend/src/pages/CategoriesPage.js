import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Smartphone, Shirt, Home as HomeIcon, Dumbbell, 
  BookOpen, Gamepad2, UtensilsCrossed, Car, Watch, SprayCan, Pill, 
  ShoppingBasket, Apple, Gift, Sparkles, Laptop, Footprints,
  Sofa, Refrigerator, Coffee, Cake, Croissant, GlassWater, Package
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const iconMap = {
  Smartphone, Shirt, Home: HomeIcon, Dumbbell, 
  BookOpen, Gamepad2, UtensilsCrossed, Car, Watch, SprayCan, Pill, 
  ShoppingBasket, Apple, Gift, Sparkles, Laptop, Footprints,
  Sofa, Refrigerator, Coffee, Cake, Croissant, GlassWater, Package
};

// ألوان متدرجة جميلة لكل صنف
const gradientColors = [
  'from-blue-500 to-blue-600',
  'from-purple-500 to-purple-600',
  'from-pink-500 to-pink-600',
  'from-orange-500 to-orange-600',
  'from-green-500 to-green-600',
  'from-cyan-500 to-cyan-600',
  'from-red-500 to-red-600',
  'from-yellow-500 to-yellow-600',
  'from-indigo-500 to-indigo-600',
  'from-teal-500 to-teal-600',
  'from-rose-500 to-rose-600',
  'from-emerald-500 to-emerald-600',
  'from-violet-500 to-violet-600',
  'from-amber-500 to-amber-600',
  'from-lime-500 to-lime-600',
  'from-fuchsia-500 to-fuchsia-600',
];

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API}/products/categories`);
      setCategories(res.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const shoppingCategories = categories.filter(c => c.type === 'shopping');
  const foodCategories = categories.filter(c => c.type === 'food');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }

  const CategoryCard = ({ cat, index, isFood = false }) => {
    const IconComponent = iconMap[cat.icon] || Package;
    const linkTo = isFood ? `/food?category=${cat.id}` : `/products?category=${cat.id}`;
    const gradient = gradientColors[index % gradientColors.length];
    
    return (
      <motion.div
        key={cat.id}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.05 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Link
          to={linkTo}
          className="block relative overflow-hidden rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
          data-testid={`category-page-${cat.id}`}
        >
          {/* الخلفية الملونة المتدرجة */}
          <div className={`bg-gradient-to-br ${gradient} aspect-square flex flex-col items-center justify-center p-4`}>
            {/* الأيقونة */}
            <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-3">
              <IconComponent size={28} className="text-white" />
            </div>
            {/* اسم الصنف */}
            <span className="font-bold text-sm text-white text-center leading-tight drop-shadow-md">
              {cat.name}
            </span>
          </div>
          {/* تأثير اللمعان */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
        </Link>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen pb-20 md:pb-10 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6">
        
        {/* قسم المنتجات */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] rounded-full flex items-center justify-center">
              <ShoppingBasket className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800">أصناف المنتجات</h2>
              <span className="text-xs text-gray-500">{shoppingCategories.length} فئة</span>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {shoppingCategories.map((cat, i) => (
              <CategoryCard key={cat.id} cat={cat} index={i} isFood={false} />
            ))}
          </div>
        </div>

        {/* قسم الطعام */}
        {foodCategories.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                <UtensilsCrossed className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">أصناف الطعام والمشروبات</h2>
                <span className="text-xs text-gray-500">{foodCategories.length} فئة</span>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {foodCategories.map((cat, i) => (
                <CategoryCard key={cat.id} cat={cat} index={i + 8} isFood={true} />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CategoriesPage;
