// /app/frontend/src/components/admin/DriverSecurityTab.js
// تبويب إدارة تأمينات وحسابات موظفي التوصيل

import React, { useState, useEffect } from 'react';
import logger from '../../lib/logger';
import { 
  Shield, Check, X, Clock, AlertTriangle, RefreshCw, 
  CreditCard, Building, Send, Banknote, Settings, Users,
  LogOut, DollarSign, UserX, UserCheck, Trash2, Phone, Star,
  Package, Ban
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function DriverSecurityTab() {
  const [activeSubTab, setActiveSubTab] = useState('drivers');
  const [drivers, setDrivers] = useState([]);
  const [pendingDeposits, setPendingDeposits] = useState([]);
  const [pendingResignations, setPendingResignations] = useState([]);
  const [settings, setSettings] = useState({
    required_amount: 500,
    is_enabled: true,
    auto_deduct_from_earnings: true,
    min_behavior_points_for_refund: 50
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [suspendModal, setSuspendModal] = useState(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [deleteModal, setDeleteModal] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [driversRes, depositsRes, resignationsRes] = await Promise.all([
        fetch(`${API}/api/driver/security/admin/drivers`, { headers }),
        fetch(`${API}/api/driver/security/admin/pending-deposits`, { headers }),
        fetch(`${API}/api/driver/security/admin/pending-resignations`, { headers })
      ]);

      if (driversRes.ok) setDrivers(await driversRes.json());
      if (depositsRes.ok) setPendingDeposits(await depositsRes.json());
      if (resignationsRes.ok) setPendingResignations(await resignationsRes.json());
    } catch (err) {
      logger.error('Error fetching data:', err);
    }
    setLoading(false);
  };

  const handleSuspendDriver = async () => {
    if (!suspendModal) return;
    setActionLoading(suspendModal.id);
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(
        `${API}/api/driver/security/admin/driver/${suspendModal.id}/suspend?reason=${encodeURIComponent(suspendReason)}`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      if (res.ok) {
        alert('تم إيقاف السائق بنجاح');
        fetchData();
      } else {
        const data = await res.json();
        alert(data.detail || 'حدث خطأ');
      }
    } catch (err) {
      alert('حدث خطأ في الاتصال');
    }
    setActionLoading(null);
    setSuspendModal(null);
    setSuspendReason('');
  };

  const handleActivateDriver = async (driverId) => {
    if (!confirm('هل أنت متأكد من إعادة تفعيل هذا السائق؟')) return;
    
    setActionLoading(driverId);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API}/api/driver/security/admin/driver/${driverId}/activate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert('تم تفعيل السائق بنجاح');
        fetchData();
      }
    } catch (err) {
      alert('حدث خطأ');
    }
    setActionLoading(null);
  };

  const handleDeleteDriver = async () => {
    if (!deleteModal) return;
    
    setActionLoading(deleteModal.id);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API}/api/driver/security/admin/driver/${deleteModal.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert('تم حذف السائق نهائياً');
        fetchData();
      } else {
        const data = await res.json();
        alert(data.detail || 'حدث خطأ');
      }
    } catch (err) {
      alert('حدث خطأ في الاتصال');
    }
    setActionLoading(null);
    setDeleteModal(null);
  };

  const handleApproveDeposit = async (requestId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API}/api/driver/security/admin/approve-deposit/${requestId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert('تم قبول الإيداع بنجاح');
        fetchData();
      } else {
        const data = await res.json();
        alert(data.detail || 'حدث خطأ');
      }
    } catch (err) {
      alert('حدث خطأ في الاتصال');
    }
  };

  const handleRejectDeposit = async (requestId) => {
    const reason = prompt('سبب الرفض (اختياري):');
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API}/api/driver/security/admin/reject-deposit/${requestId}?reason=${encodeURIComponent(reason || '')}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert('تم رفض الطلب');
        fetchData();
      }
    } catch (err) {
      alert('حدث خطأ');
    }
  };

  const handleApproveResignation = async (requestId) => {
    if (!confirm('هل أنت متأكد من الموافقة على الاستقالة؟ سيتم تعطيل حساب السائق.')) return;
    
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API}/api/driver/security/admin/approve-resignation/${requestId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert('تمت الموافقة على الاستقالة');
        fetchData();
      }
    } catch (err) {
      alert('حدث خطأ');
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    const token = localStorage.getItem('token');
    try {
      const params = new URLSearchParams({
        required_amount: settings.required_amount,
        is_enabled: settings.is_enabled,
        auto_deduct: settings.auto_deduct_from_earnings,
        min_behavior_points: settings.min_behavior_points_for_refund
      });
      
      const res = await fetch(`${API}/api/driver/security/admin/settings?${params}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        alert('تم حفظ الإعدادات');
      } else {
        alert('حدث خطأ');
      }
    } catch (err) {
      alert('حدث خطأ في الاتصال');
    }
    setSaving(false);
  };

  const getPaymentIcon = (method) => {
    switch (method) {
      case 'shamcash': return <CreditCard className="w-4 h-4" />;
      case 'bank': return <Building className="w-4 h-4" />;
      case 'hawala': return <Send className="w-4 h-4" />;
      case 'cash': return <Banknote className="w-4 h-4" />;
      default: return <CreditCard className="w-4 h-4" />;
    }
  };

  const getPaymentName = (method) => {
    const names = {
      'shamcash': 'Sham Cash',
      'bank': 'تحويل بنكي',
      'hawala': 'حوالة',
      'cash': 'نقداً'
    };
    return names[method] || method;
  };

  const getDriverStatus = (driver) => {
    if (driver.resigned) {
      return { label: 'مستقيل', color: 'bg-gray-100 text-gray-700', icon: LogOut };
    }
    if (driver.is_suspended) {
      return { label: 'موقوف', color: 'bg-red-100 text-red-700', icon: Ban };
    }
    if (!driver.is_approved) {
      return { label: 'غير معتمد', color: 'bg-yellow-100 text-yellow-700', icon: Clock };
    }
    if (driver.security_deposit?.status !== 'complete') {
      return { label: 'تأمين ناقص', color: 'bg-orange-100 text-orange-700', icon: Shield };
    }
    return { label: 'نشط', color: 'bg-green-100 text-green-700', icon: UserCheck };
  };

  const filteredDrivers = drivers.filter(d => {
    if (!searchQuery) return true;
    const name = (d.full_name || d.name || '').toLowerCase();
    const phone = (d.phone || '').toLowerCase();
    return name.includes(searchQuery.toLowerCase()) || phone.includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-amber-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">إدارة موظفي التوصيل</h2>
            <p className="text-sm text-gray-500">إدارة الحسابات والتأمينات والاستقالات</p>
          </div>
        </div>
        <button 
          onClick={fetchData}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex gap-2 border-b pb-2 overflow-x-auto">
        {[
          { id: 'drivers', label: 'جميع السائقين', icon: Users, count: drivers.length },
          { id: 'deposits', label: 'طلبات الإيداع', icon: CreditCard, count: pendingDeposits.length },
          { id: 'resignations', label: 'طلبات الاستقالة', icon: LogOut, count: pendingResignations.length },
          { id: 'settings', label: 'الإعدادات', icon: Settings }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap ${
              activeSubTab === tab.id 
                ? 'bg-amber-100 text-amber-700' 
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                tab.id === 'drivers' ? 'bg-gray-200 text-gray-700' : 'bg-red-500 text-white'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* All Drivers Tab */}
      {activeSubTab === 'drivers' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="بحث بالاسم أو رقم الهاتف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-3 pr-10 border rounded-lg"
            />
            <Users className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>

          {/* Drivers List */}
          {filteredDrivers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا يوجد سائقين</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDrivers.map((driver) => {
                const status = getDriverStatus(driver);
                const StatusIcon = status.icon;
                
                return (
                  <div key={driver.id} className="bg-white border rounded-xl p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      {/* Driver Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-gray-900 truncate">
                            {driver.full_name || driver.name || 'بدون اسم'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${status.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {driver.phone}
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-yellow-500" />
                            {driver.behavior_points || 100} نقطة
                          </span>
                          <span className="flex items-center gap-1">
                            <Package className="w-4 h-4" />
                            {driver.total_deliveries || 0} توصيلة
                          </span>
                        </div>
                        
                        {/* Security Deposit Info */}
                        <div className="mt-2 flex items-center gap-2 text-sm">
                          <Shield className="w-4 h-4 text-amber-500" />
                          <span>
                            التأمين: {driver.security_deposit?.current_amount?.toLocaleString() || 0} / 
                            {driver.security_deposit?.required_amount?.toLocaleString() || settings.required_amount} ل.س
                          </span>
                        </div>
                        
                        {driver.is_suspended && driver.suspension_reason && (
                          <p className="mt-2 text-sm text-red-600">
                            سبب الإيقاف: {driver.suspension_reason}
                          </p>
                        )}
                      </div>
                      
                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        {driver.is_suspended ? (
                          <button
                            onClick={() => handleActivateDriver(driver.id)}
                            disabled={actionLoading === driver.id}
                            className="px-3 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm flex items-center gap-1 disabled:opacity-50"
                          >
                            <UserCheck className="w-4 h-4" />
                            تفعيل
                          </button>
                        ) : !driver.resigned && (
                          <button
                            onClick={() => setSuspendModal(driver)}
                            disabled={actionLoading === driver.id}
                            className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm flex items-center gap-1 disabled:opacity-50"
                          >
                            <UserX className="w-4 h-4" />
                            إيقاف
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteModal(driver)}
                          disabled={actionLoading === driver.id}
                          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm flex items-center gap-1 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          حذف
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Pending Deposits */}
      {activeSubTab === 'deposits' && (
        <div className="space-y-4">
          {pendingDeposits.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد طلبات إيداع معلقة</p>
            </div>
          ) : (
            pendingDeposits.map((req) => (
              <div key={req.id} className="bg-white border rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-gray-900">{req.driver_name}</span>
                      <span className="text-sm text-gray-500">{req.driver_phone}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1 text-gray-600">
                        {getPaymentIcon(req.payment_method)}
                        {getPaymentName(req.payment_method)}
                      </span>
                      <span className="font-bold text-green-600">
                        {req.amount?.toLocaleString()} ل.س
                      </span>
                    </div>
                    {req.payment_reference && (
                      <p className="text-xs text-gray-500 mt-1">
                        رقم المرجع: {req.payment_reference}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(req.created_at).toLocaleString('ar-SY')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveDeposit(req.id)}
                      className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                      title="قبول"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleRejectDeposit(req.id)}
                      className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                      title="رفض"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Pending Resignations */}
      {activeSubTab === 'resignations' && (
        <div className="space-y-4">
          {pendingResignations.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <LogOut className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد طلبات استقالة معلقة</p>
            </div>
          ) : (
            pendingResignations.map((req) => (
              <div key={req.id} className="bg-white border rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-bold text-gray-900">{req.driver_name}</span>
                      <span className="text-sm text-gray-500">{req.driver_phone}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm mb-2">
                      <span className="text-gray-600">
                        نقاط السلوك: <strong>{req.behavior_points}</strong>
                      </span>
                      <span className="font-bold text-blue-600">
                        مبلغ الاسترداد: {req.refund_amount?.toLocaleString()} ل.س
                      </span>
                    </div>
                    {req.reason && (
                      <p className="text-sm text-gray-600">
                        السبب: {req.reason}
                      </p>
                    )}
                    {req.shamcash_phone && (
                      <p className="text-xs text-gray-500 mt-1">
                        رقم Sham Cash للاسترداد: {req.shamcash_phone}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(req.created_at).toLocaleString('ar-SY')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveResignation(req.id)}
                      className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-sm font-medium"
                    >
                      الموافقة والاسترداد
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Settings */}
      {activeSubTab === 'settings' && (
        <div className="bg-white rounded-xl border p-6 max-w-xl">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            إعدادات نظام التأمين
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                مبلغ التأمين المطلوب (ل.س)
              </label>
              <input
                type="number"
                value={settings.required_amount}
                onChange={(e) => setSettings({ ...settings, required_amount: e.target.value === '' ? '' : parseInt(e.target.value) || 0 })}
                className="w-full p-3 border rounded-lg"
                min={0}
              />
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">تفعيل نظام التأمين</p>
                <p className="text-xs text-gray-500">عند التعطيل، لن يُطلب من السائقين دفع تأمين</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.is_enabled}
                  onChange={(e) => setSettings({ ...settings, is_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">الخصم التلقائي من الأرباح</p>
                <p className="text-xs text-gray-500">خصم تلقائي لتعويض التأمين عند نقصه</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={settings.auto_deduct_from_earnings}
                  onChange={(e) => setSettings({ ...settings, auto_deduct_from_earnings: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الحد الأدنى لنقاط السلوك للاسترداد
              </label>
              <input
                type="number"
                value={settings.min_behavior_points_for_refund}
                onChange={(e) => setSettings({ ...settings, min_behavior_points_for_refund: e.target.value === '' ? '' : parseInt(e.target.value) || 0 })}
                className="w-full p-3 border rounded-lg"
                min={0}
                max={100}
              />
              <p className="text-xs text-gray-500 mt-1">
                إذا كانت نقاط السلوك أقل من هذا الحد، لن يُسترد التأمين عند الاستقالة
              </p>
            </div>
            
            <button
              onClick={handleSaveSettings}
              disabled={saving}
              className="w-full py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </button>
          </div>
        </div>
      )}

      {/* Suspend Modal */}
      {suspendModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <UserX className="w-6 h-6 text-red-600" />
              إيقاف السائق
            </h3>
            <p className="text-gray-600 mb-4">
              هل أنت متأكد من إيقاف <strong>{suspendModal.full_name || suspendModal.name}</strong>؟
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                سبب الإيقاف (اختياري)
              </label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                className="w-full p-3 border rounded-lg"
                rows={3}
                placeholder="أدخل سبب الإيقاف..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSuspendDriver}
                disabled={actionLoading === suspendModal.id}
                className="flex-1 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === suspendModal.id ? 'جاري الإيقاف...' : 'تأكيد الإيقاف'}
              </button>
              <button
                onClick={() => { setSuspendModal(null); setSuspendReason(''); }}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-red-600 mb-4 flex items-center gap-2">
              <Trash2 className="w-6 h-6" />
              حذف السائق نهائياً
            </h3>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700 text-sm">
                ⚠️ تحذير: هذا الإجراء لا يمكن التراجع عنه!
              </p>
              <p className="text-red-600 text-sm mt-1">
                سيتم حذف جميع بيانات السائق <strong>{deleteModal.full_name || deleteModal.name}</strong> نهائياً.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteDriver}
                disabled={actionLoading === deleteModal.id}
                className="flex-1 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === deleteModal.id ? 'جاري الحذف...' : 'حذف نهائياً'}
              </button>
              <button
                onClick={() => setDeleteModal(null)}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
