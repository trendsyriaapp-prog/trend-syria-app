// /app/frontend/src/components/voip/VoIPCallModal.js
// مكون مكالمات VoIP - للاتصال بين السائق والعميل

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Phone, PhoneOff, PhoneIncoming, PhoneMissed, 
  Mic, MicOff, Volume2, VolumeX, User, X, Circle 
} from 'lucide-react';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// إعدادات STUN/TURN servers
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ]
};

// حالات المكالمة
const CALL_STATUS = {
  IDLE: 'idle',
  INITIATING: 'initiating',
  RINGING: 'ringing',
  CONNECTED: 'connected',
  ENDED: 'ended',
  ERROR: 'error'
};

// رسالة التسجيل الصوتية (TTS)
const RECORDING_NOTICE = "هذه المكالمة مسجلة لأغراض الجودة";

// مكون المكالمة الصادرة
export const OutgoingCallModal = ({ 
  orderId, 
  orderType = 'food',
  orderNumber,
  callerType = 'driver', // driver أو customer
  onClose 
}) => {
  const [callStatus, setCallStatus] = useState(CALL_STATUS.IDLE);
  const [callId, setCallId] = useState(null);
  const [calleeName, setCalleeName] = useState('');
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [error, setError] = useState('');
  const [isRecording, setIsRecording] = useState(false);

  // WebRTC refs
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const durationIntervalRef = useRef(null);
  
  // Recording refs
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // تشغيل رسالة التسجيل
  const playRecordingNotice = useCallback(() => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(RECORDING_NOTICE);
      utterance.lang = 'ar-SA';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // بدء التسجيل
  const startRecording = useCallback((stream) => {
    try {
      recordedChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.start(1000); // تسجيل كل ثانية
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
    }
  }, []);

  // إيقاف التسجيل ورفعه
  const stopAndUploadRecording = useCallback(async (cId) => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // انتظار قليل للتأكد من اكتمال التسجيل
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (recordedChunksRef.current.length > 0 && cId) {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('recording', blob, `call_${cId}.webm`);
        
        try {
          await axios.post(`${API}/api/voip/call/${cId}/upload-recording`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          console.log('Recording uploaded successfully');
        } catch (err) {
          console.error('Error uploading recording:', err);
        }
      }
    }
  }, []);

  // بدء المكالمة
  const initiateCall = useCallback(async () => {
    try {
      setCallStatus(CALL_STATUS.INITIATING);
      setError('');

      // طلب إذن الميكروفون
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });
      localStreamRef.current = stream;

      // إنشاء المكالمة على الخادم
      const response = await axios.post(`${API}/api/voip/call/initiate`, {
        order_id: orderId,
        order_type: orderType,
        caller_type: callerType
      });

      setCallId(response.data.call_id);
      setCalleeName(response.data.callee_name);
      setCallStatus(CALL_STATUS.RINGING);

      // إنشاء RTCPeerConnection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // إضافة المسار المحلي
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // معالجة ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await axios.post(`${API}/api/voip/call/signal`, {
            call_id: response.data.call_id,
            signal_type: 'ice-candidate',
            signal_data: event.candidate
          });
        }
      };

      // استقبال المسار البعيد
      pc.ontrack = (event) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      // إنشاء وإرسال offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      await axios.post(`${API}/api/voip/call/signal`, {
        call_id: response.data.call_id,
        signal_type: 'offer',
        signal_data: pc.localDescription
      });

      // بدء polling للإشارات
      startSignalPolling(response.data.call_id);

    } catch (err) {
      console.error('Error initiating call:', err);
      setError(err.response?.data?.detail || 'فشل في بدء المكالمة');
      setCallStatus(CALL_STATUS.ERROR);
    }
  }, [orderId, orderType, callerType]);

  // Polling للإشارات
  const startSignalPolling = (cId) => {
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await axios.get(`${API}/api/voip/call/${cId}/signals`);
        
        // معالجة حالة المكالمة
        if (response.data.call_status === 'connected' && callStatus !== CALL_STATUS.CONNECTED) {
          setCallStatus(CALL_STATUS.CONNECTED);
          startDurationTimer();
          // تشغيل رسالة التسجيل وبدء التسجيل
          playRecordingNotice();
          if (localStreamRef.current) {
            startRecording(localStreamRef.current);
          }
        } else if (['ended', 'rejected', 'missed'].includes(response.data.call_status)) {
          setCallStatus(CALL_STATUS.ENDED);
          await stopAndUploadRecording(cId);
          cleanup();
        }

        // معالجة الإشارات
        for (const signal of response.data.signals) {
          await handleSignal(signal);
        }
      } catch (err) {
        console.error('Signal polling error:', err);
      }
    }, 1000);
  };

  // معالجة الإشارات الواردة
  const handleSignal = async (signal) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      if (signal.signal_type === 'answer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
      } else if (signal.signal_type === 'ice-candidate') {
        await pc.addIceCandidate(new RTCIceCandidate(signal.signal_data));
      }
    } catch (err) {
      console.error('Error handling signal:', err);
    }
  };

  // عداد مدة المكالمة
  const startDurationTimer = () => {
    durationIntervalRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  // تنسيق المدة
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // كتم/إلغاء كتم الميكروفون
  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  // تفعيل/إيقاف السماعة
  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = isSpeakerOn;
      setIsSpeakerOn(!isSpeakerOn);
    }
  };

  // إنهاء المكالمة
  const endCall = async () => {
    try {
      // رفع التسجيل قبل إنهاء المكالمة
      await stopAndUploadRecording(callId);
      
      if (callId) {
        await axios.post(`${API}/api/voip/call/action`, {
          call_id: callId,
          action: 'end'
        });
      }
    } catch (err) {
      console.error('Error ending call:', err);
    }
    cleanup();
    onClose();
  };

  // تنظيف الموارد
  const cleanup = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    // إيقاف التسجيل
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  // بدء المكالمة عند فتح النافذة
  useEffect(() => {
    initiateCall();
    return () => cleanup();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-center">
          <div className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4">
            {callStatus === CALL_STATUS.RINGING ? (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              >
                <Phone size={36} className="text-white" />
              </motion.div>
            ) : callStatus === CALL_STATUS.CONNECTED ? (
              <Phone size={36} className="text-white" />
            ) : (
              <User size={36} className="text-white" />
            )}
          </div>
          <h3 className="text-white text-xl font-bold">{calleeName || 'جاري الاتصال...'}</h3>
          <p className="text-white/80 text-sm mt-1">
            {callerType === 'driver' ? 'العميل' : 'السائق'} • طلب #{orderNumber}
          </p>
        </div>

        {/* Status */}
        <div className="p-6 text-center">
          {callStatus === CALL_STATUS.INITIATING && (
            <p className="text-gray-400">جاري بدء المكالمة...</p>
          )}
          {callStatus === CALL_STATUS.RINGING && (
            <motion.p 
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="text-yellow-400"
            >
              جاري الاتصال...
            </motion.p>
          )}
          {callStatus === CALL_STATUS.CONNECTED && (
            <div className="space-y-2">
              <p className="text-green-400 text-2xl font-mono">{formatDuration(callDuration)}</p>
              {isRecording && (
                <div className="flex items-center justify-center gap-2 text-red-400 text-sm">
                  <motion.div
                    animate={{ opacity: [1, 0.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  >
                    <Circle size={10} fill="currentColor" />
                  </motion.div>
                  <span>جاري التسجيل</span>
                </div>
              )}
            </div>
          )}
          {callStatus === CALL_STATUS.ERROR && (
            <p className="text-red-400">{error}</p>
          )}
        </div>

        {/* Controls */}
        <div className="p-6 flex items-center justify-center gap-6">
          {callStatus === CALL_STATUS.CONNECTED && (
            <>
              <button
                onClick={toggleMute}
                className={`p-4 rounded-full transition-all ${
                  isMuted ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {isMuted ? <MicOff size={24} className="text-white" /> : <Mic size={24} className="text-white" />}
              </button>
              <button
                onClick={toggleSpeaker}
                className={`p-4 rounded-full transition-all ${
                  !isSpeakerOn ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {isSpeakerOn ? <Volume2 size={24} className="text-white" /> : <VolumeX size={24} className="text-white" />}
              </button>
            </>
          )}
          <button
            onClick={endCall}
            className="p-4 bg-red-600 hover:bg-red-700 rounded-full transition-all"
          >
            <PhoneOff size={28} className="text-white" />
          </button>
        </div>

        {/* Hidden audio element */}
        <audio ref={remoteAudioRef} autoPlay playsInline />
      </motion.div>
    </div>
  );
};

// مكون المكالمة الواردة
export const IncomingCallModal = ({ call, onAccept, onReject }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAccept = async () => {
    setIsProcessing(true);
    await onAccept(call);
  };

  const handleReject = async () => {
    setIsProcessing(true);
    await onReject(call);
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 50 }}
        className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
            className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4"
          >
            <PhoneIncoming size={36} className="text-white" />
          </motion.div>
          <h3 className="text-white text-xl font-bold">مكالمة واردة</h3>
          <p className="text-white/90 text-lg mt-2">{call.caller_name}</p>
          <p className="text-white/70 text-sm">
            {call.caller_type === 'driver' ? 'السائق' : 'العميل'} • طلب #{call.order_number}
          </p>
        </div>

        {/* Ringing animation */}
        <div className="py-8 flex justify-center">
          <motion.div
            animate={{ 
              boxShadow: [
                '0 0 0 0 rgba(59, 130, 246, 0.5)',
                '0 0 0 20px rgba(59, 130, 246, 0)',
              ]
            }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-16 h-16 rounded-full bg-blue-500/20"
          />
        </div>

        {/* Controls */}
        <div className="p-6 flex items-center justify-center gap-8">
          <button
            onClick={handleReject}
            disabled={isProcessing}
            className="p-5 bg-red-600 hover:bg-red-700 rounded-full transition-all disabled:opacity-50"
          >
            <PhoneOff size={32} className="text-white" />
          </button>
          <button
            onClick={handleAccept}
            disabled={isProcessing}
            className="p-5 bg-green-600 hover:bg-green-700 rounded-full transition-all disabled:opacity-50"
          >
            <Phone size={32} className="text-white" />
          </button>
        </div>

        {/* Labels */}
        <div className="pb-6 flex items-center justify-center gap-16 text-sm text-gray-400">
          <span>رفض</span>
          <span>قبول</span>
        </div>
      </motion.div>
    </div>
  );
};

// مكون نافذة المكالمة المتصلة (للمستقبل بعد القبول)
export const ActiveCallModal = ({ 
  callId, 
  callerName, 
  callerType,
  orderNumber,
  onClose 
}) => {
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isRecording, setIsRecording] = useState(false);

  // WebRTC refs
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const durationIntervalRef = useRef(null);
  
  // Recording refs
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // تشغيل رسالة التسجيل
  const playRecordingNotice = useCallback(() => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(RECORDING_NOTICE);
      utterance.lang = 'ar-SA';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // بدء التسجيل
  const startRecording = useCallback((stream) => {
    try {
      recordedChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.start(1000);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
    }
  }, []);

  // إيقاف التسجيل ورفعه
  const stopAndUploadRecording = useCallback(async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (recordedChunksRef.current.length > 0 && callId) {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('recording', blob, `call_${callId}.webm`);
        
        try {
          await axios.post(`${API}/api/voip/call/${callId}/upload-recording`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } catch (err) {
          console.error('Error uploading recording:', err);
        }
      }
    }
  }, [callId]);

  // إعداد المكالمة
  const setupCall = useCallback(async () => {
    try {
      // طلب إذن الميكروفون
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: true, 
        video: false 
      });
      localStreamRef.current = stream;

      // إنشاء RTCPeerConnection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // إضافة المسار المحلي
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // معالجة ICE candidates
      pc.onicecandidate = async (event) => {
        if (event.candidate) {
          await axios.post(`${API}/api/voip/call/signal`, {
            call_id: callId,
            signal_type: 'ice-candidate',
            signal_data: event.candidate
          });
        }
      };

      // استقبال المسار البعيد
      pc.ontrack = (event) => {
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = event.streams[0];
        }
      };

      // بدء polling للإشارات
      startSignalPolling();
      startDurationTimer();
      
      // تشغيل رسالة التسجيل وبدء التسجيل
      playRecordingNotice();
      startRecording(stream);

    } catch (err) {
      console.error('Error setting up call:', err);
    }
  }, [callId, playRecordingNotice, startRecording]);

  // Polling للإشارات
  const startSignalPolling = () => {
    pollingIntervalRef.current = setInterval(async () => {
      try {
        const response = await axios.get(`${API}/api/voip/call/${callId}/signals`);
        
        // معالجة حالة المكالمة
        if (['ended', 'rejected', 'missed'].includes(response.data.call_status)) {
          cleanup();
          onClose();
          return;
        }

        // معالجة الإشارات
        for (const signal of response.data.signals) {
          await handleSignal(signal);
        }
      } catch (err) {
        console.error('Signal polling error:', err);
      }
    }, 1000);
  };

  // معالجة الإشارات الواردة
  const handleSignal = async (signal) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      if (signal.signal_type === 'offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.signal_data));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        await axios.post(`${API}/api/voip/call/signal`, {
          call_id: callId,
          signal_type: 'answer',
          signal_data: pc.localDescription
        });
      } else if (signal.signal_type === 'ice-candidate') {
        await pc.addIceCandidate(new RTCIceCandidate(signal.signal_data));
      }
    } catch (err) {
      console.error('Error handling signal:', err);
    }
  };

  // عداد مدة المكالمة
  const startDurationTimer = () => {
    durationIntervalRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  // تنسيق المدة
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // كتم/إلغاء كتم الميكروفون
  const toggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  // تفعيل/إيقاف السماعة
  const toggleSpeaker = () => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = isSpeakerOn;
      setIsSpeakerOn(!isSpeakerOn);
    }
  };

  // إنهاء المكالمة
  const endCall = async () => {
    try {
      // رفع التسجيل
      await stopAndUploadRecording();
      
      await axios.post(`${API}/api/voip/call/action`, {
        call_id: callId,
        action: 'end'
      });
    } catch (err) {
      console.error('Error ending call:', err);
    }
    cleanup();
    onClose();
  };

  // تنظيف الموارد
  const cleanup = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    // إيقاف التسجيل
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  useEffect(() => {
    setupCall();
    return () => cleanup();
  }, [setupCall]);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-center">
          <div className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4">
            <Phone size={36} className="text-white" />
          </div>
          <h3 className="text-white text-xl font-bold">{callerName}</h3>
          <p className="text-white/80 text-sm mt-1">
            {callerType === 'driver' ? 'السائق' : 'العميل'} • طلب #{orderNumber}
          </p>
        </div>

        {/* Duration */}
        <div className="p-6 text-center">
          <p className="text-green-400 text-3xl font-mono">{formatDuration(callDuration)}</p>
          {isRecording && (
            <div className="flex items-center justify-center gap-2 text-red-400 text-sm mt-2">
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
              >
                <Circle size={10} fill="currentColor" />
              </motion.div>
              <span>جاري التسجيل</span>
            </div>
          )}
          {!isRecording && <p className="text-gray-500 text-sm mt-2">المكالمة متصلة</p>}
        </div>

        {/* Controls */}
        <div className="p-6 flex items-center justify-center gap-6">
          <button
            onClick={toggleMute}
            className={`p-4 rounded-full transition-all ${
              isMuted ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isMuted ? <MicOff size={24} className="text-white" /> : <Mic size={24} className="text-white" />}
          </button>
          <button
            onClick={endCall}
            className="p-4 bg-red-600 hover:bg-red-700 rounded-full transition-all"
          >
            <PhoneOff size={28} className="text-white" />
          </button>
          <button
            onClick={toggleSpeaker}
            className={`p-4 rounded-full transition-all ${
              !isSpeakerOn ? 'bg-red-500' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isSpeakerOn ? <Volume2 size={24} className="text-white" /> : <VolumeX size={24} className="text-white" />}
          </button>
        </div>

        {/* Hidden audio element */}
        <audio ref={remoteAudioRef} autoPlay playsInline />
      </motion.div>
    </div>
  );
};

export default OutgoingCallModal;
