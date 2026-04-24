// /app/frontend/src/components/foodstore/StoreOrdersTab.js
// مكون إدارة طلبات المتجر - تم استخراجه من FoodStoreDashboard

import { useState, useEffect, useRef } from 'react';
import logger from '../../lib/logger';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Package, ShoppingBag, X, Check, Clock, ChefHat, 
  Truck, Phone, MapPin, Timer, Navigation
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import SellerDriverTrackingMap from '../SellerDriverTrackingMap';
import DriverWaitingAlert from '../seller/DriverWaitingAlert';

const API = process.env.REACT_APP_BACKEND_URL;

// مكون فحص توفر السائقين
const DriverAvailabilityCheck = ({ orderId }) => {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);

  const checkAvailability = async () => {
    setChecking(true);
    try {
      const res = await axios.get(`${API}/api/food/orders/store/orders/${orderId}/check-drivers`);
      setResult(res.data);
    } catch (error) {
      setResult({ available: false, error: true });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkAvailability();
    const interval = setInterval(checkAvailability, 60000);
    return () => clearInterval(interval);
  }, [orderId]);

  if (!result) return null;

  if (result.available) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
        <p className="text-green-700 text-xs">
          ✅ {result.driver_count || 'عدة'} سائقين متاحين في المنطقة
        </p>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-center">
      <p className="text-amber-700 text-xs">
        ⚠️ لا يوجد سائقين متاحين حالياً - سيتم البحث عند قبول الطلب
      </p>
    </div>
  );
};

const StoreOrdersTab = ({ token, onNewOrder }) => {
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const previousPendingCountRef = useRef(0);
  
  // Modal لبدء التحضير مع تحديد الوقت
  const [showPrepModal, setShowPrepModal] = useState(null);
  const [prepTime, setPrepTime] = useState(15);
  const [prepSubmitting, setPrepSubmitting] = useState(false);
  
  // حالة طلب السائق الجديدة
  const [requestingDriver, setRequestingDriver] = useState(null);
  const [showSetPrepTimeModal, setShowSetPrepTimeModal] = useState(null);
  const [newPrepTime, setNewPrepTime] = useState(15);
  const [settingPrepTime, setSettingPrepTime] = useState(false);

  // التحقق من الطلبات الجديدة وتشغيل الصوت
  useEffect(() => {
    const pendingCount = orders.filter(o => o.status === 'pending').length;
    
    if (pendingCount > previousPendingCountRef.current && previousPendingCountRef.current !== 0) {
      if (onNewOrder) {
        onNewOrder(pendingCount);
      }
    }
    previousPendingCountRef.current = pendingCount;
  }, [orders, onNewOrder]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchOrders = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const res = await axios.get(`${API}/api/food/orders/store/orders`, { params });
      setOrders(res.data || []);
    } catch (error) {
      logger.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      await axios.post(`${API}/api/food/orders/store/orders/${orderId}/status`, null, {
        params: { new_status: newStatus }
      });
      fetchOrders();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل تحديث الحالة", variant: "destructive" });
    }
  };

  const startPreparation = async (orderId) => {
    setPrepSubmitting(true);
    try {
      await axios.post(
        `${API}/api/food/orders/store/orders/${orderId}/start-preparation`,
        { preparation_time_minutes: prepTime }
      );
      setShowPrepModal(null);
      setPrepTime(15);
      fetchOrders();
    } catch (error) {
      toast({ 
        title: "خطأ", 
        description: error.response?.data?.detail || "فشل بدء التحضير", 
        variant: "destructive" 
      });
    } finally {
      setPrepSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      paid: 'bg-blue-100 text-blue-700',
      confirmed: 'bg-blue-100 text-blue-700',
      preparing: 'bg-orange-100 text-orange-700',
      ready: 'bg-orange-100 text-[#FF6B00]',
      out_for_delivery: 'bg-purple-100 text-purple-700',
      delivered: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'بانتظار الدفع',
      paid: 'مدفوع - بانتظار الموافقة',
      confirmed: 'تم التأكيد',
      preparing: 'جاري التحضير',
      ready: 'جاهز للاستلام',
      out_for_delivery: 'في الطريق',
      delivered: 'تم التسليم',
      cancelled: 'ملغي'
    };
    return labels[status] || status;
  };

  const reportFalseArrival = async (orderId) => {
    if (!window.confirm('هل أنت متأكد أن السائق لم يصل فعلياً للمتجر؟')) return;

    try {
      await axios.post(
        `${API}/api/food/orders/store/orders/${orderId}/report-false-arrival`,
        null,
        { params: { reason: 'السائق لم يصل فعلياً' } }
      );
      fetchOrders();
    } catch (error) {
      toast({ 
        title: "خطأ", 
        description: error.response?.data?.detail || "فشل إرسال الشكوى", 
        variant: "destructive" 
      });
    }
  };

  const getRemainingPrepTime = (order) => {
    if (!order.expected_ready_at) return null;
    const expected = new Date(order.expected_ready_at);
    const now = new Date();
    const diffMinutes = Math.ceil((expected - now) / (1000 * 60));
    return Math.max(0, diffMinutes);
  };

  const requestDriver = async (orderId) => {
    setRequestingDriver(orderId);
    try {
      await axios.post(`${API}/api/food/orders/store/orders/${orderId}/request-driver`, {});
      fetchOrders();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل طلب السائق",
        variant: "destructive"
      });
    } finally {
      setRequestingDriver(null);
    }
  };

  const setPreparationTime = async (orderId) => {
    setSettingPrepTime(true);
    try {
      const res = await axios.post(
        `${API}/api/food/orders/store/orders/${orderId}/set-preparation-time`,
        { preparation_time_minutes: newPrepTime }
      );
      
      toast({
        title: "تم تحديد وقت التحضير",
        description: `سيتم إبلاغ السائق. كود الاستلام: ${res.data.pickup_code}`
      });
      setShowSetPrepTimeModal(null);
      setNewPrepTime(15);
      fetchOrders();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل تحديد وقت التحضير",
        variant: "destructive"
      });
    } finally {
      setSettingPrepTime(false);
    }
  };

  const getDriverStatusText = (order) => {
    if (!order.driver_requested) return null;
    
    switch (order.driver_status) {
      case 'waiting_for_driver':
        return { text: 'بانتظار اتصال السائقين...', color: 'text-yellow-600', bg: 'bg-yellow-50' };
      case 'waiting_for_acceptance':
        return { text: 'بانتظار قبول السائق...', color: 'text-blue-600', bg: 'bg-blue-50' };
      case 'driver_accepted':
        return { 
          text: `✅ السائق ${order.driver_name || ''} قبل - سيصل خلال ${order.driver_estimated_arrival_minutes || '?'} دقيقة`, 
          color: 'text-[#FF6B00]', 
          bg: 'bg-orange-50' 
        };
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
        {[
          { id: 'all', label: 'الكل' },
          { id: 'pending', label: 'جديدة' },
          { id: 'confirmed', label: 'مؤكدة' },
          { id: 'preparing', label: 'قيد التحضير' },
          { id: 'ready', label: 'جاهزة' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            data-testid={`filter-${f.id}`}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
              filter === f.id ? 'bg-[#FF6B00] text-white' : 'bg-white text-gray-600 border'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
          <ShoppingBag size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600">لا توجد طلبات</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const remainingTime = getRemainingPrepTime(order);
            return (
              <div key={order.id} data-testid={`order-card-${order.id}`} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-bold text-gray-900">#{order.order_number}</span>
                      <span className={`text-xs px-2 py-1 rounded-full mr-2 ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    <span className="font-bold text-[#FF6B00]">{order.total?.toLocaleString()} ل.س</span>
                  </div>

                  {/* Items */}
                  <div className="space-y-1 mb-3">
                    {order.items?.map((item, i) => (
                      <div key={`item-${order.id}-${item.product_id}-${i}`} className="flex flex-col">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{item.name} x{item.quantity}</span>
                          <span className="text-gray-900">{item.total?.toLocaleString()}</span>
                        </div>
                        {item.notes && (
                          <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded mr-2 mt-0.5 inline-block">📝 {item.notes}</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Customer Info */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Phone size={14} />
                      {order.customer_phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={14} />
                      {order.delivery_city}
                    </span>
                  </div>

                  {/* Actions based on status */}
                  {(order.status === 'pending' || order.status === 'paid') && (
                    <div className="space-y-3">
                      <DriverAvailabilityCheck orderId={order.id} />
                      
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateStatus(order.id, 'confirmed')}
                          data-testid={`confirm-order-${order.id}`}
                          className="flex-1 bg-[#FF6B00] text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-[#E65000]"
                        >
                          <Check size={16} />
                          قبول الطلب
                        </button>
                        <button
                          onClick={() => updateStatus(order.id, 'cancelled')}
                          data-testid={`reject-order-${order.id}`}
                          className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                        >
                          رفض
                        </button>
                      </div>
                    </div>
                  )}

                  {order.status === 'confirmed' && (
                    <div className="space-y-3">
                      {order.driver_requested && (
                        <div className={`${getDriverStatusText(order)?.bg || 'bg-gray-50'} border rounded-lg p-3`}>
                          <div className="flex items-center gap-2">
                            <Truck size={16} className={getDriverStatusText(order)?.color || 'text-gray-600'} />
                            <span className={`text-sm font-medium ${getDriverStatusText(order)?.color || 'text-gray-600'}`}>
                              {getDriverStatusText(order)?.text}
                            </span>
                          </div>
                          
                          {order.driver_status === 'driver_accepted' && order.waiting_for_preparation_time && (
                            <button
                              onClick={() => {
                                setShowSetPrepTimeModal(order);
                                setNewPrepTime(15);
                              }}
                              data-testid={`set-prep-time-${order.id}`}
                              className="mt-3 w-full bg-orange-500 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-orange-600"
                            >
                              <Timer size={16} />
                              حدد وقت التحضير
                            </button>
                          )}
                        </div>
                      )}
                      
                      {!order.driver_requested && (
                        <div className="space-y-2">
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-center">
                            <p className="text-amber-700 text-xs">⚠️ يجب طلب سائق أولاً قبل بدء التحضير</p>
                          </div>
                          <button
                            onClick={() => requestDriver(order.id)}
                            disabled={requestingDriver === order.id}
                            data-testid={`request-driver-${order.id}`}
                            className="w-full bg-blue-500 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-600 disabled:opacity-50"
                          >
                            {requestingDriver === order.id ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <Truck size={16} />
                                طلب سائق
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {order.status === 'preparing' && (
                    <div className="space-y-3">
                      {remainingTime !== null && (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-orange-700 font-medium flex items-center gap-1">
                              <Clock size={14} />
                              جاري التحضير
                            </span>
                            <span className="text-sm font-bold text-orange-600">
                              {remainingTime > 0 ? `${remainingTime} دقيقة متبقية` : 'حان الوقت!'}
                            </span>
                          </div>
                          <div className="w-full h-2 bg-orange-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-orange-500 transition-all duration-1000"
                              style={{ 
                                width: `${Math.min(100, ((order.preparation_time_minutes - remainingTime) / order.preparation_time_minutes) * 100)}%` 
                              }}
                            />
                          </div>
                          {order.driver_name && (
                            <p className="text-xs text-orange-600 mt-2">
                              🏍️ السائق {order.driver_name} في الطريق
                            </p>
                          )}
                        </div>
                      )}
                      <button
                        onClick={() => updateStatus(order.id, 'ready')}
                        data-testid={`mark-ready-${order.id}`}
                        className="w-full bg-[#FF6B00] text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-[#E65000]"
                      >
                        <Package size={16} />
                        الطلب جاهز
                      </button>
                    </div>
                  )}

                  {order.status === 'ready' && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
                      <p className="text-[#FF6B00] text-sm mb-2">بانتظار موظف التوصيل</p>
                      
                      {order.pickup_code && (
                        <div className="bg-white rounded-lg p-4 mt-2 border-2 border-dashed border-[#FF6B00]">
                          <p className="text-xs text-gray-500 mb-2">كود الاستلام - أعطه لموظف التوصيل</p>
                          <div className="flex justify-center gap-2" dir="ltr">
                            {order.pickup_code.split('').map((digit, i) => (
                              <span 
                                key={`code-${order.id}-${i}`}
                                className="w-12 h-14 flex items-center justify-center text-2xl font-bold bg-[#FF6B00] text-white rounded-lg shadow-md"
                              >
                                {digit}
                              </span>
                            ))}
                          </div>
                          {order.pickup_code_verified && (
                            <p className="text-[#FF6B00] text-xs mt-2 font-bold">
                              ✅ تم تأكيد الاستلام
                            </p>
                          )}
                        </div>
                      )}
                      
                      {order.driver_name && (
                        <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="flex items-center gap-3">
                            {order.driver_image ? (
                              <img 
                                src={order.driver_image} 
                                alt={order.driver_name}
                                className="w-14 h-14 rounded-full object-cover border-2 border-blue-400"
                              />
                            ) : (
                              <div className="w-14 h-14 rounded-full bg-blue-200 flex items-center justify-center border-2 border-blue-400">
                                <span className="text-2xl">🏍️</span>
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="text-sm text-blue-800 font-bold">{order.driver_name}</p>
                              <p className="text-[10px] text-blue-600">موظف التوصيل</p>
                              {order.driver_phone && (
                                <p className="text-[11px] text-gray-600 font-mono" dir="ltr">{order.driver_phone}</p>
                              )}
                            </div>
                            {order.driver_phone && (
                              <a 
                                href={`tel:${order.driver_phone}`}
                                className="bg-blue-500 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-blue-600 flex items-center gap-1"
                              >
                                📞 اتصال
                              </a>
                            )}
                          </div>
                          {order.driver_arrived_at && (
                            <>
                              {!order.pickup_code_verified && (
                                <DriverWaitingAlert
                                  arrivedAt={order.driver_arrived_at}
                                  driverName={order.driver_name || 'السائق'}
                                  orderId={order.id}
                                />
                              )}
                              
                              {order.pickup_code_verified && (
                                <p className="text-xs text-[#FF6B00] mt-2 font-bold">
                                  ✅ تم تسليم الطلب للسائق
                                </p>
                              )}
                              
                              {!order.pickup_code_verified && (
                                <button
                                  onClick={() => reportFalseArrival(order.id)}
                                  data-testid={`report-false-arrival-${order.id}`}
                                  className="mt-2 w-full text-xs bg-red-100 text-red-600 py-1.5 rounded-lg hover:bg-red-200 flex items-center justify-center gap-1"
                                >
                                  ⚠️ السائق لم يصل فعلياً؟
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {order.status === 'out_for_delivery' && (
                    <div className="space-y-2">
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <p className="text-purple-700 text-sm font-medium flex items-center justify-center gap-2 mb-3">
                          <Navigation size={16} className="animate-pulse" />
                          جاري التوصيل للعميل
                        </p>
                        {order.driver_name && (
                          <div className="flex items-center gap-3 bg-white rounded-lg p-2">
                            {order.driver_image ? (
                              <img 
                                src={order.driver_image} 
                                alt={order.driver_name}
                                className="w-12 h-12 rounded-full object-cover border-2 border-purple-400"
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-full bg-purple-200 flex items-center justify-center border-2 border-purple-400">
                                <span className="text-xl">🏍️</span>
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="text-sm text-purple-800 font-bold">{order.driver_name}</p>
                              <p className="text-[10px] text-purple-600">في الطريق للعميل</p>
                            </div>
                            {order.driver_phone && (
                              <a 
                                href={`tel:${order.driver_phone}`}
                                className="bg-purple-500 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-purple-600"
                              >
                                📞 اتصال
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      
                      {order.driver_id && (
                        <SellerDriverTrackingMap 
                          orderId={order.id} 
                          token={token}
                          driverName={order.driver_name || 'السائق'}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal بدء التحضير */}
      {showPrepModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="bg-white rounded-t-3xl w-full max-w-lg p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">بدء تحضير الطلب</h3>
              <button onClick={() => setShowPrepModal(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="bg-orange-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-orange-700 mb-2 font-medium">طلب #{showPrepModal.order_number}</p>
              <p className="text-xs text-orange-600">
                حدد الوقت المتوقع للتحضير. سيتم إرسال الطلب للسائق الأقرب قبل 7 دقائق من الجهوزية.
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">وقت التحضير المتوقع</label>
              <div className="grid grid-cols-4 gap-2">
                {[10, 15, 20, 30, 45, 60].map((time) => (
                  <button
                    key={time}
                    onClick={() => setPrepTime(time)}
                    data-testid={`prep-time-${time}`}
                    className={`py-3 rounded-xl text-sm font-medium transition-all ${
                      prepTime === time ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {time} دقيقة
                  </button>
                ))}
              </div>
              
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  value={prepTime}
                  onChange={(e) => setPrepTime(parseInt(e.target.value) || 15)}
                  min={5}
                  max={120}
                  className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-center"
                />
                <span className="text-sm text-gray-500">دقيقة</span>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl p-3 mb-6">
              <p className="text-sm text-blue-700 flex items-center gap-2">
                <Truck size={16} />
                <span>سيتم إرسال الطلب للسائق بعد <strong>{Math.max(0, prepTime - 7)}</strong> دقيقة</span>
              </p>
            </div>

            <button
              onClick={() => startPreparation(showPrepModal.id)}
              disabled={prepSubmitting}
              data-testid="confirm-start-prep"
              className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-orange-600 disabled:opacity-50"
            >
              {prepSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ChefHat size={20} />
                  بدء التحضير الآن
                </>
              )}
            </button>
          </motion.div>
        </div>
      )}

      {/* Modal تحديد وقت التحضير (بعد قبول السائق) */}
      {showSetPrepTimeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="bg-white rounded-t-3xl w-full max-w-lg p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">تحديد وقت التحضير</h3>
              <button onClick={() => setShowSetPrepTimeModal(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="bg-orange-50 rounded-xl p-4 mb-4">
              <p className="text-sm text-[#FF6B00] mb-2 font-medium flex items-center gap-2">
                <Check size={16} />
                السائق {showSetPrepTimeModal.driver_name} قبل الطلب!
              </p>
              <p className="text-xs text-[#FF6B00]">
                سيصل السائق خلال {showSetPrepTimeModal.driver_estimated_arrival_minutes || '?'} دقيقة
              </p>
            </div>

            <div className="bg-blue-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-700">
                <strong>الخطوة التالية:</strong> حدد كم دقيقة تحتاج لتحضير الطلب #{showSetPrepTimeModal.order_number}
              </p>
              <p className="text-xs text-blue-600 mt-1">سيتم إبلاغ السائق بالوقت المناسب للذهاب للمتجر</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">وقت التحضير المطلوب</label>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 15, 20, 25, 30, 45, 60].map((time) => (
                  <button
                    key={time}
                    onClick={() => setNewPrepTime(time)}
                    data-testid={`new-prep-time-${time}`}
                    className={`py-3 rounded-xl text-sm font-medium transition-all ${
                      newPrepTime === time ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {time} د
                  </button>
                ))}
              </div>
              
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  value={newPrepTime}
                  onChange={(e) => setNewPrepTime(parseInt(e.target.value) || 15)}
                  min={3}
                  max={120}
                  className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-center"
                />
                <span className="text-sm text-gray-500">دقيقة</span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-xs text-gray-500 mb-2">الجدول الزمني المتوقع:</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">وصول السائق للمتجر:</span>
                  <span className="font-medium">{showSetPrepTimeModal.driver_estimated_arrival_minutes || '?'} دقيقة</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">جاهزية الطلب:</span>
                  <span className="font-medium text-[#FF6B00]">{newPrepTime} دقيقة</span>
                </div>
                {newPrepTime > (showSetPrepTimeModal.driver_estimated_arrival_minutes || 0) && (
                  <div className="flex justify-between text-blue-600">
                    <span>سيُبلغ السائق بالانتظار:</span>
                    <span className="font-medium">{newPrepTime - (showSetPrepTimeModal.driver_estimated_arrival_minutes || 0)} دقيقة</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setPreparationTime(showSetPrepTimeModal.id)}
              disabled={settingPrepTime}
              data-testid="confirm-set-prep-time"
              className="w-full bg-blue-500 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-blue-600 disabled:opacity-50"
            >
              {settingPrepTime ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Timer size={20} />
                  تأكيد وبدء التحضير
                </>
              )}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default StoreOrdersTab;
