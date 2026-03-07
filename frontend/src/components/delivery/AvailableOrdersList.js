import { motion } from 'framer-motion';
import { Package, Navigation, MapPin, Phone, UtensilsCrossed, ShoppingBag, Map } from 'lucide-react';
import { formatPrice } from '../../utils/imageHelpers';

// فتح العنوان في خرائط Google
const openInGoogleMaps = (address, city) => {
  const fullAddress = `${address}, ${city}, سوريا`;
  const encodedAddress = encodeURIComponent(fullAddress);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  window.open(mapsUrl, '_blank');
};

const AvailableOrdersList = ({ orders, isWorkingHours, onTakeOrder, onTakeFoodOrder }) => {
  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
        <Package size={48} className="text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">لا توجد طلبات متاحة حالياً</p>
      </div>
    );
  }

  // فصل طلبات الطعام عن طلبات المتجر
  const foodOrders = orders.filter(o => o.order_source === 'food');
  const shopOrders = orders.filter(o => o.order_source !== 'food');

  return (
    <div className="space-y-4">
      {/* طلبات الطعام */}
      {foodOrders.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <UtensilsCrossed size={18} className="text-green-600" />
            <h3 className="font-bold text-gray-900">طلبات الطعام ({foodOrders.length})</h3>
          </div>
          <div className="space-y-3">
            {foodOrders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border-2 border-green-200 overflow-hidden"
              >
                <div className="bg-green-500 text-white px-3 py-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed size={14} />
                    <span className="text-xs font-bold">طلب طعام</span>
                  </div>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                    {order.store_type === 'restaurant' ? 'مطعم' : 
                     order.store_type === 'grocery' ? 'مواد غذائية' : 'خضروات'}
                  </span>
                </div>
                <div className="p-3">
                  {/* رقم الطلب والسعر */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-sm text-gray-900">
                      #{order.order_number || order.id?.slice(0, 8)}
                    </span>
                    <span className="font-bold text-green-600">{formatPrice(order.total)}</span>
                  </div>

                  {/* من أين - المتجر */}
                  <div className="bg-green-50 rounded-lg p-2 mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <Navigation size={12} className="text-white" />
                      </div>
                      <span className="text-xs font-bold text-green-700">من ({order.store_name})</span>
                    </div>
                    {order.seller_addresses?.map((seller, i) => (
                      <div key={i} className="mr-8 text-xs text-gray-600">
                        <p>{seller.city}</p>
                        {seller.phone && (
                          <a href={`tel:${seller.phone}`} className="flex items-center gap-1 text-green-600">
                            <Phone size={10} /> {seller.phone}
                          </a>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* إلى أين - العميل */}
                  <div className="bg-blue-50 rounded-lg p-2 mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <MapPin size={12} className="text-white" />
                      </div>
                      <span className="text-xs font-bold text-blue-700">إلى (العميل)</span>
                    </div>
                    <div className="mr-8 text-xs text-gray-600">
                      <p className="font-medium">{order.buyer_address?.name}</p>
                      <p>{order.buyer_address?.address}</p>
                      <p>{order.buyer_address?.city}</p>
                      <a href={`tel:${order.buyer_address?.phone}`} className="flex items-center gap-1 text-blue-600">
                        <Phone size={10} /> {order.buyer_address?.phone}
                      </a>
                      {/* زر فتح في خرائط Google */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openInGoogleMaps(order.buyer_address?.address, order.buyer_address?.city);
                        }}
                        className="w-full mt-2 bg-blue-500 text-white py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1"
                      >
                        <Map size={12} />
                        فتح في خرائط Google
                      </button>
                    </div>
                  </div>

                  {/* عدد المنتجات */}
                  <p className="text-xs text-gray-500 mb-3">
                    عدد الأصناف: {order.items?.length || 0}
                  </p>

                  {/* زر قبول الطلب */}
                  <button
                    onClick={() => onTakeFoodOrder ? onTakeFoodOrder(order) : onTakeOrder(order)}
                    disabled={!isWorkingHours()}
                    className="w-full bg-green-500 text-white py-2 rounded-lg font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-600 transition-colors"
                  >
                    {isWorkingHours() ? 'قبول طلب التوصيل' : 'خارج أوقات العمل'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* طلبات المتجر */}
      {shopOrders.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ShoppingBag size={18} className="text-[#FF6B00]" />
            <h3 className="font-bold text-gray-900">طلبات المتجر ({shopOrders.length})</h3>
          </div>
          <div className="space-y-3">
            {shopOrders.map((order) => (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <div className="p-3">
                  {/* رقم الطلب والسعر */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-sm text-gray-900">#{order.id?.slice(0, 8)}</span>
                    <span className="font-bold text-[#FF6B00]">{formatPrice(order.total)}</span>
                  </div>

                  {/* من أين - البائع */}
                  <div className="bg-green-50 rounded-lg p-2 mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <Navigation size={12} className="text-white" />
                      </div>
                      <span className="text-xs font-bold text-green-700">من (البائع)</span>
                    </div>
                    {order.seller_addresses?.map((seller, i) => (
                      <div key={i} className="mr-8 text-xs text-gray-600">
                        <p className="font-medium">{seller.business_name || seller.name}</p>
                        <p>{seller.city}</p>
                        <a href={`tel:${seller.phone}`} className="flex items-center gap-1 text-green-600">
                          <Phone size={10} /> {seller.phone}
                        </a>
                      </div>
                    ))}
                  </div>

                  {/* إلى أين - المشتري */}
                  <div className="bg-blue-50 rounded-lg p-2 mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <MapPin size={12} className="text-white" />
                      </div>
                      <span className="text-xs font-bold text-blue-700">إلى (المشتري)</span>
                    </div>
                    <div className="mr-8 text-xs text-gray-600">
                      <p className="font-medium">{order.buyer_address?.name}</p>
                      <p>{order.buyer_address?.address}</p>
                      <p>{order.buyer_address?.city}</p>
                      <a href={`tel:${order.buyer_address?.phone}`} className="flex items-center gap-1 text-blue-600">
                        <Phone size={10} /> {order.buyer_address?.phone}
                      </a>
                      {/* زر فتح في خرائط Google */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openInGoogleMaps(order.buyer_address?.address, order.buyer_address?.city);
                        }}
                        className="w-full mt-2 bg-blue-500 text-white py-1.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1"
                      >
                        <Map size={12} />
                        فتح في خرائط Google
                      </button>
                    </div>
                  </div>

                  {/* عدد المنتجات */}
                  <p className="text-xs text-gray-500 mb-3">
                    عدد المنتجات: {order.items?.length || 0}
                  </p>

                  {/* زر أخذ الطلب */}
                  <button
                    onClick={() => onTakeOrder(order)}
                    disabled={!isWorkingHours()}
                    className="w-full bg-[#FF6B00] text-white py-2 rounded-lg font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isWorkingHours() ? 'أخذ الطلب' : 'خارج أوقات العمل'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailableOrdersList;
