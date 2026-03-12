// صفحة نجاح الطلب المجمع
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check, Package, Truck, Clock, Home, Store } from 'lucide-react';

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const FoodBatchSuccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { batchId, orders = [], totalAmount = 0, storesCount = 0 } = location.state || {};
  
  if (!batchId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-500 mb-4">لا توجد بيانات للعرض</p>
          <button
            onClick={() => navigate('/food')}
            className="bg-[#FF6B00] text-white px-6 py-2 rounded-full font-bold"
          >
            تصفح المطاعم
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white pb-20">
      {/* Success Animation */}
      <div className="flex flex-col items-center justify-center pt-12 pb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-lg"
        >
          <Check size={48} className="text-white" />
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl font-bold text-gray-900 mb-2"
        >
          🎉 تم إنشاء طلباتك بنجاح!
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-gray-500 text-center"
        >
          رقم الدفعة: <span className="font-bold text-[#FF6B00]">{batchId}</span>
        </motion.p>
      </div>
      
      <div className="px-4 space-y-4">
        {/* ملخص الدفعة */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
        >
          <div className="bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <Package size={24} />
                </div>
                <div>
                  <p className="font-bold text-lg">{storesCount} طلب</p>
                  <p className="text-orange-100 text-sm">من متاجر مختلفة</p>
                </div>
              </div>
              <div className="text-left">
                <p className="text-orange-100 text-xs">الإجمالي</p>
                <p className="font-bold text-xl">{formatPrice(totalAmount)}</p>
              </div>
            </div>
          </div>
          
          {/* تفاصيل الطلبات */}
          <div className="divide-y divide-gray-100">
            {orders.map((order, idx) => (
              <div key={order.order_id} className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-[#FF6B00] font-bold">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{order.store_name}</p>
                  <p className="text-xs text-gray-500">#{order.order_number}</p>
                </div>
                <div className="text-left">
                  <p className="font-bold text-[#FF6B00]">{formatPrice(order.total)}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
        
        {/* معلومات التوصيل */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-blue-50 border border-blue-200 rounded-2xl p-4"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Truck size={20} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-blue-900">كيف يعمل الطلب المجمع؟</p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1">
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  كل متجر يستلم طلبك ويبدأ بتحضيره
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  سائق واحد يقبل جميع الطلبات
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-5 h-5 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  يجمع من جميع المتاجر ويوصلها دفعة واحدة
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
        
        {/* تنبيه الإلغاء */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3"
        >
          <Clock size={24} className="text-amber-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-amber-900 text-sm">مهلة الإلغاء: 3 دقائق</p>
            <p className="text-xs text-amber-700">يمكنك إلغاء جميع الطلبات خلال 3 دقائق من الآن</p>
          </div>
        </motion.div>
        
        {/* الأزرار */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="space-y-3 pt-4"
        >
          <button
            onClick={() => navigate('/orders')}
            className="w-full bg-[#FF6B00] text-white py-4 rounded-xl font-bold hover:bg-[#E65000] transition-colors flex items-center justify-center gap-2"
          >
            <Package size={20} />
            تتبع طلباتي
          </button>
          
          <button
            onClick={() => navigate('/food')}
            className="w-full bg-gray-100 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
          >
            <Store size={20} />
            تصفح المزيد من المطاعم
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="w-full text-gray-500 py-2 text-sm hover:text-gray-700 transition-colors flex items-center justify-center gap-2"
          >
            <Home size={16} />
            العودة للرئيسية
          </button>
        </motion.div>
      </div>
    </div>
  );
};

export default FoodBatchSuccessPage;
