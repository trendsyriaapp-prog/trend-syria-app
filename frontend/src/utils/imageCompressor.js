// /app/frontend/src/utils/imageCompressor.js
// ضغط الصور قبل الرفع لتحسين الأداء

/**
 * ضغط صورة وتحويلها
 * @param {File} file - ملف الصورة
 * @param {Object} options - خيارات الضغط
 * @returns {Promise<Blob>} - الصورة المضغوطة
 */
export const compressImage = async (file, options = {}) => {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    outputFormat = 'image/webp', // webp أصغر بـ 30% من jpeg
    maxSizeMB = 1
  } = options;

  return new Promise((resolve, reject) => {
    // التحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      reject(new Error('الملف ليس صورة'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // حساب الأبعاد الجديدة
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // إنشاء canvas للضغط
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        
        // تحسين جودة الرسم
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // رسم الصورة
        ctx.drawImage(img, 0, 0, width, height);

        // تحويل إلى blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              // التحقق من الحجم
              const sizeMB = blob.size / (1024 * 1024);
              if (sizeMB > maxSizeMB) {
                // إعادة الضغط بجودة أقل
                const newQuality = Math.max(0.5, quality * (maxSizeMB / sizeMB));
                canvas.toBlob(
                  (smallerBlob) => {
                    resolve(smallerBlob || blob);
                  },
                  outputFormat,
                  newQuality
                );
              } else {
                resolve(blob);
              }
            } else {
              reject(new Error('فشل ضغط الصورة'));
            }
          },
          outputFormat,
          quality
        );
      };
      img.onerror = () => reject(new Error('فشل تحميل الصورة'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('فشل قراءة الملف'));
    reader.readAsDataURL(file);
  });
};

/**
 * ضغط عدة صور
 * @param {FileList|Array} files - قائمة الملفات
 * @param {Object} options - خيارات الضغط
 * @param {Function} onProgress - callback للتقدم
 * @returns {Promise<Blob[]>} - الصور المضغوطة
 */
export const compressMultipleImages = async (files, options = {}, onProgress = null) => {
  const fileArray = Array.from(files);
  const results = [];
  
  for (let i = 0; i < fileArray.length; i++) {
    const compressed = await compressImage(fileArray[i], options);
    results.push(compressed);
    
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: fileArray.length,
        percent: Math.round(((i + 1) / fileArray.length) * 100)
      });
    }
  }
  
  return results;
};

/**
 * إنشاء معاينة مصغرة
 * @param {File|Blob} file - ملف الصورة
 * @param {number} size - حجم المعاينة
 * @returns {Promise<string>} - Data URL للمعاينة
 */
export const createThumbnail = async (file, size = 150) => {
  const blob = await compressImage(file, {
    maxWidth: size,
    maxHeight: size,
    quality: 0.7,
    outputFormat: 'image/jpeg'
  });
  
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
};

/**
 * تحويل Blob إلى File
 * @param {Blob} blob - الـ Blob
 * @param {string} filename - اسم الملف
 * @returns {File} - ملف جديد
 */
export const blobToFile = (blob, filename) => {
  const extension = blob.type.split('/')[1] || 'webp';
  const name = filename.replace(/\.[^/.]+$/, '') + '.' + extension;
  return new File([blob], name, { type: blob.type });
};

/**
 * حساب حجم الملف بشكل مقروء
 * @param {number} bytes - الحجم بالبايت
 * @returns {string} - الحجم المقروء
 */
export const formatFileSize = (bytes) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

/**
 * التحقق من دعم WebP
 * @returns {Promise<boolean>}
 */
export const supportsWebP = async () => {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').startsWith('data:image/webp');
};

export default {
  compressImage,
  compressMultipleImages,
  createThumbnail,
  blobToFile,
  formatFileSize,
  supportsWebP
};
