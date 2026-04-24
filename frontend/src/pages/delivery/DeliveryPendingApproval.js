// /app/frontend/src/pages/delivery/DeliveryPendingApproval.js
// صفحة انتظار موافقة الإدارة على الوثائق

import { useState, useEffect } from 'react';
import logger from '../../lib/logger';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { Clock, Check, LogOut } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

const DeliveryPendingApproval = () => {
  const { user, logout, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  // التحقق من الحالة عند تحميل الصفحة
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }
    // فحص مبدئي
    checkStatus();
  }, [authLoading, user]);

  const checkStatus = async () => {
    setChecking(true);
    try {
      const res = await axios.get(`${API}/api/delivery/documents/status`);
      const status = res.data.status;
      
      if (status === 'approved') {
        toast({
          title: "🎉 تمت الموافقة!",
          description: "تم قبول طلبك، يمكنك الآن البدء بالعمل"
        });
        navigate('/delivery/dashboard', { replace: true });
      } else if (status === 'rejected') {
        toast({
          title: "❌ تم رفض الطلب",
          description: res.data.rejection_reason || "يرجى مراجعة الإدارة",
          variant: "destructive"
        });
        navigate('/delivery/documents', { replace: true });
      } else if (!status || status === 'not_submitted') {
        navigate('/delivery/documents', { replace: true });
      }
      // إذا كان pending، نبقى في هذه الصفحة
    } catch (error) {
      if (error.response?.status === 404) {
        navigate('/delivery/documents', { replace: true });
      }
      logger.error('Error checking status:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // انتظار تحميل بيانات المستخدم
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }

  // إذا لم يكن هناك مستخدم
  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center"
      >
        {/* أيقونة الانتظار */}
        <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock size={48} className="text-yellow-600" />
        </div>
        
        {/* العنوان */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">جاري مراجعة وثائقك</h1>
        <p className="text-gray-600 mb-6">
          تم استلام وثائقك بنجاح وهي قيد المراجعة من قبل الإدارة.
          <br />
          سيتم إعلامك فور اتخاذ القرار.
        </p>
        
        {/* معلومات المستخدم */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-500">الحساب</p>
          <p className="font-bold text-gray-900">{user?.name || user?.full_name}</p>
          <p className="text-gray-600">{user?.phone}</p>
        </div>
        
        {/* ملاحظة */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-right">
          <p className="text-blue-800 text-sm">
            <strong>ملاحظة:</strong> عادة تستغرق المراجعة من ساعة إلى 24 ساعة.
            يمكنك الضغط على "تحقق من الحالة" للتحديث.
          </p>
        </div>
        
        {/* الأزرار */}
        <div className="space-y-3">
          <button
            onClick={checkStatus}
            disabled={checking}
            className="w-full bg-[#FF6B00] text-white py-3 rounded-xl font-bold hover:bg-[#e55f00] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {checking ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check size={20} />
                تحقق من الحالة
              </>
            )}
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={20} />
            تسجيل الخروج
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default DeliveryPendingApproval;
