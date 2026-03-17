// /app/frontend/src/components/admin/CategoriesTab.js
// إدارة الفئات الديناميكية

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Edit2, Trash2, ToggleLeft, ToggleRight, GripVertical,
  Smartphone, Laptop, Shirt, Footprints, Watch, Sparkles, Home,
  Sofa, SprayCan, Dumbbell, Gamepad2, BookOpen, Gift, Pill, Car,
  UtensilsCrossed, Coffee, Cake, ShoppingBasket, Apple, GlassWater,
  ShoppingCart, Package, X, Save, Croissant, Refrigerator
} from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const API = process.env.REACT_APP_BACKEND_URL;

// خريطة الأيقونات
const ICON_MAP = {
  Smartphone, Laptop, Shirt, Footprints, Watch, Sparkles, Home,
  Sofa, SprayCan, Dumbbell, Gamepad2, BookOpen, Gift, Pill, Car,
  UtensilsCrossed, Coffee, Cake, ShoppingBasket, Apple, GlassWater,
  ShoppingCart, Package, Croissant, Refrigerator
};

const AVAILABLE_ICONS = Object.keys(ICON_MAP);

const CategoriesTab = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeType, setActiveType] = useState('shopping');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    name_en: '',
    icon: 'Package',
    type: 'shopping',
    color: '#FF6B00',
    order: 0,
    is_active: true
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/api/categories?active_only=false`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(res.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
      toast({ title: 'خطأ', description: 'فشل في جلب الفئات', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (editingCategory) {
        await axios.put(`${API}/api/categories/${editingCategory.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast({ title: 'نجاح', description: 'تم تحديث الفئة بنجاح' });
      } else {
        await axios.post(`${API}/api/categories`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast({ title: 'نجاح', description: 'تم إنشاء الفئة بنجاح' });
      }
      fetchCategories();
      closeModal();
    } catch (err) {
      toast({ title: 'خطأ', description: err.response?.data?.detail || 'فشل في حفظ الفئة', variant: 'destructive' });
    }
  };

  const handleDelete = async (categoryId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الفئة؟')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/api/categories/${categoryId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: 'نجاح', description: 'تم حذف الفئة بنجاح' });
      fetchCategories();
    } catch (err) {
      toast({ title: 'خطأ', description: err.response?.data?.detail || 'فشل في حذف الفئة', variant: 'destructive' });
    }
  };

  const handleToggle = async (categoryId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/api/categories/${categoryId}/toggle`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCategories();
    } catch (err) {
      toast({ title: 'خطأ', description: 'فشل في تغيير حالة الفئة', variant: 'destructive' });
    }
  };

  const openAddModal = (type) => {
    setFormData({
      name: '',
      name_en: '',
      icon: 'Package',
      type: type,
      color: '#FF6B00',
      order: categories.filter(c => c.type === type).length + 1,
      is_active: true
    });
    setEditingCategory(null);
    setShowAddModal(true);
  };

  const openEditModal = (category) => {
    setFormData({
      name: category.name,
      name_en: category.name_en || '',
      icon: category.icon,
      type: category.type,
      color: category.color || '#FF6B00',
      order: category.order || 0,
      is_active: category.is_active
    });
    setEditingCategory(category);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      name_en: '',
      icon: 'Package',
      type: 'shopping',
      color: '#FF6B00',
      order: 0,
      is_active: true
    });
  };

  const filteredCategories = categories.filter(c => c.type === activeType).sort((a, b) => a.order - b.order);

  const IconComponent = ({ name, size = 20, className = "" }) => {
    const Icon = ICON_MAP[name] || Package;
    return <Icon size={size} className={className} />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">إدارة الفئات</h2>
          <p className="text-sm text-gray-500">إضافة وتعديل وحذف فئات المنتجات والطعام</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveType('shopping')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeType === 'shopping'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          فئات التسوق ({categories.filter(c => c.type === 'shopping').length})
        </button>
        <button
          onClick={() => setActiveType('food')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeType === 'food'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          فئات الطعام ({categories.filter(c => c.type === 'food').length})
        </button>
      </div>

      {/* Add Button */}
      <button
        onClick={() => openAddModal(activeType)}
        className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
      >
        <Plus size={18} />
        إضافة فئة جديدة
      </button>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((category, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`bg-white rounded-xl border-2 p-4 ${
              category.is_active ? 'border-gray-200' : 'border-red-200 bg-red-50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: category.color + '20' }}
                >
                  <IconComponent name={category.icon} size={24} style={{ color: category.color }} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{category.name}</h3>
                  <p className="text-xs text-gray-500">{category.name_en || category.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleToggle(category.id)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    category.is_active
                      ? 'text-green-600 hover:bg-green-50'
                      : 'text-red-600 hover:bg-red-50'
                  }`}
                  title={category.is_active ? 'تعطيل' : 'تفعيل'}
                >
                  {category.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                </button>
                <button
                  onClick={() => openEditModal(category)}
                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="تعديل"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(category.id)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="حذف"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
              <span className="px-2 py-0.5 bg-gray-100 rounded">الترتيب: {category.order}</span>
              <span
                className="px-2 py-0.5 rounded"
                style={{ backgroundColor: category.color + '20', color: category.color }}
              >
                {category.is_active ? 'مفعّل' : 'معطّل'}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">
                  {editingCategory ? 'تعديل الفئة' : 'إضافة فئة جديدة'}
                </h3>
                <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-full">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    اسم الفئة (عربي) *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    اسم الفئة (إنجليزي)
                  </label>
                  <input
                    type="text"
                    value={formData.name_en}
                    onChange={e => setFormData({ ...formData, name_en: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="Electronics"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الأيقونة
                  </label>
                  <div className="grid grid-cols-6 gap-2 p-3 border rounded-lg max-h-40 overflow-y-auto">
                    {AVAILABLE_ICONS.map(iconName => (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: iconName })}
                        className={`p-2 rounded-lg transition-colors ${
                          formData.icon === iconName
                            ? 'bg-orange-100 text-orange-600 ring-2 ring-orange-500'
                            : 'hover:bg-gray-100'
                        }`}
                        title={iconName}
                      >
                        <IconComponent name={iconName} size={20} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    اللون
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={e => setFormData({ ...formData, color: e.target.value })}
                      className="w-12 h-10 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={e => setFormData({ ...formData, color: e.target.value })}
                      className="flex-1 px-4 py-2 border rounded-lg"
                      placeholder="#FF6B00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    النوع
                  </label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  >
                    <option value="shopping">تسوق</option>
                    <option value="food">طعام</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الترتيب
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                    min="0"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">
                    الفئة مفعّلة
                  </label>
                </div>

                {/* Preview */}
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-2">معاينة:</p>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: formData.color + '20' }}
                    >
                      <IconComponent name={formData.icon} size={24} style={{ color: formData.color }} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{formData.name || 'اسم الفئة'}</h3>
                      <p className="text-xs text-gray-500">{formData.name_en || 'Category'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center justify-center gap-2"
                  >
                    <Save size={18} />
                    {editingCategory ? 'تحديث' : 'إنشاء'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CategoriesTab;
