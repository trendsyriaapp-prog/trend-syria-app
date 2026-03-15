// /app/frontend/src/components/delivery/RouteSelector.js
// مكون اختيار نوع تخطيط المسار

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Route, Utensils, Package, Layers, ChevronLeft, Clock, MapPin, Truck } from 'lucide-react';
import MultiRouteOptimizer from './MultiRouteOptimizer';

const RouteSelector = ({ 
  foodOrders = [], 
  productOrders = [], 
  onClose, 
  theme = 'dark' 
}) => {
  const [selectedMode, setSelectedMode] = useState(null);
  const isDark = theme === 'dark';

  const foodCount = foodOrders.length;
  const productCount = productOrders.length;
  const totalCount = foodCount + productCount;

  // إذا تم اختيار وضع، نعرض MultiRouteOptimizer
  if (selectedMode) {
    return (
      <MultiRouteOptimizer
        foodOrders={foodOrders}
        productOrders={productOrders}
        onClose={() => setSelectedMode(null)}
        theme={theme}
        mode={selectedMode}
      />
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${
            isDark ? 'bg-[#1a1a1a]' : 'bg-white'
          }`}
        >
          {/* Header */}
          <div className={`flex items-center justify-between p-4 border-b ${
            isDark ? 'border-[#333] bg-gradient-to-l from-[#252525] to-[#1f1f1f]' : 'border-gray-200 bg-gradient-to-l from-gray-100 to-gray-50'
          }`}>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
                <Route size={22} className="text-white" />
              </div>
              <div>
                <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  تخطيط المسار الذكي
                </h3>
                <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  اختر نوع المسار
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-xl transition-colors ${isDark ? 'hover:bg-[#333]' : 'hover:bg-gray-200'}`}
            >
              <X size={22} className={isDark ? 'text-gray-400' : 'text-gray-600'} />
            </button>
          </div>

          {/* Options */}
          <div className="p-4 space-y-3">
            {/* مسار الطعام */}
            <button
              onClick={() => foodCount > 0 && setSelectedMode('food')}
              disabled={foodCount === 0}
              className={`w-full p-4 rounded-xl border-2 transition-all text-right ${
                foodCount > 0
                  ? isDark 
                    ? 'border-green-500/30 bg-green-500/10 hover:border-green-500/60 hover:bg-green-500/20' 
                    : 'border-green-200 bg-green-50 hover:border-green-400 hover:bg-green-100'
                  : isDark
                    ? 'border-[#333] bg-[#252525] opacity-50 cursor-not-allowed'
                    : 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${
                    foodCount > 0 
                      ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                      : isDark ? 'bg-[#333]' : 'bg-gray-300'
                  }`}>
                    <Utensils size={24} className="text-white" />
                  </div>
                  <div>
                    <h4 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      مسار الطعام
                    </h4>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {foodCount > 0 ? `${foodCount} طلبات طعام` : 'لا يوجد طلبات طعام'}
                    </p>
                  </div>
                </div>
                {foodCount > 0 && (
                  <ChevronLeft size={20} className={isDark ? 'text-green-400' : 'text-green-600'} />
                )}
              </div>
              {foodCount > 0 && (
                <div className={`mt-3 pt-3 border-t ${isDark ? 'border-green-500/20' : 'border-green-200'}`}>
                  <div className="flex items-center gap-4 text-sm">
                    <span className={`flex items-center gap-1 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                      <Clock size={14} />
                      توصيل سريع
                    </span>
                    <span className={`flex items-center gap-1 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                      <Truck size={14} />
                      أولوية الطعام الساخن
                    </span>
                  </div>
                </div>
              )}
            </button>

            {/* مسار المنتجات */}
            <button
              onClick={() => productCount > 0 && setSelectedMode('product')}
              disabled={productCount === 0}
              className={`w-full p-4 rounded-xl border-2 transition-all text-right ${
                productCount > 0
                  ? isDark 
                    ? 'border-purple-500/30 bg-purple-500/10 hover:border-purple-500/60 hover:bg-purple-500/20' 
                    : 'border-purple-200 bg-purple-50 hover:border-purple-400 hover:bg-purple-100'
                  : isDark
                    ? 'border-[#333] bg-[#252525] opacity-50 cursor-not-allowed'
                    : 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${
                    productCount > 0 
                      ? 'bg-gradient-to-br from-purple-500 to-indigo-600' 
                      : isDark ? 'bg-[#333]' : 'bg-gray-300'
                  }`}>
                    <Package size={24} className="text-white" />
                  </div>
                  <div>
                    <h4 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      مسار المنتجات
                    </h4>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {productCount > 0 ? `${productCount} طلبات منتجات` : 'لا يوجد طلبات منتجات'}
                    </p>
                  </div>
                </div>
                {productCount > 0 && (
                  <ChevronLeft size={20} className={isDark ? 'text-purple-400' : 'text-purple-600'} />
                )}
              </div>
              {productCount > 0 && (
                <div className={`mt-3 pt-3 border-t ${isDark ? 'border-purple-500/20' : 'border-purple-200'}`}>
                  <div className="flex items-center gap-4 text-sm">
                    <span className={`flex items-center gap-1 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                      <MapPin size={14} />
                      توصيل مرن
                    </span>
                    <span className={`flex items-center gap-1 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
                      <Clock size={14} />
                      التوصيل خلال اليوم
                    </span>
                  </div>
                </div>
              )}
            </button>

            {/* فاصل */}
            {foodCount > 0 && productCount > 0 && (
              <div className="flex items-center gap-3 py-2">
                <div className={`flex-1 h-px ${isDark ? 'bg-[#333]' : 'bg-gray-200'}`}></div>
                <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>أو</span>
                <div className={`flex-1 h-px ${isDark ? 'bg-[#333]' : 'bg-gray-200'}`}></div>
              </div>
            )}

            {/* المسار المدمج */}
            {foodCount > 0 && productCount > 0 && (
              <button
                onClick={() => setSelectedMode('all')}
                className={`w-full p-4 rounded-xl border-2 transition-all text-right ${
                  isDark 
                    ? 'border-orange-500/30 bg-orange-500/10 hover:border-orange-500/60 hover:bg-orange-500/20' 
                    : 'border-orange-200 bg-orange-50 hover:border-orange-400 hover:bg-orange-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-red-500">
                      <Layers size={24} className="text-white" />
                    </div>
                    <div>
                      <h4 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        دمج الكل
                      </h4>
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {totalCount} طلبات (طعام + منتجات)
                      </p>
                    </div>
                  </div>
                  <ChevronLeft size={20} className={isDark ? 'text-orange-400' : 'text-orange-600'} />
                </div>
                <div className={`mt-3 pt-3 border-t ${isDark ? 'border-orange-500/20' : 'border-orange-200'}`}>
                  <div className="flex items-center gap-4 text-sm">
                    <span className={`flex items-center gap-1 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                      <Utensils size={14} />
                      أولوية للطعام
                    </span>
                    <span className={`flex items-center gap-1 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                      <Route size={14} />
                      مسار واحد ذكي
                    </span>
                  </div>
                </div>
              </button>
            )}
          </div>

          {/* Footer */}
          <div className={`p-4 border-t ${isDark ? 'border-[#333] bg-[#1f1f1f]' : 'border-gray-200 bg-gray-50'}`}>
            <p className={`text-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              تخطيط المسار الذكي يوفر عليك الوقت والبنزين
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default RouteSelector;
