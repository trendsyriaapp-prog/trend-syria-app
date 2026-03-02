// /app/frontend/src/components/ImageUploader.js
// مكون رفع الصور مع ضغط تلقائي

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Image as ImageIcon, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { compressImage, blobToFile, formatFileSize } from '../utils/imageCompressor';

const ImageUploader = ({
  images = [],
  onImagesChange,
  maxImages = 5,
  maxSizeMB = 1,
  compressionQuality = 0.8,
  className = ''
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileSelect = useCallback(async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // التحقق من العدد المسموح
    const remainingSlots = maxImages - images.length;
    if (remainingSlots <= 0) {
      setError(`الحد الأقصى ${maxImages} صور`);
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    setUploading(true);
    setError(null);

    const newImages = [];

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      const fileId = `${Date.now()}-${i}`;

      try {
        // تحديث التقدم
        setUploadProgress(prev => ({
          ...prev,
          [fileId]: { status: 'compressing', progress: 0, originalSize: file.size }
        }));

        // ضغط الصورة
        const compressedBlob = await compressImage(file, {
          maxWidth: 1200,
          maxHeight: 1200,
          quality: compressionQuality,
          maxSizeMB: maxSizeMB,
          outputFormat: 'image/webp'
        });

        const compressedFile = blobToFile(compressedBlob, file.name);

        // إنشاء URL للمعاينة
        const previewUrl = URL.createObjectURL(compressedBlob);

        // تحديث التقدم
        setUploadProgress(prev => ({
          ...prev,
          [fileId]: {
            status: 'done',
            progress: 100,
            originalSize: file.size,
            compressedSize: compressedBlob.size,
            savings: Math.round((1 - compressedBlob.size / file.size) * 100)
          }
        }));

        newImages.push({
          id: fileId,
          file: compressedFile,
          preview: previewUrl,
          originalSize: file.size,
          compressedSize: compressedBlob.size
        });

      } catch (err) {
        console.error('Error compressing image:', err);
        setUploadProgress(prev => ({
          ...prev,
          [fileId]: { status: 'error', error: err.message }
        }));
      }
    }

    // تحديث قائمة الصور
    if (newImages.length > 0) {
      onImagesChange([...images, ...newImages]);
    }

    setUploading(false);
    
    // إزالة حالة التقدم بعد فترة
    setTimeout(() => {
      setUploadProgress({});
    }, 3000);

    // إعادة تعيين input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [images, maxImages, maxSizeMB, compressionQuality, onImagesChange]);

  const removeImage = useCallback((indexToRemove) => {
    const imageToRemove = images[indexToRemove];
    if (imageToRemove?.preview) {
      URL.revokeObjectURL(imageToRemove.preview);
    }
    onImagesChange(images.filter((_, index) => index !== indexToRemove));
  }, [images, onImagesChange]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      const input = fileInputRef.current;
      if (input) {
        // إنشاء FileList وهمي
        const dataTransfer = new DataTransfer();
        Array.from(files).forEach(file => {
          if (file.type.startsWith('image/')) {
            dataTransfer.items.add(file);
          }
        });
        input.files = dataTransfer.files;
        handleFileSelect({ target: input });
      }
    }
  }, [handleFileSelect]);

  return (
    <div className={className}>
      {/* Upload Area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
          transition-colors duration-200
          ${uploading 
            ? 'border-[#FF6B00] bg-orange-50' 
            : 'border-gray-300 hover:border-[#FF6B00] hover:bg-orange-50/50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-[#FF6B00] animate-spin" />
            <p className="text-sm text-gray-600">جاري ضغط الصور...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="w-8 h-8 text-gray-400" />
            <p className="text-sm text-gray-600">
              اسحب الصور هنا أو <span className="text-[#FF6B00] font-medium">اختر من جهازك</span>
            </p>
            <p className="text-xs text-gray-400">
              {images.length}/{maxImages} صور • الحد الأقصى {maxSizeMB}MB لكل صورة
            </p>
          </div>
        )}
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 mt-2 p-2 bg-red-50 text-red-600 rounded-lg text-sm"
          >
            <AlertCircle size={16} />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Progress */}
      <AnimatePresence>
        {Object.entries(uploadProgress).map(([id, progress]) => (
          <motion.div
            key={id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2"
          >
            <div className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
              progress.status === 'done' ? 'bg-green-50 text-green-600' :
              progress.status === 'error' ? 'bg-red-50 text-red-600' :
              'bg-orange-50 text-orange-600'
            }`}>
              {progress.status === 'done' ? (
                <>
                  <CheckCircle size={16} />
                  <span>
                    تم الضغط: {formatFileSize(progress.originalSize)} → {formatFileSize(progress.compressedSize)}
                    <span className="font-bold mr-1">(-{progress.savings}%)</span>
                  </span>
                </>
              ) : progress.status === 'error' ? (
                <>
                  <AlertCircle size={16} />
                  <span>{progress.error}</span>
                </>
              ) : (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>جاري الضغط...</span>
                </>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Preview Images */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-4">
          {images.map((image, index) => (
            <motion.div
              key={image.id || index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 group"
            >
              <img
                src={image.preview || image}
                alt={`صورة ${index + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* Remove Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(index);
                }}
                className="absolute top-1 left-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>

              {/* First Image Badge */}
              {index === 0 && (
                <span className="absolute bottom-1 right-1 text-[9px] bg-[#FF6B00] text-white px-1.5 py-0.5 rounded">
                  الرئيسية
                </span>
              )}

              {/* Size Info */}
              {image.compressedSize && (
                <span className="absolute bottom-1 left-1 text-[8px] bg-black/50 text-white px-1 py-0.5 rounded">
                  {formatFileSize(image.compressedSize)}
                </span>
              )}
            </motion.div>
          ))}

          {/* Add More Button */}
          {images.length < maxImages && (
            <motion.button
              onClick={() => fileInputRef.current?.click()}
              className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-[#FF6B00] hover:bg-orange-50/50 transition-colors"
            >
              <ImageIcon className="w-6 h-6 text-gray-400" />
            </motion.button>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
