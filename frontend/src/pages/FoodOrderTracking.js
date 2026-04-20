// /app/frontend/src/pages/FoodOrderTracking.js
// صفحة تتبع طلب الطعام

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Package, Clock, Check, Truck, MapPin, Phone, Store,
  ArrowLeft, X, ChefHat, CheckCircle2, Star, Map, AlertTriangle, Timer
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import DriverTrackingMap from '../components/DriverTrackingMap';

const API = process.env.REACT_APP_BACKEND_URL;

// مدة السماح بالإلغاء بالثواني (3 دقائق)
const CANCEL_WINDOW_SECONDS = 3 * 60;

const ORDER_STEPS = [
  { key: 'pending', label: 'تم الاستلام', icon: Package },
  { key: 'confirmed', label: 'تم التأكيد', icon: Check },
  { key: 'preparing', label: 'جاري التحضير', icon: ChefHat },
  { key: 'ready', label: 'جاهز', icon: Package },
  { key: 'out_for_delivery', label: 'في الطريق', icon: Truck },
  { key: 'delivered', label: 'تم التوصيل', icon: CheckCircle2 },
];

const FoodOrderTracking = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const { toast } = useToast();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRating, setShowRating] = useState(false);
  const [cancelTimeLeft, setCancelTimeLeft] = useState(0);

  // حساب الوقت المتبقي للإلغاء
  const calculateCancelTimeLeft = useCallback((orderData) => {
    if (!orderData?.created_at) return 0;
    
    const createdAt = new Date(orderData.created_at);
    const now = new Date();
    const elapsedSeconds = Math.floor((now - createdAt) / 1000);
    const remaining = CANCEL_WINDOW_SECONDS - elapsedSeconds;
    
    return Math.max(0, remaining);
  }, []);

  useEffect(() => {
    fetchOrder();
    // Polling for updates every 30 seconds
    const interval = setInterval(fetchOrder, 30000);
    return () => clearInterval(interval);
  }, [orderId]);

  // مؤقت العد التنازلي للإلغاء
  useEffect(() => {
    if (!order || cancelTimeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setCancelTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [order, cancelTimeLeft > 0]);

  const fetchOrder = async () => {
    try {
      const res = await axios.get(`${API}/api/food/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrder(res.data);
      
      // حساب الوقت المتبقي للإلغاء
      const timeLeft = calculateCancelTimeLeft(res.data);
      setCancelTimeLeft(timeLeft);
      
      // إظهار التقييم إذا تم التسليم ولم يتم التقييم بعد
      if (res.data.status === 'delivered' && !res.data.rating) {
        setTimeout(() => setShowRating(true), 1000);
      }
    } catch (error) {
      toast({ title: "خطأ", description: "فشل تحميل الطلب", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    // التحقق من الوقت المتبقي
    if (cancelTimeLeft <= 0) {
      toast({ 
        title: "لا يمكن الإلغاء", 
        description: "انتهت مهلة الـ 3 دقائق للإلغاء", 
        variant: "destructive" 
      });
      return;
    }
    
    if (!window.confirm('هل تريد إلغاء الطلب؟')) return;

    try {
      await axios.post(`${API}/api/food/orders/${orderId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: "تم الإلغاء", description: "تم إلغاء الطلب واسترجاع المبلغ" });
      fetchOrder();
    } catch (error) {
      toast({ 
        title: "خطأ", 
        description: error.response?.data?.detail || "فشل إلغاء الطلب", 
        variant: "destructive" 
      });
    }
  };

  // تنسيق الوقت المتبقي
  const formatTimeLeft = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentStepIndex = () => {
    if (!order) return 0;
    if (order.status === 'cancelled') return -1;
    return ORDER_STEPS.findIndex(s => s.key === order.status);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">الطلب غير موجود</h2>
          <button
            onClick={() => navigate('/food')}
            className="bg-[#FF6B00] text-white px-6 py-2 rounded-xl font-bold"
          >
            العودة للطعام
          </button>
        </div>
      </div>
    );
  }

  const currentStep = getCurrentStepIndex();
  const isCancelled = order.status === 'cancelled';
  const isDelivered = order.status === 'delivered';
  // يمكن الإلغاء فقط إذا كان الوقت المتبقي > 0 والحالة تسمح بذلك
  const canCancel = cancelTimeLeft > 0 && !['out_for_delivery', 'delivered', 'cancelled'].includes(order.status);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className={`${isCancelled ? 'bg-red-500' : isDelivered ? 'bg-green-500' : 'bg-gradient-to-b from-[#FF6B00] to-[#FF8533]'} text-white px-4 py-6`}>
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => navigate('/food')}
            className="flex items-center gap-2 text-white/80 hover:text-white mb-4"
          >
            <ArrowLeft size={20} />
            رجوع
          </button>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm">طلب رقم</p>
              <h1 className="text-xl font-bold">{order.order_number}</h1>
            </div>
            <div className="text-left">
              <p className="text-white/80 text-sm">الحالة</p>
              <p className="font-bold">{order.status_label}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Progress Steps */}
        {!isCancelled && (
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex justify-between items-center relative">
              {/* Progress Line */}
              <div className="absolute top-5 left-4 right-4 h-0.5 bg-gray-200">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(0, (currentStep / (ORDER_STEPS.length - 1)) * 100)}%` }}
                  className="h-full bg-green-500"
                />
              </div>

              {ORDER_STEPS.map((step, index) => {
                const isActive = index <= currentStep;
                const Icon = step.icon;
                return (
                  <div key={step.key} className="flex flex-col items-center z-10">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isActive ? 'bg-[#FF6B00] text-white' : 'bg-gray-200 text-gray-400'
                    }`}>
                      <Icon size={18} />
                    </div>
                    <span className={`text-xs mt-2 text-center ${isActive ? 'text-[#FF6B00] font-medium' : 'text-gray-400'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Cancelled Notice */}
        {isCancelled && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <X size={24} className="text-red-500" />
            <div>
              <p className="font-bold text-red-800">تم إلغاء الطلب</p>
              <p className="text-sm text-red-600">تم استرجاع المبلغ للمحفظة</p>
            </div>
          </div>
        )}

        {/* Estimated Time */}
        {!isCancelled && !isDelivered && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
            <Clock size={24} className="text-[#FF6B00]" />
            <div>
              <p className="font-bold text-[#FF6B00]">الوقت المتوقع للتوصيل</p>
              <p className="text-sm text-[#FF6B00]">{order.estimated_delivery_time} دقيقة</p>
            </div>
          </div>
        )}

        {/* كود التسليم */}
        {order.delivery_code && !isCancelled && !isDelivered && order.status === 'out_for_delivery' && (
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-3 text-white">
            <div className="flex items-center justify-between max-w-7xl mx-auto">
              <div>
                <p className="font-bold text-sm">🔐 كود التسليم</p>
                <p className="text-xs text-white/80">أعطِ هذا الكود للسائق</p>
              </div>
              <div className="bg-white text-purple-600 px-3 py-1.5 rounded-lg">
                <span className="text-xl font-bold tracking-widest">{order.delivery_code}</span>
              </div>
            </div>
          </div>
        )}

        {/* تحذير ترك الطلب عند الباب */}
        {order.customer_not_responding && !isCancelled && !isDelivered && (
          <div className="bg-red-50 border-y-2 border-red-300 p-3">
            <div className="flex items-start gap-2 max-w-7xl mx-auto">
              <AlertTriangle size={24} className="text-red-500 flex-shrink-0" />
              <div>
                <p className="font-bold text-red-800">⚠️ السائق ينتظرك!</p>
                <p className="text-sm text-red-600">
                  السائق يحاول الاتصال بك. إذا لم ترد، سيتم ترك الطلب عند الباب ولن تُسترد الأموال.
                </p>
                <a 
                  href={`tel:${order.driver_phone || ''}`}
                  className="inline-block mt-2 bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold"
                >
                  📞 اتصل بالسائق
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ملاحظة ترك عند الباب */}
        {order.left_at_door && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">🚪</span>
            <div>
              <p className="font-bold text-yellow-800">تم ترك الطلب عند الباب</p>
              <p className="text-sm text-yellow-600">لم نتمكن من الوصول إليك</p>
            </div>
          </div>
        )}

        {/* خريطة تتبع السائق - تظهر عندما يكون الطلب قيد التوصيل */}
        {(order.status === 'out_for_delivery' || order.status === 'ready') && !isCancelled && (
          <DriverTrackingMap orderId={orderId} orderStatus={order.status} />
        )}

        {/* Store Info */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Store size={18} className="text-[#FF6B00]" />
            المتجر
          </h3>
          <p className="text-gray-900 font-medium">{order.store_name}</p>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">تفاصيل الطلب</h3>
          </div>
          {order.items.map((item, index) => (
            <div key={item.id || item.product_id || `item-${index}`} className="p-4 border-b border-gray-100 last:border-0 flex justify-between items-center">
              <div>
                <p className="font-medium text-gray-900">{item.name}</p>
                <p className="text-sm text-gray-500">x{item.quantity}</p>
              </div>
              <p className="font-bold text-gray-900">{item.total.toLocaleString()} ل.س</p>
            </div>
          ))}
          <div className="p-4 bg-gray-50">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">المجموع الفرعي</span>
              <span className="text-gray-900">{order.subtotal.toLocaleString()} ل.س</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">رسوم التوصيل</span>
              <span className="text-gray-900">{order.delivery_fee.toLocaleString()} ل.س</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
              <span className="text-gray-900">الإجمالي</span>
              <span className="text-[#FF6B00]">{order.total.toLocaleString()} ل.س</span>
            </div>
          </div>
        </div>

        {/* Delivery Info */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-3">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <MapPin size={18} className="text-[#FF6B00]" />
            عنوان التوصيل
          </h3>
          <p className="text-gray-900">
            {typeof order.delivery_address === 'object' 
              ? [order.delivery_address?.area, order.delivery_address?.street, order.delivery_address?.building].filter(Boolean).join(', ')
              : order.delivery_address}
          </p>
          <p className="text-gray-500">{order.delivery_city}</p>
          <div className="flex items-center gap-2 text-gray-600">
            <Phone size={16} />
            <span>{order.delivery_phone}</span>
          </div>
          {/* زر فتح في خرائط Google */}
          <button
            onClick={() => {
              const addressStr = typeof order.delivery_address === 'object' 
                ? [order.delivery_address?.area, order.delivery_address?.street, order.delivery_address?.building].filter(Boolean).join(', ')
                : order.delivery_address;
              const fullAddress = `${addressStr}, ${order.delivery_city}, سوريا`;
              const encodedAddress = encodeURIComponent(fullAddress);
              window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
            }}
            className="w-full bg-[#FF6B00] text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
            data-testid="open-maps-btn"
          >
            <Map size={16} />
            فتح في خرائط Google
          </button>
        </div>

        {/* Driver Info */}
        {order.driver_name && (
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Truck size={18} className="text-[#FF6B00]" />
              موظف التوصيل
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{order.driver_name}</p>
                <p className="text-sm text-gray-500">{order.driver_phone}</p>
              </div>
              <a
                href={`tel:${order.driver_phone}`}
                className="bg-[#FF6B00] text-white px-4 py-2 rounded-xl flex items-center gap-2"
              >
                <Phone size={16} />
                اتصال
              </a>
            </div>
          </div>
        )}

        {/* Cancel Section */}
        {!isCancelled && !isDelivered && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* مؤقت الإلغاء */}
            {cancelTimeLeft > 0 ? (
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-orange-600">
                    <Timer size={18} />
                    <span className="text-sm font-medium">يمكنك إلغاء الطلب خلال</span>
                  </div>
                  <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-bold text-sm">
                    {formatTimeLeft(cancelTimeLeft)}
                  </span>
                </div>
                
                {/* شريط التقدم */}
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: '100%' }}
                    animate={{ width: `${(cancelTimeLeft / CANCEL_WINDOW_SECONDS) * 100}%` }}
                    className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full"
                  />
                </div>
                
                <button
                  onClick={handleCancel}
                  className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold border border-red-200 hover:bg-red-100 flex items-center justify-center gap-2"
                >
                  <X size={18} />
                  إلغاء الطلب
                </button>
              </div>
            ) : (
              <div className="p-4 bg-gray-50">
                <div className="flex items-center gap-2 text-gray-500">
                  <AlertTriangle size={18} />
                  <span className="text-sm">انتهت مهلة الإلغاء (3 دقائق)</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rate Button (if delivered but not rated) */}
        {order.status === 'delivered' && !order.rating && (
          <button
            onClick={() => setShowRating(true)}
            className="w-full bg-yellow-50 text-yellow-700 py-3 rounded-xl font-bold border border-yellow-200 hover:bg-yellow-100 flex items-center justify-center gap-2"
          >
            <Star size={18} />
            قيّم تجربتك
          </button>
        )}

        {/* Show Rating if already rated */}
        {order.rating && (
          <div className="bg-orange-50 rounded-xl p-4 border border-orange-200 text-center">
            <p className="text-sm text-[#FF6B00] mb-2">تم تقييم الطلب</p>
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={20}
                  className={order.rating.store_rating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Rating Modal */}
      {showRating && (
        <RatingModal
          order={order}
          token={token}
          onClose={() => setShowRating(false)}
          onSuccess={() => {
            setShowRating(false);
            fetchOrder();
            toast({ title: "شكراً!", description: "تم إرسال تقييمك" });
          }}
        />
      )}
    </div>
  );
};

// Rating Modal Component
const RatingModal = ({ order, token, onClose, onSuccess }) => {
  const { toast } = useToast();
  const [storeRating, setStoreRating] = useState(0);
  const [driverRating, setDriverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (storeRating === 0) {
      toast({ title: "تنبيه", description: "يرجى تقييم المتجر", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/api/food/orders/${order.id}/rate`, {
        store_rating: storeRating,
        driver_rating: order.driver_id ? driverRating : null,
        comment
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onSuccess();
    } catch (error) {
      toast({ 
        title: "خطأ", 
        description: error.response?.data?.detail || "فشل إرسال التقييم", 
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" dir="rtl">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        className="bg-white rounded-t-3xl w-full max-w-lg p-6"
      >
        <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">قيّم تجربتك</h3>
        
        {/* Store Rating */}
        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-2 text-center">تقييم {order.store_name}</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setStoreRating(star)}
                className={`p-1 transition-transform ${storeRating >= star ? 'scale-110' : ''}`}
              >
                <Star
                  size={40}
                  className={storeRating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                />
              </button>
            ))}
          </div>
        </div>

        {/* Driver Rating */}
        {order.driver_id && (
          <div className="mb-6">
            <p className="text-sm text-gray-600 mb-2 text-center">تقييم موظف التوصيل ({order.driver_name})</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setDriverRating(star)}
                  className={`p-1 transition-transform ${driverRating >= star ? 'scale-110' : ''}`}
                >
                  <Star
                    size={40}
                    className={driverRating >= star ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Comment */}
        <div className="mb-6">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="اكتب تعليقك (اختياري)..."
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
          >
            لاحقاً
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || storeRating === 0}
            className="flex-1 py-3 bg-[#FF6B00] text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Star size={18} />
                إرسال التقييم
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default FoodOrderTracking;
