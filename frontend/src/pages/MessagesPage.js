import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Send, ArrowRight, User, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MessagesPage = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('product');
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState(null);
  
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (user) {
      if (userId) {
        fetchMessages();
      } else {
        fetchConversations();
      }
    }
  }, [user, userId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversations = async () => {
    try {
      const res = await axios.get(`${API}/messages`);
      setConversations(res.data);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`${API}/messages/${userId}`);
      setMessages(res.data);
      
      // Get other user info from first message
      if (res.data.length > 0) {
        const firstMsg = res.data[0];
        setOtherUser({
          id: userId,
          name: firstMsg.sender_id === user.id ? firstMsg.receiver_name : firstMsg.sender_name
        });
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await axios.post(`${API}/messages`, {
        receiver_id: userId,
        content: newMessage,
        product_id: productId || null
      });

      setMessages([...messages, {
        id: Date.now(),
        sender_id: user.id,
        sender_name: user.name,
        receiver_id: userId,
        content: newMessage,
        created_at: new Date().toISOString()
      }]);
      setNewMessage('');
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل إرسال الرسالة",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  // Don't redirect immediately, wait for auth to load
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }

  // Chat view
  if (userId) {
    return (
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-3 shadow-sm">
          <Link to="/messages" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowRight size={20} className="text-gray-600" />
          </Link>
          <div className="w-10 h-10 rounded-full bg-[#FF6B00] flex items-center justify-center">
            <span className="text-white font-bold">{otherUser?.name?.[0] || '?'}</span>
          </div>
          <span className="font-bold text-gray-900">{otherUser?.name || 'محادثة'}</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#FF6B00]" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-400 py-10">
              <MessageCircle size={40} className="mx-auto mb-2 opacity-50" />
              <p>ابدأ محادثة جديدة</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.sender_id === user.id;
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2 shadow-sm ${
                    isMine ? 'bg-[#FF6B00] text-white' : 'bg-white text-gray-900 border border-gray-200'
                  }`}>
                    <p>{msg.content}</p>
                    <p className={`text-[10px] mt-1 ${isMine ? 'text-white/70' : 'text-gray-400'}`}>
                      {new Date(msg.created_at).toLocaleTimeString('ar-SY', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="flex-1 bg-gray-100 border border-gray-200 rounded-full py-3 px-5 text-gray-900 placeholder:text-gray-400 focus:border-[#FF6B00] focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20"
              placeholder="اكتب رسالة..."
              data-testid="message-input"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="p-3 bg-[#FF6B00] text-white rounded-full hover:bg-[#E65000] disabled:opacity-50 transition-colors shadow-sm"
              data-testid="send-message-btn"
            >
              <Send size={20} />
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Conversations list
  return (
    <div className="min-h-screen pb-20 md:pb-10 bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-900">الرسائل</h1>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#FF6B00]" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="text-center py-20">
            <MessageCircle size={64} className="text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2 text-gray-900">لا توجد رسائل</h2>
            <p className="text-gray-500">ابدأ محادثة مع بائع من صفحة المنتج</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <Link
                key={conv.user.id}
                to={`/messages/${conv.user.id}`}
                className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 hover:border-[#FF6B00]/30 hover:shadow-md transition-all"
                data-testid={`conv-${conv.user.id}`}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-[#FF6B00] flex items-center justify-center">
                    <span className="text-white font-bold">{conv.user.name[0]}</span>
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900">{conv.user.name}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(conv.last_message.created_at).toLocaleDateString('ar-SY')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 truncate">
                    {conv.last_message.is_mine && 'أنت: '}
                    {conv.last_message.content}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPage;
