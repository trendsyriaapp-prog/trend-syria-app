// /app/frontend/src/components/admin/FoodOffersTab.js
// تبويب إدارة عروض الطعام وعروض الفلاش

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Gift, Zap, Plus, Edit, Trash2, Check, X, Clock, 
  Store, Percent, Search, Filter, ToggleLeft, ToggleRight
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FoodOffersTab = ({ token }) => {
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('offers'); // offers, flash
  const [offers, setOffers] = useState([]);
  const [flashSales, setFlashSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showFlashModal, setShowFlashModal] = useState(false);
  const [editingFlash, setEditingFlash] = useState(null);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const [offersRes, flashRes] = await Promise.all([
        axios.get(`${API}/admin/food-offers`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API}/admin/flash-sales`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setOffers(offersRes.data || []);
      setFlashSales(flashRes.data || []);
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
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveSection('offers')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-all ${
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
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-medium transition-all ${
            activeSection === 'flash'
              ? 'bg-white text-orange-600 shadow'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Zap size={18} />
          عروض الفلاش ({flashSales.length})
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
                        الفئات: {flash.applicable_categories?.length > 0 
                          ? flash.applicable_categories.join(', ') 
                          : 'جميع الفئات'}
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

// Flash Sale Modal
const FlashSaleModal = ({ flash, token, onClose, onSave }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: flash?.name || '',
    description: flash?.description || '',
    discount_percentage: flash?.discount_percentage || 20,
    start_time: flash?.start_time ? flash.start_time.slice(0, 16) : '',
    end_time: flash?.end_time ? flash.end_time.slice(0, 16) : '',
    applicable_categories: flash?.applicable_categories || [],
    banner_color: flash?.banner_color || '#FF4500',
    is_active: flash?.is_active !== false,
  });
  const [saving, setSaving] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.start_time || !formData.end_time) {
      toast({ title: "تنبيه", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
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
            <label className="block text-sm font-medium text-gray-700 mb-2">الفئات المشمولة</label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, applicable_categories: [] })}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  formData.applicable_categories.length === 0
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                جميع الفئات
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    formData.applicable_categories.includes(cat.id)
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
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
