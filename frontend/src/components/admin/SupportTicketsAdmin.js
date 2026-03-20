// /app/frontend/src/components/admin/SupportTicketsAdmin.js
// لوحة إدارة تذاكر الدعم للمسؤولين

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  HelpCircle, MessageCircle, Clock, CheckCircle, 
  AlertCircle, X, RefreshCw, Filter, Search,
  ChevronRight, User, ChevronLeft, Tag, AlertTriangle
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const CATEGORIES = {
  general: { label: 'استفسار عام', color: 'bg-blue-100 text-blue-700' },
  order: { label: 'مشكلة بالطلب', color: 'bg-orange-100 text-orange-700' },
  payment: { label: 'مشكلة بالدفع', color: 'bg-green-100 text-green-700' },
  delivery: { label: 'مشكلة بالتوصيل', color: 'bg-purple-100 text-purple-700' },
  account: { label: 'مشكلة بالحساب', color: 'bg-red-100 text-red-700' },
  other: { label: 'أخرى', color: 'bg-gray-100 text-gray-700' }
};

const STATUS_CONFIG = {
  open: { label: 'مفتوحة', color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle },
  in_progress: { label: 'قيد المعالجة', color: 'bg-blue-100 text-blue-700', icon: Clock },
  resolved: { label: 'تم الحل', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  closed: { label: 'مغلقة', color: 'bg-gray-100 text-gray-700', icon: X }
};

const PRIORITY_CONFIG = {
  low: { label: 'منخفضة', color: 'text-gray-500' },
  normal: { label: 'عادية', color: 'text-blue-500' },
  high: { label: 'عالية', color: 'text-orange-500' },
  urgent: { label: 'عاجلة', color: 'text-red-500' }
};

const SupportTicketsAdmin = () => {
  const { toast } = useToast();
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [filter, setFilter] = useState({ status: '', category: '', priority: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [filter, page]);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({ page, limit: 20 });
      if (filter.status) params.append('status', filter.status);
      if (filter.category) params.append('category', filter.category);
      if (filter.priority) params.append('priority', filter.priority);
      
      const res = await axios.get(`${API}/api/support/admin/tickets?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(res.data.tickets || []);
      setTotalPages(res.data.pages || 1);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/api/support/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const updateStatus = async (ticketId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/api/support/admin/tickets/${ticketId}/status`, 
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTickets();
      fetchStats();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket({ ...selectedTicket, status: newStatus });
      }
      toast({ title: 'تم بنجاح', description: 'تم تحديث حالة التذكرة' });
    } catch (err) {
      toast({ title: 'خطأ', description: err.response?.data?.detail || 'حدث خطأ', variant: 'destructive' });
    }
  };

  const sendReply = async () => {
    if (!reply.trim() || !selectedTicket) return;
    
    setSending(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/api/support/tickets/${selectedTicket.id}/reply`, 
        { message: reply.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReply('');
      toast({ title: 'تم بنجاح', description: 'تم إرسال الرد' });
      
      // Refresh ticket
      const res = await axios.get(`${API}/api/support/tickets/${selectedTicket.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSelectedTicket(res.data);
    } catch (err) {
      toast({ title: 'خطأ', description: err.response?.data?.detail || 'حدث خطأ', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('ar-SY', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // Ticket detail view
  if (selectedTicket) {
    const StatusIcon = STATUS_CONFIG[selectedTicket.status]?.icon || AlertCircle;
    
    return (
      <div className="space-y-3" data-testid="admin-ticket-detail">
        {/* Header */}
        <div className="flex items-center gap-3 bg-white p-4 rounded-lg">
          <button
            onClick={() => setSelectedTicket(null)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ChevronRight size={20} />
          </button>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900">{selectedTicket.subject}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>#{selectedTicket.ticket_number}</span>
              <span>•</span>
              <span>{selectedTicket.user_name}</span>
              <span>•</span>
              <span>{selectedTicket.user_phone}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedTicket.status}
              onChange={(e) => updateStatus(selectedTicket.id, e.target.value)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border ${
                STATUS_CONFIG[selectedTicket.status]?.color
              }`}
            >
              {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                <option key={key} value={key}>{val.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Info */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white p-3 rounded-lg">
            <p className="text-xs text-gray-500">الفئة</p>
            <p className={`text-sm font-medium ${CATEGORIES[selectedTicket.category]?.color} px-2 py-1 rounded-lg inline-block mt-1`}>
              {CATEGORIES[selectedTicket.category]?.label}
            </p>
          </div>
          <div className="bg-white p-3 rounded-lg">
            <p className="text-xs text-gray-500">الأولوية</p>
            <p className={`text-sm font-medium ${PRIORITY_CONFIG[selectedTicket.priority]?.color}`}>
              {PRIORITY_CONFIG[selectedTicket.priority]?.label}
            </p>
          </div>
          <div className="bg-white p-3 rounded-lg">
            <p className="text-xs text-gray-500">نوع المستخدم</p>
            <p className="text-sm font-medium text-gray-700">{selectedTicket.user_type || 'عميل'}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="bg-white rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-4">المحادثة</h4>
          <div className="max-h-[40vh] overflow-y-auto space-y-3">
            {selectedTicket.messages?.map((msg) => {
              const isAdmin = msg.sender_type === 'admin';
              return (
                <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    isAdmin ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-900'
                  }`}>
                    <p className={`text-xs mb-1 ${isAdmin ? 'text-white/80' : 'text-gray-500'}`}>
                      {msg.sender_name}
                    </p>
                    <p className="text-sm">{msg.message}</p>
                    <p className={`text-[10px] mt-1 ${isAdmin ? 'text-white/60' : 'text-gray-400'}`}>
                      {formatDate(msg.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Reply */}
          {selectedTicket.status !== 'closed' && (
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <input
                type="text"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="اكتب ردك..."
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                onKeyPress={(e) => e.key === 'Enter' && sendReply()}
              />
              <button
                onClick={sendReply}
                disabled={!reply.trim() || sending}
                className="px-4 py-2 bg-green-500 text-white rounded-lg disabled:opacity-50 font-medium"
              >
                {sending ? 'إرسال...' : 'رد'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="admin-support-tickets">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-lg border-r-4 border-yellow-500">
            <p className="text-2xl font-bold text-gray-900">{stats.by_status?.open || 0}</p>
            <p className="text-sm text-gray-500">مفتوحة</p>
          </div>
          <div className="bg-white p-4 rounded-lg border-r-4 border-blue-500">
            <p className="text-2xl font-bold text-gray-900">{stats.by_status?.in_progress || 0}</p>
            <p className="text-sm text-gray-500">قيد المعالجة</p>
          </div>
          <div className="bg-white p-4 rounded-lg border-r-4 border-green-500">
            <p className="text-2xl font-bold text-gray-900">{stats.by_status?.resolved || 0}</p>
            <p className="text-sm text-gray-500">تم الحل</p>
          </div>
          <div className="bg-white p-4 rounded-lg border-r-4 border-red-500">
            <p className="text-2xl font-bold text-gray-900">{stats.urgent || 0}</p>
            <p className="text-sm text-gray-500">عاجلة</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg flex flex-wrap gap-3">
        <select
          value={filter.status}
          onChange={(e) => { setFilter({...filter, status: e.target.value}); setPage(1); }}
          className="px-4 py-2 border rounded-lg text-sm"
        >
          <option value="">كل الحالات</option>
          {Object.entries(STATUS_CONFIG).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
        
        <select
          value={filter.category}
          onChange={(e) => { setFilter({...filter, category: e.target.value}); setPage(1); }}
          className="px-4 py-2 border rounded-lg text-sm"
        >
          <option value="">كل الفئات</option>
          {Object.entries(CATEGORIES).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
        
        <select
          value={filter.priority}
          onChange={(e) => { setFilter({...filter, priority: e.target.value}); setPage(1); }}
          className="px-4 py-2 border rounded-lg text-sm"
        >
          <option value="">كل الأولويات</option>
          {Object.entries(PRIORITY_CONFIG).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
        
        <button
          onClick={() => { setFilter({ status: '', category: '', priority: '' }); setPage(1); }}
          className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm"
        >
          إعادة تعيين
        </button>
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="animate-spin text-green-500" size={32} />
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <HelpCircle size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">لا توجد تذاكر</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">رقم</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">العنوان</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">المستخدم</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">الفئة</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">الحالة</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.map((ticket) => {
                const StatusIcon = STATUS_CONFIG[ticket.status]?.icon || AlertCircle;
                return (
                  <tr
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-3 py-2 text-sm text-gray-900">#{ticket.ticket_number}</td>
                    <td className="px-3 py-2">
                      <p className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{ticket.subject}</p>
                      {ticket.priority === 'urgent' && (
                        <span className="text-xs text-red-500 flex items-center gap-1">
                          <AlertTriangle size={12} /> عاجلة
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">{ticket.user_name}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${CATEGORIES[ticket.category]?.color}`}>
                        {CATEGORIES[ticket.category]?.label}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 w-fit ${STATUS_CONFIG[ticket.status]?.color}`}>
                        <StatusIcon size={12} />
                        {STATUS_CONFIG[ticket.status]?.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">{formatDate(ticket.updated_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-4 border-t">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronRight size={20} />
              </button>
              <span className="text-sm text-gray-600">
                صفحة {page} من {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronLeft size={20} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SupportTicketsAdmin;
