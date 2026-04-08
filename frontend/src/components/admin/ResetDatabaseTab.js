// /app/frontend/src/components/admin/ResetDatabaseTab.js
import { useState } from 'react';
import axios from 'axios';
import { Trash2, AlertTriangle, RefreshCw, CheckCircle } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const ResetDatabaseTab = () => {
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [confirmText, setConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);
  const [result, setResult] = useState(null);

  const handleReset = async () => {
    if (confirmText !== 'أؤكد مسح جميع البيانات') {
      toast({ title: "خطأ", description: "كلمة التأكيد غير صحيحة", variant: "destructive" });
      return;
    }

    setResetting(true);
    try {
      const res = await axios.post(`${API}/api/admin/reset-database`, {
        confirmation: confirmText
      });
      setResult(res.data);
      setStep(3);
      toast({ title: "تم بنجاح", description: "تم مسح قاعدة البيانات" });
    } catch (error) {
      toast({ 
        title: "خطأ", 
        description: error.response?.data?.detail || "فشل مسح قاعدة البيانات", 
        variant: "destructive" 
      });
    } finally {
      setResetting(false);
    }
  };

  const resetForm = () => {
    setStep(0);
    setConfirmText('');
    setResult(null);
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-red-50 border-2 border-red-300 rounded-xl p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
            <Trash2 size={32} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-red-800">مسح قاعدة البيانات</h2>
            <p className="text-sm text-red-600">للأدمن الرئيسي فقط</p>
          </div>
        </div>

        {/* Step 0: Warning */}
        {step === 0 && (
          <>
            <div className="bg-white border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-red-500 mt-1" size={24} />
                <div>
                  <h3 className="font-bold text-red-800 mb-2">تحذير مهم!</h3>
                  <p className="text-sm text-gray-700 mb-3">
                    هذا الإجراء سيحذف جميع البيانات ولا يمكن التراجع عنه.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-red-100 border border-red-300 rounded-lg p-4 mb-4">
              <h4 className="font-bold text-red-800 mb-2">سيتم حذف:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>❌ جميع المستخدمين (ما عدا الأدمن الرئيسي)</li>
                <li>❌ جميع البائعين ومتاجرهم ومنتجاتهم</li>
                <li>❌ جميع موظفي التوصيل ووثائقهم</li>
                <li>❌ جميع أصناف الطعام ومتاجر الطعام</li>
                <li>❌ جميع الطلبات والمعاملات</li>
                <li>❌ جميع المحافظ والأرصدة</li>
                <li>❌ جميع الإشعارات والتقييمات</li>
              </ul>
            </div>

            <div className="bg-green-100 border border-green-300 rounded-lg p-4 mb-6">
              <h4 className="font-bold text-green-800 mb-2">سيبقى:</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>✅ حسابك (الأدمن الرئيسي)</li>
                <li>✅ جميع إعدادات المنصة</li>
                <li>✅ رسائل الشريط العلوي</li>
              </ul>
            </div>

            <button
              onClick={() => setStep(1)}
              className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold text-lg transition-all"
            >
              أفهم المخاطر، متابعة
            </button>
          </>
        )}

        {/* Step 1: First Confirmation */}
        {step === 1 && (
          <>
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={40} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-red-800 mb-2">هل أنت متأكد تماماً؟</h3>
              <p className="text-sm text-gray-600">
                سيتم حذف جميع البيانات نهائياً
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(0)}
                className="flex-1 py-3 border-2 border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50 transition-all"
              >
                إلغاء
              </button>
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition-all"
              >
                نعم، متأكد
              </button>
            </div>
          </>
        )}

        {/* Step 2: Type Confirmation */}
        {step === 2 && (
          <>
            <div className="text-center mb-6">
              <h3 className="text-lg font-bold text-red-800 mb-2">التأكيد النهائي</h3>
              <p className="text-sm text-gray-600 mb-4">
                اكتب العبارة التالية للتأكيد:
              </p>
              <div className="bg-red-100 border-2 border-red-300 rounded-lg py-3 px-4 inline-block">
                <span className="font-bold text-red-700 text-lg">أؤكد مسح جميع البيانات</span>
              </div>
            </div>

            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="اكتب العبارة هنا..."
              className="w-full border-2 border-gray-300 rounded-lg py-3 px-4 text-center text-lg mb-4 focus:border-red-500 focus:outline-none"
              dir="rtl"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 border-2 border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-50 transition-all"
                disabled={resetting}
              >
                رجوع
              </button>
              <button
                onClick={handleReset}
                disabled={resetting || confirmText !== 'أؤكد مسح جميع البيانات'}
                className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {resetting ? (
                  <>
                    <RefreshCw size={20} className="animate-spin" />
                    جاري المسح...
                  </>
                ) : (
                  <>
                    <Trash2 size={20} />
                    مسح الآن
                  </>
                )}
              </button>
            </div>
          </>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <>
            <div className="text-center py-6">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={40} className="text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-green-700 mb-2">تم بنجاح!</h3>
              <p className="text-sm text-gray-600 mb-4">
                تم مسح قاعدة البيانات بالكامل
              </p>
              
              {result?.deleted_counts && (
                <div className="bg-gray-100 rounded-lg p-4 text-right mb-4">
                  <h4 className="font-bold text-gray-700 mb-2">ملخص الحذف:</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    {Object.entries(result.deleted_counts).map(([key, count]) => (
                      count > 0 && (
                        <div key={key} className="flex justify-between">
                          <span>{count}</span>
                          <span>{key}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={resetForm}
              className="w-full py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-bold text-gray-700 transition-all"
            >
              إغلاق
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetDatabaseTab;
