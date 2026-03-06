import { motion } from 'framer-motion';
import { Package, Navigation, MapPin, Phone } from 'lucide-react';
import { formatPrice } from '../../utils/imageHelpers';

const AvailableOrdersList = ({ orders, isWorkingHours, onTakeOrder }) => {
  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 text-center border border-gray-200">
        <Package size={48} className="text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">لا توجد طلبات متاحة حالياً</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
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
                  <p className="flex items-center gap-1">
                    <Phone size={10} /> {seller.phone}
                  </p>
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
                <p className="flex items-center gap-1">
                  <Phone size={10} /> {order.buyer_address?.phone}
                </p>
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
  );
};

export default AvailableOrdersList;
