// /app/frontend/src/components/admin/FoodOffersTab.js
// تبويب إدارة عروض الطعام وعروض الفلاش

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Gift, Zap, Plus, Edit, Trash2, Check, X, Clock, 
  Store, Percent, Search, Filter, ToggleLeft, ToggleRight,
  UserPlus, CheckCircle, XCircle, RefreshCw
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FoodOffersTab = ({ token }) => {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('offers'); // offers, flash, requests
  const [offers, setOffers] = useState([]);
  const [flashSales, setFlashSales] = useState([]);
  const [flashRequests, setFlashRequests] = useState([]);
  const [requestsStats, setRequestsStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showFlashModal, setShowFlashModal] = useState(false);
  const [editingFlash, setEditingFlash] = useState(null);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const [offersRes, flashRes, requestsRes] = await Promise.all([
        axios.get(`${API}/admin/food-offers`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/admin/flash-sales`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/admin/flash-sale-requests`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setOffers(offersRes.data || []);
      setFlashSales(flashRes.data || []);
      setFlashRequests(requestsRes.data?.requests || []);
      setRequestsStats(requestsRes.data?.stats || { pending: 0, approved: 0, rejected: 0 });
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOffer = async (offer) => {
    try {
      await axios.put(`${API}/admin/food-offers/${offer.id}`, 
        { is_active: !offer.is_active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: offer.is_active ? "تم تعطيل العرض" : "تم تفعيل العرض" });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل تحديث العرض", variant: "destructive" });
    }
  };

  const handleDeleteOffer = async (offerId) => {
    if (!window.confirm('هل تريد حذف هذا العرض؟')) return;
    
    try {
      await axios.delete(`${API}/admin/food-offers/${offerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: "تم الحذف", description: "تم حذف العرض" });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حذف العرض", variant: "destructive" });
    }
  };

  const handleToggleFlash = async (flash) => {
    try {
      await axios.put(`${API}/admin/flash-sales/${flash.id}`, 
        { is_active: !flash.is_active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast({ title: flash.is_active ? "تم إيقاف الفلاش" : "تم تفعيل الفلاش" });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", variant: "destructive" });
    }
  };

  const handleDeleteFlash = async (flashId) => {
    if (!window.confirm('هل تريد حذف عرض الفلاش هذا؟')) return;
    
    try {
      await axios.delete(`${API}/admin/flash-sales/${flashId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: "تم الحذف" });
      fetchData();
    } catch (error) {
      toast({ title: "خطأ", variant: "destructive" });
    }
  };

  const getOfferTypeLabel = (type) => {
    switch (type) {
      case 'buy_x_get_y': return 'اشترِ واحصل مجاناً';
      case 'percentage': return 'خصم %';
      case 'fixed_discount': return 'خصم ثابت';
      default: return type;
    }
  };

  const filteredOffers = offers.filter(offer => {
    if (filter === 'active') return offer.is_active;
    if (filter === 'inactive') return !offer.is_active;
    return true;
  });

  const isFlashActive = (flash) => {
    const now = new Date().toISOString();
    return flash.is_active && flash.start_time <= now && flash.end_time >= now;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="food-offers-tab">
      {/* Section Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        <button
          onClick={() => setActiveSection('offers')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
            activeSection === 'offers'
              ? 'bg-white text-purple-600 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Gift size={18} />
          عروض المتاجر ({offers.length})
        </button>
        <button
          onClick={() => setActiveSection('flash')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
            activeSection === 'flash'
              ? 'bg-white text-orange-600 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Zap size={18} />
          عروض الفلاش ({flashSales.length})
        </button>
        <button
          onClick={() => setActiveSection('requests')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-all whitespace-nowrap relative ${
            activeSection === 'requests'
              ? 'bg-white text-green-600 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <UserPlus size={18} />
          طلبات الانضمام
          {requestsStats.pending > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {requestsStats.pending}
            </span>
          )}
        </button>
      </div>

      {/* Store Offers Section */}
      {activeSection === 'offers' && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex gap-2">
            {['all', 'active', 'inactive'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  filter === f
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'all' ? 'الكل' : f === 'active' ? 'نشط' : 'معطل'}
              </button>
            ))}
          </div>

          {/* Offers List */}
          {filteredOffers.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
              <Gift size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">لا توجد عروض</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOffers.map((offer) => (
                <motion.div
                  key={offer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`bg-white rounded-xl p-4 border-2 ${
                    offer.is_active ? 'border-green-200' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-gray-900">{offer.name}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          offer.is_active 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {offer.is_active ? 'نشط' : 'معطل'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 text-sm text-gray-500 mb-2">
                        <span className="flex items-center gap-1">
                          <Store size={14} />
                          {offer.store_name || 'غير معروف'}
                        </span>
                        <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                          {getOfferTypeLabel(offer.offer_type)}
                        </span>
                        {offer.offer_type === 'buy_x_get_y' && (
                          <span className="text-purple-600 font-medium">
                            {offer.buy_quantity}+{offer.get_quantity} مجاناً
                          </span>
                        )}
                      </div>
                      
                      <div className="text-xs text-gray-400">
                        استُخدم {offer.usage_count || 0} مرة
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleOffer(offer)}
                        className={`p-2 rounded-lg ${
                          offer.is_active
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                        title={offer.is_active ? 'تعطيل' : 'تفعيل'}
                      >
                        {offer.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      </button>
                      <button
                        onClick={() => handleDeleteOffer(offer.id)}
                        className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                        title="حذف"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Flash Sales Section */}
      {activeSection === 'flash' && (
        <div className="space-y-4">
          {/* Create Flash Sale Button */}
          <button
            onClick={() => {
              setEditingFlash(null);
              setShowFlashModal(true);
            }}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90"
          >
            <Plus size={20} />
            إنشاء عرض فلاش جديد
          </button>

          {/* Flash Sales List */}
          {flashSales.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
              <Zap size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 mb-2">لا توجد عروض فلاش</p>
              <p className="text-sm text-gray-400">عروض الفلاش تظهر لجميع العملاء مع مؤقت عد تنازلي</p>
            </div>
          ) : (
            <div className="space-y-3">
              {flashSales.map((flash) => (
                <motion.div
                  key={flash.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl p-4 border-2 ${
                    isFlashActive(flash) 
                      ? 'bg-gradient-to-r from-orange-50 to-red-50 border-orange-300' 
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap size={18} className={isFlashActive(flash) ? 'text-orange-500' : 'text-gray-400'} />
                        <h4 className="font-bold text-gray-900">{flash.name}</h4>
                        {isFlashActive(flash) && (
                          <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full text-xs animate-pulse">
                            نشط الآن!
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 text-sm mb-2">
                        <span className="bg-red-100 text-red-700 px-2 py-1 rounded font-bold">
                          {flash.discount_percentage}% خصم
                        </span>
                        <span className="text-gray-500 flex items-center gap-1">
                          <Clock size={14} />
                          {new Date(flash.start_time).toLocaleDateString('ar')} - {new Date(flash.end_time).toLocaleDateString('ar')}
                        </span>
                      </div>
                      
                      <div className="text-xs text-gray-400">
                        {flash.flash_type === 'products' ? (
                          <span className="text-purple-600 font-medium">
                            منتجات محددة ({flash.applicable_products?.length || 0})
                          </span>
                        ) : flash.applicable_categories?.length > 0 ? (
                          <>الفئات: {flash.applicable_categories.map(c => 
                            c === 'restaurants' ? 'مطاعم' : 
                            c === 'groceries' ? 'مواد غذائية' : 'خضروات'
                          ).join(', ')}</>
                        ) : (
                          'جميع الفئات'
                        )}
                        {' • '}
                        استُخدم {flash.usage_count || 0} مرة
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingFlash(flash);
                          setShowFlashModal(true);
                        }}
                        className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200"
                        title="تعديل"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleToggleFlash(flash)}
                        className={`p-2 rounded-lg ${
                          flash.is_active
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                        title={flash.is_active ? 'إيقاف' : 'تفعيل'}
                      >
                        {flash.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      </button>
                      <button
                        onClick={() => handleDeleteFlash(flash.id)}
                        className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                        title="حذف"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Flash Sale Requests Section */}
      {activeSection === 'requests' && (
        <FlashRequestsSection 
          requests={flashRequests}
          stats={requestsStats}
          token={token}
          onUpdate={fetchData}
        />
      )}

      {/* Flash Sale Modal */}
      {showFlashModal && (
        <FlashSaleModal
          flash={editingFlash}
          token={token}
          onClose={() => {
            setShowFlashModal(false);
            setEditingFlash(null);
          }}
          onSave={() => {
            setShowFlashModal(false);
            setEditingFlash(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
};

// Flash Sale Requests Section
const FlashRequestsSection = ({ requests, stats, token, onUpdate }) => {
  const { toast } = useToast();
  const [filter, setFilter] = useState('pending');
  const [processing, setProcessing] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(null);

  const handleApprove = async (requestId) => {
    setProcessing(requestId);
    try {
      await axios.put(`${API}/admin/flash-sale-requests/${requestId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: "تمت الموافقة", description: "تمت إضافة المنتجات لعرض الفلاش" });
      onUpdate();
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || "فشلت العملية", variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (requestId, reason, refund = true) => {
    setProcessing(requestId);
    try {
      await axios.put(`${API}/admin/flash-sale-requests/${requestId}/reject?reason=${encodeURIComponent(reason)}&refund=${refund}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: "تم الرفض", description: refund ? "تم رفض الطلب واسترداد الرسوم" : "تم رفض الطلب" });
      setShowRejectModal(null);
      onUpdate();
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || "فشلت العملية", variant: "destructive" });
    } finally {
      setProcessing(null);
    }
  };

  const filteredRequests = requests.filter(req => {
    if (filter === 'all') return true;
    return req.status === filter;
  });

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700'
    };
    const labels = {
      pending: 'قيد المراجعة',
      approved: 'موافق عليه',
      rejected: 'مرفوض'
    };
    return { style: styles[status] || styles.pending, label: labels[status] || status };
  };

  const formatDateTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('ar-SY', { 
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
    });
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          <div className="text-xs text-yellow-700">قيد المراجعة</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          <div className="text-xs text-green-700">تمت الموافقة</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          <div className="text-xs text-red-700">مرفوض</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 overflow-x-auto">
        {[
          { id: 'pending', label: 'قيد المراجعة' },
          { id: 'approved', label: 'موافق عليه' },
          { id: 'rejected', label: 'مرفوض' },
          { id: 'all', label: 'الكل' }
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              filter === f.id
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
          <UserPlus size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">لا توجد طلبات {filter !== 'all' ? getStatusBadge(filter).label : ''}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((req) => {
            const badge = getStatusBadge(req.status);
            return (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Store size={16} className="text-gray-400" />
                        <h4 className="font-bold text-gray-900">{req.store_name || 'متجر'}</h4>
                        <span className={`px-2 py-0.5 rounded-full text-xs ${badge.style}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {req.owner_name} • {formatDateTime(req.created_at)}
                      </p>
                    </div>
                    <div className="text-left">
                      <div className="text-lg font-bold text-green-600">{req.fee_paid?.toLocaleString()} ل.س</div>
                      <div className="text-xs text-gray-500">{req.products_count} منتج</div>
                    </div>
                  </div>

                  {/* Flash Sale Info */}
                  <div className="bg-orange-50 rounded-lg p-3 mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Zap size={16} className="text-orange-500" />
                      <span className="font-medium text-gray-900">{req.flash_sale_name || 'عرض فلاش'}</span>
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold">
                        {req.discount_percentage}% خصم
                      </span>
                    </div>
                  </div>

                  {/* Products */}
                  {req.products && req.products.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-2">المنتجات المطلوب إضافتها:</p>
                      <div className="flex flex-wrap gap-2">
                        {req.products.map((product) => (
                          <span key={product.id} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                            {product.name} ({product.price?.toLocaleString()} ل.س)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {req.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(req.id)}
                        disabled={processing === req.id}
                        className="flex-1 bg-green-500 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-green-600 disabled:opacity-50"
                      >
                        {processing === req.id ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <CheckCircle size={18} />
                            موافقة
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => setShowRejectModal(req)}
                        disabled={processing === req.id}
                        className="flex-1 bg-red-100 text-red-600 py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-red-200 disabled:opacity-50"
                      >
                        <XCircle size={18} />
                        رفض
                      </button>
                    </div>
                  )}

                  {req.status === 'rejected' && req.rejection_reason && (
                    <div className="bg-red-50 rounded-lg p-3 text-sm">
                      <span className="font-medium text-red-700">سبب الرفض:</span>
                      <span className="text-red-600 mr-1">{req.rejection_reason}</span>
                      {req.refunded && (
                        <span className="block text-green-600 mt-1">✓ تم استرداد الرسوم</span>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <RejectModal
          request={showRejectModal}
          onReject={handleReject}
          onClose={() => setShowRejectModal(null)}
          processing={processing === showRejectModal.id}
        />
      )}
    </div>
  );
};

// Reject Modal
const RejectModal = ({ request, onReject, onClose, processing }) => {
  const [reason, setReason] = useState('');
  const [refund, setRefund] = useState(true);

  const reasons = [
    'المنتجات لا تستوفي معايير الجودة',
    'المتجر لديه تقييمات سلبية',
    'المنتجات غير مناسبة للعرض',
    'سعر المنتجات غير تنافسي',
    'سبب آخر'
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-md"
      >
        <div className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">رفض طلب الانضمام</h3>
          
          <div className="space-y-3 mb-4">
            {reasons.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={`w-full text-right px-4 py-3 rounded-xl border ${
                  reason === r
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {reason === 'سبب آخر' && (
            <textarea
              placeholder="اكتب سبب الرفض..."
              value={reason === 'سبب آخر' ? '' : reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-4"
            />
          )}

          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl mb-4">
            <input
              type="checkbox"
              id="refund"
              checked={refund}
              onChange={(e) => setRefund(e.target.checked)}
              className="w-5 h-5 rounded"
            />
            <label htmlFor="refund" className="text-sm text-gray-700">
              استرداد الرسوم للمحفظة ({request.fee_paid?.toLocaleString()} ل.س)
            </label>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50"
            >
              إلغاء
            </button>
            <button
              onClick={() => onReject(request.id, reason, refund)}
              disabled={!reason || processing}
              className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {processing ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <XCircle size={18} />
                  تأكيد الرفض
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Flash Sale Modal
const FlashSaleModal = ({ flash, token, onClose, onSave }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: flash?.name || '',
    description: flash?.description || '',
    discount_percentage: flash?.discount_percentage || 20,
    start_time: flash?.start_time ? flash.start_time.slice(0, 16) : '',
    end_time: flash?.end_time ? flash.end_time.slice(0, 16) : '',
    flash_type: flash?.flash_type || 'all',  // all, categories, products
    applicable_categories: flash?.applicable_categories || [],
    applicable_products: flash?.applicable_products || [],
    banner_color: flash?.banner_color || '#FF4500',
    is_active: flash?.is_active !== false,
  });
  const [saving, setSaving] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearch, setProductSearch] = useState('');

  // جلب المنتجات عند اختيار نوع "منتجات محددة"
  useEffect(() => {
    if (formData.flash_type === 'products' && allProducts.length === 0) {
      fetchAllProducts();
    }
  }, [formData.flash_type]);

  const fetchAllProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await axios.get(`${API}/food/products?limit=500`);
      setAllProducts(res.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const categories = [
    { id: 'restaurants', name: 'مطاعم' },
    { id: 'groceries', name: 'مواد غذائية' },
    { id: 'vegetables', name: 'خضروات وفواكه' },
  ];

  const toggleCategory = (catId) => {
    setFormData(prev => ({
      ...prev,
      applicable_categories: prev.applicable_categories.includes(catId)
        ? prev.applicable_categories.filter(c => c !== catId)
        : [...prev.applicable_categories, catId]
    }));
  };

  const toggleProduct = (productId) => {
    setFormData(prev => ({
      ...prev,
      applicable_products: prev.applicable_products.includes(productId)
        ? prev.applicable_products.filter(p => p !== productId)
        : [...prev.applicable_products, productId]
    }));
  };

  const filteredProducts = allProducts.filter(p => 
    p.name?.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.store_name?.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.start_time || !formData.end_time) {
      toast({ title: "تنبيه", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }

    if (formData.flash_type === 'products' && formData.applicable_products.length === 0) {
      toast({ title: "تنبيه", description: "يرجى تحديد منتج واحد على الأقل", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const data = {
        ...formData,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
      };

      if (flash?.id) {
        await axios.put(`${API}/admin/flash-sales/${flash.id}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast({ title: "تم التحديث", description: "تم تحديث عرض الفلاش" });
      } else {
        await axios.post(`${API}/admin/flash-sales`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast({ title: "تم الإنشاء", description: "تم إنشاء عرض الفلاش" });
      }
      onSave();
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || "فشلت العملية", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Zap size={20} />
            {flash?.id ? 'تعديل عرض فلاش' : 'عرض فلاش جديد'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم العرض *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="مثال: تخفيضات نهاية الأسبوع"
              className="w-full border border-gray-200 rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="وصف قصير للعرض"
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">نسبة الخصم *</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={formData.discount_percentage}
                onChange={(e) => setFormData({ ...formData, discount_percentage: parseInt(e.target.value) })}
                min="1"
                max="90"
                className="flex-1 border border-gray-200 rounded-xl px-4 py-3"
              />
              <span className="text-2xl font-bold text-orange-500">%</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">وقت البداية *</label>
              <input
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">وقت النهاية *</label>
              <input
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-4 py-3"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">نطاق العرض</label>
            <div className="flex flex-wrap gap-2 mb-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, flash_type: 'all', applicable_categories: [], applicable_products: [] })}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  formData.flash_type === 'all'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                جميع الأصناف
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, flash_type: 'categories', applicable_products: [] })}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  formData.flash_type === 'categories'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                فئات محددة
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, flash_type: 'products', applicable_categories: [] })}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  formData.flash_type === 'products'
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                منتجات محددة
              </button>
            </div>

            {/* اختيار الفئات */}
            {formData.flash_type === 'categories' && (
              <div className="flex flex-wrap gap-2 p-3 bg-orange-50 rounded-xl">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${
                      formData.applicable_categories.includes(cat.id)
                        ? 'bg-orange-500 text-white'
                        : 'bg-white text-gray-600 border'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            {/* اختيار المنتجات */}
            {formData.flash_type === 'products' && (
              <div className="p-3 bg-purple-50 rounded-xl space-y-3">
                {/* شريط البحث */}
                <div className="relative">
                  <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="ابحث عن منتج..."
                    className="w-full border border-gray-200 rounded-lg pr-10 pl-4 py-2 text-sm"
                  />
                </div>

                {/* المنتجات المحددة */}
                {formData.applicable_products.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.applicable_products.map(productId => {
                      const product = allProducts.find(p => p.id === productId);
                      return product ? (
                        <span 
                          key={productId}
                          className="bg-purple-500 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1"
                        >
                          {product.name}
                          <button 
                            type="button"
                            onClick={() => toggleProduct(productId)}
                            className="hover:bg-white/20 rounded-full p-0.5"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}

                {/* قائمة المنتجات */}
                {loadingProducts ? (
                  <div className="text-center py-4">
                    <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredProducts.slice(0, 50).map(product => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => toggleProduct(product.id)}
                        className={`w-full text-right px-3 py-2 rounded-lg text-sm flex items-center justify-between ${
                          formData.applicable_products.includes(product.id)
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <div>
                          <span className="font-medium">{product.name}</span>
                          <span className="text-xs text-gray-500 mr-2">({product.store_name})</span>
                        </div>
                        <span className="text-xs text-gray-500">{product.price?.toLocaleString()} ل.س</span>
                      </button>
                    ))}
                  </div>
                )}

                <p className="text-xs text-purple-600">
                  تم تحديد {formData.applicable_products.length} منتج
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">لون البانر</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={formData.banner_color}
                onChange={(e) => setFormData({ ...formData, banner_color: e.target.value })}
                className="w-12 h-12 rounded-lg cursor-pointer"
              />
              <div 
                className="flex-1 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                style={{ backgroundColor: formData.banner_color }}
              >
                معاينة البانر
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="w-5 h-5 rounded"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700">
              تفعيل العرض فوراً عند حلول الوقت المحدد
            </label>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Zap size={20} />
                {flash?.id ? 'تحديث العرض' : 'إنشاء عرض الفلاش'}
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default FoodOffersTab;
