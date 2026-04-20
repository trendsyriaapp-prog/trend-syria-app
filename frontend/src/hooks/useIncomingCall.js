// /app/frontend/src/hooks/useIncomingCall.js
// Hook للتحقق من المكالمات الواردة

import { useState, useEffect, useCallback } from 'react';
import logger from '../lib/logger';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;

const useIncomingCall = () => {
  const { token, user } = useAuth();
  const [incomingCall, setIncomingCall] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  // التحقق من المكالمات الواردة
  const checkIncomingCall = useCallback(async () => {
    if (!token || isChecking) return;
    
    setIsChecking(true);
    try {
      const response = await axios.get(`${API}/api/voip/incoming-call`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.has_incoming_call) {
        setIncomingCall(response.data.call);
      } else {
        setIncomingCall(null);
      }
    } catch (err) {
      logger.error('Error checking incoming call:', err);
    } finally {
      setIsChecking(false);
    }
  }, [token, isChecking]);

  // قبول المكالمة
  const acceptCall = useCallback(async (call) => {
    try {
      await axios.post(`${API}/api/voip/call/action`, {
        call_id: call.id,
        action: 'accept'
      }, {
        headers: { Authorization: `Bearer ${token}` }
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
      }, {
        headers: { Authorization: `Bearer ${token}` }
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

  // Polling للمكالمات الواردة كل 3 ثواني
  useEffect(() => {
    if (!token || !user) return;

    // التحقق الأول
    checkIncomingCall();

    // Polling
    const interval = setInterval(checkIncomingCall, 3000);

    return () => clearInterval(interval);
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
