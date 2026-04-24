// /app/frontend/src/components/seller/FoodOrdersSection.js
// مكون عرض طلبات الطعام للبائع

import { ShoppingBag, Loader2 } from 'lucide-react';

const FoodOrdersSection = ({ orders, onStatusChange, actionLoading }) => {
  if (!orders || orders.length === 0) {
    return (
      <div className="text-center py-8 bg-orange-50 rounded-xl border border-orange-200">
        <ShoppingBag className="mx-auto mb-2 text-orange-300" size={40} />
        <p className="text-orange-600 text-sm font-medium">لا توجد طلبات</p>
      </div>
    );
  }

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-700',
      'accepted': 'bg-blue-100 text-blue-700',
      'preparing': 'bg-orange-100 text-orange-700',
      'ready': 'bg-orange-100 text-[#FF6B00]',
      'out_for_delivery': 'bg-purple-100 text-purple-700',
      'delivered': 'bg-emerald-100 text-emerald-700',
      'cancelled': 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusText = (status) => {
    const texts = {
      'pending': 'جديد',
      'accepted': 'مقبول',
      'preparing': 'قيد التحضير',
      'ready': 'جاهز',
      'out_for_delivery': 'في الطريق',
      'delivered': 'تم التسليم',
      'cancelled': 'ملغي'
    };
    return texts[status] || status;
  };

  const isLoading = (orderId, status) => actionLoading === `food-${orderId}-${status}`;

  return (
    <div className="space-y-2">
      {orders.slice(0, 10).map(order => (
        <div key={order.id} className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-gray-900">#{order.id?.slice(-6)}</span>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${getStatusColor(order.status)}`}>
                {getStatusText(order.status)}
              </span>
            </div>
            <span className="text-[#FF6B00] font-bold text-xs">{order.total?.toLocaleString()} ل.س</span>
          </div>
          
          {/* تفاصيل الطلب */}
          <div className="text-[10px] text-gray-600 mb-2">
            <p>العميل: {order.customer_name || 'غير معروف'}</p>
            <p>العنوان: {order.delivery_address || 'غير محدد'}</p>
          </div>

          {/* كود الاستلام - يظهر عندما يكون الطلب جاهز */}
          {order.status === 'ready' && order.pickup_code && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-2 mb-2 text-center">
              <p className="text-[10px] text-gray-500 mb-1">كود الاستلام - أعطه لموظف التوصيل</p>
              <div className="flex justify-center gap-1 flex-wrap" dir="ltr">
                {order.pickup_code.split('').map((digit, i) => (
                  <span 
                    key={`pickup-digit-${i}`} 
                    className="w-8 h-10 flex items-center justify-center text-lg font-bold bg-[#FF6B00] text-white rounded-lg shadow-md"
                  >
                    {digit}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* أزرار الإجراءات حسب الحالة */}
          {order.status === 'pending' && (
            <div className="flex gap-2">
              <button
                onClick={() => onStatusChange(order.id, 'accepted')}
                disabled={isLoading(order.id, 'accepted')}
                className="flex-1 bg-[#FF6B00] text-white py-1.5 rounded text-[10px] font-bold hover:bg-[#E65000] disabled:opacity-70 flex items-center justify-center gap-1"
              >
                {isLoading(order.id, 'accepted') ? (
                  <><Loader2 size={12} className="animate-spin" /> جاري...</>
                ) : 'استلام الطلب'}
              </button>
              <button
                onClick={() => onStatusChange(order.id, 'rejected')}
                disabled={isLoading(order.id, 'rejected')}
                className="flex-1 bg-red-100 text-red-600 py-1.5 rounded text-[10px] font-bold hover:bg-red-200 disabled:opacity-70 flex items-center justify-center gap-1"
              >
                {isLoading(order.id, 'rejected') ? (
                  <><Loader2 size={12} className="animate-spin" /> جاري...</>
                ) : 'رفض'}
              </button>
            </div>
          )}
          
          {order.status === 'accepted' && (
            <button
              onClick={() => onStatusChange(order.id, 'preparing')}
              disabled={isLoading(order.id, 'preparing')}
              className="w-full bg-orange-500 text-white py-1.5 rounded text-[10px] font-bold hover:bg-orange-600 disabled:opacity-70 flex items-center justify-center gap-1"
            >
              {isLoading(order.id, 'preparing') ? (
                <><Loader2 size={12} className="animate-spin" /> جاري...</>
              ) : 'بدء التحضير'}
            </button>
          )}
          
          {order.status === 'preparing' && (
            <button
              onClick={() => onStatusChange(order.id, 'ready')}
              disabled={isLoading(order.id, 'ready')}
              className="w-full bg-[#FF6B00] text-white py-1.5 rounded text-[10px] font-bold hover:bg-[#E65000] disabled:opacity-70 flex items-center justify-center gap-1"
            >
              {isLoading(order.id, 'ready') ? (
                <><Loader2 size={12} className="animate-spin" /> جاري...</>
              ) : 'الطلب جاهز'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default FoodOrdersSection;
