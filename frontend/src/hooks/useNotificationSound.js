import { useRef, useCallback } from 'react';

/**
 * Hook لتشغيل صوت التنبيه عند وصول طلبات جديدة
 */
export const useNotificationSound = () => {
  const audioRef = useRef(null);

  const playSound = useCallback(() => {
    try {
      // إنشاء عنصر الصوت إذا لم يكن موجوداً
      if (!audioRef.current) {
        audioRef.current = new Audio('/notification.mp3');
        audioRef.current.volume = 0.7;
      }
      
      // إعادة تشغيل الصوت من البداية
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.log('تعذر تشغيل الصوت:', err.message);
      });
    } catch (error) {
      console.log('خطأ في تشغيل الصوت:', error);
    }
  }, []);

  const stopSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  return { playSound, stopSound };
};

export default useNotificationSound;
