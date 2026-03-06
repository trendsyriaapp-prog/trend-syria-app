import { ShoppingBag, Printer, Clock, Phone, Truck } from 'lucide-react';
import { formatPrice } from '../../utils/imageHelpers';
import { DELIVERY_STATUS_COLORS, ORDER_STATUSES } from '../../utils/constants';

const SellerOrdersSection = ({ orders, onSellerAction, onPrintLabel }) => {
  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 text-center border border-gray-200">
        <ShoppingBag size={32} className="text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500 text-xs">لا توجد طلبات</p>
      </div>
    );
  }

  const getStatusLabel = (status) => {
    return ORDER_STATUSES[status] || status;
  };

  const getStatusColor = (status) => {
    return DELIVERY_STATUS_COLORS[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-2">
      {orders.slice(0, 10).map((order) => {
        const canConfirm = order.status === 'paid' && order.delivery_status === 'pending';
        const canPrepare = order.delivery_status === 'confirmed';
        const canShip = order.delivery_status === 'preparing';
        const hasDeliveryDriver = order.delivery_driver_id && order.delivery_driver_name;
        
        return (
          <div key={order.id} className="bg-white rounded-lg p-3 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-[11px] text-gray-900">#{order.id.slice(0, 8).toUpperCase()}</span>
              <span className="text-[#FF6B00] font-bold text-xs">{formatPrice(order.total)}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-gray-500">{order.user_name} - {order.city}</span>
              <span className={`text-[9px] px-2 py-0.5 rounded-full ${getStatusColor(order.delivery_status)}`}>
                {getStatusLabel(order.delivery_status)}
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
                  {order.delivery_driver_phone && (
                    <a
                      href={`tel:${order.delivery_driver_phone}`}
                      className="flex items-center gap-1 bg-emerald-500 text-white px-2 py-1 rounded-lg text-[10px] font-bold"
                    >
                      <Phone size={10} />
                      اتصال
                    </a>
                  )}
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
              {!canConfirm && !canPrepare && !canShip && order.delivery_status !== 'delivered' && (
                <span className="text-[9px] text-gray-400 italic">بانتظار {order.status === 'pending_payment' ? 'الدفع' : 'الخطوة التالية'}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SellerOrdersSection;
