// /app/frontend/src/components/HomePageSkeleton.js
// Skeleton Loading محسّن للصفحة الرئيسية
// الأبعاد تطابق المحتوى الحقيقي لمنع "القفزات"

import React from 'react';

// ========== تأثير Shimmer محسّن ==========
const shimmerStyle = {
  background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite'
};

// Skeleton للشريط المتحرك (Ticker) - ارتفاع: 28px
const TickerSkeleton = () => (
  <div 
    className="h-7 mx-0 mb-0"
    style={{ ...shimmerStyle, borderRadius: 0 }}
  />
);

// Skeleton للأصناف - يطابق الأبعاد الحقيقية
const CategoriesSkeleton = () => (
  <div className="px-3 py-1.5">
    <div className="flex items-center justify-between mb-1.5">
      <div className="h-4 w-14 rounded" style={shimmerStyle} />
      <div className="h-3 w-12 rounded" style={shimmerStyle} />
    </div>
    <div className="flex gap-2 overflow-x-auto hide-scrollbar">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0 w-[56px]">
          {/* أيقونة الصنف: w-10 h-10 */}
          <div className="w-10 h-10 rounded-xl" style={shimmerStyle} />
          {/* اسم الصنف */}
          <div className="h-2.5 w-10 rounded" style={shimmerStyle} />
        </div>
      ))}
    </div>
  </div>
);

// Skeleton لبانر الطعام - ارتفاع: 56px
const FoodBannerSkeleton = () => (
  <div 
    className="h-14 md:h-16"
    style={shimmerStyle}
  />
);

// Skeleton لقسم المنتجات - يطابق بطاقة المنتج الحقيقية (w-36)
const ProductsSectionSkeleton = ({ showHeader = true, count = 4 }) => (
  <div className="py-1.5">
    <div className="max-w-7xl mx-auto px-3">
      {showHeader && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {/* أيقونة القسم */}
            <div className="w-6 h-6 rounded-lg" style={shimmerStyle} />
            {/* عنوان القسم */}
            <div className="h-4 w-20 rounded" style={shimmerStyle} />
          </div>
          {/* رابط عرض الكل */}
          <div className="h-3 w-14 rounded" style={shimmerStyle} />
        </div>
      )}
      
      {/* المنتجات - minHeight: 200px لمطابقة الحقيقي */}
      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2" style={{ minHeight: '200px' }}>
        {[...Array(count)].map((_, i) => (
          <div key={i} className="flex-shrink-0 w-36">
            <div className="bg-white rounded-xl overflow-hidden border-2 border-gray-100">
              {/* صورة المنتج: aspect-square */}
              <div className="aspect-square" style={shimmerStyle} />
              <div className="p-2 space-y-2">
                {/* اسم المنتج */}
                <div className="h-3.5 rounded w-4/5" style={shimmerStyle} />
                {/* المدينة */}
                <div className="h-2.5 rounded w-1/2" style={shimmerStyle} />
                {/* السعر */}
                <div className="h-4 rounded w-3/5" style={shimmerStyle} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Skeleton لشبكة المنتجات الإضافية
const ProductsGridSkeleton = ({ count = 8 }) => (
  <div className="py-4 bg-white">
    <div className="max-w-7xl mx-auto px-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg" style={shimmerStyle} />
          <div className="h-4 w-28 rounded" style={shimmerStyle} />
        </div>
        <div className="h-3 w-14 rounded" style={shimmerStyle} />
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {[...Array(count)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl overflow-hidden border border-gray-100">
            <div className="aspect-[4/5]" style={shimmerStyle} />
            <div className="p-2 space-y-2">
              <div className="h-3 rounded w-3/4" style={shimmerStyle} />
              <div className="h-2.5 rounded w-1/2" style={shimmerStyle} />
              <div className="h-4 rounded w-2/3" style={shimmerStyle} />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Skeleton كامل للصفحة الرئيسية
const HomePageSkeleton = () => {
  return (
    <div className="min-h-screen bg-[#FAFAFA] pb-20 md:pb-0">
      {/* CSS للـ Shimmer Animation */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      
      {/* Ticker Skeleton */}
      <TickerSkeleton />
      
      {/* Categories Skeleton */}
      <CategoriesSkeleton />
      
      {/* Food Banner Skeleton */}
      <FoodBannerSkeleton />
      
      {/* Daily Deal Skeleton */}
      <div className="px-3 py-2">
        <div className="h-24 rounded-2xl" style={shimmerStyle} />
      </div>
      
      {/* Sponsored Products Skeleton */}
      <ProductsSectionSkeleton count={4} />
      
      {/* Flash Sale Skeleton */}
      <ProductsSectionSkeleton count={4} />
      
      {/* Free Shipping Skeleton */}
      <ProductsSectionSkeleton count={4} />
      
      {/* Best Sellers Skeleton */}
      <ProductsSectionSkeleton count={4} />
      
      {/* New Arrivals Skeleton */}
      <ProductsSectionSkeleton count={4} />
      
      {/* Extra Products Grid Skeleton */}
      <ProductsGridSkeleton count={8} />
    </div>
  );
};

// تصدير المكونات الفرعية
export { 
  TickerSkeleton, 
  CategoriesSkeleton, 
  FoodBannerSkeleton, 
  ProductsSectionSkeleton,
  ProductsGridSkeleton
};

export default HomePageSkeleton;
