// مكون لإدارة موقع التمرير عند التنقل - بدون قفزة
import { useLayoutEffect, useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// تعطيل استعادة التمرير الافتراضية للمتصفح
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

// حفظ موقع التمرير قبل أي click على رابط
let currentScrollY = 0;
let currentPath = '/';
let documentHeight = 0;

if (typeof window !== 'undefined') {
  // تتبع موقع التمرير وارتفاع المستند
  const updateScrollInfo = () => {
    currentScrollY = window.scrollY;
    documentHeight = document.documentElement.scrollHeight;
  };
  
  window.addEventListener('scroll', updateScrollInfo, { passive: true });
  
  // تحديث الارتفاع عند تغيير حجم النافذة
  window.addEventListener('resize', updateScrollInfo, { passive: true });

  // حفظ الموقع والنسبة عند الضغط على أي رابط
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (link && !link.href.startsWith('javascript:')) {
      const scrollRatio = documentHeight > 0 ? currentScrollY / documentHeight : 0;
      sessionStorage.setItem(`scrollPos_${currentPath}`, String(currentScrollY));
      sessionStorage.setItem(`scrollRatio_${currentPath}`, String(scrollRatio));
      sessionStorage.setItem(`scrollHeight_${currentPath}`, String(documentHeight));
    }
  }, true);
  
  // إضافة CSS للإخفاء السريع
  const style = document.createElement('style');
  style.textContent = `
    #root.hide-scroll {
      visibility: hidden !important;
    }
  `;
  document.head.appendChild(style);
}

const ScrollToTop = () => {
  const { pathname, search } = useLocation();
  const navigationType = useNavigationType();
  const fullPath = pathname + search;
  const hasRestored = useRef(false);

  // تحديث المسار الحالي
  useEffect(() => {
    currentPath = fullPath;
    currentScrollY = window.scrollY;
    documentHeight = document.documentElement.scrollHeight;
    hasRestored.current = false;
  }, [fullPath]);

  // التعامل مع التنقل
  useLayoutEffect(() => {
    const root = document.getElementById('root');
    
    if (navigationType === 'POP' && !hasRestored.current) {
      const savedPos = sessionStorage.getItem(`scrollPos_${fullPath}`);
      const savedRatio = sessionStorage.getItem(`scrollRatio_${fullPath}`);
      
      if (savedPos && savedRatio) {
        const pos = parseInt(savedPos, 10);
        const ratio = parseFloat(savedRatio);
        
        if (pos > 50) {
          // إخفاء فوري
          if (root) root.classList.add('hide-scroll');
          
          // محاولة التمرير للموقع المحفوظ
          window.scrollTo(0, pos);
          
          // إعادة المحاولة بعد تحميل المحتوى باستخدام النسبة
          const restoreWithRatio = () => {
            const newHeight = document.documentElement.scrollHeight;
            const calculatedPos = Math.round(ratio * newHeight);
            
            // استخدام الموقع المحسوب إذا كان أقرب للنسبة الأصلية
            if (Math.abs(calculatedPos - pos) > 200) {
              window.scrollTo(0, calculatedPos);
            } else {
              window.scrollTo(0, pos);
            }
            
            if (root) root.classList.remove('hide-scroll');
            hasRestored.current = true;
          };
          
          // انتظار تحميل المحتوى
          setTimeout(restoreWithRatio, 200);
          return;
        }
      }
    }
    
    // صفحة جديدة
    window.scrollTo(0, 0);
    if (root) root.classList.remove('hide-scroll');
  }, [fullPath, navigationType]);

  return null;
};

export default ScrollToTop;
