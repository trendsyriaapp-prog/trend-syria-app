import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, ShoppingCart, Zap, Ruler, Check } from 'lucide-react';

const AddToCartModal = ({ 
  isOpen, 
  onClose, 
  product, 
  onAddToCart, 
  onBuyNow,
  loading = false 
}) => {
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedWeight, setSelectedWeight] = useState('');
  const [quantity, setQuantity] = useState(1);

  // إعادة تعيين الحالة عند فتح النافذة
  useEffect(() => {
    if (isOpen) {
      setSelectedSize('');
      setSelectedWeight('');
      setQuantity(1);
    }
  }, [isOpen]);

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
  };

  // حساب السعر الإجمالي
  const calculateTotal = () => {
    let basePrice = product?.price || 0;
    
    // إذا كان هناك سعر مختلف للوزن المختار
    if (selectedWeight && product?.weight_variants) {
      const weightOption = product.weight_variants.find(w => w.weight === selectedWeight);
      if (weightOption?.price) {
        basePrice = weightOption.price;
      }
    }
    
    return basePrice * quantity;
  };

  const handleAddToCart = () => {
    onAddToCart(quantity, selectedSize, selectedWeight);
  };

  const handleBuyNow = () => {
    onBuyNow(quantity, selectedSize, selectedWeight);
  };

  // التحقق من إمكانية الإضافة
  const canProceed = () => {
    if (product?.available_sizes?.length > 0 && !selectedSize) return false;
    if (product?.weight_variants?.length > 0 && !selectedWeight) return false;
    return true;
  };

  // دليل المقاسات
  const SIZE_GUIDES = {
    clothes: {
      title: 'دليل مقاسات الملابس',
      headers: ['المقاس', 'الصدر (سم)', 'الخصر (سم)'],
      rows: [
        ['S', '86-91', '71-76'],
        ['M', '91-96', '76-81'],
        ['L', '96-101', '81-86'],
        ['XL', '101-106', '86-91'],
        ['XXL', '106-111', '91-96'],
      ]
    },
    kids_age: {
      title: 'دليل مقاسات الأطفال',
      headers: ['العمر', 'الطول (سم)', 'الوزن (كغ)'],
      rows: [
        ['0-3 شهور', '50-62', '3-6'],
        ['3-6 شهور', '62-68', '6-8'],
        ['6-12 شهر', '68-80', '8-10'],
        ['1-2 سنة', '80-92', '10-13'],
        ['2-3 سنوات', '92-98', '13-15'],
        ['3-4 سنوات', '98-104', '15-17'],
        ['4-5 سنوات', '104-110', '17-20'],
        ['5-6 سنوات', '110-116', '20-22'],
        ['6-7 سنوات', '116-122', '22-25'],
        ['7-8 سنوات', '122-128', '25-28'],
        ['8-10 سنوات', '128-140', '28-35'],
        ['10-12 سنة', '140-152', '35-42'],
      ]
    },
    kids_shoes: {
      title: 'دليل مقاسات أحذية الأطفال',
      headers: ['العمر', 'المقاس EU', 'طول القدم (سم)'],
      rows: [
        ['0-6 شهور', '16-17', '9.5-10.5'],
        ['6-12 شهر', '18-19', '11-11.5'],
        ['1-2 سنة', '20-22', '12-13.5'],
        ['2-3 سنوات', '23-25', '14-15.5'],
        ['3-4 سنوات', '26-27', '16-17'],
        ['4-5 سنوات', '28-29', '17.5-18'],
        ['5-6 سنوات', '30-31', '18.5-19.5'],
        ['6-7 سنوات', '32-33', '20-20.5'],
        ['8-10 سنوات', '34-36', '21-22.5'],
        ['10-12 سنة', '37-38', '23-24'],
      ]
    }
  };

  const [showSizeGuide, setShowSizeGuide] = useState(false);

  if (!isOpen || !product) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* الخلفية المعتمة */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[100]"
          />
          
          {/* النافذة العائمة */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[101] max-h-[85vh] overflow-y-auto"
          >
            {/* المقبض */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            {/* الهيدر */}
            <div className="flex items-center justify-between px-4 pb-3 border-b">
              <div className="flex items-center gap-3">
                <img 
                  src={product.images?.[0] || '/placeholder.png'} 
                  alt={product.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div>
                  <h3 className="font-bold text-gray-900 text-sm line-clamp-1">{product.name}</h3>
                  <p className="text-[#FF6B00] font-bold text-lg">{formatPrice(product.price)}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* اختيار المقاس */}
              {product.available_sizes && product.available_sizes.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-gray-900 text-sm">
                      اختر المقاس
                      {product.size_type === 'clothes' && ' (ملابس)'}
                      {product.size_type === 'shoes' && ' (أحذية)'}
                      {product.size_type === 'pants' && ' (بناطيل)'}
                      {product.size_type === 'kids_age' && ' (أطفال)'}
                      {product.size_type === 'kids_shoes' && ' (أحذية أطفال)'}
                      <span className="text-red-500 mr-1">*</span>
                    </h4>
                    {SIZE_GUIDES[product.size_type] && (
                      <button
                        onClick={() => setShowSizeGuide(!showSizeGuide)}
                        className="flex items-center gap-1 text-xs text-[#FF6B00] font-bold"
                      >
                        <Ruler size={14} />
                        دليل المقاسات
                      </button>
                    )}
                  </div>
                  
                  {/* دليل المقاسات المنسدل */}
                  <AnimatePresence>
                    {showSizeGuide && SIZE_GUIDES[product.size_type] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mb-3"
                      >
                        <div className="bg-orange-50 rounded-lg p-3 text-xs">
                          <h5 className="font-bold text-[#FF6B00] mb-2">{SIZE_GUIDES[product.size_type].title}</h5>
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="bg-orange-100">
                                  {SIZE_GUIDES[product.size_type].headers.map((h, i) => (
                                    <th key={i} className="px-2 py-1 text-right font-bold">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {SIZE_GUIDES[product.size_type].rows.slice(0, 6).map((row, i) => (
                                  <tr key={i} className="border-b border-orange-100">
                                    {row.map((cell, j) => (
                                      <td key={j} className="px-2 py-1">{cell}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div className="flex flex-wrap gap-2">
                    {product.available_sizes.map((size) => (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`min-w-[50px] px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                          selectedSize === size
                            ? 'bg-[#FF6B00] text-white shadow-lg shadow-orange-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                  {!selectedSize && (
                    <p className="text-xs text-red-500 mt-1">* يرجى اختيار المقاس</p>
                  )}
                </div>
              )}

              {/* اختيار الوزن */}
              {product.weight_variants && product.weight_variants.length > 0 && (
                <div>
                  <h4 className="font-bold text-gray-900 text-sm mb-2">
                    اختر الوزن/الحجم
                    <span className="text-red-500 mr-1">*</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {product.weight_variants.map((variant) => (
                      <button
                        key={variant.weight}
                        onClick={() => setSelectedWeight(variant.weight)}
                        className={`px-3 py-2 rounded-xl text-sm font-bold transition-all ${
                          selectedWeight === variant.weight
                            ? 'bg-[#FF6B00] text-white shadow-lg shadow-orange-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {variant.weight}
                        {variant.price && (
                          <span className="text-xs mr-1 opacity-80">
                            ({formatPrice(variant.price)})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  {!selectedWeight && (
                    <p className="text-xs text-red-500 mt-1">* يرجى اختيار الوزن</p>
                  )}
                </div>
              )}

              {/* اختيار الكمية */}
              <div>
                <h4 className="font-bold text-gray-900 text-sm mb-2">الكمية</h4>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    <Minus size={18} className="text-gray-600" />
                  </button>
                  <span className="text-xl font-bold text-gray-900 w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock || 99, quantity + 1))}
                    className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    <Plus size={18} className="text-gray-600" />
                  </button>
                  <span className="text-xs text-gray-500">
                    (المتوفر: {product.stock || '∞'})
                  </span>
                </div>
              </div>

              {/* السعر الإجمالي */}
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-3 flex items-center justify-between">
                <span className="text-sm text-gray-600">السعر الإجمالي:</span>
                <span className="text-xl font-bold text-[#FF6B00]">{formatPrice(calculateTotal())}</span>
              </div>

              {/* أزرار الإضافة */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleAddToCart}
                  disabled={!canProceed() || loading}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${
                    canProceed() && !loading
                      ? 'bg-white border-2 border-[#FF6B00] text-[#FF6B00] hover:bg-orange-50'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShoppingCart size={18} />
                      <span>أضف للسلة</span>
                    </>
                  )}
                </button>
                
                <button
                  onClick={handleBuyNow}
                  disabled={!canProceed() || loading}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${
                    canProceed() && !loading
                      ? 'bg-[#FF6B00] text-white hover:bg-[#E65000] shadow-lg shadow-orange-200'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Zap size={18} />
                  <span>اشتري الآن</span>
                </button>
              </div>

              {/* رسالة التأكيد */}
              {canProceed() && (
                <div className="flex items-center justify-center gap-2 text-green-600 text-sm">
                  <Check size={16} />
                  <span>جاهز للإضافة</span>
                </div>
              )}
            </div>

            {/* مساحة آمنة للأجهزة ذات الشق */}
            <div className="h-6" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AddToCartModal;
