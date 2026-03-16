// /app/frontend/src/components/admin/EmergencyHelpTab.js
// إدارة طلبات المساعدة الطارئة من السائقين

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, Phone, User, MapPin, Clock, CheckCircle, Loader2, RefreshCw, PhoneCall } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const EmergencyHelpTab = ({ token }) => {
  const { toast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null);
  const [filter, setFilter] = useState('pending');

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      const res = await axios.get(`${API}/api/support/admin/emergency-help`, {
        params: { status: filter === 'all' ? null : filter },
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(res.data.requests || []);
    } catch (err) {
      console.error('Error fetching emergency requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const resolveRequest = async (requestId) => {
    setResolving(requestId);
    try {
      await axios.put(`${API}/api/support/admin/emergency-help/${requestId}/resolve`, null, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast({
        title: "✅ تم حل الطلب",
        description: "تم إشعار السائق بأن المشكلة تم حلها"
      });
      
      fetchRequests();
    } catch (err) {
      toast({
        title: "خطأ",
        description: "فشل في حل الطلب",
        variant: "destructive"
      });
    } finally {
      setResolving(null);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('ar-SY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-red-100 text-red-700 border-red-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'resolved': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return '🔴 بانتظار الرد';
      case 'in_progress': return '🟡 قيد المعالجة';
      case 'resolved': return '🟢 تم الحل';
      default: return status;
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="text-orange-500" />
            طلبات المساعدة الطارئة
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            طلبات من السائقين تحتاج تواصل مع العملاء
          </p>
        </div>
        <button
          onClick={fetchRequests}
          className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats */}
      {pendingCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 font-bold flex items-center gap-2">
            <AlertTriangle size={18} />
            {pendingCount} طلب بانتظار الرد!
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { id: 'pending', label: 'بانتظار الرد' },
          { id: 'resolved', label: 'تم الحل' },
          { id: 'all', label: 'الكل' }
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === f.id
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="text-center py-10">
          <Loader2 className="animate-spin mx-auto text-gray-400" size={32} />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-xl">
          <CheckCircle className="mx-auto text-green-500 mb-2" size={40} />
          <p className="text-gray-500">لا توجد طلبات مساعدة {filter === 'pending' ? 'بانتظار الرد' : ''}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => (
            <div
              key={req.id}
              className={`bg-white rounded-xl border-2 overflow-hidden ${
                req.status === 'pending' ? 'border-red-300 shadow-lg' : 'border-gray-200'
              }`}
            >
              {/* Header */}
              <div className={`p-3 flex items-center justify-between ${
                req.status === 'pending' ? 'bg-red-50' : 'bg-gray-50'
              }`}>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(req.status)}`}>
                    {getStatusLabel(req.status)}
                  </span>
                  <span className="text-sm text-gray-500">
                    طلب #{req.order_number}
                  </span>
                </div>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock size={12} />
                  {formatDate(req.created_at)}
                </span>
              </div>

              <div className="p-4">
                {/* Reason */}
                <div className="mb-4 p-3 bg-orange-50 rounded-xl">
                  <p className="text-sm font-bold text-orange-800">
                    📋 سبب الطلب: {req.reason_text}
                  </p>
                  {req.message && (
                    <p className="text-sm text-orange-700 mt-1">
                      💬 {req.message}
                    </p>
                  )}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {/* Driver Info */}
                  <div className="bg-blue-50 rounded-xl p-3">
                    <p className="text-xs font-bold text-blue-700 mb-2">🚗 معلومات السائق:</p>
                    <div className="space-y-1">
                      <p className="text-sm flex items-center gap-2">
                        <User size={14} className="text-blue-500" />
                        {req.driver_name}
                      </p>
                      {req.driver_phone && (
                        <a
                          href={`tel:${req.driver_phone}`}
                          className="text-sm flex items-center gap-2 text-blue-600 font-medium"
                        >
                          <Phone size={14} />
                          {req.driver_phone}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="bg-green-50 rounded-xl p-3">
                    <p className="text-xs font-bold text-green-700 mb-2">👤 معلومات العميل:</p>
                    <div className="space-y-1">
                      <p className="text-sm flex items-center gap-2">
                        <User size={14} className="text-green-500" />
                        {req.customer_name}
                      </p>
                      {req.customer_phone && (
                        <a
                          href={`tel:${req.customer_phone}`}
                          className="text-sm flex items-center gap-2 text-green-600 font-bold"
                        >
                          <PhoneCall size={14} />
                          اتصل الآن: {req.customer_phone}
                        </a>
                      )}
                      {req.customer_address && (
                        <p className="text-xs flex items-center gap-2 text-green-600">
                          <MapPin size={12} />
                          {req.customer_address}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {req.status === 'pending' && (
                  <div className="mt-4 flex gap-2">
                    <a
                      href={`tel:${req.customer_phone}`}
                      className="flex-1 py-3 bg-green-600 text-white rounded-xl font-bold text-center flex items-center justify-center gap-2"
                    >
                      <PhoneCall size={18} />
                      اتصل بالعميل
                    </a>
                    <button
                      onClick={() => resolveRequest(req.id)}
                      disabled={resolving === req.id}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {resolving === req.id ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <CheckCircle size={18} />
                      )}
                      تم الحل
                    </button>
                  </div>
                )}

                {req.status === 'resolved' && req.resolved_at && (
                  <div className="mt-4 p-3 bg-green-50 rounded-xl">
                    <p className="text-xs text-green-700">
                      ✅ تم الحل في: {formatDate(req.resolved_at)}
                    </p>
                    {req.resolution_notes && (
                      <p className="text-xs text-green-600 mt-1">
                        📝 {req.resolution_notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmergencyHelpTab;
