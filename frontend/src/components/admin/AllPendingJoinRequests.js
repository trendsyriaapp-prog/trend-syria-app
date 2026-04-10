// /app/frontend/src/components/admin/AllPendingJoinRequests.js
// صفحة موحدة لجميع طلبات الانضمام (بائعين + سائقين + متاجر طعام)

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../../hooks/use-toast';
import { 
  Users, Store, Truck, UtensilsCrossed, Check, X, Eye, Phone, MapPin,
  Loader2, ChevronDown, ChevronUp, Calendar, Clock, AlertTriangle, CheckCircle, XCircle,
  Archive, Trash2, Image, ZoomIn
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// ============== مكون عرض صورة الوثيقة ==============
const DocumentImage = ({ src, label, onClick }) => {
  if (!src) {
    return (
      <div className="flex flex-col items-center p-2 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
        <div className="w-16 h-16 flex items-center justify-center bg-gray-200 rounded-lg">
          <Image size={24} className="text-gray-400" />
        </div>
        <span className="text-xs text-gray-500 mt-1 text-center">{label}</span>
        <span className="text-[10px] text-red-500">غير مرفق</span>
      </div>
    );
  }
  
  return (
    <div 
      className="flex flex-col items-center p-2 bg-green-50 rounded-lg border-2 border-green-200 cursor-pointer hover:border-green-400 transition-all"
      onClick={() => onClick(src, label)}
    >
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-white shadow-sm relative group">
        <img 
          src={src} 
          alt={label}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
        <div className="hidden w-full h-full items-center justify-center bg-gray-200">
          <Image size={20} className="text-gray-400" />
        </div>
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
          <ZoomIn size={20} className="text-white opacity-0 group-hover:opacity-100 transition-all" />
        </div>
      </div>
      <span className="text-xs text-green-700 mt-1 text-center font-medium">{label}</span>
      <span className="text-[10px] text-green-600">✓ مرفق</span>
    </div>
  );
};

// ============== مكون Modal لعرض الصورة بحجم كامل ==============
const ImageViewerModal = ({ image, label, onClose }) => {
  if (!image) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-black/90 flex items-center justify-center z-[100] p-4"
      onClick={onClose}
    >
      <div className="relative max-w-4xl max-h-[90vh] w-full">
        {/* زر الإغلاق */}
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-gray-300 flex items-center gap-2"
        >
          <X size={24} />
          <span>إغلاق</span>
        </button>
        
        {/* عنوان الصورة */}
        <div className="absolute -top-12 left-0 text-white font-bold">
          {label}
        </div>
        
        {/* الصورة */}
        <div 
          className="bg-white rounded-xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <img 
            src={image} 
            alt={label}
            className="w-full h-auto max-h-[85vh] object-contain"
          />
        </div>
      </div>
    </div>
  );
};

// دالة لحساب حالة وثائق السائق
const getDriverDocumentsStatus = (doc) => {
  const driver = doc.driver || doc;
  const requiredDocs = [
    { key: 'personal_photo', label: 'صورة شخصية', required: true },
    { key: 'id_photo', label: 'صورة الهوية / إخراج القيد', required: true },
    { key: 'motorcycle_license', label: 'رخصة القيادة', required: doc.requires_license !== false },
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

const AllPendingJoinRequests = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [pendingSellers, setPendingSellers] = useState([]);
  const [pendingDrivers, setPendingDrivers] = useState([]);
  const [pendingFoodStores, setPendingFoodStores] = useState([]);
  const [rejectedRequests, setRejectedRequests] = useState([]);
  const [activeSection, setActiveSection] = useState('all'); // all, sellers, drivers, food_stores, rejected
  const [expandedItem, setExpandedItem] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  
  // Modal الرفض
  const [rejectModal, setRejectModal] = useState(null); // {type: 'seller'|'driver'|'food_store', id: string, name: string}
  const [rejectReason, setRejectReason] = useState('');
  
  // Modal عرض الصورة
  const [viewImage, setViewImage] = useState(null); // {src: string, label: string}

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

  const handleApproveSeller = async (sellerId) => {
    setActionLoading(sellerId);
    try {
      await axios.post(`${API}/api/admin/sellers/${sellerId}/approve`);
      toast({ title: "تم", description: "تم تفعيل حساب البائع" });
      // إزالة من القائمة فوراً
      setPendingSellers(prev => prev.filter(item => (item.seller_id || item.seller?.id) !== sellerId));
      setExpandedItem(null);
    } catch (error) {
      toast({ title: "خطأ", description: "فشل التفعيل", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectSeller = async (sellerId, sellerName = '') => {
    // فتح Modal لإدخال سبب الرفض
    setRejectModal({ type: 'seller', id: sellerId, name: sellerName });
    setRejectReason('');
  };

  const handleApproveDriver = async (driverId) => {
    setActionLoading(driverId);
    try {
      await axios.post(`${API}/api/admin/delivery/${driverId}/approve`);
      toast({ title: "تم", description: "تم تفعيل حساب السائق" });
      // إزالة من القائمة فوراً
      setPendingDrivers(prev => prev.filter(item => (item.driver_id || item.delivery_id || item.driver?.id) !== driverId));
      setExpandedItem(null);
    } catch (error) {
      toast({ title: "خطأ", description: "فشل التفعيل", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectDriver = async (driverId, driverName = '') => {
    // فتح Modal لإدخال سبب الرفض
    setRejectModal({ type: 'driver', id: driverId, name: driverName });
    setRejectReason('');
  };

  const handleApproveFoodStore = async (storeId) => {
    setActionLoading(storeId);
    try {
      await axios.post(`${API}/api/admin/food/stores/${storeId}/approve`);
      toast({ title: "تم", description: "تم تفعيل متجر الطعام" });
      // إزالة من القائمة فوراً
      setPendingFoodStores(prev => prev.filter(item => item.id !== storeId));
      setExpandedItem(null);
    } catch (error) {
      toast({ title: "خطأ", description: "فشل التفعيل", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectFoodStore = async (storeId, storeName = '') => {
    // فتح Modal لإدخال سبب الرفض
    setRejectModal({ type: 'food_store', id: storeId, name: storeName });
    setRejectReason('');
  };

  // تنفيذ الرفض الفعلي بعد إدخال السبب
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
      
      // إزالة العنصر من الـ state مباشرة لتحديث UI فوري
      if (rejectModal.type === 'seller') {
        setPendingSellers(prev => prev.filter(item => (item.seller_id || item.seller?.id) !== rejectModal.id));
      } else if (rejectModal.type === 'driver') {
        setPendingDrivers(prev => prev.filter(item => (item.driver_id || item.delivery_id || item.driver?.id) !== rejectModal.id));
      } else if (rejectModal.type === 'food_store') {
        setPendingFoodStores(prev => prev.filter(item => item.id !== rejectModal.id));
      }
      
      setRejectModal(null);
      setRejectReason('');
      setExpandedItem(null); // إغلاق أي عنصر مفتوح
      
      // إضافة السجل للقائمة المرفوضة محلياً
      const newRejectedItem = {
        id: Date.now().toString(),
        type: rejectModal.type === 'driver' ? 'driver' : 'seller',
        name: rejectModal.name,
        reason: rejectReason,
        rejected_at: new Date().toISOString()
      };
      setRejectedRequests(prev => [newRejectedItem, ...prev]);
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "فشل الرفض";
      toast({ title: "خطأ", description: errorMsg, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  // حذف سجل مرفوض يدوياً
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

  // تنسيق التاريخ
  const formatDate = (dateStr) => {
    if (!dateStr) return 'غير محدد';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'اليوم';
    if (diffDays === 1) return 'أمس';
    if (diffDays < 7) return `منذ ${diffDays} أيام`;
    if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`;
    return date.toLocaleDateString('ar-SY');
  };

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
      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveSection('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            activeSection === 'all' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Users size={16} />
          الكل ({totalPending})
        </button>
        <button
          onClick={() => setActiveSection('sellers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            activeSection === 'sellers' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
          }`}
        >
          <Store size={16} />
          بائعين ({pendingSellers.length})
        </button>
        <button
          onClick={() => setActiveSection('drivers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            activeSection === 'drivers' ? 'bg-cyan-500 text-white' : 'bg-cyan-50 text-cyan-600 hover:bg-cyan-100'
          }`}
        >
          <Truck size={16} />
          سائقين ({pendingDrivers.length})
        </button>
        <button
          onClick={() => setActiveSection('food_stores')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            activeSection === 'food_stores' ? 'bg-green-500 text-white' : 'bg-green-50 text-green-600 hover:bg-green-100'
          }`}
        >
          <UtensilsCrossed size={16} />
          متاجر طعام ({pendingFoodStores.length})
        </button>
        <button
          onClick={() => setActiveSection('rejected')}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
            activeSection === 'rejected' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'
          }`}
        >
          <Archive size={16} />
          المرفوضة ({rejectedRequests.length})
        </button>
      </div>

      {/* Empty State */}
      {totalPending === 0 && activeSection !== 'rejected' && (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Users size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">لا توجد طلبات انضمام معلقة</p>
        </div>
      )}

      {/* Rejected Requests Section */}
      {activeSection === 'rejected' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between bg-red-50 px-3 py-2 rounded-lg">
            <h3 className="font-bold text-red-700 flex items-center gap-2">
              <Archive size={18} />
              سجل الطلبات المرفوضة ({rejectedRequests.length})
            </h3>
            <span className="text-xs text-red-500 bg-red-100 px-2 py-1 rounded-full">
              تُحذف تلقائياً بعد 30 يوم
            </span>
          </div>
          
          {rejectedRequests.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <Archive size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">لا توجد طلبات مرفوضة</p>
            </div>
          ) : (
            rejectedRequests.map((item) => (
              <div key={item.id} className="bg-white rounded-xl border border-red-200 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.type === 'driver' ? 'bg-cyan-100' : 'bg-amber-100'}`}>
                      {item.type === 'driver' ? (
                        <Truck size={20} className="text-cyan-600" />
                      ) : (
                        <Store size={20} className="text-amber-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800">{item.name || 'غير معروف'}</h4>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${item.type === 'driver' ? 'bg-cyan-100 text-cyan-700' : 'bg-amber-100 text-amber-700'}`}>
                          {item.type === 'driver' ? 'سائق' : 'بائع'}
                        </span>
                        <span>•</span>
                        <span>{formatDate(item.rejected_at)}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteRejected(item.id)}
                    disabled={actionLoading === item.id}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="حذف السجل"
                  >
                    {actionLoading === item.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                  </button>
                </div>
                
                {item.reason && (
                  <div className="mt-3 p-3 bg-red-50 rounded-lg">
                    <p className="text-sm text-red-700">
                      <span className="font-medium">سبب الرفض:</span> {item.reason}
                    </p>
                  </div>
                )}
                
                {item.phone && (
                  <div className="mt-2 text-sm text-gray-500 flex items-center gap-1">
                    <Phone size={14} />
                    {item.phone}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Sellers Section */}
      {data.sellers.length > 0 && activeSection !== 'rejected' && (
        <div className="space-y-3">
          <h3 className="font-bold text-amber-700 flex items-center gap-2 bg-amber-50 px-3 py-2 rounded-lg">
            <Store size={18} />
            بائعين منتجات ({data.sellers.length})
          </h3>
          {data.sellers.map((item) => {
            // البيانات تأتي من API كـ {seller_id, status, seller: {...}}
            const seller = item.seller || item;
            const sellerId = item.seller_id || seller.id;
            
            return (
            <div key={sellerId} className="bg-white rounded-xl border border-amber-200 overflow-hidden">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-amber-50/50"
                onClick={() => setExpandedItem(expandedItem === sellerId ? null : sellerId)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                    <Store size={24} className="text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">{seller.store_name || seller.name || seller.full_name || 'بدون اسم'}</h4>
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
                    {seller.store_address && <div className="col-span-2"><span className="text-gray-500">العنوان:</span> {typeof seller.store_address === 'object' ? [seller.store_address?.area, seller.store_address?.street, seller.store_address?.building].filter(Boolean).join(', ') : seller.store_address}</div>}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleApproveSeller(sellerId)}
                      disabled={actionLoading === sellerId}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                    >
                      {actionLoading === sellerId ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      قبول
                    </button>
                    <button
                      onClick={() => handleRejectSeller(sellerId, seller.store_name || seller.name || seller.full_name)}
                      disabled={actionLoading === sellerId}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                    >
                      <X size={16} />
                      رفض
                    </button>
                  </div>
                </div>
              )}
            </div>
          )})}
        </div>
      )}

      {/* Drivers Section */}
      {data.drivers.length > 0 && activeSection !== 'rejected' && (
        <div className="space-y-3">
          <h3 className="font-bold text-cyan-700 flex items-center gap-2 bg-cyan-50 px-3 py-2 rounded-lg">
            <Truck size={18} />
            موظفي التوصيل ({data.drivers.length})
          </h3>
          {data.drivers.map((item) => {
            const driver = item.driver || item;
            const driverId = item.driver_id || item.delivery_id || driver.id;
            const docStatus = getDriverDocumentsStatus(item);
            
            return (
              <div key={driverId} className={`bg-white rounded-xl border-2 overflow-hidden ${docStatus.isComplete ? 'border-green-200' : 'border-yellow-200'}`}>
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
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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
                          src={item.motorcycle_license || driver.motorcycle_license} 
                          label="رخصة القيادة"
                          onClick={(src, label) => setViewImage({ src, label })}
                        />
                        <DocumentImage 
                          src={item.vehicle_photo || driver.vehicle_photo} 
                          label="صورة المركبة"
                          onClick={(src, label) => setViewImage({ src, label })}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 py-3 text-sm border-t">
                      <div><span className="text-gray-500">المدينة:</span> {driver.city}</div>
                      <div><span className="text-gray-500">الهاتف:</span> {driver.phone}</div>
                      <div><span className="text-gray-500">نوع المركبة:</span> {item.vehicle_type_name || item.vehicle_type || 'غير محدد'}</div>
                      <div><span className="text-gray-500">رقم الهوية:</span> {item.national_id || 'غير محدد'}</div>
                    </div>
                    
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleApproveDriver(driverId)}
                        disabled={actionLoading === driverId || !docStatus.isComplete}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 text-white rounded-lg disabled:opacity-50 ${docStatus.isComplete ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400 cursor-not-allowed'}`}
                        title={!docStatus.isComplete ? `الوثائق غير مكتملة: ${docStatus.missingRequired.join('، ')}` : 'قبول السائق'}
                      >
                        {actionLoading === driverId ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                        {docStatus.isComplete ? 'قبول' : 'وثائق ناقصة'}
                      </button>
                      <button
                        onClick={() => handleRejectDriver(driverId, driver.name || driver.full_name)}
                        disabled={actionLoading === driverId}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                        data-testid={`reject-driver-btn-${driverId}`}
                      >
                        <X size={16} />
                        رفض
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Food Stores Section */}
      {data.foodStores.length > 0 && activeSection !== 'rejected' && (
        <div className="space-y-3">
          <h3 className="font-bold text-green-700 flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
            <UtensilsCrossed size={18} />
            متاجر الطعام ({data.foodStores.length})
          </h3>
          {data.foodStores.map((store) => (
            <div key={store.id} className="bg-white rounded-xl border border-green-200 overflow-hidden">
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
                    {store.cuisine_type && <div><span className="text-gray-500">نوع المطبخ:</span> {store.cuisine_type}</div>}
                    {store.address && <div className="col-span-2"><span className="text-gray-500">العنوان:</span> {typeof store.address === 'object' ? [store.address?.area, store.address?.street, store.address?.building].filter(Boolean).join(', ') : store.address}</div>}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleApproveFoodStore(store.id)}
                      disabled={actionLoading === store.id}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                    >
                      {actionLoading === store.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      قبول
                    </button>
                    <button
                      onClick={() => handleRejectFoodStore(store.id, store.name)}
                      disabled={actionLoading === store.id}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                    >
                      <X size={16} />
                      رفض
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal سبب الرفض */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">رفض الطلب</h3>
            <p className="text-gray-600 mb-4">
              أنت على وشك رفض طلب <strong>{rejectModal.name || 'هذا الطلب'}</strong>
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                سبب الرفض <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="اكتب سبب الرفض هنا..."
                className="w-full p-3 border border-gray-300 rounded-xl resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows={3}
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason('');
                }}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
              >
                إلغاء
              </button>
              <button
                onClick={executeReject}
                disabled={actionLoading === rejectModal.id || !rejectReason.trim()}
                className="flex-1 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading === rejectModal.id ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <XCircle size={18} />
                )}
                تأكيد الرفض
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal عرض الصورة بحجم كامل */}
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
