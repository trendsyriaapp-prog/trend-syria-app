// /app/frontend/src/hooks/useWebSocket.js
// Hook للاتصال بـ WebSocket - مبسط وموثوق
// 🔒 يعتمد على Cookies للمصادقة

import { useState, useEffect, useCallback, useRef } from 'react';
import logger from '../lib/logger';
import { useAuth } from '../context/AuthContext';

const WS_URL = process.env.REACT_APP_BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://') + '/ws';

export const useWebSocket = ({
  onMessage,
  onConnect,
  onDisconnect,
  autoConnect = true
} = {}) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // تنظيف عند الإغلاق
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.onopen = null;
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }
  }, []);

  // الاتصال - يستخدم user_id بدلاً من token
  const connect = useCallback(() => {
    cleanup();
    if (!user?.id) {
      logger.log('WebSocket: No user, skipping connection');
      return;
    }

    try {
      setConnectionStatus('connecting');
      // 🔒 نستخدم user_id للتعريف - الـ cookie ستُرسل تلقائياً
      const ws = new WebSocket(`${WS_URL}?user_id=${user.id}`);
      wsRef.current = ws;

      ws.onopen = () => {
        logger.log('WebSocket: Connected');
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttempts.current = 0;
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch (e) {
          logger.error('WebSocket: Parse error', e);
        }
      };

      ws.onclose = (event) => {
        logger.log('WebSocket: Disconnected', event.code);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        wsRef.current = null;
        onDisconnect?.(event);

        // إعادة الاتصال تلقائياً
        if (reconnectAttempts.current < maxReconnectAttempts && event.code !== 1000) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectAttempts.current += 1;
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      };

      ws.onerror = (error) => {
        logger.error('WebSocket: Error', error);
        setConnectionStatus('error');
      };
    } catch (error) {
      logger.error('WebSocket: Connection failed', error);
      setConnectionStatus('error');
    }
  }, [cleanup, onConnect, onDisconnect, onMessage]);

  // قطع الاتصال
  const disconnect = useCallback(() => {
    cleanup();
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, [cleanup]);

  // إرسال رسالة
  const send = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  // الانضمام لغرفة
  const joinRoom = useCallback((room) => {
    return send({ type: 'join', room });
  }, [send]);

  // مغادرة غرفة
  const leaveRoom = useCallback((room) => {
    return send({ type: 'leave', room });
  }, [send]);

  // الاشتراك في تحديثات طلب
  const subscribeToOrder = useCallback((orderId) => {
    return joinRoom(`order_${orderId}`);
  }, [joinRoom]);

  // الاتصال التلقائي عند تغير حالة المستخدم
  useEffect(() => {
    if (autoConnect) {
      if (user?.id) {
        connect();
      } else {
        disconnect();
      }
    }

    return cleanup;
  }, [autoConnect, user?.id, connect, cleanup, disconnect]);

  return {
    isConnected,
    connectionStatus,
    connect,
    disconnect,
    send,
    joinRoom,
    leaveRoom,
    subscribeToOrder
  };
};

export default useWebSocket;
