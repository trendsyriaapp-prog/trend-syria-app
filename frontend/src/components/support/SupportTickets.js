// /app/frontend/src/components/support/SupportTickets.js
// واجهة تذاكر الدعم للمستخدمين

import { useState, useEffect } from 'react';
import logger from '../../lib/logger';
import axios from 'axios';
import {
  HelpCircle, Plus, MessageCircle, Clock, 
  CheckCircle, AlertCircle, X, Send, RefreshCw,
  ChevronRight, Tag
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const CATEGORIES = {
  general: { label: 'استفسار عام', color: 'bg-blue-100 text-blue-700' },
  order: { label: 'مشكلة بالطلب', color: 'bg-orange-100 text-orange-700' },
  payment: { label: 'مشكلة بالدفع', color: 'bg-green-100 text-green-700' },
  delivery: { label: 'مشكلة بالتوصيل', color: 'bg-purple-100 text-purple-700' },
  account: { label: 'مشكلة بالحساب', color: 'bg-red-100 text-red-700' },
  other: { label: 'أخرى', color: 'bg-gray-100 text-gray-700' }
};

const STATUS_STYLES = {
  open: { label: 'مفتوحة', color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
  in_progress: { label: 'قيد المعالجة', color: 'bg-blue-100 text-blue-700', icon: Clock },
  resolved: { label: 'تم الحل', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  closed: { label: 'مغلقة', color: 'bg-gray-100 text-gray-700', icon: X }
};

const SupportTickets = ({ token }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  // New ticket form
  const [newTicket, setNewTicket] = useState({
    subject: '',
    message: '',
    category: 'general',
    priority: 'normal'
  });

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await axios.get(`${API}/api/support/tickets/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(res.data.tickets || []);
    } catch (err) {
      logger.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async () => {
    if (!newTicket.subject.trim() || !newTicket.message.trim()) {
      alert('يرجى ملء جميع الحقول');
      return;
    }
    
    setSending(true);
    try {
      await axios.post(`${API}/api/support/tickets`, newTicket, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowCreate(false);
      setNewTicket({ subject: '', message: '', category: 'general', priority: 'normal' });
      fetchTickets();
    } catch (err) {
      alert(err.response?.data?.detail || 'حدث خطأ');
    } finally {
      setSending(false);
    }
  };

  const sendReply = async () => {
    if (!newMessage.trim() || !selectedTicket) return;
    
    setSending(true);
    try {
      await axios.post(`${API}/api/support/tickets/${selectedTicket.id}/reply`, {
        message: newMessage.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewMessage('');
      
      // Refresh ticket
      const res = await axios.get(`${API}/api/support/tickets/${selectedTicket.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedTicket(res.data);
      fetchTickets();
    } catch (err) {
      alert(err.response?.data?.detail || 'حدث خطأ');
    } finally {
      setSending(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="animate-spin text-green-500" size={32} />
      </div>
    );
  }

  // Ticket detail view
  if (selectedTicket) {
    const StatusIcon = STATUS_STYLES[selectedTicket.status]?.icon || AlertCircle;
    
    return (
      <div className="space-y-4" data-testid="ticket-detail">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedTicket(null)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight size={20} />
          </button>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900">{selectedTicket.subject}</h3>
            <p className="text-sm text-gray-500">#{selectedTicket.ticket_number}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            STATUS_STYLES[selectedTicket.status]?.color
          }`}>
            {STATUS_STYLES[selectedTicket.status]?.label}
          </span>
        </div>

        {/* Messages */}
        <div className="bg-gray-50 rounded-xl p-4 max-h-[50vh] overflow-y-auto space-y-3">
          {selectedTicket.messages?.map((msg) => {
            const isAdmin = msg.sender_type === 'admin';
            return (
              <div
                key={msg.id}
                className={`flex ${isAdmin ? 'justify-start' : 'justify-end'}`}
              >
                <div className={`max-w-[80%] rounded-xl px-4 py-2 ${
                  isAdmin 
                    ? 'bg-white border border-gray-200' 
                    : 'bg-green-500 text-white'
                }`}>
                  <p className={`text-xs mb-1 ${isAdmin ? 'text-green-600 font-medium' : 'text-white/80'}`}>
                    {msg.sender_name}
                  </p>
                  <p className="text-sm">{msg.message}</p>
                  <p className={`text-[10px] mt-1 ${isAdmin ? 'text-gray-400' : 'text-white/60'}`}>
                    {formatDate(msg.created_at)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Reply input */}
        {selectedTicket.status !== 'closed' && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="اكتب ردك..."
              className="flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
              onKeyPress={(e) => e.key === 'Enter' && sendReply()}
            />
            <button
              onClick={sendReply}
              disabled={!newMessage.trim() || sending}
              className="px-4 py-3 bg-green-500 text-white rounded-xl disabled:opacity-50"
            >
              {sending ? <RefreshCw size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Create ticket form
  if (showCreate) {
    return (
      <div className="space-y-4" data-testid="create-ticket-form">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-gray-900">تذكرة دعم جديدة</h3>
          <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            value={newTicket.subject}
            onChange={(e) => setNewTicket({...newTicket, subject: e.target.value})}
            placeholder="عنوان المشكلة"
            className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
          />

          <select
            value={newTicket.category}
            onChange={(e) => setNewTicket({...newTicket, category: e.target.value})}
            className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {Object.entries(CATEGORIES).map(([key, val]) => (
              <option key={key} value={key}>{val.label}</option>
            ))}
          </select>

          <textarea
            value={newTicket.message}
            onChange={(e) => setNewTicket({...newTicket, message: e.target.value})}
            placeholder="اشرح مشكلتك بالتفصيل..."
            rows={4}
            className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />

          <button
            onClick={createTicket}
            disabled={sending}
            className="w-full py-3 bg-green-500 text-white rounded-xl font-medium disabled:opacity-50"
          >
            {sending ? 'جاري الإرسال...' : 'إرسال التذكرة'}
          </button>
        </div>
      </div>
    );
  }

  // Tickets list
  return (
    <div className="space-y-4" data-testid="support-tickets">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-900">تذاكر الدعم</h3>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-xl text-sm"
        >
          <Plus size={18} />
          تذكرة جديدة
        </button>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <HelpCircle size={48} className="mx-auto mb-3 text-gray-300" />
          <p>لا توجد تذاكر دعم</p>
          <p className="text-sm">هل تحتاج مساعدة؟ أنشئ تذكرة جديدة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const StatusIcon = STATUS_STYLES[ticket.status]?.icon || AlertCircle;
            const category = CATEGORIES[ticket.category] || CATEGORIES.other;
            
            return (
              <button
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="w-full bg-white border rounded-xl p-4 text-right hover:border-green-500 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${STATUS_STYLES[ticket.status]?.color}`}>
                    <StatusIcon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-gray-900 truncate">{ticket.subject}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${category.color}`}>
                        {category.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">#{ticket.ticket_number}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatDate(ticket.updated_at)}</p>
                  </div>
                  <ChevronRight size={20} className="text-gray-400 rotate-180" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SupportTickets;
