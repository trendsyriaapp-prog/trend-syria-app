// /app/frontend/src/components/admin/CallRequestsTab.js
// لوحة طلبات الاتصال - للموظفين

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, PhoneCall, PhoneOff, MapPin, CheckCircle,
  AlertCircle, RefreshCw, X
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const CallRequestsTab = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [notes, setNotes] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
    // تحديث تلقائي كل 30 ثانية
    const interval = setInterval(fetchRequests, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = filter === 'pending' 
        ? `${API}/api/call-requests/pending`
        : `${API}/api/call-requests?status=${filter}`;
      
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setRequests(filter === 'pending' ? res.data.requests : res.data);
    } catch (err) {
      console.error('Error fetching call requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTake = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API}/api/call-requests/${requestId}/take`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast({ title: 'تم استلام الطلب', description: `رقم العميل: ${res.data.customer_phone}` });
      setSelectedRequest(requests.find(r => r.id === requestId));
      fetchRequests();
    } catch (err) {
      toast({ title: 'خطأ', description: err.response?.data?.detail || 'فشل في استلام الطلب', variant: 'destructive' });
    }
  };

  const handleComplete = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/api/call-requests/${requestId}`, {
        status: 'completed',
        notes: notes || 'تم التواصل بنجاح'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast({ title: 'تم إكمال الطلب', description: 'تم إشعار السائق' });
      setSelectedRequest(null);
      setNotes('');
      fetchRequests();
    } catch (err) {
      toast({ title: 'خطأ', description: 'فشل في إكمال الطلب', variant: 'destructive' });
    }
  };

  const handleCancel = async (requestId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/api/call-requests/${requestId}`, {
        status: 'cancelled',
        notes: notes || 'تم إلغاء الطلب'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast({ title: 'تم إلغاء الطلب' });
      setSelectedRequest(null);
      setNotes('');
      fetchRequests();
    } catch (err) {
      toast({ title: 'خطأ', description: 'فشل في إلغاء الطلب', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'معلق', icon: AlertCircle },
      in_progress: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'قيد المعالجة', icon: PhoneCall },
      completed: { bg: 'bg-green-100', text: 'text-green-800', label: 'مكتمل', icon: CheckCircle },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'ملغي', icon: PhoneOff }
    };
    return badges[status] || badges.pending;
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000 / 60);
    
    if (diff < 1) return 'الآن';
    if (diff < 60) return `منذ ${diff} دقيقة`;
    if (diff < 1440) return `منذ ${Math.floor(diff / 60)} ساعة`;
    return date.toLocaleDateString('ar-SY');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header - Compact */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Phone size={18} className="text-orange-500" />
          <h2 className="text-base font-bold text-gray-900">طلبات الاتصال</h2>
        </div>
        <button
          onClick={fetchRequests}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          title="تحديث"
        >
          <RefreshCw size={16} className="text-gray-600" />
        </button>
      </div>

      {/* Filters - Compact */}
      <div className="flex gap-1.5 flex-wrap">
        {[
          { id: 'pending', label: 'معلقة', count: requests.filter(r => r.status === 'pending').length },
          { id: 'in_progress', label: 'قيد المعالجة' },
          { id: 'completed', label: 'مكتملة' },
          { id: 'cancelled', label: 'ملغية' }
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-colors flex items-center gap-1.5 text-xs ${
              filter === f.id
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f.label}
            {f.count > 0 && (
              <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-xl">
          <Phone size={36} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">لا توجد طلبات اتصال</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.map((request, index) => {
            const status = getStatusBadge(request.status);
            const StatusIcon = status.icon;
            
            return (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={`bg-white rounded-lg border p-3 ${
                  request.status === 'pending' ? 'border-yellow-300 shadow-sm' : 'border-gray-200'
                }`}
              >
                {/* Top Row: Status + Order Number + Badge */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${status.bg}`}>
                      <StatusIcon size={16} className={status.text} />
                    </div>
                    <span className="font-bold text-sm text-gray-900">#{request.order_number}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${status.bg} ${status.text}`}>
                      {status.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400">{formatTime(request.created_at)}</span>
                </div>
                
                {/* Contact Info - Compact Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  <div className="bg-blue-50 rounded p-1.5">
                    <p className="text-[10px] text-blue-600 mb-0.5">السائق</p>
                    <p className="font-medium text-gray-800 truncate">{request.driver_name}</p>
                    <a href={`tel:${request.driver_phone}`} className="text-blue-600 text-[11px]">
                      {request.driver_phone}
                    </a>
                  </div>
                  <div className="bg-green-50 rounded p-1.5">
                    <p className="text-[10px] text-green-600 mb-0.5">العميل</p>
                    <p className="font-medium text-gray-800 truncate">{request.customer_name}</p>
                    <a href={`tel:${request.customer_phone}`} className="text-green-600 font-bold text-[11px]">
                      {request.customer_phone}
                    </a>
                  </div>
                </div>
                
                {/* Address */}
                <div className="flex items-center gap-1 text-[11px] text-gray-500 mb-2">
                  <MapPin size={12} />
                  <span className="truncate">{request.delivery_address}</span>
                </div>
                
                {/* Reason/Notes - Compact */}
                {request.reason && (
                  <p className="text-[11px] text-orange-600 bg-orange-50 px-2 py-1 rounded mb-2">
                    {request.reason}
                  </p>
                )}
                
                {request.handled_by_name && (
                  <p className="text-[11px] text-blue-600 mb-2">
                    يعالج: {request.handled_by_name}
                  </p>
                )}
                
                {request.notes && (
                  <p className="text-[11px] text-gray-600 bg-gray-50 px-2 py-1 rounded mb-2">
                    {request.notes}
                  </p>
                )}
                
                {/* Actions - Compact */}
                <div className="flex gap-2">
                  {request.status === 'pending' && (
                    <button
                      onClick={() => handleTake(request.id)}
                      className="flex-1 py-1.5 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
                    >
                      <PhoneCall size={14} />
                      استلام
                    </button>
                  )}
                  
                  {request.status === 'in_progress' && (
                    <>
                      <a
                        href={`tel:${request.customer_phone}`}
                        className="flex-1 py-1.5 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600 transition-colors flex items-center justify-center gap-1"
                      >
                        <Phone size={14} />
                        اتصال
                      </a>
                      <button
                        onClick={() => setSelectedRequest(request)}
                        className="flex-1 py-1.5 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-1"
                      >
                        <CheckCircle size={14} />
                        إكمال
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Complete Modal - Compact */}
      <AnimatePresence>
        {selectedRequest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedRequest(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-4 w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold">إكمال طلب الاتصال</h3>
                <button onClick={() => setSelectedRequest(null)} className="p-1 hover:bg-gray-100 rounded-full">
                  <X size={18} />
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600">طلب #{selectedRequest.order_number}</p>
                  <p className="font-bold text-sm">{selectedRequest.customer_name}</p>
                  <p className="text-green-600 text-sm">{selectedRequest.customer_phone}</p>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    ملاحظات (اختياري)
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
                    rows={2}
                    placeholder="مثال: العميل سينزل خلال 5 دقائق..."
                  />
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCancel(selectedRequest.id)}
                    className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => handleComplete(selectedRequest.id)}
                    className="flex-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-1 text-sm"
                  >
                    <CheckCircle size={16} />
                    تم التواصل
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CallRequestsTab;
