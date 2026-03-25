// /app/frontend/src/hooks/useBackButton.js
// معالج زر الرجوع في الأندرويد
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export const useBackButton = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // فقط في بيئة الأندرويد
    if (!Capacitor.isNativePlatform()) return;

    const handleBackButton = () => {
      // الصفحات الرئيسية التي يجب الخروج منها عند الضغط على الرجوع
      const mainPages = ['/', '/home', '/products', '/food'];
      
      if (mainPages.includes(location.pathname)) {
        // في الصفحة الرئيسية - تأكيد الخروج
        App.exitApp();
      } else {
        // في صفحة فرعية - الرجوع للخلف
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

export default useBackButton;
