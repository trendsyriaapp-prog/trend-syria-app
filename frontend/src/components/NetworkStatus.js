// /app/frontend/src/components/NetworkStatus.js
// مكون عرض حالة الاتصال بالإنترنت

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, RefreshCw, Check } from 'lucide-react';
import { useConnectionIndicator, useSyncManager } from '../hooks/useOffline';

const NetworkStatus = () => {
  const { isOnline, showOffline, showReconnected } = useConnectionIndicator();
  const { isSyncing, pendingCount } = useSyncManager();
  const [showSyncComplete, setShowSyncComplete] = useState(false);

  // إظهار رسالة اكتمال المزامنة
  useEffect(() => {
    if (!isSyncing && pendingCount === 0 && showReconnected) {
      setShowSyncComplete(true);
      const timer = setTimeout(() => setShowSyncComplete(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSyncing, pendingCount, showReconnected]);

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
    </AnimatePresence>
  );
};

export default NetworkStatus;
