// /app/frontend/src/components/delivery/ReportDriverModal.js
// نافذة البلاغ الأخلاقي ضد موظف التوصيل

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  X, AlertTriangle, Send, Loader2, CheckCircle,
  ShieldAlert, UserX, Banknote, HelpCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;

const REPORT_CATEGORIES = [
  { id: 'سلوك_غير_لائق', label: 'سلوك غير لائق', icon: UserX, color: 'yellow' },
  { id: 'تحرش', label: 'تحرش', icon: ShieldAlert, color: 'red' },
  { id: 'سرقة_احتيال', label: 'سرقة / احتيال', icon: Banknote, color: 'red' },
  { id: 'أخرى', label: 'أخرى', icon: HelpCircle, color: 'gray' },
];

const ReportDriverModal = ({ 
  isOpen, 
  onClose, 
  driverId, 
  driverName,
  orderId,
  onSuccess 
}) => {
  const { token } = useAuth();
  const [category, setCategory] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!category) {
      setError('يرجى اختيار نوع البلاغ');
      return;
    }
    if (!details || details.trim().length < 10) {
      setError('يرجى كتابة تفاصيل البلاغ (10 أحرف على الأقل)');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await axios.post(`${API}/api/delivery/report-driver`, {
        driver_id: driverId,
        order_id: orderId,
        category,
        details: details.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSubmitted(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'حدث خطأ في إرسال البلاغ');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setCategory('');
      setDetails('');
      setError('');
      setSubmitted(false);
      onClose();
    }
  };

  if (!isOpen) return null;

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
          className="bg-white rounded-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {submitted ? (
            // رسالة النجاح
            <div className="p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <CheckCircle size={40} className="text-orange-500" />
              </motion.div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">تم إرسال البلاغ</h3>
              <p className="text-gray-500 text-sm">سيتم مراجعة البلاغ من قبل الإدارة واتخاذ الإجراء المناسب.</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="bg-gradient-to-l from-red-500 to-red-600 p-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <AlertTriangle size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold">بلاغ أخلاقي</h3>
                      <p className="text-xs text-white/80">ضد: {driverName}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleClose}
                    className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 border-b border-yellow-100 p-3">
                <p className="text-xs text-yellow-800 text-center">
                  ⚠️ سيتم تعليق حساب موظف التوصيل فوراً لحين مراجعة البلاغ من الإدارة
                </p>
              </div>

              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Category Selection */}
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-2 block">نوع البلاغ *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {REPORT_CATEGORIES.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setCategory(cat.id)}
                          className={`p-3 rounded-xl border-2 text-right transition-all ${
                            isSelected
                              ? 'border-red-500 bg-red-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          data-testid={`report-category-${cat.id}`}
                        >
                          <div className="flex items-center gap-2">
                            <Icon size={18} className={isSelected ? 'text-red-500' : 'text-gray-400'} />
                            <span className={`text-sm font-medium ${isSelected ? 'text-red-700' : 'text-gray-700'}`}>
                              {cat.label}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Details */}
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-2 block">تفاصيل البلاغ *</label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    placeholder="اشرح ما حدث بالتفصيل..."
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                    rows={4}
                    data-testid="report-details-input"
                  />
                  <p className="text-xs text-gray-400 mt-1">{details.length}/500 حرف (الحد الأدنى 10)</p>
                </div>

                {/* Error */}
                {error && (
                  <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">
                    {error}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleClose}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    data-testid="submit-report-btn"
                  >
                    {submitting ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <>
                        <Send size={18} />
                        إرسال البلاغ
                      </>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReportDriverModal;
