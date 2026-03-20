import { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw, User, Package, Clock, DollarSign } from 'lucide-react';

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
  const [violations, setViolations] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [processing, setProcessing] = useState(null);

  const fetchViolations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/api/delivery/admin/violations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setViolations(res.data.violations || []);
      setStats(res.data.stats || {});
    } catch (error) {
      console.error('Error fetching violations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViolations();
  }, []);

  const handleApplyViolation = async (violationId) => {
    if (!window.confirm('هل أنت متأكد من تطبيق هذه المخالفة وخصم المبلغ من رصيد السائق؟')) return;
    
    setProcessing(violationId);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/api/delivery/violations/${violationId}/apply`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchViolations();
      alert('تم تطبيق المخالفة بنجاح');
    } catch (error) {
      alert(error.response?.data?.detail || 'حدث خطأ');
    } finally {
      setProcessing(null);
    }
  };

  const handleCancelViolation = async (violationId) => {
    const reason = prompt('سبب إلغاء المخالفة (اختياري):');
    if (reason === null) return;
    
    setProcessing(violationId);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/api/delivery/violations/${violationId}/cancel?reason=${encodeURIComponent(reason)}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchViolations();
      alert('تم إلغاء المخالفة');
    } catch (error) {
      alert(error.response?.data?.detail || 'حدث خطأ');
    } finally {
      setProcessing(null);
    }
  };

  const handleCheckUndelivered = async () => {
    if (!window.confirm('سيتم التحقق من الطلبات غير المُسلّمة وإنشاء مخالفات جديدة. متابعة؟')) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API}/api/delivery/check-undelivered-orders`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(res.data.message);
      await fetchViolations();
    } catch (error) {
      alert(error.response?.data?.detail || 'حدث خطأ');
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
          onClick={handleCheckUndelivered}
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
                    onClick={() => handleApplyViolation(violation.id)}
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
                    onClick={() => handleCancelViolation(violation.id)}
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
    </div>
  );
};

export default ViolationsTab;
