import { createContext, useContext, useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollContext = createContext();

// تعطيل استعادة التمرير التلقائية للمتصفح
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

export const ScrollProvider = ({ children }) => {
  const location = useLocation();
  const isRestoring = useRef(false);
  const lastPathname = useRef(location.pathname);

  // حفظ موقع التمرير
  const saveScrollPosition = useCallback((pathname) => {
    sessionStorage.setItem(`scroll_${pathname}`, window.scrollY.toString());
  }, []);

  // استعادة موقع التمرير
  const restoreScrollPosition = useCallback((pathname) => {
    const saved = sessionStorage.getItem(`scroll_${pathname}`);
    if (saved !== null) {
      const position = parseInt(saved, 10);
      window.scrollTo(0, position);
      return position;
    }
    return 0;
  }, []);

  // مسح موقع التمرير
  const clearScrollPosition = useCallback((pathname) => {
    sessionStorage.removeItem(`scroll_${pathname}`);
  }, []);

  // الحصول على موقع التمرير المحفوظ
  const getScrollPosition = useCallback((pathname) => {
    const pos = sessionStorage.getItem(`scroll_${pathname}`);
    return pos ? parseInt(pos, 10) : 0;
  }, []);

  // حفظ موقع التمرير أثناء التمرير
  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking && !isRestoring.current) {
        window.requestAnimationFrame(() => {
          saveScrollPosition(location.pathname);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [location.pathname, saveScrollPosition]);

  // استعادة موقع التمرير عند تغيير الصفحة
  useEffect(() => {
    const savedPosition = getScrollPosition(location.pathname);
    const isNavigatingBack = lastPathname.current !== location.pathname;
    lastPathname.current = location.pathname;
    
    // للصفحات الجديدة، ابدأ من الأعلى
    if (savedPosition === 0 || !isNavigatingBack) {
      window.scrollTo(0, 0);
      return;
    }
    
    // للرجوع للصفحة السابقة
    isRestoring.current = true;
    
    // استعادة الموقع بعد تحميل المحتوى
    const restore = () => {
      window.scrollTo(0, savedPosition);
    };
    
    // استعادة فورية
    restore();
    
    // استعادات متكررة لضمان الموقع الصحيح
    const timers = [30, 80, 150, 300, 500].map(delay => 
      setTimeout(restore, delay)
    );

    const endTimer = setTimeout(() => {
      isRestoring.current = false;
    }, 600);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(endTimer);
    };
  }, [location.pathname, getScrollPosition]);

  return (
    <ScrollContext.Provider value={{
      saveScrollPosition,
      restoreScrollPosition,
      clearScrollPosition,
      getScrollPosition
    }}>
      {children}
    </ScrollContext.Provider>
  );
};

export const useScroll = () => {
  const context = useContext(ScrollContext);
  if (!context) {
    throw new Error('useScroll must be used within a ScrollProvider');
  }
  return context;
};
