// /app/frontend/src/components/admin/CallRequestsTab.js
// لوحة طلبات الاتصال - للموظفين

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, PhoneCall, PhoneOff, User, MapPin, Clock, CheckCircle,
  AlertCircle, RefreshCw, MessageSquare, X
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Phone className="text-orange-500" />
            طلبات الاتصال
          </h2>
          <p className="text-sm text-gray-500">عندما لا يرد العميل على السائق</p>
        </div>
        <button
          onClick={fetchRequests}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="تحديث"
        >
          <RefreshCw size={20} className="text-gray-600" />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'pending', label: 'معلقة', count: requests.filter(r => r.status === 'pending').length },
          { id: 'in_progress', label: 'قيد المعالجة' },
          { id: 'completed', label: 'مكتملة' },
          { id: 'cancelled', label: 'ملغية' }
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors flex items-center gap-2 ${
              filter === f.id
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f.label}
            {f.count > 0 && (
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Phone size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">لا توجد طلبات اتصال</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request, index) => {
            const status = getStatusBadge(request.status);
            const StatusIcon = status.icon;
            
            return (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`bg-white rounded-xl border-2 p-4 ${
                  request.status === 'pending' ? 'border-yellow-300 shadow-md' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Status Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${status.bg}`}>
                      <StatusIcon size={24} className={status.text} />
                    </div>
                    
                    {/* Info */}
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-gray-900">طلب #{request.order_number}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${status.bg} ${status.text}`}>
                          {status.label}
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <User size={14} />
                          <span>السائق: {request.driver_name}</span>
                          <a href={`tel:${request.driver_phone}`} className="text-blue-600 hover:underline">
                            {request.driver_phone}
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-green-600" />
                          <span>العميل: {request.customer_name}</span>
                          <a href={`tel:${request.customer_phone}`} className="text-green-600 hover:underline font-bold">
                            {request.customer_phone}
                          </a>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={14} />
                          <span className="truncate max-w-xs">{request.delivery_address}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={14} />
                          <span>{formatTime(request.created_at)}</span>
                        </div>
                      </div>
                      
                      {request.reason && (
                        <p className="mt-2 text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-lg inline-block">
                          {request.reason}
                        </p>
                      )}
                      
                      {request.handled_by_name && (
                        <p className="mt-2 text-sm text-blue-600">
                          يعالج بواسطة: {request.handled_by_name}
                        </p>
                      )}
                      
                      {request.notes && (
                        <p className="mt-2 text-sm text-gray-600 bg-gray-50 px-3 py-1 rounded-lg">
                          <MessageSquare size={12} className="inline mr-1" />
                          {request.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    {request.status === 'pending' && (
                      <button
                        onClick={() => handleTake(request.id)}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                      >
                        <PhoneCall size={16} />
                        استلام
                      </button>
                    )}
                    
                    {request.status === 'in_progress' && (
                      <>
                        <button
                          onClick={() => setSelectedRequest(request)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                        >
                          <CheckCircle size={16} />
                          إكمال
                        </button>
                        <a
                          href={`tel:${request.customer_phone}`}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 justify-center"
                        >
                          <Phone size={16} />
                          اتصال
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Complete Modal */}
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
              className="bg-white rounded-2xl p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">إكمال طلب الاتصال</h3>
                <button onClick={() => setSelectedRequest(null)} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">طلب #{selectedRequest.order_number}</p>
                  <p className="font-bold">{selectedRequest.customer_name}</p>
                  <p className="text-green-600">{selectedRequest.customer_phone}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ملاحظات (اختياري)
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                    rows={3}
                    placeholder="مثال: العميل سينزل خلال 5 دقائق..."
                  />
                </div>
                
                <div className="flex gap-3">
                  <button
                    onClick={() => handleCancel(selectedRequest.id)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={() => handleComplete(selectedRequest.id)}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={18} />
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
