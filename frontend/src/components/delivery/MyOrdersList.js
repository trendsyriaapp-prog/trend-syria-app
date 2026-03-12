import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Truck, User, MapPin, Phone, Navigation, CheckCircle, ChevronRight, Map, Clock, QrCode, AlertTriangle, PhoneCall } from 'lucide-react';
import { formatPrice } from '../../utils/imageHelpers';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// فتح العنوان في خرائط Google
const openInGoogleMaps = (address, city) => {
  const fullAddress = `${address}, ${city}, سوريا`;
  const encodedAddress = encodeURIComponent(fullAddress);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  window.open(mapsUrl, '_blank');
};

const MyOrdersList = ({ 
  orders, 
  foodOrders = [],
  onStartDelivery, 
  onShowDeliveryChecklist,
  onOpenETAModal,
  orderTypeFilter = 'all'
}) => {
  const navigate = useNavigate();
  const [showOrderCode, setShowOrderCode] = useState(null);
  const [supportPhone, setSupportPhone] = useState('0911111111');

  useEffect(() => {
    // جلب رقم الدعم
    axios.get(`${API}/food/orders/admin/support-phone`)
      .then(res => setSupportPhone(res.data.phone))
      .catch(() => {});
  }, []);

  const allOrders = [...orders, ...foodOrders];
  
  if (allOrders.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
        <Truck size={48} className="text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">
          {orderTypeFilter === 'food' ? 'لا توجد طلبات طعام لديك' : 
           orderTypeFilter === 'products' ? 'لا توجد طلبات منتجات لديك' : 
           'لم تأخذ أي طلبات بعد'}
        </p>
      </div>
    );
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'delivered': return 'تم التسليم';
      case 'on_the_way': return 'في الطريق';
      case 'picked_up': return 'تم الاستلام';
      case 'out_for_delivery': return 'جاري التوصيل';
      default: return 'قيد التوصيل';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'delivered': return 'bg-orange-100 text-orange-600';
      case 'on_the_way': return 'bg-orange-100 text-orange-600';
      case 'picked_up': return 'bg-green-100 text-green-600';
      case 'out_for_delivery': return 'bg-purple-100 text-purple-600';
      default: return 'bg-yellow-100 text-yellow-600';
    }
  };

  // فتح الاتصال بالدعم
  const callSupport = () => {
    window.location.href = `tel:${supportPhone}`;
  };

  return (
    <div className="space-y-2">
      {/* زر الاتصال بالدعم */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <AlertTriangle size={14} className="text-red-500" />
          <span className="text-xs text-red-700 font-medium">إذا حدث مشكلة؟</span>
        </div>
        <button
          onClick={callSupport}
          className="bg-red-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1"
        >
          <PhoneCall size={12} />
          اتصل بالدعم
        </button>
      </div>

      {orders.map((order) => {
        const isProductOrder = !order.order_type || order.order_type !== 'food';
        const orderNumber = order.order_number || order.id?.slice(0, 8).toUpperCase();
        const canStartDelivery = order.delivery_status === 'picked_up' || order.status === 'out_for_delivery';
        const canComplete = order.delivery_status === 'on_the_way' || order.status === 'out_for_delivery';
        const isDelivered = order.delivery_status === 'delivered' || order.status === 'delivered';

        return (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden"
          >
            <div className="p-3">
              {/* رقم الطلب الكبير */}
              <div className="bg-gradient-to-r from-[#FF6B00] to-[#FF8C00] text-white p-3 rounded-xl mb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs opacity-80">رقم الطلب</p>
                    <p className="text-2xl font-bold">#{orderNumber}</p>
                  </div>
                  <button
                    onClick={() => setShowOrderCode(showOrderCode === order.id ? null : order.id)}
                    className="bg-white/20 p-2 rounded-lg"
                  >
                    <QrCode size={24} />
                  </button>
                </div>
              </div>

              {/* عرض رقم الطلب للبائع */}
              {showOrderCode === order.id && (
                <div className="bg-gray-900 text-white p-4 rounded-xl mb-3 text-center">
                  <p className="text-xs text-gray-400 mb-2">اعرض هذا الرقم للبائع</p>
                  <p className="text-4xl font-bold tracking-widest">#{orderNumber}</p>
                  <p className="text-xs text-gray-400 mt-2">للتحقق من صحة الطلب</p>
                </div>
              )}

              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-gray-900">
                  {isProductOrder ? 'طلب منتجات' : order.store_name || 'طلب طعام'}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.delivery_status || order.status)}`}>
                  {getStatusLabel(order.delivery_status || order.status)}
                </span>
              </div>

              {/* معلومات العميل */}
              <div className="bg-slate-50 rounded-lg p-2 mb-3">
                <p className="text-xs font-bold text-slate-600 mb-1">معلومات العميل:</p>
                <p className="text-xs text-gray-600">
                  <User size={12} className="inline ml-1" />
                  {order.user_name || order.customer_name}
                </p>
                <p className="text-xs text-gray-600">
                  <MapPin size={12} className="inline ml-1" />
                  {order.address || order.delivery_address}, {order.city || order.delivery_city}
                </p>
                <a href={`tel:${order.phone}`} className="text-xs text-slate-600 flex items-center gap-1 mt-1 font-bold">
                  <Phone size={12} />
                  اتصال: {order.phone}
                </a>
                
                {/* أزرار الخرائط - ديناميكية حسب حالة الطلب */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {/* زر البائع/المطعم - يظهر كأساسي قبل استلام الطلب */}
                  {order.seller_addresses?.[0] && (
                    <button
                      onClick={() => openInGoogleMaps(
                        order.seller_addresses[0]?.address || order.seller_addresses[0]?.business_name, 
                        order.seller_addresses[0]?.city
                      )}
                      className="py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 bg-gray-700 text-white"
                      data-testid={`open-seller-maps-${order.id}`}
                    >
                      <Map size={12} />
                      🏪 {isProductOrder ? 'البائع' : 'المطعم'}
                    </button>
                  )}
                  {/* زر العميل - يظهر كأساسي بعد استلام الطلب */}
                  <button
                    onClick={() => openInGoogleMaps(order.address || order.delivery_address, order.city || order.delivery_city)}
                    className="py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 bg-slate-500 text-white"
                    data-testid={`open-customer-maps-${order.id}`}
                  >
                    <Map size={12} />
                    🏠 العميل
                  </button>
                </div>
                {/* تلميح للسائق */}
                {!canStartDelivery && !canComplete && !isDelivered && (
                  <p className="text-[9px] text-center text-gray-400 mt-1">
                    💡 اذهب للبائع أولاً لاستلام الطلب
                  </p>
                )}
                {canStartDelivery && (
                  <p className="text-[9px] text-center text-gray-400 mt-1">
                    💡 تم استلام الطلب - اذهب للعميل الآن
                  </p>
                )}
                
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
                <div className="bg-gray-100 rounded-lg p-2 mb-3">
                  <p className="text-xs font-bold text-gray-700 mb-1">معلومات البائع:</p>
                  <p className="text-xs text-gray-600">
                    <User size={12} className="inline ml-1" />
                    {order.seller_name || 'البائع'}
                  </p>
                  <a href={`tel:${order.seller_phone}`} className="text-xs text-gray-700 flex items-center gap-1 mt-1 font-bold">
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
                    onClick={() => onOpenETAModal ? onOpenETAModal(order.id) : onStartDelivery(order.id)}
                    className="w-full bg-orange-500 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <Clock size={14} />
                    في الطريق للعميل
                  </button>
                )}
                {canComplete && (
                  <button
                    onClick={() => onShowDeliveryChecklist(order)}
                    className="w-full bg-orange-500 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={14} />
                    تأكيد التسليم
                  </button>
                )}
                {!isDelivered && (
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={`tel:${order.phone}`}
                      className="bg-slate-500 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1"
                    >
                      <Phone size={14} />
                      العميل
                    </a>
                    {order.seller_phone && (
                      <a
                        href={`tel:${order.seller_phone}`}
                        className="bg-gray-700 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1"
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
      
      {/* طلبات الطعام */}
      {foodOrders.map((order) => {
        const orderNumber = order.order_number || order.id?.slice(0, 8).toUpperCase();
        const canComplete = order.status === 'out_for_delivery';
        const isDelivered = order.status === 'delivered';

        return (
          <motion.div
            key={order.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 10 }}
            className="bg-white rounded-xl border-2 border-orange-200 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-orange-500 text-white px-3 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">🍔 طلب طعام #{orderNumber}</span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${
                isDelivered ? 'bg-orange-700' : 'bg-white/20'
              }`}>
                {getStatusLabel(order.status)}
              </span>
            </div>

            <div className="p-3">
              {/* معلومات المتجر */}
              <div className="bg-gray-100 rounded-lg p-2 mb-3">
                <p className="text-xs font-bold text-gray-700 mb-1">📍 من: {order.store_name}</p>
                {order.seller_phone && (
                  <a href={`tel:${order.seller_phone}`} className="text-xs text-gray-700 flex items-center gap-1">
                    <Phone size={12} />
                    {order.seller_phone}
                  </a>
                )}
              </div>

              {/* معلومات العميل */}
              <div className="bg-slate-50 rounded-lg p-2 mb-3">
                <p className="text-xs font-bold text-slate-600 mb-1">🏠 إلى: {order.customer_name}</p>
                <p className="text-xs text-gray-600">{order.delivery_address}</p>
                <a href={`tel:${order.customer_phone}`} className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                  <Phone size={12} />
                  {order.customer_phone}
                </a>
              </div>

              {/* المنتجات */}
              <div className="mb-3">
                <p className="text-xs font-bold text-gray-700 mb-1">المنتجات:</p>
                {order.items?.map((item, idx) => (
                  <p key={idx} className="text-xs text-gray-600">
                    • {item.name} × {item.quantity}
                  </p>
                ))}
              </div>

              {/* السعر */}
              <p className="font-bold text-orange-600 text-sm mb-3">{formatPrice(order.total)}</p>

              {/* أزرار الخرائط */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  onClick={() => openInGoogleMaps(order.store_name, 'دمشق')}
                  className="bg-gray-700 text-white py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1"
                >
                  <Map size={12} />
                  🏪 المتجر
                </button>
                <button
                  onClick={() => openInGoogleMaps(order.delivery_address, order.delivery_city || 'دمشق')}
                  className="bg-slate-500 text-white py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1"
                >
                  <Map size={12} />
                  🏠 العميل
                </button>
              </div>

              {/* أزرار الإجراءات */}
              <div className="space-y-2">
                {canComplete && !isDelivered && (
                  <button
                    onClick={() => onShowDeliveryChecklist(order)}
                    className="w-full bg-orange-500 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={14} />
                    تأكيد التسليم
                  </button>
                )}
                {!isDelivered && (
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={`tel:${order.customer_phone}`}
                      className="bg-slate-500 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1"
                    >
                      <Phone size={14} />
                      العميل
                    </a>
                    <a
                      href={`tel:${order.seller_phone}`}
                      className="bg-gray-700 text-white py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1"
                    >
                      <Phone size={14} />
                      المتجر
                    </a>
                  </div>
                )}
                {isDelivered && (
                  <div className="bg-orange-100 text-orange-700 py-2 rounded-lg text-center text-sm font-bold">
                    ✅ تم التسليم بنجاح
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default MyOrdersList;
