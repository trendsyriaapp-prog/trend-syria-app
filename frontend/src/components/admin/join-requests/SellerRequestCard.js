// /app/frontend/src/components/admin/join-requests/SellerRequestCard.js
// بطاقة طلب انضمام البائع

import { Store, ChevronUp, ChevronDown, Check, X, Loader2, Trash2, Image } from 'lucide-react';
import DocumentImage from './DocumentImage';

const SellerRequestCard = ({ 
  item, 
  expandedItem, 
  setExpandedItem, 
  actionLoading,
  onApprove,
  onReject,
  onDelete,
  setViewImage
}) => {
  const seller = item.seller || item;
  const sellerId = item.seller_id || seller.id;

  return (
    <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-amber-50/50"
        onClick={() => setExpandedItem(expandedItem === sellerId ? null : sellerId)}
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
            <Store size={24} className="text-amber-600" />
          </div>
          <div>
            <h4 className="font-bold text-gray-800">
              {seller.store_name || seller.name || seller.full_name || 'بدون اسم'}
            </h4>
            <p className="text-sm text-gray-500">{seller.phone || 'بدون رقم'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {expandedItem === sellerId ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </div>
      
      {expandedItem === sellerId && (
        <div className="px-4 pb-4 border-t bg-gray-50">
          {/* صور الوثائق */}
          <div className="py-3">
            <h5 className="text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              <Image size={16} />
              الوثائق المرفقة
            </h5>
            <div className="grid grid-cols-3 gap-2">
              <DocumentImage 
                src={item.national_id || seller.national_id} 
                label="صورة الهوية / إخراج القيد"
                onClick={(src, label) => setViewImage({ src, label })}
              />
              <DocumentImage 
                src={item.commercial_registration || seller.commercial_registration} 
                label="السجل التجاري"
                onClick={(src, label) => setViewImage({ src, label })}
              />
              <DocumentImage 
                src={item.shop_photo || item.health_certificate || seller.shop_photo} 
                label={item.seller_type === 'restaurant' ? "الشهادة الصحية" : "صورة المحل"}
                onClick={(src, label) => setViewImage({ src, label })}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 py-3 text-sm border-t">
            <div><span className="text-gray-500">المدينة:</span> {seller.city || 'غير محدد'}</div>
            <div><span className="text-gray-500">الهاتف:</span> {seller.phone || 'غير محدد'}</div>
            {seller.store_address && (
              <div className="col-span-2">
                <span className="text-gray-500">العنوان:</span>{' '}
                {typeof seller.store_address === 'object' 
                  ? [seller.store_address?.area, seller.store_address?.street, seller.store_address?.building].filter(Boolean).join(', ') 
                  : seller.store_address}
              </div>
            )}
          </div>
          
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onApprove(sellerId)}
              disabled={actionLoading === sellerId}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
            >
              {actionLoading === sellerId ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              قبول
            </button>
            <button
              onClick={() => onReject(sellerId, seller.store_name || seller.name || seller.full_name)}
              disabled={actionLoading === sellerId}
              className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
            >
              <X size={16} />
              رفض
            </button>
            <button
              onClick={() => onDelete(sellerId)}
              disabled={actionLoading === sellerId}
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

export default SellerRequestCard;
