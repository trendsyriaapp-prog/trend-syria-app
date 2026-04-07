import { motion } from 'framer-motion';
import { X, Clock, Package } from 'lucide-react';
import { formatPrice } from '../../utils/imageHelpers';
import { useEffect } from 'react';

const StatDetailsModal = ({ 
  activeStatView, 
  onClose, 
  products, 
  orders, 
  totalSales, 
  paidOrders 
}) => {
  // منع scroll الصفحة عند فتح المودال
  useEffect(() => {
    if (activeStatView) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [activeStatView]);

  if (!activeStatView) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-3"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-3 flex items-center justify-between">
          <h2 className="font-bold text-sm text-gray-900">
            {activeStatView === 'products' && 'منتجاتي'}
            {activeStatView === 'paid_orders' && 'الطلبات المدفوعة'}
            {activeStatView === 'sales' && 'تفاصيل المبيعات'}
            {activeStatView === 'pending_orders' && 'الطلبات المعلقة'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 overflow-y-auto max-h-[calc(80vh-60px)]">
          {/* Products View */}
          {activeStatView === 'products' && (
            <div className="space-y-2">
              {products.length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-4">لا توجد منتجات</p>
              ) : (
                products.map((product) => (
                  <div key={product.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <img
                      src={product.images?.[0] || '/placeholder.svg'}
                      alt={product.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-gray-900 truncate">{product.name}</p>
                      <p className="text-[10px] text-gray-500">المخزون: {product.stock} | السعر: {formatPrice(product.price)}</p>
                    </div>
                    <span className={`text-[9px] px-2 py-0.5 rounded-full ${
                      product.approval_status === 'approved' ? 'bg-green-100 text-green-600' :
                      product.approval_status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {product.approval_status === 'approved' ? 'تم النشر' :
                       product.approval_status === 'pending' ? 'معلق' : 'مرفوض'}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Paid Orders View */}
          {activeStatView === 'paid_orders' && (
            <div className="space-y-2">
              {orders.filter(o => o.payment_status === 'paid').length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-4">لا توجد طلبات مدفوعة</p>
              ) : (
                orders.filter(o => o.payment_status === 'paid').map((order) => (
                  <div key={order.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs text-gray-900">طلب #{order.id?.slice(-6)}</span>
                      <span className="bg-green-100 text-green-600 text-[9px] px-2 py-0.5 rounded-full">مدفوع</span>
                    </div>
                    <p className="text-[10px] text-gray-500">{order.items?.length || 0} منتج</p>
                    <p className="text-xs font-bold text-[#FF6B00]">{formatPrice(order.total)}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Sales View */}
          {activeStatView === 'sales' && (
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-4 text-white text-center">
                <p className="text-sm opacity-90">إجمالي المبيعات</p>
                <p className="text-2xl font-bold">{formatPrice(totalSales)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-green-600">{paidOrders}</p>
                  <p className="text-[10px] text-green-700">طلبات مكتملة</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-blue-600">{products.reduce((sum, p) => sum + (p.sales_count || 0), 0)}</p>
                  <p className="text-[10px] text-blue-700">منتجات مباعة</p>
                </div>
              </div>
              <h3 className="font-bold text-xs text-gray-700 mt-3">أكثر المنتجات مبيعاً</h3>
              {products.sort((a, b) => (b.sales_count || 0) - (a.sales_count || 0)).slice(0, 5).map((product) => (
                <div key={product.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                  <img
                    src={product.images?.[0] || '/placeholder.svg'}
                    alt={product.name}
                    className="w-10 h-10 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs text-gray-900 truncate">{product.name}</p>
                    <p className="text-[10px] text-gray-500">{formatPrice(product.price)}</p>
                  </div>
                  <span className="text-xs font-bold text-[#FF6B00]">{product.sales_count || 0} مبيعات</span>
                </div>
              ))}
            </div>
          )}

          {/* Pending Orders View */}
          {activeStatView === 'pending_orders' && (
            <div className="space-y-2">
              {orders.filter(o => o.delivery_status === 'pending').length === 0 ? (
                <p className="text-center text-gray-500 text-sm py-4">لا توجد طلبات معلقة</p>
              ) : (
                orders.filter(o => o.delivery_status === 'pending').map((order) => (
                  <div key={order.id} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-xs text-gray-900">طلب #{order.id?.slice(-6)}</span>
                      <span className="bg-yellow-100 text-yellow-700 text-[9px] px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock size={10} />
                        معلق
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-600">{order.customer_name || 'عميل'}</p>
                    <p className="text-[10px] text-gray-500">{order.items?.length || 0} منتج</p>
                    <p className="text-xs font-bold text-[#FF6B00] mt-1">{formatPrice(order.total)}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default StatDetailsModal;
