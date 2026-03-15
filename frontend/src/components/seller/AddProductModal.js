import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Loader2, Upload, Camera, Info, AlertTriangle } from 'lucide-react';
import PhotoGuideModal from './PhotoGuideModal';
import ImageBackgroundSelector from './ImageBackgroundSelector';
import { validateAndEnhanceImage } from '../../utils/imageHelpers';
import { CATEGORIES } from '../../utils/constants';

const AddProductModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  saving,
  toast,
  isFoodSeller = false,
  commissionInfo = null
}) => {
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: isFoodSeller ? 'main' : 'electronics',
    stock: '',
    images: [],
    video: null,
    length_cm: '',
    width_cm: '',
    height_cm: '',
    weight_kg: '',
    size_type: 'none',
    available_sizes: [],
    max_per_customer: '',
    weight_variants: [],
    // حقول خاصة بالطعام
    preparation_time: '15',
    is_available: true
  });
  
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [showPhotoGuide, setShowPhotoGuide] = useState(false);
  const [newWeightVariant, setNewWeightVariant] = useState({ weight: '', price: '' });
  const [imageWarnings, setImageWarnings] = useState([]);
  const [pendingImage, setPendingImage] = useState(null);
  const [showImageProcessor, setShowImageProcessor] = useState(false);

  if (!isOpen) return null;

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setUploadingImage(true);
    setImageWarnings([]);
    
    try {
      for (const file of files) {
        const result = await validateAndEnhanceImage(file);
        
        if (result.issues.length > 0) {
          toast({
            title: "مشكلة في الصورة",
            description: result.issues[0],
            variant: "destructive"
          });
          continue;
        }
        
        setPendingImage(result.dataUrl);
        setShowImageProcessor(true);
        
        if (result.warnings.length > 0) {
          setImageWarnings(prev => [...prev, ...result.warnings]);
        }
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ في رفع الصورة",
        variant: "destructive"
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleProcessedImage = (processedImageUrl) => {
    setNewProduct(prev => ({
      ...prev,
      images: [...prev.images, processedImageUrl]
    }));
    setShowImageProcessor(false);
    setPendingImage(null);
    toast({
      title: "تم إضافة الصورة",
      description: "تمت إضافة الصورة بنجاح"
    });
  };

  const handleCancelImageProcess = () => {
    setShowImageProcessor(false);
    setPendingImage(null);
  };

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "خطأ",
          description: "حجم الفيديو كبير جداً (الحد الأقصى 50MB)",
          variant: "destructive"
        });
        return;
      }
      setUploadingVideo(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProduct(prev => ({
          ...prev,
          video: reader.result
        }));
        setUploadingVideo(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // إضافة خيار وزن جديد
  const addWeightVariant = () => {
    if (newWeightVariant.weight && newWeightVariant.price) {
      setNewProduct(prev => ({
        ...prev,
        weight_variants: [...prev.weight_variants, {
          weight: newWeightVariant.weight,
          price: parseFloat(newWeightVariant.price)
        }]
      }));
      setNewWeightVariant({ weight: '', price: '' });
    }
  };

  // حذف خيار وزن
  const removeWeightVariant = (index) => {
    setNewProduct(prev => ({
      ...prev,
      weight_variants: prev.weight_variants.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newProduct.images.length === 0) {
      toast({
        title: "خطأ",
        description: isFoodSeller ? "يرجى إضافة صورة للطبق" : "يرجى إضافة صورة واحدة على الأقل",
        variant: "destructive"
      });
      return;
    }

    const submitData = isFoodSeller ? {
      name: newProduct.name,
      description: newProduct.description,
      price: parseFloat(newProduct.price),
      category: newProduct.category,
      preparation_time: parseInt(newProduct.preparation_time) || 15,
      is_available: newProduct.is_available,
      images: newProduct.images
    } : {
      ...newProduct,
      price: parseFloat(newProduct.price),
      stock: parseInt(newProduct.stock),
      video: newProduct.video || null,
      length_cm: newProduct.length_cm ? parseFloat(newProduct.length_cm) : null,
      width_cm: newProduct.width_cm ? parseFloat(newProduct.width_cm) : null,
      height_cm: newProduct.height_cm ? parseFloat(newProduct.height_cm) : null,
      weight_kg: newProduct.weight_kg ? parseFloat(newProduct.weight_kg) : null,
      size_type: newProduct.size_type !== 'none' ? newProduct.size_type : null,
      available_sizes: newProduct.available_sizes.length > 0 ? newProduct.available_sizes : null,
      max_per_customer: newProduct.max_per_customer ? parseInt(newProduct.max_per_customer) : null,
      weight_variants: newProduct.weight_variants.length > 0 ? newProduct.weight_variants : null
    };

    await onSave(submitData);

    // Reset form
    setNewProduct({
      name: '',
      description: '',
      price: '',
      category: isFoodSeller ? 'main' : 'electronics',
      stock: '',
      images: [],
      video: null,
      length_cm: '',
      width_cm: '',
      height_cm: '',
      weight_kg: '',
      size_type: 'none',
      available_sizes: [],
      max_per_customer: '',
      weight_variants: [],
      preparation_time: '15',
      is_available: true
    });
  };

  // التسميات حسب نوع البائع
  const labels = isFoodSeller ? {
    title: 'إضافة طبق جديد',
    nameLabel: 'اسم الطبق',
    namePlaceholder: 'مثال: شاورما دجاج',
    descLabel: 'وصف الطبق',
    descPlaceholder: 'وصف قصير للطبق ومكوناته',
    priceLabel: 'السعر (ل.س)',
    categoryLabel: 'تصنيف الطبق',
    submitButton: 'إضافة الطبق'
  } : {
    title: 'إضافة منتج جديد',
    nameLabel: 'اسم المنتج',
    namePlaceholder: '',
    descLabel: 'الوصف',
    descPlaceholder: '',
    priceLabel: 'السعر (ل.س)',
    categoryLabel: 'الفئة',
    submitButton: 'إضافة المنتج'
  };

  // أصناف الطعام
  const foodCategories = [
    { id: 'appetizers', name: 'مقبلات' },
    { id: 'main', name: 'أطباق رئيسية' },
    { id: 'grills', name: 'مشويات' },
    { id: 'sandwiches', name: 'سندويشات' },
    { id: 'shawarma', name: 'شاورما' },
    { id: 'pizza', name: 'بيتزا' },
    { id: 'burgers', name: 'برغر' },
    { id: 'salads', name: 'سلطات' },
    { id: 'soups', name: 'شوربات' },
    { id: 'desserts', name: 'حلويات' },
    { id: 'beverages', name: 'مشروبات' },
    { id: 'breakfast', name: 'فطور' }
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-xl p-4 w-full max-w-md max-h-[85vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-900">{labels.title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X size={16} className="text-gray-500" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-2">
            <div>
              <label className="block text-[10px] font-medium mb-1 text-gray-700">{labels.nameLabel}</label>
              <input
                type="text"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none"
                placeholder={labels.namePlaceholder}
                required
                data-testid="product-name-input"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium mb-1 text-gray-700">{labels.descLabel}</label>
              <textarea
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none"
                placeholder={labels.descPlaceholder}
                rows={2}
                required
                data-testid="product-desc-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-medium mb-1 text-gray-700">{labels.priceLabel}</label>
                <input
                  type="number"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none"
                  required
                  data-testid="product-price-input"
                />
              </div>
              
              {/* حاسبة الأرباح والعمولة */}
              {newProduct.price > 0 && commissionInfo && (
                <div className="col-span-2 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-3 border border-amber-200">
                  <h4 className="font-bold text-amber-800 text-xs mb-2 flex items-center gap-1">
                    <Info size={12} />
                    تفاصيل أرباحك
                  </h4>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">سعر البيع:</span>
                    <span className="font-medium">{Number(newProduct.price).toLocaleString()} ل.س</span>
                  </div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-red-600">عمولة المنصة ({commissionInfo.commission_percentage}):</span>
                    <span className="font-medium text-red-600">- {Math.round(Number(newProduct.price) * commissionInfo.commission_rate).toLocaleString()} ل.س</span>
                  </div>
                  <div className="flex justify-between text-xs bg-green-100 rounded px-2 py-1 mt-2">
                    <span className="font-bold text-green-700">صافي ربحك:</span>
                    <span className="font-bold text-green-700">{Math.round(Number(newProduct.price) * (1 - commissionInfo.commission_rate)).toLocaleString()} ل.س ✅</span>
                  </div>
                </div>
              )}
              
              {isFoodSeller ? (
                <div>
                  <label className="block text-[10px] font-medium mb-1 text-gray-700">وقت التحضير (دقيقة)</label>
                  <input
                    type="number"
                    value={newProduct.preparation_time}
                    onChange={(e) => setNewProduct({ ...newProduct, preparation_time: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none"
                    min="1"
                    required
                    data-testid="food-prep-time-input"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-medium mb-1 text-gray-700">الكمية</label>
                  <input
                    type="number"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct({ ...newProduct, stock: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none"
                    required
                    data-testid="product-stock-input"
                  />
                </div>
              )}
            </div>

            {/* تصنيف الطعام */}
            {isFoodSeller && (
              <div>
                <label className="block text-[10px] font-medium mb-1 text-gray-700">{labels.categoryLabel}</label>
                <select
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none"
                  data-testid="food-category-select"
                >
                  {foodCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* الحقول الخاصة بالمنتجات فقط */}
            {!isFoodSeller && (
              <>
                {/* الحد الأقصى لكل عميل */}
                <div>
                  <label className="block text-[10px] font-medium mb-1 text-gray-700">
                    الحد الأقصى لكل عميل (اختياري)
                  </label>
                  <input
                    type="number"
                    value={newProduct.max_per_customer}
                    onChange={(e) => setNewProduct({ ...newProduct, max_per_customer: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none"
                    placeholder="مثال: 2 (اتركه فارغاً للسماح بأي كمية)"
                    min="1"
                    data-testid="product-max-per-customer-input"
                  />
                  <p className="text-[9px] text-gray-500 mt-0.5">حدد الحد الأقصى من القطع التي يمكن للعميل الواحد شراؤها</p>
                </div>

                {/* خيارات الوزن */}
                <div>
                  <label className="block text-[10px] font-medium mb-1 text-gray-700">
                    خيارات الوزن (اختياري - للمنتجات التي تُباع بأوزان مختلفة)
                  </label>
                  
                  {/* عرض خيارات الوزن المضافة */}
                  {newProduct.weight_variants.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {newProduct.weight_variants.map((variant, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-1 bg-orange-50 border border-orange-200 rounded-lg px-2 py-1"
                    >
                      <span className="text-[10px] font-medium text-orange-700">
                        {variant.weight} - {variant.price.toLocaleString()} ل.س
                      </span>
                      <button
                        type="button"
                        onClick={() => removeWeightVariant(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  </div>
                  )}
                  
                  {/* إضافة خيار وزن جديد */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={newWeightVariant.weight}
                        onChange={(e) => setNewWeightVariant({ ...newWeightVariant, weight: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none"
                        placeholder="الوزن (مثال: 250g, 500g, 1kg)"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="number"
                        value={newWeightVariant.price}
                        onChange={(e) => setNewWeightVariant({ ...newWeightVariant, price: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none"
                        placeholder="السعر"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={addWeightVariant}
                      className="px-3 py-1.5 bg-[#FF6B00] text-white rounded-lg text-xs hover:bg-[#E55A00] transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <p className="text-[9px] text-gray-500 mt-0.5">
                    أضف خيارات الوزن المختلفة مع أسعارها (مثال: قهوة 250g بـ 50,000 ل.س)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium mb-1 text-gray-700">الصنف</label>
                    <select
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none"
                      data-testid="product-category-select"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* أبعاد المنتج */}
                <div>
                  <label className="block text-[10px] font-medium mb-1 text-gray-700">الأبعاد (سم) - اختياري</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      value={newProduct.length_cm}
                      onChange={(e) => setNewProduct({ ...newProduct, length_cm: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none"
                      placeholder="الطول"
                      data-testid="product-length-input"
                    />
                    <input
                      type="number"
                      value={newProduct.width_cm}
                      onChange={(e) => setNewProduct({ ...newProduct, width_cm: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none"
                      placeholder="العرض"
                      data-testid="product-width-input"
                    />
                    <input
                      type="number"
                      value={newProduct.height_cm}
                      onChange={(e) => setNewProduct({ ...newProduct, height_cm: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none"
                      placeholder="الارتفاع"
                      data-testid="product-height-input"
                    />
                  </div>
                </div>

                {/* الوزن */}
                <div>
                  <label className="block text-[10px] font-medium mb-1 text-gray-700">الوزن (كغ) - اختياري</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newProduct.weight_kg}
                    onChange={(e) => setNewProduct({ ...newProduct, weight_kg: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none"
                    placeholder="مثال: 1.5"
                    data-testid="product-weight-input"
                  />
                </div>
              </>
            )}

            {/* Images Section */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-medium text-gray-700">
                  صور المنتج ({newProduct.images.length}/5)
                </label>
                <button
                  type="button"
                  onClick={() => setShowPhotoGuide(true)}
                  className="text-[10px] text-[#FF6B00] font-bold flex items-center gap-1 hover:underline"
                >
                  <Camera size={12} />
                  دليل التصوير
                </button>
              </div>
              
              {imageWarnings.length > 0 && (
                <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                  {imageWarnings.map((warning, i) => (
                    <p key={i} className="text-[10px] text-yellow-700 flex items-center gap-1">
                      <AlertTriangle size={10} />
                      {warning}
                    </p>
                  ))}
                </div>
              )}
              
              {/* أزرار إضافة الصور - كاميرا ومعرض */}
              {newProduct.images.length < 5 && (
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => document.getElementById('product-camera').click()}
                    disabled={uploadingImage}
                    className="flex-1 py-2.5 bg-[#FF6B00] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#E55A00] transition-colors disabled:opacity-50"
                    data-testid="camera-capture-btn"
                  >
                    {uploadingImage ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>
                        <Camera size={16} />
                        تصوير بالكاميرا
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => document.getElementById('product-images').click()}
                    disabled={uploadingImage}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors disabled:opacity-50"
                    data-testid="gallery-upload-btn"
                  >
                    {uploadingImage ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <>
                        <Upload size={16} />
                        من المعرض
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* معاينة الصور المضافة */}
              {newProduct.images.length > 0 && (
                <div className="grid grid-cols-5 gap-1.5 mb-1">
                  {newProduct.images.map((img, i) => (
                    <div key={i} className="relative aspect-square group">
                      <img src={img} alt="" className="w-full h-full object-cover rounded border border-gray-200" />
                      <button
                        type="button"
                        onClick={() => {
                          setNewProduct({
                            ...newProduct,
                            images: newProduct.images.filter((_, idx) => idx !== i)
                          });
                          setImageWarnings([]);
                        }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X size={10} />
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-0 left-0 right-0 bg-[#FF6B00] text-white text-[7px] text-center py-0.5 rounded-b">
                          رئيسية
                        </span>
                      )}
                    </div>
                  ))}
                  {newProduct.images.length < 5 && (
                    <button
                      type="button"
                      onClick={() => document.getElementById('product-images').click()}
                      className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-[#FF6B00] hover:bg-orange-50 transition-colors"
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? (
                        <Loader2 size={14} className="text-[#FF6B00] animate-spin" />
                      ) : (
                        <>
                          <Plus size={14} className="text-gray-400" />
                          <span className="text-[8px] text-gray-400 mt-0.5">إضافة</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
              
              {newProduct.images.length === 0 && (
                <p className="text-[9px] text-gray-400 flex items-center gap-1">
                  <Info size={10} />
                  استخدم خلفية بيضاء وإضاءة جيدة للحصول على أفضل النتائج
                </p>
              )}
              
              {/* Input للكاميرا - يفتح الكاميرا مباشرة */}
              <input
                id="product-camera"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="hidden"
              />
              {/* Input للمعرض - يفتح معرض الصور */}
              <input
                id="product-images"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>

            {/* Video Section */}
            <div>
              <label className="block text-[10px] font-medium mb-1 text-gray-700">إضافة فيديو (اختياري)</label>
              {newProduct.video ? (
                <div className="relative bg-gray-100 rounded-lg p-2">
                  <video 
                    src={newProduct.video} 
                    className="w-full h-24 object-cover rounded"
                    controls
                  />
                  <button
                    type="button"
                    onClick={() => setNewProduct({ ...newProduct, video: null })}
                    className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => document.getElementById('product-video').click()}
                  disabled={uploadingVideo}
                  className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-gray-500 text-[10px] flex items-center justify-center gap-1 hover:border-[#FF6B00] hover:text-[#FF6B00]"
                >
                  {uploadingVideo ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <>
                      <Upload size={12} />
                      اختر فيديو من الجهاز
                    </>
                  )}
                </button>
              )}
              <input
                id="product-video"
                type="file"
                accept="video/*"
                onChange={handleVideoUpload}
                className="hidden"
                data-testid="product-video-input"
              />
              <p className="text-[8px] text-gray-400 mt-0.5">الحد الأقصى 50MB</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-full text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-[#FF6B00] text-white font-bold py-2 rounded-full text-xs disabled:opacity-50 flex items-center justify-center gap-1"
                data-testid="save-product-btn"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin" size={12} />
                    جاري الحفظ...
                  </>
                ) : (
                  labels.submitButton
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      <PhotoGuideModal isOpen={showPhotoGuide} onClose={() => setShowPhotoGuide(false)} />
      
      <ImageBackgroundSelector
        imageDataUrl={pendingImage}
        onProcessed={handleProcessedImage}
        onCancel={handleCancelImageProcess}
        isOpen={showImageProcessor}
      />
    </>
  );
};

export default AddProductModal;
