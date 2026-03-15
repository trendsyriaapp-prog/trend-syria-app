import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Smartphone, Shirt, Home as HomeIcon, Dumbbell, 
  BookOpen, Gamepad2, UtensilsCrossed, Car, Watch, SprayCan, Pill, 
  ShoppingBasket, Apple, Gift, Sparkles, Laptop, Footprints,
  Sofa, Refrigerator, Coffee, Cake, Croissant, GlassWater
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const iconMap = {
  Smartphone, Shirt, Home: HomeIcon, Dumbbell, 
  BookOpen, Gamepad2, UtensilsCrossed, Car, Watch, SprayCan, Pill, 
  ShoppingBasket, Apple, Gift, Sparkles, Laptop, Footprints,
  Sofa, Refrigerator, Coffee, Cake, Croissant, GlassWater
};

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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }

  const CategoryCard = ({ cat, index, isFood = false }) => {
    const IconComponent = iconMap[cat.icon] || Smartphone;
    const linkTo = isFood ? `/food?category=${cat.id}` : `/products?category=${cat.id}`;
    const hoverColor = isFood ? 'hover:border-green-500 group-hover:bg-green-500' : 'hover:border-[#FF6B00] group-hover:bg-[#FF6B00]';
    
    return (
      <motion.div
        key={cat.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03 }}
      >
        <Link
          to={linkTo}
          className={`flex flex-col items-center gap-3 p-4 bg-[#121212] rounded-2xl border border-white/5 ${hoverColor} transition-all group`}
          data-testid={`category-page-${cat.id}`}
        >
          <div className={`w-16 h-16 rounded-full bg-[#1E1E1E] flex items-center justify-center ${isFood ? 'group-hover:bg-green-500' : 'group-hover:bg-[#FF6B00]'} group-hover:text-black transition-all`}>
            <IconComponent size={28} className="group-hover:scale-110 transition-transform" />
          </div>
          <span className="font-bold text-sm text-center">{cat.name}</span>
        </Link>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen pb-20 md:pb-10">
      <div className="max-w-5xl mx-auto px-4 py-6">
        
        {/* قسم المنتجات */}
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <ShoppingBasket className="text-[#FF6B00]" size={24} />
            أصناف المنتجات
            <span className="text-sm font-normal text-gray-500">({shoppingCategories.length} فئة)</span>
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {shoppingCategories.map((cat, i) => (
              <CategoryCard key={cat.id} cat={cat} index={i} isFood={false} />
            ))}
          </div>
        </div>

        {/* قسم الطعام */}
        <div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <UtensilsCrossed className="text-green-500" size={24} />
            أصناف الطعام والمشروبات
            <span className="text-sm font-normal text-gray-500">({foodCategories.length} فئة)</span>
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
            {foodCategories.map((cat, i) => (
              <CategoryCard key={cat.id} cat={cat} index={i} isFood={true} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default CategoriesPage;
