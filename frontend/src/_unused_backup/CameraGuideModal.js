import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Camera, RotateCcw, Check, Lightbulb, 
  Grid3X3, Focus, Smartphone
} from 'lucide-react';

const CameraGuideModal = ({ isOpen, onClose, onCapture }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [showGrid, setShowGrid] = useState(true);
  const [facingMode, setFacingMode] = useState('environment'); // الكاميرا الخلفية
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState(null);

  // فتح الكاميرا
  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => stopCamera();
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 1280 },
          aspectRatio: { ideal: 1 }
        },
        audio: false
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('لا يمكن الوصول للكاميرا. تأكد من إعطاء الصلاحيات.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // تبديل الكاميرا
  const switchCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // التقاط الصورة
  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setCapturing(true);
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // ضبط حجم Canvas مربع
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    
    // قص الصورة لتكون مربعة من المنتصف
    const offsetX = (video.videoWidth - size) / 2;
    const offsetY = (video.videoHeight - size) / 2;
    
    ctx.drawImage(video, offsetX, offsetY, size, size, 0, 0, size, size);
    
    // تحويل إلى Blob
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `product-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        onCapture(file, dataUrl);
        onClose();
      }
      setCapturing(false);
    }, 'image/jpeg', 0.9);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="flex items-center justify-between">
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
          >
            <X size={24} />
          </button>
          <h2 className="text-white font-bold">تصوير المنتج</h2>
          <button 
            onClick={() => setShowGrid(!showGrid)}
            className={`w-10 h-10 rounded-full flex items-center justify-center ${showGrid ? 'bg-[#FF6B00]' : 'bg-white/20 backdrop-blur-sm'} text-white`}
          >
            <Grid3X3 size={20} />
          </button>
        </div>
      </div>

      {/* Camera View */}
      <div className="flex-1 flex items-center justify-center bg-black">
        {error ? (
          <div className="text-center text-white p-4">
            <Camera size={48} className="mx-auto mb-4 opacity-50" />
            <p className="mb-4">{error}</p>
            <button
              onClick={startCamera}
              className="px-4 py-2 bg-[#FF6B00] rounded-xl font-bold"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : (
          <div className="relative w-full max-w-md aspect-square">
            {/* Video */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            
            {/* Grid Overlay */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none">
                {/* Vertical Lines */}
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
                <div className="absolute right-1/3 top-0 bottom-0 w-px bg-white/30" />
                {/* Horizontal Lines */}
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
                <div className="absolute bottom-1/3 left-0 right-0 h-px bg-white/30" />
              </div>
            )}
            
            {/* Center Guide */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-dashed border-white/50 rounded-2xl flex items-center justify-center">
                <Focus size={32} className="text-white/50" />
              </div>
            </div>
            
            {/* Corner Guides */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Top Left */}
              <div className="absolute top-4 left-4">
                <div className="w-8 h-8 border-l-2 border-t-2 border-[#FF6B00] rounded-tl-lg" />
              </div>
              {/* Top Right */}
              <div className="absolute top-4 right-4">
                <div className="w-8 h-8 border-r-2 border-t-2 border-[#FF6B00] rounded-tr-lg" />
              </div>
              {/* Bottom Left */}
              <div className="absolute bottom-4 left-4">
                <div className="w-8 h-8 border-l-2 border-b-2 border-[#FF6B00] rounded-bl-lg" />
              </div>
              {/* Bottom Right */}
              <div className="absolute bottom-4 right-4">
                <div className="w-8 h-8 border-r-2 border-b-2 border-[#FF6B00] rounded-br-lg" />
              </div>
            </div>
          </div>
        )}
        
        {/* Hidden Canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Tips Bar */}
      <div className="bg-gradient-to-t from-black/70 to-transparent p-3">
        <div className="flex items-center justify-center gap-2 text-white/80 text-xs mb-3">
          <Lightbulb size={14} className="text-yellow-400" />
          <span>ضع المنتج في المربع المنقط • استخدم إضاءة جيدة</span>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-black p-6">
        <div className="flex items-center justify-center gap-8">
          {/* Switch Camera */}
          <button
            onClick={switchCamera}
            className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <RotateCcw size={24} />
          </button>
          
          {/* Capture Button */}
          <motion.button
            onClick={captureImage}
            disabled={capturing || !stream}
            whileTap={{ scale: 0.9 }}
            className="w-20 h-20 bg-white rounded-full flex items-center justify-center disabled:opacity-50 shadow-lg"
          >
            <div className={`w-16 h-16 rounded-full ${capturing ? 'bg-gray-300' : 'bg-[#FF6B00]'} flex items-center justify-center`}>
              {capturing ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera size={28} className="text-white" />
              )}
            </div>
          </motion.button>
          
          {/* Placeholder for symmetry */}
          <div className="w-12 h-12" />
        </div>
      </div>
    </div>
  );
};

export default CameraGuideModal;
