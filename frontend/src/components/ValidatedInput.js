// /app/frontend/src/components/ValidatedInput.js
// مكون حقل إدخال مع تحقق وتغيير لون (أحمر → أخضر)

import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

/**
 * حقل إدخال مع تحقق مرئي
 * - أحمر: الحقل فارغ أو غير صحيح
 * - أخضر: الحقل صحيح ومُعبأ
 */
const ValidatedInput = ({
  type = 'text',
  value,
  onChange,
  placeholder,
  label,
  required = false,
  icon: Icon,
  validation,
  errorMessage,
  successMessage,
  hint,
  className = '',
  showToggle = false,
  onToggle,
  showToggleValue,
  dataTestId,
  inputMode,
  maxLength,
  minLength,
  ...props
}) => {
  const [touched, setTouched] = useState(false);
  const [isValid, setIsValid] = useState(false);

  // التحقق من صحة القيمة
  useEffect(() => {
    if (validation) {
      setIsValid(validation(value));
    } else if (required) {
      setIsValid(value && value.trim().length > 0);
    } else {
      setIsValid(true);
    }
  }, [value, validation, required]);

  // تحديد لون الحدود
  const getBorderColor = () => {
    if (!touched && !value) return 'border-gray-200'; // لم يُلمس بعد
    if (!value && required) return 'border-red-400'; // فارغ ومطلوب
    if (isValid) return 'border-green-500'; // صحيح
    return 'border-red-400'; // غير صحيح
  };

  // تحديد لون الأيقونة
  const getIconColor = () => {
    if (!touched && !value) return 'text-gray-400';
    if (!value && required) return 'text-red-400';
    if (isValid) return 'text-green-500';
    return 'text-red-400';
  };

  // تحديد لون النص المساعد
  const getHintColor = () => {
    if (!touched && !value) return 'text-gray-400';
    if (!value && required) return 'text-red-500';
    if (isValid) return 'text-green-500';
    return 'text-red-500';
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium mb-2 text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type={showToggle ? (showToggleValue ? 'text' : 'password') : type}
          value={value}
          onChange={onChange}
          onBlur={() => setTouched(true)}
          onFocus={() => setTouched(true)}
          className={`w-full bg-gray-50 border-2 rounded-lg py-3 px-4 ${Icon ? 'pr-12' : ''} ${showToggle ? 'pl-12' : ''} text-gray-900 placeholder:text-gray-400 focus:outline-none transition-all duration-200 ${getBorderColor()}`}
          placeholder={placeholder}
          required={required}
          data-testid={dataTestId}
          inputMode={inputMode}
          maxLength={maxLength}
          minLength={minLength}
          {...props}
        />
        
        {/* أيقونة الحقل */}
        {Icon && (
          <Icon size={20} className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors duration-200 ${getIconColor()}`} />
        )}
        
        {/* زر إظهار/إخفاء كلمة المرور */}
        {showToggle && onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showToggleValue ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        )}
        
        {/* مؤشر الصحة */}
        {touched && value && (
          <div className={`absolute left-10 top-1/2 -translate-y-1/2 transition-all duration-200 ${showToggle ? 'left-12' : 'left-3'}`}>
            {isValid ? (
              <CheckCircle size={18} className="text-green-500" />
            ) : (
              <AlertCircle size={18} className="text-red-400" />
            )}
          </div>
        )}
      </div>
      
      {/* رسالة المساعدة أو الخطأ */}
      {(hint || errorMessage || successMessage) && (
        <p className={`text-xs mt-1 flex items-center gap-1 transition-colors duration-200 ${getHintColor()}`}>
          {touched && value && isValid && successMessage ? (
            <><CheckCircle size={12} /> {successMessage}</>
          ) : touched && value && !isValid && errorMessage ? (
            <><AlertCircle size={12} /> {errorMessage}</>
          ) : touched && !value && required ? (
            <><AlertCircle size={12} /> هذا الحقل مطلوب</>
          ) : (
            hint
          )}
        </p>
      )}
    </div>
  );
};

export default ValidatedInput;
