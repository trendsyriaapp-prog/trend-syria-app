// /app/frontend/src/components/admin/RateLimitDashboard.js
// لوحة مراقبة Rate Limiting

import { useState, useEffect, useCallback } from 'react';
import { 
  Shield, 
  Activity, 
  Ban, 
  Clock, 
  TrendingUp, 
  RefreshCw,
  Unlock,
  AlertTriangle,
  Server,
  BarChart3,
  Bell,
  BellRing,
  Settings,
  TestTube,
  Check
} from 'lucide-react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

export default function RateLimitDashboard({ token }) {
  const [stats, setStats] = useState(null);
  const [blockedIps, setBlockedIps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [alertConfig, setAlertConfig] = useState(null);
  const [testingAlert, setTestingAlert] = useState(false);

  const fetchData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [statsRes, blockedRes, alertRes] = await Promise.all([
        axios.get(`${API}/api/rate-limits/stats`, { headers }),
        axios.get(`${API}/api/rate-limits/blocked`, { headers }),
        axios.get(`${API}/api/rate-limits/alerts/config`, { headers })
      ]);
      
      setStats(statsRes.data);
      setBlockedIps(blockedRes.data.blocked_ips || []);
      setAlertConfig(alertRes.data.config);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || 'فشل في جلب البيانات');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
    // تحديث تلقائي كل 30 ثانية
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleUnblock = async (ip) => {
    if (!window.confirm(`هل تريد إلغاء حظر ${ip}؟`)) return;
    
    try {
      await axios.post(
        `${API}/api/rate-limits/unblock`,
        { ip },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchData(true);
    } catch (err) {
      alert(err.response?.data?.detail || 'فشل في إلغاء الحظر');
    }
  };

  const handleToggleAlerts = async () => {
    try {
      await axios.post(
        `${API}/api/rate-limits/alerts/config`,
        { enabled: !alertConfig?.enabled },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchData(true);
    } catch (err) {
      alert(err.response?.data?.detail || 'فشل في تحديث الإعدادات');
    }
  };

  const handleTestAlert = async () => {
    setTestingAlert(true);
    try {
      const res = await axios.post(
        `${API}/api/rate-limits/test-alert`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert(`✅ ${res.data.message}\n${res.data.push_status}`);
    } catch (err) {
      alert(err.response?.data?.detail || 'فشل في إرسال التنبيه التجريبي');
    } finally {
      setTestingAlert(false);
    }
  };

  const handleUpdateAlertConfig = async (field, value) => {
    try {
      await axios.post(
        `${API}/api/rate-limits/alerts/config`,
        { [field]: value },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchData(true);
    } catch (err) {
      alert(err.response?.data?.detail || 'فشل في تحديث الإعدادات');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
        <p>{error}</p>
        <button 
          onClick={() => fetchData(true)}
          className="mt-2 px-4 py-2 bg-red-100 rounded-lg hover:bg-red-200"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">مراقبة Rate Limiting</h2>
            <p className="text-sm text-gray-500">وقت التشغيل: {stats?.uptime_formatted}</p>
          </div>
        </div>
        <button
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="إجمالي الطلبات"
          value={stats?.total_requests?.toLocaleString()}
          color="blue"
        />
        <StatCard
          icon={<Ban className="w-5 h-5" />}
          label="الطلبات المحظورة"
          value={stats?.blocked_requests?.toLocaleString()}
          subtext={`${stats?.block_rate}%`}
          color="red"
        />
        <StatCard
          icon={<Shield className="w-5 h-5" />}
          label="IPs محظورة حالياً"
          value={stats?.currently_blocked_ips}
          color="orange"
        />
        <StatCard
          icon={<BellRing className="w-5 h-5" />}
          label="تنبيهات مرسلة"
          value={stats?.security_alerts_sent || 0}
          color="purple"
        />
        <StatCard
          icon={<Server className="w-5 h-5" />}
          label="معدل الحظر"
          value={`${stats?.block_rate}%`}
          color="green"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b overflow-x-auto">
        {[
          { id: 'overview', label: 'نظرة عامة', icon: <BarChart3 className="w-4 h-4" /> },
          { id: 'blocked', label: 'المحظورين', icon: <Ban className="w-4 h-4" /> },
          { id: 'endpoints', label: 'الـ APIs', icon: <Activity className="w-4 h-4" /> },
          { id: 'alerts', label: 'التنبيهات', icon: <Bell className="w-4 h-4" /> },
          { id: 'config', label: 'الإعدادات', icon: <Settings className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === tab.id 
                ? 'border-orange-500 text-orange-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Hourly Chart */}
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              الطلبات حسب الساعة (آخر 24 ساعة)
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {stats?.requests_by_hour && Object.entries(stats.requests_by_hour)
                .slice(-12)
                .reverse()
                .map(([hour, count]) => {
                  const maxCount = Math.max(...Object.values(stats.requests_by_hour));
                  const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                  const hourLabel = hour.split(' ')[1];
                  
                  return (
                    <div key={hour} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-12">{hourLabel}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 w-16 text-left">
                        {count.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Recent Blocks */}
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              آخر عمليات الحظر
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {stats?.recent_blocks?.length > 0 ? (
                stats.recent_blocks.map((block, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-red-50 rounded-lg text-sm">
                    <div>
                      <span className="font-mono text-red-700">{block.ip}</span>
                      <p className="text-xs text-red-500 truncate max-w-[200px]">{block.reason}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(block.blocked_at).toLocaleTimeString('ar-SY')}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-center py-4">لا يوجد عمليات حظر</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'blocked' && (
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Ban className="w-5 h-5 text-red-500" />
            IPs المحظورة حالياً ({blockedIps.length})
          </h3>
          
          {blockedIps.length > 0 ? (
            <div className="space-y-2">
              {blockedIps.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                      <Ban className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                      <span className="font-mono font-medium text-red-700">{item.ip}</span>
                      <div className="flex items-center gap-2 text-xs text-red-500">
                        <Clock className="w-3 h-3" />
                        متبقي: {item.remaining_seconds} ثانية
                        <span className="text-gray-400">|</span>
                        محظور {item.block_count} مرة
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnblock(item.ip)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white text-green-600 rounded-lg hover:bg-green-50 transition-colors text-sm border border-green-200"
                  >
                    <Unlock className="w-4 h-4" />
                    إلغاء الحظر
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Shield className="w-12 h-12 mx-auto mb-2 text-green-500" />
              <p>لا يوجد IPs محظورة حالياً</p>
            </div>
          )}

          {/* Top Blocked IPs */}
          {stats?.top_blocked_ips?.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-700 mb-3">أكثر IPs محظورة (تاريخياً)</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {stats.top_blocked_ips.map((item, idx) => (
                  <div key={idx} className="p-2 bg-gray-50 rounded-lg text-sm">
                    <span className="font-mono text-gray-700">{item.ip}</span>
                    <span className="text-red-500 mr-2">({item.count} مرة)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'endpoints' && (
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            أكثر APIs استخداماً
          </h3>
          <div className="space-y-2">
            {stats?.top_endpoints?.map((item, idx) => {
              const maxCount = stats.top_endpoints[0]?.count || 1;
              const percentage = (item.count / maxCount) * 100;
              
              return (
                <div key={idx} className="flex items-center gap-3">
                  <span className="text-sm font-mono text-gray-600 w-40 truncate" title={item.endpoint}>
                    {item.endpoint}
                  </span>
                  <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-400 to-blue-600 h-full rounded-full flex items-center justify-end px-2 transition-all"
                      style={{ width: `${Math.max(percentage, 10)}%` }}
                    >
                      <span className="text-xs text-white font-medium">
                        {item.count.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {/* Alert Status Card */}
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <Bell className="w-5 h-5 text-purple-500" />
                إعدادات التنبيهات الأمنية
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleTestAlert}
                  disabled={testingAlert}
                  className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm"
                >
                  <TestTube className={`w-4 h-4 ${testingAlert ? 'animate-spin' : ''}`} />
                  {testingAlert ? 'جاري الإرسال...' : 'تنبيه تجريبي'}
                </button>
                <button
                  onClick={handleToggleAlerts}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                    alertConfig?.enabled 
                      ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {alertConfig?.enabled ? (
                    <>
                      <Check className="w-4 h-4" />
                      مفعّل
                    </>
                  ) : (
                    <>
                      <Bell className="w-4 h-4" />
                      معطّل
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Alert Settings */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  عتبة التنبيه (عدد مرات الحظر)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={alertConfig?.alert_threshold || 3}
                    onChange={(e) => handleUpdateAlertConfig('alert_threshold', parseInt(e.target.value))}
                    className="w-20 px-3 py-2 border rounded-lg text-center"
                  />
                  <span className="text-sm text-gray-500">مرات حظر قبل إرسال تنبيه</span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  فترة التهدئة (بالثواني)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="60"
                    max="3600"
                    step="60"
                    value={alertConfig?.alert_cooldown || 300}
                    onChange={(e) => handleUpdateAlertConfig('alert_cooldown', parseInt(e.target.value))}
                    className="w-24 px-3 py-2 border rounded-lg text-center"
                  />
                  <span className="text-sm text-gray-500">ثانية بين التنبيهات لنفس IP</span>
                </div>
              </div>
            </div>
          </div>

          {/* Critical Endpoints */}
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              النقاط الحرجة (تنبيه فوري)
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              هذه النقاط ترسل تنبيه فوري عند أول حظر (بدون انتظار العتبة):
            </p>
            <div className="flex flex-wrap gap-2">
              {alertConfig?.critical_endpoints?.map((endpoint, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-mono">
                  {endpoint}
                </span>
              ))}
            </div>
          </div>

          {/* Alert Stats */}
          <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">إجمالي التنبيهات المرسلة</p>
                <p className="text-4xl font-bold mt-1">{stats?.security_alerts_sent || 0}</p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <BellRing className="w-8 h-8" />
              </div>
            </div>
            <p className="text-purple-100 text-xs mt-4">
              يتم إرسال التنبيهات عبر Push Notification وحفظها في الإشعارات
            </p>
          </div>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-500" />
            إعدادات Rate Limiting
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-right p-3 rounded-tr-lg">المسار</th>
                  <th className="text-center p-3">الطلبات</th>
                  <th className="text-center p-3">النافذة (ثانية)</th>
                  <th className="text-center p-3 rounded-tl-lg">مدة الحظر (ثانية)</th>
                </tr>
              </thead>
              <tbody>
                {stats?.rate_limits_config && Object.entries(stats.rate_limits_config).map(([path, config]) => (
                  <tr key={path} className="border-t hover:bg-gray-50">
                    <td className="p-3 font-mono text-gray-700">{path}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                        {config.requests}
                      </span>
                    </td>
                    <td className="p-3 text-center text-gray-600">{config.window}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full">
                        {config.block_duration}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            * عند تجاوز عدد الطلبات المسموح خلال النافذة الزمنية، يتم حظر IP للمدة المحددة
          </p>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, label, value, subtext, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-sm text-gray-500">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        {subtext && <span className="text-sm text-gray-400">{subtext}</span>}
      </div>
    </div>
  );
}
