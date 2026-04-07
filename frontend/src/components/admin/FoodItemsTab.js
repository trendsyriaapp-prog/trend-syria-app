// /app/frontend/src/components/admin/FoodItemsTab.js
import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  UtensilsCrossed, Trash2, X, MoreVertical,
  Store, Tag, CheckCircle, XCircle, RefreshCw
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const FoodItemsTab = ({ allFoodItems = [], onRefresh }) => {
  const { toast } = useToast();
  const [selectedItem, setSelectedItem] = useState(null);
  const [showMenu, setShowMenu] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showDeleteModal, setShowDeleteModal] = useState(null);

  // منع التمرير في الخلفية عند فتح المربع
  useEffect(() => {
    if (selectedItem || showDeleteModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedItem, showDeleteModal]);

  const filteredItems = filter === 'all' 
    ? allFoodItems 
    : filter === 'approved' 
      ? allFoodItems.filter(item => item.is_approved)
      : filter === 'pending'
        ? allFoodItems.filter(item => !item.is_approved)
        : filter === 'unavailable'
          ? allFoodItems.filter(item => !item.is_available)
          : allFoodItems;

  // حذف الصنف
  const handleDelete = async (itemId) => {
    setProcessing(true);
    try {
      await axios.delete(`${API}/api/admin/food-items/${itemId}`);
      toast({ title: "تم الحذف", description: "تم حذف الصنف بنجاح" });
      setShowDeleteModal(null);
      setSelectedItem(null);
      if (onRefresh) onRefresh();
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || "فشل في حذف الصنف", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <section>
      {/* فلاتر */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-sm text-gray-600">عرض:</span>
        {[
          { key: 'all', label: 'الكل', count: allFoodItems.length },
          { key: 'approved', label: 'معتمد', count: allFoodItems.filter(i => i.is_approved).length },
          { key: 'pending', label: 'معلق', count: allFoodItems.filter(i => !i.is_approved).length },
          { key: 'unavailable', label: 'غير متوفر', count: allFoodItems.filter(i => !i.is_available).length },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === f.key 
                ? 'bg-[#FF6B00] text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* قائمة الأصناف */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <UtensilsCrossed size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">لا توجد أصناف طعام</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* صورة الصنف */}
              <div 
                className="relative h-32 bg-gray-100 cursor-pointer"
                onClick={() => setSelectedItem(item)}
              >
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = '/placeholder.svg'; }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UtensilsCrossed size={32} className="text-gray-300" />
                  </div>
                )}
                
                {/* شارات الحالة */}
                <div className="absolute top-2 right-2 flex flex-col gap-1">
                  {item.is_approved ? (
                    <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle size={10} /> معتمد
                    </span>
                  ) : (
                    <span className="bg-yellow-500 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                      <XCircle size={10} /> معلق
                    </span>
                  )}
                  {!item.is_available && (
                    <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                      غير متوفر
                    </span>
                  )}
                </div>

                {/* زر القائمة */}
                <button
                  onClick={(e) => { e.stopPropagation(); setShowMenu(showMenu === item.id ? null : item.id); }}
                  className="absolute top-2 left-2 p-1.5 bg-white/90 rounded-full hover:bg-white shadow"
                >
                  <MoreVertical size={16} />
                </button>

                {/* قائمة الخيارات */}
                {showMenu === item.id && (
                  <div className="absolute top-10 left-2 bg-white rounded-lg shadow-lg border py-1 z-10 min-w-[120px]">
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowDeleteModal(item); setShowMenu(null); }}
                      className="w-full px-3 py-2 text-right text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 size={14} />
                      حذف
                    </button>
                  </div>
                )}
              </div>

              {/* معلومات الصنف */}
              <div className="p-3">
                <h3 className="font-bold text-gray-900 mb-1 truncate">{item.name}</h3>
                <p className="text-sm text-gray-500 mb-2 line-clamp-1">{item.description || 'بدون وصف'}</p>
                
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#FF6B00]">{formatPrice(item.price)}</span>
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Store size={12} />
                    {item.store_name || 'غير معروف'}
                  </span>
                </div>
                
                {item.category && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                    <Tag size={12} />
                    {item.category}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* مربع حوار التفاصيل */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setSelectedItem(null)}>
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="relative">
              {selectedItem.image ? (
                <img src={selectedItem.image} alt={selectedItem.name} className="w-full h-48 object-cover" />
              ) : (
                <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                  <UtensilsCrossed size={48} className="text-gray-300" />
                </div>
              )}
              <button 
                onClick={() => setSelectedItem(null)}
                className="absolute top-2 right-2 p-2 bg-white rounded-full shadow"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4">
              <h2 className="text-xl font-bold mb-2">{selectedItem.name}</h2>
              <p className="text-gray-600 mb-4">{selectedItem.description || 'بدون وصف'}</p>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">السعر:</span>
                  <span className="font-bold text-[#FF6B00]">{formatPrice(selectedItem.price)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">المتجر:</span>
                  <span>{selectedItem.store_name || 'غير معروف'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">التصنيف:</span>
                  <span>{selectedItem.category || 'غير محدد'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">الحالة:</span>
                  <span className={selectedItem.is_approved ? 'text-green-600' : 'text-yellow-600'}>
                    {selectedItem.is_approved ? 'معتمد' : 'معلق'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">التوفر:</span>
                  <span className={selectedItem.is_available ? 'text-green-600' : 'text-red-600'}>
                    {selectedItem.is_available ? 'متوفر' : 'غير متوفر'}
                  </span>
                </div>
              </div>
              
              <button
                onClick={() => { setShowDeleteModal(selectedItem); setSelectedItem(null); }}
                className="w-full mt-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                حذف الصنف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مربع تأكيد الحذف */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-2">تأكيد الحذف</h3>
            <p className="text-gray-600 mb-4">
              هل أنت متأكد من حذف "{showDeleteModal.name}"؟
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(null)}
                className="flex-1 py-2 border border-gray-200 rounded-lg font-medium hover:bg-gray-50"
                disabled={processing}
              >
                إلغاء
              </button>
              <button
                onClick={() => handleDelete(showDeleteModal.id)}
                disabled={processing}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? <RefreshCw size={18} className="animate-spin" /> : <Trash2 size={18} />}
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default FoodItemsTab;
