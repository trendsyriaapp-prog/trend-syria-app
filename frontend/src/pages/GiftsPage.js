// /app/frontend/src/pages/GiftsPage.js
// صفحة الهدايا المستلمة والمرسلة

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  Gift, Send, Inbox, Check, X, Loader2, 
  ChevronRight, User, MessageSquare, Clock,
  Sparkles, Package, Heart
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { useLanguage } from '../context/LanguageContext';

const API = process.env.REACT_APP_BACKEND_URL;

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

  // جلب الهدايا
  useEffect(() => {
    if (!user || !token) {
      navigate('/login');
      return;
    }
    fetchGifts();
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

  // قبول الهدية
  const acceptGift = async (giftId) => {
    setProcessingId(giftId);
    try {
      await axios.post(`${API}/api/gifts/${giftId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({
        title: '🎉 تم قبول الهدية!',
        description: 'يمكنك الآن رؤية هديتك'
      });
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
      accepted: { text: 'مقبولة', color: 'bg-green-100 text-green-700' },
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

                      {/* بعد القبول - عرض المنتج */}
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
    </div>
  );
};

export default GiftsPage;
