// /app/frontend/src/components/delivery/SecurityDepositCard.js
// بطاقة حالة تأمين موظف التوصيل

import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, CreditCard, Building, Banknote, Send, RefreshCw, Clock } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function SecurityDepositCard({ token, onDepositComplete }) {
  const [status, setStatus] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('shamcash');
  const [paymentReference, setPaymentReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myRequests, setMyRequests] = useState([]);

  useEffect(() => {
    fetchStatus();
    fetchMyRequests();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API}/api/driver/security/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (data.is_complete && onDepositComplete) {
          onDepositComplete();
        }
      }
    } catch (err) {
      console.error('Error fetching security status:', err);
    }
    
    try {
      const res = await fetch(`${API}/api/driver/security/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
    }
    
    setLoading(false);
  };

  const fetchMyRequests = async () => {
    try {
      const res = await fetch(`${API}/api/driver/security/deposit-requests`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setMyRequests(await res.json());
      }
    } catch (err) {
      console.error('Error fetching requests:', err);
    }
  };

  const handleSubmitDeposit = async (e) => {
    e.preventDefault();
    if (!depositAmount || depositAmount <= 0) return;
    
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/driver/security/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: parseInt(depositAmount),
          payment_method: paymentMethod,
          payment_reference: paymentReference || null
        })
      });
      
      const data = await res.json();
      if (res.ok) {
        alert('تم إرسال طلب الإيداع بنجاح! سيتم مراجعته من الإدارة.');
        setShowDepositForm(false);
        setDepositAmount('');
        setPaymentReference('');
        fetchStatus();
        fetchMyRequests();
      } else {
        alert(data.detail || 'حدث خطأ');
      }
    } catch (err) {
      alert('حدث خطأ في الاتصال');
    }
    setSubmitting(false);
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'shamcash': return <CreditCard className="w-5 h-5" />;
      case 'bank': return <Building className="w-5 h-5" />;
      case 'hawala': return <Send className="w-5 h-5" />;
      case 'cash': return <Banknote className="w-5 h-5" />;
      default: return <CreditCard className="w-5 h-5" />;
    }
  };

  const getStatusBadge = (reqStatus) => {
    switch (reqStatus) {
      case 'pending':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs flex items-center gap-1">
          <Clock className="w-3 h-3" /> قيد المراجعة
        </span>;
      case 'approved':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> تم القبول
        </span>;
      case 'rejected':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" /> مرفوض
        </span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2"></div>
      </div>
    );
  }

  if (!status || !status.is_enabled) return null;

  const progress = status.required_amount > 0 
    ? Math.min(100, (status.current_amount / status.required_amount) * 100) 
    : 0;

  return (
    <div className={`rounded-xl p-4 shadow-sm mb-4 ${
      status.is_complete 
        ? 'bg-green-50 border border-green-200' 
        : 'bg-amber-50 border border-amber-200'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className={`w-6 h-6 ${status.is_complete ? 'text-green-600' : 'text-amber-600'}`} />
          <h3 className="font-bold text-gray-800">تأمين العمل</h3>
        </div>
        <button 
          onClick={() => { fetchStatus(); fetchMyRequests(); }}
          className="p-2 hover:bg-white/50 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Status Message */}
      <p className={`text-sm mb-3 ${status.is_complete ? 'text-green-700' : 'text-amber-700'}`}>
        {status.message}
      </p>

      {/* Progress Bar */}
      {!status.is_complete && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>المدفوع: {status.current_amount.toLocaleString()} ل.س</span>
            <span>المطلوب: {status.required_amount.toLocaleString()} ل.س</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1 text-center">
            متبقي: {status.remaining_amount.toLocaleString()} ل.س
          </p>
        </div>
      )}

      {/* Deposit Button */}
      {!status.is_complete && !showDepositForm && (
        <button
          onClick={() => {
            setDepositAmount(status.remaining_amount.toString());
            setShowDepositForm(true);
          }}
          className="w-full py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors flex items-center justify-center gap-2"
        >
          <CreditCard className="w-5 h-5" />
          إيداع التأمين
        </button>
      )}

      {/* Deposit Form */}
      {showDepositForm && (
        <form onSubmit={handleSubmitDeposit} className="space-y-4 bg-white p-4 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              المبلغ (ل.س)
            </label>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              max={status.remaining_amount}
              min={1}
              className="w-full p-3 border rounded-lg text-lg"
              placeholder="أدخل المبلغ"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              الحد الأقصى: {status.remaining_amount.toLocaleString()} ل.س
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              طريقة الدفع
            </label>
            <div className="grid grid-cols-2 gap-2">
              {settings?.payment_methods?.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id)}
                  className={`p-3 border rounded-lg flex items-center gap-2 transition-all ${
                    paymentMethod === method.id 
                      ? 'border-amber-500 bg-amber-50 text-amber-700' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {getPaymentMethodIcon(method.id)}
                  <span className="text-sm">{method.name}</span>
                </button>
              ))}
            </div>
          </div>

          {paymentMethod !== 'cash' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                رقم الحوالة / المرجع (اختياري)
              </label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full p-3 border rounded-lg"
                placeholder="أدخل رقم العملية للتسهيل"
              />
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'جاري الإرسال...' : 'إرسال طلب الإيداع'}
            </button>
            <button
              type="button"
              onClick={() => setShowDepositForm(false)}
              className="px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* My Requests */}
      {myRequests.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">طلبات الإيداع</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {myRequests.slice(0, 5).map((req) => (
              <div 
                key={req.id} 
                className="flex items-center justify-between bg-white p-2 rounded-lg text-sm"
              >
                <div className="flex items-center gap-2">
                  {getPaymentMethodIcon(req.payment_method)}
                  <span>{req.amount.toLocaleString()} ل.س</span>
                </div>
                {getStatusBadge(req.status)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complete Badge */}
      {status.is_complete && (
        <div className="flex items-center justify-center gap-2 text-green-700 bg-green-100 p-3 rounded-lg">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">التأمين مكتمل - يمكنك استقبال الطلبات</span>
        </div>
      )}
    </div>
  );
}
