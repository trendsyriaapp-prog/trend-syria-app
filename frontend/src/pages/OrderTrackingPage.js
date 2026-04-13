import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Package, Clock, Truck, Check, MapPin, Phone, User, 
  MessageSquare, ChevronRight, ArrowRight, Camera, 
  Store, Navigation, CheckCircle2, Circle, Loader2, Star, AlertTriangle, Map, Gift
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import RateDriverModal from '../components/delivery/RateDriverModal';
import ReportDriverModal from '../components/delivery/ReportDriverModal';
import OrderTrackingMap from '../components/OrderTrackingMap';
import DriverTrackingMap from '../components/DriverTrackingMap';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('ar-SY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// خريطة الحالات
const statusSteps = [
  { key: 'pending_payment', label: 'في انتظار الدفع', icon: Clock, color: 'yellow' },
  { key: 'paid', label: 'تم الدفع', icon: Check, color: 'green' },
  { key: 'confirmed', label: 'تم التأكيد', icon: CheckCircle2, color: 'blue' },
  { key: 'preparing', label: 'جاري التحضير', icon: Package, color: 'blue' },
  { key: 'shipped', label: 'تم الشحن', icon: Truck, color: 'purple' },
  { key: 'picked_up', label: 'استلم الموظف', icon: User, color: 'orange' },
  { key: 'on_the_way', label: 'في الطريق', icon: Navigation, color: 'orange' },
  { key: 'delivered', label: 'تم التسليم', icon: CheckCircle2, color: 'green' },
];

const OrderTrackingPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [order, setOrder] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showRateModal, setShowRateModal] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  useEffect(() => {
    if (orderId) {
      fetchOrderTracking();
      checkRating();
    }
  }, [orderId]);

  const checkRating = async () => {
    try {
      const res = await axios.get(`${API}/api/delivery/check-rating/${orderId}`);
      setHasRated(res.data.has_rated);
    } catch (error) {
      console.error('Error checking rating:', error);
    }
  };

  const fetchOrderTracking = async () => {
    try {
      const [orderRes, trackingRes] = await Promise.all([
        axios.get(`${API}/api/orders/${orderId}`),
        axios.get(`${API}/api/orders/${orderId}/tracking`)
      ]);
      setOrder(orderRes.data);
      setTracking(trackingRes.data);
      setDeliveryNote(trackingRes.data.delivery_note || '');
    } catch (error) {
      console.error('Error fetching tracking:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل معلومات التتبع",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = async () => {
    setSavingNote(true);
    try {
      await axios.put(`${API}/api/orders/${orderId}/delivery-note`, {
        delivery_note: deliveryNote
      });
      toast({
        title: "تم الحفظ",
        description: "تم حفظ ملاحظتك لموظف التوصيل"
      });
      setShowNoteInput(false);
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل في حفظ الملاحظة",
        variant: "destructive"
      });
    } finally {
      setSavingNote(false);
    }
  };

  const getCurrentStepIndex = () => {
    const status = tracking?.delivery_status || order?.delivery_status || 'pending_payment';
    // معالجة الحالات القديمة
    if (status === 'pending') return 0;
    if (status === 'out_for_delivery') return 6; // on_the_way
    
    const index = statusSteps.findIndex(s => s.key === status);
    return index >= 0 ? index : 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  if (!order || !tracking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">الطلب غير موجود</p>
      </div>
    );
  }

  const currentStep = getCurrentStepIndex();
  const isDelivered = tracking.delivery_status === 'delivered';
  const canAddNote = !isDelivered && user?.id === order.user_id;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowRight size={20} />
          </button>
          <div>
            <h1 className="font-bold text-gray-900">تتبع الطلب</h1>
            <p className="text-xs text-gray-500">#{orderId.slice(0, 8)}</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Order Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <h2 className="font-bold text-gray-900 mb-4">حالة الطلب</h2>
          
          {/* Timeline */}
          <div className="relative">
            {statusSteps.map((step, index) => {
              const isCompleted = index <= currentStep;
              const isCurrent = index === currentStep;
              const StepIcon = step.icon;
              const historyItem = tracking.tracking_history?.find(h => h.status === step.key);
              
              return (
                <div key={step.key} className="flex gap-4 relative pb-6 last:pb-0">
                  {/* Line */}
                  {index < statusSteps.length - 1 && (
                    <div className={`absolute right-4 top-10 w-0.5 h-full -translate-x-1/2 ${
                      index < currentStep ? 'bg-[#FF6B00]' : 'bg-gray-200'
                    }`} />
                  )}
                  
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                    isCompleted
                      ? 'bg-[#FF6B00] text-white'
                      : 'bg-gray-200 text-gray-400'
                  } ${isCurrent ? 'ring-4 ring-[#FF6B00]/20' : ''}`}>
                    <StepIcon size={16} />
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                      {step.label}
                    </p>
                    {historyItem && (
                      <div className="text-xs text-gray-500 mt-1">
                        <span>{formatDate(historyItem.timestamp)}</span>
                        {historyItem.actor && (
                          <span className="mr-2">• {historyItem.actor}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Delivery Driver Info - للعميل */}
        {tracking.delivery_driver && user?.id === order.user_id && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-4 shadow-sm"
          >
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Truck size={18} className="text-[#FF6B00]" />
              موظف التوصيل
            </h2>
            
            <div className="flex items-center gap-4">
              {/* صورة الموظف */}
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-[#FF6B00]">
                {tracking.delivery_driver.photo ? (
                  <img 
                    src={tracking.delivery_driver.photo} 
                    alt={tracking.delivery_driver.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={24} className="text-gray-400" />
                )}
              </div>
              
              {/* معلومات الموظف */}
              <div className="flex-1">
                <p className="font-bold text-gray-900">{tracking.delivery_driver.name}</p>
                {tracking.delivery_driver.rating && (
                  <div className="flex items-center gap-1 mt-1">
                    <Star size={14} className="text-yellow-500 fill-yellow-500" />
                    <span className="text-sm font-medium text-gray-700">{tracking.delivery_driver.rating.toFixed(1)}</span>
                  </div>
                )}
                {tracking.delivery_driver.phone && (
                  <a 
                    href={`tel:${tracking.delivery_driver.phone}`}
                    className="text-sm text-[#FF6B00] flex items-center gap-1 mt-1"
                  >
                    <Phone size={12} />
                    {tracking.delivery_driver.phone}
                  </a>
                )}
              </div>
            </div>

            {/* الوقت المتوقع للوصول */}
            {order.estimated_arrival_minutes && ['picked_up', 'on_the_way'].includes(order.delivery_status) && (
              <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock size={18} className="text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">الوقت المتوقع للوصول</span>
                  </div>
                  <span className="font-bold text-orange-600 text-lg">{order.estimated_arrival_minutes} دقيقة</span>
                </div>
              </div>
            )}

            {/* زر التقييم - يظهر بعد التسليم */}
            {isDelivered && !hasRated && (
              <button
                onClick={() => setShowRateModal(true)}
                className="w-full mt-4 bg-yellow-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-yellow-600"
              >
                <Star size={18} />
                قيّم موظف التوصيل
              </button>
            )}

            {/* عرض التقييم إذا تم */}
            {hasRated && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl text-center">
                <p className="text-green-700 text-sm">✓ شكراً لتقييمك!</p>
              </div>
            )}

            {/* زر البلاغ الأخلاقي */}
            {tracking.delivery_driver?.id && (
              <button
                onClick={() => setShowReportModal(true)}
                className="w-full mt-3 border border-red-200 text-red-600 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-red-50 text-sm"
                data-testid="report-driver-btn"
              >
                <AlertTriangle size={16} />
                بلاغ أخلاقي
              </button>
            )}
            
            {/* أزرار التواصل مع السائق */}
            {tracking.delivery_driver?.id && ['picked_up', 'on_the_way'].includes(order.delivery_status) && (
              <div className="grid grid-cols-2 gap-3 mt-3">
                {/* زر الاتصال */}
                <a
                  href={`tel:${tracking.delivery_driver.phone}`}
                  className="flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-xl font-medium text-sm hover:bg-green-600 transition-colors"
                  data-testid="call-driver-btn"
                >
                  <Phone size={18} />
                  اتصال
                </a>
                {/* زر المحادثة */}
                <button
                  onClick={() => navigate(`/chat/${orderId}`)}
                  className="flex items-center justify-center gap-2 py-3 bg-blue-500 text-white rounded-xl font-medium text-sm hover:bg-blue-600 transition-colors"
                  data-testid="chat-driver-btn"
                >
                  <MessageSquare size={18} />
                  محادثة
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* خريطة تتبع السائق */}
        {tracking.delivery_driver && ['picked_up', 'on_the_way'].includes(order.delivery_status) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-2xl overflow-hidden shadow-sm"
          >
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Map size={18} className="text-[#FF6B00]" />
                تتبع موقع السائق
              </h2>
            </div>
            <OrderTrackingMap 
              orderId={orderId}
              order={order}
              trackingData={tracking}
              userType="buyer"
              embedded={true}
            />
          </motion.div>
        )}

        {/* كود التسليم للعميل */}
        {order.delivery_code && !isDelivered && order.delivery_status === 'on_the_way' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-4 shadow-lg"
          >
            <div className="text-center text-white">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-2xl">🔐</span>
                <h3 className="font-bold text-lg">كود التسليم</h3>
              </div>
              <p className="text-white/80 text-sm mb-3">أعطِ هذا الكود لموظف التوصيل عند الاستلام</p>
              <div className="bg-white rounded-xl py-3 px-6 inline-block">
                <span className="text-3xl font-bold text-purple-600 tracking-[0.3em]" data-testid="delivery-code">
                  {order.delivery_code}
                </span>
              </div>
              <p className="text-white/70 text-xs mt-3">
                ⚠️ لا تشارك هذا الكود مع أي شخص آخر
              </p>
            </div>
          </motion.div>
        )}

        {/* Customer Note Section */}
        {canAddNote && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <MessageSquare size={18} className="text-[#FF6B00]" />
                تفاصيل إضافية للتوصيل
              </h2>
              {!showNoteInput && deliveryNote && (
                <button
                  onClick={() => setShowNoteInput(true)}
                  className="text-sm text-[#FF6B00]"
                >
                  تعديل
                </button>
              )}
            </div>
            
            {/* نص توضيحي */}
            <p className="text-xs text-gray-500 mb-3">
              ساعد السائق للوصول إليك بسهولة
            </p>
            
            {showNoteInput || !deliveryNote ? (
              <div className="space-y-3">
                <textarea
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  placeholder="مثال: بناء رقم 5، الطابق الثالث، شقة 7، بجانب صيدلية الشفاء، اتصل قبل الوصول..."
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none h-24 focus:border-[#FF6B00] focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveNote}
                    disabled={savingNote}
                    className="flex-1 bg-[#FF6B00] text-white py-2 rounded-xl text-sm font-medium disabled:opacity-50"
                  >
                    {savingNote ? 'جاري الحفظ...' : 'حفظ'}
                  </button>
                  {deliveryNote && (
                    <button
                      onClick={() => setShowNoteInput(false)}
                      className="px-4 py-2 bg-gray-100 rounded-xl text-sm"
                    >
                      إلغاء
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 p-3 rounded-xl">
                <p className="text-gray-700 text-sm">{deliveryNote}</p>
              </div>
            )}
          </motion.div>
        )}

        {/* Order Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl p-4 shadow-sm"
        >
          <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Package size={18} className="text-[#FF6B00]" />
            تفاصيل الطلب
          </h2>
          
          {/* Products */}
          <div className="space-y-3 mb-4">
            {/* إذا كان الطلب هدية مفاجئة، نخفي تفاصيل المنتج */}
            {order.is_gift && order.is_surprise ? (
              <div className="flex gap-3 p-3 bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl">
                <div className="w-14 h-14 bg-gradient-to-br from-pink-400 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Gift size={28} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-purple-800">🎁 هدية مفاجأة!</p>
                  <p className="text-sm text-purple-600">من {order.gift_sender_name || 'صديق'}</p>
                  {order.gift_message && (
                    <p className="text-xs text-purple-500 mt-1 italic">"{order.gift_message}"</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">ستكتشف محتوى الهدية عند التوصيل!</p>
                </div>
              </div>
            ) : order.is_gift ? (
              // هدية عادية (ليست مفاجأة)
              <>
                <div className="flex items-center gap-2 bg-pink-50 p-2 rounded-lg mb-2">
                  <Gift size={16} className="text-pink-500" />
                  <span className="text-sm text-pink-600 font-medium">هدية من {order.gift_sender_name || 'صديق'}</span>
                </div>
                {order.items?.map((item, index) => (
                  <div key={index} className="flex gap-3 p-2 bg-gray-50 rounded-xl">
                    <div className="w-14 h-14 rounded-lg bg-white overflow-hidden flex-shrink-0">
                      {item.image || item.product_image ? (
                        <img src={item.image || item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Package size={20} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{item.product_name}</p>
                      <p className="text-xs text-gray-500">الكمية: {item.quantity}</p>
                      {item.selected_size && (
                        <p className="text-xs text-gray-500">المقاس: {item.selected_size}</p>
                      )}
                    </div>
                    <p className="font-bold text-[#FF6B00] text-sm">{formatPrice(item.item_total || item.price)}</p>
                  </div>
                ))}
              </>
            ) : (
              // طلب عادي
              order.items?.map((item, index) => (
                <div key={index} className="flex gap-3 p-2 bg-gray-50 rounded-xl">
                  <div className="w-14 h-14 rounded-lg bg-white overflow-hidden flex-shrink-0">
                    {item.image || item.product_image ? (
                      <img src={item.image || item.product_image} alt={item.product_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Package size={20} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{item.product_name}</p>
                    <p className="text-xs text-gray-500">الكمية: {item.quantity}</p>
                    {item.selected_size && (
                      <p className="text-xs text-gray-500">المقاس: {item.selected_size}</p>
                    )}
                  </div>
                  <p className="font-bold text-[#FF6B00] text-sm">{formatPrice(item.item_total || item.price)}</p>
                </div>
              ))
            )}
          </div>
          
          {/* Delivery Address */}
          <div className="border-t pt-4">
            <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
              <MapPin size={16} className="text-gray-400" />
              عنوان التوصيل
            </h3>
            <p className="text-sm text-gray-600">{typeof order.address === 'object' 
              ? [order.address?.area, order.address?.street, order.address?.building].filter(Boolean).join(', ')
              : order.address}</p>
            <p className="text-sm text-gray-500">{order.city}</p>
            <a 
              href={`tel:${order.phone}`}
              className="flex items-center gap-1 text-[#FF6B00] text-sm mt-2"
            >
              <Phone size={14} />
              {order.phone}
            </a>
          </div>
          
          {/* Total */}
          <div className="border-t pt-4 mt-4 flex justify-between items-center">
            <span className="font-medium text-gray-700">الإجمالي</span>
            <span className="text-lg font-bold text-[#FF6B00]">{formatPrice(order.total)}</span>
          </div>
        </motion.div>

        {/* Seller Info - لموظف التوصيل */}
        {tracking.sellers && user?.user_type === 'delivery' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl p-4 shadow-sm"
          >
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Store size={18} className="text-[#FF6B00]" />
              معلومات البائع
            </h2>
            
            {tracking.sellers.map((seller, index) => (
              <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl mb-2 last:mb-0">
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{seller.store_name || seller.name}</p>
                  <p className="text-sm text-gray-500">{typeof seller.store_address === 'object' 
                    ? [seller.store_address?.area, seller.store_address?.street, seller.store_address?.building].filter(Boolean).join(', ')
                    : seller.store_address}</p>
                  <a 
                    href={`tel:${seller.phone}`}
                    className="flex items-center gap-1 text-[#FF6B00] text-sm mt-1"
                  >
                    <Phone size={14} />
                    {seller.phone}
                  </a>
                </div>
                <a
                  href={`tel:${seller.phone}`}
                  className="w-10 h-10 bg-[#FF6B00] text-white rounded-full flex items-center justify-center"
                >
                  <Phone size={18} />
                </a>
              </div>
            ))}
          </motion.div>
        )}

        {/* Customer Info - لموظف التوصيل */}
        {tracking.customer && user?.user_type === 'delivery' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-2xl p-4 shadow-sm"
          >
            <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <User size={18} className="text-[#FF6B00]" />
              معلومات العميل
            </h2>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User size={18} className="text-gray-400" />
                <span className="text-gray-900">{tracking.customer.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={18} className="text-gray-400" />
                <a href={`tel:${tracking.customer.phone}`} className="text-[#FF6B00]">
                  {tracking.customer.phone}
                </a>
              </div>
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-gray-900">{typeof tracking.customer.address === 'object' 
                    ? [tracking.customer.address?.area, tracking.customer.address?.street, tracking.customer.address?.building].filter(Boolean).join(', ')
                    : tracking.customer.address}</p>
                  <p className="text-gray-500 text-sm">{tracking.customer.city}</p>
                </div>
              </div>
              
              {/* ملاحظة العميل */}
              {tracking.customer.delivery_note && (
                <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-200">
                  <p className="text-xs text-yellow-700 font-medium mb-1">ملاحظة من العميل:</p>
                  <p className="text-gray-800 text-sm">{tracking.customer.delivery_note}</p>
                </div>
              )}
            </div>
            
            {/* زر الاتصال */}
            <a
              href={`tel:${tracking.customer.phone}`}
              className="w-full mt-4 bg-[#FF6B00] text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <Phone size={18} />
              اتصال بالعميل
            </a>
          </motion.div>
        )}
      </div>

      {/* Rate Driver Modal */}
      {showRateModal && (
        <RateDriverModal
          order={order}
          onClose={() => setShowRateModal(false)}
          onSuccess={() => {
            setHasRated(true);
          }}
        />
      )}

      {/* Report Driver Modal */}
      <ReportDriverModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        driverId={tracking?.delivery_driver?.id}
        driverName={tracking?.delivery_driver?.name || 'موظف التوصيل'}
        orderId={orderId}
        onSuccess={() => {
          toast({
            title: "تم إرسال البلاغ",
            description: "سيتم مراجعته من قبل الإدارة",
          });
        }}
      />

      {/* زر الدعم واتساب */}
      <a
        href="https://wa.me/963945570365"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-20 left-4 z-40 flex items-center gap-2 bg-green-500 text-white px-4 py-3 rounded-full shadow-lg hover:bg-green-600 transition-all"
      >
        <MessageSquare size={20} />
        <span className="text-sm font-bold">مساعدة</span>
      </a>
    </div>
  );
};

export default OrderTrackingPage;
