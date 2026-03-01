import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Upload, FileText, Check, Clock, X, Plus, 
  Package, DollarSign, ShoppingBag, Edit, Trash2, Loader2,
  AlertCircle, Camera, Sun, Maximize, Image, Info, CheckCircle, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ============== Photo Guide Modal ==============
const PhotoGuideModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Camera className="text-[#FF6B00]" size={20} />
            <h2 className="font-bold text-gray-900">دليل تصوير المنتجات</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Stats */}
          <div className="bg-gradient-to-r from-[#FF6B00] to-orange-500 text-white rounded-xl p-4 text-center">
            <p className="text-2xl font-bold">+60%</p>
            <p className="text-sm opacity-90">زيادة في المبيعات مع صور احترافية</p>
          </div>

          {/* Good Examples */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <h3 className="font-bold text-green-800 flex items-center gap-2 mb-3">
              <CheckCircle size={16} />
              صور صحيحة ✅
            </h3>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">
                <div className="aspect-square bg-white rounded-lg border-2 border-green-300 flex items-center justify-center mb-1">
                  <div className="w-8 h-10 bg-gray-300 rounded"></div>
                </div>
                <p className="text-[9px] text-green-700">خلفية بيضاء</p>
              </div>
              <div className="text-center">
                <div className="aspect-square bg-white rounded-lg border-2 border-green-300 flex items-center justify-center mb-1">
                  <div className="w-6 h-10 bg-blue-200 rounded relative">
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-pink-200 rounded-full"></div>
                  </div>
                </div>
                <p className="text-[9px] text-green-700">على موديل</p>
              </div>
              <div className="text-center">
                <div className="aspect-square bg-white rounded-lg border-2 border-green-300 flex items-center justify-center mb-1">
                  <div className="w-10 h-6 bg-gray-400 rounded-sm"></div>
                </div>
                <p className="text-[9px] text-green-700">تفاصيل قريبة</p>
              </div>
              <div className="text-center">
                <div className="aspect-square bg-white rounded-lg border-2 border-green-300 flex items-center justify-center mb-1">
                  <Sun size={20} className="text-yellow-500" />
                </div>
                <p className="text-[9px] text-green-700">إضاءة جيدة</p>
              </div>
            </div>
          </div>

          {/* Bad Examples */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <h3 className="font-bold text-red-800 flex items-center gap-2 mb-3">
              <AlertTriangle size={16} />
              صور خاطئة ❌
            </h3>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">
                <div className="aspect-square bg-gradient-to-br from-blue-200 via-pink-200 to-yellow-200 rounded-lg border-2 border-red-300 flex items-center justify-center mb-1">
                  <div className="w-6 h-8 bg-gray-400 rounded opacity-50"></div>
                </div>
                <p className="text-[9px] text-red-700">خلفية فوضوية</p>
              </div>
              <div className="text-center">
                <div className="aspect-square bg-gray-700 rounded-lg border-2 border-red-300 flex items-center justify-center mb-1">
                  <div className="w-6 h-8 bg-gray-600 rounded"></div>
                </div>
                <p className="text-[9px] text-red-700">إضاءة ضعيفة</p>
              </div>
              <div className="text-center">
                <div className="aspect-square bg-white rounded-lg border-2 border-red-300 flex items-center justify-center mb-1 blur-[2px]">
                  <div className="w-6 h-8 bg-gray-400 rounded"></div>
                </div>
                <p className="text-[9px] text-red-700">صورة ضبابية</p>
              </div>
              <div className="text-center">
                <div className="aspect-square bg-white rounded-lg border-2 border-red-300 flex items-center justify-center mb-1">
                  <div className="w-3 h-4 bg-gray-400 rounded"></div>
                </div>
                <p className="text-[9px] text-red-700">المنتج بعيد</p>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <h3 className="font-bold text-blue-800 mb-2">💡 نصائح سريعة</h3>
            <ul className="space-y-1.5 text-sm text-blue-900">
              <li className="flex items-start gap-2">
                <Sun size={14} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                <span>صوّر بجانب النافذة للحصول على إضاءة طبيعية</span>
              </li>
              <li className="flex items-start gap-2">
                <Image size={14} className="text-gray-500 mt-0.5 flex-shrink-0" />
                <span>استخدم ورقة بيضاء أو قماش أبيض كخلفية</span>
              </li>
              <li className="flex items-start gap-2">
                <Maximize size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                <span>اجعل المنتج يشغل 80% من الصورة</span>
              </li>
              <li className="flex items-start gap-2">
                <Camera size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <span>ارفع 3-5 صور من زوايا مختلفة</span>
              </li>
            </ul>
          </div>

          {/* Requirements */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <h3 className="font-bold text-gray-800 mb-2">📏 متطلبات الصور</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <Check size={12} className="text-green-500" />
                <span>الحد الأدنى: 800×800 بكسل</span>
              </div>
              <div className="flex items-center gap-1">
                <Check size={12} className="text-green-500" />
                <span>الصيغ: JPG, PNG, WebP</span>
              </div>
              <div className="flex items-center gap-1">
                <Check size={12} className="text-green-500" />
                <span>الحجم الأقصى: 5 ميجابايت</span>
              </div>
              <div className="flex items-center gap-1">
                <Check size={12} className="text-green-500" />
                <span>النسبة: 1:1 (مربع) مفضلة</span>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={onClose}
            className="w-full bg-[#FF6B00] text-white font-bold py-3 rounded-xl hover:bg-[#E65000] transition-colors"
          >
            فهمت، بدء رفع الصور 📸
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ============== Image Validation Helper ==============
const validateAndEnhanceImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.onload = () => {
        const issues = [];
        const warnings = [];
        
        // Check dimensions
        if (img.width < 800 || img.height < 800) {
          issues.push(`الصورة صغيرة جداً (${img.width}×${img.height}). الحد الأدنى 800×800`);
        } else if (img.width < 1000 || img.height < 1000) {
          warnings.push(`جودة متوسطة (${img.width}×${img.height}). يُفضل 1200×1200 أو أكثر`);
        }
        
        // Check file size
        if (file.size > 5 * 1024 * 1024) {
          issues.push('حجم الملف كبير جداً (الحد الأقصى 5MB)');
        }
        
        // Check aspect ratio
        const ratio = img.width / img.height;
        if (ratio < 0.5 || ratio > 2) {
          warnings.push('نسبة الأبعاد غير مثالية. يُفضل صورة مربعة (1:1)');
        }
        
        // Create enhanced canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Resize if too large
        let newWidth = img.width;
        let newHeight = img.height;
        const maxSize = 1500;
        
        if (newWidth > maxSize || newHeight > maxSize) {
          if (newWidth > newHeight) {
            newHeight = (newHeight / newWidth) * maxSize;
            newWidth = maxSize;
          } else {
            newWidth = (newWidth / newHeight) * maxSize;
            newHeight = maxSize;
          }
        }
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // Draw and enhance
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        
        // Auto enhance: slight brightness and contrast boost
        const imageData = ctx.getImageData(0, 0, newWidth, newHeight);
        const data = imageData.data;
        
        // Calculate average brightness
        let totalBrightness = 0;
        for (let i = 0; i < data.length; i += 4) {
          totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
        }
        const avgBrightness = totalBrightness / (data.length / 4);
        
        // Only enhance if image is dark
        if (avgBrightness < 120) {
          const brightnessAdjust = 20;
          const contrastFactor = 1.1;
          
          for (let i = 0; i < data.length; i += 4) {
            // Brightness
            data[i] = Math.min(255, data[i] + brightnessAdjust);
            data[i + 1] = Math.min(255, data[i + 1] + brightnessAdjust);
            data[i + 2] = Math.min(255, data[i + 2] + brightnessAdjust);
            
            // Contrast
            data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrastFactor + 128));
            data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrastFactor + 128));
            data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrastFactor + 128));
          }
          
          ctx.putImageData(imageData, 0, 0);
          warnings.push('تم تحسين إضاءة الصورة تلقائياً');
        }
        
        const enhancedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
        
        resolve({
          dataUrl: enhancedDataUrl,
          width: img.width,
          height: img.height,
          issues,
          warnings,
          enhanced: avgBrightness < 120
        });
      };
      img.onerror = () => reject(new Error('فشل تحميل الصورة'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('فشل قراءة الملف'));
    reader.readAsDataURL(file);
  });
};

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const CATEGORIES = [
  { id: 'electronics', name: 'إلكترونيات' },
  { id: 'fashion', name: 'أزياء' },
  { id: 'home', name: 'المنزل' },
  { id: 'beauty', name: 'تجميل' },
  { id: 'sports', name: 'رياضة' },
  { id: 'books', name: 'كتب' },
  { id: 'toys', name: 'ألعاب' },
  { id: 'food', name: 'طعام' },
  { id: 'health', name: 'صحة' },
  { id: 'cars', name: 'سيارات' },
];

const SYRIAN_CITIES = [
  'دمشق', 'حلب', 'حمص', 'حماة', 'اللاذقية', 'طرطوس',
  'دير الزور', 'الرقة', 'الحسكة', 'درعا', 'السويداء',
  'القنيطرة', 'إدلب', 'ريف دمشق'
];

// Seller Documents Upload Page
const SellerDocumentsPage = () => {
  const navigate = useNavigate();
  const { user, fetchUser } = useAuth();
  const { toast } = useToast();

  const [businessName, setBusinessName] = useState('');
  const [license, setLicense] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (user) {
      checkStatus();
    }
  }, [user]);

  const checkStatus = async () => {
    try {
      const res = await axios.get(`${API}/seller/documents/status`);
      setStatus(res.data.status);
      if (res.data.business_name) {
        setBusinessName(res.data.business_name);
      }
    } catch (error) {
      console.error('Error checking status:', error);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLicense(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!license) {
      toast({
        title: "خطأ",
        description: "يرجى رفع شهادة البائع",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/seller/documents`, {
        seller_id: user.id,
        business_name: businessName,
        business_license: license
      });

      toast({
        title: "تم الإرسال",
        description: "تم رفع المستندات بنجاح، سيتم مراجعتها"
      });
      setStatus('pending');
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "حدث خطأ",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.user_type !== 'seller') {
    navigate('/');
    return null;
  }

  if (user.is_approved) {
    navigate('/seller/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-[#FF6B00]/20 flex items-center justify-center mx-auto mb-4">
            <FileText size={32} className="text-[#FF6B00]" />
          </div>
          <h1 className="text-2xl font-bold">تأكيد حساب البائع</h1>
          <p className="text-white/50 mt-2">ارفع شهادة البائع للموافقة على حسابك</p>
        </div>

        {status === 'pending' ? (
          <div className="bg-[#121212] rounded-2xl p-6 border border-white/5 text-center">
            <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-4">
              <Clock size={32} className="text-yellow-500" />
            </div>
            <h3 className="font-bold mb-2">في انتظار الموافقة</h3>
            <p className="text-white/50 text-sm">
              تم رفع مستنداتك بنجاح. سيتم مراجعتها والرد عليك قريباً.
            </p>
          </div>
        ) : status === 'rejected' ? (
          <div className="bg-[#121212] rounded-2xl p-6 border border-white/5 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <X size={32} className="text-red-500" />
            </div>
            <h3 className="font-bold mb-2">تم الرفض</h3>
            <p className="text-white/50 text-sm mb-4">
              عذراً، تم رفض طلبك. يمكنك إعادة المحاولة بمستندات صحيحة.
            </p>
            <button
              onClick={() => setStatus(null)}
              className="bg-[#FF6B00] text-black font-bold px-6 py-2 rounded-full"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-[#121212] rounded-2xl p-6 border border-white/5">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">اسم النشاط التجاري</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg py-3 px-4 text-white placeholder:text-white/30 focus:border-[#FF6B00] focus:outline-none"
                  placeholder="اسم نشاطك التجاري"
                  required
                  data-testid="business-name-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">شهادة البائع (سجل تجاري)</label>
                <div className="border-2 border-dashed border-white/20 rounded-xl p-6 text-center hover:border-[#FF6B00]/50 transition-colors cursor-pointer"
                  onClick={() => document.getElementById('license-input').click()}
                >
                  {license ? (
                    <div className="flex items-center justify-center gap-2 text-green-500">
                      <Check size={24} />
                      <span>تم رفع الملف</span>
                    </div>
                  ) : (
                    <>
                      <Upload size={32} className="mx-auto mb-2 text-white/40" />
                      <p className="text-white/50">اضغط لرفع صورة الشهادة</p>
                      <p className="text-xs text-white/30 mt-1">PNG, JPG حتى 5MB</p>
                    </>
                  )}
                </div>
                <input
                  id="license-input"
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  data-testid="license-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF6B00] text-black font-bold py-3 rounded-full mt-6 hover:bg-[#E65000] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              data-testid="submit-docs-btn"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  جاري الإرسال...
                </>
              ) : (
                'إرسال للمراجعة'
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

// Seller Dashboard
const SellerDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    category: 'electronics',
    stock: '',
    images: [],
    video: null,
    city: '',
    length_cm: '',
    width_cm: '',
    height_cm: '',
    weight_kg: '',
    size_type: 'none',
    available_sizes: []
  });

  // المقاسات المتاحة لكل نوع
  const SIZE_OPTIONS = {
    clothes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
    shoes: ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'],
    pants: ['28', '30', '32', '34', '36', '38', '40', '42'],
    kids: ['2-3', '4-5', '6-7', '8-9', '10-11', '12-13', '14-15']
  };
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [showPhotoGuide, setShowPhotoGuide] = useState(false);
  const [imageWarnings, setImageWarnings] = useState([]);

  useEffect(() => {
    if (user?.user_type === 'seller') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [productsRes, ordersRes] = await Promise.all([
        axios.get(`${API}/seller/my-products`),
        axios.get(`${API}/orders`)
      ]);
      setProducts(productsRes.data);
      setOrders(ordersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // إضافة شعار صغير في زاوية الصورة
  const addLogo = (imageDataUrl) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        // رسم الصورة الأصلية
        ctx.drawImage(img, 0, 0);
        
        // إعداد الشعار الصغير
        const text = 'تريند سورية';
        const fontSize = Math.max(canvas.width * 0.035, 12);
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        
        const textWidth = ctx.measureText(text).width;
        const padding = 4;
        const x = canvas.width - textWidth - padding - 8;
        const y = canvas.height - padding - 8;
        
        // خلفية شفافة للشعار
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(x - padding, y - fontSize, textWidth + padding * 2, fontSize + padding);
        
        // رسم النص
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(text, x, y);
        
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      };
      img.src = imageDataUrl;
    });
  };

  // رفع الصور مع فحص وتحسين
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setUploadingImage(true);
    setImageWarnings([]);
    
    try {
      for (const file of files) {
        // فحص وتحسين الصورة
        const result = await validateAndEnhanceImage(file);
        
        // إذا كانت هناك مشاكل خطيرة
        if (result.issues.length > 0) {
          toast({
            title: "⚠️ مشكلة في الصورة",
            description: result.issues[0],
            variant: "destructive"
          });
          continue;
        }
        
        // عرض التحذيرات
        if (result.warnings.length > 0) {
          setImageWarnings(prev => [...prev, ...result.warnings]);
          if (result.enhanced) {
            toast({
              title: "✨ تم تحسين الصورة",
              description: "تم ضبط الإضاءة تلقائياً"
            });
          }
        }
        
        // إضافة الشعار الصغير
        const imageWithLogo = await addLogo(result.dataUrl);
        setNewProduct(prev => ({
          ...prev,
          images: [...prev.images, imageWithLogo]
        }));
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

  const handleVideoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB max
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

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (newProduct.images.length === 0) {
      toast({
        title: "خطأ",
        description: "يرجى إضافة صورة واحدة على الأقل",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      await axios.post(`${API}/products`, {
        ...newProduct,
        price: parseFloat(newProduct.price),
        stock: parseInt(newProduct.stock),
        video: newProduct.video || null,
        length_cm: newProduct.length_cm ? parseFloat(newProduct.length_cm) : null,
        width_cm: newProduct.width_cm ? parseFloat(newProduct.width_cm) : null,
        height_cm: newProduct.height_cm ? parseFloat(newProduct.height_cm) : null,
        weight_kg: newProduct.weight_kg ? parseFloat(newProduct.weight_kg) : null,
        size_type: newProduct.size_type !== 'none' ? newProduct.size_type : null,
        available_sizes: newProduct.available_sizes.length > 0 ? newProduct.available_sizes : null
      });

      toast({
        title: "تم الإضافة",
        description: "تمت إضافة المنتج بنجاح"
      });

      setShowAddProduct(false);
      setNewProduct({
        name: '',
        description: '',
        price: '',
        category: 'electronics',
        stock: '',
        images: [],
        video: null,
        city: '',
        length_cm: '',
        width_cm: '',
        height_cm: '',
        weight_kg: '',
        size_type: 'none',
        available_sizes: []
      });
      fetchData();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "حدث خطأ",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('هل تريد حذف هذا المنتج؟')) return;

    try {
      await axios.delete(`${API}/products/${productId}`);
      toast({
        title: "تم الحذف",
        description: "تم حذف المنتج بنجاح"
      });
      fetchData();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل حذف المنتج",
        variant: "destructive"
      });
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await axios.put(`${API}/orders/${orderId}/status?status=${status}`);
      toast({
        title: "تم التحديث",
        description: "تم تحديث حالة الطلب"
      });
      fetchData();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل تحديث الحالة",
        variant: "destructive"
      });
    }
  };

  if (!user || user.user_type !== 'seller') {
    navigate('/');
    return null;
  }

  if (!user.is_approved) {
    navigate('/seller/documents');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }

  // Calculate stats
  const totalSales = orders.reduce((sum, o) => sum + (o.status === 'paid' ? o.total : 0), 0);
  const paidOrders = orders.filter(o => o.status === 'paid').length;

  return (
    <div className="min-h-screen pb-20 md:pb-10 bg-gray-50">
      <div className="max-w-4xl mx-auto px-3 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-sm font-bold text-gray-900">لوحة تحكم البائع</h1>
          <button
            onClick={() => setShowAddProduct(true)}
            className="flex items-center gap-1 bg-[#FF6B00] text-white font-bold px-3 py-1.5 rounded-full text-xs"
            data-testid="add-product-btn"
          >
            <Plus size={14} />
            إضافة منتج
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { icon: Package, label: 'المنتجات', value: products.length, color: 'bg-blue-100 text-blue-600' },
            { icon: ShoppingBag, label: 'طلبات مدفوعة', value: paidOrders, color: 'bg-green-100 text-green-600' },
            { icon: DollarSign, label: 'المبيعات', value: formatPrice(totalSales), color: 'bg-orange-100 text-orange-600' },
            { icon: Clock, label: 'معلقة', value: orders.filter(o => o.delivery_status === 'pending').length, color: 'bg-yellow-100 text-yellow-600' },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl p-2 border border-gray-200">
              <div className={`w-6 h-6 rounded-full ${stat.color} flex items-center justify-center mb-1`}>
                <stat.icon size={12} />
              </div>
              <p className="text-sm font-bold text-gray-900">{stat.value}</p>
              <p className="text-[9px] text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Products */}
        <section className="mb-4">
          <h2 className="text-xs font-bold mb-2 text-gray-900">منتجاتي</h2>
          {products.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center border border-gray-200">
              <Package size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-xs">لم تضف أي منتجات بعد</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
              {products.map((product) => (
                <div key={product.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden relative">
                  {/* حالة الموافقة */}
                  {product.approval_status === 'pending' && (
                    <div className="absolute top-1 right-1 z-10 bg-yellow-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                      <Clock size={8} />
                      معلق
                    </div>
                  )}
                  {product.approval_status === 'rejected' && (
                    <div className="absolute top-1 right-1 z-10 bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                      <X size={8} />
                      مرفوض
                    </div>
                  )}
                  {product.approval_status === 'approved' && (
                    <div className="absolute top-1 right-1 z-10 bg-green-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                      <Check size={8} />
                      معتمد
                    </div>
                  )}
                  <img
                    src={product.images?.[0] || 'https://via.placeholder.com/200'}
                    alt={product.name}
                    className={`w-full aspect-square object-cover ${product.approval_status !== 'approved' ? 'opacity-60' : ''}`}
                  />
                  <div className="p-2">
                    <h3 className="font-bold text-[10px] truncate text-gray-900">{product.name}</h3>
                    <p className="text-[#FF6B00] font-bold text-[10px]">{formatPrice(product.price)}</p>
                    <p className="text-[8px] text-gray-500">المخزون: {product.stock}</p>
                    {product.rejection_reason && (
                      <p className="text-[8px] text-red-400 mt-0.5 truncate">سبب: {product.rejection_reason}</p>
                    )}
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="w-full mt-1 p-1 text-red-500 bg-red-50 rounded text-[9px] flex items-center justify-center gap-0.5"
                      data-testid={`delete-product-${product.id}`}
                    >
                      <Trash2 size={10} />
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent Orders */}
        <section>
          <h2 className="text-xs font-bold mb-2 text-gray-900">الطلبات الأخيرة</h2>
          {orders.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center border border-gray-200">
              <ShoppingBag size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-xs">لا توجد طلبات</p>
            </div>
          ) : (
            <div className="space-y-2">
              {orders.slice(0, 10).map((order) => (
                <div key={order.id} className="bg-white rounded-lg p-2 border border-gray-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[10px] text-gray-900">#{order.id.slice(0, 8).toUpperCase()}</span>
                    <span className="text-[#FF6B00] font-bold text-[10px]">{formatPrice(order.total)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-gray-500">{order.user_name} - {order.city}</span>
                    <select
                      value={order.delivery_status}
                      onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      className="bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-[9px] text-gray-900"
                      data-testid={`order-status-${order.id}`}
                    >
                      <option value="pending">في الانتظار</option>
                      <option value="processing">قيد التجهيز</option>
                      <option value="shipped">تم الشحن</option>
                      <option value="delivered">تم التوصيل</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Add Product Modal */}
      {showAddProduct && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-4 w-full max-w-md max-h-[85vh] overflow-y-auto"
          >
            <h2 className="text-sm font-bold mb-3 text-gray-900">إضافة منتج جديد</h2>
            <form onSubmit={handleAddProduct} className="space-y-2">
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
                <div>
                  <label className="block text-[10px] font-medium mb-1 text-gray-700">المدينة</label>
                  <select
                    value={newProduct.city}
                    onChange={(e) => setNewProduct({ ...newProduct, city: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg py-1.5 px-2 text-xs text-gray-900 focus:border-[#FF6B00] focus:outline-none"
                    required
                    data-testid="product-city-select"
                  >
                    <option value="">اختر المدينة</option>
                    {SYRIAN_CITIES.map(city => (
                      <option key={city} value={city}>{city}</option>
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
                
                {/* تحذيرات الصور */}
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
                
                {/* نصيحة سريعة */}
                {newProduct.images.length === 0 && (
                  <p className="text-[9px] text-gray-400 flex items-center gap-1">
                    <Info size={10} />
                    استخدم خلفية بيضاء وإضاءة جيدة للحصول على أفضل النتائج
                  </p>
                )}
                </div>
                <input
                  id="product-images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

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
                  onClick={() => setShowAddProduct(false)}
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
      )}
      
      {/* Photo Guide Modal */}
      <PhotoGuideModal isOpen={showPhotoGuide} onClose={() => setShowPhotoGuide(false)} />
    </div>
  );
};

export { SellerDocumentsPage, SellerDashboardPage };
