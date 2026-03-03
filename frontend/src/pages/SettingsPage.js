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
  { id: 'syriatel_cash', name: 'سيرياتيل', icon: '📱' },
  { id: 'mtn_cash', name: 'MTN', icon: '📱' },
];

const SettingsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('addresses');
  const [addresses, setAddresses] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [editingPayment, setEditingPayment] = useState(null);
  
  const [newAddress, setNewAddress] = useState({
    title: '', city: 'دمشق', area: '', street_number: '', building_number: '', apartment_number: '', phone: '', is_default: false
  });
  
  const [newPayment, setNewPayment] = useState({
    type: 'shamcash', phone: '', holder_name: '', is_default: false
  });

  useEffect(() => {
    if (user) fetchData();
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

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      if (editingAddress) {
        await axios.put(`${API}/user/addresses/${editingAddress.id}`, newAddress);
        toast({ title: "تم التحديث", description: "تم تحديث العنوان" });
      } else {
        await axios.post(`${API}/user/addresses`, newAddress);
        toast({ title: "تمت الإضافة", description: "تم إضافة العنوان" });
      }
      setShowAddAddress(false);
      setEditingAddress(null);
      setNewAddress({ title: '', city: 'دمشق', area: '', street_number: '', building_number: '', apartment_number: '', phone: '', is_default: false });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || "فشل حفظ العنوان", variant: "destructive" });
    }
  };

  const handleDeleteAddress = async (addressId) => {
    if (!window.confirm('حذف العنوان؟')) return;
    try {
      await axios.delete(`${API}/user/addresses/${addressId}`);
      toast({ title: "تم الحذف" });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", variant: "destructive" });
    }
  };

  const handleSetDefaultAddress = async (addressId) => {
    try {
      await axios.post(`${API}/user/addresses/${addressId}/default`);
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", variant: "destructive" });
    }
  };

  const handleEditAddress = (address) => {
    setEditingAddress(address);
    setNewAddress({
      title: address.title, city: address.city, area: address.area || '', 
      street_number: address.street_number || '', building_number: address.building_number || '', 
      apartment_number: address.apartment_number || '', phone: address.phone || '', is_default: address.is_default
    });
    setShowAddAddress(true);
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    try {
      if (editingPayment) {
        await axios.put(`${API}/user/payment-methods/${editingPayment.id}`, newPayment);
        toast({ title: "تم التحديث" });
      } else {
        await axios.post(`${API}/user/payment-methods`, newPayment);
        toast({ title: "تمت الإضافة" });
      }
      setShowAddPayment(false);
      setEditingPayment(null);
      setNewPayment({ type: 'shamcash', phone: '', holder_name: '', is_default: false });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || "فشل الحفظ", variant: "destructive" });
    }
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('حذف طريقة الدفع؟')) return;
    try {
      await axios.delete(`${API}/user/payment-methods/${paymentId}`);
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", variant: "destructive" });
    }
  };

  const handleSetDefaultPayment = async (paymentId) => {
    try {
      await axios.post(`${API}/user/payment-methods/${paymentId}/default`);
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", variant: "destructive" });
    }
  };

  const handleEditPayment = (payment) => {
    setEditingPayment(payment);
    setNewPayment({ type: payment.type, phone: payment.phone, holder_name: payment.holder_name || '', is_default: payment.is_default });
    setShowAddPayment(true);
  };

  if (!user) { navigate('/login'); return null; }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-10 bg-gray-50">
      <div className="max-w-xl mx-auto px-3 py-3">
        {/* Header */}
        <h1 className="text-sm font-bold text-gray-900 mb-3">إعدادات الحساب</h1>

        {/* Tabs */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setActiveTab('addresses')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold text-xs transition-colors ${
              activeTab === 'addresses' ? 'bg-[#FF6B00] text-white' : 'bg-white border border-gray-200 text-gray-700'
            }`}
          >
            <MapPin size={14} />
            العناوين
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold text-xs transition-colors ${
              activeTab === 'payments' ? 'bg-[#FF6B00] text-white' : 'bg-white border border-gray-200 text-gray-700'
            }`}
          >
            <CreditCard size={14} />
            طرق الدفع
          </button>
        </div>

        {/* Addresses Tab */}
        {activeTab === 'addresses' && (
          <section>
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-bold text-xs text-gray-900">عناوين التوصيل</h2>
              <button
                onClick={() => { setShowAddAddress(true); setEditingAddress(null); setNewAddress({ title: '', city: 'دمشق', area: '', street_number: '', building_number: '', apartment_number: '', phone: '', is_default: false }); }}
                className="flex items-center gap-0.5 text-[#FF6B00] text-[10px] font-bold"
              >
                <Plus size={14} />
                إضافة
              </button>
            </div>

            {showAddAddress && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg border border-gray-200 p-3 mb-3">
                <h3 className="font-bold text-xs text-gray-900 mb-2">{editingAddress ? 'تعديل' : 'إضافة عنوان'}</h3>
                <form onSubmit={handleAddAddress} className="space-y-2">
                  <input type="text" placeholder="اسم العنوان (المنزل، العمل)" value={newAddress.title} onChange={(e) => setNewAddress({...newAddress, title: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg text-xs" required />
                  <select value={newAddress.city} onChange={(e) => setNewAddress({...newAddress, city: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg text-xs bg-white" required>
                    {SYRIAN_CITIES.map(city => <option key={city} value={city}>{city}</option>)}
                  </select>
                  <input type="text" placeholder="المنطقة / الحي *" value={newAddress.area} onChange={(e) => setNewAddress({...newAddress, area: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg text-xs" required />
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" placeholder="رقم الشارع *" value={newAddress.street_number} onChange={(e) => setNewAddress({...newAddress, street_number: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg text-xs" required />
                    <input type="text" placeholder="رقم البناء *" value={newAddress.building_number} onChange={(e) => setNewAddress({...newAddress, building_number: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg text-xs" required />
                    <input type="text" placeholder="رقم المنزل *" value={newAddress.apartment_number} onChange={(e) => setNewAddress({...newAddress, apartment_number: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg text-xs" required />
                  </div>
                  <input type="tel" placeholder="رقم الهاتف *" value={newAddress.phone} onChange={(e) => setNewAddress({...newAddress, phone: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg text-xs" required />
                  <label className="flex items-center gap-1.5 text-[10px] text-gray-700">
                    <input type="checkbox" checked={newAddress.is_default} onChange={(e) => setNewAddress({...newAddress, is_default: e.target.checked})} className="w-3 h-3 accent-[#FF6B00]" />
                    عنوان افتراضي
                  </label>
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-[#FF6B00] text-white py-2 rounded-lg font-bold text-xs">{editingAddress ? 'تحديث' : 'إضافة'}</button>
                    <button type="button" onClick={() => { setShowAddAddress(false); setEditingAddress(null); }} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-bold text-xs">إلغاء</button>
                  </div>
                </form>
              </motion.div>
            )}

            {addresses.length === 0 ? (
              <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
                <MapPin size={32} className="text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-xs">لا يوجد عناوين</p>
              </div>
            ) : (
              <div className="space-y-2">
                {addresses.map((address) => (
                  <div key={address.id} className="bg-white rounded-lg border border-gray-200 p-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${address.is_default ? 'bg-[#FF6B00]/10' : 'bg-gray-100'}`}>
                          <MapPin size={14} className={address.is_default ? 'text-[#FF6B00]' : 'text-gray-500'} />
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <h3 className="font-bold text-xs text-gray-900">{address.title}</h3>
                            {address.is_default && <span className="text-[8px] bg-[#FF6B00] text-white px-1.5 py-0.5 rounded-full">افتراضي</span>}
                          </div>
                          <p className="text-[10px] text-gray-600">{address.city} - {address.area}</p>
                          <p className="text-[10px] text-gray-500">
                            شارع {address.street_number} - بناء {address.building_number} - منزل {address.apartment_number}
                          </p>
                          <p className="text-[10px] text-gray-500">{address.phone}</p>
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        {!address.is_default && <button onClick={() => handleSetDefaultAddress(address.id)} className="p-1 text-gray-500 hover:bg-gray-100 rounded"><Check size={12} /></button>}
                        <button onClick={() => handleEditAddress(address)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Edit2 size={12} /></button>
                        <button onClick={() => handleDeleteAddress(address.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={12} /></button>
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
            <div className="flex justify-between items-center mb-2">
              <h2 className="font-bold text-xs text-gray-900">طرق الدفع</h2>
              <button
                onClick={() => { setShowAddPayment(true); setEditingPayment(null); setNewPayment({ type: 'shamcash', phone: '', holder_name: '', is_default: false }); }}
                className="flex items-center gap-0.5 text-[#FF6B00] text-[10px] font-bold"
              >
                <Plus size={14} />
                إضافة
              </button>
            </div>

            {showAddPayment && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg border border-gray-200 p-3 mb-3">
                <h3 className="font-bold text-xs text-gray-900 mb-2">{editingPayment ? 'تعديل' : 'إضافة طريقة دفع'}</h3>
                <form onSubmit={handleAddPayment} className="space-y-2">
                  <div className="grid grid-cols-3 gap-1.5">
                    {PAYMENT_TYPES.map((type) => (
                      <button key={type.id} type="button" onClick={() => setNewPayment({...newPayment, type: type.id})}
                        className={`p-2 rounded-lg border text-center transition-colors ${newPayment.type === type.id ? 'border-[#FF6B00] bg-[#FF6B00]/10' : 'border-gray-200'}`}>
                        <span className="text-lg block">{type.icon}</span>
                        <span className="text-[9px] text-gray-700">{type.name}</span>
                      </button>
                    ))}
                  </div>
                  <input type="tel" placeholder="رقم المحفظة" value={newPayment.phone} onChange={(e) => setNewPayment({...newPayment, phone: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg text-xs" required />
                  <input type="text" placeholder="اسم صاحب الحساب" value={newPayment.holder_name} onChange={(e) => setNewPayment({...newPayment, holder_name: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg text-xs" required />
                  <label className="flex items-center gap-1.5 text-[10px] text-gray-700">
                    <input type="checkbox" checked={newPayment.is_default} onChange={(e) => setNewPayment({...newPayment, is_default: e.target.checked})} className="w-3 h-3 accent-[#FF6B00]" />
                    طريقة دفع افتراضية
                  </label>
                  <div className="flex gap-2">
                    <button type="submit" className="flex-1 bg-[#FF6B00] text-white py-2 rounded-lg font-bold text-xs">{editingPayment ? 'تحديث' : 'إضافة'}</button>
                    <button type="button" onClick={() => { setShowAddPayment(false); setEditingPayment(null); }} className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg font-bold text-xs">إلغاء</button>
                  </div>
                </form>
              </motion.div>
            )}

            {paymentMethods.length === 0 ? (
              <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
                <CreditCard size={32} className="text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-xs">لا يوجد طرق دفع</p>
              </div>
            ) : (
              <div className="space-y-2">
                {paymentMethods.map((payment) => {
                  const paymentType = PAYMENT_TYPES.find(t => t.id === payment.type);
                  return (
                    <div key={payment.id} className="bg-white rounded-lg border border-gray-200 p-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg ${payment.is_default ? 'bg-[#FF6B00]/10' : 'bg-gray-100'}`}>
                            {paymentType?.icon || '💳'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1">
                              <h3 className="font-bold text-xs text-gray-900">{paymentType?.name}</h3>
                              {payment.is_default && <span className="text-[8px] bg-[#FF6B00] text-white px-1.5 py-0.5 rounded-full">افتراضي</span>}
                            </div>
                            <p className="text-[10px] text-gray-600">{payment.phone}</p>
                            <p className="text-[10px] text-gray-500">{payment.holder_name}</p>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {!payment.is_default && <button onClick={() => handleSetDefaultPayment(payment.id)} className="p-1 text-gray-500 hover:bg-gray-100 rounded"><Check size={12} /></button>}
                          <button onClick={() => handleEditPayment(payment)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Edit2 size={12} /></button>
                          <button onClick={() => handleDeletePayment(payment.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={12} /></button>
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
