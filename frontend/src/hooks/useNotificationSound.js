import { useRef, useCallback, useMemo } from 'react';
import logger from '../lib/logger';

/**
 * Hook لتشغيل أصوات التنبيه المختلفة حسب نوع الطلب
 * 
 * أنواع الأصوات:
 * - food: صوت للطلبات الطعام (نغمة مرحة)
 * - product: صوت للمنتجات (نغمة كلاسيكية)
 * - priority: صوت للطلبات ذات الأولوية (نغمة عاجلة)
 * - default: الصوت الافتراضي
 * 
 * النغمات المتاحة:
 * - cheerful: مرحة (C5 → E5 → G5)
 * - classic: كلاسيكية (G4 → C5)
 * - urgent: عاجلة (beeps)
 * - bell: جرس
 * - soft: ناعمة
 * - digital: رقمية
 */

// تعريف النغمات المتاحة
export const AVAILABLE_TONES = [
  { id: 'cheerful', name: 'مرحة', nameEn: 'Cheerful', emoji: '🎵' },
  { id: 'classic', name: 'كلاسيكية', nameEn: 'Classic', emoji: '🎼' },
  { id: 'urgent', name: 'عاجلة', nameEn: 'Urgent', emoji: '⚡' },
  { id: 'bell', name: 'جرس', nameEn: 'Bell', emoji: '🔔' },
  { id: 'soft', name: 'ناعمة', nameEn: 'Soft', emoji: '🌙' },
  { id: 'digital', name: 'رقمية', nameEn: 'Digital', emoji: '💻' },
];

// إنشاء صوت باستخدام Web Audio API - صوت عالي جداً للسائقين
const createTone = (audioContext, frequency, duration, type = 'sine', volume = 1.0) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = type;
  
  // تأثير Fade out - صوت عالي
  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
};

// النغمات المختلفة - صوت عالي جداً
const tonePatterns = {
  // نغمة مرحة: C5 -> E5 -> G5 - مع تكرار للوضوح
  cheerful: (audioContext) => {
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      setTimeout(() => createTone(audioContext, freq, 0.2, 'sine', 1.0), i * 120);
    });
    // تكرار مرة أخرى
    setTimeout(() => {
      notes.forEach((freq, i) => {
        setTimeout(() => createTone(audioContext, freq, 0.2, 'sine', 1.0), i * 120);
      });
    }, 500);
  },
  
  // نغمة كلاسيكية: G4 -> C5 - أطول وأعلى
  classic: (audioContext) => {
    createTone(audioContext, 392, 0.3, 'triangle', 1.0);
    setTimeout(() => createTone(audioContext, 523.25, 0.4, 'triangle', 1.0), 200);
    // تكرار
    setTimeout(() => {
      createTone(audioContext, 392, 0.3, 'triangle', 1.0);
      setTimeout(() => createTone(audioContext, 523.25, 0.4, 'triangle', 1.0), 200);
    }, 600);
  },
  
  // نغمة عاجلة: beeps سريعة ومتكررة - للطلبات ذات الأولوية
  urgent: (audioContext) => {
    // تكرار 3 مرات
    for (let repeat = 0; repeat < 3; repeat++) {
      [0, 150, 300].forEach(delay => {
        setTimeout(() => createTone(audioContext, 880, 0.12, 'square', 1.0), delay + (repeat * 500));
      });
    }
  },
  
  // نغمة جرس - أقوى
  bell: (audioContext) => {
    createTone(audioContext, 659.25, 0.5, 'sine', 1.0); // E5
    setTimeout(() => createTone(audioContext, 523.25, 0.7, 'sine', 0.9), 250); // C5
    // تكرار
    setTimeout(() => {
      createTone(audioContext, 659.25, 0.5, 'sine', 1.0);
      setTimeout(() => createTone(audioContext, 523.25, 0.7, 'sine', 0.9), 250);
    }, 800);
  },
  
  // نغمة ناعمة - أعلى قليلاً
  soft: (audioContext) => {
    createTone(audioContext, 440, 0.6, 'sine', 0.8); // A4
    setTimeout(() => createTone(audioContext, 554.37, 0.5, 'sine', 0.7), 350); // C#5
  },
  
  // نغمة رقمية - أعلى وأطول
  digital: (audioContext) => {
    createTone(audioContext, 800, 0.12, 'square', 1.0);
    setTimeout(() => createTone(audioContext, 1000, 0.12, 'square', 1.0), 120);
    setTimeout(() => createTone(audioContext, 1200, 0.15, 'square', 1.0), 240);
    // تكرار
    setTimeout(() => {
      createTone(audioContext, 800, 0.12, 'square', 1.0);
      setTimeout(() => createTone(audioContext, 1000, 0.12, 'square', 1.0), 120);
      setTimeout(() => createTone(audioContext, 1200, 0.15, 'square', 1.0), 240);
    }, 500);
  },
};

// تشغيل نغمة النجاح (للتأكيد) - أعلى صوتاً
const playSuccessSound = (audioContext) => {
  createTone(audioContext, 523.25, 0.2, 'sine', 1.0);
  setTimeout(() => createTone(audioContext, 783.99, 0.3, 'sine', 1.0), 120);
};

// الحصول على النغمة المحفوظة من localStorage
const getSavedTone = (type) => {
  try {
    const saved = localStorage.getItem(`notificationTone_${type}`);
    return saved || getDefaultTone(type);
  } catch {
    return getDefaultTone(type);
  }
};

// النغمات الافتراضية لكل نوع
const getDefaultTone = (type) => {
  switch (type) {
    case 'food': return 'cheerful';
    case 'product': return 'classic';
    case 'priority': return 'urgent';
    default: return 'bell';
  }
};

// حفظ النغمة في localStorage
export const saveTonePreference = (type, toneId) => {
  try {
    localStorage.setItem(`notificationTone_${type}`, toneId);
  } catch (e) {
    logger.error('Error saving tone preference:', e);
  }
};

export const useNotificationSound = () => {
  const audioContextRef = useRef(null);
  const audioRef = useRef(null);

  // إنشاء AudioContext عند الحاجة
  const getAudioContext = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) {
          logger.warn('AudioContext غير مدعوم في هذا المتصفح');
          return null;
        }
        audioContextRef.current = new AudioContextClass();
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {
          logger.log('تعذر استئناف AudioContext');
        });
      }
      return audioContextRef.current;
    } catch (error) {
      logger.warn('خطأ في إنشاء AudioContext:', error);
      return null;
    }
  }, []);

  // تشغيل الصوت الافتراضي من ملف MP3 - صوت عالي
  const playDefaultSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio('/notification.mp3');
        audioRef.current.volume = 1.0; // أعلى صوت
      }
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        logger.log('تعذر تشغيل الصوت:', err.message);
      });
    } catch (error) {
      logger.log('خطأ في تشغيل الصوت:', error);
    }
  }, []);

  // تشغيل نغمة محددة
  const playTone = useCallback((toneId) => {
    try {
      const audioContext = getAudioContext();
      if (!audioContext) {
        playDefaultSound();
        return;
      }
      const toneFunction = tonePatterns[toneId];
      if (toneFunction) {
        toneFunction(audioContext);
      } else {
        playDefaultSound();
      }
    } catch (error) {
      logger.log('خطأ في تشغيل النغمة:', error);
      playDefaultSound();
    }
  }, [getAudioContext, playDefaultSound]);

  /**
   * تشغيل صوت حسب نوع الإشعار (يستخدم النغمة المحفوظة)
   */
  const playSound = useCallback((type = 'default') => {
    try {
      const audioContext = getAudioContext();
      
      if (!audioContext) {
        playDefaultSound();
        return;
      }
      
      if (type === 'success') {
        playSuccessSound(audioContext);
        return;
      }
      
      // الحصول على النغمة المحفوظة لهذا النوع
      const savedTone = getSavedTone(type);
      const toneFunction = tonePatterns[savedTone];
      
      if (toneFunction) {
        toneFunction(audioContext);
      } else {
        playDefaultSound();
      }
    } catch (error) {
      logger.log('خطأ في تشغيل الصوت:', error);
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
    // تشغيل نغمة محددة (للمعاينة)
    previewTone: (toneId) => playTone(toneId),
  }), [playSound, playTone]);

  return { 
    playSound, 
    stopSound,
    ...sounds
  };
};

export default useNotificationSound;
