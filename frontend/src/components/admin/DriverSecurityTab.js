// /app/frontend/src/components/admin/DriverSecurityTab.js
// تبويب إدارة تأمينات موظفي التوصيل

import React, { useState, useEffect } from 'react';
import { 
  Shield, Check, X, Clock, AlertTriangle, RefreshCw, 
  CreditCard, Building, Send, Banknote, Settings, Users,
  LogOut, DollarSign
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function DriverSecurityTab() {
  const [activeSubTab, setActiveSubTab] = useState('deposits');
  const [pendingDeposits, setPendingDeposits] = useState([]);
  const [pendingResignations, setPendingResignations] = useState([]);
  const [allDeposits, setAllDeposits] = useState([]);
  const [settings, setSettings] = useState({
    required_amount: 500,
    is_enabled: true,
    auto_deduct_from_earnings: true,
    min_behavior_points_for_refund: 50
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const [depositsRes, resignationsRes, allDepositsRes] = await Promise.all([
        fetch(`${API}/api/driver/security/admin/pending-deposits`, { headers }),
        fetch(`${API}/api/driver/security/admin/pending-resignations`, { headers }),
        fetch(`${API}/api/driver/security/admin/all-deposits`, { headers })
      ]);

      if (depositsRes.ok) setPendingDeposits(await depositsRes.json());
      if (resignationsRes.ok) setPendingResignations(await resignationsRes.json());
      if (allDepositsRes.ok) setAllDeposits(await allDepositsRes.json());
    } catch (err) {
      console.error('Error fetching data:', err);
    }
    setLoading(false);
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'complete':
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">مكتمل</span>;
      case 'partial':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">جزئي</span>;
      case 'pending':
        return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">معلق</span>;
      case 'refunded':
        return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">مُسترد</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-amber-600" />
          <div>
            <h2 className="text-xl font-bold text-gray-900">تأمينات موظفي التوصيل</h2>
            <p className="text-sm text-gray-500">إدارة إيداعات التأمين وطلبات الاستقالة</p>
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
      <div className="flex gap-2 border-b pb-2">
        {[
          { id: 'deposits', label: 'طلبات الإيداع', icon: CreditCard, count: pendingDeposits.length },
          { id: 'resignations', label: 'طلبات الاستقالة', icon: LogOut, count: pendingResignations.length },
          { id: 'all', label: 'جميع السائقين', icon: Users },
          { id: 'settings', label: 'الإعدادات', icon: Settings }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeSubTab === tab.id 
                ? 'bg-amber-100 text-amber-700' 
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
            {tab.count > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

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
                    {req.notes && (
                      <p className="text-xs text-gray-500 mt-1">
                        ملاحظات: {req.notes}
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
                    <p className="text-xs text-gray-500 mt-1">
                      رقم Sham Cash للاسترداد: {req.shamcash_phone}
                    </p>
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

      {/* All Deposits */}
      {activeSubTab === 'all' && (
        <div className="space-y-4">
          {allDeposits.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد بيانات تأمين</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">السائق</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">المدفوع</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">المطلوب</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {allDeposits.map((deposit) => (
                    <tr key={deposit.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{deposit.driver_name}</p>
                          <p className="text-xs text-gray-500">{deposit.driver_phone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-green-600">
                          {deposit.current_amount?.toLocaleString()} ل.س
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-600">
                          {deposit.required_amount?.toLocaleString()} ل.س
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(deposit.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
                onChange={(e) => setSettings({ ...settings, required_amount: parseInt(e.target.value) || 0 })}
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
                onChange={(e) => setSettings({ ...settings, min_behavior_points_for_refund: parseInt(e.target.value) || 0 })}
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
    </div>
  );
}
