import { motion } from 'framer-motion';
import { X, Camera, Sun, Maximize, Image, Check, CheckCircle, AlertTriangle } from 'lucide-react';

const PhotoGuideModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Camera className="text-[#FF6B00]" size={20} />
            <h2 className="font-bold text-gray-900">دليل تصوير المنتجات</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Stats */}
          <div className="bg-gradient-to-r from-[#FF6B00] to-orange-500 text-white rounded-xl p-4 text-center">
            <p className="text-2xl font-bold">+60%</p>
            <p className="text-sm opacity-90">زيادة في المبيعات مع صور احترافية</p>
          </div>

          {/* Good Examples */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-3">
            <h3 className="font-bold text-green-800 flex items-center gap-2 mb-3">
              <CheckCircle size={16} />
              صور صحيحة
            </h3>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">
                <div className="aspect-square bg-white rounded-lg border-2 border-green-300 flex items-center justify-center mb-1">
                  <div className="w-8 h-10 bg-gray-300 rounded"></div>
                </div>
                <p className="text-[9px] text-green-700">خلفية بيضاء</p>
              </div>
              <div className="text-center">
                <div className="aspect-square bg-white rounded-lg border-2 border-green-300 flex items-center justify-center mb-1">
                  <div className="w-6 h-10 bg-blue-200 rounded relative">
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-pink-200 rounded-full"></div>
                  </div>
                </div>
                <p className="text-[9px] text-green-700">على موديل</p>
              </div>
              <div className="text-center">
                <div className="aspect-square bg-white rounded-lg border-2 border-green-300 flex items-center justify-center mb-1">
                  <div className="w-10 h-6 bg-gray-400 rounded-sm"></div>
                </div>
                <p className="text-[9px] text-green-700">تفاصيل قريبة</p>
              </div>
              <div className="text-center">
                <div className="aspect-square bg-white rounded-lg border-2 border-green-300 flex items-center justify-center mb-1">
                  <Sun size={20} className="text-yellow-500" />
                </div>
                <p className="text-[9px] text-green-700">إضاءة جيدة</p>
              </div>
            </div>
          </div>

          {/* Bad Examples */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <h3 className="font-bold text-red-800 flex items-center gap-2 mb-3">
              <AlertTriangle size={16} />
              صور خاطئة
            </h3>
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">
                <div className="aspect-square bg-gradient-to-br from-blue-200 via-pink-200 to-yellow-200 rounded-lg border-2 border-red-300 flex items-center justify-center mb-1">
                  <div className="w-6 h-8 bg-gray-400 rounded opacity-50"></div>
                </div>
                <p className="text-[9px] text-red-700">خلفية فوضوية</p>
              </div>
              <div className="text-center">
                <div className="aspect-square bg-gray-700 rounded-lg border-2 border-red-300 flex items-center justify-center mb-1">
                  <div className="w-6 h-8 bg-gray-600 rounded"></div>
                </div>
                <p className="text-[9px] text-red-700">إضاءة ضعيفة</p>
              </div>
              <div className="text-center">
                <div className="aspect-square bg-white rounded-lg border-2 border-red-300 flex items-center justify-center mb-1 blur-[2px]">
                  <div className="w-6 h-8 bg-gray-400 rounded"></div>
                </div>
                <p className="text-[9px] text-red-700">صورة ضبابية</p>
              </div>
              <div className="text-center">
                <div className="aspect-square bg-white rounded-lg border-2 border-red-300 flex items-center justify-center mb-1">
                  <div className="w-3 h-4 bg-gray-400 rounded"></div>
                </div>
                <p className="text-[9px] text-red-700">المنتج بعيد</p>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <h3 className="font-bold text-blue-800 mb-2">نصائح سريعة</h3>
            <ul className="space-y-1.5 text-sm text-blue-900">
              <li className="flex items-start gap-2">
                <Sun size={14} className="text-yellow-500 mt-0.5 flex-shrink-0" />
                <span>صوّر بجانب النافذة للحصول على إضاءة طبيعية</span>
              </li>
              <li className="flex items-start gap-2">
                <Image size={14} className="text-gray-500 mt-0.5 flex-shrink-0" />
                <span>استخدم ورقة بيضاء أو قماش أبيض كخلفية</span>
              </li>
              <li className="flex items-start gap-2">
                <Maximize size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                <span>اجعل المنتج يشغل 80% من الصورة</span>
              </li>
              <li className="flex items-start gap-2">
                <Camera size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <span>ارفع 3-5 صور من زوايا مختلفة</span>
              </li>
            </ul>
          </div>

          {/* Requirements */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <h3 className="font-bold text-gray-800 mb-2">متطلبات الصور</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <Check size={12} className="text-green-500" />
                <span>الحد الأدنى: 800×800 بكسل</span>
              </div>
              <div className="flex items-center gap-1">
                <Check size={12} className="text-green-500" />
                <span>الصيغ: JPG, PNG, WebP</span>
              </div>
              <div className="flex items-center gap-1">
                <Check size={12} className="text-green-500" />
                <span>الحجم الأقصى: 5 ميجابايت</span>
              </div>
              <div className="flex items-center gap-1">
                <Check size={12} className="text-green-500" />
                <span>النسبة: 1:1 (مربع) مفضلة</span>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={onClose}
            className="w-full bg-[#FF6B00] text-white font-bold py-3 rounded-xl hover:bg-[#E65000] transition-colors"
          >
            فهمت، بدء رفع الصور
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default PhotoGuideModal;
