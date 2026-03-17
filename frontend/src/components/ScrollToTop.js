// مكون لإدارة موقع التمرير عند التنقل - بدون قفزة
import { useLayoutEffect, useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// تعطيل استعادة التمرير الافتراضية للمتصفح
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

// حفظ موقع التمرير قبل أي click على رابط
let currentScrollY = 0;
let currentPath = '/';

if (typeof window !== 'undefined') {
  // تتبع موقع التمرير دائماً
  window.addEventListener('scroll', () => {
    currentScrollY = window.scrollY;
  }, { passive: true });

  // حفظ الموقع عند الضغط على أي رابط
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (link && !link.href.startsWith('javascript:')) {
      sessionStorage.setItem(`scrollPos_${currentPath}`, String(currentScrollY));
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

  // تحديث المسار الحالي
  useEffect(() => {
    currentPath = fullPath;
    currentScrollY = window.scrollY;
  }, [fullPath]);

  // التعامل مع التنقل
  useLayoutEffect(() => {
    const root = document.getElementById('root');
    
    if (navigationType === 'POP') {
      const saved = sessionStorage.getItem(`scrollPos_${fullPath}`);
      if (saved) {
        const pos = parseInt(saved, 10);
        if (pos > 50) {
          // إخفاء فوري
          if (root) root.classList.add('hide-scroll');
          
          // تمرير
          window.scrollTo(0, pos);
          
          // إظهار بعد استقرار المحتوى
          setTimeout(() => {
            window.scrollTo(0, pos);
            if (root) root.classList.remove('hide-scroll');
          }, 150);
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
