// /app/frontend/src/components/admin/AllPendingJoinRequests.js
// صفحة موحدة لجميع طلبات الانضمام (بائعين + سائقين + متاجر طعام)
// تم تقسيمها وتحسينها

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../../hooks/use-toast';
import { Users, Store, Truck, Loader2 } from 'lucide-react';

// المكونات المستخرجة
import {
  ImageViewerModal,
  RejectRequestModal,
  SellerRequestCard,
  DriverRequestCard,
  FoodStoreRequestCard,
  RejectedRequestsList,
  FilterTabs
} from './join-requests';

const API = process.env.REACT_APP_BACKEND_URL;

const AllPendingJoinRequests = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pendingSellers, setPendingSellers] = useState([]);
  const [pendingDrivers, setPendingDrivers] = useState([]);
  const [pendingFoodStores, setPendingFoodStores] = useState([]);
  const [rejectedRequests, setRejectedRequests] = useState([]);
  const [activeSection, setActiveSection] = useState('all');
  const [expandedItem, setExpandedItem] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  
  // Modal الرفض
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  
  // Modal عرض الصورة
  const [viewImage, setViewImage] = useState(null);

  useEffect(() => {
    fetchAllPending();
  }, []);

  const fetchAllPending = async () => {
    setLoading(true);
    try {
      const [sellersRes, driversRes, foodStoresRes, rejectedRes] = await Promise.all([
        axios.get(`${API}/api/admin/sellers/pending`),
        axios.get(`${API}/api/admin/delivery/pending`),
        axios.get(`${API}/api/admin/food/stores?status=pending`),
        axios.get(`${API}/api/admin/rejected-requests`)
      ]);
      setPendingSellers(sellersRes.data || []);
      setPendingDrivers(driversRes.data || []);
      setPendingFoodStores(foodStoresRes.data || []);
      setRejectedRequests(rejectedRes.data?.requests || []);
    } catch (error) {
      toast({ title: "خطأ", description: "فشل في جلب البيانات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ============== دوال البائعين ==============
  const handleApproveSeller = async (sellerId) => {
    setActionLoading(sellerId);
    try {
      await axios.post(`${API}/api/admin/sellers/${sellerId}/approve`);
      toast({ title: "تم", description: "تم تفعيل حساب البائع" });
      setPendingSellers(prev => prev.filter(item => (item.seller_id || item.seller?.id) !== sellerId));
      setExpandedItem(null);
    } catch (error) {
      toast({ title: "خطأ", description: "فشل التفعيل", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectSeller = (sellerId, sellerName = '') => {
    setRejectModal({ type: 'seller', id: sellerId, name: sellerName });
    setRejectReason('');
  };

  const handleDeleteSeller = async (sellerId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الطلب نهائياً؟')) return;
    
    setActionLoading(sellerId);
    try {
      await axios.delete(`${API}/api/admin/sellers/pending/${sellerId}`);
      toast({ title: "تم", description: "تم حذف طلب الانضمام نهائياً" });
      setPendingSellers(prev => prev.filter(item => (item.seller_id || item.seller?.id) !== sellerId));
      setExpandedItem(null);
    } catch (error) {
      toast({ title: "خطأ", description: "فشل الحذف", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  // ============== دوال السائقين ==============
  const handleApproveDriver = async (driverId) => {
    setActionLoading(driverId);
    try {
      await axios.post(`${API}/api/admin/delivery/${driverId}/approve`);
      toast({ title: "تم", description: "تم تفعيل حساب السائق" });
      setPendingDrivers(prev => prev.filter(item => (item.driver_id || item.delivery_id || item.driver?.id) !== driverId));
      setExpandedItem(null);
    } catch (error) {
      toast({ title: "خطأ", description: "فشل التفعيل", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectDriver = (driverId, driverName = '') => {
    setRejectModal({ type: 'driver', id: driverId, name: driverName });
    setRejectReason('');
  };

  const handleDeleteDriver = async (driverId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الطلب نهائياً؟')) return;
    
    setActionLoading(driverId);
    try {
      await axios.delete(`${API}/api/admin/delivery/pending/${driverId}`);
      toast({ title: "تم", description: "تم حذف طلب الانضمام نهائياً" });
      setPendingDrivers(prev => prev.filter(item => (item.driver_id || item.delivery_id || item.driver?.id) !== driverId));
      setExpandedItem(null);
    } catch (error) {
      toast({ title: "خطأ", description: "فشل الحذف", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  // ============== دوال متاجر الطعام ==============
  const handleApproveFoodStore = async (storeId) => {
    setActionLoading(storeId);
    try {
      await axios.post(`${API}/api/admin/food/stores/${storeId}/approve`);
      toast({ title: "تم", description: "تم تفعيل متجر الطعام" });
      setPendingFoodStores(prev => prev.filter(item => item.id !== storeId));
      setExpandedItem(null);
    } catch (error) {
      toast({ title: "خطأ", description: "فشل التفعيل", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectFoodStore = (storeId, storeName = '') => {
    setRejectModal({ type: 'food_store', id: storeId, name: storeName });
    setRejectReason('');
  };

  const handleDeleteFoodStore = async (storeId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الطلب نهائياً؟')) return;
    
    setActionLoading(storeId);
    try {
      await axios.delete(`${API}/api/admin/food/stores/pending/${storeId}`);
      toast({ title: "تم", description: "تم حذف طلب المتجر نهائياً" });
      setPendingFoodStores(prev => prev.filter(item => item.id !== storeId));
      setExpandedItem(null);
    } catch (error) {
      toast({ title: "خطأ", description: "فشل الحذف", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  // ============== تنفيذ الرفض ==============
  const executeReject = async () => {
    if (!rejectModal) return;
    if (!rejectReason.trim()) {
      toast({ title: "خطأ", description: "يرجى إدخال سبب الرفض", variant: "destructive" });
      return;
    }
    
    setActionLoading(rejectModal.id);
    try {
      let endpoint = '';
      let successMsg = '';
      
      if (rejectModal.type === 'seller') {
        endpoint = `/api/admin/sellers/${rejectModal.id}/reject`;
        successMsg = 'تم رفض طلب البائع';
      } else if (rejectModal.type === 'driver') {
        endpoint = `/api/admin/delivery/${rejectModal.id}/reject`;
        successMsg = 'تم رفض طلب السائق';
      } else if (rejectModal.type === 'food_store') {
        endpoint = `/api/admin/food/stores/${rejectModal.id}/reject`;
        successMsg = 'تم رفض متجر الطعام';
      }
      
      await axios.post(`${API}${endpoint}`, { reason: rejectReason });
      toast({ title: "تم", description: successMsg });
      
      // إزالة العنصر من الـ state
      if (rejectModal.type === 'seller') {
        setPendingSellers(prev => prev.filter(item => (item.seller_id || item.seller?.id) !== rejectModal.id));
      } else if (rejectModal.type === 'driver') {
        setPendingDrivers(prev => prev.filter(item => (item.driver_id || item.delivery_id || item.driver?.id) !== rejectModal.id));
      } else if (rejectModal.type === 'food_store') {
        setPendingFoodStores(prev => prev.filter(item => item.id !== rejectModal.id));
      }
      
      // إضافة للقائمة المرفوضة محلياً
      const newRejectedItem = {
        id: Date.now().toString(),
        type: rejectModal.type === 'driver' ? 'driver' : 'seller',
        name: rejectModal.name,
        reason: rejectReason,
        rejected_at: new Date().toISOString()
      };
      setRejectedRequests(prev => [newRejectedItem, ...prev]);
      
      setRejectModal(null);
      setRejectReason('');
      setExpandedItem(null);
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "فشل الرفض";
      toast({ title: "خطأ", description: errorMsg, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  // ============== حذف سجل مرفوض ==============
  const handleDeleteRejected = async (requestId) => {
    setActionLoading(requestId);
    try {
      await axios.delete(`${API}/api/admin/rejected-requests/${requestId}`);
      toast({ title: "تم", description: "تم حذف السجل" });
      setRejectedRequests(prev => prev.filter(item => item.id !== requestId));
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حذف السجل", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  // ============== فلترة البيانات ==============
  const totalPending = pendingSellers.length + pendingDrivers.length + pendingFoodStores.length;

  const filteredData = () => {
    switch (activeSection) {
      case 'sellers': return { sellers: pendingSellers, drivers: [], foodStores: [] };
      case 'drivers': return { sellers: [], drivers: pendingDrivers, foodStores: [] };
      case 'food_stores': return { sellers: [], drivers: [], foodStores: pendingFoodStores };
      default: return { sellers: pendingSellers, drivers: pendingDrivers, foodStores: pendingFoodStores };
    }
  };

  const data = filteredData();

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="animate-spin text-orange-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* تبويبات الفلترة */}
      <FilterTabs
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        pendingSellers={pendingSellers}
        pendingDrivers={pendingDrivers}
        pendingFoodStores={pendingFoodStores}
        rejectedRequests={rejectedRequests}
      />

      {/* حالة فارغة */}
      {totalPending === 0 && activeSection !== 'rejected' && (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Users size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">لا توجد طلبات انضمام معلقة</p>
        </div>
      )}

      {/* قسم الطلبات المرفوضة */}
      {activeSection === 'rejected' && (
        <RejectedRequestsList
          rejectedRequests={rejectedRequests}
          actionLoading={actionLoading}
          onDelete={handleDeleteRejected}
        />
      )}

      {/* قسم البائعين */}
      {data.sellers.length > 0 && activeSection !== 'rejected' && (
        <div className="space-y-3">
          <h3 className="font-bold text-amber-700 flex items-center gap-2 bg-amber-50 px-3 py-2 rounded-lg">
            <Store size={18} />
            بائعين منتجات ({data.sellers.length})
          </h3>
          {data.sellers.map((item) => (
            <SellerRequestCard
              key={item.seller_id || item.seller?.id || item.id}
              item={item}
              expandedItem={expandedItem}
              setExpandedItem={setExpandedItem}
              actionLoading={actionLoading}
              onApprove={handleApproveSeller}
              onReject={handleRejectSeller}
              onDelete={handleDeleteSeller}
              setViewImage={setViewImage}
            />
          ))}
        </div>
      )}

      {/* قسم السائقين */}
      {data.drivers.length > 0 && activeSection !== 'rejected' && (
        <div className="space-y-3">
          <h3 className="font-bold text-cyan-700 flex items-center gap-2 bg-cyan-50 px-3 py-2 rounded-lg">
            <Truck size={18} />
            موظفي التوصيل ({data.drivers.length})
          </h3>
          {data.drivers.map((item) => (
            <DriverRequestCard
              key={item.driver_id || item.delivery_id || item.driver?.id || item.id}
              item={item}
              expandedItem={expandedItem}
              setExpandedItem={setExpandedItem}
              actionLoading={actionLoading}
              onApprove={handleApproveDriver}
              onReject={handleRejectDriver}
              onDelete={handleDeleteDriver}
              setViewImage={setViewImage}
            />
          ))}
        </div>
      )}

      {/* قسم متاجر الطعام */}
      {data.foodStores.length > 0 && activeSection !== 'rejected' && (
        <div className="space-y-3">
          <h3 className="font-bold text-green-700 flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
            <Store size={18} />
            متاجر الطعام ({data.foodStores.length})
          </h3>
          {data.foodStores.map((store) => (
            <FoodStoreRequestCard
              key={store.id}
              store={store}
              expandedItem={expandedItem}
              setExpandedItem={setExpandedItem}
              actionLoading={actionLoading}
              onApprove={handleApproveFoodStore}
              onReject={handleRejectFoodStore}
              onDelete={handleDeleteFoodStore}
              setViewImage={setViewImage}
            />
          ))}
        </div>
      )}

      {/* Modal سبب الرفض */}
      <RejectRequestModal
        rejectModal={rejectModal}
        rejectReason={rejectReason}
        setRejectReason={setRejectReason}
        setRejectModal={setRejectModal}
        executeReject={executeReject}
        actionLoading={actionLoading}
      />

      {/* Modal عرض الصورة */}
      {viewImage && (
        <ImageViewerModal 
          image={viewImage.src} 
          label={viewImage.label} 
          onClose={() => setViewImage(null)} 
        />
      )}
    </div>
  );
};

export default AllPendingJoinRequests;
