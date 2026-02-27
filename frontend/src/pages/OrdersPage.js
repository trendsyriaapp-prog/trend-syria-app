import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Package, Clock, Truck, Check, X, ChevronLeft, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('ar-SY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const statusConfig = {
  pending_payment: { label: 'في انتظار الدفع', color: 'text-yellow-500', icon: Clock },
  paid: { label: 'تم الدفع', color: 'text-green-500', icon: Check },
  cancelled: { label: 'ملغي', color: 'text-red-500', icon: X }
};

const deliveryConfig = {
  pending: { label: 'في الانتظار', color: 'bg-yellow-500/20 text-yellow-500' },
  processing: { label: 'قيد التجهيز', color: 'bg-blue-500/20 text-blue-500' },
  shipped: { label: 'تم الشحن', color: 'bg-purple-500/20 text-purple-500' },
  delivered: { label: 'تم التوصيل', color: 'bg-green-500/20 text-green-500' }
};

const OrdersPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${API}/orders`);
      setOrders(res.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-10">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">طلباتي</h1>

        {orders.length === 0 ? (
          <div className="text-center py-20">
            <Package size={64} className="text-white/20 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">لا توجد طلبات</h2>
            <p className="text-white/50 mb-6">لم تقم بأي طلبات بعد</p>
            <Link
              to="/products"
              className="bg-[#FF6B00] text-black font-bold px-6 py-3 rounded-full hover:bg-[#E65000] transition-colors"
            >
              تصفح المنتجات
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const status = statusConfig[order.status] || statusConfig.pending_payment;
              const delivery = deliveryConfig[order.delivery_status] || deliveryConfig.pending;
              const StatusIcon = status.icon;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-[#121212] rounded-xl border border-white/5 overflow-hidden"
                  data-testid={`order-${order.id}`}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full bg-white/5 ${status.color}`}>
                          <StatusIcon size={18} />
                        </div>
                        <div>
                          <p className="font-bold">#{order.id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-xs text-white/50">{formatDate(order.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-[#FF6B00]">{formatPrice(order.total)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${delivery.color}`}>
                          {delivery.label}
                        </span>
                      </div>
                    </div>

                    {/* Items preview */}
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
                      {order.items.slice(0, 4).map((item, i) => (
                        <div key={i} className="flex-shrink-0">
                          <img
                            src={item.image || 'https://via.placeholder.com/60'}
                            alt={item.product_name}
                            className="w-14 h-14 rounded-lg object-cover"
                          />
                        </div>
                      ))}
                      {order.items.length > 4 && (
                        <div className="w-14 h-14 rounded-lg bg-white/5 flex items-center justify-center text-sm text-white/50">
                          +{order.items.length - 4}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                      className="w-full flex items-center justify-center gap-2 mt-3 pt-3 border-t border-white/5 text-white/70 hover:text-white transition-colors"
                      data-testid={`view-order-${order.id}`}
                    >
                      <Eye size={16} />
                      <span className="text-sm">عرض التفاصيل</span>
                      <ChevronLeft size={16} className={`transition-transform ${selectedOrder?.id === order.id ? 'rotate-90' : ''}`} />
                    </button>
                  </div>

                  {/* Order Details */}
                  {selectedOrder?.id === order.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="border-t border-white/5 p-4 bg-[#0A0A0A]"
                    >
                      <h4 className="font-bold mb-3">المنتجات</h4>
                      <div className="space-y-2 mb-4">
                        {order.items.map((item, i) => (
                          <div key={i} className="flex items-center gap-3">
                            <img
                              src={item.image || 'https://via.placeholder.com/40'}
                              alt={item.product_name}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                            <div className="flex-1">
                              <p className="text-sm">{item.product_name}</p>
                              <p className="text-xs text-white/50">{item.quantity}x {formatPrice(item.price)}</p>
                            </div>
                            <p className="font-bold text-sm">{formatPrice(item.item_total)}</p>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-white/10 pt-4">
                        <h4 className="font-bold mb-2">عنوان التوصيل</h4>
                        <p className="text-white/70 text-sm">{order.city} - {order.address}</p>
                        <p className="text-white/50 text-sm mt-1">هاتف: {order.phone}</p>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersPage;
