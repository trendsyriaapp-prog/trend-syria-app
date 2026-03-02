// /app/frontend/src/components/admin/PendingSellersTab.js
import { useState } from 'react';
import { Check, X, Eye } from 'lucide-react';

const PendingSellersTab = ({ pendingSellers, onApprove, onReject }) => {
  const [selectedDoc, setSelectedDoc] = useState(null);

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
                    <h3 className="font-bold text-xs text-gray-900">{doc.business_name}</h3>
                    <p className="text-[10px] text-gray-500">{doc.seller?.name} - {doc.seller?.phone}</p>
                    <p className="text-[10px] text-gray-400">{doc.seller?.city}</p>
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
                      onClick={() => onReject(doc.seller_id)}
                      className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      data-testid={`reject-seller-${doc.seller_id}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {selectedDoc?.id === doc.id && (
                <div className="border-t border-gray-200 p-2 bg-gray-50">
                  <p className="text-[10px] text-gray-500 mb-1">شهادة البائع:</p>
                  {doc.business_license ? (
                    <img src={doc.business_license} alt="شهادة البائع" className="max-w-full max-h-48 rounded-lg" />
                  ) : (
                    <p className="text-gray-400 text-xs">لا توجد صورة</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default PendingSellersTab;
