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
  toast 
}) => {
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: 'electronics',
    stock: '',
    images: [],
    video: null,
    length_cm: '',
    width_cm: '',
    height_cm: '',
    weight_kg: '',
    size_type: 'none',
    available_sizes: [],
    max_per_customer: ''
  });
  
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [showPhotoGuide, setShowPhotoGuide] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newProduct.images.length === 0) {
      toast({
        title: "خطأ",
        description: "يرجى إضافة صورة واحدة على الأقل",
        variant: "destructive"
      });
      return;
    }

    await onSave({
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
      max_per_customer: newProduct.max_per_customer ? parseInt(newProduct.max_per_customer) : null
    });

    // Reset form
    setNewProduct({
      name: '',
      description: '',
      price: '',
      category: 'electronics',
      stock: '',
      images: [],
      video: null,
      length_cm: '',
      width_cm: '',
      height_cm: '',
      weight_kg: '',
      size_type: 'none',
      available_sizes: [],
      max_per_customer: ''
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-xl p-4 w-full max-w-md max-h-[85vh] overflow-y-auto"
        >
          <h2 className="text-sm font-bold mb-3 text-gray-900">إضافة منتج جديد</h2>
          <form onSubmit={handleSubmit} className="space-y-2">
            <div>
              <label className="block text-[10px] font-medium mb-1 text-gray-700">اسم المنتج</label>
              <input
                type="text"
                value={newProduct.name}
                onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none"
                required
                data-testid="product-name-input"
              />
            </div>

            <div>
              <label className="block text-[10px] font-medium mb-1 text-gray-700">الوصف</label>
              <textarea
                value={newProduct.description}
                onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none"
                rows={2}
                required
                data-testid="product-desc-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-medium mb-1 text-gray-700">السعر (ل.س)</label>
                <input
                  type="number"
                  value={newProduct.price}
                  onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none"
                  required
                  data-testid="product-price-input"
                />
              </div>
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
            </div>

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
              
              {newProduct.images.length === 0 && (
                <p className="text-[9px] text-gray-400 flex items-center gap-1">
                  <Info size={10} />
                  استخدم خلفية بيضاء وإضاءة جيدة للحصول على أفضل النتائج
                </p>
              )}
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
                  'حفظ المنتج'
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
