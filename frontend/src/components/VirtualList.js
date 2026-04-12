// /app/frontend/src/components/VirtualList.js
// مكون Virtual Scrolling للقوائم الطويلة
// يُحسّن الأداء بعرض العناصر المرئية فقط

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';

/**
 * مكون VirtualList للقوائم الطويلة
 * يعرض فقط العناصر المرئية + buffer للتمرير السلس
 */
const VirtualList = ({
  items = [],
  itemHeight = 100,
  containerHeight = 400,
  overscan = 3, // عدد العناصر الإضافية فوق وتحت
  renderItem,
  className = '',
  onEndReached, // callback عند الوصول للنهاية
  endReachedThreshold = 0.8, // نسبة التمرير لتفعيل onEndReached
  loading = false,
  LoadingComponent = null,
  EmptyComponent = null,
  keyExtractor = (item, index) => item?.id || index
}) => {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  
  // حساب العناصر المرئية
  const { visibleItems, startIndex, totalHeight, offsetY } = useMemo(() => {
    if (!items.length) {
      return { visibleItems: [], startIndex: 0, totalHeight: 0, offsetY: 0 };
    }
    
    const totalHeight = items.length * itemHeight;
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + (overscan * 2);
    const endIndex = Math.min(items.length, startIndex + visibleCount);
    
    const visibleItems = items.slice(startIndex, endIndex).map((item, i) => ({
      item,
      index: startIndex + i
    }));
    
    const offsetY = startIndex * itemHeight;
    
    return { visibleItems, startIndex, totalHeight, offsetY };
  }, [items, scrollTop, itemHeight, containerHeight, overscan]);
  
  // معالج التمرير
  const handleScroll = useCallback((e) => {
    const newScrollTop = e.target.scrollTop;
    setScrollTop(newScrollTop);
    setIsScrolling(true);
    
    // التحقق من الوصول للنهاية
    if (onEndReached) {
      const scrollHeight = e.target.scrollHeight;
      const scrollPosition = newScrollTop + containerHeight;
      const threshold = scrollHeight * endReachedThreshold;
      
      if (scrollPosition >= threshold) {
        onEndReached();
      }
    }
  }, [containerHeight, endReachedThreshold, onEndReached]);
  
  // إيقاف حالة التمرير بعد فترة
  useEffect(() => {
    if (isScrolling) {
      const timeout = setTimeout(() => setIsScrolling(false), 150);
      return () => clearTimeout(timeout);
    }
  }, [isScrolling, scrollTop]);
  
  // إذا لا توجد عناصر
  if (!items.length && !loading) {
    return EmptyComponent || (
      <div className={`flex items-center justify-center ${className}`} style={{ height: containerHeight }}>
        <p className="text-gray-500">لا توجد عناصر</p>
      </div>
    );
  }
  
  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      {/* Container بالارتفاع الكامل */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* العناصر المرئية */}
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map(({ item, index }) => (
            <div
              key={keyExtractor(item, index)}
              style={{ height: itemHeight }}
            >
              {renderItem(item, index, isScrolling)}
            </div>
          ))}
        </div>
      </div>
      
      {/* مؤشر التحميل */}
      {loading && (LoadingComponent || (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
        </div>
      ))}
    </div>
  );
};

/**
 * مكون VirtualGrid للشبكات
 * مُحسّن للمنتجات والبطاقات
 */
const VirtualGrid = ({
  items = [],
  itemHeight = 250,
  containerHeight = 600,
  columns = 2,
  gap = 12,
  overscan = 2,
  renderItem,
  className = '',
  onEndReached,
  endReachedThreshold = 0.8,
  loading = false,
  keyExtractor = (item, index) => item?.id || index
}) => {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  
  // حساب الصفوف المرئية
  const { visibleRows, totalHeight, offsetY } = useMemo(() => {
    const rowCount = Math.ceil(items.length / columns);
    const rowHeight = itemHeight + gap;
    const totalHeight = rowCount * rowHeight;
    
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const visibleRowCount = Math.ceil(containerHeight / rowHeight) + (overscan * 2);
    const endRow = Math.min(rowCount, startRow + visibleRowCount);
    
    const visibleRows = [];
    for (let row = startRow; row < endRow; row++) {
      const startIdx = row * columns;
      const endIdx = Math.min(startIdx + columns, items.length);
      visibleRows.push({
        row,
        items: items.slice(startIdx, endIdx).map((item, i) => ({
          item,
          index: startIdx + i
        }))
      });
    }
    
    const offsetY = startRow * rowHeight;
    
    return { visibleRows, totalHeight, offsetY };
  }, [items, scrollTop, itemHeight, columns, gap, containerHeight, overscan]);
  
  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
    
    if (onEndReached) {
      const scrollPosition = e.target.scrollTop + containerHeight;
      if (scrollPosition >= e.target.scrollHeight * endReachedThreshold) {
        onEndReached();
      }
    }
  }, [containerHeight, endReachedThreshold, onEndReached]);
  
  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleRows.map(({ row, items: rowItems }) => (
            <div
              key={row}
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gap: `${gap}px`,
                height: itemHeight + gap,
                paddingBottom: gap
              }}
            >
              {rowItems.map(({ item, index }) => (
                <div key={keyExtractor(item, index)}>
                  {renderItem(item, index)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      
      {loading && (
        <div className="flex justify-center py-4">
          <div className="w-6 h-6 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

/**
 * Hook للـ Infinite Scroll
 */
const useInfiniteScroll = (callback, options = {}) => {
  const { threshold = 100, enabled = true } = options;
  const observer = useRef(null);
  
  const lastElementRef = useCallback((node) => {
    if (!enabled) return;
    
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        callback();
      }
    }, {
      rootMargin: `${threshold}px`
    });
    
    if (node) observer.current.observe(node);
  }, [callback, threshold, enabled]);
  
  return lastElementRef;
};

export { VirtualList, VirtualGrid, useInfiniteScroll };
export default VirtualList;
