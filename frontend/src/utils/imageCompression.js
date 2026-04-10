/**
 * أداة ضغط الصور - تُستخدم في جميع أنحاء التطبيق
 * تضغط الصور تلقائياً قبل الرفع لتجنب فشل الرفع بسبب الحجم الكبير
 */

/**
 * ضغط صورة وتحويلها إلى Base64
 * @param {File} file - ملف الصورة
 * @param {Object} options - خيارات الضغط
 * @param {number} options.maxWidth - الحد الأقصى للعرض (افتراضي: 1200)
 * @param {number} options.maxHeight - الحد الأقصى للارتفاع (افتراضي: 1200)
 * @param {number} options.quality - جودة الصورة 0-1 (افتراضي: 0.8)
 * @param {string} options.outputType - نوع الإخراج (افتراضي: 'image/jpeg')
 * @returns {Promise<string>} - الصورة المضغوطة كـ Base64
 */
export const compressImage = (file, options = {}) => {
  return new Promise((resolve, reject) => {
    const {
      maxWidth = 1200,
      maxHeight = 1200,
      quality = 0.8,
      outputType = 'image/jpeg'
    } = options;

    // التحقق من أن الملف صورة
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('الملف ليس صورة'));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        // حساب الأبعاد الجديدة مع الحفاظ على النسبة
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }

        // إنشاء canvas للضغط
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        
        // خلفية بيضاء للصور الشفافة
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        
        // رسم الصورة
        ctx.drawImage(img, 0, 0, width, height);

        // تحويل إلى Base64
        const compressedBase64 = canvas.toDataURL(outputType, quality);
        
        resolve(compressedBase64);
      };

      img.onerror = () => {
        reject(new Error('فشل في تحميل الصورة'));
      };

      img.src = event.target.result;
    };

    reader.onerror = () => {
      reject(new Error('فشل في قراءة الملف'));
    };

    reader.readAsDataURL(file);
  });
};

/**
 * ضغط صورة مع إعدادات محددة مسبقاً للوثائق
 * جودة أعلى للوثائق الرسمية
 */
export const compressDocumentImage = (file) => {
  return compressImage(file, {
    maxWidth: 1500,
    maxHeight: 1500,
    quality: 0.85,
    outputType: 'image/jpeg'
  });
};

/**
 * ضغط صورة مع إعدادات محددة مسبقاً للمنتجات
 */
export const compressProductImage = (file) => {
  return compressImage(file, {
    maxWidth: 1200,
    maxHeight: 1200,
    quality: 0.8,
    outputType: 'image/jpeg'
  });
};

/**
 * ضغط صورة مع إعدادات محددة مسبقاً للصور المصغرة
 */
export const compressThumbnail = (file) => {
  return compressImage(file, {
    maxWidth: 400,
    maxHeight: 400,
    quality: 0.7,
    outputType: 'image/jpeg'
  });
};

/**
 * الحصول على حجم Base64 بالكيلوبايت
 */
export const getBase64Size = (base64String) => {
  const stringLength = base64String.length - 'data:image/jpeg;base64,'.length;
  const sizeInBytes = 4 * Math.ceil(stringLength / 3) * 0.5624896334383812;
  return Math.round(sizeInBytes / 1024);
};

/**
 * التحقق من أن الصورة ضمن الحجم المسموح
 */
export const isImageSizeValid = (base64String, maxSizeKB = 2048) => {
  return getBase64Size(base64String) <= maxSizeKB;
};

export default compressImage;
