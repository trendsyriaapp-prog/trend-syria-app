// /app/frontend/src/components/admin/join-requests/DriverRequestCard.js
// بطاقة طلب انضمام السائق

import { Truck, ChevronUp, ChevronDown, Check, X, Loader2, Trash2, Image, AlertTriangle, CheckCircle } from 'lucide-react';
import DocumentImage from './DocumentImage';

// دالة لحساب حالة وثائق السائق
export const getDriverDocumentsStatus = (doc) => {
  const driver = doc.driver || doc;
  const requiredDocs = [
    { key: 'personal_photo', label: 'صورة شخصية', required: true },
    { key: 'id_photo', label: 'صورة الهوية', required: true },
    { key: 'bike_photo', label: 'صورة الدراجة', required: true },
  ];

  const uploadedCount = requiredDocs.filter(d => doc[d.key]).length;
  const requiredCount = requiredDocs.filter(d => d.required).length;
  const isComplete = requiredDocs.filter(d => d.required).every(d => doc[d.key]);
  const missingRequired = requiredDocs.filter(d => d.required && !doc[d.key]).map(d => d.label);

  return {
    uploadedCount,
    totalCount: requiredDocs.length,
    isComplete,
    missingRequired,
    docs: requiredDocs.map(d => ({ ...d, uploaded: !!doc[d.key] }))
  };
};

const DriverRequestCard = ({ 
  item, 
  expandedItem, 
  setExpandedItem, 
  actionLoading,
  onApprove,
  onReject,
  onDelete,
  setViewImage
}) => {
  const driver = item.driver || item;
  const driverId = item.driver_id || item.delivery_id || driver.id;
  const docStatus = getDriverDocumentsStatus(item);

  return (
    <div className={`bg-white rounded-xl border-2 overflow-hidden ${docStatus.isComplete ? 'border-green-200' : 'border-yellow-200'}`}>
      <div 
        className={`p-4 flex items-center justify-between cursor-pointer ${docStatus.isComplete ? 'hover:bg-green-50/50' : 'hover:bg-yellow-50/50'}`}
        onClick={() => setExpandedItem(expandedItem === driverId ? null : driverId)}
      >
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${docStatus.isComplete ? 'bg-green-100' : 'bg-yellow-100'}`}>
            <Truck size={24} className={docStatus.isComplete ? 'text-green-600' : 'text-yellow-600'} />
          </div>
          <div>
            <h4 className="font-bold text-gray-800">{driver.name || driver.full_name}</h4>
            <p className="text-sm text-gray-500">{driver.phone}</p>
            {/* Document status badge */}
            <div className={`mt-1 text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${docStatus.isComplete ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {docStatus.isComplete ? (
                <><CheckCircle size={12} /> وثائق مكتملة</>
              ) : (
                <><AlertTriangle size={12} /> وثائق ناقصة ({docStatus.uploadedCount}/{docStatus.totalCount})</>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {expandedItem === driverId ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>
      
      {expandedItem === driverId && (
        <div className="px-4 pb-4 border-t bg-gray-50">
          {/* Warning banner if incomplete */}
          {!docStatus.isComplete && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 my-3">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">⚠️ الوثائق غير مكتملة</p>
                  <p className="text-xs text-amber-700 mt-0.5">ناقص: {docStatus.missingRequired.join('، ')}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* صور الوثائق */}
          <div className="py-3">
            <h5 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Image size={16} />
              الوثائق المرفقة
            </h5>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <DocumentImage 
                src={item.personal_photo || driver.personal_photo} 
                label="صورة شخصية"
                onClick={(src, label) => setViewImage({ src, label })}
              />
              <DocumentImage 
                src={item.id_photo || driver.id_photo} 
                label="صورة الهوية"
                onClick={(src, label) => setViewImage({ src, label })}
              />
              <DocumentImage 
                src={item.bike_photo || driver.bike_photo} 
                label="صورة الدراجة"
                onClick={(src, label) => setViewImage({ src, label })}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 py-3 text-sm border-t">
            <div><span className="text-gray-500">المدينة:</span> {item.home_city || driver.city || 'غير محدد'}</div>
            <div><span className="text-gray-500">الهاتف:</span> {driver.phone}</div>
            <div><span className="text-gray-500">نوع الوقود:</span> {item.fuel_type_name || (item.fuel_type === 'petrol' ? 'بنزين' : item.fuel_type === 'electric' ? 'كهرباء' : 'غير محدد')}</div>
            <div><span className="text-gray-500">رقم الهوية:</span> {item.national_id || 'غير محدد'}</div>
            {(item.home_address || driver.home_address) && (
              <div className="col-span-2">
                <span className="text-gray-500">العنوان:</span> {item.home_address || driver.home_address}
              </div>
            )}
            {item.home_latitude && item.home_longitude && (
              <div className="col-span-2">
                <span className="text-gray-500">الموقع GPS:</span>{' '}
                <a 
                  href={`https://www.google.com/maps?q=${item.home_latitude},${item.home_longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-xs"
                >
                  📍 عرض على الخريطة
                </a>
              </div>
            )}
            {item.created_at && (
              <div className="col-span-2">
                <span className="text-gray-500">تاريخ التقديم:</span> {new Date(item.created_at).toLocaleDateString('ar-SY')}
              </div>
            )}
          </div>
          
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onApprove(driverId)}
              disabled={actionLoading === driverId || !docStatus.isComplete}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-white rounded-lg disabled:opacity-50 ${docStatus.isComplete ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed'}`}
              title={!docStatus.isComplete ? `الوثائق غير مكتملة: ${docStatus.missingRequired.join('، ')}` : 'قبول السائق'}
            >
              {actionLoading === driverId ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {docStatus.isComplete ? 'قبول' : 'وثائق ناقصة'}
            </button>
            <button
              onClick={() => onReject(driverId, driver.name || driver.full_name)}
              disabled={actionLoading === driverId}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              data-testid={`reject-driver-btn-${driverId}`}
            >
              <X size={16} />
              رفض
            </button>
            <button
              onClick={() => onDelete(driverId)}
              disabled={actionLoading === driverId}
              className="flex items-center justify-center gap-1 py-2 px-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
              title="حذف نهائي"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverRequestCard;
