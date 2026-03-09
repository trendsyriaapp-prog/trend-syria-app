// /app/frontend/src/components/GiftModal.js
// نافذة إرسال منتج كهدية

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { Gift, X, Send, User, Phone, MessageSquare, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const GiftModal = ({ isOpen, onClose, product }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    recipient_name: '',
    recipient_phone: '',
    message: '',
    is_anonymous: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.recipient_phone || !formData.recipient_name) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال اسم ورقم المستلم",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/api/gifts/send`, {
        product_id: product.id,
        recipient_phone: formData.recipient_phone,
        recipient_name: formData.recipient_name,
        message: formData.message,
        is_anonymous: formData.is_anonymous
      });
      
      toast({
        title: "🎁 تم إرسال الهدية!",
        description: `سيتم إعلام ${formData.recipient_name} بالهدية`
      });
      
      onClose();
      setFormData({
        recipient_name: '',
        recipient_phone: '',
        message: '',
        is_anonymous: false
      });
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

  if (!isOpen || !product) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl w-full max-w-md overflow-hidden"
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
              onClick={onClose}
              className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30"
            >
              <X size={18} className="text-white" />
            </button>
          </div>

          {/* Product Preview */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex gap-3">
              <img
                src={product.images?.[0] || 'https://via.placeholder.com/80'}
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
            {/* اسم المستلم */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">اسم المستلم</label>
              <div className="relative">
                <User size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={formData.recipient_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, recipient_name: e.target.value }))}
                  placeholder="أدخل اسم صديقك"
                  className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
            </div>

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
                  className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-500"
                  required
                />
              </div>
            </div>

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

            {/* إرسال مجهول */}
            <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_anonymous}
                onChange={(e) => setFormData(prev => ({ ...prev, is_anonymous: e.target.checked }))}
                className="w-5 h-5 text-purple-500 rounded"
              />
              <div className="flex items-center gap-2">
                {formData.is_anonymous ? <EyeOff size={18} className="text-gray-500" /> : <Eye size={18} className="text-gray-500" />}
                <span className="text-sm text-gray-700">إرسال كهدية مجهولة المصدر</span>
              </div>
            </label>

            {/* زر الإرسال */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
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
