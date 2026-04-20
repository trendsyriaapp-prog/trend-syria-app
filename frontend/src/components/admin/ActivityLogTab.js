// /app/frontend/src/components/admin/ActivityLogTab.js
// سجل نشاط المسؤولين

import { useState, useEffect } from 'react';
import logger from '../../lib/logger';
import axios from 'axios';
import {
  Activity, Clock, User, Filter, RefreshCw,
  ChevronRight, ChevronLeft, Calendar, BarChart3
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const ACTION_TYPE_LABELS = {
  user: 'المستخدمين',
  order: 'الطلبات',
  product: 'المنتجات',
  store: 'المتاجر',
  payment: 'المدفوعات',
  settings: 'الإعدادات',
  coupon: 'الكوبونات',
  driver: 'السائقين',
  support: 'الدعم',
  other: 'أخرى'
};

const ACTION_TYPE_COLORS = {
  user: 'bg-blue-100 text-blue-700',
  order: 'bg-orange-100 text-orange-700',
  product: 'bg-green-100 text-green-700',
  store: 'bg-purple-100 text-purple-700',
  payment: 'bg-emerald-100 text-emerald-700',
  settings: 'bg-gray-100 text-gray-700',
  coupon: 'bg-pink-100 text-pink-700',
  driver: 'bg-cyan-100 text-cyan-700',
  support: 'bg-yellow-100 text-yellow-700',
  other: 'bg-gray-100 text-gray-700'
};

const ActivityLogTab = () => {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    action_type: '',
    admin_id: '',
    days: 7
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchLogs();
    fetchStats();
    fetchAdmins();
  }, [filter, page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page,
        limit: 30,
        days: filter.days
      });
      if (filter.action_type) params.append('action_type', filter.action_type);
      if (filter.admin_id) params.append('admin_id', filter.admin_id);
      
      const res = await axios.get(`${API}/api/activity-log/?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(res.data.logs || []);
      setTotalPages(res.data.pages || 1);
    } catch (err) {
      logger.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/api/activity-log/stats?days=${filter.days}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (err) {
      logger.error('Error fetching stats:', err);
    }
  };

  const fetchAdmins = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/api/activity-log/admins`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAdmins(res.data.admins || []);
    } catch (err) {
      logger.error('Error fetching admins:', err);
    }
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

  return (
    <div className="space-y-3" data-testid="activity-log-tab">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Activity size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.total || 0}</p>
              <p className="text-xs text-gray-500">إجمالي الأنشطة</p>
            </div>
          </div>
        </div>
        
        {/* Top action types */}
        {stats?.by_type && Object.entries(stats.by_type).slice(0, 3).map(([type, count]) => (
          <div key={type} className="bg-white p-4 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${ACTION_TYPE_COLORS[type]?.split(' ')[0] || 'bg-gray-100'}`}>
                <BarChart3 size={20} className={ACTION_TYPE_COLORS[type]?.split(' ')[1] || 'text-gray-600'} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-xs text-gray-500">{ACTION_TYPE_LABELS[type] || type}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg flex flex-wrap gap-3 items-center">
        <select
          value={filter.action_type}
          onChange={(e) => { setFilter({...filter, action_type: e.target.value}); setPage(1); }}
          className="px-4 py-2 border rounded-lg text-sm"
        >
          <option value="">كل الإجراءات</option>
          {Object.entries(ACTION_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        
        <select
          value={filter.admin_id}
          onChange={(e) => { setFilter({...filter, admin_id: e.target.value}); setPage(1); }}
          className="px-4 py-2 border rounded-lg text-sm"
        >
          <option value="">كل المسؤولين</option>
          {admins.map((admin) => (
            <option key={admin.id} value={admin.id}>{admin.name}</option>
          ))}
        </select>
        
        <select
          value={filter.days}
          onChange={(e) => { setFilter({...filter, days: parseInt(e.target.value)}); setPage(1); }}
          className="px-4 py-2 border rounded-lg text-sm"
        >
          <option value={7}>آخر 7 أيام</option>
          <option value={14}>آخر 14 يوم</option>
          <option value={30}>آخر 30 يوم</option>
          <option value={90}>آخر 90 يوم</option>
        </select>
        
        <button
          onClick={() => { fetchLogs(); fetchStats(); }}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <RefreshCw size={20} className="text-gray-500" />
        </button>
      </div>

      {/* Logs List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="animate-spin text-green-500" size={32} />
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <Activity size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500">لا توجد أنشطة مسجلة</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg overflow-hidden">
          <div className="divide-y divide-gray-100">
            {logs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start gap-2">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    ACTION_TYPE_COLORS[log.action_type] || 'bg-gray-100 text-gray-700'
                  }`}>
                    <Activity size={20} />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        ACTION_TYPE_COLORS[log.action_type] || 'bg-gray-100 text-gray-700'
                      }`}>
                        {ACTION_TYPE_LABELS[log.action_type] || log.action_type}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <User size={12} />
                        {log.admin_name}
                      </span>
                    </div>
                    
                    <p className="text-sm font-medium text-gray-900">{log.action}</p>
                    
                    {log.target_name && (
                      <p className="text-xs text-gray-500 mt-1">
                        الهدف: {log.target_name}
                      </p>
                    )}
                    
                    {log.details && (
                      <div className="mt-2 p-2 bg-gray-50 rounded-lg text-xs text-gray-600 max-w-lg overflow-hidden">
                        {typeof log.details === 'object' 
                          ? JSON.stringify(log.details, null, 2).slice(0, 200)
                          : log.details
                        }
                      </div>
                    )}
                  </div>
                  
                  {/* Time */}
                  <div className="text-left flex-shrink-0">
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock size={12} />
                      {formatDate(log.created_at)}
                    </p>
                    {log.ip_address && (
                      <p className="text-[10px] text-gray-400 mt-1">IP: {log.ip_address}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 p-4 border-t">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronRight size={20} />
              </button>
              <span className="text-sm text-gray-600">
                صفحة {page} من {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronLeft size={20} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Daily Chart */}
      {stats?.daily && stats.daily.length > 0 && (
        <div className="bg-white rounded-lg p-4">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar size={20} className="text-green-500" />
            النشاط اليومي
          </h3>
          <div className="space-y-2">
            {stats.daily.map((day, index) => {
              const maxCount = Math.max(...stats.daily.map(d => d.count)) || 1;
              const percentage = (day.count / maxCount) * 100;
              
              return (
                <div key={index} className="flex items-center gap-3">
                  <span className="w-20 text-xs text-gray-500 text-left">{day.date}</span>
                  <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-12 text-xs font-medium text-gray-700 text-left">{day.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ActivityLogTab;
