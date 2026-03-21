// /app/frontend/src/components/admin/DailyDealsTab.js
// إدارة صفقات اليوم - لوحة المدير

import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { 
  Flame, Plus, Trash2, Edit2, Clock, Package, 
  Calendar, Percent, X, Check, Zap, ChevronDown, Bell
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

const formatPrice = (price) => {
  return new Intl.NumberFormat('ar-SY').format(price) + ' ل.س';
};

const formatDate = (date) => {
  return new Date(date).toLocaleString('ar-SY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const DailyDealsTab = () => {
  const { toast } = useToast();
  const [deals, setDeals] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, dealId: null, title: '' });
  const [form, setForm] = useState({
    title: '',
    description: '',
    discount_percentage: 30,
    start_time: '',
    end_time: '',
    product_ids: [],
    background_color: '#FF6B00',
    send_notification: true
  });

  useEffect(() => {
    fetchDeals();
    fetchProducts();
  }, []);

  const fetchDeals = async () => {
    try {
      const response = await axios.get(`${API}/api/daily-deals/admin/all`);
      setDeals(response.data.deals || []);
    } catch (error) {
      console.error('Error fetching deals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      // جلب المنتجات للأدمن (جميع المنتجات بما فيها غير المعتمدة)
      const response = await axios.get(`${API}/api/admin/products/all`);
      setProducts(response.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      // محاولة جلب من المسار العادي كبديل
      try {
        const fallbackRes = await axios.get(`${API}/api/products?limit=100`);
        setProducts(fallbackRes.data.products || []);
      } catch (e) {
        console.error('Fallback fetch also failed:', e);
      }
    }
  };

  const openModal = (deal = null) => {
    if (deal) {
      setEditingDeal(deal);
      setForm({
        title: deal.title,
        description: deal.description || '',
        discount_percentage: deal.discount_percentage,
        start_time: deal.start_time?.slice(0, 16) || '',
        end_time: deal.end_time?.slice(0, 16) || '',
        product_ids: deal.product_ids || [],
        background_color: deal.background_color || '#FF6B00',
        send_notification: false
      });
    } else {
      setEditingDeal(null);
      const now = new Date();
      const end = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      setForm({
        title: '',
        description: 'عرض خاص لمدة 24 ساعة فقط!',
        discount_percentage: 30,
        start_time: now.toISOString().slice(0, 16),
        end_time: end.toISOString().slice(0, 16),
        product_ids: [],
        background_color: '#FF6B00',
        send_notification: true
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.title) {
      toast({ title: "خطأ", description: "العنوان مطلوب", variant: "destructive" });
      return;
    }
    if (form.product_ids.length === 0) {
      toast({ title: "خطأ", description: "اختر منتج واحد على الأقل", variant: "destructive" });
      return;
    }

    try {
      const payload = {
        ...form,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString()
      };

      if (editingDeal) {
        await axios.put(`${API}/api/daily-deals/admin/${editingDeal.id}`, payload);
        toast({ title: "تم التحديث", description: "تم تحديث صفقة اليوم" });
      } else {
        await axios.post(`${API}/api/daily-deals/admin/create`, payload);
        toast({ title: "تم الإنشاء", description: "تم إنشاء صفقة اليوم" });
      }

      setShowModal(false);
      fetchDeals();
    } catch (error) {
      toast({ 
        title: "خطأ", 
        description: error.response?.data?.detail || "فشلت العملية", 
        variant: "destructive" 
      });
    }
  };

  const handleQuickCreate = async () => {
    if (form.product_ids.length === 0) {
      toast({ title: "خطأ", description: "اختر منتج واحد على الأقل", variant: "destructive" });
      return;
    }

    try {
      await axios.post(`${API}/api/daily-deals/admin/quick-create`, {
        title: form.title || 'صفقة اليوم',
        discount_percentage: form.discount_percentage,
        product_ids: form.product_ids,
        background_color: form.background_color
      });
      toast({ title: "تم", description: "تم إنشاء صفقة 24 ساعة" });
      setShowModal(false);
      fetchDeals();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل الإنشاء", variant: "destructive" });
    }
  };

  const deleteDeal = async () => {
    if (!deleteModal.dealId) return;

    try {
      await axios.delete(`${API}/api/daily-deals/admin/${deleteModal.dealId}`);
      toast({ title: "تم الحذف", description: "تم حذف الصفقة" });
      setDeleteModal({ isOpen: false, dealId: null, title: '' });
      fetchDeals();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل الحذف", variant: "destructive" });
    }
  };

  const toggleProduct = (productId) => {
    setForm(prev => ({
      ...prev,
      product_ids: prev.product_ids.includes(productId)
        ? prev.product_ids.filter(id => id !== productId)
        : [...prev.product_ids, productId]
    }));
  };

  const isActive = (deal) => {
    const now = new Date();
    return new Date(deal.start_time) <= now && new Date(deal.end_time) > now && deal.is_active;
  };

  const COLORS = [
    '#FF6B00', '#E91E63', '#9C27B0', '#673AB7', 
    '#3F51B5', '#2196F3', '#00BCD4', '#009688',
    '#4CAF50', '#8BC34A', '#FF9800', '#FF5722'
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center">
            <Flame size={20} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">صفقات اليوم</h2>
            <p className="text-xs text-gray-500">{deals.length} صفقة</p>
          </div>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
          data-testid="create-daily-deal-btn"
        >
          <Plus size={18} />
          صفقة جديدة
        </button>
      </div>

      {/* Deals List */}
      {deals.length === 0 ? (
        <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
          <Flame size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">لا توجد صفقات يومية</p>
          <p className="text-gray-400 text-sm mt-1">أنشئ صفقة جديدة لجذب المزيد من المشترين</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deals.map((deal) => (
            <motion.div
              key={deal.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            >
              <div 
                className="h-2" 
                style={{ backgroundColor: deal.background_color || '#FF6B00' }}
              />
              <div className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900">{deal.title}</h3>
                      {isActive(deal) && (
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                          نشط الآن
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{deal.description}</p>
                    
                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Percent size={14} className="text-orange-500" />
                        خصم {deal.discount_percentage}%
                      </span>
                      <span className="flex items-center gap-1">
                        <Package size={14} />
                        {deal.product_ids?.length || 0} منتج
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {formatDate(deal.start_time)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={14} />
                        حتى {formatDate(deal.end_time)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => openModal(deal)}
                      className="p-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      data-testid={`edit-deal-${deal.id}`}
                    >
                      <Edit2 size={16} className="text-gray-600" />
                    </button>
                    <button
                      onClick={() => setDeleteModal({ isOpen: true, dealId: deal.id, title: deal.title })}
                      className="p-2 bg-red-100 rounded-lg hover:bg-red-200 transition-colors"
                      data-testid={`delete-deal-${deal.id}`}
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-hidden"
          >
            {/* Modal Header */}
            <div 
              className="p-3 text-white"
              style={{ background: `linear-gradient(135deg, ${form.background_color}, ${form.background_color}dd)` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Flame size={24} />
                  <h2 className="font-bold text-sm">
                    {editingDeal ? 'تعديل الصفقة' : 'صفقة يوم جديدة'}
                  </h2>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-3">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="صفقة اليوم الخاصة"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  data-testid="deal-title-input"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="عرض خاص لمدة محدودة"
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Discount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  نسبة الخصم: {form.discount_percentage}%
                </label>
                <input
                  type="range"
                  min="5"
                  max="90"
                  step="5"
                  value={form.discount_percentage}
                  onChange={(e) => setForm({ ...form, discount_percentage: parseInt(e.target.value) })}
                  className="w-full accent-orange-500"
                  data-testid="deal-discount-input"
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>5%</span>
                  <span>90%</span>
                </div>
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">وقت البدء</label>
                  <input
                    type="datetime-local"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">وقت الانتهاء</label>
                  <input
                    type="datetime-local"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">لون الخلفية</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setForm({ ...form, background_color: color })}
                      className={`w-8 h-8 rounded-lg transition-transform ${
                        form.background_color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              {/* Products */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    المنتجات المشاركة ({form.product_ids.length})
                  </label>
                  <button
                    onClick={() => setShowProductSelector(!showProductSelector)}
                    className="text-orange-500 text-sm flex items-center gap-1"
                  >
                    {showProductSelector ? 'إخفاء' : 'اختيار المنتجات'}
                    <ChevronDown size={16} className={showProductSelector ? 'rotate-180' : ''} />
                  </button>
                </div>
                
                {showProductSelector && (
                  <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                    {products.map((product) => (
                      <label
                        key={product.id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                      >
                        <input
                          type="checkbox"
                          checked={form.product_ids.includes(product.id)}
                          onChange={() => toggleProduct(product.id)}
                          className="w-4 h-4 text-orange-500 rounded"
                        />
                        <img
                          src={product.images?.[0] || 'https://via.placeholder.com/40'}
                          alt={product.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 line-clamp-1">{product.name}</p>
                          <p className="text-xs text-gray-500">{formatPrice(product.price)}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {/* Selected Products Preview */}
                {form.product_ids.length > 0 && !showProductSelector && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.product_ids.map((id) => {
                      const product = products.find(p => p.id === id);
                      return product ? (
                        <div key={id} className="flex items-center gap-2 bg-orange-50 rounded-lg px-2 py-1">
                          <img
                            src={product.images?.[0] || 'https://via.placeholder.com/24'}
                            alt={product.name}
                            className="w-6 h-6 rounded object-cover"
                          />
                          <span className="text-xs text-gray-700 max-w-20 truncate">{product.name}</span>
                          <button
                            onClick={() => toggleProduct(id)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              {/* Send Notification Toggle */}
              {!editingDeal && (
                <div className="flex items-center justify-between bg-blue-50 rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Bell size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">إرسال إشعار للمستخدمين</p>
                      <p className="text-xs text-gray-500">سيتم إشعار جميع المستخدمين بالصفقة الجديدة</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.send_notification}
                      onChange={(e) => setForm({ ...form, send_notification: e.target.checked })}
                      className="sr-only peer"
                      data-testid="send-notification-toggle"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg font-medium text-gray-700 hover:bg-gray-50"
              >
                إلغاء
              </button>
              {!editingDeal && (
                <button
                  onClick={handleQuickCreate}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-500 text-white rounded-lg font-bold hover:bg-purple-600"
                  data-testid="quick-create-deal-btn"
                >
                  <Zap size={18} />
                  24 ساعة
                </button>
              )}
              <button
                onClick={handleSubmit}
                className="flex-1 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-bold hover:opacity-90 flex items-center justify-center gap-2"
                data-testid="submit-deal-btn"
              >
                <Check size={18} />
                {editingDeal ? 'تحديث' : 'إنشاء'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-sm p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-bold">حذف الصفقة</h3>
                <p className="text-xs text-gray-500">{deleteModal.title}</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              هل تريد حذف هذه الصفقة؟ لا يمكن التراجع عن هذا الإجراء.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setDeleteModal({ isOpen: false, dealId: null, title: '' })}
                className="flex-1 py-2 border border-gray-300 rounded-lg text-sm"
              >
                إلغاء
              </button>
              <button
                onClick={deleteDeal}
                className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyDealsTab;
