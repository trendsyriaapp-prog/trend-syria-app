// /app/frontend/src/components/admin/WithdrawalsTab.js
// إدارة طلبات السحب - لوحة المدير

import { useState, useEffect } from 'react';
import logger from '../../lib/logger';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Banknote, Clock, CheckCircle, XCircle, User, Phone, 
  ChevronDown, ChevronUp
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import RejectModal from './RejectModal';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const WithdrawalsTab = () => {
  const { toast } = useToast();
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [expandedId, setExpandedId] = useState(null);
  const [approveModal, setApproveModal] = useState({ isOpen: false, withdrawalId: null, amount: 0, userName: '' });
  const [approveProcessing, setApproveProcessing] = useState(false);
  const [rejectModal, setRejectModal] = useState({ isOpen: false, withdrawalId: null, userName: '' });
  const [rejectProcessing, setRejectProcessing] = useState(false);
  
  useEffect(() => {
    fetchWithdrawals();
  }, [filter]);
  
  const fetchWithdrawals = async () => {
    try {
      const res = await axios.get(`${API}/api/payment/admin/withdrawals`, {
        params: { status: filter || undefined }
      });
      setWithdrawals(res.data);
    } catch (error) {
      logger.error('Error fetching withdrawals:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleApproveConfirm = async () => {
    setApproveProcessing(true);
    try {
      await axios.post(`${API}/api/payment/admin/withdrawals/${approveModal.withdrawalId}/approve`);
      toast({ title: "تمت الموافقة", description: "تم تحويل المبلغ بنجاح" });
      setApproveModal({ isOpen: false, withdrawalId: null, amount: 0, userName: '' });
      fetchWithdrawals();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل العملية",
        variant: "destructive"
      });
    } finally {
      setApproveProcessing(false);
    }
  };
  
  const approveWithdrawal = (withdrawalId, amount, userName) => {
    setApproveModal({ isOpen: true, withdrawalId, amount, userName });
  };
  
  const rejectWithdrawal = (withdrawalId, userName) => {
    setRejectModal({ isOpen: true, withdrawalId, userName });
  };

  const handleRejectConfirm = async (reason) => {
    setRejectProcessing(true);
    try {
      await axios.post(`${API}/api/payment/admin/withdrawals/${rejectModal.withdrawalId}/reject`, null, {
        params: { reason }
      });
      toast({ title: "تم الرفض", description: "تم رفض طلب السحب" });
      fetchWithdrawals();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل العملية",
        variant: "destructive"
      });
    } finally {
      setRejectProcessing(false);
      setRejectModal({ isOpen: false, withdrawalId: null, userName: '' });
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }
  
  const pendingCount = withdrawals.filter(w => w.status === 'pending').length;
  const totalPending = withdrawals
    .filter(w => w.status === 'pending')
    .reduce((sum, w) => sum + w.amount, 0);
  
  return (
    <section data-testid="withdrawals-tab">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <p className="text-yellow-600 text-xs mb-1">طلبات معلقة</p>
          <p className="text-2xl font-bold text-yellow-700">{pendingCount}</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <p className="text-orange-600 text-xs mb-1">إجمالي المعلق</p>
          <p className="text-sm font-bold text-orange-700">{formatPrice(totalPending)}</p>
        </div>
      </div>
      
      {/* Filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {[
          { value: 'pending', label: 'معلق', color: 'yellow' },
          { value: 'approved', label: 'موافق عليه', color: 'green' },
          { value: 'rejected', label: 'مرفوض', color: 'red' },
          { value: '', label: 'الكل', color: 'gray' },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${
              filter === f.value
                ? `bg-${f.color}-500 text-white`
                : `bg-${f.color}-100 text-${f.color}-600`
            }`}
            style={{
              backgroundColor: filter === f.value 
                ? (f.color === 'yellow' ? '#EAB308' : f.color === 'green' ? '#22C55E' : f.color === 'red' ? '#EF4444' : '#6B7280')
                : undefined
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
      
      {/* Withdrawals List */}
      {withdrawals.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
          <Banknote size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">لا توجد طلبات سحب</p>
        </div>
      ) : (
        <div className="space-y-2">
          {withdrawals.map((w) => (
            <motion.div
              key={w.id}
              layout
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            >
              <div 
                className="p-4 cursor-pointer"
                onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      w.user_type === 'seller' ? 'bg-purple-100' : 'bg-cyan-100'
                    }`}>
                      <User size={18} className={
                        w.user_type === 'seller' ? 'text-purple-600' : 'text-cyan-600'
                      } />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{w.user_name}</p>
                      <p className="text-xs text-gray-500">
                        {w.user_type === 'seller' ? 'بائع' : 'موظف توصيل'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-left">
                    <p className="font-bold text-[#FF6B00]">{formatPrice(w.amount)}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      w.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                      w.status === 'approved' ? 'bg-green-100 text-green-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {w.status === 'pending' ? 'معلق' :
                       w.status === 'approved' ? 'تم التحويل' : 'مرفوض'}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-center mt-2">
                  {expandedId === w.id ? (
                    <ChevronUp size={16} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400" />
                  )}
                </div>
              </div>
              
              {expandedId === w.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="border-t border-gray-100 p-4 bg-gray-50"
                >
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Phone size={14} className="text-gray-400" />
                      <span className="text-gray-600">هاتف المستخدم:</span>
                      <span className="font-medium">{w.user_phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Banknote size={14} className="text-gray-400" />
                      <span className="text-gray-600">شام كاش:</span>
                      <span className="font-medium">{w.shamcash_phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock size={14} className="text-gray-400" />
                      <span className="text-gray-600">التاريخ:</span>
                      <span className="font-medium">
                        {new Date(w.created_at).toLocaleDateString('ar-SY', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                  
                  {w.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => approveWithdrawal(w.id, w.amount, w.user_name)}
                        className="flex-1 bg-green-500 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1"
                      >
                        <CheckCircle size={16} />
                        موافقة وتحويل
                      </button>
                      <button
                        onClick={() => rejectWithdrawal(w.id, w.user_name)}
                        className="flex-1 bg-red-500 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1"
                        data-testid={`reject-withdrawal-${w.id}`}
                      >
                        <XCircle size={16} />
                        رفض
                      </button>
                    </div>
                  )}
                  
                  {w.status === 'rejected' && w.rejection_reason && (
                    <p className="text-sm text-red-600 bg-red-50 p-2 rounded-lg">
                      سبب الرفض: {w.rejection_reason}
                    </p>
                  )}
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      <RejectModal
        isOpen={rejectModal.isOpen}
        onClose={() => setRejectModal({ isOpen: false, withdrawalId: null, userName: '' })}
        onConfirm={handleRejectConfirm}
        title="رفض طلب السحب"
        itemName={rejectModal.userName}
        processing={rejectProcessing}
      />

      {/* Approve Modal */}
      {approveModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <div>
                <h3 className="font-bold">تأكيد الموافقة</h3>
                <p className="text-xs text-gray-500">طلب سحب من {approveModal.userName}</p>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-4 mb-4 text-center">
              <p className="text-sm text-gray-600 mb-1">المبلغ المطلوب</p>
              <p className="text-2xl font-bold text-green-600">{formatPrice(approveModal.amount)}</p>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              هل أنت متأكد من الموافقة على هذا الطلب وتحويل المبلغ؟
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setApproveModal({ isOpen: false, withdrawalId: null, amount: 0, userName: '' })}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={handleApproveConfirm}
                disabled={approveProcessing}
                className="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {approveProcessing ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                    <Clock size={16} />
                  </motion.div>
                ) : (
                  <CheckCircle size={16} />
                )}
                تأكيد التحويل
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default WithdrawalsTab;
