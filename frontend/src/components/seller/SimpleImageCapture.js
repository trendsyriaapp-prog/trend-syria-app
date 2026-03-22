// /app/frontend/src/components/seller/SimpleImageCapture.js
// مكون متكامل لالتقاط ومعالجة صور المنتجات مع قوالب 3D
// الصورة تملأ الشاشة بالكامل مع الإعدادات فوقها

import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  X, Camera, RotateCcw, Check, Loader2,
  Sparkles, Box, Palette, SlidersHorizontal, ChevronUp, ChevronDown
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
  
  // أدوات التحرير - فتح الإعدادات تلقائياً
  const [showTools, setShowTools] = useState(true);
  const [activeTab, setActiveTab] = useState('colors'); // colors, templates, adjustments
  
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

  // معالجة الصورة وإزالة الخلفية
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
      formData.append('auto_color_correct', 'true');
      formData.append('sharpen', 'true');
      formData.append('smart_center', 'true');
      formData.append('output_format', 'png');
      
      const result = await axios.post(`${API}/api/image/process-pro`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 90000
      });
      
      if (result.data.success && result.data.image) {
        setProcessedImage(result.data.image);
        setSelectedBackground(bgColor);
        setSelectedTemplate(null);
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

  // تغيير لون الخلفية
  const changeBackground = async (bgColor) => {
    setSelectedBackground(bgColor);
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

  // إزالة القالب
  const removeTemplate = async () => {
    setSelectedTemplate(null);
    await processImage(selectedBackground);
  };

  // استخدام الصورة
  const handleUseImage = (img) => {
    onImageReady(img);
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
    setShowTools(true);
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
    <div className="fixed inset-0 z-50 flex flex-col" data-testid="image-capture-modal">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* === الخلفية: الصورة تملأ الشاشة بالكامل === */}
      <div 
        className="absolute inset-0"
        style={{ 
          backgroundColor: step === 'edit' ? getBackgroundStyle() : '#000000'
        }}
      >
        {/* Step 1: Camera View - Full Screen */}
        {step === 'capture' && mode === 'camera' && (
          <div className="w-full h-full">
            {error ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-black">
                <Camera size={64} className="text-white/30 mb-4" />
                <p className="text-white text-lg mb-4">{error}</p>
                <button onClick={startCamera} className="px-6 py-3 bg-[#FF6B00] text-white rounded-xl font-bold">
                  إعادة المحاولة
                </button>
              </div>
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            )}
          </div>
        )}

        {/* Step 2: Preview - Full Screen */}
        {step === 'preview' && capturedImage && (
          <img 
            src={capturedImage} 
            alt="Preview" 
            className="w-full h-full object-contain"
          />
        )}

        {/* Step 3: Processed Image - Full Screen */}
        {step === 'edit' && processedImage && (
          <img 
            src={processedImage} 
            alt="Processed" 
            className="w-full h-full object-contain"
            style={{
              filter: `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`
            }}
          />
        )}

        {/* Loading Overlay */}
        {(processing || applyingTemplate) && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
            <Loader2 size={48} className="animate-spin text-[#FF6B00] mb-4" />
            <p className="text-white text-lg">
              {processing ? 'جاري إزالة الخلفية...' : 'جاري تطبيق القالب...'}
            </p>
          </div>
        )}
      </div>

      {/* === Header - فوق الصورة === */}
      <div className="relative z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <button onClick={handleClose} className="p-2 bg-black/40 rounded-full text-white" data-testid="close-btn">
          <X size={24} />
        </button>
        <h2 className="text-white font-bold text-lg drop-shadow-lg">
          {step === 'capture' && 'التقاط صورة'}
          {step === 'preview' && 'معاينة الصورة'}
          {step === 'edit' && 'تحرير الصورة'}
        </h2>
        <div className="w-10" />
      </div>

      {/* === محتوى الإعدادات والأزرار - فوق الصورة === */}
      <div className="relative z-10 flex-1 flex flex-col justify-end">
        
        {/* Camera Guide - فقط في وضع الكاميرا */}
        {step === 'capture' && mode === 'camera' && !error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-3/4 aspect-square border-2 border-dashed border-white/40 rounded-2xl" />
          </div>
        )}

        {/* === أدوات التحرير === */}
        {(step === 'preview' || step === 'edit') && (
          <div className="bg-gradient-to-t from-black via-black/90 to-transparent pt-8">
            
            {/* زر إظهار/إخفاء الأدوات */}
            <button
              onClick={() => setShowTools(!showTools)}
              className="mx-auto mb-2 flex items-center gap-1 px-4 py-1 bg-white/20 rounded-full text-white text-xs"
            >
              {showTools ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
              {showTools ? 'إخفاء الأدوات' : 'إظهار الأدوات'}
            </button>

            {showTools && step === 'edit' && (
              <div className="px-4 space-y-3">
                {/* تبويبات الأدوات */}
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => setActiveTab('colors')}
                    className={`flex-1 max-w-[100px] py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 ${
                      activeTab === 'colors' ? 'bg-[#FF6B00] text-white' : 'bg-white/20 text-white'
                    }`}
                  >
                    <Palette size={14} />
                    الخلفية
                  </button>
                  <button
                    onClick={() => setActiveTab('templates')}
                    className={`flex-1 max-w-[100px] py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 ${
                      activeTab === 'templates' ? 'bg-[#FF6B00] text-white' : 'bg-white/20 text-white'
                    }`}
                  >
                    <Box size={14} />
                    القوالب
                  </button>
                  <button
                    onClick={() => setActiveTab('adjustments')}
                    className={`flex-1 max-w-[100px] py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 ${
                      activeTab === 'adjustments' ? 'bg-[#FF6B00] text-white' : 'bg-white/20 text-white'
                    }`}
                  >
                    <SlidersHorizontal size={14} />
                    تعديل
                  </button>
                </div>

                {/* محتوى التبويب النشط */}
                <div className="bg-black/40 rounded-xl p-3 max-h-40 overflow-y-auto">
                  
                  {/* ألوان الخلفية */}
                  {activeTab === 'colors' && (
                    <div className="grid grid-cols-5 gap-2">
                      {BACKGROUND_COLORS.map(bg => (
                        <button
                          key={bg.id}
                          onClick={() => changeBackground(bg.id)}
                          disabled={processing}
                          className={`aspect-square rounded-lg border-2 transition-all flex items-center justify-center ${
                            selectedBackground === bg.id 
                              ? 'border-[#FF6B00] ring-2 ring-[#FF6B00]/50 scale-105' 
                              : 'border-white/30'
                          } ${processing ? 'opacity-50' : ''}`}
                          style={{ backgroundColor: bg.color }}
                          title={bg.name}
                        >
                          {selectedBackground === bg.id && (
                            <Check size={18} className={bg.id === 'premium_dark' ? 'text-white' : 'text-[#FF6B00]'} />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* القوالب */}
                  {activeTab === 'templates' && (
                    <div className="grid grid-cols-4 gap-2">
                      {/* بدون قالب */}
                      <button
                        onClick={removeTemplate}
                        disabled={applyingTemplate || processing}
                        className={`aspect-square rounded-lg border-2 flex flex-col items-center justify-center ${
                          !selectedTemplate ? 'border-[#FF6B00] bg-[#FF6B00]/20' : 'border-white/30 bg-white/10'
                        } disabled:opacity-50`}
                      >
                        <X size={16} className="text-white/60" />
                        <span className="text-[9px] text-white/80 mt-0.5">بدون</span>
                      </button>
                      
                      {templates.slice(0, 11).map(template => (
                        <button
                          key={template.id}
                          onClick={() => applyTemplate(template)}
                          disabled={applyingTemplate || processing}
                          className={`aspect-square rounded-lg border-2 overflow-hidden flex flex-col items-center justify-center ${
                            selectedTemplate === template.id 
                              ? 'border-[#FF6B00] ring-2 ring-[#FF6B00]/50' 
                              : 'border-white/30'
                          } disabled:opacity-50`}
                          style={{
                            background: `linear-gradient(135deg, ${template.colors.primary}, ${template.colors.secondary})`
                          }}
                          title={template.name}
                        >
                          <span className="text-lg">{template.icon}</span>
                          <span className="text-[8px] text-white font-bold truncate px-0.5">{template.name}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* التعديلات */}
                  {activeTab === 'adjustments' && (
                    <div className="space-y-3">
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
                </div>
              </div>
            )}

            {/* === أزرار التحكم === */}
            <div className="p-4 space-y-3">
              
              {/* وضع المعاينة - قبل إزالة الخلفية */}
              {step === 'preview' && (
                <>
                  {/* اختيار لون الخلفية */}
                  {showTools && (
                    <div className="bg-black/40 rounded-xl p-3">
                      <p className="text-white text-xs font-bold mb-2 flex items-center gap-2">
                        <Palette size={14} />
                        اختر لون الخلفية قبل المعالجة
                      </p>
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {BACKGROUND_COLORS.map(bg => (
                          <button
                            key={bg.id}
                            onClick={() => setSelectedBackground(bg.id)}
                            className={`w-10 h-10 flex-shrink-0 rounded-full border-2 transition-all ${
                              selectedBackground === bg.id 
                                ? 'border-[#FF6B00] scale-110' 
                                : 'border-white/30'
                            }`}
                            style={{ backgroundColor: bg.color }}
                            title={bg.name}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={() => processImage(selectedBackground)}
                    disabled={processing}
                    className="w-full py-4 bg-[#FF6B00] text-white rounded-xl font-bold flex items-center justify-center gap-2 text-lg"
                    data-testid="remove-bg-btn"
                  >
                    {processing ? (
                      <><Loader2 size={22} className="animate-spin" /> جاري إزالة الخلفية...</>
                    ) : (
                      <><Sparkles size={22} /> إزالة الخلفية</>
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
                </>
              )}

              {/* وضع التحرير - بعد إزالة الخلفية */}
              {step === 'edit' && (
                <>
                  <button
                    onClick={() => handleUseImage(processedImage)}
                    disabled={applyingTemplate || processing}
                    className="w-full py-4 bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 text-lg disabled:opacity-50"
                    data-testid="use-image-btn"
                  >
                    <Check size={22} /> استخدام الصورة
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
                </>
              )}

              {/* وضع الكاميرا */}
              {step === 'capture' && mode === 'camera' && !error && (
                <div className="flex items-center justify-center gap-8 pb-4">
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
            </div>
          </div>
        )}

        {/* وضع الكاميرا - الأزرار في الأسفل */}
        {step === 'capture' && mode === 'camera' && !error && (
          <div className="bg-gradient-to-t from-black/80 to-transparent p-4 pb-8">
            <p className="text-center text-white/60 text-sm mb-6">ضع المنتج داخل الإطار</p>
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
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleImageCapture;
