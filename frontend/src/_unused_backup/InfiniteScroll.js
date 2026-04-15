// /app/frontend/src/components/InfiniteScroll.js
// مكون للتمرير اللانهائي مع دعم التحميل التدريجي
import { useEffect, useRef, useCallback, memo } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * مكون InfiniteScroll للتحميل التدريجي
 * @param {Object} props
 * @param {Function} props.onLoadMore - دالة تُستدعى عند الحاجة لتحميل المزيد
 * @param {boolean} props.hasMore - هل هناك المزيد من البيانات
 * @param {boolean} props.isLoading - هل جاري التحميل
 * @param {number} props.threshold - المسافة من الأسفل لبدء التحميل (بالبكسل)
 * @param {React.ReactNode} props.children - المحتوى
 * @param {React.ReactNode} props.loader - مكون التحميل المخصص
 * @param {React.ReactNode} props.endMessage - رسالة نهاية القائمة
 */
const InfiniteScroll = memo(({ 
  onLoadMore, 
  hasMore = true, 
  isLoading = false, 
  threshold = 200,
  children,
  loader,
  endMessage,
  className = ''
}) => {
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);

  // إنشاء Intersection Observer
  const handleObserver = useCallback((entries) => {
    const [entry] = entries;
    if (entry.isIntersecting && hasMore && !isLoading) {
      onLoadMore();
    }
  }, [hasMore, isLoading, onLoadMore]);

  useEffect(() => {
    const option = {
      root: null,
      rootMargin: `${threshold}px`,
      threshold: 0.1
    };

    observerRef.current = new IntersectionObserver(handleObserver, option);

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver, threshold]);

  // مكون التحميل الافتراضي
  const defaultLoader = (
    <div className="flex justify-center items-center py-4">
      <Loader2 className="w-6 h-6 animate-spin text-[#FF6B00]" />
      <span className="mr-2 text-sm text-gray-500">جاري التحميل...</span>
    </div>
  );

  // رسالة نهاية القائمة الافتراضية
  const defaultEndMessage = (
    <div className="text-center py-4 text-sm text-gray-400">
      لا توجد عناصر أخرى
    </div>
  );

  return (
    <div className={className}>
      {children}
      
      {/* نقطة المراقبة */}
      <div ref={loadMoreRef} className="h-1" />
      
      {/* مؤشر التحميل */}
      {isLoading && (loader || defaultLoader)}
      
      {/* رسالة نهاية القائمة */}
      {!hasMore && !isLoading && (endMessage || defaultEndMessage)}
    </div>
  );
});

InfiniteScroll.displayName = 'InfiniteScroll';

export default InfiniteScroll;
