// /app/frontend/src/pages/FoodStoreDashboard.js
// لوحة تحكم متجر الطعام

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { 
  Store, Package, ShoppingBag, Plus, Edit, Trash2, 
  Clock, DollarSign, Star, TrendingUp, Eye, EyeOff,
  Image, Save, X, ChevronRight, AlertTriangle, Check, 
  ChefHat, Truck, Phone, MapPin
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FoodStoreDashboard = () => {
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const { toast } = useToast();

  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    if (token) {
      fetchStoreData();
    }
  }, [token]);

  const fetchStoreData = async () => {
    try {
      const res = await axios.get(`${API}/food/my-store`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStore(res.data.store);
      setProducts(res.data.products || []);
    } catch (error) {
      if (error.response?.status === 404) {
        // No store found
        setStore(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('هل تريد حذف هذا المنتج؟')) return;
    
    try {
      await axios.delete(`${API}/food/products/${productId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: "تم الحذف", description: "تم حذف المنتج بنجاح" });
      fetchStoreData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حذف المنتج", variant: "destructive" });
    }
  };

  const handleToggleAvailability = async (productId, currentStatus) => {
    try {
      await axios.patch(`${API}/food/products/${productId}`, 
        { is_available: !currentStatus },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      fetchStoreData();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل تحديث حالة المنتج", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // No store - redirect to registration
  if (!store) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md w-full shadow-lg">
          <Store size={48} className="mx-auto text-green-500 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">ليس لديك متجر طعام</h2>
          <p className="text-gray-600 mb-6">أنشئ متجرك الآن وابدأ ببيع منتجاتك</p>
          <button
            onClick={() => navigate('/join/food-seller')}
            className="w-full bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600"
          >
            إنشاء متجر طعام
          </button>
        </div>
      </div>
    );
  }

  // Store not approved
  if (!store.is_approved) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 text-center max-w-md w-full shadow-lg">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock size={32} className="text-yellow-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">متجرك قيد المراجعة</h2>
          <p className="text-gray-600 mb-4">
            طلبك لإنشاء متجر "{store.name}" قيد المراجعة من قبل الإدارة.
            <br />
            سيتم إشعارك عند الموافقة.
          </p>
          <div className="bg-yellow-50 rounded-xl p-4 text-sm text-yellow-700">
            عادةً ما تستغرق المراجعة 24-48 ساعة
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-b from-green-600 to-green-500 text-white px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
              {store.logo ? (
                <img src={store.logo} alt={store.name} className="w-14 h-14 rounded-lg object-cover" />
              ) : (
                <Store size={28} />
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold">{store.name}</h1>
              <p className="text-green-100 text-sm">{store.city}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-4xl mx-auto px-4 -mt-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <Package size={20} className="text-blue-500 mb-2" />
            <p className="text-2xl font-bold text-gray-900">{products.length}</p>
            <p className="text-xs text-gray-500">المنتجات</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <ShoppingBag size={20} className="text-green-500 mb-2" />
            <p className="text-2xl font-bold text-gray-900">{store.orders_count || 0}</p>
            <p className="text-xs text-gray-500">الطلبات</p>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <Star size={20} className="text-yellow-500 mb-2" />
            <p className="text-2xl font-bold text-gray-900">{store.rating?.toFixed(1) || '0.0'}</p>
            <p className="text-xs text-gray-500">التقييم</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 mt-4">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {[
            { id: 'overview', label: 'نظرة عامة' },
            { id: 'products', label: 'المنتجات' },
            { id: 'orders', label: 'الطلبات' },
            { id: 'settings', label: 'الإعدادات' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-green-500 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-3">إحصائيات سريعة</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <TrendingUp size={24} className="mx-auto text-green-500 mb-1" />
                  <p className="text-lg font-bold text-gray-900">0</p>
                  <p className="text-xs text-gray-500">طلبات اليوم</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <DollarSign size={24} className="mx-auto text-blue-500 mb-1" />
                  <p className="text-lg font-bold text-gray-900">0 ل.س</p>
                  <p className="text-xs text-gray-500">مبيعات اليوم</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-3">معلومات المتجر</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">وقت التوصيل</span>
                  <span className="text-gray-900">{store.delivery_time} دقيقة</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">الحد الأدنى للطلب</span>
                  <span className="text-gray-900">{store.minimum_order?.toLocaleString() || 0} ل.س</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">رسوم التوصيل</span>
                  <span className="text-gray-900">{store.delivery_fee?.toLocaleString() || 5000} ل.س</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">توصيل مجاني عند</span>
                  <span className="text-gray-900">
                    {store.free_delivery_minimum > 0 
                      ? `${store.free_delivery_minimum.toLocaleString()} ل.س` 
                      : 'غير مفعل'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">الهاتف</span>
                  <span className="text-gray-900">{store.phone}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <button
              onClick={() => {
                setEditingProduct(null);
                setShowAddProduct(true);
              }}
              className="w-full bg-green-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-600"
            >
              <Plus size={20} />
              إضافة منتج جديد
            </button>

            {products.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
                <Package size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-600">لم تقم بإضافة أي منتجات بعد</p>
              </div>
            ) : (
              <div className="space-y-3">
                {products.map((product) => (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl p-4 border border-gray-100 flex items-center gap-4"
                  >
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                      {product.images?.[0] ? (
                        <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={24} className="text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 truncate">{product.name}</h4>
                      <p className="text-green-600 font-bold">{product.price?.toLocaleString()} ل.س</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleAvailability(product.id, product.is_available)}
                        className={`p-2 rounded-lg ${product.is_available ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}
                        title={product.is_available ? 'متاح' : 'غير متاح'}
                      >
                        {product.is_available ? <Eye size={18} /> : <EyeOff size={18} />}
                      </button>
                      <button
                        onClick={() => {
                          setEditingProduct(product);
                          setShowAddProduct(true);
                        }}
                        className="p-2 rounded-lg bg-blue-100 text-blue-600"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-2 rounded-lg bg-red-100 text-red-600"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <StoreOrdersTab token={token} />
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <StoreSettings store={store} token={token} onUpdate={fetchStoreData} />
        )}
      </div>

      {/* Add/Edit Product Modal */}
      {showAddProduct && (
        <ProductModal
          store={store}
          product={editingProduct}
          token={token}
          onClose={() => {
            setShowAddProduct(false);
            setEditingProduct(null);
          }}
          onSave={() => {
            setShowAddProduct(false);
            setEditingProduct(null);
            fetchStoreData();
          }}
        />
      )}
    </div>
  );
};

// Store Settings Component
const StoreSettings = ({ store, token, onUpdate }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: store.name || '',
    description: store.description || '',
    phone: store.phone || '',
    delivery_time: store.delivery_time || 30,
    minimum_order: store.minimum_order || 0,
    delivery_fee: store.delivery_fee || 5000,
    free_delivery_minimum: store.free_delivery_minimum || 0,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/food/my-store`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: "تم الحفظ", description: "تم تحديث معلومات المتجر" });
      onUpdate();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل حفظ التغييرات", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-4">
      <h3 className="font-bold text-gray-900">إعدادات المتجر</h3>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">اسم المتجر</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full border border-gray-200 rounded-xl px-4 py-3"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
          className="w-full border border-gray-200 rounded-xl px-4 py-3"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">وقت التوصيل (دقيقة)</label>
          <input
            type="number"
            value={formData.delivery_time}
            onChange={(e) => setFormData({ ...formData, delivery_time: parseInt(e.target.value) })}
            className="w-full border border-gray-200 rounded-xl px-4 py-3"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأدنى للطلب</label>
          <input
            type="number"
            value={formData.minimum_order}
            onChange={(e) => setFormData({ ...formData, minimum_order: parseInt(e.target.value) })}
            className="w-full border border-gray-200 rounded-xl px-4 py-3"
          />
        </div>
      </div>

      {/* إعدادات التوصيل */}
      <div className="border-t pt-4 mt-4">
        <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Truck size={18} className="text-green-600" />
          إعدادات التوصيل
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رسوم التوصيل (ل.س)</label>
            <input
              type="number"
              value={formData.delivery_fee}
              onChange={(e) => setFormData({ ...formData, delivery_fee: parseInt(e.target.value) })}
              min="0"
              step="500"
              className="w-full border border-gray-200 rounded-xl px-4 py-3"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">توصيل مجاني عند</label>
            <input
              type="number"
              value={formData.free_delivery_minimum}
              onChange={(e) => setFormData({ ...formData, free_delivery_minimum: parseInt(e.target.value) })}
              min="0"
              step="5000"
              placeholder="0 = معطل"
              className="w-full border border-gray-200 rounded-xl px-4 py-3"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          اترك "توصيل مجاني عند" على 0 لتعطيل التوصيل المجاني
        </p>
        {formData.free_delivery_minimum > 0 && (
          <div className="mt-3 bg-green-50 rounded-lg p-3 text-sm text-green-700">
            ✓ سيحصل العملاء على توصيل مجاني عند الطلب بقيمة {formData.free_delivery_minimum.toLocaleString()} ل.س أو أكثر
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {saving ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <Save size={18} />
        )}
        حفظ التغييرات
      </button>
    </div>
  );
};

// Product Modal Component
const ProductModal = ({ store, product, token, onClose, onSave }) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    price: product?.price || '',
    original_price: product?.original_price || '',
    category: product?.category || '',
    images: product?.images || [],
    preparation_time: product?.preparation_time || '',
  });
  const [saving, setSaving] = useState(false);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, images: [...formData.images, reader.result] });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (index) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price) {
      toast({ title: "تنبيه", description: "يرجى ملء الحقول المطلوبة", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      if (product) {
        // Edit existing product
        await axios.put(`${API}/food/products/${product.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast({ title: "تم التحديث", description: "تم تحديث المنتج بنجاح" });
      } else {
        // Add new product
        await axios.post(`${API}/food/products`, {
          ...formData,
          store_id: store.id,
          price: parseFloat(formData.price),
          original_price: formData.original_price ? parseFloat(formData.original_price) : null,
          preparation_time: formData.preparation_time ? parseInt(formData.preparation_time) : null,
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast({ title: "تمت الإضافة", description: "تم إضافة المنتج بنجاح" });
      }
      onSave();
    } catch (error) {
      toast({ title: "خطأ", description: error.response?.data?.detail || "حدث خطأ", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end md:items-center justify-center z-50">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">
            {product ? 'تعديل المنتج' : 'إضافة منتج جديد'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم المنتج *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="مثال: شاورما لحمة"
              className="w-full border border-gray-200 rounded-xl px-4 py-3"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="وصف المنتج..."
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-3"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">السعر *</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0"
                className="w-full border border-gray-200 rounded-xl px-4 py-3"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">السعر قبل الخصم</label>
              <input
                type="number"
                value={formData.original_price}
                onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                placeholder="اختياري"
                className="w-full border border-gray-200 rounded-xl px-4 py-3"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">التصنيف</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="مثال: وجبات رئيسية"
                className="w-full border border-gray-200 rounded-xl px-4 py-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">وقت التحضير (دقيقة)</label>
              <input
                type="number"
                value={formData.preparation_time}
                onChange={(e) => setFormData({ ...formData, preparation_time: e.target.value })}
                placeholder="15"
                className="w-full border border-gray-200 rounded-xl px-4 py-3"
              />
            </div>
          </div>

          {/* Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">صور المنتج</label>
            <div className="flex gap-2 flex-wrap">
              {formData.images.map((img, i) => (
                <div key={i} className="relative">
                  <img src={img} alt="" className="w-20 h-20 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(i)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center cursor-pointer hover:border-green-500">
                <Plus size={24} className="text-gray-400" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={18} />
            )}
            {product ? 'حفظ التغييرات' : 'إضافة المنتج'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

// Store Orders Tab Component
const StoreOrdersTab = ({ token }) => {
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
    // Polling every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [filter]);

  const fetchOrders = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const res = await axios.get(`${API}/food/orders/store/orders`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });
      setOrders(res.data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId, newStatus) => {
    try {
      await axios.post(`${API}/food/orders/store/orders/${orderId}/status`, null, {
        params: { new_status: newStatus },
        headers: { Authorization: `Bearer ${token}` }
      });
      toast({ title: "تم التحديث", description: "تم تحديث حالة الطلب" });
      fetchOrders();
    } catch (error) {
      toast({ title: "خطأ", description: "فشل تحديث الحالة", variant: "destructive" });
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-700',
      confirmed: 'bg-blue-100 text-blue-700',
      preparing: 'bg-orange-100 text-orange-700',
      ready: 'bg-green-100 text-green-700',
      out_for_delivery: 'bg-purple-100 text-purple-700',
      delivered: 'bg-gray-100 text-gray-700',
      cancelled: 'bg-red-100 text-red-700'
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getNextAction = (status) => {
    const actions = {
      pending: { label: 'تأكيد', nextStatus: 'confirmed', icon: Check },
      confirmed: { label: 'بدء التحضير', nextStatus: 'preparing', icon: ChefHat },
      preparing: { label: 'جاهز', nextStatus: 'ready', icon: Package }
    };
    return actions[status];
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2">
        {[
          { id: 'all', label: 'الكل' },
          { id: 'pending', label: 'جديدة' },
          { id: 'confirmed', label: 'مؤكدة' },
          { id: 'preparing', label: 'قيد التحضير' },
          { id: 'ready', label: 'جاهزة' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
              filter === f.id ? 'bg-green-500 text-white' : 'bg-white text-gray-600 border'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-gray-100">
          <ShoppingBag size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-600">لا توجد طلبات</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const nextAction = getNextAction(order.status);
            return (
              <div key={order.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="font-bold text-gray-900">#{order.order_number}</span>
                      <span className={`text-xs px-2 py-1 rounded-full mr-2 ${getStatusColor(order.status)}`}>
                        {order.status_label}
                      </span>
                    </div>
                    <span className="font-bold text-green-600">{order.total.toLocaleString()} ل.س</span>
                  </div>

                  {/* Items */}
                  <div className="space-y-1 mb-3">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-gray-600">{item.name} x{item.quantity}</span>
                        <span className="text-gray-900">{item.total.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  {/* Customer Info */}
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Phone size={14} />
                      {order.customer_phone}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin size={14} />
                      {order.delivery_city}
                    </span>
                  </div>

                  {/* Actions */}
                  {nextAction && order.status !== 'cancelled' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(order.id, nextAction.nextStatus)}
                        className="flex-1 bg-green-500 text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-green-600"
                      >
                        <nextAction.icon size={16} />
                        {nextAction.label}
                      </button>
                      {order.status === 'pending' && (
                        <button
                          onClick={() => updateStatus(order.id, 'cancelled')}
                          className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                        >
                          رفض
                        </button>
                      )}
                    </div>
                  )}

                  {order.status === 'ready' && (
                    <div className="bg-green-50 text-green-700 text-sm p-2 rounded-lg text-center">
                      بانتظار موظف التوصيل
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};


export default FoodStoreDashboard;
