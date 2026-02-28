import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Package, Clock, Truck, Check, X, ChevronLeft, Eye, MapPin, Phone, User } from 'lucide-react';
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
  pending_payment: { label: 'في انتظار الدفع', color: 'text-yellow-600 bg-yellow-100', icon: Clock },
  paid: { label: 'تم الدفع', color: 'text-green-600 bg-green-100', icon: Check },
  cancelled: { label: 'ملغي', color: 'text-red-600 bg-red-100', icon: X }
};

const deliveryConfig = {
  pending: { label: 'في الانتظار', color: 'bg-yellow-100 text-yellow-700', step: 1 },
  processing: { label: 'قيد التجهيز', color: 'bg-blue-100 text-blue-700', step: 2 },
  shipped: { label: 'تم الشحن', color: 'bg-purple-100 text-purple-700', step: 3 },
  delivered: { label: 'تم التوصيل', color: 'bg-green-100 text-green-700', step: 4 }
};

// مكون تتبع الشحنة
const ShipmentTracker = ({ status }) => {
  const steps = [
    { key: 'pending', label: 'تم الطلب', icon: Package },
    { key: 'processing', label: 'قيد التجهيز', icon: Clock },
    { key: 'shipped', label: 'في الطريق', icon: Truck },
    { key: 'delivered', label: 'تم التوصيل', icon: Check },
  ];
  
  const currentStep = deliveryConfig[status]?.step || 1;

  return (
    <div className="py-4">
      <h4 className="font-bold text-gray-900 mb-4">تتبع الشحنة</h4>
      <div className="flex items-center justify-between relative">
        {/* Progress Line */}
        <div className="absolute top-5 right-5 left-5 h-1 bg-gray-200 rounded-full">
          <div 
            className="h-full bg-[#FF6B00] rounded-full transition-all duration-500"
            style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
          />
        </div>
        
        {steps.map((step, index) => {
          const isCompleted = index + 1 <= currentStep;
          const isCurrent = index + 1 === currentStep;
          const StepIcon = step.icon;
          
          return (
            <div key={step.key} className="flex flex-col items-center z-10">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                isCompleted 
                  ? 'bg-[#FF6B00] text-white' 
                  : 'bg-gray-200 text-gray-400'
              } ${isCurrent ? 'ring-4 ring-[#FF6B00]/20' : ''}`}>
                <StepIcon size={18} />
              </div>
              <span className={`text-xs mt-2 font-medium ${
                isCompleted ? 'text-[#FF6B00]' : 'text-gray-400'
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-10 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">طلباتي</h1>

        {orders.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <Package size={64} className="text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">لا توجد طلبات</h2>
            <p className="text-gray-500 mb-6">لم تقم بأي طلبات بعد</p>
            <Link
              to="/products"
              className="bg-[#FF6B00] text-white font-bold px-6 py-3 rounded-full hover:bg-[#E65000] transition-colors"
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
                  className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
                  data-testid={`order-${order.id}`}
                >
                  <div className="p-4">
                    {/* Order Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${status.color}`}>
                          <StatusIcon size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">#{order.id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
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
                        <div key={i} className="flex-shrink-0 relative">
                          <img
                            src={item.image || 'https://via.placeholder.com/60'}
                            alt={item.product_name}
                            className="w-14 h-14 rounded-lg object-cover border border-gray-200"
                          />
                          {item.quantity > 1 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#FF6B00] text-white text-xs rounded-full flex items-center justify-center">
                              {item.quantity}
                            </span>
                          )}
                        </div>
                      ))}
                      {order.items.length > 4 && (
                        <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center text-sm text-gray-500 border border-gray-200">
                          +{order.items.length - 4}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                      className="w-full flex items-center justify-center gap-2 mt-3 pt-3 border-t border-gray-100 text-gray-600 hover:text-[#FF6B00] transition-colors"
                      data-testid={`view-order-${order.id}`}
                    >
                      <Eye size={16} />
                      <span className="text-sm">تتبع الشحنة</span>
                      <ChevronLeft size={16} className={`transition-transform ${selectedOrder?.id === order.id ? 'rotate-90' : ''}`} />
                    </button>
                  </div>

                  {/* Order Details & Tracking */}
                  {selectedOrder?.id === order.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="border-t border-gray-100 p-4 bg-gray-50"
                    >
                      {/* Shipment Tracker */}
                      <ShipmentTracker status={order.delivery_status} />
                      
                      {/* Products */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="font-bold text-gray-900 mb-3">المنتجات</h4>
                        <div className="space-y-2">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex items-center gap-3 bg-white p-2 rounded-lg">
                              <img
                                src={item.image || 'https://via.placeholder.com/40'}
                                alt={item.product_name}
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                                <p className="text-xs text-gray-500">{item.quantity}x {formatPrice(item.price)}</p>
                              </div>
                              <p className="font-bold text-sm text-[#FF6B00]">{formatPrice(item.item_total)}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Delivery Address */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="font-bold text-gray-900 mb-2">عنوان التوصيل</h4>
                        <div className="bg-white p-3 rounded-lg">
                          <div className="flex items-start gap-2 text-gray-600">
                            <MapPin size={16} className="text-[#FF6B00] mt-0.5" />
                            <span className="text-sm">{order.city} - {order.address}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600 mt-2">
                            <Phone size={16} className="text-[#FF6B00]" />
                            <span className="text-sm">{order.phone}</span>
                          </div>
                        </div>
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
