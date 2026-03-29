import { useRef } from 'react';
import { X, Printer } from 'lucide-react';

const OrderLabelPrint = ({ order, onClose }) => {
  const printRef = useRef();

  const handlePrint = () => {
    const printContent = printRef.current;
    const originalContents = document.body.innerHTML;
    
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  if (!order) return null;

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('ar-SY', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">طباعة ملصق الطلب</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        {/* Label Preview */}
        <div className="p-4">
          <div 
            ref={printRef}
            className="border-2 border-dashed border-gray-300 rounded-xl p-4 bg-white"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {/* Print Content */}
            <div style={{ width: '100%', maxWidth: '300px', margin: '0 auto' }}>
              {/* Logo Header */}
              <div style={{ textAlign: 'center', borderBottom: '2px solid #FF6B00', paddingBottom: '10px', marginBottom: '10px' }}>
                <h1 style={{ fontSize: '20px', fontWeight: 'bold', color: '#FF6B00', margin: 0 }}>
                  🛒 ترند سورية
                </h1>
                <p style={{ fontSize: '10px', color: '#666', margin: '5px 0 0 0' }}>
                  Trend Syria - توصيل سريع وآمن
                </p>
              </div>

              {/* Order Info */}
              <div style={{ background: '#f5f5f5', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontSize: '12px', color: '#666' }}>رقم الطلب:</span>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#000' }}>
                    #{order.order_number || order.id?.slice(-6).toUpperCase()}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', color: '#666' }}>التاريخ:</span>
                  <span style={{ fontSize: '12px', color: '#000' }}>
                    {formatDate(order.created_at)}
                  </span>
                </div>
              </div>

              {/* Customer Info */}
              <div style={{ marginBottom: '10px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#FF6B00', marginBottom: '8px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
                  📍 معلومات التوصيل
                </h3>
                <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                  <p style={{ margin: '0 0 5px 0' }}>
                    <strong>المستلم:</strong> {order.user_name}
                  </p>
                  <p style={{ margin: '0 0 5px 0' }}>
                    <strong>الهاتف:</strong> {order.phone}
                  </p>
                  <p style={{ margin: '0 0 5px 0' }}>
                    <strong>المدينة:</strong> {order.city}
                  </p>
                  <p style={{ margin: '0', fontSize: '12px', color: '#444' }}>
                    <strong>العنوان:</strong> {typeof order.address === 'object' 
                      ? [order.address?.area, order.address?.street, order.address?.building].filter(Boolean).join(', ')
                      : order.address}
                  </p>
                </div>
              </div>

              {/* Products */}
              <div style={{ marginBottom: '10px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: 'bold', color: '#FF6B00', marginBottom: '8px', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>
                  📦 المنتجات ({order.items?.length || 0} قطعة)
                </h3>
                <div style={{ fontSize: '11px' }}>
                  {order.items?.map((item, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px dotted #ddd' }}>
                      <span style={{ flex: 1 }}>{item.product_name?.slice(0, 25)}{item.product_name?.length > 25 ? '...' : ''}</span>
                      <span style={{ marginRight: '10px', fontWeight: 'bold' }}>×{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Info */}
              <div style={{ background: '#FFF3E0', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 'bold' }}>
                  <span>المبلغ الإجمالي:</span>
                  <span style={{ color: '#FF6B00' }}>
                    {new Intl.NumberFormat('ar-SY').format(order.total)} ل.س
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: '#666', marginTop: '5px' }}>
                  {order.payment_method === 'cash_on_delivery' ? '💵 الدفع عند الاستلام' : '✅ مدفوع'}
                </div>
              </div>

              {/* Inspection Notice */}
              <div style={{ background: '#FFEBEE', border: '1px solid #EF5350', padding: '8px', borderRadius: '8px', marginBottom: '10px' }}>
                <p style={{ fontSize: '10px', color: '#C62828', margin: 0, textAlign: 'center', fontWeight: 'bold' }}>
                  ⚠️ يرجى فحص المنتج أمام موظف التوصيل قبل التوقيع
                </p>
              </div>

              {/* Barcode Placeholder */}
              <div style={{ textAlign: 'center', padding: '10px', background: '#f9f9f9', borderRadius: '8px' }}>
                <div style={{ 
                  fontFamily: 'monospace', 
                  fontSize: '20px', 
                  letterSpacing: '3px',
                  background: 'linear-gradient(90deg, #000 2px, transparent 2px)',
                  backgroundSize: '4px 100%',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  ||||||||||||||||||||||||
                </div>
                <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#333', margin: '5px 0 0 0' }}>
                  #{order.order_number || order.id?.slice(-6).toUpperCase()}
                </p>
              </div>

              {/* Footer */}
              <div style={{ textAlign: 'center', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #eee' }}>
                <p style={{ fontSize: '9px', color: '#999', margin: 0 }}>
                  شكراً لتسوقك من ترند سورية
                </p>
                <p style={{ fontSize: '10px', color: '#25D366', margin: '5px 0 0 0', fontWeight: 'bold' }}>
                  📞 للدعم واتساب: 0912345678
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white border-t p-4">
          <button
            onClick={handlePrint}
            className="w-full bg-[#FF6B00] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#E65000]"
          >
            <Printer size={18} />
            طباعة الملصق
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            تأكد من توصيل الطابعة قبل الطباعة
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderLabelPrint;
