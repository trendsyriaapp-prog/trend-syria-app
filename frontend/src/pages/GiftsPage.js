// /app/frontend/src/pages/GiftsPage.js
// صفحة الهدايا المستلمة والمرسلة

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  Gift, Send, Inbox, Check, X, Loader2, 
  ChevronRight, User, MessageSquare, Clock,
  Sparkles, Package, Heart, MapPin, Phone, Building, Home, Truck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { useLanguage } from '../context/LanguageContext';

const API = process.env.REACT_APP_BACKEND_URL;

// المحافظات السورية
const SYRIAN_CITIES = [
  'دمشق', 'ريف دمشق', 'حلب', 'حمص', 'حماة', 'اللاذقية', 'طرطوس',
  'إدلب', 'دير الزور', 'الحسكة', 'الرقة', 'السويداء', 'درعا', 'القنيطرة'
];

const GiftsPage = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { toast } = useToast();
  const { t, formatPrice } = useLanguage();
  
  const [activeTab, setActiveTab] = useState('received'); // received, sent
  const [receivedGifts, setReceivedGifts] = useState([]);
  const [sentGifts, setSentGifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  
  // نموذج العنوان
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [selectedGift, setSelectedGift] = useState(null);
  const [addressForm, setAddressForm] = useState({
    city: '',
    area: '',
    street: '',
    building: '',
    floor: '',
    phone: '',
    notes: ''
  });
  const [submittingAddress, setSubmittingAddress] = useState(false);
  
  // العناوين المحفوظة
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedSavedAddress, setSelectedSavedAddress] = useState(null);

  // منع تمرير الصفحة عند فتح نافذة العنوان
  useEffect(() => {
    if (showAddressModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAddressModal]);

  // جلب الهدايا والعناوين المحفوظة
  useEffect(() => {
    if (!user || !token) {
      navigate('/login');
      return;
    }
    fetchGifts();
    fetchSavedAddresses();
  }, [user, token]);

  const fetchGifts = async () => {
    setLoading(true);
    try {
      const [receivedRes, sentRes] = await Promise.all([
        axios.get(`${API}/api/gifts/received`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/api/gifts/sent`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setReceivedGifts(receivedRes.data);
      setSentGifts(sentRes.data);
    } catch (err) {
      console.error('Error fetching gifts:', err);
    } finally {
      setLoading(false);
    }
  };

  // جلب العناوين المحفوظة
  const fetchSavedAddresses = async () => {
    try {
      const res = await axios.get(`${API}/api/user/addresses`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let addresses = res.data || [];
      
      // إذا لم توجد عناوين محفوظة، نستخدم عنوان المستخدم الافتراضي
      if (addresses.length === 0 && (user?.address || user?.city || user?.area)) {
        addresses = [{
          id: 'default',
          label: 'عنواني الافتراضي',
          city: user.city || '',
          area: user.area || user.address || '',
          street: user.street || '',
          building: user.building || '',
          floor: user.floor || '',
          phone: user.phone || '',
          notes: ''
        }];
      }
      
      setSavedAddresses(addresses);
    } catch (err) {
      // في حالة خطأ، نستخدم عنوان المستخدم الافتراضي
      if (user?.address || user?.city || user?.area) {
        setSavedAddresses([{
          id: 'default',
          label: 'عنواني الافتراضي',
          city: user.city || '',
          area: user.area || user.address || '',
          street: user.street || '',
          building: user.building || '',
          floor: user.floor || '',
          phone: user.phone || '',
          notes: ''
        }]);
      }
    }
  };

  // اختيار عنوان محفوظ
  const selectSavedAddress = (address) => {
    setSelectedSavedAddress(address.id);
    setAddressForm({
      city: address.city || '',
      area: address.area || '',
      street: address.street || '',
      building: address.building || '',
      floor: address.floor || '',
      phone: address.phone || user?.phone || '',
      notes: address.notes || ''
    });
  };

  // قبول الهدية
  const acceptGift = async (giftId) => {
    setProcessingId(giftId);
    try {
      const response = await axios.post(`${API}/api/gifts/${giftId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.requires_address) {
        // فتح نافذة إدخال العنوان
        const gift = receivedGifts.find(g => g.id === giftId);
        setSelectedGift(gift);
        setAddressForm(prev => ({ ...prev, phone: user?.phone || '' }));
        setShowAddressModal(true);
        toast({
          title: '🎁 تم قبول الهدية!',
          description: 'يرجى إدخال عنوان الشحن لاستلام هديتك'
        });
      } else {
        toast({
          title: '🎉 تم قبول الهدية!',
          description: 'يمكنك الآن رؤية هديتك'
        });
      }
      fetchGifts();
    } catch (err) {
      toast({
        title: 'خطأ',
        description: err.response?.data?.detail || 'فشل قبول الهدية',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  // إرسال العنوان لإكمال استلام الهدية
  const submitAddress = async (e) => {
    e.preventDefault();
    
    if (!addressForm.city || !addressForm.area || !addressForm.phone) {
      toast({
        title: 'خطأ',
        description: 'يرجى إدخال المحافظة والمنطقة ورقم الهاتف',
        variant: 'destructive'
      });
      return;
    }
    
    setSubmittingAddress(true);
    try {
      const response = await axios.post(
        `${API}/api/gifts/${selectedGift.id}/submit-address`,
        addressForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast({
        title: '🎉 تم استلام الهدية!',
        description: `رقم الطلب: ${response.data.order_id}. سيتم شحن هديتك قريباً.`
      });
      
      setShowAddressModal(false);
      setSelectedGift(null);
      setAddressForm({
        city: '',
        area: '',
        street: '',
        building: '',
        floor: '',
        phone: '',
        notes: ''
      });
      fetchGifts();
    } catch (err) {
      toast({
        title: 'خطأ',
        description: err.response?.data?.detail || 'فشل إرسال العنوان',
        variant: 'destructive'
      });
    } finally {
      setSubmittingAddress(false);
    }
  };

  // فتح نموذج العنوان للهدايا التي تنتظر العنوان
  const openAddressForm = (gift) => {
    setSelectedGift(gift);
    
    // إذا كان هناك عنوان محفوظ، نختاره تلقائياً
    if (savedAddresses.length > 0) {
      const defaultAddress = savedAddresses.find(a => a.is_default) || savedAddresses[0];
      setSelectedSavedAddress(defaultAddress.id);
      setAddressForm({
        city: defaultAddress.city || '',
        area: defaultAddress.area || '',
        street: defaultAddress.street || '',
        building: defaultAddress.building || '',
        floor: defaultAddress.floor || '',
        phone: defaultAddress.phone || user?.phone || '',
        notes: defaultAddress.notes || ''
      });
    } else {
      setSelectedSavedAddress(null);
      setAddressForm({
        city: user?.city || '',
        area: user?.area || '',
        street: user?.street || '',
        building: user?.building || '',
        floor: user?.floor || '',
        phone: user?.phone || '',
        notes: ''
      });
    }
    
    setShowAddressModal(true);
  };

  // رفض الهدية
  const rejectGift = async (giftId) => {
    setProcessingId(giftId);
    try {
      await axios.post(`${API}/api/gifts/${giftId}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({
        title: 'تم رفض الهدية',
        description: 'تم إبلاغ المرسل'
      });
      fetchGifts();
    } catch (err) {
      toast({
        title: 'خطأ',
        description: err.response?.data?.detail || 'فشل رفض الهدية',
        variant: 'destructive'
      });
    } finally {
      setProcessingId(null);
    }
  };

  // تنسيق التاريخ
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-SY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // حالة الهدية
  const getStatusBadge = (status) => {
    const badges = {
      pending: { text: 'بانتظار الرد', color: 'bg-yellow-100 text-yellow-700' },
      pending_address: { text: 'بانتظار العنوان', color: 'bg-blue-100 text-blue-700' },
      accepted: { text: 'مقبولة', color: 'bg-green-100 text-green-700' },
      completed: { text: 'تم الاستلام', color: 'bg-emerald-100 text-emerald-700' },
      rejected: { text: 'مرفوضة', color: 'bg-red-100 text-red-700' }
    };
    return badges[status] || badges.pending;
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600 px-4 pt-12 pb-8">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Gift size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">هداياي</h1>
          <p className="text-white/80 text-sm">أرسل واستقبل الهدايا من أصدقائك</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-lg mx-auto px-4 -mt-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-1 flex">
          <button
            onClick={() => setActiveTab('received')}
            className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'received'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            data-testid="received-gifts-tab"
          >
            <Inbox size={18} />
            المستلمة ({receivedGifts.length})
          </button>
          <button
            onClick={() => setActiveTab('sent')}
            className={`flex-1 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              activeTab === 'sent'
                ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white'
                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            data-testid="sent-gifts-tab"
          >
            <Send size={18} />
            المرسلة ({sentGifts.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className="animate-spin text-purple-500" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {activeTab === 'received' ? (
              <motion.div
                key="received"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                {receivedGifts.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Gift size={40} className="text-gray-300" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400">لا توجد هدايا مستلمة</p>
                  </div>
                ) : (
                  receivedGifts.map((gift) => (
                    <motion.div
                      key={gift.id}
                      layout
                      className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700"
                    >
                      {/* Header */}
                      <div className={`p-4 ${gift.is_surprise ? 'bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20' : ''}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {/* صورة المنتج أو أيقونة المفاجأة */}
                            {gift.is_surprise ? (
                              <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl flex items-center justify-center">
                                <Sparkles size={28} className="text-white animate-pulse" />
                              </div>
                            ) : gift.product_image ? (
                              <img 
                                src={gift.product_image} 
                                alt={gift.product_name}
                                className="w-16 h-16 rounded-xl object-cover"
                              />
                            ) : (
                              <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center">
                                <Package size={24} className="text-gray-400" />
                              </div>
                            )}
                            
                            <div className="flex-1">
                              <h3 className="font-bold text-gray-900 dark:text-white">
                                {gift.is_surprise ? '🎁 هدية مفاجأة!' : gift.product_name}
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                <User size={14} />
                                من: {gift.sender_name}
                              </p>
                              {!gift.is_surprise && gift.product_price && (
                                <p className="text-sm font-bold text-[#FF6B00]">
                                  {formatPrice(gift.product_price)}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {/* Badge */}
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(gift.status).color}`}>
                            {getStatusBadge(gift.status).text}
                          </span>
                        </div>

                        {/* الرسالة */}
                        {gift.message && (
                          <div className="mt-3 p-3 bg-white/50 dark:bg-gray-700/50 rounded-xl">
                            <p className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                              <MessageSquare size={16} className="text-purple-500 mt-0.5 flex-shrink-0" />
                              "{gift.message}"
                            </p>
                          </div>
                        )}

                        {/* التاريخ */}
                        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                          <Clock size={12} />
                          {formatDate(gift.created_at)}
                        </p>
                      </div>

                      {/* أزرار القبول/الرفض */}
                      {gift.status === 'pending' && (
                        <div className="p-4 border-t border-gray-100 dark:border-gray-700 flex gap-3">
                          <button
                            onClick={() => acceptGift(gift.id)}
                            disabled={processingId === gift.id}
                            className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                            data-testid={`accept-gift-${gift.id}`}
                          >
                            {processingId === gift.id ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : (
                              <>
                                <Check size={18} />
                                قبول الهدية
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => rejectGift(gift.id)}
                            disabled={processingId === gift.id}
                            className="py-3 px-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                            data-testid={`reject-gift-${gift.id}`}
                          >
                            <X size={18} />
                          </button>
                        </div>
                      )}

                      {/* بانتظار العنوان - إدخال عنوان الشحن */}
                      {gift.status === 'pending_address' && (
                        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
                          <div className="text-center mb-3">
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              🎉 لقد قبلت الهدية! أدخل عنوان الشحن لاستلامها
                            </p>
                            {gift.shipping_paid_by_sender && (
                              <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center justify-center gap-1">
                                <Truck size={14} />
                                الشحن مدفوع مسبقاً من المُهدي 🎁
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => openAddressForm(gift)}
                            className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                            data-testid={`enter-address-${gift.id}`}
                          >
                            <MapPin size={18} />
                            إدخال عنوان الشحن
                          </button>
                        </div>
                      )}

                      {/* تم الاستلام - عرض الطلب */}
                      {gift.status === 'completed' && (
                        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-emerald-50 dark:bg-emerald-900/20">
                          <div className="flex gap-2">
                            <button
                              onClick={() => navigate(`/products/${gift.product_id}`)}
                              className="flex-1 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                            >
                              <Heart size={18} />
                              شاهد هديتك
                            </button>
                            {gift.order_id && (
                              <button
                                onClick={() => navigate(`/orders/${gift.order_id}/tracking`)}
                                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                              >
                                <Package size={18} />
                                تتبع الطلب
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* بعد القبول القديم - عرض المنتج (للتوافق) */}
                      {gift.status === 'accepted' && (
                        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-green-50 dark:bg-green-900/20">
                          <button
                            onClick={() => navigate(`/products/${gift.product_id}`)}
                            className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                          >
                            <Heart size={18} />
                            شاهد هديتك
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))
                )}
              </motion.div>
            ) : (
              <motion.div
                key="sent"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {sentGifts.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Send size={40} className="text-gray-300" />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">لم ترسل أي هدايا بعد</p>
                    <button
                      onClick={() => navigate('/products')}
                      className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-bold"
                    >
                      تصفح المنتجات
                    </button>
                  </div>
                ) : (
                  sentGifts.map((gift) => (
                    <motion.div
                      key={gift.id}
                      layout
                      className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
                    >
                      <div className="flex items-start gap-3">
                        {/* صورة المنتج */}
                        {gift.product_image ? (
                          <img 
                            src={gift.product_image} 
                            alt={gift.product_name}
                            className="w-16 h-16 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center">
                            <Package size={24} className="text-gray-400" />
                          </div>
                        )}
                        
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 dark:text-white">
                            {gift.product_name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            إلى: {gift.recipient_name}
                          </p>
                          <p className="text-sm font-bold text-[#FF6B00]">
                            {formatPrice(gift.product_price)}
                          </p>
                        </div>
                        
                        {/* Badge */}
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(gift.status).color}`}>
                          {getStatusBadge(gift.status).text}
                        </span>
                      </div>

                      {/* الرسالة */}
                      {gift.message && (
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                          <p className="text-sm text-gray-600 dark:text-gray-300">
                            "{gift.message}"
                          </p>
                        </div>
                      )}

                      {/* التاريخ */}
                      <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                        <Clock size={12} />
                        {formatDate(gift.created_at)}
                        {gift.is_anonymous && (
                          <span className="mr-2 text-purple-500">• هدية مجهولة</span>
                        )}
                      </p>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      {/* نافذة إدخال عنوان الشحن */}
      <AnimatePresence>
        {showAddressModal && selectedGift && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
            onClick={() => setShowAddressModal(false)}
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 w-full sm:max-w-md sm:rounded-2xl rounded-t-3xl max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                    <MapPin size={24} className="text-white" />
                  </div>
                  <div className="text-white">
                    <h3 className="font-bold">عنوان الشحن</h3>
                    <p className="text-xs opacity-90">أين تريد استلام هديتك؟</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddressModal(false)}
                  className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30"
                >
                  <X size={18} className="text-white" />
                </button>
              </div>

              {/* معاينة الهدية */}
              <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex-shrink-0">
                <div className="flex gap-3">
                  {selectedGift.product_image ? (
                    <img
                      src={selectedGift.product_image}
                      alt={selectedGift.product_name}
                      className="w-12 h-12 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-xl flex items-center justify-center">
                      <Gift size={20} className="text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 dark:text-white text-sm line-clamp-1">
                      {selectedGift.product_name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      من: {selectedGift.sender_name}
                    </p>
                    <p className="text-sm font-bold text-[#FF6B00]">
                      {formatPrice(selectedGift.product_price)}
                    </p>
                  </div>
                </div>
              </div>

              {/* نموذج العنوان - قابل للتمرير */}
              <form onSubmit={submitAddress} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-4 space-y-3 overflow-y-auto flex-1">
                
                {/* العناوين المحفوظة */}
                {savedAddresses.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                      العناوين المحفوظة
                    </label>
                    <div className="space-y-2">
                      {savedAddresses.map((addr) => (
                        <div
                          key={addr.id}
                          onClick={() => selectSavedAddress(addr)}
                          className={`p-3 border-2 rounded-xl cursor-pointer transition-all ${
                            selectedSavedAddress === addr.id
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              selectedSavedAddress === addr.id
                                ? 'border-blue-500 bg-blue-500'
                                : 'border-gray-300'
                            }`}>
                              {selectedSavedAddress === addr.id && (
                                <Check size={12} className="text-white" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {addr.label || `${addr.city}، ${addr.area}`}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {addr.city} - {addr.area} {addr.street && `- ${addr.street}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* خيار إدخال عنوان جديد */}
                      <div
                        onClick={() => {
                          setSelectedSavedAddress(null);
                          setAddressForm({
                            city: '',
                            area: '',
                            street: '',
                            building: '',
                            floor: '',
                            phone: user?.phone || '',
                            notes: ''
                          });
                        }}
                        className={`p-3 border-2 rounded-xl cursor-pointer transition-all ${
                          selectedSavedAddress === null
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            selectedSavedAddress === null
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300'
                          }`}>
                            {selectedSavedAddress === null && (
                              <Check size={12} className="text-white" />
                            )}
                          </div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            إدخال عنوان جديد
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* المحافظة */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    المحافظة <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select
                      value={addressForm.city}
                      onChange={(e) => {
                        setAddressForm(prev => ({ ...prev, city: e.target.value }));
                        setSelectedSavedAddress(null);
                      }}
                      className="w-full pr-10 pl-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white appearance-none"
                      required
                    >
                      <option value="">اختر المحافظة</option>
                      {SYRIAN_CITIES.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* المنطقة */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    المنطقة / الحي <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Home size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      value={addressForm.area}
                      onChange={(e) => {
                        setAddressForm(prev => ({ ...prev, area: e.target.value }));
                        setSelectedSavedAddress(null);
                      }}
                      placeholder="مثال: المزة، الروضة..."
                      className="w-full pr-10 pl-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      required
                    />
                  </div>
                </div>

                {/* الشارع والمبنى */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                      الشارع
                    </label>
                    <input
                      type="text"
                      value={addressForm.street}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, street: e.target.value }))}
                      placeholder="اسم الشارع"
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                      رقم المبنى
                    </label>
                    <div className="relative">
                      <Building size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={addressForm.building}
                        onChange={(e) => setAddressForm(prev => ({ ...prev, building: e.target.value }))}
                        placeholder="رقم المبنى"
                        className="w-full pr-10 pl-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* الطابق ورقم الهاتف */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                      الطابق
                    </label>
                    <input
                      type="text"
                      value={addressForm.floor}
                      onChange={(e) => setAddressForm(prev => ({ ...prev, floor: e.target.value }))}
                      placeholder="مثال: 3"
                      className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                      رقم الهاتف <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        value={addressForm.phone}
                        onChange={(e) => setAddressForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="09XXXXXXXX"
                        className="w-full pr-10 pl-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* ملاحظات */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 block">
                    ملاحظات إضافية
                  </label>
                  <textarea
                    value={addressForm.notes}
                    onChange={(e) => setAddressForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="أي ملاحظات للتوصيل..."
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  />
                </div>
                </div>

                {/* زر التأكيد - ثابت في الأسفل */}
                <div className="p-4 pb-8 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0 safe-area-bottom">
                  <button
                    type="submit"
                    disabled={submittingAddress}
                    className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 shadow-lg mb-16"
                    data-testid="confirm-address-btn"
                  >
                    {submittingAddress ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <>
                        <Check size={20} />
                        تأكيد العنوان واستلام الهدية
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GiftsPage;
