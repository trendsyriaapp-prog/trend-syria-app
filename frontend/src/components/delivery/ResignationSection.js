// /app/frontend/src/components/delivery/ResignationSection.js
// قسم طلب الاستقالة للسائق

import React, { useState, useEffect } from 'react';
import logger from '../../lib/logger';
import { LogOut, Shield, AlertTriangle, Phone, CheckCircle, Clock, X } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

export default function ResignationSection({ theme }) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [securityStatus, setSecurityStatus] = useState(null);
  const [existingRequest, setExistingRequest] = useState(null);
  const [formData, setFormData] = useState({
    reason: '',
    shamcash_phone: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // جلب حالة التأمين
      const securityRes = await fetch(`${API}/api/driver/security/status`, { credentials: 'include' });
      if (securityRes.ok) {
        setSecurityStatus(await securityRes.json());
      }

      // جلب طلب الاستقالة إن وجد
      const requestRes = await fetch(`${API}/api/driver/security/my-resignation`, { credentials: 'include' });
      if (requestRes.ok) {
        const data = await requestRes.json();
        if (data && data.status) {
          setExistingRequest(data);
        }
      }
    } catch (err) {
      logger.error('Error fetching data:', err);
    }
  };

  const handleSubmitResignation = async () => {
    if (!formData.shamcash_phone) {
      alert('الرجاء إدخال رقم Sham Cash لاسترداد التأمين');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/driver/security/resign`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: formData.reason,
          shamcash_phone: formData.shamcash_phone
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert('تم إرسال طلب الاستقالة بنجاح. سيتم مراجعته من الإدارة.');
        setShowModal(false);
        fetchData();
      } else {
        alert(data.detail || 'حدث خطأ');
      }
    } catch (err) {
      alert('حدث خطأ في الاتصال');
    }
    setLoading(false);
  };

  const handleCancelResignation = async () => {
    if (!confirm('هل أنت متأكد من إلغاء طلب الاستقالة؟')) return;

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/driver/security/resign/cancel`, {
        method: 'POST'
      });
      if (res.ok) {
        alert('تم إلغاء طلب الاستقالة');
        setExistingRequest(null);
        fetchData();
      }
    } catch (err) {
      alert('حدث خطأ');
    }
    setLoading(false);
  };

  const isDark = theme === 'dark';

  // إذا كان هناك طلب استقالة معلق
  if (existingRequest && existingRequest.status === 'pending') {
    return (
      <div className={`rounded-xl p-4 mt-4 ${
        isDark ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-yellow-50 border border-yellow-200'
      }`}>
        <div className="flex items-center gap-3 mb-3">
          <Clock className={`w-6 h-6 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
          <div>
            <h3 className={`font-bold ${isDark ? 'text-yellow-300' : 'text-yellow-800'}`}>
              طلب استقالة قيد المراجعة
            </h3>
            <p className={`text-sm ${isDark ? 'text-yellow-400/70' : 'text-yellow-600'}`}>
              تم إرسال الطلب بتاريخ {new Date(existingRequest.created_at).toLocaleDateString('ar-SY')}
            </p>
          </div>
        </div>
        
        <div className={`text-sm mb-3 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
          <p>مبلغ الاسترداد المتوقع: <strong>{existingRequest.refund_amount?.toLocaleString()} ل.س</strong></p>
          <p>رقم Sham Cash: {existingRequest.shamcash_phone}</p>
        </div>

        <button
          onClick={handleCancelResignation}
          disabled={loading}
          className={`w-full py-2 rounded-lg font-medium transition-all ${
            isDark 
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          } disabled:opacity-50`}
        >
          {loading ? 'جاري الإلغاء...' : 'إلغاء طلب الاستقالة'}
        </button>
      </div>
    );
  }

  return (
    <>
      {/* زر الاستقالة */}
      <div className="mt-4">
        <button
          onClick={() => setShowModal(true)}
          className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
            isDark
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <LogOut size={18} />
          طلب استقالة
        </button>
      </div>

      {/* Modal الاستقالة */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className={`w-full max-w-md rounded-2xl overflow-hidden ${
            isDark ? 'bg-gray-800' : 'bg-white'
          }`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <LogOut size={24} />
                  <h3 className="font-bold text-lg">طلب استقالة</h3>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* معلومات التأمين */}
              {securityStatus && (
                <div className={`rounded-lg p-3 ${
                  isDark ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className={`w-5 h-5 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                    <span className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                      رصيد التأمين
                    </span>
                  </div>
                  <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {securityStatus.current_amount?.toLocaleString()} ل.س
                  </p>
                  <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    سيتم استرداد هذا المبلغ بعد الموافقة على الاستقالة
                  </p>
                </div>
              )}

              {/* تحذير */}
              <div className={`rounded-lg p-3 flex items-start gap-2 ${
                isDark ? 'bg-red-500/10 border border-red-500/30' : 'bg-red-50 border border-red-200'
              }`}>
                <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                  isDark ? 'text-red-400' : 'text-red-600'
                }`} />
                <div className={`text-sm ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                  <p className="font-medium">تحذير:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>بعد الموافقة على الاستقالة لن تتمكن من استخدام التطبيق</li>
                    <li>يجب إكمال جميع الطلبات النشطة قبل تقديم الاستقالة</li>
                    <li>إذا كانت نقاط السلوك منخفضة قد لا يُسترد التأمين كاملاً</li>
                  </ul>
                </div>
              </div>

              {/* سبب الاستقالة */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  سبب الاستقالة (اختياري)
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className={`w-full p-3 rounded-lg ${
                    isDark 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  } border`}
                  rows={2}
                  placeholder="أخبرنا لماذا تريد الاستقالة..."
                />
              </div>

              {/* رقم Sham Cash */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  رقم Sham Cash للاسترداد *
                </label>
                <div className="relative">
                  <Phone className={`absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                    isDark ? 'text-gray-500' : 'text-gray-400'
                  }`} />
                  <input
                    type="tel"
                    value={formData.shamcash_phone}
                    onChange={(e) => setFormData({ ...formData, shamcash_phone: e.target.value })}
                    className={`w-full p-3 pr-10 rounded-lg ${
                      isDark 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } border`}
                    placeholder="09XXXXXXXX"
                    required
                  />
                </div>
                <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  سيتم تحويل التأمين لهذا الرقم
                </p>
              </div>

              {/* أزرار */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSubmitResignation}
                  disabled={loading || !formData.shamcash_phone}
                  className="flex-1 py-3 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'جاري الإرسال...' : 'تأكيد طلب الاستقالة'}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className={`px-6 py-3 rounded-xl font-bold transition-colors ${
                    isDark 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
