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
    // أولاً تحقق من window
    if (window.__savedScrollPositions && window.__savedScrollPositions[pathname] !== undefined) {
      const position = window.__savedScrollPositions[pathname];
      window.scrollTo({ top: position, behavior: 'instant' });
      return position;
    }
    // ثم من sessionStorage
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
    // أولاً تحقق من window (الأسرع)
    if (window.__savedScrollPositions && window.__savedScrollPositions[pathname] !== undefined) {
      return window.__savedScrollPositions[pathname];
    }
    // ثم من sessionStorage
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

  // حفظ آخر موضع تمرير معروف باستمرار (حل بسيط وموثوق)
  const lastKnownScrollRef = useRef({});
  
  useEffect(() => {
    const trackScroll = () => {
      const scrollY = window.scrollY;
      const path = location.pathname;
      // حفظ فقط إذا كان أكبر من 0 ولم نكن في حالة استعادة
      if (scrollY > 0 && !isRestoring.current && !isNavigating.current) {
        lastKnownScrollRef.current[path] = scrollY;
        // حفظ في sessionStorage بشكل دوري
        sessionStorage.setItem(`scroll_${path}`, scrollY.toString());
      }
    };
    
    // تتبع التمرير بشكل متكرر
    const interval = setInterval(trackScroll, 200);
    window.addEventListener('scroll', trackScroll, { passive: true });
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('scroll', trackScroll);
    };
  }, [location.pathname]);
  
  // حفظ الموضع فوراً قبل أي تغيير في المسار
  useEffect(() => {
    const saveBeforeNav = () => {
      const path = location.pathname;
      const scrollY = lastKnownScrollRef.current[path] || window.scrollY;
      if (scrollY > 0) {
        sessionStorage.setItem(`scroll_${path}`, scrollY.toString());
      }
    };
    
    // الحفظ عند أي نقرة (قبل التنقل)
    const handleAnyClick = () => {
      saveBeforeNav();
    };
    
    document.addEventListener('click', handleAnyClick, { capture: true });
    window.addEventListener('beforeunload', saveBeforeNav);
    
    return () => {
      document.removeEventListener('click', handleAnyClick, { capture: true });
      window.removeEventListener('beforeunload', saveBeforeNav);
    };
  }, [location.pathname]);

  // الاستماع للنقر على الروابط لتعيين isNavigating مبكراً
  useEffect(() => {
    const handleClick = (e) => {
      const link = e.target.closest('a');
      if (link && link.href) {
        try {
          const url = new URL(link.href);
          if (url.origin === window.location.origin && url.pathname !== location.pathname) {
            // حفظ الموضع الحالي فوراً
            const currentPath = location.pathname;
            const scrollY = lastKnownScrollRef.current[currentPath] || window.scrollY;
            
            if (scrollY > 0) {
              sessionStorage.setItem(`scroll_${currentPath}`, scrollY.toString());
            }
            
            isNavigating.current = true;
          }
        } catch (err) {}
      }
    };

    document.addEventListener('click', handleClick, { capture: true });
    return () => document.removeEventListener('click', handleClick, { capture: true });
  }, [location.pathname]);

  // حفظ موقع التمرير أثناء التمرير
  useEffect(() => {
    let ticking = false;
    let lastSaveTime = 0;
    const MIN_SAVE_INTERVAL = 100; // الحد الأدنى بين عمليات الحفظ
    
    const handleScroll = () => {
      if (!ticking) {
        // التقاط الحالة فوراً
        const navigating = isNavigating.current;
        const restoring = isRestoring.current;
        const pathToSave = currentScrollPath.current;
        const scrollY = window.scrollY;
        const now = Date.now();
        
        // لا تُجدول إذا كنا في حالة تنقل أو استعادة
        if (navigating || restoring) return;
        
        // لا تحفظ بشكل متكرر جداً
        if (now - lastSaveTime < MIN_SAVE_INTERVAL) return;
        
        // لا تحفظ إذا كان التمرير 0 (قد يكون بسبب الانتقال)
        if (scrollY === 0) return;
        
        // لا تكتب فوق القيمة المحمية
        if (sessionStorage.getItem(`scroll_protected_${pathToSave}`)) return;
        
        window.requestAnimationFrame(() => {
          ticking = false;
          // التحقق مرة أخرى داخل الـ callback
          if (isRestoring.current || isNavigating.current) return;
          if (pathToSave !== currentScrollPath.current) return;
          if (sessionStorage.getItem(`scroll_protected_${pathToSave}`)) return;
          
          if (pathToSave && scrollY > 0) {
            sessionStorage.setItem(`scroll_${pathToSave}`, scrollY.toString());
            lastSaveTime = Date.now();
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
    
    // للتنقل للأمام (PUSH) - لا نمسح القيمة المحفوظة للصفحة السابقة
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
      
      // إلغاء علامة التنقل بعد استقرار الصفحة - ولكن أبقِها أطول
      setTimeout(() => {
        isNavigating.current = false;
      }, 500);
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
