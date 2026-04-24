import { useState, useEffect } from 'react';
import logger from '../../lib/logger';
import axios from 'axios';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, User, Package, Clock, DollarSign, X } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
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

const ViolationsTab = () => {
  const { toast } = useToast();
  const [violations, setViolations] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [processing, setProcessing] = useState(null);
  
  // Modals
  const [applyModal, setApplyModal] = useState({ isOpen: false, violation: null });
  const [cancelModal, setCancelModal] = useState({ isOpen: false, violationId: null });
  const [checkModal, setCheckModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const fetchViolations = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/delivery/admin/violations`);
      setViolations(res.data.violations || []);
      setStats(res.data.stats || {});
    } catch (error) {
      logger.error('Error fetching violations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViolations();
  }, []);

  const handleApplyViolation = async () => {
    if (!applyModal.violation) return;
    
    setProcessing(applyModal.violation.id);
    try {
      await axios.post(`${API}/api/delivery/violations/${applyModal.violation.id}/apply`, {});
      await fetchViolations();
      toast({ title: "تم بنجاح", description: "تم تطبيق المخالفة بنجاح" });
      setApplyModal({ isOpen: false, violation: null });
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || 'حدث خطأ', variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  const handleCancelViolation = async () => {
    if (!cancelModal.violationId) return;
    
    setProcessing(cancelModal.violationId);
    try {
      await axios.post(`${API}/api/delivery/violations/${cancelModal.violationId}/cancel?reason=${encodeURIComponent(cancelReason)}`, {});
      await fetchViolations();
      toast({ title: "تم بنجاح", description: "تم إلغاء المخالفة" });
      setCancelModal({ isOpen: false, violationId: null });
      setCancelReason('');
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || 'حدث خطأ', variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  const handleCheckUndelivered = async () => {
    setCheckModal(false);
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/delivery/check-undelivered-orders`, {});
      toast({ title: "تم بنجاح", description: res.data.message });
      await fetchViolations();
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || 'حدث خطأ', variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredViolations = violations.filter(v => {
    if (filter === 'all') return true;
    return v.status === filter;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">قيد الانتظار</span>;
      case 'applied':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">تم الخصم</span>;
      case 'cancelled':
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">ملغية</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* إحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <AlertTriangle size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.total || 0}</p>
              <p className="text-xs text-gray-500">إجمالي المخالفات</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock size={20} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</p>
              <p className="text-xs text-gray-500">قيد الانتظار</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <DollarSign size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.applied || 0}</p>
              <p className="text-xs text-gray-500">تم الخصم</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <DollarSign size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-orange-600">{formatPrice(stats.total_amount || 0)}</p>
              <p className="text-xs text-gray-500">إجمالي الخصومات</p>
            </div>
          </div>
        </div>
      </div>

      {/* أزرار التحكم */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setCheckModal(true)}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg font-medium flex items-center gap-2 hover:bg-orange-600"
        >
          <AlertTriangle size={18} />
          التحقق من الطلبات غير المُسلّمة
        </button>
        
        <button
          onClick={fetchViolations}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium flex items-center gap-2 hover:bg-gray-200"
        >
          <RefreshCw size={18} />
          تحديث
        </button>
      </div>

      {/* فلاتر */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { key: 'all', label: 'الكل' },
          { key: 'pending', label: 'قيد الانتظار' },
          { key: 'applied', label: 'تم الخصم' },
          { key: 'cancelled', label: 'ملغية' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
              filter === f.key
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* قائمة المخالفات */}
      <div className="space-y-3">
        {filteredViolations.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <AlertTriangle size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">لا توجد مخالفات</p>
          </div>
        ) : (
          filteredViolations.map(violation => (
            <div key={violation.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle size={20} className="text-red-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">طلب #{violation.order_number}</p>
                    <p className="text-xs text-gray-500">{formatDate(violation.created_at)}</p>
                  </div>
                </div>
                {getStatusBadge(violation.status)}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="flex items-center gap-2 text-sm">
                  <User size={16} className="text-gray-400" />
                  <span className="text-gray-600">{violation.driver_name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign size={16} className="text-gray-400" />
                  <span className="text-red-600 font-bold">{formatPrice(violation.amount)}</span>
                </div>
              </div>

              <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg mb-3">
                {violation.reason}
              </p>

              {violation.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setApplyModal({ isOpen: true, violation })}
                    disabled={processing === violation.id}
                    className="flex-1 py-2 bg-red-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-red-600 disabled:opacity-50"
                  >
                    {processing === violation.id ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <CheckCircle size={16} />
                    )}
                    تطبيق الخصم
                  </button>
                  <button
                    onClick={() => setCancelModal({ isOpen: true, violationId: violation.id })}
                    disabled={processing === violation.id}
                    className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-200 disabled:opacity-50"
                  >
                    <XCircle size={16} />
                    إلغاء
                  </button>
                </div>
              )}

              {violation.status === 'applied' && violation.applied_at && (
                <p className="text-xs text-red-600 text-center">
                  تم الخصم بتاريخ {formatDate(violation.applied_at)}
                </p>
              )}

              {violation.status === 'cancelled' && violation.cancellation_reason && (
                <p className="text-xs text-gray-500 text-center">
                  سبب الإلغاء: {violation.cancellation_reason}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Apply Violation Modal */}
      {applyModal.isOpen && applyModal.violation && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold">تأكيد تطبيق المخالفة</h3>
                <p className="text-xs text-gray-500">طلب #{applyModal.violation.order_number}</p>
              </div>
            </div>

            <div className="bg-red-50 rounded-lg p-3 mb-4 text-center">
              <p className="text-sm text-gray-600 mb-1">المبلغ المستحق الخصم</p>
              <p className="text-xl font-bold text-red-600">{formatPrice(applyModal.violation.amount)}</p>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              هل أنت متأكد من تطبيق هذه المخالفة وخصم المبلغ من رصيد السائق <span className="font-bold">{applyModal.violation.driver_name}</span>؟
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setApplyModal({ isOpen: false, violation: null })}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={handleApplyViolation}
                disabled={processing === applyModal.violation.id}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing === applyModal.violation.id ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <CheckCircle size={16} />
                )}
                تأكيد الخصم
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Violation Modal */}
      {cancelModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">إلغاء المخالفة</h3>
              <button onClick={() => { setCancelModal({ isOpen: false, violationId: null }); setCancelReason(''); }} className="p-1 hover:bg-gray-100 rounded-full">
                <X size={18} />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">سبب الإلغاء (اختياري)</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="أضف سبب الإلغاء..."
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => { setCancelModal({ isOpen: false, violationId: null }); setCancelReason(''); }}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm"
              >
                رجوع
              </button>
              <button
                onClick={handleCancelViolation}
                disabled={processing === cancelModal.violationId}
                className="flex-1 py-2 bg-gray-700 text-white rounded-lg text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing === cancelModal.violationId ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <XCircle size={16} />
                )}
                إلغاء المخالفة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check Undelivered Modal */}
      {checkModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={20} className="text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold">التحقق من الطلبات</h3>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              سيتم التحقق من الطلبات غير المُسلّمة وإنشاء مخالفات جديدة للسائقين المخالفين. هل تريد المتابعة؟
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setCheckModal(false)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={handleCheckUndelivered}
                className="flex-1 py-2 bg-orange-500 text-white rounded-lg text-sm flex items-center justify-center gap-2"
              >
                <CheckCircle size={16} />
                متابعة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViolationsTab;
