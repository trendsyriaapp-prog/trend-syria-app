// /app/frontend/src/components/seller/SimpleImageCapture.js
// مكون متكامل لالتقاط ومعالجة صور المنتجات
// يدعم: تصغير/تكبير، تحريك، خلفيات جاهزة، ظلال

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  X, Camera, RotateCcw, Check, Loader2,
  Sparkles, ZoomIn, ZoomOut, Move, RotateCw
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// ألوان الخلفية
const BACKGROUND_COLORS = [
  { id: 'white', name: 'أبيض', color: '#FFFFFF', type: 'color' },
  { id: 'light_gray', name: 'رمادي', color: '#F0F0F0', type: 'color' },
  { id: 'soft_blue', name: 'أزرق', color: '#E8F4FC', type: 'color' },
  { id: 'soft_pink', name: 'وردي', color: '#FFF0F5', type: 'color' },
  { id: 'soft_gold', name: 'ذهبي', color: '#FFF8E6', type: 'color' },
  { id: 'premium_dark', name: 'داكن', color: '#1a1a1a', type: 'color' },
];

// خلفيات جاهزة (Gradients)
const PRESET_BACKGROUNDS = [
  { id: 'gradient_blue', name: 'تدرج أزرق', gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', type: 'gradient' },
  { id: 'gradient_orange', name: 'تدرج برتقالي', gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', type: 'gradient' },
  { id: 'gradient_green', name: 'تدرج أخضر', gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', type: 'gradient' },
  { id: 'gradient_gold', name: 'تدرج ذهبي', gradient: 'linear-gradient(135deg, #f5af19 0%, #f12711 100%)', type: 'gradient' },
  { id: 'gradient_purple', name: 'تدرج بنفسجي', gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)', type: 'gradient' },
  { id: 'gradient_dark', name: 'تدرج داكن', gradient: 'linear-gradient(135deg, #434343 0%, #000000 100%)', type: 'gradient' },
];

// أنواع الظلال
const SHADOW_TYPES = [
  { id: 'none', name: 'بدون', shadow: 'none' },
  { id: 'soft', name: 'ناعم', shadow: '0 20px 40px rgba(0,0,0,0.15)' },
  { id: 'medium', name: 'متوسط', shadow: '0 25px 50px rgba(0,0,0,0.25)' },
  { id: 'hard', name: 'قوي', shadow: '0 30px 60px rgba(0,0,0,0.4)' },
];

const SimpleImageCapture = ({ isOpen, onClose, onImageReady, mode = 'camera' }) => {
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('capture');
  const [facingMode, setFacingMode] = useState('environment');
  
  // إعدادات الصورة
  const [selectedBackground, setSelectedBackground] = useState('white');
  const [selectedShadow, setSelectedShadow] = useState('soft');
  const [activeTab, setActiveTab] = useState('bg');
  
  // التحكم بالصورة (تصغير/تكبير/تحريك)
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);

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
  const captureFromCamera = async () => {
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
    const imageData = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(imageData);
    stopCamera();
    await processImageWithPhotoRoom(imageData);
  };

  // اختيار من المعرض
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) { onClose(); return; }
    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageData = event.target.result;
      setCapturedImage(imageData);
      await processImageWithPhotoRoom(imageData);
    };
    reader.readAsDataURL(file);
  };

  // إزالة الخلفية باستخدام PhotoRoom
  const processImageWithPhotoRoom = async (imageData) => {
    setProcessing(true);
    setStep('edit');
    setError(null);
    
    try {
      const response = await fetch(imageData);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('file', blob, 'image.png');
      formData.append('background', 'transparent'); // شفاف للتحكم محلياً
      formData.append('shadow_type', 'none'); // بدون ظل من API
      formData.append('use_sandbox', 'false');
      
      const result = await axios.post(`${API}/api/image/process-photoroom`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 90000
      });
      
      if (result.data.success && result.data.image) {
        setProcessedImage(result.data.image);
        // إعادة ضبط التحكم
        setScale(1);
        setPosition({ x: 0, y: 0 });
        setRotation(0);
      } else {
        throw new Error('فشل في معالجة الصورة');
      }
    } catch (err) {
      console.error('Error:', err);
      setError('فشل في إزالة الخلفية');
      setStep('capture');
    } finally {
      setProcessing(false);
    }
  };

  // الحصول على ستايل الخلفية
  const getBackgroundStyle = () => {
    // ألوان
    const color = BACKGROUND_COLORS.find(b => b.id === selectedBackground);
    if (color) return { backgroundColor: color.color };
    
    // تدرجات
    const gradient = PRESET_BACKGROUNDS.find(b => b.id === selectedBackground);
    if (gradient) return { background: gradient.gradient };
    
    return { backgroundColor: '#FFFFFF' };
  };

  // الحصول على ستايل الظل
  const getShadowStyle = () => {
    const shadow = SHADOW_TYPES.find(s => s.id === selectedShadow);
    return shadow ? shadow.shadow : 'none';
  };

  // حفظ الصورة النهائية
  const saveImage = () => {
    if (!canvasRef.current || !processedImage) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const size = 1000;
    canvas.width = size;
    canvas.height = size;
    
    // رسم الخلفية
    const bgStyle = getBackgroundStyle();
    if (bgStyle.background) {
      // تدرج
      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, '#667eea');
      gradient.addColorStop(1, '#764ba2');
      ctx.fillStyle = gradient;
    } else {
      ctx.fillStyle = bgStyle.backgroundColor || '#FFFFFF';
    }
    ctx.fillRect(0, 0, size, size);
    
    // رسم الصورة
    const img = new Image();
    img.onload = () => {
      ctx.save();
      ctx.translate(size/2 + position.x * 5, size/2 + position.y * 5);
      ctx.rotate(rotation * Math.PI / 180);
      ctx.scale(scale, scale);
      
      // الظل
      if (selectedShadow !== 'none') {
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = selectedShadow === 'hard' ? 40 : 20;
        ctx.shadowOffsetY = selectedShadow === 'hard' ? 30 : 15;
      }
      
      const imgSize = Math.min(img.width, img.height) * 0.8;
      ctx.drawImage(img, -imgSize/2, -imgSize/2, imgSize, imgSize);
      ctx.restore();
      
      const finalImage = canvas.toDataURL('image/jpeg', 0.95);
      onImageReady(finalImage);
      handleClose();
    };
    img.src = processedImage;
  };

  // استخدام الصورة الأصلية
  const useOriginal = () => {
    onImageReady(capturedImage);
    handleClose();
  };

  // إغلاق
  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setProcessedImage(null);
    setSelectedBackground('white');
    setSelectedShadow('soft');
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
    setStep('capture');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" data-testid="image-capture-modal">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-black/80">
        <button onClick={handleClose} className="p-2 text-white">
          <X size={24} />
        </button>
        <h2 className="text-white font-bold">
          {step === 'capture' ? 'التقاط صورة' : 'تحرير الصورة'}
        </h2>
        <div className="w-10" />
      </div>

      {/* Main Content */}
      <div className="flex-1 relative overflow-hidden" style={step === 'edit' ? getBackgroundStyle() : { backgroundColor: '#000' }}>
        
        {/* Camera View */}
        {step === 'capture' && mode === 'camera' && (
          <div className="w-full h-full">
            {error ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <Camera size={64} className="text-white/30 mb-4" />
                <p className="text-white text-lg mb-4">{error}</p>
                <button onClick={startCamera} className="px-6 py-3 bg-[#FF6B00] text-white rounded-xl">
                  إعادة المحاولة
                </button>
              </div>
            ) : (
              <>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-3/4 aspect-square border-2 border-dashed border-white/40 rounded-2xl" />
                </div>
              </>
            )}
          </div>
        )}

        {/* Processed Image with Controls */}
        {step === 'edit' && processedImage && (
          <div className="w-full h-full flex items-center justify-center">
            <img 
              src={processedImage} 
              alt="Product" 
              className="max-w-[80%] max-h-[70%] object-contain transition-all duration-200"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                filter: `drop-shadow(${getShadowStyle()})`
              }}
              draggable={false}
            />
          </div>
        )}

        {/* Loading */}
        {processing && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
            <Loader2 size={48} className="animate-spin text-[#FF6B00] mb-4" />
            <p className="text-white">جاري إزالة الخلفية...</p>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="bg-black p-3 space-y-2">
        
        {/* Camera Controls */}
        {step === 'capture' && mode === 'camera' && !error && (
          <div className="flex items-center justify-center gap-8 py-4">
            <button onClick={switchCamera} className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <RotateCcw size={20} className="text-white" />
            </button>
            <button
              onClick={captureFromCamera}
              disabled={!stream}
              className="w-16 h-16 bg-white rounded-full flex items-center justify-center"
            >
              <div className="w-12 h-12 bg-[#FF6B00] rounded-full" />
            </button>
            <div className="w-12" />
          </div>
        )}

        {/* Edit Controls */}
        {step === 'edit' && !processing && (
          <>
            {/* Transform Controls */}
            <div className="flex justify-center gap-2 mb-2">
              <button 
                onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center"
              >
                <ZoomOut size={18} className="text-white" />
              </button>
              <button 
                onClick={() => setScale(s => Math.min(2, s + 0.1))}
                className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center"
              >
                <ZoomIn size={18} className="text-white" />
              </button>
              <button 
                onClick={() => setRotation(r => r + 90)}
                className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center"
              >
                <RotateCw size={18} className="text-white" />
              </button>
              <button 
                onClick={() => { setScale(1); setPosition({x:0,y:0}); setRotation(0); }}
                className="px-3 h-10 bg-white/20 rounded-lg flex items-center justify-center"
              >
                <span className="text-white text-xs">إعادة ضبط</span>
              </button>
            </div>

            {/* Position Controls */}
            <div className="flex justify-center gap-1 mb-2">
              <button onClick={() => setPosition(p => ({...p, y: p.y - 10}))} className="w-8 h-8 bg-white/10 rounded text-white text-xs">↑</button>
              <button onClick={() => setPosition(p => ({...p, y: p.y + 10}))} className="w-8 h-8 bg-white/10 rounded text-white text-xs">↓</button>
              <button onClick={() => setPosition(p => ({...p, x: p.x - 10}))} className="w-8 h-8 bg-white/10 rounded text-white text-xs">←</button>
              <button onClick={() => setPosition(p => ({...p, x: p.x + 10}))} className="w-8 h-8 bg-white/10 rounded text-white text-xs">→</button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 justify-center">
              <button
                onClick={() => setActiveTab('bg')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold ${activeTab === 'bg' ? 'bg-[#FF6B00] text-white' : 'bg-white/20 text-white'}`}
              >
                خلفية
              </button>
              <button
                onClick={() => setActiveTab('gradient')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold ${activeTab === 'gradient' ? 'bg-[#FF6B00] text-white' : 'bg-white/20 text-white'}`}
              >
                تدرجات
              </button>
              <button
                onClick={() => setActiveTab('shadow')}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold ${activeTab === 'shadow' ? 'bg-[#FF6B00] text-white' : 'bg-white/20 text-white'}`}
              >
                ظلال
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex gap-2 overflow-x-auto py-2 justify-center">
              {/* Colors */}
              {activeTab === 'bg' && BACKGROUND_COLORS.map(bg => (
                <button
                  key={bg.id}
                  onClick={() => setSelectedBackground(bg.id)}
                  className={`w-10 h-10 flex-shrink-0 rounded-lg border-2 ${
                    selectedBackground === bg.id ? 'border-[#FF6B00] scale-110' : 'border-white/30'
                  }`}
                  style={{ backgroundColor: bg.color }}
                />
              ))}
              
              {/* Gradients */}
              {activeTab === 'gradient' && PRESET_BACKGROUNDS.map(bg => (
                <button
                  key={bg.id}
                  onClick={() => setSelectedBackground(bg.id)}
                  className={`w-10 h-10 flex-shrink-0 rounded-lg border-2 ${
                    selectedBackground === bg.id ? 'border-[#FF6B00] scale-110' : 'border-white/30'
                  }`}
                  style={{ background: bg.gradient }}
                />
              ))}
              
              {/* Shadows */}
              {activeTab === 'shadow' && SHADOW_TYPES.map(shadow => (
                <button
                  key={shadow.id}
                  onClick={() => setSelectedShadow(shadow.id)}
                  className={`px-4 h-10 flex-shrink-0 rounded-lg border-2 ${
                    selectedShadow === shadow.id ? 'border-[#FF6B00] bg-[#FF6B00]/30' : 'border-white/30 bg-white/10'
                  }`}
                >
                  <span className="text-white text-xs">{shadow.name}</span>
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button 
                onClick={useOriginal}
                className="flex-1 py-3 bg-white/20 text-white rounded-lg text-sm font-bold"
              >
                الأصلية
              </button>
              <button
                onClick={saveImage}
                className="flex-[2] py-3 bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <Check size={18} /> استخدام الصورة
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SimpleImageCapture;
