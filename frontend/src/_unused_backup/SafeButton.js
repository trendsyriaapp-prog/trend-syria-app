import React, { useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * SafeButton - زر آمن يمنع الضغط المتكرر
 * 
 * يستخدم في جميع الأماكن التي تحتاج حماية من الإرسال المتكرر
 * مثل: إضافة للسلة، تأكيد الطلب، قبول/رفض، إلخ
 * 
 * @param {function} onClick - الدالة التي تنفذ عند الضغط (يجب أن تكون async أو تعيد Promise)
 * @param {boolean} disabled - هل الزر معطل
 * @param {boolean} loading - هل الزر في حالة تحميل (خارجي)
 * @param {string} loadingText - النص أثناء التحميل
 * @param {number} cooldown - فترة الانتظار بين الضغطات (بالمللي ثانية) - افتراضي 1000ms
 * @param {ReactNode} children - محتوى الزر
 * @param {string} className - الأنماط
 * @param {string} type - نوع الزر (button, submit)
 */
export const SafeButton = ({
  onClick,
  disabled = false,
  loading: externalLoading = false,
  loadingText = 'جاري التحميل...',
  cooldown = 1000,
  children,
  className = '',
  type = 'button',
  ...props
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const [lastClickTime, setLastClickTime] = useState(0);

  const isLoading = externalLoading || internalLoading;
  const isDisabled = disabled || isLoading;

  const handleClick = useCallback(async (e) => {
    // منع الضغط المتكرر خلال فترة cooldown
    const now = Date.now();
    if (now - lastClickTime < cooldown) {
      e.preventDefault();
      return;
    }
    setLastClickTime(now);

    // إذا كان الزر معطلاً أو في حالة تحميل، لا تفعل شيئاً
    if (isDisabled) {
      e.preventDefault();
      return;
    }

    // إذا كانت هناك دالة onClick
    if (onClick) {
      try {
        setInternalLoading(true);
        const result = onClick(e);
        
        // إذا كانت الدالة تعيد Promise، انتظرها
        if (result && typeof result.then === 'function') {
          await result;
        }
      } catch (error) {
        console.error('SafeButton onClick error:', error);
      } finally {
        setInternalLoading(false);
      }
    }
  }, [onClick, isDisabled, lastClickTime, cooldown]);

  return (
    <button
      type={type}
      onClick={handleClick}
      disabled={isDisabled}
      className={`${className} ${isDisabled ? 'opacity-70 cursor-not-allowed' : ''}`}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{loadingText}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
};

/**
 * useSubmitGuard - Hook لحماية أي عملية إرسال من التكرار
 * 
 * يستخدم مع الأزرار الموجودة بدون تغيير هيكلها
 * 
 * @returns {Object} { isSubmitting, guardedSubmit }
 */
export const useSubmitGuard = (cooldown = 1000) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmitTime, setLastSubmitTime] = useState(0);

  const guardedSubmit = useCallback(async (submitFn) => {
    const now = Date.now();
    
    // منع التكرار خلال فترة cooldown
    if (now - lastSubmitTime < cooldown) {
      console.log('Submit blocked - too soon');
      return;
    }
    
    // منع التكرار إذا كانت عملية سابقة جارية
    if (isSubmitting) {
      console.log('Submit blocked - already submitting');
      return;
    }

    setLastSubmitTime(now);
    setIsSubmitting(true);
    
    try {
      const result = submitFn();
      if (result && typeof result.then === 'function') {
        await result;
      }
    } catch (error) {
      console.error('guardedSubmit error:', error);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  }, [isSubmitting, lastSubmitTime, cooldown]);

  return { isSubmitting, guardedSubmit };
};

export default SafeButton;
