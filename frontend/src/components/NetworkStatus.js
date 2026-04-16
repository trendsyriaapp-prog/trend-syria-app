// /app/frontend/src/components/NetworkStatus.js
// مكون عرض حالة الاتصال بالإنترنت مع مؤشر جودة الشبكة

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, Check, Signal, SignalLow, SignalMedium, SignalHigh } from 'lucide-react';
import { useConnectionIndicator, useSyncManager } from '../hooks/useOffline';

/**
 * الحصول على معلومات الاتصال
 */
const getConnectionInfo = () => {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  
  if (!connection) {
    return {
      type: 'unknown',
      effectiveType: 'unknown',
      downlink: null,
      rtt: null,
      saveData: false
    };
  }
  
  return {
    type: connection.type || 'unknown',
    effectiveType: connection.effectiveType || 'unknown',
    downlink: connection.downlink,
    rtt: connection.rtt,
    saveData: connection.saveData || false
  };
};

/**
 * تقدير جودة الإنترنت
 */
const estimateConnectionQuality = () => {
  const info = getConnectionInfo();
  
  if (info.effectiveType === 'slow-2g' || info.effectiveType === '2g') {
    return { quality: 'poor', label: 'ضعيف', color: 'red' };
  } else if (info.effectiveType === '3g') {
    return { quality: 'fair', label: 'متوسط', color: 'yellow' };
  } else if (info.effectiveType === '4g') {
    return { quality: 'good', label: 'جيد', color: 'green' };
  }
  
  if (info.rtt !== null) {
    if (info.rtt > 500) {
      return { quality: 'poor', label: 'ضعيف', color: 'red' };
    } else if (info.rtt > 200) {
      return { quality: 'fair', label: 'متوسط', color: 'yellow' };
    } else {
      return { quality: 'good', label: 'جيد', color: 'green' };
    }
  }
  
  return { quality: 'unknown', label: 'غير معروف', color: 'gray' };
};

const NetworkStatus = () => {
  const { isOnline, showOffline, showReconnected } = useConnectionIndicator();
  const { isSyncing, pendingCount } = useSyncManager();
  const [showSyncComplete, setShowSyncComplete] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState({ quality: 'unknown', label: '', color: 'gray' });
  const [showQualityIndicator, setShowQualityIndicator] = useState(false);

  // تحديث جودة الاتصال
  useEffect(() => {
    const updateQuality = () => {
      if (isOnline) {
        setConnectionQuality(estimateConnectionQuality());
      }
    };

    updateQuality();
    
    // الاستماع لتغييرات الاتصال
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (connection) {
      connection.addEventListener('change', updateQuality);
      return () => connection.removeEventListener('change', updateQuality);
    }
  }, [isOnline]);

  // إظهار مؤشر الجودة لبضع ثواني عند تغير الحالة
  useEffect(() => {
    if (showReconnected && connectionQuality.quality !== 'unknown') {
      setShowQualityIndicator(true);
      const timer = setTimeout(() => setShowQualityIndicator(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showReconnected, connectionQuality]);

  // إظهار رسالة اكتمال المزامنة
  useEffect(() => {
    if (!isSyncing && pendingCount === 0 && showReconnected) {
      setShowSyncComplete(true);
      const timer = setTimeout(() => setShowSyncComplete(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSyncing, pendingCount, showReconnected]);

  // أيقونة جودة الشبكة
  const QualityIcon = () => {
    switch (connectionQuality.quality) {
      case 'poor':
        return <SignalLow className="w-4 h-4 text-red-400" />;
      case 'fair':
        return <SignalMedium className="w-4 h-4 text-yellow-400" />;
      case 'good':
        return <SignalHigh className="w-4 h-4 text-green-400" />;
      default:
        return <Signal className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <AnimatePresence>
      {/* شريط Offline */}
      {showOffline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-gray-800 to-gray-900 text-white px-4 py-3 shadow-lg"
        >
          <div className="max-w-lg mx-auto flex items-center justify-center gap-3">
            <WifiOff className="w-5 h-5 text-red-400 animate-pulse" />
            <div className="text-center">
              <p className="font-medium text-sm">أنت غير متصل بالإنترنت</p>
              <p className="text-xs text-gray-300">يمكنك تصفح المنتجات المحفوظة</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* شريط عودة الاتصال */}
      {showReconnected && !showOffline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-3 shadow-lg"
        >
          <div className="max-w-lg mx-auto flex items-center justify-center gap-3">
            {isSyncing ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <p className="font-medium text-sm">جاري المزامنة...</p>
              </>
            ) : showSyncComplete ? (
              <>
                <Check className="w-5 h-5" />
                <p className="font-medium text-sm">تم التحديث!</p>
              </>
            ) : (
              <>
                <Wifi className="w-5 h-5" />
                <p className="font-medium text-sm">عاد الاتصال بالإنترنت</p>
                {showQualityIndicator && connectionQuality.quality !== 'unknown' && (
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <QualityIcon />
                    {connectionQuality.label}
                  </span>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* عداد العمليات المعلقة */}
      {pendingCount > 0 && isOnline && !showReconnected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          className="fixed bottom-24 left-4 z-50 bg-amber-500 text-white rounded-full px-3 py-2 shadow-lg flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span className="text-xs font-medium">{pendingCount} في الانتظار</span>
        </motion.div>
      )}

      {/* مؤشر جودة الشبكة الضعيفة (يظهر دائماً إذا كانت الشبكة ضعيفة) */}
      {isOnline && !showOffline && !showReconnected && connectionQuality.quality === 'poor' && (
        <motion.div
          initial={{ x: 100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 100, opacity: 0 }}
          className="fixed top-20 right-2 z-50 bg-red-500/90 text-white rounded-lg px-2 py-1 shadow-lg flex items-center gap-1"
        >
          <SignalLow className="w-3 h-3" />
          <span className="text-[10px] font-medium">إنترنت ضعيف</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NetworkStatus;
