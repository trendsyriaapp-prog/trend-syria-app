// /app/frontend/src/components/admin/SupportTicketsTab.js
// تبويب إدارة تذاكر الدعم في لوحة المدير

import { useState, useEffect } from 'react';
import logger from '../../lib/logger';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Headphones, MessageCircle, Clock, CheckCircle, User,
  Phone, Calendar, Filter, Search, X, Send, AlertCircle,
  Loader2, ChevronDown, ChevronUp, Star, TrendingUp,
  BarChart3, Users, Timer, PieChart, Trash2
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

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
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ pending: 0, assigned: 0, resolved: 0 });
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);
  const [ratingStats, setRatingStats] = useState(null);
  const [showRatings, setShowRatings] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    fetchTickets();
    fetchRatingStats();
    fetchAnalytics();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await axios.get(`${API}/api/chatbot/admin/support-requests`);
      setTickets(res.data.requests);
      setStats(res.data.stats);
    } catch (error) {
      logger.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRatingStats = async () => {
    try {
      const res = await axios.get(`${API}/api/chatbot/admin/rating-stats`);
      setRatingStats(res.data);
    } catch (error) {
      logger.error('Error fetching rating stats:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const res = await axios.get(`${API}/api/chatbot/admin/analytics`);
      setAnalytics(res.data);
    } catch (error) {
      logger.error('Error fetching analytics:', error);
    }
  };

  const updateTicketStatus = async (ticketId, newStatus) => {
    try {
      await axios.put(`${API}/api/chatbot/admin/support-requests/${ticketId}?status=${newStatus}`);
      fetchTickets();
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
      toast({ title: "تم بنجاح", description: "تم تحديث حالة التذكرة" });
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || 'حدث خطأ', variant: "destructive" });
    }
  };

  const deleteTicket = async (ticketId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه التذكرة نهائياً؟')) return;
    
    try {
      await axios.delete(`${API}/api/chatbot/admin/support-requests/${ticketId}`);
      fetchTickets();
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(null);
      }
      toast({ title: "تم الحذف", description: "تم حذف التذكرة بنجاح" });
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || 'حدث خطأ', variant: "destructive" });
    }
  };

  const fetchChatHistory = async (userId, sessionId) => {
    try {
      // This would need a new API endpoint to fetch chat by session
      // For now, we'll just show the initial message
      setChatHistory([]);
    } catch (error) {
      logger.error('Error fetching chat history:', error);
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
    <div className="space-y-3">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
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
        {/* Rating Stats Card */}
        <button
          onClick={() => setShowRatings(!showRatings)}
          className={`bg-white rounded-lg border p-4 text-right transition-all ${
            showRatings ? 'border-yellow-400 ring-2 ring-yellow-400/20' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="w-10 h-10 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center mb-2">
            <Star size={20} className="fill-yellow-500" />
          </div>
          <p className="text-xs text-gray-500">متوسط التقييم</p>
          <div className="flex items-center gap-1">
            <p className="text-2xl font-bold text-gray-900">
              {ratingStats?.average_rating || 0}
            </p>
            <span className="text-xs text-gray-400">/ 5</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">
            ({ratingStats?.total_ratings || 0} تقييم)
          </p>
        </button>
      </div>

      {/* Analytics Toggle Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAnalytics(!showAnalytics)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            showAnalytics 
              ? 'bg-purple-500 text-white' 
              : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
          }`}
        >
          <BarChart3 size={18} />
          {showAnalytics ? 'إخفاء التحليلات' : 'عرض التحليلات المتقدمة'}
        </button>
      </div>

      {/* Analytics Panel */}
      <AnimatePresence>
        {showAnalytics && analytics && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <AnalyticsPanel analytics={analytics} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rating Stats Panel */}
      <AnimatePresence>
        {showRatings && ratingStats && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <RatingStatsPanel stats={ratingStats} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Tickets List */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 overflow-hidden">
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
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          {selectedTicket ? (
            <TicketDetails
              ticket={selectedTicket}
              chatHistory={chatHistory}
              onUpdateStatus={updateTicketStatus}
              onDelete={deleteTicket}
              onClose={() => setSelectedTicket(null)}
              toast={toast}
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
      className={`bg-white rounded-lg border p-4 text-right transition-all ${
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

const TicketDetails = ({ ticket, chatHistory, onUpdateStatus, onDelete, onClose, toast }) => {
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
      toast({ title: "تم بنجاح", description: "تم إرسال الرد للعميل" });
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || 'حدث خطأ في إرسال الرد', variant: "destructive" });
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
        <div className="bg-gray-100 rounded-lg p-4">
          <p className="text-gray-800">{ticket.initial_message}</p>
        </div>

        {/* Chat History would go here */}
        {chatHistory.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-bold text-gray-700">سجل المحادثة:</h4>
            {chatHistory.map((msg, i) => (
              <div key={msg.id || msg.timestamp || `msg-${i}`} className={`p-2 rounded-lg text-sm ${
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
            {/* زر الحذف */}
            <button
              onClick={() => onDelete(ticket.id)}
              className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-1"
              title="حذف التذكرة"
            >
              <Trash2 size={16} />
              حذف
            </button>
          </div>

          {/* Contact Info */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">للتواصل مع العميل:</p>
            <a
              href={`tel:${ticket.user_phone}`}
              className="text-[#FF6B00] font-bold text-sm hover:underline flex items-center gap-2"
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

// مكون إحصائيات التقييمات
const RatingStatsPanel = ({ stats }) => {
  const maxCount = Math.max(...Object.values(stats.rating_distribution || {}), 1);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Star size={20} className="text-yellow-500 fill-yellow-500" />
        <h3 className="font-bold text-gray-900">إحصائيات تقييمات العملاء</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Rating Distribution */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">توزيع التقييمات</h4>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => {
              const count = stats.rating_distribution?.[rating] || 0;
              const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
              
              return (
                <div key={rating} className="flex items-center gap-2">
                  <div className="flex items-center gap-1 w-12">
                    <span className="text-sm font-medium">{rating}</span>
                    <Star size={14} className="text-yellow-400 fill-yellow-400" />
                  </div>
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      className="h-full bg-yellow-400 rounded-full"
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Comments */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">آخر التعليقات</h4>
          {stats.recent_ratings?.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {stats.recent_ratings.slice(0, 5).map((r, i) => (
                <div key={r.id || r.user_id || `rating-${i}`} className="bg-gray-50 rounded-lg p-2">
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-xs text-gray-500">{r.user_name}</span>
                    <div className="flex">
                      {[...Array(r.rating)].map((_, j) => (
                        <Star key={`star-${j}`} size={10} className="text-yellow-400 fill-yellow-400" />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-700">{r.rating_comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">لا توجد تعليقات بعد</p>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-green-500" />
          <span className="text-sm text-gray-600">
            إجمالي التقييمات: <span className="font-bold">{stats.total_ratings}</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-600">المتوسط:</span>
          <span className="font-bold text-yellow-600">{stats.average_rating}</span>
          <Star size={14} className="text-yellow-400 fill-yellow-400" />
        </div>
      </div>
    </div>
  );
};

// مكون لوحة التحليلات المتقدمة
const AnalyticsPanel = ({ analytics }) => {
  const maxHourCount = Math.max(...(analytics.peak_hours?.map(h => h.count) || [1]), 1);
  const maxDailyCount = Math.max(...(analytics.daily_tickets?.map(d => d.count) || [1]), 1);

  const formatHour = (hour) => {
    if (hour === 0) return '12 ص';
    if (hour === 12) return '12 م';
    if (hour < 12) return `${hour} ص`;
    return `${hour - 12} م`;
  };

  const formatResponseTime = (minutes) => {
    if (minutes < 60) return `${Math.round(minutes)} دقيقة`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours} ساعة ${mins > 0 ? `و ${mins} دقيقة` : ''}`;
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg border border-purple-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <BarChart3 size={24} className="text-purple-600" />
        <h3 className="font-bold text-gray-900 text-lg">تحليلات الدعم المتقدمة</h3>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Timer size={18} className="text-blue-500" />
            <span className="text-xs text-gray-500">متوسط وقت الرد</span>
          </div>
          <p className="text-base font-bold text-gray-900">
            {formatResponseTime(analytics.avg_response_time_minutes)}
          </p>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle size={18} className="text-orange-500" />
            <span className="text-xs text-gray-500">إجمالي التذاكر</span>
          </div>
          <p className="text-base font-bold text-gray-900">{analytics.total_tickets}</p>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle size={18} className="text-green-500" />
            <span className="text-xs text-gray-500">معدل الحل</span>
          </div>
          <p className="text-base font-bold text-green-600">{analytics.resolved_rate}%</p>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <Users size={18} className="text-purple-500" />
            <span className="text-xs text-gray-500">فريق الدعم</span>
          </div>
          <p className="text-base font-bold text-gray-900">{analytics.staff_performance?.length || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Peak Hours Chart */}
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Clock size={16} className="text-blue-500" />
            أوقات الذروة
          </h4>
          {analytics.peak_hours?.length > 0 ? (
            <div className="flex items-end gap-1 h-32">
              {analytics.peak_hours.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(h.count / maxHourCount) * 100}%` }}
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t"
                    style={{ minHeight: h.count > 0 ? '4px' : '0' }}
                  />
                  <span className="text-[8px] text-gray-400 mt-1 transform -rotate-45">
                    {formatHour(h.hour)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">لا توجد بيانات</p>
          )}
        </div>

        {/* Daily Tickets Chart */}
        <div className="bg-white rounded-lg p-4 border border-gray-100">
          <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-green-500" />
            التذاكر اليومية (آخر 7 أيام)
          </h4>
          {analytics.daily_tickets?.length > 0 ? (
            <div className="flex items-end gap-2 h-32">
              {analytics.daily_tickets.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${(d.count / maxDailyCount) * 100}%` }}
                    className="w-full bg-gradient-to-t from-green-500 to-green-400 rounded-t"
                    style={{ minHeight: d.count > 0 ? '4px' : '0' }}
                  />
                  <span className="text-[9px] text-gray-500 mt-1">{d.count}</span>
                  <span className="text-[8px] text-gray-400">
                    {new Date(d.date).toLocaleDateString('ar-SY', { weekday: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">لا توجد بيانات</p>
          )}
        </div>
      </div>

      {/* Staff Performance Table */}
      {analytics.staff_performance?.length > 0 && (
        <div className="mt-6 bg-white rounded-lg p-4 border border-gray-100">
          <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Users size={16} className="text-purple-500" />
            أداء فريق الدعم
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-right py-2 px-3 text-gray-500 font-medium">الموظف</th>
                  <th className="text-center py-2 px-3 text-gray-500 font-medium">التذاكر</th>
                  <th className="text-center py-2 px-3 text-gray-500 font-medium">التقييم</th>
                  <th className="text-center py-2 px-3 text-gray-500 font-medium">عدد التقييمات</th>
                </tr>
              </thead>
              <tbody>
                {analytics.staff_performance.map((staff, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                          <User size={14} className="text-purple-600" />
                        </div>
                        <span className="font-medium text-gray-900">{staff.name}</span>
                        {i === 0 && <span className="text-yellow-500">🏆</span>}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">
                        {staff.tickets_handled}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-bold text-yellow-600">{staff.avg_rating || '-'}</span>
                        {staff.avg_rating > 0 && <Star size={12} className="text-yellow-400 fill-yellow-400" />}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center text-gray-500">
                      {staff.total_ratings}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportTicketsTab;
