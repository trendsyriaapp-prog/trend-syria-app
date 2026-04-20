/**
 * أداة التحقق من الفيديو ورفعه إلى CDN
 * الحل الجذري: لا نحول الفيديو إلى Base64
 * بدلاً من ذلك نستخدم Object URL للعرض ونرفع مباشرة إلى CDN
 */

import logger from '../lib/logger';

const API = process.env.REACT_APP_BACKEND_URL;

// الإعدادات - مُحسّنة لسوريا
export const VIDEO_CONFIG = {
  maxSizeBytes: 15 * 1024 * 1024, // 15MB (مُخفّض من 50MB لسوريا)
  maxSizeMB: 15,
  maxDurationSeconds: 30,
  minDurationSeconds: 1,
  allowedTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/3gpp'],
  allowedExtensions: ['mp4', 'mov', 'avi', 'webm', '3gp', 'mkv'],
};

/**
 * التحقق من مدة الفيديو
 */
export const validateVideoDuration = (file) => {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    const objectUrl = URL.createObjectURL(file);
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
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
      URL.revokeObjectURL(objectUrl);
      resolve({
        valid: false,
        duration: 0,
        error: 'فشل في قراءة الفيديو. تأكد من صيغة الملف'
      });
    };
    
    video.src = objectUrl;
  });
};

/**
 * التحقق من حجم الفيديو
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
 */
export const validateVideoType = (file) => {
  // السماح بأي نوع فيديو إذا بدأ بـ video/
  if (file.type.startsWith('video/')) {
    return { valid: true, error: null };
  }
  
  // التحقق من الامتداد كبديل
  const extension = file.name.split('.').pop().toLowerCase();
  
  if (VIDEO_CONFIG.allowedExtensions.includes(extension)) {
    return { valid: true, error: null };
  }
  
  return {
    valid: false,
    error: 'صيغة الفيديو غير مدعومة. الصيغ المدعومة: MP4, MOV, AVI, WebM, 3GP'
  };
};

/**
 * التحقق الشامل من الفيديو
 */
export const validateVideo = async (file, onProgress = null) => {
  if (onProgress) onProgress({ stage: 'type', message: 'جاري التحقق من نوع الفيديو...' });
  
  // 1. التحقق من النوع
  const typeResult = validateVideoType(file);
  if (!typeResult.valid) {
    return typeResult;
  }
  
  if (onProgress) onProgress({ stage: 'size', message: 'جاري التحقق من حجم الفيديو...' });
  
  // 2. التحقق من الحجم
  const sizeResult = validateVideoSize(file);
  if (!sizeResult.valid) {
    return sizeResult;
  }
  
  if (onProgress) onProgress({ stage: 'duration', message: 'جاري التحقق من مدة الفيديو...' });
  
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
 * إنشاء Object URL للعرض المؤقت (لا يستهلك ذاكرة كثيرة)
 */
export const createVideoPreviewUrl = (file) => {
  return URL.createObjectURL(file);
};

/**
 * تحرير Object URL عند الانتهاء
 */
export const revokeVideoPreviewUrl = (url) => {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
};

/**
 * رفع الفيديو إلى CDN مباشرة (بدون Base64)
 * مع progress callback للإنترنت البطيء
 */
export const uploadVideoToCDN = async (file, folder = 'videos', onProgress = null, token = null) => {
  const formData = new FormData();
  formData.append('file', file);
  
  // إظهار progress أولي
  if (onProgress) {
    onProgress({
      stage: 'starting',
      percent: 1,
      message: 'جاري بدء الرفع...'
    });
  }
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    
    // Progress tracking
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.max(1, Math.round((event.loaded / event.total) * 100));
        logger.log(`Upload progress: ${percent}%`);
        onProgress({
          stage: 'uploading',
          percent,
          loaded: event.loaded,
          total: event.total,
          message: `جاري الرفع... ${percent}%`
        });
      }
    });
    
    xhr.upload.addEventListener('loadstart', () => {
      logger.log('Upload started');
      if (onProgress) {
        onProgress({
          stage: 'started',
          percent: 2,
          message: 'بدأ الرفع...'
        });
      }
    });
    
    xhr.addEventListener('load', () => {
      logger.log('Upload completed, status:', xhr.status);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve({
            success: true,
            path: response.path,
            size: response.size,
            sizeMB: response.size_mb
          });
        } catch (e) {
          reject(new Error('فشل في قراءة استجابة الخادم'));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.detail || 'فشل رفع الفيديو'));
        } catch (e) {
          reject(new Error(`فشل رفع الفيديو (${xhr.status})`));
        }
      }
    });
    
    xhr.addEventListener('error', (e) => {
      logger.error('Upload error:', e);
      reject(new Error('فشل الاتصال بالخادم. تحقق من الإنترنت'));
    });
    
    xhr.addEventListener('timeout', () => {
      logger.error('Upload timeout');
      reject(new Error('انتهت مهلة الرفع. حاول مرة أخرى'));
    });
    
    xhr.open('POST', `${API}/api/storage/upload-video?folder=${folder}`);
    xhr.timeout = 300000; // 5 minutes timeout for slow internet
    
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    
    logger.log('Sending upload request to:', `${API}/api/storage/upload-video?folder=${folder}`);
    xhr.send(formData);
  });
};

/**
 * معالجة الفيديو الكاملة: تحقق + إنشاء preview + رفع
 * هذه هي الدالة الرئيسية التي يجب استخدامها
 */
export const processVideo = async (file, onProgress = null) => {
  // 1. التحقق من صحة الفيديو
  const validationResult = await validateVideo(file, onProgress);
  
  if (!validationResult.valid) {
    return {
      success: false,
      error: validationResult.error
    };
  }
  
  // 2. إنشاء preview URL للعرض المؤقت
  const previewUrl = createVideoPreviewUrl(file);
  
  return {
    success: true,
    previewUrl,        // URL مؤقت للعرض في الـ UI
    file,              // الملف الأصلي للرفع لاحقاً
    duration: validationResult.duration,
    sizeMB: validationResult.sizeMB,
    needsUpload: true, // علامة أن الفيديو يحتاج رفع إلى CDN
    error: null
  };
};

/**
 * التحقق إذا كانت القيمة هي CDN path
 */
export const isCDNVideoPath = (value) => {
  if (!value || typeof value !== 'string') return false;
  return value.startsWith('trend-syria/videos/') || 
         value.startsWith('trend-syria/admin_videos/');
};

/**
 * الحصول على URL الفيديو من CDN path
 */
export const getVideoUrl = (path) => {
  if (!path) return null;
  if (path.startsWith('blob:')) return path; // Already a preview URL
  if (path.startsWith('http')) return path;  // Already a full URL
  if (path.startsWith('data:')) return path; // Base64 (legacy)
  
  // CDN path - convert to URL
  return `${API}/api/storage/video/${path}`;
};

export default {
  VIDEO_CONFIG,
  validateVideo,
  validateVideoDuration,
  validateVideoSize,
  validateVideoType,
  createVideoPreviewUrl,
  revokeVideoPreviewUrl,
  uploadVideoToCDN,
  processVideo,
  isCDNVideoPath,
  getVideoUrl
};
