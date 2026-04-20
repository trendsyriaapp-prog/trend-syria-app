// /app/frontend/src/hooks/useWebSocket.js
// Hook للاتصال بـ WebSocket والتحديثات الفورية

import { useEffect, useRef, useState, useCallback } from 'react';
import logger from '../lib/logger';

const API = process.env.REACT_APP_BACKEND_URL;

// تحويل HTTP URL إلى WebSocket URL
const getWsUrl = () => {
  const httpUrl = API || window.location.origin;
  return httpUrl.replace('https://', 'wss://').replace('http://', 'ws://');
};

export const useWebSocket = (options = {}) => {
  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    autoConnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 10
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  
  const wsRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef(null);
  const shouldReconnectRef = useRef(true);

  const connect = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      logger.log('WebSocket: No token, skipping connection');
      return;
    }

    // إغلاق أي اتصال موجود
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = `${getWsUrl()}/api/ws?token=${token}`;
    logger.log('WebSocket: Connecting to', wsUrl.split('?')[0]);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      setConnectionStatus('connecting');

      ws.onopen = () => {
        logger.log('WebSocket: Connected');
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // تجاهل رسائل ping/pong
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
            return;
          }
          if (data.type === 'pong') return;

          setLastMessage(data);
          onMessage?.(data);
        } catch (e) {
          logger.error('WebSocket: Error parsing message', e);
        }
      };

      ws.onclose = (event) => {
        logger.log('WebSocket: Disconnected', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        onDisconnect?.(event);

        // إعادة الاتصال تلقائياً
        if (shouldReconnectRef.current && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          logger.log(`WebSocket: Reconnecting (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          setConnectionStatus('reconnecting');
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        logger.error('WebSocket: Error', error);
        onError?.(error);
      };

    } catch (error) {
      logger.error('WebSocket: Failed to create connection', error);
      setConnectionStatus('error');
    }
  }, [onMessage, onConnect, onDisconnect, onError, reconnectInterval, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
  }, []);

  const send = useCallback((data) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      return true;
    }
    logger.warn('WebSocket: Cannot send, not connected');
    return false;
  }, []);

  const joinRoom = useCallback((room) => {
    return send({ type: 'join_room', room });
  }, [send]);

  const leaveRoom = useCallback((room) => {
    return send({ type: 'leave_room', room });
  }, [send]);

  const subscribeToOrder = useCallback((orderId) => {
    return send({ type: 'subscribe_order', order_id: orderId });
  }, [send]);

  const unsubscribeFromOrder = useCallback((orderId) => {
    return send({ type: 'unsubscribe_order', order_id: orderId });
  }, [send]);

  // الاتصال التلقائي عند التحميل
  useEffect(() => {
    if (autoConnect) {
      shouldReconnectRef.current = true;
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // إعادة الاتصال عند تغيير token
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        if (e.newValue) {
          connect();
        } else {
          disconnect();
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [connect, disconnect]);

  return {
    isConnected,
    connectionStatus,
    lastMessage,
    send,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    subscribeToOrder,
    unsubscribeFromOrder
  };
};

export default useWebSocket;
