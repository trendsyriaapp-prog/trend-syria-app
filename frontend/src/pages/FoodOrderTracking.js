// /app/frontend/src/pages/FoodOrderTracking.js
// صفحة تتبع طلب الطعام

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Package, Clock, Check, Truck, MapPin, Phone, Store,
  ArrowLeft, X, ChefHat, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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

  useEffect(() => {
    fetchOrder();
    // Polling for updates every 30 seconds
    const interval = setInterval(fetchOrder, 30000);
    return () => clearInterval(interval);
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const res = await axios.get(`${API}/food/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrder(res.data);
    } catch (error) {
      toast({ title: "خطأ", description: "فشل تحميل الطلب", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('هل تريد إلغاء الطلب؟')) return;

    try {
      await axios.post(`${API}/food/orders/${orderId}/cancel`, {}, {
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

  const getCurrentStepIndex = () => {
    if (!order) return 0;
    if (order.status === 'cancelled') return -1;
    return ORDER_STEPS.findIndex(s => s.key === order.status);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
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
            className="bg-green-500 text-white px-6 py-2 rounded-xl font-bold"
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
  const canCancel = !['out_for_delivery', 'delivered', 'cancelled'].includes(order.status);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className={`${isCancelled ? 'bg-red-500' : isDelivered ? 'bg-green-500' : 'bg-gradient-to-b from-green-600 to-green-500'} text-white px-4 py-6`}>
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
                      isActive ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                    }`}>
                      <Icon size={18} />
                    </div>
                    <span className={`text-xs mt-2 text-center ${isActive ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
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
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <Clock size={24} className="text-green-600" />
            <div>
              <p className="font-bold text-green-800">الوقت المتوقع للتوصيل</p>
              <p className="text-sm text-green-600">{order.estimated_delivery_time} دقيقة</p>
            </div>
          </div>
        )}

        {/* Store Info */}
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Store size={18} className="text-green-600" />
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
            <div key={index} className="p-4 border-b border-gray-100 last:border-0 flex justify-between items-center">
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
              <span className="text-green-600">{order.total.toLocaleString()} ل.س</span>
            </div>
          </div>
        </div>

        {/* Delivery Info */}
        <div className="bg-white rounded-xl p-4 border border-gray-200 space-y-3">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <MapPin size={18} className="text-green-600" />
            عنوان التوصيل
          </h3>
          <p className="text-gray-900">{order.delivery_address}</p>
          <p className="text-gray-500">{order.delivery_city}</p>
          <div className="flex items-center gap-2 text-gray-600">
            <Phone size={16} />
            <span>{order.delivery_phone}</span>
          </div>
        </div>

        {/* Driver Info */}
        {order.driver_name && (
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Truck size={18} className="text-green-600" />
              موظف التوصيل
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{order.driver_name}</p>
                <p className="text-sm text-gray-500">{order.driver_phone}</p>
              </div>
              <a
                href={`tel:${order.driver_phone}`}
                className="bg-green-500 text-white px-4 py-2 rounded-xl flex items-center gap-2"
              >
                <Phone size={16} />
                اتصال
              </a>
            </div>
          </div>
        )}

        {/* Cancel Button */}
        {canCancel && (
          <button
            onClick={handleCancel}
            className="w-full bg-red-50 text-red-600 py-3 rounded-xl font-bold border border-red-200 hover:bg-red-100"
          >
            إلغاء الطلب
          </button>
        )}
      </div>
    </div>
  );
};

export default FoodOrderTracking;
