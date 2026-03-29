import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Heart, Share2, ShoppingCart, Star, Truck, Shield, RotateCcw, ChevronLeft, Store } from 'lucide-react';

const ProductPreviewModal = ({ isOpen, onClose, images, productName, productPrice, productDescription, productCategory, storeName }) => {
  const [currentImage, setCurrentImage] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  
  if (!isOpen || !images || images.length === 0) return null;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('ar-SY').format(price || 0);
  };

  // تسميات التصنيفات
  const categoryLabels = {
    'electronics': 'إلكترونيات',
    'fashion': 'أزياء',
    'home': 'منزل وحديقة',
    'beauty': 'جمال وعناية',
    'sports': 'رياضة',
    'toys': 'ألعاب',
    'books': 'كتب',
    'food': 'طعام',
    'other': 'أخرى',
    'main': 'طبق رئيسي',
    'appetizer': 'مقبلات',
    'drinks': 'مشروبات',
    'dessert': 'حلويات',
    'sides': 'أطباق جانبية'
  };

  const getImageSrc = (img) => {
    return typeof img === 'string' ? img : URL.createObjectURL(img);
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-50 w-full h-full max-w-md mx-auto overflow-y-auto"
      >
        {/* Header - شريط علوي */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100">
          <div className="flex items-center justify-between px-4 py-3">
            <button 
              onClick={onClose}
              className="flex items-center gap-1 text-gray-600"
            >
              <ChevronLeft size={24} />
              <span className="text-sm">رجوع</span>
            </button>
            <div className="flex items-center gap-1 bg-orange-100 px-2 py-1 rounded-full">
              <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              <span className="text-[10px] text-orange-700 font-medium">معاينة</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-full">
                <Share2 size={20} className="text-gray-600" />
              </button>
              <button 
                onClick={() => setIsFavorite(!isFavorite)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <Heart 
                  size={20} 
                  className={isFavorite ? "text-red-500 fill-red-500" : "text-gray-600"} 
                />
              </button>
            </div>
          </div>
        </div>

        {/* صورة المنتج */}
        <div className="bg-white">
          <div className="aspect-square relative overflow-hidden">
            <img
              src={getImageSrc(images[currentImage])}
              alt="Product Preview"
              className="w-full h-full object-contain"
            />
            
            {/* نقاط التنقل بين الصور */}
            {images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
                <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-full">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentImage(i)}
                      className={`rounded-full transition-all ${
                        currentImage === i 
                          ? 'bg-white w-2 h-2' 
                          : 'bg-white/60 w-1.5 h-1.5'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* شريط المميزات */}
          <div className="flex items-center justify-center gap-3 py-2 bg-gradient-to-r from-green-50 via-white to-orange-50 border-t border-gray-100">
            <div className="flex items-center gap-1">
              <Truck size={12} className="text-green-600" />
              <span className="text-[10px] text-gray-600">توصيل سريع</span>
            </div>
            <div className="w-px h-3 bg-gray-300" />
            <div className="flex items-center gap-1">
              <Shield size={12} className="text-blue-600" />
              <span className="text-[10px] text-gray-600">ضمان الجودة</span>
            </div>
            <div className="w-px h-3 bg-gray-300" />
            <div className="flex items-center gap-1">
              <RotateCcw size={12} className="text-orange-600" />
              <span className="text-[10px] text-gray-600">إرجاع مجاني</span>
            </div>
          </div>
        </div>

        {/* معلومات المنتج */}
        <div className="bg-white mt-2 p-4">
          {/* المتجر */}
          {storeName && (
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                <Store size={18} className="text-white" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">{storeName}</p>
                <div className="flex items-center gap-1">
                  <Star size={10} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-[10px] text-gray-500">4.8 (120 تقييم)</span>
                </div>
              </div>
            </div>
          )}

          {/* التصنيف */}
          {productCategory && (
            <span className="inline-block text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full mb-2">
              {categoryLabels[productCategory] || productCategory}
            </span>
          )}

          {/* اسم المنتج */}
          <h1 className="text-xl font-bold text-gray-900 mb-2 leading-tight">
            {productName || 'اسم المنتج'}
          </h1>

          {/* التقييم */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star 
                  key={i} 
                  size={14} 
                  className={i <= 4 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} 
                />
              ))}
            </div>
            <span className="text-xs text-gray-500">4.0 (0 تقييم)</span>
            <span className="text-xs text-green-600">• متوفر</span>
          </div>

          {/* السعر */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl font-bold text-[#FF6B00]">
              {formatPrice(productPrice)}
            </span>
            <span className="text-sm text-gray-500">ل.س</span>
          </div>

          {/* الوصف */}
          {productDescription && (
            <div className="mb-4">
              <h3 className="font-bold text-gray-900 text-sm mb-2">وصف المنتج</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {productDescription}
              </p>
            </div>
          )}
        </div>

        {/* الصور المصغرة */}
        {images.length > 1 && (
          <div className="bg-white mt-2 p-4">
            <h3 className="font-bold text-gray-900 text-sm mb-3">صور المنتج</h3>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentImage(idx)}
                  className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all ${
                    currentImage === idx ? 'border-[#FF6B00] scale-105' : 'border-gray-200'
                  }`}
                >
                  <img 
                    src={getImageSrc(img)}
                    alt={`صورة ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* شريط سفلي ثابت */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[10px] text-gray-500">السعر</p>
              <p className="text-lg font-bold text-[#FF6B00]">{formatPrice(productPrice)} ل.س</p>
            </div>
            <button className="flex-[2] py-3 bg-[#FF6B00] text-white rounded-xl font-bold flex items-center justify-center gap-2 active:bg-[#E65000]">
              <ShoppingCart size={18} />
              أضف للسلة
            </button>
          </div>
          
          {/* ملاحظة المعاينة */}
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-[10px] text-center text-gray-400">
              هذه معاينة تقريبية • المنتج الفعلي قد يختلف قليلاً
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ProductPreviewModal;
