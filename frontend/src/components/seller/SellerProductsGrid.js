import { Package, Edit, Trash2, Check, X, Clock, Copy } from 'lucide-react';
import { formatPrice } from '../../utils/imageHelpers';

const SellerProductsGrid = ({ products, onEdit, onDelete, onDuplicate }) => {
  if (products.length === 0) {
    return (
      <div className="bg-white rounded-xl p-6 text-center border border-gray-200">
        <Package size={32} className="text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500 text-xs">لم تضف أي منتجات بعد</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
      {products.map((product) => (
        <div key={product.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden relative">
          {/* حالة الموافقة */}
          {product.approval_status === 'pending' && (
            <div className="absolute top-1 right-1 z-10 bg-yellow-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
              <Clock size={8} />
              معلق
            </div>
          )}
          {product.approval_status === 'rejected' && (
            <div className="absolute top-1 right-1 z-10 bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
              <X size={8} />
              مرفوض
            </div>
          )}
          {product.approval_status === 'approved' && (
            <div className="absolute top-1 right-1 z-10 bg-green-500 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
              <Check size={8} />
              تم النشر
            </div>
          )}
          <img
            src={product.images?.[0] || '/placeholder.svg'}
            alt={product.name}
            className={`w-full aspect-square object-cover ${product.approval_status !== 'approved' ? 'opacity-60' : ''}`}
          />
          <div className="p-2">
            <h3 className="font-bold text-[10px] truncate text-gray-900">{product.name}</h3>
            <p className="text-[#FF6B00] font-bold text-[10px]">{formatPrice(product.price)}</p>
            <p className="text-[8px] text-gray-500">المخزون: {product.stock}</p>
            {product.rejection_reason && (
              <p className="text-[8px] text-red-400 mt-0.5 truncate">سبب: {product.rejection_reason}</p>
            )}
            <div className="flex gap-1 mt-1">
              <button
                onClick={() => onEdit(product)}
                className="flex-1 p-1 text-blue-600 bg-blue-50 rounded text-[9px] flex items-center justify-center gap-0.5"
                data-testid={`edit-product-${product.id}`}
              >
                <Edit size={10} />
                تعديل
              </button>
              <button
                onClick={() => onDuplicate(product)}
                className="flex-1 p-1 text-green-600 bg-green-50 rounded text-[9px] flex items-center justify-center gap-0.5"
                data-testid={`duplicate-product-${product.id}`}
              >
                <Copy size={10} />
                نسخ
              </button>
              <button
                onClick={() => onDelete(product.id)}
                className="p-1 text-red-500 bg-red-50 rounded text-[9px] flex items-center justify-center"
                data-testid={`delete-product-${product.id}`}
              >
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default SellerProductsGrid;
