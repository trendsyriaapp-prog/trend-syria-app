// /app/frontend/src/context/WebSocketContext.js
// Context للـ WebSocket - يوفر اتصال مشترك للتطبيق بأكمله

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { useToast } from '../hooks/use-toast';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState([]);
  
  const handleMessage = useCallback((message) => {
    console.log('WebSocket message:', message.type);
    
    switch (message.type) {
      case 'connected':
        console.log('WebSocket: Connected with rooms:', message.rooms);
        break;
        
      case 'notification':
        // إضافة إشعار جديد
        setNotifications(prev => [message.data, ...prev]);
        if (message.data?.play_sound) {
          // يمكن تشغيل صوت هنا
        }
        toast({
          title: message.data?.title || 'إشعار جديد',
          description: message.data?.message
        });
        break;
        
      case 'order_update':
        // تحديث طلب
        window.dispatchEvent(new CustomEvent('order_update', { 
          detail: message 
        }));
        break;
        
      case 'driver_location':
        // تحديث موقع السائق
        window.dispatchEvent(new CustomEvent('driver_location', { 
          detail: message.data 
        }));
        break;
        
      case 'new_order_available':
        // طلب جديد متاح للسائقين
        window.dispatchEvent(new CustomEvent('new_order_available', { 
          detail: message.data 
        }));
        toast({
          title: '🆕 طلب جديد!',
          description: `طلب جديد متاح في ${message.data?.city || 'منطقتك'}`
        });
        break;
        
      case 'room_joined':
        console.log('Joined room:', message.room);
        break;
        
      case 'room_left':
        console.log('Left room:', message.room);
        break;
        
      default:
        // أنواع رسائل أخرى
        window.dispatchEvent(new CustomEvent(`ws_${message.type}`, { 
          detail: message 
        }));
    }
  }, [toast]);

  const handleConnect = useCallback(() => {
    console.log('WebSocket Provider: Connected');
  }, []);

  const handleDisconnect = useCallback((event) => {
    console.log('WebSocket Provider: Disconnected');
    if (event.code !== 1000 && event.code !== 1001) {
      // قطع غير طبيعي
      toast({
        title: 'انقطع الاتصال',
        description: 'جاري إعادة الاتصال...',
        variant: 'warning'
      });
    }
  }, [toast]);

  const ws = useWebSocket({
    onMessage: handleMessage,
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    autoConnect: true
  });

  // تنظيف الإشعارات القديمة
  useEffect(() => {
    const cleanup = setInterval(() => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      setNotifications(prev => 
        prev.filter(n => new Date(n.created_at).getTime() > oneHourAgo)
      );
    }, 5 * 60 * 1000); // كل 5 دقائق

    return () => clearInterval(cleanup);
  }, []);

  const value = {
    ...ws,
    notifications,
    clearNotifications: () => setNotifications([])
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    console.warn('useWebSocketContext must be used within WebSocketProvider');
    return {
      isConnected: false,
      connectionStatus: 'disconnected',
      send: () => false,
      joinRoom: () => false,
      leaveRoom: () => false,
      subscribeToOrder: () => false,
      notifications: []
    };
  }
  return context;
};

export default WebSocketContext;
