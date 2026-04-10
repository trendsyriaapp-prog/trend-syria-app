/**
 * أداة التحقق من الفيديو
 * تستخدم للتحقق من حجم ومدة الفيديو قبل الرفع
 */

// الإعدادات
export const VIDEO_CONFIG = {
  maxSizeBytes: 50 * 1024 * 1024, // 50MB
  maxSizeMB: 50,
  maxDurationSeconds: 30,
  minDurationSeconds: 1,
  allowedTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/3gpp'],
};

/**
 * التحقق من مدة الفيديو
 * @param {File} file - ملف الفيديو
 * @returns {Promise<{valid: boolean, duration: number, error?: string}>}
 */
export const validateVideoDuration = (file) => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      const duration = Math.round(video.duration);
      
      if (duration < VIDEO_CONFIG.minDurationSeconds) {
        resolve({
          valid: false,
          duration,
          error: `مدة الفيديو قصيرة جداً (${duration} ثانية). الحد الأدنى ${VIDEO_CONFIG.minDurationSeconds} ثانية`
        });
      } else if (duration > VIDEO_CONFIG.maxDurationSeconds) {
        resolve({
          valid: false,
          duration,
          error: `مدة الفيديو طويلة جداً (${duration} ثانية). الحد الأقصى ${VIDEO_CONFIG.maxDurationSeconds} ثانية`
        });
      } else {
        resolve({
          valid: true,
          duration,
          error: null
        });
      }
    };
    
    video.onerror = () => {
      resolve({
        valid: false,
        duration: 0,
        error: 'فشل في قراءة الفيديو. تأكد من صيغة الملف'
      });
    };
    
    video.src = URL.createObjectURL(file);
  });
};

/**
 * التحقق من حجم الفيديو
 * @param {File} file - ملف الفيديو
 * @returns {{valid: boolean, sizeMB: number, error?: string}}
 */
export const validateVideoSize = (file) => {
  const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
  
  if (file.size > VIDEO_CONFIG.maxSizeBytes) {
    return {
      valid: false,
      sizeMB: parseFloat(sizeMB),
      error: `حجم الفيديو كبير جداً (${sizeMB}MB). الحد الأقصى ${VIDEO_CONFIG.maxSizeMB}MB`
    };
  }
  
  return {
    valid: true,
    sizeMB: parseFloat(sizeMB),
    error: null
  };
};

/**
 * التحقق من نوع الفيديو
 * @param {File} file - ملف الفيديو
 * @returns {{valid: boolean, error?: string}}
 */
export const validateVideoType = (file) => {
  // السماح بأي نوع فيديو إذا بدأ بـ video/
  if (file.type.startsWith('video/')) {
    return { valid: true, error: null };
  }
  
  // التحقق من الامتداد كبديل
  const extension = file.name.split('.').pop().toLowerCase();
  const validExtensions = ['mp4', 'mov', 'avi', 'webm', '3gp', 'mkv'];
  
  if (validExtensions.includes(extension)) {
    return { valid: true, error: null };
  }
  
  return {
    valid: false,
    error: 'صيغة الفيديو غير مدعومة. الصيغ المدعومة: MP4, MOV, AVI, WebM'
  };
};

/**
 * التحقق الشامل من الفيديو (الحجم والمدة والنوع)
 * @param {File} file - ملف الفيديو
 * @param {Function} onProgress - دالة لتتبع التقدم (اختياري)
 * @returns {Promise<{valid: boolean, duration?: number, sizeMB?: number, error?: string}>}
 */
export const validateVideo = async (file, onProgress = null) => {
  if (onProgress) onProgress('جاري التحقق من نوع الفيديو...');
  
  // 1. التحقق من النوع
  const typeResult = validateVideoType(file);
  if (!typeResult.valid) {
    return typeResult;
  }
  
  if (onProgress) onProgress('جاري التحقق من حجم الفيديو...');
  
  // 2. التحقق من الحجم
  const sizeResult = validateVideoSize(file);
  if (!sizeResult.valid) {
    return sizeResult;
  }
  
  if (onProgress) onProgress('جاري التحقق من مدة الفيديو...');
  
  // 3. التحقق من المدة
  const durationResult = await validateVideoDuration(file);
  if (!durationResult.valid) {
    return durationResult;
  }
  
  return {
    valid: true,
    duration: durationResult.duration,
    sizeMB: sizeResult.sizeMB,
    error: null
  };
};

/**
 * تحويل الفيديو إلى Base64
 * @param {File} file - ملف الفيديو
 * @param {Function} onProgress - دالة لتتبع التقدم (اختياري)
 * @returns {Promise<string>}
 */
export const videoToBase64 = (file, onProgress = null) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(`جاري رفع الفيديو... ${percent}%`);
      }
    };
    
    reader.onloadend = () => {
      resolve(reader.result);
    };
    
    reader.onerror = () => {
      reject(new Error('فشل في قراءة الفيديو'));
    };
    
    reader.readAsDataURL(file);
  });
};

/**
 * التحقق من الفيديو وتحويله إلى Base64 في خطوة واحدة
 * @param {File} file - ملف الفيديو
 * @param {Function} onProgress - دالة لتتبع التقدم (اختياري)
 * @returns {Promise<{success: boolean, data?: string, duration?: number, sizeMB?: number, error?: string}>}
 */
export const processVideo = async (file, onProgress = null) => {
  // التحقق أولاً
  const validationResult = await validateVideo(file, onProgress);
  
  if (!validationResult.valid) {
    return {
      success: false,
      error: validationResult.error
    };
  }
  
  // تحويل إلى Base64
  try {
    if (onProgress) onProgress('جاري رفع الفيديو...');
    const base64 = await videoToBase64(file, onProgress);
    
    return {
      success: true,
      data: base64,
      duration: validationResult.duration,
      sizeMB: validationResult.sizeMB,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'فشل في معالجة الفيديو'
    };
  }
};

export default {
  VIDEO_CONFIG,
  validateVideo,
  validateVideoDuration,
  validateVideoSize,
  validateVideoType,
  videoToBase64,
  processVideo
};
