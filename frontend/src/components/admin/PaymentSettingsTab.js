// /app/frontend/src/components/admin/PaymentSettingsTab.js
// تبويب إعدادات الدفع في لوحة تحكم المدير

import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  CreditCard, Wallet, Phone, Building2, 
  Check, AlertCircle, Loader2, Save, RefreshCw,
  Info, ExternalLink, Copy, CheckCircle2
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const PaymentSettingsTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [providerStatus, setProviderStatus] = useState(null);
  const [settings, setSettings] = useState({
    shamcash_address: '',
    shamcash_name: '',
    syriatel_gsm: '',
    syriatel_name: '',
    mtn_gsm: '',
    mtn_name: '',
    bank_account_number: '',
    bank_name: '',
    bank_account_holder: ''
  });
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const [settingsRes, statusRes] = await Promise.all([
        axios.get(`${API}/api/payment/v2/admin/settings`),
        axios.get(`${API}/api/payment/v2/status`)
      ]);
      
      if (settingsRes.data.payment_settings) {
        setSettings(prev => ({
          ...prev,
          ...settingsRes.data.payment_settings
        }));
      }
      setProviderStatus(statusRes.data);
    } catch (error) {
      console.error('Error fetching payment settings:', error);
      toast({
        title: "خطأ",
        description: "فشل تحميل إعدادات الدفع",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/api/payment/v2/admin/settings`, settings);
      toast({
        title: "تم الحفظ",
        description: "تم تحديث إعدادات الدفع بنجاح"
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل حفظ الإعدادات",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
    toast({
      title: "تم النسخ",
      description: "تم نسخ النص للحافظة"
    });
  };

  const ProviderStatusBadge = ({ provider }) => {
    const status = providerStatus?.providers?.[provider];
    if (!status) return null;

    return (
      <div className="flex items-center gap-2">
        {status.enabled ? (
          <span className="flex items-center gap-1 text-green-600 text-xs bg-green-50 px-2 py-1 rounded-full">
            <CheckCircle2 size={12} />
            مُفعّل
          </span>
        ) : (
          <span className="flex items-center gap-1 text-amber-600 text-xs bg-amber-50 px-2 py-1 rounded-full">
            <AlertCircle size={12} />
            غير مُفعّل
          </span>
        )}
        {status.configured && (
          <span className="text-xs text-gray-500">• مُعد</span>
        )}
      </div>
    );
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
          <h2 className="text-lg font-bold text-gray-900">إعدادات الدفع</h2>
          <p className="text-sm text-gray-500">إعداد حسابات استلام المدفوعات من العملاء</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchSettings}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            title="تحديث"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-[#FF6B00] text-white px-4 py-2 rounded-lg hover:bg-[#e55f00] disabled:opacity-50"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            حفظ
          </button>
        </div>
      </div>

      {/* Mode Indicator */}
      {providerStatus && (
        <div className={`p-4 rounded-xl border ${
          providerStatus.is_sandbox 
            ? 'bg-amber-50 border-amber-200' 
            : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              providerStatus.is_sandbox ? 'bg-amber-100' : 'bg-green-100'
            }`}>
              <Info size={20} className={providerStatus.is_sandbox ? 'text-amber-600' : 'text-green-600'} />
            </div>
            <div>
              <p className={`font-bold ${providerStatus.is_sandbox ? 'text-amber-800' : 'text-green-800'}`}>
                {providerStatus.is_sandbox ? '🧪 الوضع التجريبي (Sandbox)' : '✅ الوضع الفعلي (Production)'}
              </p>
              <p className={`text-sm ${providerStatus.is_sandbox ? 'text-amber-600' : 'text-green-600'}`}>
                {providerStatus.is_sandbox 
                  ? 'جميع عمليات الدفع تجريبية ولا يتم خصم أموال حقيقية'
                  : 'عمليات الدفع فعلية ويتم تحويل الأموال الحقيقية'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* شام كاش */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Wallet className="text-[#FF6B00]" size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">شام كاش (ShamCash)</h3>
              <p className="text-xs text-gray-500">محفظة إلكترونية سورية</p>
            </div>
          </div>
          <ProviderStatusBadge provider="shamcash" />
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              عنوان حساب شام كاش (Account Address)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={settings.shamcash_address}
                onChange={(e) => setSettings({...settings, shamcash_address: e.target.value})}
                placeholder="مثال: 251aw..."
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
                dir="ltr"
              />
              {settings.shamcash_address && (
                <button
                  onClick={() => copyToClipboard(settings.shamcash_address, 'shamcash')}
                  className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                >
                  {copiedField === 'shamcash' ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                </button>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">العنوان الذي سيُحوّل إليه العملاء المبالغ</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              اسم صاحب الحساب (يظهر للعملاء)
            </label>
            <input
              type="text"
              value={settings.shamcash_name}
              onChange={(e) => setSettings({...settings, shamcash_name: e.target.value})}
              placeholder="مثال: ترند سورية"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700 flex items-start gap-2">
              <Info size={14} className="mt-0.5 flex-shrink-0" />
              <span>
                للحصول على API Key، سجّل في{' '}
                <a href="https://apisyria.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                  apisyria.com
                </a>
                {' '}واربط حساب شام كاش الخاص بالمتجر
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* سيرياتيل كاش */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <Phone className="text-red-600" size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">سيرياتيل كاش</h3>
              <p className="text-xs text-gray-500">محفظة سيرياتيل</p>
            </div>
          </div>
          <ProviderStatusBadge provider="syriatel_cash" />
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              رقم سيرياتيل كاش
            </label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={settings.syriatel_gsm}
                onChange={(e) => setSettings({...settings, syriatel_gsm: e.target.value})}
                placeholder="مثال: 0933000000"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
                dir="ltr"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              اسم صاحب الحساب
            </label>
            <input
              type="text"
              value={settings.syriatel_name}
              onChange={(e) => setSettings({...settings, syriatel_name: e.target.value})}
              placeholder="مثال: ترند سورية"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* MTN كاش */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Phone className="text-yellow-600" size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">MTN كاش</h3>
              <p className="text-xs text-gray-500">محفظة MTN</p>
            </div>
          </div>
        </div>
        
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              رقم MTN كاش
            </label>
            <input
              type="tel"
              value={settings.mtn_gsm}
              onChange={(e) => setSettings({...settings, mtn_gsm: e.target.value})}
              placeholder="مثال: 0944000000"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
              dir="ltr"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              اسم صاحب الحساب
            </label>
            <input
              type="text"
              value={settings.mtn_name}
              onChange={(e) => setSettings({...settings, mtn_name: e.target.value})}
              placeholder="مثال: ترند سورية"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#FF6B00] focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* البطاقات البنكية */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden opacity-75">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CreditCard className="text-blue-600" size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">بطاقات بنكية (Visa/Mastercard)</h3>
              <p className="text-xs text-gray-500">قيد التطوير</p>
            </div>
          </div>
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
            قريباً
          </span>
        </div>
        
        <div className="p-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <Building2 size={32} className="mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 font-medium">بوابة الدفع البنكي قيد التطوير</p>
            <p className="text-xs text-gray-400 mt-1">
              Visa و Mastercard بدأتا الشراكة مع سوريا في ديسمبر 2025
            </p>
            <a
              href="https://www.electronicpaymentsinternational.com/news/visa-syria-payments/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2"
            >
              اقرأ المزيد <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>

      {/* تعليمات للتفعيل */}
      <div className="bg-gradient-to-r from-[#FF6B00]/10 to-orange-50 rounded-xl border border-[#FF6B00]/20 p-4">
        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Info size={18} className="text-[#FF6B00]" />
          كيفية تفعيل الدفع الفعلي
        </h4>
        <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
          <li>سجّل حساب تاجر في <a href="https://apisyria.com" target="_blank" rel="noopener noreferrer" className="text-[#FF6B00] underline">apisyria.com</a></li>
          <li>اربط حسابات شام كاش و/أو سيرياتيل كاش الخاصة بالمتجر</li>
          <li>احصل على API Key من لوحة التحكم</li>
          <li>أضف API Key وعناوين الحسابات في ملف البيئة (.env)</li>
          <li>غيّر PAYMENT_MODE إلى "production" للتفعيل الفعلي</li>
        </ol>
      </div>
    </div>
  );
};

export default PaymentSettingsTab;
