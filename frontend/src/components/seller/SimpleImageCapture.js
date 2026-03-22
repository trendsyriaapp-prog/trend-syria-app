// /app/frontend/src/components/seller/SimpleImageCapture.js
// مكون متكامل لالتقاط ومعالجة صور المنتجات مع قوالب 3D
// الإصدار المحسن - إصلاح الخلفية والقوالب والجودة

import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  X, Camera, RotateCcw, Check, Loader2,
  Sparkles, Box, Palette, SlidersHorizontal, ChevronDown
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// ألوان الخلفية المتاحة
const BACKGROUND_COLORS = [
  { id: 'white', name: 'أبيض', color: '#FFFFFF' },
  { id: 'light_gray', name: 'رمادي فاتح', color: '#F5F5F5' },
  { id: 'soft_blue', name: 'أزرق ناعم', color: '#E6F0FF' },
  { id: 'soft_pink', name: 'وردي ناعم', color: '#FFF0F5' },
  { id: 'soft_gold', name: 'ذهبي ناعم', color: '#FFF8E6' },
  { id: 'elegant_gray', name: 'رمادي أنيق', color: '#C8C8C8' },
  { id: 'premium_dark', name: 'داكن فاخر', color: '#282828' },
  { id: 'fashion_beige', name: 'بيج عصري', color: '#F5F0E6' },
  { id: 'tech_silver', name: 'فضي تقني', color: '#DCE1E6' },
  { id: 'nature_green', name: 'أخضر طبيعي', color: '#EBF5EB' },
];

const SimpleImageCapture = ({ isOpen, onClose, onImageReady, mode = 'camera', token }) => {
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('capture'); // capture, preview, edit
  const [facingMode, setFacingMode] = useState('environment');
  
  // الخلفية المحددة
  const [selectedBackground, setSelectedBackground] = useState('white');
  
  // القوالب
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [applyingTemplate, setApplyingTemplate] = useState(false);
  
  // أدوات التحرير
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showAdjustments, setShowAdjustments] = useState(false);
  
  // إعدادات التعديل
  const [adjustments, setAdjustments] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100
  });

  // جلب القوالب
  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    try {
      const res = await axios.get(`${API}/api/templates/list`);
      setTemplates(res.data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  // فتح الكاميرا
  useEffect(() => {
    if (isOpen && mode === 'camera' && step === 'capture') {
      startCamera();
    }
    return () => stopCamera();
  }, [isOpen, mode, step, facingMode]);

  // فتح معرض الصور
  useEffect(() => {
    if (isOpen && mode === 'gallery') {
      setTimeout(() => fileInputRef.current?.click(), 100);
    }
  }, [isOpen, mode]);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 1280 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
    } catch (err) {
      setError('لا يمكن الوصول للكاميرا');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const switchCamera = () => {
    stopCamera();
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // التقاط صورة
  const captureFromCamera = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    const video = videoRef.current;
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const offsetX = (video.videoWidth - size) / 2;
    const offsetY = (video.videoHeight - size) / 2;
    ctx.drawImage(video, offsetX, offsetY, size, size, 0, 0, size, size);
    setCapturedImage(canvas.toDataURL('image/jpeg', 0.95));
    setStep('preview');
    stopCamera();
  };

  // اختيار من المعرض
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) { onClose(); return; }
    const reader = new FileReader();
    reader.onload = (event) => {
      setCapturedImage(event.target.result);
      setStep('preview');
    };
    reader.readAsDataURL(file);
  };

  // معالجة الصورة وإزالة الخلفية مع لون الخلفية المحدد
  const processImage = async (bgColor = selectedBackground) => {
    if (!capturedImage) return;
    setProcessing(true);
    setError(null);
    
    try {
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('file', blob, 'image.png');
      formData.append('background', bgColor);
      formData.append('add_shadow', 'true');
      formData.append('auto_color_correct', 'true'); // تفعيل تصحيح الألوان
      formData.append('sharpen', 'true'); // تفعيل تحسين الحدة
      formData.append('smart_center', 'true');
      formData.append('output_format', 'png'); // PNG للحفاظ على الجودة
      
      const result = await axios.post(`${API}/api/image/process-pro`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 90000
      });
      
      if (result.data.success && result.data.image) {
        setProcessedImage(result.data.image);
        setSelectedBackground(bgColor);
        setSelectedTemplate(null); // إعادة تعيين القالب عند تغيير الخلفية
        setStep('edit');
      } else {
        throw new Error('فشل في معالجة الصورة');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('فشل في إزالة الخلفية. جرب مرة أخرى.');
    } finally {
      setProcessing(false);
    }
  };

  // تغيير لون الخلفية (إعادة المعالجة)
  const changeBackground = async (bgColor) => {
    setSelectedBackground(bgColor);
    setShowColorPicker(false);
    
    // إذا كان هناك صورة معالجة، نعيد المعالجة بالخلفية الجديدة
    if (capturedImage) {
      await processImage(bgColor);
    }
  };

  // تطبيق قالب 3D
  const applyTemplate = async (template) => {
    if (!processedImage) return;
    setApplyingTemplate(true);
    setSelectedTemplate(template.id);
    
    try {
      const response = await fetch(processedImage);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('file', blob, 'image.png');
      formData.append('template_id', template.id);
      
      const result = await axios.post(`${API}/api/templates/apply-free`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
      });
      
      if (result.data.success && result.data.image) {
        setProcessedImage(result.data.image);
      }
    } catch (err) {
      console.error('Template error:', err);
    } finally {
      setApplyingTemplate(false);
    }
  };

  // إزالة القالب (العودة للصورة بدون قالب)
  const removeTemplate = async () => {
    setSelectedTemplate(null);
    await processImage(selectedBackground);
  };

  // تطبيق التعديلات على الصورة
  const applyAdjustments = useCallback(() => {
    if (!processedImage || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      // تطبيق الفلاتر
      ctx.filter = `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`;
      ctx.drawImage(img, 0, 0);
    };
    
    img.src = processedImage;
  }, [processedImage, adjustments]);

  useEffect(() => {
    if (step === 'edit' && processedImage) {
      applyAdjustments();
    }
  }, [step, processedImage, adjustments, applyAdjustments]);

  // استخدام الصورة
  const handleUseImage = (img) => {
    // إذا كان هناك تعديلات، نأخذ الصورة من الكانفاس
    if (canvasRef.current && step === 'edit') {
      const finalImage = canvasRef.current.toDataURL('image/jpeg', 0.95);
      onImageReady(finalImage);
    } else {
      onImageReady(img);
    }
    handleClose();
  };

  // إعادة التصوير
  const retake = () => {
    setCapturedImage(null);
    setProcessedImage(null);
    setSelectedTemplate(null);
    setSelectedBackground('white');
    setAdjustments({ brightness: 100, contrast: 100, saturation: 100 });
    setStep('capture');
    if (mode === 'camera') startCamera();
    else setTimeout(() => fileInputRef.current?.click(), 100);
  };

  // إغلاق
  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setProcessedImage(null);
    setSelectedTemplate(null);
    setSelectedBackground('white');
    setAdjustments({ brightness: 100, contrast: 100, saturation: 100 });
    setStep('capture');
    setError(null);
    onClose();
  };

  // الحصول على لون الخلفية للعرض
  const getBackgroundStyle = () => {
    const bg = BACKGROUND_COLORS.find(b => b.id === selectedBackground);
    return bg ? bg.color : '#FFFFFF';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col" data-testid="image-capture-modal">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={handleClose} className="p-2 text-white" data-testid="close-btn">
          <X size={24} />
        </button>
        <h2 className="text-white font-bold text-lg">
          {step === 'capture' && 'التقاط صورة'}
          {step === 'preview' && 'إزالة الخلفية'}
          {step === 'edit' && 'تحرير الصورة'}
        </h2>
        <div className="w-10" />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 overflow-y-auto">
        
        {/* Step 1: Capture */}
        {step === 'capture' && mode === 'camera' && (
          <div className="w-full max-w-sm">
            {error ? (
              <div className="text-center p-6">
                <Camera size={48} className="mx-auto mb-4 text-white/30" />
                <p className="text-white mb-4">{error}</p>
                <button onClick={startCamera} className="px-6 py-3 bg-[#FF6B00] text-white rounded-xl font-bold">
                  إعادة المحاولة
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="aspect-square bg-gray-900 rounded-2xl overflow-hidden">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <div className="absolute inset-4 border-2 border-dashed border-white/30 rounded-xl pointer-events-none" />
                </div>
                <p className="text-center text-white/60 text-sm mt-2">ضع المنتج داخل الإطار</p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Preview & Remove Background */}
        {step === 'preview' && (
          <div className="w-full max-w-sm space-y-4">
            <div className="aspect-square bg-gray-800 rounded-2xl overflow-hidden">
              <img src={capturedImage} alt="Preview" className="w-full h-full object-cover" />
            </div>
            {error && <p className="text-red-400 text-center text-sm">{error}</p>}
            
            {/* اختيار لون الخلفية قبل المعالجة */}
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-white text-xs font-bold mb-2 flex items-center gap-2">
                <Palette size={14} />
                اختر لون الخلفية
              </p>
              <div className="flex flex-wrap gap-2">
                {BACKGROUND_COLORS.slice(0, 6).map(bg => (
                  <button
                    key={bg.id}
                    onClick={() => setSelectedBackground(bg.id)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      selectedBackground === bg.id 
                        ? 'border-[#FF6B00] scale-110' 
                        : 'border-white/20'
                    }`}
                    style={{ backgroundColor: bg.color }}
                    title={bg.name}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Edit */}
        {step === 'edit' && (
          <div className="w-full max-w-md space-y-3">
            {/* الصورة المعالجة مع الخلفية الفعلية */}
            <div 
              className="aspect-square rounded-2xl overflow-hidden shadow-2xl mx-auto max-w-xs relative"
              style={{ backgroundColor: getBackgroundStyle() }}
              data-testid="processed-image-container"
            >
              {processedImage && (
                <img 
                  src={processedImage} 
                  alt="Processed" 
                  className="w-full h-full object-contain"
                  style={{
                    filter: `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`
                  }}
                />
              )}
              {applyingTemplate && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 size={32} className="animate-spin text-white" />
                </div>
              )}
            </div>

            {/* أدوات التحرير */}
            <div className="flex gap-2">
              {/* زر تغيير الخلفية */}
              <button
                onClick={() => { setShowColorPicker(!showColorPicker); setShowAdjustments(false); }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 ${
                  showColorPicker ? 'bg-[#FF6B00] text-white' : 'bg-white/20 text-white'
                }`}
                data-testid="color-picker-toggle"
              >
                <Palette size={14} />
                الخلفية
                <ChevronDown size={12} className={showColorPicker ? 'rotate-180' : ''} />
              </button>
              
              {/* زر التعديلات */}
              <button
                onClick={() => { setShowAdjustments(!showAdjustments); setShowColorPicker(false); }}
                className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 ${
                  showAdjustments ? 'bg-[#FF6B00] text-white' : 'bg-white/20 text-white'
                }`}
                data-testid="adjustments-toggle"
              >
                <SlidersHorizontal size={14} />
                تعديلات
                <ChevronDown size={12} className={showAdjustments ? 'rotate-180' : ''} />
              </button>
            </div>

            {/* منتقي الألوان */}
            {showColorPicker && (
              <div className="bg-white/10 rounded-xl p-3 animate-in slide-in-from-top-2">
                <p className="text-white text-xs font-bold mb-2">ألوان الخلفية</p>
                <div className="grid grid-cols-5 gap-2">
                  {BACKGROUND_COLORS.map(bg => (
                    <button
                      key={bg.id}
                      onClick={() => changeBackground(bg.id)}
                      disabled={processing}
                      className={`aspect-square rounded-lg border-2 transition-all flex items-center justify-center ${
                        selectedBackground === bg.id 
                          ? 'border-[#FF6B00] ring-2 ring-[#FF6B00]/50 scale-105' 
                          : 'border-white/20 hover:border-white/40'
                      } ${processing ? 'opacity-50' : ''}`}
                      style={{ backgroundColor: bg.color }}
                      title={bg.name}
                      data-testid={`bg-color-${bg.id}`}
                    >
                      {selectedBackground === bg.id && (
                        <Check size={16} className={bg.id === 'premium_dark' ? 'text-white' : 'text-[#FF6B00]'} />
                      )}
                    </button>
                  ))}
                </div>
                {processing && (
                  <p className="text-center text-white/60 text-xs mt-2 flex items-center justify-center gap-1">
                    <Loader2 size={12} className="animate-spin" />
                    جاري تغيير الخلفية...
                  </p>
                )}
              </div>
            )}

            {/* أدوات التعديل */}
            {showAdjustments && (
              <div className="bg-white/10 rounded-xl p-3 space-y-3 animate-in slide-in-from-top-2">
                {/* السطوع */}
                <div>
                  <div className="flex justify-between text-xs text-white mb-1">
                    <span>السطوع</span>
                    <span>{adjustments.brightness}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={adjustments.brightness}
                    onChange={(e) => setAdjustments(prev => ({ ...prev, brightness: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#FF6B00]"
                    data-testid="brightness-slider"
                  />
                </div>
                
                {/* التباين */}
                <div>
                  <div className="flex justify-between text-xs text-white mb-1">
                    <span>التباين</span>
                    <span>{adjustments.contrast}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={adjustments.contrast}
                    onChange={(e) => setAdjustments(prev => ({ ...prev, contrast: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#FF6B00]"
                    data-testid="contrast-slider"
                  />
                </div>
                
                {/* التشبع */}
                <div>
                  <div className="flex justify-between text-xs text-white mb-1">
                    <span>التشبع</span>
                    <span>{adjustments.saturation}%</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={adjustments.saturation}
                    onChange={(e) => setAdjustments(prev => ({ ...prev, saturation: parseInt(e.target.value) }))}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-[#FF6B00]"
                    data-testid="saturation-slider"
                  />
                </div>
                
                {/* زر إعادة التعيين */}
                <button
                  onClick={() => setAdjustments({ brightness: 100, contrast: 100, saturation: 100 })}
                  className="w-full py-2 bg-white/10 text-white/70 rounded-lg text-xs hover:bg-white/20"
                >
                  إعادة التعيين
                </button>
              </div>
            )}

            {/* القوالب */}
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-white font-bold text-xs mb-2 flex items-center gap-2">
                <Box size={14} />
                قوالب 3D جاهزة ({templates.length})
              </p>
              <div className="grid grid-cols-4 gap-2">
                {/* بدون قالب */}
                <button
                  onClick={removeTemplate}
                  disabled={applyingTemplate || processing}
                  className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center text-[10px] ${
                    !selectedTemplate ? 'border-[#FF6B00] bg-[#FF6B00]/20' : 'border-white/20 bg-white/5'
                  } disabled:opacity-50`}
                  data-testid="no-template-btn"
                >
                  <X size={16} className="text-white/60 mb-0.5" />
                  <span className="text-white/80">بدون</span>
                </button>
                
                {templates.slice(0, 11).map(template => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    disabled={applyingTemplate || processing}
                    className={`aspect-square rounded-lg border-2 overflow-hidden flex flex-col items-center justify-center ${
                      selectedTemplate === template.id 
                        ? 'border-[#FF6B00] ring-2 ring-[#FF6B00]/50' 
                        : 'border-white/20'
                    } disabled:opacity-50`}
                    style={{
                      background: `linear-gradient(135deg, ${template.colors.primary}, ${template.colors.secondary})`
                    }}
                    title={template.name}
                    data-testid={`template-${template.id}`}
                  >
                    <span className="text-xl mb-0.5">{template.icon}</span>
                    <span className="text-[8px] text-white font-bold truncate px-1">{template.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="p-4 pb-8 bg-gradient-to-t from-black/80 to-transparent">
        
        {/* Capture */}
        {step === 'capture' && mode === 'camera' && !error && (
          <div className="flex items-center justify-center gap-8">
            <button onClick={switchCamera} className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
              <RotateCcw size={24} className="text-white" />
            </button>
            <button
              onClick={captureFromCamera}
              disabled={!stream}
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center disabled:opacity-50 shadow-lg"
              data-testid="capture-btn"
            >
              <div className="w-16 h-16 bg-[#FF6B00] rounded-full" />
            </button>
            <div className="w-14" />
          </div>
        )}

        {/* Preview */}
        {step === 'preview' && (
          <div className="space-y-3 max-w-sm mx-auto">
            <button
              onClick={() => processImage(selectedBackground)}
              disabled={processing}
              className="w-full py-4 bg-[#FF6B00] text-white rounded-xl font-bold flex items-center justify-center gap-2"
              data-testid="remove-bg-btn"
            >
              {processing ? (
                <><Loader2 size={20} className="animate-spin" /> جاري إزالة الخلفية...</>
              ) : (
                <><Sparkles size={20} /> إزالة الخلفية</>
              )}
            </button>
            <div className="flex gap-3">
              <button 
                onClick={() => handleUseImage(capturedImage)} 
                disabled={processing} 
                className="flex-1 py-3 bg-white/20 text-white rounded-xl font-bold"
              >
                استخدم الأصلية
              </button>
              <button 
                onClick={retake} 
                disabled={processing} 
                className="flex-1 py-3 bg-white/20 text-white rounded-xl font-bold"
              >
                إعادة
              </button>
            </div>
          </div>
        )}

        {/* Edit */}
        {step === 'edit' && (
          <div className="space-y-3 max-w-sm mx-auto">
            <button
              onClick={() => handleUseImage(processedImage)}
              disabled={applyingTemplate || processing}
              className="w-full py-4 bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              data-testid="use-image-btn"
            >
              <Check size={20} /> استخدام الصورة
            </button>
            <div className="flex gap-3">
              <button 
                onClick={() => handleUseImage(capturedImage)} 
                className="flex-1 py-3 bg-white/20 text-white rounded-xl font-bold"
              >
                الأصلية
              </button>
              <button 
                onClick={retake} 
                className="flex-1 py-3 bg-white/20 text-white rounded-xl font-bold"
              >
                إعادة
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleImageCapture;
