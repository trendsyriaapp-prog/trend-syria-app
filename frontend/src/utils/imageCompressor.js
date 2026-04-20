// /app/frontend/src/utils/imageCompressor.js
// نظام ضغط الصور المحسّن - إصدار 2.0
// يدعم WebP، أحجام متعددة، وضغط ذكي

import logger from '../lib/logger';

/**
 * إعدادات الضغط الافتراضية
 */
const DEFAULT_OPTIONS = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.85,
  outputFormat: 'image/webp', // WebP أصغر بـ 25-35% من JPEG
  maxSizeMB: 1,
  preserveExif: false
};

/**
 * أحجام الصور المتعددة للتجاوب
 */
const IMAGE_SIZES = {
  thumbnail: { width: 200, height: 200, quality: 0.75 },
  small: { width: 400, height: 400, quality: 0.8 },
  medium: { width: 800, height: 800, quality: 0.85 },
  large: { width: 1200, height: 1200, quality: 0.9 },
  full: { width: 1600, height: 1600, quality: 0.92 }
};

/**
 * التحقق من دعم WebP
 */
let webPSupported = null;
export const supportsWebP = async () => {
  if (webPSupported !== null) return webPSupported;
  
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    webPSupported = canvas.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    webPSupported = false;
  }
  
  return webPSupported;
};

/**
 * ضغط صورة واحدة
 * @param {File|Blob} file - ملف الصورة
 * @param {Object} options - خيارات الضغط
 * @returns {Promise<Blob>} - الصورة المضغوطة
 */
export const compressImage = async (file, options = {}) => {
  const {
    maxWidth = DEFAULT_OPTIONS.maxWidth,
    maxHeight = DEFAULT_OPTIONS.maxHeight,
    quality = DEFAULT_OPTIONS.quality,
    outputFormat = DEFAULT_OPTIONS.outputFormat,
    maxSizeMB = DEFAULT_OPTIONS.maxSizeMB
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
      
      img.onload = async () => {
        // حساب الأبعاد الجديدة مع الحفاظ على النسبة
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        // إنشاء Canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d', { alpha: true });
        
        // تحسين جودة الرسم
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // رسم خلفية بيضاء للصور الشفافة (إذا كان الإخراج JPEG/WebP)
        if (outputFormat !== 'image/png') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }
        
        // رسم الصورة
        ctx.drawImage(img, 0, 0, width, height);
        
        // تحديد صيغة الإخراج
        let finalFormat = outputFormat;
        const isWebPSupported = await supportsWebP();
        if (outputFormat === 'image/webp' && !isWebPSupported) {
          finalFormat = 'image/jpeg';
        }
        
        // محاولة الضغط بالجودة المطلوبة
        let currentQuality = quality;
        let blob = null;
        let attempts = 0;
        const maxAttempts = 5;
        
        while (attempts < maxAttempts) {
          blob = await canvasToBlob(canvas, finalFormat, currentQuality);
          const sizeMB = blob.size / (1024 * 1024);
          
          if (sizeMB <= maxSizeMB) {
            break;
          }
          
          // تقليل الجودة للمحاولة التالية
          currentQuality = Math.max(0.4, currentQuality * 0.8);
          attempts++;
        }
        
        resolve(blob);
      };
      
      img.onerror = () => reject(new Error('فشل تحميل الصورة'));
      img.src = e.target.result;
    };
    
    reader.onerror = () => reject(new Error('فشل قراءة الملف'));
    reader.readAsDataURL(file);
  });
};

/**
 * تحويل Canvas إلى Blob
 */
const canvasToBlob = (canvas, format, quality) => {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('فشل إنشاء الصورة'));
        }
      },
      format,
      quality
    );
  });
};

/**
 * ضغط صورة وإنشاء أحجام متعددة
 * @param {File|Blob} file - ملف الصورة
 * @param {string[]} sizes - الأحجام المطلوبة ['thumbnail', 'medium', 'large']
 * @returns {Promise<Object>} - الصور بأحجام مختلفة
 */
export const compressImageMultipleSizes = async (file, sizes = ['thumbnail', 'medium']) => {
  const results = {};
  
  for (const sizeName of sizes) {
    const sizeConfig = IMAGE_SIZES[sizeName];
    if (!sizeConfig) continue;
    
    try {
      const compressed = await compressImage(file, {
        maxWidth: sizeConfig.width,
        maxHeight: sizeConfig.height,
        quality: sizeConfig.quality
      });
      
      results[sizeName] = {
        blob: compressed,
        size: compressed.size,
        url: URL.createObjectURL(compressed)
      };
    } catch (error) {
      logger.error(`Error compressing ${sizeName}:`, error);
    }
  }
  
  return results;
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
    try {
      const compressed = await compressImage(fileArray[i], options);
      results.push({
        success: true,
        blob: compressed,
        originalSize: fileArray[i].size,
        compressedSize: compressed.size,
        savings: Math.round((1 - compressed.size / fileArray[i].size) * 100)
      });
    } catch (error) {
      results.push({
        success: false,
        error: error.message,
        originalSize: fileArray[i].size
      });
    }
    
    if (onProgress) {
      onProgress({
        current: i + 1,
        total: fileArray.length,
        percent: Math.round(((i + 1) / fileArray.length) * 100),
        results
      });
    }
  }
  
  return results;
};

/**
 * إنشاء معاينة مصغرة سريعة
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
 * إنشاء معاينة فورية (بدون ضغط)
 * @param {File|Blob} file - ملف الصورة
 * @returns {string} - Object URL
 */
export const createQuickPreview = (file) => {
  return URL.createObjectURL(file);
};

/**
 * تحويل Blob إلى File
 * @param {Blob} blob - الـ Blob
 * @param {string} filename - اسم الملف الأصلي
 * @returns {File} - ملف جديد
 */
export const blobToFile = (blob, filename) => {
  const extension = blob.type === 'image/webp' ? 'webp' : 
                   blob.type === 'image/png' ? 'png' : 'jpg';
  const baseName = filename.replace(/\.[^/.]+$/, '');
  const newName = `${baseName}.${extension}`;
  
  return new File([blob], newName, { 
    type: blob.type,
    lastModified: Date.now()
  });
};

/**
 * تحويل Base64 إلى Blob
 * @param {string} base64 - سلسلة Base64
 * @returns {Blob}
 */
export const base64ToBlob = (base64) => {
  const parts = base64.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  
  return new Blob([uInt8Array], { type: contentType });
};

/**
 * تحويل Blob إلى Base64
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
export const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * حساب حجم الملف بشكل مقروء
 * @param {number} bytes - الحجم بالبايت
 * @returns {string} - الحجم المقروء
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

/**
 * الحصول على أبعاد الصورة
 * @param {File|Blob|string} source - ملف أو URL
 * @returns {Promise<{width: number, height: number}>}
 */
export const getImageDimensions = (source) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    
    if (typeof source === 'string') {
      img.src = source;
    } else {
      img.src = URL.createObjectURL(source);
    }
  });
};

/**
 * التحقق من صحة الصورة
 * @param {File} file
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
export const validateImage = async (file) => {
  // التحقق من النوع
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'نوع الملف غير مدعوم' };
  }
  
  // التحقق من الحجم (10MB max)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { valid: false, error: 'حجم الملف كبير جداً (الحد الأقصى 10MB)' };
  }
  
  // التحقق من الأبعاد
  try {
    const dimensions = await getImageDimensions(file);
    if (dimensions.width < 100 || dimensions.height < 100) {
      return { valid: false, error: 'الصورة صغيرة جداً (الحد الأدنى 100x100)' };
    }
    if (dimensions.width > 10000 || dimensions.height > 10000) {
      return { valid: false, error: 'الصورة كبيرة جداً (الحد الأقصى 10000x10000)' };
    }
  } catch {
    return { valid: false, error: 'فشل قراءة الصورة' };
  }
  
  return { valid: true };
};

// تصدير افتراضي
export default {
  compressImage,
  compressImageMultipleSizes,
  compressMultipleImages,
  createThumbnail,
  createQuickPreview,
  blobToFile,
  base64ToBlob,
  blobToBase64,
  formatFileSize,
  getImageDimensions,
  validateImage,
  supportsWebP,
  IMAGE_SIZES
};
