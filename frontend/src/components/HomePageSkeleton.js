// /app/frontend/src/components/HomePageSkeleton.js
// Skeleton Loading للصفحة الرئيسية - تجربة احترافية مثل Instagram/Facebook

import React from 'react';

// تأثير Shimmer المتحرك
const shimmerClass = "animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]";

// Skeleton للشريط المتحرك (Ticker)
const TickerSkeleton = () => (
  <div className={`h-8 ${shimmerClass} rounded-lg mx-4 mb-2`} />
);

// Skeleton للأصناف
const CategoriesSkeleton = () => (
  <div className="px-4 mb-3">
    <div className="flex items-center justify-between mb-2">
      <div className={`h-5 w-20 ${shimmerClass} rounded`} />
      <div className={`h-4 w-16 ${shimmerClass} rounded`} />
    </div>
    <div className="flex gap-3 overflow-x-auto hide-scrollbar">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className={`w-14 h-14 ${shimmerClass} rounded-xl`} />
          <div className={`h-3 w-12 ${shimmerClass} rounded`} />
        </div>
      ))}
    </div>
  </div>
);

// Skeleton لبانر الطعام
const FoodBannerSkeleton = () => (
  <div className={`mx-4 h-20 ${shimmerClass} rounded-2xl mb-3`} />
);

// Skeleton لقسم المنتجات
const ProductsSectionSkeleton = ({ title = true }) => (
  <div className="px-4 mb-4">
    {title && (
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 ${shimmerClass} rounded-lg`} />
          <div className={`h-4 w-24 ${shimmerClass} rounded`} />
        </div>
        <div className={`h-4 w-16 ${shimmerClass} rounded`} />
      </div>
    )}
    <div className="flex gap-3 overflow-x-auto hide-scrollbar">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex-shrink-0 w-36">
          <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm">
            <div className={`aspect-square ${shimmerClass}`} />
            <div className="p-2 space-y-2">
              <div className={`h-3 ${shimmerClass} rounded w-3/4`} />
              <div className={`h-2 ${shimmerClass} rounded w-1/2`} />
              <div className={`h-4 ${shimmerClass} rounded w-2/3`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Skeleton الكامل للصفحة الرئيسية
const HomePageSkeleton = () => {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Ticker Skeleton */}
      <TickerSkeleton />
      
      {/* Categories Skeleton */}
      <CategoriesSkeleton />
      
      {/* Food Banner Skeleton */}
      <FoodBannerSkeleton />
      
      {/* الأكثر مبيعاً Skeleton */}
      <ProductsSectionSkeleton />
      
      {/* منتجات جديدة Skeleton */}
      <ProductsSectionSkeleton />
      
      {/* منتجات إضافية Skeleton */}
      <ProductsSectionSkeleton />
    </div>
  );
};

// تصدير المكونات الفرعية للاستخدام المنفصل
export { 
  TickerSkeleton, 
  CategoriesSkeleton, 
  FoodBannerSkeleton, 
  ProductsSectionSkeleton 
};

export default HomePageSkeleton;
