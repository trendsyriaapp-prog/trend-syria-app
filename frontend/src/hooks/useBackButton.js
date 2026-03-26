// /app/frontend/src/hooks/useBackButton.js
// معالج زر الرجوع في الأندرويد مع دعم الـ modals
import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

// قائمة عالمية لتخزين callbacks إغلاق الـ modals
const modalCloseCallbacks = new Set();

// دالة لتسجيل modal مفتوح
export const registerModalClose = (callback) => {
  modalCloseCallbacks.add(callback);
  return () => modalCloseCallbacks.delete(callback);
};

// دالة للتحقق من وجود modals مفتوحة
export const hasOpenModals = () => modalCloseCallbacks.size > 0;

// دالة لإغلاق آخر modal
export const closeLastModal = () => {
  const callbacks = Array.from(modalCloseCallbacks);
  if (callbacks.length > 0) {
    const lastCallback = callbacks[callbacks.length - 1];
    lastCallback();
    return true;
  }
  return false;
};

export const useBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // فقط في بيئة الأندرويد
    if (!Capacitor.isNativePlatform()) return;

    const handleBackButton = () => {
      // أولاً: التحقق من وجود modals مفتوحة
      if (closeLastModal()) {
        return; // تم إغلاق modal، لا نرجع للخلف
      }

      // الصفحات الرئيسية التي يجب الخروج منها عند الضغط على الرجوع
      const mainPages = ['/', '/home', '/delivery/dashboard'];
      
      const currentPath = location.pathname;
      
      if (mainPages.includes(currentPath)) {
        // في الصفحة الرئيسية - تأكيد الخروج
        App.exitApp();
      } else {
        // في أي صفحة أخرى - الرجوع للخلف
        navigate(-1);
      }
    };

    // الاستماع لحدث زر الرجوع
    const backButtonListener = App.addListener('backButton', handleBackButton);

    return () => {
      backButtonListener.then(listener => listener.remove());
    };
  }, [navigate, location.pathname]);
};

// Hook لتسجيل modal مع زر الرجوع
export const useModalBackHandler = (isOpen, onClose) => {
  useEffect(() => {
    if (!isOpen) return;
    
    // تسجيل callback الإغلاق
    const unregister = registerModalClose(onClose);
    
    return () => {
      unregister();
    };
  }, [isOpen, onClose]);
};

export default useBackButton;
