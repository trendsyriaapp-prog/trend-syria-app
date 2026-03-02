// /app/frontend/src/components/admin/OverviewTab.js
import { motion } from 'framer-motion';
import { Users, Package, ShoppingBag, Clock } from 'lucide-react';

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const OverviewTab = ({ stats, pendingSellers, pendingProducts, pendingDelivery }) => {
  if (!stats) return null;

  return (
    <section>
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-3 border border-gray-200"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <Users size={14} className="text-blue-600" />
            </div>
            <span className="text-[10px] text-gray-500">المستخدمين</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{stats.users}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-3 border border-gray-200"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-green-100 rounded-lg">
              <Package size={14} className="text-green-600" />
            </div>
            <span className="text-[10px] text-gray-500">المنتجات</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{stats.products}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-3 border border-gray-200"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-orange-100 rounded-lg">
              <ShoppingBag size={14} className="text-orange-600" />
            </div>
            <span className="text-[10px] text-gray-500">الطلبات</span>
          </div>
          <p className="text-xl font-bold text-gray-900">{stats.orders}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-3 border border-gray-200"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-purple-100 rounded-lg">
              <Clock size={14} className="text-purple-600" />
            </div>
            <span className="text-[10px] text-gray-500">بانتظار الموافقة</span>
          </div>
          <p className="text-xl font-bold text-gray-900">
            {pendingSellers.length + pendingProducts.length + pendingDelivery.length}
          </p>
        </motion.div>
      </div>

      {/* Revenue */}
      {stats.revenue > 0 && (
        <div className="bg-gradient-to-r from-[#FF6B00] to-[#FF8533] rounded-xl p-3 text-white mb-4">
          <p className="text-[10px] opacity-80">إجمالي المبيعات</p>
          <p className="text-2xl font-bold">{formatPrice(stats.revenue)}</p>
        </div>
      )}
    </section>
  );
};

export default OverviewTab;
