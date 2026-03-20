// /app/frontend/src/components/admin/ProductsTab.js
import { useState } from 'react';
import axios from 'axios';
import { 
  Package, Eye, EyeOff, Trash2, Edit, X, MoreVertical,
  Store, Tag, Layers, AlertTriangle, CheckCircle, RefreshCw
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const ProductsTab = ({ allProducts, onRefresh }) => {
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showMenu, setShowMenu] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(null);

  const filteredProducts = filter === 'all' 
    ? allProducts 
    : filter === 'hidden' 
      ? allProducts.filter(p => p.is_hidden)
      : filter === 'low_stock'
        ? allProducts.filter(p => p.stock < 10)
        : allProducts;

  // إخفاء/إظهار المنتج
  const handleToggleVisibility = async (productId, currentStatus) => {
    setProcessing(true);
    try {
      await axios.post(`${API}/api/admin/products/${productId}/toggle-visibility`);
      toast({ 
        title: currentStatus ? "تم إظهار المنتج" : "تم إخفاء المنتج",
        description: currentStatus ? "المنتج الآن مرئي للعملاء" : "المنتج الآن مخفي عن العملاء"
      });
      setShowMenu(null);
      if (onRefresh) onRefresh();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل في تغيير حالة المنتج", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  // حذف المنتج
  const handleDelete = async (productId) => {
    setProcessing(true);
    try {
      await axios.delete(`${API}/api/admin/products/${productId}`);
      toast({ title: "تم الحذف", description: "تم حذف المنتج بنجاح" });
      setShowDeleteModal(null);
      setSelectedProduct(null);
      if (onRefresh) onRefresh();
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || "فشل في حذف المنتج", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <section>
      {/* فلاتر */}
      <div className="flex gap-1.5 flex-wrap mb-3">
        {[
          { id: 'all', label: 'الكل', count: allProducts.length },
          { id: 'hidden', label: 'مخفي', count: allProducts.filter(p => p.is_hidden).length },
          { id: 'low_stock', label: 'مخزون منخفض', count: allProducts.filter(p => p.stock < 10).length },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-2.5 py-1 rounded-full text-[10px] transition-colors flex items-center gap-1 ${
              filter === f.id
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
            {f.count > 0 && <span className="bg-white/20 px-1.5 rounded-full">{f.count}</span>}
          </button>
        ))}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
          <Package size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">لا يوجد منتجات</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {filteredProducts.map((product) => (
            <div 
              key={product.id} 
              className={`bg-white rounded-lg border overflow-hidden relative ${
                product.is_hidden ? 'border-gray-300 opacity-60' : 'border-gray-200'
              }`}
            >
              {/* شارة مخفي */}
              {product.is_hidden && (
                <div className="absolute top-1 right-1 bg-gray-800 text-white text-[8px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 z-10">
                  <EyeOff size={8} /> مخفي
                </div>
              )}

              {/* شارة مخزون منخفض */}
              {product.stock < 10 && !product.is_hidden && (
                <div className="absolute top-1 right-1 bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full z-10">
                  مخزون منخفض
                </div>
              )}

              {/* زر القائمة */}
              <button
                onClick={(e) => { e.stopPropagation(); setShowMenu(showMenu === product.id ? null : product.id); }}
                className="absolute top-1 left-1 p-1 bg-white/90 rounded-full shadow-sm z-10 hover:bg-white"
              >
                <MoreVertical size={14} className="text-gray-600" />
              </button>

              {/* قائمة الإجراءات */}
              {showMenu === product.id && (
                <div className="absolute top-8 left-1 bg-white rounded-lg shadow-lg border z-20 py-1 min-w-[120px]">
                  <button
                    onClick={() => setSelectedProduct(product)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    <Eye size={12} /> عرض التفاصيل
                  </button>
                  <button
                    onClick={() => handleToggleVisibility(product.id, product.is_hidden)}
                    disabled={processing}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    {product.is_hidden ? <Eye size={12} /> : <EyeOff size={12} />}
                    {product.is_hidden ? 'إظهار' : 'إخفاء'}
                  </button>
                  <button
                    onClick={() => { setShowDeleteModal(product); setShowMenu(null); }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={12} /> حذف
                  </button>
                </div>
              )}

              <img 
                src={product.images?.[0] || 'https://via.placeholder.com/150'} 
                alt={product.name}
                className="w-full h-24 object-cover cursor-pointer"
                onClick={() => setSelectedProduct(product)}
              />
              <div className="p-2">
                <h3 className="font-bold text-[11px] text-gray-900 line-clamp-1">{product.name}</h3>
                <p className="text-[#FF6B00] font-bold text-xs">{formatPrice(product.price)}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-[9px] text-gray-400">المخزون: {product.stock}</p>
                  {product.seller_name && (
                    <p className="text-[9px] text-gray-400 truncate max-w-[60%]">{product.seller_name}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* نافذة تفاصيل المنتج */}
      {selectedProduct && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center"
          onClick={() => setSelectedProduct(null)}
        >
          <div 
            className="bg-white rounded-t-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
              <h3 className="font-bold text-base">تفاصيل المنتج</h3>
              <button onClick={() => setSelectedProduct(null)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              {/* الصورة */}
              <img 
                src={selectedProduct.images?.[0] || 'https://via.placeholder.com/300'} 
                alt={selectedProduct.name}
                className="w-full h-48 object-cover rounded-lg"
              />

              {/* الاسم والسعر */}
              <div>
                <h2 className="font-bold text-lg">{selectedProduct.name}</h2>
                <p className="text-[#FF6B00] font-bold text-xl">{formatPrice(selectedProduct.price)}</p>
              </div>

              {/* الحالة */}
              <div className="flex gap-2">
                {selectedProduct.is_hidden ? (
                  <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full flex items-center gap-1">
                    <EyeOff size={12} /> مخفي
                  </span>
                ) : (
                  <span className="text-xs px-2 py-1 bg-green-100 text-green-600 rounded-full flex items-center gap-1">
                    <CheckCircle size={12} /> مرئي
                  </span>
                )}
                {selectedProduct.stock < 10 && (
                  <span className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded-full">
                    مخزون منخفض: {selectedProduct.stock}
                  </span>
                )}
              </div>

              {/* أزرار الإجراءات */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleToggleVisibility(selectedProduct.id, selectedProduct.is_hidden)}
                  disabled={processing}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedProduct.is_hidden 
                      ? 'bg-green-50 text-green-600 hover:bg-green-100'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {selectedProduct.is_hidden ? <Eye size={16} /> : <EyeOff size={16} />}
                  {selectedProduct.is_hidden ? 'إظهار المنتج' : 'إخفاء المنتج'}
                </button>
                <button
                  onClick={() => setShowDeleteModal(selectedProduct)}
                  className="flex items-center justify-center gap-2 bg-red-50 text-red-600 py-2.5 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={16} />
                  حذف المنتج
                </button>
              </div>

              {/* المعلومات */}
              <div className="space-y-2">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">البائع</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Store size={14} className="text-gray-400" />
                    {selectedProduct.seller_name || 'غير محدد'}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">التصنيف</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Tag size={14} className="text-gray-400" />
                    {selectedProduct.category || 'غير محدد'}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500 mb-1">المخزون</p>
                  <p className="text-sm font-medium flex items-center gap-1">
                    <Layers size={14} className="text-gray-400" />
                    {selectedProduct.stock} قطعة
                  </p>
                </div>

                {selectedProduct.description && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">الوصف</p>
                    <p className="text-sm text-gray-700">{selectedProduct.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تأكيد الحذف */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold">حذف المنتج</h3>
                <p className="text-xs text-gray-500">هل أنت متأكد؟</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              سيتم حذف المنتج <span className="font-bold">"{showDeleteModal.name}"</span> نهائياً. هذا الإجراء لا يمكن التراجع عنه.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDelete(showDeleteModal.id)}
                disabled={processing}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? <RefreshCw size={16} className="animate-spin" /> : <Trash2 size={16} />}
                حذف نهائي
              </button>
            </div>
          </div>
        </div>
      )}

      {/* إغلاق القائمة عند النقر خارجها */}
      {showMenu && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setShowMenu(null)}
        />
      )}
    </section>
  );
};

export default ProductsTab;
