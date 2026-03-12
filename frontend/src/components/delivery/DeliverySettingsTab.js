// /app/frontend/src/components/delivery/DeliverySettingsTab.js
// تبويب إعدادات موظف التوصيل وحسابات الاستلام المالي

import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Truck, CreditCard, Plus, Edit2, Trash2, Check, X, Save, Loader2, MapPin, Clock, Bike, Car
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SYRIAN_CITIES = [
  'دمشق', 'حلب', 'حمص', 'حماة', 'اللاذقية', 'طرطوس',
  'دير الزور', 'الرقة', 'الحسكة', 'درعا', 'السويداء',
  'القنيطرة', 'إدلب', 'ريف دمشق'
];

const VEHICLE_TYPES = [
  { id: 'motorcycle', name: 'دراجة نارية', icon: '🏍️' },
  { id: 'car', name: 'سيارة', icon: '🚗' },
  { id: 'bicycle', name: 'دراجة هوائية', icon: '🚲' },
];

const PAYMENT_TYPES = [
  { id: 'shamcash', name: 'شام كاش', icon: '💳' },
  { id: 'syriatel_cash', name: 'سيرياتيل كاش', icon: '📱' },
  { id: 'mtn_cash', name: 'MTN كاش', icon: '📱' },
  { id: 'bank_account', name: 'حساب بنكي', icon: '🏦' },
];

const DeliverySettingsTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // إعدادات التوصيل
  const [deliverySettings, setDeliverySettings] = useState({
    vehicle_type: 'motorcycle',
    vehicle_number: '',
    working_city: 'دمشق',
    working_hours: ''
  });
  
  // حسابات الاستلام
  const [paymentAccounts, setPaymentAccounts] = useState([]);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [newAccount, setNewAccount] = useState({
    type: 'shamcash',
    account_number: '',
    holder_name: '',
    bank_name: '',
    is_default: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, accountsRes] = await Promise.all([
        axios.get(`${API}/auth/delivery/settings`),
        axios.get(`${API}/auth/delivery/payment-accounts`)
      ]);
      setDeliverySettings(settingsRes.data);
      setPaymentAccounts(accountsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/auth/delivery/settings`, deliverySettings);
      toast({ title: "تم الحفظ", description: "تم تحديث الإعدادات بنجاح" });
    } catch (error) {
      toast({ title: "خطأ", description: "فشل في حفظ الإعدادات", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        await axios.put(`${API}/auth/delivery/payment-accounts/${editingAccount.id}`, newAccount);
        toast({ title: "تم التحديث", description: "تم تحديث الحساب بنجاح" });
      } else {
        await axios.post(`${API}/auth/delivery/payment-accounts`, newAccount);
        toast({ title: "تمت الإضافة", description: "تم إضافة حساب الاستلام بنجاح" });
      }
      setShowAddAccount(false);
      setEditingAccount(null);
      setNewAccount({ type: 'shamcash', account_number: '', holder_name: '', bank_name: '', is_default: false });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || "فشل في حفظ الحساب", variant: "destructive" });
    }
  };

  const handleDeleteAccount = async (accountId) => {
    if (!window.confirm('هل تريد حذف هذا الحساب؟')) return;
    try {
      await axios.delete(`${API}/auth/delivery/payment-accounts/${accountId}`);
      toast({ title: "تم الحذف", description: "تم حذف الحساب بنجاح" });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل في حذف الحساب", variant: "destructive" });
    }
  };

  const handleSetDefault = async (accountId) => {
    try {
      await axios.post(`${API}/auth/delivery/payment-accounts/${accountId}/default`);
      toast({ title: "تم التحديث", description: "تم تعيين الحساب كافتراضي" });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل في تعيين الحساب كافتراضي", variant: "destructive" });
    }
  };

  const handleEditAccount = (account) => {
    setEditingAccount(account);
    setNewAccount({
      type: account.type,
      account_number: account.account_number,
      holder_name: account.holder_name,
      bank_name: account.bank_name || '',
      is_default: account.is_default
    });
    setShowAddAccount(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* إعدادات التوصيل */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <Truck size={16} className="text-blue-600" />
          </div>
          <h2 className="font-bold text-sm text-gray-900">إعدادات التوصيل</h2>
        </div>

        <div className="space-y-3">
          {/* نوع المركبة */}
          <div>
            <label className="block text-[10px] font-bold text-gray-600 mb-1">نوع المركبة</label>
            <div className="grid grid-cols-3 gap-2">
              {VEHICLE_TYPES.map(vehicle => (
                <button
                  key={vehicle.id}
                  type="button"
                  onClick={() => setDeliverySettings({...deliverySettings, vehicle_type: vehicle.id})}
                  className={`p-2 rounded-lg border text-center text-xs ${
                    deliverySettings.vehicle_type === vehicle.id
                      ? 'border-[#FF6B00] bg-orange-50 text-[#FF6B00]'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  <div className="text-lg mb-1">{vehicle.icon}</div>
                  {vehicle.name}
                </button>
              ))}
            </div>
          </div>

          {/* رقم المركبة */}
          <div>
            <label className="block text-[10px] font-bold text-gray-600 mb-1">رقم المركبة</label>
            <input
              type="text"
              value={deliverySettings.vehicle_number}
              onChange={(e) => setDeliverySettings({...deliverySettings, vehicle_number: e.target.value})}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#FF6B00] focus:outline-none"
              placeholder="مثال: دمشق 123456"
              dir="ltr"
            />
          </div>

          {/* المدينة */}
          <div>
            <label className="block text-[10px] font-bold text-gray-600 mb-1">منطقة العمل</label>
            <select
              value={deliverySettings.working_city}
              onChange={(e) => setDeliverySettings({...deliverySettings, working_city: e.target.value})}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#FF6B00] focus:outline-none"
            >
              {SYRIAN_CITIES.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          {/* ساعات العمل */}
          <div>
            <label className="block text-[10px] font-bold text-gray-600 mb-1">ساعات العمل</label>
            <input
              type="text"
              value={deliverySettings.working_hours}
              onChange={(e) => setDeliverySettings({...deliverySettings, working_hours: e.target.value})}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#FF6B00] focus:outline-none"
              placeholder="مثال: 9 صباحاً - 9 مساءً"
            />
          </div>

          {/* زر الحفظ */}
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="w-full bg-[#FF6B00] text-white font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-2 hover:bg-[#E65000] disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            حفظ الإعدادات
          </button>
        </div>
      </div>

      {/* حسابات الاستلام المالي */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
              <CreditCard size={16} className="text-orange-600" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-gray-900">حسابات الاستلام</h2>
              <p className="text-[9px] text-gray-500">لاستلام أرباحك من التوصيل</p>
            </div>
          </div>
          <button
            onClick={() => {
              setEditingAccount(null);
              setNewAccount({ type: 'shamcash', account_number: '', holder_name: '', bank_name: '', is_default: false });
              setShowAddAccount(true);
            }}
            className="bg-orange-500 text-white p-1.5 rounded-lg hover:bg-orange-600"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* قائمة الحسابات */}
        {paymentAccounts.length === 0 ? (
          <div className="text-center py-6 text-gray-500 text-xs">
            <CreditCard size={32} className="mx-auto mb-2 opacity-30" />
            <p>لم تضف أي حساب للاستلام بعد</p>
            <p className="text-[10px] text-gray-400">أضف حساب شام كاش أو بنك لاستلام أرباحك</p>
          </div>
        ) : (
          <div className="space-y-2">
            {paymentAccounts.map((account) => {
              const paymentType = PAYMENT_TYPES.find(t => t.id === account.type);
              return (
                <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg ${account.is_default ? 'bg-orange-100' : 'bg-gray-100'}`}>
                      {paymentType?.icon || '💳'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-xs text-gray-900">{paymentType?.name}</h3>
                        {account.is_default && (
                          <span className="text-[8px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full">افتراضي</span>
                        )}
                      </div>
                      {account.bank_name && (
                        <p className="text-[10px] text-blue-600">{account.bank_name}</p>
                      )}
                      <p className="text-[10px] text-gray-600 font-mono" dir="ltr">{account.account_number}</p>
                      <p className="text-[10px] text-gray-500">{account.holder_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!account.is_default && (
                      <button
                        onClick={() => handleSetDefault(account.id)}
                        className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                        title="تعيين كافتراضي"
                      >
                        <Check size={12} />
                      </button>
                    )}
                    <button
                      onClick={() => handleEditAccount(account)}
                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={() => handleDeleteAccount(account.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* نموذج إضافة/تعديل حساب */}
      {showAddAccount && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm">{editingAccount ? 'تعديل الحساب' : 'إضافة حساب جديد'}</h3>
              <button onClick={() => setShowAddAccount(false)} className="p-1 hover:bg-gray-100 rounded">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddAccount} className="space-y-3">
              {/* نوع الحساب */}
              <div>
                <label className="block text-[10px] font-bold text-gray-600 mb-1">نوع الحساب</label>
                <select
                  value={newAccount.type}
                  onChange={(e) => setNewAccount({...newAccount, type: e.target.value, bank_name: ''})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#FF6B00] focus:outline-none"
                >
                  {PAYMENT_TYPES.map(type => (
                    <option key={type.id} value={type.id}>{type.icon} {type.name}</option>
                  ))}
                </select>
              </div>

              {/* حقول الحساب البنكي */}
              {newAccount.type === 'bank_account' ? (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-1">اسم البنك</label>
                    <input
                      type="text"
                      value={newAccount.bank_name || ''}
                      onChange={(e) => setNewAccount({...newAccount, bank_name: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#FF6B00] focus:outline-none"
                      placeholder="مثال: بنك سورية الدولي الإسلامي"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-1">رقم الحساب / IBAN</label>
                    <input
                      type="text"
                      value={newAccount.account_number}
                      onChange={(e) => setNewAccount({...newAccount, account_number: e.target.value})}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#FF6B00] focus:outline-none"
                      placeholder="SYxxxxxxxxxxxxxxxxxx"
                      required
                      dir="ltr"
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 mb-1">رقم الحساب / الهاتف</label>
                  <input
                    type="tel"
                    value={newAccount.account_number}
                    onChange={(e) => setNewAccount({...newAccount, account_number: e.target.value})}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#FF6B00] focus:outline-none"
                    placeholder="09xxxxxxxx"
                    required
                    dir="ltr"
                  />
                </div>
              )}

              {/* اسم صاحب الحساب */}
              <div>
                <label className="block text-[10px] font-bold text-gray-600 mb-1">اسم صاحب الحساب</label>
                <input
                  type="text"
                  value={newAccount.holder_name}
                  onChange={(e) => setNewAccount({...newAccount, holder_name: e.target.value})}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-[#FF6B00] focus:outline-none"
                  placeholder="الاسم كما هو مسجل في الحساب"
                  required
                />
              </div>

              {/* حساب افتراضي */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newAccount.is_default}
                  onChange={(e) => setNewAccount({...newAccount, is_default: e.target.checked})}
                  className="w-4 h-4 rounded border-gray-300 text-[#FF6B00] focus:ring-[#FF6B00]"
                />
                <span className="text-xs text-gray-700">تعيين كحساب افتراضي</span>
              </label>

              {/* أزرار */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddAccount(false)}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-xs text-gray-700 hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#FF6B00] text-white rounded-lg text-xs font-bold hover:bg-[#E65000]"
                >
                  {editingAccount ? 'تحديث' : 'إضافة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliverySettingsTab;
