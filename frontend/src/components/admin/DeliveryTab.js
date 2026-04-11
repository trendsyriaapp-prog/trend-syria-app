// /app/frontend/src/components/admin/DeliveryTab.js
import { useState, useMemo } from 'react';
import { Truck, Check, X, MoreVertical, Trash2, Ban, Eye, Phone, MapPin, AlertTriangle, CheckCircle, XCircle, Search } from 'lucide-react';
import RejectModal from './RejectModal';
import ImageLightbox from '../ui/ImageLightbox';

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
  const [lightboxImage, setLightboxImage] = useState(null);
  const [actionModal, setActionModal] = useState({ isOpen: false, type: null, driver: null });
  const [searchQuery, setSearchQuery] = useState('');

  // فلترة موظفي التوصيل حسب البحث
  const filteredAllDelivery = useMemo(() => {
    if (!searchQuery.trim()) return allDelivery;
    const query = searchQuery.trim().toLowerCase();
    return allDelivery.filter(driver => 
      (driver.full_name || driver.name || '').toLowerCase().includes(query) ||
      (driver.phone || '').includes(query)
    );
  }, [allDelivery, searchQuery]);

  const filteredPendingDelivery = useMemo(() => {
    if (!searchQuery.trim()) return pendingDelivery;
    const query = searchQuery.trim().toLowerCase();
    return pendingDelivery.filter(doc => 
      (doc.driver_name || doc.driver?.full_name || doc.driver?.name || '').toLowerCase().includes(query) ||
      (doc.driver_phone || doc.driver?.phone || '').includes(query)
    );
  }, [pendingDelivery, searchQuery]);

  // دالة لحساب حالة الوثائق
  const getDocumentsStatus = (doc) => {
    const requiredDocs = [
      { key: 'personal_photo', label: 'صورة شخصية', required: true },
      { key: 'id_photo', label: 'صورة الهوية / إخراج القيد', required: true },
      { key: 'motorcycle_license', label: 'رخصة القيادة', required: doc.requires_license !== false },
    ];
    const optionalDocs = [
      { key: 'vehicle_photo', label: 'صورة المركبة', required: false },
    ];

    const allDocs = [...requiredDocs, ...optionalDocs];
    const uploadedCount = allDocs.filter(d => doc[d.key]).length;
    const requiredCount = requiredDocs.length;
    const requiredUploaded = requiredDocs.filter(d => doc[d.key]).length;
    const isComplete = requiredUploaded === requiredCount;
    const missingRequired = requiredDocs.filter(d => !doc[d.key]).map(d => d.label);

    return {
      uploadedCount,
      totalCount: allDocs.length,
      requiredCount,
      requiredUploaded,
      isComplete,
      missingRequired,
      docs: allDocs.map(d => ({ ...d, uploaded: !!doc[d.key] }))
    };
  };

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
      setActionModal({ isOpen: true, type: 'delete', driver });
    } else if (action === 'ban') {
      setActionModal({ isOpen: true, type: 'ban', driver });
    }
  };

  const confirmAction = () => {
    if (actionModal.type === 'delete') {
      onDeleteDriver?.(actionModal.driver.id);
    } else if (actionModal.type === 'ban') {
      onBanDriver?.(actionModal.driver.id);
    }
    setActionModal({ isOpen: false, type: null, driver: null });
  };

  // Pending delivery drivers view
  if (isPending) {
    return (
      <section>
        {/* حقل البحث */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو رقم الهاتف..."
              className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none text-sm"
            />
          </div>
          {searchQuery && (
            <p className="text-xs text-gray-500 mt-1">
              عدد النتائج: {filteredPendingDelivery.length} من {pendingDelivery.length}
            </p>
          )}
        </div>

        {filteredPendingDelivery.length === 0 ? (
          <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
            <Check size={36} className="text-green-500 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">
              {searchQuery ? 'لا توجد نتائج للبحث' : 'لا يوجد موظفي توصيل في انتظار الموافقة'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPendingDelivery.map((doc) => {
              const docStatus = getDocumentsStatus(doc);
              
              return (
              <div key={doc.id} className={`bg-white rounded-xl border-2 ${docStatus.isComplete ? 'border-green-200' : 'border-yellow-200'} overflow-hidden shadow-sm`}>
                {/* Header with driver info */}
                <div className={`${docStatus.isComplete ? 'bg-gradient-to-l from-green-50 to-emerald-50 border-green-100' : 'bg-gradient-to-l from-yellow-50 to-orange-50 border-yellow-100'} p-4 border-b`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 ${docStatus.isComplete ? 'bg-green-100' : 'bg-yellow-100'} rounded-full flex items-center justify-center`}>
                        <Truck size={24} className={docStatus.isComplete ? 'text-green-600' : 'text-yellow-600'} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{doc.driver_name || doc.driver?.full_name || doc.driver?.name}</h3>
                        <p className="text-sm text-gray-600" dir="ltr">{doc.driver_phone || doc.driver?.phone}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin size={12} />
                            {doc.driver_city || doc.driver?.city}
                          </span>
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                            هوية: {doc.national_id || 'غير محدد'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onApprove(doc.driver_id || doc.delivery_id)}
                        disabled={!docStatus.isComplete}
                        className={`px-4 py-2 text-white rounded-lg transition-colors flex items-center gap-2 text-sm font-medium ${
                          docStatus.isComplete 
                            ? 'bg-green-500 hover:bg-green-600 cursor-pointer' 
                            : 'bg-gray-400 cursor-not-allowed'
                        }`}
                        data-testid={`approve-driver-${doc.driver_id || doc.delivery_id}`}
                        title={!docStatus.isComplete ? `الوثائق غير مكتملة: ${docStatus.missingRequired.join('، ')}` : 'قبول السائق'}
                      >
                        <Check size={18} />
                        قبول
                      </button>
                      <button
                        onClick={() => handleRejectClick(doc.driver_id || doc.delivery_id, doc.driver_name || doc.driver?.full_name || doc.driver?.name)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2 text-sm font-medium"
                        data-testid={`reject-driver-${doc.driver_id || doc.delivery_id}`}
                      >
                        <X size={18} />
                        رفض
                      </button>
                    </div>
                  </div>
                </div>

                {/* Documents Status Alert */}
                {!docStatus.isComplete && (
                  <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-800">
                          ⚠️ الوثائق غير مكتملة ({docStatus.requiredUploaded} من {docStatus.requiredCount} مطلوب)
                        </p>
                        <p className="text-xs text-amber-700 mt-0.5">
                          ناقص: {docStatus.missingRequired.join('، ')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Documents Status - Complete */}
                {docStatus.isComplete && (
                  <div className="bg-green-50 border-b border-green-200 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
                      <p className="text-sm font-medium text-green-800">
                        ✅ جميع الوثائق المطلوبة مكتملة ({docStatus.uploadedCount} من {docStatus.totalCount})
                      </p>
                    </div>
                  </div>
                )}

                {/* Documents Section */}
                <div className="p-4">
                  <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Eye size={16} className="text-blue-500" />
                    المستندات المقدمة
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {/* صورة شخصية */}
                    <div className={`rounded-xl p-2 border-2 ${doc.personal_photo ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <p className="text-xs text-gray-600 mb-2 text-center font-medium flex items-center justify-center gap-1">
                        {doc.personal_photo ? <CheckCircle size={12} className="text-green-500" /> : <XCircle size={12} className="text-red-500" />}
                        صورة شخصية
                        <span className="text-[10px] text-red-500">*</span>
                      </p>
                      {doc.personal_photo ? (
                        <img 
                          src={doc.personal_photo} 
                          alt="صورة شخصية" 
                          className="w-full h-28 object-cover rounded-lg cursor-pointer hover:scale-105 transition-transform border-2 border-white shadow-sm"
                          onClick={() => setLightboxImage({ src: doc.personal_photo, alt: 'صورة شخصية' })}
                        />
                      ) : (
                        <div className="w-full h-28 bg-red-100 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-red-300">
                          <XCircle size={24} className="text-red-400 mb-1" />
                          <span className="text-red-500 text-xs font-medium">غير مرفوع</span>
                        </div>
                      )}
                    </div>

                    {/* صورة الهوية */}
                    <div className={`rounded-xl p-2 border-2 ${doc.id_photo ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <p className="text-xs text-gray-600 mb-2 text-center font-medium flex items-center justify-center gap-1">
                        {doc.id_photo ? <CheckCircle size={12} className="text-green-500" /> : <XCircle size={12} className="text-red-500" />}
                        الهوية / إخراج القيد
                        <span className="text-[10px] text-red-500">*</span>
                      </p>
                      {doc.id_photo ? (
                        <img 
                          src={doc.id_photo} 
                          alt="صورة الهوية / إخراج القيد" 
                          className="w-full h-28 object-cover rounded-lg cursor-pointer hover:scale-105 transition-transform border-2 border-white shadow-sm"
                          onClick={() => setLightboxImage({ src: doc.id_photo, alt: 'صورة الهوية / إخراج القيد' })}
                        />
                      ) : (
                        <div className="w-full h-28 bg-red-100 rounded-lg flex flex-col items-center justify-center border-2 border-dashed border-red-300">
                          <XCircle size={24} className="text-red-400 mb-1" />
                          <span className="text-red-500 text-xs font-medium">غير مرفوع</span>
                        </div>
                      )}
                    </div>

                    {/* رخصة القيادة */}
                    <div className={`rounded-xl p-2 border-2 ${doc.motorcycle_license ? 'bg-green-50 border-green-200' : (doc.requires_license !== false ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200')}`}>
                      <p className="text-xs text-gray-600 mb-2 text-center font-medium flex items-center justify-center gap-1">
                        {doc.motorcycle_license ? <CheckCircle size={12} className="text-green-500" /> : (doc.requires_license !== false ? <XCircle size={12} className="text-red-500" /> : null)}
                        رخصة القيادة
                        {doc.requires_license !== false && <span className="text-[10px] text-red-500">*</span>}
                      </p>
                      {doc.motorcycle_license ? (
                        <img 
                          src={doc.motorcycle_license} 
                          alt="رخصة القيادة" 
                          className="w-full h-28 object-cover rounded-lg cursor-pointer hover:scale-105 transition-transform border-2 border-white shadow-sm"
                          onClick={() => setLightboxImage({ src: doc.motorcycle_license, alt: 'رخصة القيادة' })}
                        />
                      ) : (
                        <div className={`w-full h-28 rounded-lg flex flex-col items-center justify-center border-2 border-dashed ${doc.requires_license !== false ? 'bg-red-100 border-red-300' : 'bg-gray-100 border-gray-300'}`}>
                          {doc.requires_license !== false ? (
                            <>
                              <XCircle size={24} className="text-red-400 mb-1" />
                              <span className="text-red-500 text-xs font-medium">غير مرفوع</span>
                            </>
                          ) : (
                            <span className="text-gray-400 text-xs">غير مطلوب</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
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
      {/* حقل البحث */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم أو رقم الهاتف..."
            className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none text-sm"
          />
        </div>
        {searchQuery && (
          <p className="text-xs text-gray-500 mt-1">
            عدد النتائج: {filteredAllDelivery.length} من {allDelivery.length}
          </p>
        )}
      </div>

      {filteredAllDelivery.length === 0 ? (
        <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
          <Truck size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {searchQuery ? 'لا توجد نتائج للبحث' : 'لا يوجد موظفي توصيل'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAllDelivery.map((driver) => (
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
                        <span className="text-xs text-gray-500">رقم الهوية: {driver.documents.national_id}</span>
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
          <div className="bg-white rounded-lg max-w-sm w-full p-4" onClick={e => e.stopPropagation()}>
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

              {/* المستندات المقدمة */}
              {selectedDriver.documents && (
                <div className="pt-3 border-t">
                  <p className="text-xs text-gray-500 mb-2 font-medium">المستندات المقدمة:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedDriver.documents.personal_photo && (
                      <div>
                        <p className="text-[10px] text-gray-400 mb-1">صورة شخصية</p>
                        <img 
                          src={selectedDriver.documents.personal_photo} 
                          alt="صورة شخصية" 
                          className="w-full h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity border"
                          onClick={() => setLightboxImage({ src: selectedDriver.documents.personal_photo, alt: 'صورة شخصية' })}
                        />
                      </div>
                    )}
                    {selectedDriver.documents.id_photo && (
                      <div>
                        <p className="text-[10px] text-gray-400 mb-1">الهوية / إخراج القيد</p>
                        <img 
                          src={selectedDriver.documents.id_photo} 
                          alt="صورة الهوية / إخراج القيد" 
                          className="w-full h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity border"
                          onClick={() => setLightboxImage({ src: selectedDriver.documents.id_photo, alt: 'صورة الهوية / إخراج القيد' })}
                        />
                      </div>
                    )}
                    {selectedDriver.documents.motorcycle_license && (
                      <div>
                        <p className="text-[10px] text-gray-400 mb-1">رخصة القيادة</p>
                        <img 
                          src={selectedDriver.documents.motorcycle_license} 
                          alt="رخصة القيادة" 
                          className="w-full h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity border"
                          onClick={() => setLightboxImage({ src: selectedDriver.documents.motorcycle_license, alt: 'رخصة القيادة' })}
                        />
                      </div>
                    )}
                    {selectedDriver.documents.vehicle_photo && (
                      <div>
                        <p className="text-[10px] text-gray-400 mb-1">صورة المركبة</p>
                        <img 
                          src={selectedDriver.documents.vehicle_photo} 
                          alt="صورة المركبة" 
                          className="w-full h-16 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity border"
                          onClick={() => setLightboxImage({ src: selectedDriver.documents.vehicle_photo, alt: 'صورة المركبة' })}
                        />
                      </div>
                    )}
                  </div>
                  {!selectedDriver.documents.personal_photo && !selectedDriver.documents.id_photo && !selectedDriver.documents.motorcycle_license && (
                    <p className="text-xs text-gray-400 italic">لم يتم تقديم مستندات</p>
                  )}
                </div>
              )}
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

      {/* Image Lightbox */}
      {lightboxImage && (
        <ImageLightbox 
          src={lightboxImage.src} 
          alt={lightboxImage.alt} 
          onClose={() => setLightboxImage(null)} 
        />
      )}

      {/* Action Confirmation Modal */}
      {actionModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                actionModal.type === 'delete' ? 'bg-red-100' : 'bg-orange-100'
              }`}>
                {actionModal.type === 'delete' ? (
                  <Trash2 size={20} className="text-red-600" />
                ) : (
                  <Ban size={20} className="text-orange-600" />
                )}
              </div>
              <div>
                <h3 className="font-bold">
                  {actionModal.type === 'delete' ? 'حذف السائق' : 'حظر السائق'}
                </h3>
                <p className="text-xs text-gray-500">
                  {actionModal.driver?.full_name || actionModal.driver?.name}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              {actionModal.type === 'delete' 
                ? 'هل تريد حذف هذا السائق؟ لا يمكن التراجع عن هذا الإجراء.'
                : 'هل تريد حظر هذا السائق؟ لن يتمكن من العمل بعد الآن.'
              }
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setActionModal({ isOpen: false, type: null, driver: null })}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={confirmAction}
                className={`flex-1 py-2 text-white rounded-lg text-sm flex items-center justify-center gap-2 ${
                  actionModal.type === 'delete' ? 'bg-red-500' : 'bg-orange-500'
                }`}
              >
                {actionModal.type === 'delete' ? <Trash2 size={16} /> : <Ban size={16} />}
                {actionModal.type === 'delete' ? 'حذف' : 'حظر'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default DeliveryTab;
