// /app/frontend/src/components/LazyImage.js
// مكون صورة محسّن مع Lazy Loading و Blur Placeholder

import { useState, useRef, useEffect, memo } from 'react';

const LazyImage = memo(({ 
  src, 
  alt, 
  className = '', 
  wrapperClassName = '',
  placeholderColor = '#f3f4f6',
  aspectRatio,
  width,
  height,
  onContextMenu,
  onDragStart,
  priority = false, // للصور المهمة فوق الطية
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority); // الصور ذات الأولوية تُحمّل فوراً
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    if (priority) return; // لا حاجة للـ observer إذا كانت الصورة ذات أولوية
    
    // Intersection Observer للـ lazy loading
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '200px', // بدء التحميل 200px قبل الظهور
        threshold: 0.01
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  const containerStyle = {
    ...(aspectRatio && { aspectRatio }),
    ...(width && { width }),
    ...(height && { height }),
  };

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden ${wrapperClassName}`}
      style={containerStyle}
    >
      {/* Blur Placeholder مع Shimmer */}
      <div 
        className={`absolute inset-0 transition-opacity duration-500 ${
          isLoaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{ backgroundColor: placeholderColor }}
      >
        {/* تأثير Shimmer متحرك */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      </div>

      {/* الصورة الفعلية */}
      {isInView && (
        <img
          src={hasError ? '/placeholder-image.svg' : src}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          onContextMenu={onContextMenu}
          onDragStart={onDragStart}
          draggable="false"
          className={`w-full h-full object-cover transition-opacity duration-500 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
          style={{ pointerEvents: 'none' }}
          {...props}
        />
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';

export default LazyImage;
