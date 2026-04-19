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

const API = process.env.REACT_APP_BACKEND_URL;

const iconMap = {
  Smartphone, Shirt, Home: HomeIcon, Dumbbell, 
  BookOpen, Gamepad2, UtensilsCrossed, Car, Watch, SprayCan, Pill, 
  ShoppingBasket, Apple, Gift, Sparkles, Laptop, Footprints,
  Sofa, Refrigerator, Coffee, Cake, Croissant, GlassWater, Package
};

// ألوان الأيقونات
const iconColors = {
  electronics: '#3B82F6',
  mobiles: '#8B5CF6',
  laptops: '#06B6D4',
  clothing: '#EC4899',
  shoes: '#F97316',
  home: '#10B981',
  sports: '#EF4444',
  books: '#6366F1',
  gaming: '#8B5CF6',
  beauty: '#F472B6',
  health: '#22C55E',
  automotive: '#64748B',
  watches: '#F59E0B',
  gifts: '#E11D48',
  restaurants: '#FF6B00',
  cafes: '#92400E',
  bakeries: '#F59E0B',
  sweets: '#EC4899',
  juices: '#22C55E',
  default: '#FF6B00'
};

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      // استخدام نفس مصدر الأصناف الموجود في الصفحة الرئيسية
      const res = await axios.get(`${API}/api/categories`);
      // التأكد من أن البيانات هي Array
      if (Array.isArray(res.data)) {
        setCategories(res.data);
      } else {
        console.error('Categories data is not an array:', res.data);
        setCategories([]);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const shoppingCategories = Array.isArray(categories) ? categories.filter(c => c.type === 'shopping') : [];
  const foodCategories = Array.isArray(categories) ? categories.filter(c => c.type === 'food') : [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }

  const CategoryCard = ({ cat, index, isFood = false }) => {
    const IconComponent = iconMap[cat.icon] || Package;
    const linkTo = isFood ? `/food?category=${cat.id}` : `/products?category=${cat.id}`;
    const iconColor = cat.color || iconColors[cat.id] || iconColors.default;
    
    return (
      <motion.div
        key={cat.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
      >
        <Link
          to={linkTo}
          className="flex flex-col items-center gap-2 p-3 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all group"
          data-testid={`category-page-${cat.id}`}
        >
          {/* دائرة الأيقونة */}
          <div 
            className="w-14 h-14 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
            style={{ backgroundColor: `${iconColor}15` }}
          >
            <IconComponent size={26} style={{ color: iconColor }} />
          </div>
          {/* اسم الصنف */}
          <span className="font-semibold text-xs text-gray-700 text-center leading-tight">
            {cat.name}
          </span>
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
            <div className="w-9 h-9 bg-[#FF6B00]/10 rounded-full flex items-center justify-center">
              <ShoppingBasket className="text-[#FF6B00]" size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-800">أصناف المنتجات</h2>
              <span className="text-xs text-gray-500">{shoppingCategories.length} فئة</span>
            </div>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
            {shoppingCategories.map((cat, i) => (
              <CategoryCard key={cat.id} cat={cat} index={i} isFood={false} />
            ))}
          </div>
        </div>

        {/* قسم الطعام */}
        {foodCategories.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 bg-green-500/10 rounded-full flex items-center justify-center">
                <UtensilsCrossed className="text-green-500" size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-800">أصناف الطعام والمشروبات</h2>
                <span className="text-xs text-gray-500">{foodCategories.length} فئة</span>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5">
              {foodCategories.map((cat, i) => (
                <CategoryCard key={cat.id} cat={cat} index={i} isFood={true} />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CategoriesPage;
