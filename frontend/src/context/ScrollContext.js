import { createContext, useContext, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollContext = createContext();

export const ScrollProvider = ({ children }) => {
  const location = useLocation();

  // حفظ موقع التمرير في sessionStorage للصفحة الحالية
  const saveScrollPosition = useCallback((pathname) => {
    const key = `scroll_${pathname}`;
    sessionStorage.setItem(key, window.scrollY.toString());
  }, []);

  // استعادة موقع التمرير للصفحة
  const restoreScrollPosition = useCallback((pathname) => {
    const key = `scroll_${pathname}`;
    const savedPosition = sessionStorage.getItem(key);
    if (savedPosition !== null) {
      const position = parseInt(savedPosition, 10);
      // استخدام requestAnimationFrame لضمان أن المحتوى قد تم تحميله
      requestAnimationFrame(() => {
        setTimeout(() => {
          window.scrollTo({
            top: position,
            behavior: 'instant'
          });
        }, 100);
      });
      return true;
    }
    return false;
  }, []);

  // مسح موقع التمرير لصفحة معينة
  const clearScrollPosition = useCallback((pathname) => {
    const key = `scroll_${pathname}`;
    sessionStorage.removeItem(key);
  }, []);

  // الحصول على موقع التمرير المحفوظ
  const getScrollPosition = useCallback((pathname) => {
    const key = `scroll_${pathname}`;
    const pos = sessionStorage.getItem(key);
    return pos ? parseInt(pos, 10) : 0;
  }, []);

  // حفظ موقع التمرير عند كل تمرير
  useEffect(() => {
    let scrollTimeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        saveScrollPosition(location.pathname);
      }, 100);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [location.pathname, saveScrollPosition]);

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
