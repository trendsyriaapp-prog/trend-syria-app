import { useState, useEffect } from 'react';
import axios from 'axios';
import { Flag, CheckCircle, XCircle, RefreshCw, AlertTriangle, Package, Clock, Eye, Ban, UserCheck, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';

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

const PriceReportsTab = () => {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({});
  const [sellersWithViolations, setSellersWithViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [processing, setProcessing] = useState(null);
  const [expandedReport, setExpandedReport] = useState(null);
  const [activeTab, setActiveTab] = useState('reports'); // 'reports' or 'sellers'
  
  // Resolution form state
  const [resolutionStatus, setResolutionStatus] = useState('warning');
  const [violationPoints, setViolationPoints] = useState(1);
  const [adminNotes, setAdminNotes] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [reportsRes, statsRes] = await Promise.all([
        axios.get(`${API}/api/price-reports/admin/all?status=${filter === 'all' ? '' : filter}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/api/price-reports/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setReports(reportsRes.data.reports || []);
      setStats(statsRes.data || {});
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSellersWithViolations = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/api/price-reports/admin/sellers-with-violations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSellersWithViolations(res.data.sellers || []);
    } catch (error) {
      console.error('Error fetching sellers:', error);
    }
  };

  useEffect(() => {
    fetchReports();
    fetchSellersWithViolations();
  }, [filter]);

  const handleResolve = async (reportId) => {
    setProcessing(reportId);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/api/price-reports/admin/${reportId}/resolve`, {
        status: resolutionStatus,
        violation_points: resolutionStatus === 'approved' ? violationPoints : 0,
        admin_notes: adminNotes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('تم حل البلاغ بنجاح');
      setExpandedReport(null);
      setResolutionStatus('warning');
      setViolationPoints(1);
      setAdminNotes('');
      await fetchReports();
      await fetchSellersWithViolations();
    } catch (error) {
      alert(error.response?.data?.detail || 'حدث خطأ');
    } finally {
      setProcessing(null);
    }
  };

  const handleSuspendSeller = async (sellerId, sellerName) => {
    if (!window.confirm(`هل أنت متأكد من تعليق حساب البائع "${sellerName}"؟`)) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/api/price-reports/admin/seller/${sellerId}/suspend?reason=مخالفة الأسعار`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('تم تعليق حساب البائع');
      await fetchSellersWithViolations();
    } catch (error) {
      alert(error.response?.data?.detail || 'حدث خطأ');
    }
  };

  const handleUnsuspendSeller = async (sellerId) => {
    if (!window.confirm('هل أنت متأكد من إلغاء تعليق حساب البائع؟')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API}/api/price-reports/admin/seller/${sellerId}/unsuspend`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('تم إلغاء تعليق الحساب');
      await fetchSellersWithViolations();
    } catch (error) {
      alert(error.response?.data?.detail || 'حدث خطأ');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">قيد المراجعة</span>;
      case 'approved':
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">مخالفة مؤكدة</span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">مرفوض</span>;
      case 'warning':
        return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">تحذير</span>;
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
    <div className="space-y-6">
      {/* إحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Flag size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{stats.total || 0}</p>
              <p className="text-xs text-gray-500">إجمالي البلاغات</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <Clock size={20} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending || 0}</p>
              <p className="text-xs text-gray-500">قيد المراجعة</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats.approved || 0}</p>
              <p className="text-xs text-gray-500">مخالفات مؤكدة</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <MessageSquare size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{stats.warning || 0}</p>
              <p className="text-xs text-gray-500">تحذيرات</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats.rejected || 0}</p>
              <p className="text-xs text-gray-500">مرفوضة</p>
            </div>
          </div>
        </div>
      </div>

      {/* التبويبات */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'reports'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Flag size={16} className="inline mr-1" />
          البلاغات ({stats.pending || 0} جديد)
        </button>
        <button
          onClick={() => setActiveTab('sellers')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'sellers'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <AlertTriangle size={16} className="inline mr-1" />
          البائعون المخالفون ({sellersWithViolations.length})
        </button>
      </div>

      {activeTab === 'reports' && (
        <>
          {/* فلاتر البلاغات */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {[
              { key: 'pending', label: 'قيد المراجعة' },
              { key: 'all', label: 'الكل' },
              { key: 'approved', label: 'مخالفات مؤكدة' },
              { key: 'warning', label: 'تحذيرات' },
              { key: 'rejected', label: 'مرفوضة' },
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

          {/* قائمة البلاغات */}
          <div className="space-y-3">
            {reports.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl">
                <Flag size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">لا توجد بلاغات</p>
              </div>
            ) : (
              reports.map(report => (
                <div key={report.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Header */}
                  <div 
                    className="p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                          <Flag size={20} className="text-red-600" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{report.product_name}</p>
                          <p className="text-xs text-gray-500">{formatDate(report.created_at)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(report.status)}
                        {expandedReport === report.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">السعر الحالي</p>
                        <p className="font-bold text-red-600">{formatPrice(report.product_price)}</p>
                      </div>
                      {report.suggested_price && (
                        <div>
                          <p className="text-gray-500 text-xs">السعر المقترح</p>
                          <p className="font-bold text-green-600">{formatPrice(report.suggested_price)}</p>
                        </div>
                      )}
                      <div>
                        <p className="text-gray-500 text-xs">البائع</p>
                        <p className="font-bold text-gray-700">{report.seller_name}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">نقاط مخالفات البائع</p>
                        <p className={`font-bold ${report.seller_violation_points >= 5 ? 'text-red-600' : 'text-orange-600'}`}>
                          {report.seller_violation_points || 0} نقطة
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedReport === report.id && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      <div className="mb-4">
                        <p className="text-sm font-bold text-gray-700 mb-1">سبب الإبلاغ:</p>
                        <p className="text-sm text-gray-600 bg-white p-2 rounded-lg border">{report.reason}</p>
                      </div>

                      {report.comment && (
                        <div className="mb-4">
                          <p className="text-sm font-bold text-gray-700 mb-1">ملاحظات إضافية:</p>
                          <p className="text-sm text-gray-600 bg-white p-2 rounded-lg border">{report.comment}</p>
                        </div>
                      )}

                      {/* Privacy Notice */}
                      <div className="mb-4 bg-blue-50 p-2 rounded-lg text-xs text-blue-700">
                        <p className="font-bold">🔒 ملاحظة الخصوصية:</p>
                        <p>معلومات المُبلّغ محمية ولن تُشارك مع البائع.</p>
                      </div>

                      {report.status === 'pending' && (
                        <div className="space-y-3">
                          <p className="text-sm font-bold text-gray-700">اتخاذ إجراء:</p>
                          
                          {/* Resolution Options */}
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setResolutionStatus('approved')}
                              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                                resolutionStatus === 'approved'
                                  ? 'bg-red-500 text-white'
                                  : 'bg-red-100 text-red-700'
                              }`}
                            >
                              مخالفة مؤكدة
                            </button>
                            <button
                              onClick={() => setResolutionStatus('warning')}
                              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                                resolutionStatus === 'warning'
                                  ? 'bg-orange-500 text-white'
                                  : 'bg-orange-100 text-orange-700'
                              }`}
                            >
                              تحذير فقط
                            </button>
                            <button
                              onClick={() => setResolutionStatus('rejected')}
                              className={`px-3 py-2 rounded-lg text-sm font-medium ${
                                resolutionStatus === 'rejected'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              رفض البلاغ
                            </button>
                          </div>

                          {/* Violation Points (only for approved) */}
                          {resolutionStatus === 'approved' && (
                            <div>
                              <label className="text-sm font-medium text-gray-700 block mb-1">
                                نقاط المخالفة (1-5):
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="5"
                                value={violationPoints}
                                onChange={(e) => setViolationPoints(Math.min(5, Math.max(1, parseInt(e.target.value) || 1)))}
                                className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                البائع لديه حالياً {report.seller_violation_points || 0} نقطة. 
                                عند الوصول لـ 10 نقاط يتم تعليق الحساب تلقائياً.
                              </p>
                            </div>
                          )}

                          {/* Admin Notes */}
                          <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">
                              ملاحظات الأدمن (اختياري):
                            </label>
                            <textarea
                              value={adminNotes}
                              onChange={(e) => setAdminNotes(e.target.value)}
                              placeholder="أي ملاحظات إضافية..."
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            />
                          </div>

                          {/* Submit Button */}
                          <button
                            onClick={() => handleResolve(report.id)}
                            disabled={processing === report.id}
                            className="w-full py-2 bg-orange-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-orange-600 disabled:opacity-50"
                          >
                            {processing === report.id ? (
                              <RefreshCw size={16} className="animate-spin" />
                            ) : (
                              <CheckCircle size={16} />
                            )}
                            تأكيد الإجراء
                          </button>
                        </div>
                      )}

                      {report.status !== 'pending' && report.admin_notes && (
                        <div className="mt-3">
                          <p className="text-sm font-bold text-gray-700 mb-1">ملاحظات الأدمن:</p>
                          <p className="text-sm text-gray-600 bg-white p-2 rounded-lg border">{report.admin_notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {activeTab === 'sellers' && (
        <div className="space-y-3">
          {sellersWithViolations.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <UserCheck size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">لا يوجد بائعون لديهم نقاط مخالفات</p>
            </div>
          ) : (
            sellersWithViolations.map(seller => (
              <div key={seller.id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      seller.is_suspended ? 'bg-red-100' : seller.violation_points >= 5 ? 'bg-orange-100' : 'bg-yellow-100'
                    }`}>
                      <AlertTriangle size={20} className={
                        seller.is_suspended ? 'text-red-600' : seller.violation_points >= 5 ? 'text-orange-600' : 'text-yellow-600'
                      } />
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">{seller.name}</p>
                      <p className="text-xs text-gray-500">{seller.phone}</p>
                    </div>
                  </div>
                  
                  <div className="text-left">
                    <p className={`text-2xl font-bold ${
                      seller.violation_points >= 10 ? 'text-red-600' : seller.violation_points >= 5 ? 'text-orange-600' : 'text-yellow-600'
                    }`}>
                      {seller.violation_points} نقطة
                    </p>
                    {seller.is_suspended && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                        معلّق
                      </span>
                    )}
                  </div>
                </div>

                {seller.suspension_reason && (
                  <p className="text-xs text-red-600 mt-2 bg-red-50 p-2 rounded-lg">
                    سبب التعليق: {seller.suspension_reason}
                  </p>
                )}

                <div className="flex gap-2 mt-3">
                  {seller.is_suspended ? (
                    <button
                      onClick={() => handleUnsuspendSeller(seller.id)}
                      className="flex-1 py-2 bg-green-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-green-600"
                    >
                      <UserCheck size={16} />
                      إلغاء التعليق
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSuspendSeller(seller.id, seller.name)}
                      className="flex-1 py-2 bg-red-500 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-red-600"
                    >
                      <Ban size={16} />
                      تعليق الحساب
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default PriceReportsTab;
