// /app/frontend/src/components/seller/WithdrawModal.js
// مكون نافذة طلب السحب

import { useState } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useToast } from '../../hooks/use-toast';
import { getErrorMessage } from '../../utils/errorHelpers';

const API = process.env.REACT_APP_BACKEND_URL;

const WithdrawModal = ({ balance, onClose, onSuccess, token }) => {
  const { toast } = useToast();
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [shamcashPhone, setShamcashPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const minWithdrawal = 50000;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const amount = parseInt(withdrawAmount);
    if (amount < minWithdrawal) {
      toast({ title: "خطأ", description: `الحد الأدنى للسحب ${minWithdrawal.toLocaleString()} ل.س`, variant: "destructive" });
      return;
    }
    if (amount > balance) {
      toast({ title: "خطأ", description: "المبلغ أكبر من الرصيد المتاح", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/api/wallet/withdraw`, {
        amount,
        shamcash_phone: shamcashPhone
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: "تم الإرسال", description: "تم إرسال طلب السحب بنجاح" });
      onSuccess();
    } catch (error) {
      toast({ title: "خطأ", description: getErrorMessage(error, "فشل إرسال الطلب"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl p-6 w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900 mb-4">طلب سحب</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">المبلغ (ل.س)</label>
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              placeholder="مثال: 50000"
              className="w-full p-3 border border-gray-300 rounded-xl text-lg"
              required
              min={minWithdrawal}
            />
            <p className="text-xs text-gray-400 mt-1">
              الحد الأدنى: {minWithdrawal.toLocaleString()} ل.س | المتاح: {balance.toLocaleString()} ل.س
            </p>
          </div>
          
          <div>
            <label className="block text-sm text-gray-600 mb-1">رقم شام كاش</label>
            <input
              type="tel"
              value={shamcashPhone}
              onChange={(e) => setShamcashPhone(e.target.value)}
              placeholder="09XXXXXXXX"
              className="w-full p-3 border border-gray-300 rounded-xl"
              required
            />
          </div>
          
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-[#FF6B00] text-white font-bold py-3 rounded-xl disabled:opacity-50"
            >
              {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl"
            >
              إلغاء
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default WithdrawModal;
