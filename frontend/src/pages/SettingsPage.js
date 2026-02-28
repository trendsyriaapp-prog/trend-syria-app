import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  CreditCard, MapPin, Plus, Trash2, Edit2, Check, X, 
  ChevronLeft, User, Phone, Building, Home
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SYRIAN_CITIES = [
  'دمشق', 'حلب', 'حمص', 'حماة', 'اللاذقية', 'طرطوس',
  'دير الزور', 'الرقة', 'الحسكة', 'درعا', 'السويداء',
  'القنيطرة', 'إدلب', 'ريف دمشق'
];

const PAYMENT_TYPES = [
  { id: 'shamcash', name: 'شام كاش', icon: '💳' },
  { id: 'syriatel_cash', name: 'سيرياتيل كاش', icon: '📱' },
  { id: 'mtn_cash', name: 'MTN كاش', icon: '📱' },
];

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('addresses');
  const [addresses, setAddresses] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Forms
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  
  const [newAddress, setNewAddress] = useState({
    title: '',
    city: 'دمشق',
    area: '',
    street: '',
    building: '',
    floor: '',
    details: '',
    phone: '',
    is_default: false
  });
  
  const [newPayment, setNewPayment] = useState({
    type: 'shamcash',
    phone: '',
    holder_name: '',
    is_default: false
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [addressesRes, paymentsRes] = await Promise.all([
        axios.get(`${API}/user/addresses`),
        axios.get(`${API}/user/payment-methods`)
      ]);
      setAddresses(addressesRes.data);
      setPaymentMethods(paymentsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Address Functions
  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      if (editingAddress) {
        await axios.put(`${API}/user/addresses/${editingAddress.id}`, newAddress);
        toast({ title: "تم التحديث", description: "تم تحديث العنوان بنجاح" });
      } else {
        await axios.post(`${API}/user/addresses`, newAddress);
        toast({ title: "تمت الإضافة", description: "تم إضافة العنوان بنجاح" });
      }
      setShowAddAddress(false);
      setEditingAddress(null);
      setNewAddress({ title: '', city: 'دمشق', area: '', street: '', building: '', floor: '', details: '', phone: '', is_default: false });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || "فشل حفظ العنوان", variant: "destructive" });
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('هل تريد حذف هذا العنوان؟')) return;
    try {
      await axios.delete(`${API}/user/addresses/${addressId}`);
      toast({ title: "تم الحذف", description: "تم حذف العنوان" });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حذف العنوان", variant: "destructive" });
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    try {
      await axios.post(`${API}/user/addresses/${addressId}/default`);
      toast({ title: "تم التحديث", description: "تم تعيين العنوان الافتراضي" });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل تعيين العنوان الافتراضي", variant: "destructive" });
    }
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setNewAddress({
      title: address.title,
      city: address.city,
      area: address.area || '',
      street: address.street || '',
      building: address.building || '',
      floor: address.floor || '',
      details: address.details || '',
      phone: address.phone || '',
      is_default: address.is_default
    });
    setShowAddAddress(true);
  };

  // Payment Functions
  const handleAddPayment = async (e) => {
    e.preventDefault();
    try {
      if (editingPayment) {
        await axios.put(`${API}/user/payment-methods/${editingPayment.id}`, newPayment);
        toast({ title: "تم التحديث", description: "تم تحديث طريقة الدفع" });
      } else {
        await axios.post(`${API}/user/payment-methods`, newPayment);
        toast({ title: "تمت الإضافة", description: "تم إضافة طريقة الدفع" });
      }
      setShowAddPayment(false);
      setEditingPayment(null);
      setNewPayment({ type: 'shamcash', phone: '', holder_name: '', is_default: false });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || "فشل حفظ طريقة الدفع", variant: "destructive" });
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('هل تريد حذف طريقة الدفع هذه؟')) return;
    try {
      await axios.delete(`${API}/user/payment-methods/${paymentId}`);
      toast({ title: "تم الحذف", description: "تم حذف طريقة الدفع" });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حذف طريقة الدفع", variant: "destructive" });
    }
  };

  const handleSetDefaultPayment = async (paymentId) => {
    try {
      await axios.post(`${API}/user/payment-methods/${paymentId}/default`);
      toast({ title: "تم التحديث", description: "تم تعيين طريقة الدفع الافتراضية" });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل تعيين طريقة الدفع الافتراضية", variant: "destructive" });
    }
  };

  const handleEditPayment = (payment) => {
    setEditingPayment(payment);
    setNewPayment({
      type: payment.type,
      phone: payment.phone,
      holder_name: payment.holder_name || '',
      is_default: payment.is_default
    });
    setShowAddPayment(true);
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-10 bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
            <ChevronLeft size={24} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">إعدادات الحساب</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('addresses')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors ${
              activeTab === 'addresses'
                ? 'bg-[#FF6B00] text-white'
                : 'bg-white border border-gray-200 text-gray-700'
            }`}
          >
            <MapPin size={18} />
            العناوين
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors ${
              activeTab === 'payments'
                ? 'bg-[#FF6B00] text-white'
                : 'bg-white border border-gray-200 text-gray-700'
            }`}
          >
            <CreditCard size={18} />
            طرق الدفع
          </button>
        </div>

        {/* Addresses Tab */}
        {activeTab === 'addresses' && (
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-900">عناوين التوصيل</h2>
              <button
                onClick={() => { setShowAddAddress(true); setEditingAddress(null); setNewAddress({ title: '', city: 'دمشق', area: '', street: '', building: '', floor: '', details: '', phone: '', is_default: false }); }}
                className="flex items-center gap-1 text-[#FF6B00] text-sm font-bold"
              >
                <Plus size={18} />
                إضافة عنوان
              </button>
            </div>

            {/* Add/Edit Address Form */}
            {showAddAddress && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 p-4 mb-4"
              >
                <h3 className="font-bold text-gray-900 mb-3">
                  {editingAddress ? 'تعديل العنوان' : 'إضافة عنوان جديد'}
                </h3>
                <form onSubmit={handleAddAddress} className="space-y-3">
                  <input
                    type="text"
                    placeholder="اسم العنوان (مثال: المنزل، العمل)"
                    value={newAddress.title}
                    onChange={(e) => setNewAddress({...newAddress, title: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                    required
                  />
                  <select
                    value={newAddress.city}
                    onChange={(e) => setNewAddress({...newAddress, city: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white"
                    required
                  >
                    {SYRIAN_CITIES.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="المنطقة / الحي"
                    value={newAddress.area}
                    onChange={(e) => setNewAddress({...newAddress, area: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                    required
                  />
                  <input
                    type="text"
                    placeholder="الشارع"
                    value={newAddress.street}
                    onChange={(e) => setNewAddress({...newAddress, street: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="رقم البناء"
                      value={newAddress.building}
                      onChange={(e) => setNewAddress({...newAddress, building: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                    />
                    <input
                      type="text"
                      placeholder="الطابق"
                      value={newAddress.floor}
                      onChange={(e) => setNewAddress({...newAddress, floor: e.target.value})}
                      className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="تفاصيل إضافية (اختياري)"
                    value={newAddress.details}
                    onChange={(e) => setNewAddress({...newAddress, details: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                  />
                  <input
                    type="tel"
                    placeholder="رقم الهاتف للتواصل"
                    value={newAddress.phone}
                    onChange={(e) => setNewAddress({...newAddress, phone: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                    required
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={newAddress.is_default}
                      onChange={(e) => setNewAddress({...newAddress, is_default: e.target.checked})}
                      className="w-4 h-4 accent-[#FF6B00]"
                    />
                    تعيين كعنوان افتراضي
                  </label>
                  <div className="flex gap-2 pt-2">
                    <button type="submit" className="flex-1 bg-[#FF6B00] text-white py-3 rounded-lg font-bold text-sm">
                      {editingAddress ? 'تحديث' : 'إضافة'}
                    </button>
                    <button type="button" onClick={() => { setShowAddAddress(false); setEditingAddress(null); }} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-bold text-sm">
                      إلغاء
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Addresses List */}
            {addresses.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                <MapPin size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">لم تضف أي عنوان بعد</p>
              </div>
            ) : (
              <div className="space-y-3">
                {addresses.map((address) => (
                  <div key={address.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${address.is_default ? 'bg-[#FF6B00]/10' : 'bg-gray-100'}`}>
                          {address.title === 'المنزل' || address.title === 'البيت' ? (
                            <Home size={20} className={address.is_default ? 'text-[#FF6B00]' : 'text-gray-500'} />
                          ) : address.title === 'العمل' ? (
                            <Building size={20} className={address.is_default ? 'text-[#FF6B00]' : 'text-gray-500'} />
                          ) : (
                            <MapPin size={20} className={address.is_default ? 'text-[#FF6B00]' : 'text-gray-500'} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-sm text-gray-900">{address.title}</h3>
                            {address.is_default && (
                              <span className="text-[10px] bg-[#FF6B00] text-white px-2 py-0.5 rounded-full">افتراضي</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{address.city} - {address.area}</p>
                          {address.street && <p className="text-xs text-gray-500">{address.street}</p>}
                          {(address.building || address.floor) && (
                            <p className="text-xs text-gray-500">
                              {address.building && `بناء ${address.building}`}
                              {address.building && address.floor && ' - '}
                              {address.floor && `طابق ${address.floor}`}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Phone size={12} />
                            {address.phone}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {!address.is_default && (
                          <button
                            onClick={() => handleSetDefaultAddress(address.id)}
                            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                            title="تعيين كافتراضي"
                          >
                            <Check size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleEditAddress(address)}
                          className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(address.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-900">طرق الدفع</h2>
              <button
                onClick={() => { setShowAddPayment(true); setEditingPayment(null); setNewPayment({ type: 'shamcash', phone: '', holder_name: '', is_default: false }); }}
                className="flex items-center gap-1 text-[#FF6B00] text-sm font-bold"
              >
                <Plus size={18} />
                إضافة طريقة دفع
              </button>
            </div>

            {/* Add/Edit Payment Form */}
            {showAddPayment && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 p-4 mb-4"
              >
                <h3 className="font-bold text-gray-900 mb-3">
                  {editingPayment ? 'تعديل طريقة الدفع' : 'إضافة طريقة دفع جديدة'}
                </h3>
                <form onSubmit={handleAddPayment} className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_TYPES.map((type) => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setNewPayment({...newPayment, type: type.id})}
                        className={`p-3 rounded-lg border text-center transition-colors ${
                          newPayment.type === type.id
                            ? 'border-[#FF6B00] bg-[#FF6B00]/10'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <span className="text-2xl block mb-1">{type.icon}</span>
                        <span className="text-[10px] text-gray-700">{type.name}</span>
                      </button>
                    ))}
                  </div>
                  <input
                    type="tel"
                    placeholder="رقم الهاتف المرتبط بالمحفظة"
                    value={newPayment.phone}
                    onChange={(e) => setNewPayment({...newPayment, phone: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                    required
                  />
                  <input
                    type="text"
                    placeholder="اسم صاحب الحساب"
                    value={newPayment.holder_name}
                    onChange={(e) => setNewPayment({...newPayment, holder_name: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm"
                    required
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={newPayment.is_default}
                      onChange={(e) => setNewPayment({...newPayment, is_default: e.target.checked})}
                      className="w-4 h-4 accent-[#FF6B00]"
                    />
                    تعيين كطريقة دفع افتراضية
                  </label>
                  <div className="flex gap-2 pt-2">
                    <button type="submit" className="flex-1 bg-[#FF6B00] text-white py-3 rounded-lg font-bold text-sm">
                      {editingPayment ? 'تحديث' : 'إضافة'}
                    </button>
                    <button type="button" onClick={() => { setShowAddPayment(false); setEditingPayment(null); }} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-bold text-sm">
                      إلغاء
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Payments List */}
            {paymentMethods.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
                <CreditCard size={48} className="text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">لم تضف أي طريقة دفع بعد</p>
              </div>
            ) : (
              <div className="space-y-3">
                {paymentMethods.map((payment) => {
                  const paymentType = PAYMENT_TYPES.find(t => t.id === payment.type);
                  return (
                    <div key={payment.id} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${payment.is_default ? 'bg-[#FF6B00]/10' : 'bg-gray-100'}`}>
                            {paymentType?.icon || '💳'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-sm text-gray-900">{paymentType?.name || payment.type}</h3>
                              {payment.is_default && (
                                <span className="text-[10px] bg-[#FF6B00] text-white px-2 py-0.5 rounded-full">افتراضي</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mt-1">{payment.phone}</p>
                            <p className="text-xs text-gray-500">{payment.holder_name}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          {!payment.is_default && (
                            <button
                              onClick={() => handleSetDefaultPayment(payment.id)}
                              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                              title="تعيين كافتراضي"
                            >
                              <Check size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => handleEditPayment(payment)}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeletePayment(payment.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;
