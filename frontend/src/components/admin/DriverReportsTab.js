// /app/frontend/src/components/admin/DriverReportsTab.js
// تبويب إدارة البلاغات الأخلاقية ضد موظفي التوصيل

import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, User, Phone, Clock, CheckCircle, XCircle,
  Search, Filter, Loader2, ChevronDown, FileText, Shield,
  Trash2, UserX, RefreshCw, MinusCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;

const CATEGORY_COLORS = {
  'سلوك_غير_لائق': 'bg-yellow-100 text-yellow-700',
  'تحرش': 'bg-red-100 text-red-700',
  'سرقة_احتيال': 'bg-red-100 text-red-700',
  'أخرى': 'bg-gray-100 text-gray-700'
};

// نقاط الخصم حسب نوع البلاغ
const PENALTY_POINTS = {
  'سلوك_غير_لائق': 15,
  'تحرش': 50,
  'سرقة_احتيال': 100,
  'أخرى': 10
};

const STATUS_CONFIG = {
  pending: { label: 'قيد المراجعة', color: 'bg-amber-100 text-amber-700', icon: Clock },
  suspended: { label: 'معلّق', color: 'bg-yellow-100 text-yellow-700', icon: Shield },
  dismissed: { label: 'مرفوض', color: 'bg-green-100 text-green-700', icon: XCircle },
  penalized: { label: 'تم الخصم', color: 'bg-orange-100 text-orange-700', icon: MinusCircle },
  terminated: { label: 'تم الفصل', color: 'bg-red-100 text-red-700', icon: UserX },
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('ar-SY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const DriverReportsTab = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({ pending: 0, dismissed: 0, terminated: 0, total: 0 });
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/driver-reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(res.data.reports);
      setStats(res.data.stats);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (reportId, action) => {
    setActionLoading(true);
    try {
      await axios.put(
        `${API}/api/admin/driver-reports/${reportId}?action=${action}&admin_notes=${encodeURIComponent(adminNotes)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchReports();
      setSelectedReport(null);
      setAdminNotes('');
    } catch (error) {
      console.error('Error handling report:', error);
      alert(error.response?.data?.detail || 'حدث خطأ');
    } finally {
      setActionLoading(false);
    }
  };

  const filteredReports = reports.filter(report => {
    if (filter !== 'all' && report.status !== filter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        report.driver_name?.toLowerCase().includes(query) ||
        report.reporter_name?.toLowerCase().includes(query) ||
        report.driver_phone?.includes(query)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={32} className="animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <StatCard
          icon={Clock}
          label="قيد المراجعة"
          value={stats.pending}
          color="amber"
          onClick={() => setFilter('pending')}
          active={filter === 'pending'}
        />
        <StatCard
          icon={Shield}
          label="معلّق"
          value={stats.suspended || 0}
          color="yellow"
          onClick={() => setFilter('suspended')}
          active={filter === 'suspended'}
        />
        <StatCard
          icon={XCircle}
          label="مرفوض"
          value={stats.dismissed}
          color="green"
          onClick={() => setFilter('dismissed')}
          active={filter === 'dismissed'}
        />
        <StatCard
          icon={UserX}
          label="تم الفصل"
          value={stats.terminated}
          color="red"
          onClick={() => setFilter('terminated')}
          active={filter === 'terminated'}
        />
        <StatCard
          icon={AlertTriangle}
          label="الإجمالي"
          value={stats.total}
          color="gray"
          onClick={() => setFilter('all')}
          active={filter === 'all'}
        />
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو الهاتف..."
              className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#FF6B00]"
            />
          </div>
          <button
            onClick={fetchReports}
            className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            <RefreshCw size={18} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {filteredReports.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <Shield size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">لا توجد بلاغات</p>
          </div>
        ) : (
          filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onClick={() => setSelectedReport(report)}
            />
          ))
        )}
      </div>

      {/* Report Details Modal */}
      <AnimatePresence>
        {selectedReport && (
          <ReportDetailsModal
            report={selectedReport}
            onClose={() => {
              setSelectedReport(null);
              setAdminNotes('');
            }}
            onAction={handleAction}
            actionLoading={actionLoading}
            adminNotes={adminNotes}
            setAdminNotes={setAdminNotes}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ icon: Icon, label, value, color, onClick, active }) => {
  const colors = {
    amber: 'bg-amber-100 text-amber-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    gray: 'bg-gray-100 text-gray-600',
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

// Report Card Component
const ReportCard = ({ report, onClick }) => {
  const StatusIcon = STATUS_CONFIG[report.status]?.icon || Clock;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle size={24} className="text-red-500" />
          </div>
          <div>
            <p className="font-bold text-gray-900">{report.driver_name}</p>
            <p className="text-xs text-gray-500">{report.driver_phone}</p>
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${STATUS_CONFIG[report.status]?.color}`}>
          <StatusIcon size={12} className="inline mr-1" />
          {STATUS_CONFIG[report.status]?.label}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs px-2 py-1 rounded-full ${CATEGORY_COLORS[report.category]}`}>
          {report.category_label}
        </span>
        <span className="text-xs text-gray-400">
          من: {report.reporter_name} ({report.reporter_type})
        </span>
      </div>

      <p className="text-sm text-gray-600 line-clamp-2">{report.details}</p>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-400 flex items-center gap-1">
          <Clock size={12} />
          {formatDate(report.created_at)}
        </span>
        <span className="text-xs text-[#FF6B00]">عرض التفاصيل ←</span>
      </div>
    </motion.div>
  );
};

// Report Details Modal
const ReportDetailsModal = ({ report, onClose, onAction, actionLoading, adminNotes, setAdminNotes }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-l from-red-500 to-red-600 p-3 text-white sticky top-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h3 className="font-bold text-sm">تفاصيل البلاغ</h3>
              <p className="text-xs text-white/80">#{report.id.slice(0, 8)}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Driver Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <User size={16} className="text-red-500" />
              موظف التوصيل المُبلَّغ عنه
            </h4>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900">{report.driver_name}</p>
                <p className="text-sm text-gray-500">{report.driver_phone}</p>
              </div>
              <a
                href={`tel:${report.driver_phone}`}
                className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                <Phone size={16} className="text-gray-600" />
              </a>
            </div>
          </div>

          {/* Reporter Info */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <FileText size={16} className="text-blue-500" />
              مقدم البلاغ
            </h4>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-gray-900">{report.reporter_name}</p>
                <p className="text-sm text-gray-500">{report.reporter_phone} - {report.reporter_type}</p>
              </div>
              <a
                href={`tel:${report.reporter_phone}`}
                className="p-2 bg-blue-200 rounded-lg hover:bg-blue-300"
              >
                <Phone size={16} className="text-blue-600" />
              </a>
            </div>
          </div>

          {/* Report Details */}
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-bold text-gray-900">تفاصيل البلاغ</h4>
              <span className={`text-xs px-2 py-1 rounded-full ${CATEGORY_COLORS[report.category]}`}>
                {report.category_label}
              </span>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-line">{report.details}</p>
            <p className="text-xs text-gray-400 mt-3">
              <Clock size={12} className="inline mr-1" />
              {formatDate(report.created_at)}
            </p>
          </div>

          {/* Admin Notes */}
          {report.status === 'pending' && (
            <div>
              <label className="text-sm font-bold text-gray-700 mb-2 block">ملاحظات المدير (اختياري)</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="أضف ملاحظاتك هنا..."
                className="w-full p-3 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={2}
              />
            </div>
          )}

          {/* Actions */}
          {report.status === 'pending' ? (
            <div className="space-y-3 pt-2">
              {/* معلومات الخصم */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-xs text-orange-700 font-medium">
                  💡 نقاط الخصم لهذا البلاغ: <span className="font-bold">{PENALTY_POINTS[report.category] || 10} نقطة</span>
                </p>
              </div>
              
              {/* الصف الأول: رفض وتعليق */}
              <div className="flex gap-2">
                <button
                  onClick={() => onAction(report.id, 'dismiss')}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                  رفض البلاغ
                </button>
                <button
                  onClick={() => onAction(report.id, 'suspend')}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
                  تعليق مؤقت
                </button>
              </div>
              
              {/* الصف الثاني: خصم وفصل */}
              <div className="flex gap-2">
                <button
                  onClick={() => onAction(report.id, 'penalize')}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <MinusCircle size={16} />}
                  خصم نقاط
                </button>
                <button
                  onClick={() => onAction(report.id, 'terminate')}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                >
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <UserX size={16} />}
                  فصل فوري
                </button>
              </div>
            </div>
          ) : (
            <div className={`p-4 rounded-lg ${
              report.status === 'dismissed' ? 'bg-green-50' : 
              report.status === 'suspended' ? 'bg-yellow-50' :
              report.status === 'penalized' ? 'bg-orange-50' : 'bg-red-50'
            }`}>
              <p className={`text-sm font-medium ${
                report.status === 'dismissed' ? 'text-green-700' : 
                report.status === 'suspended' ? 'text-yellow-700' :
                report.status === 'penalized' ? 'text-orange-700' : 'text-red-700'
              }`}>
                {report.status === 'dismissed' && '✓ تم رفض البلاغ'}
                {report.status === 'suspended' && '⏸️ تم تعليق حساب الموظف مؤقتاً'}
                {report.status === 'penalized' && `⚠️ تم خصم ${report.penalty_applied || PENALTY_POINTS[report.category]} نقطة`}
                {report.status === 'terminated' && '✗ تم فصل الموظف نهائياً'}
              </p>
              {report.admin_notes && (
                <p className="text-xs text-gray-500 mt-2">ملاحظات: {report.admin_notes}</p>
              )}
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-full py-2.5 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50"
          >
            إغلاق
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DriverReportsTab;
