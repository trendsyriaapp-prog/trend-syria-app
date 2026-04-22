/**
 * نافذة تنبيه المنطقة غير المتاحة
 * ================================
 * 
 * تظهر عند محاولة الطلب من منطقة غير مخدومة حالياً
 * 
 * للإزالة لاحقاً: احذف هذا الملف واستدعاءاته
 */

import { MapPin, Rocket, X } from 'lucide-react';

const RegionBlockedModal = ({ isOpen, onClose, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* خلفية معتمة */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* المحتوى */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
        {/* زر الإغلاق */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
          data-testid="close-region-blocked-modal"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        {/* الأيقونة */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center">
              <Rocket className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        {/* العنوان */}
        <h2 className="text-xl font-bold text-gray-800 text-center mb-3">
          قريباً في منطقتك!
        </h2>

        {/* الرسالة */}
        <p className="text-gray-600 text-center leading-relaxed mb-6">
          {message || 'نحن نعمل على التوسع! الخدمة ستكون متاحة في منطقتك قريباً جداً. تابعنا للحصول على آخر التحديثات!'}
        </p>

        {/* معلومات إضافية */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-[#FF6B00] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-gray-700 font-medium mb-1">
                المناطق المتاحة حالياً
              </p>
              <p className="text-xs text-gray-500">
                نخدم حالياً مناطق محددة في حلب ونتوسع باستمرار
              </p>
            </div>
          </div>
        </div>

        {/* زر الإغلاق */}
        <button
          onClick={onClose}
          className="w-full py-3.5 bg-gradient-to-r from-[#FF6B00] to-[#FF8533] text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-orange-200 transition-all active:scale-[0.98]"
          data-testid="region-blocked-ok-button"
        >
          حسناً، فهمت
        </button>

        {/* نص إضافي */}
        <p className="text-center text-xs text-gray-400 mt-4">
          يمكنك متابعة التصفح وإضافة المنتجات للمفضلة
        </p>
      </div>
    </div>
  );
};

export default RegionBlockedModal;
