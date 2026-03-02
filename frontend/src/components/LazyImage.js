// /app/frontend/src/components/LazyImage.js
// مكون صورة محسّن مع Lazy Loading و Placeholder

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

const LazyImage = ({ 
  src, 
  alt, 
  className = '', 
  placeholderColor = '#f3f4f6',
  aspectRatio = '4/5',
  onContextMenu,
  onDragStart,
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    // Intersection Observer for lazy loading
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '100px', // Start loading 100px before entering viewport
        threshold: 0.01
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ aspectRatio }}
    >
      {/* Placeholder */}
      <div 
        className={`absolute inset-0 transition-opacity duration-300 ${
          isLoaded ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ backgroundColor: placeholderColor }}
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 shimmer-effect" />
      </div>

      {/* Actual Image */}
      {isInView && (
        <motion.img
          src={hasError ? 'https://via.placeholder.com/400?text=صورة+غير+متوفرة' : src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          onContextMenu={onContextMenu}
          onDragStart={onDragStart}
          draggable="false"
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ pointerEvents: 'none' }}
          {...props}
        />
      )}
    </div>
  );
};

export default LazyImage;
