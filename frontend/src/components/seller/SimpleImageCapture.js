// /app/frontend/src/components/seller/SimpleImageCapture.js
// مكون متكامل لالتقاط ومعالجة وتعديل صور المنتجات

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  X, Camera, RotateCcw, Check, Loader2,
  Image as ImageIcon, Sparkles, RefreshCw,
  Sun, Contrast, Palette, Box, ChevronLeft, ChevronRight
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// الخلفيات المتاحة
const BACKGROUNDS = [
  { id: 'white', name: 'أبيض', color: '#FFFFFF' },
  { id: 'light-gray', name: 'رمادي فاتح', color: '#F5F5F5' },
  { id: 'cream', name: 'كريمي', color: '#FFF8E7' },
  { id: 'light-blue', name: 'أزرق فاتح', color: '#E3F2FD' },
  { id: 'light-pink', name: 'وردي فاتح', color: '#FCE4EC' },
  { id: 'transparent', name: 'شفاف', color: 'transparent' },
];

// إطارات 3D
const FRAMES_3D = [
  { id: 'none', name: 'بدون', preview: null },
  { id: 'shadow', name: 'ظل', style: 'drop-shadow(0 10px 20px rgba(0,0,0,0.3))' },
  { id: 'float', name: 'عائم', style: 'drop-shadow(0 20px 30px rgba(0,0,0,0.25))' },
  { id: 'glow', name: 'توهج', style: 'drop-shadow(0 0 20px rgba(255,107,0,0.4))' },
  { id: 'soft', name: 'ناعم', style: 'drop-shadow(0 5px 15px rgba(0,0,0,0.15))' },
];

const SimpleImageCapture = ({ isOpen, onClose, onImageReady, mode = 'camera' }) => {
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [finalImage, setFinalImage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('capture'); // capture, preview, processed, edit
  const [facingMode, setFacingMode] = useState('environment');
  
  // خيارات التعديل
  const [selectedBackground, setSelectedBackground] = useState('white');
  const [selectedFrame, setSelectedFrame] = useState('shadow');
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);

  // فتح الكاميرا
  useEffect(() => {
    if (isOpen && mode === 'camera' && step === 'capture') {
      startCamera();
    }
    return () => stopCamera();
  }, [isOpen, mode, step, facingMode]);

  // فتح معرض الصور تلقائياً
  useEffect(() => {
    if (isOpen && mode === 'gallery') {
      setTimeout(() => fileInputRef.current?.click(), 100);
    }
  }, [isOpen, mode]);

  // تحديث الصورة النهائية عند تغيير الإعدادات
  useEffect(() => {
    if (processedImage && step === 'edit') {
      applyEffects();
    }
  }, [selectedBackground, selectedFrame, brightness, contrast, saturation, processedImage]);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1080 }
        }
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

  // التقاط صورة من الكاميرا
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
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(dataUrl);
    setStep('preview');
    stopCamera();
  };

  // اختيار صورة من المعرض
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      onClose();
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      setCapturedImage(event.target.result);
      setStep('preview');
    };
    reader.readAsDataURL(file);
  };

  // معالجة الصورة (إزالة الخلفية)
  const processImage = async () => {
    if (!capturedImage) return;
    
    setProcessing(true);
    setError(null);
    
    try {
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('file', blob, 'image.jpg');
      formData.append('background', 'transparent'); // نزيل الخلفية بشكل شفاف أولاً
      formData.append('add_shadow', 'false');
      formData.append('auto_color_correct', 'true');
      
      const result = await axios.post(`${API}/api/image/process-pro`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
      });
      
      if (result.data.success && result.data.image) {
        setProcessedImage(result.data.image);
        setFinalImage(result.data.image);
        setStep('edit'); // الانتقال لمرحلة التعديل
      } else {
        throw new Error('فشل في معالجة الصورة');
      }
    } catch (err) {
      console.error('Processing error:', err);
      setError('فشل في معالجة الصورة. جرب مرة أخرى.');
    } finally {
      setProcessing(false);
    }
  };

  // تطبيق التأثيرات على الصورة
  const applyEffects = () => {
    if (!processedImage || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = 800;
      canvas.height = 800;
      
      // رسم الخلفية
      const bg = BACKGROUNDS.find(b => b.id === selectedBackground);
      if (bg && bg.id !== 'transparent') {
        ctx.fillStyle = bg.color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      
      // تطبيق الفلاتر
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
      
      // حساب حجم وموقع الصورة
      const scale = 0.8;
      const imgWidth = canvas.width * scale;
      const imgHeight = canvas.height * scale;
      const x = (canvas.width - imgWidth) / 2;
      const y = (canvas.height - imgHeight) / 2;
      
      // رسم الصورة
      ctx.drawImage(img, x, y, imgWidth, imgHeight);
      
      // تحديث الصورة النهائية
      setFinalImage(canvas.toDataURL('image/png'));
    };
    
    img.src = processedImage;
  };

  // استخدام الصورة الأصلية
  const useOriginal = () => {
    onImageReady(capturedImage);
    handleClose();
  };

  // استخدام الصورة النهائية
  const useFinal = () => {
    onImageReady(finalImage || processedImage);
    handleClose();
  };

  // إعادة التصوير
  const retake = () => {
    setCapturedImage(null);
    setProcessedImage(null);
    setFinalImage(null);
    setStep('capture');
    resetEdits();
    if (mode === 'camera') {
      startCamera();
    } else {
      setTimeout(() => fileInputRef.current?.click(), 100);
    }
  };

  // إعادة ضبط التعديلات
  const resetEdits = () => {
    setSelectedBackground('white');
    setSelectedFrame('shadow');
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
  };

  // إغلاق
  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setProcessedImage(null);
    setFinalImage(null);
    setStep('capture');
    setError(null);
    resetEdits();
    onClose();
  };

  if (!isOpen) return null;

  const frameStyle = FRAMES_3D.find(f => f.id === selectedFrame)?.style || '';

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Hidden elements */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-black/80 border-b border-white/10">
        <button onClick={handleClose} className="p-2 text-white hover:bg-white/10 rounded-lg">
          <X size={22} />
        </button>
        <h2 className="text-white font-bold">
          {step === 'capture' && '📷 التقاط صورة'}
          {step === 'preview' && '👁️ معاينة'}
          {step === 'edit' && '✨ تعديل الصورة'}
        </h2>
        <div className="w-10" />
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex flex-col items-center justify-center min-h-full p-4">
          
          {/* Step 1: Capture */}
          {step === 'capture' && mode === 'camera' && (
            <div className="w-full max-w-md">
              {error ? (
                <div className="bg-red-500/20 rounded-2xl p-6 text-center">
                  <Camera size={48} className="mx-auto mb-4 text-white/50" />
                  <p className="text-white mb-4">{error}</p>
                  <button
                    onClick={startCamera}
                    className="px-6 py-3 bg-[#FF6B00] text-white rounded-xl font-bold"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <div className="aspect-square bg-gray-900 rounded-2xl overflow-hidden relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-3/4 h-3/4 border-2 border-dashed border-white/40 rounded-2xl" />
                    </div>
                  </div>
                  <p className="text-center text-white/70 text-sm mt-3">
                    ضع المنتج داخل الإطار
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && (
            <div className="w-full max-w-md">
              <div className="aspect-square bg-gray-900 rounded-2xl overflow-hidden mb-4">
                <img src={capturedImage} alt="Preview" className="w-full h-full object-cover" />
              </div>
              {error && <p className="text-red-400 text-center text-sm mb-4">{error}</p>}
              <p className="text-center text-white/70 text-sm">
                هل تريد إزالة الخلفية وتحسين الصورة؟
              </p>
            </div>
          )}

          {/* Step 3: Edit */}
          {step === 'edit' && (
            <div className="w-full max-w-md space-y-4">
              {/* معاينة الصورة */}
              <div 
                className="aspect-square rounded-2xl overflow-hidden relative mx-auto"
                style={{ 
                  backgroundColor: BACKGROUNDS.find(b => b.id === selectedBackground)?.color || '#fff',
                  backgroundImage: selectedBackground === 'transparent' ? 
                    'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none',
                  backgroundSize: '20px 20px',
                  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                }}
              >
                <img 
                  src={finalImage || processedImage} 
                  alt="Edited" 
                  className="w-full h-full object-contain p-4"
                  style={{ filter: frameStyle }}
                />
              </div>

              {/* اختيار الخلفية */}
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-white text-sm font-bold mb-2 flex items-center gap-2">
                  <Palette size={16} />
                  لون الخلفية
                </p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {BACKGROUNDS.map(bg => (
                    <button
                      key={bg.id}
                      onClick={() => setSelectedBackground(bg.id)}
                      className={`flex-shrink-0 w-12 h-12 rounded-lg border-2 transition-all ${
                        selectedBackground === bg.id ? 'border-[#FF6B00] scale-110' : 'border-white/20'
                      }`}
                      style={{ 
                        backgroundColor: bg.color,
                        backgroundImage: bg.id === 'transparent' ? 
                          'linear-gradient(45deg, #666 25%, #999 25%, #999 50%, #666 50%, #666 75%, #999 75%)' : 'none',
                        backgroundSize: '8px 8px'
                      }}
                      title={bg.name}
                    />
                  ))}
                </div>
              </div>

              {/* إطارات 3D */}
              <div className="bg-white/10 rounded-xl p-3">
                <p className="text-white text-sm font-bold mb-2 flex items-center gap-2">
                  <Box size={16} />
                  تأثير 3D
                </p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {FRAMES_3D.map(frame => (
                    <button
                      key={frame.id}
                      onClick={() => setSelectedFrame(frame.id)}
                      className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                        selectedFrame === frame.id 
                          ? 'bg-[#FF6B00] text-white' 
                          : 'bg-white/20 text-white/80'
                      }`}
                    >
                      {frame.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* تعديلات الألوان */}
              <div className="bg-white/10 rounded-xl p-3 space-y-3">
                <p className="text-white text-sm font-bold flex items-center gap-2">
                  <Sun size={16} />
                  تعديلات الصورة
                </p>
                
                {/* السطوع */}
                <div className="flex items-center gap-3">
                  <Sun size={14} className="text-white/60" />
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-white/60 text-xs w-8">{brightness}%</span>
                </div>
                
                {/* التباين */}
                <div className="flex items-center gap-3">
                  <Contrast size={14} className="text-white/60" />
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-white/60 text-xs w-8">{contrast}%</span>
                </div>
                
                {/* التشبع */}
                <div className="flex items-center gap-3">
                  <Palette size={14} className="text-white/60" />
                  <input
                    type="range"
                    min="50"
                    max="150"
                    value={saturation}
                    onChange={(e) => setSaturation(Number(e.target.value))}
                    className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
                  />
                  <span className="text-white/60 text-xs w-8">{saturation}%</span>
                </div>

                {/* زر إعادة الضبط */}
                <button
                  onClick={resetEdits}
                  className="w-full py-2 text-white/60 text-sm hover:text-white transition-colors"
                >
                  ↺ إعادة ضبط التعديلات
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="p-4 pb-8 bg-black/80 border-t border-white/10">
        
        {/* Capture Controls */}
        {step === 'capture' && mode === 'camera' && !error && (
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={switchCamera}
              className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white"
            >
              <RotateCcw size={22} />
            </button>
            <button
              onClick={captureFromCamera}
              disabled={!stream}
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center disabled:opacity-50"
            >
              <div className="w-16 h-16 bg-[#FF6B00] rounded-full flex items-center justify-center">
                <Camera size={28} className="text-white" />
              </div>
            </button>
            <div className="w-12" />
          </div>
        )}

        {/* Preview Controls */}
        {step === 'preview' && (
          <div className="space-y-3 max-w-md mx-auto">
            <button
              onClick={processImage}
              disabled={processing}
              className="w-full py-4 bg-[#FF6B00] text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {processing ? (
                <>
                  <Loader2 size={22} className="animate-spin" />
                  جاري إزالة الخلفية...
                </>
              ) : (
                <>
                  <Sparkles size={22} />
                  إزالة الخلفية وتعديل ✨
                </>
              )}
            </button>
            
            <div className="flex gap-3">
              <button
                onClick={useOriginal}
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
                إعادة التصوير
              </button>
            </div>
          </div>
        )}

        {/* Edit Controls */}
        {step === 'edit' && (
          <div className="space-y-3 max-w-md mx-auto">
            <button
              onClick={useFinal}
              className="w-full py-4 bg-green-500 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2"
            >
              <Check size={22} />
              حفظ واستخدام الصورة
            </button>
            
            <div className="flex gap-3">
              <button
                onClick={useOriginal}
                className="flex-1 py-3 bg-white/20 text-white rounded-xl font-bold"
              >
                استخدم الأصلية
              </button>
              <button
                onClick={retake}
                className="flex-1 py-3 bg-white/20 text-white rounded-xl font-bold"
              >
                إعادة التصوير
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleImageCapture;
