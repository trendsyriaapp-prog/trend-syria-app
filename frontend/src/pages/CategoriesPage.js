import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Smartphone, Shirt, Home as HomeIcon, Dumbbell, 
  BookOpen, Gamepad2, UtensilsCrossed, Car, Watch, SprayCan, Pill, ShoppingBasket, Apple
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const iconMap = {
  Smartphone, Shirt, Home: HomeIcon, Dumbbell, 
  BookOpen, Gamepad2, UtensilsCrossed, Car, Watch, SprayCan, Pill, ShoppingBasket, Apple
};

const CategoriesPage = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await axios.get(`${API}/categories`);
      setCategories(res.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-10">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">جميع الأصناف</h1>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((cat, i) => {
            const IconComponent = iconMap[cat.icon] || Smartphone;
            return (
              <motion.div
                key={cat.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={`/products?category=${cat.id}`}
                  className="flex flex-col items-center gap-4 p-6 bg-[#121212] rounded-2xl border border-white/5 hover:border-[#FF6B00]/50 transition-all group"
                  data-testid={`category-page-${cat.id}`}
                >
                  <div className="w-20 h-20 rounded-full bg-[#1E1E1E] flex items-center justify-center group-hover:bg-[#FF6B00] group-hover:text-black transition-all">
                    <IconComponent size={36} className="group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="font-bold text-lg">{cat.name}</span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CategoriesPage;
