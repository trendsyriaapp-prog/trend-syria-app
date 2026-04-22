// /app/frontend/src/components/ChangePasswordModal.js
// نافذة تغيير كلمة المرور (إجبارية للحسابات الافتراضية)

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const ChangePasswordModal = ({ isOpen, onClose, isForced = false }) => {
  const { changePassword, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // معالج زر الرجوع في الهاتف (Back button) - فقط إذا لم يكن إجبارياً
  useEffect(() => {
    if (!isOpen || isForced) return;

    const handleBackButton = (e) => {
      e.preventDefault();
      onClose();
    };

    window.history.pushState({ changePasswordModal: true }, '');
    window.addEventListener('popstate', handleBackButton);

    return () => {
      window.removeEventListener('popstate', handleBackButton);
      if (window.history.state?.changePasswordModal) {
        window.history.back();
      }
    };
  }, [isOpen, onClose, isForced]);

  // التحقق من قوة كلمة المرور
  const getPasswordStrength = (password) => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(newPassword);
  const strengthLabels = ['ضعيفة جداً', 'ضعيفة', 'متوسطة', 'جيدة', 'قوية جداً'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('كلمة المرور الجديدة غير متطابقة');
      return;
    }

    if (newPassword.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      setError('كلمة المرور يجب أن تحتوي على رقم واحد على الأقل');
      return;
    }

    if (currentPassword === newPassword) {
      setError('كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية');
      return;
    }

    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      toast.success('تم تغيير كلمة المرور بنجاح');
      onClose();
      // إعادة تعيين الحقول
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const message = err.response?.data?.detail || 'حدث خطأ أثناء تغيير كلمة المرور';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (isForced) {
      toast.error('يجب تغيير كلمة المرور الافتراضية للمتابعة');
      return;
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={isForced ? undefined : onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`p-6 ${isForced ? 'bg-gradient-to-r from-amber-500 to-orange-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}>
            <div className="flex items-center gap-3 text-white">
              {isForced ? (
                <AlertTriangle className="w-8 h-8" />
              ) : (
                <Shield className="w-8 h-8" />
              )}
              <div>
                <h2 className="text-xl font-bold">
                  {isForced ? 'تغيير كلمة المرور مطلوب' : 'تغيير كلمة المرور'}
                </h2>
                <p className="text-sm opacity-90">
                  {isForced 
                    ? 'كلمة المرور الافتراضية غير آمنة. يرجى تغييرها الآن.'
                    : 'قم بتحديث كلمة المرور لحماية حسابك'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                كلمة المرور الحالية
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="أدخل كلمة المرور الحالية"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                كلمة المرور الجديدة
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="أدخل كلمة المرور الجديدة"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded ${i < passwordStrength ? strengthColors[passwordStrength - 1] : 'bg-gray-200'}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    قوة كلمة المرور: {strengthLabels[passwordStrength - 1] || 'ضعيفة جداً'}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                تأكيد كلمة المرور الجديدة
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                    confirmPassword && confirmPassword === newPassword 
                      ? 'border-green-500' 
                      : confirmPassword 
                        ? 'border-red-500' 
                        : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="أعد إدخال كلمة المرور الجديدة"
                  required
                />
                {confirmPassword && (
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    {confirmPassword === newPassword ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Password Requirements */}
            <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">متطلبات كلمة المرور:</p>
              <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <li className={`flex items-center gap-1 ${newPassword.length >= 8 ? 'text-green-500' : ''}`}>
                  {newPassword.length >= 8 ? <CheckCircle className="w-3 h-3" /> : '•'} 8 أحرف على الأقل
                </li>
                <li className={`flex items-center gap-1 ${/[0-9]/.test(newPassword) ? 'text-green-500' : ''}`}>
                  {/[0-9]/.test(newPassword) ? <CheckCircle className="w-3 h-3" /> : '•'} رقم واحد على الأقل
                </li>
                <li className={`flex items-center gap-1 ${/[a-zA-Z\u0600-\u06FF]/.test(newPassword) ? 'text-green-500' : ''}`}>
                  {/[a-zA-Z\u0600-\u06FF]/.test(newPassword) ? <CheckCircle className="w-3 h-3" /> : '•'} حرف واحد على الأقل
                </li>
              </ul>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white py-3 rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    تغيير كلمة المرور
                  </>
                )}
              </button>
              
              {!isForced && (
                <button
                  type="button"
                  onClick={handleSkip}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  إلغاء
                </button>
              )}
            </div>

            {isForced && (
              <button
                type="button"
                onClick={logout}
                className="w-full text-sm text-gray-500 hover:text-red-500 transition py-2"
              >
                تسجيل الخروج والمحاولة لاحقاً
              </button>
            )}
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ChangePasswordModal;
