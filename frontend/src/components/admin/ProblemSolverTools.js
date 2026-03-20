// /app/frontend/src/components/admin/ProblemSolverTools.js
// أدوات حل المشاكل للمدير

import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  DollarSign, Trash2, RefreshCw, Truck, Search,
  User, AlertCircle, CheckCircle, X, Star
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const ProblemSolverTools = () => {
  const [activeModal, setActiveModal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [searchUser, setSearchUser] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [message, setMessage] = useState(null);
  
  // Form states
  const [compensationForm, setCompensationForm] = useState({ user_id: '', amount: '', reason: '', order_id: '' });
  const [refundForm, setRefundForm] = useState({ order_id: '', amount: '', reason: '' });
  const [reassignForm, setReassignForm] = useState({ order_id: '', new_driver_id: '' });
  const [deleteReviewForm, setDeleteReviewForm] = useState({ review_id: '', reason: '' });

  const token = localStorage.getItem('token');

  const fetchAvailableDrivers = async () => {
    try {
      const res = await axios.get(`${API}/api/admin/available-drivers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableDrivers(res.data.drivers || []);
    } catch (err) {
      console.error('Error fetching drivers:', err);
    }
  };

  const searchUserByPhone = async () => {
    if (!searchUser.trim()) return;
    try {
      const res = await axios.get(`${API}/api/admin/users?search=${searchUser}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const users = res.data.users || [];
      if (users.length > 0) {
        setFoundUser(users[0]);
        setCompensationForm({ ...compensationForm, user_id: users[0].id });
      } else {
        setMessage({ type: 'error', text: 'لم يتم العثور على المستخدم' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'خطأ في البحث' });
    }
  };

  const handleCompensate = async () => {
    if (!compensationForm.user_id || !compensationForm.amount || !compensationForm.reason) {
      setMessage({ type: 'error', text: 'يرجى ملء جميع الحقول المطلوبة' });
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/admin/compensate-user`, {
        user_id: compensationForm.user_id,
        amount: parseFloat(compensationForm.amount),
        reason: compensationForm.reason,
        order_id: compensationForm.order_id || null
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setMessage({ type: 'success', text: res.data.message });
      setCompensationForm({ user_id: '', amount: '', reason: '', order_id: '' });
      setFoundUser(null);
      setTimeout(() => setActiveModal(null), 2000);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'حدث خطأ' });
    } finally {
      setLoading(false);
    }
  };

  const handlePartialRefund = async () => {
    if (!refundForm.order_id || !refundForm.amount || !refundForm.reason) {
      setMessage({ type: 'error', text: 'يرجى ملء جميع الحقول' });
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/admin/orders/${refundForm.order_id}/partial-refund`, {
        order_id: refundForm.order_id,
        amount: parseFloat(refundForm.amount),
        reason: refundForm.reason
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setMessage({ type: 'success', text: res.data.message });
      setRefundForm({ order_id: '', amount: '', reason: '' });
      setTimeout(() => setActiveModal(null), 2000);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'حدث خطأ' });
    } finally {
      setLoading(false);
    }
  };

  const handleReassignDriver = async () => {
    if (!reassignForm.order_id) {
      setMessage({ type: 'error', text: 'يرجى إدخال رقم الطلب' });
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post(`${API}/api/admin/orders/${reassignForm.order_id}/reassign-driver`, {
        order_id: reassignForm.order_id,
        new_driver_id: reassignForm.new_driver_id || null
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      setMessage({ type: 'success', text: res.data.message });
      setReassignForm({ order_id: '', new_driver_id: '' });
      setTimeout(() => setActiveModal(null), 2000);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'حدث خطأ' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!deleteReviewForm.review_id) {
      setMessage({ type: 'error', text: 'يرجى إدخال معرف التقييم' });
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.delete(
        `${API}/api/admin/reviews/${deleteReviewForm.review_id}?reason=${encodeURIComponent(deleteReviewForm.reason || 'مخالفة سياسة الاستخدام')}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setMessage({ type: 'success', text: res.data.message });
      setDeleteReviewForm({ review_id: '', reason: '' });
      setTimeout(() => setActiveModal(null), 2000);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'حدث خطأ' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeModal === 'reassign') {
      fetchAvailableDrivers();
    }
    setMessage(null);
  }, [activeModal]);

  const tools = [
    {
      id: 'compensate',
      title: 'تعويض مستخدم',
      description: 'إضافة رصيد تعويضي لعميل/سائق/بائع',
      icon: DollarSign,
      color: 'from-green-500 to-emerald-600'
    },
    {
      id: 'refund',
      title: 'استرداد جزئي',
      description: 'إرجاع جزء من مبلغ الطلب',
      icon: RefreshCw,
      color: 'from-blue-500 to-indigo-600'
    },
    {
      id: 'reassign',
      title: 'تغيير السائق',
      description: 'تعيين سائق بديل للطلب',
      icon: Truck,
      color: 'from-orange-500 to-red-600'
    },
    {
      id: 'delete-review',
      title: 'حذف تقييم',
      description: 'إزالة تقييم مسيء أو مخالف',
      icon: Trash2,
      color: 'from-red-500 to-pink-600'
    }
  ];

  return (
    <div className="space-y-3" data-testid="problem-solver-tools">
      <h2 className="text-sm font-bold text-gray-900">🛠️ أدوات حل المشاكل</h2>
      
      {/* الأدوات */}
      <div className="grid grid-cols-2 gap-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              onClick={() => setActiveModal(tool.id)}
              className={`bg-gradient-to-r ${tool.color} rounded-lg p-3 text-white text-right hover:opacity-90 transition-opacity`}
              data-testid={`tool-${tool.id}`}
            >
              <Icon size={24} className="mb-2" />
              <h3 className="font-bold text-sm">{tool.title}</h3>
              <p className="text-xs opacity-80">{tool.description}</p>
            </button>
          );
        })}
      </div>

      {/* Modal */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
              <h3 className="font-bold text-gray-900">
                {tools.find(t => t.id === activeModal)?.title}
              </h3>
              <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            {/* Message */}
            {message && (
              <div className={`mx-4 mt-4 p-3 rounded-lg flex items-center gap-2 ${
                message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {message.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                <span className="text-sm">{message.text}</span>
              </div>
            )}

            {/* Content */}
            <div className="p-4 space-y-3">
              {/* تعويض مستخدم */}
              {activeModal === 'compensate' && (
                <>
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">البحث عن المستخدم</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={searchUser}
                        onChange={(e) => setSearchUser(e.target.value)}
                        placeholder="رقم الهاتف أو الاسم"
                        className="flex-1 border rounded-lg px-3 py-2 text-sm"
                      />
                      <button
                        onClick={searchUserByPhone}
                        className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                      >
                        <Search size={18} />
                      </button>
                    </div>
                  </div>
                  
                  {foundUser && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                      <User size={20} className="text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900">{foundUser.full_name || foundUser.name}</p>
                        <p className="text-xs text-gray-500">{foundUser.phone} - {foundUser.user_type}</p>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">المبلغ (ل.س) *</label>
                    <input
                      type="number"
                      value={compensationForm.amount}
                      onChange={(e) => setCompensationForm({...compensationForm, amount: e.target.value})}
                      placeholder="مثال: 50000"
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">السبب *</label>
                    <textarea
                      value={compensationForm.reason}
                      onChange={(e) => setCompensationForm({...compensationForm, reason: e.target.value})}
                      placeholder="سبب التعويض..."
                      rows={2}
                      className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">رقم الطلب (اختياري)</label>
                    <input
                      type="text"
                      value={compensationForm.order_id}
                      onChange={(e) => setCompensationForm({...compensationForm, order_id: e.target.value})}
                      placeholder="معرف الطلب المرتبط"
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  
                  <button
                    onClick={handleCompensate}
                    disabled={loading || !foundUser}
                    className="w-full py-3 bg-green-500 text-white rounded-lg font-medium disabled:opacity-50"
                  >
                    {loading ? 'جاري التنفيذ...' : 'إضافة التعويض'}
                  </button>
                </>
              )}

              {/* استرداد جزئي */}
              {activeModal === 'refund' && (
                <>
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">معرف الطلب *</label>
                    <input
                      type="text"
                      value={refundForm.order_id}
                      onChange={(e) => setRefundForm({...refundForm, order_id: e.target.value})}
                      placeholder="معرف الطلب"
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">المبلغ المسترد (ل.س) *</label>
                    <input
                      type="number"
                      value={refundForm.amount}
                      onChange={(e) => setRefundForm({...refundForm, amount: e.target.value})}
                      placeholder="مثال: 25000"
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">السبب *</label>
                    <textarea
                      value={refundForm.reason}
                      onChange={(e) => setRefundForm({...refundForm, reason: e.target.value})}
                      placeholder="سبب الاسترداد..."
                      rows={2}
                      className="w-full border rounded-lg px-3 py-2 text-sm resize-none"
                    />
                  </div>
                  
                  <button
                    onClick={handlePartialRefund}
                    disabled={loading}
                    className="w-full py-3 bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50"
                  >
                    {loading ? 'جاري التنفيذ...' : 'تنفيذ الاسترداد'}
                  </button>
                </>
              )}

              {/* تغيير السائق */}
              {activeModal === 'reassign' && (
                <>
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">معرف الطلب *</label>
                    <input
                      type="text"
                      value={reassignForm.order_id}
                      onChange={(e) => setReassignForm({...reassignForm, order_id: e.target.value})}
                      placeholder="معرف الطلب"
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">اختر السائق (اتركه فارغاً للتعيين التلقائي)</label>
                    <select
                      value={reassignForm.new_driver_id}
                      onChange={(e) => setReassignForm({...reassignForm, new_driver_id: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="">تعيين تلقائي لسائق متاح</option>
                      {availableDrivers.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name} - {driver.is_available ? '🟢 متاح' : '🔴 مشغول'} - {driver.city || 'غير محدد'}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <button
                    onClick={handleReassignDriver}
                    disabled={loading}
                    className="w-full py-3 bg-orange-500 text-white rounded-lg font-medium disabled:opacity-50"
                  >
                    {loading ? 'جاري التنفيذ...' : 'تغيير السائق'}
                  </button>
                </>
              )}

              {/* حذف تقييم */}
              {activeModal === 'delete-review' && (
                <>
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-700">
                      ⚠️ سيتم حفظ نسخة من التقييم المحذوف للمراجعة
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">معرف التقييم *</label>
                    <input
                      type="text"
                      value={deleteReviewForm.review_id}
                      onChange={(e) => setDeleteReviewForm({...deleteReviewForm, review_id: e.target.value})}
                      placeholder="معرف التقييم"
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm text-gray-600 mb-1 block">سبب الحذف</label>
                    <select
                      value={deleteReviewForm.reason}
                      onChange={(e) => setDeleteReviewForm({...deleteReviewForm, reason: e.target.value})}
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="مخالفة سياسة الاستخدام">مخالفة سياسة الاستخدام</option>
                      <option value="محتوى مسيء">محتوى مسيء</option>
                      <option value="تقييم مزيف">تقييم مزيف</option>
                      <option value="طلب من صاحب التقييم">طلب من صاحب التقييم</option>
                      <option value="سبب آخر">سبب آخر</option>
                    </select>
                  </div>
                  
                  <button
                    onClick={handleDeleteReview}
                    disabled={loading}
                    className="w-full py-3 bg-red-500 text-white rounded-lg font-medium disabled:opacity-50"
                  >
                    {loading ? 'جاري الحذف...' : 'حذف التقييم'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProblemSolverTools;
