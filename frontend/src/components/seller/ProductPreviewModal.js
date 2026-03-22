import { motion } from 'framer-motion';
import { X, Eye, ShoppingCart, Star, Heart, ChevronLeft } from 'lucide-react';

const ProductPreviewModal = ({ isOpen, onClose, images, productName, productPrice, productDescription, productCategory, storeName }) => {
  if (!isOpen || !images || images.length === 0) return null;

  const mainImage = images[0];
  const formatPrice = (price) => {
    return new Intl.NumberFormat('ar-SY').format(price || 0) + ' ل.س';
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

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-sm max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-4 text-white">
          <div className="flex items-center justify-between">
            <h2 className="font-bold flex items-center gap-2">
              <Eye size={20} />
              معاينة في المتجر
            </h2>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-full"
            >
              <X size={24} />
            </button>
          </div>
          <p className="text-xs opacity-80 mt-1">هكذا سيرى العملاء منتجك</p>
        </div>

        {/* Preview Content */}
        <div className="p-4 bg-gray-50">
          {/* Simulated Product Card */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Main Image */}
            <div className="relative aspect-square bg-gray-100">
              <img 
                src={typeof mainImage === 'string' ? mainImage : URL.createObjectURL(mainImage)}
                alt="Product Preview"
                className="w-full h-full object-cover"
              />
              
              {/* Favorite Button */}
              <button className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm">
                <Heart size={16} className="text-gray-400" />
              </button>
              
              {/* Image Counter */}
              {images.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                  1 / {images.length}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="p-4">
              {/* Store Name */}
              {storeName && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{storeName.charAt(0)}</span>
                  </div>
                  <span className="text-xs text-gray-500">{storeName}</span>
                </div>
              )}

              {/* Category Badge */}
              {productCategory && (
                <span className="inline-block text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full mb-2">
                  {categoryLabels[productCategory] || productCategory}
                </span>
              )}

              {/* Title */}
              <h3 className="font-bold text-gray-900 text-lg mb-1 line-clamp-2">
                {productName || 'اسم المنتج'}
              </h3>

              {/* Description */}
              {productDescription && (
                <p className="text-sm text-gray-500 line-clamp-2 mb-2">
                  {productDescription}
                </p>
              )}
              
              {/* Rating */}
              <div className="flex items-center gap-1 mb-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star 
                      key={i} 
                      size={14} 
                      className={i <= 4 ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} 
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-500">(0 تقييم)</span>
              </div>

              {/* Price */}
              <div className="flex items-center justify-between">
                <p className="text-xl font-bold text-[#FF6B00]">
                  {formatPrice(productPrice)}
                </p>
                <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  متوفر
                </span>
              </div>

              {/* Add to Cart Button */}
              <button className="w-full mt-3 py-3 bg-[#FF6B00] text-white rounded-xl font-bold flex items-center justify-center gap-2">
                <ShoppingCart size={18} />
                أضف للسلة
              </button>
            </div>
          </div>

          {/* Thumbnail Preview */}
          {images.length > 1 && (
            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2">الصور الإضافية:</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((img, idx) => (
                  <div 
                    key={idx}
                    className={`w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border-2 ${idx === 0 ? 'border-[#FF6B00]' : 'border-transparent'}`}
                  >
                    <img 
                      src={typeof img === 'string' ? img : URL.createObjectURL(img)}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span>هذه معاينة تقريبية لكيفية ظهور منتجك</span>
          </div>
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
          >
            <ChevronLeft size={18} />
            العودة للتحرير
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ProductPreviewModal;
