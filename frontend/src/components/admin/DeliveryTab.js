// /app/frontend/src/components/admin/DeliveryTab.js
import { useState } from 'react';
import { Truck, Check, X, MoreVertical, Trash2, Ban, Eye, Phone, MapPin } from 'lucide-react';
import RejectModal from './RejectModal';

const DeliveryTab = ({ 
  allDelivery, 
  pendingDelivery, 
  isPending = false,
  onApprove, 
  onReject,
  onDeleteDriver,
  onBanDriver
}) => {
  const [rejectModal, setRejectModal] = useState({ isOpen: false, driverId: null, driverName: '' });
  const [processing, setProcessing] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [showMenu, setShowMenu] = useState(null);

  const handleRejectClick = (driverId, driverName) => {
    setRejectModal({ isOpen: true, driverId, driverName });
  };

  const handleRejectConfirm = async (reason) => {
    setProcessing(true);
    try {
      await onReject(rejectModal.driverId, reason);
    } finally {
      setProcessing(false);
      setRejectModal({ isOpen: false, driverId: null, driverName: '' });
    }
  };

  const handleAction = (action, driver) => {
    setShowMenu(null);
    if (action === 'view') {
      setSelectedDriver(driver);
    } else if (action === 'delete') {
      if (window.confirm(`هل تريد حذف السائق "${driver.full_name || driver.name}"؟`)) {
        onDeleteDriver?.(driver.id);
      }
    } else if (action === 'ban') {
      if (window.confirm(`هل تريد حظر السائق "${driver.full_name || driver.name}"؟`)) {
        onBanDriver?.(driver.id);
      }
    }
  };

  // Pending delivery drivers view
  if (isPending) {
    return (
      <section>
        {pendingDelivery.length === 0 ? (
          <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
            <Check size={36} className="text-green-500 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">لا يوجد موظفي توصيل في انتظار الموافقة</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingDelivery.map((doc) => (
              <div key={doc.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="p-3">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-sm text-gray-900">{doc.driver_name || doc.driver?.full_name || doc.driver?.name}</h3>
                      <p className="text-xs text-gray-500">{doc.driver_phone || doc.driver?.phone}</p>
                      <p className="text-xs text-gray-400">{doc.driver_city || doc.driver?.city}</p>
                      <p className="text-xs text-gray-600 mt-1">رقم الهوية: {doc.national_id}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => onApprove(doc.driver_id || doc.delivery_id)}
                        className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                        data-testid={`approve-driver-${doc.driver_id || doc.delivery_id}`}
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => handleRejectClick(doc.driver_id || doc.delivery_id, doc.driver_name || doc.driver?.full_name || doc.driver?.name)}
                        className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                        data-testid={`reject-driver-${doc.driver_id || doc.delivery_id}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>

                  {/* الوثائق */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] text-gray-500 mb-1">صورة شخصية</p>
                      {doc.personal_photo && (
                        <img 
                          src={doc.personal_photo} 
                          alt="صورة شخصية" 
                          className="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => window.open(doc.personal_photo, '_blank')}
                        />
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 mb-1">صورة الهوية</p>
                      {doc.id_photo && (
                        <img 
                          src={doc.id_photo} 
                          alt="صورة الهوية" 
                          className="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => window.open(doc.id_photo, '_blank')}
                        />
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 mb-1">رخصة الدراجة</p>
                      {doc.motorcycle_license && (
                        <img 
                          src={doc.motorcycle_license} 
                          alt="رخصة الدراجة" 
                          className="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => window.open(doc.motorcycle_license, '_blank')}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reject Modal */}
        <RejectModal
          isOpen={rejectModal.isOpen}
          onClose={() => setRejectModal({ isOpen: false, driverId: null, driverName: '' })}
          onConfirm={handleRejectConfirm}
          title="رفض موظف التوصيل"
          itemName={rejectModal.driverName}
          processing={processing}
        />
      </section>
    );
  }

  // All delivery drivers view
  return (
    <section>
      {allDelivery.length === 0 ? (
        <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
          <Truck size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">لا يوجد موظفي توصيل</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allDelivery.map((driver) => (
            <div key={driver.id} className="bg-white rounded-lg border border-gray-200 p-3 relative">
              <div className="flex items-start justify-between">
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => setSelectedDriver(driver)}
                >
                  <h3 className="font-bold text-sm text-gray-900 truncate">{driver.full_name || driver.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5" dir="ltr">{driver.phone}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-600">{driver.city || 'غير محدد'}</span>
                    {driver.documents?.national_id && (
                      <>
                        <span className="text-gray-300">•</span>
                        <span className="text-xs text-gray-500">هوية: {driver.documents.national_id}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-1 rounded-full whitespace-nowrap ${
                    driver.documents?.status === 'approved' 
                      ? 'bg-green-100 text-green-600' 
                      : driver.documents?.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {driver.documents?.status === 'approved' ? 'معتمد' : driver.documents?.status === 'pending' ? 'معلق' : 'غير مكتمل'}
                  </span>
                  <button
                    onClick={() => setShowMenu(showMenu === driver.id ? null : driver.id)}
                    className="p-1 hover:bg-gray-100 rounded-full"
                  >
                    <MoreVertical size={16} className="text-gray-400" />
                  </button>
                </div>
              </div>
              
              {/* قائمة الخيارات */}
              {showMenu === driver.id && (
                <div className="absolute left-2 top-10 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
                  <button
                    onClick={() => handleAction('view', driver)}
                    className="w-full px-3 py-2 text-right text-xs hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Eye size={14} className="text-blue-500" />
                    عرض التفاصيل
                  </button>
                  <button
                    onClick={() => handleAction('ban', driver)}
                    className="w-full px-3 py-2 text-right text-xs hover:bg-gray-50 flex items-center gap-2 text-orange-600"
                  >
                    <Ban size={14} />
                    حظر
                  </button>
                  <button
                    onClick={() => handleAction('delete', driver)}
                    className="w-full px-3 py-2 text-right text-xs hover:bg-gray-50 flex items-center gap-2 text-red-600"
                  >
                    <Trash2 size={14} />
                    حذف
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* نافذة عرض التفاصيل */}
      {selectedDriver && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedDriver(null)}>
          <div className="bg-white rounded-xl max-w-sm w-full p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">تفاصيل السائق</h3>
              <button onClick={() => setSelectedDriver(null)} className="p-1 hover:bg-gray-100 rounded-full">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">الاسم</p>
                <p className="font-medium">{selectedDriver.full_name || selectedDriver.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">رقم الهاتف</p>
                <p className="font-medium flex items-center gap-1" dir="ltr">
                  <Phone size={12} className="text-gray-400" />
                  {selectedDriver.phone}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">المدينة</p>
                <p className="font-medium flex items-center gap-1">
                  <MapPin size={12} className="text-gray-400" />
                  {selectedDriver.city || 'غير محدد'}
                </p>
              </div>
              {selectedDriver.documents?.national_id && (
                <div>
                  <p className="text-xs text-gray-500">رقم الهوية</p>
                  <p className="font-medium">{selectedDriver.documents.national_id}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">الحالة</p>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  selectedDriver.documents?.status === 'approved' 
                    ? 'bg-green-100 text-green-600' 
                    : selectedDriver.documents?.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {selectedDriver.documents?.status === 'approved' ? 'معتمد' : selectedDriver.documents?.status === 'pending' ? 'معلق' : 'غير مكتمل'}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t flex gap-2">
              <button
                onClick={() => { handleAction('ban', selectedDriver); setSelectedDriver(null); }}
                className="flex-1 py-2 bg-orange-100 text-orange-600 rounded-lg text-sm font-medium flex items-center justify-center gap-1"
              >
                <Ban size={14} />
                حظر
              </button>
              <button
                onClick={() => { handleAction('delete', selectedDriver); setSelectedDriver(null); }}
                className="flex-1 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-medium flex items-center justify-center gap-1"
              >
                <Trash2 size={14} />
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default DeliveryTab;
