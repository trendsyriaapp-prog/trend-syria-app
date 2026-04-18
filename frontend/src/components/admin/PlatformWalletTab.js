// /app/frontend/src/components/admin/PlatformWalletTab.js
// تبويب محفظة المنصة في لوحة تحكم المدير

import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Wallet, TrendingUp, ArrowDownCircle, RefreshCw,
  Loader2, Package, Utensils, Clock, DollarSign
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const PlatformWalletTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNote, setWithdrawNote] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState(null);

  // طرق السحب المتاحة
  const withdrawMethods = [
    { id: 'shamcash', name: 'شام كاش', icon: '💳', fields: ['shamcash_address', 'shamcash_name'] },
    { id: 'bank', name: 'حساب بنكي', icon: '🏦', fields: ['bank_account_number', 'bank_name', 'bank_account_holder'] }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [walletRes, transactionsRes, paymentRes] = await Promise.all([
        axios.get(`${API}/api/admin/platform-wallet`, { headers }),
        axios.get(`${API}/api/admin/platform-wallet/transactions?limit=20`, { headers }),
        axios.get(`${API}/api/payment/v2/admin/settings`).catch(() => ({ data: {} }))
      ]);
      
      setWallet(walletRes.data);
      setTransactions(transactionsRes.data);
      setPaymentSettings(paymentRes.data?.payment_settings || {});
    } catch (error) {
      console.error('Error fetching platform wallet:', error);
      toast({
        title: "خطأ",
        description: "فشل تحميل محفظة المنصة",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseInt(withdrawAmount) <= 0) {
      toast({
        title: "خطأ",
        description: "أدخل مبلغاً صحيحاً",
        variant: "destructive"
      });
      return;
    }

    if (!withdrawMethod) {
      toast({
        title: "خطأ",
        description: "اختر وسيلة السحب",
        variant: "destructive"
      });
      return;
    }

    setWithdrawing(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/api/admin/platform-wallet/withdraw`,
        null,
        { 
          headers: { Authorization: `Bearer ${token}` },
          params: { 
            amount: parseInt(withdrawAmount), 
            note: withdrawNote,
            method: withdrawMethod
          }
        }
      );
      
      const methodName = withdrawMethods.find(m => m.id === withdrawMethod)?.name || withdrawMethod;
      toast({
        title: "تم تسجيل طلب السحب",
        description: `تم طلب سحب ${parseInt(withdrawAmount).toLocaleString()} ل.س إلى ${methodName}`
      });
      
      setWithdrawAmount('');
      setWithdrawNote('');
      setWithdrawMethod('');
      setShowWithdrawForm(false);
      fetchData();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل السحب",
        variant: "destructive"
      });
    } finally {
      setWithdrawing(false);
    }
  };

  const formatPrice = (price) => {
    return (price || 0).toLocaleString() + ' ل.س';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="animate-spin text-[#FF6B00]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Wallet className="text-[#FF6B00]" size={24} />
            محفظة المنصة
          </h2>
          <p className="text-sm text-gray-500">أرباح المنصة من العمولات</p>
        </div>
        <button
          onClick={fetchData}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
          title="تحديث"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* الرصيد الرئيسي */}
      <div className="bg-gradient-to-r from-[#FF6B00] to-orange-500 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white/80 text-sm">رصيد المنصة الحالي</p>
            <p className="text-4xl font-bold mt-1">{formatPrice(wallet?.balance)}</p>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <DollarSign size={32} className="text-white" />
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-white/20 flex justify-between">
          <div>
            <p className="text-white/60 text-xs">إجمالي المسحوب</p>
            <p className="font-bold">{formatPrice(wallet?.total_withdrawn)}</p>
          </div>
          <button
            onClick={() => setShowWithdrawForm(!showWithdrawForm)}
            className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2"
          >
            <ArrowDownCircle size={16} />
            سحب أرباح
          </button>
        </div>
      </div>

      {/* نموذج السحب */}
      {showWithdrawForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
          <h3 className="font-bold text-gray-900">سحب من محفظة المنصة</h3>
          
          {/* اختيار وسيلة السحب */}
          <div>
            <label className="block text-sm text-gray-600 mb-2">وسيلة السحب *</label>
            <div className="grid grid-cols-2 gap-2">
              {withdrawMethods.map((method) => {
                const isConfigured = method.fields.some(f => paymentSettings?.[f]);
                return (
                  <button
                    key={method.id}
                    onClick={() => setWithdrawMethod(method.id)}
                    disabled={!isConfigured}
                    className={`p-3 rounded-lg border-2 text-right transition-all ${
                      withdrawMethod === method.id
                        ? 'border-[#FF6B00] bg-orange-50'
                        : isConfigured
                          ? 'border-gray-200 hover:border-gray-300'
                          : 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{method.icon}</span>
                      <div>
                        <p className={`font-bold text-sm ${withdrawMethod === method.id ? 'text-[#FF6B00]' : 'text-gray-900'}`}>
                          {method.name}
                        </p>
                        {isConfigured ? (
                          <p className="text-[10px] text-gray-500">
                            {method.id === 'shamcash' && paymentSettings?.shamcash_address}
                            {method.id === 'bank' && paymentSettings?.bank_name}
                          </p>
                        ) : (
                          <p className="text-[10px] text-red-500">غير مُعد</p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            {!withdrawMethods.some(m => m.fields.some(f => paymentSettings?.[f])) && (
              <p className="text-xs text-red-500 mt-2">
                ⚠️ لم يتم إعداد أي وسيلة دفع. اذهب إلى "إعدادات الدفع" أولاً.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">المبلغ (ل.س) *</label>
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="أدخل المبلغ"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
            />
            {wallet?.balance > 0 && (
              <p className="text-xs text-gray-400 mt-1">
                الرصيد المتاح: {formatPrice(wallet.balance)}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">ملاحظة (اختياري)</label>
            <input
              type="text"
              value={withdrawNote}
              onChange={(e) => setWithdrawNote(e.target.value)}
              placeholder="سبب السحب..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleWithdraw}
              disabled={withdrawing || !withdrawAmount || !withdrawMethod}
              className="flex-1 bg-[#FF6B00] text-white py-2 rounded-lg font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {withdrawing ? <Loader2 size={16} className="animate-spin" /> : <ArrowDownCircle size={16} />}
              تأكيد السحب
            </button>
            <button
              onClick={() => {
                setShowWithdrawForm(false);
                setWithdrawMethod('');
              }}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* تفاصيل العمولات */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Package size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">عمولات المنتجات</p>
              <p className="font-bold text-gray-900">{formatPrice(wallet?.total_commission_products)}</p>
            </div>
          </div>
          <div className="h-1 bg-blue-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500" 
              style={{ 
                width: `${wallet?.balance > 0 ? (wallet?.total_commission_products / (wallet?.total_commission_products + wallet?.total_commission_food) * 100) : 50}%` 
              }}
            />
          </div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Utensils size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">عمولات الطعام</p>
              <p className="font-bold text-gray-900">{formatPrice(wallet?.total_commission_food)}</p>
            </div>
          </div>
          <div className="h-1 bg-orange-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-orange-500" 
              style={{ 
                width: `${wallet?.balance > 0 ? (wallet?.total_commission_food / (wallet?.total_commission_products + wallet?.total_commission_food) * 100) : 50}%` 
              }}
            />
          </div>
        </div>
      </div>

      {/* سجل المعاملات */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Clock size={18} className="text-gray-500" />
            سجل المعاملات
          </h3>
        </div>
        
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <TrendingUp size={40} className="mx-auto mb-2 opacity-30" />
            <p>لا توجد معاملات بعد</p>
            <p className="text-xs text-gray-400">ستظهر العمولات هنا عند إتمام الطلبات</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
            {transactions.map((tx) => (
              <div key={tx.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    tx.type === 'withdrawal' 
                      ? 'bg-red-100 text-red-600' 
                      : tx.order_type === 'food' 
                        ? 'bg-orange-100 text-orange-600'
                        : 'bg-blue-100 text-blue-600'
                  }`}>
                    {tx.type === 'withdrawal' ? (
                      <ArrowDownCircle size={16} />
                    ) : tx.order_type === 'food' ? (
                      <Utensils size={16} />
                    ) : (
                      <Package size={16} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tx.description}</p>
                    <p className="text-xs text-gray-400">{formatDate(tx.created_at)}</p>
                  </div>
                </div>
                <span className={`font-bold ${tx.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {tx.amount >= 0 ? '+' : ''}{formatPrice(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PlatformWalletTab;
