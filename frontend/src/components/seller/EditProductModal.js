import { motion } from 'framer-motion';
import { X, Loader2, Info } from 'lucide-react';

const EditProductModal = ({ 
  product, 
  editPrice, 
  setEditPrice, 
  editStock, 
  setEditStock, 
  onSave, 
  onClose, 
  saving,
  commissionInfo = null
}) => {
  if (!product) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl p-4 w-full max-w-sm"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-900">تعديل المنتج</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Product Preview */}
        <div className="flex items-center gap-3 mb-4 p-2 bg-gray-50 rounded-lg">
          <img
            src={product.images?.[0] || '/placeholder.svg'}
            alt={product.name}
            className="w-12 h-12 object-cover rounded"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-xs text-gray-900 truncate">{product.name}</h3>
            <p className="text-[10px] text-gray-500">{product.category}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-medium mb-1 text-gray-700">السعر (ل.س)</label>
            <input
              type="number"
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-sm text-gray-900 focus:border-[#FF6B00] focus:outline-none"
              data-testid="edit-price-input"
            />
          </div>

          {/* حاسبة الأرباح والعمولة */}
          {editPrice > 0 && commissionInfo && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-3 border border-amber-200">
              <h4 className="font-bold text-amber-800 text-xs mb-2 flex items-center gap-1">
                <Info size={12} />
                تفاصيل أرباحك
              </h4>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">سعر البيع:</span>
                <span className="font-medium">{Number(editPrice).toLocaleString()} ل.س</span>
              </div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-red-600">عمولة المنصة ({commissionInfo.commission_percentage}):</span>
                <span className="font-medium text-red-600">- {Math.round(Number(editPrice) * commissionInfo.commission_rate).toLocaleString()} ل.س</span>
              </div>
              <div className="flex justify-between text-xs bg-green-100 rounded px-2 py-1 mt-2">
                <span className="font-bold text-green-700">صافي ربحك:</span>
                <span className="font-bold text-green-700">{Math.round(Number(editPrice) * (1 - commissionInfo.commission_rate)).toLocaleString()} ل.س ✅</span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-medium mb-1 text-gray-700">الكمية المتاحة</label>
            <input
              type="number"
              value={editStock}
              onChange={(e) => setEditStock(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-sm text-gray-900 focus:border-[#FF6B00] focus:outline-none"
              data-testid="edit-stock-input"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-full text-xs font-bold"
          >
            إلغاء
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 bg-[#FF6B00] text-white font-bold py-2 rounded-full text-xs disabled:opacity-50 flex items-center justify-center gap-1"
            data-testid="save-edit-btn"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={12} />
                جاري الحفظ...
              </>
            ) : (
              'حفظ التغييرات'
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default EditProductModal;
