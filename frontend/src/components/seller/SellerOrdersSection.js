import { useState } from 'react';
import { ShoppingBag, Printer, Clock, Phone, Truck, AlertTriangle, Loader2 } from 'lucide-react';
import { formatPrice } from '../../utils/imageHelpers';
import { DELIVERY_STATUS_COLORS, ORDER_STATUSES } from '../../utils/constants';
import ReportDriverModal from '../delivery/ReportDriverModal';

const SellerOrdersSection = ({ orders, onSellerAction, onPrintLabel, actionLoading }) => {
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  if (orders.length === 0) {
    return (
      <div className="bg-orange-50 rounded-xl p-6 text-center border border-orange-200">
        <ShoppingBag size={32} className="text-orange-300 mx-auto mb-2" />
        <p className="text-orange-600 text-xs font-medium">لا توجد طلبات</p>
      </div>
    );
  }

  const getStatusLabel = (status) => {
    const labels = {
      'pending': 'بانتظار الدفع',
      'paid': 'مدفوع - بانتظار موافقتك',
      'confirmed': 'تمت الموافقة',
      'preparing': 'جاري تجهيز الطلب',
      'ready_for_pickup': 'جاهز للاستلام',
      'shipped': 'جاهز - بانتظار السائق',
      'out_for_delivery': 'في الطريق للعميل',
      'delivered': 'تم التسليم',
      'cancelled': 'ملغي'
    };
    return labels[status] || ORDER_STATUSES[status] || status;
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-700',
      'paid': 'bg-blue-100 text-blue-700',
      'confirmed': 'bg-orange-100 text-orange-700',
      'preparing': 'bg-amber-100 text-amber-700',
      'ready_for_pickup': 'bg-lime-100 text-lime-700',
      'shipped': 'bg-green-100 text-green-700',
      'out_for_delivery': 'bg-teal-100 text-teal-700',
      'delivered': 'bg-emerald-100 text-emerald-700',
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
          const isShipped = orderStatus === 'shipped' || orderStatus === 'ready_for_pickup';
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
              
              {/* كود التسليم - يظهر عند شحن الطلب */}
              {isShipped && order.pickup_code && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-2 text-center">
                  <p className="text-xs text-gray-500 mb-2">كود الاستلام - أعطه لموظف التوصيل</p>
                  <div className="flex justify-center gap-2" dir="ltr">
                    {order.pickup_code.split('').map((digit, i) => (
                      <span 
                        key={i} 
                        className="w-10 h-12 flex items-center justify-center text-xl font-bold bg-[#FF6B00] text-white rounded-lg shadow-md"
                      >
                        {digit}
                      </span>
                    ))}
                  </div>
                  {order.pickup_code_verified && (
                    <p className="text-[#FF6B00] text-xs mt-2 font-bold">
                      ✅ تم تأكيد الاستلام
                    </p>
                  )}
                </div>
              )}
              
              {/* معلومات موظف التوصيل مع الصورة */}
              {hasDeliveryDriver && (
                <div className="bg-emerald-50 rounded-lg p-3 mb-2 border border-emerald-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* صورة موظف التوصيل */}
                      {order.delivery_driver_photo ? (
                        <img 
                          src={order.delivery_driver_photo} 
                          alt={order.delivery_driver_name}
                          className="w-12 h-12 rounded-full object-cover border-2 border-emerald-400"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-emerald-200 flex items-center justify-center border-2 border-emerald-400">
                          <Truck size={20} className="text-emerald-600" />
                        </div>
                      )}
                      <div>
                        <p className="text-sm text-emerald-800 font-bold">
                          {order.delivery_driver_name}
                        </p>
                        <p className="text-[10px] text-emerald-600">
                          موظف التوصيل
                        </p>
                        {order.delivery_driver_phone && (
                          <p className="text-[11px] text-gray-600 font-mono" dir="ltr">
                            {order.delivery_driver_phone}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {order.delivery_driver_phone && (
                        <a
                          href={`tel:${order.delivery_driver_phone}`}
                          className="flex items-center justify-center gap-1 bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-emerald-600"
                        >
                          <Phone size={12} />
                          اتصال
                        </a>
                      )}
                      <button
                        onClick={() => handleReportClick(order)}
                        className="flex items-center justify-center gap-1 bg-red-100 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-red-200"
                        data-testid={`report-driver-${order.id}`}
                      >
                        <AlertTriangle size={12} />
                        بلاغ
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* حالة انتظار موظف التوصيل */}
              {isShipped && !hasDeliveryDriver && !order.pickup_code_verified && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-2 text-center">
                  <p className="text-yellow-700 text-xs flex items-center justify-center gap-1">
                    <Clock size={12} className="animate-pulse" />
                    بانتظار موظف التوصيل لاستلام الطلب
                  </p>
                </div>
              )}
              
              {/* أزرار التحكم */}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                {/* زر طباعة الملصق - أكبر وأوضح */}
                <button
                  onClick={() => onPrintLabel(order)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-all border border-purple-200"
                  title="طباعة ملصق الطلب"
                >
                  <Printer size={16} />
                  <span className="text-xs font-bold">طباعة</span>
                </button>
                
                {canConfirm && (
                  <button
                    onClick={() => onSellerAction(order.id, 'confirm')}
                    disabled={actionLoading === `${order.id}-confirm`}
                    className="flex-1 text-[10px] bg-blue-500 text-white py-1.5 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-70 flex items-center justify-center gap-1"
                    data-testid={`confirm-order-${order.id}`}
                  >
                    {actionLoading === `${order.id}-confirm` ? (
                      <><Loader2 size={12} className="animate-spin" /> جاري...</>
                    ) : (
                      'استلام الطلب'
                    )}
                  </button>
                )}
                {canPrepare && (
                  <button
                    onClick={() => onSellerAction(order.id, 'preparing')}
                    disabled={actionLoading === `${order.id}-preparing`}
                    className="flex-1 text-[10px] bg-orange-500 text-white py-1.5 rounded-lg font-medium hover:bg-orange-600 disabled:opacity-70 flex items-center justify-center gap-1"
                    data-testid={`prepare-order-${order.id}`}
                  >
                    {actionLoading === `${order.id}-preparing` ? (
                      <><Loader2 size={12} className="animate-spin" /> جاري...</>
                    ) : (
                      'بدء تجهيز الطلب'
                    )}
                  </button>
                )}
                {canShip && (
                  <button
                    onClick={() => onSellerAction(order.id, 'shipped')}
                    disabled={actionLoading === `${order.id}-shipped`}
                    className="flex-1 text-[10px] bg-green-500 text-white py-1.5 rounded-lg font-medium hover:bg-green-600 disabled:opacity-70 flex items-center justify-center gap-1"
                    data-testid={`ship-order-${order.id}`}
                  >
                    {actionLoading === `${order.id}-shipped` ? (
                      <><Loader2 size={12} className="animate-spin" /> جاري...</>
                    ) : (
                      'الطلب جاهز للشحن ✓'
                    )}
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
