import { useRef, useCallback, useMemo } from 'react';

/**
 * Hook لتشغيل أصوات التنبيه المختلفة حسب نوع الطلب
 * 
 * أنواع الأصوات:
 * - food: صوت للطلبات الطعام (نغمة مرحة)
 * - product: صوت للمنتجات (نغمة كلاسيكية)
 * - priority: صوت للطلبات ذات الأولوية (نغمة عاجلة)
 * - default: الصوت الافتراضي
 */

// إنشاء صوت باستخدام Web Audio API
const createTone = (audioContext, frequency, duration, type = 'sine') => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = type;
  
  // تأثير Fade out
  gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
};

// تشغيل نغمة الطعام (مرحة - نغمتين صاعدتين)
const playFoodSound = (audioContext) => {
  // نغمة مرحة: C5 -> E5 -> G5
  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
  notes.forEach((freq, i) => {
    setTimeout(() => {
      createTone(audioContext, freq, 0.15, 'sine');
    }, i * 100);
  });
};

// تشغيل نغمة المنتجات (كلاسيكية - نغمة واحدة)
const playProductSound = (audioContext) => {
  // نغمة كلاسيكية: G4 -> C5
  createTone(audioContext, 392, 0.2, 'triangle');
  setTimeout(() => {
    createTone(audioContext, 523.25, 0.3, 'triangle');
  }, 150);
};

// تشغيل نغمة الأولوية (عاجلة - سريعة ومتكررة)
const playPrioritySound = (audioContext) => {
  // نغمة عاجلة: تكرار سريع
  const playBeep = (delay) => {
    setTimeout(() => {
      createTone(audioContext, 880, 0.1, 'square'); // A5
    }, delay);
  };
  
  playBeep(0);
  playBeep(150);
  playBeep(300);
};

// تشغيل نغمة النجاح (للتأكيد)
const playSuccessSound = (audioContext) => {
  // نغمة نجاح: C5 -> G5
  createTone(audioContext, 523.25, 0.15, 'sine');
  setTimeout(() => {
    createTone(audioContext, 783.99, 0.25, 'sine');
  }, 100);
};

export const useNotificationSound = () => {
  const audioContextRef = useRef(null);
  const audioRef = useRef(null); // للصوت الافتراضي من ملف

  // إنشاء AudioContext عند الحاجة
  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    // استئناف السياق إذا كان معلقاً
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    return audioContextRef.current;
  }, []);

  // تشغيل الصوت الافتراضي من ملف MP3
  const playDefaultSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/notification.mp3');
        audioRef.current.volume = 0.7;
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.log('تعذر تشغيل الصوت:', err.message);
      });
    } catch (error) {
      console.log('خطأ في تشغيل الصوت:', error);
    }
  }, []);

  /**
   * تشغيل صوت حسب نوع الإشعار
   * @param {string} type - نوع الصوت: 'food' | 'product' | 'priority' | 'success' | 'default'
   */
  const playSound = useCallback((type = 'default') => {
    try {
      const audioContext = getAudioContext();
      
      switch (type) {
        case 'food':
          playFoodSound(audioContext);
          break;
        case 'product':
          playProductSound(audioContext);
          break;
        case 'priority':
          playPrioritySound(audioContext);
          break;
        case 'success':
          playSuccessSound(audioContext);
          break;
        default:
          // استخدام الصوت الافتراضي من الملف
          playDefaultSound();
          break;
      }
    } catch (error) {
      console.log('خطأ في تشغيل الصوت:', error);
      // fallback للصوت الافتراضي
      playDefaultSound();
    }
  }, [getAudioContext, playDefaultSound]);

  const stopSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  // أصوات محددة مسبقاً للاستخدام المباشر
  const sounds = useMemo(() => ({
    playFood: () => playSound('food'),
    playProduct: () => playSound('product'),
    playPriority: () => playSound('priority'),
    playSuccess: () => playSound('success'),
    playDefault: () => playSound('default'),
  }), [playSound]);

  return { 
    playSound, 
    stopSound,
    ...sounds
  };
};

export default useNotificationSound;
