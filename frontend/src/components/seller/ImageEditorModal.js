import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  X, RotateCw, RotateCcw, Sun, Contrast, Crop, 
  Check, RefreshCw, ZoomIn, ZoomOut, FlipHorizontal,
  Sparkles
} from 'lucide-react';

const ImageEditorModal = ({ isOpen, onClose, imageUrl, onSave }) => {
  const canvasRef = useRef(null);
  const [originalImage, setOriginalImage] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [flipH, setFlipH] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [isCropping, setIsCropping] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 100, height: 100 });
  const [saving, setSaving] = useState(false);

  // تحميل الصورة
  useEffect(() => {
    if (isOpen && imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setOriginalImage(img);
        drawImage(img, 0, 100, 100, false, 100);
      };
      img.src = imageUrl;
    }
  }, [isOpen, imageUrl]);

  // رسم الصورة على Canvas
  const drawImage = useCallback((img, rot, bright, cont, flip, zm) => {
    const canvas = canvasRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    const maxSize = 400;
    
    // حساب الأبعاد
    let width = img.width;
    let height = img.height;
    
    if (width > height) {
      if (width > maxSize) {
        height = (height * maxSize) / width;
        width = maxSize;
      }
    } else {
      if (height > maxSize) {
        width = (width * maxSize) / height;
        height = maxSize;
      }
    }

    // تطبيق الزوم
    width = (width * zm) / 100;
    height = (height * zm) / 100;

    canvas.width = maxSize;
    canvas.height = maxSize;

    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rot * Math.PI) / 180);
    if (flip) ctx.scale(-1, 1);
    
    // تطبيق الفلاتر
    ctx.filter = `brightness(${bright}%) contrast(${cont}%)`;
    
    ctx.drawImage(img, -width / 2, -height / 2, width, height);
    ctx.restore();
  }, []);

  // تحديث الصورة عند تغيير الإعدادات
  useEffect(() => {
    if (originalImage) {
      drawImage(originalImage, rotation, brightness, contrast, flipH, zoom);
    }
  }, [originalImage, rotation, brightness, contrast, flipH, zoom, drawImage]);

  // التدوير
  const handleRotate = (direction) => {
    setRotation(prev => prev + (direction === 'cw' ? 90 : -90));
  };

  // إعادة ضبط
  const handleReset = () => {
    setRotation(0);
    setBrightness(100);
    setContrast(100);
    setFlipH(false);
    setZoom(100);
  };

  // تحسين تلقائي
  const handleAutoEnhance = () => {
    setBrightness(110);
    setContrast(115);
  };

  // حفظ الصورة
  const handleSave = async () => {
    setSaving(true);
    try {
      const canvas = canvasRef.current;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      
      // تحويل إلى Blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      
      // إنشاء File
      const file = new File([blob], 'edited-image.jpg', { type: 'image/jpeg' });
      
      onSave(file, dataUrl);
      onClose();
    } catch (error) {
      console.error('Error saving image:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#FF6B00] to-orange-500 p-4 text-white">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Crop size={20} />
              محرر الصور
            </h2>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="p-4 bg-gray-100">
          <div className="relative bg-white rounded-xl shadow-inner flex items-center justify-center p-2" style={{ minHeight: 300 }}>
            <canvas 
              ref={canvasRef}
              className="max-w-full rounded-lg"
              style={{ maxHeight: 300 }}
            />
            
            {/* Crop Overlay */}
            {isCropping && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div 
                  className="border-2 border-white border-dashed bg-transparent"
                  style={{
                    width: `${cropArea.width}%`,
                    height: `${cropArea.height}%`,
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 space-y-4 max-h-[40vh] overflow-y-auto">
          {/* Quick Actions */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleRotate('ccw')}
              className="flex-1 min-w-[80px] py-2 bg-gray-100 rounded-xl text-gray-700 text-xs font-bold flex items-center justify-center gap-1 hover:bg-gray-200"
            >
              <RotateCcw size={16} />
              يسار
            </button>
            <button
              onClick={() => handleRotate('cw')}
              className="flex-1 min-w-[80px] py-2 bg-gray-100 rounded-xl text-gray-700 text-xs font-bold flex items-center justify-center gap-1 hover:bg-gray-200"
            >
              <RotateCw size={16} />
              يمين
            </button>
            <button
              onClick={() => setFlipH(!flipH)}
              className={`flex-1 min-w-[80px] py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 ${flipH ? 'bg-[#FF6B00] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              <FlipHorizontal size={16} />
              قلب
            </button>
            <button
              onClick={handleAutoEnhance}
              className="flex-1 min-w-[80px] py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1 hover:opacity-90"
            >
              <Sparkles size={16} />
              تحسين
            </button>
          </div>

          {/* Brightness */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                <Sun size={14} />
                السطوع
              </label>
              <span className="text-xs text-gray-500">{brightness}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="150"
              value={brightness}
              onChange={(e) => setBrightness(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FF6B00]"
            />
          </div>

          {/* Contrast */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                <Contrast size={14} />
                التباين
              </label>
              <span className="text-xs text-gray-500">{contrast}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="150"
              value={contrast}
              onChange={(e) => setContrast(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FF6B00]"
            />
          </div>

          {/* Zoom */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                <ZoomIn size={14} />
                التكبير
              </label>
              <span className="text-xs text-gray-500">{zoom}%</span>
            </div>
            <input
              type="range"
              min="50"
              max="150"
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#FF6B00]"
            />
          </div>

          {/* Reset Button */}
          <button
            onClick={handleReset}
            className="w-full py-2 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-gray-200"
          >
            <RefreshCw size={14} />
            إعادة ضبط الإعدادات
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-[#FF6B00] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#E65000] transition-colors disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw size={18} className="animate-spin" />
            ) : (
              <>
                <Check size={18} />
                حفظ التعديلات
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ImageEditorModal;
