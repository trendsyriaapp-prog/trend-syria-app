// /app/frontend/src/components/LazySection.js
// مكون لتأجيل تحميل الأقسام حتى تصبح مرئية

import { useState, useRef, useEffect, memo } from 'react';

const LazySection = memo(({ 
  children, 
  className = '',
  minHeight = '240px', // ارتفاع أدنى لمنع القفزات
  placeholder = null, // مكون placeholder مخصص
  rootMargin = '100px', // مسافة البدء قبل الظهور
  threshold = 0.01,
  onVisible, // callback عند ظهور القسم
  priority = false, // للأقسام المهمة فوق الطية
}) => {
  const [isVisible, setIsVisible] = useState(priority);
  const [hasRendered, setHasRendered] = useState(priority);
  const sectionRef = useRef(null);

  useEffect(() => {
    if (priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasRendered(true);
          onVisible?.();
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold,
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, [priority, rootMargin, threshold, onVisible]);

  // Placeholder افتراضي
  const DefaultPlaceholder = () => (
    <div 
      className="animate-pulse"
      style={{ minHeight }}
    >
      <div className="flex gap-3 overflow-hidden px-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex-shrink-0 w-36">
            <div className="bg-white rounded-xl overflow-hidden border-2 border-gray-100">
              <div className="aspect-square bg-gray-200" />
              <div className="p-2 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-2 bg-gray-200 rounded w-1/2" />
                <div className="h-3 bg-gray-200 rounded w-2/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div 
      ref={sectionRef}
      className={className}
      style={{ minHeight: hasRendered ? 'auto' : minHeight }}
    >
      {isVisible ? children : (placeholder || <DefaultPlaceholder />)}
    </div>
  );
});

LazySection.displayName = 'LazySection';

export default LazySection;
