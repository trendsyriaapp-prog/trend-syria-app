// /app/frontend/src/components/delivery/orders-map/hooks/usePriorityOrders.js
// Hook لإدارة نظام طلبات الأولوية الذكية

import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import logger from '../../../../lib/logger';
import useNotificationSound from '../../../../hooks/useNotificationSound';
import { announcePriorityOrder, announceOrderAccepted, speakInstruction } from '../VoiceAnnouncements';

const API = process.env.REACT_APP_BACKEND_URL;

/**
 * Hook لإدارة نظام طلبات الأولوية الذكية
 * @param {number} activeOrdersCount - عدد الطلبات النشطة للسائق
 * @param {Function} onTakeFoodOrder - دالة تُستدعى عند قبول طلب طعام
 * @param {Function} setMapError - دالة لعرض الأخطاء
 */
const usePriorityOrders = (activeOrdersCount, onTakeFoodOrder, setMapError) => {
  const { playPriority, playSuccess } = useNotificationSound();
  
  // الحد الأقصى للطلبات
  const MAX_ORDERS_SAME_STORE = 7;

  // حالة الأولوية
  const [priorityOrder, setPriorityOrder] = useState(null);
  const [priorityCountdown, setPriorityCountdown] = useState(0);
  const [showPriorityPopup, setShowPriorityPopup] = useState(false);
  const [dismissedPriorityUntil, setDismissedPriorityUntil] = useState(0);

  // الطلبات المرفوضة
  const [rejectedOrderIds, setRejectedOrderIds] = useState(() => {
    try {
      const saved = localStorage.getItem('rejectedOrderIds');
      if (saved) {
        const parsed = JSON.parse(saved);
        const now = Date.now();
        // تنظيف الطلبات القديمة (أكثر من ساعة)
        const validEntries = parsed.filter(entry =>
          typeof entry === 'object' && entry.timestamp && (now - entry.timestamp) < 3600000
        );
        return validEntries.map(e => e.id);
      }
    } catch (e) {
      logger.log('Error loading rejected orders:', e);
    }
    return [];
  });

  const [maxLimitOrderIds, setMaxLimitOrderIds] = useState([]);
  const [previousOrderCount, setPreviousOrderCount] = useState(0);

  // Refs للحفاظ على القيم في intervals
  const priorityOrderRef = useRef(null);
  const showPriorityPopupRef = useRef(false);
  const rejectedOrderIdsRef = useRef([]);
  const maxLimitOrderIdsRef = useRef([]);

  // تحديث الـ refs
  useEffect(() => {
    priorityOrderRef.current = priorityOrder;
  }, [priorityOrder]);

  useEffect(() => {
    showPriorityPopupRef.current = showPriorityPopup;
  }, [showPriorityPopup]);

  useEffect(() => {
    rejectedOrderIdsRef.current = rejectedOrderIds;
  }, [rejectedOrderIds]);

  useEffect(() => {
    maxLimitOrderIdsRef.current = maxLimitOrderIds;
  }, [maxLimitOrderIds]);

  // مراقبة تغيير عدد الطلبات
  useEffect(() => {
    if (activeOrdersCount < previousOrderCount && maxLimitOrderIds.length > 0) {
      setMaxLimitOrderIds([]);
      maxLimitOrderIdsRef.current = [];
      logger.log('تم مسح الطلبات المؤجلة - أصبح لديك مجال لطلبات جديدة');
    }
    if (activeOrdersCount !== previousOrderCount) {
      setPreviousOrderCount(activeOrdersCount);
    }
  }, [activeOrdersCount, maxLimitOrderIds.length, previousOrderCount]);

  // جلب طلبات الأولوية كل 10 ثواني
  useEffect(() => {
    let intervalId = null;

    if (activeOrdersCount > 0) {
      const checkPriorityOrders = async () => {
        // تحقق إذا تم إيقاف الإشعارات مؤقتاً
        if (Date.now() < dismissedPriorityUntil) return;
        
        // لا تعرض popup جديد إذا كان هناك popup مفتوح
        if (showPriorityPopupRef.current) return;
        
        // التحقق من الحد الأقصى
        if (activeOrdersCount >= MAX_ORDERS_SAME_STORE) return;

        try {
          const response = await axios.get(`${API}/api/food/orders/delivery/priority-orders`);
          const priorityOrders = response.data.priority_orders || [];

          // تصفية الطلبات المرفوضة والمؤجلة
          const allExcludedIds = [...rejectedOrderIdsRef.current, ...maxLimitOrderIdsRef.current];

          // جلب قائمة المطاعم المرفوضة
          let rejectedStoreNames = [];
          try {
            const savedStores = JSON.parse(localStorage.getItem('rejectedStores') || '[]');
            const now = Date.now();
            const validStores = savedStores.filter(s => (now - s.timestamp) < 600000);
            localStorage.setItem('rejectedStores', JSON.stringify(validStores));
            rejectedStoreNames = validStores.map(s => s.name);
          } catch (e) {}

          // تصفية الطلبات
          const availableOrders = priorityOrders.filter(o => {
            if (allExcludedIds.includes(o.id)) return false;
            const storeName = o.store_name || o.restaurant_name;
            if (storeName && rejectedStoreNames.includes(storeName)) return false;
            return true;
          });

          // إذا وجد طلب جديد ذو أولوية
          if (availableOrders.length > 0) {
            const newPriorityOrder = availableOrders[0];
            setPriorityOrder(newPriorityOrder);
            setPriorityCountdown(25);
            setShowPriorityPopup(true);
            playPriority();
            announcePriorityOrder(newPriorityOrder.store_name);
          }
        } catch (error) {
          logger.error('Error checking priority orders:', error);
        }
      };

      const initialTimeout = setTimeout(checkPriorityOrders, 2000);
      intervalId = setInterval(checkPriorityOrders, 10000);

      return () => {
        clearTimeout(initialTimeout);
        if (intervalId) clearInterval(intervalId);
      };
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeOrdersCount, dismissedPriorityUntil, playPriority]);

  // العد التنازلي
  useEffect(() => {
    let countdownInterval = null;

    if (showPriorityPopup && priorityCountdown > 0) {
      countdownInterval = setInterval(() => {
        setPriorityCountdown(prev => {
          if (prev <= 1) {
            const currentOrder = priorityOrderRef.current;
            if (currentOrder) {
              const orderId = currentOrder.id;
              const storeName = currentOrder.store_name || currentOrder.restaurant_name;

              if (!rejectedOrderIdsRef.current.includes(orderId)) {
                rejectedOrderIdsRef.current = [...rejectedOrderIdsRef.current, orderId];
              }

              try {
                const savedData = JSON.parse(localStorage.getItem('rejectedOrderIds') || '[]');
                if (!savedData.find(e => e.id === orderId)) {
                  savedData.push({ id: orderId, timestamp: Date.now(), storeName, reason: 'timeout' });
                  localStorage.setItem('rejectedOrderIds', JSON.stringify(savedData));
                }

                if (storeName) {
                  const rejectedStores = JSON.parse(localStorage.getItem('rejectedStores') || '[]');
                  if (!rejectedStores.find(s => s.name === storeName)) {
                    rejectedStores.push({ name: storeName, timestamp: Date.now() });
                    localStorage.setItem('rejectedStores', JSON.stringify(rejectedStores));
                  }
                }
              } catch (e) {}
            }

            setShowPriorityPopup(false);
            setPriorityOrder(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (countdownInterval) clearInterval(countdownInterval);
    };
  }, [showPriorityPopup]);

  // قبول طلب الأولوية
  const acceptPriorityOrder = useCallback(async () => {
    if (!priorityOrder) return;

    try {
      await axios.post(`${API}/api/food/orders/delivery/${priorityOrder.id}/accept`);
      playSuccess();
      announceOrderAccepted(priorityOrder.order_number || priorityOrder.id?.slice(-4));
      setShowPriorityPopup(false);
      const acceptedOrder = priorityOrder;
      setPriorityOrder(null);
      onTakeFoodOrder?.(acceptedOrder);
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'حدث خطأ';

      const isMaxLimitError = errorMessage.includes('الحد الأقصى') ||
        errorMessage.includes('حد الطلبات') ||
        errorMessage.includes('maximum') ||
        errorMessage.includes('limit');

      if (isMaxLimitError) {
        const orderId = priorityOrder.id;
        setMaxLimitOrderIds(prev => prev.includes(orderId) ? prev : [...prev, orderId]);
        if (!maxLimitOrderIdsRef.current.includes(orderId)) {
          maxLimitOrderIdsRef.current = [...maxLimitOrderIdsRef.current, orderId];
        }
        setDismissedPriorityUntil(Date.now() + 60000);
      }

      setShowPriorityPopup(false);
      setPriorityOrder(null);
      setMapError?.(errorMessage);
      speakInstruction(errorMessage);
    }
  }, [priorityOrder, playSuccess, onTakeFoodOrder, setMapError]);

  // رفض طلب الأولوية
  const rejectPriorityOrder = useCallback(() => {
    if (priorityOrder) {
      const orderId = priorityOrder.id;
      const storeName = priorityOrder.store_name || priorityOrder.restaurant_name;

      const newRejectedIds = rejectedOrderIds.includes(orderId)
        ? rejectedOrderIds
        : [...rejectedOrderIds, orderId];

      setRejectedOrderIds(newRejectedIds);

      if (!rejectedOrderIdsRef.current.includes(orderId)) {
        rejectedOrderIdsRef.current = [...rejectedOrderIdsRef.current, orderId];
      }

      try {
        const savedData = JSON.parse(localStorage.getItem('rejectedOrderIds') || '[]');
        if (!savedData.find(e => e.id === orderId)) {
          savedData.push({ id: orderId, timestamp: Date.now(), storeName });
          localStorage.setItem('rejectedOrderIds', JSON.stringify(savedData));
        }

        if (storeName) {
          const rejectedStores = JSON.parse(localStorage.getItem('rejectedStores') || '[]');
          if (!rejectedStores.find(s => s.name === storeName)) {
            rejectedStores.push({ name: storeName, timestamp: Date.now() });
            localStorage.setItem('rejectedStores', JSON.stringify(rejectedStores));
          }
        }
      } catch (e) {}
    }

    setDismissedPriorityUntil(Date.now() + 60000);
    setShowPriorityPopup(false);
    setPriorityOrder(null);
  }, [priorityOrder, rejectedOrderIds]);

  return {
    priorityOrder,
    priorityCountdown,
    showPriorityPopup,
    acceptPriorityOrder,
    rejectPriorityOrder,
    rejectedOrderIds,
    maxLimitOrderIds
  };
};

export default usePriorityOrders;
