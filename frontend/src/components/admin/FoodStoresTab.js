// /app/frontend/src/components/admin/FoodStoresTab.js
// إدارة متاجر الطعام - لوحة المدير

import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Store, UtensilsCrossed, ShoppingBasket, Apple, Check, X, 
  Clock, MapPin, Phone, ChevronDown, Percent, Save
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import RejectModal from './RejectModal';
import ImageLightbox from '../ui/ImageLightbox';

const API = process.env.REACT_APP_BACKEND_URL;

const STORE_TYPES = {
  restaurants: { name: 'مطاعم', icon: UtensilsCrossed, color: 'bg-red-500' },
  groceries: { name: 'مواد غذائية', icon: ShoppingBasket, color: 'bg-blue-500' },
  vegetables: { name: 'خضروات وفواكه', icon: Apple, color: 'bg-green-500' }
};

const FoodStoresTab = ({ pendingOnly = false, pendingFoodStores = [], onRefresh }) => {
  const { toast } = useToast();
  const [stores, setStores] = useState([]);
  const [stats, setStats] = useState(null);
  const [commissions, setCommissions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(pendingOnly ? 'pending' : 'all'); // all, pending, approved
  const [typeFilter, setTypeFilter] = useState('all');
  const [showCommissionsModal, setShowCommissionsModal] = useState(false);
  const [editingCommissions, setEditingCommissions] = useState({});
  const [rejectModal, setRejectModal] = useState({ isOpen: false, storeId: null, storeName: '' });
  const [rejectProcessing, setRejectProcessing] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    // إذا كان pendingOnly، استخدم البيانات الممررة
    if (pendingOnly && pendingFoodStores.length > 0) {
      setStores(pendingFoodStores);
      setLoading(false);
    } else if (!pendingOnly) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [filter, typeFilter, pendingOnly]);

  const fetchData = async () => {
    console.log('FoodStoresTab: fetchData started');
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'all') params.status = filter;
      if (typeFilter !== 'all') params.store_type = typeFilter;

      console.log('FoodStoresTab: Fetching data with params:', params);
      
      // جلب البيانات مع معالجة الأخطاء لكل طلب
      const [storesRes, statsRes, commissionsRes] = await Promise.all([
        axios.get(`${API}/api/admin/food/stores`, { params }).catch(e => {
          console.error('FoodStoresTab: Error fetching stores:', e);
          return { data: [] };
        }),
        axios.get(`${API}/api/admin/food/stats`).catch(e => {
          console.error('FoodStoresTab: Error fetching stats:', e);
          return { data: null };
        }),
        axios.get(`${API}/api/admin/food/commissions`).catch(e => {
          console.error('FoodStoresTab: Error fetching commissions:', e);
          return { data: null };
        })
      ]);

      console.log('FoodStoresTab: Data fetched successfully', {
        stores: storesRes.data?.length || 0,
        stats: statsRes.data,
        commissions: commissionsRes.data
      });

      setStores(storesRes.data || []);
      setStats(statsRes.data);
      setCommissions(commissionsRes.data);
      setEditingCommissions(commissionsRes.data?.commissions || {});
    } catch (error) {
      console.error('FoodStoresTab: Error in fetchData:', error);
      // في حالة الخطأ، نضع قيم فارغة
      setStores([]);
      setStats(null);
      setCommissions(null);
    } finally {
      console.log('FoodStoresTab: fetchData finished, setting loading to false');
      setLoading(false);
    }
  };

  const handleApprove = async (storeId) => {
    try {
      await axios.post(`${API}/api/admin/food/stores/${storeId}/approve`);
      toast({ title: "تمت الموافقة", description: "تم قبول المتجر بنجاح" });
      fetchData();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل في الموافقة على المتجر", variant: "destructive" });
    }
  };

  const handleReject = async (storeId, storeName) => {
    setRejectModal({ isOpen: true, storeId, storeName });
  };

  const handleRejectConfirm = async (reason) => {
    setRejectProcessing(true);
    try {
      await axios.post(`${API}/api/admin/food/stores/${rejectModal.storeId}/reject`, { reason });
      toast({ title: "تم الرفض", description: "تم رفض المتجر" });
      fetchData();
      if (onRefresh) onRefresh();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل في رفض المتجر", variant: "destructive" });
    } finally {
      setRejectProcessing(false);
      setRejectModal({ isOpen: false, storeId: null, storeName: '' });
    }
  };

  const handleSaveCommissions = async () => {
    try {
      await axios.put(`${API}/api/admin/food/commissions`, editingCommissions);
      toast({ title: "تم الحفظ", description: "تم تحديث العمولات بنجاح" });
      setShowCommissionsModal(false);
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل في حفظ العمولات", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Store size={18} className="text-green-600" />
            <span className="text-sm text-gray-600">إجمالي المتاجر</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.total_stores || 0}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Check size={18} className="text-blue-600" />
            <span className="text-sm text-gray-600">متاجر نشطة</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.active_stores || 0}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={18} className="text-yellow-600" />
            <span className="text-sm text-gray-600">بانتظار الموافقة</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.pending_stores || 0}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <ShoppingBasket size={18} className="text-purple-600" />
            <span className="text-sm text-gray-600">المنتجات</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.total_products || 0}</p>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">كل المتاجر</option>
            <option value="pending">بانتظار الموافقة</option>
            <option value="approved">معتمدة</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="all">كل الأنواع</option>
            <option value="restaurants">مطاعم</option>
            <option value="groceries">مواد غذائية</option>
            <option value="vegetables">خضروات وفواكه</option>
          </select>
        </div>
        
        <button
          onClick={() => setShowCommissionsModal(true)}
          className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
        >
          <Percent size={16} />
          إدارة العمولات
        </button>
      </div>

      {/* Stores List */}
      {stores.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
          <Store size={48} className="mx-auto text-gray-400 mb-3" />
          <p className="text-gray-600">لا توجد متاجر طعام حالياً</p>
        </div>
      ) : (
        <div className="space-y-3">
          {stores.map((store) => {
            const TypeIcon = STORE_TYPES[store.store_type]?.icon || Store;
            const typeColor = STORE_TYPES[store.store_type]?.color || 'bg-gray-500';
            const typeName = STORE_TYPES[store.store_type]?.name || store.store_type;

            return (
              <div key={store.id} className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-12 h-12 ${typeColor} rounded-lg flex items-center justify-center text-white`}>
                      <TypeIcon size={24} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{store.name}</h3>
                      <p className="text-sm text-gray-500">{typeName}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {store.city}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone size={12} />
                          {store.phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {store.is_approved ? (
                      <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">معتمد</span>
                    ) : (
                      <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-1 rounded-full">بانتظار الموافقة</span>
                    )}

                    {!store.is_approved && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(store.id)}
                          className="flex items-center gap-1 bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-green-600"
                        >
                          <Check size={14} />
                          قبول
                        </button>
                        <button
                          onClick={() => handleReject(store.id, store.name)}
                          className="flex items-center gap-1 bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs hover:bg-red-600"
                          data-testid={`reject-store-${store.id}`}
                        >
                          <X size={14} />
                          رفض
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* الوثائق المقدمة - تظهر للجميع */}
                {store.documents && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-500 mb-2 font-medium">الوثائق المقدمة:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {store.documents.store_photo && (
                        <div>
                          <p className="text-[10px] text-gray-400 mb-1">صورة المتجر</p>
                          <img 
                            src={store.documents.store_photo} 
                            alt="صورة المتجر" 
                            className="w-full h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80"
                            onClick={() => setLightboxImage({ src: store.documents.store_photo, alt: 'صورة المتجر' })}
                          />
                        </div>
                      )}
                      {store.documents.license_photo && (
                        <div>
                          <p className="text-[10px] text-gray-400 mb-1">الترخيص</p>
                          <img 
                            src={store.documents.license_photo} 
                            alt="الترخيص" 
                            className="w-full h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80"
                            onClick={() => setLightboxImage({ src: store.documents.license_photo, alt: 'الترخيص' })}
                          />
                        </div>
                      )}
                      {store.documents.health_certificate && (
                        <div>
                          <p className="text-[10px] text-gray-400 mb-1">الشهادة الصحية</p>
                          <img 
                            src={store.documents.health_certificate} 
                            alt="الشهادة الصحية" 
                            className="w-full h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80"
                            onClick={() => setLightboxImage({ src: store.documents.health_certificate, alt: 'الشهادة الصحية' })}
                          />
                        </div>
                      )}
                      {store.documents.id_photo && (
                        <div>
                          <p className="text-[10px] text-gray-400 mb-1">الهوية / إخراج القيد</p>
                          <img 
                            src={store.documents.id_photo} 
                            alt="صورة الهوية / إخراج القيد" 
                            className="w-full h-16 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80"
                            onClick={() => setLightboxImage({ src: store.documents.id_photo, alt: 'صورة الهوية / إخراج القيد' })}
                          />
                        </div>
                      )}
                      {/* إذا لم توجد أي وثائق */}
                      {!store.documents.store_photo && !store.documents.license_photo && 
                       !store.documents.health_certificate && !store.documents.id_photo && (
                        <p className="col-span-3 text-xs text-gray-400 italic">لم يتم تقديم أي وثائق</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Commissions Modal */}
      {showCommissionsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-sm font-bold text-gray-900">إدارة عمولات الطعام</h2>
              <p className="text-sm text-gray-500">تعديل نسب العمولات لكل نوع متجر</p>
            </div>

            <div className="p-4 space-y-3">
              {Object.entries(STORE_TYPES).map(([key, { name, icon: Icon, color }]) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center text-white`}>
                      <Icon size={20} />
                    </div>
                    <span className="font-medium text-gray-900">{name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round((editingCommissions[key] || 0.2) * 100)}
                      onChange={(e) => setEditingCommissions({
                        ...editingCommissions,
                        [key]: parseFloat(e.target.value) / 100
                      })}
                      className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-center"
                    />
                    <span className="text-gray-500">%</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowCommissionsModal(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200"
              >
                إلغاء
              </button>
              <button
                onClick={handleSaveCommissions}
                className="flex-1 bg-green-500 text-white py-2 rounded-lg font-medium hover:bg-green-600 flex items-center justify-center gap-2"
              >
                <Save size={16} />
                حفظ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      <RejectModal
        isOpen={rejectModal.isOpen}
        onClose={() => setRejectModal({ isOpen: false, storeId: null, storeName: '' })}
        onConfirm={handleRejectConfirm}
        title="رفض المتجر"
        itemName={rejectModal.storeName}
        processing={rejectProcessing}
      />

      {/* Image Lightbox */}
      {lightboxImage && (
        <ImageLightbox 
          src={lightboxImage.src} 
          alt={lightboxImage.alt} 
          onClose={() => setLightboxImage(null)} 
        />
      )}
    </div>
  );
};

export default FoodStoresTab;
