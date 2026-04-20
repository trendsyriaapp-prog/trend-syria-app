// /app/frontend/src/components/admin/CouponsTab.js
// إدارة كوبونات الخصم

import { useState, useEffect } from 'react';
import logger from '../../lib/logger';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  Ticket, Plus, Edit, Trash2, Copy, Check, X, Clock, 
  Users, ShoppingBag, Percent, DollarSign, Truck,
  ToggleLeft, ToggleRight, Search, Filter, Gift
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

// أنواع الكوبونات
const COUPON_TYPES = [
  { id: 'percentage', label: 'نسبة مئوية', icon: Percent, color: 'blue' },
  { id: 'fixed', label: 'مبلغ ثابت', icon: DollarSign, color: 'green' },
  { id: 'free_delivery', label: 'توصيل مجاني', icon: Truck, color: 'purple' }
];

// نطاقات الكوبون
const COUPON_SCOPES = [
  { id: 'all', label: 'جميع المنتجات' },
  { id: 'food', label: 'قسم الطعام فقط' },
  { id: 'shop', label: 'المتجر العام فقط' }
];

const CouponsTab = ({ token }) => {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, couponId: null, code: '' });

  useEffect(() => {
    fetchCoupons();
  }, [filter]);

  const fetchCoupons = async () => {
    try {
      const res = await axios.get(`${API}/api/coupons/admin/list`, {
        params: { status: filter },
        headers: { Authorization: `Bearer ${token}` }
      });
      setCoupons(res.data.coupons || []);
      setStats(res.data.stats || {});
    } catch (error) {
      logger.error('Error fetching coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.couponId) return;
    
    try {
      await axios.delete(`${API}/api/coupons/admin/${deleteModal.couponId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: "تم الحذف", description: "تم حذف الكوبون بنجاح" });
      setDeleteModal({ isOpen: false, couponId: null, code: '' });
      fetchCoupons();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حذف الكوبون", variant: "destructive" });
    }
  };

  const handleToggle = async (coupon) => {
    try {
      await axios.put(`${API}/api/coupons/admin/${coupon.id}`, {
        is_active: !coupon.is_active
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ 
        title: coupon.is_active ? "تم التعطيل" : "تم التفعيل",
        description: `الكوبون ${coupon.code} ${coupon.is_active ? 'معطل' : 'مفعّل'} الآن`
      });
      fetchCoupons();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل تحديث الحالة", variant: "destructive" });
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({ title: "تم النسخ", description: `تم نسخ الكود ${code}` });
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'غير محدد';
    return new Date(isoString).toLocaleDateString('ar-SY', { 
      month: 'short', day: 'numeric', year: 'numeric' 
    });
  };

  const isExpired = (coupon) => {
    if (!coupon.end_date) return false;
    return new Date(coupon.end_date) < new Date();
  };

  const getTypeIcon = (type) => {
    const found = COUPON_TYPES.find(t => t.id === type);
    return found ? found.icon : Ticket;
  };

  const getTypeColor = (type) => {
    const found = COUPON_TYPES.find(t => t.id === type);
    return found ? found.color : 'gray';
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg p-3 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Ticket size={18} />
            <span className="text-sm opacity-90">إجمالي الكوبونات</span>
          </div>
          <div className="text-2xl font-bold">{stats.total || 0}</div>
        </div>
        
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg p-3 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Check size={18} />
            <span className="text-sm opacity-90">نشطة</span>
          </div>
          <div className="text-2xl font-bold">{stats.active || 0}</div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-lg p-3 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Users size={18} />
            <span className="text-sm opacity-90">مرات الاستخدام</span>
          </div>
          <div className="text-2xl font-bold">{stats.total_uses || 0}</div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-lg p-3 text-white">
          <div className="flex items-center gap-2 mb-1">
            <Gift size={18} />
            <span className="text-sm opacity-90">إجمالي الخصومات</span>
          </div>
          <div className="text-base font-bold">{(stats.total_savings || 0).toLocaleString()}</div>
        </div>
      </div>

      {/* Create Button */}
      <button
        onClick={() => {
          setEditingCoupon(null);
          setShowModal(true);
        }}
        data-testid="create-coupon-btn"
        className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:opacity-90"
      >
        <Plus size={20} />
        إنشاء كوبون جديد
      </button>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'all', label: 'الكل' },
          { id: 'active', label: 'نشطة' },
          { id: 'expired', label: 'منتهية' },
          { id: 'disabled', label: 'معطلة' }
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
              filter === f.id
                ? 'bg-purple-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Coupons List */}
      {coupons.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center border border-gray-100">
          <Ticket size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">لا توجد كوبونات</p>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon) => {
            const TypeIcon = getTypeIcon(coupon.coupon_type);
            const typeColor = getTypeColor(coupon.coupon_type);
            const expired = isExpired(coupon);
            
            return (
              <motion.div
                key={coupon.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-lg border-2 overflow-hidden ${
                  !coupon.is_active ? 'border-gray-200 opacity-60' :
                  expired ? 'border-red-200' : 'border-purple-200'
                }`}
              >
                <div className="p-3">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-lg bg-${typeColor}-100 flex items-center justify-center`}>
                        <TypeIcon size={24} className={`text-${typeColor}-600`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-900">{coupon.name}</h4>
                          {coupon.new_customers_only && (
                            <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">
                              جديد
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => copyCode(coupon.code)}
                          className="flex items-center gap-1 text-sm bg-gray-100 px-2 py-1 rounded mt-1 hover:bg-gray-200"
                        >
                          <span className="font-mono font-bold text-purple-600">{coupon.code}</span>
                          {copiedCode === coupon.code ? (
                            <Check size={14} className="text-green-500" />
                          ) : (
                            <Copy size={14} className="text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingCoupon(coupon);
                          setShowModal(true);
                        }}
                        className="p-2 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleToggle(coupon)}
                        className={`p-2 rounded-lg ${
                          coupon.is_active
                            ? 'bg-green-100 text-green-600'
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {coupon.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                      <button
                        onClick={() => setDeleteModal({ isOpen: true, couponId: coupon.id, code: coupon.code })}
                        className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Discount Value */}
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">قيمة الخصم:</span>
                      <span className={`font-bold text-${typeColor}-600 text-lg`}>
                        {coupon.coupon_type === 'percentage' && `${coupon.discount_percentage}%`}
                        {coupon.coupon_type === 'fixed' && `${coupon.discount_amount?.toLocaleString()} ل.س`}
                        {coupon.coupon_type === 'free_delivery' && 'توصيل مجاني'}
                      </span>
                    </div>
                    {coupon.max_discount && (
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-gray-500">الحد الأقصى:</span>
                        <span className="text-gray-700">{coupon.max_discount?.toLocaleString()} ل.س</span>
                      </div>
                    )}
                    {coupon.min_order_amount > 0 && (
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-gray-500">الحد الأدنى للطلب:</span>
                        <span className="text-gray-700">{coupon.min_order_amount?.toLocaleString()} ل.س</span>
                      </div>
                    )}
                  </div>

                  {/* Stats & Info */}
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="flex items-center gap-1 text-gray-500">
                      <Users size={14} />
                      {coupon.usage_count || 0} استخدام
                    </span>
                    {coupon.max_uses && (
                      <span className="text-gray-400">من {coupon.max_uses}</span>
                    )}
                    <span className="flex items-center gap-1 text-gray-500">
                      <Clock size={14} />
                      {coupon.end_date ? formatDate(coupon.end_date) : 'بدون انتهاء'}
                    </span>
                    {expired && (
                      <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-xs">
                        منتهي
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <CouponModal
            coupon={editingCoupon}
            token={token}
            onClose={() => {
              setShowModal(false);
              setEditingCoupon(null);
            }}
            onSuccess={() => {
              setShowModal(false);
              setEditingCoupon(null);
              fetchCoupons();
            }}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        code={deleteModal.code}
        onClose={() => setDeleteModal({ isOpen: false, couponId: null, code: '' })}
        onConfirm={handleDelete}
      />
    </div>
  );
};

// Coupon Create/Edit Modal
const CouponModal = ({ coupon, token, onClose, onSuccess }) => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    code: coupon?.code || '',
    name: coupon?.name || '',
    description: coupon?.description || '',
    coupon_type: coupon?.coupon_type || 'percentage',
    discount_percentage: coupon?.discount_percentage || 10,
    discount_amount: coupon?.discount_amount || 5000,
    max_discount: coupon?.max_discount || '',
    min_order_amount: coupon?.min_order_amount || 0,
    scope: coupon?.scope || 'all',
    max_uses: coupon?.max_uses || '',
    max_uses_per_user: coupon?.max_uses_per_user || 1,
    new_customers_only: coupon?.new_customers_only || false,
    end_date: coupon?.end_date ? coupon.end_date.split('T')[0] : '',
    is_active: coupon?.is_active ?? true
  });

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
  };

  const handleSubmit = async () => {
    if (!formData.code.trim()) {
      toast({ title: "خطأ", description: "كود الكوبون مطلوب", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        ...formData,
        code: formData.code.toUpperCase(),
        max_discount: formData.max_discount ? Number(formData.max_discount) : null,
        max_uses: formData.max_uses ? Number(formData.max_uses) : null,
        end_date: formData.end_date ? new Date(formData.end_date).toISOString() : null
      };

      if (coupon) {
        await axios.put(`${API}/api/coupons/admin/${coupon.id}`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast({ title: "تم التحديث", description: "تم تحديث الكوبون بنجاح" });
      } else {
        await axios.post(`${API}/api/coupons/admin/create`, data, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast({ title: "تم الإنشاء", description: "تم إنشاء الكوبون بنجاح" });
      }
      onSuccess();
    } catch (error) {
      toast({ 
        title: "خطأ", 
        description: error.response?.data?.detail || "فشلت العملية", 
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-4 flex items-center justify-between">
          <h3 className="font-bold text-sm">
            {coupon ? 'تعديل الكوبون' : 'إنشاء كوبون جديد'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">كود الكوبون *</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="مثال: WELCOME20"
                className="flex-1 border border-gray-200 rounded-lg px-4 py-2 font-mono uppercase"
                disabled={!!coupon}
              />
              {!coupon && (
                <button
                  onClick={generateCode}
                  className="px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200"
                >
                  توليد
                </button>
              )}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم الكوبون</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="مثال: كوبون ترحيبي"
              className="w-full border border-gray-200 rounded-lg px-4 py-2"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">نوع الخصم</label>
            <div className="grid grid-cols-3 gap-2">
              {COUPON_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setFormData({ ...formData, coupon_type: type.id })}
                  className={`p-3 rounded-lg border-2 text-center ${
                    formData.coupon_type === type.id
                      ? `border-${type.color}-500 bg-${type.color}-50`
                      : 'border-gray-200'
                  }`}
                >
                  <type.icon size={24} className={`mx-auto mb-1 text-${type.color}-500`} />
                  <span className="text-xs">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Discount Value */}
          {formData.coupon_type === 'percentage' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نسبة الخصم %</label>
                <input
                  type="number"
                  value={formData.discount_percentage}
                  onChange={(e) => setFormData({ ...formData, discount_percentage: Number(e.target.value) })}
                  min="1"
                  max="100"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأقصى (ل.س)</label>
                <input
                  type="number"
                  value={formData.max_discount}
                  onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                  placeholder="اختياري"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2"
                />
              </div>
            </div>
          )}

          {formData.coupon_type === 'fixed' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">مبلغ الخصم (ل.س)</label>
              <input
                type="number"
                value={formData.discount_amount}
                onChange={(e) => setFormData({ ...formData, discount_amount: Number(e.target.value) })}
                className="w-full border border-gray-200 rounded-lg px-4 py-2"
              />
            </div>
          )}

          {/* Min Order */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأدنى للطلب (ل.س)</label>
            <input
              type="number"
              value={formData.min_order_amount}
              onChange={(e) => setFormData({ ...formData, min_order_amount: Number(e.target.value) })}
              placeholder="0 = بدون حد أدنى"
              className="w-full border border-gray-200 rounded-lg px-4 py-2"
            />
          </div>

          {/* Scope */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">نطاق الكوبون</label>
            <div className="flex flex-wrap gap-2">
              {COUPON_SCOPES.map((scope) => (
                <button
                  key={scope.id}
                  onClick={() => setFormData({ ...formData, scope: scope.id })}
                  className={`px-4 py-2 rounded-lg text-sm ${
                    formData.scope === scope.id
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {scope.label}
                </button>
              ))}
            </div>
          </div>

          {/* Usage Limits */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">عدد الاستخدامات الكلي</label>
              <input
                type="number"
                value={formData.max_uses}
                onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                placeholder="غير محدود"
                className="w-full border border-gray-200 rounded-lg px-4 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">لكل مستخدم</label>
              <input
                type="number"
                value={formData.max_uses_per_user}
                onChange={(e) => setFormData({ ...formData, max_uses_per_user: Number(e.target.value) })}
                min="1"
                className="w-full border border-gray-200 rounded-lg px-4 py-2"
              />
            </div>
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الانتهاء</label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-4 py-2"
            />
          </div>

          {/* New Customers Only */}
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
            <div>
              <p className="font-medium text-gray-900">للعملاء الجدد فقط</p>
              <p className="text-sm text-gray-500">العملاء بدون طلبات سابقة</p>
            </div>
            <button
              onClick={() => setFormData({ ...formData, new_customers_only: !formData.new_customers_only })}
              className={`w-12 h-6 rounded-full transition-colors ${
                formData.new_customers_only ? 'bg-yellow-500' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                formData.new_customers_only ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg font-bold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check size={20} />
                {coupon ? 'تحديث الكوبون' : 'إنشاء الكوبون'}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Delete Confirmation Modal Component
const DeleteModal = ({ isOpen, code, onClose, onConfirm }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
            <Trash2 size={20} className="text-red-600" />
          </div>
          <div>
            <h3 className="font-bold">حذف الكوبون</h3>
            <p className="text-xs text-gray-500 font-mono">{code}</p>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          هل تريد حذف هذا الكوبون؟ لا يمكن التراجع عن هذا الإجراء.
        </p>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-sm"
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm flex items-center justify-center gap-2"
          >
            <Trash2 size={16} />
            حذف
          </button>
        </div>
      </div>
    </div>
  );
};

export default CouponsTab;
