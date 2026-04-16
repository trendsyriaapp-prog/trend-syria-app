import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Loader2, Upload, Camera, Info, AlertTriangle, Edit3, Eye, Copy, Sparkles, Lightbulb } from 'lucide-react';
import axios from 'axios';
import PhotoGuideModal from './PhotoGuideModal';
import SimpleImageCapture from './SimpleImageCapture';
import TemplateSelector from './TemplateSelector';
import ProductPreviewModal from './ProductPreviewModal';
import { CATEGORIES } from '../../utils/constants';
import { getErrorMessage } from '../../utils/errorHelpers';
import { validateAndEnhanceImage } from '../../utils/imageHelpers';
import { compressProductImage } from '../../utils/imageCompression';
import { processVideo, VIDEO_CONFIG, uploadVideoToCDN, revokeVideoPreviewUrl, getVideoUrl, isCDNVideoPath } from '../../utils/videoValidation';

const API = process.env.REACT_APP_BACKEND_URL;

const AddProductModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  saving,
  toast,
  isFoodSeller = false,
  commissionInfo = null,
  initialData = null, // بيانات المنتج المنسوخ
  product = null, // المنتج المراد تعديله
  onSuccess = null, // callback عند النجاح
  token = null // توكن البائع
}) => {
  // تحديد إذا كان تعديل أو إضافة أو نسخ
  const isEditing = product && !initialData;
  const isDuplicating = !!initialData;
  const getDefaultProduct = () => ({
    name: '',
    description: '',
    price: '',
    category: isFoodSeller ? 'main' : 'electronics',
    stock: '',
    images: [],
    video: null,
    admin_video: null, // فيديو التحقق للأدمن (إجباري)
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

  const [newProduct, setNewProduct] = useState(getDefaultProduct());
  const [isDuplicate, setIsDuplicate] = useState(false);
  
  // تحميل بيانات المنتج عند فتح الـ Modal (تعديل أو نسخ)
  useEffect(() => {
    if (isOpen) {
      // حالة التعديل
      if (product && !initialData) {
        setNewProduct({
          ...getDefaultProduct(),
          name: product.name || '',
          description: product.description || '',
          price: product.price?.toString() || '',
          category: product.category || (isFoodSeller ? 'main' : 'electronics'),
          stock: product.stock?.toString() || '',
          images: product.images || [],
          video: product.video || null,
          admin_video: null, // فيديو التحقق يُطلب دائماً عند التعديل
          length_cm: product.length_cm?.toString() || '',
          width_cm: product.width_cm?.toString() || '',
          height_cm: product.height_cm?.toString() || '',
          weight_kg: product.weight_kg?.toString() || '',
          size_type: product.size_type || 'none',
          available_sizes: product.available_sizes || [],
          max_per_customer: product.max_per_customer?.toString() || '',
          weight_variants: product.weight_variants || [],
          is_available: product.is_available !== false,
        });
        setSellingType(product.weight_variants?.length > 0 ? 'weight' : 'piece');
        setIsDuplicate(false);
      }
      // حالة النسخ
      else if (initialData) {
        setNewProduct({
          ...getDefaultProduct(),
          name: initialData.name || '',
          description: initialData.description || '',
          price: initialData.price?.toString() || '',
          category: initialData.category || (isFoodSeller ? 'main' : 'electronics'),
          stock: initialData.stock?.toString() || '',
          images: initialData.images || [],
          length_cm: initialData.length_cm?.toString() || '',
          width_cm: initialData.width_cm?.toString() || '',
          height_cm: initialData.height_cm?.toString() || '',
          weight_kg: initialData.weight_kg?.toString() || '',
          size_type: initialData.size_type || 'none',
          available_sizes: initialData.available_sizes || [],
          max_per_customer: initialData.max_per_customer?.toString() || '',
          weight_variants: initialData.weight_variants || [],
        });
        setSellingType(initialData.weight_variants?.length > 0 ? 'weight' : 'piece');
        setIsDuplicate(true);
      }
      // حالة الإضافة الجديدة
      else {
        setNewProduct(getDefaultProduct());
        setSellingType('piece');
        setIsDuplicate(false);
      }
    }
  }, [isOpen, initialData, product, isFoodSeller]);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [showPhotoGuide, setShowPhotoGuide] = useState(false);
  const [newWeightVariant, setNewWeightVariant] = useState({ weight: '', unit: 'g', price: '' });
  const [imageWarnings, setImageWarnings] = useState([]);
  const [showImageCapture, setShowImageCapture] = useState(false);
  const [imageCaptureMode, setImageCaptureMode] = useState('camera'); // 'camera' or 'gallery'
  const [showProductPreview, setShowProductPreview] = useState(false);
  const [maxImagesPerProduct, setMaxImagesPerProduct] = useState(3);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [sellingType, setSellingType] = useState('piece'); // 'piece' أو 'weight'
  
  // State للفيديو الجديد (File objects بدلاً من Base64)
  const [videoFile, setVideoFile] = useState(null);
  const [adminVideoFile, setAdminVideoFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [adminVideoPreviewUrl, setAdminVideoPreviewUrl] = useState(null);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [adminVideoUploadProgress, setAdminVideoUploadProgress] = useState(0);
  
  // اقتراح تصنيف جديد
  const [showSuggestCategory, setShowSuggestCategory] = useState(false);
  const [suggestingCategory, setSuggestingCategory] = useState(false);
  const [newCategorySuggestion, setNewCategorySuggestion] = useState({ name: '', name_en: '', description: '' });

  // دالة اقتراح تصنيف جديد
  const handleSuggestCategory = async () => {
    if (!newCategorySuggestion.name.trim()) {
      toast?.({
        title: "خطأ",
        description: "يرجى إدخال اسم التصنيف",
        variant: "destructive"
      });
      return;
    }

    setSuggestingCategory(true);
    try {
      await axios.post(`${API}/api/categories/suggest`, {
        name: newCategorySuggestion.name,
        name_en: newCategorySuggestion.name_en || null,
        description: newCategorySuggestion.description || null,
        type: isFoodSeller ? "food" : "shopping"
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast?.({
        title: "تم الإرسال ✅",
        description: "تم إرسال اقتراحك للإدارة. سنراجعه قريباً!",
      });

      setShowSuggestCategory(false);
      setNewCategorySuggestion({ name: '', name_en: '', description: '' });
    } catch (error) {
      toast?.({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل في إرسال الاقتراح",
        variant: "destructive"
      });
    } finally {
      setSuggestingCategory(false);
    }
  };

  // جلب إعدادات الصور من السيرفر
  useEffect(() => {
    const fetchImageSettings = async () => {
      try {
        const API = process.env.REACT_APP_BACKEND_URL;
        const res = await fetch(`${API}/api/image/settings`);
        const data = await res.json();
        if (data.max_images_per_product) {
          setMaxImagesPerProduct(data.max_images_per_product);
        }
      } catch (error) {
        console.error('Error fetching image settings:', error);
      }
    };
    fetchImageSettings();
  }, []);

  if (!isOpen) return null;

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    // إعادة تعيين الـ input لقبول نفس الملف مرة أخرى
    e.target.value = '';
    
    // التحقق من عدد الصور المسموح
    if (newProduct.images.length >= maxImagesPerProduct) {
      toast?.({
        title: "تنبيه",
        description: `الحد الأقصى ${maxImagesPerProduct} صور`,
        variant: "destructive"
      });
      return;
    }
    
    setUploadingImage(true);
    setImageWarnings([]);
    
    try {
      // معالجة الصورة الأولى فقط
      const file = files[0];
      const result = await validateAndEnhanceImage(file);
      
      if (result.issues.length > 0) {
        toast?.({
          title: "مشكلة في الصورة",
          description: result.issues[0],
          variant: "destructive"
        });
        setUploadingImage(false);
        return;
      }
      
      // إضافة الصورة مباشرة إلى المصفوفة
      setNewProduct(prev => ({
        ...prev,
        images: [...prev.images, result.dataUrl].slice(0, maxImagesPerProduct)
      }));
      
      toast?.({
        title: "تم بنجاح ✨",
        description: "تم إضافة الصورة"
      });
      
      if (result.warnings.length > 0) {
        setImageWarnings(prev => [...prev, ...result.warnings]);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      toast?.({
        title: "خطأ",
        description: "حدث خطأ في رفع الصورة",
        variant: "destructive"
      });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingVideo(true);
    setVideoUploadProgress(0);
    
    try {
      // التحقق من صحة الفيديو وإنشاء preview URL
      const result = await processVideo(file, (progress) => {
        console.log(progress);
      });
      
      if (!result.success) {
        toast({
          title: "خطأ في الفيديو",
          description: result.error,
          variant: "destructive"
        });
        setUploadingVideo(false);
        return;
      }
      
      // تحرير URL القديم إن وجد
      if (videoPreviewUrl) {
        revokeVideoPreviewUrl(videoPreviewUrl);
      }
      
      // حفظ الملف و preview URL
      setVideoFile(result.file);
      setVideoPreviewUrl(result.previewUrl);
      
      // تحديث state المنتج بـ preview URL مؤقتاً
      setNewProduct(prev => ({
        ...prev,
        video: result.previewUrl,
        _videoNeedsUpload: true // علامة داخلية
      }));
      
      toast({
        title: "تم تحميل الفيديو ✅",
        description: `مدة الفيديو: ${result.duration} ثانية | الحجم: ${result.sizeMB}MB`
      });
    } catch (error) {
      console.error('Video error:', error);
      toast({
        title: "خطأ",
        description: "فشل في معالجة الفيديو",
        variant: "destructive"
      });
    } finally {
      setUploadingVideo(false);
    }
  };

  // رفع فيديو التحقق للأدمن
  const handleAdminVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingVideo(true);
    setAdminVideoUploadProgress(0);
    
    try {
      const result = await processVideo(file, (progress) => {
        console.log(progress);
      });
      
      if (!result.success) {
        toast({
          title: "خطأ في الفيديو",
          description: result.error,
          variant: "destructive"
        });
        setUploadingVideo(false);
        return;
      }
      
      // تحرير URL القديم إن وجد
      if (adminVideoPreviewUrl) {
        revokeVideoPreviewUrl(adminVideoPreviewUrl);
      }
      
      // حفظ الملف و preview URL
      setAdminVideoFile(result.file);
      setAdminVideoPreviewUrl(result.previewUrl);
      
      // تحديث state المنتج
      setNewProduct(prev => ({
        ...prev,
        admin_video: result.previewUrl,
        _adminVideoNeedsUpload: true // علامة داخلية
      }));
      
      toast({
        title: "تم تحميل فيديو التحقق ✅",
        description: `مدة الفيديو: ${result.duration} ثانية | الحجم: ${result.sizeMB}MB`
      });
    } catch (error) {
      console.error('Admin video error:', error);
      toast({
        title: "خطأ",
        description: "فشل في معالجة الفيديو",
        variant: "destructive"
      });
    } finally {
      setUploadingVideo(false);
    }
  };

  // إضافة خيار وزن جديد
  const addWeightVariant = () => {
    if (newWeightVariant.weight && newWeightVariant.price) {
      let weightDisplay;
      if (newWeightVariant.unit === 'piece') {
        weightDisplay = newWeightVariant.weight === '1' ? 'قطعة' : `${newWeightVariant.weight} قطع`;
      } else {
        weightDisplay = `${newWeightVariant.weight}${newWeightVariant.unit}`;
      }
      setNewProduct(prev => ({
        ...prev,
        weight_variants: [...prev.weight_variants, {
          weight: weightDisplay,
          price: parseFloat(newWeightVariant.price)
        }]
      }));
      setNewWeightVariant({ weight: '', unit: 'g', price: '' });
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

    // التحقق من فيديو التحقق للأدمن (إجباري)
    if (!newProduct.admin_video && !adminVideoFile) {
      toast({
        title: "فيديو التحقق مطلوب 📹",
        description: "يرجى رفع فيديو قصير يُظهر المنتج الحقيقي للمراجعة",
        variant: "destructive"
      });
      return;
    }

    // رفع الفيديوهات إلى CDN إذا كانت موجودة
    let videoPath = newProduct.video;
    let adminVideoPath = newProduct.admin_video;

    try {
      // رفع فيديو المنتج إذا كان جديداً
      if (videoFile) {
        toast({
          title: "جاري رفع فيديو المنتج...",
          description: "يرجى الانتظار"
        });
        
        const videoResult = await uploadVideoToCDN(
          videoFile, 
          'videos', 
          (progress) => {
            setVideoUploadProgress(progress.percent || 0);
          },
          token
        );
        
        if (videoResult.success) {
          videoPath = videoResult.path;
        } else {
          throw new Error('فشل رفع فيديو المنتج');
        }
      }

      // رفع فيديو التحقق إذا كان جديداً
      if (adminVideoFile) {
        toast({
          title: "جاري رفع فيديو التحقق...",
          description: "يرجى الانتظار"
        });
        
        const adminVideoResult = await uploadVideoToCDN(
          adminVideoFile, 
          'admin_videos', 
          (progress) => {
            setAdminVideoUploadProgress(progress.percent || 0);
          },
          token
        );
        
        if (adminVideoResult.success) {
          adminVideoPath = adminVideoResult.path;
        } else {
          throw new Error('فشل رفع فيديو التحقق');
        }
      }
    } catch (uploadError) {
      console.error('Video upload error:', uploadError);
      toast({
        title: "خطأ في رفع الفيديو",
        description: uploadError.message || "فشل رفع الفيديو. تحقق من اتصال الإنترنت",
        variant: "destructive"
      });
      return;
    }

    // تنظيف المسارات - إزالة blob URLs
    if (videoPath && videoPath.startsWith('blob:')) {
      videoPath = null; // لا نحفظ blob URLs
    }
    if (adminVideoPath && adminVideoPath.startsWith('blob:')) {
      adminVideoPath = null;
    }

    const submitData = isFoodSeller ? {
      name: newProduct.name,
      description: newProduct.description,
      price: parseFloat(newProduct.price),
      category: newProduct.category,
      preparation_time: parseInt(newProduct.preparation_time) || 15,
      is_available: newProduct.is_available,
      images: newProduct.images,
      admin_video: adminVideoPath // فيديو التحقق للأدمن (CDN path)
    } : {
      ...newProduct,
      price: parseFloat(newProduct.price),
      stock: parseInt(newProduct.stock),
      video: videoPath || null, // CDN path
      admin_video: adminVideoPath, // CDN path
      length_cm: newProduct.length_cm ? parseFloat(newProduct.length_cm) : null,
      width_cm: newProduct.width_cm ? parseFloat(newProduct.width_cm) : null,
      height_cm: newProduct.height_cm ? parseFloat(newProduct.height_cm) : null,
      weight_kg: newProduct.weight_kg ? parseFloat(newProduct.weight_kg) : null,
      size_type: newProduct.size_type !== 'none' ? newProduct.size_type : null,
      available_sizes: newProduct.available_sizes.length > 0 ? newProduct.available_sizes : null,
      max_per_customer: newProduct.max_per_customer ? parseInt(newProduct.max_per_customer) : null,
      weight_variants: newProduct.weight_variants.length > 0 ? newProduct.weight_variants : null
    };

    // إزالة الحقول الداخلية
    delete submitData._videoNeedsUpload;
    delete submitData._adminVideoNeedsUpload;

    try {
      // حالة التعديل - استخدام API التحديث
      if (isEditing && product?.id) {
        await axios.put(`${API}/api/products/${product.id}`, submitData, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        toast({
          title: "تم التعديل",
          description: isFoodSeller ? "تم تعديل الطبق بنجاح" : "تم تعديل المنتج بنجاح"
        });
        if (onSuccess) onSuccess();
      }
      // حالة الإضافة أو النسخ
      else if (onSave) {
        await onSave(submitData);
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: getErrorMessage(error, "حدث خطأ أثناء الحفظ"),
        variant: "destructive"
      });
      return;
    }

    // Reset form and cleanup video resources
    // تحرير Object URLs
    if (videoPreviewUrl) revokeVideoPreviewUrl(videoPreviewUrl);
    if (adminVideoPreviewUrl) revokeVideoPreviewUrl(adminVideoPreviewUrl);
    
    setVideoFile(null);
    setAdminVideoFile(null);
    setVideoPreviewUrl(null);
    setAdminVideoPreviewUrl(null);
    setVideoUploadProgress(0);
    setAdminVideoUploadProgress(0);
    
    setNewProduct({
      name: '',
      description: '',
      price: '',
      category: isFoodSeller ? 'main' : 'electronics',
      stock: '',
      images: [],
      video: null,
      admin_video: null,
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

  // التسميات حسب نوع البائع وحالة التعديل/النسخ/الإضافة
  const labels = isFoodSeller ? {
    title: isEditing ? 'تعديل الطبق' : (isDuplicating ? 'نسخ طبق' : 'إضافة طبق جديد'),
    nameLabel: 'اسم الطبق',
    namePlaceholder: 'مثال: شاورما دجاج',
    descLabel: 'وصف الطبق',
    descPlaceholder: 'وصف قصير للطبق ومكوناته',
    priceLabel: 'السعر (ل.س)',
    categoryLabel: 'تصنيف الطبق',
    submitButton: isEditing ? 'حفظ التعديلات' : (isDuplicating ? 'حفظ النسخة' : 'إضافة الطبق')
  } : {
    title: isEditing ? 'تعديل المنتج' : (isDuplicating ? 'نسخ منتج' : 'إضافة منتج جديد'),
    nameLabel: 'اسم المنتج',
    namePlaceholder: '',
    descLabel: 'الوصف',
    descPlaceholder: '',
    priceLabel: 'السعر (ل.س)',
    categoryLabel: 'الفئة',
    submitButton: isEditing ? 'حفظ التعديلات' : (isDuplicating ? 'حفظ النسخة' : 'إضافة المنتج')
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
      <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-3">
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-t-xl sm:rounded-xl p-4 w-full max-w-md max-h-[90vh] overflow-y-auto overscroll-contain"
          style={{ touchAction: 'pan-y' }}
          onTouchMove={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-gray-900">{labels.title}</h2>
              {isDuplicate && (
                <span className="bg-green-100 text-green-700 text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Copy size={10} />
                  نسخة
                </span>
              )}
            </div>
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
                className={`w-full bg-gray-50 border-2 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none transition-colors ${
                  newProduct.name ? 'border-green-400 bg-green-50/30' : 'border-orange-300 bg-orange-50/30'
                }`}
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
                className={`w-full bg-gray-50 border-2 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none transition-colors ${
                  newProduct.description ? 'border-green-400 bg-green-50/30' : 'border-orange-300 bg-orange-50/30'
                }`}
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
                  className={`w-full bg-gray-50 border-2 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none transition-colors ${
                    newProduct.price ? 'border-green-400 bg-green-50/30' : 'border-orange-300 bg-orange-50/30'
                  }`}
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
                    className={`w-full bg-gray-50 border-2 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none transition-colors ${
                      newProduct.preparation_time ? 'border-green-400 bg-green-50/30' : 'border-orange-300 bg-orange-50/30'
                    }`}
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
                    className={`w-full bg-gray-50 border-2 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none transition-colors ${
                      newProduct.stock ? 'border-green-400 bg-green-50/30' : 'border-orange-300 bg-orange-50/30'
                    }`}
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
                    className={`w-full bg-gray-50 border-2 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none transition-colors ${
                      newProduct.max_per_customer ? 'border-green-400 bg-green-50/30' : 'border-orange-300 bg-orange-50/30'
                    }`}
                    placeholder="مثال: 2 (اتركه فارغاً للسماح بأي كمية)"
                    min="1"
                    data-testid="product-max-per-customer-input"
                  />
                  <p className="text-[9px] text-gray-500 mt-0.5">حدد الحد الأقصى من القطع التي يمكن للعميل الواحد شراؤها</p>
                </div>
              </>
            )}

            {/* خيارات نوع البيع - متاحة للمنتجات والطعام */}
            <div className="border border-gray-200 rounded-xl p-3">
              <label className="block text-[10px] font-medium mb-2 text-gray-700">
                نوع البيع
              </label>
              
              {/* أزرار اختيار نوع البيع */}
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setSellingType('piece');
                    setNewProduct(prev => ({ ...prev, weight_variants: [] }));
                  }}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    sellingType === 'piece' 
                      ? 'bg-[#FF6B00] text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  بالقطعة
                </button>
                <button
                  type="button"
                  onClick={() => setSellingType('weight')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                    sellingType === 'weight' 
                      ? 'bg-[#FF6B00] text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  بالوزن
                </button>
              </div>

              {/* نصيحة تعليمية للبيع بالقطعة */}
              {sellingType === 'piece' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-2">
                  <p className="text-[10px] text-amber-800">
                    💡 <strong>نصيحة:</strong> عند البيع بالقطعة، يُفضل كتابة في الوصف:
                    <br />• الوزن التقريبي (مثال: "وزن القطعة ~500 جرام")
                    <br />• عدد القطع في العبوة (مثال: "العبوة 6 قطع")
                    <br />• الحجم أو المقاس (مثال: "مقاس XL / كبير")
                  </p>
                </div>
              )}

              {/* نصيحة تعليمية للبيع بالوزن */}
              {sellingType === 'weight' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 mb-2">
                  <p className="text-[10px] text-blue-800">
                    ⚖️ <strong>البيع بالوزن:</strong> أضف الأوزان المتاحة وسعر كل وزن.
                    <br />مثال: 250 جرام = 15,000 ل.س، 500 جرام = 28,000 ل.س، 1 كيلو = 50,000 ل.س
                  </p>
                </div>
              )}
              
              {/* قسم إضافة الأوزان - يظهر فقط عند اختيار "بالوزن" */}
              {sellingType === 'weight' && (
                <>
                  {/* عرض خيارات الوزن المضافة */}
                  {newProduct.weight_variants.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {newProduct.weight_variants.map((variant, index) => (
                        <div 
                          key={index}
                          className="flex items-center gap-1 bg-orange-50 border border-orange-200 rounded-lg px-2 py-1"
                        >
                          <span className="text-[10px] font-medium text-orange-700">
                            {variant.weight} {variant.unit === 'g' ? 'جرام' : variant.unit === 'kg' ? 'كيلو' : 'قطعة'} - {variant.price.toLocaleString()} ل.س
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
                    <div className="w-20">
                      <input
                        type="number"
                        value={newWeightVariant.weight}
                        onChange={(e) => setNewWeightVariant({ ...newWeightVariant, weight: e.target.value })}
                        className={`w-full bg-gray-50 border-2 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none transition-colors ${
                          newWeightVariant.weight ? 'border-green-400 bg-green-50/30' : 'border-orange-300 bg-orange-50/30'
                        }`}
                        placeholder={isFoodSeller ? "الكمية" : "الوزن"}
                      />
                    </div>
                    <div className="w-20">
                      <select
                        value={newWeightVariant.unit}
                        onChange={(e) => setNewWeightVariant({ ...newWeightVariant, unit: e.target.value })}
                        className="w-full bg-gray-50 border-2 border-green-400 bg-green-50/30 rounded-lg py-1.5 px-1 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none"
                      >
                        <option value="g">جرام</option>
                        <option value="kg">كيلو</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <input
                        type="number"
                        value={newWeightVariant.price}
                        onChange={(e) => setNewWeightVariant({ ...newWeightVariant, price: e.target.value })}
                        className={`w-full bg-gray-50 border-2 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none transition-colors ${
                          newWeightVariant.price ? 'border-green-400 bg-green-50/30' : 'border-orange-300 bg-orange-50/30'
                        }`}
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

                  {newProduct.weight_variants.length === 0 && (
                    <p className="text-[9px] text-red-500 mt-2">⚠️ أضف الأوزان المطلوبة</p>
                  )}
                </>
              )}
            </div>

            {/* باقي الحقول الخاصة بالمنتجات */}
            {!isFoodSeller && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <label className="block text-[10px] font-medium text-gray-700">الصنف</label>
                      <button
                        type="button"
                        onClick={() => setShowSuggestCategory(true)}
                        className="text-[9px] text-violet-600 hover:text-violet-700 flex items-center gap-0.5"
                      >
                        <Lightbulb size={10} />
                        <span>اقترح تصنيف</span>
                      </button>
                    </div>
                    <select
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                      className="w-full bg-gray-50 border-2 border-green-400 bg-green-50/30 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none mt-1"
                      data-testid="product-category-select"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* نموذج اقتراح تصنيف جديد */}
                {showSuggestCategory && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-violet-50 border border-violet-200 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-violet-700 flex items-center gap-1">
                        <Lightbulb size={14} />
                        اقتراح تصنيف جديد
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowSuggestCategory(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newCategorySuggestion.name}
                        onChange={(e) => setNewCategorySuggestion({ ...newCategorySuggestion, name: e.target.value })}
                        placeholder="اسم التصنيف بالعربية *"
                        className="w-full bg-white border border-violet-200 rounded-lg py-1.5 px-2 text-xs focus:border-violet-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={newCategorySuggestion.name_en}
                        onChange={(e) => setNewCategorySuggestion({ ...newCategorySuggestion, name_en: e.target.value })}
                        placeholder="اسم التصنيف بالإنجليزية (اختياري)"
                        className="w-full bg-white border border-violet-200 rounded-lg py-1.5 px-2 text-xs focus:border-violet-500 focus:outline-none"
                        dir="ltr"
                      />
                      <textarea
                        value={newCategorySuggestion.description}
                        onChange={(e) => setNewCategorySuggestion({ ...newCategorySuggestion, description: e.target.value })}
                        placeholder="وصف مختصر للتصنيف (اختياري)"
                        className="w-full bg-white border border-violet-200 rounded-lg py-1.5 px-2 text-xs focus:border-violet-500 focus:outline-none resize-none"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleSuggestCategory}
                          disabled={suggestingCategory || !newCategorySuggestion.name.trim()}
                          className="flex-1 bg-violet-600 text-white py-1.5 rounded-lg text-xs font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          {suggestingCategory ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <>
                              <Plus size={12} />
                              إرسال الاقتراح
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowSuggestCategory(false)}
                          className="px-3 bg-gray-200 text-gray-700 py-1.5 rounded-lg text-xs hover:bg-gray-300"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                    <p className="text-[9px] text-violet-600 mt-2">
                      💡 سيتم مراجعة اقتراحك من قبل الإدارة وإخطارك بالنتيجة
                    </p>
                  </motion.div>
                )}

                {/* أبعاد المنتج والوزن - تظهر فقط عند البيع بالقطعة */}
                {sellingType === 'piece' && (
                  <>
                    {/* أبعاد المنتج */}
                    <div>
                      <label className="block text-[10px] font-medium mb-1 text-gray-700">الأبعاد (سم) - اختياري</label>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          value={newProduct.length_cm}
                          onChange={(e) => setNewProduct({ ...newProduct, length_cm: e.target.value })}
                          className={`w-full bg-gray-50 border-2 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none transition-colors ${
                            newProduct.length_cm ? 'border-green-400 bg-green-50/30' : 'border-orange-300 bg-orange-50/30'
                          }`}
                          placeholder="الطول"
                          data-testid="product-length-input"
                        />
                        <input
                          type="number"
                          value={newProduct.width_cm}
                          onChange={(e) => setNewProduct({ ...newProduct, width_cm: e.target.value })}
                          className={`w-full bg-gray-50 border-2 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none transition-colors ${
                            newProduct.width_cm ? 'border-green-400 bg-green-50/30' : 'border-orange-300 bg-orange-50/30'
                          }`}
                          placeholder="العرض"
                          data-testid="product-width-input"
                        />
                        <input
                          type="number"
                          value={newProduct.height_cm}
                          onChange={(e) => setNewProduct({ ...newProduct, height_cm: e.target.value })}
                          className={`w-full bg-gray-50 border-2 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none transition-colors ${
                            newProduct.height_cm ? 'border-green-400 bg-green-50/30' : 'border-orange-300 bg-orange-50/30'
                          }`}
                          placeholder="الارتفاع"
                          data-testid="product-height-input"
                        />
                      </div>
                      <p className="text-[9px] text-red-500 mt-1">
                        ⚠️ عدم إضافة الأبعاد للمنتجات التي تحتاجها قد يؤدي لإيقاف حسابك
                      </p>
                    </div>

                    {/* الوزن */}
                    <div>
                      <label className="block text-[10px] font-medium mb-1 text-gray-700">الوزن (كغ) - اختياري</label>
                      <input
                        type="number"
                        step="0.1"
                        value={newProduct.weight_kg}
                        onChange={(e) => setNewProduct({ ...newProduct, weight_kg: e.target.value })}
                        className={`w-full bg-gray-50 border-2 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none transition-colors ${
                          newProduct.weight_kg ? 'border-green-400 bg-green-50/30' : 'border-orange-300 bg-orange-50/30'
                        }`}
                        placeholder="مثال: 1.5"
                        data-testid="product-weight-input"
                      />
                    </div>
                  </>
                )}

                {/* قسم المقاسات - يظهر فقط عند البيع بالقطعة */}
                {sellingType === 'piece' && (
                  <div className="border border-gray-200 rounded-xl p-3 bg-gray-50">
                  <label className="block text-[10px] font-bold mb-2 text-gray-700">
                    المقاسات المتاحة (اختياري)
                  </label>
                  
                  {/* اختيار نوع المقاس */}
                  <div className="mb-3">
                    <select
                      value={newProduct.size_type}
                      onChange={(e) => setNewProduct({ ...newProduct, size_type: e.target.value, available_sizes: [] })}
                      className="w-full bg-white border-2 border-gray-300 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none"
                      data-testid="size-type-select"
                    >
                      <option value="none">بدون مقاسات</option>
                      <option value="clothes">ملابس (S, M, L, XL...)</option>
                      <option value="shoes">أحذية (36, 37, 38...)</option>
                      <option value="pants">بناطيل (28, 30, 32...)</option>
                      <option value="kids_age">ملابس أطفال (حسب العمر)</option>
                      <option value="kids_shoes">أحذية أطفال (حسب العمر)</option>
                    </select>
                  </div>

                  {/* خيارات المقاسات حسب النوع */}
                  {newProduct.size_type !== 'none' && (
                    <div>
                      <p className="text-[9px] text-gray-500 mb-2">اختر المقاسات المتاحة:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {/* مقاسات الملابس */}
                        {newProduct.size_type === 'clothes' && ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'].map(size => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => {
                              const sizes = newProduct.available_sizes.includes(size)
                                ? newProduct.available_sizes.filter(s => s !== size)
                                : [...newProduct.available_sizes, size];
                              setNewProduct({ ...newProduct, available_sizes: sizes });
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              newProduct.available_sizes.includes(size)
                                ? 'bg-[#FF6B00] text-white'
                                : 'bg-white border border-gray-300 text-gray-700 hover:border-[#FF6B00]'
                            }`}
                          >
                            {size}
                          </button>
                        ))}

                        {/* مقاسات الأحذية */}
                        {newProduct.size_type === 'shoes' && ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'].map(size => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => {
                              const sizes = newProduct.available_sizes.includes(size)
                                ? newProduct.available_sizes.filter(s => s !== size)
                                : [...newProduct.available_sizes, size];
                              setNewProduct({ ...newProduct, available_sizes: sizes });
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              newProduct.available_sizes.includes(size)
                                ? 'bg-[#FF6B00] text-white'
                                : 'bg-white border border-gray-300 text-gray-700 hover:border-[#FF6B00]'
                            }`}
                          >
                            {size}
                          </button>
                        ))}

                        {/* مقاسات البناطيل */}
                        {newProduct.size_type === 'pants' && ['28', '30', '32', '34', '36', '38', '40', '42'].map(size => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => {
                              const sizes = newProduct.available_sizes.includes(size)
                                ? newProduct.available_sizes.filter(s => s !== size)
                                : [...newProduct.available_sizes, size];
                              setNewProduct({ ...newProduct, available_sizes: sizes });
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              newProduct.available_sizes.includes(size)
                                ? 'bg-[#FF6B00] text-white'
                                : 'bg-white border border-gray-300 text-gray-700 hover:border-[#FF6B00]'
                            }`}
                          >
                            {size}
                          </button>
                        ))}

                        {/* مقاسات ملابس الأطفال حسب العمر */}
                        {newProduct.size_type === 'kids_age' && [
                          '0-3 شهور', '3-6 شهور', '6-12 شهر', 
                          '1-2 سنة', '2-3 سنوات', '3-4 سنوات', 
                          '4-5 سنوات', '5-6 سنوات', '6-7 سنوات',
                          '7-8 سنوات', '8-10 سنوات', '10-12 سنة'
                        ].map(size => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => {
                              const sizes = newProduct.available_sizes.includes(size)
                                ? newProduct.available_sizes.filter(s => s !== size)
                                : [...newProduct.available_sizes, size];
                              setNewProduct({ ...newProduct, available_sizes: sizes });
                            }}
                            className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                              newProduct.available_sizes.includes(size)
                                ? 'bg-[#FF6B00] text-white'
                                : 'bg-white border border-gray-300 text-gray-700 hover:border-[#FF6B00]'
                            }`}
                          >
                            {size}
                          </button>
                        ))}

                        {/* مقاسات أحذية الأطفال حسب العمر */}
                        {newProduct.size_type === 'kids_shoes' && [
                          '0-6 شهور', '6-12 شهر', '1-2 سنة', 
                          '2-3 سنوات', '3-4 سنوات', '4-5 سنوات',
                          '5-6 سنوات', '6-7 سنوات', '8-10 سنوات', '10-12 سنة'
                        ].map(size => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => {
                              const sizes = newProduct.available_sizes.includes(size)
                                ? newProduct.available_sizes.filter(s => s !== size)
                                : [...newProduct.available_sizes, size];
                              setNewProduct({ ...newProduct, available_sizes: sizes });
                            }}
                            className={`px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                              newProduct.available_sizes.includes(size)
                                ? 'bg-[#FF6B00] text-white'
                                : 'bg-white border border-gray-300 text-gray-700 hover:border-[#FF6B00]'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>

                      {/* عرض المقاسات المختارة */}
                      {newProduct.available_sizes.length > 0 && (
                        <div className="mt-2 p-2 bg-green-50 rounded-lg">
                          <p className="text-[10px] text-green-700 font-bold">
                            ✓ المقاسات المختارة: {newProduct.available_sizes.join(' - ')}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                )}
              </>
            )}

            {/* Images Section */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-medium text-gray-700">
                  صور المنتج ({newProduct.images.length}/{maxImagesPerProduct})
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
              
              {/* نصيحة الخلفية البيضاء */}
              <p className="text-[9px] text-blue-600 bg-blue-50 p-2 rounded-lg mb-2">
                📸 ضع خلفية بيضاء خلف المنتج عند التصوير للحصول على جودة أفضل
              </p>
              
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
              {newProduct.images.length < maxImagesPerProduct && (
                <div className="space-y-2 mb-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setImageCaptureMode('camera');
                        setShowImageCapture(true);
                      }}
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
                      onClick={() => {
                        setImageCaptureMode('gallery');
                        setShowImageCapture(true);
                      }}
                      disabled={uploadingImage}
                      className="flex-1 py-2.5 bg-[#FF6B00] text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-[#E65000] transition-colors disabled:opacity-50"
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
                  {/* زر الرفع المباشر بدون تعديل */}
                  <label className="w-full py-2 bg-[#FF6B00] text-white rounded-lg text-xs flex items-center justify-center gap-2 hover:bg-[#E65000] cursor-pointer transition-colors font-bold">
                    <Upload size={14} />
                    رفع مباشر بدون تعديل
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        try {
                          // ضغط الصورة تلقائياً
                          const compressedImage = await compressProductImage(file);
                          if (newProduct.images.length < maxImagesPerProduct) {
                            setNewProduct(prev => ({
                              ...prev,
                              images: [...prev.images, compressedImage]
                            }));
                            toast?.({ title: "تم بنجاح", description: "تم رفع الصورة" });
                          }
                        } catch (error) {
                          console.error('Error compressing image:', error);
                          toast?.({ title: "خطأ", description: "فشل في معالجة الصورة", variant: "destructive" });
                        }
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* زر معاينة المنتج */}
              {newProduct.images.length > 0 && newProduct.name && (
                <button
                  type="button"
                  onClick={() => setShowProductPreview(true)}
                  className="w-full py-2 mb-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors"
                >
                  <Eye size={14} />
                  معاينة كيف سيظهر المنتج للعملاء
                </button>
              )}

              {/* معاينة الصور المضافة */}
              {newProduct.images.length > 0 && (
                <div className="grid grid-cols-5 gap-1.5 mb-1">
                  {newProduct.images.map((img, i) => (
                    <div key={i} className="relative aspect-square group">
                      <img src={img} alt="" className="w-full h-full object-cover rounded border border-gray-200" />
                      {/* زر الحذف */}
                      <button
                        type="button"
                        onClick={() => {
                          setNewProduct({
                            ...newProduct,
                            images: newProduct.images.filter((_, idx) => idx !== i)
                          });
                          setImageWarnings([]);
                        }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                      >
                        <X size={12} />
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-0 left-0 right-0 bg-[#FF6B00] text-white text-[7px] text-center py-0.5 rounded-b">
                          رئيسية
                        </span>
                      )}
                    </div>
                  ))}
                  {newProduct.images.length < maxImagesPerProduct && (
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
                    onClick={() => {
                      setNewProduct({ ...newProduct, video: null });
                      // إعادة تعيين الـ input لقبول فيديو جديد
                      const videoInput = document.getElementById('product-video');
                      if (videoInput) videoInput.value = '';
                    }}
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
                  className="w-full py-2 bg-[#FF6B00] text-white rounded-lg text-[10px] flex items-center justify-center gap-1 hover:bg-[#E65000] font-bold disabled:opacity-50"
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

            {/* Admin Verification Video Section - فيديو التحقق للأدمن */}
            <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-3">
              <label className="block text-[11px] font-bold mb-2 text-orange-800">
                📹 فيديو التحقق للمراجعة (إجباري)
                <span className="text-red-500 mr-1">*</span>
              </label>
              <p className="text-[9px] text-orange-700 mb-2">
                صوّر فيديو قصير (من 1 إلى 30 ثانية كحد أقصى) يُظهر المنتج الحقيقي والكمية المتوفرة.
                <br/>
                <strong>هذا الفيديو للأدمن فقط ولن يظهر للعملاء.</strong>
              </p>
              {newProduct.admin_video ? (
                <div className="relative bg-orange-100 rounded-lg p-2">
                  <video 
                    src={newProduct.admin_video} 
                    className="w-full h-28 object-cover rounded"
                    controls
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setNewProduct({ ...newProduct, admin_video: null });
                      const adminVideoInput = document.getElementById('admin-video');
                      if (adminVideoInput) adminVideoInput.value = '';
                    }}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg"
                  >
                    <X size={14} />
                  </button>
                  <div className="absolute bottom-1 left-1 bg-green-500 text-white text-[8px] px-2 py-0.5 rounded-full font-bold">
                    ✓ تم الرفع
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => document.getElementById('admin-video').click()}
                  disabled={uploadingVideo}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg text-[11px] flex items-center justify-center gap-2 hover:from-orange-600 hover:to-red-600 font-bold disabled:opacity-50 shadow-md"
                >
                  {uploadingVideo ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      جاري معالجة الفيديو...
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      📹 ارفع فيديو التحقق
                    </>
                  )}
                </button>
              )}
              <input
                id="admin-video"
                type="file"
                accept="video/*"
                onChange={(e) => handleAdminVideoUpload(e)}
                className="hidden"
                data-testid="admin-video-input"
              />
              <p className="text-[8px] text-orange-600 mt-1">الحد الأقصى: 30 ثانية / 50MB</p>
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
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1">
                      <Loader2 className="animate-spin" size={12} />
                      <span>جاري رفع المنتج...</span>
                    </div>
                    <span className="text-[9px] opacity-80">يرجى الانتظار</span>
                  </div>
                ) : (
                  labels.submitButton
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>

      <PhotoGuideModal isOpen={showPhotoGuide} onClose={() => setShowPhotoGuide(false)} />
      
      {/* مكون التقاط الصور البسيط */}
      <SimpleImageCapture
        isOpen={showImageCapture}
        onClose={() => setShowImageCapture(false)}
        mode={imageCaptureMode}
        onImageReady={(imageUrl) => {
          setNewProduct(prev => ({
            ...prev,
            images: [...prev.images, imageUrl].slice(0, maxImagesPerProduct)
          }));
          toast?.({
            title: "تم بنجاح ✨",
            description: "تم إضافة الصورة"
          });
        }}
      />
      
      {/* معاينة المنتج في المتجر */}
      <ProductPreviewModal
        isOpen={showProductPreview}
        onClose={() => setShowProductPreview(false)}
        images={newProduct.images}
        productName={newProduct.name}
        productPrice={newProduct.price}
        productDescription={newProduct.description}
        productCategory={newProduct.category}
        storeName={isFoodSeller ? "متجرك" : "متجرك"}
      />
    </>
  );
};

export default AddProductModal;
