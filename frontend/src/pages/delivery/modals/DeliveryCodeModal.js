// /app/frontend/src/pages/delivery/modals/DeliveryCodeModal.js
// نافذة إدخال كود التسليم للمنتجات

import { motion } from 'framer-motion';

const DeliveryCodeModal = ({ 
  isOpen, 
  order, 
  codeInput, 
  setCodeInput, 
  error, 
  verifying, 
  onVerify, 
  onClose,
  theme = 'light'
}) => {
  if (!isOpen || !order) return null;

  const handleInputChange = (position, value) => {
    const val = value.replace(/\D/g, '');
    const newCode = codeInput.split('');
    newCode[position] = val;
    setCodeInput(newCode.join('').slice(0, 4));
    
    // الانتقال للحقل التالي
    if (val && position < 3) {
      document.getElementById(`delivery-code-${position + 1}`)?.focus();
    }
  };

  const handleKeyDown = (position, e) => {
    if (e.key === 'Backspace' && !codeInput[position] && position > 0) {
      document.getElementById(`delivery-code-${position - 1}`)?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`w-full max-w-sm rounded-2xl overflow-hidden ${
          theme === 'dark' ? 'bg-[#1a1a1a]' : 'bg-white'
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 text-white text-center">
          <span className="text-3xl mb-2 block">🔐</span>
          <h3 className="text-lg font-bold">كود التسليم</h3>
          <p className="text-sm text-white/80 mt-1">اطلب الكود من العميل</p>
        </div>
        
        {/* Content */}
        <div className="p-4">
          <p className={`text-sm text-center mb-4 ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
          }`}>
            طلب #{order.id?.slice(0, 8).toUpperCase()}
          </p>
          
          {/* Code Input */}
          <div className="flex justify-center gap-2 mb-4">
            {[0, 1, 2, 3].map((position) => (
              <input
                key={`delivery-code-input-${position}`}
                id={`delivery-code-${position}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={codeInput[position] || ''}
                onChange={(e) => handleInputChange(position, e.target.value)}
                onKeyDown={(e) => handleKeyDown(position, e)}
                className={`w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 focus:outline-none focus:ring-2 ${
                  theme === 'dark' 
                    ? 'bg-[#252525] border-gray-600 text-white focus:border-purple-500 focus:ring-purple-500/30' 
                    : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-purple-500 focus:ring-purple-500/30'
                }`}
              />
            ))}
          </div>
          
          {/* Error */}
          {error && (
            <p className="text-red-500 text-sm text-center mb-3">{error}</p>
          )}
          
          {/* Buttons */}
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className={`flex-1 py-3 rounded-xl font-bold ${
                theme === 'dark' 
                  ? 'bg-gray-700 text-gray-300' 
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              إلغاء
            </button>
            <button
              onClick={onVerify}
              disabled={verifying || codeInput.length !== 4}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-xl font-bold disabled:opacity-50"
            >
              {verifying ? 'جاري التحقق...' : 'تأكيد التسليم'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default DeliveryCodeModal;
