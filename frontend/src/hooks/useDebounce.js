// /app/frontend/src/hooks/useDebounce.js
// Hook لتأخير تنفيذ الدوال (مفيد للبحث)
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook لتأخير قيمة (Debounce Value)
 * @param {any} value - القيمة المراد تأخيرها
 * @param {number} delay - وقت التأخير بالميلي ثانية
 * @returns {any} - القيمة بعد التأخير
 */
export const useDebounce = (value, delay = 300) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook لتأخير تنفيذ دالة (Debounce Callback)
 * @param {Function} callback - الدالة المراد تأخيرها
 * @param {number} delay - وقت التأخير بالميلي ثانية
 * @returns {Function} - الدالة المؤخرة
 */
export const useDebouncedCallback = (callback, delay = 300) => {
  const timeoutRef = useRef(null);

  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);

  // تنظيف عند إلغاء المكون
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
};

/**
 * Hook لتأخير البحث مع حالة التحميل
 * @param {string} searchTerm - نص البحث
 * @param {number} delay - وقت التأخير
 * @returns {{ debouncedTerm: string, isSearching: boolean }}
 */
export const useSearchDebounce = (searchTerm, delay = 300) => {
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (searchTerm !== debouncedTerm) {
      setIsSearching(true);
    }

    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
      setIsSearching(false);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm, delay, debouncedTerm]);

  return { debouncedTerm, isSearching };
};

export default useDebounce;
