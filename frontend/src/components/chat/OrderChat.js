// /app/frontend/src/components/chat/OrderChat.js
// مكون الدردشة بين السائق والعميل

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  MessageCircle, Send, X, User, Truck, 
  RefreshCw, Check, CheckCheck
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const OrderChat = ({ orderId, orderNumber, isOpen, onClose, userType = 'customer' }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [conversation, setConversation] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchConversation();
      // تحديث كل 5 ثواني
      const interval = setInterval(fetchConversation, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, orderId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversation = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/api/chat/conversation/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversation(res.data);
      setMessages(res.data.messages || []);
      
      // تحديد الرسائل كمقروءة
      if (res.data.messages?.length > 0) {
        await axios.post(`${API}/api/chat/mark-read`, 
          { order_id: orderId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
    } catch (err) {
      console.error('Error fetching conversation:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    
    setSending(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/api/chat/send`, {
        order_id: orderId,
        message: newMessage.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setNewMessage('');
      fetchConversation();
      inputRef.current?.focus();
    } catch (err) {
      console.error('Error sending message:', err);
      alert(err.response?.data?.detail || 'فشل إرسال الرسالة');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ar-SY', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:w-96 h-[80vh] sm:h-[500px] sm:rounded-xl flex flex-col overflow-hidden shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              {userType === 'delivery' ? <User size={20} /> : <Truck size={20} />}
            </div>
            <div>
              <h3 className="font-bold">
                {userType === 'delivery' ? conversation?.customer?.name : conversation?.driver?.name || 'السائق'}
              </h3>
              <p className="text-xs text-white/80">طلب #{orderNumber || orderId?.slice(0, 8)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50" data-testid="chat-messages">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw size={24} className="text-green-500 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <MessageCircle size={48} className="mb-3" />
              <p>لا توجد رسائل</p>
              <p className="text-sm">ابدأ المحادثة الآن!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_type === (userType === 'delivery' ? 'driver' : 'customer');
              
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                      isMe
                        ? 'bg-green-500 text-white rounded-br-none'
                        : 'bg-white text-gray-900 rounded-bl-none shadow-sm'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.message}</p>
                    <div className={`flex items-center gap-1 mt-1 ${
                      isMe ? 'justify-end' : 'justify-start'
                    }`}>
                      <span className={`text-[10px] ${isMe ? 'text-white/70' : 'text-gray-400'}`}>
                        {formatTime(msg.created_at)}
                      </span>
                      {isMe && (
                        msg.is_read ? (
                          <CheckCheck size={12} className="text-white/70" />
                        ) : (
                          <Check size={12} className="text-white/70" />
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {conversation?.can_chat ? (
          <div className="p-3 bg-white border-t">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="اكتب رسالتك..."
                className="flex-1 px-4 py-3 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={sending}
                data-testid="chat-input"
              />
              <button
                onClick={handleSend}
                disabled={!newMessage.trim() || sending}
                className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 transition-colors"
                data-testid="chat-send-btn"
              >
                {sending ? (
                  <RefreshCw size={20} className="animate-spin" />
                ) : (
                  <Send size={20} />
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-gray-100 text-center text-sm text-gray-500">
            لا يمكن المحادثة في هذا الوقت
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderChat;
