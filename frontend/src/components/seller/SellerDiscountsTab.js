// /app/frontend/src/components/seller/SellerDiscountsTab.js
// تبويب إدارة العروض والخصومات للبائع

import { useState, useEffect } from 'react';
import logger from '../../lib/logger';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Tag, Plus, Percent, DollarSign, Calendar, Users, Eye, EyeOff,
  Trash2, Loader2, Gift, CheckCircle, XCircle, Clock, Package
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-SY', { year: 'numeric', month: 'short', day: 'numeric' });
};

const CATEGORIES = [
  { id: 'electronics', name: 'إلكترونيات' },
  { id: 'fashion', name: 'أزياء' },
  { id: 'home', name: 'المنزل' },
  { id: 'beauty', name: 'تجميل' },
  { id: 'sports', name: 'رياضة' },
  { id: 'books', name: 'كتب' },
  { id: 'toys', name: 'ألعاب' },
  { id: 'food', name: 'طعام' },
  { id: 'health', name: 'صحة' },
  { id: 'cars', name: 'سيارات' },
];

const SellerDiscountsTab = ({ products = [] }) => {
  const { toast } = useToast();
  const [discounts, setDiscounts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  
  // Form state
  const [form, setForm] = useState({
    name: '',
    discount_type: 'percentage',
    discount_value: '',
    code: '',
    applies_to: 'all',
    product_ids: [],
    category: '',
    min_order_amount: '',
    max_uses: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      const [discountsRes, statsRes] = await Promise.all([
        axios.get(`${API}/api/discounts/my-discounts`),
        axios.get(`${API}/api/discounts/my-stats`)
      ]);
      setDiscounts(discountsRes.data);
      setStats(statsRes.data);
    } catch (error) {
      logger.error('Error fetching discounts:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateDiscount = async () => {
    if (!form.name || !form.discount_value) {
      toast({
        title: "خطأ",
        description: "يرجى ملء الحقول المطلوبة",
        variant: "destructive"
      });
      return;
    }
    
    setCreating(true);
    try {
      await axios.post(`${API}/api/discounts/create`, {
        ...form,
        discount_value: parseFloat(form.discount_value),
        min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : 0,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        code: form.code || null
      });
      
      toast({
        title: "تم إنشاء العرض",
        description: "العرض الآن نشط ويمكن للعملاء الاستفادة منه"
      });
      
      setShowCreateModal(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل إنشاء العرض",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };
  
  const resetForm = () => {
    setForm({
      name: '',
      discount_type: 'percentage',
      discount_value: '',
      code: '',
      applies_to: 'all',
      product_ids: [],
      category: '',
      min_order_amount: '',
      max_uses: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
  };
  
  const toggleDiscount = async (discountId) => {
    try {
      const res = await axios.put(`${API}/api/discounts/${discountId}/toggle`);
      toast({
        title: res.data.is_active ? "تم التفعيل" : "تم الإيقاف",
        description: res.data.is_active ? "العرض نشط الآن" : "تم إيقاف العرض"
      });
      fetchData();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل تحديث الحالة",
        variant: "destructive"
      });
    }
  };
  
  const deleteDiscount = async (discountId) => {
    if (!window.confirm('هل تريد حذف هذا العرض؟')) return;
    
    try {
      await axios.delete(`${API}/api/discounts/${discountId}`);
      toast({
        title: "تم الحذف",
        description: "تم حذف العرض بنجاح"
      });
      fetchData();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل حذف العرض",
        variant: "destructive"
      });
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#FF6B00]" />
      </div>
    );
  }
  
  const approvedProducts = products.filter(p => p.approval_status === 'approved');
  
  return (
    <section className="space-y-4" data-testid="seller-discounts-tab">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift size={20} className="text-[#FF6B00]" />
          <h2 className="font-bold text-gray-900">العروض والخصومات</h2>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1 bg-[#FF6B00] text-white px-3 py-1.5 rounded-full text-xs font-bold"
          data-testid="create-discount-btn"
        >
          <Plus size={14} />
          عرض جديد
        </button>
      </div>
      
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: Gift, label: 'إجمالي العروض', value: stats.total_discounts, color: 'bg-purple-50 text-purple-600' },
            { icon: CheckCircle, label: 'عروض نشطة', value: stats.active_discounts, color: 'bg-green-50 text-green-600' },
            { icon: Users, label: 'مرات الاستخدام', value: stats.total_uses, color: 'bg-blue-50 text-blue-600' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl p-3 border border-gray-200">
              <div className={`w-7 h-7 rounded-lg ${stat.color} flex items-center justify-center mb-1.5`}>
                <stat.icon size={14} />
              </div>
              <p className="text-lg font-bold text-gray-900">{stat.value}</p>
              <p className="text-[10px] text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>
      )}
      
      {/* Discounts List */}
      {discounts.length === 0 ? (
        <div className="bg-orange-50 rounded-xl p-8 text-center border border-orange-200">
          <Gift size={40} className="text-orange-300 mx-auto mb-3" />
          <h3 className="font-bold text-orange-700 mb-1">لا توجد عروض</h3>
          <p className="text-orange-500 text-sm mb-4">أنشئ عرضك الأول لجذب المزيد من العملاء</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#FF6B00] text-white px-4 py-2 rounded-full text-sm font-bold"
          >
            إنشاء عرض
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {discounts.map((discount) => {
            const isExpired = new Date(discount.end_date) < new Date();
            const isActive = discount.is_active && !isExpired;
            
            return (
              <motion.div
                key={discount.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`bg-white rounded-xl border overflow-hidden ${
                  isActive ? 'border-green-200' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3 p-3">
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    isActive ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {discount.discount_type === 'percentage' ? (
                      <Percent size={20} className={isActive ? 'text-green-600' : 'text-gray-400'} />
                    ) : (
                      <DollarSign size={20} className={isActive ? 'text-green-600' : 'text-gray-400'} />
                    )}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-sm text-gray-900">{discount.name}</h3>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                        isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {isExpired ? 'منتهي' : isActive ? 'نشط' : 'متوقف'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-[10px] text-gray-500 flex-wrap">
                      <span className="text-[#FF6B00] font-bold">
                        {discount.discount_type === 'percentage' 
                          ? `${discount.discount_value}%` 
                          : formatPrice(discount.discount_value)}
                      </span>
                      
                      {discount.code && (
                        <span className="bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                          {discount.code}
                        </span>
                      )}
                      
                      <span className="flex items-center gap-1">
                        <Users size={10} />
                        {discount.used_count || 0} استخدام
                        {discount.max_uses && ` / ${discount.max_uses}`}
                      </span>
                      
                      <span className="flex items-center gap-1">
                        <Calendar size={10} />
                        {formatDate(discount.end_date)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleDiscount(discount.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                          : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                      title={isActive ? 'إيقاف' : 'تفعيل'}
                    >
                      {isActive ? <Eye size={16} /> : <EyeOff size={16} />}
                    </button>
                    <button
                      onClick={() => deleteDiscount(discount.id)}
                      className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                      title="حذف"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
      
      {/* Create Discount Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Gift size={18} className="text-[#FF6B00]" />
                إنشاء عرض جديد
              </h2>
              <button 
                onClick={() => { setShowCreateModal(false); resetForm(); }}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">اسم العرض *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({...form, name: e.target.value})}
                  placeholder="مثال: خصم الصيف"
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:border-[#FF6B00] focus:outline-none"
                />
              </div>
              
              {/* Discount Type & Value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نوع الخصم</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setForm({...form, discount_type: 'percentage'})}
                      className={`flex-1 p-2 rounded-xl border-2 flex items-center justify-center gap-1 text-xs font-medium transition-all ${
                        form.discount_type === 'percentage'
                          ? 'border-[#FF6B00] bg-orange-50 text-[#FF6B00]'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      <Percent size={14} />
                      نسبة %
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({...form, discount_type: 'fixed'})}
                      className={`flex-1 p-2 rounded-xl border-2 flex items-center justify-center gap-1 text-xs font-medium transition-all ${
                        form.discount_type === 'fixed'
                          ? 'border-[#FF6B00] bg-orange-50 text-[#FF6B00]'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      <DollarSign size={14} />
                      مبلغ ثابت
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    قيمة الخصم *
                  </label>
                  <input
                    type="number"
                    value={form.discount_value}
                    onChange={(e) => setForm({...form, discount_value: e.target.value})}
                    placeholder={form.discount_type === 'percentage' ? '15' : '5000'}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:border-[#FF6B00] focus:outline-none text-left"
                  />
                </div>
              </div>
              
              {/* Coupon Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  كود الخصم <span className="text-gray-400">(اختياري)</span>
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm({...form, code: e.target.value.toUpperCase()})}
                  placeholder="مثال: SUMMER20"
                  className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:border-[#FF6B00] focus:outline-none text-left font-mono"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  إذا تركته فارغاً، سيُطبق الخصم تلقائياً على المنتجات
                </p>
              </div>
              
              {/* Applies To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ينطبق على</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'all', label: 'كل المنتجات', icon: Package },
                    { value: 'specific_products', label: 'منتجات محددة', icon: Tag },
                    { value: 'category', label: 'فئة معينة', icon: Gift },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setForm({...form, applies_to: option.value, product_ids: [], category: ''})}
                      className={`p-2 rounded-xl border-2 flex flex-col items-center gap-1 text-[10px] font-medium transition-all ${
                        form.applies_to === option.value
                          ? 'border-[#FF6B00] bg-orange-50 text-[#FF6B00]'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      <option.icon size={16} />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Specific Products */}
              {form.applies_to === 'specific_products' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اختر المنتجات</label>
                  <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-xl p-2 space-y-1">
                    {approvedProducts.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-2">لا توجد منتجات معتمدة</p>
                    ) : (
                      approvedProducts.map((product) => (
                        <label key={product.id} className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.product_ids.includes(product.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setForm({...form, product_ids: [...form.product_ids, product.id]});
                              } else {
                                setForm({...form, product_ids: form.product_ids.filter(id => id !== product.id)});
                              }
                            }}
                            className="rounded border-gray-300 text-[#FF6B00] focus:ring-[#FF6B00]"
                          />
                          <span className="text-xs text-gray-700 truncate">{product.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
              
              {/* Category */}
              {form.applies_to === 'category' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اختر الفئة</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({...form, category: e.target.value})}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:border-[#FF6B00] focus:outline-none"
                  >
                    <option value="">-- اختر فئة --</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              )}
              
              {/* Min Order & Max Uses */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأدنى للطلب</label>
                  <input
                    type="number"
                    value={form.min_order_amount}
                    onChange={(e) => setForm({...form, min_order_amount: e.target.value})}
                    placeholder="0"
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:border-[#FF6B00] focus:outline-none text-left"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأقصى للاستخدام</label>
                  <input
                    type="number"
                    value={form.max_uses}
                    onChange={(e) => setForm({...form, max_uses: e.target.value})}
                    placeholder="غير محدود"
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:border-[#FF6B00] focus:outline-none text-left"
                  />
                </div>
              </div>
              
              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ البداية</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) => setForm({...form, start_date: e.target.value})}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:border-[#FF6B00] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ النهاية</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({...form, end_date: e.target.value})}
                    className="w-full p-2.5 border border-gray-300 rounded-xl text-sm focus:border-[#FF6B00] focus:outline-none"
                  />
                </div>
              </div>
              
              {/* Submit Button */}
              <button
                onClick={handleCreateDiscount}
                disabled={creating || !form.name || !form.discount_value}
                className="w-full bg-[#FF6B00] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                data-testid="submit-create-discount"
              >
                {creating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    جاري الإنشاء...
                  </>
                ) : (
                  <>
                    <Gift size={18} />
                    إنشاء العرض
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </section>
  );
};

export default SellerDiscountsTab;
