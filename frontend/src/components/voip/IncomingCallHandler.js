// /app/frontend/src/components/voip/IncomingCallHandler.js
// مكون للتعامل مع المكالمات الواردة على مستوى التطبيق

import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import useIncomingCall from '../../hooks/useIncomingCall';
import { IncomingCallModal, ActiveCallModal } from './VoIPCallModal';

const IncomingCallHandler = () => {
  const { incomingCall, acceptCall, rejectCall, clearIncomingCall } = useIncomingCall();
  const [activeCall, setActiveCall] = useState(null);
  const [showIncoming, setShowIncoming] = useState(false);

  // عرض نافذة المكالمة الواردة
  useEffect(() => {
    if (incomingCall && !activeCall) {
      setShowIncoming(true);
      // تشغيل صوت الرنين
      playRingtone();
    } else {
      setShowIncoming(false);
    }
  }, [incomingCall, activeCall]);

  // تشغيل صوت الرنين
  const playRingtone = () => {
    try {
      const audio = new Audio('/notification.mp3');
      audio.loop = true;
      audio.play().catch(() => {});
      
      // إيقاف بعد 30 ثانية كحد أقصى
      setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
      }, 30000);
      
      // حفظ reference لإيقافه لاحقاً
      window._ringtoneAudio = audio;
    } catch (err) {
      console.error('Error playing ringtone:', err);
    }
  };

  // إيقاف صوت الرنين
  const stopRingtone = () => {
    if (window._ringtoneAudio) {
      window._ringtoneAudio.pause();
      window._ringtoneAudio.currentTime = 0;
      window._ringtoneAudio = null;
    }
  };

  // قبول المكالمة
  const handleAccept = async (call) => {
    stopRingtone();
    const success = await acceptCall(call);
    if (success) {
      setShowIncoming(false);
      setActiveCall(call);
      clearIncomingCall();
    }
  };

  // رفض المكالمة
  const handleReject = async (call) => {
    stopRingtone();
    await rejectCall(call);
    setShowIncoming(false);
    clearIncomingCall();
  };

  // إغلاق المكالمة النشطة
  const handleCloseActiveCall = () => {
    setActiveCall(null);
  };

  return (
    <AnimatePresence>
      {/* نافذة المكالمة الواردة */}
      {showIncoming && incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}

      {/* نافذة المكالمة النشطة (بعد القبول) */}
      {activeCall && (
        <ActiveCallModal
          callId={activeCall.id}
          callerName={activeCall.caller_name}
          callerType={activeCall.caller_type}
          orderNumber={activeCall.order_number}
          onClose={handleCloseActiveCall}
        />
      )}
    </AnimatePresence>
  );
};

export default IncomingCallHandler;
