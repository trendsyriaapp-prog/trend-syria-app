import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Truck, User, MapPin, Phone, Navigation, CheckCircle, ChevronRight, Map } from 'lucide-react';
import { formatPrice } from '../../utils/imageHelpers';

// فتح العنوان في خرائط Google
const openInGoogleMaps = (address, city) => {
  const fullAddress = `${address}, ${city}, سوريا`;
  const encodedAddress = encodeURIComponent(fullAddress);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  window.open(mapsUrl, '_blank');
};

const MyOrdersList = ({ 
  orders, 
  onStartDelivery, 
  onShowDeliveryChecklist 
}) => {
  const navigate = useNavigate();

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
        <Truck size={48} className="text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">لم تأخذ أي طلبات بعد</p>
      </div>
    );
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'delivered': return 'تم التسليم';
      case 'on_the_way': return 'في الطريق';
      case 'picked_up': return 'تم الاستلام';
      default: return 'قيد التوصيل';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-600';
      case 'on_the_way': return 'bg-orange-100 text-orange-600';
      case 'picked_up': return 'bg-blue-100 text-blue-600';
      default: return 'bg-yellow-100 text-yellow-600';
    }
  };

  return (
    <div className="space-y-3">
      {orders.map((order) => {
        const canStartDelivery = order.delivery_status === 'picked_up';
        const canComplete = order.delivery_status === 'on_the_way';
        const isDelivered = order.delivery_status === 'delivered';
        
        return (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
          >
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-gray-900">#{order.id?.slice(0, 8)}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.delivery_status)}`}>
                  {getStatusLabel(order.delivery_status)}
                </span>
              </div>

              {/* معلومات العميل */}
              <div className="bg-gray-50 rounded-lg p-2 mb-3">
                <p className="text-xs font-bold text-gray-700 mb-1">معلومات العميل:</p>
                <p className="text-xs text-gray-600">
                  <User size={12} className="inline ml-1" />
                  {order.user_name}
                </p>
                <p className="text-xs text-gray-600">
                  <MapPin size={12} className="inline ml-1" />
                  {order.address}, {order.city}
                </p>
                <a href={`tel:${order.phone}`} className="text-xs text-[#FF6B00] flex items-center gap-1 mt-1 font-bold">
                  <Phone size={12} />
                  اتصال: {order.phone}
                </a>
                
                {/* زر فتح في خرائط Google */}
                <button
                  onClick={() => openInGoogleMaps(order.address, order.city)}
                  className="w-full mt-2 bg-green-500 text-white py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2"
                  data-testid={`open-maps-${order.id}`}
                >
                  <Map size={14} />
                  فتح في خرائط Google
                </button>
                
                {/* ملاحظة العميل */}
                {order.delivery_note && (
                  <div className="mt-2 p-2 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-[10px] font-bold text-yellow-700">ملاحظة من العميل:</p>
                    <p className="text-xs text-gray-700">{order.delivery_note}</p>
                  </div>
                )}
              </div>

              {/* معلومات البائع */}
              {order.seller_phone && (
                <div className="bg-blue-50 rounded-lg p-2 mb-3">
                  <p className="text-xs font-bold text-blue-700 mb-1">معلومات البائع:</p>
                  <p className="text-xs text-gray-600">
                    <User size={12} className="inline ml-1" />
                    {order.seller_name || 'البائع'}
                  </p>
                  <a href={`tel:${order.seller_phone}`} className="text-xs text-blue-600 flex items-center gap-1 mt-1 font-bold">
                    <Phone size={12} />
                    اتصال: {order.seller_phone}
                  </a>
                </div>
              )}

              <p className="font-bold text-[#FF6B00] text-sm mb-3">{formatPrice(order.total)}</p>

              {/* أزرار الإجراءات */}
              <div className="space-y-2">
                {canStartDelivery && (
                  <button
                    onClick={() => onStartDelivery(order.id)}
                    className="w-full bg-orange-500 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <Navigation size={14} />
                    في الطريق للعميل
                  </button>
                )}
                {canComplete && (
                  <button
                    onClick={() => onShowDeliveryChecklist(order)}
                    className="w-full bg-green-500 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={14} />
                    تأكيد التسليم
                  </button>
                )}
                {!isDelivered && (
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={`tel:${order.phone}`}
                      className="bg-[#FF6B00] text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1"
                    >
                      <Phone size={14} />
                      العميل
                    </a>
                    {order.seller_phone && (
                      <a
                        href={`tel:${order.seller_phone}`}
                        className="bg-blue-500 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1"
                      >
                        <Phone size={14} />
                        البائع
                      </a>
                    )}
                  </div>
                )}
                {/* رابط للتتبع */}
                <button
                  onClick={() => navigate(`/orders/${order.id}/tracking`)}
                  className="w-full bg-white border border-gray-200 text-gray-700 py-2 rounded-lg text-sm flex items-center justify-center gap-2"
                >
                  تفاصيل الطلب
                  <ChevronRight size={14} className="rotate-180" />
                </button>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default MyOrdersList;
