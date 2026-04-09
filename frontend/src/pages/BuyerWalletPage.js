// /app/frontend/src/pages/BuyerWalletPage.js
// صفحة المحفظة للعملاء - شحن واستخدام الرصيد

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  Wallet, Plus, Clock, CheckCircle, XCircle, 
  CreditCard, History, ArrowRight, Copy, Check, AlertCircle, Loader2, Trash2
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
  const [topupStep, setTopupStep] = useState(1); // 1: اختيار المبلغ, 2: تعليمات الدفع, 3: إدخال رقم العملية
  const [topupAmount, setTopupAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('shamcash');
  const [transactionId, setTransactionId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [topupCode, setTopupCode] = useState('');
  const [pendingTopupId, setPendingTopupId] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // إعدادات الدفع
  const [paymentSettings, setPaymentSettings] = useState(null);
  
  // الحدود (بالعملة الجديدة - بعد إزالة صفرين)
  const MIN_TOPUP = 100;      // 100 ل.س جديدة (= 10,000 قديمة) - الحد الأدنى فقط
  
  // مبالغ سريعة للشحن (بالعملة الجديدة)
  const quickAmounts = [250, 500, 1000, 2500, 5000];
  
  // طرق الدفع
  const paymentMethods = [
    { id: 'shamcash', name: 'شام كاش', icon: '🏦', available: true },
    { id: 'syriatel_cash', name: 'سيرياتيل كاش', icon: '📱', available: true },
    { id: 'mtn_cash', name: 'MTN كاش', icon: '📲', available: true },
    { id: 'bank_card', name: 'بطاقة بنكية', icon: '💳', available: false, comingSoon: true },
  ];
  
  useEffect(() => {
    if (user) {
      fetchWalletData();
      fetchPaymentSettings();
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
  
  const fetchPaymentSettings = async () => {
    try {
      const res = await axios.get(`${API}/api/payment/v2/instructions/${paymentMethod}`);
      setPaymentSettings(res.data);
    } catch (error) {
      console.error('Error fetching payment settings:', error);
    }
  };
  
  // الخطوة 1: إرسال طلب الشحن
  const handleCreateTopup = async () => {
    const amount = parseInt(topupAmount);
    
    if (amount < MIN_TOPUP) {
      toast({
        title: "خطأ",
        description: `الحد الأدنى للشحن ${formatPrice(MIN_TOPUP)}`,
        variant: "destructive"
      });
      return;
    }
    
    setSubmitting(true);
    
    try {
      const res = await axios.post(`${API}/api/wallet/topup/request`, {
        amount: amount,
        payment_method: paymentMethod
      });
      
      setTopupCode(res.data.topup_code);
      setPendingTopupId(res.data.topup_id);
      
      // جلب تعليمات الدفع المحدثة
      const instructionsRes = await axios.get(`${API}/api/payment/v2/instructions/${paymentMethod}?order_id=${res.data.topup_id}`);
      setPaymentSettings(instructionsRes.data);
      
      setTopupStep(2); // الانتقال لخطوة التعليمات
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
  
  // الخطوة 3: التحقق من رقم العملية
  const handleVerifyTransaction = async () => {
    if (!transactionId || transactionId.length < 3) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رقم العملية الصحيح",
        variant: "destructive"
      });
      return;
    }
    
    setVerifying(true);
    
    try {
      // التحقق من التحويل عبر API الجديد
      const res = await axios.post(`${API}/api/wallet/topup/verify`, {
        topup_id: pendingTopupId,
        transaction_id: transactionId,
        payment_method: paymentMethod
      });
      
      if (res.data.success) {
        toast({
          title: "تم الشحن بنجاح! 🎉",
          description: `تم إضافة ${formatPrice(parseInt(topupAmount))} لمحفظتك`
        });
        
        resetTopupForm();
        fetchWalletData();
      } else {
        toast({
          title: "فشل التحقق",
          description: res.data.message || "لم يتم العثور على التحويل أو المبلغ غير مطابق",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل التحقق من العملية",
        variant: "destructive"
      });
    } finally {
      setVerifying(false);
    }
  };
  
  const resetTopupForm = () => {
    setShowTopupForm(false);
    setTopupStep(1);
    setTopupAmount('');
    setTransactionId('');
    setTopupCode('');
    setPendingTopupId(null);
  };
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "تم النسخ", description: "تم نسخ العنوان للحافظة" });
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
  
  // حذف سجلات المحفظة
  const handleClearTransactions = async () => {
    setDeleting(true);
    try {
      await axios.delete(`${API}/api/wallet/transactions/clear`);
      toast({ title: "تم الحذف", description: "تم حذف سجلات المحفظة بنجاح" });
      setTransactions([]);
      setShowDeleteConfirm(false);
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل حذف السجلات",
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };
  
  // إذا لم يكن المستخدم مسجل دخول، نعيد توجيهه
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">يرجى تسجيل الدخول أولاً</p>
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
        
        {/* Topup Form Modal - Multi-step */}
        {showTopupForm && (
          <div
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => resetTopupForm()}
          >
            <div
              className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* Progress Steps */}
              <div className="flex items-center justify-center gap-2 mb-6">
                {[1, 2, 3].map(step => (
                  <div key={step} className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      topupStep >= step 
                        ? 'bg-[#FF6B00] text-white' 
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      {topupStep > step ? <Check size={16} /> : step}
                    </div>
                    {step < 3 && (
                      <div className={`w-8 h-0.5 ${topupStep > step ? 'bg-[#FF6B00]' : 'bg-gray-200'}`} />
                    )}
                  </div>
                ))}
              </div>
              
              {/* Step 1: اختيار المبلغ وطريقة الدفع */}
              {topupStep === 1 && (
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-4 text-center">شحن المحفظة</h2>
                  
                  {/* طرق الدفع */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">اختر طريقة الدفع:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {paymentMethods.map(method => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => {
                            if (method.available) {
                              setPaymentMethod(method.id);
                              fetchPaymentSettings();
                            }
                          }}
                          disabled={!method.available}
                          className={`p-3 rounded-xl text-center transition-all relative ${
                            !method.available
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-70'
                              : paymentMethod === method.id
                              ? 'bg-[#FF6B00] text-white ring-2 ring-[#FF6B00] ring-offset-2'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {method.comingSoon && (
                            <span className="absolute -top-2 -right-2 bg-blue-500 text-white text-[8px] px-1.5 py-0.5 rounded-full">
                              قريباً
                            </span>
                          )}
                          <span className="text-2xl block mb-1">{method.icon}</span>
                          <span className="text-xs font-medium">{method.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* مبالغ سريعة */}
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">اختر مبلغاً:</p>
                    <div className="flex flex-wrap gap-2">
                      {quickAmounts.map(amount => (
                        <button
                          key={amount}
                          type="button"
                          onClick={() => setTopupAmount(amount.toString())}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
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
                  
                  <div className="mb-4">
                    <label className="block text-sm text-gray-600 mb-1">أو أدخل مبلغ آخر (ل.س)</label>
                    <input
                      type="number"
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                    placeholder="مثال: 1000"
                      className="w-full p-3 border border-gray-300 rounded-xl text-lg"
                      min={MIN_TOPUP}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      الحد الأدنى: {formatPrice(MIN_TOPUP)}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreateTopup}
                      disabled={!topupAmount || parseInt(topupAmount) < MIN_TOPUP || submitting}
                      className="flex-1 bg-[#FF6B00] text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          جاري الإنشاء...
                        </>
                      ) : (
                        'التالي'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => resetTopupForm()}
                      className="px-4 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
              
              {/* Step 2: تعليمات الدفع */}
              {topupStep === 2 && (
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-2 text-center">
                    {paymentMethods.find(m => m.id === paymentMethod)?.icon} تعليمات الدفع
                  </h2>
                  <p className="text-center text-gray-500 text-sm mb-4">
                    كود الطلب: <span className="font-bold text-[#FF6B00]">{topupCode}</span>
                  </p>
                  
                  {/* المبلغ المطلوب */}
                  <div className="bg-gradient-to-r from-[#FF6B00] to-[#FF8533] rounded-xl p-4 text-white text-center mb-4">
                    <p className="text-sm opacity-80">المبلغ المطلوب تحويله</p>
                    <p className="text-2xl font-bold">{formatPrice(parseInt(topupAmount))}</p>
                  </div>
                  
                  {/* عنوان الحساب للنسخ */}
                  {paymentSettings?.merchant_address || paymentSettings?.merchant_phone ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                      <p className="text-sm text-gray-600 mb-2">
                        {paymentMethod === 'shamcash' ? 'عنوان حساب شام كاش:' : 'رقم الهاتف:'}
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-lg font-mono" dir="ltr">
                          {paymentSettings?.merchant_address || paymentSettings?.merchant_phone}
                        </code>
                        <button
                          onClick={() => copyToClipboard(paymentSettings?.merchant_address || paymentSettings?.merchant_phone)}
                          className="p-2 bg-[#FF6B00] text-white rounded-lg hover:bg-[#e55f00]"
                        >
                          {copied ? <Check size={20} /> : <Copy size={20} />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle size={20} className="text-amber-600 mt-0.5" />
                        <p className="text-sm text-amber-700">
                          لم يتم تحديد حساب استلام للمنصة بعد. يرجى التواصل مع الإدارة.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* خطوات الدفع */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                    <p className="font-bold text-blue-800 mb-2">خطوات الدفع:</p>
                    <ol className="text-sm text-blue-700 space-y-2">
                      {Array.isArray(paymentSettings?.steps) && paymentSettings.steps.map((step, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="w-5 h-5 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-xs flex-shrink-0">
                            {index + 1}
                          </span>
                          <span>{typeof step === 'string' ? step.replace(/^\d+\.\s*/, '') : ''}</span>
                        </li>
                      ))}
                      {!Array.isArray(paymentSettings?.steps) && (
                        <>
                          <li className="flex items-start gap-2">
                            <span className="w-5 h-5 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-xs flex-shrink-0">1</span>
                            <span>افتح تطبيق {paymentMethods.find(m => m.id === paymentMethod)?.name}</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="w-5 h-5 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-xs flex-shrink-0">2</span>
                            <span>حوّل المبلغ للحساب المذكور أعلاه</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="w-5 h-5 bg-blue-200 text-blue-800 rounded-full flex items-center justify-center text-xs flex-shrink-0">3</span>
                            <span>احفظ رقم العملية</span>
                          </li>
                        </>
                      )}
                    </ol>
                  </div>
                  
                  <p className="text-xs text-gray-500 text-center mb-4">
                    ⚠️ احفظ رقم العملية بعد التحويل - ستحتاجه في الخطوة التالية
                  </p>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setTopupStep(3)}
                      className="flex-1 bg-[#FF6B00] text-white font-bold py-3 rounded-xl"
                    >
                      تم التحويل - التالي
                    </button>
                    <button
                      type="button"
                      onClick={() => setTopupStep(1)}
                      className="px-4 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl"
                    >
                      رجوع
                    </button>
                  </div>
                </div>
              )}
              
              {/* Step 3: إدخال رقم العملية */}
              {topupStep === 3 && (
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-2 text-center">تأكيد التحويل</h2>
                  <p className="text-center text-gray-500 text-sm mb-4">
                    أدخل رقم العملية من إيصال التحويل
                  </p>
                  
                  <div className="mb-4">
                    <label className="block text-sm text-gray-600 mb-2">رقم العملية (Transaction ID)</label>
                    <input
                      type="text"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder={paymentMethod === 'shamcash' ? 'مثال: TX123456789' : 'رقم العملية'}
                      className="w-full p-4 border-2 border-gray-300 rounded-xl text-lg text-center font-mono focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20"
                      dir="ltr"
                    />
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
                    <p className="text-sm text-green-700 text-center">
                      ✅ سيتم التحقق تلقائياً من التحويل وإضافة الرصيد فوراً
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleVerifyTransaction}
                      disabled={!transactionId || verifying}
                      className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {verifying ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          جاري التحقق...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={18} />
                          تأكيد وشحن المحفظة
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTopupStep(2)}
                      className="px-4 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl"
                    >
                      رجوع
                    </button>
                  </div>
                  
                  <p className="text-xs text-gray-400 text-center mt-4">
                    إذا واجهت مشكلة، تواصل مع الدعم مع كود الطلب: {topupCode}
                  </p>
                </div>
              )}
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
            {/* زر حذف السجلات */}
            {transactions.length > 0 && (
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Trash2 size={14} />
                  حذف السجلات
                </button>
              </div>
            )}
            
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
            <li>السجلات الأقدم من 3 أشهر تُحذف تلقائياً</li>
          </ul>
        </div>
      </div>
      
      {/* Modal تأكيد حذف السجلات */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div 
            className="bg-white rounded-2xl p-6 w-full max-w-sm"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-3">
                <Trash2 size={32} className="text-red-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">حذف سجلات المحفظة</h2>
              <p className="text-sm text-gray-500 mt-2">
                هل أنت متأكد من حذف جميع سجلات المعاملات؟
              </p>
              <p className="text-xs text-green-600 mt-2 bg-green-50 rounded-lg p-2">
                ✓ الرصيد الحالي لن يتغير
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={handleClearTransactions}
                disabled={deleting}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    جاري الحذف...
                  </>
                ) : (
                  'تأكيد الحذف'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuyerWalletPage;
