import { useState } from 'react';
import { ShoppingBag, Printer, Clock, Phone, Truck, AlertTriangle } from 'lucide-react';
import { formatPrice } from '../../utils/imageHelpers';
import { DELIVERY_STATUS_COLORS, ORDER_STATUSES } from '../../utils/constants';
import ReportDriverModal from '../delivery/ReportDriverModal';

const SellerOrdersSection = ({ orders, onSellerAction, onPrintLabel }) => {
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 text-center border border-gray-200">
        <ShoppingBag size={32} className="text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500 text-xs">لا توجد طلبات</p>
      </div>
    );
  }

  const getStatusLabel = (status) => {
    const labels = {
      'pending': 'بانتظار الدفع',
      'paid': 'مدفوع - بانتظار التأكيد',
      'confirmed': 'مؤكد',
      'preparing': 'قيد التحضير',
      'ready_for_pickup': 'جاهز للاستلام',
      'shipped': 'تم الشحن',
      'out_for_delivery': 'في الطريق',
      'delivered': 'تم التسليم',
      'cancelled': 'ملغي'
    };
    return labels[status] || ORDER_STATUSES[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-700',
      'paid': 'bg-blue-100 text-blue-700',
      'confirmed': 'bg-indigo-100 text-indigo-700',
      'preparing': 'bg-purple-100 text-purple-700',
      'ready_for_pickup': 'bg-orange-100 text-orange-700',
      'shipped': 'bg-cyan-100 text-cyan-700',
      'out_for_delivery': 'bg-teal-100 text-teal-700',
      'delivered': 'bg-green-100 text-green-700',
      'cancelled': 'bg-red-100 text-red-700'
    };
    return colors[status] || DELIVERY_STATUS_COLORS[status] || 'bg-gray-100 text-gray-700';
  };

  const handleReportClick = (order) => {
    setSelectedOrder(order);
    setShowReportModal(true);
  };

  return (
    <>
      <div className="space-y-2">
        {orders.slice(0, 10).map((order) => {
          // استخدام status بدلاً من delivery_status
          const orderStatus = order.status || order.delivery_status || 'pending';
          const canConfirm = orderStatus === 'paid';
          const canPrepare = orderStatus === 'confirmed';
          const canShip = orderStatus === 'preparing';
          const hasDeliveryDriver = order.delivery_driver_id && order.delivery_driver_name;
          
          return (
            <div key={order.id} className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-[11px] text-gray-900">#{order.order_number || order.id.slice(0, 8).toUpperCase()}</span>
                <span className="text-[#FF6B00] font-bold text-xs">{formatPrice(order.total)}</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-gray-500">{order.customer_name || order.user_name} - {order.delivery_city || order.city}</span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full ${getStatusColor(orderStatus)}`}>
                  {getStatusLabel(orderStatus)}
                </span>
              </div>
              
              {/* معلومات موظف التوصيل */}
              {hasDeliveryDriver && (
                <div className="bg-emerald-50 rounded-lg p-2 mb-2 border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck size={14} className="text-emerald-600" />
                      <span className="text-[10px] text-emerald-700 font-bold">
                        {order.delivery_driver_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {order.delivery_driver_phone && (
                        <a
                          href={`tel:${order.delivery_driver_phone}`}
                          className="flex items-center gap-1 bg-emerald-500 text-white px-2 py-1 rounded-lg text-[10px] font-bold"
                        >
                          <Phone size={10} />
                          اتصال
                        </a>
                      )}
                      <button
                        onClick={() => handleReportClick(order)}
                        className="flex items-center gap-1 bg-red-100 text-red-600 px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-red-200"
                        data-testid={`report-driver-${order.id}`}
                      >
                        <AlertTriangle size={10} />
                        بلاغ
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* أزرار التحكم */}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                {/* زر طباعة الملصق */}
                <button
                  onClick={() => onPrintLabel(order)}
                  className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200"
                  title="طباعة ملصق الطلب"
                >
                  <Printer size={14} className="text-gray-600" />
                </button>
                
                {canConfirm && (
                  <button
                    onClick={() => onSellerAction(order.id, 'confirm')}
                    className="flex-1 text-[10px] bg-blue-500 text-white py-1.5 rounded-lg font-medium hover:bg-blue-600"
                    data-testid={`confirm-order-${order.id}`}
                  >
                    تأكيد الطلب
                  </button>
                )}
                {canPrepare && (
                  <button
                    onClick={() => onSellerAction(order.id, 'preparing')}
                    className="flex-1 text-[10px] bg-purple-500 text-white py-1.5 rounded-lg font-medium hover:bg-purple-600"
                    data-testid={`prepare-order-${order.id}`}
                  >
                    بدء التحضير
                  </button>
                )}
                {canShip && (
                  <button
                    onClick={() => onSellerAction(order.id, 'shipped')}
                    className="flex-1 text-[10px] bg-green-500 text-white py-1.5 rounded-lg font-medium hover:bg-green-600"
                    data-testid={`ship-order-${order.id}`}
                  >
                    تم الشحن
                  </button>
                )}
                {!canConfirm && !canPrepare && !canShip && orderStatus !== 'delivered' && orderStatus !== 'cancelled' && (
                  <span className="text-[9px] text-gray-400 italic">
                    {orderStatus === 'pending' ? 'بانتظار الدفع' : 
                     orderStatus === 'shipped' ? 'بانتظار التوصيل' :
                     orderStatus === 'out_for_delivery' ? 'في الطريق للعميل' :
                     orderStatus === 'ready_for_pickup' ? 'بانتظار السائق' :
                     'بانتظار الخطوة التالية'}
                  </span>
                )}
                {orderStatus === 'delivered' && (
                  <span className="text-[9px] text-green-600 font-medium">✅ تم التسليم</span>
                )}
                {orderStatus === 'cancelled' && (
                  <span className="text-[9px] text-red-600 font-medium">❌ ملغي</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Report Driver Modal */}
      <ReportDriverModal
        isOpen={showReportModal}
        onClose={() => {
          setShowReportModal(false);
          setSelectedOrder(null);
        }}
        driverId={selectedOrder?.delivery_driver_id}
        driverName={selectedOrder?.delivery_driver_name || 'موظف التوصيل'}
        orderId={selectedOrder?.id}
        onSuccess={() => {
          // يمكن إضافة toast هنا
        }}
      />
    </>
  );
};

export default SellerOrdersSection;
