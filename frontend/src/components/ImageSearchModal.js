// /app/frontend/src/components/ImageSearchModal.js
// مكون البحث عن المنتجات بالصورة

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  Camera, Upload, X, Loader2, Search, Image as ImageIcon, 
  Sparkles, AlertCircle, ChevronRight 
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const API = process.env.REACT_APP_BACKEND_URL;

const ImageSearchModal = ({ isOpen, onClose }) => {
  const { language } = useLanguage();
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // النصوص حسب اللغة
  const texts = {
    ar: {
      title: 'البحث بالصورة',
      subtitle: 'ابحث عن منتجات مشابهة باستخدام صورة',
      uploadPhoto: 'رفع صورة',
      takePhoto: 'التقط صورة',
      dragDrop: 'أو اسحب وأفلت الصورة هنا',
      searching: 'جاري البحث...',
      analyzing: 'جاري تحليل الصورة بالذكاء الاصطناعي',
      resultsTitle: 'منتجات مشابهة',
      noResults: 'لم نجد منتجات مشابهة',
      tryAgain: 'جرب صورة أخرى',
      analysis: 'تحليل الصورة',
      category: 'الفئة',
      colors: 'الألوان',
      style: 'النمط',
      viewProduct: 'عرض المنتج',
      currency: 'ل.س'
    },
    en: {
      title: 'Search by Image',
      subtitle: 'Find similar products using an image',
      uploadPhoto: 'Upload Photo',
      takePhoto: 'Take Photo',
      dragDrop: 'or drag and drop image here',
      searching: 'Searching...',
      analyzing: 'Analyzing image with AI',
      resultsTitle: 'Similar Products',
      noResults: 'No similar products found',
      tryAgain: 'Try another image',
      analysis: 'Image Analysis',
      category: 'Category',
      colors: 'Colors',
      style: 'Style',
      viewProduct: 'View Product',
      currency: 'SYP'
    }
  };

  const t = texts[language] || texts.ar;

  // تحويل الصورة إلى base64
  const convertToBase64 = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }, []);

  // معالجة اختيار الصورة
  const handleImageSelect = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // التحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      setError(language === 'ar' ? 'يرجى اختيار صورة صالحة' : 'Please select a valid image');
      return;
    }

    // التحقق من حجم الملف (max 10 MB)
    if (file.size > 10 * 1024 * 1024) {
      setError(language === 'ar' ? 'حجم الصورة كبير جداً (الحد الأقصى 10 MB)' : 'Image too large (max 10 MB)');
      return;
    }

    try {
      const base64 = await convertToBase64(file);
      setImage(base64);
      setImagePreview(URL.createObjectURL(file));
      setError(null);
      setResults(null);
    } catch (err) {
      setError(language === 'ar' ? 'خطأ في قراءة الصورة' : 'Error reading image');
    }
  }, [language, convertToBase64]);

  // البحث عن منتجات
  const handleSearch = useCallback(async () => {
    if (!image) return;

    setLoading(true);
    setError(null);

    try {
      // إزالة prefix من base64
      const base64Data = image.includes(',') ? image.split(',')[1] : image;

      const response = await axios.post(`${API}/api/image-search/search`, {
        image_base64: base64Data,
        limit: 12
      });

      setResults(response.data);
    } catch (err) {
      console.error('Search error:', err);
      setError(
        err.response?.data?.detail || 
        (language === 'ar' ? 'خطأ في البحث' : 'Search error')
      );
    } finally {
      setLoading(false);
    }
  }, [image, language]);

  // إعادة تعيين الكل
  const handleReset = useCallback(() => {
    setImage(null);
    setImagePreview(null);
    setResults(null);
    setError(null);
  }, []);

  // تنسيق السعر
  const formatPrice = (price) => {
    return new Intl.NumberFormat(language === 'ar' ? 'ar-SY' : 'en-US').format(price);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Camera size={20} className="text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900 dark:text-white">{t.title}</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t.subtitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <X size={18} className="text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* منطقة رفع الصورة */}
            {!imagePreview && !results && (
              <div className="space-y-4">
                {/* Drop Zone */}
                <div 
                  className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-8 text-center hover:border-purple-500 transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const file = e.dataTransfer.files[0];
                    if (file) {
                      const input = fileInputRef.current;
                      const dt = new DataTransfer();
                      dt.items.add(file);
                      input.files = dt.files;
                      handleImageSelect({ target: input });
                    }
                  }}
                >
                  <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ImageIcon size={32} className="text-purple-500" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-2">{t.dragDrop}</p>
                  
                  {/* أزرار الاختيار */}
                  <div className="flex items-center justify-center gap-3 mt-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="px-4 py-2 bg-purple-500 text-white rounded-xl font-medium flex items-center gap-2 hover:bg-purple-600 transition-colors"
                    >
                      <Upload size={18} />
                      {t.uploadPhoto}
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        cameraInputRef.current?.click();
                      }}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium flex items-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <Camera size={18} />
                      {t.takePhoto}
                    </button>
                  </div>
                </div>

                {/* Hidden inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleImageSelect}
                />

                {/* AI Badge */}
                <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400 text-sm">
                  <Sparkles size={16} className="text-purple-500" />
                  <span>{language === 'ar' ? 'مدعوم بالذكاء الاصطناعي' : 'Powered by AI'}</span>
                </div>
              </div>
            )}

            {/* عرض الصورة المختارة */}
            {imagePreview && !results && (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full max-h-64 object-contain"
                  />
                  <button
                    onClick={handleReset}
                    className="absolute top-2 right-2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                  >
                    <X size={16} className="text-white" />
                  </button>
                </div>

                {/* زر البحث */}
                <button
                  onClick={handleSearch}
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      {t.searching}
                    </>
                  ) : (
                    <>
                      <Search size={20} />
                      {language === 'ar' ? 'بحث عن منتجات مشابهة' : 'Find Similar Products'}
                    </>
                  )}
                </button>

                {loading && (
                  <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
                    {t.analyzing}...
                  </p>
                )}
              </div>
            )}

            {/* عرض النتائج */}
            {results && (
              <div className="space-y-4">
                {/* التحليل */}
                {results.analysis && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Sparkles size={18} className="text-purple-500" />
                      {t.analysis}
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {results.analysis.category && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">{t.category}:</span>
                          <span className="mr-2 text-gray-900 dark:text-white font-medium">
                            {results.analysis.category}
                          </span>
                        </div>
                      )}
                      {results.analysis.colors?.length > 0 && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">{t.colors}:</span>
                          <span className="mr-2 text-gray-900 dark:text-white font-medium">
                            {results.analysis.colors.join(', ')}
                          </span>
                        </div>
                      )}
                      {results.analysis.style && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">{t.style}:</span>
                          <span className="mr-2 text-gray-900 dark:text-white font-medium">
                            {results.analysis.style}
                          </span>
                        </div>
                      )}
                    </div>
                    {results.analysis.description && (
                      <p className="mt-2 text-gray-600 dark:text-gray-300 text-sm">
                        {results.analysis.description}
                      </p>
                    )}
                  </div>
                )}

                {/* المنتجات */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-gray-900 dark:text-white">
                      {t.resultsTitle} ({results.total})
                    </h3>
                    <button
                      onClick={handleReset}
                      className="text-sm text-purple-500 hover:text-purple-600"
                    >
                      {t.tryAgain}
                    </button>
                  </div>

                  {results.products?.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {results.products.map((product) => (
                        <Link
                          key={product.product_id}
                          to={`/products/${product.product_id}`}
                          onClick={onClose}
                          className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-shadow group"
                        >
                          <div className="aspect-square bg-gray-100 dark:bg-gray-700 overflow-hidden">
                            {product.image ? (
                              <img 
                                src={product.image} 
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <ImageIcon size={32} />
                              </div>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {product.name}
                            </p>
                            <p className="text-xs text-purple-500 mt-0.5">
                              {product.similarity_reason}
                            </p>
                            <p className="text-sm font-bold text-[#FF6B00] mt-1">
                              {formatPrice(product.price)} {t.currency}
                            </p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Search size={32} className="text-gray-400" />
                      </div>
                      <p className="text-gray-500 dark:text-gray-400">{t.noResults}</p>
                      <button
                        onClick={handleReset}
                        className="mt-3 text-purple-500 hover:text-purple-600"
                      >
                        {t.tryAgain}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* رسالة الخطأ */}
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-red-700 dark:text-red-400">{error}</p>
                  <button
                    onClick={handleReset}
                    className="text-sm text-red-500 hover:text-red-600 mt-1"
                  >
                    {t.tryAgain}
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ImageSearchModal;
