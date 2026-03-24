// /app/frontend/src/pages/ChatPage.js
// صفحة المحادثة بين السائق والعميل

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Send, Phone, MapPin, Package, Clock, User } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;

const ChatPage = () => {
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const chatType = searchParams.get('type') || 'shopping';
  const navigate = useNavigate();
  const { user, token } = useAuth();
  
  const [order, setOrder] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  
  // رسائل سريعة جاهزة
  const quickMessages = [
    'مرحباً، أنا في الطريق إليك',
    'وصلت، هل يمكنك النزول؟',
    'أنا أمام المبنى الآن',
    'تم استلام الطلب من المتجر',
    'سأصل خلال 5 دقائق',
    'هل يمكنك إرسال الموقع بالضبط؟',
  ];

  // جلب بيانات الطلب
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        // جلب الطلب من API
        const endpoint = chatType === 'food' 
          ? `${API}/api/food/orders/${orderId}`
          : `${API}/api/orders/${orderId}`;
        
        const response = await axios.get(endpoint, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setOrder(response.data);
        
        // جلب الرسائل
        await fetchMessages();
      } catch (error) {
        console.error('Error fetching order:', error);
        // إنشاء طلب وهمي للعرض
        setOrder({
          id: orderId,
          customer_name: 'العميل',
          customer_phone: '09xxxxxxxx',
          delivery_address: 'العنوان غير متاح',
          status: 'في الطريق'
        });
      } finally {
        setLoading(false);
      }
    };

    if (token && orderId) {
      fetchOrder();
    }
  }, [orderId, token, chatType]);

  // جلب الرسائل
  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API}/api/chat/conversation/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data?.messages || []);
    } catch (error) {
      // لا توجد رسائل سابقة
      setMessages([]);
    }
  };

  // إرسال رسالة
  const sendMessage = async (text) => {
    if (!text.trim()) return;
    
    const messageText = text.trim();
    setNewMessage('');
    setSending(true);
    
    // إضافة الرسالة للقائمة مباشرة (optimistic update)
    const tempMessage = {
      id: Date.now(),
      sender_id: user?.id,
      sender_type: user?.user_type,
      message: messageText,
      created_at: new Date().toISOString(),
      is_mine: true
    };
    setMessages(prev => [...prev, tempMessage]);
    
    try {
      await axios.post(`${API}/api/chat/send`, {
        order_id: orderId,
        message: messageText
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      // الرسالة تبقى معروضة حتى لو فشل الإرسال
    } finally {
      setSending(false);
    }
    
    // التمرير للأسفل
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // التمرير للأسفل عند تحميل الرسائل
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-500 text-white p-4 sticky top-0 z-10 shadow-lg flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <ArrowRight size={24} />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-lg flex items-center gap-2">
              <User size={20} />
              محادثة العميل
            </h1>
            <p className="text-sm text-white/80">
              {order?.customer_name || 'العميل'}
            </p>
          </div>
          {/* زر الاتصال بالعميل */}
          <a
            href={`tel:${order?.customer_phone || order?.delivery_phone}`}
            className="p-3 bg-white/20 rounded-full hover:bg-white/30 transition-colors flex items-center gap-2"
            title="اتصال بالعميل"
          >
            <Phone size={20} />
            <span className="text-xs">العميل</span>
          </a>
        </div>
      </div>

      {/* معلومات الطلب */}
      <div className="bg-white border-b p-3 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Package size={16} className="text-green-500" />
            <span>طلب #{orderId?.substring(0, 8)}</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin size={16} className="text-red-500" />
            <span className="truncate max-w-[150px]">
              {typeof order?.delivery_address === 'string' 
                ? order.delivery_address 
                : order?.delivery_address?.street || 'العنوان'}
            </span>
          </div>
        </div>
      </div>

      {/* منطقة الرسائل */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-3">
              <Send size={28} className="text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm">لا توجد رسائل بعد</p>
            <p className="text-xs text-gray-400 mt-1">ابدأ المحادثة مع العميل</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={msg.id || index}
              className={`flex ${msg.is_mine || msg.sender_id === user?.id ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-2xl ${
                  msg.is_mine || msg.sender_id === user?.id
                    ? 'bg-green-500 text-white rounded-br-none'
                    : 'bg-white text-gray-800 rounded-bl-none shadow'
                }`}
              >
                <p className="text-sm">{msg.message}</p>
                <p className={`text-[10px] mt-1 ${
                  msg.is_mine || msg.sender_id === user?.id ? 'text-white/70' : 'text-gray-400'
                }`}>
                  {new Date(msg.created_at).toLocaleTimeString('ar-SY', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* الرسائل السريعة */}
      <div className="bg-white border-t p-2 overflow-x-auto flex-shrink-0">
        <div className="flex gap-2">
          {quickMessages.map((msg, index) => (
            <button
              key={index}
              onClick={() => sendMessage(msg)}
              className="flex-shrink-0 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-700 transition-colors"
            >
              {msg}
            </button>
          ))}
        </div>
      </div>

      {/* حقل الإدخال */}
      <div className="bg-white border-t p-3 flex-shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage(newMessage)}
            placeholder="اكتب رسالتك..."
            className="flex-1 px-4 py-3 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            disabled={sending}
          />
          <button
            onClick={() => sendMessage(newMessage)}
            disabled={!newMessage.trim() || sending}
            className={`p-3 rounded-full transition-colors ${
              newMessage.trim() && !sending
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-200 text-gray-400'
            }`}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
