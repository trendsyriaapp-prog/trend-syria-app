// /app/frontend/src/components/LazyImage.js
// مكون صورة محسّن مع Lazy Loading و Blur Placeholder
// إصدار 2.1 - يدعم CDN Storage و srcset و WebP و placeholder ذكي

import { useState, useRef, useEffect, memo, useCallback } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

/**
 * تحويل مسار الصورة إلى URL قابل للاستخدام
 * يدعم: Base64, CDN paths, و URLs العادية
 */
const getImageUrl = (src) => {
  if (!src) return '/placeholder.png';
  
  // Base64 images - use directly
  if (src.startsWith('data:image')) {
    return src;
  }
  
  // CDN storage path (e.g., "trend-syria/products/uuid.jpg")
  if (src.startsWith('trend-syria/') || src.startsWith('trendsyria/')) {
    return `${API_URL}/api/storage/images/${src}`;
  }
  
  // Already a full URL
  if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/')) {
    return src;
  }
  
  // Unknown format - return as-is
  return src;
};

/**
 * مكون LazyImage المحسّن
 * - Lazy Loading باستخدام Intersection Observer
 * - Blur/Shimmer Placeholder
 * - دعم srcset للتجاوب
 * - دعم CDN Storage paths
 * - تحميل تدريجي
 */
const LazyImage = memo(({ 
  src, 
  alt = '',
  className = '', 
  wrapperClassName = '',
  placeholderColor = '#f3f4f6',
  aspectRatio,
  width,
  height,
  onContextMenu,
  onDragStart,
  priority = false,
  sizes = '(max-width: 768px) 100vw, 50vw',
  srcSet,
  loading: loadingProp,
  onLoad: onLoadProp,
  onError: onErrorProp,
  objectFit = 'cover',
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(null);
  const imgRef = useRef(null);
  const observerRef = useRef(null);

  // إعداد Intersection Observer
  useEffect(() => {
    // للصور base64 أو priority، نعرضها مباشرة
    if (priority || src?.startsWith('data:image')) {
      setIsInView(true);
      return;
    }
    
    // تنظيف المراقب السابق
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observerRef.current?.disconnect();
        }
      },
      {
        rootMargin: '200px', // تحميل 200px قبل الظهور
        threshold: 0.01
      }
    );

    if (imgRef.current) {
      observerRef.current.observe(imgRef.current);
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [priority, src]);

  // تحديث الـ src عند التغيير
  useEffect(() => {
    if (src !== currentSrc) {
      setHasError(false);
      setCurrentSrc(src);
      // لا نعيد تعيين isLoaded إلى false للصور base64 لأنها تُحمّل فوراً
      if (!src?.startsWith('data:image')) {
        setIsLoaded(false);
      }
    }
  }, [src, currentSrc]);

  // للصور base64 أو المحملة من cache، تحقق إذا كانت محملة بالفعل
  useEffect(() => {
    if (isInView && src) {
      // تأخير صغير للتأكد من أن الـ img element موجود
      const timer = setTimeout(() => {
        const imgElement = imgRef.current?.querySelector('img');
        if (imgElement && imgElement.complete && imgElement.naturalWidth > 0) {
          setIsLoaded(true);
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isInView, src]);

  const handleLoad = useCallback((e) => {
    setIsLoaded(true);
    setHasError(false);
    onLoadProp?.(e);
  }, [onLoadProp]);

  const handleError = useCallback((e) => {
    setHasError(true);
    setIsLoaded(true);
    onErrorProp?.(e);
  }, [onErrorProp]);

  // حساب styles الحاوية
  const containerStyle = {
    ...(aspectRatio && { aspectRatio }),
    ...(width && { width }),
    ...(height && { height }),
  };

  // تحديد src النهائي
  // للصور base64، نستخدمها مباشرة بدون تحقق إضافي
  const isBase64 = src?.startsWith('data:image');
  const finalSrc = hasError ? '/placeholder.png' : getImageUrl(src);

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden ${wrapperClassName}`}
      style={containerStyle}
    >
      {/* Shimmer Placeholder */}
      <div 
        className={`absolute inset-0 transition-opacity duration-300 ${
          isLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{ backgroundColor: placeholderColor }}
        aria-hidden="true"
      >
        {/* تأثير Shimmer المتحرك */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite linear'
          }}
        />
      </div>

      {/* الصورة الفعلية */}
      {isInView && (
        <img
          src={finalSrc}
          srcSet={srcSet}
          sizes={srcSet ? sizes : undefined}
          alt={alt}
          loading={loadingProp || (priority ? 'eager' : 'lazy')}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          onLoad={handleLoad}
          onError={handleError}
          onContextMenu={onContextMenu}
          onDragStart={onDragStart}
          draggable="false"
          className={`w-full h-full transition-opacity duration-300 ${
            isLoaded || src?.startsWith('data:image') ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          style={{ 
            objectFit,
            pointerEvents: 'none'
          }}
          {...props}
        />
      )}

      {/* CSS للـ Shimmer */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

/**
 * مكون LazyBackgroundImage
 * للصور الخلفية مع Lazy Loading
 */
const LazyBackgroundImage = memo(({
  src,
  className = '',
  children,
  style = {},
  priority = false,
  placeholderColor = '#f3f4f6',
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const containerRef = useRef(null);

  useEffect(() => {
    if (priority) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  useEffect(() => {
    if (!isInView || !src) return;

    const img = new Image();
    img.onload = () => setIsLoaded(true);
    img.src = getImageUrl(src);
  }, [isInView, src]);

  const finalSrc = getImageUrl(src);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{
        ...style,
        backgroundColor: isLoaded ? undefined : placeholderColor,
        backgroundImage: isLoaded ? `url(${finalSrc})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
      {...props}
    >
      {children}
    </div>
  );
});

LazyBackgroundImage.displayName = 'LazyBackgroundImage';

/**
 * مكون ProgressiveImage
 * تحميل تدريجي: thumbnail ثم الصورة الكاملة
 */
const ProgressiveImage = memo(({
  src,
  placeholderSrc,
  alt = '',
  className = '',
  wrapperClassName = '',
  ...props
}) => {
  const [currentSrc, setCurrentSrc] = useState(placeholderSrc || src);
  const [isHighResLoaded, setIsHighResLoaded] = useState(false);

  useEffect(() => {
    if (!src || src === currentSrc) return;

    const img = new Image();
    img.onload = () => {
      setCurrentSrc(src);
      setIsHighResLoaded(true);
    };
    img.src = src;
  }, [src, currentSrc]);

  return (
    <div className={`relative overflow-hidden ${wrapperClassName}`}>
      <img
        src={currentSrc}
        alt={alt}
        className={`w-full h-full object-cover transition-all duration-500 ${
          isHighResLoaded ? '' : 'blur-sm scale-105'
        } ${className}`}
        {...props}
      />
    </div>
  );
});

ProgressiveImage.displayName = 'ProgressiveImage';

export { LazyBackgroundImage, ProgressiveImage, getImageUrl };
export default LazyImage;
