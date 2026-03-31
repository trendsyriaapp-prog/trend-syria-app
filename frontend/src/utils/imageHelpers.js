// Image validation and enhancement utilities

export const validateAndEnhanceImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.onload = () => {
        const issues = [];
        const warnings = [];
        
        // Check dimensions
        if (img.width < 800 || img.height < 800) {
          issues.push(`الصورة صغيرة جداً (${img.width}×${img.height}). الحد الأدنى 800×800`);
        } else if (img.width < 1000 || img.height < 1000) {
          warnings.push(`جودة متوسطة (${img.width}×${img.height}). يُفضل 1200×1200 أو أكثر`);
        }
        
        // Check file size
        if (file.size > 5 * 1024 * 1024) {
          issues.push('حجم الملف كبير جداً (الحد الأقصى 5MB)');
        }
        
        // Check aspect ratio
        const ratio = img.width / img.height;
        if (ratio < 0.5 || ratio > 2) {
          warnings.push('نسبة الأبعاد غير مثالية. يُفضل صورة مربعة (1:1)');
        }
        
        // Create enhanced canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Resize to optimal size (max 1200px for better performance)
        let newWidth = img.width;
        let newHeight = img.height;
        const maxSize = 1200;
        
        if (newWidth > maxSize || newHeight > maxSize) {
          if (newWidth > newHeight) {
            newHeight = Math.round((newHeight / newWidth) * maxSize);
            newWidth = maxSize;
          } else {
            newWidth = Math.round((newWidth / newHeight) * maxSize);
            newHeight = maxSize;
          }
          warnings.push(`تم تصغير الصورة إلى ${newWidth}×${newHeight}`);
        }
        
        canvas.width = newWidth;
        canvas.height = newHeight;
        
        // High quality drawing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw and enhance
        ctx.drawImage(img, 0, 0, newWidth, newHeight);
        
        // إعدادات الصورة الافتراضية (100% - بدون تحسين)
        // الصورة تُحفظ كما هي
        
        // Try WebP first (30% smaller), fallback to JPEG
        let enhancedDataUrl;
        const webpDataUrl = canvas.toDataURL('image/webp', 0.85);
        if (webpDataUrl.startsWith('data:image/webp')) {
          enhancedDataUrl = webpDataUrl;
          
          // Calculate size savings
          const originalSize = file.size;
          const compressedSize = Math.round(webpDataUrl.length * 0.75); // Approximate
          const savings = Math.round((1 - compressedSize / originalSize) * 100);
          if (savings > 10) {
            warnings.push(`تم ضغط الصورة بنسبة ${savings}%`);
          }
        } else {
          // Fallback to JPEG
          enhancedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        }
        
        resolve({
          dataUrl: enhancedDataUrl,
          width: newWidth,
          height: newHeight,
          originalWidth: img.width,
          originalHeight: img.height,
          issues,
          warnings,
          enhanced: false // بدون تحسين
        });
      };
      img.onerror = () => reject(new Error('فشل تحميل الصورة'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('فشل قراءة الملف'));
    reader.readAsDataURL(file);
  });
};

export const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};
