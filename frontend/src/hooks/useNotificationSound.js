import { useRef, useCallback, useMemo } from 'react';

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

// إنشاء صوت باستخدام Web Audio API
const createTone = (audioContext, frequency, duration, type = 'sine', volume = 0.5) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = frequency;
  oscillator.type = type;
  
  // تأثير Fade out
  gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + duration);
};

// النغمات المختلفة
const tonePatterns = {
  // نغمة مرحة: C5 -> E5 -> G5
  cheerful: (audioContext) => {
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((freq, i) => {
      setTimeout(() => createTone(audioContext, freq, 0.15, 'sine'), i * 100);
    });
  },
  
  // نغمة كلاسيكية: G4 -> C5
  classic: (audioContext) => {
    createTone(audioContext, 392, 0.2, 'triangle');
    setTimeout(() => createTone(audioContext, 523.25, 0.3, 'triangle'), 150);
  },
  
  // نغمة عاجلة: beeps سريعة
  urgent: (audioContext) => {
    [0, 150, 300].forEach(delay => {
      setTimeout(() => createTone(audioContext, 880, 0.1, 'square'), delay);
    });
  },
  
  // نغمة جرس
  bell: (audioContext) => {
    createTone(audioContext, 659.25, 0.4, 'sine', 0.6); // E5
    setTimeout(() => createTone(audioContext, 523.25, 0.6, 'sine', 0.4), 200); // C5
  },
  
  // نغمة ناعمة
  soft: (audioContext) => {
    createTone(audioContext, 440, 0.5, 'sine', 0.3); // A4
    setTimeout(() => createTone(audioContext, 554.37, 0.4, 'sine', 0.2), 300); // C#5
  },
  
  // نغمة رقمية
  digital: (audioContext) => {
    createTone(audioContext, 800, 0.08, 'square', 0.4);
    setTimeout(() => createTone(audioContext, 1000, 0.08, 'square', 0.4), 100);
    setTimeout(() => createTone(audioContext, 1200, 0.12, 'square', 0.4), 200);
  },
};

// تشغيل نغمة النجاح (للتأكيد)
const playSuccessSound = (audioContext) => {
  createTone(audioContext, 523.25, 0.15, 'sine');
  setTimeout(() => createTone(audioContext, 783.99, 0.25, 'sine'), 100);
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
    console.error('Error saving tone preference:', e);
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
          console.warn('AudioContext غير مدعوم في هذا المتصفح');
          return null;
        }
        audioContextRef.current = new AudioContextClass();
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {
          console.log('تعذر استئناف AudioContext');
        });
      }
      return audioContextRef.current;
    } catch (error) {
      console.warn('خطأ في إنشاء AudioContext:', error);
      return null;
    }
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
      console.log('خطأ في تشغيل النغمة:', error);
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
      console.log('خطأ في تشغيل الصوت:', error);
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
