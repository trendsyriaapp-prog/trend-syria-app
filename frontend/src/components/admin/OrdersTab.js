// /app/frontend/src/components/admin/OrdersTab.js
import { useState } from 'react';
import { ShoppingBag, X, User, MapPin, Phone, Calendar, Package, CreditCard, Truck, Eye } from 'lucide-react';

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const getStatusInfo = (status) => {
  const statusMap = {
    'pending': { label: 'قيد الانتظار', bg: 'bg-yellow-100', text: 'text-yellow-600' },
    'pending_payment': { label: 'بانتظار الدفع', bg: 'bg-yellow-100', text: 'text-yellow-600' },
    'paid': { label: 'مدفوع', bg: 'bg-green-100', text: 'text-green-600' },
    'confirmed': { label: 'مؤكد', bg: 'bg-blue-100', text: 'text-blue-600' },
    'processing': { label: 'قيد التجهيز', bg: 'bg-purple-100', text: 'text-purple-600' },
    'ready': { label: 'جاهز', bg: 'bg-indigo-100', text: 'text-indigo-600' },
    'on_the_way': { label: 'في الطريق', bg: 'bg-cyan-100', text: 'text-cyan-600' },
    'delivered': { label: 'تم التوصيل', bg: 'bg-green-100', text: 'text-green-600' },
    'cancelled': { label: 'ملغي', bg: 'bg-red-100', text: 'text-red-600' },
    'refunded': { label: 'مسترد', bg: 'bg-gray-100', text: 'text-gray-600' },
  };
  return statusMap[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-600' };
};

const OrdersTab = ({ allOrders }) => {
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filter, setFilter] = useState('all');

  const filteredOrders = filter === 'all' 
    ? allOrders 
    : allOrders.filter(o => o.status === filter);

  return (
    <section>
      {/* فلاتر الحالة */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {[
          { id: 'all', label: 'الكل' },
          { id: 'pending', label: 'قيد الانتظار' },
          { id: 'paid', label: 'مدفوع' },
          { id: 'on_the_way', label: 'في الطريق' },
          { id: 'delivered', label: 'تم التوصيل' },
          { id: 'cancelled', label: 'ملغي' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-2.5 py-1 rounded-full text-[10px] transition-colors ${
              filter === f.id
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
          <ShoppingBag size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">لا يوجد طلبات</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredOrders.map((order) => {
            const status = getStatusInfo(order.status);
            return (
              <div 
                key={order.id} 
                className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:border-orange-300 hover:shadow-sm transition-all"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900">#{order.id?.slice(0, 8)}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>
                      {status.label}
                    </span>
                  </div>
                  <Eye size={16} className="text-gray-400" />
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1 text-gray-600">
                    <User size={12} />
                    <span className="truncate">{order.user_name || 'غير محدد'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <MapPin size={12} />
                    <span className="truncate">{order.city || 'غير محدد'}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                  <p className="text-[#FF6B00] font-bold text-sm">{formatPrice(order.total)}</p>
                  <p className="text-[10px] text-gray-400">
                    {order.created_at ? new Date(order.created_at).toLocaleDateString('ar-SY', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : '-'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* نافذة تفاصيل الطلب */}
      {selectedOrder && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          onClick={() => setSelectedOrder(null)}
        >
          <div 
            className="bg-white rounded-t-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">تفاصيل الطلب</h3>
                <p className="text-xs text-gray-500">#{selectedOrder.id?.slice(0, 8)}</p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* الحالة */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <span className="text-sm text-gray-600">حالة الطلب</span>
                <span className={`text-xs px-3 py-1 rounded-full ${getStatusInfo(selectedOrder.status).bg} ${getStatusInfo(selectedOrder.status).text}`}>
                  {getStatusInfo(selectedOrder.status).label}
                </span>
              </div>

              {/* معلومات العميل */}
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-600 font-medium mb-2 flex items-center gap-1">
                  <User size={14} /> معلومات العميل
                </p>
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">{selectedOrder.user_name || 'غير محدد'}</p>
                  {selectedOrder.user_phone && (
                    <a href={`tel:${selectedOrder.user_phone}`} className="text-sm text-blue-600 flex items-center gap-1">
                      <Phone size={12} /> {selectedOrder.user_phone}
                    </a>
                  )}
                </div>
              </div>

              {/* عنوان التوصيل */}
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-green-600 font-medium mb-2 flex items-center gap-1">
                  <MapPin size={14} /> عنوان التوصيل
                </p>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{selectedOrder.city || 'غير محدد'}</p>
                  {selectedOrder.address && (
                    <p className="text-xs text-gray-600">{selectedOrder.address}</p>
                  )}
                  {selectedOrder.delivery_address && (
                    <p className="text-xs text-gray-600">{selectedOrder.delivery_address}</p>
                  )}
                </div>
              </div>

              {/* المنتجات */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-xs text-purple-600 font-medium mb-2 flex items-center gap-1">
                    <Package size={14} /> المنتجات ({selectedOrder.items.length})
                  </p>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white rounded p-2">
                        <div className="flex items-center gap-2">
                          {item.image && (
                            <img src={item.image} alt={item.name} className="w-10 h-10 rounded object-cover" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{item.name || item.product_name}</p>
                            <p className="text-[10px] text-gray-500">الكمية: {item.quantity}</p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-orange-600">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* معلومات التوصيل */}
              {selectedOrder.driver_name && (
                <div className="bg-cyan-50 rounded-lg p-3">
                  <p className="text-xs text-cyan-600 font-medium mb-2 flex items-center gap-1">
                    <Truck size={14} /> معلومات التوصيل
                  </p>
                  <div className="space-y-1">
                    <p className="text-sm">السائق: <span className="font-medium">{selectedOrder.driver_name}</span></p>
                    {selectedOrder.driver_phone && (
                      <a href={`tel:${selectedOrder.driver_phone}`} className="text-sm text-cyan-600 flex items-center gap-1">
                        <Phone size={12} /> {selectedOrder.driver_phone}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* الملخص المالي */}
              <div className="bg-orange-50 rounded-lg p-3">
                <p className="text-xs text-orange-600 font-medium mb-2 flex items-center gap-1">
                  <CreditCard size={14} /> الملخص المالي
                </p>
                <div className="space-y-1.5">
                  {selectedOrder.subtotal && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">المجموع الفرعي</span>
                      <span>{formatPrice(selectedOrder.subtotal)}</span>
                    </div>
                  )}
                  {selectedOrder.delivery_fee !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">رسوم التوصيل</span>
                      <span>{formatPrice(selectedOrder.delivery_fee)}</span>
                    </div>
                  )}
                  {selectedOrder.discount && selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>الخصم</span>
                      <span>-{formatPrice(selectedOrder.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold pt-2 border-t border-orange-200">
                    <span>الإجمالي</span>
                    <span className="text-orange-600">{formatPrice(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

              {/* التاريخ */}
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <Calendar size={12} />
                <span>
                  {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleDateString('ar-SY', {
                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  }) : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default OrdersTab;
