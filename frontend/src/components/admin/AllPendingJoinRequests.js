// /app/frontend/src/components/admin/AllPendingJoinRequests.js
// صفحة موحدة لجميع طلبات الانضمام (بائعين + سائقين + متاجر طعام)

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useToast } from '../../hooks/use-toast';
import { 
  Users, Store, Truck, UtensilsCrossed, Check, X, Eye, Phone, MapPin,
  Loader2, ChevronDown, ChevronUp, Calendar, Clock, AlertTriangle, CheckCircle, XCircle
} from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL;

// دالة لحساب حالة وثائق السائق
const getDriverDocumentsStatus = (doc) => {
  const driver = doc.driver || doc;
  const requiredDocs = [
    { key: 'personal_photo', label: 'صورة شخصية', required: true },
    { key: 'id_photo', label: 'صورة الهوية', required: true },
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
  const [activeSection, setActiveSection] = useState('all'); // all, sellers, drivers, food_stores
  const [expandedItem, setExpandedItem] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    fetchAllPending();
  }, []);

  const fetchAllPending = async () => {
    setLoading(true);
    try {
      const [sellersRes, driversRes, foodStoresRes] = await Promise.all([
        axios.get(`${API}/api/admin/sellers/pending`),
        axios.get(`${API}/api/admin/delivery/pending`),
        axios.get(`${API}/api/admin/food/stores?status=pending`)
      ]);
      setPendingSellers(sellersRes.data || []);
      setPendingDrivers(driversRes.data || []);
      setPendingFoodStores(foodStoresRes.data || []);
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
      fetchAllPending();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل التفعيل", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectSeller = async (sellerId) => {
    setActionLoading(sellerId);
    try {
      await axios.post(`${API}/api/admin/sellers/${sellerId}/reject`);
      toast({ title: "تم", description: "تم رفض طلب البائع" });
      fetchAllPending();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل الرفض", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveDriver = async (driverId) => {
    setActionLoading(driverId);
    try {
      await axios.post(`${API}/api/admin/delivery/${driverId}/approve`);
      toast({ title: "تم", description: "تم تفعيل حساب السائق" });
      fetchAllPending();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل التفعيل", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectDriver = async (driverId) => {
    if (!driverId) {
      toast({ title: "خطأ", description: "معرّف السائق غير موجود", variant: "destructive" });
      return;
    }
    
    setActionLoading(driverId);
    try {
      const response = await axios.post(`${API}/api/admin/delivery/${driverId}/reject`);
      toast({ title: "تم", description: "تم رفض طلب السائق" });
      fetchAllPending();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "فشل الرفض";
      toast({ title: "خطأ", description: errorMsg, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleApproveFoodStore = async (storeId) => {
    setActionLoading(storeId);
    try {
      await axios.post(`${API}/api/admin/food/stores/${storeId}/approve`);
      toast({ title: "تم", description: "تم تفعيل متجر الطعام" });
      fetchAllPending();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل التفعيل", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectFoodStore = async (storeId) => {
    setActionLoading(storeId);
    try {
      await axios.post(`${API}/api/admin/food/stores/${storeId}/reject`);
      toast({ title: "تم", description: "تم رفض متجر الطعام" });
      fetchAllPending();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل الرفض", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
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
      </div>

      {/* Empty State */}
      {totalPending === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Users size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">لا توجد طلبات انضمام معلقة</p>
        </div>
      )}

      {/* Sellers Section */}
      {data.sellers.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-amber-700 flex items-center gap-2 bg-amber-50 px-3 py-2 rounded-lg">
            <Store size={18} />
            بائعين منتجات ({data.sellers.length})
          </h3>
          {data.sellers.map((seller) => (
            <div key={seller.id} className="bg-white rounded-xl border border-amber-200 overflow-hidden">
              <div 
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-amber-50/50"
                onClick={() => setExpandedItem(expandedItem === seller.id ? null : seller.id)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                    <Store size={24} className="text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">{seller.store_name || seller.name}</h4>
                    <p className="text-sm text-gray-500">{seller.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {expandedItem === seller.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>
              </div>
              
              {expandedItem === seller.id && (
                <div className="px-4 pb-4 border-t bg-gray-50">
                  <div className="grid grid-cols-2 gap-3 py-3 text-sm">
                    <div><span className="text-gray-500">المدينة:</span> {seller.city}</div>
                    <div><span className="text-gray-500">الهاتف:</span> {seller.phone}</div>
                    {seller.store_address && <div className="col-span-2"><span className="text-gray-500">العنوان:</span> {typeof seller.store_address === 'object' ? [seller.store_address?.area, seller.store_address?.street, seller.store_address?.building].filter(Boolean).join(', ') : seller.store_address}</div>}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleApproveSeller(seller.id)}
                      disabled={actionLoading === seller.id}
                      className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                    >
                      {actionLoading === seller.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                      قبول
                    </button>
                    <button
                      onClick={() => handleRejectSeller(seller.id)}
                      disabled={actionLoading === seller.id}
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

      {/* Drivers Section */}
      {data.drivers.length > 0 && (
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
                    
                    {/* Documents status grid */}
                    <div className="grid grid-cols-3 gap-2 py-3">
                      {docStatus.docs.map((d, idx) => (
                        <div key={idx} className={`p-2 rounded-lg text-center text-xs ${d.uploaded ? 'bg-green-50 border border-green-200' : (d.required ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200')}`}>
                          <div className="flex items-center justify-center gap-1 mb-1">
                            {d.uploaded ? (
                              <CheckCircle size={14} className="text-green-500" />
                            ) : d.required ? (
                              <XCircle size={14} className="text-red-500" />
                            ) : null}
                            <span className={d.uploaded ? 'text-green-700' : (d.required ? 'text-red-700' : 'text-gray-500')}>
                              {d.label}
                            </span>
                          </div>
                          <span className="text-[10px]">
                            {d.uploaded ? '✓ مرفوع' : (d.required ? '✗ مطلوب' : 'اختياري')}
                          </span>
                        </div>
                      ))}
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
                        onClick={() => handleRejectDriver(driverId)}
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
      {data.foodStores.length > 0 && (
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
                  <div className="grid grid-cols-2 gap-3 py-3 text-sm">
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
                      onClick={() => handleRejectFoodStore(store.id)}
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
    </div>
  );
};

export default AllPendingJoinRequests;
