// مكون لإدارة موقع التمرير - يستخدم ScrollContext للحفظ
import { useLayoutEffect, useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// تعطيل استعادة التمرير الافتراضية
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

let isRestoring = false;

if (typeof window !== 'undefined') {
  // CSS للإخفاء السريع
  const style = document.createElement('style');
  style.textContent = '#root.h{visibility:hidden!important}';
  document.head.appendChild(style);
}

const ScrollToTop = () => {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const targetPos = useRef(0);

  // الحفاظ على الموقع أثناء تحميل المحتوى
  useEffect(() => {
    if (!isRestoring || targetPos.current === 0) return;

    let frameId;
    let attempts = 0;
    
    const maintain = () => {
      if (attempts >= 30 || !isRestoring) return;
      
      if (Math.abs(window.scrollY - targetPos.current) > 20) {
        window.scrollTo(0, targetPos.current);
      }
      
      attempts++;
      frameId = requestAnimationFrame(maintain);
    };
    
    frameId = requestAnimationFrame(maintain);
    
    const timeout = setTimeout(() => {
      isRestoring = false;
      cancelAnimationFrame(frameId);
      document.getElementById('root')?.classList.remove('h');
    }, 500);
    
    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(frameId);
    };
  }, [pathname, navigationType]);

  useLayoutEffect(() => {
    const root = document.getElementById('root');
    
    if (navigationType === 'POP') {
      // استخدام scroll_/ كما يحفظ ScrollContext
      const saved = sessionStorage.getItem(`scroll_${pathname}`);
      if (saved) {
        const pos = parseInt(saved, 10);
        if (pos > 0) {
          isRestoring = true;
          root?.classList.add('h');
          targetPos.current = pos;
          
          window.scrollTo(0, pos);
          
          requestAnimationFrame(() => {
            window.scrollTo(0, pos);
            setTimeout(() => {
              root?.classList.remove('h');
              setTimeout(() => { isRestoring = false; }, 100);
            }, 50);
          });
          return;
        }
      }
    }
    
    window.scrollTo(0, 0);
    targetPos.current = 0;
    isRestoring = false;
    root?.classList.remove('h');
  }, [pathname, navigationType]);

  return null;
};

export default ScrollToTop;
