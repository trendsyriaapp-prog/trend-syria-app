// /app/frontend/src/pages/WalletPage.js
// صفحة المحفظة للبائعين وموظفي التوصيل

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Wallet, ArrowDownCircle, ArrowUpCircle, Clock, 
  CheckCircle, XCircle, ChevronRight, Banknote
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { useSettings } from '../context/SettingsContext';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const WalletPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { settings } = useSettings();
  
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [minWithdrawal, setMinWithdrawal] = useState(50000);
  
  // Withdrawal form
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [shamcashPhone, setShamcashPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    if (user && (user.user_type === 'seller' || user.user_type === 'food_seller' || user.user_type === 'delivery')) {
      fetchWalletData();
      fetchWithdrawalLimits();
    }
  }, [user]);
  
  const fetchWithdrawalLimits = async () => {
    try {
      const res = await axios.get(`${API}/api/settings/wallet`);
      if (user.user_type === 'seller' || user.user_type === 'food_seller') {
        setMinWithdrawal(res.data.seller_min_withdrawal || 50000);
      } else {
        setMinWithdrawal(res.data.delivery_min_withdrawal || 25000);
      }
    } catch (error) {
      // استخدام القيم الافتراضية
      setMinWithdrawal((user.user_type === 'seller' || user.user_type === 'food_seller') ? 50000 : 25000);
    }
  };
  
  const fetchWalletData = async () => {
    try {
      const [walletRes, transactionsRes, withdrawalsRes, heldRes] = await Promise.all([
        axios.get(`${API}/api/wallet/balance`),
        axios.get(`${API}/api/wallet/transactions`),
        axios.get(`${API}/api/wallet/withdrawals`),
        axios.get(`${API}/api/wallet/held-earnings`).catch(() => ({ data: { held_earnings: [], total_held: 0 } }))
      ]);
      setWallet({
        ...walletRes.data,
        held_balance: heldRes.data.total_held || 0,
        held_earnings: heldRes.data.held_earnings || []
      });
      setTransactions(transactionsRes.data);
      setWithdrawals(withdrawalsRes.data);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleWithdraw = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      await axios.post(`${API}/api/wallet/withdraw`, null, {
        params: {
          amount: parseInt(withdrawAmount),
          shamcash_phone: shamcashPhone
        }
      });
      
      toast({
        title: "تم إرسال الطلب",
        description: "سيتم مراجعة طلب السحب خلال 24 ساعة"
      });
      
      setShowWithdrawForm(false);
      setWithdrawAmount('');
      setShamcashPhone('');
      fetchWalletData();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل إرسال الطلب",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  // Cancel withdrawal modal
  const [cancelModal, setCancelModal] = useState({ isOpen: false, withdrawalId: null });
  
  const cancelWithdrawal = async () => {
    if (!cancelModal.withdrawalId) return;
    
    try {
      await axios.delete(`${API}/api/wallet/withdrawals/${cancelModal.withdrawalId}`);
      toast({ title: "تم الإلغاء", description: "تم إلغاء طلب السحب" });
      setCancelModal({ isOpen: false, withdrawalId: null });
      fetchWalletData();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل الإلغاء",
        variant: "destructive"
      });
    }
  };
  
  if (!user || (user.user_type !== 'seller' && user.user_type !== 'food_seller' && user.user_type !== 'delivery')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">هذه الصفحة للبائعين وموظفي التوصيل فقط</p>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pb-24 bg-gray-50" data-testid="wallet-page">
      <div className="max-w-lg mx-auto px-4 py-6">
        
        {/* Header */}
        <h1 className="text-xl font-bold text-gray-900 mb-6">المحفظة</h1>
        
        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-[#FF6B00] to-[#FF8533] rounded-2xl p-6 text-white mb-6 shadow-lg"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-white/80 text-sm">الرصيد المتاح</p>
              <p className="text-3xl font-bold">{formatPrice(wallet?.available_balance || 0)}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/20">
            <div>
              <p className="text-white/60 text-xs">رصيد معلق للسحب</p>
              <p className="font-bold">{formatPrice(wallet?.pending_balance || 0)}</p>
            </div>
            <div>
              <p className="text-white/60 text-xs">⏳ قيد التأكيد</p>
              <p className="font-bold text-yellow-200">{formatPrice(wallet?.held_balance || 0)}</p>
            </div>
            <div>
              <p className="text-white/60 text-xs">إجمالي الأرباح</p>
              <p className="font-bold">{formatPrice(wallet?.total_earned || 0)}</p>
            </div>
          </div>
        </motion.div>
        
        {/* Held Earnings Notice */}
        {(wallet?.held_balance || 0) > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 flex items-start gap-3">
            <Clock size={20} className="text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-bold text-yellow-800 text-sm">أرباح قيد التأكيد</p>
              <p className="text-xs text-yellow-600">
                لديك {formatPrice(wallet?.held_balance || 0)} معلقة حتى انتهاء فترة الإرجاع
              </p>
            </div>
          </div>
        )}
        
        {/* Withdraw Button */}
        <button
          onClick={() => setShowWithdrawForm(true)}
          className="w-full bg-white border-2 border-[#FF6B00] text-[#FF6B00] font-bold py-3 rounded-xl mb-6 flex items-center justify-center gap-2 hover:bg-[#FF6B00] hover:text-white transition-colors"
          data-testid="withdraw-btn"
        >
          <Banknote size={20} />
          طلب سحب
        </button>
        
        {/* Withdraw Form Modal */}
        {showWithdrawForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowWithdrawForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-2xl p-6 w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4">طلب سحب</h2>
              
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">المبلغ (ل.س)</label>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="مثال: 50000"
                    className="w-full p-3 border border-gray-300 rounded-xl text-lg"
                    required
                    min={minWithdrawal}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    الحد الأدنى: {formatPrice(minWithdrawal)}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">رقم شام كاش</label>
                  <input
                    type="tel"
                    value={shamcashPhone}
                    onChange={(e) => setShamcashPhone(e.target.value)}
                    placeholder="09XXXXXXXX"
                    className="w-full p-3 border border-gray-300 rounded-xl"
                    required
                  />
                </div>
                
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-[#FF6B00] text-white font-bold py-3 rounded-xl disabled:opacity-50"
                  >
                    {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowWithdrawForm(false)}
                    className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
        
        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
              activeTab === 'overview' 
                ? 'bg-[#FF6B00] text-white' 
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            المعاملات
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
              activeTab === 'withdrawals' 
                ? 'bg-[#FF6B00] text-white' 
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            طلبات السحب
          </button>
        </div>
        
        {/* Transactions List */}
        {activeTab === 'overview' && (
          <div className="space-y-2">
            {transactions.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                <Wallet size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">لا توجد معاملات بعد</p>
              </div>
            ) : (
              transactions.map((tx) => (
                <div 
                  key={tx.id} 
                  className="bg-white rounded-xl p-4 border border-gray-200 flex items-center gap-3"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    tx.amount > 0 ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {tx.amount > 0 ? (
                      <ArrowDownCircle size={20} className="text-green-600" />
                    ) : (
                      <ArrowUpCircle size={20} className="text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">{tx.description}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(tx.created_at).toLocaleDateString('ar-SY')}
                    </p>
                  </div>
                  <p className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.amount > 0 ? '+' : ''}{formatPrice(tx.amount)}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
        
        {/* Withdrawals List */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-2">
            {withdrawals.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                <Banknote size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">لا توجد طلبات سحب</p>
              </div>
            ) : (
              withdrawals.map((w) => (
                <div 
                  key={w.id} 
                  className="bg-white rounded-xl p-4 border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-gray-900">{formatPrice(w.amount)}</p>
                    <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                      w.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                      w.status === 'approved' ? 'bg-green-100 text-green-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {w.status === 'pending' && <Clock size={12} />}
                      {w.status === 'approved' && <CheckCircle size={12} />}
                      {w.status === 'rejected' && <XCircle size={12} />}
                      {w.status === 'pending' ? 'قيد المراجعة' :
                       w.status === 'approved' ? 'تم التحويل' : 
                       w.status === 'cancelled' ? 'ملغي' : 'مرفوض'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">إلى: {w.shamcash_phone}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(w.created_at).toLocaleDateString('ar-SY')}
                  </p>
                  
                  {w.status === 'pending' && (
                    <button
                      onClick={() => setCancelModal({ isOpen: true, withdrawalId: w.id })}
                      className="mt-2 text-red-500 text-xs font-medium"
                    >
                      إلغاء الطلب
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Cancel Withdrawal Modal */}
        {cancelModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-sm p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle size={20} className="text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold">إلغاء طلب السحب</h3>
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                هل تريد إلغاء طلب السحب؟ سيتم إرجاع المبلغ لرصيدك.
              </p>

              <div className="flex gap-2">
                <button
                  onClick={() => setCancelModal({ isOpen: false, withdrawalId: null })}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  رجوع
                </button>
                <button
                  onClick={cancelWithdrawal}
                  className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm flex items-center justify-center gap-2"
                >
                  <XCircle size={16} />
                  إلغاء الطلب
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletPage;
