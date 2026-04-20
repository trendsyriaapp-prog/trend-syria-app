// /app/frontend/src/components/admin/PendingSellersTab.js
import { useState } from 'react';
import { Check, X, Eye, MapPin, Phone, Store, Navigation } from 'lucide-react';
import RejectModal from './RejectModal';

const PendingSellersTab = ({ pendingSellers, onApprove, onReject }) => {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [rejectModal, setRejectModal] = useState({ isOpen: false, sellerId: null, sellerName: '' });
  const [processing, setProcessing] = useState(false);

  const handleRejectClick = (sellerId, sellerName) => {
    setRejectModal({ isOpen: true, sellerId, sellerName });
  };

  const handleRejectConfirm = async (reason) => {
    setProcessing(true);
    try {
      await onReject(rejectModal.sellerId, reason);
    } finally {
      setProcessing(false);
      setRejectModal({ isOpen: false, sellerId: null, sellerName: '' });
    }
  };

  // فتح الموقع في خرائط جوجل
  const openInGoogleMaps = (lat, lng) => {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
  };

  return (
    <section>
      {pendingSellers.length === 0 ? (
        <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
          <Check size={36} className="text-green-500 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">لا يوجد بائعين في انتظار الموافقة</p>
        </div>
      ) : (
        <div className="space-y-2">
          {pendingSellers.map((doc) => (
            <div key={doc.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-xs text-gray-900 flex items-center gap-1">
                      <Store size={12} className="text-[#FF6B00]" />
                      {doc.business_name}
                    </h3>
                    <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                      <Phone size={10} />
                      {doc.seller?.name} - {doc.seller?.phone}
                    </p>
                    <p className="text-[10px] text-gray-400 flex items-center gap-1">
                      <MapPin size={10} />
                      {doc.store_city || doc.seller?.city}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setSelectedDoc(selectedDoc?.id === doc.id ? null : doc)}
                      className="p-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      data-testid={`view-doc-${doc.id}`}
                    >
                      <Eye size={14} className="text-gray-600" />
                    </button>
                    <button
                      onClick={() => onApprove(doc.seller_id)}
                      className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                      data-testid={`approve-seller-${doc.seller_id}`}
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => handleRejectClick(doc.seller_id, doc.business_name || doc.seller?.name)}
                      className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      data-testid={`reject-seller-${doc.seller_id}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {selectedDoc?.id === doc.id && (
                <div className="border-t border-gray-200 p-3 bg-gray-50 space-y-3">
                  {/* قسم العنوان والموقع */}
                  <div className="bg-white rounded-lg p-2 border border-gray-200">
                    <h4 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1">
                      <MapPin size={12} className="text-green-600" />
                      العنوان والموقع
                    </h4>
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-600">
                        <span className="font-medium">المدينة:</span> {doc.store_city || doc.seller?.city || 'غير محدد'}
                      </p>
                      <p className="text-[10px] text-gray-600">
                        <span className="font-medium">العنوان:</span> {doc.store_address || 'غير محدد'}
                      </p>
                      {doc.store_latitude && doc.store_longitude && (
                        <button
                          onClick={() => openInGoogleMaps(doc.store_latitude, doc.store_longitude)}
                          className="mt-2 w-full flex items-center justify-center gap-1 bg-blue-50 text-blue-600 py-1.5 rounded-lg text-[10px] font-medium hover:bg-blue-100"
                        >
                          <Navigation size={12} />
                          فتح الموقع في خرائط جوجل
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* الوثائق */}
                  <div>
                    <p className="text-[10px] text-gray-500 mb-1">شهادة البائع:</p>
                    {doc.business_license ? (
                      <img src={doc.business_license} alt="شهادة البائع" className="max-w-full max-h-48 rounded-lg" />
                    ) : (
                      <p className="text-gray-400 text-xs">لا توجد صورة</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      <RejectModal
        isOpen={rejectModal.isOpen}
        onClose={() => setRejectModal({ isOpen: false, sellerId: null, sellerName: '' })}
        onConfirm={handleRejectConfirm}
        title="رفض البائع"
        itemName={rejectModal.sellerName}
        processing={processing}
      />
    </section>
  );
};

export default PendingSellersTab;
