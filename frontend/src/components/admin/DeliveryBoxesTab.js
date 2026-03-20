// /app/frontend/src/components/admin/DeliveryBoxesTab.js
// تبويب إدارة صناديق التوصيل في لوحة المشرف

import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Package, Plus, User, DollarSign, Check, X, 
  AlertTriangle, Settings, Search, Truck, RefreshCw,
  ChevronDown, ChevronUp, History
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const DeliveryBoxesTab = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [boxes, setBoxes] = useState([]);
  const [stats, setStats] = useState({});
  const [settings, setSettings] = useState({});
  const [drivers, setDrivers] = useState([]);
  const [activeView, setActiveView] = useState('boxes'); // boxes, settings, assign
  
  // Forms
  const [newBoxSerial, setNewBoxSerial] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedBox, setSelectedBox] = useState('');
  const [depositAmount, setDepositAmount] = useState(30000);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentType, setPaymentType] = useState('installment');
  
  // Expanded rows
  const [expandedBox, setExpandedBox] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [boxesRes, driversRes] = await Promise.all([
        axios.get(`${API}/api/delivery-boxes/admin/all`),
        axios.get(`${API}/api/admin/users?type=delivery`)
      ]);
      
      setBoxes(boxesRes.data.boxes || []);
      setStats(boxesRes.data.stats || {});
      setSettings(boxesRes.data.settings || {});
      setDrivers(driversRes.data.filter(d => d.is_approved) || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل البيانات",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddBox = async () => {
    if (!newBoxSerial.trim()) {
      toast({ title: "خطأ", description: "أدخل رقم الصندوق", variant: "destructive" });
      return;
    }
    
    try {
      await axios.post(`${API}/api/delivery-boxes/admin/add?box_serial=${newBoxSerial}`);
      toast({ title: "تم", description: "تم إضافة الصندوق بنجاح" });
      setNewBoxSerial('');
      fetchData();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل في إضافة الصندوق",
        variant: "destructive"
      });
    }
  };

  const handleAssignBox = async () => {
    if (!selectedDriver) {
      toast({ title: "خطأ", description: "اختر موظف التوصيل", variant: "destructive" });
      return;
    }
    
    try {
      await axios.post(`${API}/api/delivery-boxes/admin/assign`, {
        delivery_user_id: selectedDriver,
        box_serial: selectedBox || null,
        deposit_paid: depositAmount
      });
      
      toast({ title: "تم", description: "تم تعيين الصندوق بنجاح" });
      setSelectedDriver('');
      setSelectedBox('');
      setDepositAmount(30000);
      fetchData();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل في تعيين الصندوق",
        variant: "destructive"
      });
    }
  };

  const handleRecordPayment = async (driverId) => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast({ title: "خطأ", description: "أدخل مبلغ صحيح", variant: "destructive" });
      return;
    }
    
    try {
      const res = await axios.post(`${API}/api/delivery-boxes/admin/record-payment/${driverId}`, {
        amount: parseFloat(paymentAmount),
        payment_type: paymentType
      });
      
      toast({ title: "تم", description: res.data.message });
      setShowPaymentModal(null);
      setPaymentAmount('');
      fetchData();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل في تسجيل الدفعة",
        variant: "destructive"
      });
    }
  };

  const handleReturnBox = async (driverId, condition) => {
    if (!window.confirm(`هل تريد استرجاع الصندوق؟ ${condition === 'good' ? 'سيتم رد الإيداع' : 'لن يتم رد الإيداع (تالف)'}`)) {
      return;
    }
    
    try {
      const res = await axios.post(`${API}/api/delivery-boxes/admin/return/${driverId}?condition=${condition}`);
      toast({ title: "تم", description: res.data.message });
      fetchData();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل في استرجاع الصندوق",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      available: { bg: 'bg-green-100', text: 'text-green-700', label: 'متاح' },
      assigned: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'مُعيّن' },
      owned: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'مُملّك' },
      damaged: { bg: 'bg-red-100', text: 'text-red-700', label: 'تالف' },
      returned: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'مُسترجع' },
    };
    const config = statusConfig[status] || statusConfig.available;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const filteredBoxes = boxes.filter(box => 
    box.serial?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    box.assigned_to_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // الموظفين بدون صندوق
  const driversWithoutBox = drivers.filter(d => 
    !boxes.find(b => b.assigned_to === d.id && ['assigned', 'owned'].includes(b.status))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#FF6B00] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'إجمالي الصناديق', value: stats.total_boxes || 0, icon: Package, color: 'bg-gray-100 text-gray-700' },
          { label: 'متاحة', value: stats.available || 0, icon: Check, color: 'bg-green-100 text-green-700' },
          { label: 'مُعيّنة', value: stats.assigned || 0, icon: User, color: 'bg-blue-100 text-blue-700' },
          { label: 'مُملّكة', value: stats.owned || 0, icon: DollarSign, color: 'bg-purple-100 text-purple-700' },
          { label: 'تالفة', value: stats.damaged || 0, icon: AlertTriangle, color: 'bg-red-100 text-red-700' },
        ].map((stat, i) => (
          <div key={i} className={`rounded-lg p-3 ${stat.color}`}>
            <stat.icon size={18} className="mb-1" />
            <p className="text-base font-bold">{stat.value}</p>
            <p className="text-xs opacity-80">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white rounded-lg p-1 border border-gray-200">
        {[
          { id: 'boxes', label: 'الصناديق', icon: Package },
          { id: 'assign', label: 'تعيين صندوق', icon: User },
          { id: 'settings', label: 'الإعدادات', icon: Settings },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveView(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
              activeView === tab.id 
                ? 'bg-[#FF6B00] text-white' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Boxes List View */}
      {activeView === 'boxes' && (
        <div className="space-y-3">
          {/* Header */}
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-lg">
                <RefreshCw size={16} className="text-gray-500" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newBoxSerial}
                onChange={(e) => setNewBoxSerial(e.target.value)}
                placeholder="رقم صندوق جديد"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <button
                onClick={handleAddBox}
                className="flex items-center gap-1 bg-[#FF6B00] text-white px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap"
              >
                <Plus size={14} />
                إضافة
              </button>
            </div>
          </div>

          {/* Boxes Cards */}
          {filteredBoxes.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
              <Package size={40} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">لا توجد صناديق</p>
            </div>
          ) : (
            filteredBoxes.map((box) => {
              const totalRequired = settings.deposit_amount + (settings.monthly_installment * settings.total_installments);
              const progress = box.assigned_to ? Math.min(100, (box.total_paid / totalRequired) * 100) : 0;
              
              return (
                <div key={box.id} className="bg-white rounded-lg border border-gray-200 p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-gray-900">{box.serial}</span>
                        {getStatusBadge(box.status)}
                      </div>
                      {box.assigned_to_name && (
                        <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                          <User size={12} />
                          {box.assigned_to_name}
                        </p>
                      )}
                    </div>
                    {box.status === 'assigned' && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => setShowPaymentModal(box.assigned_to)}
                          className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold"
                        >
                          دفعة
                        </button>
                        <button
                          onClick={() => handleReturnBox(box.assigned_to, 'good')}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-bold"
                        >
                          استرجاع
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {box.assigned_to && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>المدفوع: {formatPrice(box.total_paid || 0)}</span>
                        <span>{progress.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Assign Box View */}
      {activeView === 'assign' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Truck size={18} className="text-[#FF6B00]" />
            تعيين صندوق لموظف توصيل
          </h3>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">اختر الموظف</label>
              <select
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">-- اختر موظف --</option>
                {driversWithoutBox.map(driver => (
                  <option key={driver.id} value={driver.id}>
                    {driver.full_name} - {driver.phone}
                  </option>
                ))}
              </select>
              {driversWithoutBox.length === 0 && (
                <p className="text-xs text-orange-600 mt-1">جميع الموظفين لديهم صناديق</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">اختر صندوق (اختياري)</label>
              <select
                value={selectedBox}
                onChange={(e) => setSelectedBox(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">-- أي صندوق متاح --</option>
                {boxes.filter(b => b.status === 'available').map(box => (
                  <option key={box.id} value={box.serial}>{box.serial}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">مبلغ الإيداع</label>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(parseInt(e.target.value) || 0)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">الإيداع المطلوب: {formatPrice(settings.deposit_amount)}</p>
            </div>
          </div>
          
          <button
            onClick={handleAssignBox}
            disabled={!selectedDriver}
            className="mt-4 flex items-center gap-2 bg-[#FF6B00] text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50"
          >
            <Package size={16} />
            تعيين الصندوق
          </button>
        </div>
      )}

      {/* Settings View */}
      {activeView === 'settings' && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Settings size={18} className="text-[#FF6B00]" />
            إعدادات الصناديق
          </h3>
          
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">مبلغ الإيداع</p>
              <p className="text-base font-bold text-gray-900">{formatPrice(settings.deposit_amount)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">القسط الشهري</p>
              <p className="text-base font-bold text-gray-900">{formatPrice(settings.monthly_installment)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">عدد الأقساط للتملك</p>
              <p className="text-base font-bold text-gray-900">{settings.total_installments} شهر</p>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>إجمالي سعر الصندوق:</strong> {formatPrice(settings.deposit_amount + (settings.monthly_installment * settings.total_installments))}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              (الإيداع {formatPrice(settings.deposit_amount)} + {settings.total_installments} قسط × {formatPrice(settings.monthly_installment)})
            </p>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-4 w-full max-w-sm"
          >
            <h3 className="font-bold text-gray-900 mb-4">تسجيل دفعة</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">نوع الدفعة</label>
                <select
                  value={paymentType}
                  onChange={(e) => setPaymentType(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="installment">قسط شهري</option>
                  <option value="deposit">إيداع إضافي</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">المبلغ</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={`المبلغ المقترح: ${settings.monthly_installment}`}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowPaymentModal(null)}
                className="flex-1 py-2 border border-gray-300 rounded-lg font-bold text-gray-700"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleRecordPayment(showPaymentModal)}
                className="flex-1 py-2 bg-[#FF6B00] text-white rounded-lg font-bold"
              >
                تسجيل
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default DeliveryBoxesTab;
