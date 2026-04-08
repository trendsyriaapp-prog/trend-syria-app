// /app/frontend/src/pages/DeleteAccountPage.js
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Trash2, AlertTriangle, ArrowRight, CheckCircle } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;

const DeleteAccountPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [step, setStep] = useState(0);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== 'حذف حسابي') {
      toast({ title: "خطأ", description: "كلمة التأكيد غير صحيحة", variant: "destructive" });
      return;
    }

    setDeleting(true);
    try {
      await axios.delete(`${API}/api/auth/delete-account`);
      setDeleted(true);
      toast({ title: "تم", description: "تم حذف حسابك بنجاح" });
      // تسجيل الخروج بعد 3 ثواني
      setTimeout(() => {
        logout();
        navigate('/');
      }, 3000);
    } catch (error) {
      toast({ 
        title: "خطأ", 
        description: error.response?.data?.detail || "فشل حذف الحساب", 
        variant: "destructive" 
      });
    } finally {
      setDeleting(false);
    }
  };

  // إذا لم يكن مسجل دخول
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-xl p-6 max-w-md w-full text-center shadow-lg">
          <AlertTriangle size={48} className="text-yellow-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">تسجيل الدخول مطلوب</h1>
          <p className="text-gray-600 mb-4">يجب تسجيل الدخول أولاً لحذف حسابك</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full py-3 bg-orange-500 text-white rounded-lg font-bold"
          >
            تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  // تم الحذف بنجاح
  if (deleted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white rounded-xl p-6 max-w-md w-full text-center shadow-lg">
          <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-green-700 mb-2">تم حذف حسابك</h1>
          <p className="text-gray-600">سيتم تحويلك للصفحة الرئيسية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-red-500 text-white p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowRight size={24} />
          </button>
          <h1 className="text-lg font-bold">حذف الحساب</h1>
        </div>
      </div>

      <div className="p-4 max-w-md mx-auto">
        {/* معلومات المستخدم */}
        <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
          <p className="text-sm text-gray-500">الحساب:</p>
          <p className="font-bold">{user.full_name || user.name}</p>
          <p className="text-sm text-gray-600">{user.phone}</p>
        </div>

        {step === 0 && (
          <>
            {/* تحذير */}
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-red-500 mt-1" size={24} />
                <div>
                  <h2 className="font-bold text-red-800 mb-2">تحذير مهم!</h2>
                  <p className="text-sm text-red-700">
                    حذف الحساب إجراء نهائي ولا يمكن التراجع عنه.
                  </p>
                </div>
              </div>
            </div>

            {/* ما سيتم حذفه */}
            <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
              <h3 className="font-bold mb-3">سيتم حذف:</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-red-500">❌</span>
                  جميع بياناتك الشخصية
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-500">❌</span>
                  سجل طلباتك
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-500">❌</span>
                  رصيد محفظتك
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-500">❌</span>
                  عناوينك المحفوظة
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-500">❌</span>
                  المنتجات المفضلة
                </li>
              </ul>
            </div>

            <button
              onClick={() => setStep(1)}
              className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition-all"
            >
              أفهم، أريد المتابعة
            </button>

            <button
              onClick={() => navigate(-1)}
              className="w-full py-3 mt-2 border border-gray-300 rounded-lg font-bold text-gray-700"
            >
              إلغاء
            </button>
          </>
        )}

        {step === 1 && (
          <>
            <div className="bg-white rounded-xl p-4 mb-4 shadow-sm text-center">
              <Trash2 size={48} className="text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-bold mb-2">التأكيد النهائي</h2>
              <p className="text-sm text-gray-600 mb-4">
                اكتب "<span className="font-bold text-red-600">حذف حسابي</span>" للتأكيد
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="اكتب هنا..."
                className="w-full border-2 border-gray-300 rounded-lg py-3 px-4 text-center focus:border-red-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleDelete}
              disabled={deleting || confirmText !== 'حذف حسابي'}
              className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {deleting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  جاري الحذف...
                </>
              ) : (
                <>
                  <Trash2 size={20} />
                  حذف حسابي نهائياً
                </>
              )}
            </button>

            <button
              onClick={() => setStep(0)}
              className="w-full py-3 mt-2 border border-gray-300 rounded-lg font-bold text-gray-700"
              disabled={deleting}
            >
              رجوع
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default DeleteAccountPage;
