// /app/frontend/src/pages/delivery/DeliveryDocuments.js
// صفحة رفع وثائق موظف التوصيل

import { useState, useEffect } from 'react';
import logger from '../../lib/logger';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { compressDocumentImage } from '../../utils/imageCompression';
import AddressPickerModal from '../../components/AddressPickerModal';
import FullScreenMapPicker from '../../components/FullScreenMapPicker';
import ValidatedInput from '../../components/ValidatedInput';
import { 
  Truck, Clock, Upload, Camera, CreditCard, AlertTriangle, Home, Check, MapPin
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const DeliveryDocuments = () => {
  const { user, fetchUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [rejectionReason, setRejectionReason] = useState(null);
  
  // بيانات التسجيل المعلقة (للمستخدمين الجدد)
  const [pendingRegistration, setPendingRegistration] = useState(null);
  const [isNewRegistration, setIsNewRegistration] = useState(false);
  
  const [docs, setDocs] = useState({
    national_id: '',
    personal_photo: '',
    id_photo: '',
    bike_photo: '',
    fuel_type: '',
    home_address: '',
    home_latitude: null,
    home_longitude: null,
    home_city: '',
    home_area: '',
    home_street: '',
    home_street_number: '',
    home_building_number: '',
    payment_account_type: 'shamcash',
    payment_account_number: '',
    payment_account_holder: '',
    payment_bank_name: ''
  });
  
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const fuelTypes = [
    { id: 'petrol', name: 'بنزين', icon: '⛽' },
    { id: 'electric', name: 'كهرباء', icon: '🔋' }
  ];

  useEffect(() => {
    const pending = sessionStorage.getItem('pending_registration');
    if (pending) {
      try {
        const data = JSON.parse(pending);
        if (data.user_type === 'delivery') {
          setPendingRegistration(data);
          setIsNewRegistration(true);
        }
      } catch (e) {
        logger.error('Error parsing pending registration:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (user && !isNewRegistration) {
      checkStatus();
    }
  }, [user, isNewRegistration]);

  const checkStatus = async () => {
    try {
      const res = await axios.get(`${API}/api/delivery/documents/status`);
      setStatus(res.data.status);
      setRejectionReason(res.data.rejection_reason);
    } catch (error) {
      logger.error(error);
    }
  };

  const handleImageUpload = (field) => async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressedImage = await compressDocumentImage(file);
        setDocs(prev => ({ ...prev, [field]: compressedImage }));
      } catch (error) {
        logger.error('Error compressing image:', error);
        toast({
          title: "خطأ",
          description: "فشل في معالجة الصورة، يرجى المحاولة مرة أخرى",
          variant: "destructive"
        });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validations
    if (!docs.national_id?.trim()) {
      toast({ title: "خطأ", description: "رقم الهوية الوطنية مطلوب", variant: "destructive" });
      return;
    }
    if (!docs.personal_photo) {
      toast({ title: "خطأ", description: "الصورة الشخصية مطلوبة", variant: "destructive" });
      return;
    }
    if (!docs.id_photo) {
      toast({ title: "خطأ", description: "صورة الهوية مطلوبة", variant: "destructive" });
      return;
    }
    if (!docs.bike_photo) {
      toast({ title: "خطأ", description: "صورة الدراجة مطلوبة", variant: "destructive" });
      return;
    }
    if (!docs.fuel_type) {
      toast({ title: "خطأ", description: "يرجى اختيار نوع الوقود", variant: "destructive" });
      return;
    }
    if (!docs.home_address?.trim()) {
      toast({ title: "خطأ", description: "يرجى إدخال عنوانك", variant: "destructive" });
      return;
    }
    if (!docs.home_latitude || !docs.home_longitude) {
      toast({ title: "خطأ", description: "يرجى تحديد موقعك على الخريطة", variant: "destructive" });
      return;
    }
    if (!docs.payment_account_number || !docs.payment_account_holder) {
      toast({ title: "خطأ", description: "يرجى إدخال بيانات حساب استلام الأرباح", variant: "destructive" });
      return;
    }

    const accountNumber = docs.payment_account_number?.trim() || '';
    if (docs.payment_account_type === 'shamcash') {
      if (!accountNumber.startsWith('09') || accountNumber.length !== 10 || !/^\d+$/.test(accountNumber)) {
        toast({ title: "خطأ", description: "رقم شام كاش يجب أن يبدأ بـ 09 ويتكون من 10 أرقام", variant: "destructive" });
        return;
      }
    }
    if (docs.payment_account_type === 'bank_account' && !docs.payment_bank_name) {
      toast({ title: "خطأ", description: "يرجى إدخال اسم البنك", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const deliveryData = {
        personal_photo: docs.personal_photo,
        national_id: docs.id_photo,
        driving_license: docs.bike_photo,
        vehicle_photo: docs.bike_photo,
        vehicle_type: docs.fuel_type,
        home_address: docs.home_address,
        home_latitude: docs.home_latitude,
        home_longitude: docs.home_longitude,
        home_city: docs.home_city,
        payment_account: {
          type: docs.payment_account_type,
          account_number: docs.payment_account_number,
          holder_name: docs.payment_account_holder,
          bank_name: docs.payment_account_type === 'bank_account' ? docs.payment_bank_name : null
        }
      };
      
      if (isNewRegistration && pendingRegistration) {
        const registrationData = {
          registration_id: pendingRegistration.registration_id,
          full_name: pendingRegistration.full_name,
          phone: pendingRegistration.phone,
          password: pendingRegistration.password,
          city: pendingRegistration.city,
          user_type: 'delivery',
          delivery_data: deliveryData
        };
        
        const res = await axios.post(`${API}/api/auth/complete-registration`, registrationData, {
          withCredentials: true
        });
        
        sessionStorage.removeItem('pending_registration');
        localStorage.setItem('user', JSON.stringify(res.data.user));
        
        toast({
          title: "تم إنشاء الحساب بنجاح",
          description: "تم إرسال الوثائق، في انتظار موافقة الإدارة"
        });
        
        await fetchUser();
        setStatus('pending');
      } else {
        const submitData = {
          national_id: docs.national_id,
          personal_photo: docs.personal_photo,
          id_photo: docs.id_photo,
          bike_photo: docs.bike_photo,
          fuel_type: docs.fuel_type,
          home_address: docs.home_address,
          home_latitude: docs.home_latitude,
          home_longitude: docs.home_longitude,
          home_city: docs.home_city,
          payment_account: {
            type: docs.payment_account_type,
            account_number: docs.payment_account_number,
            holder_name: docs.payment_account_holder,
            bank_name: docs.payment_account_type === 'bank_account' ? docs.payment_bank_name : null
          }
        };
        
        await axios.post(`${API}/api/delivery/documents`, submitData);
        toast({
          title: "تم بنجاح",
          description: "تم إرسال الوثائق، في انتظار موافقة الإدارة"
        });
        setStatus('pending');
      }
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "حدث خطأ أثناء إنشاء الحساب",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Status screens
  if (status === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 text-center max-w-sm">
          <Clock size={48} className="text-yellow-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">في انتظار الموافقة</h2>
          <p className="text-sm text-gray-500">تم إرسال وثائقك وهي قيد المراجعة من قبل الإدارة</p>
        </div>
      </div>
    );
  }

  if (status === 'approved') {
    navigate('/delivery/dashboard');
    return null;
  }

  if (status === 'rejected') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 text-center max-w-sm">
          <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">تم رفض طلبك</h2>
          {rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
              <p className="text-sm text-red-700 font-medium">سبب الرفض:</p>
              <p className="text-sm text-red-600 mt-1">{rejectionReason}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Components
  const ImageUploadField = ({ field, label, icon: Icon, value, onUpload }) => (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <label className="block text-sm font-bold text-gray-700 mb-2">
        <Icon size={16} className="inline ml-1" />
        {label}
      </label>
      <div className="relative">
        {value ? (
          <div className="relative">
            <img src={value} alt={label} className="w-full h-40 object-cover rounded-lg" />
            <button
              type="button"
              onClick={() => setDocs(prev => ({ ...prev, [field]: '' }))}
              className="absolute top-2 left-2 bg-red-500 text-white p-1 rounded-full"
            >
              ✕
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#FF6B00] transition-colors">
            <Upload size={24} className="text-gray-400 mb-2" />
            <span className="text-sm text-gray-500">اضغط لرفع الصورة</span>
            <input type="file" accept="image/*" onChange={onUpload} className="hidden" />
          </label>
        )}
      </div>
    </div>
  );

  const LiveCameraCapture = ({ value, onCapture }) => (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <label className="block text-sm font-bold text-gray-700 mb-2">
        <Camera size={16} className="inline ml-1" />
        صورة شخصية حية (سيلفي) *
      </label>
      <div className="relative">
        {value ? (
          <div className="relative">
            <img src={value} alt="صورة شخصية" className="w-full h-48 object-cover rounded-lg" />
            <button
              type="button"
              onClick={() => setDocs(prev => ({ ...prev, personal_photo: '' }))}
              className="absolute top-2 left-2 bg-red-500 text-white p-1 rounded-full"
            >
              ✕
            </button>
            <div className="absolute bottom-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
              <Check size={12} />
              تم التقاط الصورة
            </div>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-[#FF6B00]/50 rounded-lg cursor-pointer hover:border-[#FF6B00] transition-colors bg-orange-50/50">
            <div className="w-16 h-16 rounded-full bg-[#FF6B00]/20 flex items-center justify-center mb-3">
              <Camera size={32} className="text-[#FF6B00]" />
            </div>
            <span className="text-sm font-medium text-gray-700">اضغط لالتقاط صورة سيلفي</span>
            <input type="file" accept="image/*" capture="user" onChange={onCapture} className="hidden" />
          </label>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-2">تسجيل موظف توصيل</h1>
        <p className="text-sm text-gray-500 mb-6">يرجى ملء البيانات ورفع الوثائق المطلوبة</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* National ID */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <CreditCard size={16} className="inline ml-1" />
              رقم الهوية الوطنية <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={docs.national_id}
              onChange={(e) => setDocs(prev => ({ ...prev, national_id: e.target.value }))}
              className="w-full p-3 border-2 rounded-lg text-sm"
              placeholder="أدخل رقم الهوية"
            />
          </div>

          {/* Personal Photo */}
          <LiveCameraCapture value={docs.personal_photo} onCapture={handleImageUpload('personal_photo')} />

          {/* ID Photo */}
          <ImageUploadField field="id_photo" label="صورة الهوية *" icon={CreditCard} value={docs.id_photo} onUpload={handleImageUpload('id_photo')} />

          {/* Bike Photo */}
          <ImageUploadField field="bike_photo" label="صورة الدراجة/المركبة *" icon={Truck} value={docs.bike_photo} onUpload={handleImageUpload('bike_photo')} />

          {/* Fuel Type */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-3">نوع الوقود <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-3">
              {fuelTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setDocs(prev => ({ ...prev, fuel_type: type.id }))}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    docs.fuel_type === type.id
                      ? 'border-[#FF6B00] bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl block mb-1">{type.icon}</span>
                  <span className="font-bold text-gray-800">{type.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Home size={16} className="inline ml-1" />
              عنوان السكن <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowAddressModal(true)}
              className={`w-full p-3 border-2 rounded-lg text-sm text-right ${
                docs.home_address ? 'border-green-500 bg-green-50' : 'border-gray-200'
              }`}
            >
              {docs.home_address || 'اضغط لإضافة العنوان'}
            </button>
          </div>

          {/* Location */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <MapPin size={16} className="inline ml-1" />
              الموقع على الخريطة <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowMapPicker(true)}
              className={`w-full p-3 border-2 rounded-lg text-sm ${
                docs.home_latitude ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200'
              }`}
            >
              {docs.home_latitude ? '✓ تم تحديد الموقع' : 'اضغط لتحديد موقعك'}
            </button>
          </div>

          {/* Payment Account */}
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <label className="block text-sm font-bold text-gray-700 mb-3">حساب استلام الأرباح <span className="text-red-500">*</span></label>
            
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setDocs(prev => ({ ...prev, payment_account_type: 'shamcash' }))}
                className={`flex-1 py-3 rounded-xl font-bold text-sm ${
                  docs.payment_account_type === 'shamcash' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                شام كاش
              </button>
              <button
                type="button"
                onClick={() => setDocs(prev => ({ ...prev, payment_account_type: 'bank_account' }))}
                className={`flex-1 py-3 rounded-xl font-bold text-sm ${
                  docs.payment_account_type === 'bank_account' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                حساب بنكي
              </button>
            </div>

            {docs.payment_account_type === 'shamcash' && (
              <div className="space-y-3">
                <input
                  type="tel"
                  value={docs.payment_account_number}
                  onChange={(e) => setDocs(prev => ({ ...prev, payment_account_number: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  placeholder="09xxxxxxxx"
                  className="w-full p-3 border-2 rounded-xl"
                  dir="ltr"
                />
                <input
                  type="text"
                  value={docs.payment_account_holder}
                  onChange={(e) => setDocs(prev => ({ ...prev, payment_account_holder: e.target.value }))}
                  placeholder="الاسم كما هو مسجل في شام كاش"
                  className="w-full p-3 border-2 rounded-xl"
                />
              </div>
            )}

            {docs.payment_account_type === 'bank_account' && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={docs.payment_bank_name}
                  onChange={(e) => setDocs(prev => ({ ...prev, payment_bank_name: e.target.value }))}
                  placeholder="اسم البنك"
                  className="w-full p-3 border-2 rounded-xl"
                />
                <input
                  type="text"
                  value={docs.payment_account_number}
                  onChange={(e) => setDocs(prev => ({ ...prev, payment_account_number: e.target.value }))}
                  placeholder="رقم الحساب / IBAN"
                  className="w-full p-3 border-2 rounded-xl"
                  dir="ltr"
                />
                <input
                  type="text"
                  value={docs.payment_account_holder}
                  onChange={(e) => setDocs(prev => ({ ...prev, payment_account_holder: e.target.value }))}
                  placeholder="اسم صاحب الحساب"
                  className="w-full p-3 border-2 rounded-xl"
                />
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#FF6B00] text-white py-3 rounded-xl font-bold disabled:opacity-50"
            data-testid="delivery-submit-btn"
          >
            {loading ? 'جاري الإرسال...' : (isNewRegistration ? 'إنشاء الحساب' : 'إرسال الوثائق')}
          </button>
        </form>
      </div>

      {/* Address Modal */}
      <AddressPickerModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onSave={(addressData) => {
          setDocs(prev => ({
            ...prev,
            home_city: addressData.city,
            home_area: addressData.area,
            home_street: addressData.street,
            home_street_number: addressData.street_number,
            home_building_number: addressData.building_number,
            home_address: addressData.full_address
          }));
        }}
        initialAddress={{
          city: docs.home_city,
          area: docs.home_area,
          street: docs.home_street
        }}
        title="إضافة العنوان"
      />

      {/* Map Picker */}
      {showMapPicker && (
        <FullScreenMapPicker
          onLocationSelect={(location) => {
            setDocs(prev => ({
              ...prev,
              home_latitude: location.lat,
              home_longitude: location.lng
            }));
            setShowMapPicker(false);
          }}
          onClose={() => setShowMapPicker(false)}
          initialLocation={docs.home_latitude ? { lat: docs.home_latitude, lng: docs.home_longitude } : null}
        />
      )}
    </div>
  );
};

export default DeliveryDocuments;
