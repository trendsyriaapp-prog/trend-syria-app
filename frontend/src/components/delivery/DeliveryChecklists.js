import { useState } from 'react';
import { X, CheckCircle, AlertTriangle, Camera, Package, User, MapPin, Phone } from 'lucide-react';

// Checklist للاستلام من البائع
export const PickupChecklist = ({ order, onComplete, onClose }) => {
  const [checks, setChecks] = useState({
    packageSealed: false,
    labelVisible: false,
    packageClean: false,
    itemsCount: false,
    noVisibleDamage: false
  });

  const allChecked = Object.values(checks).every(v => v);

  const toggleCheck = (key) => {
    setChecks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const checklistItems = [
    { key: 'packageSealed', label: 'الصندوق مغلق بإحكام', icon: Package },
    { key: 'labelVisible', label: 'ملصق الطلب واضح ومقروء', icon: Package },
    { key: 'packageClean', label: 'الصندوق نظيف ومرتب', icon: Package },
    { key: 'itemsCount', label: 'عدد القطع مطابق للطلب', icon: Package },
    { key: 'noVisibleDamage', label: 'لا يوجد تلف ظاهر', icon: Package }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-500 text-white p-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">قائمة فحص الاستلام</h2>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full">
              <X size={20} />
            </button>
          </div>
          <p className="text-sm opacity-90 mt-1">تحقق من هذه النقاط قبل استلام الطلب من البائع</p>
        </div>

        {/* Order Info */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">رقم الطلب:</span>
            <span className="font-bold text-gray-900">#{order?.id?.slice(0, 8)}</span>
          </div>
        </div>

        {/* Checklist */}
        <div className="p-4 space-y-3">
          {checklistItems.map((item) => (
            <button
              key={item.key}
              onClick={() => toggleCheck(item.key)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                checks[item.key]
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                checks[item.key] ? 'bg-green-500 text-white' : 'bg-gray-200'
              }`}>
                {checks[item.key] ? <CheckCircle size={16} /> : <span className="w-3 h-3 rounded-full bg-gray-400" />}
              </div>
              <span className={`text-sm ${checks[item.key] ? 'text-green-700 font-medium' : 'text-gray-700'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {/* Warning */}
        {!allChecked && (
          <div className="mx-4 mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
            <div className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle size={16} />
              <span className="text-sm font-medium">أكمل جميع نقاط الفحص للمتابعة</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="sticky bottom-0 bg-white border-t p-4 space-y-2">
          <button
            onClick={onComplete}
            disabled={!allChecked}
            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${
              allChecked
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle size={18} />
            تأكيد استلام الطلب
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};

// Checklist للتسليم للعميل
export const DeliveryChecklist = ({ order, onComplete, onClose }) => {
  const [checks, setChecks] = useState({
    customerPresent: false,
    packageInspected: false,
    customerSatisfied: false,
    paymentReceived: order?.payment_method !== 'cash_on_delivery',
    signatureObtained: false
  });
  const [customerNote, setCustomerNote] = useState('');

  const allChecked = Object.values(checks).every(v => v);

  const toggleCheck = (key) => {
    setChecks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const checklistItems = [
    { key: 'customerPresent', label: 'العميل موجود لاستلام الطلب', icon: User },
    { key: 'packageInspected', label: 'العميل فحص المنتج', icon: Package },
    { key: 'customerSatisfied', label: 'العميل راضٍ عن المنتج', icon: CheckCircle },
    { 
      key: 'paymentReceived', 
      label: order?.payment_method === 'cash_on_delivery' 
        ? `تم استلام المبلغ (${new Intl.NumberFormat('ar-SY').format(order?.total)} ل.س)` 
        : 'الدفع تم مسبقاً ✓', 
      icon: Package 
    },
    { key: 'signatureObtained', label: 'تم الحصول على توقيع العميل', icon: Package }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-500 text-white p-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">قائمة فحص التسليم</h2>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full">
              <X size={20} />
            </button>
          </div>
          <p className="text-sm opacity-90 mt-1">تحقق من هذه النقاط قبل تأكيد التسليم</p>
        </div>

        {/* Customer Info */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User size={14} className="text-gray-400" />
              <span className="text-gray-900 font-medium">{order?.user_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone size={14} className="text-gray-400" />
              <a href={`tel:${order?.phone}`} className="text-[#FF6B00]">{order?.phone}</a>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <MapPin size={14} className="text-gray-400 mt-0.5" />
              <span className="text-gray-600">{order?.address}, {order?.city}</span>
            </div>
          </div>
        </div>

        {/* Customer Note */}
        {order?.delivery_note && (
          <div className="mx-4 mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
            <p className="text-xs text-yellow-700 font-bold mb-1">ملاحظة من العميل:</p>
            <p className="text-sm text-gray-700">{order.delivery_note}</p>
          </div>
        )}

        {/* Checklist */}
        <div className="p-4 space-y-3">
          {checklistItems.map((item) => (
            <button
              key={item.key}
              onClick={() => toggleCheck(item.key)}
              disabled={item.key === 'paymentReceived' && order?.payment_method !== 'cash_on_delivery'}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                checks[item.key]
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              } ${item.key === 'paymentReceived' && order?.payment_method !== 'cash_on_delivery' ? 'opacity-60' : ''}`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                checks[item.key] ? 'bg-green-500 text-white' : 'bg-gray-200'
              }`}>
                {checks[item.key] ? <CheckCircle size={16} /> : <span className="w-3 h-3 rounded-full bg-gray-400" />}
              </div>
              <span className={`text-sm ${checks[item.key] ? 'text-green-700 font-medium' : 'text-gray-700'}`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>

        {/* Optional Note */}
        <div className="px-4 pb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            ملاحظات إضافية (اختياري)
          </label>
          <textarea
            value={customerNote}
            onChange={(e) => setCustomerNote(e.target.value)}
            placeholder="أي ملاحظات عن عملية التسليم..."
            className="w-full p-3 border border-gray-200 rounded-xl text-sm resize-none h-20 focus:border-[#FF6B00] focus:outline-none"
          />
        </div>

        {/* Warning */}
        {!allChecked && (
          <div className="mx-4 mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
            <div className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle size={16} />
              <span className="text-sm font-medium">أكمل جميع نقاط الفحص للمتابعة</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="sticky bottom-0 bg-white border-t p-4 space-y-2">
          <button
            onClick={() => onComplete(customerNote)}
            disabled={!allChecked}
            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${
              allChecked
                ? 'bg-green-500 text-white hover:bg-green-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <CheckCircle size={18} />
            تأكيد التسليم
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};

// Checklist للرفض/الإرجاع
export const ReturnChecklist = ({ order, onComplete, onClose }) => {
  const [reason, setReason] = useState('');
  const [otherReason, setOtherReason] = useState('');

  const reasons = [
    'المنتج تالف أو مكسور',
    'المنتج مختلف عن الصور',
    'المقاس أو اللون خاطئ',
    'نقص في الكمية',
    'العميل غير موجود',
    'العميل رفض الاستلام',
    'العنوان خاطئ',
    'أخرى'
  ];

  const canSubmit = reason && (reason !== 'أخرى' || otherReason);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-red-600 to-red-500 text-white p-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">إرجاع الطلب</h2>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full">
              <X size={20} />
            </button>
          </div>
          <p className="text-sm opacity-90 mt-1">حدد سبب عدم إتمام التسليم</p>
        </div>

        {/* Order Info */}
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">رقم الطلب:</span>
            <span className="font-bold text-gray-900">#{order?.id?.slice(0, 8)}</span>
          </div>
        </div>

        {/* Reasons */}
        <div className="p-4 space-y-2">
          <p className="text-sm font-medium text-gray-700 mb-3">سبب الإرجاع:</p>
          {reasons.map((r) => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={`w-full text-right p-3 rounded-xl border-2 transition-all ${
                reason === r
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <span className={`text-sm ${reason === r ? 'text-red-700 font-medium' : 'text-gray-700'}`}>
                {r}
              </span>
            </button>
          ))}

          {reason === 'أخرى' && (
            <textarea
              value={otherReason}
              onChange={(e) => setOtherReason(e.target.value)}
              placeholder="اكتب السبب..."
              className="w-full mt-2 p-3 border border-gray-200 rounded-xl text-sm resize-none h-20 focus:border-red-500 focus:outline-none"
            />
          )}
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white border-t p-4 space-y-2">
          <button
            onClick={() => onComplete(reason === 'أخرى' ? otherReason : reason)}
            disabled={!canSubmit}
            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 ${
              canSubmit
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <AlertTriangle size={18} />
            تأكيد الإرجاع
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-bold bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};
