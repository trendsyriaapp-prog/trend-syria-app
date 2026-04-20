// /app/frontend/src/hooks/useOffline.js
// Hook للتعامل مع حالة Offline والمزامنة

import { useState, useEffect, useCallback } from 'react';
import logger from '../lib/logger';
import syncManager from '../lib/syncManager';

/**
 * Hook لمراقبة حالة الاتصال بالإنترنت
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (!navigator.onLine) return; // تأكيد إضافي
      
      // إذا كان offline سابقاً، نعلم أنه عاد
      if (wasOffline) {
        setWasOffline(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  return { isOnline, wasOffline };
};

/**
 * Hook لإدارة المزامنة الخلفية
 */
export const useSyncManager = () => {
  const [syncStatus, setSyncStatus] = useState({
    isSyncing: false,
    isOnline: navigator.onLine,
    pendingCount: 0,
    lastSync: null
  });

  useEffect(() => {
    // جلب الحالة الأولية
    syncManager.getStatus().then(setSyncStatus);

    // الاستماع للتحديثات
    const unsubscribe = syncManager.addListener((event, data) => {
      switch (event) {
        case 'sync_started':
          setSyncStatus(prev => ({ ...prev, isSyncing: true }));
          break;
        case 'sync_completed':
          syncManager.getStatus().then(setSyncStatus);
          break;
        case 'sync_error':
          setSyncStatus(prev => ({ ...prev, isSyncing: false }));
          break;
        case 'online':
          setSyncStatus(prev => ({ ...prev, isOnline: true }));
          break;
        case 'offline':
          setSyncStatus(prev => ({ ...prev, isOnline: false }));
          break;
        default:
          break;
      }
    });

    // بدء المزامنة الدورية
    syncManager.start();

    return () => {
      unsubscribe();
    };
  }, []);

  const forceSync = useCallback(async () => {
    return syncManager.force();
  }, []);

  return {
    ...syncStatus,
    forceSync
  };
};

/**
 * Hook للتخزين المحلي مع fallback
 */
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      logger.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      logger.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      logger.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
};

/**
 * Hook لعرض حالة الاتصال للمستخدم
 */
export const useConnectionIndicator = () => {
  const { isOnline, wasOffline } = useNetworkStatus();
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  return {
    isOnline,
    showOffline: !isOnline,
    showReconnected
  };
};

export default {
  useNetworkStatus,
  useSyncManager,
  useLocalStorage,
  useConnectionIndicator
};
