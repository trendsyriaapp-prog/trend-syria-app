// مكون لإدارة موقع التمرير عند التنقل
import { useEffect, useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// تعطيل استعادة التمرير الافتراضية للمتصفح
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

const ScrollToTop = () => {
  const { pathname, search, key } = useLocation();
  const navigationType = useNavigationType();

  // حفظ موقع التمرير باستمرار
  useEffect(() => {
    const saveScroll = () => {
      if (key) {
        sessionStorage.setItem(`scroll_${key}`, String(window.scrollY));
      }
    };

    // حفظ عند كل تمرير
    let timeout;
    const handleScroll = () => {
      clearTimeout(timeout);
      timeout = setTimeout(saveScroll, 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('scroll', handleScroll);
      saveScroll(); // حفظ أخير قبل المغادرة
    };
  }, [key]);

  // استعادة أو إعادة التعيين عند التنقل
  useLayoutEffect(() => {
    if (navigationType === 'POP' && key) {
      // الرجوع للخلف - استعادة الموقع
      const saved = sessionStorage.getItem(`scroll_${key}`);
      if (saved) {
        const pos = parseInt(saved, 10);
        requestAnimationFrame(() => {
          window.scrollTo(0, pos);
        });
        return;
      }
    }
    
    // صفحة جديدة - الذهاب للأعلى
    window.scrollTo(0, 0);
  }, [pathname, search, key, navigationType]);

  return null;
};

export default ScrollToTop;
