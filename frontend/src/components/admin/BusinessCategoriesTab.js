// /app/frontend/src/components/admin/BusinessCategoriesTab.js
// تبويب إدارة أصناف الأنشطة التجارية

import { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Edit2, Trash2, Save, X, Loader2, 
  Store, UtensilsCrossed, GripVertical, ToggleLeft, ToggleRight,
  RefreshCw
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../context/AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;

// الأيقونات المتاحة للاختيار
const AVAILABLE_ICONS = [
  '👕', '📱', '🏠', '💄', '🛋️', '🎁', '📚', '⚽', '🚗', '📦',
  '🍽️', '☕', '🍰', '🥖', '🍔', '🧃', '🛒', '🥩', '🥬', '🍴',
  '💊', '🎨', '🎵', '💻', '🔧', '🌸', '🧸', '👶', '🐕', '🏪'
];

const BusinessCategoriesTab = () => {
  const { token } = useAuth();
  const { toast } = useToast();
  
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('seller'); // seller أو food_seller
  
  // حالة النموذج
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    icon: '🏪',
    description: '',
    is_active: true,
    order: 0
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/api/settings/business-categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(res.data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({
        title: "خطأ",
        description: "فشل في جلب الأصناف",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const initDefaults = async () => {
    try {
      setSaving(true);
      await axios.post(`${API}/api/settings/business-categories/init-defaults`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: "تم", description: "تم إنشاء الأصناف الافتراضية" });
      fetchCategories();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل في إنشاء الأصناف",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: "خطأ", description: "يرجى إدخال اسم الصنف", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      
      if (editingCategory) {
        // تحديث
        await axios.put(
          `${API}/api/settings/business-categories/${editingCategory.id}`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast({ title: "تم", description: "تم تحديث الصنف بنجاح" });
      } else {
        // إنشاء جديد
        await axios.post(
          `${API}/api/settings/business-categories`,
          { ...formData, type: activeTab },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        toast({ title: "تم", description: "تم إنشاء الصنف بنجاح" });
      }
      
      resetForm();
      fetchCategories();
    } catch (error) {
      toast({
        title: "خطأ",
        description: error.response?.data?.detail || "فشل في حفظ الصنف",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (categoryId) => {
    if (!confirm('هل أنت متأكد من حذف هذا الصنف؟')) return;
    
    try {
      await axios.delete(`${API}/api/settings/business-categories/${categoryId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: "تم", description: "تم حذف الصنف" });
      fetchCategories();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في حذف الصنف",
        variant: "destructive"
      });
    }
  };

  const toggleActive = async (category) => {
    try {
      await axios.put(
        `${API}/api/settings/business-categories/${category.id}`,
        { is_active: !category.is_active },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchCategories();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل في تحديث الحالة",
        variant: "destructive"
      });
    }
  };

  const startEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      icon: category.icon,
      description: category.description || '',
      is_active: category.is_active,
      order: category.order || 0
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      icon: '🏪',
      description: '',
      is_active: true,
      order: 0
    });
  };

  // فلترة الأصناف حسب النوع
  const filteredCategories = categories.filter(c => c.type === activeTab);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">أصناف الأنشطة التجارية</h2>
          <p className="text-sm text-gray-500">إدارة أصناف البائعين وبائعي الطعام</p>
        </div>
        <div className="flex gap-2">
          {categories.length === 0 && (
            <button
              onClick={initDefaults}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <RefreshCw size={18} className={saving ? 'animate-spin' : ''} />
              تهيئة الأصناف الافتراضية
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] text-white rounded-lg hover:bg-[#E65000] transition-colors"
          >
            <Plus size={18} />
            إضافة صنف
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('seller')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'seller'
              ? 'bg-white text-[#FF6B00] shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Store size={18} />
          بائعي المنتجات
        </button>
        <button
          onClick={() => setActiveTab('food_seller')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'food_seller'
              ? 'bg-white text-[#FF6B00] shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <UtensilsCrossed size={18} />
          بائعي الطعام
        </button>
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && resetForm()}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">
                  {editingCategory ? 'تعديل الصنف' : 'إضافة صنف جديد'}
                </h3>
                <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* اسم الصنف */}
                <div>
                  <label className="block text-sm font-medium mb-1">اسم الصنف</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                    placeholder="مثال: ملابس وأزياء"
                    required
                  />
                </div>

                {/* اختيار الأيقونة */}
                <div>
                  <label className="block text-sm font-medium mb-1">الأيقونة</label>
                  <div className="grid grid-cols-10 gap-2 p-2 bg-gray-50 rounded-lg max-h-32 overflow-y-auto">
                    {AVAILABLE_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon })}
                        className={`text-2xl p-2 rounded-lg transition-colors ${
                          formData.icon === icon
                            ? 'bg-[#FF6B00]/10 ring-2 ring-[#FF6B00]'
                            : 'hover:bg-gray-200'
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* الوصف */}
                <div>
                  <label className="block text-sm font-medium mb-1">الوصف (اختياري)</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                    placeholder="وصف مختصر للصنف"
                  />
                </div>

                {/* الترتيب */}
                <div>
                  <label className="block text-sm font-medium mb-1">الترتيب</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/20 focus:border-[#FF6B00]"
                    min="0"
                  />
                </div>

                {/* الحالة */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">نشط</label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                    className={`p-1 rounded-full transition-colors ${
                      formData.is_active ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    {formData.is_active ? (
                      <ToggleRight size={28} className="text-white" />
                    ) : (
                      <ToggleLeft size={28} className="text-white" />
                    )}
                  </button>
                </div>

                {/* الأزرار */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#FF6B00] text-white py-3 rounded-lg font-medium hover:bg-[#E65000] disabled:opacity-50 transition-colors"
                  >
                    {saving ? (
                      <Loader2 className="animate-spin" size={18} />
                    ) : (
                      <Save size={18} />
                    )}
                    {editingCategory ? 'تحديث' : 'إضافة'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories List */}
      {filteredCategories.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-gray-500">لا توجد أصناف لـ {activeTab === 'seller' ? 'بائعي المنتجات' : 'بائعي الطعام'}</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 text-[#FF6B00] font-medium hover:underline"
          >
            إضافة صنف جديد
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredCategories
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((category) => (
              <motion.div
                key={category.id}
                layout
                className={`flex items-center gap-4 p-4 bg-white border rounded-xl transition-colors ${
                  category.is_active ? 'border-gray-200' : 'border-red-200 bg-red-50/30'
                }`}
              >
                {/* Drag Handle */}
                <div className="text-gray-400 cursor-grab">
                  <GripVertical size={20} />
                </div>

                {/* Icon & Name */}
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-3xl">{category.icon}</span>
                  <div>
                    <p className="font-medium text-gray-900">{category.name}</p>
                    {category.description && (
                      <p className="text-xs text-gray-500">{category.description}</p>
                    )}
                  </div>
                </div>

                {/* Order */}
                <div className="text-sm text-gray-400">
                  #{category.order || 0}
                </div>

                {/* Status Toggle */}
                <button
                  onClick={() => toggleActive(category)}
                  className={`p-1 rounded-full transition-colors ${
                    category.is_active ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                  title={category.is_active ? 'نشط' : 'غير نشط'}
                >
                  {category.is_active ? (
                    <ToggleRight size={24} className="text-white" />
                  ) : (
                    <ToggleLeft size={24} className="text-white" />
                  )}
                </button>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(category)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="تعديل"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(category.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="حذف"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
        </div>
      )}
    </div>
  );
};

export default BusinessCategoriesTab;
