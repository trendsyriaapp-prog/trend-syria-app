// /app/frontend/src/components/seller/ImageBackgroundSelector.js
// مكون اختيار خلفية الصورة - مثل Trendyol

import { useState, useEffect } from 'react';
import logger from '../../lib/logger';
import { motion } from 'framer-motion';
import axios from 'axios';
import { X, Loader2, Wand2, Check, Image as ImageIcon } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// ألوان الخلفيات للمعاينة
const BACKGROUND_COLORS = {
  white: 'bg-white',
  light_gray: 'bg-gradient-to-b from-gray-100 to-white',
  soft_blue: 'bg-gradient-to-b from-blue-50 to-white',
  soft_pink: 'bg-gradient-to-b from-pink-50 to-white',
  soft_gold: 'bg-gradient-to-b from-yellow-50 to-white',
  elegant_gray: 'bg-gradient-to-br from-gray-300 to-gray-200',
  premium_dark: 'bg-gradient-to-br from-gray-800 to-gray-700',
  fashion_beige: 'bg-gradient-to-b from-orange-50 to-white',
  tech_silver: 'bg-gradient-to-b from-slate-100 to-white',
  nature_green: 'bg-gradient-to-b from-green-50 to-white',
};

const ImageBackgroundSelector = ({ 
  imageDataUrl, 
  onProcessed, 
  onCancel,
  isOpen 
}) => {
  const [backgrounds, setBackgrounds] = useState([]);
  const [selectedBg, setSelectedBg] = useState('white');
  const [addShadow, setAddShadow] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processedImage, setProcessedImage] = useState(null);
  const [keepOriginal, setKeepOriginal] = useState(false);

  useEffect(() => {
    fetchBackgrounds();
  }, []);

  const fetchBackgrounds = async () => {
    try {
      const res = await axios.get(`${API}/api/image/backgrounds`);
      setBackgrounds(res.data.backgrounds);
    } catch (error) {
      logger.error('Error fetching backgrounds:', error);
    }
  };

  const processImage = async () => {
    if (keepOriginal) {
      onProcessed(imageDataUrl);
      return;
    }

    setProcessing(true);
    try {
      // تحويل base64 إلى blob
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      
      // إنشاء FormData
      const formData = new FormData();
      formData.append('file', blob, 'image.jpg');
      formData.append('background', selectedBg);
      formData.append('add_shadow', addShadow.toString());

      const res = await axios.post(`${API}/api/image/process`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setProcessedImage(res.data.image);
      }
    } catch (error) {
      logger.error('Error processing image:', error);
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (processedImage) {
      onProcessed(processedImage);
    } else if (keepOriginal) {
      onProcessed(imageDataUrl);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-2">
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto overscroll-contain"
        style={{ touchAction: 'pan-y' }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-3 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <Wand2 className="text-[#FF6B00]" size={20} />
            <h2 className="font-bold text-gray-900 text-sm">تعديل خلفية الصورة</h2>
          </div>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded-full">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Image Preview */}
          <div className="grid grid-cols-2 gap-3">
            {/* Original */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-500 text-center">الصورة الأصلية</p>
              <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden border-2 border-gray-200">
                <img 
                  src={imageDataUrl} 
                  alt="Original" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Processed */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-gray-500 text-center">
                {keepOriginal ? 'بدون تعديل' : 'بعد المعالجة'}
              </p>
              <div className={`aspect-square rounded-xl overflow-hidden border-2 ${
                processedImage || keepOriginal ? 'border-green-500' : 'border-dashed border-gray-300'
              } ${keepOriginal ? 'bg-gray-100' : BACKGROUND_COLORS[selectedBg]}`}>
                {processing ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                    <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
                    <p className="text-xs text-gray-500">جاري إزالة الخلفية...</p>
                  </div>
                ) : processedImage ? (
                  <img 
                    src={processedImage} 
                    alt="Processed" 
                    className="w-full h-full object-contain"
                  />
                ) : keepOriginal ? (
                  <img 
                    src={imageDataUrl} 
                    alt="Original" 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-gray-400">
                    <ImageIcon size={32} />
                    <p className="text-xs">اختر خلفية ثم اضغط معاينة</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Keep Original Option */}
          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer border border-gray-200 hover:border-gray-300">
            <input
              type="checkbox"
              checked={keepOriginal}
              onChange={(e) => {
                setKeepOriginal(e.target.checked);
                if (e.target.checked) setProcessedImage(null);
              }}
              className="w-4 h-4 accent-[#FF6B00]"
            />
            <div>
              <p className="font-bold text-sm text-gray-900">إبقاء الصورة الأصلية</p>
              <p className="text-xs text-gray-500">بدون إزالة الخلفية</p>
            </div>
          </label>

          {/* Background Selection */}
          {!keepOriginal && (
            <>
              <div>
                <p className="text-xs font-bold text-gray-700 mb-2">اختر الخلفية</p>
                <div className="grid grid-cols-5 gap-2">
                  {backgrounds.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => {
                        setSelectedBg(bg.id);
                        setProcessedImage(null);
                      }}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        selectedBg === bg.id 
                          ? 'border-[#FF6B00] ring-2 ring-[#FF6B00]/30' 
                          : 'border-gray-200 hover:border-gray-300'
                      } ${BACKGROUND_COLORS[bg.id]}`}
                      title={bg.name}
                    >
                      {selectedBg === bg.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#FF6B00]/20">
                          <Check size={16} className="text-[#FF6B00]" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center">
                  {backgrounds.find(b => b.id === selectedBg)?.name || 'أبيض نقي'}
                </p>
              </div>

              {/* Shadow Option */}
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer border border-gray-200">
                <input
                  type="checkbox"
                  checked={addShadow}
                  onChange={(e) => {
                    setAddShadow(e.target.checked);
                    setProcessedImage(null);
                  }}
                  className="w-4 h-4 accent-[#FF6B00]"
                />
                <div>
                  <p className="font-bold text-sm text-gray-900">إضافة ظل خفيف</p>
                  <p className="text-xs text-gray-500">يعطي المنتج مظهراً واقعياً</p>
                </div>
              </label>

              {/* Preview Button */}
              <button
                onClick={processImage}
                disabled={processing}
                className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {processing ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    جاري المعالجة...
                  </>
                ) : (
                  <>
                    <Wand2 size={18} />
                    معاينة النتيجة
                  </>
                )}
              </button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-3 flex gap-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button
            onClick={onCancel}
            className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm font-bold"
          >
            إلغاء
          </button>
          <button
            onClick={handleConfirm}
            disabled={!processedImage && !keepOriginal}
            className="flex-1 bg-[#FF6B00] text-white py-2 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Check size={16} />
            استخدام الصورة
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ImageBackgroundSelector;
