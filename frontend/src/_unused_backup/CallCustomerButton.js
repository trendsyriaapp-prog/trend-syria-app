// /app/frontend/src/components/voip/CallCustomerButton.js
// زر الاتصال بالعميل للسائق

import { useState } from 'react';
import { Phone, PhoneOff } from 'lucide-react';
import { OutgoingCallModal } from './VoIPCallModal';

const CallCustomerButton = ({ 
  orderId, 
  orderType = 'food',
  orderNumber,
  className = '',
  size = 'normal' // normal, small
}) => {
  const [showCallModal, setShowCallModal] = useState(false);

  const handleCall = () => {
    // التحقق من دعم المتصفح للميكروفون
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('متصفحك لا يدعم المكالمات الصوتية. يرجى استخدام Chrome أو Firefox.');
      return;
    }
    setShowCallModal(true);
  };

  const buttonSize = size === 'small' ? 'py-2 px-3 text-xs' : 'py-2 px-4 text-sm';
  const iconSize = size === 'small' ? 12 : 14;

  return (
    <>
      <button
        onClick={handleCall}
        className={`bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-1 transition-all ${buttonSize} ${className}`}
        data-testid={`call-customer-btn-${orderId}`}
      >
        <Phone size={iconSize} />
        اتصل بالعميل
      </button>

      {showCallModal && (
        <OutgoingCallModal
          orderId={orderId}
          orderType={orderType}
          orderNumber={orderNumber}
          callerType="driver"
          onClose={() => setShowCallModal(false)}
        />
      )}
    </>
  );
};

export default CallCustomerButton;
