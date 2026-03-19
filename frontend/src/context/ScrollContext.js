import { createContext, useContext, useCallback, useEffect, useRef, useState, useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const ScrollContext = createContext();

// تعطيل استعادة التمرير التلقائية للمتصفح
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

export const ScrollProvider = ({ children }) => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const isRestoring = useRef(false);
  const lastPathname = useRef(location.pathname);
  const [isNavigatingBack, setIsNavigatingBack] = useState(false);
  const pendingScrollPosition = useRef(null);
  const scrollKey = useRef(0);
  const contentReadyRef = useRef(false);
  const currentScrollPath = useRef(location.pathname);
  const isNavigating = useRef(false);

  // حفظ موقع التمرير - فقط للمسار المحدد في ref
  const saveScrollPosition = useCallback((pathname) => {
    // لا تحفظ إذا كنا في منتصف الاستعادة أو التنقل أو إذا تغير المسار
    if (!isRestoring.current && !isNavigating.current && pathname === currentScrollPath.current) {
      const scrollY = window.scrollY;
      if (scrollY > 0) {
        sessionStorage.setItem(`scroll_${pathname}`, scrollY.toString());
      }
    }
  }, []);

  // استعادة موقع التمرير
  const restoreScrollPosition = useCallback((pathname) => {
    const saved = sessionStorage.getItem(`scroll_${pathname}`);
    if (saved !== null) {
      const position = parseInt(saved, 10);
      window.scrollTo({ top: position, behavior: 'instant' });
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

  // إشارة لإتمام استعادة التمرير من الصفحة
  const signalContentReady = useCallback(() => {
    contentReadyRef.current = true;
    if (pendingScrollPosition.current !== null && isRestoring.current) {
      const position = pendingScrollPosition.current;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo({ top: position, behavior: 'instant' });
          pendingScrollPosition.current = null;
          isRestoring.current = false;
          setIsNavigatingBack(false);
        });
      });
    }
  }, []);

  // الاستماع للنقر على الروابط لتعيين isNavigating مبكراً
  useEffect(() => {
    const handleClick = (e) => {
      const link = e.target.closest('a');
      if (link && link.href) {
        try {
          const url = new URL(link.href);
          // إذا كان رابط داخلي ومختلف عن الصفحة الحالية
          if (url.origin === window.location.origin && url.pathname !== location.pathname) {
            // تعيين علامة التنقل فوراً
            isNavigating.current = true;
          }
        } catch (err) {
          // تجاهل الأخطاء
        }
      }
    };

    // استخدام capture للتأكد من أننا نلتقط الحدث أولاً
    document.addEventListener('click', handleClick, { capture: true });
    return () => document.removeEventListener('click', handleClick, { capture: true });
  }, [location.pathname]);

  // حفظ موقع التمرير أثناء التمرير
  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        // التقاط الحالة فوراً
        const navigating = isNavigating.current;
        const restoring = isRestoring.current;
        const pathToSave = currentScrollPath.current;
        const scrollY = window.scrollY;
        
        // لا تُجدول إذا كنا في حالة تنقل أو استعادة
        if (navigating || restoring) return;
        
        window.requestAnimationFrame(() => {
          ticking = false;
          // التحقق مرة أخرى داخل الـ callback
          if (isRestoring.current || isNavigating.current) return;
          if (pathToSave !== currentScrollPath.current) return;
          
          if (pathToSave && scrollY > 0) {
            // الحصول على القيمة المحفوظة حالياً
            const currentSaved = parseInt(sessionStorage.getItem(`scroll_${pathToSave}`) || '0', 10);
            
            // إذا كان التمرير الحالي قريب من المحفوظ أو أكبر منه، احفظ
            if (scrollY >= currentSaved || scrollY > currentSaved * 0.2) {
              sessionStorage.setItem(`scroll_${pathToSave}`, scrollY.toString());
            }
          }
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // التعامل مع تغيير المسار - useLayoutEffect يعمل قبل الرسم
  useLayoutEffect(() => {
    const currentPath = location.pathname;
    const previousPath = lastPathname.current;
    const isPop = navigationType === 'POP';
    const hasChanged = previousPath !== currentPath;
    
    if (!hasChanged) return;
    
    // إيقاف حفظ التمرير فوراً عند بدء التنقل
    isNavigating.current = true;
    
    // للتنقل للأمام (PUSH)
    // الآن نحدث المسار الحالي
    currentScrollPath.current = currentPath;
    lastPathname.current = currentPath;
    scrollKey.current += 1;
    contentReadyRef.current = false;
    
    // الحصول على موقع التمرير المحفوظ للصفحة الحالية
    const savedPosition = getScrollPosition(currentPath);
    
    // للتنقل الجديد (PUSH/REPLACE)، ابدأ من الأعلى فوراً
    if (!isPop) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      pendingScrollPosition.current = null;
      isRestoring.current = false;
      setIsNavigatingBack(false);
      
      // إلغاء علامة التنقل بعد استقرار الصفحة
      setTimeout(() => {
        isNavigating.current = false;
      }, 200);
      return;
    }
    
    // للرجوع للصفحة السابقة (POP) مع موقع محفوظ
    if (savedPosition > 0) {
      isRestoring.current = true;
      pendingScrollPosition.current = savedPosition;
      setIsNavigatingBack(true);
      
      // تثبيت ارتفاع الصفحة لمنع القفز أثناء التحميل
      const currentHeight = document.documentElement.scrollHeight;
      const minHeight = savedPosition + window.innerHeight;
      if (currentHeight < minHeight) {
        document.body.style.minHeight = `${minHeight}px`;
      }
      
      // استعادة فورية لتثبيت الموقع ومنع القفز
      window.scrollTo({ top: savedPosition, behavior: 'instant' });
      
      // إعادة المحاولة بشكل متكرر وسريع حتى يستقر المحتوى
      let attempts = 0;
      const maxAttempts = 30;
      const intervalId = setInterval(() => {
        attempts++;
        window.scrollTo({ top: savedPosition, behavior: 'instant' });
        
        if (contentReadyRef.current || attempts >= maxAttempts) {
          clearInterval(intervalId);
          // إزالة الارتفاع الثابت بعد الاستقرار
          setTimeout(() => {
            document.body.style.minHeight = '';
            window.scrollTo({ top: savedPosition, behavior: 'instant' });
            pendingScrollPosition.current = null;
            isRestoring.current = false;
            isNavigating.current = false;  // إلغاء علامة التنقل
            setIsNavigatingBack(false);
          }, 50);
        }
      }, 30);

      return () => {
        clearInterval(intervalId);
      };
    } else {
      // لا يوجد موقع محفوظ، ابدأ من الأعلى
      window.scrollTo({ top: 0, behavior: 'instant' });
      pendingScrollPosition.current = null;
      isRestoring.current = false;
      isNavigating.current = false;  // إلغاء علامة التنقل
      setIsNavigatingBack(false);
    }
  }, [location.pathname, navigationType, getScrollPosition]);

  return (
    <ScrollContext.Provider value={{
      saveScrollPosition,
      restoreScrollPosition,
      clearScrollPosition,
      getScrollPosition,
      signalContentReady,
      isNavigatingBack,
      scrollKey: scrollKey.current
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
