// /app/frontend/src/components/seller/SimpleImageCapture.js
// مكون متكامل لالتقاط ومعالجة صور المنتجات مع قوالب 3D

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  X, Camera, RotateCcw, Check, Loader2,
  Sparkles, RefreshCw, Box, Image as ImageIcon
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const SimpleImageCapture = ({ isOpen, onClose, onImageReady, mode = 'camera', token }) => {
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [processedImage, setProcessedImage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState('capture'); // capture, preview, templates
  const [facingMode, setFacingMode] = useState('environment');
  
  // القوالب
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [applyingTemplate, setApplyingTemplate] = useState(false);

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
  const processImage = async (bgColor = 'white') => {
    if (!capturedImage) return;
    setProcessing(true);
    setError(null);
    
    try {
      const response = await fetch(capturedImage);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('file', blob, 'image.jpg');
      formData.append('background', bgColor);
      formData.append('add_shadow', 'true');
      formData.append('auto_color_correct', 'false'); // لا نغير الألوان
      formData.append('sharpen', 'false'); // لا نزيد الحدة
      
      const result = await axios.post(`${API}/api/image/process-pro`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 90000
      });
      
      if (result.data.success && result.data.image) {
        setProcessedImage(result.data.image);
        setStep('templates');
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

  // تطبيق قالب 3D
  const applyTemplate = async (templateId) => {
    if (!processedImage) return;
    setApplyingTemplate(true);
    setSelectedTemplate(templateId);
    
    try {
      const response = await fetch(processedImage);
      const blob = await response.blob();
      
      const formData = new FormData();
      formData.append('file', blob, 'image.png');
      formData.append('template_id', templateId);
      
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

  // استخدام الصورة
  const useImage = (img) => {
    onImageReady(img);
    handleClose();
  };

  // إعادة التصوير
  const retake = () => {
    setCapturedImage(null);
    setProcessedImage(null);
    setSelectedTemplate(null);
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
    setStep('capture');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

      {/* Header */}
      <div className="flex items-center justify-between p-3 bg-gradient-to-b from-black/80 to-transparent">
        <button onClick={handleClose} className="p-2 text-white">
          <X size={24} />
        </button>
        <h2 className="text-white font-bold text-lg">
          {step === 'capture' && '📷 التقاط صورة'}
          {step === 'preview' && '✨ إزالة الخلفية'}
          {step === 'templates' && '🎨 اختر قالب'}
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
          </div>
        )}

        {/* Step 3: Templates */}
        {step === 'templates' && (
          <div className="w-full max-w-md space-y-4">
            {/* الصورة المعالجة */}
            <div className="aspect-square bg-white rounded-2xl overflow-hidden shadow-2xl mx-auto max-w-xs relative">
              <img src={processedImage} alt="Processed" className="w-full h-full object-contain" />
              {applyingTemplate && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 size={32} className="animate-spin text-white" />
                </div>
              )}
            </div>

            {/* القوالب */}
            <div className="bg-white/10 rounded-xl p-3">
              <p className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                <Box size={16} />
                قوالب 3D جاهزة
              </p>
              <div className="grid grid-cols-4 gap-2">
                {/* بدون قالب */}
                <button
                  onClick={() => {
                    setSelectedTemplate(null);
                    // إعادة المعالجة بدون قالب
                    processImage('white');
                  }}
                  className={`aspect-square rounded-lg border-2 flex items-center justify-center text-xs ${
                    !selectedTemplate ? 'border-[#FF6B00] bg-[#FF6B00]/20' : 'border-white/20 bg-white/5'
                  }`}
                >
                  <span className="text-white/80">بدون</span>
                </button>
                
                {templates.slice(0, 11).map(template => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template.id)}
                    disabled={applyingTemplate}
                    className={`aspect-square rounded-lg border-2 overflow-hidden ${
                      selectedTemplate === template.id 
                        ? 'border-[#FF6B00] ring-2 ring-[#FF6B00]/50' 
                        : 'border-white/20'
                    }`}
                  >
                    <img 
                      src={template.preview_url} 
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
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
              onClick={() => processImage('white')}
              disabled={processing}
              className="w-full py-4 bg-[#FF6B00] text-white rounded-xl font-bold flex items-center justify-center gap-2"
            >
              {processing ? (
                <><Loader2 size={20} className="animate-spin" /> جاري إزالة الخلفية...</>
              ) : (
                <><Sparkles size={20} /> إزالة الخلفية ✨</>
              )}
            </button>
            <div className="flex gap-3">
              <button onClick={() => useImage(capturedImage)} disabled={processing} className="flex-1 py-3 bg-white/20 text-white rounded-xl font-bold">
                استخدم الأصلية
              </button>
              <button onClick={retake} disabled={processing} className="flex-1 py-3 bg-white/20 text-white rounded-xl font-bold">
                إعادة
              </button>
            </div>
          </div>
        )}

        {/* Templates */}
        {step === 'templates' && (
          <div className="space-y-3 max-w-sm mx-auto">
            <button
              onClick={() => useImage(processedImage)}
              disabled={applyingTemplate}
              className="w-full py-4 bg-green-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <Check size={20} /> استخدام الصورة
            </button>
            <div className="flex gap-3">
              <button onClick={() => useImage(capturedImage)} className="flex-1 py-3 bg-white/20 text-white rounded-xl font-bold">
                الأصلية
              </button>
              <button onClick={retake} className="flex-1 py-3 bg-white/20 text-white rounded-xl font-bold">
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
