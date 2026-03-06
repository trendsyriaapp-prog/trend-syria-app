// /app/frontend/src/components/delivery/MyBoxCard.js
// بطاقة معلومات صندوق التوصيل للموظف

import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Package, DollarSign, Calendar, CheckCircle, 
  Clock, TrendingUp, ChevronDown, ChevronUp
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ar-SY');
};

const MyBoxCard = () => {
  const [loading, setLoading] = useState(true);
  const [boxData, setBoxData] = useState(null);
  const [showPayments, setShowPayments] = useState(false);

  useEffect(() => {
    fetchBoxData();
  }, []);

  const fetchBoxData = async () => {
    try {
      const res = await axios.get(`${API}/api/delivery-boxes/my-box`);
      setBoxData(res.data);
    } catch (error) {
      console.error('Error fetching box data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
        <div className="h-20 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (!boxData?.has_box) {
    return (
      <div className="bg-gradient-to-l from-gray-100 to-gray-50 rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
            <Package size={24} className="text-gray-400" />
          </div>
          <div>
            <h3 className="font-bold text-gray-700">صندوق التوصيل</h3>
            <p className="text-sm text-gray-500">لم يتم تعيين صندوق لك بعد</p>
          </div>
        </div>
        
        <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600 mb-2">
            <strong>نظام الصناديق:</strong>
          </p>
          <ul className="text-xs text-gray-500 space-y-1">
            <li>• إيداع: {formatPrice(boxData?.settings?.deposit_amount || 30000)}</li>
            <li>• قسط شهري: {formatPrice(boxData?.settings?.monthly_installment || 3000)}</li>
            <li>• بعد {boxData?.settings?.total_installments || 10} شهور: الصندوق ملكك!</li>
          </ul>
        </div>
      </div>
    );
  }

  const isOwned = boxData.is_owned;
  const progressColor = isOwned ? 'from-green-500 to-emerald-500' : 'from-orange-500 to-amber-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border overflow-hidden ${
        isOwned ? 'bg-gradient-to-l from-green-50 to-emerald-50 border-green-200' : 'bg-white border-gray-200'
      }`}
    >
      {/* Header */}
      <div className={`p-4 bg-gradient-to-l ${progressColor} text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Package size={24} />
            </div>
            <div>
              <h3 className="font-bold">صندوقي</h3>
              <p className="text-sm text-white/80">#{boxData.box_serial}</p>
            </div>
          </div>
          
          {isOwned ? (
            <div className="bg-white/20 px-3 py-1 rounded-full flex items-center gap-1">
              <CheckCircle size={14} />
              <span className="text-sm font-bold">مُلك</span>
            </div>
          ) : (
            <div className="text-left">
              <p className="text-2xl font-bold">{boxData.progress_percent}%</p>
              <p className="text-xs text-white/80">للتملك</p>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar (if not owned) */}
      {!isOwned && (
        <div className="px-4 py-2 bg-gray-50">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${boxData.progress_percent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full bg-gradient-to-l ${progressColor} rounded-full`}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-gray-500">
            <span>المدفوع: {formatPrice(boxData.total_paid)}</span>
            <span>المتبقي: {formatPrice(boxData.remaining)}</span>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="p-4 grid grid-cols-3 gap-3">
        <div className="text-center">
          <DollarSign size={16} className="mx-auto text-gray-400 mb-1" />
          <p className="text-sm font-bold text-gray-900">{formatPrice(boxData.deposit_paid)}</p>
          <p className="text-xs text-gray-500">الإيداع</p>
        </div>
        <div className="text-center">
          <TrendingUp size={16} className="mx-auto text-gray-400 mb-1" />
          <p className="text-sm font-bold text-gray-900">{boxData.installments_count || 0}</p>
          <p className="text-xs text-gray-500">أقساط مدفوعة</p>
        </div>
        <div className="text-center">
          <Clock size={16} className="mx-auto text-gray-400 mb-1" />
          <p className="text-sm font-bold text-gray-900">{boxData.remaining_installments || 0}</p>
          <p className="text-xs text-gray-500">أقساط متبقية</p>
        </div>
      </div>

      {/* Info */}
      {!isOwned && (
        <div className="px-4 pb-4">
          <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
            <p className="font-bold mb-1">💡 كيف تمتلك الصندوق؟</p>
            <p>ادفع {boxData.remaining_installments} قسط إضافي ({formatPrice(boxData.settings?.monthly_installment || 3000)}/شهر) ويصبح الصندوق ملكك!</p>
          </div>
        </div>
      )}

      {/* Payments History Toggle */}
      {boxData.payments?.length > 0 && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setShowPayments(!showPayments)}
            className="w-full p-3 flex items-center justify-between text-sm text-gray-600 hover:bg-gray-50"
          >
            <span>سجل الدفعات ({boxData.payments.length})</span>
            {showPayments ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {showPayments && (
            <div className="px-4 pb-4 space-y-2">
              {boxData.payments.map((payment, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs">
                  <div>
                    <span className={`px-1.5 py-0.5 rounded ${
                      payment.type === 'deposit' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {payment.type === 'deposit' ? 'إيداع' : 'قسط'}
                    </span>
                    <span className="text-gray-500 mr-2">{formatDate(payment.date)}</span>
                  </div>
                  <span className="font-bold text-gray-900">{formatPrice(payment.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Owned Celebration */}
      {isOwned && (
        <div className="p-4 bg-green-50 border-t border-green-200">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle size={20} />
            <div>
              <p className="font-bold">تهانينا! 🎉</p>
              <p className="text-xs">أصبح الصندوق ملكك منذ {formatDate(boxData.ownership_date)}</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default MyBoxCard;
