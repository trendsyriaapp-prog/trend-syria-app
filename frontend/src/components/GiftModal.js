// /app/frontend/src/components/GiftModal.js
// نافذة إرسال منتج كهدية

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Gift, X, Send, User, Phone, MessageSquare, Eye, EyeOff, Truck, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;

const GiftModal = ({ isOpen, onClose, product }) => {
  const { toast } = useToast();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [recipientInfo, setRecipientInfo] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [formData, setFormData] = useState({
    recipient_name: '',
    recipient_phone: '',
    message: '',
    is_anonymous: false,
    pay_shipping: false
  });

  // معالج زر الرجوع في الهاتف (Back button)
  useEffect(() => {
    if (!isOpen) return;

    const handleBackButton = (e) => {
      e.preventDefault();
      onClose();
    };

    window.history.pushState({ giftModal: true }, '');
    window.addEventListener('popstate', handleBackButton);

    return () => {
      window.removeEventListener('popstate', handleBackButton);
      if (window.history.state?.giftModal) {
        window.history.back();
      }
    };
  }, [isOpen, onClose]);

  // البحث عن المستلم عند إدخال رقم الهاتف
  useEffect(() => {
    const lookupRecipient = async () => {
      const phone = formData.recipient_phone.trim();
      
      // إعادة تعيين الحالة
      setRecipientInfo(null);
      setLookupError('');
      
      // التحقق من طول الرقم
      if (phone.length < 10) {
        return;
      }
      
      setLookupLoading(true);
      try {
        const response = await axios.get(`${API}/api/auth/lookup/${phone}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setRecipientInfo(response.data);
        // تحديث اسم المستلم تلقائياً
        setFormData(prev => ({ ...prev, recipient_name: response.data.name }));
      } catch (error) {
        if (error.response?.status === 404) {
          setLookupError('هذا الرقم غير مسجل في التطبيق');
        } else if (error.response?.status === 400) {
          setLookupError(error.response?.data?.detail || 'رقم غير صحيح');
        } else {
          setLookupError('خطأ في البحث');
        }
      } finally {
        setLookupLoading(false);
      }
    };

    // تأخير البحث قليلاً لتجنب طلبات كثيرة
    const timer = setTimeout(lookupRecipient, 500);
    return () => clearTimeout(timer);
  }, [formData.recipient_phone, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!recipientInfo) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال رقم هاتف مستلم مسجل في التطبيق",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/api/gifts/send`, {
        product_id: product.id,
        recipient_phone: formData.recipient_phone,
        recipient_name: recipientInfo.name,
        message: formData.message,
        is_anonymous: formData.is_anonymous,
        pay_shipping: formData.pay_shipping
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast({
        title: "🎁 تم إرسال الهدية!",
        description: `سيتم إعلام ${recipientInfo.name} بالهدية`
      });
      
      onClose();
      setFormData({
        recipient_name: '',
        recipient_phone: '',
        message: '',
        is_anonymous: false,
        pay_shipping: false
      });
      setRecipientInfo(null);
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل إرسال الهدية",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // إعادة تعيين عند الإغلاق
  const handleClose = () => {
    setFormData({
      recipient_name: '',
      recipient_phone: '',
      message: '',
      is_anonymous: false,
      pay_shipping: false
    });
    setRecipientInfo(null);
    setLookupError('');
    onClose();
  };

  if (!isOpen || !product) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-pink-500 to-purple-600 p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Gift size={24} className="text-white" />
              </div>
              <div className="text-white">
                <h3 className="font-bold">إرسال كهدية</h3>
                <p className="text-xs opacity-90">أرسل هذا المنتج لصديق</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30"
            >
              <X size={18} className="text-white" />
            </button>
          </div>

          {/* Product Preview */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex gap-3">
              <img
                src={product.images?.[0] || product.image || '/placeholder.svg'}
                alt={product.name}
                className="w-16 h-16 rounded-xl object-cover"
              />
              <div className="flex-1">
                <h4 className="font-bold text-gray-900 text-sm line-clamp-2">{product.name}</h4>
                <p className="text-orange-500 font-bold mt-1">
                  {new Intl.NumberFormat('ar-SY').format(product.price)} ل.س
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* رقم الهاتف */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">رقم هاتف المستلم</label>
              <div className="relative">
                <Phone size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={formData.recipient_phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, recipient_phone: e.target.value }))}
                  placeholder="09XXXXXXXX"
                  className={`w-full pr-10 pl-10 py-3 border rounded-xl focus:outline-none transition-colors ${
                    recipientInfo ? 'border-green-500 bg-green-50' : 
                    lookupError ? 'border-red-500 bg-red-50' : 
                    'border-gray-200 focus:border-purple-500'
                  }`}
                  required
                />
                {/* أيقونة الحالة */}
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  {lookupLoading && <Loader2 size={18} className="text-purple-500 animate-spin" />}
                  {!lookupLoading && recipientInfo && <CheckCircle size={18} className="text-green-500" />}
                  {!lookupLoading && lookupError && <AlertCircle size={18} className="text-red-500" />}
                </div>
              </div>
              
              {/* رسالة الخطأ */}
              {lookupError && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <AlertCircle size={12} />
                  {lookupError}
                </p>
              )}
            </div>

            {/* معلومات المستلم */}
            {recipientInfo && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-green-50 border border-green-200 rounded-xl"
              >
                <div className="flex items-center gap-3">
                  {recipientInfo.profile_image ? (
                    <img 
                      src={recipientInfo.profile_image} 
                      alt={recipientInfo.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-green-300"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-green-200 flex items-center justify-center">
                      <User size={24} className="text-green-600" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-bold text-green-800">{recipientInfo.name}</p>
                    <p className="text-xs text-green-600">{recipientInfo.city || 'مستخدم مسجل'}</p>
                  </div>
                  <CheckCircle size={24} className="text-green-500" />
                </div>
              </motion.div>
            )}

            {/* رسالة الهدية */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">رسالة الهدية (اختياري)</label>
              <div className="relative">
                <MessageSquare size={18} className="absolute right-3 top-3 text-gray-400" />
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="اكتب رسالة لصديقك..."
                  rows={3}
                  className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>
            </div>

            {/* خيارات إضافية */}
            <div className="space-y-2">
              {/* إرسال مجهول */}
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.is_anonymous}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_anonymous: e.target.checked }))}
                  className="w-5 h-5 text-purple-500 rounded"
                />
                <div className="flex items-center gap-2 flex-1">
                  {formData.is_anonymous ? <EyeOff size={18} className="text-gray-500" /> : <Eye size={18} className="text-gray-500" />}
                  <span className="text-sm text-gray-700">إرسال كهدية مجهولة المصدر</span>
                </div>
              </label>

              {/* دفع رسوم الشحن */}
              <label className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl cursor-pointer hover:from-green-100 hover:to-emerald-100 transition-colors border border-green-200">
                <input
                  type="checkbox"
                  checked={formData.pay_shipping}
                  onChange={(e) => setFormData(prev => ({ ...prev, pay_shipping: e.target.checked }))}
                  className="w-5 h-5 text-green-500 rounded"
                  data-testid="pay-shipping-checkbox"
                />
                <div className="flex items-center gap-2 flex-1">
                  <Truck size={18} className="text-green-600" />
                  <div>
                    <span className="text-sm font-medium text-green-800">دفع رسوم الشحن عن المستلم</span>
                    <p className="text-xs text-green-600">هدية كاملة بدون تكاليف على صديقك!</p>
                  </div>
                </div>
              </label>
            </div>

            {/* ملاحظة */}
            <div className="p-3 bg-purple-50 rounded-xl">
              <p className="text-xs text-purple-700 text-center">
                🎁 المستلم لن يعرف ماهية الهدية حتى يستلمها فعلياً - مفاجأة كاملة!
              </p>
            </div>

            {/* زر الإرسال */}
            <button
              type="submit"
              disabled={loading || !recipientInfo}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="send-gift-btn"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={18} />
                  إرسال الهدية
                </>
              )}
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GiftModal;
