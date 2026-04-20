// /app/frontend/src/components/admin/join-requests/FoodStoreRequestCard.js
// بطاقة طلب انضمام متجر الطعام

import { UtensilsCrossed, ChevronUp, ChevronDown, Check, X, Loader2, Trash2, Image } from 'lucide-react';
import DocumentImage from './DocumentImage';

const FoodStoreRequestCard = ({ 
  store, 
  expandedItem, 
  setExpandedItem, 
  actionLoading,
  onApprove,
  onReject,
  onDelete,
  setViewImage
}) => {
  return (
    <div className="bg-white rounded-xl border border-green-200 overflow-hidden">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-green-50/50"
        onClick={() => setExpandedItem(expandedItem === store.id ? null : store.id)}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center overflow-hidden">
            {store.logo ? (
              <img src={store.logo} alt="" className="w-full h-full object-cover" />
            ) : (
              <UtensilsCrossed size={24} className="text-green-600" />
            )}
          </div>
          <div>
            <h4 className="font-bold text-gray-800">{store.name}</h4>
            <p className="text-sm text-gray-500">{store.city}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {expandedItem === store.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>
      
      {expandedItem === store.id && (
        <div className="px-4 pb-4 border-t bg-gray-50">
          {/* صور المتجر */}
          <div className="py-3">
            <h5 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Image size={16} />
              صور المتجر
            </h5>
            <div className="grid grid-cols-2 gap-2">
              <DocumentImage 
                src={store.logo} 
                label="شعار المتجر"
                onClick={(src, label) => setViewImage({ src, label })}
              />
              <DocumentImage 
                src={store.cover_image} 
                label="صورة الغلاف"
                onClick={(src, label) => setViewImage({ src, label })}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 py-3 text-sm border-t">
            <div><span className="text-gray-500">المدينة:</span> {store.city}</div>
            <div><span className="text-gray-500">الهاتف:</span> {store.phone}</div>
            {store.cuisine_type && (
              <div><span className="text-gray-500">نوع المطبخ:</span> {store.cuisine_type}</div>
            )}
            {store.address && (
              <div className="col-span-2">
                <span className="text-gray-500">العنوان:</span>{' '}
                {typeof store.address === 'object' 
                  ? [store.address?.area, store.address?.street, store.address?.building].filter(Boolean).join(', ') 
                  : store.address}
              </div>
            )}
          </div>
          
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onApprove(store.id)}
              disabled={actionLoading === store.id}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              {actionLoading === store.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              قبول
            </button>
            <button
              onClick={() => onReject(store.id, store.name)}
              disabled={actionLoading === store.id}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
            >
              <X size={16} />
              رفض
            </button>
            <button
              onClick={() => onDelete(store.id)}
              disabled={actionLoading === store.id}
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

export default FoodStoreRequestCard;
