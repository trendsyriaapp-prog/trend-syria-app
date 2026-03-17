// استعادة موقع التمرير - الحل النهائي
// يحفظ الموقع بشكل مستمر ويستعيده عند الرجوع
import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

// تعطيل استعادة التمرير الافتراضية للمتصفح
if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

// تخزين المواقع
const positions = {};
let currentUrl = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';
let navigationPending = false;

function savePosition(url, pos) {
  if (!url || pos === undefined || navigationPending) return;
  positions[url] = pos;
  try { sessionStorage.setItem(`_s_${url}`, String(pos)); } catch(e) {}
}

function getPosition(url) {
  if (positions[url] !== undefined) return positions[url];
  try {
    const val = sessionStorage.getItem(`_s_${url}`);
    if (val) {
      const num = parseInt(val, 10);
      positions[url] = num;
      return num;
    }
  } catch(e) {}
  return 0;
}

// Event Listeners العالمية
if (typeof window !== 'undefined') {
  // حفظ متواصل كل 100ms - يضمن الحفظ قبل أي تنقل
  setInterval(() => {
    if (!navigationPending) {
      savePosition(currentUrl, window.scrollY);
    }
  }, 100);

  // قفل الحفظ عند النقر على الروابط
  const lockNavigation = () => {
    navigationPending = true;
    setTimeout(() => { navigationPending = false; }, 3000);
  };
  
  document.addEventListener('click', (e) => {
    if (e.target.closest('a[href]')) lockNavigation();
  }, { capture: true });
  
  document.addEventListener('touchend', (e) => {
    if (e.target.closest('a[href]')) lockNavigation();
  }, { capture: true, passive: true });
}

const ScrollToTop = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const urlKey = location.pathname + location.search;
  const isFirstRender = useRef(true);

  // تحديث URL الحالي
  useEffect(() => {
    currentUrl = urlKey;
    navigationPending = false;
  }, [urlKey]);

  // استعادة أو تصفير الموقع
  useLayoutEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (navigationType === 'POP') {
      const pos = getPosition(urlKey);
      
      if (pos > 0) {
        window.scrollTo(0, pos);
        
        // محاولات متكررة للتعامل مع المحتوى الديناميكي
        [0, 50, 100, 200, 400, 600, 1000].forEach(t => {
          setTimeout(() => {
            if (Math.abs(window.scrollY - pos) > 50) {
              window.scrollTo(0, pos);
            }
          }, t);
        });
      }
    } else {
      window.scrollTo(0, 0);
    }
  }, [urlKey, navigationType]);

  return null;
};

export default ScrollToTop;
