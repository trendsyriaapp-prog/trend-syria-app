// /app/frontend/src/pages/BuyerWalletPage.js
// صفحة المحفظة للعملاء - شحن واستخدام الرصيد

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Wallet, Plus, Clock, CheckCircle, XCircle, 
  CreditCard, History, ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const BuyerWalletPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [topupHistory, setTopupHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Topup form
  const [showTopupForm, setShowTopupForm] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [shamcashPhone, setShamcashPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // الحدود
  const MIN_TOPUP = 10000;
  const MAX_TOPUP = 5000000;
  
  // مبالغ سريعة للشحن
  const quickAmounts = [25000, 50000, 100000, 250000, 500000];
  
  useEffect(() => {
    if (user && user.user_type === 'buyer') {
      fetchWalletData();
    }
  }, [user]);
  
  const fetchWalletData = async () => {
    try {
      const [walletRes, transactionsRes, topupRes] = await Promise.all([
        axios.get(`${API}/api/wallet/balance`),
        axios.get(`${API}/api/wallet/transactions`),
        axios.get(`${API}/api/wallet/topup/history`).catch(() => ({ data: [] }))
      ]);
      setWallet(walletRes.data);
      setTransactions(transactionsRes.data);
      setTopupHistory(topupRes.data);
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleTopup = async (e) => {
    e.preventDefault();
    const amount = parseInt(topupAmount);
    
    if (amount < MIN_TOPUP) {
      toast({
        title: "خطأ",
        description: `الحد الأدنى للشحن ${formatPrice(MIN_TOPUP)}`,
        variant: "destructive"
      });
      return;
    }
    
    if (amount > MAX_TOPUP) {
      toast({
        title: "خطأ",
        description: `الحد الأقصى للشحن ${formatPrice(MAX_TOPUP)}`,
        variant: "destructive"
      });
      return;
    }
    
    setSubmitting(true);
    
    try {
      const res = await axios.post(`${API}/api/wallet/topup/request`, {
        amount: amount,
        shamcash_phone: shamcashPhone
      });
      
      toast({
        title: "تم إرسال الطلب",
        description: `كود الطلب: ${res.data.topup_code}. سيتم إضافة الرصيد بعد التأكد من التحويل.`
      });
      
      setShowTopupForm(false);
      setTopupAmount('');
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
  
  const cancelTopup = async (topupId) => {
    if (!window.confirm('هل تريد إلغاء طلب الشحن؟')) return;
    
    try {
      await axios.delete(`${API}/api/wallet/topup/${topupId}`);
      toast({ title: "تم الإلغاء", description: "تم إلغاء طلب الشحن" });
      fetchWalletData();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل الإلغاء",
        variant: "destructive"
      });
    }
  };
  
  // إذا لم يكن المستخدم عميل، نعيد توجيهه
  if (!user || user.user_type !== 'buyer') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">هذه الصفحة للعملاء فقط</p>
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
    <div className="min-h-screen pb-24 bg-gray-50" data-testid="buyer-wallet-page">
      <div className="max-w-lg mx-auto px-4 py-6">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button 
            onClick={() => navigate(-1)}
            className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow"
          >
            <ArrowRight size={20} />
          </button>
          <h1 className="text-xl font-bold text-gray-900">محفظتي</h1>
        </div>
        
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-[#FF6B00] to-[#FF8533] rounded-2xl p-6 text-white mb-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Wallet size={24} />
            </div>
            <div>
              <p className="text-white/80 text-sm">رصيدك الحالي</p>
              <p className="text-3xl font-bold" data-testid="wallet-balance">
                {formatPrice(wallet?.balance || 0)}
              </p>
            </div>
          </div>
          
          {wallet?.pending_topup > 0 && (
            <div className="bg-white/10 rounded-lg p-3 flex items-center gap-2">
              <Clock size={16} className="text-yellow-200" />
              <span className="text-sm">
                {formatPrice(wallet.pending_topup)} قيد المراجعة
              </span>
            </div>
          )}
        </div>
        
        {/* Topup Button */}
        <button
          onClick={() => setShowTopupForm(true)}
          className="w-full bg-white border-2 border-[#FF6B00] text-[#FF6B00] font-bold py-3 rounded-xl mb-6 flex items-center justify-center gap-2 hover:bg-[#FF6B00] hover:text-white transition-colors"
          data-testid="topup-btn"
        >
          <Plus size={20} />
          شحن المحفظة
        </button>
        
        {/* Topup Form Modal */}
        {showTopupForm && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setShowTopupForm(false)}
          >
            <div
              className="bg-white rounded-2xl p-6 w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4">شحن المحفظة</h2>
              
              {/* مبالغ سريعة */}
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">اختر مبلغاً:</p>
                <div className="flex flex-wrap gap-2">
                  {quickAmounts.map(amount => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setTopupAmount(amount.toString())}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        parseInt(topupAmount) === amount
                          ? 'bg-[#FF6B00] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {formatPrice(amount)}
                    </button>
                  ))}
                </div>
              </div>
              
              <form onSubmit={handleTopup} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">أو أدخل مبلغ آخر (ل.س)</label>
                  <input
                    type="number"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    placeholder="مثال: 100000"
                    className="w-full p-3 border border-gray-300 rounded-xl text-lg"
                    required
                    min={MIN_TOPUP}
                    max={MAX_TOPUP}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    الحد الأدنى: {formatPrice(MIN_TOPUP)} | الأقصى: {formatPrice(MAX_TOPUP)}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-600 mb-1">رقم شام كاش (للتحويل منه)</label>
                  <input
                    type="tel"
                    value={shamcashPhone}
                    onChange={(e) => setShamcashPhone(e.target.value)}
                    placeholder="09XXXXXXXX"
                    className="w-full p-3 border border-gray-300 rounded-xl"
                    required
                  />
                </div>
                
                {/* تعليمات */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
                  <p className="font-bold mb-1">خطوات الشحن:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>أرسل طلب الشحن من هنا</li>
                    <li>حوّل المبلغ لحساب شام كاش الخاص بالمنصة</li>
                    <li>سيتم إضافة الرصيد خلال دقائق بعد التأكد</li>
                  </ol>
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
                    onClick={() => setShowTopupForm(false)}
                    className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
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
            <History size={16} className="inline ml-1" />
            المعاملات
          </button>
          <button
            onClick={() => setActiveTab('topups')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
              activeTab === 'topups' 
                ? 'bg-[#FF6B00] text-white' 
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            <CreditCard size={16} className="inline ml-1" />
            طلبات الشحن
          </button>
        </div>
        
        {/* Transactions List */}
        {activeTab === 'overview' && (
          <div className="space-y-2">
            {transactions.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                <Wallet size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">لا توجد معاملات بعد</p>
                <p className="text-gray-400 text-sm mt-1">اشحن محفظتك للبدء بالتسوق</p>
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
                      <Plus size={20} className="text-green-600" />
                    ) : (
                      <CreditCard size={20} className="text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">{tx.description}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(tx.created_at).toLocaleDateString('ar-SY', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <p className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.amount > 0 ? '+' : ''}{formatPrice(Math.abs(tx.amount))}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
        
        {/* Topup History */}
        {activeTab === 'topups' && (
          <div className="space-y-2">
            {topupHistory.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                <CreditCard size={40} className="text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">لا توجد طلبات شحن</p>
              </div>
            ) : (
              topupHistory.map((t) => (
                <div 
                  key={t.id} 
                  className="bg-white rounded-xl p-4 border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-bold text-gray-900">{formatPrice(t.amount)}</p>
                      <p className="text-xs text-gray-500">كود: {t.code}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 ${
                      t.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                      t.status === 'approved' ? 'bg-green-100 text-green-600' :
                      t.status === 'cancelled' ? 'bg-gray-100 text-gray-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {t.status === 'pending' && <Clock size={12} />}
                      {t.status === 'approved' && <CheckCircle size={12} />}
                      {t.status === 'rejected' && <XCircle size={12} />}
                      {t.status === 'pending' ? 'قيد المراجعة' :
                       t.status === 'approved' ? 'تم الشحن' : 
                       t.status === 'cancelled' ? 'ملغي' : 'مرفوض'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">من: {t.shamcash_phone}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(t.created_at).toLocaleDateString('ar-SY')}
                  </p>
                  
                  {t.status === 'pending' && (
                    <button
                      onClick={() => cancelTopup(t.id)}
                      className="mt-2 text-red-500 text-xs font-medium"
                    >
                      إلغاء الطلب
                    </button>
                  )}
                  
                  {t.status === 'rejected' && t.reject_reason && (
                    <p className="mt-2 text-xs text-red-500">
                      السبب: {t.reject_reason}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
        
        {/* Info Box */}
        <div className="mt-6 bg-gray-100 rounded-xl p-4 text-sm text-gray-600">
          <p className="font-bold mb-2">معلومات مهمة:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>رصيد المحفظة يُستخدم للشراء من التطبيق فقط</li>
            <li>لا يمكن سحب الرصيد نقداً</li>
            <li>عند إلغاء طلب مدفوع بالمحفظة، يُسترد المبلغ تلقائياً</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BuyerWalletPage;
