// /app/frontend/src/components/OptimizedImage.js
// مكون صورة محسنة مع Lazy Loading و Placeholder

import { useState, useRef, useEffect } from 'react';
import { ImageOff } from 'lucide-react';

const OptimizedImage = ({ 
  src, 
  alt, 
  className = '',
  width,
  height,
  placeholder = 'blur', // blur, skeleton, none
  fallback = null,
  onLoad,
  onError,
  priority = false, // للصور فوق الـ fold
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef(null);

  // Intersection Observer للـ Lazy Loading
  useEffect(() => {
    if (priority) return; // لا نحتاج observer للصور ذات الأولوية

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px', // تحميل الصور قبل 100px من الظهور
        threshold: 0.1
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = (e) => {
    setIsLoaded(true);
    onLoad?.(e);
  };

  const handleError = (e) => {
    setHasError(true);
    onError?.(e);
  };

  // Placeholder ضبابي
  const blurPlaceholder = (
    <div 
      className={`absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse ${className}`}
      style={{ filter: 'blur(20px)' }}
    />
  );

  // Placeholder هيكلي
  const skeletonPlaceholder = (
    <div className={`absolute inset-0 shimmer bg-gray-200 ${className}`} />
  );

  // صورة الخطأ
  if (hasError) {
    return fallback || (
      <div 
        ref={imgRef}
        className={`flex items-center justify-center bg-gray-100 ${className}`}
        style={{ width, height }}
      >
        <ImageOff size={24} className="text-gray-400" />
      </div>
    );
  }

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* Placeholder */}
      {!isLoaded && placeholder !== 'none' && (
        placeholder === 'blur' ? blurPlaceholder : skeletonPlaceholder
      )}

      {/* الصورة الفعلية */}
      {isInView && (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          {...props}
        />
      )}
    </div>
  );
};

// مكون صورة المنتج المحسنة
export const ProductImage = ({ 
  src, 
  alt, 
  className = '',
  aspectRatio = '4/5',
  ...props 
}) => {
  return (
    <div className={`relative bg-gray-100 ${className}`} style={{ aspectRatio }}>
      <OptimizedImage
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full"
        placeholder="skeleton"
        {...props}
      />
    </div>
  );
};

// مكون صورة Avatar محسنة
export const AvatarImage = ({ 
  src, 
  alt, 
  size = 40,
  fallbackText = '',
  className = '',
  ...props 
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div 
        className={`flex items-center justify-center bg-gradient-to-br from-orange-400 to-red-500 text-white font-bold rounded-full ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {fallbackText?.[0]?.toUpperCase() || '?'}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      className={`rounded-full ${className}`}
      style={{ width: size, height: size }}
      placeholder="blur"
      onError={() => setHasError(true)}
      priority
      {...props}
    />
  );
};

// مكون صورة البانر المحسنة
export const BannerImage = ({ 
  src, 
  alt, 
  className = '',
  height = 200,
  ...props 
}) => {
  return (
    <div className={`relative bg-gray-200 overflow-hidden ${className}`} style={{ height }}>
      <OptimizedImage
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover"
        placeholder="blur"
        priority
        {...props}
      />
    </div>
  );
};

// مكون معرض الصور المحسن
export const ImageGallery = ({ 
  images = [], 
  className = '',
  onImageClick,
  ...props 
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  if (!images.length) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 aspect-square ${className}`}>
        <ImageOff size={48} className="text-gray-400" />
      </div>
    );
  }

  return (
    <div className={className}>
      {/* الصورة الرئيسية */}
      <div 
        className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden cursor-pointer"
        onClick={() => onImageClick?.(selectedIndex)}
      >
        <OptimizedImage
          src={images[selectedIndex]}
          alt={`Image ${selectedIndex + 1}`}
          className="w-full h-full"
          placeholder="blur"
          priority
          {...props}
        />
      </div>

      {/* الصور المصغرة */}
      {images.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto hide-scrollbar">
          {images.map((img, index) => (
            <button
              key={index}
              onClick={() => setSelectedIndex(index)}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                selectedIndex === index 
                  ? 'border-[#FF6B00]' 
                  : 'border-transparent hover:border-gray-300'
              }`}
            >
              <OptimizedImage
                src={img}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full"
                placeholder="skeleton"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default OptimizedImage;
