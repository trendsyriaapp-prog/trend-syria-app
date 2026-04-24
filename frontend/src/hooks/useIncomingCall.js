// /app/frontend/src/hooks/useIncomingCall.js
// Hook للتحقق من المكالمات الواردة

import { useState, useEffect, useCallback, useRef } from 'react';
import logger from '../lib/logger';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;

// فترة التحقق من المكالمات (10 ثواني بدلاً من 3)
const POLLING_INTERVAL = 10000;

const useIncomingCall = () => {
  const { token, user } = useAuth();
  const [incomingCall, setIncomingCall] = useState(null);
  const isCheckingRef = useRef(false);

  // التحقق من المكالمات الواردة
  const checkIncomingCall = useCallback(async () => {
    if (!token || isCheckingRef.current) return;
    
    isCheckingRef.current = true;
    try {
      const response = await axios.get(`${API}/api/voip/incoming-call`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 5000 // timeout 5 ثواني
      });
      
      if (response.data.has_incoming_call) {
        setIncomingCall(response.data.call);
      } else {
        setIncomingCall(null);
      }
    } catch (err) {
      // تجاهل الأخطاء الصامتة (429 rate limit, timeout)
      if (err.response?.status !== 429) {
        logger.error('Error checking incoming call:', err);
      }
    } finally {
      isCheckingRef.current = false;
    }
  }, [token]);

  // قبول المكالمة
  const acceptCall = useCallback(async (call) => {
    try {
      await axios.post(`${API}/api/voip/call/action`, {
        call_id: call.id,
        action: 'accept'
      });
      return true;
    } catch (err) {
      logger.error('Error accepting call:', err);
      return false;
    }
  }, [token]);

  // رفض المكالمة
  const rejectCall = useCallback(async (call) => {
    try {
      await axios.post(`${API}/api/voip/call/action`, {
        call_id: call.id,
        action: 'reject'
      });
      setIncomingCall(null);
      return true;
    } catch (err) {
      logger.error('Error rejecting call:', err);
      return false;
    }
  }, [token]);

  // إعادة تعيين المكالمة
  const clearIncomingCall = useCallback(() => {
    setIncomingCall(null);
  }, []);

  // Polling للمكالمات الواردة
  useEffect(() => {
    if (!token || !user) return;

    // التحقق الأول بعد 2 ثانية (ليس فوراً)
    const initialTimeout = setTimeout(checkIncomingCall, 2000);

    // Polling كل 10 ثواني
    const interval = setInterval(checkIncomingCall, POLLING_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [token, user, checkIncomingCall]);

  return {
    incomingCall,
    acceptCall,
    rejectCall,
    clearIncomingCall,
    checkIncomingCall
  };
};

export default useIncomingCall;
