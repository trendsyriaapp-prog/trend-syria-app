import { Package, ShoppingBag, DollarSign, Clock } from 'lucide-react';
import { formatPrice } from '../../utils/imageHelpers';

const SellerStatsCard = ({ products, orders, onStatClick }) => {
  const totalSales = orders.reduce((sum, o) => sum + (o.status === 'paid' ? o.total : 0), 0);
  const paidOrders = orders.filter(o => o.status === 'paid').length;
  const pendingOrders = orders.filter(o => o.delivery_status === 'pending').length;

  const stats = [
    { icon: Package, label: 'المنتجات', value: products.length, color: 'bg-blue-100 text-blue-600', action: 'products' },
    { icon: ShoppingBag, label: 'طلبات مدفوعة', value: paidOrders, color: 'bg-green-100 text-green-600', action: 'paid_orders' },
    { icon: DollarSign, label: 'المبيعات', value: formatPrice(totalSales), color: 'bg-orange-100 text-orange-600', action: 'sales' },
    { icon: Clock, label: 'معلقة', value: pendingOrders, color: 'bg-yellow-100 text-yellow-600', action: 'pending_orders' },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 mb-4">
      {stats.map((stat, i) => (
        <div 
          key={i} 
          onClick={() => onStatClick(stat.action)}
          className="bg-white rounded-xl p-2 border border-gray-200 cursor-pointer hover:border-[#FF6B00] hover:shadow-md transition-all"
          data-testid={`stat-${stat.action}`}
        >
          <div className={`w-6 h-6 rounded-full ${stat.color} flex items-center justify-center mb-1`}>
            <stat.icon size={12} />
          </div>
          <p className="text-sm font-bold text-gray-900">{stat.value}</p>
          <p className="text-[9px] text-gray-500">{stat.label}</p>
        </div>
      ))}
    </div>
  );
};

export default SellerStatsCard;
