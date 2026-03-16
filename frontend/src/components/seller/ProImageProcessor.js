// /app/frontend/src/components/seller/ProImageProcessor.js
// معالج الصور الاحترافي - مثل Trendyol
// يدعم: المنتجات العادية (إزالة خلفية) + الطعام (تحسين ألوان)

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  X, Loader2, Wand2, Check, Image as ImageIcon, 
  Palette, Focus, Move, Sun, Sparkles, Copy,
  Download, ChevronDown, ChevronUp, AlertCircle,
  Smartphone, Monitor, Instagram, Utensils, Package
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// ألوان الخلفيات للمعاينة
const BACKGROUND_COLORS = {
  white: 'bg-white',
  light_gray: 'bg-gradient-to-b from-gray-100 to-white',
  soft_blue: 'bg-gradient-to-b from-blue-50 to-white',
  soft_pink: 'bg-gradient-to-b from-pink-50 to-white',
  soft_gold: 'bg-gradient-to-b from-yellow-50 to-white',
  elegant_gray: 'bg-gradient-to-br from-gray-300 to-gray-200',
  premium_dark: 'bg-gradient-to-br from-gray-800 to-gray-700',
  fashion_beige: 'bg-gradient-to-b from-orange-50 to-white',
  tech_silver: 'bg-gradient-to-b from-slate-100 to-white',
  nature_green: 'bg-gradient-to-b from-green-50 to-white',
};

const ProImageProcessor = ({ 
  imageDataUrl, 
  onProcessed, 
  onCancel,
  isOpen,
  isFoodSeller = false,  // هل البائع من قسم الطعام؟
  token = null,  // توكن البائع للميزات المدفوعة
  onOpenTemplates = null  // فتح قوالب 3D
}) => {
  const [backgrounds, setBackgrounds] = useState([]);
  const [selectedBg, setSelectedBg] = useState('white');
  const [processing, setProcessing] = useState(false);
  const [processMode, setProcessMode] = useState('standard'); // standard, template
  const [processedImage, setProcessedImage] = useState(null);
  const [keepOriginal, setKeepOriginal] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [qualityReport, setQualityReport] = useState(null);
  const [processingInfo, setProcessingInfo] = useState(null);
  const [multipleSizes, setMultipleSizes] = useState(null);
  const [imageSettings, setImageSettings] = useState(null);
  
  // خيارات المعالجة الاحترافية
  const [options, setOptions] = useState({
    autoColorCorrect: true,
    sharpen: true,
    smartCenter: true,
    addShadow: true,
    addReflection: false,
    generateSizes: false,
    outputFormat: 'jpeg'
  });

  useEffect(() => {
    fetchBackgrounds();
    fetchImageSettings();
    if (imageDataUrl && isOpen) {
      analyzeImage();
    }
  }, [imageDataUrl, isOpen]);

  const fetchBackgrounds = async () => {
    try {
      const res = await axios.get(`${API}/image/backgrounds`);
      setBackgrounds(res.data.backgrounds);
    } catch (error) {
      console.error('Error fetching backgrounds:', error);
    }
  };

  const fetchImageSettings = async () => {
    try {
      const res = await axios.get(`${API}/image/settings`);
      setImageSettings(res.data);
    } catch (error) {
      console.error('Error fetching image settings:', error);
    }
  };

  const analyzeImage = async () => {
    if (!imageDataUrl) return;
    
    try {
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('file', blob, 'image.jpg');
      
      const res = await axios.post(`${API}/image/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      setQualityReport(res.data.analysis);
    } catch (error) {
      console.error('Error analyzing image:', error);
    }
  };

  const processImage = async () => {
    if (keepOriginal) {
      onProcessed(imageDataUrl);
      return;
    }

    setProcessing(true);
    setProcessedImage(null);
    
    try {
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('file', blob, 'image.jpg');
      
      let res;
      
      // معالجة مختلفة للطعام vs المنتجات
      if (isFoodSeller) {
        // معالجة الطعام - بدون إزالة خلفية
        formData.append('enhance_colors', 'true');
        formData.append('output_format', options.outputFormat);
        
        res = await axios.post(`${API}/image/process-food`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        // معالجة المنتجات العادية - مع إزالة خلفية
        formData.append('auto_color_correct', options.autoColorCorrect.toString());
        formData.append('sharpen', options.sharpen.toString());
        formData.append('smart_center', options.smartCenter.toString());
        formData.append('add_shadow', options.addShadow.toString());
        formData.append('add_reflection', options.addReflection.toString());
        formData.append('background', selectedBg);
        formData.append('generate_sizes', options.generateSizes.toString());
        formData.append('output_format', options.outputFormat);

        res = await axios.post(`${API}/image/process-pro`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      if (res.data.success) {
        setProcessedImage(res.data.image);
        setProcessingInfo(res.data.processing);
        if (res.data.sizes) {
          setMultipleSizes(res.data.sizes);
        }
      }
    } catch (error) {
      console.error('Error processing image:', error);
      alert('فشل معالجة الصورة');
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (processedImage) {
      onProcessed(processedImage);
    } else if (keepOriginal) {
      onProcessed(imageDataUrl);
    }
  };

  const toggleOption = (key) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
    setProcessedImage(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-2">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto"
      >
        {/* Header */}
        <div className={`sticky top-0 p-3 flex items-center justify-between rounded-t-2xl z-10 ${
          isFoodSeller 
            ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
            : 'bg-gradient-to-r from-[#FF6B00] to-orange-500'
        }`}>
          <div className="flex items-center gap-2 text-white">
            {isFoodSeller ? <Utensils size={20} /> : <Sparkles size={20} />}
            <h2 className="font-bold text-sm">
              {isFoodSeller ? 'تحسين صور الطعام' : 'معالجة احترافية'}
            </h2>
            <span className="bg-white/20 text-[9px] px-2 py-0.5 rounded-full">
              {isFoodSeller ? 'مجاني 🍽️' : 'مثل Trendyol'}
            </span>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-white/20 rounded-full text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* اختيار نوع المعالجة - للمنتجات فقط */}
          {!isFoodSeller && (
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setProcessMode('standard')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                  processMode === 'standard'
                    ? 'bg-white text-orange-600 shadow-sm'
                    : 'text-gray-600'
                }`}
              >
                <Sparkles size={14} />
                معالجة عادية
              </button>
              <button
                onClick={() => setProcessMode('template')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                  processMode === 'template'
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-600'
                }`}
              >
                <span>🎨</span>
                قوالب 3D
              </button>
            </div>
          )}

          {/* تقرير الجودة */}
          {qualityReport && processMode === 'standard' && (
            <div className={`p-3 rounded-xl border ${
              qualityReport.quality_score >= 70 ? 'bg-green-50 border-green-200' :
              qualityReport.quality_score >= 50 ? 'bg-yellow-50 border-yellow-200' :
              'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold">جودة الصورة</span>
                <span className={`text-lg font-bold ${
                  qualityReport.quality_score >= 70 ? 'text-green-600' :
                  qualityReport.quality_score >= 50 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {qualityReport.quality_score}%
                </span>
              </div>
              <div className="flex gap-4 text-[10px] text-gray-600">
                <span>الدقة: {qualityReport.width}x{qualityReport.height}</span>
                <span>السطوع: {qualityReport.brightness}</span>
                <span>التباين: {qualityReport.contrast}</span>
              </div>
              {qualityReport.issues.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {qualityReport.issues.map((issue, i) => (
                    <span key={i} className="bg-white/80 text-[9px] px-2 py-0.5 rounded-full text-gray-700">
                      ⚠️ {issue}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* عرض قوالب 3D عند اختيارها */}
          {processMode === 'template' && !isFoodSeller && (
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
              <div className="text-center mb-3">
                <span className="text-3xl">🎨</span>
                <h3 className="font-bold text-purple-800 mt-1">قوالب 3D احترافية</h3>
                <p className="text-xs text-purple-600">12 قالب متنوع للمناسبات والفئات</p>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-white rounded-lg p-2 text-center">
                  <span className="text-lg">🆓</span>
                  <p className="text-[10px] font-bold text-gray-700">مجاني</p>
                  <p className="text-[9px] text-gray-500">دمج على قالب</p>
                </div>
                <div className="bg-white rounded-lg p-2 text-center">
                  <span className="text-lg">👑</span>
                  <p className="text-[10px] font-bold text-purple-700">AI مدفوع</p>
                  <p className="text-[9px] text-gray-500">3,000 ل.س</p>
                </div>
              </div>
              
              <button
                onClick={() => {
                  // فتح نافذة القوالب
                  if (onOpenTemplates) {
                    onOpenTemplates();
                  }
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
              >
                <Sparkles size={16} />
                اختيار قالب 3D
              </button>
            </div>
          )}

          {/* معاينة الصور - للمعالجة العادية */}
          {processMode === 'standard' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-500 text-center">الأصلية</p>
              <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden border-2 border-gray-200">
                <img src={imageDataUrl} alt="Original" className="w-full h-full object-contain" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-gray-500 text-center">
                {keepOriginal ? 'بدون تعديل' : 'المعالجة الاحترافية'}
              </p>
              <div className={`aspect-square rounded-xl overflow-hidden border-2 ${
                processedImage ? 'border-green-500' : 'border-dashed border-gray-300'
              } ${keepOriginal ? 'bg-gray-100' : BACKGROUND_COLORS[selectedBg]}`}>
                {processing ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
                    <p className="text-xs text-gray-500">جاري المعالجة الاحترافية...</p>
                    <div className="flex gap-1 flex-wrap justify-center px-4">
                      {options.autoColorCorrect && <span className="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">الألوان</span>}
                      {options.sharpen && <span className="text-[8px] bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded">الحدة</span>}
                      {options.smartCenter && <span className="text-[8px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded">التوسيط</span>}
                    </div>
                  </div>
                ) : processedImage ? (
                  <img src={processedImage} alt="Processed" className="w-full h-full object-contain" />
                ) : keepOriginal ? (
                  <img src={imageDataUrl} alt="Original" className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400">
                    <Wand2 size={32} />
                    <p className="text-xs">اضغط "معالجة" لرؤية النتيجة</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          )}

          {/* خيار إبقاء الأصلية */}
          {processMode === 'standard' && (
          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer border border-gray-200 hover:border-gray-300">
            <input
              type="checkbox"
              checked={keepOriginal}
              onChange={(e) => {
                setKeepOriginal(e.target.checked);
                if (e.target.checked) setProcessedImage(null);
              }}
              className="w-4 h-4 accent-[#FF6B00]"
            />
            <div>
              <p className="font-bold text-sm text-gray-900">إبقاء الصورة الأصلية</p>
              <p className="text-xs text-gray-500">بدون أي معالجة</p>
            </div>
          </label>
          )}

          {processMode === 'standard' && !keepOriginal && (
            <>
              {/* خيارات المعالجة */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-700">خيارات المعالجة</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'autoColorCorrect', icon: Palette, label: 'تصحيح الألوان', desc: 'توازن الأبيض والتشبع' },
                    { key: 'sharpen', icon: Focus, label: 'تحسين الحدة', desc: 'زيادة الوضوح' },
                    { key: 'smartCenter', icon: Move, label: 'توسيط ذكي', desc: 'المنتج في المنتصف' },
                    { key: 'addShadow', icon: Sun, label: 'ظل واقعي', desc: 'ظل خفيف للمنتج' },
                  ].map(({ key, icon: Icon, label, desc }) => (
                    <button
                      key={key}
                      onClick={() => toggleOption(key)}
                      className={`p-2 rounded-lg border text-right transition-all ${
                        options[key] 
                          ? 'bg-orange-50 border-orange-300 text-orange-700' 
                          : 'bg-gray-50 border-gray-200 text-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon size={14} />
                        <span className="text-xs font-bold">{label}</span>
                        {options[key] && <Check size={12} className="mr-auto" />}
                      </div>
                      <p className="text-[9px] mt-1 opacity-70">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* خيارات متقدمة */}
              <button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-center gap-2 py-2 text-gray-600 text-xs hover:bg-gray-50 rounded-lg"
              >
                {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                خيارات متقدمة
              </button>

              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3 overflow-hidden"
                  >
                    {/* الانعكاس */}
                    <button
                      onClick={() => toggleOption('addReflection')}
                      className={`w-full p-3 rounded-lg border text-right ${
                        options.addReflection 
                          ? 'bg-purple-50 border-purple-300' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🪞</span>
                        <div className="flex-1">
                          <p className="text-xs font-bold">انعكاس احترافي</p>
                          <p className="text-[9px] text-gray-500">انعكاس المنتج على السطح</p>
                        </div>
                        {options.addReflection && <Check size={14} className="text-purple-600" />}
                      </div>
                    </button>

                    {/* أحجام متعددة */}
                    <button
                      onClick={() => toggleOption('generateSizes')}
                      className={`w-full p-3 rounded-lg border text-right ${
                        options.generateSizes 
                          ? 'bg-blue-50 border-blue-300' 
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">📱</span>
                        <div className="flex-1">
                          <p className="text-xs font-bold">أحجام متعددة</p>
                          <p className="text-[9px] text-gray-500">Thumbnail, Full, Social Media</p>
                        </div>
                        {options.generateSizes && <Check size={14} className="text-blue-600" />}
                      </div>
                    </button>

                    {/* صيغة الإخراج */}
                    <div>
                      <p className="text-[10px] font-bold text-gray-600 mb-1">صيغة الإخراج</p>
                      <div className="flex gap-2">
                        {[
                          { id: 'jpeg', label: 'JPEG', desc: 'الأفضل للويب' },
                          { id: 'webp', label: 'WebP', desc: 'أصغر 30%' },
                          { id: 'png', label: 'PNG', desc: 'أعلى جودة' },
                        ].map(f => (
                          <button
                            key={f.id}
                            onClick={() => setOptions(p => ({ ...p, outputFormat: f.id }))}
                            className={`flex-1 p-2 rounded-lg border text-center ${
                              options.outputFormat === f.id 
                                ? 'bg-gray-900 text-white border-gray-900' 
                                : 'bg-white border-gray-200'
                            }`}
                          >
                            <p className="text-xs font-bold">{f.label}</p>
                            <p className="text-[8px] opacity-70">{f.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* اختيار الخلفية */}
              <div>
                <p className="text-xs font-bold text-gray-700 mb-2">اختر الخلفية</p>
                <div className="grid grid-cols-5 gap-2">
                  {backgrounds.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => {
                        setSelectedBg(bg.id);
                        setProcessedImage(null);
                      }}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        selectedBg === bg.id 
                          ? 'border-[#FF6B00] ring-2 ring-[#FF6B00]/30' 
                          : 'border-gray-200 hover:border-gray-300'
                      } ${BACKGROUND_COLORS[bg.id]}`}
                      title={bg.name}
                    >
                      {selectedBg === bg.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#FF6B00]/20">
                          <Check size={14} className="text-[#FF6B00]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-500 mt-1 text-center">
                  {backgrounds.find(b => b.id === selectedBg)?.name || 'أبيض نقي'}
                </p>
              </div>

              {/* زر المعالجة */}
              <button
                onClick={processImage}
                disabled={processing}
                className="w-full bg-gradient-to-r from-[#FF6B00] to-orange-500 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg"
              >
                {processing ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    جاري المعالجة الاحترافية...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    معالجة احترافية ✨
                  </>
                )}
              </button>

              {/* معلومات المعالجة */}
              {processingInfo && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-green-700 mb-1">✅ تمت المعالجة بنجاح</p>
                  <div className="flex flex-wrap gap-1">
                    {processingInfo.background_removal === 'removebg' && (
                      <span className="text-[9px] bg-green-600 text-white px-2 py-0.5 rounded-full">Remove.bg Pro</span>
                    )}
                    {processingInfo.auto_color_correct && (
                      <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">تصحيح الألوان</span>
                    )}
                    {processingInfo.sharpened && (
                      <span className="text-[9px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">تحسين الحدة</span>
                    )}
                    {processingInfo.smart_centered && (
                      <span className="text-[9px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full">توسيط ذكي</span>
                    )}
                    {processingInfo.shadow_added && (
                      <span className="text-[9px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">ظل</span>
                    )}
                    {processingInfo.reflection_added && (
                      <span className="text-[9px] bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">انعكاس</span>
                    )}
                  </div>
                </div>
              )}

              {/* الأحجام المتعددة */}
              {multipleSizes && Object.keys(multipleSizes).length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-xs font-bold text-blue-700 mb-2">📱 الأحجام المتاحة</p>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(multipleSizes).map(([name, url]) => (
                      <div key={name} className="text-center">
                        <div className="aspect-square bg-white rounded-lg overflow-hidden border border-blue-200 mb-1">
                          <img src={url} alt={name} className="w-full h-full object-contain" />
                        </div>
                        <p className="text-[9px] text-blue-700">{name}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-3 flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-bold"
          >
            إلغاء
          </button>
          <button
            onClick={handleConfirm}
            disabled={!processedImage && !keepOriginal}
            className="flex-1 bg-[#FF6B00] text-white py-2 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Check size={16} />
            استخدام الصورة
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ProImageProcessor;
