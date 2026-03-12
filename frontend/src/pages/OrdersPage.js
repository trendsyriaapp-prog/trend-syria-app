import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Package, Clock, Truck, Check, X, ChevronLeft, Eye, MapPin, Phone, User, Navigation, Star, Gift, UtensilsCrossed, ShoppingBag, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import RateDriverModal from '../components/delivery/RateDriverModal';
import { useToast } from '../hooks/use-toast';

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
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [foodOrders, setFoodOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [rateOrder, setRateOrder] = useState(null);
  const [ratedOrders, setRatedOrders] = useState({});
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'products', 'food'
  const [reorderLoading, setReorderLoading] = useState(null); // track which order is being reordered

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchOrders = async () => {
    try {
      const [ordersRes, foodRes] = await Promise.all([
        axios.get(`${API}/orders`),
        axios.get(`${API}/food/orders/my-orders`).catch(() => ({ data: [] }))
      ]);
      
      setOrders(ordersRes.data);
      setFoodOrders(foodRes.data);
      
      // Check which orders have been rated
      const delivered = ordersRes.data.filter(o => o.delivery_status === 'delivered');
      for (const order of delivered) {
        try {
          const ratingRes = await axios.get(`${API}/delivery/check-rating/${order.id}`);
          if (ratingRes.data.has_rated) {
            setRatedOrders(prev => ({ ...prev, [order.id]: ratingRes.data.rating }));
          }
        } catch (e) {
          console.error('Error checking rating:', e);
        }
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // إعادة الطلب - إضافة جميع منتجات الطلب السابق للسلة
  const handleReorder = async (order) => {
    if (!order.items || order.items.length === 0) {
      toast({
        title: "خطأ",
        description: "لا يمكن إعادة هذا الطلب",
        variant: "destructive"
      });
      return;
    }

    setReorderLoading(order.id);
    let addedCount = 0;
    let failedCount = 0;

    for (const item of order.items) {
      try {
        await addToCart(
          item.product_id,
          item.quantity,
          item.selected_size || null,
          item.selected_weight || null
        );
        addedCount++;
      } catch (error) {
        console.error('Error adding item:', error);
        failedCount++;
      }
    }

    setReorderLoading(null);

    if (addedCount > 0) {
      toast({
        title: "تمت إضافة المنتجات للسلة",
        description: `تم إضافة ${addedCount} منتج${failedCount > 0 ? ` (${failedCount} غير متوفر)` : ''}`,
      });
      navigate('/cart');
    } else {
      toast({
        title: "خطأ",
        description: "المنتجات غير متوفرة حالياً",
        variant: "destructive"
      });
    }
  };

  // إعادة طلب الطعام
  const handleReorderFood = async (order) => {
    if (!order.items || order.items.length === 0) {
      toast({
        title: "خطأ",
        description: "لا يمكن إعادة هذا الطلب",
        variant: "destructive"
      });
      return;
    }

    setReorderLoading(order.id);
    
    // جلب السلة الحالية للمتجر
    const storeId = order.store_id;
    const cartKey = `food_cart_${storeId}`;
    let currentCart = [];
    
    try {
      const stored = localStorage.getItem(cartKey);
      if (stored) currentCart = JSON.parse(stored);
    } catch (e) {}

    // إضافة المنتجات للسلة
    for (const item of order.items) {
      const productId = item.product_id || item.item_id;
      const existingIndex = currentCart.findIndex(c => c.product_id === productId);
      if (existingIndex >= 0) {
        currentCart[existingIndex].quantity += item.quantity;
      } else {
        currentCart.push({
          product_id: productId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          image: item.image
        });
      }
    }

    localStorage.setItem(cartKey, JSON.stringify(currentCart));
    window.dispatchEvent(new CustomEvent('foodCartUpdated'));
    
    setReorderLoading(null);
    
    toast({
      title: "تمت إضافة الطلب للسلة",
      description: `تم إضافة ${order.items.length} صنف من ${order.store_name}`,
    });
    
    navigate(`/food/cart/${storeId}`);
  };

  // دمج وترتيب جميع الطلبات
  const getAllOrders = () => {
    const productOrdersFormatted = orders.map(o => ({ ...o, type: 'product' }));
    const foodOrdersFormatted = foodOrders.map(o => ({ ...o, type: 'food' }));
    return [...productOrdersFormatted, ...foodOrdersFormatted]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  };

  const getFilteredOrders = () => {
    if (activeTab === 'products') return orders.map(o => ({ ...o, type: 'product' }));
    if (activeTab === 'food') return foodOrders.map(o => ({ ...o, type: 'food' }));
    return getAllOrders();
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
        <h1 className="text-2xl font-bold text-gray-900 mb-4">طلباتي</h1>
        
        {/* التبويبات */}
        <div className="flex gap-2 mb-6 bg-white p-1 rounded-xl border border-gray-200">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'all' 
                ? 'bg-[#FF6B00] text-white' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            الكل ({orders.length + foodOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'products' 
                ? 'bg-[#FF6B00] text-white' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ShoppingBag size={16} />
            منتجات ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('food')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'food' 
                ? 'bg-[#FF6B00] text-white' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <UtensilsCrossed size={16} />
            طعام ({foodOrders.length})
          </button>
        </div>

        {getFilteredOrders().length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
            <Package size={64} className="text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">لا توجد طلبات</h2>
            <p className="text-gray-500 mb-6">لم تقم بأي طلبات بعد</p>
            <div className="flex gap-3 justify-center">
              <Link
                to="/products"
                className="bg-[#FF6B00] text-white font-bold px-6 py-3 rounded-full hover:bg-[#E65000] transition-colors"
              >
                تصفح المنتجات
              </Link>
              <Link
                to="/food"
                className="bg-orange-100 text-[#FF6B00] font-bold px-6 py-3 rounded-full hover:bg-orange-200 transition-colors"
              >
                اطلب طعام
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {getFilteredOrders().map((order) => {
              // إذا كان طلب طعام
              if (order.type === 'food') {
                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
                  >
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-full bg-orange-100 text-[#FF6B00]">
                            <UtensilsCrossed size={18} />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">#{order.order_number}</p>
                            <p className="text-xs text-gray-500">{formatDate(order.created_at)}</p>
                          </div>
                        </div>
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                          order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                          order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          order.status === 'out_for_delivery' ? 'bg-purple-100 text-purple-700' :
                          order.status === 'ready' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {order.status_label || order.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <MapPin size={14} />
                        <span>{order.store_name}</span>
                      </div>
                      
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <span className="font-bold text-[#FF6B00]">{formatPrice(order.total)}</span>
                        <div className="flex items-center gap-2">
                          {/* زر إعادة الطلب */}
                          <button
                            onClick={() => handleReorderFood(order)}
                            disabled={reorderLoading === order.id}
                            className="text-sm bg-green-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-green-600 transition-colors flex items-center gap-1 disabled:opacity-50"
                            data-testid={`reorder-food-${order.id}`}
                          >
                            <RefreshCw size={14} className={reorderLoading === order.id ? 'animate-spin' : ''} />
                            إعادة الطلب
                          </button>
                          <Link
                            to={`/food/order/${order.id}`}
                            className="text-sm text-[#FF6B00] font-medium hover:underline flex items-center gap-1"
                          >
                            تتبع الطلب
                            <ChevronLeft size={16} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              }
              
              // طلب منتجات عادي
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
                      {/* إذا كان الطلب هدية مفاجئة، نخفي تفاصيل المنتج */}
                      {order.is_gift && order.is_surprise ? (
                        <div className="flex items-center gap-3 bg-gradient-to-r from-pink-50 to-purple-50 p-3 rounded-xl w-full">
                          <div className="w-14 h-14 bg-gradient-to-br from-pink-400 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Gift size={28} className="text-white" />
                          </div>
                          <div>
                            <p className="font-bold text-purple-800">🎁 هدية مفاجأة</p>
                            <p className="text-sm text-purple-600">
                              من {order.gift_sender_name || 'صديق'}
                            </p>
                          </div>
                        </div>
                      ) : order.is_gift ? (
                        // هدية عادية (ليست مفاجأة) - نعرض التفاصيل مع إشارة أنها هدية
                        <>
                          <div className="flex items-center gap-2 bg-pink-50 p-2 rounded-lg flex-shrink-0">
                            <Gift size={16} className="text-pink-500" />
                            <span className="text-xs text-pink-600 font-medium">هدية من {order.gift_sender_name || 'صديق'}</span>
                          </div>
                          {order.items.slice(0, 4).map((item, i) => (
                            <div key={i} className="flex-shrink-0 relative">
                              <img
                                src={item.image || item.product_image || 'https://via.placeholder.com/60'}
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
                        </>
                      ) : (
                        // طلب عادي
                        <>
                          {order.items.slice(0, 4).map((item, i) => (
                            <div key={i} className="flex-shrink-0 relative">
                              <img
                                src={item.image || item.product_image || 'https://via.placeholder.com/60'}
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
                        </>
                      )}
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => navigate(`/orders/${order.id}/tracking`)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#FF6B00] text-white rounded-xl text-sm font-medium hover:bg-[#E65000] transition-colors"
                        data-testid={`track-order-${order.id}`}
                      >
                        <Truck size={16} />
                        <span>تتبع</span>
                      </button>
                      
                      {/* زر إعادة الطلب */}
                      <button
                        onClick={() => handleReorder(order)}
                        disabled={reorderLoading === order.id}
                        className="flex items-center justify-center gap-1 px-3 py-2 bg-green-500 text-white rounded-xl text-sm font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                        data-testid={`reorder-${order.id}`}
                      >
                        <RefreshCw size={14} className={reorderLoading === order.id ? 'animate-spin' : ''} />
                        <span>إعادة الطلب</span>
                      </button>
                      
                      {/* زر التقييم - يظهر فقط للطلبات المكتملة */}
                      {order.delivery_status === 'delivered' && !ratedOrders[order.id] && (
                        <button
                          onClick={() => setRateOrder(order)}
                          className="flex items-center justify-center gap-1 px-3 py-2 bg-yellow-500 text-white rounded-xl text-sm font-medium hover:bg-yellow-600 transition-colors"
                          data-testid={`rate-order-${order.id}`}
                        >
                          <Star size={16} />
                          <span>قيّم</span>
                        </button>
                      )}
                      
                      {/* عرض التقييم إذا تم */}
                      {ratedOrders[order.id] && (
                        <div className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-xl text-sm">
                          <Star size={14} className="text-yellow-500 fill-yellow-500" />
                          <span className="font-medium text-gray-700">{ratedOrders[order.id].rating}</span>
                        </div>
                      )}
                      
                      <button
                        onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                        className="flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm hover:bg-gray-200 transition-colors"
                        data-testid={`view-order-${order.id}`}
                      >
                        <Eye size={16} />
                        <ChevronLeft size={14} className={`transition-transform ${selectedOrder?.id === order.id ? 'rotate-90' : ''}`} />
                      </button>
                    </div>
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
                                <div className="flex items-center gap-2">
                                  <p className="text-xs text-gray-500">{item.quantity}x {formatPrice(item.price)}</p>
                                  {item.selected_size && (
                                    <span className="text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                                      المقاس: {item.selected_size}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <p className="font-bold text-sm text-[#FF6B00]">{formatPrice(item.item_total)}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Delivery Address */}
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="font-bold text-gray-900 mb-2">عنوان التوصيل</h4>
                        <div className="bg-white p-3 rounded-lg space-y-2">
                          <div className="flex items-center gap-2 text-gray-600">
                            <User size={16} className="text-[#FF6B00]" />
                            <span className="text-sm font-medium">{user?.name || 'غير محدد'}</span>
                          </div>
                          <div className="flex items-start gap-2 text-gray-600">
                            <MapPin size={16} className="text-[#FF6B00] mt-0.5" />
                            <span className="text-sm">{order.city} - {order.address}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-600">
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

      {/* Rate Driver Modal */}
      {rateOrder && (
        <RateDriverModal
          order={rateOrder}
          onClose={() => setRateOrder(null)}
          onSuccess={() => {
            fetchOrders();
          }}
        />
      )}
    </div>
  );
};

export default OrdersPage;
