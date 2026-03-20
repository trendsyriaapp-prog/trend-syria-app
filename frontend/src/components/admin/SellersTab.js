// /app/frontend/src/components/admin/SellersTab.js
import { useState } from 'react';
import { Store, Phone, MapPin, MoreVertical, Trash2, Ban, Eye, X, CheckCircle, XCircle } from 'lucide-react';

const SellersTab = ({ allSellers, onDeleteSeller, onBanSeller, onApproveSeller, onRejectSeller }) => {
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [showMenu, setShowMenu] = useState(null);

  const handleAction = (action, seller) => {
    setShowMenu(null);
    if (action === 'view') {
      setSelectedSeller(seller);
    } else if (action === 'delete') {
      if (window.confirm(`هل تريد حذف البائع "${seller.full_name || seller.name}"؟`)) {
        onDeleteSeller?.(seller.id);
      }
    } else if (action === 'ban') {
      if (window.confirm(`هل تريد حظر البائع "${seller.full_name || seller.name}"؟`)) {
        onBanSeller?.(seller.id);
      }
    } else if (action === 'approve') {
      onApproveSeller?.(seller.id);
    } else if (action === 'reject') {
      onRejectSeller?.(seller.id);
    }
  };

  return (
    <section>
      {allSellers.length === 0 ? (
        <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
          <Store size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">لا يوجد بائعين</p>
        </div>
      ) : (
        <div className="space-y-2">
          {allSellers.map((s) => (
            <div key={s.id} className="bg-white rounded-lg border border-gray-200 p-3 relative">
              <div className="flex items-start justify-between">
                <div 
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => setSelectedSeller(s)}
                >
                  <h3 className="font-bold text-sm text-gray-900 truncate">{s.full_name || s.name}</h3>
                  {s.documents?.business_name && (
                    <p className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
                      <Store size={10} />
                      {s.documents.business_name}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1" dir="ltr">
                    <Phone size={10} />
                    {s.phone}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-1 rounded-full whitespace-nowrap ${
                    s.documents?.status === 'approved' 
                      ? 'bg-green-100 text-green-600' 
                      : s.documents?.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {s.documents?.status === 'approved' ? 'معتمد' : s.documents?.status === 'pending' ? 'معلق' : 'غير مكتمل'}
                  </span>
                  <button
                    onClick={() => setShowMenu(showMenu === s.id ? null : s.id)}
                    className="p-1 hover:bg-gray-100 rounded-full"
                  >
                    <MoreVertical size={16} className="text-gray-400" />
                  </button>
                </div>
              </div>
              
              {/* قائمة الخيارات */}
              {showMenu === s.id && (
                <div className="absolute left-2 top-10 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
                  <button
                    onClick={() => handleAction('view', s)}
                    className="w-full px-3 py-2 text-right text-xs hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Eye size={14} className="text-blue-500" />
                    عرض التفاصيل
                  </button>
                  {s.documents?.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleAction('approve', s)}
                        className="w-full px-3 py-2 text-right text-xs hover:bg-gray-50 flex items-center gap-2 text-green-600"
                      >
                        <CheckCircle size={14} />
                        موافقة
                      </button>
                      <button
                        onClick={() => handleAction('reject', s)}
                        className="w-full px-3 py-2 text-right text-xs hover:bg-gray-50 flex items-center gap-2 text-red-600"
                      >
                        <XCircle size={14} />
                        رفض
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleAction('ban', s)}
                    className="w-full px-3 py-2 text-right text-xs hover:bg-gray-50 flex items-center gap-2 text-orange-600"
                  >
                    <Ban size={14} />
                    حظر
                  </button>
                  <button
                    onClick={() => handleAction('delete', s)}
                    className="w-full px-3 py-2 text-right text-xs hover:bg-gray-50 flex items-center gap-2 text-red-600"
                  >
                    <Trash2 size={14} />
                    حذف
                  </button>
                </div>
              )}
              
              <div className="mt-2 pt-2 border-t border-gray-100">
                <div className="flex items-start gap-1 text-xs text-gray-600">
                  <MapPin size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="font-medium">{s.city || 'غير محدد'}</span>
                    {s.addresses && s.addresses.length > 0 && (
                      <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                        {s.addresses[0].street}
                        {s.addresses[0].building_number && ` - بناء ${s.addresses[0].building_number}`}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* الوثائق المقدمة - للطلبات المعلقة فقط */}
              {s.documents?.status === 'pending' && s.documents && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2 font-medium">الوثائق المقدمة:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {s.documents.national_id && (
                      <div>
                        <p className="text-[10px] text-gray-400 mb-1">صورة الهوية</p>
                        <img 
                          src={s.documents.national_id} 
                          alt="صورة الهوية" 
                          className="w-full h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => window.open(s.documents.national_id, '_blank')}
                        />
                      </div>
                    )}
                    {s.documents.commercial_registration && (
                      <div>
                        <p className="text-[10px] text-gray-400 mb-1">السجل التجاري</p>
                        <img 
                          src={s.documents.commercial_registration} 
                          alt="السجل التجاري" 
                          className="w-full h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => window.open(s.documents.commercial_registration, '_blank')}
                        />
                      </div>
                    )}
                    {s.documents.shop_photo && (
                      <div>
                        <p className="text-[10px] text-gray-400 mb-1">صورة المحل</p>
                        <img 
                          src={s.documents.shop_photo} 
                          alt="صورة المحل" 
                          className="w-full h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => window.open(s.documents.shop_photo, '_blank')}
                        />
                      </div>
                    )}
                    {s.documents.health_certificate && (
                      <div>
                        <p className="text-[10px] text-gray-400 mb-1">الشهادة الصحية</p>
                        <img 
                          src={s.documents.health_certificate} 
                          alt="الشهادة الصحية" 
                          className="w-full h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => window.open(s.documents.health_certificate, '_blank')}
                        />
                      </div>
                    )}
                    {/* إذا لم توجد أي وثائق */}
                    {!s.documents.national_id && !s.documents.commercial_registration && 
                     !s.documents.shop_photo && !s.documents.health_certificate && (
                      <p className="col-span-2 text-xs text-gray-400 italic">لم يتم تقديم أي وثائق</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* نافذة عرض التفاصيل */}
      {selectedSeller && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedSeller(null)}>
          <div className="bg-white rounded-lg max-w-sm w-full p-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">تفاصيل البائع</h3>
              <button onClick={() => setSelectedSeller(null)} className="p-1 hover:bg-gray-100 rounded-full">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">الاسم</p>
                <p className="font-medium">{selectedSeller.full_name || selectedSeller.name}</p>
              </div>
              {selectedSeller.documents?.business_name && (
                <div>
                  <p className="text-xs text-gray-500">اسم المتجر</p>
                  <p className="font-medium">{selectedSeller.documents.business_name}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500">رقم الهاتف</p>
                <p className="font-medium" dir="ltr">{selectedSeller.phone}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">المدينة</p>
                <p className="font-medium">{selectedSeller.city || 'غير محدد'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">الحالة</p>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  selectedSeller.documents?.status === 'approved' 
                    ? 'bg-green-100 text-green-600' 
                    : selectedSeller.documents?.status === 'pending'
                    ? 'bg-yellow-100 text-yellow-600'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {selectedSeller.documents?.status === 'approved' ? 'معتمد' : selectedSeller.documents?.status === 'pending' ? 'معلق' : 'غير مكتمل'}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t flex gap-2">
              <button
                onClick={() => { handleAction('ban', selectedSeller); setSelectedSeller(null); }}
                className="flex-1 py-2 bg-orange-100 text-orange-600 rounded-lg text-sm font-medium flex items-center justify-center gap-1"
              >
                <Ban size={14} />
                حظر
              </button>
              <button
                onClick={() => { handleAction('delete', selectedSeller); setSelectedSeller(null); }}
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

export default SellersTab;
