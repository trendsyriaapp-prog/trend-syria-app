// /app/frontend/src/components/admin/FeedbackTab.js
// تبويب اقتراحات وملاحظات المستخدمين

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { 
  MessageSquare, Lightbulb, AlertCircle, HelpCircle, 
  Clock, CheckCircle, Send, Trash2, User, Phone,
  Filter, RefreshCw, Loader2
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const TYPE_CONFIG = {
  suggestion: { label: 'اقتراح', icon: Lightbulb, color: 'text-yellow-600 bg-yellow-50' },
  complaint: { label: 'شكوى', icon: AlertCircle, color: 'text-red-600 bg-red-50' },
  question: { label: 'استفسار', icon: HelpCircle, color: 'text-blue-600 bg-blue-50' },
};

const STATUS_CONFIG = {
  pending: { label: 'قيد الانتظار', color: 'text-orange-600 bg-orange-50' },
  reviewed: { label: 'تمت المراجعة', color: 'text-green-600 bg-green-50' },
};

const USER_TYPE_LABELS = {
  buyer: 'عميل',
  seller: 'بائع منتجات',
  food_seller: 'بائع طعام',
  delivery: 'موظف توصيل',
  guest: 'زائر',
};

const FeedbackTab = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  const [feedback, setFeedback] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, reviewed: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', type: '' });
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [response, setResponse] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchFeedback();
  }, [filter]);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.type) params.append('type', filter.type);
      
      const res = await axios.get(`${API}/api/feedback/all?${params}`);
      setFeedback(res.data.feedback || []);
      setStats(res.data.stats || { total: 0, pending: 0, reviewed: 0 });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في جلب الملاحظات",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (feedbackId) => {
    if (!response.trim()) {
      toast({ title: "تنبيه", description: "اكتب ردك أولاً", variant: "destructive" });
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`${API}/api/feedback/${feedbackId}/respond`, {
        response: response.trim()
      });
      
      toast({ title: "تم", description: "تم إرسال الرد بنجاح" });
      setResponse('');
      setSelectedFeedback(null);
      fetchFeedback();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل في إرسال الرد", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (feedbackId) => {
    if (!window.confirm('هل تريد حذف هذه الملاحظة؟')) return;
    
    try {
      await axios.delete(`${API}/api/feedback/${feedbackId}`);
      toast({ title: "تم", description: "تم الحذف بنجاح" });
      fetchFeedback();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل في الحذف", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <MessageSquare className="text-purple-500" />
            اقتراحات وملاحظات المستخدمين
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            إدارة اقتراحات وشكاوى واستفسارات المستخدمين
          </p>
        </div>
        <button
          onClick={fetchFeedback}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
        >
          <RefreshCw size={16} />
          تحديث
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border shadow-sm">
          <div className="text-3xl font-bold text-gray-800">{stats.total}</div>
          <div className="text-sm text-gray-500">إجمالي الرسائل</div>
        </div>
        <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
          <div className="text-3xl font-bold text-orange-600">{stats.pending}</div>
          <div className="text-sm text-orange-600">قيد الانتظار</div>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <div className="text-3xl font-bold text-green-600">{stats.reviewed}</div>
          <div className="text-sm text-green-600">تمت المراجعة</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 bg-white p-4 rounded-xl border">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <span className="text-sm text-gray-600">تصفية:</span>
        </div>
        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="border rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">جميع الحالات</option>
          <option value="pending">قيد الانتظار</option>
          <option value="reviewed">تمت المراجعة</option>
        </select>
        <select
          value={filter.type}
          onChange={(e) => setFilter({ ...filter, type: e.target.value })}
          className="border rounded-lg px-3 py-1.5 text-sm"
        >
          <option value="">جميع الأنواع</option>
          <option value="suggestion">اقتراحات</option>
          <option value="complaint">شكاوى</option>
          <option value="question">استفسارات</option>
        </select>
      </div>

      {/* Feedback List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-purple-500" size={32} />
        </div>
      ) : feedback.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <MessageSquare size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">لا توجد ملاحظات</p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedback.map((item) => {
            const typeConfig = TYPE_CONFIG[item.type] || TYPE_CONFIG.suggestion;
            const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
            const TypeIcon = typeConfig.icon;
            
            return (
              <div key={item.id} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${typeConfig.color}`}>
                      <TypeIcon size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{item.user_name || 'زائر'}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {USER_TYPE_LABELS[item.user_type] || 'مستخدم'}
                        </span>
                        {item.user_phone && (
                          <span className="flex items-center gap-1">
                            <Phone size={12} />
                            {item.user_phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {new Date(item.created_at).toLocaleDateString('ar-SY')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                    title="حذف"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                
                {/* Message */}
                <div className="p-4">
                  <p className="text-gray-700 whitespace-pre-wrap">{item.message}</p>
                </div>
                
                {/* Admin Response */}
                {item.admin_response ? (
                  <div className="p-4 bg-green-50 border-t border-green-100">
                    <div className="flex items-center gap-2 text-green-700 text-sm font-medium mb-2">
                      <CheckCircle size={16} />
                      رد الإدارة:
                    </div>
                    <p className="text-green-800 text-sm">{item.admin_response}</p>
                  </div>
                ) : (
                  <div className="p-4 border-t bg-gray-50">
                    {selectedFeedback === item.id ? (
                      <div className="space-y-3">
                        <textarea
                          value={response}
                          onChange={(e) => setResponse(e.target.value)}
                          placeholder="اكتب ردك هنا..."
                          rows={3}
                          className="w-full border rounded-lg p-3 text-sm"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => { setSelectedFeedback(null); setResponse(''); }}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
                          >
                            إلغاء
                          </button>
                          <button
                            onClick={() => handleRespond(item.id)}
                            disabled={submitting}
                            className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm flex items-center gap-2 hover:bg-purple-600 disabled:opacity-50"
                          >
                            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                            إرسال الرد
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSelectedFeedback(item.id)}
                        className="flex items-center gap-2 text-purple-600 hover:text-purple-700 text-sm font-medium"
                      >
                        <Send size={14} />
                        الرد على هذه الرسالة
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FeedbackTab;
