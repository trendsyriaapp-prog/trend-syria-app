// /app/frontend/src/components/seller/SimpleImageCapture.js
// مكون بسيط لالتقاط ومعالجة صور المنتجات
// يدعم: سحب مباشر، تصغير/تكبير، تدوير

import { useState, useRef, useEffect, useCallback } from 'react';
import axios from 'axios';
import { X, Camera, RotateCcw, Check, Loader2, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

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
  
  // التحكم بالصورة
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  
  // للسحب
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

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
    await processImage(imageData);
  };

  // اختيار من المعرض
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) { onClose(); return; }
    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageData = event.target.result;
      setCapturedImage(imageData);
      await processImage(imageData);
    };
    reader.readAsDataURL(file);
  };

  // إزالة الخلفية
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
        // إعادة ضبط - الصورة بحجمها الطبيعي
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

  // === التحكم بالسحب ===
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

  // Mouse events
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

  // Touch events
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

  // إضافة listeners للسحب على مستوى الصفحة
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

  // حفظ الصورة النهائية
  const saveImage = () => {
    if (!canvasRef.current || !processedImage) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const size = 1000;
    canvas.width = size;
    canvas.height = size;
    
    // خلفية بيضاء
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);
    
    const img = new Image();
    img.onload = () => {
      ctx.save();
      
      // حساب الموقع بناءً على نسبة الحاوية
      const containerWidth = imageContainerRef.current?.offsetWidth || 400;
      const containerHeight = imageContainerRef.current?.offsetHeight || 400;
      const scaleX = size / containerWidth;
      const scaleY = size / containerHeight;
      
      ctx.translate(size/2 + position.x * scaleX, size/2 + position.y * scaleY);
      ctx.rotate(rotation * Math.PI / 180);
      ctx.scale(scale, scale);
      
      // رسم الصورة بحجمها المناسب
      const imgRatio = img.width / img.height;
      let drawWidth, drawHeight;
      
      if (imgRatio > 1) {
        drawWidth = size * 0.7;
        drawHeight = drawWidth / imgRatio;
      } else {
        drawHeight = size * 0.7;
        drawWidth = drawHeight * imgRatio;
      }
      
      ctx.drawImage(img, -drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
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

  // إعادة ضبط
  const resetTransform = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  // إغلاق
  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setProcessedImage(null);
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
        className="flex-1 relative overflow-hidden bg-white"
        style={{ touchAction: 'none' }}
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
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-3/4 aspect-square border-2 border-dashed border-white/40 rounded-2xl" />
                </div>
              </>
            )}
          </div>
        )}

        {/* Processed Image - Draggable */}
        {step === 'edit' && processedImage && (
          <div className="w-full h-full flex items-center justify-center">
            <img 
              src={processedImage} 
              alt="Product" 
              data-testid="product-image"
              className="max-w-[90%] max-h-[90%] object-contain select-none"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
                cursor: isDragging ? 'grabbing' : 'grab',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out'
              }}
              draggable={false}
              onMouseDown={onMouseDown}
              onTouchStart={onTouchStart}
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
        
        {/* Drag hint */}
        {step === 'edit' && processedImage && !processing && (
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

        {/* Edit Controls - Simple */}
        {step === 'edit' && !processing && (
          <>
            {/* Transform Controls */}
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => setScale(s => Math.max(0.3, s - 0.1))}
                className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center active:bg-white/30"
                data-testid="zoom-out-button"
              >
                <ZoomOut size={22} className="text-white" />
              </button>
              <button 
                onClick={() => setScale(s => Math.min(3, s + 0.1))}
                className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center active:bg-white/30"
                data-testid="zoom-in-button"
              >
                <ZoomIn size={22} className="text-white" />
              </button>
              <button 
                onClick={() => setRotation(r => r + 90)}
                className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center active:bg-white/30"
                data-testid="rotate-button"
              >
                <RotateCw size={22} className="text-white" />
              </button>
              <button 
                onClick={resetTransform}
                className="px-4 h-12 bg-white/20 rounded-xl flex items-center justify-center active:bg-white/30"
                data-testid="reset-button"
              >
                <span className="text-white text-sm">إعادة ضبط</span>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button 
                onClick={useOriginal}
                className="flex-1 py-3.5 bg-white/20 text-white rounded-xl text-sm font-bold active:bg-white/30"
                data-testid="use-original-button"
              >
                الأصلية
              </button>
              <button
                onClick={saveImage}
                className="flex-[2] py-3.5 bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 active:bg-green-600"
                data-testid="save-image-button"
              >
                <Check size={20} /> استخدام الصورة
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SimpleImageCapture;
