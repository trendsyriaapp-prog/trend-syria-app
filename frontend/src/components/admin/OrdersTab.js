// /app/frontend/src/components/admin/OrdersTab.js
import { ShoppingBag } from 'lucide-react';

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const OrdersTab = ({ allOrders }) => {
  return (
    <section>
      {allOrders.length === 0 ? (
        <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
          <ShoppingBag size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">لا يوجد طلبات</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allOrders.map((order) => (
            <div key={order.id} className="bg-white rounded-lg border border-gray-200 p-2">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-gray-900">#{order.id?.slice(0, 8)}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  order.status === 'paid' ? 'bg-green-100 text-green-600' :
                  order.status === 'pending_payment' ? 'bg-yellow-100 text-yellow-600' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {order.status === 'paid' ? 'مدفوع' : order.status === 'pending_payment' ? 'بانتظار الدفع' : order.status}
                </span>
              </div>
              <p className="text-[11px] text-gray-600">العميل: {order.user_name}</p>
              <p className="text-[11px] text-gray-600">المدينة: {order.city}</p>
              <p className="text-[#FF6B00] font-bold text-xs mt-1">الإجمالي: {formatPrice(order.total)}</p>
              <p className="text-[9px] text-gray-400 mt-1">
                {order.created_at ? new Date(order.created_at).toLocaleDateString('ar-SY', {
                  year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                }) : '-'}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default OrdersTab;
