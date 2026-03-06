// /app/frontend/src/components/admin/SupportTicketsTab.js
// تبويب إدارة تذاكر الدعم في لوحة المدير

import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Headphones, MessageCircle, Clock, CheckCircle, User,
  Phone, Calendar, Filter, Search, X, Send, AlertCircle,
  Loader2, ChevronDown, ChevronUp
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-SY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const SupportTicketsTab = () => {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ pending: 0, assigned: 0, resolved: 0 });
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await axios.get(`${API}/api/chatbot/admin/support-requests`);
      setTickets(res.data.requests);
      setStats(res.data.stats);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTicketStatus = async (ticketId, newStatus) => {
    try {
      await axios.put(`${API}/api/chatbot/admin/support-requests/${ticketId}?status=${newStatus}`);
      fetchTickets();
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
    } catch (error) {
      alert(error.response?.data?.detail || 'حدث خطأ');
    }
  };

  const fetchChatHistory = async (userId, sessionId) => {
    try {
      // This would need a new API endpoint to fetch chat by session
      // For now, we'll just show the initial message
      setChatHistory([]);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  };

  const handleSelectTicket = (ticket) => {
    setSelectedTicket(ticket);
    fetchChatHistory(ticket.user_id, ticket.session_id);
  };

  const filteredTickets = tickets.filter(ticket => {
    if (filter !== 'all' && ticket.status !== filter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        ticket.user_name?.toLowerCase().includes(query) ||
        ticket.user_phone?.includes(query) ||
        ticket.initial_message?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={AlertCircle}
          label="قيد الانتظار"
          value={stats.pending}
          color="amber"
          onClick={() => setFilter('pending')}
          active={filter === 'pending'}
        />
        <StatCard
          icon={Headphones}
          label="قيد المعالجة"
          value={stats.assigned}
          color="blue"
          onClick={() => setFilter('assigned')}
          active={filter === 'assigned'}
        />
        <StatCard
          icon={CheckCircle}
          label="تم الحل"
          value={stats.resolved}
          color="green"
          onClick={() => setFilter('resolved')}
          active={filter === 'resolved'}
        />
        <StatCard
          icon={MessageCircle}
          label="الإجمالي"
          value={tickets.length}
          color="gray"
          onClick={() => setFilter('all')}
          active={filter === 'all'}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Header & Search */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">تذاكر الدعم</h2>
              <div className="flex gap-2">
                {['all', 'pending', 'assigned', 'resolved'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                      filter === f
                        ? 'bg-[#FF6B00] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f === 'all' ? 'الكل' : f === 'pending' ? 'انتظار' : f === 'assigned' ? 'معالجة' : 'محلول'}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="بحث بالاسم، رقم الهاتف، أو الرسالة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
              />
            </div>
          </div>

          {/* Tickets List */}
          <div className="max-h-[500px] overflow-y-auto">
            {filteredTickets.length === 0 ? (
              <div className="p-8 text-center">
                <Headphones size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">لا توجد تذاكر دعم</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredTickets.map((ticket) => (
                  <TicketRow
                    key={ticket.id}
                    ticket={ticket}
                    isSelected={selectedTicket?.id === ticket.id}
                    onClick={() => handleSelectTicket(ticket)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ticket Details */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {selectedTicket ? (
            <TicketDetails
              ticket={selectedTicket}
              chatHistory={chatHistory}
              onUpdateStatus={updateTicketStatus}
              onClose={() => setSelectedTicket(null)}
            />
          ) : (
            <div className="p-8 text-center h-full flex flex-col items-center justify-center">
              <MessageCircle size={48} className="text-gray-300 mb-4" />
              <p className="text-gray-500">اختر تذكرة لعرض التفاصيل</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color, onClick, active }) => {
  const colors = {
    amber: 'bg-amber-100 text-amber-600',
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    gray: 'bg-gray-100 text-gray-600'
  };

  return (
    <button
      onClick={onClick}
      className={`bg-white rounded-xl border p-4 text-right transition-all ${
        active ? 'border-[#FF6B00] ring-2 ring-[#FF6B00]/20' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center mb-2`}>
        <Icon size={20} />
      </div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </button>
  );
};

const TicketRow = ({ ticket, isSelected, onClick }) => {
  const statusColors = {
    pending: 'bg-amber-100 text-amber-700',
    assigned: 'bg-blue-100 text-blue-700',
    resolved: 'bg-green-100 text-green-700'
  };

  const statusLabels = {
    pending: 'انتظار',
    assigned: 'معالجة',
    resolved: 'محلول'
  };

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 text-right hover:bg-gray-50 transition-colors ${
        isSelected ? 'bg-orange-50' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-gray-900">{ticket.user_name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[ticket.status]}`}>
              {statusLabels[ticket.status]}
            </span>
          </div>
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <Phone size={12} />
            {ticket.user_phone}
          </p>
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
            {ticket.initial_message}
          </p>
        </div>
        <div className="text-xs text-gray-400">
          {formatDate(ticket.created_at)}
        </div>
      </div>
    </button>
  );
};

const TicketDetails = ({ ticket, chatHistory, onUpdateStatus, onClose }) => {
  const [replyMessage, setReplyMessage] = useState('');
  const [sending, setSending] = useState(false);

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    assigned: 'bg-blue-100 text-blue-700 border-blue-200',
    resolved: 'bg-green-100 text-green-700 border-green-200'
  };

  const statusLabels = {
    pending: 'قيد الانتظار',
    assigned: 'قيد المعالجة',
    resolved: 'تم الحل'
  };

  const sendReply = async () => {
    if (!replyMessage.trim() || sending) return;
    
    setSending(true);
    try {
      await axios.post(`${API}/api/chatbot/admin/reply`, {
        ticket_id: ticket.id,
        user_id: ticket.user_id,
        message: replyMessage
      });
      setReplyMessage('');
      alert('تم إرسال الرد للعميل بنجاح!');
    } catch (error) {
      alert(error.response?.data?.detail || 'حدث خطأ في إرسال الرد');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">تفاصيل التذكرة</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 bg-[#FF6B00] rounded-full flex items-center justify-center">
            <User size={24} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900">{ticket.user_name}</p>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Phone size={12} />
              {ticket.user_phone}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm border ${statusColors[ticket.status]}`}>
            {statusLabels[ticket.status]}
          </span>
          <span className="text-xs text-gray-400 flex items-center gap-1">
            <Calendar size={12} />
            {formatDate(ticket.created_at)}
          </span>
        </div>
      </div>

      {/* Message */}
      <div className="p-4 flex-1 overflow-y-auto">
        <h4 className="text-sm font-bold text-gray-700 mb-2">رسالة العميل:</h4>
        <div className="bg-gray-100 rounded-xl p-4">
          <p className="text-gray-800">{ticket.initial_message}</p>
        </div>

        {/* Chat History would go here */}
        {chatHistory.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-bold text-gray-700">سجل المحادثة:</h4>
            {chatHistory.map((msg, i) => (
              <div key={i} className={`p-2 rounded-lg text-sm ${
                msg.sender === 'user' ? 'bg-gray-100' : 'bg-orange-50'
              }`}>
                {msg.message}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="space-y-3">
          {/* Reply to Customer */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-2">إرسال رد للعميل (كإشعار):</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                placeholder="اكتب ردك هنا..."
                className="flex-1 p-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
                disabled={sending}
              />
              <button
                onClick={sendReply}
                disabled={!replyMessage.trim() || sending}
                className="px-4 py-2 bg-[#FF6B00] text-white rounded-lg text-sm font-bold hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                إرسال
              </button>
            </div>
          </div>

          {/* Status Actions */}
          <div className="flex gap-2">
            {ticket.status === 'pending' && (
              <button
                onClick={() => onUpdateStatus(ticket.id, 'assigned')}
                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Headphones size={16} />
                استلام التذكرة
              </button>
            )}
            {ticket.status === 'assigned' && (
              <button
                onClick={() => onUpdateStatus(ticket.id, 'resolved')}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle size={16} />
                تم الحل
              </button>
            )}
            {ticket.status === 'resolved' && (
              <button
                onClick={() => onUpdateStatus(ticket.id, 'pending')}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                <AlertCircle size={16} />
                إعادة فتح
              </button>
            )}
          </div>

          {/* Contact Info */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">للتواصل مع العميل:</p>
            <a
              href={`tel:${ticket.user_phone}`}
              className="text-[#FF6B00] font-bold text-lg hover:underline flex items-center gap-2"
            >
              <Phone size={18} />
              {ticket.user_phone}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportTicketsTab;
