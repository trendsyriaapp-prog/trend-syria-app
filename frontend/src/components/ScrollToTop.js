// مكون لإدارة موقع التمرير عند التنقل - بدون قفزة
import { useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// تعطيل استعادة التمرير الافتراضية للمتصفح
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

const ScrollToTop = () => {
  const { pathname, search } = useLocation();
  const navigationType = useNavigationType();
  const fullPath = pathname + search;
  const [isReady, setIsReady] = useState(true);

  // حفظ موقع التمرير باستمرار
  useLayoutEffect(() => {
    const savePosition = () => {
      sessionStorage.setItem(`scrollY_${fullPath}`, String(window.scrollY));
    };

    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          savePosition();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    savePosition();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      savePosition();
    };
  }, [fullPath]);

  // التعامل مع التنقل
  useLayoutEffect(() => {
    if (navigationType === 'POP') {
      // الرجوع - استعادة الموقع فوراً
      const saved = sessionStorage.getItem(`scrollY_${fullPath}`);
      if (saved) {
        const pos = parseInt(saved, 10);
        window.scrollTo(0, pos);
      }
    } else {
      // صفحة جديدة
      window.scrollTo(0, 0);
    }
  }, [fullPath, navigationType]);

  return null;
};

export default ScrollToTop;
