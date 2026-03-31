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
        
        // تطبيق التحسينات الافتراضية: إضاءة 110%، تشبع 110%، تباين 110%
        const imageData = ctx.getImageData(0, 0, newWidth, newHeight);
        const data = imageData.data;
        
        // إعدادات التحسين الافتراضية (110%)
        const brightnessMultiplier = 1.10;  // الإضاءة 110%
        const contrastMultiplier = 1.10;    // التباين 110%
        const saturationMultiplier = 1.10;  // التشبع 110%
        
        for (let i = 0; i < data.length; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];
          
          // 1. الإضاءة (Brightness) - 110%
          r = r * brightnessMultiplier;
          g = g * brightnessMultiplier;
          b = b * brightnessMultiplier;
          
          // 2. التباين (Contrast) - 110%
          r = (r - 128) * contrastMultiplier + 128;
          g = (g - 128) * contrastMultiplier + 128;
          b = (b - 128) * contrastMultiplier + 128;
          
          // 3. التشبع (Saturation) - 110%
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = gray + (r - gray) * saturationMultiplier;
          g = gray + (g - gray) * saturationMultiplier;
          b = gray + (b - gray) * saturationMultiplier;
          
          // حفظ القيم مع التأكد من البقاء في النطاق 0-255
          data[i] = Math.min(255, Math.max(0, Math.round(r)));
          data[i + 1] = Math.min(255, Math.max(0, Math.round(g)));
          data[i + 2] = Math.min(255, Math.max(0, Math.round(b)));
        }
        
        ctx.putImageData(imageData, 0, 0);
        warnings.push('تم تطبيق تحسينات الصورة (إضاءة، تشبع، تباين 110%)');
        
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
          enhanced: true // دائماً محسّنة بـ 110%
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
