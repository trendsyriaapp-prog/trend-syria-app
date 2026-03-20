// /app/frontend/src/components/admin/PendingFoodItemsTab.js
// مكون إدارة الأطباق المعلقة للموافقة

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Check, X, UtensilsCrossed, RefreshCw, Store } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import RejectModal from './RejectModal';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const PendingFoodItemsTab = () => {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, approved: 0, total: 0 });
  const [rejectModal, setRejectModal] = useState({ isOpen: false, itemId: null, itemName: '' });
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingItems();
  }, []);

  const fetchPendingItems = async () => {
    try {
      setLoading(true);
      const [itemsRes, statsRes] = await Promise.all([
        axios.get(`${API}/admin/food-items/pending`),
        axios.get(`${API}/admin/food-items/stats`)
      ]);
      setItems(itemsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Error fetching pending food items:', error);
      toast({
        title: "خطأ",
        description: "فشل جلب الأطباق المعلقة",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (itemId) => {
    try {
      await axios.post(`${API}/admin/food-items/${itemId}/approve`);
      toast({
        title: "تمت الموافقة",
        description: "تم الموافقة على الطبق بنجاح"
      });
      fetchPendingItems();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشلت الموافقة",
        variant: "destructive"
      });
    }
  };

  const handleRejectClick = (itemId, itemName) => {
    setRejectModal({ isOpen: true, itemId, itemName });
  };

  const handleRejectConfirm = async (reason) => {
    setProcessing(true);
    try {
      await axios.post(`${API}/admin/food-items/${rejectModal.itemId}/reject`, { reason });
      toast({
        title: "تم الرفض",
        description: "تم رفض الطبق"
      });
      fetchPendingItems();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل الرفض",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
      setRejectModal({ isOpen: false, itemId: null, itemName: '' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }

  return (
    <section>
      {/* إحصائيات */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-amber-600">{stats.pending}</p>
          <p className="text-[10px] text-gray-600">معلق</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-green-600">{stats.approved}</p>
          <p className="text-[10px] text-gray-600">معتمد</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-blue-600">{stats.total}</p>
          <p className="text-[10px] text-gray-600">الإجمالي</p>
        </div>
      </div>

      {/* زر التحديث */}
      <div className="flex justify-end mb-3">
        <button
          onClick={fetchPendingItems}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#FF6B00]"
          data-testid="refresh-pending-items"
        >
          <RefreshCw size={14} />
          تحديث
        </button>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
          <Check size={36} className="text-green-500 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">لا يوجد أطباق في انتظار الموافقة</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="p-2 flex gap-2">
                {item.image ? (
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="w-14 h-14 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-14 h-14 bg-orange-100 rounded-lg flex items-center justify-center">
                    <UtensilsCrossed size={24} className="text-orange-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-xs text-gray-900 truncate">{item.name}</h3>
                  <p className="text-[10px] text-gray-500 line-clamp-1">{item.description || 'بدون وصف'}</p>
                  <p className="text-[#FF6B00] font-bold text-xs mt-0.5">{formatPrice(item.price)}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Store size={10} className="text-gray-400" />
                    <p className="text-[9px] text-gray-400 truncate">
                      {item.store_name || 'غير محدد'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleApprove(item.id)}
                    className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                    data-testid={`approve-food-item-${item.id}`}
                    title="موافقة"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => handleRejectClick(item.id, item.name)}
                    className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                    data-testid={`reject-food-item-${item.id}`}
                    title="رفض"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              {/* معلومات إضافية */}
              <div className="bg-gray-50 px-2 py-1 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[9px] text-gray-400">
                  الفئة: {item.category || 'غير محدد'}
                </span>
                <span className="text-[9px] text-gray-400">
                  وقت التحضير: {item.preparation_time || '15'} دقيقة
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      <RejectModal
        isOpen={rejectModal.isOpen}
        onClose={() => setRejectModal({ isOpen: false, itemId: null, itemName: '' })}
        onConfirm={handleRejectConfirm}
        title="رفض الطبق"
        itemName={rejectModal.itemName}
        processing={processing}
      />
    </section>
  );
};

export default PendingFoodItemsTab;
