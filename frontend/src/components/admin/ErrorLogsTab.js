// /app/frontend/src/components/admin/ErrorLogsTab.js
// تبويب سجلات الأخطاء في لوحة الأدمن

import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  AlertTriangle, Check, Trash2, RefreshCw, 
  Clock, Monitor, Smartphone, Globe, Server,
  ChevronDown, ChevronUp, Filter, Search
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const ErrorLogsTab = () => {
  const { toast } = useToast();
  const [errors, setErrors] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: 'all', resolved: 'unresolved' });
  const [expandedError, setExpandedError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
    // تحديث كل دقيقة
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // جلب الإحصائيات
      const statsRes = await axios.get(`${API}/api/errors/stats`);
      setStats(statsRes.data);
      
      // جلب قائمة الأخطاء
      const params = {};
      if (filter.type !== 'all') params.error_type = filter.type;
      if (filter.resolved === 'resolved') params.is_resolved = true;
      if (filter.resolved === 'unresolved') params.is_resolved = false;
      
      const errorsRes = await axios.get(`${API}/api/errors/list`, { params });
      setErrors(errorsRes.data.errors || []);
    } catch (error) {
      console.error('Error fetching error logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const resolveError = async (errorId) => {
    try {
      await axios.post(`${API}/api/errors/${errorId}/resolve`);
      toast({ title: "تم", description: "تم تحديد الخطأ كمحلول" });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل تحديث الحالة", variant: "destructive" });
    }
  };

  const deleteError = async (errorId) => {
    if (!window.confirm('هل تريد حذف هذا السجل؟')) return;
    
    try {
      await axios.delete(`${API}/api/errors/${errorId}`);
      toast({ title: "تم", description: "تم حذف السجل" });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل الحذف", variant: "destructive" });
    }
  };

  const getErrorTypeIcon = (type) => {
    switch (type) {
      case 'frontend': return <Monitor size={16} className="text-blue-500" />;
      case 'api': return <Server size={16} className="text-purple-500" />;
      case 'payment': return <AlertTriangle size={16} className="text-red-500" />;
      default: return <Globe size={16} className="text-gray-500" />;
    }
  };

  const getErrorTypeLabel = (type) => {
    const labels = {
      frontend: 'واجهة',
      api: 'API',
      payment: 'دفع',
      backend: 'خادم'
    };
    return labels[type] || type;
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diff = now - date;
    
    // أقل من دقيقة
    if (diff < 60000) return 'الآن';
    // أقل من ساعة
    if (diff < 3600000) return `منذ ${Math.floor(diff / 60000)} دقيقة`;
    // أقل من يوم
    if (diff < 86400000) return `منذ ${Math.floor(diff / 3600000)} ساعة`;
    // أكثر من يوم
    return date.toLocaleDateString('ar-SY', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const filteredErrors = errors.filter(err => 
    !searchQuery || 
    err.error_message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    err.component?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && !errors.length) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* إحصائيات سريعة */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">إجمالي الأخطاء</span>
              <AlertTriangle size={20} className="text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total_errors}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 border border-red-200 bg-red-50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-red-600">غير محلولة</span>
              <AlertTriangle size={20} className="text-red-500" />
            </div>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.unresolved_errors}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 border border-orange-200 bg-orange-50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-orange-600">أخطاء اليوم</span>
              <Clock size={20} className="text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-orange-600 mt-1">{stats.today_errors}</p>
          </div>
          
          <div className="bg-white rounded-xl p-4 border border-blue-200 bg-blue-50">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-600">هذا الأسبوع</span>
              <Clock size={20} className="text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.week_errors}</p>
          </div>
        </div>
      )}

      {/* توزيع حسب النوع */}
      {stats?.by_type && Object.keys(stats.by_type).length > 0 && (
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <h3 className="font-bold text-gray-900 mb-3">توزيع الأخطاء حسب النوع</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.by_type).map(([type, count]) => (
              <div 
                key={type}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg"
              >
                {getErrorTypeIcon(type)}
                <span className="text-sm text-gray-700">{getErrorTypeLabel(type)}</span>
                <span className="text-sm font-bold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* فلاتر وبحث */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في الأخطاء..."
              className="w-full pr-10 pl-4 py-2 border border-gray-200 rounded-lg text-sm"
            />
          </div>
        </div>
        
        <select
          value={filter.type}
          onChange={(e) => setFilter(f => ({ ...f, type: e.target.value }))}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="all">كل الأنواع</option>
          <option value="frontend">واجهة</option>
          <option value="api">API</option>
          <option value="payment">دفع</option>
        </select>
        
        <select
          value={filter.resolved}
          onChange={(e) => setFilter(f => ({ ...f, resolved: e.target.value }))}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white"
        >
          <option value="all">الكل</option>
          <option value="unresolved">غير محلولة</option>
          <option value="resolved">محلولة</option>
        </select>
        
        <button
          onClick={fetchData}
          className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* قائمة الأخطاء */}
      <div className="space-y-3">
        {filteredErrors.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
            <Check size={48} className="mx-auto text-green-500 mb-3" />
            <p className="text-gray-600">لا توجد أخطاء مسجلة</p>
          </div>
        ) : (
          filteredErrors.map((error) => (
            <div 
              key={error.id}
              className={`bg-white rounded-xl border overflow-hidden ${
                error.is_resolved ? 'border-green-200 bg-green-50/30' : 'border-red-200'
              }`}
            >
              {/* Header */}
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedError(expandedError === error.id ? null : error.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {getErrorTypeIcon(error.error_type)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {error.error_message?.slice(0, 100)}
                        {error.error_message?.length > 100 && '...'}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {error.component && (
                          <span className="bg-gray-100 px-2 py-0.5 rounded">{error.component}</span>
                        )}
                        <span>{formatDate(error.created_at)}</span>
                        {error.occurrence_count > 1 && (
                          <span className="text-orange-600 font-medium">
                            تكرر {error.occurrence_count} مرة
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {error.is_resolved ? (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                        محلول
                      </span>
                    ) : (
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full">
                        مفتوح
                      </span>
                    )}
                    {expandedError === error.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </div>
              </div>
              
              {/* Expanded Details */}
              {expandedError === error.id && (
                <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
                  {/* معلومات إضافية */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-gray-500">المستخدم:</span>
                      <p className="font-medium">{error.user_phone || 'غير معروف'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">IP:</span>
                      <p className="font-medium font-mono text-xs">{error.ip_address || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">الصفحة:</span>
                      <p className="font-medium truncate">{error.url || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">آخر حدوث:</span>
                      <p className="font-medium">{formatDate(error.last_occurrence || error.created_at)}</p>
                    </div>
                  </div>
                  
                  {/* Stack Trace */}
                  {error.error_stack && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Stack Trace:</p>
                      <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs overflow-x-auto max-h-48">
                        {error.error_stack}
                      </pre>
                    </div>
                  )}
                  
                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {!error.is_resolved && (
                      <button
                        onClick={() => resolveError(error.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                      >
                        <Check size={16} />
                        تحديد كمحلول
                      </button>
                    )}
                    <button
                      onClick={() => deleteError(error.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm hover:bg-red-200"
                    >
                      <Trash2 size={16} />
                      حذف
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* أكثر الأخطاء تكراراً */}
      {stats?.most_common?.length > 0 && (
        <div className="bg-white rounded-xl p-4 border border-orange-200">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-orange-500" />
            أكثر الأخطاء تكراراً
          </h3>
          <div className="space-y-2">
            {stats.most_common.slice(0, 5).map((err, i) => (
              <div 
                key={err.id}
                className="flex items-center justify-between p-3 bg-orange-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-orange-600">#{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[300px]">
                      {err.error_message}
                    </p>
                    {err.component && (
                      <p className="text-xs text-gray-500">{err.component}</p>
                    )}
                  </div>
                </div>
                <span className="px-3 py-1 bg-orange-500 text-white rounded-full text-sm font-bold">
                  {err.occurrence_count}x
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ErrorLogsTab;
