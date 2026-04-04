// /app/frontend/src/components/admin/OrdersTab.js
import { useState } from 'react';
import axios from 'axios';
import { 
  ShoppingBag, X, User, MapPin, Phone, Calendar, Package, 
  CreditCard, Truck, Eye, XCircle, CheckCircle, RefreshCw,
  UserPlus, MessageSquare, AlertTriangle
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const getStatusInfo = (status) => {
  const statusMap = {
    'pending': { label: 'قيد الانتظار', bg: 'bg-yellow-100', text: 'text-yellow-600' },
    'pending_payment': { label: 'بانتظار الدفع', bg: 'bg-yellow-100', text: 'text-yellow-600' },
    'paid': { label: 'مدفوع', bg: 'bg-green-100', text: 'text-green-600' },
    'confirmed': { label: 'مؤكد', bg: 'bg-blue-100', text: 'text-blue-600' },
    'processing': { label: 'قيد التجهيز', bg: 'bg-purple-100', text: 'text-purple-600' },
    'ready': { label: 'جاهز', bg: 'bg-indigo-100', text: 'text-indigo-600' },
    'on_the_way': { label: 'في الطريق', bg: 'bg-cyan-100', text: 'text-cyan-600' },
    'driver_at_customer': { label: 'السائق عند العميل', bg: 'bg-teal-100', text: 'text-teal-600' },
    'returning_to_store': { label: '🔄 إرجاع للمتجر', bg: 'bg-orange-100', text: 'text-orange-600' },
    'delivery_failed': { label: '❌ فشل التسليم', bg: 'bg-red-100', text: 'text-red-600' },
    'delivered': { label: 'تم التوصيل', bg: 'bg-green-100', text: 'text-green-600' },
    'cancelled': { label: 'ملغي', bg: 'bg-red-100', text: 'text-red-600' },
    'refunded': { label: 'مسترد', bg: 'bg-gray-100', text: 'text-gray-600' },
  };
  return statusMap[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-600' };
};

const OrdersTab = ({ allOrders, onRefresh }) => {
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filter, setFilter] = useState('all');
  const [processing, setProcessing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [adminNote, setAdminNote] = useState('');

  const filteredOrders = filter === 'all' 
    ? allOrders 
    : allOrders.filter(o => o.status === filter);

  // إلغاء الطلب
  const handleCancelOrder = async () => {
    if (!selectedOrder) return;
    setProcessing(true);
    try {
      await axios.post(`${API}/api/admin/orders/${selectedOrder.id}/cancel`, {
        reason: cancelReason,
        admin_note: adminNote
      });
      toast({ title: "تم إلغاء الطلب", description: "تم إلغاء الطلب بنجاح" });
      setShowCancelModal(false);
      setSelectedOrder(null);
      setCancelReason('');
      setAdminNote('');
      if (onRefresh) onRefresh();
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || "فشل في إلغاء الطلب", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  // تغيير حالة الطلب
  const handleChangeStatus = async (newStatus) => {
    if (!selectedOrder) return;
    setProcessing(true);
    try {
      await axios.post(`${API}/api/admin/orders/${selectedOrder.id}/status`, {
        status: newStatus,
        admin_note: adminNote
      });
      toast({ title: "تم التحديث", description: `تم تغيير حالة الطلب إلى: ${getStatusInfo(newStatus).label}` });
      setShowStatusModal(false);
      setSelectedOrder(null);
      setAdminNote('');
      if (onRefresh) onRefresh();
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || "فشل في تغيير الحالة", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  // استرداد المبلغ
  const handleRefund = async () => {
    if (!selectedOrder) return;
    setProcessing(true);
    try {
      await axios.post(`${API}/api/admin/orders/${selectedOrder.id}/refund`, {
        admin_note: adminNote
      });
      toast({ title: "تم الاسترداد", description: "تم استرداد المبلغ للعميل" });
      setSelectedOrder(null);
      if (onRefresh) onRefresh();
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || "فشل في استرداد المبلغ", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <section>
      {/* فلاتر الحالة */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {[
          { id: 'all', label: 'الكل' },
          { id: 'pending', label: 'قيد الانتظار' },
          { id: 'paid', label: 'مدفوع' },
          { id: 'on_the_way', label: 'في الطريق' },
          { id: 'returning_to_store', label: '🔄 إرجاع' },
          { id: 'delivered', label: 'تم التوصيل' },
          { id: 'cancelled', label: 'ملغي' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-2.5 py-1 rounded-full text-[10px] transition-colors ${
              filter === f.id
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
          <ShoppingBag size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">لا يوجد طلبات</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredOrders.map((order) => {
            const status = getStatusInfo(order.status);
            return (
              <div 
                key={order.id} 
                className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:border-orange-300 hover:shadow-sm transition-all"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900">#{order.id?.slice(0, 8)}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>
                      {status.label}
                    </span>
                  </div>
                  <Eye size={16} className="text-gray-400" />
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1 text-gray-600">
                    <User size={12} />
                    <span className="truncate">{order.user_name || 'غير محدد'}</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <MapPin size={12} />
                    <span className="truncate">{order.city || 'غير محدد'}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                  <p className="text-[#FF6B00] font-bold text-sm">{formatPrice(order.total)}</p>
                  <p className="text-[10px] text-gray-400">
                    {order.created_at ? new Date(order.created_at).toLocaleDateString('ar-SY', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    }) : '-'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* نافذة تفاصيل الطلب */}
      {selectedOrder && !showCancelModal && !showStatusModal && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          onClick={() => setSelectedOrder(null)}
        >
          <div 
            className="bg-white rounded-t-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">تفاصيل الطلب</h3>
                <p className="text-xs text-gray-500">#{selectedOrder.id?.slice(0, 8)}</p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              {/* الحالة */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <span className="text-sm text-gray-600">حالة الطلب</span>
                <span className={`text-xs px-3 py-1 rounded-full ${getStatusInfo(selectedOrder.status).bg} ${getStatusInfo(selectedOrder.status).text}`}>
                  {getStatusInfo(selectedOrder.status).label}
                </span>
              </div>

              {/* أزرار الإجراءات السريعة */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowStatusModal(true)}
                  className="flex items-center justify-center gap-2 bg-blue-50 text-blue-600 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                >
                  <RefreshCw size={16} />
                  تغيير الحالة
                </button>
                {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="flex items-center justify-center gap-2 bg-red-50 text-red-600 py-2.5 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                  >
                    <XCircle size={16} />
                    إلغاء الطلب
                  </button>
                )}
                {(selectedOrder.status === 'paid' || selectedOrder.status === 'cancelled') && (
                  <button
                    onClick={handleRefund}
                    disabled={processing}
                    className="flex items-center justify-center gap-2 bg-amber-50 text-amber-600 py-2.5 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors disabled:opacity-50"
                  >
                    <CreditCard size={16} />
                    استرداد المبلغ
                  </button>
                )}
              </div>

              {/* معلومات العميل */}
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-600 font-medium mb-2 flex items-center gap-1">
                  <User size={14} /> معلومات العميل
                </p>
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">{selectedOrder.user_name || 'غير محدد'}</p>
                  {selectedOrder.user_phone && (
                    <a href={`tel:${selectedOrder.user_phone}`} className="text-sm text-blue-600 flex items-center gap-1">
                      <Phone size={12} /> {selectedOrder.user_phone}
                    </a>
                  )}
                </div>
              </div>

              {/* عنوان التوصيل */}
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-green-600 font-medium mb-2 flex items-center gap-1">
                  <MapPin size={14} /> عنوان التوصيل
                </p>
                <div className="space-y-1">
                  <p className="text-sm font-medium">{selectedOrder.city || 'غير محدد'}</p>
                  {selectedOrder.address && <p className="text-xs text-gray-600">{typeof selectedOrder.address === 'object' 
                    ? [selectedOrder.address?.area, selectedOrder.address?.street, selectedOrder.address?.building].filter(Boolean).join(', ')
                    : selectedOrder.address}</p>}
                  {selectedOrder.delivery_address && (
                    <p className="text-xs text-gray-600">
                      {typeof selectedOrder.delivery_address === 'object' 
                        ? [selectedOrder.delivery_address?.area, selectedOrder.delivery_address?.street, selectedOrder.delivery_address?.building].filter(Boolean).join(', ')
                        : selectedOrder.delivery_address}
                    </p>
                  )}
                </div>
              </div>

              {/* المنتجات */}
              {selectedOrder.items && selectedOrder.items.length > 0 && (
                <div className="bg-purple-50 rounded-lg p-3">
                  <p className="text-xs text-purple-600 font-medium mb-2 flex items-center gap-1">
                    <Package size={14} /> المنتجات ({selectedOrder.items.length})
                  </p>
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white rounded p-2">
                        <div className="flex items-center gap-2">
                          {item.image && <img src={item.image} alt={item.name} className="w-10 h-10 rounded object-cover" />}
                          <div>
                            <p className="text-sm font-medium">{item.name || item.product_name}</p>
                            <p className="text-[10px] text-gray-500">الكمية: {item.quantity}</p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-orange-600">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* معلومات التوصيل */}
              {selectedOrder.driver_name && (
                <div className="bg-cyan-50 rounded-lg p-3">
                  <p className="text-xs text-cyan-600 font-medium mb-2 flex items-center gap-1">
                    <Truck size={14} /> معلومات التوصيل
                  </p>
                  <div className="space-y-1">
                    <p className="text-sm">السائق: <span className="font-medium">{selectedOrder.driver_name}</span></p>
                    {selectedOrder.driver_phone && (
                      <a href={`tel:${selectedOrder.driver_phone}`} className="text-sm text-cyan-600 flex items-center gap-1">
                        <Phone size={12} /> {selectedOrder.driver_phone}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* الملخص المالي */}
              <div className="bg-orange-50 rounded-lg p-3">
                <p className="text-xs text-orange-600 font-medium mb-2 flex items-center gap-1">
                  <CreditCard size={14} /> الملخص المالي
                </p>
                <div className="space-y-1.5">
                  {selectedOrder.subtotal && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">المجموع الفرعي</span>
                      <span>{formatPrice(selectedOrder.subtotal)}</span>
                    </div>
                  )}
                  {selectedOrder.delivery_fee !== undefined && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">رسوم التوصيل</span>
                      <span>{formatPrice(selectedOrder.delivery_fee)}</span>
                    </div>
                  )}
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>الخصم</span>
                      <span>-{formatPrice(selectedOrder.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold pt-2 border-t border-orange-200">
                    <span>الإجمالي</span>
                    <span className="text-orange-600">{formatPrice(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

              {/* التاريخ */}
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <Calendar size={12} />
                <span>
                  {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleDateString('ar-SY', {
                    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  }) : '-'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة إلغاء الطلب */}
      {showCancelModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold">إلغاء الطلب</h3>
                <p className="text-xs text-gray-500">#{selectedOrder.id?.slice(0, 8)}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">سبب الإلغاء</label>
                <select
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">اختر السبب</option>
                  <option value="customer_request">طلب العميل</option>
                  <option value="out_of_stock">منتج غير متوفر</option>
                  <option value="payment_issue">مشكلة في الدفع</option>
                  <option value="delivery_issue">مشكلة في التوصيل</option>
                  <option value="other">سبب آخر</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات (اختياري)</label>
                <textarea
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  rows={2}
                  placeholder="أضف ملاحظة..."
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => { setShowCancelModal(false); setCancelReason(''); setAdminNote(''); }}
                  className="flex-1 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={!cancelReason || processing}
                  className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {processing ? <RefreshCw size={16} className="animate-spin" /> : <XCircle size={16} />}
                  تأكيد الإلغاء
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تغيير الحالة */}
      {showStatusModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">تغيير حالة الطلب</h3>
              <button onClick={() => setShowStatusModal(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              {[
                { status: 'confirmed', label: 'مؤكد', icon: CheckCircle, color: 'blue' },
                { status: 'processing', label: 'قيد التجهيز', icon: RefreshCw, color: 'purple' },
                { status: 'ready', label: 'جاهز للتوصيل', icon: Package, color: 'indigo' },
                { status: 'on_the_way', label: 'في الطريق', icon: Truck, color: 'cyan' },
                { status: 'delivered', label: 'تم التوصيل', icon: CheckCircle, color: 'green' },
              ].map(item => (
                <button
                  key={item.status}
                  onClick={() => handleChangeStatus(item.status)}
                  disabled={processing || selectedOrder.status === item.status}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-colors disabled:opacity-50 ${
                    selectedOrder.status === item.status 
                      ? `border-${item.color}-500 bg-${item.color}-50` 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <item.icon size={20} className={`text-${item.color}-600`} />
                  <span className="text-sm font-medium">{item.label}</span>
                  {selectedOrder.status === item.status && (
                    <span className="mr-auto text-xs text-gray-500">الحالة الحالية</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default OrdersTab;
