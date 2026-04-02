// /app/frontend/src/components/seller/SimpleImageCapture.js
// مكون لالتقاط ومعالجة صور المنتجات
// يدعم: سحب مباشر، تصغير/تكبير، تدوير، تعديلات الصورة، ظل جانبي

import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { 
  X, Camera, RotateCcw, Check, Loader2, ZoomIn, ZoomOut, RotateCw,
  Sun, Droplets, Contrast, Sliders, Eclipse
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// حدود التكبير والتصغير
const MIN_SCALE = 0.5;
const MAX_SCALE = 1.3;

// خيارات الظل
const SHADOWS = [
  { id: 'none', name: 'بدون' },
  { id: 'soft', name: 'ناعم' },
  { id: 'strong', name: 'قوي' },
];

const SimpleImageCapture = ({ isOpen, onClose, onImageReady, mode = 'camera' }) => {
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const imageContainerRef = useRef(null);
  
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('capture');
  const [facingMode, setFacingMode] = useState('environment');
  
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [showAdjustments, setShowAdjustments] = useState(false);
  
  const [selectedShadow, setSelectedShadow] = useState('none');
  const [showShadows, setShowShadows] = useState(false);
  const [shadowOffset, setShadowOffset] = useState(50);
  const [shadowOffsetX, setShadowOffsetX] = useState(50);
  const [showRotation, setShowRotation] = useState(false);
  const [showTip, setShowTip] = useState(true);
  const [galleryOpened, setGalleryOpened] = useState(false);
  const [editorBgDark, setEditorBgDark] = useState(false);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // مرجع لتتبع حالة الـ history
  const historyPushedRef = useRef(false);
  const isClosingRef = useRef(false);

  // دالة إيقاف الكاميرا
  const stopCameraStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // دالة الإغلاق الموحدة
  const doClose = useCallback((fromBackButton = false) => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    
    stopCameraStream();
    setCapturedImage(null);
    setProcessedImage(null);
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setSelectedShadow('none');
    setShadowOffset(50);
    setShowAdjustments(false);
    setShowShadows(false);
    setShowRotation(false);
    setStep('capture');
    setError(null);
    
    // إغلاق الـ modal أولاً
    onClose();
    
    // إذا كان الإغلاق من زر X (وليس من زر الرجوع)، نحتاج للعودة في التاريخ
    if (!fromBackButton && historyPushedRef.current) {
      historyPushedRef.current = false;
      // استخدام setTimeout لضمان إغلاق الـ modal قبل العودة في التاريخ
      setTimeout(() => {
        window.history.back();
      }, 50);
    } else {
      historyPushedRef.current = false;
    }
    
    setTimeout(() => {
      isClosingRef.current = false;
    }, 300);
  }, [onClose, stream]);

  // إدارة history وزر الرجوع
  useEffect(() => {
    if (!isOpen) {
      historyPushedRef.current = false;
      isClosingRef.current = false;
      return;
    }
    
    // إضافة entry في التاريخ عند فتح الـ modal
    if (!historyPushedRef.current) {
      window.history.pushState({ modal: 'imageCapture' }, '');
      historyPushedRef.current = true;
    }
    
    const handlePopState = () => {
      // هذا يُستدعى عند الضغط على زر الرجوع
      doClose(true);
    };
    
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isOpen, doClose]);

  // إخفاء النصيحة تلقائياً بعد 5 ثواني
  useEffect(() => {
    if (isOpen && showTip) {
      const timer = setTimeout(() => setShowTip(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, showTip]);

  // إعادة إظهار النصيحة عند فتح المحرر
  useEffect(() => {
    if (isOpen) {
      setShowTip(true);
    }
  }, [isOpen]);

  // تشغيل الكاميرا فقط في وضع الكاميرا
  useEffect(() => {
    // لا تشغل الكاميرا أبداً في وضع المعرض
    if (mode === 'gallery') return;
    
    if (isOpen && mode === 'camera' && step === 'capture') {
      startCamera();
    }
    
    return () => {
      // إيقاف الكاميرا عند الخروج
      stopCameraStream();
    };
  }, [isOpen, mode, step, facingMode]);

  // إعادة تعيين الحالة عند فتح المحرر
  useEffect(() => {
    if (isOpen) {
      setStep('capture');
      setError(null);
      setCapturedImage(null);
      setProcessedImage(null);
    }
  }, [isOpen]);

  // فتح المعرض تلقائياً في وضع المعرض وإغلاق النافذة
  useEffect(() => {
    if (isOpen && mode === 'gallery') {
      // فتح المعرض مباشرة
      const timer = setTimeout(() => {
        setGalleryOpened(true);
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }
      }, 50);
      return () => clearTimeout(timer);
    } else {
      setGalleryOpened(false);
    }
  }, [isOpen, mode]);

  // إغلاق النافذة إذا لم يختر المستخدم صورة من المعرض
  useEffect(() => {
    if (mode === 'gallery' && galleryOpened) {
      const handleFocus = () => {
        // عندما يعود التركيز للصفحة بعد إغلاق المعرض
        // ننتظر أطول للتأكد من أن الصورة لم تُحمّل بعد
        setTimeout(() => {
          // نتحقق من عدم وجود صورة ملتقطة أو معالجة وأن الخطوة ما زالت capture
          if (fileInputRef.current && !fileInputRef.current.files?.length && step === 'capture' && !capturedImage && !processing) {
            handleClose();
          }
        }, 500);
      };
      
      window.addEventListener('focus', handleFocus);
      return () => window.removeEventListener('focus', handleFocus);
    }
  }, [mode, galleryOpened, step, capturedImage, processing]);

  const startCamera = async () => {
    try {
      setError(null);
      
      // التحقق من دعم الكاميرا
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('المتصفح لا يدعم الكاميرا');
        return;
      }
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 1280 } }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
        setStream(mediaStream);
      }
    } catch (err) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setError('يرجى السماح بالوصول للكاميرا');
      } else if (err.name === 'NotFoundError') {
        setError('لا توجد كاميرا متاحة');
      } else {
        setError('لا يمكن الوصول للكاميرا');
      }
    }
  };

  const switchCamera = () => {
    stopCameraStream();
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

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
    stopCameraStream();
    await processImage(imageData);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) { 
      // المستخدم ألغى اختيار الصورة
      handleClose();
      return; 
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageData = event.target.result;
      setCapturedImage(imageData);
      await processImage(imageData);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (imageData) => {
    setProcessing(true);
    setStep('edit');
    setError(null);
    
    try {
      const response = await fetch(imageData);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('file', blob, 'image.png');
      formData.append('background', 'transparent');
      formData.append('shadow_type', 'none');
      
      const result = await axios.post(`${API}/api/image/process-photoroom`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 90000
      });
      
      if (result.data.success && result.data.image) {
        setProcessedImage(result.data.image);
      } else {
        setProcessedImage(imageData);
      }
      
      // القيم الافتراضية للصورة (100%)
      setScale(1.3); // أقصى تكبير
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      setSelectedShadow('none');
      
    } catch (err) {
      console.error('Error:', err);
      setProcessedImage(imageData);
      // القيم الافتراضية للصورة (100%)
      setScale(1.3);
      setPosition({ x: 0, y: 0 });
      setRotation(0);
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      setSelectedShadow('none');
    } finally {
      setProcessing(false);
    }
  };

  const getImageFilter = () => {
    return `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
  };

  const handleDragStart = useCallback((clientX, clientY) => {
    setIsDragging(true);
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  }, [position]);

  const handleDragMove = useCallback((clientX, clientY) => {
    if (!isDragging) return;
    setPosition({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  const onMouseDown = (e) => {
    e.preventDefault();
    handleDragStart(e.clientX, e.clientY);
  };

  const onMouseMove = (e) => {
    handleDragMove(e.clientX, e.clientY);
  };

  const onMouseUp = () => {
    handleDragEnd();
  };

  const onTouchStart = (e) => {
    const touch = e.touches[0];
    handleDragStart(touch.clientX, touch.clientY);
  };

  const onTouchMove = (e) => {
    const touch = e.touches[0];
    handleDragMove(touch.clientX, touch.clientY);
  };

  const onTouchEnd = () => {
    handleDragEnd();
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDragging, dragStart]);

  const saveImage = async () => {
    if (!canvasRef.current || !processedImage) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const size = 1000;
    canvas.width = size;
    canvas.height = size;
    
    const drawProduct = () => {
      const productImg = new window.Image();
      productImg.crossOrigin = 'anonymous';
      productImg.onload = () => {
        const containerWidth = imageContainerRef.current?.offsetWidth || 400;
        const containerHeight = imageContainerRef.current?.offsetHeight || 400;
        const scaleX = size / containerWidth;
        const scaleY = size / containerHeight;
        
        const imgRatio = productImg.width / productImg.height;
        let drawWidth, drawHeight;
        
        if (imgRatio > 1) {
          drawWidth = size * 0.65;
          drawHeight = drawWidth / imgRatio;
        } else {
          drawHeight = size * 0.65;
          drawWidth = drawHeight * imgRatio;
        }
        
        const centerX = size/2 + position.x * scaleX;
        const centerY = size/2 + position.y * scaleY;
        
        const scaledWidth = drawWidth * scale;
        const scaledHeight = drawHeight * scale;
        
        // رسم الظل أولاً - مع تحكم أفقي وعمودي (زاوية الإضاءة ثابتة)
        if (selectedShadow !== 'none') {
          ctx.save();
          const shadowY = (shadowOffset - 50) / 100 * scaledHeight;
          const shadowX = (shadowOffsetX - 50) / 100 * scaledWidth;
          ctx.translate(centerX + shadowX, centerY + shadowY);
          ctx.rotate(rotation * Math.PI / 180);
          // زاوية ثابتة للإضاءة
          ctx.transform(1, 0, -0.25, 0.35, 0, 0);
          ctx.globalAlpha = selectedShadow === 'strong' ? 0.3 : 0.18;
          ctx.filter = `blur(${selectedShadow === 'strong' ? 6 : 4}px)`;
          ctx.drawImage(productImg, -scaledWidth/2, 0, scaledWidth, scaledHeight);
          ctx.restore();
        }
        
        // رسم المنتج
        ctx.save();
        ctx.translate(centerX, centerY - scaledHeight * 0.05);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
        ctx.globalAlpha = 1;
        ctx.drawImage(productImg, -scaledWidth/2, -scaledHeight/2, scaledWidth, scaledHeight);
        ctx.restore();
        
        const finalImage = canvas.toDataURL('image/jpeg', 0.95);
        onImageReady(finalImage);
        handleClose();
      };
      productImg.src = processedImage;
    };
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);
    drawProduct();
  };

  const useOriginal = () => {
    onImageReady(capturedImage);
    handleClose();
  };

  const resetAdjustments = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
  };

  // للاستخدام مع زر X أو عند إغلاق المعرض بدون اختيار صورة
  const handleClose = () => {
    doClose(false);
  };

  if (!isOpen) return null;

  // في وضع المعرض: لا نعرض أي شيء حتى يختار المستخدم صورة
  // فقط نعرض input المخفي الذي يفتح المعرض
  if (mode === 'gallery' && step === 'capture') {
    return (
      <input 
        ref={fileInputRef} 
        type="file" 
        accept="image/*" 
        onChange={handleFileSelect} 
        className="hidden" 
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black" data-testid="image-capture-modal">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-black/80">
        <button onClick={handleClose} className="p-2 text-white" data-testid="close-button">
          <X size={24} />
        </button>
        <h2 className="text-white font-bold">
          {step === 'capture' ? 'التقاط صورة' : 'تحرير الصورة'}
        </h2>
        <div className="w-10" />
      </div>

      {/* Main Content */}
      <div 
        ref={imageContainerRef}
        className="flex-1 relative overflow-hidden"
        style={{ touchAction: 'none', backgroundColor: step === 'edit' ? (editorBgDark ? '#4A4A4A' : '#FFFFFF') : '#000' }}
      >
        {/* Camera View */}
        {step === 'capture' && mode === 'camera' && (
          <div className="w-full h-full bg-black">
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
                {/* نصيحة الخلفية البيضاء */}
                {showTip && (
                  <div className="absolute top-4 left-4 right-4 bg-black/60 backdrop-blur-sm rounded-xl p-3 flex items-center gap-2 animate-fade-in">
                    <p className="text-white text-xs flex-1 text-center">
                      📸 خلفية فاتحة للداكن، وداكنة للفاتح
                    </p>
                    <button 
                      onClick={() => setShowTip(false)}
                      className="text-white/70 hover:text-white"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Gallery Mode - لا نعرض أي شاشة، المعرض يفتح مباشرة */}

        {/* Processed Image with Reflection Shadow */}
        {step === 'edit' && processedImage && (
          <div className="w-full h-full flex items-center justify-center relative">
            {/* خطوط التوجيه */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-blue-400/30" />
              <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-blue-400/30" />
              <div className="w-3 h-3 rounded-full border-2 border-blue-400/50 bg-transparent" />
            </div>
            
            {/* حاوية المنتج مع الظل */}
            <div 
              className="relative"
              style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out'
              }}
            >
              {/* الظل الأرضي - زاوية إضاءة ثابتة مع تحكم بالموقع */}
              {selectedShadow !== 'none' && (
                <img 
                  src={processedImage} 
                  alt=""
                  className="absolute pointer-events-none max-w-[85vw] max-h-[45vh] object-contain"
                  style={{ 
                    top: `${shadowOffset - 50}%`,
                    left: `${shadowOffsetX}%`,
                    filter: `brightness(0) blur(${selectedShadow === 'strong' ? '6px' : '4px'})`,
                    transform: `translateX(-50%) scale(${scale}) rotate(${rotation}deg) scaleY(0.35) skewX(-15deg)`,
                    transformOrigin: 'center top',
                    opacity: selectedShadow === 'strong' ? 0.3 : 0.18,
                    zIndex: 0,
                  }}
                  draggable={false}
                />
              )}
              
              {/* المنتج - فوق الظل */}
              <div
                style={{
                  transform: `scale(${scale}) rotate(${rotation}deg)`,
                  cursor: isDragging ? 'grabbing' : 'grab',
                  position: 'relative',
                  zIndex: 1,
                }}
                onMouseDown={onMouseDown}
                onTouchStart={onTouchStart}
              >
                <img 
                  src={processedImage} 
                  alt="Product" 
                  data-testid="product-image"
                  className="max-w-[85vw] max-h-[45vh] object-contain select-none"
                  style={{ filter: getImageFilter() }}
                  draggable={false}
                />
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {processing && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
            <Loader2 size={48} className="animate-spin text-[#FF6B00] mb-4" />
            <p className="text-white">جاري إزالة الخلفية...</p>
          </div>
        )}
        
        {/* Drag hint */}
        {step === 'edit' && processedImage && !processing && !showAdjustments && !showShadows && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full">
            <p className="text-white/70 text-xs">اسحب المنتج لتحريكه</p>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="bg-black p-3 space-y-3">
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
              data-testid="capture-button"
            >
              <div className="w-12 h-12 bg-[#FF6B00] rounded-full" />
            </button>
            <div className="w-12" />
          </div>
        )}

        {/* Edit Controls */}
        {step === 'edit' && !processing && (
          <>
            {/* Adjustments Panel */}
            {showAdjustments && (
              <div className="bg-white/10 rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm font-bold">تعديلات الصورة</span>
                  <button onClick={resetAdjustments} className="text-xs text-orange-400">إعادة ضبط</button>
                </div>
                <div className="flex items-center gap-3">
                  <Sun size={16} className="text-yellow-400" />
                  <span className="text-white text-xs w-12">إضاءة</span>
                  <input type="range" min="50" max="150" value={brightness}
                    onChange={(e) => setBrightness(Number(e.target.value))}
                    className="flex-1 h-2 bg-white/20 rounded-full appearance-none cursor-pointer accent-orange-500" />
                  <span className="text-white text-xs w-10 text-left">{brightness}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <Contrast size={16} className="text-blue-400" />
                  <span className="text-white text-xs w-12">تباين</span>
                  <input type="range" min="50" max="150" value={contrast}
                    onChange={(e) => setContrast(Number(e.target.value))}
                    className="flex-1 h-2 bg-white/20 rounded-full appearance-none cursor-pointer accent-orange-500" />
                  <span className="text-white text-xs w-10 text-left">{contrast}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <Droplets size={16} className="text-pink-400" />
                  <span className="text-white text-xs w-12">تشبع</span>
                  <input type="range" min="0" max="200" value={saturation}
                    onChange={(e) => setSaturation(Number(e.target.value))}
                    className="flex-1 h-2 bg-white/20 rounded-full appearance-none cursor-pointer accent-orange-500" />
                  <span className="text-white text-xs w-10 text-left">{saturation}%</span>
                </div>
              </div>
            )}

            {/* Shadows Panel - مدمج */}
            {showShadows && (
              <div className="bg-white/10 rounded-xl p-2 space-y-2">
                <div className="flex gap-2 justify-center">
                  {SHADOWS.map(shadow => (
                    <button
                      key={shadow.id}
                      onClick={() => setSelectedShadow(shadow.id)}
                      className={`px-3 py-1.5 rounded-lg border transition-all text-xs ${
                        selectedShadow === shadow.id 
                          ? 'border-[#FF6B00] bg-[#FF6B00]/30' 
                          : 'border-white/30 bg-white/10'
                      }`}
                    >
                      <span className="text-white font-medium">{shadow.name}</span>
                    </button>
                  ))}
                </div>
                
                {/* التحكم بموقع الظل - مدمج في صف واحد */}
                {selectedShadow !== 'none' && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-white/60 text-[10px]">↔️</span>
                    <input 
                      type="range" 
                      min="0" max="100" 
                      value={shadowOffsetX}
                      onChange={(e) => setShadowOffsetX(Number(e.target.value))}
                      className="flex-1 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-orange-500"
                    />
                    <span className="text-white/60 text-[10px]">↕️</span>
                    <input 
                      type="range" 
                      min="0" max="150" 
                      value={shadowOffset}
                      onChange={(e) => setShadowOffset(Number(e.target.value))}
                      className="flex-1 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-orange-500"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Transform Controls */}
            <div className="flex justify-center gap-1.5">
              <button 
                onClick={() => setScale(s => Math.max(MIN_SCALE, s - 0.1))}
                className={`px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 ${
                  scale <= MIN_SCALE ? 'bg-white/10 opacity-50' : 'bg-white/20 active:bg-white/30'
                }`}
                disabled={scale <= MIN_SCALE}
                data-testid="zoom-out-button"
              >
                <ZoomOut size={14} className="text-white" />
                <span className="text-white text-[10px]">تصغير</span>
              </button>
              <button 
                onClick={() => setScale(s => Math.min(MAX_SCALE, s + 0.1))}
                className={`px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 ${
                  scale >= MAX_SCALE ? 'bg-white/10 opacity-50' : 'bg-white/20 active:bg-white/30'
                }`}
                disabled={scale >= MAX_SCALE}
                data-testid="zoom-in-button"
              >
                <ZoomIn size={14} className="text-white" />
                <span className="text-white text-[10px]">تكبير</span>
              </button>
              <button 
                onClick={() => { setShowRotation(!showRotation); setShowAdjustments(false); setShowShadows(false); }}
                className={`px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                  showRotation ? 'bg-[#FF6B00]' : 'bg-white/20 active:bg-white/30'
                }`}
                data-testid="rotate-button"
              >
                <RotateCw size={14} className="text-white" />
                <span className="text-white text-[10px]">تدوير</span>
              </button>
              <button 
                onClick={() => { setShowAdjustments(!showAdjustments); setShowShadows(false); setShowRotation(false); }}
                className={`px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                  showAdjustments ? 'bg-[#FF6B00]' : 'bg-white/20 active:bg-white/30'
                }`}
                data-testid="adjustments-button"
              >
                <Sliders size={14} className="text-white" />
                <span className="text-white text-[10px]">ألوان</span>
              </button>
              <button 
                onClick={() => { setShowShadows(!showShadows); setShowAdjustments(false); setShowRotation(false); }}
                className={`px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                  showShadows ? 'bg-[#FF6B00]' : 'bg-white/20 active:bg-white/30'
                }`}
                data-testid="shadows-button"
              >
                <Eclipse size={14} className="text-white" />
                <span className="text-white text-[10px]">ظل</span>
              </button>
              <button 
                onClick={() => setEditorBgDark(!editorBgDark)}
                className={`px-2 py-1.5 rounded-lg flex items-center justify-center gap-1 transition-all ${
                  editorBgDark ? 'bg-[#FF6B00]' : 'bg-white/20 active:bg-white/30'
                }`}
                data-testid="bg-toggle-button"
              >
                <span className="text-white text-[10px]">{editorBgDark ? '⚪ أبيض' : '⚫ داكن'}</span>
              </button>
            </div>
            
            {/* Rotation Panel */}
            {showRotation && (
              <div className="bg-white/10 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm font-bold">تدوير المنتج</span>
                  <span className="text-white/70 text-xs">{rotation}°</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-white/70 text-xs">0°</span>
                  <input 
                    type="range" 
                    min="0" 
                    max="360" 
                    value={rotation}
                    onChange={(e) => setRotation(Number(e.target.value))}
                    className="flex-1 h-2 bg-white/20 rounded-full appearance-none cursor-pointer accent-orange-500"
                  />
                  <span className="text-white/70 text-xs">360°</span>
                </div>
                <div className="flex justify-center gap-2 pt-1">
                  <button 
                    onClick={() => setRotation(0)}
                    className="px-3 py-1 text-[10px] bg-white/20 text-white rounded-lg"
                  >
                    0°
                  </button>
                  <button 
                    onClick={() => setRotation(90)}
                    className="px-3 py-1 text-[10px] bg-white/20 text-white rounded-lg"
                  >
                    90°
                  </button>
                  <button 
                    onClick={() => setRotation(180)}
                    className="px-3 py-1 text-[10px] bg-white/20 text-white rounded-lg"
                  >
                    180°
                  </button>
                  <button 
                    onClick={() => setRotation(270)}
                    className="px-3 py-1 text-[10px] bg-white/20 text-white rounded-lg"
                  >
                    270°
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button 
                onClick={useOriginal}
                className="flex-1 py-3 bg-[#FF6B00] text-white rounded-xl text-sm font-bold active:bg-[#E65000]"
                data-testid="use-original-button"
              >
                رفع مباشر
              </button>
              <button
                onClick={saveImage}
                className="flex-[2] py-3 bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 active:bg-green-600"
                data-testid="save-image-button"
              >
                <Check size={18} /> استخدام مع التعديلات
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SimpleImageCapture;
