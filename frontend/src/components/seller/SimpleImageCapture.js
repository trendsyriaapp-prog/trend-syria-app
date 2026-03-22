// /app/frontend/src/components/seller/SimpleImageCapture.js
// مكون بسيط ومتوافق مع الهاتف لالتقاط ومعالجة صور المنتجات

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  X, Camera, RotateCcw, Check, Loader2,
  Image as ImageIcon, Sparkles, RefreshCw
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const SimpleImageCapture = ({ isOpen, onClose, onImageReady, mode = 'camera' }) => {
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('capture'); // capture, preview, processed
  const [facingMode, setFacingMode] = useState('environment');

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
      fileInputRef.current?.click();
    }
  }, [isOpen, mode]);

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
      // تحويل dataUrl إلى blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('file', blob, 'image.jpg');
      formData.append('background', 'white');
      formData.append('add_shadow', 'true');
      formData.append('auto_color_correct', 'true');
      
      const result = await axios.post(`${API}/api/image/process-pro`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
      });
      
      if (result.data.success && result.data.image) {
        setProcessedImage(result.data.image);
        setStep('processed');
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

  // استخدام الصورة الأصلية بدون معالجة
  const useOriginal = () => {
    onImageReady(capturedImage);
    handleClose();
  };

  // استخدام الصورة المعالجة
  const useProcessed = () => {
    onImageReady(processedImage);
    handleClose();
  };

  // إعادة التصوير
  const retake = () => {
    setCapturedImage(null);
    setProcessedImage(null);
    setStep('capture');
    if (mode === 'camera') {
      startCamera();
    } else {
      fileInputRef.current?.click();
    }
  };

  // إغلاق
  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setProcessedImage(null);
    setStep('capture');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col safe-area-inset">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50">
        <button onClick={handleClose} className="p-2 text-white">
          <X size={24} />
        </button>
        <h2 className="text-white font-bold text-lg">
          {step === 'capture' && 'التقاط صورة'}
          {step === 'preview' && 'معاينة الصورة'}
          {step === 'processed' && 'الصورة المعالجة'}
        </h2>
        <div className="w-10" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        
        {/* Step 1: Capture */}
        {step === 'capture' && mode === 'camera' && (
          <div className="w-full max-w-sm">
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
                {/* Video Preview */}
                <div className="aspect-square bg-gray-900 rounded-2xl overflow-hidden relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Center Guide */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-3/4 h-3/4 border-2 border-dashed border-white/40 rounded-2xl" />
                  </div>
                </div>
                
                {/* Tip */}
                <p className="text-center text-white/70 text-sm mt-3">
                  ضع المنتج داخل الإطار المنقط
                </p>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Preview (before processing) */}
        {step === 'preview' && (
          <div className="w-full max-w-sm">
            <div className="aspect-square bg-gray-900 rounded-2xl overflow-hidden mb-4">
              <img 
                src={capturedImage} 
                alt="Preview" 
                className="w-full h-full object-cover"
              />
            </div>
            
            {error && (
              <p className="text-red-400 text-center text-sm mb-4">{error}</p>
            )}
            
            <p className="text-center text-white/70 text-sm mb-4">
              هل تريد إزالة الخلفية وتحسين الصورة؟
            </p>
          </div>
        )}

        {/* Step 3: Processed */}
        {step === 'processed' && (
          <div className="w-full max-w-sm">
            {/* Comparison */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div>
                <p className="text-white/60 text-xs text-center mb-1">الأصلية</p>
                <div className="aspect-square bg-gray-900 rounded-xl overflow-hidden">
                  <img 
                    src={capturedImage} 
                    alt="Original" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div>
                <p className="text-white/60 text-xs text-center mb-1">المعالجة ✨</p>
                <div className="aspect-square bg-white rounded-xl overflow-hidden">
                  <img 
                    src={processedImage} 
                    alt="Processed" 
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            </div>
            
            <p className="text-center text-green-400 text-sm">
              ✅ تم إزالة الخلفية بنجاح!
            </p>
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="p-4 pb-8 bg-black/50">
        
        {/* Step 1: Capture Controls */}
        {step === 'capture' && mode === 'camera' && !error && (
          <div className="flex items-center justify-center gap-6">
            {/* Switch Camera */}
            <button
              onClick={switchCamera}
              className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white"
            >
              <RotateCcw size={22} />
            </button>
            
            {/* Capture Button */}
            <button
              onClick={captureFromCamera}
              disabled={!stream}
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center disabled:opacity-50"
            >
              <div className="w-16 h-16 bg-[#FF6B00] rounded-full flex items-center justify-center">
                <Camera size={28} className="text-white" />
              </div>
            </button>
            
            {/* Placeholder */}
            <div className="w-12" />
          </div>
        )}

        {/* Step 2: Preview Controls */}
        {step === 'preview' && (
          <div className="space-y-3">
            {/* Process Button */}
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
                  معالجة احترافية ✨
                </>
              )}
            </button>
            
            {/* Secondary Actions */}
            <div className="flex gap-3">
              <button
                onClick={useOriginal}
                disabled={processing}
                className="flex-1 py-3 bg-white/20 text-white rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <ImageIcon size={18} />
                استخدم الأصلية
              </button>
              <button
                onClick={retake}
                disabled={processing}
                className="flex-1 py-3 bg-white/20 text-white rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <RefreshCw size={18} />
                إعادة التصوير
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Processed Controls */}
        {step === 'processed' && (
          <div className="space-y-3">
            {/* Use Processed */}
            <button
              onClick={useProcessed}
              className="w-full py-4 bg-green-500 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2"
            >
              <Check size={22} />
              استخدام الصورة المعالجة
            </button>
            
            {/* Secondary Actions */}
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
