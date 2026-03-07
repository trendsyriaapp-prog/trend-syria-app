// /app/frontend/src/components/admin/PendingProductsTab.js
import { useState } from 'react';
import { Check, X } from 'lucide-react';
import RejectModal from './RejectModal';

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const PendingProductsTab = ({ pendingProducts, onApprove, onReject }) => {
  const [rejectModal, setRejectModal] = useState({ isOpen: false, productId: null, productName: '' });
  const [processing, setProcessing] = useState(false);

  const handleRejectClick = (productId, productName) => {
    setRejectModal({ isOpen: true, productId, productName });
  };

  const handleRejectConfirm = async (reason) => {
    setProcessing(true);
    try {
      await onReject(rejectModal.productId, reason);
    } finally {
      setProcessing(false);
      setRejectModal({ isOpen: false, productId: null, productName: '' });
    }
  };

  return (
    <section>
      {pendingProducts.length === 0 ? (
        <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
          <Check size={36} className="text-green-500 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">لا يوجد منتجات في انتظار الموافقة</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pendingProducts.map((product) => (
            <div key={product.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-2 flex gap-2">
                <img 
                  src={product.images?.[0] || 'https://via.placeholder.com/100'} 
                  alt={product.name}
                  className="w-14 h-14 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <h3 className="font-bold text-xs text-gray-900">{product.name}</h3>
                  <p className="text-[10px] text-gray-500 line-clamp-1">{product.description}</p>
                  <p className="text-[#FF6B00] font-bold text-xs mt-0.5">{formatPrice(product.price)}</p>
                  <p className="text-[9px] text-gray-400">
                    البائع: {product.seller?.name || product.seller_name}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => onApprove(product.id)}
                    className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                    data-testid={`approve-product-${product.id}`}
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => handleRejectClick(product.id, product.name)}
                    className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                    data-testid={`reject-product-${product.id}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      <RejectModal
        isOpen={rejectModal.isOpen}
        onClose={() => setRejectModal({ isOpen: false, productId: null, productName: '' })}
        onConfirm={handleRejectConfirm}
        title="رفض المنتج"
        itemName={rejectModal.productName}
        processing={processing}
      />
    </section>
  );
};

export default PendingProductsTab;
